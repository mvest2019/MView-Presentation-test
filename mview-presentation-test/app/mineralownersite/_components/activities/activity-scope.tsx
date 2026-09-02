"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  activitiesMeta,
  activityRadii,
  activityTabs,
  activityWindows,
  type ActivityRadius,
  type ActivityTab,
  type ActivityWindow,
} from "../../_lib/portal-activities-data";

/**
 * The three scoping controls: which tab, what "new" means, what "nearby"
 * means.
 *
 * ALL THREE ARE URL STATE, not component state, and that is the one design
 * decision in this file. The reference drives them from `onclick` handlers
 * that rewrite text nodes in place; this build puts them in the query string
 * instead, for three reasons:
 *
 *   1  THE PAGE'S OWN LINKS REQUIRE IT. Two KPI cards link to
 *      `?tab=trend` — the reference's own hrefs. A tab held in component state
 *      cannot be arrived at from a link, so those cards would land on the
 *      wrong tab.
 *   2  IT KEEPS THE PANELS ON THE SERVER. The counts, the tables and the
 *      trend rows are server-rendered from `portal-activities-data`; only this
 *      strip of controls ships as JavaScript.
 *   3  A SCOPED VIEW IS SHAREABLE. "30 days within 5 miles" is a real
 *      question an owner asks a co-owner, and it survives a reload.
 *
 * EVERY LINK CARRIES THE WHOLE QUERY STRING FORWARD, so changing the radius
 * cannot drop a reviewer's `?state=` or the reader's `?view=`. Same rule as
 * `ViewTierSwitch` and `TierLink`, for the same reason.
 */
export function ActivityScope({
  tab,
  window,
  radius,
}: {
  tab: ActivityTab;
  window: ActivityWindow;
  radius: ActivityRadius;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  function hrefFor(key: string, value: string | number): string {
    const next = new URLSearchParams(params.toString());
    next.set(key, String(value));
    return `${pathname}?${next.toString()}`;
  }

  return (
    <>
      {/* Detailed and above. An Essentials reader gets the year in one
          paragraph instead of a tab bar — see `ActivitySummary`. */}
      <div className="pill-tabs hide-s">
        {activityTabs.map((item) => (
          <Link
            key={item.key}
            href={hrefFor("tab", item.key)}
            className={item.key === tab ? "on" : undefined}
            scroll={false}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div
        className="flex hide-s act-win"
        style={{
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        {/* The two selectors READ AS SENTENCES — "New means — last: 30 days",
            "Nearby means — within: 1 mile". A bare "30 / 60 / 90" above a grid
            of counts leaves the reader to guess which of the two it scopes. */}
        <span className="tiny muted" style={{ fontWeight: 700 }}>
          &ldquo;New&rdquo; means — last:
        </span>
        {activityWindows.map((days) => (
          <Link
            key={days}
            href={hrefFor("win", days)}
            className={days === window ? "on" : undefined}
            scroll={false}
          >
            {days} days
          </Link>
        ))}

        <span className="tiny muted">
          window: the {window} days ending {activitiesMeta.windowEnd} · counts
          below update with the window
        </span>

        <span
          className="tiny muted"
          style={{ fontWeight: 700, marginLeft: 14 }}
        >
          Nearby means — within:
        </span>
        {activityRadii.map((mi) => (
          <Link
            key={mi}
            href={hrefFor("mi", mi)}
            className={mi === radius ? "on" : undefined}
            scroll={false}
          >
            {mi} mile{mi === 1 ? "" : "s"}
          </Link>
        ))}

        <Link
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: "auto" }}
          href={hrefFor("tab", "trend")}
          scroll={false}
        >
          Permit &amp; completion trend →
        </Link>
      </div>
    </>
  );
}
