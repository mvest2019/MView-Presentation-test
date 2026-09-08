import { money } from "../_lib/claim-format";

/**
 * "YOUR CLAIMED APPRAISED VALUE" — the completion screen's last rail card.
 *
 * ── IT PRINTS ONE REAL NUMBER AND NOTHING ELSE ──
 *
 * This card used to carry a modelled yearly value, a modelled range and three
 * invented sample leases. None of that is served by any owners endpoint: the
 * rolls carry an APPRAISED value per lease and no forecast at all. So the card
 * now shows the sum of the leases the claim actually took, labelled as what it
 * is — a county appraisal total, not a valuation of the reader's interest.
 *
 * That distinction is the whole reason the sublabel exists. An appraised total
 * is a public tax figure; what an owner's royalty is worth is a different
 * number that this API cannot answer, and the two must never be confused on a
 * screen someone screenshots.
 */
export function DoneValueCard({ total }: { total: number }) {
  return (
    <section
      className="rounded-mv border border-mv-sand-line bg-mv-sand-tint p-[18px]"
      aria-label="Your claimed appraised value"
    >
      <h2 className="text-[10.5px] font-bold tracking-[.12em] text-mv-muted uppercase">
        Claimed appraised value
      </h2>
      <p className="mt-[3px] text-[24px] font-extrabold tracking-[-.02em] text-mv-ink">
        {money(total)}
      </p>
      <p className="mt-[2px] text-[11px] leading-[1.45] text-mv-muted">
        Summed from the county appraisal rolls for every lease this claim took.
        A tax appraisal of the property — not a valuation of your interest.
      </p>
    </section>
  );
}
