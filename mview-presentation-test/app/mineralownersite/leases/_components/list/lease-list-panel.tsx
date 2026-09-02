"use client";

import { useMemo, useState } from "react";

import { Badge } from "../../../_components/ui/badge";
import { Notice } from "../../../_components/ui/notice";
import { gates } from "../../../_components/ui/portal-gating";
import {
  defaultLeaseSort,
  selectLeases,
  type LeaseSortKey,
} from "../../_lib/lease-sorting";
import type { LeaseRecord } from "../../_lib/lease-types";
import { LeaseGrid } from "./lease-grid";
import { WORTH_A_LOOK_RATIO } from "./lease-value-cell";
import { LeaseTable } from "./lease-table";
import { LeaseToolbar, type LeaseView } from "./lease-toolbar";
import { useLeasePicker } from "./use-lease-picker";

/**
 * THE "MY LEASES" TAB — the toolbar, and whichever view it points at.
 *
 * ── THE ONLY STATEFUL COMPONENT IN THE PANEL, ON PURPOSE ──
 *
 * Three pieces of state live here and nowhere else: the sort key, the search
 * query and the chosen view. The toolbar is controlled, the table and the grid
 * take a finished array, and the derivation between them is one `useMemo` over
 * pure functions from `lease-sorting.ts`.
 *
 * That is what makes the two views incapable of disagreeing — there is one list
 * and both render it — and it is why sorting and searching are testable without
 * a browser: `selectLeases` is a function of its arguments.
 *
 * ── WHY THIS IS A CLIENT COMPONENT AND THE REST OF THE PAGE IS NOT ──
 *
 * Sorting and filtering are instant, local reactions to a keystroke. Routing
 * them through the server as `?sort=`/`?q=` search params would put a network
 * round-trip between typing a letter and seeing the table narrow, and it would
 * rewrite the URL the portal's own `?state=` and `?view=` params live in.
 *
 * The cost is that the ten records cross into the client bundle. That is the
 * right trade here — it is a fixture measured in single-digit kilobytes, and the
 * page's other nine sections stay server-rendered. If the record ever holds
 * hundreds of leases, this is the component that changes: `selectLeases` moves
 * behind a server call and the toolbar debounces into it. Nothing else on the
 * page has to know.
 *
 * `useMemo` HERE IS NOT DECORATION. Every keystroke re-runs this component;
 * without it, a sort and a filter over the full record run again on each one,
 * and both views re-render from a new array identity even when the result is
 * identical.
 */
export function LeaseListPanel({ leases }: { leases: LeaseRecord[] }) {
  const [sort, setSort] = useState<LeaseSortKey>(defaultLeaseSort);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<LeaseView>("list");

  /* Shared with the Financials tab's annual table — see `useLeasePicker`. */
  const { picker, lockNotice } = useLeasePicker();

  const visible = useMemo(
    () => selectLeases(leases, { sort, query }),
    [leases, sort, query],
  );

  const searching = query.trim().length > 0;

  return (
    <div>
      <div className={gates("hideInEssentials")}>
        <LeaseToolbar
          sort={sort}
          onSortChange={setSort}
          query={query}
          onQueryChange={setQuery}
          view={view}
          onViewChange={setView}
          shown={visible.length}
          total={leases.length}
        />

        {/*
          NO STANDING EXPLANATION HERE, and that was a mistake to add.

          The one-lease rule is already stated — in the funnel bar pinned above
          every portal page, which in this state reads "One lease stays fully
          live — you can change which one once every 7 days. Your other 9 leases
          and their values are on hold, and nothing has been deleted." A banner
          here repeated it almost word for word, six inches lower, on the one
          screen where the reader can already see the rule operating in the
          table. The design's own line on this: a fact stated twice is not
          emphasis, it is noise.

          What DOES belong here is the refusal below — it is new information,
          caused by a click, and it has to appear beside the button that was
          clicked.
        */}
        {lockNotice && (
          <div
            role="status"
            className="mb-2.5 rounded-mv border border-mv-portal-gold/40 bg-mv-sand-tint p-3 text-[12.5px] font-semibold text-mv-amber"
          >
            {lockNotice}
          </div>
        )}

        {view === "grid" ? (
          <LeaseGrid leases={visible} />
        ) : (
          <LeaseTable
            leases={visible}
            showTotals={!searching}
            picker={picker}
          />
        )}

        {/*
          UNDER BOTH VIEWS, which is where the design puts it: a sibling of the
          table, gated only by `hide-s`. It used to live inside `LeaseTable`, so
          switching to Grid took the footnote with it and left a gap — the note
          about the week-over-week delta being an honest 0 rather than an invented
          number applies to the record, not to the table.

          THE FIRST SENTENCE IS NOT THE DESIGN'S. Its version reads "Click any row
          to open the full lease report", which was true when the `<tr>` carried an
          `onclick`. These rows do not: the lease name, the "Lease Report →" line
          and the Open button are real links, and in Grid the whole card is one. So
          the sentence describes what a reader can actually do.
        */}
        <p className="mt-1.5 text-[10px] text-mv-muted">
          Open any lease for its full report — Lease · Reservoir · Wells.
          Week-over-week change is 0.0% this week (the day-over-day delta
          isn&apos;t connected yet — shown as 0 rather than invented).
        </p>

        <div className="mt-3.5 grid gap-[18px]">
          {/* The report-stack notice used to sit here and is now a sibling of the
              tab strip — the design leaves it ungated while this next one takes
              `hide-s`, and a descendant cannot escape its parent's
              `display:none`. See `report-stack-notice.tsx`. */}

          {/* SOURCE · Mineral_Owners_Data.Apprised_Value · calibration study
              2026-07-04 (3.67M matched pairs). This is the notice the "Worth a
              look" flag points back to — see `lease-value-cell.tsx`. */}
          <Notice tone="slate" glyph="⚖">
            <strong>Two honest numbers, on purpose.</strong> Our estimate is a
            forward market cash-flow projection; the county&apos;s is a
            conservative annual tax value that lags about a year. Across 3.67
            million Texas leases we run about 1.9× the county median — a{" "}
            <strong>methodology difference, not an error</strong> (the gap ranges
            from 0.77× to 10× by county, so no single correction factor would be
            honest). Policy: <strong>we show both and flag big gaps</strong> — we
            never quietly rescale your MVestimate. Gaps of roughly{" "}
            {WORTH_A_LOOK_RATIO}× or more get a{" "}
            <Badge tone="flag" size="xs">
              Worth a look
            </Badge>{" "}
            flag.{" "}
            <strong>
              To be clear: this flag is not a warning about your money.
            </strong>{" "}
            It usually means our forward projection sees more value than the
            county&apos;s lagging tax roll — potential upside worth understanding —
            not an error and not something wrong with your lease. Open the lease
            to see why the two numbers differ.
          </Notice>
        </div>
      </div>
    </div>
  );
}
