// Run: npm run check
import assert from 'node:assert/strict';
import { usedDiscountPct } from './price.ts';

assert.equal(usedDiscountPct(100_000, 70_000), 30);
assert.equal(usedDiscountPct(40_000, 45_000), null, 'a used price above SRP shows no discount');
assert.equal(usedDiscountPct(50_000, 50_000), null, 'no discount, no badge');
console.log('price ok');
