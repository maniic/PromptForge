'use client';

import { Maximize2, Minimize2, X, Sparkles, AlertTriangle } from 'lucide-react';

interface ResultCardProps {
  rawResult: string;
  craftedResult: string;
  expanded: boolean;
  collapsed: boolean;
  onToggleExpand: () => void;
  degradedResult?: string | null;
}

export function ResultCard({
  rawResult,
  craftedResult,
  expanded,
  collapsed,
  onToggleExpand,
  degradedResult,
}: ResultCardProps) {
  return (
    <div
      onClick={collapsed ? onToggleExpand : undefined}
      role={collapsed ? 'button' : undefined}
      aria-label={collapsed ? 'Expand results card' : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onKeyDown={collapsed ? (e) => { if (e.key === 'Enter') onToggleExpand(); } : undefined}
      className={[
        'flex flex-col rounded-xl border bg-[#0e0e0e] transition-all duration-300',
        'h-full overflow-hidden',
        collapsed
          ? 'border-[#1a1a1a] cursor-pointer hover:border-[#2a2a2a] hover:bg-[#121212]'
          : 'border-[#1a1a1a]',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#151515] shrink-0">
        <span className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.12em]">
          Results — Before & After
        </span>
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
        'px-4 pt-3 pb-4 flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto forge-scroll',
        collapsed ? 'collapsed-mask max-h-24' : '',
      ].join(' ')}>
        {collapsed ? (
          <p className="text-[13px] leading-relaxed text-[#777] line-clamp-3 break-words">
            {craftedResult}
          </p>
        ) : (
          <>
            {/* Before — raw result */}
            <div className="rounded-lg border border-[#161616] bg-[#0a0a0a] p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <X className="h-3 w-3 text-[#444]" />
                <span className="text-[10px] font-semibold text-[#444] uppercase tracking-[0.1em]">
                  Without PromptForge
                </span>
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#666] break-words">
                {rawResult || 'No result returned — try again.'}
              </p>
            </div>

            {/* After — crafted result */}
            <div className="rounded-lg border border-red-500/15 bg-red-500/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <Sparkles className="h-3 w-3 text-red-400" />
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-[0.1em]">
                  With PromptForge
                </span>
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#ccc] break-words">
                {craftedResult || 'No result returned — try again.'}
              </p>
            </div>

            {/* Degraded result */}
            {degradedResult && (
              <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-[0.1em]">
                    Degraded (Segments Removed)
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#999] break-words">
                  {degradedResult}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
