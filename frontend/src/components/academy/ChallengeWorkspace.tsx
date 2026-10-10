'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, BookOpenCheck, Loader2, Lock, Play, Users } from 'lucide-react';
import {
  askCoach,
  getChallenge,
  getChallengeStats,
  getSolution,
  getTracks,
  missingVariables,
  submitAttempt,
} from '@/lib/learn-api';
import { formatApiError } from '@/lib/api';
import { loadProgress, recordAttempt, updateChallenge } from '@/lib/progress';
import type { AttemptResponse, ChallengeDetail, ChallengeStats, CoachResponse, Track } from '@/types/learn';
import { SiteHeader } from '@/components/academy/SiteHeader';
import { PromptEditor } from '@/components/academy/PromptEditor';
import { TestSuite } from '@/components/academy/TestSuite';
import { ScoreCard } from '@/components/academy/ScoreCard';
import { CoachPanel } from '@/components/academy/CoachPanel';

const SOLUTION_UNLOCK_ATTEMPTS = 3;

export default function ChallengeWorkspace({ challengeId }: { challengeId: string }) {
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [attempt, setAttempt] = useState<AttemptResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [everPassed, setEverPassed] = useState(false);

  const [hints, setHints] = useState<CoachResponse[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    setChallenge(null);
    setAttempt(null);
    setHints([]);
    setSolution(null);
    setLoadError(false);

    getChallenge(challengeId)
      .then((c) => {
        if (cancelled) return;
        const saved = loadProgress()[c.id];
        setChallenge(c);
        setPrompt(saved?.draft ?? c.starter_prompt);
        setAttempts(saved?.attempts ?? 0);
        setEverPassed(saved?.passed ?? false);
      })
      .catch(() => !cancelled && setLoadError(true));
    getTracks().then((t) => !cancelled && setTracks(t)).catch(() => {});
    getChallengeStats(challengeId).then((s) => !cancelled && setStats(s)).catch(() => {});

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [challengeId]);

  // Persist the draft so learners can leave and come back
  useEffect(() => {
    if (!challenge) return;
    const timer = setTimeout(() => updateChallenge(challenge.id, (p) => ({ ...p, draft: prompt })), 500);
    return () => clearTimeout(timer);
  }, [prompt, challenge]);

  const nextChallenge = useMemo(() => {
    const order = tracks.flatMap((t) => t.challenges);
    const i = order.findIndex((c) => c.id === challengeId);
    return i >= 0 ? order[i + 1] ?? null : null;
  }, [tracks, challengeId]);

  const trackTitle = tracks.find((t) => t.id === challenge?.track)?.title;
  const missing = challenge ? missingVariables(prompt, challenge.variables) : [];
  const canRun = !!challenge && !running && prompt.trim().length >= 10 && missing.length === 0;
  const solutionUnlocked = everPassed || attempts >= SOLUTION_UNLOCK_ATTEMPTS;

  async function handleRun() {
    if (!challenge || !canRun) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    try {
      const result = await submitAttempt(challenge.id, prompt, hints.length, controller.signal);
      setAttempt(result);
      setAttempts((n) => n + 1);
      recordAttempt(challenge.id, result.score, result.stars, result.passed);
      if (result.passed) {
        setEverPassed(true);
        toast.success(`Passed with ${result.score}/100`);
      }
    } catch (err: unknown) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        toast.error(formatApiError(err));
      }
    } finally {
      setRunning(false);
    }
  }

  async function handleAskCoach() {
    if (!challenge || hints.length >= 3) return;
    setCoachLoading(true);
    const failed = attempt?.test_results.flatMap((r) => r.checks.filter((c) => !c.passed).map((c) => c.label)) ?? [];
    const sample =
      attempt?.test_results.find((r) => !r.passed && r.output)?.output ??
      attempt?.test_results.find((r) => r.output)?.output ??
      '';
    try {
      const hint = await askCoach({
        challenge_id: challenge.id,
        prompt,
        hint_level: hints.length + 1,
        failed_checks: Array.from(new Set(failed)).slice(0, 30),
        sample_output: sample.slice(0, 2000),
        score: attempt?.score ?? 0,
      });
      setHints((h) => [...h, hint]);
      updateChallenge(challenge.id, (p) => ({ ...p, hintsUsed: Math.max(p.hintsUsed, hints.length + 1) }));
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    } finally {
      setCoachLoading(false);
    }
  }

  async function handleRevealSolution() {
    if (!challenge) return;
    try {
      setSolution((await getSolution(challenge.id)).reference_prompt);
    } catch (err: unknown) {
      toast.error(formatApiError(err));
    }
  }

  if (loadError) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="py-24 text-center text-sm text-[#666]">
          Couldn&apos;t load this challenge.{' '}
          <Link href="/" className="text-red-400 hover:underline">
            Back to the Academy
          </Link>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="flex items-center justify-center py-24 text-sm text-[#555]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-red-400" /> Loading challenge...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-[#555] hover:text-white">
          <ArrowLeft className="h-3 w-3" /> All challenges
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Left: brief, lesson, test suite */}
          <div className="space-y-6">
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-red-400/80">
                {trackTitle ? `${trackTitle} · ` : ''}
                {challenge.technique}
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{challenge.title}</h1>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-[#aaa]">{challenge.brief}</p>
              {stats && stats.attempts > 0 && (
                <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[#666]">
                  <Users className="h-3 w-3" />
                  {Math.round(stats.pass_rate * 100)}% of {stats.attempts} attempts pass · avg score {stats.avg_score}
                </p>
              )}
            </section>

            <section className="glass-card rounded-xl p-4">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#666]">
                <BookOpenCheck className="h-3.5 w-3.5" /> The idea
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[#bbb]">{challenge.lesson.summary}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-[#777]">
                <span className="font-semibold text-[#999]">Why it matters: </span>
                {challenge.lesson.why_it_matters}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Example label="Weak" tone="weak" text={challenge.lesson.weak_example} />
                <Example label="Strong" tone="strong" text={challenge.lesson.strong_example} />
              </div>
            </section>

            <TestSuite testCases={challenge.test_cases} results={attempt?.test_results ?? null} />
          </div>

          {/* Right: editor, results, coach */}
          <div className="space-y-4 lg:sticky lg:top-16 lg:self-start">
            <PromptEditor
              value={prompt}
              onChange={setPrompt}
              variables={challenge.variables}
              onReset={() => setPrompt(challenge.starter_prompt)}
              disabled={running}
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleRun}
                disabled={!canRun}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? `Running ${challenge.test_cases.length} tests on Granite...` : `Run ${challenge.test_cases.length} tests`}
              </button>
              <span className="text-[11px] text-[#555]">
                {attempts} attempt{attempts === 1 ? '' : 's'} · pass at {challenge.pass_score}
              </span>
              {attempt?.passed && nextChallenge && (
                <Link
                  href={`/challenge/${nextChallenge.id}`}
                  className="ml-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-300 hover:text-emerald-200"
                >
                  Next: {nextChallenge.title} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {attempt && <ScoreCard attempt={attempt} passScore={challenge.pass_score} />}

            <CoachPanel hints={hints} loading={coachLoading} onAsk={handleAskCoach} />

            <div className="glass-card rounded-xl p-4">
              {solution ? (
                <>
                  <h3 className="text-sm font-semibold text-white">Expert reference prompt</h3>
                  <p className="mt-0.5 text-[12px] text-[#666]">
                    One strong solution, not the only one. Compare its structure with yours.
                  </p>
                  <pre className="forge-scroll mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 px-3 py-2 font-mono text-[12px] leading-relaxed text-[#ccc]">
                    {solution}
                  </pre>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] text-[#666]">
                    {solutionUnlocked
                      ? 'Compare your approach with an expert reference prompt.'
                      : `The expert solution unlocks after you pass or make ${SOLUTION_UNLOCK_ATTEMPTS} attempts.`}
                  </p>
                  <button
                    type="button"
                    onClick={handleRevealSolution}
                    disabled={!solutionUnlocked}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#222] px-3 py-1.5 text-[12px] font-medium text-[#999] transition-colors hover:text-white disabled:opacity-40"
                  >
                    {!solutionUnlocked && <Lock className="h-3 w-3" />}
                    Reveal solution
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Example({ label, tone, text }: { label: string; tone: 'weak' | 'strong'; text: string }) {
  return (
    <div
      className={
        tone === 'weak'
          ? 'rounded-lg border border-red-500/10 bg-red-500/[0.03] p-2.5'
          : 'rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5'
      }
    >
      <p
        className={
          tone === 'weak'
            ? 'mb-1 text-[10px] font-semibold uppercase tracking-wider text-red-400/70'
            : 'mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70'
        }
      >
        {label}
      </p>
      <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[#999]">{text}</pre>
    </div>
  );
}
