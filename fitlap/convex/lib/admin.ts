/** Every admin function calls this first. Prod has no ADMIN_KEY, so every call fails there. */
export function requireAdmin(key: string): void {
  const want = process.env.ADMIN_KEY;
  if (!want || !sameString(key, want)) throw new Error('Not authorized');
}

/** Constant-time string compare (the Convex runtime has no node:crypto). */
function sameString(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) | 0) ^ (b.charCodeAt(i) | 0);
  return diff === 0;
}
