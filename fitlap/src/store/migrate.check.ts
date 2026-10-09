// Run: npm run check
import assert from 'node:assert/strict';
import { migratePersisted } from './migrate.ts';

const v0 = { brief: { budgetMin: 600, budgetMax: 1800 }, selectedId: 'macbook-pro-14-m4', compareIds: ['xps'] };
assert.deepEqual(migratePersisted(v0, 0), { brief: undefined, selectedId: 'macbook-pro-14-m4', compareIds: ['xps'] }, 'a v0 (USD) brief is dropped; picks survive');
assert.equal(migratePersisted(v0, 1), v0, 'the current version passes through');
assert.deepEqual(migratePersisted(undefined, 0), { brief: undefined }, 'nothing stored');
console.log('migrate ok');
