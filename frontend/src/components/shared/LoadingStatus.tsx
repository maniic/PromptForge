'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface StatusStage {
  text: string;
  ms: number;
}

const STATUS_STAGES: StatusStage[] = [
  { text: 'Detecting category...', ms: 1200 },
  { text: 'Crafting expert prompt...', ms: 2500 },
  { text: 'Executing with IBM Granite...', ms: 3500 },
  { text: 'Almost there...', ms: Infinity },
];

interface LoadingStatusProps {
  isLoading: boolean;
}

export default function LoadingStatus({ isLoading }: LoadingStatusProps) {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setStageIdx(0);
      return;
    }

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let accumulated = 0;

    for (let i = 0; i < STATUS_STAGES.length - 1; i++) {
      accumulated += STATUS_STAGES[i].ms;
      const nextIdx = i + 1;
      const timeout = setTimeout(() => {
        setStageIdx(nextIdx);
      }, accumulated);
      timeouts.push(timeout);
    }

    return () => {
      timeouts.forEach(clearTimeout);
      setStageIdx(0);
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={stageIdx}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className="text-sm text-muted-foreground"
      >
        {STATUS_STAGES[stageIdx].text}
      </motion.p>
    </AnimatePresence>
  );
}
