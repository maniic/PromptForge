'use client';

import { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Zap, X } from 'lucide-react';
import { MagneticButton } from '@/components/shared/MagneticButton';
import LoadingStatus from '@/components/shared/LoadingStatus';

interface HeroInputProps {
  onSubmit: (input: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function HeroInput({ onSubmit, onCancel, isLoading }: HeroInputProps) {
  const [input, setInput] = useState('');

  const canForge = input.trim().length >= 3;

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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl flex flex-col items-center gap-8">
        {/* Headline */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            PromptForge
          </h1>
          <p className="text-lg text-muted-foreground">
            Transform rough ideas into expert prompts with IBM Granite
          </p>
        </div>

        {/* Input card */}
        <div className="w-full rounded-2xl border border-border bg-[#111114] shadow-xl shadow-black/40 p-6 flex flex-col gap-4">
          <TextareaAutosize
            minRows={3}
            maxRows={8}
            maxLength={1000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build, brainstorm, or research..."
            disabled={isLoading}
            className={[
              'w-full resize-none rounded-xl border border-border bg-[#0d0d10] px-4 py-3',
              'text-foreground placeholder:text-muted-foreground',
              'transition-all duration-200 outline-none',
              'focus:border-primary focus:shadow-[0_0_6px_hsl(var(--primary)/0.4)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
          />

          <div className="flex flex-col items-center gap-3">
            {isLoading ? (
              <MagneticButton
                onClick={onCancel}
                className="flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-xl bg-destructive/20 border border-destructive/50 text-destructive hover:bg-destructive/30 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
                Cancel
              </MagneticButton>
            ) : (
              <MagneticButton
                onClick={handleSubmit}
                disabled={!canForge}
                className={[
                  'flex items-center gap-2 px-8 py-3 text-lg font-semibold rounded-xl',
                  'transition-colors cursor-pointer',
                  canForge
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-primary/30 text-primary/50 cursor-not-allowed',
                ].join(' ')}
              >
                <Zap className="w-5 h-5" />
                Forge
              </MagneticButton>
            )}

            <LoadingStatus isLoading={isLoading} />
          </div>
        </div>

        {/* Hint */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground/60">
            Press{' '}
            <kbd className="px-1 py-0.5 rounded border border-border text-xs">
              Cmd+Enter
            </kbd>{' '}
            to forge
          </p>
        )}
      </div>
    </div>
  );
}
