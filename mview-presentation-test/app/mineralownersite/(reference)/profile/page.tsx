import type { Metadata } from "next";

import { getSessionUser } from "@/lib/session";

import Portal from "../../_components/reference/Portal";
import {
  getOwnerPayload,
  type OwnerSelection,
} from "../../_lib/reference/owner-data";
import type { Payload } from "../../_lib/reference/payload";
import "../../reference-flex-reset.css";
import "../../page-gutters.css";

import { IdentityCard } from "./_components/identity-card";
import { IdentityStrip } from "./_components/identity-strip";
import { InvitationsCard } from "./_components/invitations-card";
import { ProfileLive } from "./_components/profile-live";
import { SecurityCard } from "./_components/security-card";
import { ProfileHeader } from "./_components/profile-shell";
import { listSessionsAction } from "./_lib/profile-actions";
import {
  fetchProfile,
  patchProfile,
  profileApiBase,
  type UserProfile,
} from "./_lib/profile-api";
import type { ProfileSession } from "./_lib/profile-data";

/**
 * MY PROFILE — `/mineralownersite/profile`.
 *
 * The destination for the account menu's "My Profile" row, which until now
 * fell through to the `/soon/` placeholder. Built to the settings route's
 * conventions: server components, content in `_lib/profile-data.ts`,
 * presentation in `_components/`, and the portal's shared primitives. See
 * `README.md` for the full map.
 *
 * ── WHAT THIS PAGE OWNS, AND WHAT IT DELIBERATELY DOES NOT ──
 *
 * It owns IDENTITY and SIGN-IN: the name, email, phone and mailing address,
 * and how you get into the account. That is the whole scope (user, asked
 * explicitly).
 *
 * It also carries INVITATIONS & CREDITS below the two cards. The card's
 * balance comes from `_lib/referral-credits.ts` — one module shared with
 * Billing and Invite, so there is exactly one copy to replace when the credits
 * endpoint exists (there is none yet: contract §7). It was briefly removed in
 * the fixture purge and RESTORED on request (user, 2026-09-17: keep the UI) —
 * the balance is the one knowingly-fixture figure on the route, and the map
 * entry in `profile-data.ts` says so where the next reader will look.
 *
 * It does NOT carry your owner records, your plan or your capacity, and their
 * absence is a decision rather than an omission:
 *   · the active owner record and the 7-day switch stay in Settings' Account
 *     card, which is also where the unclaimed state swaps;
 *   · plan and capacity belong to "Billing & Plan", its own account-menu row,
 *     and summarising them here would put a second, staler answer on screen
 *     next to that page's real one.
 * The page head links to Settings so a reader who came looking for either is
 * told where to go in one glance.
 *
 * ── THE IDENTITY FORM MOVED HERE; SETTINGS KEEPS A POINTER ──
 *
 * `settings/_components/profile-card.tsx` used to hold this form and is now a
 * card that names the four fields and links here. There is exactly ONE
 * definition of them, in `_lib/profile-data.ts`. Do not add a second copy to
 * Settings to save the reader a click: two forms writing the same four fields
 * is the drift this codebase's content modules exist to prevent, and it is a
 * decision that was taken deliberately (user, 2026-09-14).
 *
 * ── NOTHING HERE IS WIRED ──
 *
 * No component on this route carries `"use client"` and the page ships no
 * JavaScript of its own. The form does not submit, the two-factor switch does
 * not flip, and the sign-out buttons do nothing. Every one is a real input or
 * `<button>` with the right role and ARIA state, so wiring is a handler each.
 *
 * ── WHY `pageRoot` IS HERE ──
 *
 * `gates("pageRoot")` puts `.mv-dash-routes` on the wrapper, which is what
 * `portal.css` selects for the portal's density and claim-state rules. This
 * page has no gated sections of its own — identity and sign-in are the same at
 * every tier and in both claim states, which is why there is no `nc-swap`
 * panel and no `tier-*` card. It still carries the root class so the page sits
 * in the same layout context as its siblings.
 *
 * ── IT WEARS THE REFERENCE SHELL, WHICH IS WHY IT MOVED GROUPS ──
 *
 * This page was under `(portal)`, whose layout stacks its own white top bar, a
 * pinned value bar and a funnel bar. Alerts, the Dashboard, Activities, Invite
 * and Billing all wear `Chrome` instead — the reference build's single dark bar
 * carrying the account state, the spot prices and the avatar. Two shells over
 * one URL space meant the sidebar led to two different-looking products
 * depending on which row you pressed.
 *
 * A shell is not a per-page setting, so the page came to the shell rather than
 * the shell to the page — the same move Invite made, for the same reason and by
 * the same mechanism. The folder changed route GROUP only: `(portal)` and
 * `(reference)` are both invisible to the router, so the URL is unchanged.
 *
 * ── THE GATE CLASSES SURVIVED THE MOVE UNTOUCHED ──
 *
 * `gates()` writes `tier-s`, `tier-p`, `hide-s`, `nc-only` and friends, and
 * those were `portal.css`'s. `dashboard-reference.css` defines the same set with
 * the same semantics under its own root — `.mv-ref-app:not(.view-simple)
 * .tier-s` against `.mv-portal:not(.view-simple) .tier-s` — and `Portal` writes
 * `view-*` and `no-claim` onto that root exactly as `PortalShell` did onto
 * its own. So every density and claim gate on this page keeps working and not
 * one component needed editing.
 *
 * ── EXCEPT THE PAGE ROOT, WHICH HAD TO BECOME A ROUTE SECTION ──
 *
 * The one rule that differs is the unclaimed SWAP and the Ultra collapse:
 *
 *   portal.css   `.mv-portal.no-claim .mv-dash-routes:has(> .nc-swap) > :not(.nc-only)`
 *   reference    `.mv-ref-app.no-claim section[data-route].active:has(> .nc-swap) > :not(.nc-only)`
 *
 * The reference's version selects children of a route `<section>`, which is
 * exactly the trap `InviteView` documents: a page that brings its own view
 * through `children` is never inside one, so the rule would match nothing and
 * fail SILENTLY. The page root is that section now, so both rules resolve.
 *
 * ── THE OWNER PAYLOAD IS FOR THE CHROME, NOT FOR THIS PAGE ──
 *
 * Nothing here reads `initial`. It is loaded because the SHELL reads it — the
 * value in the bar, the owner picker and the sidebar foot all come off that one
 * snapshot. `Portal` skips its "no owner is loaded yet" card precisely when a
 * page brought its own view, so a failed read costs the bar its figures and
 * nothing else.
 *
 * `force-dynamic` for the reason every page in this group sets it: the owner
 * comes off the query string, so there is nothing correct to cache.
 */
