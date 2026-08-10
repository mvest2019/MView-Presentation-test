import Link from "next/link";

import { h3Class } from "@/app/_components/typography";

/**
 * The three operator feature cards (`.psvc-card`), unchanged from the design.
 *
 * The hrefs are the paths the prototype points at. None of those routes exists
 * yet — same situation as most of `site-nav.ts`, where "every other path is a
 * placeholder until its page is built".
 */

const CARDS = [
  {
    href: "/operators/compare-production",
    icon: "▮▮",
    title: "Compare Operator Production",
    body: "Put 2–4 operators side by side on reported production — real figures, ranked within their play.",
    cta: "Open the comparison →",
  },
  {
    href: "/operators/compare-statistics",
    icon: "≡",
    title: "Compare Operator Statistics",
    body: "Company statistics side by side — leases, counties, rank, and production intensity.",
    cta: "Open the comparison →",
  },
  {
    href: "/operators/presentations",
    icon: "▣",
    title: "Operator Presentations",
    body: "A clean, shareable one-page profile of any operator — built from the public record.",
    cta: "Build a presentation →",
  },
];

export function OperatorFeatureCards() {
  return (
    <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] items-stretch gap-4">
      {CARDS.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="block rounded-2xl border border-mv-line bg-white px-[22px] py-5 !no-underline shadow-mv transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_10px_24px_rgba(13,14,23,.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <div aria-hidden="true" className="text-xl text-mv-green-deep">
            {card.icon}
          </div>
          <h3 className={`${h3Class} mb-[6px] mt-2`}>{card.title}</h3>
          <p className="m-0 text-sm text-mv-muted">{card.body}</p>
          <span className="mt-[10px] inline-block text-[13.5px] font-semibold text-mv-green-deep">
            {card.cta}
          </span>
        </Link>
      ))}
    </div>
  );
}
