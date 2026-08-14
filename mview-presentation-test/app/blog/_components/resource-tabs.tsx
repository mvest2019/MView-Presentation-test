import Link from "next/link";

/**
 * The Resources pill-tab row the design puts at the top of all seven library
 * pages (`.pill-tabs` in the prototype). Only Blog & News is built so far; the
 * rest resolve once their pages land.
 */

const TABS = [
  { label: "Resources", href: "/resources" },
  { label: "Blog & News", href: "/blog" },
  { label: "Glossary", href: "/glossary" },
  { label: "Watch & Listen", href: "/media" },
  { label: "Community Q&A", href: "/qa" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact-us" },
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
                ? "border-mv-green-deep bg-mv-green-deep text-white"
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
