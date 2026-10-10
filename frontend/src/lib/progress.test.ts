import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, recordAttempt, updateChallenge } from '@/lib/progress';
import { missingVariables } from '@/lib/learn-api';

describe('progress store', () => {
  beforeEach(() => window.localStorage.clear());

  it('starts empty', () => {
    expect(loadProgress()).toEqual({});
  });

  it('records attempts keeping the best score and stars', () => {
    recordAttempt('few-shot', 90, 2, true);
    recordAttempt('few-shot', 40, 0, false);
    const p = loadProgress()['few-shot'];
    expect(p.attempts).toBe(2);
    expect(p.bestScore).toBe(90);
    expect(p.stars).toBe(2);
    expect(p.passed).toBe(true);
  });

  it('saves drafts without touching scores', () => {
    recordAttempt('audience', 70, 0, false);
    updateChallenge('audience', (p) => ({ ...p, draft: 'Explain {{concept}}' }));
    const p = loadProgress()['audience'];
    expect(p.draft).toBe('Explain {{concept}}');
    expect(p.bestScore).toBe(70);
  });

  it('survives corrupted storage', () => {
    window.localStorage.setItem('promptforge.academy.progress.v1', '{not json');
    expect(loadProgress()).toEqual({});
  });
});

describe('missingVariables', () => {
  it('finds variables the prompt never references', () => {
    expect(missingVariables('Use {{context}} only', ['context', 'question'])).toEqual(['question']);
  });

  it('tolerates whitespace inside braces', () => {
    expect(missingVariables('{{ context }} {{question}}', ['context', 'question'])).toEqual([]);
  });
});