export const metadata: Metadata = {
  title: "My profile",
  description:
    "Your name, how we reach you, and how you sign in — with the devices currently signed in to your account.",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const one = (k: string): string | undefined => {
    const v = q[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sel: OwnerSelection = {
    owner: one("owner") ?? null,
    num: one("num") ?? null,
    dist: one("dist") ?? null,
    year: one("year") ? Number(one("year")) : null,
  };

  let initial: Payload | null = null;
  try {
    initial = await getOwnerPayload(sel);
  } catch {
    /* Only the chrome reads this — see the note above. */
    initial = null;
  }

  /*
   * `GET /users/me` — THE WHOLE SCREEN'S DATA, fetched here and handed down.
   *
   * The member id comes off the session cookie, the ONE place this app knows
   * who is reading — the same identity rule `member-api.ts` records at length.
   *
   * NULL MEANS "COULD NOT BE READ", AND NOTHING PRETENDS OTHERWISE. There is
   * no fixture fallback anywhere on this route (user, 2026-09-17). A failed or
   * unconfigured read falls back to the SESSION COOKIE — the reader's own name
   * and email, stored at sign-in — for the strip and the form's boxes, so a
   * signed-in reader still sees and edits THEIR values (user, 2026-09-17:
   * "if user login then take their info"); the first save patches them onto
   * the record. Only the password control stays disabled, because gating it
   * needs `password.set` and only the API can say that. A page that answered
   * an outage with Suzie Smith's fixture was presenting invented values as the
   * reader's account, and does not come back.
   *
   * A FAILED read is null rather than a thrown page: the shell and the head
   * still stand, and the reason is logged where server fetches are visible —
   * the terminal.
   */
  let profile: UserProfile | null = null;
  const user = await getSessionUser();
  const base = profileApiBase();
  const sessionName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
    : "";
  if (user && base) {
    try {
      profile = await fetchProfile(base, user.id);
    } catch (e) {
      console.error(
        `[profile] GET /users/me failed for member ${user.id}:`,
        e instanceof Error ? e.message : e,
      );
    }

    /*
     * AUTO-SEED FROM THE LOGIN, WHEN THE RECORD IS BLANKER THAN THE SESSION.
     *
     * The sign-in flow already knows the member's name — it is in the session
     * cookie — but a backend record can predate the profile module and carry
     * no `full_name` at all. Rather than greeting a signed-in reader with an
     * empty name box for a name we are holding, the page PATCHes the session's
     * name onto the record once, here, and renders the response like any other
     * save. Only `full_name`, and only when the record has NONE: a stored name
     * always wins over the cookie's copy, the email has its own OTP-gated
     * endpoint, and the session holds nothing else to seed. Best-effort — a
     * refusal is logged and the page renders what the GET said.
     */
    if (profile && !profile.full_name?.trim() && sessionName) {
      try {
        profile = (await patchProfile(base, user.id, { full_name: sessionName }))
          .profile;
      } catch (e) {
        console.error(
          `[profile] auto-seeding full_name for member ${user.id} failed:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  /**
   * THE SIGNED-IN DEVICES, READ HERE RATHER THAN IN THE CARD.
   *
   * `SecurityCard` is a client component and could fetch them on mount, but it
   * should not: that costs the reader a second round trip after the page has
   * painted, flashes a loading line into a panel three rows tall, and — the
   * reason it is not merely a preference — this repo's React Compiler lint
   * refuses `setState` inside an effect, which is what fetch-on-mount is.
   *
   * So the list arrives with the page, like `profile` above and for the same
   * reasons. The card still re-reads after every sign-out, through a server
   * action, which is an event handler rather than an effect.
   *
   * A FAILED read is a message, not a thrown page and NOT an empty list. "No
   * other devices are signed in" is a security claim, and making it when we
   * could not look is the one wrong answer on this panel that could matter —
   * it is precisely the reassurance a member checking for an intruder must not
   * be given falsely.
   */
  let sessions: ProfileSession[] = [];
  let sessionsError: string | null = null;
  if (user && base) {
    const result = await listSessionsAction();
    if (result.ok) {
      sessions = result.sessions;
    } else {
      sessionsError = result.message;
      console.error(
        `[profile] GET /users/me/sessions failed for member ${user.id}:`,
        result.message,
      );
    }
  }

  /* the session cookie's name and email — the reader's real record, never a
     fixture. The strip shows it when the GET failed, and the form seeds its
     boxes from it so a signed-in reader edits THEIR values, not blanks; the
     first save then patches them onto the record. */
  const fallbackIdentity = user
    ? { name: sessionName, email: user.email }
    : null;

  /* the session's picture from sign-in (already sanitised on read) — the
     strip prefers the live profile's own `profile_pic` and falls back to
     this. Null is the "not uploaded" case: the first name's letter shows. */
  const sessionPhoto = user?.profileImage ?? null;

  return (
    /*
      NO `mv-wide-gutters` ANY MORE — the profile left the wide-gutter set
      (user, 2026-09-18: "on side too much space"). The class added
      clamp(36px, 7vw, 120px) a side on top of the shell's 1360px column, and
      on a ~1900px screen the two stacked into ~390px of emptiness either side
      of the cards. The page now wears the shell's own gutters
      (clamp(18px, 2.6vw, 42px)) — the same measure the Dashboard reads at —
      which the two-column grid spends comfortably. Invite, Billing and
      Settings keep their wide gutters; see `page-gutters.css`.
    */
    <Portal route={null} initial={initial}>
      <section data-route="app-profile" className="active">
        <ProfileHeader />

        {/* ONE LIVE PROFILE for the strip and both cards: seeded with the GET,
            updated by each write's own response, so a save is visible the same
            tick instead of after a whole-route refresh — see profile-live.tsx */}
        <ProfileLive initial={profile}>
          <IdentityStrip fallback={fallbackIdentity} sessionPhoto={sessionPhoto} />

        {/*
          TWO COLUMNS THAT END TOGETHER. This grid carried `items-start`, on the
          argument that a stretched card "ends its content in a field of white".
          MEASURED at 1500px, the cost of avoiding that white was worse than the
          white: identity ran 687px and security 950px, so the row left a 263px
          notch of page background under the left column before the invitations
          card — a ragged hole three quarters the height of a card, which is what
          the eye reads first on this page.

          So the row stretches now, and the left card SPENDS the height rather
          than padding with it: `IdentityCard` is a flex column whose save row is
          pinned to the bottom edge, which is where a form's action belongs on a
          full-height panel anyway. The white is gone because the space is used.

          The settings grid keeps `items-start` on purpose — its columns hold
          four and five independent cards, so there is no single card to grow and
          a stretched LAST card in each column would be exactly the field of
          white the old note warned about.

          IDENTITY LEFT, SECURITY RIGHT — and one column below 1024px in that
          order, so the form a reader came here to fill in is first on a phone
          rather than below the device list. Stretch is inert there: one item to
          a row has nothing to match.
        */}
          <div className="grid grid-cols-1 gap-[18px] min-[1024px]:grid-cols-2">
            <IdentityCard profile={profile} seed={fallbackIdentity} />
            <SecurityCard
              password={profile?.password ?? null}
              sessions={sessions}
              sessionsError={sessionsError}
            />
          </div>
        </ProfileLive>

        {/*
          FULL WIDTH AND BELOW THE TWO, not a third column and not squeezed
          beside them. It is the one card on this page the reader can ACT on
          without filling in a form, so it wants the width for its balance and
          its two exits — and it goes last because identity and sign-in are what
          a reader opens "My profile" to do.
        */}
        <div className="mt-[18px]">
          <InvitationsCard />
        </div>
      </section>
    </Portal>
  );
}
