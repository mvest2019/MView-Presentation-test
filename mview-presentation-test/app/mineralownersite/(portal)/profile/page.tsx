import type { Metadata } from "next";

import { gates } from "../../_components/ui/portal-gating";
import { IdentityCard } from "./_components/identity-card";
import { IdentityStrip } from "./_components/identity-strip";
import { InvitationsCard } from "./_components/invitations-card";
import { SecurityCard } from "./_components/security-card";
import { ProfileHeader } from "./_components/profile-shell";

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
 * It also carries INVITATIONS & CREDITS, which looks like an exception to the
 * rule below and is not. A plan belongs to the account; a referral credit is
 * earned by this PERSON, by writing to a co-owner they know, and the balance is
 * the one figure on the billing page that is a consequence of something the
 * reader did rather than something they bought. The card shows the balance, the
 * rule and two links — no price, no term, no renewal arithmetic — and every
 * figure in it comes from `_lib/referral-credits.ts`, which Billing reads too.
 * One source, so there is no second answer to go stale. See
 * `_components/invitations-card.tsx`.
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
 */
export const metadata: Metadata = {
  title: "My profile",
  description:
    "Your name, how we reach you, and how you sign in — with the devices currently signed in to your account.",
};

export default function ProfilePage() {
  return (
    <div className={gates("pageRoot")}>
      <ProfileHeader />

      <IdentityStrip />

      {/*
        TWO COLUMNS, AND `items-start` IS LOAD-BEARING. Grid items stretch to
        the tallest row by default, so without it the shorter card grows to
        match the taller one and ends its content in a field of white. Same
        reason the settings grid carries it.

        IDENTITY LEFT, SECURITY RIGHT — and one column below 1024px in that
        order, so the form a reader came here to fill in is first on a phone
        rather than below the device list.
      */}
      <div className="grid grid-cols-1 items-start gap-[18px] min-[1024px]:grid-cols-2">
        <IdentityCard />
        <SecurityCard />
      </div>

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
    </div>
  );
}
