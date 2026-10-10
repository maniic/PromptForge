'use client';

import { useState } from 'react';
import { Check, ChevronDown, Circle, EyeOff, X } from 'lucide-react';
import type { PublicTestCase, TestCaseResult } from '@/types/learn';
import { cn } from '@/lib/utils';

interface TestSuiteProps {
  testCases: PublicTestCase[];
  results: TestCaseResult[] | null;
}

export function TestSuite({ testCases, results }: TestSuiteProps) {
  const passed = results?.filter((r) => r.passed).length ?? 0;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#666]">Test suite</h2>
        {results && (
          <span className="text-[11px] text-[#666]">
            {passed}/{results.length} tests passing
          </span>
        )}
      </div>
      <div className="space-y-2">
        {testCases.map((tc, i) => (
          <TestCaseRow key={tc.id} testCase={tc} result={results?.[i] ?? null} />
        ))}
      </div>
    </section>
  );
}

function TestCaseRow({ testCase, result }: { testCase: PublicTestCase; result: TestCaseResult | null }) {
  const [open, setOpen] = useState(!testCase.hidden);

  return (
    <div
      className={cn(
        'glass-card rounded-xl',
        result && (result.passed ? 'border-emerald-500/20' : 'border-red-500/20')
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        {result ? (
          result.passed ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <X className="h-3.5 w-3.5 text-red-400" />
          )
        ) : (
          <Circle className="h-3 w-3 text-[#333]" />
        )}
        <span className="font-mono text-[12px] text-[#bbb]">{testCase.id}</span>
        {testCase.hidden && (
          <span className="inline-flex items-center gap-1 rounded border border-[#222] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#666]">
            <EyeOff className="h-2.5 w-2.5" /> hidden
          </span>
        )}
        <ChevronDown className={cn('ml-auto h-3.5 w-3.5 text-[#555] transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-white/[0.04] px-4 py-3">
          {testCase.vars ? (
            Object.entries(testCase.vars).map(([name, value]) => (
              <div key={name}>
                <p className="mb-1 font-mono text-[10px] text-sky-300/80">{`{{${name}}}`}</p>
                <pre className="forge-scroll max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-[#999]">
                  {value}
                </pre>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-[#666]">
              Hidden test: the input is kept secret so your prompt has to generalize, not overfit.
            </p>
          )}

          <ul className="space-y-1">
            {testCase.checks.map((label, i) => {
              const check = result?.checks[i];
              return (
                <li key={label + i} className="flex items-start gap-2 text-[12px]">
                  {check ? (
                    check.passed ? (
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                    ) : (
                      <X className="mt-0.5 h-3 w-3 shrink-0 text-red-400" />
                    )
                  ) : (
                    <Circle className="mt-1 h-2 w-2 shrink-0 text-[#333]" />
                  )}
                  <span className={cn(check ? (check.passed ? 'text-[#aaa]' : 'text-red-300') : 'text-[#777]')}>
                    {label}
                    {check && !check.passed && check.detail && (
                      <span className="ml-1 text-[11px] text-[#777]">({check.detail})</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {result?.output != null && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#555]">Granite output</p>
              <pre className="forge-scroll max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-white/[0.04] bg-black/40 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-[#ccc]">
                {result.output || '(empty response)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
