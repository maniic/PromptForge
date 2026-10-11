'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Check, Code2, Loader2 } from 'lucide-react';
import { getRoadmap } from '@/lib/learn-api';
import { useProgress, useRoadmapStatus } from '@/lib/progress';
import { flatNodes, LEVEL_LABEL, nodeStatus, roadmapCompletion, type NodeStatus } from '@/lib/roadmap';
import type { Roadmap, RoadmapNode } from '@/types/learn';
import { TopNav } from '@/components/academy/TopNav';
import { NodeDrawer } from '@/components/academy/NodeDrawer';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<NodeStatus, string> = {
  done: 'border-[rgba(66,190,101,0.55)] bg-ok-soft',
  'in-progress': 'border-[rgba(241,194,27,0.55)]',
  skipped: 'opacity-45 line-through',
  pending: 'border-line-strong hover:border-brand',
};

export default function RoadmapView({ roadmapId }: { roadmapId: string }) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const progress = useProgress();
  const statuses = useRoadmapStatus();

  useEffect(() => {
    getRoadmap(roadmapId).then(setRoadmap).catch(() => setError(true));
  }, [roadmapId]);

  const nodes = useMemo(() => (roadmap ? flatNodes(roadmap) : []), [roadmap]);
  const statusOf = (n: RoadmapNode) => nodeStatus(n, statuses[roadmapId], progress);
  const openIndex = nodes.findIndex((n) => n.id === openId);

  if (error) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <p className="py-24 text-center text-sm text-fg-subtle">
          Couldn&apos;t load this roadmap.{' '}
          <Link href="/roadmaps" className="text-brand hover:underline">
            All roadmaps
          </Link>
        </p>
      </div>
    );
  }
  if (!roadmap) {
    return (
      <div className="min-h-screen">
        <TopNav />
        <div className="flex items-center justify-center py-24 text-sm text-fg-subtle">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" /> Loading roadmap...
        </div>
      </div>
    );
  }

  const { done, total } = roadmapCompletion(roadmap, statuses, progress);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const next = nodes.find((n) => !n.optional && !['done', 'skipped'].includes(statusOf(n)));

  return (
    <div className="min-h-screen">
      <TopNav />

      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Link href="/roadmaps" className="inline-flex items-center gap-1.5 text-sm text-fg-subtle hover:text-fg">
            <ArrowLeft className="h-3.5 w-3.5" /> All roadmaps
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{roadmap.title}</h1>
          <p className="mt-3 max-w-3xl leading-relaxed text-fg-muted">{roadmap.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="min-w-[240px] flex-1">
              <div className="flex justify-between text-xs text-fg-subtle">
                <span>
                  <span className="font-medium text-fg">{done}</span> of {total} done
                </span>
                <span className="font-mono">{pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-raised">
                <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            {next && (
              <button
                type="button"
                onClick={() => setOpenId(next.id)}
                className="inline-flex h-9 items-center rounded-lg bg-brand-strong px-4 text-sm font-medium text-white transition-colors hover:bg-brand"
              >
                {done === 0 ? 'Start' : 'Continue'}: {next.title}
              </button>
            )}
          </div>

          <Legend level={LEVEL_LABEL[roadmap.level]} />
        </div>
      </header>

      {/* Graph */}
      <main className="relative mx-auto max-w-5xl px-4 pb-24 pt-12">
        <div
          className="absolute bottom-24 top-12 w-0.5 bg-[rgba(69,137,255,0.35)] left-[27px] md:left-1/2 md:-translate-x-1/2"
          aria-hidden="true"
        />
        <ol className="relative space-y-14">
          {roadmap.sections.map((section, si) => (
            <li key={section.id}>
              {/* Section node on the spine */}
              <div className="flex md:justify-center">
                <div className="relative z-10 rounded-lg border-2 border-brand bg-[#0f1a2e] px-5 py-3 md:text-center">
                  <p className="font-mono text-[11px] text-brand">{String(si + 1).padStart(2, '0')}</p>
                  <h2 className="font-semibold">{section.title}</h2>
                  <p className="mt-0.5 text-xs text-fg-muted">{section.description}</p>
                </div>
              </div>

              {/* Steps: alternate left/right on desktop, a single indented column on mobile */}
              <div className="mt-6 grid gap-3 pl-14 md:grid-cols-2 md:gap-x-24 md:gap-y-4 md:pl-0">
                {section.nodes.map((node, ni) => {
                  const status = statusOf(node);
                  const left = ni % 2 === 0;
                  return (
                    <div
                      key={node.id}
                      className={cn(
                        'relative flex',
                        left ? 'md:col-start-1 md:justify-end' : 'md:col-start-2 md:justify-start'
                      )}
                    >
                      {/* Connector to the spine */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute left-0 top-1/2 w-11 -translate-x-full border-t border-dashed border-line-strong md:w-12',
                          left ? 'md:left-auto md:right-0 md:translate-x-full' : 'md:left-0 md:-translate-x-full'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setOpenId(node.id)}
                        className={cn(
                          'relative w-full rounded-lg border bg-panel px-4 py-3 text-left transition-colors md:max-w-[340px]',
                          node.optional && 'border-dashed',
                          STATUS_STYLES[status]
                        )}
                      >
                        <span className="flex items-center gap-2 text-[11px] text-fg-subtle">
                          {node.kind === 'challenge' ? (
                            <Code2 className="h-3.5 w-3.5 text-brand" />
                          ) : (
                            <BookOpen className="h-3.5 w-3.5 text-syn-label" />
                          )}
                          {node.kind === 'challenge' ? 'Challenge' : 'Concept'}
                          {node.optional && ' · optional'}
                          {status === 'done' && <Check className="ml-auto h-3.5 w-3.5 text-ok" />}
                          {status === 'in-progress' && <span className="ml-auto h-2 w-2 rounded-full bg-warn" />}
                        </span>
                        <span className="mt-1 block font-medium text-fg">{node.title}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      </main>

      {openIndex >= 0 && (
        <NodeDrawer
          roadmapId={roadmap.id}
          node={nodes[openIndex]}
          status={statusOf(nodes[openIndex])}
          progress={nodes[openIndex].challenge_id ? progress[nodes[openIndex].challenge_id!] : undefined}
          next={nodes[openIndex + 1] ?? null}
          onNavigate={setOpenId}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function Legend({ level }: { level: string }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-subtle">
      <span className="rounded border border-line px-2 py-0.5 font-mono">{level}</span>
      <span className="flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5 text-syn-label" /> Concept
      </span>
      <span className="flex items-center gap-1.5">
        <Code2 className="h-3.5 w-3.5 text-brand" /> Challenge (graded on Granite)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border border-[rgba(66,190,101,0.55)] bg-ok-soft" /> Done
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border border-[rgba(241,194,27,0.55)]" /> In progress
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm border border-dashed border-line-strong" /> Optional
      </span>
    </div>
  );
}
