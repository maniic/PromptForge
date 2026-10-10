import { Suspense } from 'react';
import ForgeApp from '@/components/forge/ForgeApp';
import { SiteHeader } from '@/components/academy/SiteHeader';

export default function LabPage() {
  return (
    <>
      <SiteHeader />
      <Suspense>
        <ForgeApp />
      </Suspense>
    </>
  );
}
