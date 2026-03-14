'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TypewriterText } from '@/components/shared/TypewriterText';

interface CraftedCardProps {
  craftedPrompt: string;
  category: string;
  onSeventyFivePercent: () => void;
}

export function CraftedCard({ craftedPrompt, category, onSeventyFivePercent }: CraftedCardProps) {
  return (
    <Card className="h-full shadow-lg shadow-black/40">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Crafted Prompt
        </span>
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {category}
        </span>
      </CardHeader>
      <CardContent>
        <TypewriterText
          text={craftedPrompt}
          speedMs={15}
          onSeventyFivePercent={onSeventyFivePercent}
          className="text-sm leading-relaxed whitespace-pre-wrap text-foreground"
        />
      </CardContent>
    </Card>
  );
}
