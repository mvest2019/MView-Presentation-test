import type { LeasePickerEntry } from "../../_api/leases-api";
import { leaseReportPath, leaseRouteSlug } from "../../_lib/lease-routes";
import type { LeaseStep } from "./lease-report";
import type { RecordBar } from "./lease-report-from-api";

/**
 * WHERE ONE LEASE SITS IN THE RECORD — the bars beside it, and the two either
 * side of it.
 *
 * ── IT IS DERIVED FROM THE PICKER, NOT FROM A CALL OF ITS OWN ──
 *
 * The lease report knows where this lease STANDS — its rank, and its share of
 * the record — but not what the other leases are worth, and the ranking card
 * draws them side by side. The picker is the answer that is already nearby: one
 * unpaged call the report page makes anyway for the header dropdown, so the
 * bars and the arrows cost nothing beyond the arithmetic below.
 *
 * ── THE ARROWS FOLLOW THE PICKER'S OWN ORDER ──
 *
 * So "next" is the lease under this one in the dropdown the reader just looked
 * at, and not a different sequence they never saw. They wrap at both ends, the
 * way the fixture's own pair does.
 *
 * `leaseNeighbours` CANNOT DO THIS JOB and does not say so: it looks a slug up
 * in the ten fixture records, finds nothing for a served lease, and returns
 * whatever sits either side of index -1. That is how the arrows on a real
 * lease came to point at two fixture leases with nothing on screen to show it.
 */

/** How many of the record's leases the ranking card draws. 782 hairlines is
 *  not a chart; the card's own sentences still count the whole record. */
const BARS = 10;

export interface RecordContext {
  bars: RecordBar[];
  neighbours?: { previous: LeaseStep; next: LeaseStep };
}

function step(entry: LeasePickerEntry): LeaseStep {
  return {
    href: leaseReportPath(leaseRouteSlug(entry.id, entry.number, entry.name)),
    name: entry.name,
    number: entry.number,
  };
}

export function recordContext(
  record: LeasePickerEntry[],
  slug: string,
): RecordContext {
  const at = record.findIndex(
    (entry) => leaseRouteSlug(entry.id, entry.number, entry.name) === slug,
  );

  const neighbours =
    at >= 0 && record.length > 1
      ? {
          previous: step(record[(at - 1 + record.length) % record.length]),
          next: step(record[(at + 1) % record.length]),
        }
      : undefined;

  const bars = [...record]
    .sort((a, b) => b.value - a.value)
    .slice(0, BARS)
    .map((entry) => ({
      slug: leaseRouteSlug(entry.id, entry.number, entry.name),
      /* The number is the label the bars print, and the name stands in for the
         units filed without one — the fixture's own rule. */
      label: entry.number ?? entry.name,
      value: entry.value,
    }));

  return { bars, neighbours };
}
