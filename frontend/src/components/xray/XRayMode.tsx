'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import TextareaAutosize from 'react-textarea-autosize';
import { Scan, ArrowRight, RotateCcw, ArrowLeft, Loader2, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { xrayApi, formatApiError } from '@/lib/api';
import type { XRayResponse } from '@/types/api';
import { AnatomyView } from '@/components/anatomy/AnatomyView';

type XRayState = 'idle' | 'loading' | 'done';

export function XRayMode({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<XRayState>('idle');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<XRayResponse | null>(null);

  const canScan = input.trim().length >= 3;
  const charCount = input.length;
  const nearLimit = charCount > 1800;

  async function handleScan() {
    if (!canScan) return;
    setState('loading');
    try {
      const response = await xrayApi(input.trim());
      setResult(response);
      setState('done');
    } catch (err) {
      toast.error(formatApiError(err));
      setState('idle');
    }
  }

  function handleReset() {
    setResult(null);
    setInput('');
    setState('idle');
  }

  if (state === 'done' && result) {
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <Scan className="h-5 w-5 text-violet-400" />
              <h2 className="text-lg font-bold gradient-text-violet">Prompt X-Ray</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-500/12 text-violet-400 border border-violet-500/25">
                {result.diagnosis.quality_score}/100
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#666] rounded-lg border border-[#1e1e1e] hover:text-[#999] hover:border-[#333] transition-all duration-200"
              >
                <ArrowLeft className="h-3 w-3" />
                Forge
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#999] rounded-lg border border-[#1e1e1e] bg-[#141414] hover:bg-[#1a1a1a] hover:border-[#333] transition-all duration-200"
              >
                <RotateCcw className="h-3 w-3" />
                New X-Ray
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Diagnosis */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-lg border border-[#1e1e1e] bg-[#141414] p-4">
                <h3 className="text-[10px] font-bold text-[#777] uppercase tracking-[0.1em] mb-3">
                  Structural Diagnosis
                </h3>
                <AnatomyView
                  segments={result.diagnosis.segments}
                  qualityScore={result.diagnosis.quality_score}
                  missingElements={result.diagnosis.missing_elements}
                />
              </div>

              {/* Diagnosis explanations */}
              {result.diagnosis.diagnosis.length > 0 && (
                <div className="rounded-lg border border-[#1e1e1e] bg-[#141414] p-4">
                  <h3 className="text-[10px] font-bold text-[#777] uppercase tracking-[0.1em] mb-3">
                    What&apos;s Missing
                  </h3>
                  <div className="flex flex-col gap-2">
                    {result.diagnosis.diagnosis.map((d) => (
                      <div key={d.element} className="rounded-md border border-[#1e1e1e] bg-[#0e0e10] p-3">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.08em] block mb-1">
                          {d.element.replace('_', ' ')}
                        </span>
                        <p className="text-[12px] text-[#999] leading-relaxed">{d.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Right: Upgraded prompt + comparison */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col gap-4"
            >
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.02] p-4 glow-violet">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  <h3 className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.1em]">
                    Upgraded Prompt
                  </h3>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#ddd] break-words">
                  {result.upgraded_prompt}
                </p>
              </div>

              {/* Comparison */}
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-[#1e1e1e] bg-[#0c0c0e] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="h-3 w-3 text-[#555]" />
                    <span className="text-[10px] font-bold text-[#555] uppercase tracking-[0.1em]">
                      Original Result
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#777] break-words">
                    {result.original_result}
                  </p>
                </div>
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3 w-3 text-violet-400" />
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.1em]">
                      Upgraded Result
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#ddd] break-words">
                    {result.upgraded_result}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="flex items-center justify-center gap-3">
            <Scan className="h-8 w-8 text-violet-400 animate-float" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight gradient-text-violet">
              Prompt X-Ray
            </h1>
          </div>
          <p className="text-base sm:text-lg text-[#999] max-w-md mx-auto leading-relaxed">
            Diagnose structural weaknesses, auto-upgrade, and see the difference
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full rounded-2xl glass-card glow-violet p-4 sm:p-6 flex flex-col gap-4"
        >
          <div className="relative">
            <TextareaAutosize
              minRows={4}
              maxRows={10}
              maxLength={2000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste any prompt you want to analyze and improve..."
              disabled={state === 'loading'}
              aria-label="Prompt to X-Ray"
              className={[
                'w-full resize-none rounded-xl border bg-[#0a0a0d] px-4 py-3',
                'text-[#e8e8e8] placeholder:text-[#555]',
                'transition-all duration-300 outline-none',
                'border-[#1e1e1e] focus:border-violet-500/50 focus:shadow-[0_0_12px_rgba(139,92,246,0.15)]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            />
            <div className={[
              'absolute bottom-2 right-3 text-[10px] tabular-nums transition-colors',
              nearLimit ? 'text-amber-400' : 'text-[#333]',
              charCount === 0 ? 'opacity-0' : 'opacity-100',
            ].join(' ')}>
              {charCount}/2000
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium text-[#666] rounded-lg hover:text-[#999] transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to Forge
            </button>
            <button
              onClick={handleScan}
              disabled={!canScan || state === 'loading'}
              className={[
                'flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200',
                canScan && state !== 'loading'
                  ? 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                  : 'bg-violet-900/30 text-violet-400/40 cursor-not-allowed',
              ].join(' ')}
            >
              {state === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Scan className="h-4 w-4" />
                  X-Ray
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
