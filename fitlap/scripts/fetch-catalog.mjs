// prebuild: bakes the published catalog from Convex into src/data/generated/ (spec §1).
// Locally it reads the .env.local deployment; on Vercel, CONVEX_DEPLOY_KEY's. No fallback: a failed read fails the build.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = execFileSync('npx', ['convex', 'run', 'catalog:exportForBuild'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'inherit'],
  maxBuffer: 64 * 1024 * 1024,
});
const { stats, laptops, details } = JSON.parse(out);

if (!laptops.length) throw new Error('fetch-catalog: Convex has no published laptops, refusing to build an empty site');
const bare = laptops.filter((l) => !l.configs.length).map((l) => l.slug);
if (bare.length) throw new Error('fetch-catalog: published laptops with no configs: ' + bare.join(', '));

const dir = new URL('../src/data/generated/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('catalog.json', dir), JSON.stringify({ builtAt: new Date().toISOString(), stats, laptops }));
writeFileSync(new URL('details.json', dir), JSON.stringify(details));
console.log(`fetch-catalog: ${laptops.length} laptops`);
