import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AttemptResponse, ChallengeDetail } from '@/types/learn';

const { api } = vi.hoisted(() => ({
  api: {
    getChallenge: vi.fn(),
    getTracks: vi.fn(),
    getChallengeStats: vi.fn(),
    submitAttempt: vi.fn(),
    askCoach: vi.fn(),
    getSolution: vi.fn(),
    detectTechniques: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/challenge/grounding' }));
vi.mock('@/lib/learn-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/learn-api')>();
  return { ...actual, ...api };
});

import ChallengeWorkspace from '@/components/academy/ChallengeWorkspace';

const CHALLENGE: ChallengeDetail = {
  id: 'grounding',
  track: 'trust',
  title: 'Stay grounded',
  technique: 'Grounding & fallbacks',
  difficulty: 'intermediate',
  brief: 'Answer only from context.',
  lesson: { summary: 'Ground it.', why_it_matters: 'RAG.', weak_example: 'weak', strong_example: 'strong' },
  variables: ['context', 'question'],
  starter_prompt: '{{context}}\n\n{{question}}',
  test_cases: [
    { id: 'pets', hidden: false, vars: { context: 'Policy text', question: 'Pets?' }, checks: ['Responds exactly NOT IN CONTEXT'] },
    { id: 'hidden-1', hidden: true, vars: null, checks: ['Refuses to guess'] },
  ],
  rubric: [],
  pass_score: 80,
};

const ATTEMPT: AttemptResponse = {
  challenge_id: 'grounding',
  score: 50,
  passed: false,
  stars: 0,
  checks_score: 50,
  judge_score: null,
  test_results: [
    { id: 'pets', hidden: false, output: 'Yes, pets are welcome!', checks: [{ label: 'Responds exactly NOT IN CONTEXT', passed: false, detail: 'expected exactly' }], passed: false },
    { id: 'hidden-1', hidden: true, output: null, checks: [{ label: 'Refuses to guess', passed: true, detail: '' }], passed: true },
  ],
  rubric_scores: [],
  techniques: { detected: ['variables'], estimated_tokens: 6, word_count: 2 },
  latency_ms: 1200,
};

describe('ChallengeWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getChallenge.mockResolvedValue(CHALLENGE);
    api.getTracks.mockResolvedValue([]);
    api.getChallengeStats.mockResolvedValue({ attempts: 0, pass_rate: 0, avg_score: 0 });
    api.detectTechniques.mockResolvedValue({ detected: ['variables'], estimated_tokens: 6, word_count: 2 });
  });

  it('loads the starter prompt and hides hidden test inputs', async () => {
    const user = userEvent.setup();
    render(<ChallengeWorkspace challengeId="grounding" />);
    expect(await screen.findByText('Stay grounded')).toBeInTheDocument();
    expect(screen.getByLabelText('Prompt editor')).toHaveValue('{{context}}\n\n{{question}}');
    await user.click(screen.getByRole('button', { name: /hidden-1/i }));
    expect(screen.getByText(/input is kept secret/i)).toBeInTheDocument();
  });

  it('blocks running when a variable is missing', async () => {
    const user = userEvent.setup();
    render(<ChallengeWorkspace challengeId="grounding" />);
    const editor = await screen.findByLabelText('Prompt editor');
    await user.clear(editor);
    await user.type(editor, 'Answer the question please');
    expect(screen.getByText(/never see that input/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run 2 tests/i })).toBeDisabled();
  });

  it('runs the attempt, shows the score, and sends failures to the coach', async () => {
    const user = userEvent.setup();
    api.submitAttempt.mockResolvedValue(ATTEMPT);
    api.askCoach.mockResolvedValue({
      hint_level: 1,
      diagnosis: 'The model guessed.',
      hint: 'What should happen when the answer is missing?',
      question: 'Is pets in the policy?',
      source: 'granite',
    });

    render(<ChallengeWorkspace challengeId="grounding" />);
    await user.click(await screen.findByRole('button', { name: /run 2 tests/i }));

    expect(await screen.findByText(/80 needed to pass/i)).toBeInTheDocument();
    expect(screen.getByText('Yes, pets are welcome!')).toBeInTheDocument();
    expect(screen.getByText('1/2 tests passing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hint 1\/3/i }));
    expect(await screen.findByText('The model guessed.')).toBeInTheDocument();
    expect(api.askCoach).toHaveBeenCalledWith(
      expect.objectContaining({
        hint_level: 1,
        failed_checks: ['Responds exactly NOT IN CONTEXT'],
        sample_output: 'Yes, pets are welcome!',
        score: 50,
      })
    );
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('promptforge.academy.progress.v1') ?? '{}').grounding.attempts).toBe(1));
  });

  it('keeps the solution locked until the learner has earned it', async () => {
    render(<ChallengeWorkspace challengeId="grounding" />);
    expect(await screen.findByRole('button', { name: /reveal solution/i })).toBeDisabled();
  });
});
