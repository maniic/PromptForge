'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { forgeApi, formatApiError } from '@/lib/api';
import type { ForgeResponse } from '@/types/api';
import { HeroInput } from '@/components/forge/HeroInput';
import ThreeColumnLayout from '@/components/forge/ThreeColumnLayout';

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
          className="w-full py-8"
        >
          <ThreeColumnLayout
            input={inputText}
            response={result!}
            onReset={handleReset}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
