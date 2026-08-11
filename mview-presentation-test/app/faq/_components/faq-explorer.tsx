"use client";

import {
  Book,
  CreditCard,
  Info,
  Layers,
  Monitor,
  Search,
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
 * The interactive FAQ — the prototype's `route:faq` behavior, verbatim:
 * 6 category cards (General default) that show one category at a time, an
 * always-visible "Most asked" block, and a search that filters across every
 * category (and the featured block) while hiding the cards.
 */

const CATEGORY_ICON: Record<FaqCategory, typeof Info> = {
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

function CatHead({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-[14px] mt-1 border-b-2 border-mv-line pb-[9px] text-[18px] font-extrabold text-mv-ink">
      {label}{" "}
      <span className="ml-[7px] text-[13px] font-bold text-mv-muted">
        {count}
      </span>
    </div>
  );
}

export function FaqExplorer() {
  const [active, setActive] = useState<FaqCategory>("General");
  const [query, setQuery] = useState("");

  const byCategory = useMemo(
    () =>
      FAQ_CATEGORIES.map((category) => ({
        category,
        entries: FAQ_ENTRIES.filter((e) => e.category === category),
      })),
    [],
  );

  const q = query.trim().toLowerCase();
  const matches = (question: string, answerHtml: string) =>
    q === "" ||
    question.toLowerCase().includes(q) ||
    toPlainText(answerHtml).toLowerCase().includes(q);

  const featuredHits = MOST_ASKED.filter((e) =>
    matches(e.question, e.answerHtml),
  );
  const blockHits = byCategory.map(({ category, entries }) => ({
    category,
    entries: entries.filter((e) => matches(e.question, e.answerHtml)),
  }));
  const total =
    featuredHits.length + blockHits.reduce((n, b) => n + b.entries.length, 0);

  const searching = q !== "";

  function selectCategory(category: FaqCategory) {
    setActive(category);
    setQuery("");
  }

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
      <p aria-live="polite" className="mb-[6px] min-h-[16px] text-xs text-mv-muted">
        {searching
          ? `${total} ${total === 1 ? "question matches" : "questions match"} “${query.trim()}”`
          : ""}
      </p>

      {(!searching || featuredHits.length > 0) && (
        <div className="mb-2">
          <CatHead
            label="Most asked"
            count={searching ? featuredHits.length : MOST_ASKED.length}
          />
          {featuredHits.map((e) => (
            <FaqItem key={e.question} {...e} />
          ))}
        </div>
      )}

      {!searching && (
        <nav
          aria-label="FAQ categories"
          className="mb-[26px] mt-[18px] grid grid-cols-6 gap-3 max-[820px]:grid-cols-3 max-[480px]:grid-cols-2"
        >
          {byCategory.map(({ category, entries }) => {
            const Icon = CATEGORY_ICON[category];
            const on = category === active;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={on}
                onClick={() => selectCategory(category)}
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
                  {category}
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

      {blockHits.map(({ category, entries }) => {
        const visible = searching ? entries.length > 0 : category === active;
        if (!visible) return null;
        return (
          /* Keyed by search state so switching category (or clearing a
             search) closes any open answers, matching the prototype. */
          <div key={`${category}${searching ? "-search" : ""}`}>
            <CatHead label={category} count={entries.length} />
            {entries.map((e) => (
              <FaqItem key={e.question} question={e.question} answerHtml={e.answerHtml} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
