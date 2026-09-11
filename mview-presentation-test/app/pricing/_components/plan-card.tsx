import Link from "next/link";

import { buttonClass } from "../../_components/button";
import { h3Class } from "../../_components/typography";
import { InfoTip } from "./info-tip";
import {
  FEATURE_GROUPS,
  type BillingMode,
  type Plan,
} from "./pricing-content";

/**
 * One plan in the ladder.
 *
 * THE CARDS ARE A SINGLE OBJECT REPEATED, so every row has to line up across
 * all four: a reader compares them horizontally, and a price sitting 6px lower
 * than its neighbour reads as a rendering fault. The name, the "who it is for"
 * line, the price panel and the lead line each carry a `min-h-*` sized to their
 * longest copy, which is what holds the rails level — the feature lists below
 * are identical in length, so they align on their own.
 *
 * ONLY ONE CARD IS LIFTED. Premium is the recommendation and gets the ring, the
 * deeper shadow and the -8px offset; Free is marked as the way in with a quiet
 * mint ribbon and a tinted ground instead of a second heavy border, so the two
 * do not compete for the same glance.
 */
export function PlanCard({
  plan,
  billing,
}: {
  plan: Plan;
  billing: BillingMode;
}) {
  const popular = plan.emphasis === "popular";
  const starter = plan.emphasis === "starter";
  const price = billing === "mo" ? plan.priceMo : plan.priceYr;
  const period = billing === "mo" ? plan.periodMo : plan.periodYr;

  return (
    <div
      className={`relative flex flex-col rounded-[17px] px-[18px] py-5 transition-shadow ${
        popular
          ? "bg-gradient-to-b from-[#effaf5] to-white to-[58%] shadow-[0_0_0_2px_var(--color-mv-green-deep),0_24px_50px_-16px_rgba(20,80,58,.26)] max-[900px]:translate-y-0 min-[901px]:-translate-y-2"
          : `border ${
              starter
                ? "border-mv-mint-edge bg-gradient-to-b from-mv-portal-hero-tint to-white to-[62%]"
                : "border-mv-line bg-white"
            } shadow-[0_1px_2px_rgba(24,24,27,.05)] hover:border-mv-mint-edge hover:shadow-[0_12px_28px_-10px_rgba(15,21,18,.12)]`
      }`}
    >
      {plan.flag ? (
        <span
          className={`absolute -top-[13px] left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-[13px] py-[5px] text-[10.5px] font-bold uppercase leading-[1.35] tracking-[.09em] ${
            popular
              ? "bg-mv-green-deep text-white shadow-[0_4px_12px_rgba(20,80,58,.32)]"
              : "border border-mv-mint-edge bg-mv-mint text-mv-green-ink"
          }`}
        >
          {plan.flag}
        </span>
      ) : null}

      <h3 className={`${h3Class} min-h-6`}>{plan.name}</h3>
      <p className="mt-1 min-h-[31px] text-[11.5px] font-bold leading-[1.35] text-mv-muted">
        {plan.audience}
      </p>

      <p
        className={`mt-3 flex min-h-[92px] flex-col justify-center rounded-[13px] border px-[14px] py-3 font-semibold tabular-nums ${
          popular
            ? "border-mv-green bg-mv-tint"
            : starter
              ? "border-mv-mint-edge bg-white"
              : "border-mv-mint-edge bg-mv-portal-hero-tint"
        }`}
      >
        <span className="text-[37px] font-extrabold leading-[1.02] tracking-[-.028em] text-mv-green-deep">
          {price}
        </span>
        <span className="mt-1.5 text-[12.5px] font-semibold text-mv-muted">
          {period}
        </span>
      </p>

      {/*
        The access block carries the whole difference between plans, so it is
        sized like it: the values step up to 15px and the rows are ruled, which
        makes the three numbers the thing the eye lands on after the price.
        Everything below it is identical on all four cards.
      */}
      <dl
        className={`mt-3 rounded-[10px] border px-3 py-1 ${
          popular
            ? "border-mv-mint-edge bg-mv-portal-row-tint"
            : "border-mv-line bg-mv-portal-explain"
        }`}
      >
        {plan.access.map((row, i) => {
          const value = billing === "mo" ? row.mo : row.yr;
          return (
            <div
              key={row.label}
              className={`flex items-baseline justify-between gap-2 py-[7px] ${
                i === 0 ? "" : "border-t border-mv-line-soft"
              }`}
            >
              <dt className="text-[12px] leading-[1.3] text-mv-muted">
                {row.label}
              </dt>
              <dd className="whitespace-nowrap text-right text-[15px] font-extrabold leading-[1.2] tabular-nums">
                {value}
                {row.muted ? (
                  <em
                    className={`not-italic text-mv-muted ${
                      value ? "ml-1 text-[11.5px] font-medium" : "text-[12px] font-medium"
                    }`}
                  >
                    {row.muted}
                  </em>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="relative mt-3 min-h-9 pl-[19px] text-[12.7px] font-semibold leading-[1.4] before:absolute before:left-0 before:top-0 before:text-[11px] before:font-extrabold before:leading-[1.62] before:text-mv-green-deep before:content-['✓']">
        {plan.lead}
      </p>

      {FEATURE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mt-3 border-t border-mv-line-soft pt-[9px] text-[9.4px] font-extrabold uppercase tracking-[.1em] text-mv-sublabel">
            {group.label}
          </p>
          <ul className="-mx-1.5 mt-[5px] flex flex-col gap-px">
            {group.items.map((f) => (
              <li
                key={f.name}
                /*
                  Set lighter than the block above it. All four cards carry the
                  same seventeen rows, so this list confirms "every feature is
                  on every plan" — it is not what a reader compares across
                  columns, and at full strength it out-shouted the figures that
                  are.
                */
                className="flex min-h-[22px] items-center gap-[7px] rounded-[7px] px-1.5 py-px text-[12.1px] text-mv-slate transition-colors hover:bg-mv-tint before:shrink-0 before:text-[10px] before:font-extrabold before:leading-none before:text-mv-green before:content-['✓']"
              >
                {/*
                  The name is the link, not the whole row: the row also holds the
                  tooltip trigger, and nesting a button inside an anchor is
                  invalid and swallows one of the two clicks.
                */}
                {f.href ? (
                  <Link
                    href={f.href}
                    className="min-w-0 flex-1 leading-[1.28] no-underline hover:text-mv-green-deep hover:underline"
                  >
                    {f.name}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 leading-[1.28]">{f.name}</span>
                )}
                <InfoTip label={`About ${f.name}`} align="end">
                  {f.blurb}
                </InfoTip>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/*
        Wrapped so `mt-auto` and the gap above the button are separate
        properties: both on the button itself would be two margin utilities
        fighting over the same one, and the winner would be stylesheet order.
      */}
      <div className="mt-auto pt-[18px]">
        <Link
          href={plan.ctaHref}
          className={buttonClass({
            variant: plan.ctaVariant === "primary" ? "primary" : "dark",
            className: "w-full",
          })}
        >
          {plan.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
