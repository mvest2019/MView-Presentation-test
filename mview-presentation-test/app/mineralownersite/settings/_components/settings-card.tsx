import type { ReactNode } from "react";

import { PortalButton, type PortalButtonSize } from "../../_components/ui/button";
import { Card, CardHeader } from "../../_components/ui/card";
import { settingsMeta, type SettingsSection } from "../_lib/settings-data";

/**
 * "★ USE RECOMMENDED SETTINGS"  (v36 · #11)
 *
 * PRESENTATIONAL. It renders at its real weight and in its real place, and it
 * does nothing yet.
 *
 * ── WHAT IT WILL DO, AND WHY THE `title` ALREADY SAYS SO ──
 *
 * One press turns on the alerts that protect an owner's money — possible
 * payment gaps, new production on their own leases, and permits or completions
 * nearby — across both cards that carry them. It does NOT touch marketing email
 * or the group digest, and that restraint is the reason the button can be
 * trustworthy: a "recommended" button that also opts the reader into marketing
 * is a dark pattern wearing a helpful label. The rows it covers are the
 * `recommended` flag in `settings-data.ts`, ready for the wiring pass.
 *
 * RENDERED TWICE — in the page head and in the Ultra card. That is what will
 * make the state it changes shared rather than local to either card.
 */
export function RecommendedSettingsButton({
  size = "sm",
}: {
  size?: PortalButtonSize;
}) {
  return (
    <PortalButton
      variant="primary"
      size={size}
      title={settingsMeta.recommendedTitle}
    >
      {settingsMeta.recommendedLabel}
    </PortalButton>
  );
}

/**
 * ONE SETTINGS CARD — the surface every section on this page is built on.
 *
 * ── WHY THE PAGE HAS THIS AND THE PROTOTYPE DID NOT ──
 *
 * The reference wrote eleven cards by hand, and they drifted: three carried a
 * green top rule as `style="border-top:3px solid var(--green)"`, one carried a
 * slate one, five had a bare `<h4>` and four had the heading inside a
 * `.between` wrapper so it could hold a chip. The headings themselves were the
 * jump navigation's index — its chips found a card by matching heading text as
 * a substring — so the same string was maintained in two places and a copy edit
 * silently broke the jump.
 *
 * Passing the `SettingsSection` gives the card its heading, its anchor id and
 * its chip label from ONE record. The heading and the chip that scrolls to it
 * can no longer disagree, and neither can the id.
 *
 * ── THE ANCHOR, AND WHY IT NEEDS NO JAVASCRIPT ──
 *
 * The jump chips are ordinary `#fragment` links. The browser does the scrolling
 * and the `target:` variant below draws the design's `.v33-flash` outline on
 * whichever card was jumped to. The prototype ran `scrollIntoView` and a 1600ms
 * class timer to achieve the same thing; as a link it also works with
 * JavaScript off, is back-button-able, and can be copied to point somebody at
 * one setting.
 *
 * The outline PERSISTS rather than flashing, which is a deliberate difference:
 * a reader who lands on a card mid-page benefits from it still being marked
 * when they look up from reading it.
 *
 * `scroll-mt-24` clears the portal's sticky top bar — without it the browser
 * puts the card's top edge exactly where the bar is and the heading lands
 * underneath it.
 */
export function SettingsCard({
  section,
  /** The design's 3px top rule, which marks the cards it wants read. */
  accent,
  /** A chip or a link on the right of the heading row. */
  action,
  /** Density or funnel gates — `gates("hideInEssentials")` and friends. */
  gate,
  /**
   * Set `false` for a card that shares its anchor with another — the two
   * Account cards, where a `SettingsAnchor` owns the id for both. See that
   * component for why.
   */
  anchored = true,
  children,
}: {
  section: SettingsSection;
  accent?: "green" | "slate";
  action?: ReactNode;
  gate?: string;
  anchored?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      id={anchored ? section.id : undefined}
      className={`${
        anchored
          ? "scroll-mt-24 target:outline-2 target:outline-offset-2 target:outline-mv-green"
          : ""
      } ${
        accent === "green"
          ? "border-t-[3px] border-t-mv-green"
          : accent === "slate"
            ? "border-t-[3px] border-t-mv-slate"
            : ""
      } ${gate ?? ""}`.trim()}
    >
      {action ? (
        <CardHeader title={<SettingsHeading>{section.heading}</SettingsHeading>} action={action} />
      ) : (
        <SettingsHeading>{section.heading}</SettingsHeading>
      )}
      {children}
    </Card>
  );
}

/**
 * ONE ANCHOR SHARED BY TWO CARDS THAT SWAP.
 *
 * ── THE DEFECT THIS FIXES, BECAUSE IT IS EASY TO REINTRODUCE ──
 *
 * The Account section is two cards — a claimed one and a free one — and CSS
 * shows exactly one, per `v26 · S3`. Putting `id="settings-account"` on the
 * claimed card meant that for a visitor with NO CLAIM the jump chip pointed at
 * an element with `display: none`. A fragment link to a hidden element does not
 * scroll and does not highlight, so the chip did nothing at all: measured, the
 * hash changed, the page stayed at the top, and the reader was left pressing a
 * button that visibly failed.
 *
 * So the ANCHOR belongs to the section, not to either card. This wrapper owns
 * the id and the arrival outline; whichever card is showing fills it, and the
 * outline draws around the visible one because the hidden card contributes no
 * box. Both states get a working chip and neither duplicates an id.
 *
 * The rule generalises: any section whose card swaps on a gate needs its anchor
 * one level out.
 */
export function SettingsAnchor({
  section,
  children,
}: {
  section: SettingsSection;
  children: ReactNode;
}) {
  return (
    <div
      id={section.id}
      className="scroll-mt-24 target:outline-2 target:outline-offset-2 target:outline-mv-green"
    >
      {children}
    </div>
  );
}

/**
 * The card heading — `portal.css`'s `h4` geometry, 15px/700 and no margin.
 *
 * An `h3` AND NOT THE PROTOTYPE'S `h4`. Its size is what the reference chose
 * and is kept; its LEVEL was not a choice, it was the tag whose stylesheet rule
 * happened to be 15px. The page's own heading is an `<h2>`, so a card one level
 * below it is an `h3` — jumping straight to `h4` leaves a hole in the outline a
 * screen reader navigates the page by. Nothing moves on screen.
 */
function SettingsHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="m-0 text-[15px] leading-[1.35] font-bold">{children}</h3>
  );
}
