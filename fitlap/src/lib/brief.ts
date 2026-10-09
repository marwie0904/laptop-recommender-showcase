import type { Brief, FormPref, UseCase } from '@shared/brief';
import { BUDGET_TOP } from '@shared/brief';
import { DEFAULT_ADVANCED } from './advanced.ts';
import { fmtPhp } from './price.ts';

export const RAM_STEPS = [8, 16, 32, 64] as const;
export const STORAGE_STEPS = [256, 512, 1024, 2048] as const;

/** label = brief circle, pill = details/compare pills, chip = landing chips. */
export const USE_CASES: { key: UseCase; label: string; pill: string; chip: string; hint: string; icon: string }[] = [
  { key: 'coding', label: 'Coding', pill: 'Coding', chip: 'Coding', hint: 'CPU · RAM', icon: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13 6l-2 12' },
  { key: 'gaming', label: 'Gaming', pill: 'Gaming', chip: 'Gaming', hint: 'GPU · refresh', icon: 'M6 9h12a3 3 0 013 3v2a3 3 0 01-5 2l-1-1H9l-1 1a3 3 0 01-5-2v-2a3 3 0 013-3zM8 11v3M6.5 12.5h3' },
  { key: 'work', label: 'General work', pill: 'General work', chip: 'Work', hint: 'battery · weight', icon: 'M4 7h16v12H4zM9 7V4h6v3' },
  { key: '3d', label: '3D rendering', pill: '3D rendering', chip: '3D', hint: 'GPU · VRAM', icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5' },
  { key: 'editing', label: 'Editing', pill: 'Video editing', chip: 'Editing', hint: 'CPU · screen', icon: 'M4 6h16v12H4zM10 9l5 3-5 3z' },
  { key: 'school', label: 'School', pill: 'School', chip: 'School', hint: 'price · battery', icon: 'M3 9l9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5' },
];
export const FORMS: { key: FormPref; label: string }[] = [
  { key: 'slim', label: 'Slim & lightweight' },
  { key: 'metal', label: 'Metal body' },
  { key: 'convertible', label: '2-in-1 / touch' },
  { key: 'bigScreen', label: 'Big screen (16"+)' },
];

export const DEFAULT_BRIEF: Brief = {
  mode: 'simple',
  advanced: DEFAULT_ADVANCED,
  uses: ['coding', 'editing'],
  forms: ['slim', 'metal'],
  budgetMax: 105_000,
  includeUsed: true,
  minRamGb: 16,
  minStorageGb: 512,
};

export const fmtStorage = (gb: number) => (gb >= 1024 ? gb / 1024 + ' TB' : gb + ' GB');
export const useLabel = (u: UseCase) => USE_CASES.find((x) => x.key === u)!.label;

/** "₱105,000", or "₱175,000+" at the top step (no cap). */
export const budgetValue = (n: number) => fmtPhp(Math.min(n, BUDGET_TOP)) + (n >= BUDGET_TOP ? '+' : '');
/** "≤ ₱105,000", or "₱175,000+" at the top step. */
export const budgetCap = (n: number) => (n >= BUDGET_TOP ? '' : '≤ ') + budgetValue(n);

/** "Coding · Editing · ≤ ₱105,000" */
export function briefSummary(b: Brief) {
  return [...b.uses.map(useLabel), budgetCap(b.budgetMax)].join(' · ');
}

/** Move `cur` one step along `steps`, clamped. */
export function step<T extends number>(steps: readonly T[], cur: T, dir: 1 | -1): T {
  const i = steps.indexOf(cur);
  return steps[Math.max(0, Math.min(steps.length - 1, (i === -1 ? 0 : i) + dir))];
}
