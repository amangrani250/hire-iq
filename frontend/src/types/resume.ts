export interface PersonalInfo {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  website: string;
  title: string;
}

export interface Experience {
  company: string;
  role: string;
  start_date: string;
  end_date: string;
  description: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year: string;
  gpa: string;
}

export interface Project {
  name: string;
  description: string;
  tech_stack: string;
  link: string;
}

export interface Certification {
  name: string;
  issuer: string;
  year: string;
}

export interface Resume {
  personal_info: PersonalInfo;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
}

export type TemplateType = 'minimal' | 'corporate' | 'creative';

export interface SavedResume {
  id: number;
  name: string;
  resume: Resume;
  template: TemplateType;
  createdAt: string;
}

export interface ResumeState {
  resume: Resume;
  template: TemplateType;
  atsScore: number;
  suggestions: string[];
  isGenerating: boolean;
  isImproving: boolean;
  savedResumes: SavedResume[];
}

export type ResumeAction =
  | { type: 'SET_RESUME'; payload: Resume }
  | { type: 'UPDATE_FIELD'; field: keyof Resume; value: unknown }
  | { type: 'UPDATE_PERSONAL'; payload: Partial<PersonalInfo> }
  | { type: 'SET_TEMPLATE'; payload: TemplateType }
  | { type: 'SET_ATS'; score: number; suggestions: string[] }
  | { type: 'SET_GENERATING'; payload: boolean }
  | { type: 'SET_IMPROVING'; payload: boolean }
  | { type: 'SAVE_RESUME'; name: string }
  | { type: 'LOAD_RESUME'; payload: { resume: Resume; template: TemplateType } }
  | { type: 'DELETE_RESUME'; id: number }
  | { type: 'RESET' };

export interface ResumeContextValue extends ResumeState {
  setResume: (data: Resume) => void;
  updateField: (field: keyof Resume, value: unknown) => void;
  updatePersonal: (data: Partial<PersonalInfo>) => void;
  setTemplate: (template: TemplateType) => void;
  setAts: (score: number, suggestions: string[]) => void;
  setGenerating: (v: boolean) => void;
  setImproving: (v: boolean) => void;
  saveResume: (name: string) => void;
  loadResume: (data: { resume: Resume; template: TemplateType }) => void;
  deleteResume: (id: number) => void;
  reset: () => void;
}
