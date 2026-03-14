'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getLibrary } from '@/lib/api';
import type { LibrarySummary } from '@/types/api';
import { LibraryCard } from '@/components/library/LibraryCard';

const TABS = [
  { key: null, label: 'All' },
  { key: 'vibe_coding', label: 'Vibe Coding' },
  { key: 'brainstorming', label: 'Brainstorm' },
  { key: 'qa', label: 'Q&A' },
  { key: 'one_shot', label: 'One-Shot' },
] as const;

export default function LibraryPage() {
  const [prompts, setPrompts] = useState<LibrarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    getLibrary(activeCategory ?? undefined)
      .then((data) => { setPrompts(data); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 sm:px-6 py-8 sm:py-12">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#555] hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to PromptForge
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight gradient-text-red mb-2">
            Community Library
          </h1>
          <p className="text-sm text-[#666] max-w-lg">
            Expert prompts forged by IBM Granite, saved by the community.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key ?? 'all'}
              onClick={() => setActiveCategory(tab.key)}
              className={[
                'shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 border',
                activeCategory === tab.key
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-transparent text-[#555] border-[#1a1a1a] hover:text-[#999] hover:border-[#2a2a2a]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 text-red-400 animate-spin" />
            <span className="ml-2 text-sm text-[#555]">Loading prompts...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-sm text-[#555]">Couldn&apos;t load community prompts. Try refreshing.</p>
          </div>
        ) : prompts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm text-[#666] mb-1">No prompts here yet.</p>
            <p className="text-xs text-[#444]">Forge something and be the first to save it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {prompts.map((prompt) => (
              <LibraryCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
