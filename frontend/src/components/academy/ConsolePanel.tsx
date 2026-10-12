'use client';

import { useState } from 'react';
import { Check, EyeOff, Loader2, X } from 'lucide-react';
import type { AttemptResponse, ChallengeDetail, TestCaseResult } from '@/types/learn';
import { StarRating } from '@/components/academy/StarRating';
import { cn } from '@/lib/utils';

export type ConsoleTab = 'cases' | 'result';

interface ConsolePanelProps {
  challenge: ChallengeDetail;
  attempt: AttemptResponse | null;
  running: 'run' | 'submit' | null;
  tab: ConsoleTab;
  onTab: (tab: ConsoleTab) => void;
}

export function ConsolePanel({ challenge, attempt, running, tab, onTab }: ConsolePanelProps) {
  return (
    <div className="flex h-full min-h-[260px] flex-col bg-panel">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line px-2">
        <TabButton active={tab === 'cases'} onClick={() => onTab('cases')}>
          Test cases
        </TabButton>
        <TabButton active={tab === 'result'} onClick={() => onTab('result')}>
          Test result
          {attempt && !running && (
            <span className={cn('ml-1.5 h-1.5 w-1.5 rounded-full', resultPassed(attempt) ? 'bg-ok' : 'bg-bad')} />
          )}
        </TabButton>
      </div>
      <div className="pf-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'cases' ? <CasesView challenge={challenge} /> : <ResultView attempt={attempt} running={running} challenge={challenge} />}
      </div>
    </div>
  );
}

function resultPassed(a: AttemptResponse) {
  return a.mode === 'submit' ? a.passed : a.test_results.every((r) => r.passed);
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
        active ? 'bg-raised text-fg' : 'text-fg-subtle hover:text-fg-muted'
      )}
    >
      {children}
    </button>
  );
}

function CaseChip({
  label,
  active,
  status,
  onClick,
}: {
  label: string;
  active: boolean;
  status?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
        active ? 'bg-raised text-fg' : 'text-fg-subtle hover:bg-raised hover:text-fg-muted'
      )}
    >
      {status !== undefined && <span className={cn('h-1.5 w-1.5 rounded-full', status ? 'bg-ok' : 'bg-bad')} />}
      {label}
    </button>
  );
}

