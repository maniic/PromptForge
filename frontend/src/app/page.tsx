import { Suspense } from 'react';
import ForgeApp from '@/components/forge/ForgeApp';

export default function Home() {
  return (
    <Suspense>
      <ForgeApp />
    </Suspense>
  );
}
