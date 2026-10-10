'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlaskConical, GraduationCap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Academy', icon: GraduationCap },
  { href: '/lab', label: 'Lab', icon: FlaskConical },
  { href: '/library', label: 'Library', icon: BookOpen },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight gradient-text-red">PromptForge</span>
          <span className="rounded border border-red-500/20 bg-red-500/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-red-400/80">
            Academy
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' || pathname.startsWith('/challenge') : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                  active ? 'bg-white/[0.05] text-white' : 'text-[#666] hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
