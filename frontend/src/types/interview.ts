export interface Message {
  speaker: 'interviewer' | 'candidate';
  text: string;
  ts: number;
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
