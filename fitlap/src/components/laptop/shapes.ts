import type { CSSProperties } from 'react';
import type { Archetype as LaptopShapeKey } from '@shared/catalog';

// Typed port of design-reference/laptop-shapes.generator.js. Every size is a % of the wrapper width.

type Det = 'scoop' | 'pad' | 'vents' | 'keys' | 'ports' | 'none';
interface ShapeDef {
  name: string; note: string;
  ar: string; r: string; pad: [number, number, number];
  notch?: boolean; chin?: boolean; lidBg?: string; clip?: string;
  hinge?: 'bar' | 'round' | 'lift' | 'gap';
  base: { w: number; ar: string; r: string; bg: string; clip?: string; det: Det; feet?: boolean; rgb?: boolean };
}

export const LAPTOP_SHAPES: Record<LaptopShapeKey, ShapeDef> = {
  wedge: { name: 'Slim wedge', note: 'Classic thin and light, tapered base', ar: '16 / 10.4', r: '5% 5% 1.2% 1.2% / 7.5% 7.5% 2% 2%', pad: [2.4, 2.4, 2.8], base: { w: 112, ar: '100 / 2.8', r: '0 0 50% 50% / 0 0 100% 100%', bg: '#CACACA', clip: 'polygon(0 0, 100% 0, 98.5% 100%, 1.5% 100%)', det: 'scoop' } },
  notch: { name: 'Slim notch', note: 'Thin bezels, camera notch', ar: '16 / 10.4', r: '4.5% 4.5% 1% 1% / 7% 7% 1.6% 1.6%', pad: [1.5, 1.5, 1.6], notch: true, base: { w: 110, ar: '100 / 2.2', r: '0 0 40% 40% / 0 0 100% 100%', bg: '#C4C4C4', det: 'scoop' } },
  pro: { name: 'Pro notch', note: 'Notch screen, thick flat slab', ar: '16 / 10.4', r: '3.6% 3.6% 1% 1% / 5.6% 5.6% 1.6% 1.6%', pad: [1.6, 1.6, 1.8], notch: true, base: { w: 108, ar: '100 / 3.8', r: '0 0 14% 14% / 0 0 60% 60%', bg: '#A2A2A2', det: 'scoop', feet: true } },
  chin: { name: 'Ultrabook chin', note: 'Slim side bezels, logo chin', ar: '16 / 10.8', r: '3% 3% 1% 1% / 4.6% 4.6% 1.5% 1.5%', pad: [1.8, 1.8, 5.6], chin: true, base: { w: 110, ar: '100 / 2.6', r: '0 0 30% 30% / 0 0 100% 100%', bg: '#B8B8B8', det: 'scoop' } },
  business: { name: 'Business', note: 'Thick bezels, hinge bar, matte black', ar: '16 / 10.4', r: '1.6% 1.6% 0.6% 0.6% / 2.4% 2.4% 1% 1%', pad: [3.4, 3, 3.6], lidBg: '#141414', hinge: 'bar', base: { w: 106, ar: '100 / 4', r: '0 0 8% 8% / 0 0 40% 40%', bg: '#2C2C2C', det: 'pad' } },
  convertible: { name: '2-in-1 convertible', note: '3:2 touch screen, 360° hinges', ar: '3 / 2', r: '3% 3% 2% 2% / 4.5% 4.5% 3% 3%', pad: [2.6, 2.6, 2.6], hinge: 'round', base: { w: 104, ar: '100 / 3', r: '0 0 18% 18% / 0 0 70% 70%', bg: '#ABABAB', det: 'scoop' } },
  gamingThick: { name: 'Gaming, thick', note: '16:9, big chin, vents and light bar', ar: '16 / 9.4', r: '2% 2% 0.6% 0.6% / 3.5% 3.5% 1% 1%', clip: 'polygon(3% 0, 97% 0, 100% 5%, 100% 100%, 0 100%, 0 5%)', pad: [2.6, 2.4, 5], chin: true, lidBg: '#121212', base: { w: 116, ar: '100 / 6', r: '0 0 6% 6% / 0 0 30% 30%', bg: '#2A2A2A', clip: 'polygon(0 0, 100% 0, 99% 100%, 1% 100%)', det: 'vents', rgb: true } },
  gamingSlim: { name: 'Gaming, slim', note: '16:10, lift hinge, side vents', ar: '16 / 10', r: '2.4% 2.4% 0.8% 0.8% / 4% 4% 1.2% 1.2%', pad: [2, 2, 3], hinge: 'lift', base: { w: 108, ar: '100 / 3.4', r: '0 0 12% 12% / 0 0 50% 50%', bg: '#4A4A4A', det: 'vents' } },
  creator: { name: 'Creator 16"', note: 'Big 16:10, edge-to-edge glass', ar: '16 / 10', r: '2.4% 2.4% 0.8% 0.8% / 3.8% 3.8% 1.3% 1.3%', pad: [1.1, 1.1, 1.2], base: { w: 106, ar: '100 / 2.4', r: '0 0 30% 30% / 0 0 100% 100%', bg: '#B2B2B2', det: 'scoop' } },
  budget: { name: 'Budget / Chromebook', note: 'Rounded plastic, wide bezels', ar: '16 / 9.6', r: '6% 6% 3% 3% / 10% 10% 5% 5%', pad: [4.4, 4.4, 5.2], lidBg: '#2A2A2A', base: { w: 108, ar: '100 / 5', r: '0 0 30% 30% / 0 0 100% 100%', bg: '#8E8E8E', det: 'none', feet: true } },
  detachable: { name: 'Detachable tablet', note: 'Kickstand tablet with keyboard cover', ar: '3 / 2', r: '3.4% / 5%', pad: [3, 3, 3], hinge: 'gap', base: { w: 100, ar: '100 / 2.4', r: '6px', bg: '#5E5E5E', det: 'keys' } },
  workstation: { name: 'Workstation 17"', note: 'Thick slab, big 16:9, rear ports', ar: '16 / 9.6', r: '1.6% 1.6% 0.6% 0.6% / 2.8% 2.8% 1% 1%', pad: [2.6, 2.6, 4.2], chin: true, lidBg: '#181818', hinge: 'bar', base: { w: 114, ar: '100 / 7', r: '0 0 4% 4% / 0 0 20% 20%', bg: '#3A3A3A', det: 'ports', feet: true } },
};

