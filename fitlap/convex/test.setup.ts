/// <reference types="vite/client" />
// Function modules for convex-test. Two dots in the name, so the Convex bundler skips this file.
// Vite 8's import.meta.glob has no extglob, so multi-dot files (tests, .d.ts) go out by a negative pattern.
export const modules = import.meta.glob(['./**/*.*s', '!./**/*.*.*s']);
