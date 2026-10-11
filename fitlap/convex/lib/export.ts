import type { WithoutSystemFields } from 'convex/server';
import type { Catalog, Config, Laptop, LaptopDetails } from '../../shared/catalog';
import type { Doc } from '../_generated/dataModel';

// Convex docs ↔ the build's catalog.json / details.json (spec §2). Pure, with type-only imports,
// so src/data/seed/seed.check.ts runs it with plain node.

export type LaptopFields = WithoutSystemFields<Doc<'laptops'>>;
export type ConfigFields = Omit<WithoutSystemFields<Doc<'configs'>>, 'laptopId'>;
export interface PhotoUrls { url: string; urlSmall: string }

/** One published laptop as the build ships it: facts for catalog.json, the rest for details.json. */
export function exportLaptop(l: LaptopFields, configs: ConfigFields[], photo: PhotoUrls | null): { laptop: Laptop; details: LaptopDetails } {
  const { overall, ...build } = l.build;
  const { hoursByUse, ...battery } = l.battery;
  const details: LaptopDetails = {
    build, specNotes: l.specNotes, summary: l.summary, weakness: l.weakness, battery,
    bt: l.wireless.bt, webcam: l.webcam,
    sources: l.sources.map(({ field, url, title }) => ({ field, url, title })),
  };
  if (l.photo && photo) details.photo = { ...photo, width: l.photo.width, height: l.photo.height, credit: l.photo.credit };
  return {
    laptop: {
      slug: l.slug, brand: l.brand, model: l.model, year: l.year, sizeIn: l.sizeIn, weightKg: l.weightKg, dims: l.dims,
      archetype: l.visual.archetype, metal: l.metal, twoInOne: l.twoInOne, os: l.os, ports: l.ports, wifi: l.wireless.wifi,
      buildOverall: overall, hoursByUse,
      configs: configs.map((c): Config => ({
        code: c.code, label: c.label, color: c.color, cpu: c.cpu, gpu: c.gpu, hw: c.hw,
        ramGb: c.ramGb, storageGb: c.storageGb, display: c.display, usedOnly: c.usedOnly, price: c.price,
      })),
    },
    details,
  };
}

/** Landing stats: laptop count, distinct source URLs, newest price date. */
export function catalogStats(laptops: Laptop[], details: Record<string, LaptopDetails>): Catalog['stats'] {
  const sources = new Set(Object.values(details).flatMap((d) => d.sources.map((s) => s.url)));
  const dates = laptops.flatMap((l) => l.configs.flatMap((c) => [c.price.srpSeenAt, c.price.usedSeenAt])).filter((d): d is string => !!d);
  return { laptops: laptops.length, sources: sources.size, latestPriceCheck: dates.sort().at(-1) ?? '' };
}

/** The seed files as Convex docs, for devSeed:load. The inverse of exportLaptop. Photos aren't seeded. */
export function seedDocs(catalog: Catalog, details: Record<string, LaptopDetails>): { laptop: LaptopFields; configs: ConfigFields[] }[] {
  return catalog.laptops.map((l) => {
    const d = details[l.slug];
    return {
      laptop: {
        // ponytail: the seed has no family, so it reuses the model name. Real drafts set it.
        slug: l.slug, brand: l.brand, model: l.model, family: l.model, year: l.year, status: 'published',
        metal: l.metal, twoInOne: l.twoInOne, os: l.os, weightKg: l.weightKg, dims: l.dims, sizeIn: l.sizeIn, ports: l.ports,
        wireless: { wifi: l.wifi, bt: d.bt }, webcam: d.webcam,
        battery: { ...d.battery, hoursByUse: l.hoursByUse },
        build: { overall: l.buildOverall, ...d.build },
        specNotes: d.specNotes, summary: d.summary, weakness: d.weakness,
        visual: { archetype: l.archetype },
        sources: d.sources.map((s) => ({ ...s, seenAt: catalog.stats.latestPriceCheck })),
      },
      configs: l.configs,
    };
  });
}
