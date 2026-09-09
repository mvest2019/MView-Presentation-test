"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MobilePreview } from "./mobile-preview";
import { PortalAvatar } from "./portal-avatar";
import { PortalIcon } from "./portal-icon";
import { PortalLogout } from "./portal-logout";
import { usePortalMember } from "./portal-session";
import { ViewTierSwitch } from "./view-tier-switch";
import { usePortalState } from "./portal-state-provider";
import { accountMenu } from "../_lib/portal-nav";
import { demoOwner } from "../_lib/portal-demo-data";
import { FUNNEL_PLAN } from "../_lib/portal-state";

/**
 * The profile / account area — the top-right avatar and its menu.
 *
 * v41 · AUDIT #35 (Ryan): "sidebar simplified — My Profile, Settings, Billing &
 * Plan and Contact Us moved to the top-right avatar menu where users expect
 * account items." This is that menu, and it is the only place those four live.
 *
 * WHAT IT SHOWS, AND WHAT THE STATE CHANGES:
 *
 *   THE IDENTITY IS THE SIGNED-IN MEMBER'S OWN — their name, their email and
 *   their `profile_pic` if the record carries one. The cookie is read on the
 *   server in `(portal)/layout.tsx` and reaches here through
 *   `usePortalMember()`; see `portal-session.tsx`. It used to be
 *   `demoOwner.name` / `demoOwner.initials`, i.e. the fictional persona, for
 *   everyone.
 *
 *   THE OWNER RECORD BESIDE IT IS STILL DEMO DATA, and that is not an oversight.
 *   The member is not the record: "Suzie Smith" was the account and "SMITH,
 *   RAYMOND E" is the mineral owner record it claimed, and this menu has always
 *   printed both because they are two different things. The member half is real
 *   now; the record half still comes from `portal-demo-data.ts` and is still
 *   disclosed as fictional on every portal screen, because no claimed-record
 *   read exists yet. See that file's header — it is the one module to swap when
 *   the record is wired.
 *
 *   SIGNED OUT, THE DEMO PERSONA IS THE FALLBACK. The portal is not an auth
 *   boundary (see `(portal)/layout.tsx`), so it is reachable with no session at
 *   all, and a design review of it must still show a populated account menu.
 *   With no member the head reads as it always did and the Log out row becomes
 *   Sign in — there is no session to end.
 *
 *   In the UNCLAIMED state the identity goes generic — "Your account", initials
 *   "Me" — because that state must never show a real owner name anywhere. That
 *   rule is about the RECORD, so it now applies to the record line and to the
 *   demo fallback; a signed-in member's own name is theirs to see in either
 *   state. The fictional sample owner remains the only persona on screen (v24 ·
 *   #1).
 *
 *   The plan line is `FUNNEL_PLAN`, so it reads Free · no claim yet / Free ·
 *   record claimed / Premium trial · 4 days left / Free · trial ended / Premium
 *   plan. Those are the plan names — Free, Premium trial, Premium.
 *
 *   The default-view picker sits at the foot, under its own heading. Density is
 *   a preference, not an account action, which is why it is below a divider
 *   rather than in the list.
 *
 *   LOG OUT IS LAST, under its own divider. Bottom of the menu and visually
 *   separated is where every portal puts it, and it is the one destructive item
 *   here — putting it in the list between Settings and Billing is how it gets
 *   hit by accident. It is `PortalLogout`, which calls the SAME `signOutAction`
 *   the marketing header calls; nothing about the auth flow is re-implemented.
 *
 * A CLICK MENU, NOT A HOVER PANEL. Same reasoning the marketing header's
 * `AccountMenu` records: on a touch screen there is no hover to open it with,
 * and the items here are account-level. Escape closes it, an outside click
 * closes it, and the trigger's `aria-expanded` tracks it.
 */
