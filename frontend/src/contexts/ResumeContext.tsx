import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from 'react';
import type {
  Resume,
  PersonalInfo,
  TemplateType,
  ResumeState,
  ResumeAction,
  ResumeContextValue,
  SavedResume,
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

function loadSavedResumes(): SavedResume[] {
  try {
    const raw = localStorage.getItem('savedResumes');
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedResume[]) : [];
  } catch {
    return [];
  }
}

function persistSavedResumes(resumes: SavedResume[]) {
  try {
    localStorage.setItem('savedResumes', JSON.stringify(resumes));
  } catch {
    /* storage may be unavailable or full */
  }
}

const initialState: ResumeState = {
  resume: initialResume,
  template: 'minimal',
  atsScore: 0,
  suggestions: [],
  isGenerating: false,
  isImproving: false,
  savedResumes: loadSavedResumes(),
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
      persistSavedResumes(saved);
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
      persistSavedResumes(saved);
      return { ...state, savedResumes: saved };
    }
    case 'RESET':
      return { ...state, resume: initialResume, atsScore: 0, suggestions: [] };
    default:
      return state;
  }
}

/*
 * The resume store is split into three contexts so a keystroke in the editor
 * only re-renders components that actually consume the document. Template and
 * ATS panels no longer re-render on every character typed.
 */
type ResumeMeta = Pick<
  ResumeState,
  'template' | 'atsScore' | 'suggestions' | 'isGenerating' | 'isImproving' | 'savedResumes'
>;
type ResumeActions = Omit<ResumeContextValue, keyof ResumeState>;

const ResumeDocumentContext = createContext<Resume | null>(null);
const ResumeMetaContext = createContext<ResumeMeta | null>(null);
const ResumeActionsContext = createContext<ResumeActions | null>(null);

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

  const meta = useMemo<ResumeMeta>(
    () => ({
      template: state.template,
      atsScore: state.atsScore,
      suggestions: state.suggestions,
      isGenerating: state.isGenerating,
      isImproving: state.isImproving,
      savedResumes: state.savedResumes,
    }),
    [
      state.template,
      state.atsScore,
      state.suggestions,
      state.isGenerating,
      state.isImproving,
      state.savedResumes,
    ]
  );

  const actions = useMemo<ResumeActions>(
    () => ({
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
    }),
    [
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
    ]
  );

  return (
    <ResumeActionsContext value={actions}>
      <ResumeMetaContext value={meta}>
        <ResumeDocumentContext value={state.resume}>{children}</ResumeDocumentContext>
      </ResumeMetaContext>
    </ResumeActionsContext>
  );
}

export function useResumeDocument(): Resume {
  const ctx = useContext(ResumeDocumentContext);
  if (!ctx) throw new Error('useResumeDocument must be used within ResumeProvider');
  return ctx;
}

export function useResumeMeta(): ResumeMeta {
  const ctx = useContext(ResumeMetaContext);
  if (!ctx) throw new Error('useResumeMeta must be used within ResumeProvider');
  return ctx;
}

export function useResumeActions(): ResumeActions {
  const ctx = useContext(ResumeActionsContext);
  if (!ctx) throw new Error('useResumeActions must be used within ResumeProvider');
  return ctx;
}

/**
 * Convenience hook for components that need the whole store. Prefer the
 * granular hooks above when only one slice is needed.
 */
export function useResume(): ResumeContextValue {
  const resume = useResumeDocument();
  const meta = useResumeMeta();
  const actions = useResumeActions();

  return useMemo<ResumeContextValue>(
    () => ({ resume, ...meta, ...actions }),
    [resume, meta, actions]
  );
}
