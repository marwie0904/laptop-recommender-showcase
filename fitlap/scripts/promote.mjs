// Copies laptops (and their configs, price history and photo) between deployments, then rebuilds the site.
// Usage: node scripts/promote.mjs <slug…> [--from dev] [--to prod]. "local" means the .env.local deployment.
// The deploy hook runs only for --to prod. Push any shared/hardware.ts change to main first: the rebuild builds main.
import { execFileSync } from 'node:child_process';

// `npm run promote x --to local` hands --from/--to to npm, not to this script, which would then default to dev → prod.
if (process.env.npm_config_from || process.env.npm_config_to) {
  console.error('use: npm run promote -- <slug…> [--from dev] [--to prod]');
  process.exit(1);
}

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  if (i < 0) return dflt;
  const [, value] = args.splice(i, 2);
  return value;
};
const from = opt('--from', 'dev');
const to = opt('--to', 'prod');
const slugs = args;
if (!slugs.length) throw new Error('usage: node scripts/promote.mjs <slug…> [--from dev] [--to prod]');

const run = (dep, fn, a) => {
  const target = dep === 'local' ? [] : ['--deployment', dep];
  const out = execFileSync('npx', ['convex', 'run', ...target, fn, JSON.stringify(a)], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024,
  }).trim();
  return out ? JSON.parse(out) : null;
};

for (const { laptop, configs, observations, photo } of run(from, 'admin/promote:read', { slugs })) {
  const { photoUploadedAt } = run(to, 'admin/promote:upsert', { laptop, configs, observations });
  let copied = false;
  if (photo && photo.uploadedAt !== photoUploadedAt) {
    run(to, 'admin/promote:copyPhoto', { slug: laptop.slug, ...photo });
    copied = true;
  }
  console.log(`promote: ${laptop.slug} ${from} → ${to}${copied ? ' (photo copied)' : ''}`);
}

if (to === 'prod') {
  try { process.loadEnvFile('.env.local'); } catch { /* no .env.local: no hook */ }
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (hook) console.log(`promote: deploy hook ${(await fetch(hook, { method: 'POST' })).status}`);
  else console.warn('promote: VERCEL_DEPLOY_HOOK_URL is not set, so the site was not rebuilt');
}
