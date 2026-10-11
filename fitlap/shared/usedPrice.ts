// Used-price estimate from the launch SRP. Retention at years 1–4 per class, from the research guide (Part 1).
// ponytail: one fixed curve; recalibrate RETENTION against real PH listings when there are enough of them.

export type UsedClass = 'mac' | 'premium' | 'mainstream' | 'gaming';

export const RETENTION: Record<UsedClass, [number, number, number, number]> = {
  mac: [0.70, 0.55, 0.42, 0.32],
  premium: [0.62, 0.48, 0.36, 0.27],
  mainstream: [0.55, 0.40, 0.28, 0.20],
  gaming: [0.50, 0.36, 0.25, 0.18],
};

/** Launch SRP × retention at the laptop's age in months, straight-line between years, held at year 4, rounded to ₱500. */
export function estimateUsedPhp(launchSrpPhp: number, released: string, cls: UsedClass, today: string): number {
  const [ry, rm] = released.split('-').map(Number);
  const [ty, tm] = today.split('-').map(Number);
  const age = Math.max(0, (ty * 12 + tm - (ry * 12 + rm)) / 12);
  const pts = [1, ...RETENTION[cls]];
  const i = Math.floor(age);
  const r = i >= 4 ? pts[4] : pts[i] + (pts[i + 1] - pts[i]) * (age - i);
  return Math.round((launchSrpPhp * r) / 500) * 500;
}
