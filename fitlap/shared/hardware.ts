import type { CpuBrand, GpuBrand } from './catalog.ts';

// Families per brand, oldest and lowest tier first. An advanced-mode range is a pair of indices into one list.
// The /draft-laptop skill appends new families here; drafts.submit and the seed check reject unknown ones.

export const CPU_FAMILIES: Record<CpuBrand, string[]> = {
  Apple: ['A18 Pro', 'M1', 'M1 Pro', 'M1 Max', 'M2', 'M2 Pro', 'M2 Max', 'M3', 'M3 Pro', 'M3 Max', 'M4', 'M4 Pro', 'M4 Max', 'M5', 'M5 Pro', 'M5 Max'],
  Intel: [
    'N-series', 'Core i3', 'Core 3', 'Core i5', 'Core 5', 'Core i7', 'Core 7', 'Core i9', 'Core 9',
    'Core Ultra 5', 'Core Ultra 7', 'Core Ultra 9', 'Core Ultra X7',
  ],
  AMD: ['Athlon', 'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Ryzen 9', 'Ryzen AI 5', 'Ryzen AI 7', 'Ryzen AI 9', 'Ryzen AI Max'],
  Qualcomm: ['Snapdragon X', 'Snapdragon X Plus', 'Snapdragon X Elite', 'Snapdragon X2 Elite'],
};

export const GPU_FAMILIES: Record<GpuBrand, string[]> = {
  Apple: ['5-core', '7-core', '8-core', '10-core', '14-core', '16-core', '18-core', '19-core', '20-core', '24-core', '30-core', '32-core', '38-core', '40-core'],
  Intel: ['UHD', 'Iris Xe', 'Graphics', 'Arc', 'Arc 130V', 'Arc A370M', 'Arc 140T', 'Arc 140V', 'Arc A530M', 'Arc B390'],
  NVIDIA: [
    'MX', 'GTX 1650', 'RTX 2050', 'RTX 3050', 'RTX 3050 Ti', 'RTX 3060', 'RTX 3070', 'RTX 3070 Ti', 'RTX 3080', 'RTX 3080 Ti',
    'RTX 4050', 'RTX 4060', 'RTX 4070', 'RTX 4080', 'RTX 4090',
    'RTX 5050', 'RTX 5060', 'RTX 5070', 'RTX 5070 Ti', 'RTX 5080', 'RTX 5090',
    'RTX A1000', 'RTX PRO 1000', 'RTX PRO 2000',
  ],
  AMD: [
    'Radeon Graphics', 'Radeon 610M', 'Radeon 660M', 'Radeon 680M', 'Radeon 740M', 'Radeon 760M', 'Radeon 780M', 'Radeon 820M',
    'Radeon 840M', 'Radeon 860M', 'Radeon 880M', 'Radeon 890M', 'Radeon 8050S', 'Radeon 8060S',
    'Radeon RX 6700S', 'Radeon RX 7600S', 'Radeon RX 6800S',
  ],
  Qualcomm: ['Adreno X1', 'Adreno X2'],
};

export function isKnownFamily(kind: 'cpu' | 'gpu', brand: string, family: string): boolean {
  const lists: Record<string, string[] | undefined> = kind === 'cpu' ? CPU_FAMILIES : GPU_FAMILIES;
  return lists[brand]?.includes(family) ?? false;
}
