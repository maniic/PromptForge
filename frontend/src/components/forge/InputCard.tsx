'use client';

import { Maximize2, Minimize2, MessageSquare } from 'lucide-react';

interface InputCardProps {
  inputText: string;
  expanded: boolean;
  collapsed: boolean;
  onToggleExpand: () => void;
}

export function InputCard({ inputText, expanded, collapsed, onToggleExpand }: InputCardProps) {
  return (
    <div
      onClick={collapsed ? onToggleExpand : undefined}
      role={collapsed ? 'button' : undefined}
      aria-label={collapsed ? 'Expand input card' : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onKeyDown={collapsed ? (e) => { if (e.key === 'Enter') onToggleExpand(); } : undefined}
      className={[
        'flex flex-col rounded-xl border bg-[#0e0e0e] transition-all duration-300',
        'h-full overflow-hidden',
        collapsed
          ? 'border-[#1a1a1a] cursor-pointer hover:border-[#2a2a2a] hover:bg-[#121212]'
          : 'border-[#1a1a1a] glow-red',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#151515] shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3 w-3 text-red-400/50" />
          <span className="text-[10px] font-semibold text-[#555] uppercase tracking-[0.12em]">
            Your Input
          </span>
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
        <p className={[
          'text-[13px] leading-relaxed whitespace-pre-wrap text-[#999]',
          collapsed ? 'line-clamp-3' : '',
        ].join(' ')}>
          {inputText}
        </p>
      </div>
    </div>
  );
}
