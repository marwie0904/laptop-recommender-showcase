import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// Schema v1, catalog tables only (spec §2, PLAN §4). Drafts, price history and admin auth come in Phases 1–2.
// The export's return type is checked against shared/catalog.ts, so a drift between the two fails tsc.

const num = v.number();
const str = v.string();

const hours = v.object({ video: num, web: num, coding: num, office: num, editing: num, gaming: num });
const buildScores = { materials: num, rigidity: num, hinge: num, keyboard: num, trackpad: num, thermals: num };
const buildNotes = v.object({ materials: str, rigidity: str, hinge: str, keyboard: str, trackpad: str, thermals: str });
const specNotes = v.object({ cpu: str, gpu: str, ram: str, storage: str, display: str, ports: str, wireless: str, webcam: str, os: str, size: str });

export default defineSchema({
  laptops: defineTable({
    slug: str, brand: str, model: str, family: str, year: num,
    status: v.union(v.literal('draft'), v.literal('published'), v.literal('archived')),
    metal: v.boolean(), twoInOne: v.boolean(),
    os: str, weightKg: num, dims: v.object({ w: num, d: num, h: num }), sizeIn: num,
    ports: v.object({ left: v.array(str), right: v.array(str) }),
    wireless: v.object({ wifi: v.union(v.literal('5'), v.literal('6'), v.literal('6E'), v.literal('7')), bt: str }),
    webcam: str,
    battery: v.object({ wh: num, chargerW: num, fastChargeMin: num, unpluggedPerf: str, hoursByUse: hours }),
    build: v.object({ overall: num, ...buildScores, notes: buildNotes, chassis: str, repairability: str, warrantyYears: num }),
    specNotes, summary: str, weakness: str,
    visual: v.object({
      archetype: v.union(
        v.literal('wedge'), v.literal('notch'), v.literal('pro'), v.literal('chin'), v.literal('business'), v.literal('convertible'),
        v.literal('gamingThick'), v.literal('gamingSlim'), v.literal('creator'), v.literal('budget'), v.literal('detachable'), v.literal('workstation'),
      ),
    }),
    photo: v.optional(v.object({
      storageId: v.id('_storage'), storageIdSmall: v.id('_storage'), width: num, height: num,
      credit: str, sourceUrl: str, license: str, uploadedAt: str,
    })),
    sources: v.array(v.object({ field: str, url: str, title: str, seenAt: str })),
    approvedBy: v.optional(str), approvedAt: v.optional(num),
  }).index('by_slug', ['slug']).index('by_status', ['status']),

  configs: defineTable({
    laptopId: v.id('laptops'), code: str, label: str, color: str,
    cpu: v.object({ name: str, cores: num, score: num }),
    gpu: v.object({ name: str, vramGb: v.optional(num), score: num }),
    ramGb: num, storageGb: num,
    display: v.object({
      resolution: v.object({ w: num, h: num }), refreshHz: num, nits: num,
      panel: v.union(v.literal('miniled'), v.literal('oled'), v.literal('ips')), touch: v.boolean(),
    }),
    hw: v.object({
      cpuBrand: v.union(v.literal('Apple'), v.literal('Intel'), v.literal('AMD'), v.literal('Qualcomm')), cpuFamily: str,
      gpuBrand: v.union(v.literal('Apple'), v.literal('Intel'), v.literal('NVIDIA'), v.literal('AMD'), v.literal('Qualcomm')), gpuFamily: str,
    }),
    usedOnly: v.boolean(),
    price: v.object({
      srpPhp: v.optional(num), srpSource: v.optional(str), srpSeenAt: v.optional(str),
      usedPhp: v.optional(num), usedKind: v.optional(v.union(v.literal('estimate'), v.literal('avg30d'))),
      usedSource: v.optional(str), usedSeenAt: v.optional(str),
    }),
  }).index('by_laptop', ['laptopId']).index('by_code', ['code']),
});
