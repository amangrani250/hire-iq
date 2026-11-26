export type AnswerVerdict =
  | 'correct'
  | 'partially_correct'
  | 'incorrect'
  | 'vague'
  | 'off_topic'
  | 'dont_know'
  | 'skipped';

export interface MessageMeta {
  verdict?: AnswerVerdict;
  score?: number;
  questionNumber?: number;
  totalQuestions?: number;
}

export interface Message {
  speaker: 'interviewer' | 'candidate';
  text: string;
  ts: number;
  meta?: MessageMeta;
}

export type ProctorFlagType =
  | 'absent'
  | 'looking_away'
  | 'off_center'
  | 'multiple_faces'
  | 'phone'
  | 'too_close'
  | 'too_far'
  | 'camera_off';

export interface ProctorFlag {
  id: string;
  type: ProctorFlagType;
  label: string;
  startedAt: number;
  durationMs: number;
  severity: 'warning' | 'critical';
}

export interface AttentionStats {
  focusScore: number;
  focusedMs: number;
  awayMs: number;
  absentMs: number;
  totalMs: number;
}

export type VirtualBackgroundId = 'none' | 'blur' | 'office' | 'lounge' | 'study' | 'studio';

export type FocusStatus =
  | 'initializing'
  | 'focused'
  | 'looking_away'
  | 'off_center'
  | 'absent'
  | 'multiple_faces'
  | 'phone'
  | 'too_close'
  | 'too_far'
  | 'camera_off'
  | 'unavailable';

export interface AttentionState {
  status: FocusStatus;
  label: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
}

export interface CandidateInfo {
  name: string;
  role: string;
  skills: string[];
  years: string;
}

export type InterviewType = 'resume' | 'tech' | 'job_roadmap';

export interface AtsAnalysis {
  overall_score: number;
  breakdown: Record<string, { score: number; feedback: string }>;
  top_suggestions: string[];
}

export interface ProfileData {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  summary: string;
  experience: Array<{
    company: string;
    role: string;
    duration: string;
    description: string;
  }>;
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    other: string[];
  };
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer?: string;
    year?: string;
  }>;
  total_years: string;
}

export interface AnalysisResult {
  profile: ProfileData;
  ats: AtsAnalysis;
  resume_text: string;
  session_id: string;
  candidate: CandidateInfo;
}

export interface Feedback {
  good_points: string;
  bad_points: string;
  improvements: string;
}

export interface WebSocketMessage {
  type: 'transcript' | 'audio' | 'interviewer_done' | 'interview_ended' | 'error' | 'pong';
  speaker?: string;
  text?: string;
  data?: string;
  format?: string;
  message?: string;
  meta?: MessageMeta;
}

export interface RoadmapDay {
  day: number;
  theme: string;
  tasks: RoadmapTask[];
}

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  type: 'learn' | 'practice' | 'revise' | 'mock';
  duration_mins: number;
  resources: string[];
}

export interface RoadmapResult {
  job_title: string;
  experience_level: string;
  strategy: string;
  key_topics: string[];
  days: RoadmapDay[];
}

export interface TechInterviewConfig {
  languages: string[];
  complexity: 'low' | 'medium' | 'high';
}
