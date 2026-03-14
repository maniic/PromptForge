'use client';

import { motion } from 'motion/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface ResultCardProps {
  rawResult: string;
  craftedResult: string;
  visible: boolean;
}

export function ResultCard({ rawResult, craftedResult, visible }: ResultCardProps) {
  return (
    <motion.div
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="h-full shadow-lg shadow-black/40 flex flex-col gap-0">
        <CardHeader className="pb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Results
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 flex-1">
          {/* Before — raw result */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Without PromptForge
            </span>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {rawResult}
            </p>
          </div>

          {/* After — crafted result */}
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 flex flex-col gap-1">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              With PromptForge
            </span>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {craftedResult}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
