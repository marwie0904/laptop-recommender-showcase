import { afterEach, expect, test, vi } from 'vitest';
import { requireAdmin } from './admin';

afterEach(() => vi.unstubAllEnvs());

test('refuses every key when ADMIN_KEY is unset (prod)', () => {
  vi.stubEnv('ADMIN_KEY', undefined);
  expect(() => requireAdmin('')).toThrow('Not authorized');
  expect(() => requireAdmin('anything')).toThrow('Not authorized');
});

test('refuses a wrong key, including a prefix of the right one', () => {
  vi.stubEnv('ADMIN_KEY', 'test-admin-key');
  expect(() => requireAdmin('test-admin')).toThrow('Not authorized');
  expect(() => requireAdmin('test-admin-key-x')).toThrow('Not authorized');
});

test('accepts the right key', () => {
  vi.stubEnv('ADMIN_KEY', 'test-admin-key');
  expect(() => requireAdmin('test-admin-key')).not.toThrow();
});
