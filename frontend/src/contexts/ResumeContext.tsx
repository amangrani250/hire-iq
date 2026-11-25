import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type {
  Resume,
  PersonalInfo,
  TemplateType,
  ResumeState,
  ResumeAction,
  ResumeContextValue,
} from '../types';

const initialResume: Resume = {
  personal_info: {
    full_name: '', email: '', phone: '', location: '',
    linkedin: '', website: '', title: '',
  },
  summary: '',
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
};

const initialState: ResumeState = {
  resume: initialResume,
  template: 'minimal',
  atsScore: 0,
  suggestions: [],
  isGenerating: false,
  isImproving: false,
  savedResumes: JSON.parse(localStorage.getItem('savedResumes') || '[]'),
};

function reducer(state: ResumeState, action: ResumeAction): ResumeState {
  switch (action.type) {
    case 'SET_RESUME':
      return { ...state, resume: action.payload };
    case 'UPDATE_FIELD':
      return { ...state, resume: { ...state.resume, [action.field]: action.value } };
    case 'UPDATE_PERSONAL':
      return {
        ...state,
        resume: {
          ...state.resume,
          personal_info: { ...state.resume.personal_info, ...action.payload },
        },
      };
    case 'SET_TEMPLATE':
      return { ...state, template: action.payload };
    case 'SET_ATS':
      return { ...state, atsScore: action.score, suggestions: action.suggestions };
    case 'SET_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_IMPROVING':
      return { ...state, isImproving: action.payload };
    case 'SAVE_RESUME': {
      const saved = [
        {
          id: Date.now(),
          name: action.name,
          resume: state.resume,
          template: state.template,
          createdAt: new Date().toISOString(),
        },
        ...state.savedResumes,
      ].slice(0, 10);
      localStorage.setItem('savedResumes', JSON.stringify(saved));
      return { ...state, savedResumes: saved };
    }
    case 'LOAD_RESUME':
      return {
        ...state,
        resume: action.payload.resume,
        template: action.payload.template,
      };
    case 'DELETE_RESUME': {
      const saved = state.savedResumes.filter((r) => r.id !== action.id);
      localStorage.setItem('savedResumes', JSON.stringify(saved));
      return { ...state, savedResumes: saved };
    }
    case 'RESET':
      return { ...state, resume: initialResume, atsScore: 0, suggestions: [] };
    default:
      return state;
  }
}

const ResumeContext = createContext<ResumeContextValue | null>(null);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setResume = useCallback((data: Resume) => dispatch({ type: 'SET_RESUME', payload: data }), []);
  const updateField = useCallback(
    (field: keyof Resume, value: unknown) => dispatch({ type: 'UPDATE_FIELD', field, value }),
    []
  );
  const updatePersonal = useCallback(
    (data: Partial<PersonalInfo>) => dispatch({ type: 'UPDATE_PERSONAL', payload: data }),
    []
  );
  const setTemplate = useCallback((t: TemplateType) => dispatch({ type: 'SET_TEMPLATE', payload: t }), []);
  const setAts = useCallback(
    (score: number, suggestions: string[]) => dispatch({ type: 'SET_ATS', score, suggestions }),
    []
  );
  const setGenerating = useCallback((v: boolean) => dispatch({ type: 'SET_GENERATING', payload: v }), []);
  const setImproving = useCallback((v: boolean) => dispatch({ type: 'SET_IMPROVING', payload: v }), []);
  const saveResume = useCallback((name: string) => dispatch({ type: 'SAVE_RESUME', name }), []);
  const loadResume = useCallback(
    (data: { resume: Resume; template: TemplateType }) => dispatch({ type: 'LOAD_RESUME', payload: data }),
    []
  );
  const deleteResume = useCallback((id: number) => dispatch({ type: 'DELETE_RESUME', id }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return (
    <ResumeContext
      value={{
        ...state,
        setResume,
        updateField,
        updatePersonal,
        setTemplate,
        setAts,
        setGenerating,
        setImproving,
        saveResume,
        loadResume,
        deleteResume,
        reset,
      }}
    >
      {children}
    </ResumeContext>
  );
}

export function useResume(): ResumeContextValue {
  const ctx = useContext(ResumeContext);
  if (!ctx) throw new Error('useResume must be used within ResumeProvider');
  return ctx;
}
