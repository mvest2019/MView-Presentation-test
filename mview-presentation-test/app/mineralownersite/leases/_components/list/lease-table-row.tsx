import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { PortalButtonLink } from "../../../_components/ui/button";
import { PrototypeButton } from "../../../_components/ui/prototype-button";
import { gates, portalGate } from "../../../_components/ui/portal-gating";
import { TableCell, TableRow } from "../../../_components/ui/table";
import {
  formatCount,
  formatCountyAcres,
  formatDecimalInterest,
  formatLeaseTitle,
  formatWeekChange,
} from "../../_lib/lease-format";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { LeaseRecord } from "../../_lib/lease-types";
import { LeaseCountyValueCell, LeaseEstimateCell } from "./lease-value-cell";

/**
 * ONE ROW OF THE LEASE TABLE — sixteen columns, five of them Professional-only.
 *
 * ── WHY THE WHOLE ROW IS NOT A CLICK TARGET ──
 *
 * The prototype put `onclick="location.hash='…'"` on the `<tr>` and then had to
 * put `event.stopPropagation()` on all four links inside it. That row was
 * unreachable by keyboard, invisible to assistive technology as a link, and
 * could not be opened in a new tab — and a `<tr>` cannot legally contain an
 * `<a>` wrapping every cell, so there is no direct HTML fix.
 *
 * What replaced it: THREE real links to the same place, in the places a reader
 * actually aims for — the lease name, the "Lease Report →" line beneath it, and
 * the Open button at the end of the row. All three are keyboard-reachable,
 * middle-clickable and announced as links. The row keeps its hover as an
 * affordance hint but not as the mechanism.
 *
 * ── THE PROFESSIONAL COLUMNS ──
 *
 * Field, API, RRC district and the week delta carry `tier-p`. They are the
 * columns a mineral professional reconciles against a filing and a family owner
 * never looks at, and hiding them is what keeps the table at 1120px instead of
 * 1400px for everyone else.
 *
 * ── THE LAST CELL HOLDS TWO CONTROLS ──
 *
 * `Open`, which works, and the design's ◈ "show on map" ghost button, which is
 * rendered inert because the OWNER map is not built. See the note at the cell
 * itself for why it is not pointed at `/map-explorer` instead. Give it an `href`
 * when `app-map` lands.
 */
export function LeaseTableRow({
  lease,
  picker,
}: {
  lease: LeaseRecord;
  /**
   * THE LAPSED LEASE PICKER, when the account is in that state — otherwise
   * undefined and none of it renders. See `_lib/active-lease.ts`.
   */
  picker?: {
    /** True for the one lease keeping its real figures. */
    active: boolean;
    onPick: (leaseNumber: string) => void;
  };
}) {
  const title = formatLeaseTitle(lease.name, lease.number);
  const href = leaseReportPath(lease.number);

  return (
    <TableRow
      interactive
      /* `portal.css` does the rest: the active row goes cream and keeps its
         figures sharp, a locked row blurs every cell EXCEPT the first — the name
         is never withheld, only the value. */
      className={
        picker ? (picker.active ? "lp-active" : "lp-locked") : undefined
      }
    >
      <TableCell>
        <Link href={href} className="font-bold text-mv-green-deep">
          {title}
        </Link>{" "}
        <Badge tone={lease.status === "producing" ? "mint" : "slate"} size="xs">
          {lease.status === "producing" ? "Producing" : "Inactive"}
        </Badge>
        {picker?.active && <span className="lp-activetag">LIVE</span>}
        <span className="mt-0.5 block text-[11px] text-mv-muted">
          {lease.detail}
        </span>
        <Link
          href={href}
          className="mt-[3px] block text-[11px] font-bold text-mv-green-deep"
        >
          Lease Report →
        </Link>
        {picker && !picker.active && (
          <button
            type="button"
            className="lp-lockbtn"
            onClick={() => picker.onPick(lease.number)}
          >
            <span aria-hidden="true">🔒 </span>Make this live
          </button>
        )}
      </TableCell>

      {/*
        THE CLAIMED GATE, ON THE WHOLE CELL. The prototype gates this column with
        `body.state-claimed #lsMainWrap tbody td.mv-cell` — the column IS the
        decision there, because marking sixty money cells by hand in HTML is how
        one gets missed. In React the cell is a component, so `cl-lock` here is
        the same decision expressed once, and it lands on all ten rows including
        the three showing a county fallback.
      */}
      <TableCell numeric className={portalGate.lockedValue}>
        <LeaseEstimateCell lease={lease} />
      </TableCell>

      <TableCell numeric>
        <LeaseCountyValueCell lease={lease} />
      </TableCell>

      <TableCell numeric className={`text-[10px] text-mv-muted ${gates("professionalOnly")}`}>
        {formatWeekChange(lease.weekChangePercent)}
      </TableCell>

      <TableCell>{formatCountyAcres(lease.county, lease.acres)}</TableCell>
      <TableCell>{lease.operator}</TableCell>
      <TableCell>{lease.play}</TableCell>

      <TableCell className={gates("professionalOnly")}>{lease.field}</TableCell>
      <TableCell numeric className={gates("professionalOnly")}>
        {lease.api}
      </TableCell>
      <TableCell numeric className={gates("professionalOnly")}>
        {lease.district}
      </TableCell>

      <TableCell numeric>{lease.wells}</TableCell>
      <TableCell numeric>
        {formatDecimalInterest(lease.decimalInterest)}
      </TableCell>
      <TableCell numeric>{formatCount(lease.production.gasMcf)}</TableCell>
      <TableCell numeric>{formatCount(lease.production.oilBbl)}</TableCell>
      <TableCell numeric>{lease.production.threeMonthBoe}</TableCell>

      <TableCell className="whitespace-nowrap">
        <PortalButtonLink variant="primary" size="sm" href={href}>
          Open
        </PortalButtonLink>{" "}
        {/*
          THE SECOND, GHOST BUTTON — "show on map", enabled like the design's.

          It points at the OWNER map, which is not built here, so it uses the
          prototype's own acknowledgement idiom rather than rendering greyed —
          see `PrototypeButton`. The glyph alone says nothing to a screen reader,
          hence the label naming the lease.
        */}
        <PrototypeButton
          acknowledgement="◈ Map opens here ✓"
          title={`Show ${title} on the map`}
        >
          ◈
        </PrototypeButton>
      </TableCell>
    </TableRow>
  );
}
