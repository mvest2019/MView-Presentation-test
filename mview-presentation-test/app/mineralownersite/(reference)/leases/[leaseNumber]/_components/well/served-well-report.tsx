"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "../../../../../_components/ui/card";
import { fetchLeaseWells, LeasesApiError } from "../../../_api/leases-api";
import type { WellReport } from "../../_lib/well-report";
import { pickWell, wellReportFromApi } from "../../_lib/well-report-from-api";
import { AttachmentsCard, FilingsCard } from "./filings-card";
import { WellChartCard } from "./well-chart-card";
import { WellMapCard } from "./well-map-card";
import { WellOverviewHeader } from "./well-overview-header";
import { WellTiles } from "./well-tiles";
import { WellboreCard } from "./wellbore-card";

/**
 * ONE WELL'S REPORT, FETCHED FROM THE BROWSER.
 *
 * ── ONE CALL, ON OPENING THE TAB ──
 *
 * `GET /api/leases/wells?id=…&api10=…`. It runs when this component mounts, and
 * this only mounts on the well tab — the strip is links carrying
 * `?report=wells`, so arriving here is the click.
 *
 * ── WHICH WELL, WHEN THE URL DOES NOT SAY ──
 *
 * A lease has as many wells as it has; this one has 138. Without an `api10` the
 * service returns the first page and `pickWell` takes the first of them, which
 * is the well the lease report's own roster leads with. The picker that would
 * let a reader choose another is the obvious next step and is NOT built here —
 * `picker[]` arrives with every response, so the list is already in hand.
 *
 * ── IT SHARES THE SEVEN CARDS WITH THE FIXTURE PATH ──
 *
 * `WellReportView` renders the same seven from `buildWellReport`. Both produce
 * one `WellReport`, so neither source owns any layout.
 */

export function ServedWellReport({
  id,
  api10,
}: {
  /** The service's lease key, straight off the route — `08_46924`. */
  id: string;
  /** A particular well, when something chose one. */
  api10?: string | null;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; report: WellReport; note: string; insights: string[] }
    | { status: "none" }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetchLeaseWells(id, api10, controller.signal)
      .then((wire) => {
        if (controller.signal.aborted) return;
        const well = pickWell(wire, api10);

        /* NO WELL IS AN ANSWER. A lease the state holds no wellbore for returns
           an empty list, and that is a fact about the filings rather than a
           failed read. */
        if (!well) {
          setState({ status: "none" });
          return;
        }

        const report = wellReportFromApi(wire, well);

        if (process.env.NODE_ENV !== "production") {
          Object.assign(window, { __wellWire: wire, __wellReport: report });
        }

        setState({
          status: "ready",
          report,
          note: well.note ?? "",
          insights: Array.isArray(well.insights) ? well.insights : [],
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof LeasesApiError
              ? error.message
              : "This well report could not be loaded.",
        });
      });

    return () => controller.abort();
  }, [id, api10]);

  if (state.status === "loading") {
    return (
      <Card accent padded={false} className="mt-4 px-[22px] py-[18px]">
        <h2 className="text-[15px] font-bold">Reading the wells on {id}…</h2>
        <p className="mt-1.5 text-[12.5px] leading-[1.6] text-mv-muted">
          The hole, every filing the state holds on it, and where it sits. The
          first read of a lease can take a minute while the service builds it;
          every read after that is instant.
        </p>
        <div
          aria-hidden="true"
          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-mv-line"
        >
          <div className="h-full w-1/3 animate-pulse rounded-full bg-mv-green-deep" />
        </div>
      </Card>
    );
  }

  if (state.status === "none") {
    return (
      <Notice heading="No wells filed on this lease">
        The state holds no wellbore against this lease, so there is nothing to
        report on. The lease report itself is unaffected.
      </Notice>
    );
  }

  if (state.status === "error") {
    return (
      <Notice heading="This well report could not be loaded">
        {state.message} Nothing is wrong with the well — this is the read, not
        the record. Refresh to try again.
      </Notice>
    );
  }

  const { report, note, insights } = state;

  return (
    <div>
      <WellOverviewHeader report={report} />

      {/* WHY THE FIGURES BELOW MAY ALL BE ZERO, in the service's own words. A
          wellbore the allocation store has no row for has real paperwork and
          real depths and no production split out from the lease total — which
          looks like a dead well unless something says otherwise. */}
      {note && (
        <Card accent padded={false} className="mt-4 px-[22px] py-[18px]">
          <p className="text-[12.5px] leading-[1.6] text-mv-slate">{note}</p>
        </Card>
      )}

      <WellTiles report={report} />
      <WellboreCard report={report} />
      <WellChartCard report={report} />
      <FilingsCard report={report} />
      <WellMapCard report={report} />
      <AttachmentsCard report={report} />

      {insights.length > 0 && (
        <Card padded={false} className="mt-4 px-[22px] py-[18px]">
          <h3 className="text-[15px] font-bold">
            What the record says about this well
          </h3>
          <ul className="mt-3 divide-y divide-mv-line">
            {insights.map((line, position) => (
              <li
                key={position}
                className="flex items-start gap-3 py-2.5 text-[13px] leading-[1.6] text-mv-slate"
              >
                <span
                  aria-hidden="true"
                  className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-mv-green"
                />
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Notice({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Card accent padded={false} className="mt-4 px-[22px] py-[18px]">
      <h2 className="text-[15px] font-bold">{heading}</h2>
      <p className="mt-1.5 text-[12.5px] leading-[1.6] text-mv-muted">
        {children}{" "}
        <Link
          href="/mineralownersite/leases"
          className="font-semibold text-mv-green-deep underline"
        >
          Back to My Leases
        </Link>
        .
      </p>
    </Card>
  );
}
