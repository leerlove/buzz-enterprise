/**
 * Settings → Product info renders every provenance row, including the ones
 * that could not be resolved.
 *
 * Mutation proof: filter any row out of `productInfoRows`, or make the card
 * skip rows whose value is "unknown", and these go RED — a missing row is the
 * exact failure mode this section exists to prevent (a build you cannot
 * identify looks identical to one you can).
 *
 * Rendered statically, so effects never run and the Tauri `getVersion()` call
 * is not exercised: that is the "outside the desktop shell" shape, where the
 * version row must still be present and read "unknown".
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UNKNOWN_VALUE, UPSTREAM_BASELINE_TAG } from "../lib/productInfo.ts";
import { ProductInfoCard } from "./ProductInfoCard.tsx";

function renderCard() {
  return renderToStaticMarkup(createElement(ProductInfoCard));
}

describe("ProductInfoCard", () => {
  it("labels all four facts", () => {
    const markup = renderCard();

    for (const label of [
      "App version",
      "Upstream baseline",
      "Fork commit",
      "Built",
    ]) {
      assert.ok(markup.includes(label), `missing row label: ${label}`);
    }
  });

  it("exposes a stable test id per row", () => {
    const markup = renderCard();

    for (const id of ["version", "upstream-tag", "fork-commit", "built-at"]) {
      assert.ok(
        markup.includes(`data-testid="product-info-${id}-value"`),
        `missing value test id: ${id}`,
      );
    }
  });

  it("names the upstream release this fork is baselined on", () => {
    assert.ok(renderCard().includes(UPSTREAM_BASELINE_TAG));
  });

  it("renders unresolved provenance as 'unknown' rather than an empty cell", () => {
    // No Vite `define` here, so the commit and build stamp are unavailable —
    // the same shape a build with no git metadata produces.
    const markup = renderCard();
    const unknowns = markup.split(`>${UNKNOWN_VALUE}<`).length - 1;

    assert.equal(unknowns, 3, markup);
  });
});
