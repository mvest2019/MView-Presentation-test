"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PortalNavRow } from "./portal-nav-row";
import { PortalSectionList } from "./portal-section-list";
import { primarySlots } from "../_lib/portal-nav";
import { referral } from "../_lib/portal-demo-data";

/**
 * THE SIDEBAR WORDMARK, exactly as the reference build has it.
 *
 * `owner/src/shell/chunk-004.html`:
 *   <img src="https://res.cloudinary.com/mview/image/upload/f_auto/icons/mineralview-logo.png"
 *        style="height:30px;width:auto;display:block;margin:4px 8px 18px" />
 *
 * NOTE WHICH ASSET, because there are two and the difference is the whole point.
 * This is the UNTRANSFORMED `icons/mineralview-logo.png` — `f_auto` and nothing
 * else. The marketing header points at the same file through
 * `e_replace_color:0f1b16:48:ffffff`, which swaps its white for near-black so it
 * can sit on the white bar. The sidebar is `--ink` (#0d0e17), so it wants the
 * original, and that is why the reference asks for no transform here.
 *
 * It is declared locally rather than added to `site-nav.ts`: that module
 * describes the marketing header and footer assets, and the portal is meant to
 * stay isolated from it. 577x132 is the file's real intrinsic size, read off the
 * PNG header — `next/image` needs it for the aspect ratio, and the rendered size
 * comes from the height below.
 */
const SIDEBAR_LOGO = {
  src: "https://res.cloudinary.com/mview/image/upload/f_auto/icons/mineralview-logo.png",
  width: 577,
  height: 132,
} as const;

/**
 * The portal sidebar — the portal's navigation landmark (v38 · P1-13).
 *
 * ORDER, TOP TO BOTTOM, and each part is here for a stated reason:
 *
 *   1  The wordmark, linking back to the public site's home.
 *   2  ONE swapping primary slot — Claim Mineral Owner while unclaimed, Run a
 *      Lease Audit once claimed. Both are in the markup; `portal.css` picks.
 *   3  Three labelled sections: My Minerals · Services · Community.
 *   4  The referral CTA — persistent on purpose, hidden while unclaimed.
 *
 * REMOVED FROM THE RAIL (requested): the line pointing at the account menu
 * (v41 · AUDIT #35), and the demo foot that carried the signed-in name, the plan
 * and the "prototype demo account" note.
 *
 * NEITHER LOSS IS SILENT. The way back to the public site is still the wordmark
 * at the top of this rail, which links to `/`. The fictional-account disclosure
 * still runs on every portal screen through the other three surfaces the design
 * uses for it: the fixed ribbon on desktop, the "Fictional demo" chip in the top
 * bar below 900px, and the drawer's footnote. The plan is still stated by the
 * top bar's plan pill and in the account menu.
 *
 * CLIENT, for one reason only: the active row needs `usePathname`. The markup
 * is otherwise static, and the Dashboard's own content is server-rendered — the
 * expensive half of the page is not in here.
 */
export function PortalSideNav() {
  const pathname = usePathname();

  return (
    <aside className="app-side" role="navigation" aria-label="Portal navigation">
      <Link href="/" aria-label="Mineral View home">
        <Image
          src={SIDEBAR_LOGO.src}
          alt="Mineral View"
          width={SIDEBAR_LOGO.width}
          height={SIDEBAR_LOGO.height}
          /* The reference's four properties and nothing else:
                height:30px · width:auto · display:block · margin:4px 8px 18px
             No plate, no radius, no padding — the earlier white tile existed
             only because this component was pointing at the light-ground
             marketing asset, and with the correct asset the design's own
             treatment is the bare wordmark on the dark rail. */
          /* One arbitrary value mirroring the reference's shorthand verbatim —
             `4px 8px 18px` is top 4, sides 8, bottom 18. Written as three
             separate utilities before, which silently dropped the right margin
             to 0. */
          className="m-[4px_8px_18px] block h-[30px] w-auto"
          priority
        />
      </Link>

      {/* The two swapping slots. Rendering BOTH and letting the state class
          choose is what makes the swap free — no JavaScript, and no chance of
          the wrong one flashing before hydration. */}
      {primarySlots.map((slot) => (
        <PortalNavRow
          key={slot.slotClass}
          item={slot}
          active={false}
          extraClass={slot.slotClass}
        />
      ))}

      <PortalSectionList pathname={pathname} />

      {/* v41 · AUDIT #35 — the forwarding note. A `<p>` and not a nav row on
          purpose: it is a signpost, not a destination. */}
      <p
        className="tiny"
        style={{ margin: "14px 8px 0", color: "#5b6472", lineHeight: 1.45 }}
      >
        Profile, Settings &amp; Billing moved to your account menu ↗
      </p>

      {/* v11 · the persistent referral CTA. `.side-ref` is hidden by
          `portal.css` while unclaimed — there are no co-owners to invite to a
          record nobody has claimed yet. */}
      <div className="side-ref">
        <strong>Invite co-owners — earn renewal credits</strong>
        <span>
          {referral.invited} of {referral.target} co-owners invited
        </span>
        <div className="progress" aria-hidden="true">
          <div
            className="fill"
            style={{ width: `${(referral.invited / referral.target) * 100}%` }}
          />
        </div>
        <span style={{ color: "#9fd7bd" }}>
          {referral.countyProof} are already on Mineral View.
        </span>
        {/* No href: the Invite module is not built yet, so this is a labelled
            non-action rather than a button into nothing. The "— soon" suffix is
            gone with the nav rows' badges (requested); `aria-disabled`, the
            dimming and the absence of an anchor still say it is inert. */}
        <span
          className="btn btn-mint btn-sm btn-block"
          aria-disabled="true"
          style={{ opacity: 0.6, cursor: "default" }}
        >
          Invite co-owners
        </span>
      </div>
    </aside>
  );
}
