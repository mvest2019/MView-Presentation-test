import Link from "next/link";
import { selectedControlClass } from "@/app/_components/button";
import { learnNav } from "@/app/_components/site-nav";

/**
 * The pill-tab row at the top of the library pages (`.pill-tabs` in the
 * prototype).
 *
 * The four entries are deliberately the SAME four as the header's Learn menu
 * (Ryan, 2026-08-11) — the row and the menu are two routes into one set, so they
 * must not disagree. The design's row also carried Resources, Watch & Listen,
 * Community Q&A and Contact; those were dropped from Learn earlier and are
 * dropped here for the same reason. Contact and the rest remain in the footer.
 *
 * Sourced from `learnNav` rather than restated, so trimming one trims both.
 */

const TABS = learnNav;

export function ResourceTabs({ active }: { active: string }) {
  return (
    <div className="mt-5 flex flex-wrap gap-[6px]">
      {TABS.map((tab) => {
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-[15px] py-[7px] text-[13px] font-semibold no-underline hover:no-underline ${
              isActive
                ? selectedControlClass
                : "border-mv-line bg-white text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
