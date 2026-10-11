import type { Brief, FormPref, UseCase } from './brief.ts';
import { BATTERY_MAX, BUDGET_STEPS, FORM_PREFS, RAM_STEPS, SCREEN_SIZES, STORAGE_STEPS, USES } from './brief.ts';
import type { Panel } from './catalog.ts';
import { PANELS } from './catalog.ts';
import { CPU_FAMILIES, GPU_FAMILIES } from './hardware.ts';

// The brief as URL params (PLAN §3, spec §4.7):
//   u=coding,editing&f=slim,metal&b=90000&used=1&ram=16&ssd=512
//   + m=adv&br=Apple,ASUS&cpu=Intel.0-2&gpu=NVIDIA.1-3&bat=8-24&scr=oled,ips&sz=13,14
// Advanced params are written only when they differ from the defaults. Reading validates every value:
// a missing or bad one takes its default, so a hand-edited link never crashes the page.

const KEYS = ['u', 'f', 'b', 'used', 'ram', 'ssd', 'm', 'br', 'cpu', 'gpu', 'bat', 'scr', 'sz'];

const csv = (s: string | null) => [...new Set((s ?? '').split(',').filter(Boolean))];
/** The values of `xs` that are in `all`, in `xs` order. */
const keep = <T>(all: readonly T[], xs: unknown[]) => xs.filter((x): x is T => all.includes(x as T));
const int = (s: string | null) => (s && /^\d+$/.test(s) ? Number(s) : NaN);

function range(s: string | null | undefined, max: number): [number, number] | null {
  const m = s?.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  const lo = Number(m[1]), hi = Number(m[2]);
  return lo <= hi && hi <= max ? [lo, hi] : null;
}

/** "Intel.0-2" → a brand and a range of indices into its family list. */
function family<B extends string>(s: string | null, lists: Record<B, string[]>): { brand: B | null; range: [number, number] } {
  const [brand, r] = (s ?? '').split('.');
  const ok = Object.hasOwn(lists, brand) ? range(r, lists[brand as B].length - 1) : null;
  return ok ? { brand: brand as B, range: ok } : { brand: null, range: [0, 0] };
}

const famParam = (f: { brand: string | null; range: [number, number] }) => (f.brand ? `${f.brand}.${f.range.join('-')}` : '');
const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);

export function briefToParams(b: Brief, defaults: Brief): string {
  const sp = new URLSearchParams({
    u: b.uses.join(','), f: b.forms.join(','), b: String(b.budgetMax), used: b.includeUsed ? '1' : '0',
    ram: String(b.minRamGb), ssd: String(b.minStorageGb),
  });
  if (b.mode === 'advanced') sp.set('m', 'adv');
  const a = b.advanced, d = defaults.advanced;
  if (!same(a.brands, d.brands)) sp.set('br', a.brands.join(','));
  if (!same(a.cpu, d.cpu)) sp.set('cpu', famParam(a.cpu));
  if (!same(a.gpu, d.gpu)) sp.set('gpu', famParam(a.gpu));
  if (!same(a.batteryH, d.batteryH)) sp.set('bat', a.batteryH.join('-'));
  if (!same(a.screens, d.screens)) sp.set('scr', a.screens.join(','));
  if (!same(a.sizes, d.sizes)) sp.set('sz', a.sizes.join(','));
  return sp.toString().replaceAll('%2C', ',');
}

/** The brief a URL carries, or null when it carries none. */
export function briefFromParams(sp: URLSearchParams, defaults: Brief): Brief | null {
  if (!KEYS.some((k) => sp.has(k))) return null;
  const d = defaults, a = d.advanced;
  const b = int(sp.get('b')), ram = int(sp.get('ram')), ssd = int(sp.get('ssd')), used = sp.get('used');
  return {
    mode: sp.get('m') === 'adv' ? 'advanced' : 'simple',
    advanced: {
      brands: sp.has('br') ? csv(sp.get('br')).filter((x) => x.length <= 40).slice(0, 20) : a.brands,
      cpu: sp.has('cpu') ? family(sp.get('cpu'), CPU_FAMILIES) : a.cpu,
      gpu: sp.has('gpu') ? family(sp.get('gpu'), GPU_FAMILIES) : a.gpu,
      batteryH: range(sp.get('bat'), BATTERY_MAX) ?? a.batteryH,
      screens: sp.has('scr') ? keep<Panel>(PANELS, csv(sp.get('scr'))) : a.screens,
      sizes: sp.has('sz') ? keep<number>(SCREEN_SIZES, csv(sp.get('sz')).map(Number)) : a.sizes,
    },
    uses: sp.has('u') ? keep<UseCase>(USES, csv(sp.get('u'))) : d.uses,
    forms: sp.has('f') ? keep<FormPref>(FORM_PREFS, csv(sp.get('f'))) : d.forms,
    budgetMax: BUDGET_STEPS.includes(b) ? b : d.budgetMax,
    includeUsed: used === '1' ? true : used === '0' ? false : d.includeUsed,
    minRamGb: keep(RAM_STEPS, [ram])[0] ?? d.minRamGb,
    minStorageGb: keep(STORAGE_STEPS, [ssd])[0] ?? d.minStorageGb,
  };
}
