'use client';

import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Brief, FormPref, UseCase } from '@/data/types';
import { BUDGET_STEPS, DEFAULT_BRIEF, RAM_STEPS, STORAGE_STEPS, step } from '@/lib/brief';

export type Theme = 'auto' | 'light' | 'dark';
export const THEME_KEY = 'fitlap-theme';

interface FitlapState {
  brief: Brief;
  selectedId: string;
  compareIds: string[]; // max 4
  theme: Theme;
  setBrief: (patch: Partial<Brief>) => void;
  toggleUse: (u: UseCase) => void;
  toggleForm: (f: FormPref) => void;
  stepBudget: (dir: 1 | -1) => void;
  stepRam: (dir: 1 | -1) => void;
  stepStorage: (dir: 1 | -1) => void;
  select: (id: string) => void;
  addCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  setCompare: (ids: string[]) => void;
  setTheme: (t: Theme) => void;
}

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export const useFitlap = create<FitlapState>()(
  persist(
    (set) => ({
      brief: DEFAULT_BRIEF,
      selectedId: '',
      compareIds: [],
      theme: 'auto',
      setBrief: (patch) => set((s) => ({ brief: { ...s.brief, ...patch } })),
      toggleUse: (u) => set((s) => ({ brief: { ...s.brief, uses: toggle(s.brief.uses, u) } })),
      toggleForm: (f) => set((s) => ({ brief: { ...s.brief, forms: toggle(s.brief.forms, f) } })),
      stepBudget: (dir) => set((s) => ({ brief: { ...s.brief, budgetMax: step(BUDGET_STEPS, s.brief.budgetMax as (typeof BUDGET_STEPS)[number], dir) } })),
      stepRam: (dir) => set((s) => ({ brief: { ...s.brief, minRamGb: step(RAM_STEPS, s.brief.minRamGb, dir) } })),
      stepStorage: (dir) => set((s) => ({ brief: { ...s.brief, minStorageGb: step(STORAGE_STEPS, s.brief.minStorageGb, dir) } })),
      select: (id) => set({ selectedId: id }),
      addCompare: (id) => set((s) => (s.compareIds.includes(id) || s.compareIds.length >= 4 ? s : { compareIds: [...s.compareIds, id] })),
      removeCompare: (id) => set((s) => ({ compareIds: s.compareIds.filter((x) => x !== id) })),
      setCompare: (ids) => set({ compareIds: [...new Set(ids)].slice(0, 4) }),
      setTheme: (theme) => {
        try { localStorage.setItem(THEME_KEY, theme); } catch {}
        document.documentElement.dataset.theme = theme;
        set({ theme });
      },
    }),
    {
      name: 'fitlap',
      // Theme lives under its own key so the blocking ThemeScript can read it before paint.
      partialize: (s) => ({ brief: s.brief, selectedId: s.selectedId, compareIds: s.compareIds }),
      // Briefs saved before a field existed pick up its default.
      merge: (persisted, current) => {
        const p = persisted as Partial<FitlapState> | undefined;
        return { ...current, ...p, brief: { ...current.brief, ...p?.brief } };
      },
      // Rehydrated after mount (StoreHydrator) so server and first client render match.
      skipHydration: true,
    },
  ),
);

/** False until the persisted store has loaded from localStorage. */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useFitlap.persist.onFinishHydration(cb),
    () => useFitlap.persist.hasHydrated(),
    () => false,
  );
}
