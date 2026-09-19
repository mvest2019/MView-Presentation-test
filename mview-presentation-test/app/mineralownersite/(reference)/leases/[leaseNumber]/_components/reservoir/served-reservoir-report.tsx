"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "../../../../../_components/ui/card";
import {
  fetchLeaseReservoirs,
  LeasesApiError,
  type WireReservoirs,
} from "../../../_api/leases-api";
import type { LeaseRecord } from "../../../_lib/lease-types";
import type { ReservoirReport } from "../../_lib/reservoir-report";
import { ReportSkeleton } from "../report-skeleton";
import {
  pickReservoir,
  reservoirReportFromApi,
} from "../../_lib/reservoir-report-from-api";
import { ReservoirChartCard } from "./reservoir-chart-card";
import { ReservoirMapCard } from "./reservoir-map-card";
import { ReservoirOverviewHeader } from "./reservoir-overview-header";
import { ReservoirTiles } from "./reservoir-tiles";
import { RockItselfCard } from "./rock-itself-card";
import { RockLeftCard } from "./rock-left-card";
import { WellsTableCard } from "./wells-table-card";

/**
 * THE RESERVOIR REPORT, FETCHED FROM THE BROWSER.
 *
 * ── ONE CALL, ON OPENING THE TAB ──
 *
 * `GET /api/leases/reservoirs?id=…&reservoir_key=…`. It runs when this
 * component mounts, and this component only mounts when the reader is on the
 * Reservoir tab — the tab strip is a set of links with `?report=reservoir`, so
 * arriving here IS the click. Nothing is fetched for a reader who never opens
 * it, which matters because the payload runs to 109KB on a lease with 138
 * wells.
 *
 * ── THE KEY IS PASSED WHEN THERE IS ONE ──
 *
 * The lease report names the reservoir in its own payload, and that name is the
 * key. Some leases carry no name for it — `08_04406` has three reservoirs and
 * the first is `null` — so the key is optional here: without it the service
 * returns every reservoir on the lease and `pickReservoir` takes the first,
 * which is the one the tab strip already names. Asking for everything is a
 * correct answer to "which rock is this"; guessing a key is not.
 *
 * ── IT SHARES THE SEVEN CARDS WITH THE FIXTURE PATH ──
 *
 * `ReservoirReportView` renders the same seven components from
 * `buildReservoirReport`. Both produce one `ReservoirReport`, so neither source
 * owns any layout. See `reservoir-report-from-api.ts`.
 *
 * THE SERVICE'S OWN SENTENCES about the rock ride on `ReservoirReport.insights`
 * and are printed by `RockItselfCard`, in the right-hand column beside the
 * figures they are about. They were a card of their own at the foot of this
 * page for a day: below the map, six cards away from the record they describe,
 * and repeating a column of locally composed prose that said the same things.
 * One column, one set of sentences, next to the figures.
 */

export function ServedReservoirReport({
  id,
  reservoirKey,
  preloaded,
  lease,
}: {
  /** The service's lease key, straight off the route — `08_46924`. */
  id: string;
  /** The reservoir's name as the lease report gave it, when it gave one. */
  reservoirKey?: string | null;
  /**
   * The payload, when the caller already started the read.
   *
   * WHY THIS EXISTS. This component mounts inside the lease report's body, so
   * it could not begin its own read until the LEASE read had finished — two
   * slow calls end to end, and a cold lease is over two minutes on its own. The
   * caller now fires both at once and hands the answer down. A promise rather
   * than a value, because the caller has one before it has the other and should
   * not hold the page back to wait for it.
   *
   * `null` means the caller did not start one and this component should.
   */
  preloaded?: Promise<WireReservoirs> | null;
  /**
   * The lease, from the lease report this tab is rendered inside.
   *
   * The reservoir call answers about the rock and says nothing about the lease
   * beyond its id, so the header's county, operator, acreage and interest come
   * from the call that owns them. See `reservoirReportFromApi`.
   */
  lease: LeaseRecord;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; report: ReservoirReport }
    | { status: "none" }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    /* The caller's read when there is one, ours when there is not. A preloaded
       promise carries the caller's own abort signal, not this one — which is
       correct: the caller started it and the caller's unmount ends it. */
    const pending =
      preloaded ?? fetchLeaseReservoirs(id, reservoirKey, controller.signal);

    let live = true;
    controller.signal.addEventListener("abort", () => {
      live = false;
    });

    pending
      .then((wire) => {
        if (!live) return;
        const reservoir = pickReservoir(wire, reservoirKey);

        /* NO RESERVOIR IS AN ANSWER. A lease whose wells the state has never
           tied to a named rock returns an empty array, and that is a fact
           about the filings rather than a failure of the read.

           IT USED TO ALSO REQUIRE `wire.lease`, WHICH THIS ENDPOINT HAS NEVER
           SENT. Every successful response therefore fell through to "no named
           reservoir on this lease" — a sentence about the STATE'S filings —
           while the payload sat in the network panel with the rock named in it.
           An empty `reservoirs` array is the only thing that means what that
           notice says. */
        if (!reservoir) {
          setState({ status: "none" });
          return;
        }

        const report = reservoirReportFromApi(wire, reservoir, lease);

        /* Both sides of the mapping, for `scripts/check-lease-binding.js`.
           Dev only — the constant fold strips it from the production bundle. */
        if (process.env.NODE_ENV !== "production") {
          Object.assign(window, {
            __reservoirWire: wire,
            __reservoirReport: report,
          });
        }

        setState({ status: "ready", report });
      })
      .catch((error: unknown) => {
        /* Our own unmount, not an outage — see `request`. */
        if (!live || controller.signal.aborted) return;
        setState({
          status: "error",
          message:
            error instanceof LeasesApiError
              ? error.message
              : "This reservoir report could not be loaded.",
        });
      });

    return () => controller.abort();
  }, [id, reservoirKey, preloaded, lease]);

  if (state.status === "loading") {
    return (
      <ReportSkeleton what={`Reading the reservoir behind lease ${id}…`} />
    );
  }

  if (state.status === "none") {
    return (
      <Notice heading="No named reservoir on this lease">
        The state has not tied this lease&rsquo;s wells to a named reservoir, so
        there is no rock to report on. The lease report itself is unaffected.
      </Notice>
    );
  }

  if (state.status === "error") {
    return (
      <Notice heading="This reservoir report could not be loaded">
        {state.message} Nothing is wrong with the reservoir — this is the read,
        not the record. Refresh to try again.
      </Notice>
    );
  }

  const { report } = state;

  return (
    <div>
      <ReservoirOverviewHeader report={report} />
      <ReservoirTiles report={report} />
      <RockLeftCard report={report} />
      <RockItselfCard report={report} />
      <ReservoirChartCard report={report} />
      <WellsTableCard report={report} />
      <ReservoirMapCard report={report} />
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
