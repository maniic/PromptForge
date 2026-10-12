import { cn } from '@/lib/utils';
import { DIFFICULTY_LABEL } from '@/lib/curriculum';
import type { Difficulty } from '@/types/learn';

const STYLES: Record<Difficulty, string> = {
  beginner: 'text-ok',
  intermediate: 'text-warn',
  advanced: 'text-bad',
};

export function DifficultyBadge({ difficulty, pill = false }: { difficulty: Difficulty; pill?: boolean }) {
  return (
    <span
      className={cn(
        'text-[13px] font-medium',
        STYLES[difficulty],
        pill && 'rounded-full bg-raised px-2.5 py-0.5 text-xs'
      )}
    >
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}
