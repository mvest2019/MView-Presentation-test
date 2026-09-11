import { portfolioSummary } from "../_lib/lease-totals";

/**
 * "HOW THE MVESTIMATE AND THE COUNTY FIGURE DIFFER" — the derivation behind the
 * two money columns, folded away until it is asked for.
 *
 * A NATIVE `<details>` AND NOT THE BOXED `ExplainPanel`. The design puts this
 * one directly under the band as a bare green line rather than a card: it sits
 * between the figures and the change feed, and a second bordered surface there
 * reads as another panel competing with both. It is still a `<details>` for the
 * reasons that component's note gives — the browser's own in-page search expands
 * it, it prints, and it works with JavaScript off.
 *
 * THE TRIANGLE IS OURS, NOT THE ENGINE'S. `list-none` removes the default
 * marker in both engines and the span below rotates on `group-open`, so the
 * affordance points down when the panel is open and there is only ever one of
 * them on the row.
 */
export function EstimateExplainer() {
  return (
    <details className="group mb-3.5">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-bold text-mv-green-deep [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="text-[10px] transition-transform group-open:rotate-90"
        >
          ▶
        </span>
        How the MVestimate and the county figure differ
      </summary>

      {/*
        ONE PARAGRAPH, AND IT ANSWERS THE HEADING RATHER THAN LECTURING.
        The panel exists for the reader who looked at $4.44M beside $6.03M and
        wanted to know which one to believe. Four sentences: what each figure
        measures, why a gap between them is expected, and what a large gap means.
        The three-paragraph version this replaced said the same thing at length
        and buried the one line that settles it — a gap is normal.

        THE LAST SENTENCE IS A CROSS-CHECK, NOT A DEFINITION. Two independent
        records are counted here — the roster that says which wells belong to
        these leases, and the state's well master — and the panel prints that
        they agree. It is the only figure on the page that is corroborated
        rather than merely reported, so it is worth saying out loud; `wells`
        comes from the records, so it can never disagree with the band above.
      */}
      <div className="mt-2 max-w-[68ch] text-[12.5px] leading-[1.65] text-mv-slate">
        <p>
          The MVestimate projects your share of the next six years from the
          decline model and a forward price deck. The county appraises your
          interest for tax, on last year&apos;s roll. They answer different
          questions, so a gap between them is normal — and a large one is worth a
          look rather than an error. The well roster and the well master agree:{" "}
          {portfolioSummary.wells} wells.
        </p>
      </div>
    </details>
  );
}
