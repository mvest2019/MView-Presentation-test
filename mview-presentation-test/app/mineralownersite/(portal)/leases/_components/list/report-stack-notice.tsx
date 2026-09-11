/**
 * THE LINE UNDER THE TABLE — what opening a lease actually gets you.
 *
 * IT IS HERE BECAUSE OF A QUESTION THE TABLE CANNOT ANSWER. Readers look for
 * the API number, the field and the depth in the lease list and do not find
 * them, because those facts describe a WELL and a lease can hold many. Saying so
 * once, directly under the table, is what stops that reading as missing data.
 *
 * PLAIN TEXT RATHER THAN A `Notice`. A tinted panel here would compete with the
 * provenance card below it and with the totals row above; the design puts this
 * one as a quiet footnote, which is the weight it deserves.
 */
export function ReportStackNotice() {
  return (
    <p className="mt-2.5 max-w-[110ch] text-[11.5px] leading-[1.55] text-mv-muted">
      <strong className="text-mv-slate">
        Open any lease for its three reports
      </strong>{" "}
      — the lease, the reservoir it produces from, and its wells. The well-level
      facts — API, field, play, depth — live on the well report, because they
      describe a well and a lease can have many.
    </p>
  );
}
