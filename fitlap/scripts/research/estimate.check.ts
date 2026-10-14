// Run: npm run check
import assert from 'node:assert/strict';
import * as est from './estimate.ts';

assert.equal(est.chipClass('Apple M4'), 'arm');
assert.equal(est.chipClass('Snapdragon X Plus X1P-42-100'), 'arm');
assert.equal(est.chipClass('Core Ultra 7 258V'), 'low');
assert.equal(est.chipClass('Core i5-1235U'), 'low');
assert.equal(est.chipClass('N150'), 'low');
assert.equal(est.chipClass('Core Ultra 9 275HX'), 'high');
assert.equal(est.chipClass('Ryzen AI 9 HX 370'), 'high');

// web = Wh ÷ draw (5 arm, 7 low, 10 high, +2 with a discrete GPU); the rest are multiples of web; gaming = Wh ÷ 75 or 25.
assert.deepEqual(est.hoursByUse(57, 'low', false), { video: 10, web: 8, coding: 6.5, office: 7.5, editing: 4, gaming: 2.5 });
assert.deepEqual(est.hoursByUse(80, 'high', true), { video: 8, web: 6.5, coding: 5.5, office: 6.5, editing: 3.5, gaming: 1 });
assert.equal(est.hoursByUse(200, 'arm', false).video, 30, 'clamped to 30');
assert.equal(est.hoursByUse(30, 'high', true).gaming, 0.5, 'clamped to 0.5');

assert.equal(est.batteryWh(['gaming', 'mainstream']), 80);
assert.equal(est.batteryWh(['ultrabook', 'mainstream']), 65);
assert.equal(est.batteryWh(['budget', 'mainstream']), 42);
assert.equal(est.batteryWh(['business']), 55);
assert.equal(est.chargerW('low', false), 65);
assert.equal(est.chargerW('high', false), 100);
assert.equal(est.chargerW('high', true), 200);
assert.equal(est.fastChargeMin('arm'), 30);
assert.equal(est.unpluggedPerf('arm', false), 'Same as plugged');
assert.equal(est.unpluggedPerf('low', false), 'Slightly slower');
assert.equal(est.unpluggedPerf('low', true), 'Much slower');
assert.deepEqual([13.3, 14, 15.6, 16, 17.3].map(est.weightKg), [1.3, 1.6, 1.6, 2, 2.4]);
assert.deepEqual(est.dims(14, ['ultrabook']), { w: 322, d: 208, h: 16 });
assert.equal(est.dims(16, ['gaming', 'mainstream']).h, 24);
assert.equal(est.dims(16, ['creator']).h, 22);

assert.equal(est.metalBody(['carbon fiber', 'magnesium alloy', 'aluminium']), true);
assert.equal(est.metalBody(['aluminum lid', 'plastic']), false, 'lid only');
assert.equal(est.metalBody(['carbon-fiber-reinforced plastic']), false);
const b = est.build({ materials: ['aluminium', 'PC-ABS'], cats: ['gaming', 'mainstream'], apple: false, cls: 'high', hMm: 25.2 });
assert.deepEqual(b.scores, { materials: 8, rigidity: 8, hinge: 7, keyboard: 7, trackpad: 6, thermals: 7 });
assert.equal(b.overall, 7);
assert.equal(b.notes.materials, 'Estimated from chassis material (aluminium, PC-ABS)');
assert.equal(b.notes.thermals, 'Estimated from chip class (high) and thickness (25.2 mm)');
assert.deepEqual(est.build({ materials: ['aluminum lid', 'plastic'], cats: ['mainstream'], apple: false, cls: 'high', hMm: 18 }).scores,
  { materials: 6.5, rigidity: 6.5, hinge: 7, keyboard: 6.5, trackpad: 6, thermals: 5.5 });
assert.equal(est.build({ materials: ['Unverified'], cats: ['budget'], apple: false, cls: 'low', hMm: 18 }).scores.materials, 5.5);
assert.deepEqual(est.build({ materials: ['aluminum'], cats: ['ultrabook'], apple: true, cls: 'arm', hMm: 11.3 }).scores,
  { materials: 8, rigidity: 8, hinge: 7, keyboard: 8, trackpad: 9, thermals: 8 });

assert.equal(est.archetype(['workstation', 'business'], 'ZBook', 22), 'workstation');
assert.equal(est.archetype(['2-in-1'], 'Surface Pro 11', 9), 'detachable');
assert.equal(est.archetype(['2-in-1', 'business'], 'Yoga 7i', 17), 'convertible');
assert.equal(est.archetype(['gaming'], 'ROG Strix G16', 25.2), 'gamingThick');
assert.equal(est.archetype(['gaming'], 'Zephyrus G14', 15.9), 'gamingSlim');
assert.equal(est.archetype(['creator'], 'MacBook Pro 14 (M4)', 15.5), 'pro');
assert.equal(est.archetype(['ultrabook'], 'MacBook Air 13-inch (M1)', 16), 'wedge');
assert.equal(est.archetype(['ultrabook'], 'MacBook Air 13-inch (M4)', 11.3), 'notch');
assert.equal(est.archetype(['business', 'ultrabook'], 'ThinkPad X1 Carbon', 17), 'business');
assert.equal(est.archetype(['budget', 'mainstream'], 'Aspire Lite 15', 18), 'budget');
assert.equal(est.archetype(['mainstream', 'ultrabook'], 'Zenbook 14', 15), 'chin');

assert.equal(est.usedClass('Apple', ['ultrabook']), 'mac');
assert.equal(est.usedClass('ASUS', ['gaming', 'creator']), 'gaming');
assert.equal(est.usedClass('Lenovo', ['business']), 'premium');
assert.equal(est.usedClass('Acer', ['budget', 'mainstream']), 'mainstream');
console.log('research estimate ok');
