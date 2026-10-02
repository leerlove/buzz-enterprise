/**
 * Product info shown in Settings → Product info.
 *
 * This fork ships from a tree that is not the upstream release it was cut
 * from, so "which build am I running?" needs four facts, not one version
 * number: the app version, the upstream release this fork baselines on, the
 * fork commit the binary was built from, and when it was built. The last two
 * are injected by Vite `define` at build time (`scripts/build-info.mjs`) —
 * a checked-in literal would be wrong the moment anyone rebuilt.
 *
 * Every value degrades to `UNKNOWN_VALUE` rather than being omitted or
 * guessed: a build stamp that quietly disappears is indistinguishable from a
 * correct one, and a bug report needs to be able to say "it said unknown".
 */

/**
 * Upstream release this fork is baselined on. A deliberate, human-maintained
 * fact — bump it when the fork re-baselines onto a newer upstream tag. It is
 * not derivable from the build tree: the fork carries upstream's version
 * number in `package.json`, so reading that back would report the fork as
 * upstream even after it has diverged.
 */
export const UPSTREAM_BASELINE_TAG = "desktop-v0.5.23";

/** Rendered wherever a provenance value could not be resolved. */
export const UNKNOWN_VALUE = "unknown";

// Mirrors the build-time guard in `scripts/build-info.mjs`. Validating again
// here keeps a malformed `define` (hand-set env var, bad packaging script)
// from being presented as a commit the user could go look up.
const SHORT_COMMIT_PATTERN = /^[0-9a-f]{7,12}$/;

// The build stamp is a provenance identifier, not a conversational date, so it
// is pinned to UTC rather than the viewer's zone — two people comparing builds
// in a bug thread must read the same string for the same binary.
const BUILD_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export type ProductInfoValues = {
  /** Raw app version, e.g. `0.5.23`. `null` while still loading, or on failure. */
  appVersion: string | null;
  /** Short fork commit injected at build time; `""` when unavailable. */
  forkCommit: string;
  /** ISO 8601 build timestamp injected at build time; `""` when unavailable. */
  builtAt: string;
};

export type ProductInfoRow = {
  /** Stable id, also used for the row's `data-testid`. */
  id: "version" | "upstream-tag" | "fork-commit" | "built-at";
  label: string;
  value: string;
  /** Hashes read as strings of characters, not words — render them monospaced. */
  monospace: boolean;
};

/**
 * Read the Vite-injected build constants.
 *
 * `typeof` is load-bearing: outside a Vite build (unit tests, plain node) the
 * identifiers are never declared, and a bare read would throw a ReferenceError
 * at module scope.
 */
export function readBuildConstants(): {
  forkCommit: string;
  builtAt: string;
} {
  return {
    forkCommit:
      typeof __BUZZ_FORK_COMMIT__ === "string" ? __BUZZ_FORK_COMMIT__ : "",
    builtAt: typeof __BUZZ_BUILD_TIME__ === "string" ? __BUZZ_BUILD_TIME__ : "",
  };
}

/** `0.5.23` → `v0.5.23`; anything missing → `unknown`. */
export function formatAppVersion(version: string | null): string {
  const trimmed = version?.trim() ?? "";
  if (!trimmed) return UNKNOWN_VALUE;
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

/** Short commit hash, or `unknown` when absent or not a hash. */
export function formatForkCommit(commit: string): string {
  const trimmed = commit.trim().toLowerCase();
  return SHORT_COMMIT_PATTERN.test(trimmed) ? trimmed : UNKNOWN_VALUE;
}

/** ISO 8601 → `Sep 22, 2026, 2:03 PM UTC`; unparseable → `unknown`. */
export function formatBuildTime(builtAt: string): string {
  const trimmed = builtAt.trim();
  if (!trimmed) return UNKNOWN_VALUE;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return UNKNOWN_VALUE;
  return `${BUILD_TIME_FORMATTER.format(date)} UTC`;
}

/**
 * The four rows the Product info card renders, in display order.
 */
export function productInfoRows({
  appVersion,
  forkCommit,
  builtAt,
}: ProductInfoValues): ProductInfoRow[] {
  return [
    {
      id: "version",
      label: "App version",
      value: formatAppVersion(appVersion),
      monospace: false,
    },
    {
      id: "upstream-tag",
      label: "Upstream baseline",
      value: UPSTREAM_BASELINE_TAG,
      monospace: true,
    },
    {
      id: "fork-commit",
      label: "Fork commit",
      value: formatForkCommit(forkCommit),
      monospace: true,
    },
    {
      id: "built-at",
      label: "Built",
      value: formatBuildTime(builtAt),
      monospace: false,
    },
  ];
}
