'use client';

import { useEffect, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Zap, X, Code2, Lightbulb, Search, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LoadingStatus from '@/components/shared/LoadingStatus';

const DEMO_PRESETS = [
  {
    label: 'Vibe Code',
    icon: Code2,
    text: 'Build a REST API with user authentication, rate limiting, and real-time websocket notifications for a chat app',
    gradient: 'from-red-500/10 to-red-500/5',
    border: 'border-red-500/20 hover:border-red-500/40',
    iconColor: 'text-red-400',
  },
  {
    label: 'Brainstorm',
    icon: Lightbulb,
    text: 'Generate creative marketing strategies for a sustainable fashion brand targeting Gen Z on social media platforms',
    gradient: 'from-orange-500/10 to-orange-500/5',
    border: 'border-orange-500/20 hover:border-orange-500/40',
    iconColor: 'text-orange-400',
  },
  {
    label: 'Research',
    icon: Search,
    text: 'Explain the trade-offs between microservices and monolithic architectures for a startup with 5 engineers',
    gradient: 'from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/20 hover:border-amber-500/40',
    iconColor: 'text-amber-400',
  },
] as const;

interface HeroInputProps {
  onSubmit: (input: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function HeroInput({ onSubmit, onCancel, isLoading }: HeroInputProps) {
  const [input, setInput] = useState('');
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const canForge = input.trim().length >= 3;
  const charCount = input.length;
  const nearLimit = charCount > 900;

  function handleSubmit() {
    if (canForge && !isLoading) {
      onSubmit(input.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canForge && !isLoading) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handlePreset(text: string) {
    if (!isLoading) {
      setInput(text);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 py-16">
      <div className="w-full max-w-2xl flex flex-col items-center gap-10">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight gradient-text-red">
            PromptForge
          </h1>
          <p className="text-sm sm:text-base text-[#888] max-w-lg mx-auto leading-relaxed">
            Transform rough ideas into structured, expert-level prompts.
            <br className="hidden sm:block" />
            <span className="text-[#666]">Powered by IBM Granite.</span>
          </p>
        </motion.div>

        {/* Input area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full"
        >
          <div className="rounded-2xl glass-card glow-red p-5 sm:p-6 flex flex-col gap-5">
            {/* Textarea */}
            <div className="relative group">
              <TextareaAutosize
                minRows={3}
                maxRows={8}
                maxLength={1000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build, brainstorm, or research..."
                disabled={isLoading}
                aria-label="Prompt input"
                className="w-full resize-none rounded-xl border bg-[#080808] px-4 py-3.5 text-[15px] text-[#e0e0e0] placeholder:text-[#3a3a3a] transition-all duration-300 outline-none border-[#1a1a1a] focus:border-red-500/40 focus:shadow-[0_0_20px_rgba(255,80,80,0.08)] disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <div className={`absolute bottom-2.5 right-3.5 text-[10px] font-mono tabular-nums transition-colors duration-200 ${nearLimit ? 'text-amber-400/80' : 'text-[#2a2a2a]'} ${charCount === 0 ? 'opacity-0' : 'opacity-100'}`}>
                {charCount}/1000
              </div>
            </div>

            {/* Presets */}
            <AnimatePresence>
              {!isLoading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  <span className="text-[10px] font-medium text-[#3a3a3a] uppercase tracking-widest mr-1">Try</span>
                  {DEMO_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePreset(preset.text)}
                      aria-label={`Use preset: ${preset.label}`}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border bg-gradient-to-r ${preset.gradient} ${preset.border} transition-all duration-200 text-[#888] hover:text-[#ccc]`}
                    >
                      <preset.icon className={`h-3 w-3 ${preset.iconColor}`} />
                      {preset.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col items-center gap-4">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <button
                    onClick={onCancel}
                    aria-label="Cancel forge request"
                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-red-950/40 border border-red-500/20 text-red-400/80 hover:bg-red-950/60 hover:border-red-500/30 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <LoadingStatus isLoading={isLoading} />
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canForge}
                  aria-label="Forge prompt"
                  className={`group flex items-center gap-2.5 px-8 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                    canForge
                      ? 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 glow-red-strong shadow-lg shadow-red-500/10'
                      : 'bg-[#1a1010] text-[#4a2020] cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Forge
                  {canForge && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Keyboard hint */}
        {!isLoading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-[11px] text-[#333]"
          >
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded border border-[#1e1e1e] bg-[#111] text-[10px] text-[#555] font-mono">
              {isMac ? '⌘' : 'Ctrl'}+Enter
            </kbd>{' '}
            to forge
          </motion.p>
        )}
      </div>
    </div>
  );
}
