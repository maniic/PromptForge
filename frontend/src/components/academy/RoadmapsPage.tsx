'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getRoadmaps } from '@/lib/learn-api';
import { useProgress, useRoadmapStatus } from '@/lib/progress';
import { CATEGORY_LABEL, summaryCompletion } from '@/lib/roadmap';
import type { RoadmapCategory, RoadmapSummary } from '@/types/learn';
import { TopNav } from '@/components/academy/TopNav';
import { RoadmapCard } from '@/components/academy/RoadmapCard';
import { cn } from '@/lib/utils';

const GROUPS: { category: RoadmapCategory; blurb: string }[] = [
  { category: 'start', blurb: 'New to prompting? The fundamentals that every other roadmap builds on.' },
  { category: 'core', blurb: 'The shift from vibe coding to directing coding agents with specs, context, and verification.' },
  { category: 'field', blurb: 'Apply the same discipline to the work you actually do.' },
];

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<RoadmapSummary[] | null>(null);
  const [error, setError] = useState(false);
  const progress = useProgress();
  const statuses = useRoadmapStatus();

  useEffect(() => {
    getRoadmaps().then(setRoadmaps).catch(() => setError(true));
  }, []);

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Roadmaps</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Step-by-step paths from &ldquo;do this for me&rdquo; to prompts that reliably drive models and agents. Pick
          one. Every step is either a short concept or a challenge graded on IBM Granite.
        </p>

        {error && <p className="py-16 text-center text-sm text-fg-subtle">Couldn&apos;t reach the PromptForge API.</p>}
        {!roadmaps && !error && (
          <div className="flex items-center justify-center py-16 text-sm text-fg-subtle">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" /> Loading roadmaps...
          </div>
        )}

        {roadmaps &&
          GROUPS.map(({ category, blurb }) => {
            const items = roadmaps.filter((r) => r.category === category);
            if (items.length === 0) return null;
            return (
              <section key={category} className="mt-10">
                <div className="flex items-baseline gap-3 border-b border-line pb-3">
                  <h2 className="text-lg font-semibold">{CATEGORY_LABEL[category]}</h2>
                  <p className="text-sm text-fg-subtle">{blurb}</p>
                </div>
                <div
                  className={cn(
                    'mt-5 grid gap-4',
                    category === 'field' ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'
                  )}
                >
                  {items.map((r) => {
                    const { done, total } = summaryCompletion(r, statuses, progress);
                    return <RoadmapCard key={r.id} roadmap={r} done={done} total={total} featured={category === 'core'} />;
                  })}
                </div>
              </section>
            );
          })}
      </main>
    </div>
  );
}
