import type { TocItem } from "@/lib/toc";

import { h4Class } from "../../_components/typography";

/**
 * The numbered "Table of Contents" card inside the article, above the body —
 * the treatment the live site uses on `mineralview.com/blogs/...` (QA #5).
 *
 * This is the SECOND contents list on a blog article: the sticky "On this page"
 * rail is the one you navigate with while scrolling, this is the at-a-glance
 * index you read before starting. It is also the only one below 1024px, where
 * the rail is hidden (QA #9), so it carries mobile on its own.
 *
 * Both link to the same anchors from `prepareArticle`, so they cannot disagree.
 * The live site numbers these in blue; the badges are mint on green-deep here so
 * the card stays inside the palette.
 */
export function ContentsCard({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="mb-[14px] rounded-[12px] border border-mv-line bg-mv-card p-[18px] shadow-mv"
    >
      <h2 className={`${h4Class} mb-3 text-mv-ink`}>Table of Contents</h2>
      <ol className="m-0 list-none space-y-[10px] p-0">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-start gap-[10px]">
            <span
              aria-hidden="true"
              className="mt-[2px] inline-flex h-[20px] w-[20px] flex-none items-center justify-center rounded-full bg-mv-mint text-[11px] font-bold text-mv-green-deep"
            >
              {index + 1}
            </span>
            <a
              href={`#${item.id}`}
              className="text-[14.5px] font-semibold leading-[1.45] text-mv-slate no-underline hover:text-mv-green-deep hover:underline"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
