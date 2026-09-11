import Link from "next/link";

import { cardTitleClass } from "../../_components/typography";
import { FEATURE_GROUPS, type Feature } from "./pricing-content";

/**
 * "All 17 features, on all four plans" — the grid below the ladder.
 *
 * EVERY CARD IS A LINK to the page that explains that capability, which is the
 * point of this section: the ladder answers "what do I get", and each card is
 * the way through to "what is it". The targets are real routes in this app
 * (`/feature/<slug>`, the two `/features/compare-*` tools, and `/map-explorer`
 * for the map, which already has its own landing page) — see the `HREF` map in
 * the content module for how each one was chosen.
 *
 * Two of the seventeen — Monthly Report and Mailed monthly report — have no
 * page in this app yet. Those render as plain cards rather than as links to a
 * 404, and they say nothing about being unavailable: the feature exists, only
 * the page explaining it does not.
 */
function FeatureCard({ feature }: { feature: Feature }) {
  const body = (
    <>
      <h3
        className={`${cardTitleClass} mb-1.5 flex items-center gap-[7px] text-[13.8px]`}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-[17px] shrink-0 items-center justify-center rounded-full bg-mv-mint text-[11px] font-extrabold text-mv-green-deep"
        >
          ✓
        </span>
        {feature.name}
      </h3>
      <p className="text-[12.3px] leading-[1.6] text-mv-muted">
        {feature.blurb}
      </p>
    </>
  );

  /*
    A flex column so "Learn more" can sit on the card's floor. The blurbs run
    two to five lines, and pinned to the text instead the link landed at a
    different height in every card of a row.
  */
  const shell =
    "flex flex-col rounded-[13px] border bg-white px-4 py-[15px] shadow-[0_1px_2px_rgba(24,24,27,.05)] transition-[box-shadow,border-color,transform]";

  if (!feature.href) {
    return <div className={`${shell} border-mv-line`}>{body}</div>;
  }

  return (
    <Link
      href={feature.href}
      className={`${shell} group border-mv-line no-underline hover:-translate-y-0.5 hover:border-mv-mint-edge hover:shadow-[0_12px_28px_-10px_rgba(15,21,18,.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep`}
    >
      {body}
      {/*
        Shown at rest, not on hover: this is the affordance that says the card
        goes somewhere, and a reader who never mouses over it would otherwise
        never learn that. The arrow nudges on hover instead.
      */}
      <span className="mt-auto inline-flex items-center gap-1 pt-2.5 text-[12px] font-semibold text-mv-green-deep">
        Learn more
        <span
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}

export function FeatureGrid() {
  return (
    <div>
      {FEATURE_GROUPS.map((group) => (
        <section
          key={group.label}
          className="mt-5 border-t border-mv-line pt-[18px] first:mt-0 first:border-t-0 first:pt-0"
        >
          <h3 className="mb-[13px] text-[11px] font-extrabold uppercase tracking-[.12em] text-mv-green-deep">
            {group.label}
          </h3>
          <div className="grid grid-cols-4 gap-[14px] max-[1024px]:grid-cols-2 max-[600px]:grid-cols-1">
            {group.items.map((f) => (
              <FeatureCard key={f.name} feature={f} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
