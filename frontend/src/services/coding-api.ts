import { API_BASE } from '../utils';
import type {
  CodingCatalog,
  CodingReview,
  CodingReviewPayload,
  CodingRunMode,
  CodingRunResult,
} from '../types';

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.detail || data?.message || 'The coding service could not complete the request.';
  } catch {
    return 'The coding service could not complete the request.';
  }
}

export async function fetchCodingCatalog(signal?: AbortSignal): Promise<CodingCatalog> {
  const response = await fetch(`${API_BASE}/api/coding/catalog`, { signal });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<CodingCatalog>;
}

export async function runCodingSolution(payload: {
  language: string;
  challenge_id: string;
  code: string;
  mode: CodingRunMode;
}): Promise<CodingRunResult> {
  const response = await fetch(`${API_BASE}/api/coding/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<CodingRunResult>;
}

export async function reviewCodingSolution(payload: CodingReviewPayload): Promise<CodingReview> {
  const response = await fetch(`${API_BASE}/api/coding/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<CodingReview>;
}
