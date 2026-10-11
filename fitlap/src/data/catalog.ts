import type { Catalog, Laptop } from '@shared/catalog';
import raw from './generated/catalog.json';

// The catalog baked into this build by scripts/fetch-catalog.mjs (spec §1).
export const CATALOG = raw as unknown as Catalog;
export const LAPTOPS: Laptop[] = CATALOG.laptops;
