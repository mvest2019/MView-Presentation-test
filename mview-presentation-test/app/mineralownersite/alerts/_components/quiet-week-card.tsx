import { gates } from "../../_components/ui/portal-gating";

/**
 * "WHAT A QUIET WEEK LOOKS LIKE" — a dashed box showing the page's own empty
 * state while the page is not empty.
 *
 * ── WHY SHOW AN EMPTY STATE THAT ISN'T HAPPENING ──
 *
 * Because most weeks it WILL be, and the first time an owner opens Alerts to
 * find nothing there is the moment the subscription feels like a waste. Showing
 * the quiet week in advance — with its exact wording, and the list of things that
 * were checked to produce it — turns that visit from "nothing happened" into "we
 * looked, and here is what we looked at".
 *
 * That is the retention argument (OW-32) in its smallest form, and it is why this
 * box is worth the space it takes on a busy week.
 *
 * ── THE LAST SENTENCE IS A COMMITMENT, NOT A REASSURANCE ──
 *
 * "we never invent activity to look busy." It constrains what may ever be put in
 * the alert list, and the watch ledger above makes the same promise in the same
 * words. Both are ported verbatim.
 *
 * `hide-s`: an Essentials reader is shown their alerts, not a preview of a
 * different week.
 */
export function QuietWeekCard() {
  return (
    <div
      className={`mt-3.5 rounded-mv border-2 border-dashed border-mv-line p-[22px] text-center ${gates(
        "hideInEssentials",
      )}`}
    >
      <strong className="text-[13px]">What a quiet week looks like</strong>
      <p className="mx-auto mt-1.5 max-w-[560px] text-[11px] leading-[1.55] text-mv-muted">
        &ldquo;Nothing new near your leases since Jun 28. We checked production
        postings, permits, completions, status changes, group activity, and model
        flags — next scan tonight at 6:00 PM.&rdquo; Quiet is a result, not a
        failure — we never invent activity to look busy.
      </p>
    </div>
  );
}
