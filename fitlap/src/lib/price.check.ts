// Run: npm run check
import assert from 'node:assert/strict';
import { fmtDate, newPriceLabel, priceAge, priceCheckedAt, priceLine, usedDiscountPct, srpSourceLabel, usedEstimateLine } from './price.ts';

assert.equal(usedDiscountPct(100_000, 70_000), 30);
assert.equal(usedDiscountPct(40_000, 45_000), null, 'a used price above SRP shows no discount');
assert.equal(usedDiscountPct(50_000, 50_000), null, 'no discount, no badge');

const P = { srpPhp: 92_990, srpSource: 'Apple PH', srpSeenAt: '2026-10-09', usedPhp: 64_990, usedSource: 'Carousell', usedSeenAt: '2026-10-11' };
assert.equal(priceLine(P), 'SRP ₱92,990 · Used ₱64,990', 'PLAN §10: "New" becomes "SRP"');
assert.equal(newPriceLabel(P), 'SRP ₱92,990');
assert.equal(priceLine({ usedPhp: 30_000 }), 'Used only · ₱30,000');
assert.equal(fmtDate('2026-10-09'), 'Oct 9, 2026');
assert.equal(priceCheckedAt(P), '2026-10-11', 'the newer of the two checks');
assert.equal(priceCheckedAt({}), undefined);
assert.equal(usedEstimateLine(P), 'Used estimate · Carousell · Oct 11, 2026');
assert.equal(usedEstimateLine({ srpPhp: 1 }), 'Used estimate · —');
assert.equal(priceAge('2026-10-01', '2026-10-11'), 'ok');
assert.equal(priceAge('2026-09-10', '2026-10-11'), 'amber', 'over 30 days');
assert.equal(priceAge('2026-08-01', '2026-10-11'), 'red', 'over 60 days');
assert.equal(priceAge('2026-09-11', '2026-10-11'), 'ok', 'exactly 30 days is still ok');
// Source labels (QA 2026-10-17): research notes and SKU codes were shown as the SRP source.
assert.equal(srpSourceLabel('Villman SF514-56T-77B9'), 'Villman');
assert.equal(srpSourceLabel('PC Express sale'), 'PC Express');
assert.equal(srpSourceLabel('DynaQuest listing dated 2022'), 'DynaQuest');
assert.equal(srpSourceLabel('Lenovo PH store'), 'Lenovo PH');
assert.equal(srpSourceLabel('Apple PH from-price for 10-core GPU'), 'Apple PH');
assert.equal(srpSourceLabel('launch "starts at"'), 'Launch price');
assert.equal(srpSourceLabel('PH pre-order price'), 'Launch price');
assert.equal(srpSourceLabel('2025 launch price per NoypiGeeks / Revu PH via web search'), 'Launch price');
assert.equal(srpSourceLabel('Research'), 'Research notes');
assert.equal(srpSourceLabel('Glacier White'), 'Research notes', 'a note is not a source');
assert.equal(srpSourceLabel(undefined), '—');
assert.equal(usedEstimateLine({ usedSource: 'Estimate from SRP and age', usedSeenAt: '2026-10-14' }), 'Used estimate · from SRP and age · Oct 14, 2026');
console.log('price ok');