export interface ShapeStyles {
  name: string; note: string;
  lid: CSSProperties;
  notch: CSSProperties | null;
  chin: CSSProperties | null;
  hinge: CSSProperties | null;
  hl: CSSProperties | null;
  hr: CSSProperties | null;
  base: CSSProperties;
  bd1: CSSProperties | null;
  bd2: CSSProperties | null;
}

const HINGES: Record<NonNullable<ShapeDef['hinge']>, CSSProperties> = {
  bar: { width: '62%', height: 0, paddingBottom: '2.2%', background: '#2B2B2B', borderRadius: '0 0 40% 40% / 0 0 100% 100%' },
  round: { position: 'relative', width: '100%', height: 0 },
  lift: { width: '74%', height: 0, paddingBottom: '2.8%', borderRadius: '0 0 6% 6% / 0 0 100% 100%', backgroundColor: '#262626', backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 7px)' },
  gap: { width: '100%', height: 0, paddingBottom: '4%' },
};

const DETAILS: Record<Det, CSSProperties | null> = {
  scoop: { width: '15%', height: '42%', background: 'rgba(0,0,0,0.16)', borderRadius: '0 0 10px 10px' },
  pad: { width: '24%', height: '32%', marginTop: '1.5%', borderRadius: 3, background: 'rgba(255,255,255,0.08)' },
  vents: { position: 'absolute', left: '4%', right: '4%', top: '26%', height: '28%', backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.5) 0 3px, transparent 3px 8px)' },
  keys: { position: 'absolute', inset: '24% 5%', backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0 5.5%, transparent 5.5% 7%)' },
  ports: { position: 'absolute', left: '6%', top: '32%', width: '26%', height: '30%', backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.65) 0 9%, transparent 9% 15%)' },
  none: null,
};

const knob = (side: 'left' | 'right'): CSSProperties => ({ position: 'absolute', [side]: '4%', top: -3, width: '8%', height: 6, borderRadius: 999, background: '#7E7E7E' });

export function laptopShape(kind: LaptopShapeKey, accent = 'var(--accent)'): ShapeStyles {
  const k = LAPTOP_SHAPES[kind] ?? LAPTOP_SHAPES.notch;
  const p = k.pad, lb = k.lidBg ?? '#1B1B1B', b = k.base;
  const extra: CSSProperties | null = b.rgb
    ? { position: 'absolute', left: '32%', right: '32%', bottom: '18%', height: '12%', borderRadius: 4, background: accent, boxShadow: `0 0 10px ${accent}` }
    : b.feet
      ? { position: 'absolute', left: '6%', right: '6%', bottom: '-18%', height: '18%', background: 'linear-gradient(90deg, #4A4A4A 0 9%, transparent 9% 91%, #4A4A4A 91% 100%)' }
      : null;
  return {
    name: k.name, note: k.note,
    lid: { position: 'relative', width: '100%', aspectRatio: k.ar, boxSizing: 'border-box', padding: `${p[0]}% ${p[1]}% ${p[2]}%`, borderRadius: k.r, background: lb, display: 'flex', ...(k.clip && { clipPath: k.clip }) },
    notch: k.notch ? { position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '10%', height: '4.6%', background: lb, borderRadius: '0 0 22% 22% / 0 0 45% 45%', zIndex: 3 } : null,
    chin: k.chin ? { position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: (p[2] * 0.55).toFixed(1) + '%', width: '7%', height: '1.8%', borderRadius: 2, background: '#3C3C3C' } : null,
    hinge: k.hinge ? HINGES[k.hinge] : null,
    hl: k.hinge === 'round' ? knob('left') : null,
    hr: k.hinge === 'round' ? knob('right') : null,
    base: { position: 'relative', width: b.w + '%', aspectRatio: b.ar, background: b.bg, borderRadius: b.r, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', ...(b.clip && { clipPath: b.clip }) },
    bd1: DETAILS[b.det],
    bd2: extra,
  };
}
