'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Code2, X } from 'lucide-react';
import { setNodeStatus, type ChallengeProgress, type ManualStatus } from '@/lib/progress';
import type { NodeStatus } from '@/lib/roadmap';
import type { RoadmapNode } from '@/types/learn';
import { DifficultyBadge } from '@/components/academy/DifficultyBadge';
import { StarRating } from '@/components/academy/StarRating';
import { cn } from '@/lib/utils';

const MANUAL: { value: ManualStatus | null; label: string }[] = [
  { value: null, label: 'Pending' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'skipped', label: 'Skip' },
];

interface NodeDrawerProps {
  roadmapId: string;
  node: RoadmapNode;
  status: NodeStatus;
  progress?: ChallengeProgress;
  next: RoadmapNode | null;
  onNavigate: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeDrawer({ roadmapId, node, status, progress, next, onNavigate, onClose }: NodeDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isChallenge = node.kind === 'challenge';

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="node-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <aside className="pf-scroll absolute inset-y-0 right-0 flex w-full max-w-xl flex-col overflow-y-auto border-l border-line bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-3">
          <span className="flex items-center gap-2 text-xs text-fg-subtle">
            {isChallenge ? <Code2 className="h-3.5 w-3.5 text-brand" /> : <BookOpen className="h-3.5 w-3.5 text-syn-label" />}
            {isChallenge ? 'Challenge' : 'Concept'}
            {node.optional && ' · optional'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-fg-subtle hover:bg-raised hover:text-fg"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 px-6 py-6">
          <h2 id="node-title" className="text-2xl font-semibold tracking-tight">
            {node.title}
          </h2>

          {isChallenge ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {node.difficulty && <DifficultyBadge difficulty={node.difficulty} pill />}
                {node.technique && (
                  <span className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-fg-muted">{node.technique}</span>
                )}
              </div>
              <p className="mt-5 leading-7 text-fg-muted">{node.summary}</p>

              <div className="mt-6 rounded-lg border border-line bg-raised p-4">
                {status === 'done' ? (
                  <p className="flex items-center gap-2 text-sm text-ok">
                    Solved <StarRating stars={progress?.stars ?? 0} />
                    <span className="text-fg-subtle">best score {progress?.bestScore}</span>
                  </p>
                ) : status === 'in-progress' ? (
                  <p className="text-sm text-warn">
                    In progress · best score {progress?.bestScore ?? 0} after {progress?.attempts ?? 0} submission(s)
                  </p>
                ) : (
                  <p className="text-sm text-fg-subtle">
                    Write a prompt, run it on IBM Granite against visible and hidden tests, and pass the checks. This step
                    is marked done automatically when you pass.
                  </p>
                )}
                <Link
                  href={`/challenge/${node.challenge_id}?roadmap=${roadmapId}`}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-brand-strong px-4 text-sm font-medium text-white transition-colors hover:bg-brand"
                >
                  {status === 'done' ? 'Open again' : status === 'in-progress' ? 'Keep going' : 'Solve this challenge'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-4 leading-7 text-fg-muted">{node.summary}</p>
              <ul className="mt-5 space-y-2.5">
                {node.points.map((p) => (
                  <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-fg">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-syn-label" />
                    {p}
                  </li>
                ))}
              </ul>
              {node.weak_example && node.strong_example && (
                <div className="mt-7 space-y-3">
                  <Example tone="bad" label="Vibe" text={node.weak_example} />
                  <Example tone="ok" label="Engineered" text={node.strong_example} />
                </div>
              )}
            </>
          )}

          {/* Status */}
          <div className="mt-8 border-t border-line pt-5">
            <p className="text-xs text-fg-subtle">Your status</p>
            <div className="mt-2 inline-flex rounded-lg border border-line p-0.5">
              {MANUAL.filter((m) => !isChallenge || m.value === null || m.value === 'skipped').map((m) => {
                const active = m.value === null ? status === 'pending' || (isChallenge && status !== 'skipped') : status === m.value;
                return (
                  <button
                    key={m.label}
                    type="button"
                    disabled={isChallenge && status === 'done'}
                    onClick={() => setNodeStatus(roadmapId, node.id, m.value)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs transition-colors disabled:opacity-40',
                      active ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg-muted'
                    )}
                  >
                    {isChallenge && m.value === null ? 'Tracked automatically' : m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {next && (
          <button
            type="button"
            onClick={() => onNavigate(next.id)}
            className="flex items-center justify-between border-t border-line px-6 py-4 text-left text-sm transition-colors hover:bg-raised"
          >
            <span>
              <span className="block text-xs text-fg-subtle">Next step</span>
              <span className="font-medium">{next.title}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-fg-subtle" />
          </button>
        )}
      </aside>
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
