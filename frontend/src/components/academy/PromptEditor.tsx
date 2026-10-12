'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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

// Tokens worth colouring in a prompt: {{variables}}, <xml> tags, fence markers, and "Label:" line heads
const TOKEN_RE = /(\{\{\s*\w+\s*\}\})|(<\/?[A-Za-z_][\w-]*>)|("""|```|###|---)/g;
const LABEL_RE = /^(\s*(?:[-*]\s+)?[A-Z][A-Za-z ]{0,24}:)(?=\s|$)/;

function highlightLine(line: string, variables: Set<string>, key: number) {
  const parts: React.ReactNode[] = [];
  let rest = line;
  let offset = 0;

  const label = LABEL_RE.exec(rest);
  if (label) {
    parts.push(<span key="label" className="text-syn-label">{label[1]}</span>);
    rest = rest.slice(label[1].length);
    offset = label[1].length;
  }

  let last = 0;
  for (const m of Array.from(rest.matchAll(TOKEN_RE))) {
    const start = m.index ?? 0;
    if (start > last) parts.push(rest.slice(last, start));
    const [token, variable] = m;
    if (variable) {
      const name = variable.replace(/[{}\s]/g, '');
      parts.push(
        <span
          key={`${key}-${offset + start}`}
          className={cn(
            'rounded-sm',
            variables.has(name) ? 'bg-brand-soft text-syn-var' : 'text-bad underline decoration-wavy'
          )}
        >
          {token}
        </span>
      );
    } else {
      parts.push(
        <span key={`${key}-${offset + start}`} className="text-syn-tag">
          {token}
        </span>
      );
    }
    last = start + token.length;
  }
  if (last < rest.length) parts.push(rest.slice(last));
  return parts;
}

export function PromptEditor({ value, onChange, variables, onReset, disabled }: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [report, setReport] = useState<TechniqueReport | null>(null);
  const missing = missingVariables(value, variables);
  const varSet = new Set(variables);

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
  const lines = value.split('\n');
  const shared = 'px-4 pl-12 py-3 font-mono text-[13px] leading-5 whitespace-pre-wrap [overflow-wrap:anywhere]';

  return (
    <div className="flex h-full min-h-[340px] flex-col bg-panel">
      {/* Toolbar */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="text-xs font-medium text-fg-muted">Prompt</span>
        <span className="text-xs text-fg-subtle">· insert</span>
        {variables.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            disabled={disabled}
            className="rounded bg-brand-soft px-1.5 py-0.5 font-mono text-[11px] text-syn-var transition-opacity hover:opacity-80 disabled:opacity-40"
            title={`Insert {{${v}}} at the cursor`}
          >
            {`{{${v}}}`}
          </button>
        ))}
        <button
          type="button"
          onClick={onReset}
          disabled={disabled}
          className="ml-auto rounded p-1 text-fg-subtle transition-colors hover:bg-raised hover:text-fg disabled:opacity-40"
          title="Reset to starter prompt"
          aria-label="Reset to starter prompt"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor: transparent textarea over a highlighted mirror */}
      <div className="relative min-h-0 flex-1">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className={cn(shared, 'text-fg-muted')} style={{ transform: `translateY(${-scrollTop}px)` }}>
            {lines.map((line, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-10 w-7 select-none text-right text-fg-subtle">
                  {i + 1}
                </span>
                {line ? highlightLine(line, varSet, i).map((p, j) => <Fragment key={j}>{p}</Fragment>) : ' '}
              </div>
            ))}
          </div>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          disabled={disabled}
          spellCheck={false}
          aria-label="Prompt editor"
          className={cn(
            shared,
            'pf-editor no-scrollbar absolute inset-0 h-full w-full resize-none bg-transparent text-transparent caret-[var(--pf-fg)] outline-none disabled:cursor-not-allowed'
          )}
        />
      </div>

      {missing.length > 0 && (
        <div className="flex shrink-0 items-start gap-2 border-t border-line bg-warn-soft px-3 py-2 text-xs text-warn">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            Your prompt never uses{' '}
            {missing.map((m) => (
              <code key={m} className="mx-0.5 font-mono">{`{{${m}}}`}</code>
            ))}
            , so the model will never see that input.
          </span>
        </div>
      )}

      {/* Status bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-line px-3 py-2">
        {Object.entries(TECHNIQUE_LABELS).map(([key, label]) => (
          <span
            key={key}
            className={cn(
              'rounded px-1.5 py-0.5 text-[11px] transition-colors duration-300',
              detected.has(key) ? 'bg-ok-soft text-ok' : 'text-fg-subtle'
            )}
            title={detected.has(key) ? `Detected: ${label}` : `Not detected: ${label}`}
          >
            {label}
          </span>
        ))}
        <span className="ml-auto font-mono text-[11px] text-fg-subtle">
          {lines.length} ln · ~{report?.estimated_tokens ?? 0} tok
        </span>
      </div>
    </div>
  );
}
