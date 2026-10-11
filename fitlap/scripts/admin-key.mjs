// Sets a new ADMIN_KEY on the .env.local deployment (dev) and prints it once for /admin. Run it yourself.
// Running it again replaces the key; paste the new one into /admin.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const key = randomBytes(32).toString('hex');
execFileSync('npx', ['convex', 'env', 'set', 'ADMIN_KEY', key], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`ADMIN_KEY is set on your dev deployment. Paste it into /admin once:\n\n${key}\n`);
