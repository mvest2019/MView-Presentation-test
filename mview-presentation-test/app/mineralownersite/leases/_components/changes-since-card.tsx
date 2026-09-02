"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "../../_components/ui/badge";
import { Card, CardHeader } from "../../_components/ui/card";
import { changesSinceLastVisit } from "../_lib/lease-activity";
import { leaseReportPath } from "../_lib/lease-routes";

/**
 * "WHAT CHANGED SINCE YOUR LAST VISIT" — a short, dismissible change feed.
 *
 * EACH ITEM DIES INDIVIDUALLY, which is the design's point: the card sits above
 * the lease list and below the dollar figures, and an undismissable feed there
 * grows until it pushes the money off the first screen. Marking one read shrinks
 * the card; marking all read collapses it to one line of "all caught up".
 *
 * A `Set` OF IDS, NOT A FILTERED COPY OF THE DATA. The items come from the
 * server as props-shaped module data; holding "which ones are read" separately
 * means the source list stays the source list and the component owns only the
 * reader's decision about it. Dismissing is then `new Set(previous).add(id)` and
 * nothing has to be spliced out of an array.
 *
 * SESSION-ONLY, deliberately — the same reasoning as the note in
 * `records-update-notice.tsx`: the read-state store is a server concern and
 * there is no owner record to write to yet.
 *
 * TWO OF THE THREE ITEMS CARRY THEIR LINK, built from the item's `leaseNumber`
 * through `leaseReportPath`. The third pointed at Activities in the prototype and
 * that module does not exist, so it ends without a door rather than with a dead
 * one — see the header of `lease-activity.ts`.
 */
export function ChangesSinceCard() {
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());

  const unread = changesSinceLastVisit.filter((item) => !read.has(item.id));
  const allRead = unread.length === 0;

  return (
    <Card padded={false} className="mb-3.5 px-4 py-3">
      <CardHeader
        title={
          <h4 className="text-[13.5px] font-bold">
            What changed since your last visit{" "}
            <Badge tone="slate" size="xs">
              Illustrative — change feed wires in production
            </Badge>
          </h4>
        }
        action={
          !allRead && (
            <button
              type="button"
              onClick={() =>
                setRead(new Set(changesSinceLastVisit.map((item) => item.id)))
              }
              className="cursor-pointer border-0 bg-transparent p-0 text-[12px] text-mv-green-deep underline"
            >
              Mark all read
            </button>
          )
        }
      />

      {allRead ? (
        <p className="mt-1 text-[10px] text-mv-muted">
          All caught up ✓ — fresh items land here when the record changes.
        </p>
      ) : (
        <ul className="mt-1">
          {unread.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2.5 border-b border-mv-portal-hairline py-2 text-[12.5px] last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-mv-green"
              />
              <div className="min-w-0 flex-1">
                <strong>{item.headline}</strong> — {item.detail}
                {item.leaseNumber && (
                  <>
                    {" "}
                    <Link
                      href={leaseReportPath(item.leaseNumber)}
                      className="font-semibold whitespace-nowrap text-mv-green-deep"
                    >
                      {item.linkLabel}
                    </Link>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRead(new Set(read).add(item.id))}
                aria-label={`Mark read: ${item.headline}`}
                title="Mark read"
                className="flex-none cursor-pointer border-0 bg-transparent p-0 text-mv-muted hover:text-mv-ink"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
