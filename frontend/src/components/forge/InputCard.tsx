'use client';

import { RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InputCardProps {
  inputText: string;
  onReset: () => void;
}

export function InputCard({ inputText, onReset }: InputCardProps) {
  return (
    <Card className="h-full shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20 bg-[#111115]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Your Input
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          New Forge
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
          {inputText}
        </p>
      </CardContent>
    </Card>
  );
}
