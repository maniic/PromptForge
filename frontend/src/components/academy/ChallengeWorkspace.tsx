'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, ChevronLeft, ChevronRight, CloudUpload, List, Loader2, Lock, Play, Users } from 'lucide-react';
import {
  askCoach,
  getChallenge,
  getChallengeStats,
  getRoadmap,
  getSolution,
  getTracks,
  missingVariables,
  submitAttempt,
} from '@/lib/learn-api';
import { formatApiError } from '@/lib/api';
import { loadProgress, recordAttempt, updateChallenge } from '@/lib/progress';
import { toProblems } from '@/lib/curriculum';
import { useSplit } from '@/lib/use-split';
import type {
  AttemptMode,
  AttemptResponse,
  ChallengeDetail,
  ChallengeStats,
  CoachResponse,
  Roadmap,
  Track,
} from '@/types/learn';
import { TopNav } from '@/components/academy/TopNav';
import { PromptEditor } from '@/components/academy/PromptEditor';
import { ConsolePanel, type ConsoleTab } from '@/components/academy/ConsolePanel';
import { CoachPanel } from '@/components/academy/CoachPanel';
import { DifficultyBadge } from '@/components/academy/DifficultyBadge';
import { cn } from '@/lib/utils';

const SOLUTION_UNLOCK_ATTEMPTS = 3;
type LeftTab = 'description' | 'learn' | 'coach' | 'solution';

