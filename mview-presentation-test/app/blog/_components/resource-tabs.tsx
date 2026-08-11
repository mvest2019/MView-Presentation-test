import Link from "next/link";
import { selectedControlClass } from "@/app/_components/button";

/**
 * The Resources pill-tab row the design puts at the top of the library pages
 * (`.pill-tabs` in the prototype). Blog, News and Glossary are built; the rest
 * resolve once their pages land.
 *
 * The design has a single "Blog & News" tab with an in-page view switch behind
 * it. This build gives each its own tab and route instead, so the row is eight
 * entries rather than seven.
 */

const TABS = [
  { label: "Resources", href: "/resources" },
  { label: "Blog", href: "/blog" },
  { label: "News", href: "/news" },
  { label: "Glossary", href: "/glossary" },
  { label: "Watch & Listen", href: "/media" },
  { label: "Community Q&A", href: "/qa" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

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
