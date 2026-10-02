/**
 * Value model behind Settings → Product info.
 *
 * Mutation proof: drop any `UNKNOWN_VALUE` fallback and the "missing" tests go
 * RED (the card would render an empty cell, which reads as a correct build
 * stamp); drop the `typeof` guard in `readBuildConstants` and importing this
 * module outside a Vite build throws a ReferenceError before any test runs.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatAppVersion,
  formatBuildTime,
  formatForkCommit,
  productInfoRows,
  readBuildConstants,
  UNKNOWN_VALUE,
  UPSTREAM_BASELINE_TAG,
} from "./productInfo.ts";

describe("formatAppVersion", () => {
  it("prefixes a bare version and leaves an already-prefixed one alone", () => {
    assert.equal(formatAppVersion("0.5.23"), "v0.5.23");
    assert.equal(formatAppVersion("v0.5.23"), "v0.5.23");
    assert.equal(formatAppVersion(" 0.5.23 "), "v0.5.23");
  });

  it("reports unknown while loading or when the shell can't answer", () => {
    assert.equal(formatAppVersion(null), UNKNOWN_VALUE);
    assert.equal(formatAppVersion(""), UNKNOWN_VALUE);
    assert.equal(formatAppVersion("   "), UNKNOWN_VALUE);
  });
});

describe("formatForkCommit", () => {
  it("renders a short hash as-is", () => {
    assert.equal(formatForkCommit("00209076c"), "00209076c");
    assert.equal(formatForkCommit(" 00209076C "), "00209076c");
  });

  it("reports unknown for an absent or malformed commit", () => {
    assert.equal(formatForkCommit(""), UNKNOWN_VALUE);
    assert.equal(formatForkCommit("HEAD"), UNKNOWN_VALUE);
    assert.equal(formatForkCommit("00209"), UNKNOWN_VALUE);
    // A full hash means the build-time abbreviation was bypassed; the card
    // shows the short form or nothing, never a 40-character wall.
    assert.equal(
      formatForkCommit("00209076c1f2e3d4c5b6a798877665544332211f"),
      UNKNOWN_VALUE,
    );
  });
});

describe("formatBuildTime", () => {
  it("renders the stamp in UTC regardless of the machine's zone", () => {
    assert.equal(
      formatBuildTime("2026-09-22T14:03:00Z"),
      "Sep 22, 2026, 2:03 PM UTC",
    );
    // Same instant, written in another offset — same rendered string.
    assert.equal(
      formatBuildTime("2026-09-22T16:03:00+02:00"),
      "Sep 22, 2026, 2:03 PM UTC",
    );
  });

  it("reports unknown for an absent or unparseable stamp", () => {
    assert.equal(formatBuildTime(""), UNKNOWN_VALUE);
    assert.equal(formatBuildTime("   "), UNKNOWN_VALUE);
    assert.equal(formatBuildTime("yesterday"), UNKNOWN_VALUE);
  });
});

describe("readBuildConstants", () => {
  it("degrades to empty strings when the Vite define never ran", () => {
    // This test file is not bundled, so the globals are undeclared — the same
    // shape a non-Vite consumer sees. A bare read would have thrown.
    assert.deepEqual(readBuildConstants(), { forkCommit: "", builtAt: "" });
  });
});

describe("productInfoRows", () => {
  it("lists version, upstream baseline, fork commit, and build time in order", () => {
    const rows = productInfoRows({
      appVersion: "0.5.23",
      forkCommit: "00209076c",
      builtAt: "2026-09-22T14:03:00Z",
    });

    assert.deepEqual(
      rows.map(({ id, label, value }) => ({ id, label, value })),
      [
        { id: "version", label: "App version", value: "v0.5.23" },
        {
          id: "upstream-tag",
          label: "Upstream baseline",
          value: UPSTREAM_BASELINE_TAG,
        },
        { id: "fork-commit", label: "Fork commit", value: "00209076c" },
        { id: "built-at", label: "Built", value: "Sep 22, 2026, 2:03 PM UTC" },
      ],
    );
  });

  it("names the upstream release this fork is baselined on", () => {
    assert.equal(UPSTREAM_BASELINE_TAG, "desktop-v0.5.23");
  });

  it("keeps all four rows when provenance is missing", () => {
    const rows = productInfoRows({
      appVersion: null,
      forkCommit: "",
      builtAt: "",
    });

    assert.deepEqual(
      rows.map(({ id, value }) => [id, value]),
      [
        ["version", UNKNOWN_VALUE],
        ["upstream-tag", UPSTREAM_BASELINE_TAG],
        ["fork-commit", UNKNOWN_VALUE],
        ["built-at", UNKNOWN_VALUE],
      ],
    );
  });

  it("marks the identifier rows as monospaced", () => {
    const rows = productInfoRows({
      appVersion: "0.5.23",
      forkCommit: "00209076c",
      builtAt: "2026-09-22T14:03:00Z",
    });
    const monospaced = rows.filter((row) => row.monospace).map((row) => row.id);

    assert.deepEqual(monospaced, ["upstream-tag", "fork-commit"]);
  });
});
