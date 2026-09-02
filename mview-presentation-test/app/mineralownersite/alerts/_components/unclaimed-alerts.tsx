import Link from "next/link";

import { PortalButtonLink } from "../../_components/ui/button";
import { gates } from "../../_components/ui/portal-gating";
import { TierCopy } from "../../_components/ui/tier-copy";
import { sampleAlerts, sampleOwner } from "../_lib/sample-alerts";
import type { SampleAlertAccent } from "../_lib/sample-alerts";

/**
 * WHAT AN UNCLAIMED VISITOR SEES — a labelled sample inbox.
 *
 * `nc-only nc-swap` TOGETHER REPLACE THE PAGE. `portal.css` §9 hides every
 * sibling of an `.nc-swap` panel while the record is unclaimed, so this is the
 * whole route in that state — which is also why the route root MUST carry an
 * `nc-only` child at all. Without one, an unclaimed visitor gets a blank page.
 *
 * ── WHY A SAMPLE AND NOT AN EMPTY STATE ──
 *
 * v24 · #1. Alerts are personal by definition: before a claim there is genuinely
 * nothing to show. An empty inbox above a claim button shows a visitor nothing
 * and asks them to imagine the product. Three labelled, fictional alerts show
 * them what arrives — and the design's honesty machinery makes sure they cannot
 * be mistaken for real: the amber SAMPLE PREVIEW flag, the FICTIONAL chip in the
 * heading, the named fictional owner, and a footer that says it again.
 *
 * ── THE `smp-*` CLASSES ARE THE ONE PLACE THIS MODULE USES `portal.css` FOR LOOK ──
 *
 * The same deliberate exception the leases module records, for the same two
 * reasons: this chrome's entire job is being unmistakably not-real data, so it
 * must not look slightly different from one route to the next, and its amber
 * palette exists nowhere else in either design. Convert it when the dashboard's
 * copy is converted, together, or not at all.
 */

/* Green means live and watched daily; amber means a labelled example; grey means
   neither. The claim rail above this panel prints that key, and its closing line
   is what the colours are for: "Claiming turns the amber into your green." */
const ACCENTS: Record<SampleAlertAccent, string> = {
  green: "border-l-mv-green",
  amber: "border-l-mv-portal-gold",
  neutral: "border-l-mv-line",
};

export function UnclaimedAlerts() {
  return (
    <div className={gates("unclaimedOnly", "unclaimedSwap")}>
      <h2 className="mb-1 text-2xl font-bold">Alerts</h2>
      <p className="mb-3 text-[13px] text-mv-muted">
        Alerts are personal by definition — here&apos;s what your inbox looks like
        once you claim.
      </p>

      <div className="smp-badge">
        <span className="smp-tag">SAMPLE PREVIEW</span>
        <p>
          <strong>
            This is what your alert inbox looks like once you claim your record.
          </strong>{" "}
          These alerts belong to{" "}
          <strong>{sampleOwner.name}, a fictional sample owner</strong>. Every
          real alert deep-links to the exact screen it&apos;s about.{" "}
          <strong>Free, no-obligation account.</strong>
        </p>
      </div>

      <div className="smp-wrap">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">
            {sampleOwner.since} <span className="smp-chip">FICTIONAL</span>
          </h3>
          <span className="text-[10px] text-mv-muted">
            Mineral View watches the public record daily
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {sampleAlerts.map((alert) => (
            <div
              key={alert.headline}
              className={`rounded-mv border border-mv-line border-l-4 bg-mv-card px-[14px] py-2.5 shadow-mv ${
                ACCENTS[alert.accent]
              }`}
            >
              <strong className="text-[13px]">
                <span aria-hidden="true">{alert.glyph}</span> {alert.headline}
              </strong>
              <p className="mt-0.5 text-[11px] leading-[1.5] text-mv-muted">
                {alert.detail}
              </p>
            </div>
          ))}
        </div>

        {/* NAMING WHAT THE SAMPLE IS NOT SHOWING is a more honest way to promise
            the rest than inventing six more fictional rows. */}
        <p className="mt-2 text-[10px] leading-[1.5] text-mv-muted">
          Real alerts also watch for possible payment gaps, co-owner activity, and
          decline-trend breaks — delivered by email or push, your choice.
        </p>
      </div>

      {/* v43 · OW-05 — the same green as the pinned claim rail at the top of the
          page. One claim, one colour, per page. */}
      <div className="smp-cta cr-foot">
        <span className="cr-foot-txt">
          <strong>These three alerts are a made-up owner&apos;s.</strong> Claim
          your record and this inbox starts filling with alerts about your leases
          — production posted, permits filed nearby, and anything that looks like
          a payment gap.
        </span>
        <PortalButtonLink variant="primary" href="/claim">
          <TierCopy copyKey="claim.cta" />
        </PortalButtonLink>
        <Link href="/operators" className="text-[13px]">
          or explore public data meanwhile →
        </Link>
      </div>
    </div>
  );
}
