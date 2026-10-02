/// <reference types="vite/client" />

/**
 * Build provenance injected by Vite `define` (see `scripts/build-info.mjs`).
 * Empty string when the value could not be resolved at build time; outside a
 * Vite build (unit tests, node) the identifier is not defined at all, so every
 * read must go through `typeof` — `readBuildConstants` in
 * `features/settings/lib/productInfo.ts` is the single place that does.
 */
declare const __BUZZ_FORK_COMMIT__: string;
declare const __BUZZ_BUILD_TIME__: string;
