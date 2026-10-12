'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, CircleDashed, Loader2, Search } from 'lucide-react';
import { getTracks } from '@/lib/learn-api';
import { useProgress } from '@/lib/progress';
import { DIFFICULTY_LABEL, statusOf, toProblems, type ProblemStatus } from '@/lib/curriculum';
import type { Difficulty, Track } from '@/types/learn';
import { TopNav } from '@/components/academy/TopNav';
import { DifficultyBadge } from '@/components/academy/DifficultyBadge';
import { StarRating } from '@/components/academy/StarRating';
import { cn } from '@/lib/utils';

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const DIFFICULTY_BAR: Record<Difficulty, string> = {
  beginner: 'bg-ok',
  intermediate: 'bg-warn',
  advanced: 'bg-bad',
};

export default function ProblemsPage() {
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [trackFilter, setTrackFilter] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [status, setStatus] = useState<ProblemStatus | ''>('');
  const progress = useProgress();

  useEffect(() => {
    getTracks().then(setTracks).catch(() => setError(true));
  }, []);

  const problems = useMemo(() => toProblems(tracks ?? []), [tracks]);
  const visible = problems.filter((p) => {
    const q = query.trim().toLowerCase();
    return (
      (!q || p.title.toLowerCase().includes(q) || p.technique.toLowerCase().includes(q)) &&
      (!trackFilter || p.trackId === trackFilter) &&
      (!difficulty || p.difficulty === difficulty) &&
      (!status || statusOf(progress[p.id]) === status)
    );
  });
  const solved = problems.filter((p) => progress[p.id]?.passed);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
          <p className="mt-1 text-sm text-fg-subtle">
            Each problem is a test suite. Write a prompt, run it on IBM Granite, and pass the checks.
          </p>

          {/* Track chips */}
          <div className="mt-6 flex flex-wrap gap-2">
            <Chip active={!trackFilter} onClick={() => setTrackFilter(null)}>
              All topics
            </Chip>
            {tracks?.map((t) => (
              <Chip key={t.id} active={trackFilter === t.id} onClick={() => setTrackFilter(t.id)}>
                {t.title}
                <span className="ml-1.5 text-fg-subtle">{t.challenges.length}</span>
              </Chip>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <label className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems or techniques"
                aria-label="Search problems"
                className="h-9 w-full rounded-lg border border-line bg-panel pl-9 pr-3 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-brand"
              />
            </label>
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={(v) => setDifficulty(v as Difficulty | '')}
              options={DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))}
            />
            <Select
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as ProblemStatus | '')}
              options={[
                { value: 'solved', label: 'Solved' },
                { value: 'attempted', label: 'Attempted' },
                { value: 'todo', label: 'To do' },
              ]}
            />
          </div>

          {/* Table */}
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead className="bg-panel text-left text-xs text-fg-subtle">
                <tr>
                  <th className="w-14 px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="hidden px-4 py-2.5 font-medium md:table-cell">Technique</th>
                  <th className="w-24 px-4 py-2.5 font-medium">Difficulty</th>
                  <th className="hidden w-24 px-4 py-2.5 font-medium sm:table-cell">Score</th>
                </tr>
              </thead>
              <tbody>
                {!tracks && !error && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-fg-subtle">
                      <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Loading problems...
                    </td>
                  </tr>
                )}
                {error && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-fg-subtle">
                      Couldn&apos;t reach the PromptForge API. Is the backend running?
                    </td>
                  </tr>
                )}
                {tracks && visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-fg-subtle">
                      No problems match these filters.
                    </td>
                  </tr>
                )}
                {visible.map((p, i) => {
                  const pr = progress[p.id];
                  const st = statusOf(pr);
                  return (
                    <tr
                      key={p.id}
                      className={cn('border-t border-line transition-colors hover:bg-raised', i % 2 === 1 && 'bg-[rgba(21,22,26,0.45)]')}
                    >
                      <td className="px-4 py-3">
                        {st === 'solved' ? (
                          <CheckCircle2 className="h-4 w-4 text-ok" aria-label="Solved" />
                        ) : st === 'attempted' ? (
                          <CircleDashed className="h-4 w-4 text-warn" aria-label="Attempted" />
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/challenge/${p.id}`} className="font-medium text-fg hover:text-brand">
                          {p.number}. {p.title}
                        </Link>
                        <span className="ml-2 text-xs text-fg-subtle md:hidden">{p.technique}</span>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="rounded-md bg-raised px-2 py-0.5 text-xs text-fg-muted">{p.technique}</span>
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge difficulty={p.difficulty} />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        {pr?.passed ? (
                          <StarRating stars={pr.stars} />
                        ) : pr?.attempts ? (
                          <span className="font-mono text-xs text-fg-subtle">{pr.bestScore}</span>
                        ) : (
                          <span className="text-fg-subtle">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-4 lg:pt-[60px]">
          <div className="rounded-xl border border-line bg-panel p-5">
            <p className="text-xs font-medium text-fg-subtle">Progress</p>
            <p className="mt-1 text-3xl font-semibold">
              {solved.length}
              <span className="text-base font-normal text-fg-subtle"> / {problems.length} solved</span>
            </p>
            <div className="mt-4 space-y-3">
              {DIFFICULTIES.map((d) => {
                const total = problems.filter((p) => p.difficulty === d).length;
                const done = solved.filter((p) => p.difficulty === d).length;
                return (
                  <div key={d}>
                    <div className="flex justify-between text-xs">
                      <DifficultyBadge difficulty={d} />
                      <span className="font-mono text-fg-subtle">
                        {done}/{total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', DIFFICULTY_BAR[d])}
                        style={{ width: total ? `${(done / total) * 100}%` : 0 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-panel p-5">
            <p className="text-xs font-medium text-fg-subtle">How problems are graded</p>
            <ul className="mt-3 space-y-2 text-[13px] text-fg-muted">
              <li><span className="text-fg">Run</span> tries your prompt on the visible tests.</li>
              <li><span className="text-fg">Submit</span> adds hidden tests and the Granite judge.</li>
              <li>Pass at 80. Stars at 80, 90, and 97.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-[13px] transition-colors',
        active ? 'border-brand bg-brand-soft text-fg' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
      )}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-9 rounded-lg border border-line bg-panel px-3 text-sm text-fg-muted outline-none focus:border-brand"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
