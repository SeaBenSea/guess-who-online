'use client';

import { useEffect } from 'react';
import { authStore } from '@/utils/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    authStore.initialize();
  }, []);

  return <>{children}</>;
}
