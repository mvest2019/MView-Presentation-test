import { ExplainPanel } from "../../_components/ui/explain-panel";
import { formatDollars, formatList, spellOut } from "../_lib/lease-format";
import type { LeaseRecord } from "../_lib/lease-types";
import {
  inactiveLeases,
  mvestimateTotal,
  portfolioSummary,
  producingLeases,
} from "../_lib/lease-totals";

/**
 * WHAT "7 ACTIVE · 3 INACTIVE" MEANS FOR YOU.
 *
 * THE PANEL EXISTS BECAUSE OF ONE WORD. "Inactive" beside a lease somebody
 * inherited reads as "gone", and it is not: it is a statement about the model's
 * forward projection at today's price outlook, and two of these three leases are
 * still posting gas volumes right now. Getting that distinction across is worth
 * a panel, and the design gives it one.
 *
 * Both lease lists are derived from the records, so a lease whose status changes
 * moves between the two paragraphs on its own — which matters here more than
 * elsewhere on the page, because this is the panel that names leases individually
 * and a stale name here is a factual error about somebody's property.
 *
 * `id` is the dashboard's deep-link target from its lease-count stat.
 */
/**
 * "Smith Gas Unit 305892 & 423065", "the four Cedar Bend leases".
 *
 * WHY GROUPING, AND NOT TEN FULL TITLES. This paragraph is a SENTENCE, and the
 * design writes it the way a person would: "Smith 305892 & 423065, Ledbetter
 * 74318, and the four Cedar Bend leases". Listing every lease as
 * "Smith Gas Unit (305892), Smith Gas Unit (423065), …" turns a readable
 * sentence into a data dump and repeats the same lease name four times — which
 * is what a naive derivation produced here before this function existed.
 *
 * The rule: leases sharing a name collapse to one phrase — the numbers when
 * there are two of them, a count when there are more.
 */
function groupLeaseNames(leases: LeaseRecord[]): string[] {
  const byName = new Map<string, LeaseRecord[]>();
  for (const lease of leases) {
    byName.set(lease.name, [...(byName.get(lease.name) ?? []), lease]);
  }

  return [...byName].map(([name, group]) => {
    /* The lease's own short name — "Smith Gas Unit" reads as "Smith" beside its
       number, which is how the design writes it and how an owner says it. */
    const short = name.split(" ")[0];
    if (group.length === 1) return `${short} ${group[0].number}`;
    if (group.length === 2) {
      return `${short} ${group[0].number} & ${group[1].number}`;
    }
    return `the ${spellOut(group.length)} ${name} leases`;
  });
}

export function StatusExplainer() {
  return (
    <ExplainPanel
      id="ls-explain-status"
      className="mb-3.5"
      summary={`What "${portfolioSummary.producingCount} active · ${portfolioSummary.inactiveCount} inactive" means for you`}
    >
      <p className="mb-1.5">
        <strong>Active ({portfolioSummary.producingCount})</strong> — the lease
        posts production and the model projects future income to your share:{" "}
        {formatList(groupLeaseNames(producingLeases))}. These are the leases
        behind your {formatDollars(mvestimateTotal)}.
      </p>
      <p className="mb-1.5">
        <strong>Inactive ({portfolioSummary.inactiveCount})</strong> —{" "}
        {formatList(groupLeaseNames(inactiveLeases))}. Inactive is a{" "}
        <em>projection state, not lost ownership</em>: the model sees negligible
        future dollars to your decimal at today&apos;s outlook. Two of them still
        post gas volumes — a rework or recompletion by the operator would be the
        upside surprise, and you&apos;d see it first in Activities.
      </p>
      <p className="text-[10px] text-mv-muted">
        Because the county still assigns these{" "}
        {spellOut(portfolioSummary.inactiveCount)} a tax value, we show the
        county&apos;s number (labeled) instead of $0 — the $0-fallback rule.
      </p>
    </ExplainPanel>
  );
}
