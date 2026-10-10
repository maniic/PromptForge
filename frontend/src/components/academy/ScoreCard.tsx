import type { AttemptResponse } from '@/types/learn';
import { StarRating } from '@/components/academy/StarRating';
import { cn } from '@/lib/utils';

interface ScoreCardProps {
  attempt: AttemptResponse;
  passScore: number;
}

export function ScoreCard({ attempt, passScore }: ScoreCardProps) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const color = attempt.passed ? '#34d399' : attempt.score >= passScore - 20 ? '#fbbf24' : '#f87171';

  return (
    <div className={cn('glass-card rounded-xl p-4', attempt.passed && 'border-emerald-500/20')}>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="#1a1a1a" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - attempt.score / 100)}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
            {attempt.score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn('text-sm font-semibold', attempt.passed ? 'text-emerald-300' : 'text-white')}>
              {attempt.passed ? 'Challenge passed' : `Not yet: ${passScore} needed to pass`}
            </p>
            {attempt.passed && <StarRating stars={attempt.stars} />}
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
            <dt className="text-[#666]">Automated checks</dt>
            <dd className="text-right font-mono text-[#bbb]">{attempt.checks_score}</dd>
            {attempt.judge_score !== null && (
              <>
                <dt className="text-[#666]">Granite judge</dt>
                <dd className="text-right font-mono text-[#bbb]">{attempt.judge_score}</dd>
              </>
            )}
            <dt className="text-[#666]">Prompt size</dt>
            <dd className="text-right font-mono text-[#bbb]">~{attempt.techniques.estimated_tokens} tokens</dd>
            <dt className="text-[#666]">Run time</dt>
            <dd className="text-right font-mono text-[#bbb]">{(attempt.latency_ms / 1000).toFixed(1)}s</dd>
          </dl>
        </div>
      </div>

      {attempt.rubric_scores.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-white/[0.04] pt-3">
          {attempt.rubric_scores.map((r) => (
            <li key={r.criterion} className="text-[12px]">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[#999]">{r.criterion}</span>
                <span className="shrink-0 font-mono text-[#bbb]">{r.score}/5</span>
              </div>
              {r.reason && <p className="mt-0.5 text-[11px] text-[#666]">{r.reason}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
