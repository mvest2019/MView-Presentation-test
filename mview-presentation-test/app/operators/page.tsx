import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/app/_components/breadcrumbs";
import {
  displayLgClass,
  displaySmClass,
  eyebrowClass,
  inlineLink,
} from "@/app/_components/typography";

import { CountyDirectory } from "./_components/county-directory";
import { OperatorDirectory } from "./_components/operator-directory";
import { OperatorFeatureCards } from "./_components/operator-feature-cards";

/**
 * Know Your Operators — the prototype's `route:operators`.
 *
 * A server component. The only interactive part of the page is the directory
 * workspace, which is a client island of its own, so the heading, breadcrumb,
 * feature cards and closing notice all render on the server.
 *
 * There is no Operator API yet. The table reads a local fixture through
 * `useOperatorDirectory` — see the seam documented there — and no endpoint is
 * called or assumed anywhere on this route.
 *
 * The design's "PUBLIC RECORDS · FREE TO BROWSE" eyebrow above the h1 is
 * dropped on request. The page states its name once: in the breadcrumb trail as
 * the current page, and once as the h1.
 */

export const metadata: Metadata = {
  title: "Know Your Operators — Texas oil & gas operator directory | Mineral View",
  description:
    "Search, filter and rank Texas oil & gas operators by reported production, activity and coverage. Free to browse — built from Railroad Commission public records.",
};

export default function OperatorsPage() {
  return (
    <div className="pb-16 pt-[18px] max-[767px]:pb-11">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Know Your Operators" },
          ]}
        />

        <div className="pt-7">
          <h1 className={displayLgClass}>Know Your Operators</h1>
          <p className="mt-[6px] max-w-[640px] text-[15.5px] text-mv-muted">
            Search, filter, and rank Texas oil &amp; gas operators by reported
            production, activity, and coverage.
          </p>
        </div>

        <OperatorDirectory />

        <OperatorFeatureCards />

        <section className="mt-[46px]">
          <div className={eyebrowClass}>By county · public records</div>
          <h2 className={`${displaySmClass} mt-[7px]`}>
            Browse operators by county
          </h2>
          <p className="mt-[7px] max-w-[660px] text-sm text-mv-muted">
            Explore the oil &amp; gas companies operating in each Texas county.
            Filter by letter or search to jump straight to a county — all 254.
          </p>

          <CountyDirectory />
        </section>

        {/* The design's `.notice.slate` — the page's one conversion prompt. */}
        <aside className="mt-6 flex gap-3 rounded-[14px] border border-[#dfe4e9] bg-mv-line-soft px-[18px] py-4 text-sm leading-[1.55] text-[#33404e]">
          <span aria-hidden="true">ℹ</span>
          <div>
            Numbers above come from Railroad Commission of Texas filings and are
            refreshed as new records post. Want operator activity tied to{" "}
            <em>your</em> acreage?{" "}
            <Link href="/claim" className={`${inlineLink} font-semibold`}>
              Claim your owner record
            </Link>{" "}
            — it&apos;s free. New to this? Start with the guide:{" "}
            <Link
              href="/guide/know-your-operator"
              className={`${inlineLink} font-semibold`}
            >
              Who is my operator?
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
