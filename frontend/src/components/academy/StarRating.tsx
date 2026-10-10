import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({ stars, size = 'sm' }: { stars: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'h-5 w-5' : 'h-3 w-3';
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={cn(cls, n <= stars ? 'fill-amber-400 text-amber-400' : 'text-[#2a2a2a]')}
        />
      ))}
    </span>
  );
}
