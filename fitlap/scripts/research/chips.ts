// Blender Open Data chip scores (scripts/research/blender-chips.json) and the one name key both sides go through.

export interface Chips { source: string; cpu: Record<string, number>; gpu: Record<string, number> }
/** One benchmark run: device type (CPU, OPTIX, METAL, …), compute device names, samples per minute. */
export interface Run { type: string; names: string[]; spm: number }

export const VERSION = '4.5.0';
export const SCENE = 'monster';
const MIN_RUNS = 3;

const DROP = new Set([
  'intel', 'amd', 'apple', 'qualcomm', 'nvidia', 'geforce', 'processor', 'cpu', 'gpu', 'graphics', 'laptop',
  'generation', 'celeron', 'pentium', 'vpro', 'creator', 'edition', 'oryon',
]);

/** Lowercase name with vendor words, ®/™, clocks, iGPU suffixes, "Nth Gen", VRAM and punctuation removed. Snapdragon keys are the SKU. */
export function chipKey(name: string): string {
  const s = name.toLowerCase()
    .replace(/\(gpu - (\d+) cores\)/, ' gpucores$1 ')
    .replace(/\(r\)|\(tm\)|®|™/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/@.*$/, ' ')
    .replace(/\s(w\/|with) radeon.*$/, ' ')
    .replace(/\b\d+(st|nd|rd|th)[- ]gen\b/g, ' ')
    .replace(/\b\w+-core\b/g, ' ')
    .replace(/\b\d+\s?gb\b/g, ' ');
  const sku = s.match(/\bx([12])([ep]?)-?(\d{2})-?(\d{3})\b/);
  if (/snapdragon/.test(s)) return sku ? `snapdragon x${sku[1]}${sku[2]}${sku[3]}${sku[4]}` : '';
  return s.split(/[^a-z0-9+]+/).filter((w) => w && !DROP.has(w)).join(' ');
}

/** Apple GPUs are keyed by chip and core count, the way Blender names them ("Apple M4 (GPU - 10 cores)"). */
export const appleGpuKey = (cpuName: string, cores: number) => `${chipKey(cpuName)} gpucores${cores}`;

/** The VERSION / SCENE runs in one snapshot record. `data` is an array or a single object. */
export function runsOf(record: { data?: unknown }): Run[] {
  const items = (Array.isArray(record.data) ? record.data : record.data ? [record.data] : []) as {
    blender_version?: { version?: string }; scene?: { label?: string }; stats?: { samples_per_minute?: number };
    device_info?: { device_type?: string; compute_devices?: { name: string }[] };
  }[];
  return items.flatMap((d) => {
    const spm = d.stats?.samples_per_minute;
    if (d.blender_version?.version !== VERSION || d.scene?.label !== SCENE || typeof spm !== 'number') return [];
    return [{ type: d.device_info?.device_type ?? '', names: (d.device_info?.compute_devices ?? []).map((c) => c.name), spm }];
  });
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return Math.round(s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};
const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => (m.get(k) ?? m.set(k, []).get(k)!).push(v);
const sorted = (e: [string, number][]) => Object.fromEntries(e.sort(([a], [b]) => a.localeCompare(b)));

/** Median samples/min per chip key, keys with at least MIN_RUNS runs. A GPU takes its best backend (OptiX beats CUDA). */
export function buildChips(runs: Run[], snapshotDate: string): Chips {
  const cpu = new Map<string, number[]>();
  const laptop = new Map<string, number[]>();     // key|type → runs
  const desktop = new Map<string, number[]>();
  for (const r of runs) {
    if (r.type === 'CPU') {
      const key = chipKey(r.names[0] ?? '');
      if (key) push(cpu, key, r.spm);
      continue;
    }
    if (r.names.length !== 1) continue;   // multi-GPU runs
    const key = chipKey(r.names[0]);
    if (!key || key === 'radeon') continue;   // "AMD Radeon(TM) Graphics" names every older AMD iGPU
    // NVIDIA names its laptop chips "… Laptop GPU". Desktop runs count only for chips with no laptop runs (RTX 2050, MX).
    push(/nvidia/i.test(r.names[0]) && !/laptop gpu/i.test(r.names[0]) ? desktop : laptop, `${key}|${r.type}`, r.spm);
  }
  const best = new Map<string, number>();
  const haveLaptop = new Set([...laptop.keys()].map((k) => k.split('|')[0]));
  for (const [k, a] of [...laptop, ...[...desktop].filter(([k]) => !haveLaptop.has(k.split('|')[0]))]) {
    const key = k.split('|')[0];
    if (a.length >= MIN_RUNS) best.set(key, Math.max(best.get(key) ?? 0, median(a)));
  }
  return {
    source: `Blender Open Data ${snapshotDate} snapshot, Blender ${VERSION}, ${SCENE} scene, median samples/min, at least ${MIN_RUNS} runs. CC0, https://opendata.blender.org/`,
    cpu: sorted([...cpu].filter(([, a]) => a.length >= MIN_RUNS).map(([k, a]) => [k, median(a)])),
    gpu: sorted([...best]),
  };
}

/** A config's Blender scores. An integrated GPU Blender has no data for takes the CPU score: Blender renders on the CPU then. */
export function scores(chips: Chips, cpuName: string, gpu: { name: string; brand: string; family: string; discrete: boolean }) {
  const cpu: number | undefined = chips.cpu[chipKey(cpuName)];
  const g: number | undefined = chips.gpu[gpu.brand === 'Apple' ? appleGpuKey(cpuName, parseInt(gpu.family)) : chipKey(gpu.name)];
  if (g !== undefined || gpu.discrete || cpu === undefined) return { cpu, gpu: g, gpuEstimated: false };
  if (gpu.brand === 'Apple') {
    // No exact core count: scale the same chip's nearest core count.
    const cores = parseInt(gpu.family), prefix = `${chipKey(cpuName)} gpucores`;
    const near = Object.keys(chips.gpu).filter((k) => k.startsWith(prefix))
      .map((k) => ({ n: Number(k.slice(prefix.length)), s: chips.gpu[k] })).sort((a, b) => Math.abs(a.n - cores) - Math.abs(b.n - cores))[0];
    if (near && cores) return { cpu, gpu: Math.round(near.s * cores / near.n), gpuEstimated: true };
  }
  return { cpu, gpu: cpu, gpuEstimated: true };
}
