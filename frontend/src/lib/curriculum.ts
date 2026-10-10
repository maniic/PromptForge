import type { ChallengeSummary, Difficulty, Track } from '@/types/learn';
import type { ChallengeProgress } from '@/lib/progress';

export const DIFFICULTY_LABEL: Record<Difficulty, 'Easy' | 'Medium' | 'Hard'> = {
  beginner: 'Easy',
  intermediate: 'Medium',
  advanced: 'Hard',
};

export interface Problem extends ChallengeSummary {
  number: number;
  trackId: string;
  trackTitle: string;
}

/** Flatten tracks into numbered problems, in curriculum order. */
export function toProblems(tracks: Track[]): Problem[] {
  let n = 0;
  return tracks.flatMap((t) =>
    t.challenges.map((c) => ({ ...c, number: ++n, trackId: t.id, trackTitle: t.title }))
  );
}

export type ProblemStatus = 'solved' | 'attempted' | 'todo';

export function statusOf(p: ChallengeProgress | undefined): ProblemStatus {
  if (p?.passed) return 'solved';
  if (p && p.attempts > 0) return 'attempted';
  return 'todo';
}
