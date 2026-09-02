import type { ReactNode } from "react";

import { gates } from "../../../_components/ui/portal-gating";

/**
 * THE BENCHMARK STRIP — "is this price and this deduction normal for the area?"
 *
 * ── WHY THE COPY LIVES HERE AND NOT IN THE LEASE RECORD ──
 *
 * The two sentences are not the same shape. Smith's price "sat inside the index
 * band" over 14 audited months and its deduction is typical; Ledbetter's price
 * "averaged −$1.18/bbl vs the posted index" inside a differential band, and its
 * deduction is the one line worth watching. Forcing both through one data schema
 * would mean a schema with a slot for every clause either sentence might need —
 * more machinery than the two sentences it serves. So they sit here, keyed by
 * lease, the way `ProductionChart` carries the pilot unit's own copy.
 *
 * A lease with no benchmark renders nothing. Eight of the ten have no audited
 * months to compare, and an empty band is not a finding.
 *
 * ── BOTH END ON THE SAME ADMISSION ──
 *
 * "Illustrative until the benchmark service wires." The area norms are not live
 * yet, so the comparison is a worked example of the shape rather than a measured
 * result — and a price-differential claim is exactly the sort of number an owner
 * might take to their operator, so it says so in its own last clause.
 *
 * `hide-s`: an Essentials reader is not asked to verify a deduction percentage.
 */

const BENCHMARKS: Record<string, ReactNode> = {
  "305892": (
    <>
      <strong>Benchmark:</strong> your Smith gas price sat{" "}
      <span className="tabular-nums">inside the Bee Co. index band</span> all 14
      audited months. Gathering &amp; compression deductions ran{" "}
      <span className="tabular-nums">
        2.55% of gross vs the ~2.4% area norm for gas units
      </span>{" "}
      — typical, low-priority to verify.{" "}
      <span className="text-[10px]">
        Illustrative until the benchmark service wires.
      </span>
    </>
  ),
  "74318": (
    <>
      <strong>Benchmark:</strong> your Ledbetter stub price averaged{" "}
      <span className="tabular-nums">−$1.18/bbl vs the posted index</span> —
      inside the typical{" "}
      <span className="tabular-nums">−$0.90 to −$1.60</span> differential band
      for Cass Co. oil. Deductions ran{" "}
      <span className="tabular-nums">2.6% of gross vs the ~1.8% area norm</span>{" "}
      — the one line worth watching.{" "}
      <span className="text-[10px]">
        Illustrative until the benchmark service wires.
      </span>
    </>
  ),
};

export function BenchmarkNote({ leaseNumber }: { leaseNumber: string }) {
  const body = BENCHMARKS[leaseNumber];
  if (!body) return null;

  return (
    <div
      className={`mt-2.5 flex items-start gap-2 rounded-[9px] border border-dashed border-mv-line bg-mv-bg px-[11px] py-2 text-xs text-mv-slate ${gates("hideInEssentials")}`}
    >
      <span aria-hidden="true">⚖</span>
      <div>{body}</div>
    </div>
  );
}
