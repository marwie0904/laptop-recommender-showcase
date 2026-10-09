import type { Catalog, Laptop } from '@shared/catalog';
import raw from './seed/catalog.json';

// The catalog the app ships with. Seed data until the build export exists (spec §1).
export const CATALOG = raw as unknown as Catalog;
export const LAPTOPS: Laptop[] = CATALOG.laptops;
