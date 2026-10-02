import { expect, test } from "@playwright/test";

import { waitForAnimations } from "../helpers/animations";
import { installMockBridge } from "../helpers/bridge";
import { openSettings } from "../helpers/settings";

const OUTDIR = "test-results/product-info-settings";

test.beforeEach(async ({ page }) => {
  await installMockBridge(page);
  await page.goto("/");
  await openSettings(page, "product-info");
});

test("capture: product info settings", async ({ page }) => {
  const panel = page.getByTestId("settings-panel-product-info");

  await expect(page.getByTestId("settings-nav-product-info")).toContainText(
    "Product info",
  );
  await expect(
    page.getByRole("heading", { name: "Product info", exact: true }),
  ).toBeVisible();

  // Every fact keeps its row whether or not it resolved — an absent row would
  // make an unidentifiable build look like an identified one.
  for (const [id, label] of [
    ["version", "App version"],
    ["upstream-tag", "Upstream baseline"],
    ["fork-commit", "Fork commit"],
    ["built-at", "Built"],
  ] as const) {
    await expect(panel.getByText(label, { exact: true })).toBeVisible();
    await expect(page.getByTestId(`product-info-${id}-value`)).not.toBeEmpty();
  }

  // Sourced from the Tauri shell, not the bundle — proves the row is wired to
  // the running app rather than parked on its "unknown" fallback.
  await expect(page.getByTestId("product-info-version-value")).toHaveText(
    /^v\d+\.\d+\.\d+/,
  );
  await expect(page.getByTestId("product-info-upstream-tag-value")).toHaveText(
    "desktop-v0.5.23",
  );
  // Build-time injection, asserted against the shape rather than a literal:
  // both values change every build, and a hardcoded one would pass forever.
  await expect(page.getByTestId("product-info-fork-commit-value")).toHaveText(
    /^[0-9a-f]{7,12}$/,
  );
  await expect(page.getByTestId("product-info-built-at-value")).toHaveText(
    /^\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s?(?:AM|PM) UTC$/,
  );

  await waitForAnimations(page);
  await panel.screenshot({ path: `${OUTDIR}/01-product-info-settings.png` });
});
