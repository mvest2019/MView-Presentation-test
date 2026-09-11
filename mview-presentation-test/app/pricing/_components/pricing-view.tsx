"use client";

import Link from "next/link";
import { useState } from "react";

import { buttonClass } from "../../_components/button";
import {
  displayMdClass,
  eyebrowClass,
  h2Class,
  h3Class,
} from "../../_components/typography";
import { CompareTable } from "./compare-table";
import { FeatureGrid } from "./feature-grid";
import { InfoTip } from "./info-tip";
import { PlanCard } from "./plan-card";
import { PlanDetail } from "./plan-detail";
import { ProNote } from "./pro-panel";
import {
  BILLING_CARDS,
  FEATURE_COUNT,
  HOW_CARDS,
  PLANS,
  type BillingMode,
} from "./pricing-content";

/** The content column, matching the rest of the site. */
const wrap = "mx-auto w-full max-w-[1140px] px-6 max-[767px]:px-4";

/** Sections are anchored, so the jump strip and `upgradeHref` can both land. */
const anchor = "scroll-mt-[92px]";

type Audience = "owner" | "pro";

const JUMPS = [
  { href: "#plans", label: "The four plans" },
  { href: "#how", label: "How pricing works" },
  { href: "#features", label: `All ${FEATURE_COUNT} features` },
  { href: "#plan-by-plan", label: "Plan by plan" },
  { href: "#compare", label: "Full comparison" },
  { href: "#billing", label: "Billing & policy" },
];

