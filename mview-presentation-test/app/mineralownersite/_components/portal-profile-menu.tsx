"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MobilePreview } from "./mobile-preview";
import { PortalIcon } from "./portal-icon";
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
 *   The head carries the member's name over their plan and their owner RECORD —
 *   "Suzie Smith / Premium plan · SMITH, RAYMOND E". Those are two different
 *   things and the design prints both, because the member is not the record.
 *
 *   In the UNCLAIMED state the identity goes generic — "Your account", initials
 *   "Me" — because that state must never show a real owner name anywhere. The
 *   fictional sample owner is then the only persona on screen (v24 · #1).
 *
 *   The plan line is `FUNNEL_PLAN`, so it reads Free · no claim yet / Free ·
 *   record claimed / Premium trial · 4 days left / Free · trial ended / Premium
 *   plan. Those are the plan names — Free, Premium trial, Premium.
 *
 *   The default-view picker sits at the foot, under its own heading. Density is
 *   a preference, not an account action, which is why it is below a divider
 *   rather than in the list.
 *
 * A CLICK MENU, NOT A HOVER PANEL. Same reasoning the marketing header's
 * `AccountMenu` records: on a touch screen there is no hover to open it with,
 * and the items here are account-level. Escape closes it, an outside click
 * closes it, and the trigger's `aria-expanded` tracks it.
 */
export function PortalProfileMenu() {
  const { funnelState } = usePortalState();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  /* Inside the mobile preview's own iframe, hide the control that opened it —
     otherwise the preview offers a preview of the preview. See `MobilePreview`. */
  const inPreview = useSearchParams().get("preview") === "1";

  const unclaimed = funnelState === "unclaimed";
  const name = unclaimed ? "Your account" : demoOwner.name;
  const initials = unclaimed ? "Me" : demoOwner.initials;

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
        className="avatar"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name} — open account menu`}
        title={`${name} — account menu`}
      >
        {initials}
      </button>

      <div
        className={`v41-avmenu ${open ? "open" : ""}`}
        role="menu"
        aria-label="Account menu"
      >
        <div className="v41-avhead">
          <strong>{name}</strong>
          {/* The plan AND the owner record on one line, as the design has it.
              While unclaimed there is no record to name, so the line is the
              plan alone rather than a placeholder. */}
          <span className="tiny muted">
            {FUNNEL_PLAN[funnelState]}
            {unclaimed ? "" : ` · ${demoOwner.record}`}
          </span>
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
      </div>
    </div>
  );
}
