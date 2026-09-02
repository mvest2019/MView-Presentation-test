import { portalCopy, type PortalCopyKey } from "../../_lib/portal-copy";

/**
 * ONE STRING, FOUR REGISTERS — rendered without JavaScript.
 *
 * The prototype rewrote these with `mvApplyCopy(tier)` on every tier change; see
 * the header of `_lib/portal-copy.ts` for the mechanism and why reading the HTML
 * alone misses it. Here all four variants render and the tier gates in
 * `portal.css` show exactly one, which is how the rest of the portal's density
 * system already works: no client JavaScript, nothing to hydrate, and no chance
 * of the wrong register on first paint.
 *
 * ── THE FOUR GATES ARE MUTUALLY EXCLUSIVE, AND ONE NEEDS AN ESCAPE HATCH ──
 *
 * `tier-u` / `tier-s` / `tier-d` / `tier-p` each show in exactly one tier —
 * Ultra also carries `view-simple`, but `portal.css` has an explicit
 * `.view-ultra .tier-s { display:none }` for precisely that overlap, so the four
 * never collide.
 *
 * `nc-keep` on the Ultra variant is load-bearing. `.mv-portal.no-claim
 * .tier-u:not(.nc-keep)` hides Ultra content while no record is claimed —
 * because the unclaimed page is a guided tour, which is the opposite of a
 * one-number view. But `claim.cta` appears ON that unclaimed page, so without
 * `nc-keep` the Ultra reader would get a button with no label at all. Measured:
 * that is the state in the reference screenshot, where the button reads "Find my
 * land".
 *
 * ── WHY A SPAN AND NOT A STRING ──
 *
 * Because it renders four of them. Callers put it inside their own button or
 * heading, so this component contributes no styling and no layout — the tier
 * gates only ever set `display:none`, so the visible variant keeps whatever
 * display its parent gives it.
 */
export function TierCopy({ copyKey }: { copyKey: PortalCopyKey }) {
  const variants = portalCopy[copyKey];

  return (
    <>
      <span className="tier-u nc-keep">{variants.ultra}</span>
      <span className="tier-s">{variants.essentials}</span>
      <span className="tier-d">{variants.detailed}</span>
      <span className="tier-p">{variants.professional}</span>
    </>
  );
}
