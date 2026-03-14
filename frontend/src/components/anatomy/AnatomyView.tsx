'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnatomySegment } from '@/types/api';

const SEGMENT_STYLES: Record<string, { bg: string; border: string; text: string; label: string; tooltip: string; icon: string }> = {
  role: {
    bg: 'bg-blue-500/8',
    border: 'border-blue-500/25',
    text: 'text-blue-400',
    label: 'Role',
    icon: '01',
    tooltip: 'Sets the AI persona and expertise level. A senior developer writes differently than a beginner — the role shapes vocabulary, depth, and assumptions.',
  },
  context: {
    bg: 'bg-emerald-500/8',
    border: 'border-emerald-500/25',
    text: 'text-emerald-400',
    label: 'Context',
    icon: '02',
    tooltip: 'Provides situational background. Without context, the AI guesses your scenario. With it, responses are grounded in your actual constraints and goals.',
  },
  constraints: {
    bg: 'bg-purple-500/8',
    border: 'border-purple-500/25',
    text: 'text-purple-400',
    label: 'Constraints',
    icon: '03',
    tooltip: 'Sets boundaries and rules. Prevents hallucination, enforces language/version specifics, and focuses output on what actually matters for your use case.',
  },
  output_format: {
    bg: 'bg-amber-500/8',
    border: 'border-amber-500/25',
    text: 'text-amber-400',
    label: 'Output Format',
    icon: '04',
    tooltip: 'Specifies response structure — code blocks, bullet lists, sections. Eliminates the "reformatting" step and makes output immediately usable.',
  },
  quality_bar: {
    bg: 'bg-rose-500/8',
    border: 'border-rose-500/25',
    text: 'text-rose-400',
    label: 'Quality Bar',
    icon: '05',
    tooltip: 'Establishes standards with examples of good vs bad output. Moves the AI from "good enough" to "excellent" by making expectations explicit.',
  },
  task: {
    bg: 'bg-cyan-500/8',
    border: 'border-cyan-500/25',
    text: 'text-cyan-400',
    label: 'Task',
    icon: '06',
    tooltip: 'The specific action to perform. Clarity here is everything — vague tasks get vague results. Precise tasks get precise, actionable output.',
  },
};

function QualityScore({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-emerald-400' :
    score >= 50 ? 'text-amber-400' :
    'text-red-400';

  const barColor =
    score >= 80 ? 'from-emerald-600 to-emerald-400' :
    score >= 50 ? 'from-amber-600 to-amber-400' :
    'from-red-600 to-red-400';

  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs work';

  return (
    <div className="flex items-center gap-3 px-1">
      <span className="text-[10px] font-bold text-[#555] uppercase tracking-[0.1em] shrink-0">
        Quality
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={`text-sm font-bold tabular-nums ${color}`}>
          {score}
        </span>
        <span className="text-[9px] text-[#555]">{label}</span>
      </div>
    </div>
  );
}

interface AnatomyViewProps {
  segments: AnatomySegment[];
  qualityScore: number;
  missingElements: string[];
  enableToggles?: boolean;
  disabledTypes?: Set<string>;
  onToggle?: (type: string) => void;
}

export function AnatomyView({
  segments,
  qualityScore,
  missingElements,
  enableToggles = false,
  disabledTypes,
  onToggle,
}: AnatomyViewProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Reposition tooltip if it overflows the viewport top
  useEffect(() => {
    if (hoveredIdx !== null && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.top < 8) {
        tooltipRef.current.style.top = 'auto';
        tooltipRef.current.style.bottom = '-100%';
        tooltipRef.current.style.transform = 'translateY(calc(100% + 4px))';
      }
    }
  }, [hoveredIdx]);

  return (
    <div className="flex flex-col gap-3">
      <QualityScore score={qualityScore} />

      {/* Segments */}
      <div className="flex flex-col gap-1.5">
        {segments.map((segment, i) => {
          const style = SEGMENT_STYLES[segment.type] ?? SEGMENT_STYLES.task;
          const isDisabled = disabledTypes?.has(segment.type);
          const isHovered = hoveredIdx === i;

          return (
            <div
              key={`${segment.type}-${i}`}
              className="relative group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div
                className={[
                  'rounded-md border px-3 py-2 transition-all duration-200',
                  style.bg,
                  style.border,
                  isDisabled ? 'opacity-25' : 'hover:brightness-110',
                ].join(' ')}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-mono ${style.text} opacity-50`}>{style.icon}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  {enableToggles && onToggle && (
                    <button
                      onClick={() => onToggle(segment.type)}
                      aria-label={`Toggle ${style.label} ${isDisabled ? 'on' : 'off'}`}
                      aria-pressed={!isDisabled}
                      className={[
                        'px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-200 border',
                        isDisabled
                          ? 'bg-[#1a1a1a] text-[#444] border-[#2a2a2a] hover:border-[#444]'
                          : `${style.bg} ${style.text} ${style.border} hover:brightness-125`,
                      ].join(' ')}
                    >
                      {isDisabled ? 'OFF' : 'ON'}
                    </button>
                  )}
                </div>
                <p className={[
                  'text-[12px] leading-relaxed whitespace-pre-wrap break-words',
                  isDisabled ? 'text-[#444] line-through' : 'text-[#bbb]',
                ].join(' ')}>
                  {segment.text}
                </p>
              </div>

              {/* Tooltip */}
              {isHovered && !isDisabled && (
                <div
                  ref={tooltipRef}
                  className="absolute z-50 left-0 right-0 bottom-full mb-1 px-3 py-2.5 rounded-lg bg-[#1c1c1c] border border-[#333] shadow-xl shadow-black/40 pointer-events-none"
                >
                  <p className="text-[11px] text-[#aaa] leading-relaxed">
                    {style.tooltip}
                  </p>
                  <div className="absolute left-4 -bottom-1 w-2 h-2 bg-[#1c1c1c] border-b border-r border-[#333] rotate-45" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Missing elements */}
      {missingElements.length > 0 && (
        <div className="rounded-md border border-[#1e1e1e] bg-[#0e0e10] px-3 py-2.5">
          <span className="text-[10px] font-bold text-[#555] uppercase tracking-[0.1em] block mb-2">
            Missing Elements
          </span>
          <div className="flex flex-wrap gap-1.5">
            {missingElements.map((el) => {
              const style = SEGMENT_STYLES[el];
              return (
                <span
                  key={el}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${style ? `${style.border} ${style.text} opacity-40` : 'border-[#333] text-[#555]'}`}
                >
                  {style?.label ?? el}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
