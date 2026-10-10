// PromptForge Academy types — mirror backend/models/learn.py

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface ChallengeSummary {
  id: string;
  title: string;
  technique: string;
  difficulty: Difficulty;
}

export interface Track {
  id: string;
  title: string;
  description: string;
  challenges: ChallengeSummary[];
}

export interface Lesson {
  summary: string;
  why_it_matters: string;
  weak_example: string;
  strong_example: string;
}

export interface PublicTestCase {
  id: string;
  hidden: boolean;
  vars: Record<string, string> | null;
  checks: string[];
}

export interface ChallengeDetail {
  id: string;
  track: string;
  title: string;
  technique: string;
  difficulty: Difficulty;
  brief: string;
  lesson: Lesson;
  variables: string[];
  starter_prompt: string;
  test_cases: PublicTestCase[];
  rubric: string[];
  pass_score: number;
}

export interface CheckResult {
  label: string;
  passed: boolean;
  detail: string;
}

export interface TestCaseResult {
  id: string;
  hidden: boolean;
  output: string | null;
  checks: CheckResult[];
  passed: boolean;
}

export interface CriterionScore {
  criterion: string;
  score: number;
  reason: string;
}

export interface TechniqueReport {
  detected: string[];
  estimated_tokens: number;
  word_count: number;
}

export interface AttemptResponse {
  challenge_id: string;
  score: number;
  passed: boolean;
  stars: number;
  checks_score: number;
  judge_score: number | null;
  test_results: TestCaseResult[];
  rubric_scores: CriterionScore[];
  techniques: TechniqueReport;
  latency_ms: number;
}

export interface CoachRequest {
  challenge_id: string;
  prompt: string;
  hint_level: number;
  failed_checks: string[];
  sample_output: string;
  score: number;
}

export interface CoachResponse {
  hint_level: number;
  diagnosis: string;
  hint: string;
  question: string;
  source: 'granite' | 'authored';
}

export interface ChallengeStats {
  attempts: number;
  pass_rate: number;
  avg_score: number;
}

export const TECHNIQUE_LABELS: Record<string, string> = {
  role: 'Role',
  audience: 'Audience',
  output_format: 'Output format',
  constraints: 'Constraints',
  examples: 'Examples',
  delimiters: 'Delimiters',
  reasoning: 'Reasoning',
  fallback: 'Fallback',
  variables: 'Variables',
};
