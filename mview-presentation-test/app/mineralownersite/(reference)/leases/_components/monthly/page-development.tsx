import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "../../../../_components/ui/table";
import { DEVELOPMENT_RINGS, NEW_WELL_ODDS } from "../../_lib/report-fixtures";
import { ReportFootnote, ReportList, ReportPageCard } from "./report-page";

/**
 * PAGE 7 · DEVELOPMENT OUTLOOK — what is being drilled around this acreage.
 *
 * ── A PERMIT IS AN INTENTION, AND THE PAGE SAYS SO TWICE ──
 *
 * Permit counts are the single most over-read number in this product: they look
 * like activity, they are filed in bulk, many are never drilled, and the ones
 * that are take a year or more to reach first production. The page prints the
 * count because the count is real, and then immediately says what it is not.
 *
 * ── THE BANDS ARE NOT AVERAGED, DELIBERATELY ──
 *
 * The model's chance of a new well runs from 4.5% to 80% across these ten
 * leases. One portfolio score would describe none of them, so the chip carries
 * the spread and the text names both ends. An average here would be the most
 * confidently wrong figure in the report.
 */
export function PageDevelopment() {
  const { bands, best, worst } = NEW_WELL_ODDS;
  const inner = DEVELOPMENT_RINGS[0];
  const outer = DEVELOPMENT_RINGS[DEVELOPMENT_RINGS.length - 1];

  return (
    <ReportPageCard
      number={7}
      id="development-outlook"
      title="Development outlook"
      chip={`${bands.veryPoor} very poor, ${bands.average} average, ${bands.good} good, ${bands.veryGood} very good`}
      lead="What is being drilled around this acreage, and what it implies."
    >
      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <TableScroll>
          <Table minWidth={420}>
            <TableHead>
              <TableRow className="bg-mv-portal-wash">
                <TableHeaderCell>Ring</TableHeaderCell>
                <TableHeaderCell numeric>Permits</TableHeaderCell>
                <TableHeaderCell numeric>Leases</TableHeaderCell>
                <TableHeaderCell numeric>Operators</TableHeaderCell>
                <TableHeaderCell numeric>Producing</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {DEVELOPMENT_RINGS.map((ring) => (
                <TableRow key={ring.ring}>
                  <TableCell className="font-bold">{ring.ring}</TableCell>
                  <TableCell numeric>{ring.permits}</TableCell>
                  <TableCell numeric>{ring.leases}</TableCell>
                  <TableCell numeric>{ring.operators}</TableCell>
                  <TableCell numeric>{ring.producing}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableScroll>

        <div>
          <h4 className="text-[14px] font-bold">
            There is drilling interest on your doorstep.
          </h4>
          <ReportList
            items={[
              <>
                The model&apos;s chance of a new well is not one number across
                these leases: {best.lease} scores {best.percent.toFixed(1)}% and{" "}
                {worst.lease} scores {worst.percent.toFixed(1)}% —{" "}
                {bands.veryPoor} very poor, {bands.average} average, {bands.good}{" "}
                good, {bands.veryGood} very good. Treating the portfolio as one
                score would describe none of them.
              </>,
              <>
                {inner.permits} standing permits and {inner.leases} neighbouring
                leases sit within {inner.ring.replace("s", "")} of your wells. A
                permit is an intention, not a well: many are never drilled, and
                the ones that are take a year or more to reach first production.
              </>,
              <>
                Widen to {outer.ring} and it is {outer.permits} permits across{" "}
                {outer.leases} leases run by {outer.operators} operators,{" "}
                {outer.producing} of them producing. That is the area&apos;s
                appetite for drilling — it is not activity on your acreage.
              </>,
            ]}
          />
        </div>
      </div>

      <ReportFootnote>
        Counted once each across the whole portfolio, not once per lease — ten
        leases in one county share their neighbours, and summing each
        lease&apos;s own survey would count the same neighbouring lease many
        times over. These are the same ring figures the dashboard shows.
      </ReportFootnote>
    </ReportPageCard>
  );
}
