import type { Price } from '../../shared/catalog';
import { isKnownFamily } from '../../shared/hardware';
import type { FullDraft } from '../schema';

// Pure checks shared by drafts:submit and drafts:approve. Errors block a draft, flags go to review.

const BUILD_KEYS = ['materials', 'rigidity', 'hinge', 'keyboard', 'trackpad', 'thermals'] as const;

export function fullDraftErrors(d: FullDraft): string[] {
  const errs: string[] = [];
  if (!d.configs.length) errs.push('a full draft needs at least one config');
  const seen = new Set<string>();
  for (const c of d.configs) {
    if (seen.has(c.code)) errs.push(`config code ${c.code} is used twice in this draft`);
    seen.add(c.code);
    if (!/^[A-Z0-9-]+$/.test(c.code)) errs.push(`config code ${c.code} must be capitals, digits and dashes`);
    if (!isKnownFamily('cpu', c.hw.cpuBrand, c.hw.cpuFamily))
      errs.push(`${c.code}: unknown CPU family ${c.hw.cpuBrand} ${c.hw.cpuFamily} (add it to shared/hardware.ts)`);
    if (!isKnownFamily('gpu', c.hw.gpuBrand, c.hw.gpuFamily))
      errs.push(`${c.code}: unknown GPU family ${c.hw.gpuBrand} ${c.hw.gpuFamily} (add it to shared/hardware.ts)`);
  }
  return errs;
}

function range(f: string[], path: string, x: number | undefined, lo: number, hi: number) {
  if (x !== undefined && (x < lo || x > hi)) f.push(`${path} = ${x} is outside ${lo}–${hi}`);
}

/** `path` is the price's own path, e.g. "configs.MBP14-M.price". */
export function priceFlags(path: string, p: Price, usedOnly: boolean): string[] {
  const f: string[] = [];
  range(f, `${path}.srpPhp`, p.srpPhp, 15_000, 500_000);
  if (p.srpPhp === undefined && !usedOnly) f.push(`${path}.srpPhp missing (not used-only)`);
  if (p.srpPhp !== undefined && p.usedPhp !== undefined && p.usedPhp > p.srpPhp)
    f.push(`${path}.usedPhp ${p.usedPhp} is above the SRP ${p.srpPhp}`);
  return f;
}

export function fullDraftFlags(d: FullDraft): string[] {
  const f: string[] = [];
  const l = d.laptop;
  range(f, 'weightKg', l.weightKg, 0.8, 4.5);
  range(f, 'sizeIn', l.sizeIn, 11, 18.5);
  range(f, 'year', l.year, 2018, 2027);
  range(f, 'battery.wh', l.battery.wh, 30, 100);
  for (const [k, h] of Object.entries(l.battery.hoursByUse)) range(f, `battery.hoursByUse.${k}`, h, 0.5, 30);
  range(f, 'build.overall', l.build.overall, 0, 10);
  for (const k of BUILD_KEYS) range(f, `build.${k}`, l.build[k], 0, 10);
  for (const c of d.configs) {
    const p = `configs.${c.code}`;
    range(f, `${p}.display.nits`, c.display.nits, 200, 2000);
    range(f, `${p}.display.refreshHz`, c.display.refreshHz, 60, 360);
    range(f, `${p}.gpu.tgpW`, c.gpu.tgpW, 15, 175);
    if (c.hw.gpuBrand === 'NVIDIA' && c.gpu.tgpW === undefined) f.push(`${p}.gpu.tgpW missing for an NVIDIA GPU`);
    f.push(...priceFlags(`${p}.price`, c.price, c.usedOnly));
  }
  return f;
}
