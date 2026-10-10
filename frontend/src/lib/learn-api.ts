import { ApiError } from '@/lib/api';
import type {
  AttemptMode,
  AttemptResponse,
  ChallengeDetail,
  ChallengeStats,
  CoachRequest,
  CoachResponse,
  TechniqueReport,
  Track,
} from '@/types/learn';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!response.ok) {
    let detail = 'Unknown error';
    try {
      const data = await response.json();
      detail = data.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, detail);
  }
  return response.json() as Promise<T>;
}

export function getTracks(): Promise<Track[]> {
  return request<Track[]>('/api/tracks');
}

export function getChallenge(id: string): Promise<ChallengeDetail> {
  return request<ChallengeDetail>(`/api/challenges/${encodeURIComponent(id)}`);
}

export function getSolution(id: string): Promise<{ challenge_id: string; reference_prompt: string }> {
  return request(`/api/challenges/${encodeURIComponent(id)}/solution`);
}

export function getChallengeStats(id: string): Promise<ChallengeStats> {
  return request<ChallengeStats>(`/api/challenges/${encodeURIComponent(id)}/stats`);
}

export function submitAttempt(
  id: string,
  prompt: string,
  hintsUsed: number,
  mode: AttemptMode = 'submit',
  signal?: AbortSignal
): Promise<AttemptResponse> {
  return request<AttemptResponse>(`/api/challenges/${encodeURIComponent(id)}/attempt`, {
    method: 'POST',
    body: JSON.stringify({ prompt, hints_used: hintsUsed, mode }),
    signal,
  });
}

export function askCoach(body: CoachRequest): Promise<CoachResponse> {
  return request<CoachResponse>('/api/coach', { method: 'POST', body: JSON.stringify(body) });
}

export function detectTechniques(prompt: string, signal?: AbortSignal): Promise<TechniqueReport> {
  return request<TechniqueReport>('/api/techniques', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    signal,
  });
}

/** Client-side mirror of curriculum_service.missing_variables for instant feedback. */
export function missingVariables(prompt: string, variables: string[]): string[] {
  const used = new Set(Array.from(prompt.matchAll(/\{\{\s*(\w+)\s*\}\}/g), (m) => m[1]));
  return variables.filter((v) => !used.has(v));
}
