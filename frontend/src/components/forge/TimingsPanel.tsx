'use client';

import { useState } from 'react';
import { ChevronDown, Cpu, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { CallTiming } from '@/types/api';

const CALL_LABELS: Record<string, { label: string; desc: string }> = {
  detect_category: { label: 'Detect Category', desc: 'Classify input type' },
  craft_prompt: { label: 'Craft Expert Prompt', desc: 'Generate structured prompt' },
  execute_crafted: { label: 'Execute Crafted', desc: 'Run enhanced prompt' },
  execute_raw: { label: 'Execute Raw Input', desc: 'Run original input' },
};

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

interface TimingsPanelProps {
  callTimings: CallTiming[];
  totalLatencyMs: number;
}

export function TimingsPanel({ callTimings, totalLatencyMs }: TimingsPanelProps) {
  const [open, setOpen] = useState(false);
  const hasParallel = callTimings.some((t) => t.call_name === 'execute_crafted') &&
    callTimings.some((t) => t.call_name === 'execute_raw');

  return (
    <div className="rounded-lg glass-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="Toggle IBM API call timings"
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Cpu className="h-3.5 w-3.5 text-red-400/80" />
          <span className="text-[10px] font-bold text-[#777] uppercase tracking-[0.1em]">
            IBM Granite API
          </span>
          <span className="text-[10px] text-[#444] tabular-nums">
            {callTimings.length} calls &middot; {formatMs(totalLatencyMs)}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#555] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 flex flex-col gap-2">
              {callTimings.map((timing, i) => {
                const maxMs = Math.max(...callTimings.map((t) => t.latency_ms), 1);
                const pct = (timing.latency_ms / maxMs) * 100;
                const info = CALL_LABELS[timing.call_name];

                return (
                  <div key={timing.call_name} className="flex items-center gap-3">
                    <div className="w-36 shrink-0">
                      <span className="text-[11px] text-[#999] block leading-tight">
                        {info?.label ?? timing.call_name}
                      </span>
                      {info?.desc && (
                        <span className="text-[9px] text-[#444]">{info.desc}</span>
                      )}
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600/80 to-red-400/60 animate-fill-bar"
                        style={{ width: `${pct}%`, animationDelay: `${i * 100}ms` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#666] w-14 text-right tabular-nums font-mono">
                      {formatMs(timing.latency_ms)}
                    </span>
                  </div>
                );
              })}

              {/* Parallel indicator */}
              {hasParallel && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Zap className="h-3 w-3 text-emerald-500/60" />
                  <p className="text-[10px] text-[#444]">
                    Execute calls ran in parallel via <span className="text-[#666] font-mono">asyncio.gather()</span>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
