'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Learner progress, stored per browser. No accounts needed to start learning;
 * every read/write is guarded because storage can be unavailable (private
 * mode, blocked cookies) and the app must still work without it.
 */

export interface ChallengeProgress {
  attempts: number;
  bestScore: number;
  stars: number;
  passed: boolean;
  hintsUsed: number;
  draft?: string;
}

export type ProgressMap = Record<string, ChallengeProgress>;

const STORAGE_KEY = 'promptforge.academy.progress.v1';
const EVENT = 'promptforge-progress';

export const EMPTY_PROGRESS: ChallengeProgress = {
  attempts: 0,
  bestScore: 0,
  stars: 0,
  passed: false,
  hintsUsed: 0,
};

export function loadProgress(): ProgressMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    return {};
  }
}

function saveProgress(map: ProgressMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable — progress lives only in memory this session
  }
  window.dispatchEvent(new Event(EVENT));
}

export function updateChallenge(
  id: string,
  update: (current: ChallengeProgress) => ChallengeProgress
): void {
  const map = loadProgress();
  map[id] = update({ ...EMPTY_PROGRESS, ...map[id] });
  saveProgress(map);
}

export function recordAttempt(id: string, score: number, stars: number, passed: boolean): void {
  updateChallenge(id, (p) => ({
    ...p,
    attempts: p.attempts + 1,
    bestScore: Math.max(p.bestScore, score),
    stars: Math.max(p.stars, stars),
    passed: p.passed || passed,
  }));
}

export function useProgress(): ProgressMap {
  const [progress, setProgress] = useState<ProgressMap>({});

  const refresh = useCallback(() => setProgress(loadProgress()), []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  return progress;
}
