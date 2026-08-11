"use client";

import { useEffect, useState } from "react";

import type { TocItem } from "@/lib/toc";

/**
 * "On this page" contents for the article and glossary detail pages.
 *
 * Two treatments, one behaviour:
 *  · `article` — the blog and news variant: a list icon, a collapse chevron and
 *    a capped, scrolling list. Article contents run to a dozen entries, so it
 *    needs both.
 *  · `glossary` — a green rule beside the label, a hairline under it, and the
 *    full list. Glossary entries top out at eight, so nothing to collapse.
 *
 * Both track the reading position and mark the current section. That is done on
 * scroll rather than with an IntersectionObserver: the question is "which
 * heading did I last pass", which is awkward to phrase as intersection and
 * trivial as a position check.
 *
 * The anchors come from `prepareArticle`, which guarantees each one exists in
 * the rendered body.
 */

/** Clears the sticky 64px header plus a little air. */
const SCROLL_OFFSET = 96;

export function TableOfContents({
  items,
  variant,
}: {
  items: TocItem[];
  variant: "article" | "glossary";
}) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!items.length) return;

    function sync() {
      const headings = items
        .map((item) => document.getElementById(item.id))
        .filter((el): el is HTMLElement => Boolean(el));
      if (!headings.length) return;

      // The last heading whose top has passed the offset is the one being read.
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top - SCROLL_OFFSET <= 0) {
          current = heading.id;
        } else break;
      }
      setActive(current);
    }

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [items]);

  if (items.length === 0) return null;

  const isArticle = variant === "article";

  return (
    <nav
      aria-label="On this page"
      className="rounded-[12px] border border-mv-line bg-mv-card shadow-mv"
    >
      {isArticle ? (
        <div className="flex items-center gap-[10px] px-4 py-[14px]">
          <span aria-hidden="true" className="text-[13px] text-mv-muted">
            ☰
          </span>
          <span className="flex-1 text-[13px] font-extrabold uppercase tracking-[.08em] text-mv-ink">
            On this page
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            className="cursor-pointer border-0 bg-transparent px-1 text-[15px] leading-none text-mv-muted hover:text-mv-green-deep"
          >
            <span aria-hidden="true">{collapsed ? "›" : "⌄"}</span>
            <span className="sr-only">
              {collapsed ? "Show contents" : "Hide contents"}
            </span>
          </button>
        </div>
      ) : (
        <div className="px-4 pb-[10px] pt-[14px]">
          <span className="flex items-center gap-[10px] border-b border-mv-line pb-[10px] text-[13px] font-extrabold uppercase tracking-[.08em] text-mv-ink">
            <span
              aria-hidden="true"
              className="inline-block h-[15px] w-[3px] rounded-full bg-mv-green"
            />
            On this page
          </span>
        </div>
      )}

      {!collapsed && (
        <ul
          className={`m-0 list-none px-2 pb-3 ${
            isArticle
              ? "max-h-[60vh] overflow-y-auto border-t border-mv-line pt-2"
              : ""
          }`}
        >
          {items.map((item) => {
            const current = item.id === active;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "location" : undefined}
                  className={`block rounded-lg px-[10px] py-2 text-[13.5px] leading-[1.4] no-underline hover:bg-mv-mint hover:no-underline ${
                    current
                      ? "bg-[#f2f8f5] font-bold text-mv-ink"
                      : "font-semibold text-mv-slate hover:text-mv-green-deep"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
