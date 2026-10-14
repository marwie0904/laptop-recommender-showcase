// Run: npm run check
import assert from 'node:assert/strict';
import { cleanCpu, cpuHw, parseCores, parseDisplay, parseGb, parseGpu, parsePrice, parseResolution } from './normalize.ts';

// ── CPU ──
assert.equal(cleanCpu('Intel Core i7-13700H (16IRH8)'), 'Core i7-13700H');
assert.equal(cleanCpu('Apple M4 (build-to-order, top)'), 'Apple M4');
assert.equal(cleanCpu('AMD Ryzen 7 6800H/HS (G513RC-HN016W / HN114W)'), 'Ryzen 7 6800H');
assert.equal(cleanCpu('Intel Core i5-1345U / i5-1335U / i5-1334U'), 'Core i5-1345U');
assert.equal(cleanCpu('DC15255: AMD Ryzen 7 7730U'), 'Ryzen 7 7730U');
assert.equal(cleanCpu('Intel 13th-gen up to Core i7-13620H (X1405VA)'), 'Core i7-13620H');
assert.equal(cleanCpu('Snapdragon X Elite (12-core)'), 'Snapdragon X Elite X1E-78-100', 'core count → base SKU');
assert.deepEqual(cpuHw('Core Ultra 7 258V'), { brand: 'Intel', family: 'Core Ultra 7' });
assert.deepEqual(cpuHw('Core Ultra X7 358H'), { brand: 'Intel', family: 'Core Ultra X7' });
assert.deepEqual(cpuHw('Core i3-N305'), { brand: 'Intel', family: 'Core i3' });
assert.deepEqual(cpuHw('Core 5 120U'), { brand: 'Intel', family: 'Core 5' });
assert.deepEqual(cpuHw('Celeron N150'), { brand: 'Intel', family: 'N-series' });
assert.deepEqual(cpuHw('Apple M4 Pro'), { brand: 'Apple', family: 'M4 Pro' });
assert.deepEqual(cpuHw('Apple A18 Pro'), { brand: 'Apple', family: 'A18 Pro' });
assert.deepEqual(cpuHw('Ryzen AI 9 HX 370'), { brand: 'AMD', family: 'Ryzen AI 9' });
assert.deepEqual(cpuHw('Ryzen AI Max+ 395'), { brand: 'AMD', family: 'Ryzen AI Max' });
assert.deepEqual(cpuHw('Ryzen 3 7320U'), { brand: 'AMD', family: 'Ryzen 3' });
assert.deepEqual(cpuHw('Snapdragon X X1-26-100'), { brand: 'Qualcomm', family: 'Snapdragon X' });
assert.deepEqual(cpuHw('Snapdragon X Plus X1P-42-100'), { brand: 'Qualcomm', family: 'Snapdragon X Plus' });
assert.deepEqual(cpuHw('Snapdragon X2 Elite Extreme X2E-94-100'), { brand: 'Qualcomm', family: 'Snapdragon X2 Elite' });
assert.equal(cpuHw('i5/i7 for Business'), null);
assert.equal(parseCores('10C (4P+6E) / 10T'), 10);
assert.equal(parseCores('Unverified'), null);

// ── GPU ──
assert.deepEqual(parseGpu('RTX 5060 8 GB, 115W', 'Core i7-14650HX'), { name: 'RTX 5060', brand: 'NVIDIA', family: 'RTX 5060', discrete: true, vramGb: 8, tgpW: 115 });
assert.deepEqual(parseGpu('RTX 4060 8GB (125 W)', 'Core i5-13500H'), { name: 'RTX 4060', brand: 'NVIDIA', family: 'RTX 4060', discrete: true, vramGb: 8, tgpW: 125 });
assert.deepEqual(parseGpu('RTX 3070 Ti 8 GB, 150W', 'Core i7-12700H'), { name: 'RTX 3070 Ti', brand: 'NVIDIA', family: 'RTX 3070 Ti', discrete: true, vramGb: 8, tgpW: 150 });
assert.deepEqual(parseGpu('NVIDIA RTX PRO 1000 Blackwell 8 GB', 'Core Ultra 7 255H'), { name: 'RTX PRO 1000 Blackwell', brand: 'NVIDIA', family: 'RTX PRO 1000', discrete: true, vramGb: 8 });
assert.deepEqual(parseGpu('10-core GPU', 'Apple M4'), { name: '10-core GPU', brand: 'Apple', family: '10-core', discrete: false });
assert.deepEqual(parseGpu('Intel Arc Graphics', 'Core Ultra 7 258V'), { name: 'Arc Graphics', brand: 'Intel', family: 'Arc', discrete: false }, 'Arc, not generic Intel');
assert.deepEqual(parseGpu('Intel Arc 140V', 'Core Ultra 7 258V'), { name: 'Arc 140V', brand: 'Intel', family: 'Arc 140V', discrete: false });
assert.deepEqual(parseGpu('Intel Graphics', 'Core Ultra 5 225U'), { name: 'Intel Graphics', brand: 'Intel', family: 'Graphics', discrete: false });
assert.deepEqual(parseGpu('Intel Iris Xe; optional MX570', 'Core i5-1235U'), { name: 'Iris Xe', brand: 'Intel', family: 'Iris Xe', discrete: false }, 'optional extras ignored');
assert.deepEqual(parseGpu('Integrated (AMD Radeon 740M / AMD Radeon 780M)', 'Ryzen 5 7640HS'), { name: 'Radeon 740M', brand: 'AMD', family: 'Radeon 740M', discrete: false });
assert.deepEqual(parseGpu('Radeon Graphics', 'Ryzen 7 5700U'), { name: 'Radeon Graphics', brand: 'AMD', family: 'Radeon Graphics', discrete: false });
assert.deepEqual(parseGpu('Qualcomm Adreno', 'Snapdragon X X1-26-100'), { name: 'Adreno X1', brand: 'Qualcomm', family: 'Adreno X1', discrete: false });
assert.equal(parseGpu('Unverified', 'Core i5-1235U'), null);

