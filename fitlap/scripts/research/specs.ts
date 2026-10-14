// Specs-table rows → laptop facts. Missing or "Unverified" → null, and the importer estimates.
import { noParens } from './normalize.ts';

const unverified = (s: string | undefined) => !s || /^unverified/i.test(s.trim());

/** "1.24 kg" or "from 0.986 kg (up to …)" → the first kg figure. */
export function parseKg(cell: string | undefined): number | null {
  const m = unverified(cell) ? null : cell!.match(/(\d+(?:\.\d+)?)\s?kg/i);
  return m ? Number(m[1]) : null;
}

/** "312.8 x 214.75 x 8.08/14.37 (front/rear), 16.95 (maximum) mm" → the first W x D, H = the largest height figure. */
export function parseDims(cell: string | undefined): { w: number; d: number; h: number } | null {
  if (unverified(cell)) return null;
  const m = cell!.split(/\s\/\s/)[0].match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*([\d.\s/,()a-z–-]*?)\s*mm/i);
  if (!m) return null;
  const hs = [...m[3].matchAll(/\d+(?:\.\d+)?/g)].map((x) => Number(x[0]));
  return hs.length ? { w: Number(m[1]), d: Number(m[2]), h: Math.max(...hs) } : null;
}

export function parseWh(cell: string | undefined): number | null {
  const m = unverified(cell) ? null : cell!.match(/(\d+(?:\.\d+)?)\s?Wh/i);
  return m ? Number(m[1]) : null;
}

/** The first watt figure that isn't Wh: the adapter. */
export function parseChargerW(cell: string | undefined): number | null {
  const m = unverified(cell) ? null : cell!.match(/(\d+)\s?W(?!h)\b/);
  return m ? Number(m[1]) : null;
}

export function parseWifi(cell: string | undefined): '5' | '6' | '6E' | '7' | null {
  const m = unverified(cell) ? null : cell!.match(/Wi-?Fi\s?(7|6E|6|5)\b/i);
  return m ? (m[1].toUpperCase() as '5' | '6' | '6E' | '7') : null;
}

export function parseBt(cell: string | undefined): string | null {
  const m = unverified(cell) ? null : cell!.match(/(?:Bluetooth|BT)\s?(\d(?:\.\d)?)/i);
  return m ? m[1] : null;
}

/** Short port labels: semicolon lists split on ";" (commas there are details), others on ","; parentheses, size and variant labels ("16\":", "Intel:"), "1x", "with …" details, and optional, missing or over-long items dropped. */
export function parsePorts(cell: string | undefined): string[] {
  if (unverified(cell)) return [];
  const text = noParens(cell!).split(/\.\s+(?=[A-Z0-9])/)[0];
  const items = text.includes(';') ? text.split(';').map((s) => s.split(',')[0]) : text.split(',');
  return items
    .flatMap((s) => s.split(/\s\/\s(?=[A-Za-z0-9]+\s?:)/))
    .map((s) => s.trim())
    .filter((s) => s && !/^(optional|no)\b/i.test(s))
    .map((s) => s.replace(/^[\d.]+":\s*/, '').replace(/^[A-Za-z0-9]+\s?:\s*/, '').replace(/^1x\s+/i, '').split(/\s+with\s+/i)[0].trim())
    .filter((s) => s && s.length <= 40);
}

/** First sentence, semicolons as commas, at most `max` characters cut at a word. A "Camera:" or model-code label is dropped. */
export function shortNote(cell: string | undefined, max = 120): string | null {
  if (unverified(cell)) return null;
  const s = cell!.replace(/^(Camera|[A-Z0-9]+):\s+/, '').split(/\.\s+(?=[A-Z])/)[0].replace(/;\s*/g, ', ').trim();
  return s.length <= max ? s : s.slice(0, s.lastIndexOf(' ', max - 1)) + '…';
}

/** Specs "Upgradeability" → the seed's "Low · soldered RAM" style. Clauses split on ";", ". " and ",". A part is swappable when some clause names it without a "soldered"-type word. Low needs both parts stated fixed, otherwise null. */
export function repairability(cell: string | undefined): string | null {
  if (unverified(cell)) return null;
  const clauses: string[] = [];
  let bare = '';
  for (const c of cell!.split(/;|\.\s+|,/).map((x) => x.trim()).filter(Boolean)) {
    if (/^(RAM|SSD|memory|storage)$/i.test(c)) bare += c + ', ';
    else { clauses.push(bare + c); bare = ''; }
  }
  const fixed = /soldered|fixed|on-?package|onboard|on board|not upgrad|non-upgrad|not replace/i;
  const state = (part: RegExp) =>
    clauses.some((c) => part.test(c) && !fixed.test(c) && !/unverified/i.test(c)) ? 'yes' : clauses.some((c) => part.test(c) && fixed.test(c)) ? 'no' : 'unknown';
  const ram = state(/\bRAM\b|DIMM|memory/i);
  const ssd = state(/SSD|M\.2|storage/i);
  return ram === 'yes' && ssd === 'yes' ? 'High · RAM and SSD swappable' : ssd === 'yes' ? 'Medium · SSD swappable' : ram === 'yes' ? 'Medium · RAM swappable' : ram === 'no' && ssd === 'no' ? 'Low · soldered RAM and SSD' : null;
}
