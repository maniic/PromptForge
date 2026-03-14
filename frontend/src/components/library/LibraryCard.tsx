'use client';

import { useState } from 'react';
import { ArrowRight, ArrowUp } from 'lucide-react';
import Link from 'next/link';
import type { LibrarySummary } from '@/types/api';
import { upvotePrompt } from '@/lib/api';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  vibe_coding: { bg: 'bg-red-500/8', text: 'text-red-400', border: 'border-red-500/20' },
  brainstorming: { bg: 'bg-orange-500/8', text: 'text-orange-400', border: 'border-orange-500/20' },
  qa: { bg: 'bg-amber-500/8', text: 'text-amber-400', border: 'border-amber-500/20' },
  one_shot: { bg: 'bg-sky-500/8', text: 'text-sky-400', border: 'border-sky-500/20' },
};

const CATEGORY_LABELS: Record<string, string> = {
  vibe_coding: 'Vibe Coding',
  brainstorming: 'Brainstorm',
  qa: 'Q&A',
  one_shot: 'One-Shot',
};

interface LibraryCardProps {
  prompt: LibrarySummary;
}

export function LibraryCard({ prompt }: LibraryCardProps) {
  const [votes, setVotes] = useState(prompt.upvotes);
  const [voting, setVoting] = useState(false);

  const colors = CATEGORY_COLORS[prompt.category] ?? { bg: 'bg-white/5', text: 'text-[#666]', border: 'border-white/8' };
  const label = CATEGORY_LABELS[prompt.category] ?? prompt.category;

  async function handleUpvote() {
    if (voting) return;
    const prev = votes;
    setVotes((v) => v + 1); // optimistic
    setVoting(true);
    try {
      const res = await upvotePrompt(prompt.id);
      setVotes(res.upvotes);
    } catch {
      setVotes(prev); // revert
    } finally {
      setVoting(false);
    }
  }

  const timeAgo = getTimeAgo(prompt.created_at);

  return (
    <div className="flex flex-col rounded-xl border border-[#1a1a1a] bg-[#0e0e0e] p-4 card-hover">
      {/* Category badge + time */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${colors.bg} ${colors.text} ${colors.border}`}>
          {label}
        </span>
        <span className="text-[10px] text-[#444]">{timeAgo}</span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-[#ddd] mb-1 line-clamp-2">{prompt.title}</h3>

      {/* Author */}
      <p className="text-[11px] text-[#555] mb-4">by {prompt.author_name}</p>

      {/* Bottom row */}
      <div className="mt-auto flex items-center justify-between pt-3 border-t border-[#151515]">
        <button
          onClick={handleUpvote}
          disabled={voting}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-[#666] hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 disabled:opacity-50"
        >
          <ArrowUp className="h-3 w-3" />
          {votes}
        </button>
        <Link
          href={`/?q=${encodeURIComponent(prompt.title)}`}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#555] hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          Use this
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
