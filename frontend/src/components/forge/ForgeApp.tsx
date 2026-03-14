'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { forgeApi, formatApiError } from '@/lib/api';
import type { ForgeResponse } from '@/types/api';
import { HeroInput } from '@/components/forge/HeroInput';

type ForgeState = 'idle' | 'loading' | 'done' | 'error';

export default function ForgeApp() {
  const [state, setState] = useState<ForgeState>('idle');
  const [result, setResult] = useState<ForgeResponse | null>(null);
  const [inputText, setInputText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  async function handleForge(input: string) {
    setInputText(input);
    const controller = new AbortController();
    abortRef.current = controller;
    setState('loading');

    try {
      const response = await forgeApi(input, controller.signal);
      setResult(response);
      setState('done');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled — return to idle silently
        setState('idle');
      } else {
        toast.error(formatApiError(err));
        setState('idle');
      }
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  function handleReset() {
    setResult(null);
    setState('idle');
  }

  const isLoading = state === 'loading';

  return (
    <AnimatePresence mode="wait">
      {state !== 'done' ? (
        <motion.div
          key="hero"
          layoutId="input-container"
          exit={{ x: -200, scale: 0.9, opacity: 0, transition: { duration: 0.4 } }}
        >
          <HeroInput
            onSubmit={handleForge}
            onCancel={handleCancel}
            isLoading={isLoading}
          />
        </motion.div>
      ) : (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex min-h-screen"
        >
          {/* Column 1: Input card — shrinks from hero position */}
          <motion.div
            layoutId="input-container"
            className="w-1/3 flex flex-col p-6"
          >
            <div className="rounded-2xl border border-border bg-[#111114] shadow-xl shadow-black/40 p-6 flex flex-col gap-4 h-full">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Your Input
              </h2>
              <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed flex-1">
                {inputText}
              </p>
              <button
                onClick={handleReset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 self-start"
              >
                Start over
              </button>
            </div>
          </motion.div>

          {/* Columns 2+3: Results placeholder — Plan 03 replaces with ThreeColumnLayout */}
          <motion.div
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex-1 flex items-center justify-center p-6"
          >
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-lg">Results will appear here</p>
              <p className="text-sm text-muted-foreground/60">
                (Three-column layout coming in Plan 03)
              </p>
              {result && (
                <p className="text-xs text-muted-foreground/40 mt-4">
                  Category: {result.category} — {result.total_latency_ms}ms total
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
