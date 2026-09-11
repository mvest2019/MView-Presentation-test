"use client";

import { useState } from "react";

import { Card, CardHeader } from "../../../_components/ui/card";
import { changesSinceLastVisit } from "../_lib/lease-activity";

/**
 * "WHAT CHANGED SINCE YOUR LAST VISIT" — the change feed, dismissible item by
 * item.
 *
 * THE ONLY CLIENT COMPONENT IN THE TOP HALF OF THE PAGE, and it is one because
 * dismissing is the whole behaviour: an item a reader has dealt with should stop
 * asking for attention on the next scroll. Everything above it is server-
 * rendered.
 *
 * DISMISSED, NOT DELETED. `read` is a set of ids held for the life of the page —
 * nothing is removed from the record and a reload brings every item back, which
 * is the honest behaviour for a prototype whose read-state is not stored yet.
 * When that state lands it replaces this `useState` and nothing else.
 *
 * THE CARD DISAPPEARS WHEN THE LAST ITEM IS DISMISSED rather than leaving an
 * empty heading behind — a feed with nothing in it is not news, and the page
 * reads better closing the gap.
 */
export function ChangesSinceCard() {
  const [read, setRead] = useState<ReadonlySet<string>>(new Set());

  const unread = changesSinceLastVisit.filter((item) => !read.has(item.id));

  if (unread.length === 0) return null;

  return (
    <Card padded={false} className="mb-4 px-[18px] py-[14px]">
      <CardHeader
        title={
          <h2 className="text-[14px] font-bold">
            What changed since your last visit
          </h2>
        }
        action={
          <button
            type="button"
            onClick={() =>
              setRead(new Set(changesSinceLastVisit.map((item) => item.id)))
            }
            className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-mv-ink underline hover:text-mv-green-deep"
          >
            Mark all read
          </button>
        }
      />

      <ul className="mt-2">
        {/* A HAIRLINE BETWEEN ITEMS, AND NONE AFTER THE LAST. Four
            paragraphs separated only by whitespace read as one block of
            running text — the rule is what makes each item a separate piece
            of news. `last:border-b-0` is why the padding is symmetrical
            rather than a bottom margin: the final item would otherwise leave
            a gap above the card's own edge.

            `border-b` beats a `divide-y` on the list because items are
            dismissed one at a time — whichever item ends up last is the one
            that must lose its rule, and `:last-child` tracks that on its own
            as the list shrinks. */}
        {unread.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2.5 border-b border-mv-portal-hairline py-2.5 last:border-b-0 last:pb-0"
          >
            {/* Decorative — the list already reads as a list, and a screen
                reader announcing a bullet before every headline is noise. */}
            <span
              aria-hidden="true"
              className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-mv-green"
            />
            <p className="min-w-0 flex-1 text-[12.5px] leading-[1.55]">
              <strong>{item.headline}</strong> — {item.detail}
            </p>
            <button
              type="button"
              onClick={() => setRead(new Set(read).add(item.id))}
              aria-label={`Mark read: ${item.headline}`}
              title="Mark read"
              className="mt-px flex-none cursor-pointer border-0 bg-transparent p-0 text-[13px] text-mv-muted hover:text-mv-ink"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
