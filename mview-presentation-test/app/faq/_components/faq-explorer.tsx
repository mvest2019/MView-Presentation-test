"use client";

import {
  Book,
  CreditCard,
  Info,
  Layers,
  Monitor,
  Search,
  Star,
  Tag,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  FAQ_CATEGORIES,
  FAQ_ENTRIES,
  MOST_ASKED,
  type FaqCategory,
} from "./faq-data";

/**
 * The interactive FAQ — the prototype's `route:faq` behavior, with "Most asked"
 * promoted to a card of its own so every card sits in one row at the top. One
 * section shows at a time (Most asked is the default); search filters across
 * every section at once and hides the cards while active.
 */

const MOST_ASKED_TAB = "Most asked";
type Tab = FaqCategory | typeof MOST_ASKED_TAB;

const TAB_ICON: Record<Tab, typeof Info> = {
  [MOST_ASKED_TAB]: Star,
  General: Info,
  Products: Layers,
  Payments: CreditCard,
  Pricing: Tag,
  Terminology: Book,
  "Portal Action": Monitor,
};

/* Search matches what the visitor can read — the prototype filters on
   textContent, so strip the answer markup and decode its entities. */
function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&times;/g, "×")
    .replace(/&hellip;/g, "…")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<");
}

const ANSWER_BODY = [
  "pb-4 text-[14.5px] leading-[1.65] text-mv-slate",
  "[&_p]:mb-[10px] [&_p:last-child]:mb-0",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:mb-2 [&_li:last-child]:mb-0",
  "[&_a]:font-semibold [&_a]:text-mv-green-deep [&_a]:no-underline [&_a:hover]:underline",
].join(" ");

function FaqItem({
  question,
  answerHtml,
}: {
  question: string;
  answerHtml: string;
}) {
  return (
    <details className="group mb-[10px] rounded-[12px] border border-mv-line bg-white px-[18px] transition open:border-mv-green open:shadow-[0_4px_14px_rgba(46,143,109,.10)]">
      <summary className="relative block cursor-pointer list-none py-4 pr-[34px] text-[15.5px] font-semibold text-mv-ink hover:text-mv-green-deep [&::-webkit-details-marker]:hidden">
        {question}
        <span
          aria-hidden
          className="absolute right-[3px] top-[22px] h-[9px] w-[9px] rotate-45 border-b-2 border-r-2 border-mv-green-deep transition-transform group-open:top-[26px] group-open:rotate-[225deg]"
        />
      </summary>
      <div
        className={ANSWER_BODY}
        dangerouslySetInnerHTML={{ __html: answerHtml }}
      />
    </details>
  );
}

export function FaqExplorer() {
  const [active, setActive] = useState<Tab>(MOST_ASKED_TAB);
  const [query, setQuery] = useState("");

  /* Most asked first, then the six categories — one flat list, so the cards and
     the sections below them stay in step. */
  const sections = useMemo(
    () => [
      {
        tab: MOST_ASKED_TAB as Tab,
        entries: MOST_ASKED.map((e) => ({
          question: e.question,
          answerHtml: e.answerHtml,
        })),
      },
      ...FAQ_CATEGORIES.map((category) => ({
        tab: category as Tab,
        entries: FAQ_ENTRIES.filter((e) => e.category === category).map((e) => ({
          question: e.question,
          answerHtml: e.answerHtml,
        })),
      })),
    ],
    [],
  );

  const q = query.trim().toLowerCase();
  const searching = q !== "";

  const hits = sections.map((section) => ({
    ...section,
    matched: section.entries.filter(
      (e) =>
        e.question.toLowerCase().includes(q) ||
        toPlainText(e.answerHtml).toLowerCase().includes(q),
    ),
  }));
  const total = hits.reduce((n, s) => n + s.matched.length, 0);

  return (
    <div>
      <div className="my-[6px] flex max-w-[560px] items-center gap-[10px] rounded-full border border-mv-line bg-white px-[18px] py-3 shadow-[0_2px_10px_rgba(6,20,15,.05)]">
        <Search className="h-[18px] w-[18px] flex-none text-mv-green-deep" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the FAQ… e.g. claim a lease, MVestimate, payments"
          aria-label="Search FAQ"
          className="flex-1 border-0 bg-transparent text-[15px] text-mv-ink outline-none placeholder:text-[#9aa3ae]"
        />
      </div>
      <p
        aria-live="polite"
        className="mb-[6px] min-h-[16px] text-xs text-mv-muted"
      >
        {searching
          ? `${total} ${total === 1 ? "question matches" : "questions match"} “${query.trim()}”`
          : ""}
      </p>

      {!searching && (
        <nav
          aria-label="FAQ categories"
          className="mb-[26px] mt-[18px] grid grid-cols-7 gap-3 max-[1024px]:grid-cols-4 max-[820px]:grid-cols-3 max-[480px]:grid-cols-2"
        >
          {sections.map(({ tab, entries }) => {
            const Icon = TAB_ICON[tab];
            const on = tab === active;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(tab)}
                className={`flex cursor-pointer flex-col items-center gap-[9px] rounded-[14px] border-[1.5px] px-[10px] pb-[13px] pt-4 text-center text-mv-ink transition ${
                  on
                    ? "border-mv-green-deep bg-mv-mint"
                    : "border-mv-line bg-white hover:border-[#9ed8c0] hover:shadow-[0_6px_18px_rgba(6,20,15,.08)]"
                }`}
              >
                <span
                  className={`flex h-[44px] w-[44px] items-center justify-center rounded-[12px] text-mv-green-deep ${on ? "bg-white" : "bg-mv-mint"}`}
                >
                  <Icon className="h-[22px] w-[22px]" />
                </span>
                <span className="text-[13px] font-bold leading-[1.2]">
                  {tab}
                </span>
                <span
                  className={`text-[11px] font-bold ${on ? "text-mv-green-deep" : "text-mv-muted"}`}
                >
                  {entries.length}
                </span>
              </button>
            );
          })}
        </nav>
      )}

      {hits.map(({ tab, matched }) => {
        const visible = searching ? matched.length > 0 : tab === active;
        if (!visible) return null;
        return (
          /* Keyed by search state so switching card (or clearing a search)
             closes any answer left open, matching the prototype. */
          <div key={`${tab}${searching ? "-search" : ""}`}>
            <div className="mb-[14px] mt-1 border-b-2 border-mv-line pb-[9px] text-[18px] font-extrabold text-mv-ink">
              {tab}{" "}
              <span className="ml-[7px] text-[13px] font-bold text-mv-muted">
                {matched.length}
              </span>
            </div>
            {matched.map((e) => (
              <FaqItem
                key={e.question}
                question={e.question}
                answerHtml={e.answerHtml}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
