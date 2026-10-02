import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build-time provenance for the desktop app's Product info settings section.
 *
 * The fork commit and build timestamp are resolved here and handed to Vite's
 * `define`, so the shipped bundle carries the identity of the tree it was
 * built from instead of a checked-in literal that silently goes stale.
 *
 * Both values accept an env override first (packaging pipelines build from a
 * tarball or a detached worktree where `git` is unavailable or points at the
 * wrong tree); git is only the fallback. When neither yields a usable value the
 * resolver returns an empty string and the UI renders "unknown" — a visibly
 * degraded build stamp, never a fabricated one.
 */

/** Pins the fork commit, e.g. `BUZZ_FORK_COMMIT=00209076c`. */
export const FORK_COMMIT_ENV = "BUZZ_FORK_COMMIT";
/** Pins the build timestamp as an ISO 8601 string (reproducible builds). */
export const BUILD_TIME_ENV = "BUZZ_BUILD_TIME";

/** Characters kept when abbreviating a commit hash for display. */
export const SHORT_COMMIT_LENGTH = 9;

// A commit hash is lowercase hex. Anything else (a branch name, `HEAD`, a git
// error string that leaked into the env var) is not a commit and must not be
// presented as one.
const COMMIT_PATTERN = /^[0-9a-f]{7,40}$/;

/**
 * Reduce a candidate commit to its short display form, or `""` if it is not a
 * commit hash. Accepts full hashes so an override may pass `git rev-parse HEAD`.
 *
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeCommit(value) {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!COMMIT_PATTERN.test(trimmed)) return "";
  return trimmed.slice(0, SHORT_COMMIT_LENGTH);
}

/**
 * Normalize a candidate build timestamp to ISO 8601, or `""` if unparseable.
 *
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeTimestamp(value) {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

/**
 * Best-effort `git rev-parse --short HEAD` against the repo this file lives in.
 * A missing git binary, a non-repo checkout, and an empty repo are all ordinary
 * build environments, not errors — they degrade to `""` (rendered "unknown").
 *
 * @returns {string}
 */
export function readGitCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: path.dirname(fileURLToPath(import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/**
 * Read the build clock without letting an invalid `Date` throw out of the
 * config load — an unusable clock degrades to `""` like every other
 * unavailable input.
 *
 * @param {() => Date} now
 * @returns {string}
 */
function isoFromClock(now) {
  const value = now();
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : "";
}

/**
 * Resolve the provenance pair injected into the bundle.
 *
 * @param {object} [options]
 * @param {Record<string, string | undefined>} [options.env] Environment to read overrides from.
 * @param {() => string} [options.gitCommit] Commit probe, injected for tests.
 * @param {() => Date} [options.now] Clock, injected for tests.
 * @returns {{ commit: string, builtAt: string }} Both are display-ready or `""`
 *   when unavailable; `commit` is short-form and `builtAt` is ISO 8601.
 */
export function resolveBuildInfo({
  env = process.env,
  gitCommit = readGitCommit,
  now = () => new Date(),
} = {}) {
  const commit =
    normalizeCommit(env[FORK_COMMIT_ENV]) || normalizeCommit(gitCommit());
  const builtAt =
    normalizeTimestamp(env[BUILD_TIME_ENV]) ||
    normalizeTimestamp(isoFromClock(now));
  return { commit, builtAt };
}
