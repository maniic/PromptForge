'use client';

import { useEffect, useRef, useState } from 'react';

// Track which texts have already been typed out so remounts don't replay
const completedTexts = new Set<string>();

export function useTypewriter(text: string, speedMs = 5) {
  const alreadyDone = completedTexts.has(text);
  const [index, setIndex] = useState(alreadyDone ? text.length : 0);
  const markedRef = useRef(false);

  useEffect(() => {
    if (completedTexts.has(text)) {
      setIndex(text.length);
      return;
    }
    setIndex(0);
  }, [text]);

  useEffect(() => {
    if (index >= text.length) {
      if (!markedRef.current) {
        completedTexts.add(text);
        markedRef.current = true;
      }
      return;
    }

    const timer = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, text.length));
    }, speedMs);

    return () => clearInterval(timer);
  }, [index, text, speedMs]);

  return {
    displayed: text.slice(0, index),
    done: index >= text.length,
  };
}

interface TypewriterTextProps {
  text: string;
  speedMs?: number;
  className?: string;
}

export function TypewriterText({
  text,
  speedMs = 5,
  className,
}: TypewriterTextProps) {
  const { displayed, done } = useTypewriter(text, speedMs);

  return (
    <span className={className}>
      {displayed}
      {!done && (
        <span className="typewriter-cursor">|</span>
      )}
    </span>
  );
}
