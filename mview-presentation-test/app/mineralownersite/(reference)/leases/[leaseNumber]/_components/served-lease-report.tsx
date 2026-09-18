"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Card } from "../../../../_components/ui/card";
import {
  fetchLeasePicker,
  fetchLeaseReport,
  fetchLeaseMap,
  fetchLeaseReservoirs,
  LeasesApiError,
  type LeasePickerList,
  type WireLeaseMap,
  type WireLeaseReport,
  type WireReservoirs,
} from "../../_api/leases-api";
import { leaseMapFromApi, type LeaseMapData } from "../_lib/lease-map-from-api";
import { leaseReportFromApi } from "../_lib/lease-report-from-api";
import { recordContext } from "../_lib/record-context";
import { LeaseReportBody } from "./report-body";
import { ReportSkeleton } from "./report-skeleton";
import { ServedReservoirReport } from "./reservoir/served-reservoir-report";
import { ServedWellReport } from "./well/served-well-report";
import type { LeaseReportTab } from "./report-tabs";

/**
 * ONE LEASE'S REPORT, FETCHED FROM THE BROWSER.
 *
 * ── WHY IT IS FETCHED HERE AND NOT ON THE SERVER ──
 *
 * It was read on the server, which made the page arrive complete but put the
 * call outside DevTools entirely: the Network tab showed a 265KB document row
 * and no lease request, so its status, size and timing could only be found in a
 * terminal. A call you cannot watch is a call you cannot debug, and this is the
 * call the module exists for. It now appears as
 * `lease?id=02_269507`, beside `picker`, with everything the tab shows for it.
 *
 * `member_id` STILL NEVER TOUCHES THE BROWSER. Both calls go through
 * `/api/leases/…`, which injects it from the httpOnly session cookie over
 * anything a caller sends — see the forwarder. The page asks for a lease by id;
 * whose record it is read against is not its decision.
 *
 * ── TWO CALLS, IN PARALLEL, AND ONLY ONE OF THEM IS REQUIRED ──
 *
 * The report is the page. The picker is the ranking card's bars and the
 * header's previous/next arrows, and if it fails the page is still the lease —
 * so it resolves to an empty record rather than taking the page down with it.
 * They go together rather than in sequence because neither needs the other's
 * answer, and the report is the slow one.
 *
 * ── THE FIRST READ OF A COLD LEASE IS SLOW ──
 *
 * Over two minutes when the service has nothing built for that lease, under a
 * second on every read after. That is the other half of the argument for
 * fetching here: a reader watches a loading card rather than a blank tab, and
 * can leave.
 */

