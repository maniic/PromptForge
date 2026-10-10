'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { detectTechniques, missingVariables } from '@/lib/learn-api';
import { TECHNIQUE_LABELS, type TechniqueReport } from '@/types/learn';
import { cn } from '@/lib/utils';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  onReset: () => void;
  disabled?: boolean;
}

export function PromptEditor({ value, onChange, variables, onReset, disabled }: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [report, setReport] = useState<TechniqueReport | null>(null);
  const missing = missingVariables(value, variables);

  // Live technique detection (static analysis on the backend, no AI call)
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      detectTechniques(value, controller.signal)
        .then(setReport)
        .catch(() => {
          /* chips are a nicety; ignore failures */
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function insertVariable(name: string) {
    const el = textareaRef.current;
    const token = `{{${name}}}`;
    if (!el) {
      onChange(value + token);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const detected = new Set(report?.detected ?? []);

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-white/[0.04] px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#666]">Your prompt</span>
        <div className="flex items-center gap-1.5">
          {variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              disabled={disabled}
              className="rounded-md border border-sky-500/20 bg-sky-500/5 px-2 py-0.5 font-mono text-[11px] text-sky-300 transition-colors hover:bg-sky-500/10 disabled:opacity-40"
              title={`Insert {{${v}}}`}
            >
              {`{{${v}}}`}
            </button>
          ))}
          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="ml-1 rounded-md p-1 text-[#555] transition-colors hover:text-white disabled:opacity-40"
            title="Reset to starter prompt"
            aria-label="Reset to starter prompt"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        aria-label="Prompt editor"
        className="forge-scroll block min-h-[260px] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-[#ddd] outline-none placeholder:text-[#444] disabled:opacity-60"
        placeholder="Write your prompt here. Use the variable buttons above to insert test inputs."
      />

      {missing.length > 0 && (
        <div className="flex items-start gap-2 border-t border-amber-500/10 bg-amber-500/5 px-4 py-2 text-[12px] text-amber-300/90">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Your prompt never uses{' '}
            {missing.map((m) => (
              <code key={m} className="mx-0.5 font-mono">{`{{${m}}}`}</code>
            ))}
            , so the model will never see that input.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.04] px-4 py-2.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[#555]">Techniques</span>
        {Object.entries(TECHNIQUE_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors duration-300',
              detected.has(key)
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-[#1c1c1c] text-[#444]'
            )}
          >
            {label}
          </span>
        ))}
        {report && (
          <span className="ml-auto font-mono text-[10px] text-[#555]">
            ~{report.estimated_tokens} tokens
          </span>
        )}
      </div>
    </div>
  );
}
