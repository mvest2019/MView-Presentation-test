"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { searchFieldClass } from "@/app/_components/field";
import { ALPHABET, type GlossaryTermSummary } from "@/lib/glossary-types";
import { decodeEntities } from "@/lib/sanitize-html";

/**
 * The A–Z glossary index — the prototype's `route:glossary`: a sticky letter
 * rail, a search box, and terms grouped under letter headings in two columns.
 *
 * Search and grouping run client-side over the whole 46-term corpus, which
 * arrives with the page. That is cheap here because the listing payload carries
 * only names, categories and short definitions — the full articles live on the
 * per-term pages.
 *
 * Per the design, the letter rail collapses while a search is active (the
 * letters no longer describe what is on screen) and the result count gets a
 * one-tap Clear.
 */

type Group = { letter: string; terms: GlossaryTermSummary[] };

export function GlossaryIndex({ terms }: { terms: GlossaryTermSummary[] }) {
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return terms;
    return terms.filter(
      (t) =>
        t.term_name.toLowerCase().includes(term) ||
        t.Category?.toLowerCase().includes(term) ||
        stripHtml(t.short_definition).toLowerCase().includes(term),
    );
  }, [query, terms]);

  const groups = useMemo<Group[]>(() => {
    const byLetter = new Map<string, GlossaryTermSummary[]>();
    for (const t of matches) {
      // `sortby` is the API's own A–Z key; the first letter is a fallback only.
      const letter = (t.sortby?.trim() || t.term_name[0] || "#").toUpperCase();
      const bucket = byLetter.get(letter);
      if (bucket) bucket.push(t);
      else byLetter.set(letter, [t]);
    }
    return [...byLetter.entries()]
      .map(([letter, group]) => ({ letter, terms: group }))
      .sort((a, b) => a.letter.localeCompare(b.letter));
  }, [matches]);

  const populated = useMemo(
    () => new Set(groups.map((g) => g.letter)),
    [groups],
  );

  return (
    <>
      {/* Sticky below the 64px header, as the design's `.azbar` is. Hidden while
          searching, when the letters would not match what is listed. */}
      {/* Rail and search share ONE sticky container. They used to be two, both
          pinned to `top: 64px` with the same z-index, so on scroll they landed on
          the same line and the search box painted over the rail. Sticking the
          pair keeps their spacing automatic, whatever height the rail wraps to.
          Sticky only from 1024px up. The 26 letter chips need ~828px to sit on
          one row; below that the rail wraps and the block grows to 135px (two
          rows) or more, which under a 64px header is too much of a small screen
          to give up permanently. */}
      <div className="sticky top-16 z-40 bg-mv-bg max-[1023px]:static">
        {!searching && (
          <div className="flex flex-wrap gap-1 border-b border-mv-line bg-[rgba(246,247,249,.96)] py-[10px] backdrop-blur-[6px]">
            {ALPHABET.map((letter) =>
            populated.has(letter) ? (
              <a
                key={letter}
                href={`#gl-${letter}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-mv-line bg-white text-[12.5px] font-bold text-mv-green-deep no-underline hover:bg-mv-mint hover:no-underline"
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#eef0f3] bg-[#f2f3f6] text-[12.5px] font-bold text-[#cbd5e1]"
              >
                {letter}
              </span>
              ),
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-[10px] py-2">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search glossary terms"
            placeholder="Search terms… (name, topic or definition)"
            className={searchFieldClass}
          />
          {searching && (
            <>
              <span className="text-xs text-mv-muted">
                {matches.length} of {terms.length}
              </span>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="cursor-pointer rounded-full border border-mv-line bg-white px-3 py-[6px] text-[13px] font-semibold text-mv-slate hover:border-mv-green-deep hover:text-mv-green-deep"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        // Centred, like the listing pages' empty state: with the term columns
        // gone there is nothing left-aligned for this to line up with, so hugging
        // the left edge of an otherwise empty page read as a stray fragment.
        <p className="mt-8 text-center text-mv-muted">
          No terms match “{query.trim()}”.{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="cursor-pointer border-0 bg-transparent p-0 font-sans text-mv-green-deep underline"
          >
            Clear the search →
          </button>
        </p>
      ) : (
        // Two columns, as the design's `#glossList` is, collapsing at 820px.
        //
        // No top margin. The gap under the search box was the sum of three
        // separate paddings — the search row's 8px, 8px here, and 22px on the
        // letter heading — which stacked to 38px of empty band before the first
        // letter. The heading's own padding is the only one that survives, so
        // the spacing has one owner rather than three.
        <div className="columns-2 gap-x-[30px] max-[820px]:columns-1">
          {groups.map((group) => (
            // Groups may SPLIT across the column break; only the heading is
            // pinned to what follows it.
            //
            // This carried `break-inside-avoid` so a letter always stayed whole.
            // The cost was a tall empty block at the foot of the first column:
            // balanced columns aim for equal heights, and when the next letter
            // was too tall to fit in what remained it moved wholesale to column
            // two, leaving the space it would have used empty. M is 8 terms deep,
            // so on the full A–Z that block ran to a few hundred pixels.
            //
            // `break-after-avoid` on the heading below keeps the guarantee that
            // actually matters — a letter is never stranded alone at the foot of
            // a column, away from its terms. What is given up is that a long
            // letter can now continue at the top of column two without its
            // heading repeated above it.
            <div key={group.letter}>
              {/* `font-serif font-bold` rather than `headingBase`: the design's
                  `.gl-letter` is weight 700, and headingBase's `font-semibold`
                  would collide — two utilities on one property resolve by
                  stylesheet order, not class order. */}
              {/* `scroll-mt` has to clear BOTH sticky layers, or jumping to a
                  letter parks its heading underneath them and you cannot see
                  which letter you landed on. Measured: 65px header + 103px
                  rail-and-search block = 168px occluded, and this was reserving
                  120 — a 48px shortfall. 176 leaves the heading just clear.
                  Below 1024 the rail block is static, so only the header is in
                  the way and a smaller margin avoids a needless gap. */}
              {/* `pt-[10px]`, down from 22. This padding is the ONLY gap above a
                  letter now, so it does double duty: the space under the search
                  box and the space between one letter's last card and the next
                  letter. It has to stay on the heading rather than move to the
                  first group, because under `columns-2` every column starts at
                  the container's top edge — zeroing it for `:first-child` would
                  lift A but not M, and the two letters would no longer line up. */}
              <div
                id={`gl-${group.letter}`}
                className="break-after-avoid scroll-mt-[176px] border-b-2 border-mv-green pb-1 pt-[10px] font-serif text-2xl font-bold text-mv-green-deep max-[1023px]:scroll-mt-[80px]"
              >
                {group.letter}
              </div>
              {/* `mt-2` so the first card clears the heading's green rule. With
                  the list flush (preflight zeroes `dl` margin) the card's own top
                  border landed directly on that 2px rule, reading as one thick
                  line cutting into the card. */}
              <dl className="mt-2">
                {group.terms.map((term) => (
                  <TermCard key={term._id} term={term} />
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * A term card. The whole card is the hit area.
 *
 * Done with a stretched link — the term-name anchor carries an `::after` pinned
 * to the card's edges — rather than by wrapping the card in a `<Link>`. An `<a>`
 * is not valid as a child of `<dl>`, and neither is one wrapping the `<dt>`/`<dd>`
 * pair, so wrapping would mean giving up the definition-list markup the design
 * uses (and that a glossary genuinely wants). This keeps the structure and still
 * leaves exactly one link per card for a screen reader to announce, labelled
 * with the term name.
 *
 * Trade-off: the overlay sits above the text, so the definition can no longer be
 * selected with the mouse. That is the cost of a fully clickable card.
 */
function TermCard({ term }: { term: GlossaryTermSummary }) {
  // Hover borrows the design's own "active card" treatment — the green border
  // and shadow it gives `.glossary-term.open`.
  return (
    <div className="group relative mb-2 break-inside-avoid rounded-[12px] border border-mv-line bg-white px-4 py-[13px] transition-shadow hover:border-mv-green hover:shadow-[0_4px_14px_rgba(46,143,109,.10)]">
      <dt className="flex flex-wrap items-center gap-2">
        {/* The design's `dt` is serif 700 at 16px — not a heading, so no
            tracking and no `headingBase` (whose 600 would win the conflict).
            The keyboard focus ring goes on the `::after` overlay rather than the
            anchor's own box, so it traces the card — the region that is actually
            clickable — instead of just the term text. */}
        <Link
          href={`/glossary/${term.term_slug}`}
          className="font-serif text-[16px] font-bold text-mv-ink no-underline after:absolute after:inset-0 after:rounded-[12px] after:content-[''] hover:no-underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-mv-green-deep group-hover:text-mv-green-deep"
        >
          {term.term_name}
        </Link>
        {term.Category && (
          <span className="inline-flex items-center rounded-full bg-[#d4dceb] px-[10px] py-[3px] text-[10.5px] font-bold leading-[1.3] text-[#1a2434]">
            {term.Category}
          </span>
        )}
      </dt>
      <dd className="mt-1 max-w-[700px] text-[14.5px] text-mv-slate">
        {stripHtml(term.short_definition)}
        {/* Not a link: the card already is one, and a second anchor to the same
            place would be a duplicate for anyone tabbing or using a screen
            reader. Kept as text so the affordance still reads.

            `block`, so it always starts its own line. Inline, it simply followed
            the last word of the definition, which is a different place in every
            card — trailing a part-filled line here, wrapping onto a line of its
            own there. Definitions are CMS copy of arbitrary length, so there is
            no wording that would make an inline position land consistently. */}
        <span className="mt-1 block font-semibold text-mv-green-deep group-hover:underline">
          Read more →
        </span>
      </dd>
    </div>
  );
}

/**
 * `short_definition` arrives as HTML (a wrapped `<p>`). It is rendered as text
 * inside a `<dd>`, so the tags are stripped rather than injected — a block
 * element inside the definition would break the card's layout, and text needs no
 * `dangerouslySetInnerHTML`.
 *
 * Entity decoding is the shared `decodeEntities`, not a local list. This was the
 * third hand-rolled decoder naming the same six entities; one of the others is
 * what printed a literal `&#8217;` in the contents rail, and a definition
 * containing any numeric entity would have printed it the same way here.
 */
function stripHtml(html: string | undefined): string {
  if (!html) return "";
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}
