// Run: npm run check
import assert from 'node:assert/strict';
import { parseBt, parseChargerW, parseDims, parseKg, parsePorts, parseWh, parseWifi, repairability, shortNote } from './specs.ts';

assert.equal(parseKg('from 0.986 kg (up to 1.006 kg depending on config)'), 0.986);
assert.equal(parseKg('Unverified'), null);
assert.equal(parseKg(undefined), null);
assert.deepEqual(parseDims('312.80 x 214.75 x 8.08/14.37 (front/rear), 16.95 (maximum) mm / 312.80 x 214.75 x 8.38/14.77 (front/rear), 17.95 (maximum) mm'), { w: 312.8, d: 214.75, h: 16.95 });
assert.deepEqual(parseDims('16": 359.7 x 260.3 x 19.9-25.2 mm. 14.5": 327.49 x 250.62 x 17.9-21.29 mm'), { w: 359.7, d: 260.3, h: 25.2 });
assert.deepEqual(parseDims('304.1 x 215 x 11.3 mm'), { w: 304.1, d: 215, h: 11.3 });
assert.equal(parseDims('~356 mm wide x ~26.7 mm thick'), null);
assert.equal(parseWh('57 Wh; 65W adapter (USB-C)'), 57);
assert.equal(parseWh('Up to 10 h (Acer claim). Wh Unverified'), null);
assert.equal(parseChargerW('57 Wh; 65W adapter (USB-C)'), 65);
assert.equal(parseChargerW('53.8 Wh, up to 18 h video. 30 W (8-core GPU) or 35 W dual-port adapter'), 30);
assert.equal(parseChargerW('65 Wh Li-ion, 3-cell. Charger wattage Unverified'), null);
assert.equal(parseWifi('Intel Wi-Fi 6E AX211, 802.11ax 2x2 Wi-Fi + Bluetooth 5.3; Intel Wi-Fi 7 BE201'), '6E');
assert.equal(parseWifi('Unverified'), null);
assert.equal(parseBt('Wi-Fi 6, Bluetooth 5.1 or above'), '5.1');
assert.deepEqual(parsePorts('1x USB-A (USB 5Gbps / USB 3.2 Gen 1); 2x USB-C (Thunderbolt 4 / USB4 40Gbps), with USB PD 15-65W; 1x HDMI 2.1, up to 4K/60Hz; optional: 1x Nano-SIM card slot'),
  ['USB-A', '2x USB-C', 'HDMI 2.1']);
assert.deepEqual(parsePorts('MagSafe 3, 2x Thunderbolt 4 (USB-C, 40 Gb/s), 3.5 mm jack. Up to two external displays'), ['MagSafe 3', '2x Thunderbolt 4', '3.5 mm jack']);
assert.deepEqual(parsePorts('4 USB ports, HDMI, no RJ-45'), ['4 USB ports', 'HDMI']);
assert.deepEqual(parsePorts('16": 2x USB-A 10Gbps (one Always On), HDMI 2.1, power connector. 14.5": same layout'), ['2x USB-A 10Gbps', 'HDMI 2.1', 'power connector']);
assert.deepEqual(parsePorts('Unverified'), []);
assert.equal(shortNote('14"; 1920x1200, 2880x1800; IPS / OLED'), '14", 1920x1200, 2880x1800, IPS / OLED');
assert.equal(shortNote('Camera: FHD 1080p + IR. Fingerprint: in key'), 'FHD 1080p + IR');
assert.equal(shortNote('a '.repeat(80), 20), 'a a a a a a a a a a…');
assert.equal(shortNote('Unverified'), null);
assert.equal(repairability('RAM: soldered, not upgradeable; SSD: one M.2 slot(s), replaceable'), 'Medium · SSD swappable');
assert.equal(repairability('None. RAM, SSD and Wi-Fi are soldered'), 'Low · soldered RAM and SSD');
assert.equal(repairability('RAM (SODIMM), SSD (2 slots), Wi-Fi M.2 card'), 'High · RAM and SSD swappable');
assert.equal(repairability('16": 2 SO-DIMM, 2x SSD, Wi-Fi card. 14.5": 2x SSD, Wi-Fi card, RAM soldered'), 'High · RAM and SSD swappable');
assert.equal(repairability('RAM: Unverified; SSD: one M.2 slot'), 'Medium · SSD swappable');
assert.equal(repairability('Unverified'), null);
console.log('research specs ok');
