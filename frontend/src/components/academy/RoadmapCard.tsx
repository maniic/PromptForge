import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { LEVEL_LABEL } from '@/lib/roadmap';
import type { RoadmapSummary } from '@/types/learn';
import { cn } from '@/lib/utils';

interface RoadmapCardProps {
  roadmap: RoadmapSummary;
  done: number;
  total: number;
  featured?: boolean;
}

export function RoadmapCard({ roadmap, done, total, featured }: RoadmapCardProps) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <Link
      href={`/roadmaps/${roadmap.id}`}
      className={cn(
        'group flex flex-col rounded-xl border bg-panel p-5 transition-colors hover:border-line-strong hover:bg-raised',
        featured ? 'border-[rgba(69,137,255,0.45)]' : 'border-line'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-fg-subtle">
          {LEVEL_LABEL[roadmap.level]}
          {' · '}
          {roadmap.node_ids.length} steps
        </span>
        <ArrowRight className="h-4 w-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
      </div>
      <h3 className={cn('mt-3 font-semibold tracking-tight', featured ? 'text-xl' : 'text-base')}>{roadmap.title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">{roadmap.tagline}</p>
      <div className="mt-5">
        <div className="flex justify-between text-[11px] text-fg-subtle">
          <span>{done > 0 ? `${done} of ${total} done` : 'Not started'}</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-raised">
          <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}
