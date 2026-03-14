'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, Dna, Loader2, Sparkles } from 'lucide-react';
import { TypewriterText } from '@/components/shared/TypewriterText';
import { AnatomyView } from '@/components/anatomy/AnatomyView';
import { anatomyApi, reExecuteApi } from '@/lib/api';
import type { AnatomyResult } from '@/types/api';

interface CraftedCardProps {
  craftedPrompt: string;
  category: string;
  expanded: boolean;
  collapsed: boolean;
  onToggleExpand: () => void;
  onDegradedResult?: (result: string | null) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  vibe_coding: 'bg-red-500/8 text-red-400 border-red-500/20',
  brainstorming: 'bg-orange-500/8 text-orange-400 border-orange-500/20',
  qa: 'bg-amber-500/8 text-amber-400 border-amber-500/20',
  one_shot: 'bg-sky-500/8 text-sky-400 border-sky-500/20',
};

export function CraftedCard({
  craftedPrompt,
  category,
  expanded,
  collapsed,
  onToggleExpand,
  onDegradedResult,
}: CraftedCardProps) {
  const badgeClass = CATEGORY_COLORS[category] ?? 'bg-white/5 text-[#666] border-white/8';
  const [showAnatomy, setShowAnatomy] = useState(false);
  const [anatomy, setAnatomy] = useState<AnatomyResult | null>(null);
  const [anatomyLoading, setAnatomyLoading] = useState(false);
  const [anatomyError, setAnatomyError] = useState(false);
  const [disabledTypes, setDisabledTypes] = useState<Set<string>>(new Set());
  const [reExecuting, setReExecuting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (showAnatomy && !anatomy && !anatomyLoading && !anatomyError) {
      setAnatomyLoading(true);
      anatomyApi(craftedPrompt)
        .then((result) => { setAnatomy(result); setAnatomyError(false); })
        .catch(() => { setAnatomy(null); setAnatomyError(true); })
        .finally(() => setAnatomyLoading(false));
    }
  }, [showAnatomy, anatomy, anatomyLoading, anatomyError, craftedPrompt]);

  const handleToggle = useCallback((type: string) => {
    setDisabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!anatomy || disabledTypes.size === 0) {
      onDegradedResult?.(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const enabledText = anatomy.segments
        .filter((s) => !disabledTypes.has(s.type))
        .map((s) => s.text)
        .join('\n\n');

      if (!enabledText.trim()) {
        onDegradedResult?.('(All segments disabled — no prompt to execute)');
        return;
      }

      try {
        setReExecuting(true);
        const result = await reExecuteApi(enabledText, Array.from(disabledTypes));
        onDegradedResult?.(result);
      } catch {
        onDegradedResult?.('Re-execution failed. Try again.');
      } finally {
        setReExecuting(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [disabledTypes, anatomy, onDegradedResult]);

  return (
    <div
      onClick={collapsed ? onToggleExpand : undefined}
      role={collapsed ? 'button' : undefined}
      aria-label={collapsed ? 'Expand crafted prompt card' : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onKeyDown={collapsed ? (e) => { if (e.key === 'Enter') onToggleExpand(); } : undefined}
      className={[
        'flex flex-col rounded-xl border bg-[#0e0e0e] transition-all duration-300',
        'h-full overflow-hidden',
        collapsed
          ? 'border-[#1a1a1a] cursor-pointer hover:border-[#2a2a2a] hover:bg-[#121212]'
          : 'border-red-500/10 glow-red',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#151515] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-3 w-3 text-red-400/50 shrink-0" />
          <span className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.12em] shrink-0">
            Crafted
          </span>
          {!collapsed && (
            <>
              <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shrink-0 ${badgeClass}`}>
                {category.replace('_', ' ')}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShowAnatomy(!showAnatomy); }}
                aria-label={showAnatomy ? 'Hide anatomy view' : 'Show anatomy view'}
                aria-pressed={showAnatomy}
                className={[
                  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider shrink-0 transition-all duration-200',
                  showAnatomy
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 glow-violet'
                    : 'bg-transparent text-[#444] border-[#222] hover:text-[#888] hover:border-[#333]',
                ].join(' ')}
              >
                <Dna className="h-2.5 w-2.5" />
                Anatomy
              </button>
            </>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
          aria-label={expanded ? 'Minimize card' : 'Maximize card'}
          aria-expanded={expanded}
          className="p-1 rounded-md hover:bg-white/5 text-[#444] hover:text-[#999] transition-colors"
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Content */}
      <div className={[
        'px-4 py-3 flex-1 min-h-0 overflow-y-auto forge-scroll',
        collapsed ? 'collapsed-mask max-h-24' : '',
      ].join(' ')}>
        {collapsed ? (
          <p className="text-[13px] leading-relaxed text-[#999] line-clamp-3 break-words">
            {craftedPrompt}
          </p>
        ) : showAnatomy ? (
          anatomyLoading ? (
            <div className="flex items-center gap-2.5 py-6 text-sm text-[#555]">
              <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
              <span>Analyzing prompt structure...</span>
            </div>
          ) : anatomyError ? (
            <div className="text-sm text-[#555] py-3">
              <p>Anatomy analysis unavailable.</p>
              <button
                onClick={() => { setAnatomyError(false); }}
                className="text-violet-400 text-xs mt-1.5 hover:underline"
              >
                Retry
              </button>
            </div>
          ) : anatomy ? (
            <div className="relative">
              {reExecuting && (
                <div className="absolute inset-0 bg-[#0e0e0e]/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-2 text-[12px] text-[#888]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                    Re-executing...
                  </div>
                </div>
              )}
              <AnatomyView
                segments={anatomy.segments}
                qualityScore={anatomy.quality_score}
                missingElements={anatomy.missing_elements}
                enableToggles
                disabledTypes={disabledTypes}
                onToggle={handleToggle}
              />
            </div>
          ) : null
        ) : (
          <TypewriterText
            text={craftedPrompt}
            speedMs={5}
            className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#ccc]"
          />
        )}
      </div>
    </div>
  );
}
