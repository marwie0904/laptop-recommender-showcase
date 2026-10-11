// Submits a /draft-laptop draft to the .env.local deployment (dev): node scripts/submit-draft.mjs drafts/<slug>.json
// The file is { input, draft }. drafts:submit rejects a bad draft with the reasons; fix the file and run again.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('usage: node scripts/submit-draft.mjs drafts/<slug>.json');
const body = JSON.parse(readFileSync(file, 'utf8'));
if (!body.input || !body.draft) throw new Error(`${file}: expected { input, draft }`);
execFileSync('npx', ['convex', 'run', 'admin/drafts:submit', JSON.stringify(body)], { stdio: ['ignore', 'inherit', 'inherit'] });