/** A titled band of cards — "How the pricing works" and "Billing & policy". */
function CardBand({ cards }: { cards: { title: string; body: string }[] }) {
  return (
    <div className="grid grid-cols-4 gap-[14px] max-[1024px]:grid-cols-2 max-[640px]:grid-cols-1">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-[13px] border border-mv-line bg-white px-[18px] py-[17px] shadow-[0_1px_2px_rgba(24,24,27,.05)] transition-[box-shadow,border-color] hover:border-mv-mint-edge hover:shadow-[0_12px_28px_-10px_rgba(15,21,18,.12)]"
        >
          <h3 className="mb-1.5 text-[14.5px] font-bold leading-[1.3]">
            {card.title}
          </h3>
          <p className="text-[12.8px] leading-[1.6] text-mv-muted">
            {card.body}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * The pricing route.
 *
 * TWO PIECES OF STATE, both here rather than in a context: the billing term and
 * the audience. Everything below takes them as props, which keeps the cards,
 * the plan-by-plan detail and the comparison table as plain functions of the
 * content module — the same reason that module exists.
 *
 * Switching to Professionals swaps the whole page, not just the ladder: every
 * band under it is sized in owner records and visible leases, so leaving them
 * on screen under a "Professionals" segment would be stating owner limits as
 * though they were professional ones.
 */
export function PricingView() {
  const [billing, setBilling] = useState<BillingMode>("mo");
  const [audience, setAudience] = useState<Audience>("owner");
  const pro = audience === "pro";

  /*
    The tip is a SIBLING of the segment button, laid over its right padding —
    not a child of it. A <button> inside a <button> is invalid HTML: React
    renders it, the browser reparents it, and hydration fails on the mismatch.
    The prototype had the same nesting, where it cost the segment its click
    whenever the pointer landed on the icon.
  */
  const segButton = (value: Audience, label: string, tip: string) => {
    const on = audience === value;
    return (
      <span className="relative block">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => setAudience(value)}
          className={`inline-flex min-h-[42px] w-full cursor-pointer items-center justify-center rounded-full border-0 py-2.5 pl-[18px] pr-9 text-[13.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep max-[520px]:pl-2 max-[520px]:text-[12.5px] ${
            on
              ? "bg-mv-green-deep text-white shadow-[0_2px_8px_rgba(14,92,67,.26)]"
              : "bg-transparent text-mv-slate hover:bg-mv-tint hover:text-mv-green-deep"
          }`}
        >
          {label}
        </button>
        <span className="absolute right-3.5 top-1/2 z-10 -translate-y-1/2">
          <InfoTip
            label={`Who ${label.toLowerCase()} plans are for`}
            align={value === "pro" ? "end" : "center"}
            triggerClass={
              on
                ? "text-white/75 hover:text-white group-hover/tip:text-white"
                : "text-mv-line-strong hover:text-mv-green-deep group-hover/tip:text-mv-green-deep"
            }
          >
            {tip}
          </InfoTip>
        </span>
      </span>
    );
  };

  return (
    <>
      {/* ------------------------------------------------------- the controls */}
      <div className={wrap}>
        <div className="mx-auto max-w-[720px] text-center">
          <p className={eyebrowClass}>Pricing · free to start for everyone</p>
          {/*
            The design sets this at a flat 26px, which was sized for the
            prototype's own narrower shell. On this site's 1140px column it read
            as a subheading rather than as the thing the page opens with, so it
            takes the shared fluid display size instead.
          */}
          <h2 className={`${displayMdClass} mt-2`}>
            Start free. Pay only if you want more.
          </h2>
          <p className="mt-2.5 text-[14.5px] leading-[1.6] text-mv-muted">
            No credit card to start · paid plans are 12-month terms that{" "}
            <strong className="font-bold text-mv-ink">never auto-renew</strong>{" "}
            ·{" "}
            <strong className="font-bold text-mv-ink">
              every feature is on every plan
            </strong>{" "}
            — plans differ only in how much of your record you can open.
          </p>

          <div className="mt-[18px] flex flex-col items-center gap-3">
            <div
              role="group"
              aria-label="Choose your pricing"
              className="grid w-full max-w-[520px] grid-cols-2 gap-1 rounded-full bg-mv-portal-wash p-1"
            >
              {segButton(
                "owner",
                "Mineral owners",
                "Individuals and families who own mineral or royalty interests. Plans are sized by how many owner records you can claim and how many leases you want visible.",
              )}
              {segButton(
                "pro",
                "Professionals",
                "Operators, land professionals and advisors — team seats, the operator directory and portfolio audits. Professional accounts never see private owner data.",
              )}
            </div>

            {pro ? <ProNote /> : null}

            {/*
              The billing toggle stays under Professionals. It reads oddly on
              its own, but the design keeps it there and the ladder it drives is
              still on screen behind the note.
            */}
            <div
              role="group"
              aria-label="Billing period"
              className="inline-flex gap-[3px] rounded-full bg-mv-portal-wash p-1"
            >
              {(
                [
                  ["mo", "Monthly billing", null],
                  ["yr", "Annual", "Save 2 months"],
                ] as const
              ).map(([mode, label, badge]) => {
                const on = billing === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setBilling(mode)}
                    className={`inline-flex cursor-pointer items-center gap-[7px] rounded-full border-0 px-4 py-2 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${
                      on
                        ? "bg-white text-mv-ink shadow-[0_1px_2px_rgba(24,24,27,.05)]"
                        : "bg-transparent text-mv-slate hover:text-mv-green-deep"
                    }`}
                  >
                    {label}
                    {badge ? (
                      <span
                        className={`rounded-full border px-[7px] py-0.5 text-[10.5px] font-bold uppercase leading-[1.4] tracking-[.04em] text-mv-green-ink ${
                          on
                            ? "border-transparent bg-mv-green"
                            : "border-mv-mint-edge bg-mv-mint"
                        }`}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <nav
          aria-label="On this page"
          className="mx-auto mt-[26px] flex max-w-[960px] flex-wrap justify-center gap-[7px]"
        >
          {JUMPS.map((j) => (
            <a
              key={j.href}
              href={j.href}
              className="rounded-full border border-mv-line bg-white px-[13px] py-1.5 text-[12.5px] font-semibold text-mv-slate no-underline transition-colors hover:border-mv-mint-edge hover:bg-mv-tint hover:text-mv-green-deep"
            >
              {j.label}
            </a>
          ))}
        </nav>
      </div>

      {/* --------------------------------------------------- the ladder */}
      <div className={wrap}>
        {/*
          The ladder renders the same under both segments (user, 2026-09-11:
          "do not show it blur"). The delivered design fades it to 45% when
          Professionals is chosen; it stays at full strength here, and stays
          fully interactive with it — a ladder that looks ordinary but does not
          answer a click is worse than either a faded one or no ladder at all.

          The note above the toggle is what carries the segment now: owner plans
          remain readable and buyable while it says where the professional ones
          live.
        */}
        <div>
          <div
            id="plans"
            className={`${anchor} grid grid-cols-4 items-stretch gap-[18px] pt-9 max-[1024px]:grid-cols-2 max-[767px]:grid-cols-1`}
          >
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} billing={billing} />
            ))}
          </div>

          <p className="mt-5 text-center">
            <a href="#compare" className={buttonClass()}>
              Compare all plans side by side ↓
            </a>
          </p>
          <p className="mx-auto mt-3 max-w-[700px] text-center text-[12.5px] text-mv-muted">
            <strong className="font-bold text-mv-ink">1 lease?</strong> Free.{" "}
            <strong className="font-bold text-mv-ink">
              Up to 10 across two records?
            </strong>{" "}
            Pro.{" "}
            <strong className="font-bold text-mv-ink">
              Up to 20 a record, across five records?
            </strong>{" "}
            Premium. · 12-month terms that never auto-renew · every feature on
            every plan.
          </p>
        </div>
      </div>

      {/* ----------------------------------------------- how it is sized */}
      <div className={`${wrap} mt-14`}>
        <div
          id="how"
          className={`${anchor} mx-auto mb-5 max-w-[740px] text-center`}
        >
          <p className={eyebrowClass}>How the pricing works</p>
          <h2 className={`${h2Class} mb-2 mt-1.5`}>
            Nothing is locked by tier — only sized by it.
          </h2>
          <p className="text-[14px] text-mv-muted">
            Every plan carries all {FEATURE_COUNT} features. What you pay for is{" "}
            <strong className="font-bold text-mv-ink">
              how many owner records you can claim
            </strong>{" "}
            and{" "}
            <strong className="font-bold text-mv-ink">
              how many leases you can open
            </strong>
            . Whatever you open, you see in full.
          </p>
        </div>
        <CardBand cards={HOW_CARDS} />
      </div>

      {/* ---------------------------------------------- extra-lease meter */}
      <div className={`${wrap} mt-4`}>
        <div className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-[13px] border border-mv-line bg-white px-6 py-[22px] shadow-[0_1px_2px_rgba(24,24,27,.05)] max-[780px]:grid-cols-1 max-[780px]:gap-4">
          <div>
            <p className={`${eyebrowClass} mb-1`}>
              Need more than your plan includes?
            </p>
            <h3 className={`${h3Class} mb-1 text-[19px]`}>
              Add leases one at a time — no pack, no cap.
            </h3>
            <p className="max-w-[72ch] text-[14px] text-mv-muted">
              Extra leases join the same invoice, prorated from the day you add
              them. Two more leases is{" "}
              <strong className="font-bold text-mv-ink">
                {billing === "mo" ? "$3.98 a month" : "$39.98 a year"}
              </strong>
              . There is no hard ceiling, because past about 25 extra leases
              Premium simply costs less than the meter — and we tell you rather
              than let it run.
            </p>
          </div>
          <div className="whitespace-nowrap rounded-[13px] border border-mv-mint-edge bg-mv-portal-hero-tint px-5 py-4 text-right max-[780px]:text-left">
            <span className="text-[36px] font-extrabold leading-none tracking-[-.03em] text-mv-green-deep tabular-nums">
              {billing === "mo" ? "$1.99" : "$19.99"}
            </span>
            <span className="mt-[7px] block text-[12.5px] font-semibold text-mv-muted">
              per extra lease, per {billing === "mo" ? "month" : "year"}
            </span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------- every feature */}
      <div className={`${wrap} mt-14`}>
        <div
          id="features"
          className={`${anchor} mx-auto mb-6 max-w-[700px] text-center`}
        >
          <p className={eyebrowClass}>What every plan includes</p>
          <h2 className={`${h2Class} mb-2 mt-1.5`}>
            All {FEATURE_COUNT} features, on all four plans.
          </h2>
          <p className="text-[14px] text-mv-muted">
            Grouped by what they answer. Each one works on every lease your plan
            has open — and each card opens the page that explains it.
          </p>
        </div>
        <FeatureGrid />
      </div>

      {/* ------------------------------------------------- plan by plan */}
      <div className={`${wrap} mt-14`}>
        <div
          id="plan-by-plan"
          className={`${anchor} mx-auto mb-5 max-w-[700px] text-center`}
        >
          <p className={eyebrowClass}>Plan by plan</p>
          <h2 className={`${h2Class} mb-2 mt-1.5`}>
            Exactly what each plan opens.
          </h2>
          <p className="text-[14px] text-mv-muted">
            The same {FEATURE_COUNT} features on all four. These are the access
            limits, spelled out with a worked example each.
          </p>
        </div>
        <PlanDetail />
      </div>

      {/* --------------------------------------------------- comparison */}
      <div className={`${wrap} mt-14`}>
        <details
          id="compare"
          className={`${anchor} group rounded-[13px] border border-mv-line bg-white px-[18px] py-[14px] shadow-[0_1px_2px_rgba(24,24,27,.05)]`}
          open
        >
          <summary className="flex cursor-pointer list-none items-center gap-2.5 text-[14.5px] font-bold text-mv-green-deep hover:text-mv-ink [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="mb-[3px] size-2 shrink-0 rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:mb-0 group-open:-rotate-135"
            />
            Compare every feature — {PLANS.map((p) => p.name).join(" · ")}
          </summary>
          <p className="mt-2.5 text-[14px] text-mv-muted">
            All {FEATURE_COUNT} features are included on every plan. The only
            difference is{" "}
            <strong className="font-bold text-mv-ink">
              how many owner records you can claim and how many leases you can
              open
            </strong>
            .
          </p>
          <CompareTable />
        </details>
      </div>

      {/* ---------------------------------------------- billing & policy */}
      <div className={`${wrap} mt-[14px]`}>
        <details
          id="billing"
          className={`${anchor} group rounded-[13px] border border-mv-line bg-white px-[18px] py-[14px] shadow-[0_1px_2px_rgba(24,24,27,.05)]`}
          open
        >
          <summary className="flex cursor-pointer list-none items-center gap-2.5 text-[14.5px] font-bold text-mv-green-deep hover:text-mv-ink [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="mb-[3px] size-2 shrink-0 rotate-45 border-b-2 border-r-2 border-current transition-transform group-open:mb-0 group-open:-rotate-135"
            />
            Billing &amp; policy — the 12-month term, renewal, upgrades,
            downgrades
          </summary>
          <div className="mt-[14px]">
            <CardBand cards={BILLING_CARDS} />
          </div>
        </details>
      </div>

      {/* ------------------------------------------------- closing band */}
      <div className={`${wrap} mt-14`}>
        <div className="flex flex-wrap items-center justify-between gap-[22px] rounded-[17px] bg-gradient-to-r from-mv-deep-ink to-mv-forest px-[30px] py-[26px] shadow-[0_12px_28px_-10px_rgba(15,21,18,.12)] max-[767px]:px-5">
          <div>
            <h2 className={`${h3Class} text-[21px] text-white`}>
              One lease? You are already on the right plan.
            </h2>
            <p className="mt-1.5 max-w-[60ch] text-[13px] text-mv-on-deep-soft">
              Claim your record and the first 7 days run as full Premium — no
              card, and no countdown while you are still looking for your name.
              On day 8 the account settles onto Free.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/claim" className={buttonClass({ variant: "primary" })}>
              Find your record →
            </Link>
            <Link
              href="/contact-us"
              className={buttonClass({
                className:
                  "!border-white/30 !bg-transparent !text-mv-on-deep hover:!border-white/50 hover:!bg-white/10 hover:!text-white",
              })}
            >
              Talk to us
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
