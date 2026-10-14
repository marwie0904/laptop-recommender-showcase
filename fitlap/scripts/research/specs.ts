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
  const m = unverified(cell) ? null : cell!.match(/Bluetooth\s?(\d(?:\.\d)?)/i);
  return m ? m[1] : null;
}

/** Short port labels: semicolon lists split on ";" (commas there are details), others on ","; parentheses, size labels ("16\":"), "1x" and optional or missing ports dropped. */
export function parsePorts(cell: string | undefined): string[] {
  if (unverified(cell)) return [];
  const text = noParens(cell!).split(/\.\s+(?=[A-Z0-9])/)[0];
  const items = text.includes(';') ? text.split(';').map((s) => s.split(',')[0]) : text.split(',');
  return items.map((s) => s.trim().replace(/^[\d.]+":\s*/, '').replace(/^1x\s+/i, '')).filter((s) => s && !/^(optional|no)\b/i.test(s));
}

/** First sentence, semicolons as commas, at most `max` characters cut at a word. A "Camera:" or model-code label is dropped. */
export function shortNote(cell: string | undefined, max = 120): string | null {
  if (unverified(cell)) return null;
  const s = cell!.replace(/^(Camera|[A-Z0-9]+):\s+/, '').split(/\.\s+(?=[A-Z])/)[0].replace(/;\s*/g, ', ').trim();
  return s.length <= max ? s : s.slice(0, s.lastIndexOf(' ', max - 1)) + '…';
}

/** Specs "Upgradeability" → the seed's "Low · soldered RAM" style. A part is swappable when some clause names it without "soldered". */
export function repairability(cell: string | undefined): string | null {
  if (unverified(cell)) return null;
  const clauses = cell!.split(/[;.]\s*/);
  const swappable = (part: RegExp) => clauses.some((c) => part.test(c) && !/soldered|not upgrad|non-upgrad|not replace|unverified/i.test(c));
  const ram = swappable(/\bRAM\b|DIMM|memory/i);
  const ssd = swappable(/SSD|M\.2|storage/i);
  return ram && ssd ? 'High · RAM and SSD swappable' : ssd ? 'Medium · SSD swappable' : ram ? 'Medium · RAM swappable' : 'Low · soldered RAM and SSD';
}
