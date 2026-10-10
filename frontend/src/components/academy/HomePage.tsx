'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';
import { getTracks } from '@/lib/learn-api';
import { useProgress } from '@/lib/progress';
import { toProblems } from '@/lib/curriculum';
import type { Track } from '@/types/learn';
import { TopNav } from '@/components/academy/TopNav';
import { DifficultyBadge } from '@/components/academy/DifficultyBadge';

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

export default function HomePage() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const progress = useProgress();

  useEffect(() => {
    getTracks().then(setTracks).catch(() => setTracks([]));
  }, []);

  const problems = useMemo(() => toProblems(tracks ?? []), [tracks]);
  const next = problems.find((p) => !progress[p.id]?.passed) ?? problems[0];
  const started = problems.some((p) => (progress[p.id]?.attempts ?? 0) > 0);

  return (
    <div className="min-h-screen">
      <TopNav />

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <p className="font-mono text-xs text-brand">{'// prompt engineering, practiced'}</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Learn prompt engineering by solving problems.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted">
              Like LeetCode, but the code is a prompt. Write one, run it on IBM Granite against real test cases,
              see which checks fail, and iterate until it holds up on inputs you can&apos;t see.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={next ? `/challenge/${next.id}` : '/problems'}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-strong px-5 text-sm font-medium text-white transition-colors hover:bg-brand"
              >
                {started && next ? `Continue: ${next.title}` : 'Start solving'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/problems"
                className="inline-flex h-10 items-center rounded-lg border border-line-strong px-5 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                Browse problems
              </Link>
            </div>
            <dl className="mt-10 flex gap-10 text-sm">
              <Stat value={problems.length || 9} label="problems" />
              <Stat value={tracks?.length || 4} label="tracks" />
              <Stat value="13" label="check types" />
            </dl>
          </div>

          <ResultMock />
        </div>
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

      {/* Tracks */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Learning tracks</h2>
          <Link href="/problems" className="text-sm text-brand hover:underline">
            All problems →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {tracks?.map((t) => {
            const items = problems.filter((p) => p.trackId === t.id);
            const done = items.filter((p) => progress[p.id]?.passed).length;
            return (
              <div key={t.id} className="rounded-xl border border-line bg-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium">{t.title}</h3>
                    <p className="mt-1 text-sm text-fg-subtle">{t.description}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs text-fg-subtle">
                    {done}/{items.length}
                  </span>
                </div>
                <ul className="mt-4 divide-y divide-line border-t border-line">
                  {items.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/challenge/${p.id}`}
                        className="flex items-center gap-3 py-2.5 text-sm transition-colors hover:text-brand"
                      >
                        {progress[p.id]?.passed ? (
                          <Check className="h-3.5 w-3.5 text-ok" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-line-strong" />
                        )}
                        <span className="flex-1">
                          {p.number}. {p.title}
                        </span>
                        <DifficultyBadge difficulty={p.difficulty} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
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
