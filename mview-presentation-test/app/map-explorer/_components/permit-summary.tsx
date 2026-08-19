"use client";

import {
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
import { useState } from "react";

import { AiSummary } from "./ai-summary";
import { PermitDetailsTable } from "./permit-details-table";
import { PERMIT_SUMMARY } from "./well-insights-data";
import type { SelectedWell } from "./well-insights-panel";

/*
 * The permit filing for one well — what the summary shows when "Permit" is the
 * chosen record rather than "Completion".
 *
 * Everything below the identity strip is static, exactly as on the completion
 * side: only the well number, the API number and the operator come from the
 * map. `PERMIT_SUMMARY` in `well-insights-data.ts` is the one place to replace
 * when a permit endpoint exists.
 */

export function PermitSummary({ well }: { well: SelectedWell }) {
  return (
    <div>
      {/* ---------------- identity strip ----------------
          The completion record's band, to the pixel: switching records changes
          what is being read, not the furniture around it. */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border border-[#cfe8da] bg-gradient-to-r from-[#eaf7ef] via-[#f2fbf5] to-[#e6f5ec] px-4 py-[14px]">
        <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full border border-[#bfe0cd] bg-white">
          <Drill
            size={19}
            strokeWidth={1.75}
            className="text-mv-green-deep"
            aria-hidden="true"
          />
        </span>

        <Fact label="Well Number" value={well.well || "1"} />
        <Fact label="API Number" value={well.api} mono />
        <Fact label="Filing Purpose" value={PERMIT_SUMMARY.filingPurpose} />
        <Fact label="Status" value={PERMIT_SUMMARY.status} tone="green" />
      </div>

      <div className="mt-3">
        {/* ---------------- three across ---------------- */}
        <div className="grid gap-3 xl:grid-cols-3">
          <Card icon={FileText} title="Lease & Well">
            <Rows rows={PERMIT_SUMMARY.leaseWell} />
          </Card>
          <Card icon={Move} title="Well Type & Direction">
            <Rows rows={PERMIT_SUMMARY.typeDirection} />
          </Card>
          <Card icon={ClipboardList} title="Permit Information">
            <Rows rows={PERMIT_SUMMARY.permitInformation} />
          </Card>
        </div>

        {/* ---------------- operator · coordinates · nearest ----------------
            Half and half: the operator card holds the longest values on the
            page — an operator name with its number, a field name with its own —
            and the two short cards stack in the other half rather than each
            taking a column of its own and leaving most of it empty. */}
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <Card icon={UserRound} title="Operator, Field & Area">
            <Rows
              rows={[
                ...PERMIT_SUMMARY.operatorField.left,
                ...PERMIT_SUMMARY.operatorField.right,
              ]}
            />
          </Card>

          <div className="flex flex-col gap-3">
            <Card icon={MapPin} title="Location Coordinates">
              <dl className="mt-[10px]">
                {PERMIT_SUMMARY.coordinates.map((row) => (
                  <CoordinateRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                  />
                ))}
              </dl>
            </Card>

            <Card icon={Crosshair} title="Nearest Well Context">
              <Rows
                rows={[
                  {
                    label: "Distance",
                    value: PERMIT_SUMMARY.nearestWell.distance,
                  },
                  {
                    label: "Direction",
                    value: PERMIT_SUMMARY.nearestWell.direction,
                  },
                ]}
              />
            </Card>
          </div>
        </div>

        {/* ---------------- the filing itself, then the read on it ------- */}
        <div className="mt-3">
          <PermitDetailsTable />
        </div>

        <div className="mt-3">
          <AiSummary />
        </div>
      </div>
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
    <div className="min-w-0 border-l border-[#cfe8da] pl-4 first-of-type:border-0 first-of-type:pl-0">
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
        onClick={() => {
          void navigator.clipboard?.writeText(value).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
        aria-label={`Copy the ${label.toLowerCase()} coordinates`}
        title={copied ? "Copied" : "Copy"}
        className="grid h-[24px] w-[24px] shrink-0 cursor-pointer place-items-center rounded-lg border border-mv-line text-mv-muted hover:border-mv-green-deep hover:text-mv-green-deep"
      >
        <Copy size={13} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
