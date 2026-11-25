import { useMutation } from '@tanstack/react-query';
import { queryClient } from '../utils/query-client';
import { queryKeys } from '../utils/query-keys';
import { generateResume, improveSection } from './api';
import { API_BASE } from '../utils/constants';
import type {
  GenerateResumeResponse,
  ImproveSectionResponse,
  AnalyzeResumeResponse,
  TechInterviewResponse,
  FeedbackResponse,
  InterviewResponse,
  InterviewEndResponse,
  JobInterviewSessionResponse,
  JobRoadmapPayload,
  TechInterviewPayload,
  FeedbackPayload,
  InterviewMessagePayload,
  JobInterviewSessionPayload,
} from '../types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `Request failed: ${res.status}`);
  return data;
}

export function useGenerateResume() {
  return useMutation({
    mutationFn: ({
      rawInput,
      jobRole,
      template,
    }: {
      rawInput: string;
      jobRole: string;
      template?: string;
    }) => generateResume(rawInput, jobRole, template as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

export function useImproveSection() {
  return useMutation({
    mutationFn: ({
      section,
      content,
      jobRole,
    }: {
      section: string;
      content: string;
      jobRole: string;
    }) => improveSection(section, content, jobRole),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.improve.section(variables.section) });
    },
  });
}

export function useAnalyzeResume() {
  return useMutation({
    mutationFn: async (file: File): Promise<AnalyzeResumeResponse> => {
      const form = new FormData();
      form.append('file', file);
      return fetchJson<AnalyzeResumeResponse>(`${API_BASE}/api/analyze-resume`, {
        method: 'POST',
        body: form,
      });
    },
  });
}

export function useTranscribeAudio() {
  return useMutation({
    mutationFn: async (blob: Blob): Promise<string> => {
      const form = new FormData();
      form.append('file', blob, 'audio.webm');
      const data = await fetchJson<{ transcript: string }>(`${API_BASE}/api/transcribe`, {
        method: 'POST',
        body: form,
      });
      return data.transcript?.trim() ?? '';
    },
  });
}

export function useSetupTechInterview() {
  return useMutation({
    mutationFn: (payload: TechInterviewPayload) =>
      fetchJson<TechInterviewResponse>(`${API_BASE}/api/setup-tech-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}

export function useGetInterviewFeedback() {
  return useMutation({
    mutationFn: (payload: FeedbackPayload) =>
      fetchJson<FeedbackResponse>(`${API_BASE}/api/interview-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}

export function useSendInterviewMessage() {
  return useMutation({
    mutationFn: (payload: InterviewMessagePayload) =>
      fetchJson<InterviewResponse>(`${API_BASE}/api/interview/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}

export function useEndInterviewSession() {
  return useMutation({
    mutationFn: (payload: InterviewMessagePayload) =>
      fetchJson<InterviewEndResponse>(`${API_BASE}/api/interview/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}

export function useGenerateJobRoadmap() {
  return useMutation({
    mutationFn: (payload: JobRoadmapPayload) =>
      fetchJson<{ roadmap: unknown }>(`${API_BASE}/api/job-roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}

export function useCreateJobInterviewSession() {
  return useMutation({
    mutationFn: (payload: JobInterviewSessionPayload) =>
      fetchJson<JobInterviewSessionResponse>(`${API_BASE}/api/job-interview-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}
