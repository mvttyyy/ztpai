'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { MixerPanel } from '@/components/audio/mixer-panel';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [mounted, setMounted] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      {children}
      <MixerPanel />
    </>
  );
}
