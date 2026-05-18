import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { GenerateResumeResponse, ImproveSectionResponse, GenerateResumePayload, ImproveSectionPayload } from '../types';
import type { TemplateType } from '../types';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    || 'http://localhost:8000/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ detail?: string }>) => {
    const msg = err.response?.data?.detail || err.message || 'Something went wrong';
    return Promise.reject(new Error(msg));
  }
);

export async function generateResume(
  rawInput: string,
  jobRole: string = '',
  template: TemplateType = 'minimal'
): Promise<{ data: GenerateResumeResponse }> {
  return api.post<GenerateResumeResponse>('/generate-resume', {
    raw_input: rawInput,
    job_role: jobRole,
    template,
  } satisfies GenerateResumePayload);
}

export async function improveSection(
  section: string,
  content: string,
  jobRole: string = ''
): Promise<{ data: ImproveSectionResponse }> {
  return api.post<ImproveSectionResponse>('/improve-section', {
    section,
    content,
    job_role: jobRole,
  } satisfies ImproveSectionPayload);
}

export default api;
