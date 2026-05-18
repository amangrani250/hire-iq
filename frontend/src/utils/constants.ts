export const API_BASE = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8000'
    : 'https://hire-iq-backend-eight.vercel.app';
})();

export const WS_BASE = API_BASE.replace(/^http/, 'ws');

export const STORAGE_KEYS = {
  THEME: 'theme',
  SAVED_RESUMES: 'savedResumes',
  ROADMAP_PROGRESS: 'hire_iq_roadmap_progress',
} as const;

export const APP_CONFIG = {
  MAX_RESUME_CHARS: 3000,
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  SILENCE_MS: 1200,
  AUDIO_SAMPLE_RATE: 16000,
  MAX_HISTORY_LENGTH: 40,
  RECONNECT_ATTEMPTS: 3,
  SUPPORTED_FILE_TYPES: ['.pdf', '.txt'] as const,
} as const;

export const ATS_CATEGORIES: Record<string, { label: string; color: string }> = {
  keyword_optimization: { label: 'Keywords', color: 'var(--accent)' },
  formatting: { label: 'Formatting', color: 'var(--green)' },
  section_completeness: { label: 'Sections', color: 'var(--amber)' },
  impact_metrics: { label: 'Impact Metrics', color: 'var(--accent-2)' },
  readability: { label: 'Readability', color: '#e06cf5' },
};

export const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher / Entry Level', desc: '0–2 years, fundamentals focus', icon: '🌱' },
  { value: 'mid', label: 'Mid Level', desc: '2–5 years, practical depth', icon: '🚀' },
  { value: 'senior', label: 'Senior Level', desc: '5+ years, architecture & leadership', icon: '⚡' },
] as const;

export const ROADMAP_DURATIONS = [
  { value: 7, label: '7 Days', desc: 'Quick sprint' },
  { value: 14, label: '14 Days', desc: 'Solid preparation' },
  { value: 30, label: '30 Days', desc: 'Deep mastery' },
] as const;

export const TASK_TYPE_META: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  learn: { icon: '📖', color: '#4f8ef7', bg: '#4f8ef710', label: 'Learn' },
  practice: { icon: '💻', color: '#10b981', bg: '#10b98110', label: 'Practice' },
  revise: { icon: '🔄', color: '#f59e0b', bg: '#f59e0b10', label: 'Revise' },
  mock: { icon: '⚡', color: '#a855f7', bg: '#a855f710', label: 'Mock' },
};

export const POPULAR_LANGUAGES = [
  'JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'React', 'Node.js',
] as const;

export const JOB_CATEGORIES = [
  { category: 'Software Engineering', color: '#4f8ef7', jobs: [
    'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'React Developer', 'Node.js Developer', 'Java Developer',
    'Python Developer', 'Go Developer', 'Rust Developer',
  ]},
  { category: 'Mobile Development', color: '#a855f7', jobs: [
    'Android Developer', 'iOS Developer', 'React Native Developer', 'Flutter Developer',
  ]},
  { category: 'Data & AI', color: '#10b981', jobs: [
    'Data Scientist', 'Machine Learning Engineer', 'Data Engineer',
    'AI Engineer', 'Data Analyst', 'NLP Engineer',
  ]},
  { category: 'Cloud & DevOps', color: '#f59e0b', jobs: [
    'DevOps Engineer', 'Cloud Engineer (AWS)', 'Cloud Engineer (GCP)',
    'Cloud Engineer (Azure)', 'Site Reliability Engineer', 'Platform Engineer',
  ]},
  { category: 'Database', color: '#ef4444', jobs: [
    'Database Administrator', 'Database Developer', 'MongoDB Developer', 'PostgreSQL Engineer',
  ]},
  { category: 'Security', color: '#8b5cf6', jobs: [
    'Security Engineer', 'Penetration Tester', 'Security Analyst', 'Application Security Engineer',
  ]},
  { category: 'Product & Design', color: '#ec4899', jobs: [
    'Product Manager', 'UI/UX Designer', 'UX Researcher', 'Technical Product Manager',
  ]},
  { category: 'Analytics & Business', color: '#14b8a6', jobs: [
    'Business Analyst', 'Data Analyst', 'Growth Analyst', 'Marketing Analyst',
  ]},
] as const;
