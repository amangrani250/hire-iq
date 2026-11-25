import { API_BASE } from './constants';
import type {
  AnalyzeResumeResponse,
  TranscribeResponse,
  TechInterviewResponse,
  InterviewResponse,
  InterviewEndResponse,
  FeedbackResponse,
  JobInterviewSessionResponse,
  JobRoadmapPayload,
  TechInterviewPayload,
  FeedbackPayload,
  InterviewMessagePayload,
  JobInterviewSessionPayload,
} from '../types';

export async function analyzeResume(file: File): Promise<AnalyzeResumeResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/analyze-resume`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Analysis failed');
  return data;
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    body: form,
  });
  const data: TranscribeResponse = await res.json();
  return data.transcript?.trim() ?? '';
}

export async function setupTechInterview(
  payload: TechInterviewPayload
): Promise<TechInterviewResponse> {
  const res = await fetch(`${API_BASE}/api/setup-tech-interview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to setup interview');
  return res.json();
}

export async function getInterviewFeedback(
  payload: FeedbackPayload
): Promise<FeedbackResponse> {
  const res = await fetch(`${API_BASE}/api/interview-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendInterviewMessage(
  payload: InterviewMessagePayload
): Promise<InterviewResponse> {
  const res = await fetch(`${API_BASE}/api/interview/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function endInterviewSession(
  payload: InterviewMessagePayload
): Promise<InterviewEndResponse> {
  const res = await fetch(`${API_BASE}/api/interview/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function generateJobRoadmap(
  payload: JobRoadmapPayload
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/api/job-roadmap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate roadmap');
  return res.json();
}

export async function createJobInterviewSession(
  payload: Omit<JobInterviewSessionPayload, ''>
): Promise<JobInterviewSessionResponse> {
  const res = await fetch(`${API_BASE}/api/job-interview-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to start interview');
  return res.json();
}