function CasesView({ challenge }: { challenge: ChallengeDetail }) {
  const visible = challenge.test_cases.filter((tc) => !tc.hidden);
  const hiddenCount = challenge.test_cases.length - visible.length;
  const [i, setI] = useState(0);
  const tc = visible[Math.min(i, visible.length - 1)];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {visible.map((c, n) => (
          <CaseChip key={c.id} label={`Case ${n + 1}`} active={n === i} onClick={() => setI(n)} />
        ))}
        {hiddenCount > 0 && (
          <span className="ml-2 flex items-center gap-1 text-xs text-fg-subtle">
            <EyeOff className="h-3 w-3" /> +{hiddenCount} hidden on submit
          </span>
        )}
      </div>
      {tc && (
        <div className="mt-4 space-y-3">
          {Object.entries(tc.vars ?? {}).map(([name, value]) => (
            <div key={name}>
              <p className="mb-1.5 font-mono text-xs text-fg-subtle">{name} =</p>
              <pre className="pf-scroll max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-raised px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-fg-muted">
                {value}
              </pre>
            </div>
          ))}
          <div>
            <p className="mb-1.5 text-xs text-fg-subtle">Checks</p>
            <ul className="space-y-1">
              {tc.checks.map((c) => (
                <li key={c} className="flex gap-2 text-[13px] text-fg-muted">
                  <span className="text-fg-subtle">•</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultView({
  attempt,
  running,
  challenge,
}: {
  attempt: AttemptResponse | null;
  running: 'run' | 'submit' | null;
  challenge: ChallengeDetail;
}) {
  const [i, setI] = useState(0);

  if (running) {
    const n = running === 'run' ? challenge.test_cases.filter((t) => !t.hidden).length : challenge.test_cases.length;
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-fg-subtle">
        <Loader2 className="h-4 w-4 animate-spin text-brand" />
        {running === 'run' ? 'Running' : 'Submitting'} {n} test{n === 1 ? '' : 's'} in parallel on IBM Granite...
      </div>
    );
  }
  if (!attempt) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-fg-subtle">
        Run your prompt to see results here.
      </div>
    );
  }

  const results = attempt.test_results;
  const selected: TestCaseResult | undefined = results[Math.min(i, results.length - 1)];
  const passedCount = results.filter((r) => r.passed).length;
  const ok = resultPassed(attempt);
  let visibleN = 0;
  let hiddenN = 0;

  return (
    <div>
      {/* Verdict */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className={cn('text-lg font-semibold', ok ? 'text-ok' : 'text-bad')}>
          {attempt.mode === 'run' ? (ok ? 'Visible tests pass' : 'Some tests fail') : ok ? 'Accepted' : 'Not accepted'}
        </h3>
        <span className="text-xs text-fg-subtle">
          {passedCount}/{results.length} tests passed · {(attempt.latency_ms / 1000).toFixed(1)}s
        </span>
        {attempt.mode === 'submit' && ok && <StarRating stars={attempt.stars} />}
      </div>

      {attempt.mode === 'submit' ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Score" value={`${attempt.score}`} sub={`pass at ${challenge.pass_score}`} strong />
          <Metric label="Checks" value={`${attempt.checks_score}`} sub="75% weight" />
          <Metric label="Granite judge" value={attempt.judge_score === null ? '–' : `${attempt.judge_score}`} sub="25% weight" />
          <Metric label="Prompt size" value={`~${attempt.techniques.estimated_tokens}`} sub="tokens" />
        </div>
      ) : (
        <p className="mt-2 text-xs text-fg-subtle">
          Run uses visible tests only and doesn&apos;t count. Submit to grade against hidden tests and the judge.
        </p>
      )}

      {/* Case selector */}
      <div className="mt-4 flex flex-wrap gap-1">
        {results.map((r, n) => (
          <CaseChip
            key={r.id}
            label={r.hidden ? `Hidden ${++hiddenN}` : `Case ${++visibleN}`}
            active={n === i}
            status={r.passed}
            onClick={() => setI(n)}
          />
        ))}
      </div>

      {selected && (
        <div className="mt-3 space-y-3">
          <ul className="space-y-1.5">
            {selected.checks.map((c, n) => (
              <li key={c.label + n} className="flex items-start gap-2 text-[13px]">
                {c.passed ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok" />
                ) : (
                  <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bad" />
                )}
                <span className={c.passed ? 'text-fg-muted' : 'text-fg'}>
                  {c.label}
                  {!c.passed && c.detail && <span className="ml-1.5 text-xs text-fg-subtle">{c.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          {selected.hidden ? (
            <p className="rounded-lg bg-raised px-3 py-2.5 text-xs text-fg-subtle">
              Hidden test: the input and output stay secret so your prompt has to generalize.
            </p>
          ) : (
            <div>
              <p className="mb-1.5 text-xs text-fg-subtle">Granite output</p>
              <pre className="pf-scroll max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-raised px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-fg">
                {selected.output || '(empty response)'}
              </pre>
            </div>
          )}
        </div>
      )}

      {attempt.rubric_scores.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs text-fg-subtle">Granite judge rubric</p>
          <ul className="space-y-2">
            {attempt.rubric_scores.map((r) => (
              <li key={r.criterion} className="text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-fg-muted">{r.criterion}</span>
                  <span className="shrink-0 font-mono text-fg">{r.score}/5</span>
                </div>
                {r.reason && <p className="mt-0.5 text-xs text-fg-subtle">{r.reason}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, sub, strong }: { label: string; value: string; sub: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-raised px-3 py-2">
      <p className="text-[11px] text-fg-subtle">{label}</p>
      <p className={cn('font-mono text-lg', strong ? 'text-fg' : 'text-fg-muted')}>{value}</p>
      <p className="text-[11px] text-fg-subtle">{sub}</p>
    </div>
  );
}