// ── RAM and storage ──
assert.equal(parseGb('16 GB DDR5-4800 (2x 8 GB)'), 16);
assert.equal(parseGb('1 TB SSD M.2 2280 PCIe Gen5'), 1024);
assert.equal(parseGb('512 GB / 1 TB'), 512);
assert.equal(parseGb('8 or 16 GB DDR4-3200'), 8);
assert.equal(parseGb('8 GB DDR5 (up to 32 GB)'), 8, 'parenthetical "up to" is not a range');
assert.equal(parseGb('8–48 GB DDR5-5600 SODIMM'), null, 'range');
assert.equal(parseGb('up to 16 GB'), null);
assert.equal(parseGb('M.2 PCIe SSD'), null);
assert.equal(parseGb('Unverified'), null);

// ── Display ──
assert.deepEqual(parseResolution('14" 2.8K (2880 x 1800), OLED'), { w: 2880, h: 1800 });
assert.deepEqual(parseResolution('15.6" FHD 144Hz IPS-level'), { w: 1920, h: 1080 });
assert.deepEqual(parseResolution('16" QHD+ 240Hz IPS-level'), { w: 2560, h: 1600 });
assert.deepEqual(parseResolution('14" WUXGA or FHD IPS'), { w: 1920, h: 1200 }, 'first option');
assert.deepEqual(parseResolution('16" UHD+ OLED'), { w: 3840, h: 2400 });
assert.equal(parseResolution('15.3"'), null);
assert.equal(parseResolution('13.8" HDR'), null, 'HDR is not HD');
assert.deepEqual(parseDisplay('16" 2560x1600 OLED 240 Hz'), { refreshHz: 240, nits: 400, nitsEstimated: true, panel: 'oled', touch: false });
assert.deepEqual(parseDisplay('14.2" 3024x1964 mini-LED 120 Hz'), { refreshHz: 120, nits: 1000, nitsEstimated: true, panel: 'miniled', touch: false });
assert.deepEqual(parseDisplay('15.6" FHD IPS 144 Hz 300 nits 62.5% sRGB'), { refreshHz: 144, nits: 300, nitsEstimated: false, panel: 'ips', touch: false });
assert.deepEqual(parseDisplay('13.4" 2560x1600 IPS 120 Hz touch'), { refreshHz: 120, nits: 300, nitsEstimated: true, panel: 'ips', touch: true });
assert.equal(parseDisplay('16" non-touch IPS').touch, false);

// ── Price ──
assert.deepEqual(parsePrice('₱181,690 (Lenovo PH store, 21NS00P3PH)'), { srpPhp: 181690, srpSource: 'Lenovo PH store' });
assert.deepEqual(parsePrice('₱45,999 to ₱47,999 (AL15-41P-R51N, -R16X; PC Express Oct 2026)'), { srpPhp: 45999, srpSource: 'PC Express' });
assert.deepEqual(parsePrice('₱64,990 (launch SRP)'), { srpPhp: 64990, srpSource: 'launch SRP' });
assert.deepEqual(parsePrice('₱89,995 (starting)'), { srpPhp: 89995, srpSource: 'Research' });
assert.deepEqual(parsePrice('₱52,999'), { srpPhp: 52999, srpSource: 'Research' });
assert.equal(parsePrice('Used ₱53,999 (Carousell)'), null);
assert.equal(parsePrice('₱384,900 (US $4,900)'), null);
assert.equal(parsePrice('No PH listing found'), null);
console.log('research normalize ok');
