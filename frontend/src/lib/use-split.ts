'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Draggable split between two panes. Returns the first pane's size as a
 * percentage of the container and a pointer handler for the divider.
 */
export function useSplit(initial: number, min: number, max: number, axis: 'x' | 'y') {
  const [pct, setPct] = useState(initial);
  const containerRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const container = containerRef.current;
      if (!container) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';

      const move = (ev: PointerEvent) => {
        const raw =
          axis === 'x'
            ? ((ev.clientX - rect.left) / rect.width) * 100
            : ((ev.clientY - rect.top) / rect.height) * 100;
        setPct(Math.min(max, Math.max(min, raw)));
      };
      const up = () => {
        document.body.style.userSelect = '';
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
      };
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
    },
    [axis, min, max]
  );

  return { pct, containerRef, onPointerDown };
}
