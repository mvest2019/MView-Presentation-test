"use client";

import { PortalButton, type PortalButtonSize } from "../../_components/ui/button";
import { settingsMeta } from "../_lib/settings-data";
import { useSettingsState } from "./settings-state";

/**
 * "★ USE RECOMMENDED SETTINGS"  (v36 · #11)
 *
 * One press turns on the alerts that protect an owner's money — possible
 * payment gaps, new production on their own leases, and permits or completions
 * nearby — across both cards that carry them.
 *
 * IT DOES NOT TOUCH MARKETING EMAIL OR THE GROUP DIGEST, and that restraint is
 * the reason the button is trustworthy. A "recommended" button that also opts
 * the reader into marketing is a dark pattern wearing a helpful label, and it
 * would poison the one control on the page that asks for blind trust. The rows
 * it covers are the `recommended` flag in `settings-data.ts`, where they can be
 * read at a glance.
 *
 * The `title` says out loud what will happen, so the reader can find that out
 * before pressing rather than after.
 *
 * RENDERED TWICE — in the page head and in the Ultra card, which is the whole
 * reason the state it changes lives in a provider.
 */
export function RecommendedSettingsButton({
  size = "sm",
}: {
  size?: PortalButtonSize;
}) {
  const { applyRecommended } = useSettingsState();

  return (
    <PortalButton
      variant="primary"
      size={size}
      title={settingsMeta.recommendedTitle}
      onClick={applyRecommended}
    >
      {settingsMeta.recommendedLabel}
    </PortalButton>
  );
}
