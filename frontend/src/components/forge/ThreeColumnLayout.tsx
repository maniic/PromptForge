'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { ForgeResponse } from '@/types/api';
import { InputCard } from '@/components/forge/InputCard';
import { CraftedCard } from '@/components/forge/CraftedCard';
import { ResultCard } from '@/components/forge/ResultCard';

const COLUMN_VARIANTS = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0 },
};

interface ThreeColumnLayoutProps {
  /** The user's original input text */
  input: string;
  /** The full forge response */
  response: ForgeResponse;
  /** Called when user clicks "New Forge" to reset to hero */
  onReset?: () => void;
}

export default function ThreeColumnLayout({
  input,
  response,
  onReset,
}: ThreeColumnLayoutProps) {
  const [showResults, setShowResults] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1.2fr] gap-5 min-h-[70vh]">
        {/* Column 1: User input */}
        <InputCard inputText={input} onReset={onReset ?? (() => {})} />

        {/* Column 2: Crafted prompt with typewriter */}
        <motion.div
          variants={COLUMN_VARIANTS}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.35, delay: 0, ease: 'easeOut' }}
        >
          <CraftedCard
            craftedPrompt={response.crafted_prompt}
            category={response.category}
            onSeventyFivePercent={() => setShowResults(true)}
          />
        </motion.div>

        {/* Column 3: Before/after results */}
        <motion.div
          variants={COLUMN_VARIANTS}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.35, delay: 0.15, ease: 'easeOut' }}
        >
          <ResultCard
            rawResult={response.raw_result}
            craftedResult={response.crafted_result}
            visible={showResults}
          />
        </motion.div>
      </div>
    </div>
  );
}
