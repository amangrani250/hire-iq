import type { Resume, TemplateType } from './resume';
import type { ProfileData, AtsAnalysis, CandidateInfo, Feedback, RoadmapResult, TechInterviewConfig } from './interview';

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

export interface ApiError {
  detail?: string;
  message?: string;
  status?: number;
}

export interface UploadResumeResponse {
  session_id: string;
  candidate: CandidateInfo;
}

export interface AnalyzeResumeResponse {
  profile: ProfileData;
  ats: AtsAnalysis;
  resume_text: string;
  session_id: string;
  candidate: CandidateInfo;
}

export interface TranscribeResponse {
  transcript: string;
}

export interface GenerateResumeResponse {
  resume_data: Resume;
  ats_score: number;
  suggestions: string[];
}

export interface ImproveSectionResponse {
  improved_content: string;
  suggestions: string[];
  keywords: string[];
}

export interface TechInterviewResponse {
  session_id: string;
  candidate: CandidateInfo;
}

export interface InterviewResponse {
  type: string;
  speaker: string;
  text: string;
  audio: string | null;
  format: string;
}

export interface InterviewEndResponse {
  text: string;
  audio: string | null;
}

export interface FeedbackResponse extends Feedback {}

export interface JobInterviewSessionResponse {
  session_id: string;
  candidate: CandidateInfo;
}

export interface GenerateResumePayload {
  raw_input: string;
  job_role?: string;
  template?: TemplateType;
}

export interface ImproveSectionPayload {
  section: string;
  content: string;
  job_role?: string;
}

export interface JobRoadmapPayload {
  job_title: string;
  experience_level: string;
  duration_days: number;
}

export interface JobInterviewSessionPayload {
  job_title: string;
  experience_level: string;
  topics_studied: string[];
  studied_day_themes?: string[];
  studied_specific_topics?: string[];
}

export interface TechInterviewPayload extends TechInterviewConfig {}

export interface InterviewMessagePayload {
  session_id: string;
  text?: string | null;
}

export interface FeedbackPayload {
  transcript: Array<{
    speaker: string;
    text: string;
    ts: number;
  }>;
}
