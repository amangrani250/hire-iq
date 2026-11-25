import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type { Message } from '../types';

interface QuestionEntry {
  text: string;
  askedAt: number;
  repeatCount: number;
  resolved: boolean;
}

interface InterviewState {
  messages: Message[];
  questions: QuestionEntry[];
  currentQuestionIndex: number;
  shortAnswerStreak: number;
}

type InterviewAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'INCREMENT_REPEAT' }
  | { type: 'RESOLVE_QUESTION' }
  | { type: 'DETECT_QUESTION' }
  | { type: 'RESET' };

const SHORT_ANSWER_WORD_THRESHOLD = 8;
const MAX_REPEATS_PER_QUESTION = 2;

const initialState: InterviewState = {
  messages: [],
  questions: [],
  currentQuestionIndex: -1,
  shortAnswerStreak: 0,
};

function detectQuestion(msg: Message, state: InterviewState): boolean {
  if (msg.speaker !== 'interviewer') return false;
  if (!msg.text) return false;
  const isQuestion = msg.text.includes('?');
  if (!isQuestion) return false;
  const textLower = msg.text.toLowerCase().trim();
  const existing = state.questions.find(
    (q) => q.text.toLowerCase().trim() === textLower
  );
  return !existing;
}

function isShortAnswer(text: string): boolean {
  const words = text.trim().split(/\s+/);
  return words.length < SHORT_ANSWER_WORD_THRESHOLD;
}

function reducer(state: InterviewState, action: InterviewAction): InterviewState {
  switch (action.type) {
    case 'ADD_MESSAGE': {
      const msg = action.payload;
      const newMessages = [...state.messages, msg];

      let newState = { ...state, messages: newMessages };

      if (msg.speaker === 'interviewer') {
        if (detectQuestion(msg, state)) {
          const qEntry: QuestionEntry = {
            text: msg.text,
            askedAt: msg.ts,
            repeatCount: 0,
            resolved: false,
          };
          newState = {
            ...newState,
            questions: [...state.questions, qEntry],
            currentQuestionIndex: state.questions.length,
          };
        }
        newState.shortAnswerStreak = 0;
      }

      if (msg.speaker === 'candidate') {
        if (isShortAnswer(msg.text)) {
          newState = { ...newState, shortAnswerStreak: state.shortAnswerStreak + 1 };
        } else {
          newState = { ...newState, shortAnswerStreak: 0 };
        }
      }

      return newState;
    }

    case 'INCREMENT_REPEAT': {
      if (state.currentQuestionIndex < 0) return state;
      const updated = [...state.questions];
      const idx = state.currentQuestionIndex;
      updated[idx] = {
        ...updated[idx],
        repeatCount: updated[idx].repeatCount + 1,
      };
      return { ...state, questions: updated };
    }

    case 'RESOLVE_QUESTION': {
      if (state.currentQuestionIndex < 0) return state;
      const updated = [...state.questions];
      const idx = state.currentQuestionIndex;
      updated[idx] = { ...updated[idx], resolved: true };
      return { ...state, questions: updated };
    }

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface InterviewContextValue {
  messages: Message[];
  questions: QuestionEntry[];
  currentQuestion: QuestionEntry | null;
  canRequestRepeat: boolean;
  canRequestNext: boolean;
  repeatLimitReached: boolean;
  shortAnswerStreak: number;
  addMessage: (msg: Message) => void;
  requestRepeat: () => string | null;
  requestNext: () => string | null;
  reset: () => void;
}

const InterviewContext = createContext<InterviewContextValue | null>(null);

export function InterviewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addMessage = useCallback((msg: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: msg });
  }, []);

  const currentQuestion = useMemo(() => {
    if (state.currentQuestionIndex < 0 || state.currentQuestionIndex >= state.questions.length) return null;
    return state.questions[state.currentQuestionIndex];
  }, [state.questions, state.currentQuestionIndex]);

  const canRequestRepeat = useMemo(() => {
    return currentQuestion !== null && currentQuestion.repeatCount < MAX_REPEATS_PER_QUESTION;
  }, [currentQuestion]);

  const repeatLimitReached = useMemo(() => {
    return currentQuestion !== null && currentQuestion.repeatCount >= MAX_REPEATS_PER_QUESTION;
  }, [currentQuestion]);

  const canRequestNext = useMemo(() => {
    if (currentQuestion === null) return false;
    const lastMsg = state.messages[state.messages.length - 1];
    return lastMsg !== undefined && lastMsg.speaker === 'candidate';
  }, [currentQuestion, state.messages]);

  const requestRepeat = useCallback(() => {
    if (!canRequestRepeat) return null;
    dispatch({ type: 'INCREMENT_REPEAT' });
    return "Can you please repeat your last question? I didn't quite catch it fully.";
  }, [canRequestRepeat]);

  const requestNext = useCallback(() => {
    if (!canRequestNext) return null;
    dispatch({ type: 'RESOLVE_QUESTION' });
    return "I think I've answered that sufficiently. Let's move to the next question.";
  }, [canRequestNext]);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <InterviewContext
      value={{
        messages: state.messages,
        questions: state.questions,
        currentQuestion,
        canRequestRepeat,
        canRequestNext,
        repeatLimitReached,
        shortAnswerStreak: state.shortAnswerStreak,
        addMessage,
        requestRepeat,
        requestNext,
        reset,
      }}
    >
      {children}
    </InterviewContext>
  );
}

export function useInterviewContext(): InterviewContextValue {
  const ctx = useContext(InterviewContext);
  if (!ctx) throw new Error('useInterviewContext must be used within InterviewProvider');
  return ctx;
}
