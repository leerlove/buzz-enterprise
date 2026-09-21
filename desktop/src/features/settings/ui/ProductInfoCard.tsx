import * as React from "react";
import { getVersion } from "@tauri-apps/api/app";

import { cn } from "@/shared/lib/cn";
import {
  productInfoRows,
  readBuildConstants,
  UNKNOWN_VALUE,
} from "../lib/productInfo";
import { SettingsOptionGroup, SettingsOptionRow } from "./SettingsOptionGroup";
import { SettingsSectionHeader } from "./SettingsSectionHeader";

/**
 * Read the app version from Tauri. Resolves to `null` outside the desktop
 * shell (browser dev server, E2E harness) or when the plugin call rejects, so
 * the row renders "unknown" instead of leaving a rejected promise unhandled.
 */
function useAppVersion(): string | null {
  const [version, setVersion] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    getVersion()
      .then((value) => {
        if (active) setVersion(value);
      })
      .catch(() => {
        if (active) setVersion(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return version;
}

/**
 * Settings → Product info: which build of this fork is actually running.
 *
 * Read-only text; the values themselves come from `lib/productInfo`, which
 * owns the build-constant reads and the "unknown" fallbacks.
 */
export function ProductInfoCard() {
  const appVersion = useAppVersion();
  // The build constants are frozen into the bundle, so read them once.
  const buildConstants = React.useMemo(() => readBuildConstants(), []);
  const rows = productInfoRows({
    appVersion,
    builtAt: buildConstants.builtAt,
    forkCommit: buildConstants.forkCommit,
  });

  return (
    <section className="min-w-0" data-testid="settings-product-info">
      <SettingsSectionHeader
        title="Product info"
        description="The build of Buzz you're running, and the upstream release it's based on."
      />

      <SettingsOptionGroup title="Build">
        {rows.map((row) => (
          <SettingsOptionRow
            data-testid={`product-info-${row.id}`}
            key={row.id}
          >
            <p className="min-w-0 text-sm font-medium">{row.label}</p>
            <p
              className={cn(
                "min-w-0 break-all text-sm text-muted-foreground/70",
                row.monospace && "font-mono",
                row.value === UNKNOWN_VALUE && "italic",
              )}
              data-settings-subcopy
              data-testid={`product-info-${row.id}-value`}
            >
              {row.value}
            </p>
          </SettingsOptionRow>
        ))}
      </SettingsOptionGroup>
    </section>
  );
}
