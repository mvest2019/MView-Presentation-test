import Link from "next/link";

import { Badge } from "../../../_components/ui/badge";
import { formatLeaseTitle } from "../../_lib/lease-format";
import { leaseRecords } from "../../_lib/lease-records";
import { leaseReportPath } from "../../_lib/lease-routes";
import type { ChangeRow } from "../_lib/lease-report-types";

/**
 * "WHAT HAS CHANGED" — one of these sits INSIDE each of the three reports.
 *
 * A change is a lease-level, reservoir-level or well-level fact, and putting one
 * card on the page for all three would make the reader work out which. So the
 * component takes its rows and its level, and each tab renders its own.
 *
 * ── SCANNABLE ROWS, WITH THE PROSE BEHIND A DISCLOSURE ──
 *
 * This was a wall of gold-bordered prose in an earlier pass. Three rows with a
 * glyph each answer "what happened / did it move my number / what else was in
 * the batch" at a glance; the full story is a `<details>` below them, so the
 * reader who wants it keeps their place instead of scrolling past it.
 *
 * ── THE THREE GLYPH TONES MEAN SOMETHING ──
 *
 *   event  amber — something was filed
 *   ok     green — and here is what it did to your money, usually nothing
 *   batch  grey  — the other leases filed alongside it
 *
 * The `ok` row is the one that matters most and is the easiest to leave out: a
 * production posting reads as good news, and an owner needs telling that a
 * posting is a production fact and not a payment.
 */

const TONES: Record<ChangeRow["tone"], string> = {
  event: "bg-mv-sand-tint text-mv-sand",
  ok: "bg-mv-mint text-mv-green-deep",
  batch: "bg-mv-portal-wash text-mv-ink-soft",
};

export function WhatChangedCard({
  level,
  rows,
  detail = [],
  eventCount,
  eventDate,
}: {
  level: "lease" | "reservoir" | "well";
  rows: ChangeRow[];
  detail?: string[];
  eventCount: number;
  eventDate?: string;
}) {
  return (
    <div
      className={`mb-3.5 rounded-mv border border-mv-line bg-mv-card p-[22px] shadow-mv border-l-4 ${
        eventCount > 0 ? "border-l-mv-portal-gold" : "border-l-mv-line"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <h4 className="text-[15px] font-bold">
          What has changed — {level} level
        </h4>
        <Badge tone={eventCount > 0 ? "estimate" : "slate"} size="xs">
          {eventCount > 0
            ? `${eventCount} event${eventCount === 1 ? "" : "s"}${eventDate ? ` · ${eventDate}` : ""}`
            : "No changes this period"}
        </Badge>
      </div>

      <div className="mt-2">
        {rows.map((row) => (
          <div
            key={row.headline}
            className="flex items-start gap-2.5 border-t border-dashed border-mv-line py-[7px] text-[13.5px] first:border-t-0"
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] text-xs font-extrabold ${TONES[row.tone]}`}
            >
              {row.glyph}
            </span>
            <div className="min-w-0">
              <strong>{row.headline}</strong> {row.body}
              {row.batch && (
                <span className="ml-1">
                  {row.batch.map((number, index) => {
                    const lease = leaseRecords.find((l) => l.number === number);
                    return (
                      <span key={number}>
                        {index > 0 && " · "}
                        <Link
                          href={leaseReportPath(number)}
                          className="font-semibold text-mv-green-deep"
                        >
                          {lease
                            ? formatLeaseTitle(lease.name, lease.number)
                            : number}
                        </Link>
                      </span>
                    );
                  })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {detail.length > 0 && (
        <details className="mt-1.5">
          <summary className="cursor-pointer list-none text-[11px] font-bold text-mv-green-deep [&::-webkit-details-marker]:hidden">
            Read more — the full story →
          </summary>
          <div className="mt-1.5">
            {detail.map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="mb-2 text-[13px]">
                {paragraph}
              </p>
            ))}
          </div>
        </details>
      )}

      {level === "lease" && (
        <p className="mt-1.5 text-[11px] text-mv-muted">
          Reservoir- and well-level changes live under their own tabs above.
        </p>
      )}
    </div>
  );
}
