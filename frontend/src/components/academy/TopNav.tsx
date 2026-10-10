'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/problems', label: 'Problems', match: ['/problems', '/challenge'] },
  { href: '/lab', label: 'Lab', match: ['/lab'] },
  { href: '/library', label: 'Library', match: ['/library'] },
] as const;

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="PromptForge Academy home">
      <span className="grid h-6 w-6 place-items-center rounded-md bg-brand-strong font-mono text-[11px] font-medium text-white">
        {'{}'}
      </span>
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-fg">
        PromptForge<span className="hidden font-normal text-fg-subtle sm:inline"> Academy</span>
      </span>
    </Link>
  );
}

export function TopNav({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const progress = useProgress();
  const solved = Object.values(progress).filter((p) => p.passed).length;

  return (
    <header className="sticky top-0 z-40 h-12 border-b border-line bg-[rgba(13,14,16,0.88)] backdrop-blur">
      <div className="flex h-full items-center gap-3 px-4 sm:gap-6">
        <Logo />
        <nav className="flex h-full items-center gap-1">
          {NAV.map(({ href, label, match }) => {
            const active = match.some((m) => pathname.startsWith(m));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex h-full items-center px-2.5 text-sm transition-colors',
                  active ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted'
                )}
              >
                {label}
                {active && <span className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-full bg-brand" />}
              </Link>
            );
          })}
        </nav>
        <div className="flex-1">
          <div className="hidden md:block">{children}</div>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle" title="Problems solved">
            <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
            {solved} solved
          </span>
          <span className="rounded border border-line px-2 py-0.5 font-mono text-[11px] text-fg-subtle">
            IBM Granite · watsonx.ai
          </span>
        </div>
      </div>
    </header>
  );
}
