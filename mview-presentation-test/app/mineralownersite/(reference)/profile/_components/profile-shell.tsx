import type { ReactNode } from "react";

import { Card, CardHeader } from "../../../_components/ui/card";
import { PortalLink } from "../../../_components/portal-link";
import { profileMeta, type ProfileSection } from "../_lib/profile-data";

/**
 * THE PAGE HEAD, AND THE CARD SHELL EVERY SECTION SITS ON.
 *
 * ── WHY THIS ROUTE HAS ITS OWN SHELL RATHER THAN IMPORTING `SettingsCard` ──
 *
 * `settings/_components/settings-card.tsx` takes a `SettingsSection` and is
 * typed against `SETTINGS_SECTIONS`, so using it here would mean either adding
 * this page's two sections to the settings map — where a jump chip would then
 * try to scroll to a card on another route — or widening its type to a shape
 * that no longer guarantees the settings jump nav can find every section it
 * lists. Both trade a real invariant for saved lines. The shell is eleven lines
 * of composition over the shared `Card`, which is the piece worth sharing, and
 * both routes still get their heading, anchor and id from one record.
 */
/**
 * THE CLASS EVERY TEXT BOX ON THIS ROUTE WEARS.
 *
 * It was written out in `identity-card.tsx` and nowhere else, until the
 * change-password panel needed a second set of boxes that had to look identical
 * to the first. Two copies of a fourteen-utility string is how one of them ends
 * up with a different focus ring six months from now, so it is named once here
 * and imported by both.
 *
 * THE DISABLED STATE IS VISIBLE, not just functional (user, 2026-09-17: "show
 * that it disable"). A disabled box that keeps the white editable look reads
 * as a box that ignores keystrokes — a bug, not a rule. So it drops to the
 * card wash, mutes its text and refuses the cursor, the same vocabulary
 * `PortalButton`'s `:disabled` speaks. The locked email wears this always;
 * every other box only when the whole form is disabled (profile unreadable).
 */
/**
 * A FUNCTION OF `invalid`, NOT A CONSTANT PLUS AN OVERRIDE.
 *
 * The identity form marks the box that refused a save in red (QA, my profile
 * #1), and the obvious way to do it — append `border-mv-required` after this
 * string — DOES NOT RELIABLY WIN. `border-mv-line-strong` and
 * `border-mv-required` are both single-class `border-color` utilities, so they
 * have equal specificity and the winner is whichever Tailwind happens to emit
 * LAST in the stylesheet, not whichever the caller wrote last in the
 * attribute. The same trap catches the two `focus-visible:` colours.
 *
 * So the state picks the colours rather than layering over them, and there is
 * exactly one of each in the output. This is the shape `inputClass(invalid)`
 * in `auth-shell.tsx` already uses for the auth forms, for the same reason.
 */
export function profileInputClass(invalid = false): string {
  return [
    "w-full rounded-[9px] border bg-mv-card px-3 py-[11px] text-sm text-mv-ink outline-none placeholder:text-mv-placeholder focus-visible:outline-2",
    invalid
      ? "border-mv-required focus-visible:border-mv-required focus-visible:outline-mv-required"
      : "border-mv-line-strong focus-visible:border-mv-green focus-visible:outline-mv-green",
    "disabled:cursor-not-allowed disabled:border-mv-line disabled:bg-mv-portal-wash disabled:text-mv-muted",
  ].join(" ");
}

export function ProfileCardShell({
  section,
  action,
  className,
  children,
}: {
  section: ProfileSection;
  /** A link or chip on the right of the heading row. */
  action?: ReactNode;
  /**
   * Extra classes for the card box itself. One caller uses it, for one thing:
   * `IdentityCard` needs `flex flex-col` so its save row can sit on the bottom
   * edge of a stretched card — see the grid note in `page.tsx`. It is a prop
   * rather than a default because the other card is the TALL one and has no
   * spare height to distribute; making every card a flex column would change
   * how three unrelated blocks lay out to serve a case only one of them has.
   */
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      id={section.id}
      /* `scroll-mt-24` clears the portal's sticky top bar; without it the
         browser puts the card's top edge exactly where the bar is and the
         heading lands underneath it. `target:` draws the arrival outline, the
         same treatment settings cards get, so a link to `#profile-security`
         marks what it landed on. */
      className={`scroll-mt-24 target:outline-2 target:outline-offset-2 target:outline-mv-green${
        className ? ` ${className}` : ""
      }`}
    >
      {action ? (
        <CardHeader title={<ProfileHeading>{section.heading}</ProfileHeading>} action={action} />
      ) : (
        <ProfileHeading>{section.heading}</ProfileHeading>
      )}
      {children}
    </Card>
  );
}

/**
 * An `h3` at the settings page's 15px card geometry.
 *
 * The page's own heading is the `h2` below, so a card one level under it is an
 * `h3` — jumping to `h4` would leave a hole in the outline a screen reader
 * navigates by.
 */
function ProfileHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="m-0 text-[15px] leading-[1.35] font-bold">{children}</h3>
  );
}

/**
 * THE PAGE HEAD.
 *
 * It carries a link to Settings, and that is doing a job rather than being
 * decoration: this page deliberately holds only identity and sign-in, so the
 * reader who came looking for delivery, alerts, privacy or their plan needs to
 * be told in one glance where those went. The strapline says it and the link
 * completes it.
 */
export function ProfileHeader() {
  return (
    <div className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold">{profileMeta.title}</h2>
        {/*
          THE MEASURE IS 108ch, NOT 68 (QA, my profile #3).

          68ch is the reading measure for a PARAGRAPH, and this is one
          sentence: it broke across two lines a third of the way into a head
          row that had 1,200px of width standing empty to its right, which
          reads as a wrap the layout did not intend rather than as a measure.
          108ch clears the strapline's own length (~102 characters) with room
          for a longer one, so it sits on one line wherever the row is wide
          enough — and still wraps, rather than overflowing, on a phone.
        */}
        <p className="mt-0.5 max-w-[108ch] text-[13px] leading-[1.5] text-mv-muted">
          {profileMeta.strapline}
        </p>
      </div>
      <p className="shrink-0 text-[13px] font-semibold">
        <PortalLink href="/mineralownersite/settings">
          {profileMeta.settingsLinkText} →
        </PortalLink>
      </p>
    </div>
  );
}
