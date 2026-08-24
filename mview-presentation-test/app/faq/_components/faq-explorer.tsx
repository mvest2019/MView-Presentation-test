"use client";

import { useMemo, useState } from "react";

import { decodeEntities } from "@/lib/sanitize-html";

import {
  FAQ_CATEGORIES,
  FAQ_ENTRIES,
  MOST_ASKED,
  type FaqCategory,
} from "./faq-data";
import {
  type FaqIconProps,
  GeneralArt,
  MostAskedArt,
  PaymentsArt,
  PortalActionArt,
  PricingArt,
  ProductsArt,
  TerminologyArt,
} from "./faq-icons";
import { searchFieldClass, searchRowClass } from "@/app/_components/field";

/**
 * The interactive FAQ — the prototype's `route:faq` behavior, with "Most asked"
 * promoted to a card of its own so every card sits in one row at the top. One
 * section shows at a time (Most asked is the default); search filters across
 * every section at once and hides the cards while active.
 */

const MOST_ASKED_TAB = "Most asked";
type Tab = FaqCategory | typeof MOST_ASKED_TAB;

const TAB_ART: Record<Tab, (props: FaqIconProps) => React.ReactElement> = {
  [MOST_ASKED_TAB]: MostAskedArt,
  General: GeneralArt,
  Products: ProductsArt,
  Payments: PaymentsArt,
  Pricing: PricingArt,
  Terminology: TerminologyArt,
  "Portal Action": PortalActionArt,
};

/* Search matches what the visitor can read — the prototype filters on
   textContent, so strip the answer markup and decode its entities.

   `decodeEntities` rather than the six `.replace` calls this had: that was the
   fourth hand-rolled copy of the same list, and it named no numeric entities, so
   an answer written with `&#8217;` was unsearchable by apostrophe. */
function toPlainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " "));
}

/**
 * A pattern that finds `term` only AT THE START OF A WORD.
 *
 * Plain `includes` matched mid-word, which is what made the results look
 * unrelated to what was typed (Ryan, 2026-08-17). Searching "test" returned "How
 * often is the Information Updated on Mineral View?" — the word "test" appears
 * nowhere on that card; the hit was inside "la(test) production and market data"
 * in the answer. Every such match reads as a bug to the person searching,
 * because the term they typed is not visible anywhere in the result.
 *
 * A word-START match is the rule, not a whole-word one: "pay" must still find
 * "payment" and "payouts", which is the whole point of typing three letters. It
 * simply must not find "repay".
 *
 * The boundary is only prepended when the term itself begins with a word
 * character. `\b` is defined against `\w` on either side, so on a term starting
 * with "$" or "(" it would assert the OPPOSITE — that a word character precedes
 * it — and searching "$" would match nothing at all.
 */
function termPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(/^\w/.test(term) ? `\\b${escaped}` : escaped, "i");
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
    /*
     * ONE ANSWER OPEN AT A TIME (Ryan, 2026-08-14: "first question need to close
     * and next question open").
     *
     * Done with the `name` attribute, not with React state. Two `<details>` that
     * share a name form an exclusive accordion in the browser itself — opening
     * one closes its sibling, the way radio buttons work. That keeps this a
     * plain uncontrolled `<details>`: the disclosure stays keyboard-operable and
     * findable by in-page search without a `useState`, an `onToggle` and a
     * controlled `open` prop to keep in step.
     *
     * A browser without the feature simply lets several stay open, which is the
     * behaviour this had before — a graceful fallback, not a break.
     *
     * One name for the whole page rather than one per category: while a search
     * is running several categories render at once, and the reader is looking
     * at a single list of results, not at groups.
     *
     * `last:mb-0` — the 10px gap belongs BETWEEN cards, but the last card was
     * also spending it on the page's bottom padding, so FAQ ended on a 74px
     * band where Blog, News and Glossary end on 64px. Measured, not guessed.
     * The remaining 64px is `py-16` on the page wrapper, which all four library
     * pages share; changing it here alone would only move the mismatch.
     */
    <details
      name="faq"
      className="group mb-[10px] rounded-[12px] border border-mv-line bg-white px-[18px] transition last:mb-0 open:border-mv-green-deep open:shadow-[0_4px_14px_rgba(46,143,109,.10)]"
    >
      {/* `group-open:pb-[6px]` — the 16px of bottom padding is right for a closed
            row, where it is part of the tap target, but once the answer is
            showing it became a band of empty space between the question and its
            own answer. The chevron is positioned from the summary's TOP, so
            trimming the bottom does not move it. */}
      <summary className="relative block cursor-pointer list-none py-4 pr-[34px] text-[15.5px] font-semibold text-mv-ink hover:text-mv-green-deep group-open:pb-[6px] [&::-webkit-details-marker]:hidden">
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
     the sections below them stay in step.

     `plain` is stripped ONCE here rather than inside the filter. Every entry's
     answer was being run through the tag/entity pass on every keystroke — 90
     answers per character typed — to produce a string that never changes. */
  const sections = useMemo(
    () => [
      {
        tab: MOST_ASKED_TAB as Tab,
        entries: MOST_ASKED.map((e) => ({
          question: e.question,
          answerHtml: e.answerHtml,
          plain: toPlainText(e.answerHtml),
        })),
      },
      ...FAQ_CATEGORIES.map((category) => ({
        tab: category as Tab,
        entries: FAQ_ENTRIES.filter((e) => e.category === category).map((e) => ({
          question: e.question,
          answerHtml: e.answerHtml,
          plain: toPlainText(e.answerHtml),
        })),
      })),
    ],
    [],
  );

  const q = query.trim();
  const searching = q !== "";

  // One compiled pattern for the whole pass, not one per entry per field.
  const pattern = useMemo(() => (q ? termPattern(q) : null), [q]);

  const hits = sections.map((section) => ({
    ...section,
    matched: section.entries.filter(
      (e) => !pattern || pattern.test(e.question) || pattern.test(e.plain),
    ),
  }));
  const total = hits.reduce((n, s) => n + s.matched.length, 0);

  return (
    <div>
      {/* The same field as Blog, News and Glossary. This was a capped 560px pill
          with a magnifier, thicker padding and a shadow, so one control looked
          like two different things across the four library pages. */}
      <div className={searchRowClass}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the FAQ… e.g. claim a lease, MVestimate, payments"
          aria-label="Search FAQ"
          className={searchFieldClass}
        />
      </div>
      {/* NOT SHOWN, but still announced (Ryan, 2026-08-14: "no need to show
          question match count").
          
          `sr-only` rather than deleted: this is the `aria-live` region that tells
          a screen-reader user the list changed after they typed. Removing the
          element would leave them with silence and no way to tell whether a
          search had found anything. Sighted readers lose nothing — every
          category already carries its own visible count beside its heading.
          
          The `min-h` reserve goes with it; with no box there is no gap to hold
          open. */}
      <p aria-live="polite" className="sr-only">
        {searching
          ? `${total} ${total === 1 ? "question matches" : "questions match"} “${query.trim()}”`
          : ""}
      </p>

      {!searching && (
        /* SEVEN ACROSS on desktop, ONE SCROLLING ROW on iPad and phones (Ryan,
           2026-08-17). The tiles used to wrap onto a 4-, 3- or 2-column grid,
           which on a phone stacked them into four rows about 700px tall — the
           reader had to scroll past the whole picker before reaching a single
           answer, and the selected tile could sit off-screen above the list it
           was filtering. A horizontal row keeps the picker one tile high at
           every width, so the answers stay in view.

           1023px, not the 1024/820/480 this carried, because that is the
           breakpoint the rest of the site treats as "iPad and below" — the
           article rail and the related-articles row both turn at it.

           Same idiom as that related-articles row: `snap` so a swipe lands on a
           tile rather than mid-gap, `flex-none` on the children because a flex
           item's default `min-width:auto` would let seven tiles squash to fit
           instead of overflowing, and `mv-thin-scroll` for the 6px bar. */
        <nav
          aria-label="FAQ categories"
          className="mv-thin-scroll mb-[26px] mt-[18px] grid grid-cols-7 gap-3 max-[1023px]:flex max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:overflow-x-auto max-[1023px]:pb-2"
        >
          {sections.map(({ tab, entries }) => {
            const Art = TAB_ART[tab];
            const on = tab === active;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={on}
                onClick={() => setActive(tab)}
                className={`group flex cursor-pointer flex-col items-center gap-[7px] rounded-[16px] border-[1.5px] bg-mv-card px-2 pb-3 pt-[15px] text-center transition max-[1023px]:w-[140px] max-[1023px]:flex-none max-[1023px]:snap-start ${
                  on
                    ? "border-mv-green-deep shadow-[0_6px_18px_rgba(46,143,109,.14)]"
                    : "border-mv-line hover:border-[#9ed8c0] hover:shadow-[0_6px_18px_rgba(6,20,15,.08)]"
                }`}
              >
                <Art className="h-12 w-12 transition-transform duration-150 group-hover:scale-[1.07]" />
                <span
                  className={`rounded-full px-[10px] py-[3px] text-[13px] font-bold leading-[1.2] transition ${
                    on ? "bg-mv-green-deep text-white" : "text-mv-ink"
                  }`}
                >
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
            {/* ONLY WHILE SEARCHING. Browsing one category, the selected tile
                above already names it and carries its count, so this heading
                said "General 20" directly beneath a tile reading "General 20".
                A search is different: several categories render at once and the
                headings are the only thing separating one run of results from
                the next. */}
            {searching && (
              <div className="mb-[14px] mt-1 border-b-2 border-mv-line pb-[9px] text-[18px] font-extrabold text-mv-ink">
                {tab}{" "}
                <span className="ml-[7px] text-[13px] font-bold text-mv-muted">
                  {matched.length}
                </span>
              </div>
            )}
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

      {/* EMPTY STATE (Ryan, 2026-08-17). A search that matched nothing rendered
          NOTHING — the tiles hide while searching and every section returns
          null, so the page went from a full list to a blank band above the
          footer with no word of explanation. The count line that used to sit
          there is `sr-only` now, so a sighted reader was told nothing at all.

          Centred, and worded like Blog, News and Glossary: with the list gone
          there is nothing left-aligned for this to line up with, so hugging the
          left edge of an otherwise empty page reads as a stray fragment. */}
      {searching && total === 0 && (
        <p className="mt-8 text-center text-mv-muted">
          No questions match “{q}”.{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="cursor-pointer border-0 bg-transparent p-0 font-sans text-mv-green-deep underline"
          >
            Clear the search →
          </button>
        </p>
      )}
    </div>
  );
}