export function PortalProfileMenu() {
  const { funnelState } = usePortalState();
  const member = usePortalMember();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  /* Inside the mobile preview's own iframe, hide the control that opened it —
     otherwise the preview offers a preview of the preview. See `MobilePreview`. */
  const inPreview = useSearchParams().get("preview") === "1";

  const unclaimed = funnelState === "unclaimed";

  /* The member when there is one, the demo persona when there is not — and the
     unclaimed state's generic identity only applies to the fallback, because
     that is the branch with no real person behind it. */
  const name = member?.name ?? (unclaimed ? "Your account" : demoOwner.name);
  const initials =
    member?.initials ?? (unclaimed ? "Me" : demoOwner.initials);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="v41-avwrap" ref={wrap}>
      <button
        type="button"
        /* `.avatar` unchanged — the design's 32px green circle, 40px below
           767px. `.v41-avbtn` adds only what a tile holding a photograph needs
           and a tile holding two letters does not: `overflow: hidden` and a
           padding reset. See `portal.css` §2. */
        className="avatar v41-avbtn"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name} — open account menu`}
        title={`${name} — account menu`}
      >
        <PortalAvatar
          image={member?.image ?? null}
          initials={initials}
          className="v41-avfill"
        />
      </button>

      <div
        className={`v41-avmenu ${open ? "open" : ""}`}
        role="menu"
        aria-label="Account menu"
      >
        {/* The head is a row now — the picture beside the name — because an
            account menu whose avatar is a photograph should show that
            photograph at a size you can recognise, not only as the 32px
            trigger. Two letters look right in the same slot. */}
        <div className="v41-avhead">
          <PortalAvatar
            image={member?.image ?? null}
            initials={initials}
            className="avatar v41-avbig"
          />
          <div className="v41-avwho">
            <strong>{name}</strong>
            {/* The real address, when there is a session. `break-words`
                because an email can be longer than the 280px panel and would
                otherwise widen it — the same call the marketing header's
                account menu makes. */}
            {member?.email && (
              <span className="tiny muted v41-avmail">{member.email}</span>
            )}
            {/* The plan AND the owner record on one line, as the design has it.
                While unclaimed there is no record to name, so the line is the
                plan alone rather than a placeholder. */}
            <span className="tiny muted">
              {FUNNEL_PLAN[funnelState]}
              {unclaimed ? "" : ` · ${demoOwner.record}`}
            </span>
          </div>
        </div>

        {accountMenu.map((item) =>
          item.href ? (
            <Link
              key={item.navKey}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <PortalIcon name={item.icon} />
              {item.label}
            </Link>
          ) : (
            // Same rule as the sidebar: no link into a module that is not
            // built. `menuitem` with `aria-disabled` keeps the menu's shape and
            // tells a screen reader the row is inert.
            <span
              key={item.navKey}
              role="menuitem"
              aria-disabled="true"
              className="flex items-center gap-[9px] rounded-[9px] px-[10px] py-[9px] text-[13.5px] font-semibold text-mv-sublabel"
              title={`${item.label} — not open yet`}
            >
              <PortalIcon name={item.icon} />
              {item.label}
              <span className="ml-auto text-[11px] font-bold">Soon</span>
            </span>
          ),
        )}

        <div className="v41-avsec">
          Your default view
          {/* Settings is unbuilt, so this is a plain note rather than the
              design's "change in Settings →" link into a 404. */}
          <span className="tiny font-normal text-mv-sublabel">
            Settings — soon
          </span>
        </div>
        <ViewTierSwitch onNavigate={() => setOpen(false)} />

        {!inPreview && (
          <div className="v41-avsec border-t border-mv-line">
            <MobilePreview onOpen={() => setOpen(false)} />
          </div>
        )}

        {/* LAST, AND BEHIND ITS OWN RULE. With no session there is nothing to
            end, so the slot offers the way in instead — a menu that offers Log
            out to someone who is not logged in is worse than one that offers
            nothing. */}
        <div className="v41-avfoot">
          {member ? (
            <PortalLogout onDone={() => setOpen(false)} />
          ) : (
            <Link
              href="/login"
              role="menuitem"
              className="v41-logout v41-logout-in"
              onClick={() => setOpen(false)}
            >
              <PortalIcon name="logout" />
              Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
