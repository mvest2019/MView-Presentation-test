import { Badge } from "../../../../_components/ui/badge";
import { NOT_YOURS_LABEL, PRESS_ITEMS } from "../../_lib/report-fixtures";
import { ReportFootnote, ReportPageCard } from "./report-page";

/**
 * PAGE 11 · AROUND YOUR OPERATORS — what the industry published this period.
 *
 * ── EVERY ITEM IS MARKED "NOT ONE OF YOURS", AND THAT IS THE PAGE'S JOB ──
 *
 * The three companies running this record are small and private and most months
 * publish nothing at all. Rather than show an empty page, this falls back to the
 * newest items from the wider Texas record — which is only safe if every row
 * says so. An investor deck from a company the reader has never heard of, sitting
 * under a heading with their operators' name on it, is exactly the misreading
 * this page has to prevent, so the label is on every item rather than once at
 * the top.
 *
 * THE FOOTNOTE ALSO SAYS THE ROWS ARE NOT CHOSEN BY AREA. They carry no county,
 * so nothing here is evidence about the reader's neighbourhood — page 7 is where
 * that lives.
 */
export function PagePress() {
  return (
    <ReportPageCard
      number={11}
      id="press"
      title="Around your operators"
      chip={`${PRESS_ITEMS.length} recorded`}
      lead="Your operators published nothing this period, so this is the wider Texas record."
    >
      <div className="mt-2 divide-y divide-mv-line">
        {PRESS_ITEMS.map((item) => (
          <article key={item.title} className="py-4 first:pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold tracking-[0.06em] text-mv-green-deep uppercase">
                {item.operator}
              </span>
              <Badge tone="estimate" size="xs" className="uppercase">
                {NOT_YOURS_LABEL}
              </Badge>
            </div>
            <h4 className="mt-1 text-[14px] font-bold">{item.title}</h4>
            <p className="mt-1 text-[13px] leading-[1.6] text-mv-slate">
              {item.summary}
            </p>
            <p className="mt-1.5 text-[11px] text-mv-muted">{item.date}</p>
          </article>
        ))}
      </div>

      <ReportFootnote>
        Nothing was published by your own operators this period — they are small
        private companies and most months they publish nothing at all. These are
        the newest items from the wider Texas record instead, marked as not
        yours. They are not chosen by your area: these rows carry no county.
      </ReportFootnote>
    </ReportPageCard>
  );
}
