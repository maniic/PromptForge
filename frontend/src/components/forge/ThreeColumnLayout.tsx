'use client';

import { useCallback, useState } from 'react';
import { motion } from 'motion/react';
import type { ForgeResponse } from '@/types/api';
import { InputCard } from '@/components/forge/InputCard';
import { CraftedCard } from '@/components/forge/CraftedCard';
import { ResultCard } from '@/components/forge/ResultCard';
import { ChevronDown } from 'lucide-react';

type ExpandedColumn = null | 0 | 1 | 2;

function getGridTemplate(expanded: ExpandedColumn): string {
  if (expanded === null) return '1fr 1.3fr 1.3fr';
  const cols = [0, 1, 2].map((i) => (i === expanded ? '2.5fr' : '0.5fr'));
  return cols.join(' ');
}

interface ThreeColumnLayoutProps {
  input: string;
  response: ForgeResponse;
}

function AccordionSection({
  title,
  id,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#1a1a1a] rounded-xl bg-[#0e0e0e] overflow-hidden" role="region" aria-labelledby={`acc-${id}`}>
      <button
        id={`acc-${id}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
        className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-semibold text-[#555] uppercase tracking-[0.12em] hover:bg-white/[0.02] transition-colors"
      >
        {title}
        <ChevronDown
          className={`h-3.5 w-3.5 text-[#444] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div id={`panel-${id}`} className="px-4 pb-4 max-h-[60vh] overflow-y-auto forge-scroll">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ThreeColumnLayout({
  input,
  response,
}: ThreeColumnLayoutProps) {
  const [expanded, setExpanded] = useState<ExpandedColumn>(null);
  const [mobileOpen, setMobileOpen] = useState<number>(1);
  const [degradedResult, setDegradedResult] = useState<string | null>(null);

  function toggleExpand(col: 0 | 1 | 2) {
    setExpanded((prev) => (prev === col ? null : col));
  }

  const handleDegradedResult = useCallback((result: string | null) => {
    setDegradedResult(result);
  }, []);

  return (
    <div className="max-w-7xl mx-auto w-full h-full">
      {/* Desktop */}
      <motion.div
        className="hidden lg:grid gap-3 h-full"
        style={{ gridTemplateRows: '1fr' }}
        animate={{ gridTemplateColumns: getGridTemplate(expanded) }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0 }}
          className="min-w-0 min-h-0"
        >
          <InputCard
            inputText={input}
            expanded={expanded === 0}
            collapsed={expanded !== null && expanded !== 0}
            onToggleExpand={() => toggleExpand(0)}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="min-w-0 min-h-0"
        >
          <CraftedCard
            craftedPrompt={response.crafted_prompt}
            category={response.category}
            expanded={expanded === 1}
            collapsed={expanded !== null && expanded !== 1}
            onToggleExpand={() => toggleExpand(1)}
            onDegradedResult={handleDegradedResult}
            originalInput={input}
            craftedResult={response.crafted_result}
            rawResult={response.raw_result}
            totalLatencyMs={response.total_latency_ms}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="min-w-0 min-h-0"
        >
          <ResultCard
            rawResult={response.raw_result}
            craftedResult={response.crafted_result}
            expanded={expanded === 2}
            collapsed={expanded !== null && expanded !== 2}
            onToggleExpand={() => toggleExpand(2)}
            degradedResult={degradedResult}
          />
        </motion.div>
      </motion.div>

      {/* Mobile */}
      <div className="lg:hidden flex flex-col gap-2">
        <AccordionSection
          title="Your Input"
          id="input"
          isOpen={mobileOpen === 0}
          onToggle={() => setMobileOpen(mobileOpen === 0 ? -1 : 0)}
        >
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#999]">
            {input}
          </p>
        </AccordionSection>

        <AccordionSection
          title={`Crafted Prompt — ${response.category.replace('_', ' ')}`}
          id="crafted"
          isOpen={mobileOpen === 1}
          onToggle={() => setMobileOpen(mobileOpen === 1 ? -1 : 1)}
        >
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#ccc]">
            {response.crafted_prompt}
          </p>
        </AccordionSection>

        <AccordionSection
          title="Results"
          id="results"
          isOpen={mobileOpen === 2}
          onToggle={() => setMobileOpen(mobileOpen === 2 ? -1 : 2)}
        >
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-[#161616] bg-[#0a0a0a] p-3">
              <span className="text-[10px] font-semibold text-[#444] uppercase tracking-wider block mb-1.5">
                Without PromptForge
              </span>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#666]">
                {response.raw_result}
              </p>
            </div>
            <div className="rounded-lg border border-red-500/15 bg-red-500/[0.02] p-3">
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider block mb-1.5">
                With PromptForge
              </span>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-[#ccc]">
                {response.crafted_result}
              </p>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
}
