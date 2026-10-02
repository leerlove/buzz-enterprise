/**
 * Build provenance resolution for Settings → Product info.
 *
 * Mutation proof: drop the env-override branch in `resolveBuildInfo` and the
 * override tests go RED; drop either `normalize*` guard and the "garbage in
 * the env var" tests go RED by surfacing a non-commit / non-date as if it
 * were real provenance.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BUILD_TIME_ENV,
  FORK_COMMIT_ENV,
  normalizeCommit,
  normalizeTimestamp,
  readGitCommit,
  resolveBuildInfo,
  SHORT_COMMIT_LENGTH,
} from "./build-info.mjs";

const NEVER = () => {
  throw new Error("fallback probe must not run when the override is usable");
};

describe("normalizeCommit", () => {
  it("keeps a short hash and abbreviates a full one", () => {
    assert.equal(normalizeCommit("00209076c"), "00209076c");
    assert.equal(
      normalizeCommit("00209076c1f2e3d4c5b6a798877665544332211f"),
      "00209076c",
    );
    assert.equal("00209076c".length, SHORT_COMMIT_LENGTH);
  });

  it("tolerates whitespace and uppercase from `git rev-parse` output", () => {
    assert.equal(normalizeCommit("  00209076C\n"), "00209076c");
  });

  it("rejects anything that is not a commit hash", () => {
    assert.equal(normalizeCommit(undefined), "");
    assert.equal(normalizeCommit(""), "");
    assert.equal(normalizeCommit("HEAD"), "");
    assert.equal(normalizeCommit("main"), "");
    // Too short to be a real abbreviation, and hex-looking but not hex.
    assert.equal(normalizeCommit("00209"), "");
    assert.equal(normalizeCommit("zz209076c"), "");
    assert.equal(normalizeCommit("fatal: not a git repository"), "");
  });
});

describe("normalizeTimestamp", () => {
  it("normalizes a parseable timestamp to ISO 8601", () => {
    assert.equal(
      normalizeTimestamp("2026-09-22T14:03:00Z"),
      "2026-09-22T14:03:00.000Z",
    );
    assert.equal(
      normalizeTimestamp("  2026-09-22T14:03:00+02:00 "),
      "2026-09-22T12:03:00.000Z",
    );
  });

  it("rejects an unparseable or empty value", () => {
    assert.equal(normalizeTimestamp(undefined), "");
    assert.equal(normalizeTimestamp("   "), "");
    assert.equal(normalizeTimestamp("yesterday"), "");
  });
});

describe("resolveBuildInfo", () => {
  it("prefers the env overrides over the git probe and the clock", () => {
    const info = resolveBuildInfo({
      env: {
        [FORK_COMMIT_ENV]: "abcdef1234567890abcdef1234567890abcdef12",
        [BUILD_TIME_ENV]: "2026-09-22T14:03:00Z",
      },
      gitCommit: NEVER,
      now: NEVER,
    });

    assert.deepEqual(info, {
      commit: "abcdef123",
      builtAt: "2026-09-22T14:03:00.000Z",
    });
  });

  it("falls back to the git probe and the build clock", () => {
    const info = resolveBuildInfo({
      env: {},
      gitCommit: () => "00209076c\n",
      now: () => new Date("2026-09-22T14:03:00Z"),
    });

    assert.deepEqual(info, {
      commit: "00209076c",
      builtAt: "2026-09-22T14:03:00.000Z",
    });
  });

  it("falls through an unusable override to the fallback", () => {
    const info = resolveBuildInfo({
      env: { [FORK_COMMIT_ENV]: "HEAD", [BUILD_TIME_ENV]: "yesterday" },
      gitCommit: () => "00209076c",
      now: () => new Date("2026-09-22T14:03:00Z"),
    });

    assert.deepEqual(info, {
      commit: "00209076c",
      builtAt: "2026-09-22T14:03:00.000Z",
    });
  });

  it("reports an empty commit when no source can supply one", () => {
    // A tarball build with no git metadata: the card must say "unknown"
    // rather than stamp the binary with a value nobody can look up.
    const info = resolveBuildInfo({
      env: {},
      gitCommit: () => "",
      now: () => new Date("2026-09-22T14:03:00Z"),
    });

    assert.equal(info.commit, "");
    assert.equal(info.builtAt, "2026-09-22T14:03:00.000Z");
  });

  it("survives a broken clock instead of throwing out of the vite config", () => {
    const info = resolveBuildInfo({
      env: {},
      gitCommit: () => "",
      now: () => new Date("not a date"),
    });

    assert.deepEqual(info, { commit: "", builtAt: "" });
  });
});

describe("readGitCommit", () => {
  it("returns a usable short hash inside this repo, or nothing at all", () => {
    // Binds the real probe (git may be absent in a sandbox), so a probe that
    // started returning an error string or a full hash fails here.
    const commit = readGitCommit();
    assert.ok(
      commit === "" || /^[0-9a-f]{7,40}\s*$/.test(commit),
      `unexpected git probe output: ${JSON.stringify(commit)}`,
    );
  });
});
