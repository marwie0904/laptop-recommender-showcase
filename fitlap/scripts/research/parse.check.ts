// Run: npm run check
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fmList, inScope, parseResearch } from './parse.ts';

const fixture = (name: string) => parseResearch(name, fs.readFileSync(new URL(`./fixtures/${name}.md`, import.meta.url), 'utf8'));

assert.deepEqual(fmList('[carbon fiber, magnesium alloy, aluminium]'), ['carbon fiber', 'magnesium alloy', 'aluminium']);
assert.deepEqual(fmList('[14.5, 16.0]'), ['14.5', '16.0']);
assert.deepEqual(fmList('1.75'), ['1.75']);
assert.deepEqual(fmList('null'), []);
assert.deepEqual(fmList(undefined), []);

const x1 = fixture('thinkpad-x1-carbon-gen-13-aura-edition-2025');
assert.equal(x1.slug, 'thinkpad-x1-carbon-gen-13-aura-edition-2025');
assert.equal(x1.fm.brand, 'Lenovo');
assert.equal(x1.fm.year, '2025');
assert.equal(x1.fm.category, '[business, ultrabook]');
assert.match(x1.intro, /^The ThinkPad X1 Carbon Gen 13 Aura Edition is Lenovo's 2025 flagship/);
assert.equal(x1.configs.length, 16);
assert.deepEqual(x1.configs[0], {
  cpu: 'Core Ultra 7 258V', cores: '8C (4P+4LPE) / 8T', gpu: 'Intel Arc Graphics',
  ram: '32 GB LPDDR5X-8533MT/s (Memory on Package)', storage: '1 TB SSD M.2 2280 PCIe Gen5 Performance TLC Opal',
  display: '14" 2.8K (2880 x 1800), OLED', price: '₱181,690 (Lenovo PH store, 21NS00P3PH)',
});
assert.equal(x1.specs.Battery, '57 Wh; 65W adapter (USB-C); USB-C charging: yes');
assert.equal(Object.keys(x1.specs).length, 16);
assert.equal(x1.dealbreakers, 'integrated graphics only; not for serious gaming or GPU rendering.');
assert.equal(x1.sources.length, 6);
assert.deepEqual(x1.sources[1], { title: 'Lenovo PH store', url: 'https://www.lenovo.com/ph/en/p/laptops/thinkpad/thinkpadx1/thinkpad-x1-carbon-gen-13-aura-edition-14-inch-intel/21ns00p3ph' });

// The "GPU (TGP)" header still maps to gpu; a frontmatter # comment is stripped.
const legion = fixture('legion-slim-5-gen-8-2023');
assert.equal(legion.configs[0].gpu, 'RTX 4060 8GB (125 W)');
assert.equal(legion.fm.weight_kg, '1.75');
// "- Dealbreakers:" without bold.
assert.match(fixture('macbook-air-13-m4-2025').dealbreakers, /^base 256 GB fills fast/);

assert.equal(inScope(x1), true);
assert.equal(inScope({ ...x1, fm: { ...x1.fm, year: '2021' } }), false, 'before 2022');
assert.equal(inScope({ ...x1, fm: { ...x1.fm, ph_price_new_php: 'null' } }), false, 'no PH price');
console.log('research parse ok');
