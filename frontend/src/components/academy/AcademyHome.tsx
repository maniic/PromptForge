'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, FlaskConical, Loader2, MessageCircleQuestion, PenLine } from 'lucide-react';
import { getTracks } from '@/lib/learn-api';
import { EMPTY_PROGRESS, useProgress } from '@/lib/progress';
import type { Track } from '@/types/learn';
import { SiteHeader } from '@/components/academy/SiteHeader';
import { StarRating } from '@/components/academy/StarRating';
import { cn } from '@/lib/utils';

const PILLARS = [
  {
    icon: PenLine,
    title: 'You write the prompt',
    body: 'No auto-generated answers. You learn by writing, running, and iterating on your own prompts.',
  },
  {
    icon: CheckCircle2,
    title: 'Graded like code',
    body: 'Every challenge is a test suite. Granite runs your prompt on visible and hidden inputs, and deterministic checks grade each output.',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Coached, not carried',
    body: 'A Socratic Granite coach diagnoses failures and gives escalating hints. It never writes the answer for you.',
  },
] as const;

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner: 'text-emerald-400/80 border-emerald-500/20',
  intermediate: 'text-amber-400/80 border-amber-500/20',
  advanced: 'text-red-400/80 border-red-500/20',
};

export default function AcademyHome() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState(false);
  const progress = useProgress();

  useEffect(() => {
    getTracks().then(setTracks).catch(() => setError(true));
  }, []);

  const all = useMemo(() => tracks?.flatMap((t) => t.challenges) ?? [], [tracks]);
  const passedCount = all.filter((c) => progress[c.id]?.passed).length;
  const totalStars = all.reduce((sum, c) => sum + (progress[c.id]?.stars ?? 0), 0);
  const next = all.find((c) => !progress[c.id]?.passed) ?? all[0];
  const started = all.some((c) => (progress[c.id]?.attempts ?? 0) > 0);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {/* Hero */}
        <section className="pt-14 pb-12 text-center sm:pt-20">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#555]">
              Prompt engineering, learned by doing · Powered by IBM Granite
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              A flight simulator for <span className="gradient-text-red">prompt engineering</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-[#777] sm:text-base">
              Write a prompt. Watch IBM Granite run it against real test cases. See exactly which checks pass
              and fail, get coached on why, and iterate until your prompt holds up in production.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {next && (
                <Link
                  href={`/challenge/${next.id}`}
                  className="group inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white glow-red-strong transition-colors hover:bg-red-400"
                >
                  {started ? `Continue: ${next.title}` : 'Start the first challenge'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
              <Link
                href="/lab"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1f1f1f] px-5 py-3 text-sm font-medium text-[#888] transition-colors hover:border-[#2f2f2f] hover:text-white"
              >
                <FlaskConical className="h-4 w-4" />
                Free practice in the Lab
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Pillars */}
        <section className="grid gap-3 sm:grid-cols-3">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="glass-card rounded-xl p-5">
              <Icon className="mb-3 h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-white">{title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#777]">{body}</p>
            </div>
          ))}
        </section>

        {/* Progress */}
        {tracks && (
          <section className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-white/[0.04] py-5">
            <Stat label="Challenges passed" value={`${passedCount} / ${all.length}`} />
            <Stat label="Stars earned" value={`${totalStars} / ${all.length * 3}`} />
            <div className="min-w-[200px] flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#151515]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-400 transition-all duration-700"
                  style={{ width: `${all.length ? (passedCount / all.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </section>
        )}

        {/* Tracks */}
        <section className="mt-10 space-y-10">
          {error && (
            <p className="py-10 text-center text-sm text-[#666]">
              Couldn&apos;t reach the PromptForge API. Is the backend running?
            </p>
          )}
          {!tracks && !error && (
            <div className="flex items-center justify-center py-16 text-sm text-[#555]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-red-400" /> Loading curriculum...
            </div>
          )}
          {tracks?.map((track, ti) => (
            <div key={track.id}>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="font-mono text-[11px] text-[#444]">0{ti + 1}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{track.title}</h2>
                  <p className="text-[13px] text-[#666]">{track.description}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {track.challenges.map((c) => {
                  const p = progress[c.id] ?? EMPTY_PROGRESS;
                  return (
                    <Link
                      key={c.id}
                      href={`/challenge/${c.id}`}
                      className={cn(
                        'group glass-card card-hover rounded-xl p-4',
                        p.passed && 'border-emerald-500/15'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                            DIFFICULTY_STYLES[c.difficulty]
                          )}
                        >
                          {c.difficulty}
                        </span>
                        {p.passed ? (
                          <StarRating stars={p.stars} />
                        ) : p.attempts > 0 ? (
                          <span className="text-[10px] text-[#666]">best {p.bestScore}</span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-[15px] font-semibold text-white group-hover:text-red-300">{c.title}</h3>
                      <p className="mt-0.5 text-[12px] text-[#666]">{c.technique}</p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#555]">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
  );
}
