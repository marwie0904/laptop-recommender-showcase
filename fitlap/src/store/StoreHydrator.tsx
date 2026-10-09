'use client';

import { useEffect } from 'react';
import { useFitlap, type Theme } from './useFitlap';

export function StoreHydrator() {
  useEffect(() => {
    useFitlap.persist.rehydrate();
    useFitlap.setState({ theme: (document.documentElement.dataset.theme as Theme) || 'auto' });
  }, []);
  return null;
}
