"use client";

import {
  Check,
  ClipboardList,
  Copy,
  Crosshair,
  Drill,
  FileText,
  MapPin,
  Move,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { getWellPermitMap, type MapWellPermit } from "@/lib/map-api";

import { copyText } from "./copy-text";

import { AiSummary } from "./ai-summary";
import { permitFields } from "./permit-fields";
import { PermitDetailsTable } from "./permit-details-table";
import type { SelectedWell } from "./well-insights-panel";

/*
 * The permit filing for one well — what the summary shows when "Permit" is the
 * chosen record rather than "Completion".
 *
 * Every field on it comes from `/wells/{api}/permit` — the filing, the lease,
 * the operator, where it is and what is nearest to it. The county is the map's
 * own, because the permit record does not carry one.
 *
 * The written read underneath is generated from the same filing, through
 * `/api/permit-summary` — see that route for where the key lives.
 */

/*
 * What the cards read before the filing lands: the labels, and an em dash for
 * every value. The same reasoning as the completion side — the previous well's
 * figures would be worse than nothing.
 */
const LEASE_WELL_LABELS = ["Lease Name", "County", "District"];
const TYPE_LABELS = ["Well Type", "Direction", "New Permit"];
const PERMIT_LABELS = ["Filing Purpose", "Filing Type", "Permit Date"];
const OPERATOR_LABELS = ["Operator", "Field Name", "Reservoir", "Field No."];
const COORDINATE_LABELS = ["Surface", "Bottom-Hole"];
const NEAREST_LABELS = ["Distance", "Direction"];
const TABLE_LABELS = [
  "API Number",
  "Well No.",
  "Lease Name",
  "Status No.",
  "Permit Status",
  "Filing Purpose",
  "New Permit",
  "Permit Date",
  "Issued Date",
];

const blank = (labels: string[]) =>
  labels.map((label) => ({ label, value: "—" }));

export function PermitSummary({
  well,
  printRef,
  onReady,
}: {
  well: SelectedWell;
  /**
   * The filing itself, for the Export button in the header above.
   *
   * Held by the panel rather than printed from here, because the button that
   * prints it is not in this component — see `print-summary.ts`.
   */
  printRef?: React.Ref<HTMLDivElement>;
  /** Whether there is a filing worth printing. */
  onReady?: (ready: boolean) => void;
}) {
  /*
   * Four states, not three flags: waiting, a filing, no filing, or a failure.
   *
   * "No filing" is its own answer — the service returns 404 for a well with no
   * permit record, which most older wells have — and it must not be dressed up
   * as an error or as an empty filing.
   */
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; permit: MapWellPermit }
    | { kind: "none" }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    if (!well.api) return;

    let cancelled = false;

    getWellPermitMap(well.api)
      .then((answer) => {
        if (cancelled) return;
        setState(answer ? { kind: "ready", permit: answer } : { kind: "none" });
        onReady?.(answer !== null);
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        onReady?.(false);
        setState({
          kind: "error",
          message:
            failure instanceof Error
              ? failure.message
              : "Could not load this well's permit.",
        });
      });

    return () => {
      cancelled = true;
    };
    // `onReady` is the panel's own setter and stable across renders; listing it
    // would refetch the filing every time the panel re-rendered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [well.api]);

  const loading = state.kind === "loading";
  const fields =
    state.kind === "ready" ? permitFields(state.permit, well.county) : null;

  if (state.kind === "error") {
    return (
      <p
        role="alert"
        className="rounded-xl border border-[#f6c9c6] bg-mv-red-bg px-4 py-[11px] text-[12px] text-mv-red"
      >
        {state.message}
      </p>
    );
  }

  if (state.kind === "none") {
    return (
      <div className="rounded-xl border border-mv-line bg-white px-4 py-[22px] text-center">
        <p className="text-[13px] font-bold text-mv-ink">
          No permit on file for this well
        </p>
        <p className="mx-auto mt-[6px] max-w-[46ch] text-[12px] leading-snug text-mv-slate">
          The Commission holds no permit record against {well.api}. Wells
          drilled before permits were filed electronically often have only a
          completion record — that is on the Completion tab.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* The filing blurs behind one message while it is being fetched, as the
          completion record does. */}
      {/* The ref sits here, inside the veil rather than around it: the PDF is
          of the filing, not of the spinner that was over it. */}
      <div
        ref={printRef}
        aria-busy={loading}
        /* Its own container, as on the completion side: this sheet is
           captured 1280px wide whatever the window is, and a layout that asks
           the window instead lays a tablet's single column down the middle of
           it. */
        className={`@container ${
          loading ? "pointer-events-none select-none blur-[2px]" : ""
        }`}
      >
        {/* ---------------- identity strip ----------------
          The completion record's band, to the pixel: switching records changes
          what is being read, not the furniture around it. */}
        <div className="@container rounded-xl border border-[#cfe8da] bg-gradient-to-r from-[#eaf7ef] via-[#f2fbf5] to-[#e6f5ec] px-4 py-[14px]">
          <div className="flex items-center gap-4">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-[#bfe0cd] bg-white">
              <Drill
                size={19}
                strokeWidth={1.75}
                className="text-mv-green-deep"
                aria-hidden="true"
              />
            </span>

            {/* The completion band's grid, on the same terms. */}
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-5 gap-y-3 @min-[790px]:grid-cols-4">
              <Fact
                label="Well Number"
                value={fields?.header.wellNumber ?? well.well ?? "—"}
              />
              <Fact label="API Number" value={well.api} mono />
              <Fact
                label="Filing Purpose"
                value={fields?.header.filingPurpose ?? "—"}
              />
              <Fact
                label="Status"
                value={fields?.header.status ?? "—"}
                tone="green"
              />
            </div>
          </div>
        </div>

        {/*
          At tablet width the six cards below are one two-column flow, not two
          groups of their own: grouped, the third card of the first group had
          nothing to pair with and took a row to itself while the group under
          it started again. The two wrappers become `contents` at that width —
          they generate no box, so their cards become cells of this grid — and
          return to being groups where there is room for three across.
        */}
        <div className="mt-3 @2xl:grid @2xl:grid-cols-2 @2xl:gap-3 @4xl:block">
          {/* ---------------- three across ---------------- */}
          <div className="grid gap-3 @2xl:contents @4xl:grid @4xl:grid-cols-3">
            <Card icon={FileText} title="Lease & Well">
              <Rows rows={fields?.leaseWell ?? blank(LEASE_WELL_LABELS)} />
            </Card>
            <Card icon={Move} title="Well Type & Direction">
              <Rows rows={fields?.typeDirection ?? blank(TYPE_LABELS)} />
            </Card>
            <Card icon={ClipboardList} title="Permit Information">
              <Rows rows={fields?.permitInformation ?? blank(PERMIT_LABELS)} />
            </Card>
          </div>

          {/* ---------------- operator · coordinates · nearest ----------------
            Half and half: the operator card holds the longest values on the
            page — an operator name with its number, a field name with its own —
            and the two short cards stack in the other half rather than each
            taking a column of its own and leaving most of it empty. */}
          <div className="mt-3 grid gap-3 @2xl:contents @4xl:mt-3 @4xl:grid @4xl:grid-cols-2">
            <Card icon={UserRound} title="Operator, Field & Area">
              <Rows rows={fields?.operatorField ?? blank(OPERATOR_LABELS)} />
            </Card>

            {/* The two short cards share the operator card's half where there
                is room for three columns, and take a row of their own — one
                each — at the width where there are two. */}
            <div className="flex flex-col gap-3 @2xl:contents @4xl:flex">
              <Card icon={MapPin} title="Location Coordinates">
                <dl className="mt-[10px]">
                  {(fields?.coordinates ?? blank(COORDINATE_LABELS)).map(
                    (row) => (
                      <CoordinateRow
                        key={row.label}
                        label={row.label}
                        value={row.value}
                      />
                    ),
                  )}
                </dl>
              </Card>

              <Card icon={Crosshair} title="Nearest Well Context">
                <Rows rows={fields?.nearestWell ?? blank(NEAREST_LABELS)} />
              </Card>
            </div>
          </div>

          {/* ---------------- the filing itself, then the read on it -------
              Full width, both of them: the grid above pairs the six cards,
              and these two are not cards — one is a table that scrolls and
              the other a written page, and half a column is not enough for
              either. */}
          <div className="mt-3 @2xl:col-span-2">
            <PermitDetailsTable
              columns={fields?.table ?? blank(TABLE_LABELS)}
            />
          </div>

          {/* Written from the same filing the cards above draw, by way of
              `/api/permit-summary` — the key stays on the server. */}
          <div className="mt-3 @2xl:col-span-2">
            <AiSummary
              api={well.api}
              endpoint="/api/permit-summary"
              caption="written from this permit's own fields"
              loadingLabel="Reading the permit…"

              title={
                fields
                  ? `${fields.leaseWell[0].value} · ${fields.header.wellNumber}`
                  : well.api
              }
              context={
                fields
                  ? `${fields.header.status} ${fields.header.filingPurpose} permit · ${fields.operatorField[1].value} · ${fields.leaseWell[1].value} County`
                  : ""
              }
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 bg-white/40">
          <div className="sticky top-1/2 flex justify-center">
            <div className="flex items-center gap-[13px] rounded-full border border-mv-line bg-white px-[22px] py-[13px] shadow-mv-lg">
              <span
                aria-hidden="true"
                className="h-[20px] w-[20px] shrink-0 animate-spin rounded-full border-[3px] border-mv-line border-t-mv-green-deep"
              />
              <span className="text-[15px] font-semibold leading-none text-mv-slate">
                Loading this well&rsquo;s permit…
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function Fact({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "green";
}) {
  return (
    <div className="min-w-0 @min-[790px]:border-l @min-[790px]:border-[#cfe8da] @min-[790px]:pl-4 @min-[790px]:first-of-type:border-0 @min-[790px]:first-of-type:pl-0">
      <div className="text-[10.5px] leading-tight text-mv-muted">{label}</div>
      <div
        className={`mt-[3px] truncate text-[16px] font-bold leading-tight ${
          tone === "green" ? "text-mv-green-deep" : "text-mv-ink"
        } ${mono ? "font-mono tracking-tight" : ""}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  title,
  className = "",
  children,
}: {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      /* A page of the PDF may end at the foot of any card — as on the
         completion side, where guessing the depth instead cut a card in
         half. */
      data-page-block=""
      className={`rounded-xl border border-mv-line bg-white p-4 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={14}
          className="shrink-0 text-mv-green-deep"
          aria-hidden="true"
        />
        <h3 className="text-[12.5px] font-bold leading-none text-mv-ink">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Rows({
  rows,
  className = "",
}: {
  rows: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <dl className={`mt-[10px] ${className}`}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-3 py-[5px] text-[12px]"
        >
          <dt className="shrink-0 text-mv-muted">{row.label}</dt>
          <dd className="truncate text-right font-semibold text-mv-ink">
            {row.value || "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A coordinate pair, with the button that puts it on the clipboard. */
function CoordinateRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-3 py-[5px] text-[12px]">
      <dt className="shrink-0 text-mv-muted">{label}</dt>
      {/* A leader, as on a filing: the two ends are far apart and the eye needs
          taking across. */}
      <span
        aria-hidden="true"
        className="min-w-0 flex-1 border-b border-dashed border-mv-line"
      />
      <dd className="shrink-0 font-semibold tabular-nums text-mv-ink">
        {value}
      </dd>
      <button
        type="button"
        data-screen-only=""
        onClick={() => {
          void copyText(value).then((done) => {
            if (!done) return;
            setCopied(true);
            /* Long enough to be seen, short enough that the next copy is not
               reading the last one's tick. */
            window.setTimeout(() => setCopied(false), 1600);
          });
        }}
        aria-label={`Copy the ${label.toLowerCase()} coordinates`}
        title={copied ? "Copied" : "Copy"}
        className={`grid h-[24px] w-[24px] shrink-0 cursor-pointer place-items-center rounded-lg border ${
          copied
            ? "border-mv-green-deep text-mv-green-deep"
            : "border-mv-line text-mv-muted hover:border-mv-green-deep hover:text-mv-green-deep"
        }`}
      >
        {copied ? (
          <Check size={13} strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <Copy size={13} strokeWidth={2} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