export default function ChallengeWorkspace({ challengeId, roadmapId }: { challengeId: string; roadmapId?: string }) {
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [stats, setStats] = useState<ChallengeStats | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [prompt, setPrompt] = useState('');
  const [attempt, setAttempt] = useState<AttemptResponse | null>(null);
  const [running, setRunning] = useState<AttemptMode | null>(null);
  const [submissions, setSubmissions] = useState(0);
  const [everPassed, setEverPassed] = useState(false);

  const [leftTab, setLeftTab] = useState<LeftTab>('description');
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('cases');
  const [hints, setHints] = useState<CoachResponse[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [solution, setSolution] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const cols = useSplit(42, 25, 65, 'x');
  const rows = useSplit(58, 25, 80, 'y');

  useEffect(() => {
    let cancelled = false;
    setChallenge(null);
    setAttempt(null);
    setHints([]);
    setSolution(null);
    setLoadError(false);
    setLeftTab('description');
    setConsoleTab('cases');

    getChallenge(challengeId)
      .then((c) => {
        if (cancelled) return;
        const saved = loadProgress()[c.id];
        setChallenge(c);
        setPrompt(saved?.draft ?? c.starter_prompt);
        setSubmissions(saved?.attempts ?? 0);
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

  useEffect(() => {
    if (!roadmapId) {
      setRoadmap(null);
      return;
    }
    let cancelled = false;
    getRoadmap(roadmapId)
      .then((r) => !cancelled && setRoadmap(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [roadmapId]);

  const problems = useMemo(() => toProblems(tracks), [tracks]);
  const current = problems.find((p) => p.id === challengeId) ?? null;
  // Prev/next follow the roadmap's challenge order when opened from a roadmap
  const order = useMemo(() => {
    if (!roadmap) return problems.map((p) => p.id);
    const ids = roadmap.sections.flatMap((s) => s.nodes.map((n) => n.challenge_id)).filter((id): id is string => !!id);
    return Array.from(new Set(ids));
  }, [roadmap, problems]);
  const index = order.indexOf(challengeId);
  const suffix = roadmap ? `?roadmap=${roadmap.id}` : '';
  const prev = index > 0 ? order[index - 1] : null;
  const next = index >= 0 ? order[index + 1] ?? null : null;

  const missing = challenge ? missingVariables(prompt, challenge.variables) : [];
  const canRun = !!challenge && !running && prompt.trim().length >= 10 && missing.length === 0;
  const solutionUnlocked = everPassed || submissions >= SOLUTION_UNLOCK_ATTEMPTS;

  const execute = useCallback(
    async (mode: AttemptMode) => {
      if (!challenge || !canRun) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setRunning(mode);
      setConsoleTab('result');
      try {
        const result = await submitAttempt(challenge.id, prompt, hints.length, mode, controller.signal);
        setAttempt(result);
        if (mode === 'submit') {
          setSubmissions((n) => n + 1);
          recordAttempt(challenge.id, result.score, result.stars, result.passed);
          if (result.passed) {
            setEverPassed(true);
            toast.success(`Accepted with ${result.score}/100`);
          }
        }
      } catch (err: unknown) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          toast.error(formatApiError(err));
        }
      } finally {
        setRunning(null);
      }
    },
    [challenge, canRun, prompt, hints.length]
  );

  // Ctrl/Cmd + ' to run, Ctrl/Cmd + Enter to submit
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "'") {
        e.preventDefault();
        execute('run');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        execute('submit');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [execute]);

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

  const navControls = (
    <div className="flex items-center justify-between gap-2">
      <div className="hidden items-center gap-1 md:flex">
        {roadmap ? (
          <Link
            href={`/roadmaps/${roadmap.id}`}
            className="flex max-w-[220px] items-center gap-1.5 truncate rounded-md px-2 py-1 text-sm text-fg-muted hover:bg-raised hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" /> <span className="truncate">{roadmap.title}</span>
          </Link>
        ) : (
          <Link
            href="/problems"
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-fg-muted hover:bg-raised hover:text-fg"
          >
            <List className="h-4 w-4" /> Problem list
          </Link>
        )}
        <NavArrow href={prev && `/challenge/${prev}${suffix}`} label="Previous problem">
          <ChevronLeft className="h-4 w-4" />
        </NavArrow>
        <NavArrow href={next && `/challenge/${next}${suffix}`} label="Next problem">
          <ChevronRight className="h-4 w-4" />
        </NavArrow>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => execute('run')}
          disabled={!canRun}
          title="Run visible tests (Ctrl/⌘ + ')"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-raised px-3 text-sm text-fg transition-colors hover:bg-line disabled:opacity-40"
        >
          {running === 'run' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run
        </button>
        <button
          type="button"
          onClick={() => execute('submit')}
          disabled={!canRun}
          title="Submit against all tests (Ctrl/⌘ + Enter)"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-strong px-3 text-sm font-medium text-white transition-colors hover:bg-brand disabled:opacity-40"
        >
          {running === 'submit' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CloudUpload className="h-3.5 w-3.5" />
          )}
          Submit
        </button>
      </div>
      <div className="hidden w-[150px] md:block" />
    </div>
  );

  if (loadError) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="py-24 text-center text-sm text-fg-subtle">
          Couldn&apos;t load this problem.{' '}
          <Link href="/problems" className="text-brand hover:underline">
            Back to problems
          </Link>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="flex items-center justify-center py-24 text-sm text-fg-subtle">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" /> Loading problem...
        </div>
      </div>
    );
  }

  // Requirements every test shares; case-specific checks live in the console
  const requirements = challenge.test_cases[0].checks.filter((label) =>
    challenge.test_cases.every((t) => t.checks.includes(label))
  );

  return (
    <div className="flex min-h-screen flex-col lg:h-screen">
      <TopNav>{navControls}</TopNav>

      <div
        ref={cols.containerRef}
        className="flex flex-1 flex-col gap-2 p-2 lg:grid lg:min-h-0 lg:grid-cols-[var(--left)_6px_minmax(0,1fr)] lg:gap-0"
        style={{ '--left': `${cols.pct}%` } as React.CSSProperties}
      >
        {/* Left: problem */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-panel">
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
            {(['description', 'learn', 'coach', 'solution'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setLeftTab(t)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  leftTab === t ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg-muted'
                )}
              >
                {t === 'solution' && !solutionUnlocked && <Lock className="h-3 w-3" />}
                {t}
                {t === 'coach' && hints.length > 0 && <span className="text-warn">{hints.length}</span>}
              </button>
            ))}
          </div>

          <div className="pf-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {leftTab === 'description' && (
              <article>
                <h1 className="text-xl font-semibold tracking-tight">
                  {current ? `${current.number}. ` : ''}
                  {challenge.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DifficultyBadge difficulty={challenge.difficulty} pill />
                  <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-fg-muted">{challenge.technique}</span>
                  {current && <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-fg-subtle">{current.trackTitle}</span>}
                  {everPassed && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-xs text-ok">Solved</span>}
                </div>

                <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-fg-muted">{challenge.brief}</p>

                <h2 className="mt-7 text-sm font-semibold">Template variables</h2>
                <p className="mt-1.5 text-sm text-fg-muted">
                  Your prompt must include{' '}
                  {challenge.variables.map((v, i) => (
                    <span key={v}>
                      {i > 0 && ', '}
                      <code className="rounded bg-brand-soft px-1 py-0.5 font-mono text-[12.5px] text-syn-var">{`{{${v}}}`}</code>
                    </span>
                  ))}
                  . Each test case fills them in.
                </p>

                <h2 className="mt-7 text-sm font-semibold">Requirements</h2>
                {requirements.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
                    {requirements.map((r) => (
                      <li key={r} className="flex gap-2">
                        <span className="text-fg-subtle">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-sm text-fg-subtle">
                  {requirements.length > 0 ? 'Each test case also has its own checks. ' : 'Each test case has its own checks. '}
                  See them under Test cases.
                </p>

                {challenge.rubric.length > 0 && (
                  <>
                    <h2 className="mt-7 text-sm font-semibold">Also judged by Granite on</h2>
                    <ul className="mt-2 space-y-1.5 text-sm text-fg-muted">
                      {challenge.rubric.map((r) => (
                        <li key={r} className="flex gap-2">
                          <span className="text-fg-subtle">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-xs text-fg-subtle">
                  <span>
                    {challenge.test_cases.filter((t) => !t.hidden).length} visible ·{' '}
                    {challenge.test_cases.filter((t) => t.hidden).length} hidden tests
                  </span>
                  <span>Pass at {challenge.pass_score}</span>
                  <span>Your submissions: {submissions}</span>
                  {stats && stats.attempts > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> Acceptance {Math.round(stats.pass_rate * 100)}%
                    </span>
                  )}
                </div>
              </article>
            )}

            {leftTab === 'learn' && (
              <article>
                <p className="font-mono text-xs text-brand">{challenge.technique}</p>
                <p className="mt-3 text-[15px] leading-7 text-fg">{challenge.lesson.summary}</p>
                <h2 className="mt-6 text-sm font-semibold">Why it matters</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{challenge.lesson.why_it_matters}</p>
                <h2 className="mt-6 text-sm font-semibold">Weak vs. strong</h2>
                <div className="mt-2 space-y-3">
                  <Example tone="bad" label="Weak" text={challenge.lesson.weak_example} />
                  <Example tone="ok" label="Strong" text={challenge.lesson.strong_example} />
                </div>
              </article>
            )}

            {leftTab === 'coach' && (
              <CoachPanel hints={hints} loading={coachLoading} onAsk={handleAskCoach} hasAttempt={!!attempt} />
            )}

            {leftTab === 'solution' &&
              (solution ? (
                <article>
                  <h2 className="text-sm font-semibold">Expert reference prompt</h2>
                  <p className="mt-1 text-sm text-fg-subtle">One strong solution, not the only one. Compare its structure with yours.</p>
                  <pre className="pf-scroll mt-4 overflow-auto whitespace-pre-wrap rounded-lg bg-raised px-4 py-3 font-mono text-[12.5px] leading-relaxed text-fg">
                    {solution}
                  </pre>
                </article>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  <Lock className="h-6 w-6 text-fg-subtle" />
                  <p className="mt-3 max-w-xs text-sm text-fg-muted">
                    {solutionUnlocked
                      ? 'You’ve earned it. Compare your approach with an expert reference prompt.'
                      : `Unlocks after you pass or make ${SOLUTION_UNLOCK_ATTEMPTS} submissions (${submissions}/${SOLUTION_UNLOCK_ATTEMPTS}).`}
                  </p>
                  <button
                    type="button"
                    onClick={handleRevealSolution}
                    disabled={!solutionUnlocked}
                    className="mt-4 h-9 rounded-lg border border-line-strong px-4 text-sm text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
                  >
                    Reveal solution
                  </button>
                </div>
              ))}
          </div>
        </section>

        <Divider axis="x" onPointerDown={cols.onPointerDown} />

        {/* Right: editor + console */}
        <div
          ref={rows.containerRef}
          className="flex min-h-0 flex-col gap-2 lg:grid lg:grid-rows-[var(--top)_6px_minmax(0,1fr)] lg:gap-0"
          style={{ '--top': `${rows.pct}%` } as React.CSSProperties}
        >
          <section className="min-h-0 overflow-hidden rounded-lg border border-line">
            <PromptEditor
              value={prompt}
              onChange={setPrompt}
              variables={challenge.variables}
              onReset={() => setPrompt(challenge.starter_prompt)}
              disabled={!!running}
            />
          </section>
          <Divider axis="y" onPointerDown={rows.onPointerDown} />
          <section className="min-h-0 overflow-hidden rounded-lg border border-line">
            <ConsolePanel challenge={challenge} attempt={attempt} running={running} tab={consoleTab} onTab={setConsoleTab} />
          </section>
        </div>
      </div>

      {/* Mobile action bar */}
      <div className="sticky bottom-0 border-t border-line bg-canvas p-2 md:hidden">{navControls}</div>
    </div>
  );
}

function NavArrow({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return (
      <span className="rounded-md p-1 text-line-strong" aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className="rounded-md p-1 text-fg-muted hover:bg-raised hover:text-fg">
      {children}
    </Link>
  );
}

function Divider({ axis, onPointerDown }: { axis: 'x' | 'y'; onPointerDown: (e: React.PointerEvent<HTMLElement>) => void }) {
  return (
    <div
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      onPointerDown={onPointerDown}
      className={cn(
        'group hidden items-center justify-center lg:flex',
        axis === 'x' ? 'cursor-col-resize' : 'cursor-row-resize'
      )}
    >
      <span
        className={cn(
          'rounded-full bg-line transition-colors group-hover:bg-brand',
          axis === 'x' ? 'h-8 w-0.5' : 'h-0.5 w-8'
        )}
      />
    </div>
  );
}

function Example({ tone, label, text }: { tone: 'ok' | 'bad'; label: string; text: string }) {
  return (
    <div className={cn('rounded-lg border p-3', tone === 'ok' ? 'border-[rgba(66,190,101,0.3)]' : 'border-[rgba(250,77,86,0.3)]')}>
      <p className={cn('mb-1.5 text-xs font-medium', tone === 'ok' ? 'text-ok' : 'text-bad')}>{label}</p>
      <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-fg-muted">{text}</pre>
    </div>
  );
}
