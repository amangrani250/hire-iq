import { useRef, useState, useCallback, useEffect } from 'react';
import * as ReactUseWebSocket from 'react-use-websocket';
import { API_BASE, WS_BASE, APP_CONFIG } from '../utils';
import type { MessageMeta, ProctorFlag, WebSocketMessage } from '../types';

/*
 * `react-use-websocket` is CommonJS with a nested default export. Depending on
 * the bundler's CJS interop the hook can arrive as `module.default` or
 * `module.default.default`, so resolve it defensively.
 */
const useWebSocket = (
  typeof (ReactUseWebSocket as unknown as { default?: unknown }).default === 'function'
    ? (ReactUseWebSocket as unknown as { default: unknown }).default
    : (ReactUseWebSocket as unknown as { default?: { default?: unknown } }).default?.default
) as typeof import('react-use-websocket').default;

/** ReadyState.OPEN — kept as a literal so the enum import also survives interop. */
const READY_STATE_OPEN = 1;

interface UseInterviewSocketOptions {
  sessionId: string;
  onTranscript: (speaker: string, text: string, meta?: MessageMeta) => void;
  onInterviewEnded: () => void;
  onAudioElement?: (audio: HTMLAudioElement) => void;
}

export interface QuestionProgress {
  current: number;
  total: number;
}

interface UseInterviewSocketReturn {
  wsReady: boolean;
  interviewerSpeaking: boolean;
  isThinking: boolean;
  questionProgress: QuestionProgress | null;
  sendCandidateMessage: (text: string) => void;
  sendProctorEvent: (event: ProctorFlag) => void;
  endInterview: () => void;
}

export function useInterviewSocket({
  sessionId,
  onTranscript,
  onInterviewEnded,
  onAudioElement,
}: UseInterviewSocketOptions): UseInterviewSocketReturn {
  const [interviewerSpeaking, setInterviewerSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [useRestFallback, setUseRestFallback] = useState(false);
  const [questionProgress, setQuestionProgress] = useState<QuestionProgress | null>(null);

  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const intentionallyClosed = useRef(false);

  const onTranscriptRef = useRef(onTranscript);
  const onInterviewEndedRef = useRef(onInterviewEnded);
  const onAudioElementRef = useRef(onAudioElement);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onInterviewEndedRef.current = onInterviewEnded; }, [onInterviewEnded]);
  useEffect(() => { onAudioElementRef.current = onAudioElement; }, [onAudioElement]);

  const trackProgress = useCallback((meta?: MessageMeta) => {
    if (!meta?.questionNumber || !meta?.totalQuestions) return;
    setQuestionProgress({ current: meta.questionNumber, total: meta.totalQuestions });
  }, []);

  const playNext = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      currentAudioRef.current = null;
      setInterviewerSpeaking(false);
      return;
    }
    isPlayingRef.current = true;
    setInterviewerSpeaking(true);

    const blob = audioQueueRef.current.shift()!;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    onAudioElementRef.current?.(audio);
    currentAudioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      currentAudioRef.current = null;
      playNext();
    };
    audio.play().catch(() => {
      currentAudioRef.current = null;
      playNext();
    });
  }, []);

  const enqueueAudio = useCallback(
    (base64mp3: string) => {
      if (!base64mp3) return;
      try {
        const binaryStr = atob(base64mp3);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        audioQueueRef.current.push(blob);
        if (!isPlayingRef.current) playNext();
      } catch (err) {
        console.error('Audio error:', err);
      }
    },
    [playNext]
  );

  const stopAllAudio = useCallback(() => {
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    isPlayingRef.current = false;
    setInterviewerSpeaking(false);
  }, []);

  /* WebSocket */
  const socketUrl =
    sessionId && !useRestFallback ? `${WS_BASE}/ws/interview/${sessionId}` : null;
  const { sendJsonMessage, readyState } = useWebSocket(socketUrl, {
    share: false,
    shouldReconnect: () => !intentionallyClosed.current && !useRestFallback,
    reconnectAttempts: APP_CONFIG.RECONNECT_ATTEMPTS,
    onMessage: (event: WebSocketEventMap['message']) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        if (msg.type === 'transcript') {
          trackProgress(msg.meta);
          onTranscriptRef.current?.(msg.speaker ?? '', msg.text ?? '', msg.meta);
        } else if (msg.type === 'audio') {
          setIsThinking(false);
          enqueueAudio(msg.data ?? '');
        } else if (msg.type === 'interviewer_done') {
          setIsThinking(false);
        } else if (msg.type === 'interview_ended') {
          setIsThinking(false);
          stopAllAudio();
          onInterviewEndedRef.current?.();
        }
      } catch { /* ignore parse errors */ }
    },
    onError: () => {
      console.warn('WebSocket error, falling back to REST...');
      setUseRestFallback(true);
    },
    onClose: () => {
      if (!intentionallyClosed.current) stopAllAudio();
    },
  });

  const wsReady = Number(readyState) === READY_STATE_OPEN;

  /* REST Handlers */
  const handleRestResponse = useCallback(
    async (text: string | null = null) => {
      setIsThinking(true);
      try {
        const res = await fetch(`${API_BASE}/api/interview/respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, text }),
        });
        const data = await res.json();
        const messages: Array<{ text?: string; meta?: MessageMeta }> =
          Array.isArray(data.messages) && data.messages.length
            ? data.messages
            : [{ text: data.text, meta: data.meta }];
        for (const message of messages) {
          if (!message.text) continue;
          trackProgress(message.meta);
          onTranscriptRef.current?.('interviewer', message.text, message.meta);
        }
        enqueueAudio(data.audio);
      } catch (err) {
        console.error('REST Interview Error:', err);
      } finally {
        setIsThinking(false);
      }
    },
    [sessionId, enqueueAudio, trackProgress]
  );

  useEffect(() => {
    if (useRestFallback && sessionId) {
      handleRestResponse();
    }
  }, [useRestFallback, sessionId]); // eslint-disable-line

  const sendCandidateMessage = useCallback(
    (text: string) => {
      if (wsReady) {
        sendJsonMessage({ type: 'candidate_message', text });
        setIsThinking(true);
      } else {
        handleRestResponse(text);
      }
    },
    [wsReady, sendJsonMessage, handleRestResponse]
  );

  const sendProctorEvent = useCallback(
    (event: ProctorFlag) => {
      if (wsReady) {
        sendJsonMessage({ type: 'proctor_event', event });
        return;
      }
      void fetch(`${API_BASE}/api/interview/proctor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, event }),
      }).catch(() => undefined);
    },
    [wsReady, sendJsonMessage, sessionId]
  );

  const endInterview = useCallback(async () => {
    intentionallyClosed.current = true;
    stopAllAudio();
    if (wsReady) {
      sendJsonMessage({ type: 'end_interview' });
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/interview/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json();
        if (data.text) {
          onTranscriptRef.current?.('interviewer', data.text);
          enqueueAudio(data.audio);
        }
      } catch { /* ignore */ }
      onInterviewEndedRef.current?.();
    }
  }, [wsReady, sendJsonMessage, sessionId, enqueueAudio, stopAllAudio]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  return {
    wsReady: wsReady || useRestFallback,
    interviewerSpeaking,
    isThinking,
    questionProgress,
    sendCandidateMessage,
    sendProctorEvent,
    endInterview,
  };
}
