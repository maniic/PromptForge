'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { BookOpen, RotateCcw, Scan, Zap } from 'lucide-react';
import Link from 'next/link';
import { forgeApi, formatApiError } from '@/lib/api';
import type { ForgeResponse } from '@/types/api';
import { HeroInput } from '@/components/forge/HeroInput';
import ThreeColumnLayout from '@/components/forge/ThreeColumnLayout';
import { TimingsPanel } from '@/components/forge/TimingsPanel';
import { XRayMode } from '@/components/xray/XRayMode';

type ForgeState = 'idle' | 'loading' | 'done';
type AppMode = 'forge' | 'xray';

export default function ForgeApp() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AppMode>('forge');
  const [state, setState] = useState<ForgeState>('idle');
  const [result, setResult] = useState<ForgeResponse | null>(null);
  const [inputText, setInputText] = useState('');
  const [initialInput, setInitialInput] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const autoForgedRef = useRef(false);

  // Handle ?q= URL param from library "Use this prompt" links
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !autoForgedRef.current) {
      autoForgedRef.current = true;
      const decoded = decodeURIComponent(q);
      setInitialInput(decoded);
      // Auto-forge after brief delay
      const timer = setTimeout(() => {
        handleForge(decoded);
        window.history.replaceState({}, '', '/');
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleForge(input: string) {
    setInputText(input);
    const controller = new AbortController();
    abortRef.current = controller;
    setState('loading');

    try {
      const response = await forgeApi(input, controller.signal);
      setResult(response);
      setState('done');
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
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

  if (mode === 'xray') {
    return <XRayMode onBack={() => setMode('forge')} />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {state !== 'done' ? (
          <motion.div
            key="hero"
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.3 } }}
          >
            <HeroInput
              onSubmit={handleForge}
              onCancel={handleCancel}
              isLoading={isLoading}
              initialInput={initialInput}
            />
            {/* X-Ray link */}
            {!isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center -mt-4 pb-8"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMode('xray')}
                    className="group flex items-center gap-2 px-4 py-2 text-[11px] font-medium text-[#444] rounded-lg border border-[#181818] bg-transparent hover:text-violet-400 hover:border-violet-500/20 hover:bg-violet-500/5 transition-all duration-300"
                  >
                    <Scan className="h-3 w-3 transition-colors group-hover:text-violet-400" />
                    <span>Prompt X-Ray</span>
                  </button>
                  <Link
                    href="/library"
                    className="group flex items-center gap-2 px-4 py-2 text-[11px] font-medium text-[#444] rounded-lg border border-[#181818] bg-transparent hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/5 transition-all duration-300"
                  >
                    <BookOpen className="h-3 w-3 transition-colors group-hover:text-red-400" />
                    <span>Community Library</span>
                  </Link>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="fixed inset-0 overflow-hidden pt-14 pb-4 px-4 flex flex-col"
          >
            <div className="flex-1 min-h-0">
              <ThreeColumnLayout
                input={inputText}
                response={result!}
              />
            </div>
            <div className="max-w-7xl mx-auto w-full mt-2 shrink-0">
              <TimingsPanel
                callTimings={result!.call_timings}
                totalLatencyMs={result!.total_latency_ms}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <AnimatePresence>
        {state === 'done' && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-2.5 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/[0.04]"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-red-400/60" />
              <span className="text-sm font-bold tracking-tight gradient-text-red">
                PromptForge
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/library"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#555] rounded-lg border border-[#1a1a1a] bg-transparent hover:text-red-400 hover:border-red-500/20 transition-all duration-200"
              >
                <BookOpen className="h-3 w-3" />
                Library
              </Link>
              <button
                onClick={() => { handleReset(); setMode('xray'); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#555] rounded-lg border border-[#1a1a1a] bg-transparent hover:text-violet-400 hover:border-violet-500/20 transition-all duration-200"
              >
                <Scan className="h-3 w-3" />
                X-Ray
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#888] rounded-lg border border-[#1a1a1a] bg-[#111] hover:bg-[#181818] hover:border-[#2a2a2a] hover:text-white transition-all duration-200"
              >
                <RotateCcw className="h-3 w-3" />
                New Forge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
