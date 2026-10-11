// Run: npm run check
import assert from 'node:assert/strict';
import { fmtDate, newPriceLabel, priceAge, priceCheckedAt, priceLine, usedDiscountPct, usedEstimateLine } from './price.ts';

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
console.log('price ok');
