'use client';

import { useEffect, useState } from 'react';

interface UseTypewriterOptions {
  text: string;
  speedMs?: number;
  onSeventyFivePercent?: () => void;
}

interface UseTypewriterResult {
  displayed: string;
  done: boolean;
}

export function useTypewriter(
  text: string,
  speedMs = 30,
  onSeventyFivePercent?: () => void
): UseTypewriterResult {
  const [index, setIndex] = useState(0);
  const [seventyFiveTriggered, setSeventyFiveTriggered] = useState(false);

  useEffect(() => {
    setIndex(0);
    setSeventyFiveTriggered(false);
  }, [text]);

  useEffect(() => {
    if (index >= text.length) return;

    const timer = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        const pct = next / text.length;
        if (pct >= 0.75 && !seventyFiveTriggered) {
          setSeventyFiveTriggered(true);
          onSeventyFivePercent?.();
        }
        return next;
      });
    }, speedMs);

    return () => clearInterval(timer);
  }, [index, text, speedMs, onSeventyFivePercent, seventyFiveTriggered]);

  return {
    displayed: text.slice(0, index),
    done: index >= text.length,
  };
}

interface TypewriterTextProps {
  text: string;
  speedMs?: number;
  onSeventyFivePercent?: () => void;
  className?: string;
}

export function TypewriterText({
  text,
  speedMs = 30,
  onSeventyFivePercent,
  className,
}: TypewriterTextProps) {
  const { displayed, done } = useTypewriter(text, speedMs, onSeventyFivePercent);

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
}
