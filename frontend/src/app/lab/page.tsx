import { Suspense } from 'react';
import ForgeApp from '@/components/forge/ForgeApp';
import { TopNav } from '@/components/academy/TopNav';
import { DotGridBackground } from '@/components/layout/DotGridBackground';

export default function LabPage() {
  return (
    <div className="font-[family-name:var(--font-inter)] bg-[#0a0a0a]">
      <DotGridBackground />
      <div className="relative z-10">
        <TopNav />
        <Suspense>
          <ForgeApp />
        </Suspense>
      </div>
    </div>
  );
}