export function ServedLeaseReport({
  id,
  tab: initialTab,
}: {
  /** The service's key, straight off the route — `02_269507`. */
  id: string;
  /** Which report the URL asked for. The strip takes it from here. */
  tab: LeaseReportTab;
}) {
  /*
   * ── WHICH REPORT IS SHOWING IS HELD HERE, NOT ON THE SERVER ──
   *
   * It arrives from the server on the first render, because `?report=` has to
   * work as a link, and after that the strip sets it directly.
   *
   * WHY IT IS NOT LEFT AS A SERVER NAVIGATION. This page is `force-dynamic`,
   * so a `?report=` change re-ran the whole route — and the first thing the
   * route awaits is the owner payload the CHROME needs: three upstream reads
   * in parallel, 10 MB, 0.4 MB and 64 MB, the last of them twenty-one seconds.
   * None of it differs between the three reports; it is the same header, the
   * same value band, the same facts strip. So a reader pressing "Well report"
   * waited twenty seconds to be handed the page they were already on, and only
   * then did the well's own read begin.
   *
   * Everything that actually differs between the three is already decided in
   * this component, in the browser. The switch is now free, and the tab's own
   * data loads under a skeleton the way any other read on this page does.
   */
  const [tab, setTab] = useState(initialTab);

  /* THE URL IS THE OTHER HALF OF THE STRIP. `ReportTabs` pushes an entry when
     it switches, so Back and Forward move between the three reports without
     touching the server either — and this is what hears them. It also catches
     a `?report=` that changed for any other reason. */
  useEffect(() => {
    const sync = () => {
      const asked = new URLSearchParams(window.location.search).get("report");
      setTab(asked === "reservoir" || asked === "wells" ? asked : "lease");
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  /* A LINK FROM SOMEWHERE ELSE TO A DIFFERENT REPORT ON THIS LEASE is still a
     server render, and React keeps this component mounted through it — so
     without this the strip would go on showing whichever report the reader was
     on before. Adjusted during render rather than in an effect: React's own
     pattern for state that has to follow a prop, and it re-renders before
     anything is painted instead of showing the wrong tab for a frame. */
  const [lastAsked, setLastAsked] = useState(initialTab);
  if (initialTab !== lastAsked) {
    setLastAsked(initialTab);
    setTab(initialTab);
  }
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; wire: WireLeaseReport }
    | { status: "not-held" }
    | { status: "error"; message: string }
  >({ status: "loading" });

  /* ── THE RESERVOIR READ STARTS NOW, NOT WHEN ITS CARD MOUNTS ──
     `ServedReservoirReport` lives inside the lease report's body, so it could
     not ask for anything until the LEASE had answered: two slow reads end to
     end, and a cold lease is over two minutes by itself. Firing it here puts
     the two side by side.

     NO `reservoir_key`, because the key is the reservoir's name and the name
     arrives with the lease — which is the very thing we are refusing to wait
     for. Unkeyed, the service returns every reservoir on the lease and
     `pickReservoir` takes the first, which is the one the tab strip names.

     ONLY ON THAT TAB. A reader on the lease report never opens it, and this is
     a 109KB read on a lease with 138 wells.

     `useMemo` AND NOT AN EFFECT: the promise has to survive the re-render that
     the lease's own answer causes, and it must not be a new promise each time —
     it is a prop, and a new one every render would restart the read. */
  const reservoirs = useMemo<Promise<WireReservoirs> | null>(() => {
    if (tab !== "reservoir") return null;

    const pending = fetchLeaseReservoirs(id);
    /* A NO-OP CATCH, SO THE REJECTION IS ALWAYS CLAIMED.
       This promise is created here but awaited in a component that has not
       mounted yet, and may never mount — the lease read can fail first, or the
       reader can leave the tab. A rejected promise nobody has attached a
       handler to is an unhandled rejection: it crossed the dev overlay as a
       thrown `LeasesApiError` with no page behind it, which reads as the app
       falling over when the only thing that happened is a slow service.

       It does NOT swallow the failure. `.catch` returns a new promise and the
       original is what is handed down, so the consumer's own handler still
       sees the rejection and still shows its error card. */
    pending.catch(() => {});
    return pending;
  }, [id, tab]);

  /* ── WHERE THE WELLS ARE: THE LEASE TAB'S CALL, AND NO OTHER TAB'S ──
     112KB of coordinates and survey grades on a lease with 138 holes. Only
     `WellsMapCard` reads it and that card exists only on the lease report, so
     a reader who opens the reservoir or the well tab never pays for it. Fired
     here rather than inside the card for the same reason as the reservoir
     read: the card cannot ask until the lease has answered, and that made two
     slow calls into one queue.

     The no-op catch keeps an unconsumed rejection from surfacing as an
     unhandled one — see the reservoir promise below. */
  const leaseMapWire = useMemo<Promise<WireLeaseMap> | null>(() => {
    if (tab !== "lease") return null;
    const pending = fetchLeaseMap(id);
    pending.catch(() => {});
    return pending;
  }, [id, tab]);

  const [leaseMap, setLeaseMap] = useState<LeaseMapData | null>(null);

  useEffect(() => {
    /* No promise means no lease tab, and the card that reads this is not on
       screen — so there is nothing to clear and nothing to wait for. Setting
       state here would be a synchronous set for a reader who never asked. */
    if (!leaseMapWire) return;

    let live = true;
    leaseMapWire
      .then((wire) => {
        if (live) setLeaseMap(leaseMapFromApi(wire));
      })
      /* THE MAP IS NOT THE PAGE. Every figure on the lease report comes from
         the report call; this one read only decides whether the map has pins
         in it. A failure leaves the card on its fixture fallback rather than
         taking the report down. */
      .catch(() => {
        if (live) setLeaseMap(null);
      });
    return () => {
      live = false;
    };
  }, [leaseMapWire]);

  /* ── THE PICKER DOES NOT HOLD THE PAGE ──
     These two were one `Promise.all`, and that made the RECORD read a
     dependency of the REPORT: a picker that took its full sixty seconds and
     then failed held a lease report that had answered in forty milliseconds,
     because `Promise.all` waits for every promise to settle whether its
     rejection is caught or not. The page sat on its loading card for a minute
     with the only call it actually needs already in hand.

     They are two reads now. The report decides whether there is a page; the
     picker decides whether that page has ranking bars and previous/next
     arrows, and it fills them in when it arrives. */
  const [picker, setPicker] = useState<LeasePickerList | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchLeaseReport(id, controller.signal)
      .then((wire) => {
        /* A body with no `lease` is not a report, whatever its status said. */
        if (!wire.lease) {
          setState({
            status: "error",
            message: "The leases service sent back something unreadable.",
          });
          return;
        }
        setState({ status: "ready", wire });
      })
      .catch((error: unknown) => {
        /* Our own unmount, not an outage — `request` re-throws the caller's
           abort untouched precisely so this can tell them apart. */
        if (controller.signal.aborted) return;

        /* THE SERVICE SAYING "not your lease" IS NOT AN OUTAGE. It is the
           backend answering correctly, and an error card would invite a retry
           that can never succeed. */
        if (
          error instanceof LeasesApiError &&
          error.code === "LEASES_LEASE_NOT_HELD"
        ) {
          setState({ status: "not-held" });
          return;
        }

        setState({
          status: "error",
          message:
            error instanceof LeasesApiError
              ? error.message
              : "This lease report could not be loaded.",
        });
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    fetchLeasePicker(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setPicker(list);
      })
      /* A missing record costs the bars and the arrows. It does not cost the
         page, so it is not reported. */
      .catch(() => {});

    return () => controller.abort();
  }, [id]);

  /* The report, once both are in hand — and once the LEASE is in hand, with
     whatever the picker has managed so far. Re-derived rather than stored, so
     the bars appear the moment the record lands without the report being
     built twice from two different places. */
  const report = useMemo(() => {
    if (state.status !== "ready") return null;

    const wire = state.wire;
    const slug = wire.lease?.lease_id ?? id;
    const { bars, neighbours } = picker
      ? recordContext(picker.leases, slug)
      : { bars: [], neighbours: undefined };

    const built = leaseReportFromApi(wire, bars, neighbours);

    /* ── BOTH SIDES OF THE MAPPING, ON `window`, IN DEV ONLY ──
       `scripts/check-lease-binding.js` compares them field by field: the
       service's answer against what the page decided it means. Checking a
       binding by reading numbers off the screen cannot tell a wrong SOURCE
       from a right one — two fields on this payload are often close enough to
       look plausible — and it cannot check the sixty figures that are not on
       screen at the current density at all. Stripped from the production
       bundle by the constant fold on `NODE_ENV`. */
    if (process.env.NODE_ENV !== "production") {
      Object.assign(window, { __leaseWire: wire, __leaseReport: built });
    }

    return built;
  }, [state, picker, id]);

  if (state.status === "loading") return <ReportLoading id={id} />;

  if (state.status === "not-held") {
    return (
      <Notice heading="That lease is not on your record">
        The leases service does not hold lease <strong>{id}</strong> against
        your owner record. The link may be old, or the record may have changed.
      </Notice>
    );
  }

  if (state.status === "error") {
    return (
      <Notice heading="This lease report could not be loaded">
        {state.message} Nothing is wrong with the lease — this is the read, not
        the record. Refresh to try again.
      </Notice>
    );
  }

  /* THE RESERVOIR TAB IS ITS OWN READ. It is not part of the lease payload —
     `/leases/reservoirs` is a separate call — and it is made only when the
     reader is actually on that tab, which is what `tab` says. The key is the
     reservoir the lease report named; some leases name none, and the call
     copes. See `served-reservoir-report.tsx`. */
  if (!report) return <ReportLoading id={id} />;

  return (
    <LeaseReportBody
      report={report}
      tab={tab}
      onSelectTab={setTab}
      leaseMap={leaseMap ?? undefined}
      otherReport={
        tab === "wells" ? (
          <ServedWellReport id={id} />
        ) : tab === "reservoir" ? (
          <ServedReservoirReport
            id={id}
            /* The key is only used to PICK from what came back; the read itself
               was started unkeyed above. */
            reservoirKey={report.lease.reservoir || null}
            preloaded={reservoirs}
            lease={report.lease}
          />
        ) : null
      }
    />
  );
}

/**
 * WHAT A SLOW READ LOOKS LIKE.
 *
 * It names the lease it is waiting on, because the id is the one thing already
 * known — it came off the URL — and a loading card that cannot say what it is
 * loading is indistinguishable from a broken page. The warning about the first
 * read is there because two minutes with no explanation reads as a hang.
 */
function ReportLoading({ id }: { id: string }) {
  return <ReportSkeleton what={`Reading lease ${id}…`} />;
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
