import type { Config, Laptop, LaptopDetails, Panel, SpecKey, Wifi } from '@shared/catalog';
import { SCREEN_TYPES } from './advanced.ts';
import { fmtStorage } from './brief.ts';

export const PANEL_LABEL = Object.fromEntries(SCREEN_TYPES.map((t) => [t.key, t.label])) as Record<Panel, string>;

/** "3024 × 1964 · 120 Hz · 1000 nits" */
export const displayLine = (c: Config) => `${c.display.resolution.w} × ${c.display.resolution.h} · ${c.display.refreshHz} Hz · ${c.display.nits} nits`;

/** '14.2" Mini-LED 120 Hz', with " touch" for touch screens. */
export const displayShort = (l: Laptop, c: Config) => `${l.sizeIn}" ${PANEL_LABEL[c.display.panel]} ${c.display.refreshHz} Hz${c.display.touch ? ' touch' : ''}`;

/** "MagSafe 3, 3× TB4, 3.5 mm, SDXC, HDMI 2.1": repeats counted, first-seen order kept. */
export function portSummary(p: { left: string[]; right: string[] }): string {
  const counts = new Map<string, number>();
  for (const x of [...p.left, ...p.right]) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts].map(([k, n]) => (n > 1 ? `${n}× ${k}` : k)).join(', ');
}

export const wifiLabel = (w: Wifi) => 'Wi-Fi ' + w;
export const fastChargeLabel = (min: number) => `~${min} min`;
export const warrantyLabel = (years: number) => `${years} year${years === 1 ? '' : 's'}`;

/** Spec card values on /laptop/[id]. The notes come from details.specNotes. */
export function specValues(l: Laptop, c: Config, d: LaptopDetails): Record<SpecKey, string> {
  return {
    cpu: `${c.cpu.name}, ${c.cpu.cores}-core`,
    gpu: c.gpu.name + (c.gpu.vramGb ? ` · ${c.gpu.vramGb} GB` : ''),
    ram: `${c.ramGb} GB`,
    storage: `${fmtStorage(c.storageGb)} SSD`,
    display: `${l.sizeIn}" ${PANEL_LABEL[c.display.panel]}${c.display.touch ? ' touch' : ''}`,
    ports: portSummary(l.ports),
    wireless: `${wifiLabel(l.wifi)} · BT ${d.bt}`,
    webcam: d.webcam,
    os: l.os,
    size: `${l.dims.w} × ${l.dims.d} mm`,
  };
}
