import { defineSchema, defineTable } from 'convex/server';
import { v, type Infer } from 'convex/values';

// Schema v2: catalog tables plus drafts and price history. The export's return type is checked against
// shared/catalog.ts, so a drift between the two fails tsc. Field groups are exported for drafts:submit and promote.

const num = v.number();
const str = v.string();

const hours = v.object({ video: num, web: num, coding: num, office: num, editing: num, gaming: num });
const buildScores = { materials: num, rigidity: num, hinge: num, keyboard: num, trackpad: num, thermals: num };
const buildNotes = v.object({ materials: str, rigidity: str, hinge: str, keyboard: str, trackpad: str, thermals: str });
const specNotes = v.object({ cpu: str, gpu: str, ram: str, storage: str, display: str, ports: str, wireless: str, webcam: str, os: str, size: str });

export const source = v.object({ field: str, url: str, title: str, seenAt: str });
export const price = v.object({
  srpPhp: v.optional(num), srpSource: v.optional(str), srpSeenAt: v.optional(str),
  usedPhp: v.optional(num), usedKind: v.optional(v.union(v.literal('estimate'), v.literal('avg30d'))),
  usedSource: v.optional(str), usedSeenAt: v.optional(str),
});
export const photo = v.object({
  storageId: v.id('_storage'), storageIdSmall: v.id('_storage'), width: num, height: num,
  credit: str, sourceUrl: str, license: str, uploadedAt: str,
});
export const laptopStatus = v.union(v.literal('draft'), v.literal('published'), v.literal('archived'));

/** Laptop fields a draft carries: everything but status, photo and approval. */
export const draftLaptopFields = {
  slug: str, brand: str, model: str, family: str, year: num,
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
  sources: v.array(source),
};

/** Config fields a draft carries: everything but laptopId. */
export const draftConfigFields = {
  code: str, label: str, color: str,
  cpu: v.object({ name: str, cores: num, score: num }),
  gpu: v.object({ name: str, vramGb: v.optional(num), tgpW: v.optional(num), score: num }),
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
  price,
};

export const observationFields = {
  code: str, kind: v.union(v.literal('srp'), v.literal('used')),
  source: v.union(v.literal('ai_draft'), v.literal('admin')),
  sourceName: str, amountPhp: num, observedAt: str, approvedAt: num,
};

export const fullDraft = v.object({
  kind: v.literal('full'), laptop: v.object(draftLaptopFields), configs: v.array(v.object(draftConfigFields)), flags: v.array(str),
});
export const priceDraft = v.object({
  kind: v.literal('priceOnly'), slug: str, prices: v.array(v.object({ code: str, price })), sources: v.array(source), flags: v.array(str),
});
export const draftPayload = v.union(fullDraft, priceDraft);
export const draftInput = v.object({ modelName: str, urls: v.array(str), researchFile: v.optional(str) });

export type FullDraft = Infer<typeof fullDraft>;
export type PriceDraft = Infer<typeof priceDraft>;
export type DraftPayload = Infer<typeof draftPayload>;

export default defineSchema({
  laptops: defineTable({
    ...draftLaptopFields, status: laptopStatus, photo: v.optional(photo), approvedBy: v.optional(str), approvedAt: v.optional(num),
  }).index('by_slug', ['slug']).index('by_status', ['status']),

  configs: defineTable({ laptopId: v.id('laptops'), ...draftConfigFields })
    .index('by_laptop', ['laptopId']).index('by_code', ['code']),

  aiDrafts: defineTable({
    slug: str, status: v.union(v.literal('ready'), v.literal('approved'), v.literal('rejected')),
    input: draftInput, draft: draftPayload, flags: v.array(str), submittedAt: num, decidedAt: v.optional(num),
  }).index('by_status', ['status']).index('by_slug', ['slug']),

  priceObservations: defineTable(observationFields).index('by_code', ['code']),
});
