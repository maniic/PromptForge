'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { getRoadmaps, getTracks } from '@/lib/learn-api';
import { useProgress, useRoadmapStatus } from '@/lib/progress';
import { toProblems } from '@/lib/curriculum';
import { summaryCompletion } from '@/lib/roadmap';
import type { RoadmapSummary, Track } from '@/types/learn';
import { TopNav } from '@/components/academy/TopNav';
import { RoadmapCard } from '@/components/academy/RoadmapCard';

const STEPS = [
  {
    title: 'Write the prompt yourself',
    body: 'Every problem starts from a weak prompt. Nothing is generated for you. The skill is in the rewrite.',
  },
  {
    title: 'Get graded like code',
    body: 'IBM Granite runs your prompt on visible and hidden test cases. Deterministic checks grade each output, and a Granite judge scores what code can’t check.',
  },
  {
    title: 'Get coached, not carried',
    body: 'Stuck? The Granite coach diagnoses the failure and gives hints in three levels: a nudge, the concept, then a pattern. It never gives you the answer.',
  },
] as const;

const LADDER = [
  { level: 'Vibe', example: 'add login lol', note: 'The model guesses everything.' },
  { level: 'Prompt', example: 'You are a senior engineer. Add email/password login. Output the code.', note: 'Role, task, format.' },
  { level: 'Spec', example: 'Goal · Assumptions · Plan · Acceptance criteria', note: 'Done is defined before code exists.' },
  { level: 'Agent brief', example: 'Spec + repo rules + tests to pass + what needs approval', note: 'An agent can run with it safely.' },
] as const;

export default function HomePage() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[] | null>(null);
  const progress = useProgress();
  const statuses = useRoadmapStatus();

  useEffect(() => {
    getTracks().then(setTracks).catch(() => setTracks([]));
    getRoadmaps().then(setRoadmaps).catch(() => setRoadmaps([]));
  }, []);

  const problems = useMemo(() => toProblems(tracks ?? []), [tracks]);

  return (
    <div className="min-h-screen">
      <TopNav />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="font-mono text-xs text-brand">{'// from vibe coding to agentic development'}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Stop asking models to &ldquo;do this for me.&rdquo; Learn to direct them.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted">
              Pick a roadmap (general, agentic development, or your field) and work through hands-on challenges. Write
              the prompt, run it on IBM Granite against real test cases, see which checks fail, and iterate until it
              holds up on inputs you can&apos;t see.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/roadmaps"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-medium text-white transition-colors hover:bg-brand"
              >
                Choose a roadmap
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/problems"
                className="inline-flex h-10 items-center rounded-lg border border-line-strong px-5 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                Browse all problems
              </Link>
            </div>
            <dl className="mt-10 flex gap-10 text-sm">
              <Stat value={roadmaps?.length || 6} label="roadmaps" />
              <Stat value={problems.length || 19} label="graded problems" />
              <Stat value="14" label="check types" />
            </dl>
          </div>

          <ResultMock />
        </div>
      </section>

      {/* The progression */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-xl font-semibold tracking-tight">From vibe to agent brief</h2>
        <p className="mt-1 text-sm text-fg-subtle">The progression every roadmap walks you through.</p>
        <ol className="mt-6 grid gap-3 md:grid-cols-4">
          {LADDER.map((step, i) => (
            <li key={step.level} className="relative rounded-xl border border-line bg-panel p-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-fg-subtle">L{i}</span>
                <span className={i === 0 ? 'font-semibold text-bad' : i === LADDER.length - 1 ? 'font-semibold text-ok' : 'font-semibold'}>
                  {step.level}
                </span>
              </div>
              <p className="mt-3 rounded-md bg-raised px-3 py-2 font-mono text-[12px] leading-relaxed text-fg-muted">
                {step.example}
              </p>
              <p className="mt-3 text-[13px] text-fg-subtle">{step.note}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="bg-panel p-6">
              <span className="font-mono text-xs text-fg-subtle">0{i + 1}</span>
              <h3 className="mt-3 font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmaps */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Pick a roadmap</h2>
          <Link href="/roadmaps" className="text-sm text-brand hover:underline">
            All roadmaps →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roadmaps?.map((r) => {
            const { done, total } = summaryCompletion(r, statuses, progress);
            return <RoadmapCard key={r.id} roadmap={r} done={done} total={total} featured={r.category === 'core'} />;
          })}
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-xs text-fg-subtle">
        Built on IBM watsonx.ai with Granite models
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
      <dd className="text-xs text-fg-subtle">{label}</dd>
    </div>
  );
}

/** Static illustration of the grading loop: a prompt and its test results. */
function ResultMock() {
  const checks: [string, boolean][] = [
    ['Output is valid JSON with nothing around it', true],
    ['Has keys name, company, meeting_date, topic', true],
    ['meeting_date is ISO formatted', false],
  ];
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/40">
      <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 font-mono text-xs text-fg-subtle">3. Speak JSON</span>
      </div>
      <pre className="whitespace-pre-wrap px-4 py-4 font-mono text-[12.5px] leading-relaxed text-fg-muted">
        <span className="text-fg-subtle">1 </span> Return ONLY a JSON object with keys{'\n'}
        <span className="text-fg-subtle">2 </span> name, company, meeting_date, topic.{'\n'}
        <span className="text-fg-subtle">3 </span>{'\n'}
        <span className="text-fg-subtle">4 </span> <span className="text-syn-tag">&lt;email&gt;</span>
        <span className="text-syn-var">{'{{email}}'}</span>
        <span className="text-syn-tag">&lt;/email&gt;</span>
      </pre>
      <div className="border-t border-line px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-bad">Failed · 2 of 3 tests</span>
          <span className="font-mono text-xs text-fg-subtle">score 71 / 80</span>
        </div>
        <ul className="mt-3 space-y-1.5 text-[13px]">
          {checks.map(([label, ok]) => (
            <li key={label} className="flex items-center gap-2">
              {ok ? <Check className="h-3.5 w-3.5 text-ok" /> : <X className="h-3.5 w-3.5 text-bad" />}
              <span className={ok ? 'text-fg-muted' : 'text-fg'}>{label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg border border-[rgba(241,194,27,0.25)] bg-warn-soft px-3 py-2.5 text-[13px] text-fg-muted">
          <span className="font-medium text-warn">Coach · Nudge</span> — The email says &ldquo;March 12, 2026&rdquo;. What
          does your prompt say about how dates should look?
        </div>
      </div>
    </div>
  );
}
