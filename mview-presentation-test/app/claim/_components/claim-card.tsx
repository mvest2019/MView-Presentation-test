"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { MergedTx, ScoredOwner } from "@/lib/claim-search/types";

import { fmt } from "../_lib/working-set";
import { btnGhost, btnMint, btnPrimary, btnSm } from "./ui";

export type ClaimState =
  | { phase: "ask"; base: ScoredOwner; others: ScoredOwner[] }
  | { phase: "done"; base: ScoredOwner; tx: MergedTx };

/**
 * The claim confirmation card: the same-name / different-address merge-ask
 * first (when the roll holds the picked name at other addresses), then the
 * ready-to-claim summary with the change-of-address perk. Scrolls itself into
 * view whenever a claim starts, exactly like the prototype.
 */
export function ClaimCard({
  claim,
  onMerge,
}: {
  claim: ClaimState;
  onMerge: (merged: ScoredOwner[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [claim]);
  return (
    <div
      ref={ref}
      className="mt-4 flex items-start gap-[10px] rounded-xl border border-mv-mint-edge bg-mv-mint px-4 py-[14px] text-[13.5px] text-mv-green-ink"
    >
      <span aria-hidden="true">✓</span>
      <div className="w-full">
        {claim.phase === "ask" ? (
          <MergeAsk base={claim.base} others={claim.others} onMerge={onMerge} />
        ) : (
          <ClaimDone tx={claim.tx} base={claim.base} />
        )}
      </div>
    </div>
  );
}

function MergeRow({ o, picked }: { o: ScoredOwner; picked?: boolean }) {
  return (
    <div
      className={`mt-[7px] flex items-start gap-[9px] rounded-[10px] border border-mv-line px-[11px] py-[9px] text-[12.5px] ${picked ? "bg-mv-bg" : "bg-white"}`}
    >
      <span className="w-[15px] flex-none text-center">✓</span>
      <div>
        <strong>{(o.r[4] as string) || "(no address on the roll)"}</strong>
        <div className="text-[11px] text-mv-muted">
          {o.county} County · {o.r[1]} propert{o.r[1] === 1 ? "y" : "ies"} ·{" "}
          {fmt(o.r[2])}
          {picked && " — the record you picked"}
        </div>
      </div>
    </div>
  );
}

function MergeAsk({
  base,
  others,
  onMerge,
}: {
  base: ScoredOwner;
  others: ScoredOwner[];
  onMerge: (merged: ScoredOwner[]) => void;
}) {
  // All pre-checked, as in the prototype: same name at another address is
  // usually the same person behind a stale roll entry.
  const [checked, setChecked] = useState(() => others.map(() => true));
  return (
    <div>
      <strong>
        We found {others.length + 1} records under “{base.r[0]}” at different
        addresses — are these all you?
      </strong>
      <MergeRow o={base} picked />
      {others.map((o, i) => (
        <label
          key={i}
          className="mt-[7px] flex cursor-pointer items-start gap-[9px] rounded-[10px] border border-mv-line bg-white px-[11px] py-[9px] text-[12.5px]"
        >
          <input
            type="checkbox"
            checked={checked[i]}
            onChange={() =>
              setChecked((c) => c.map((v, j) => (j === i ? !v : v)))
            }
            className="mt-[2px] h-[15px] w-[15px] flex-none cursor-pointer accent-mv-green-deep"
          />
          <div>
            <strong>{(o.r[4] as string) || "(no address on the roll)"}</strong>
            <div className="text-[11px] text-mv-muted">
              {o.county} County · {o.r[1]} propert{o.r[1] === 1 ? "y" : "ies"} ·{" "}
              {fmt(o.r[2])}
            </div>
          </div>
        </label>
      ))}
      <div className="mt-[10px] flex flex-wrap gap-2">
        <button
          type="button"
          className={`${btnPrimary} ${btnSm}`}
          onClick={() => onMerge(others.filter((_, i) => checked[i]))}
        >
          Yes, merge into one record
        </button>
        <button
          type="button"
          className={`${btnGhost} ${btnSm}`}
          onClick={() => onMerge([])}
        >
          No, just this one
        </button>
      </div>
    </div>
  );
}

function ClaimDone({ tx, base }: { tx: MergedTx; base: ScoredOwner }) {
  const [perk, setPerk] = useState<"idle" | "form" | "done">("idle");
  const [addr, setAddr] = useState("");
  const [name, setName] = useState(tx.owner);
  const [county, setCounty] = useState(base.county);
  const pfInput =
    "h-[38px] w-full rounded-[9px] border-[1.5px] border-[#dce4e0] px-[11px] text-[13px] focus-visible:border-mv-green-deep focus-visible:outline-none";
  return (
    <div>
      <strong>Ready to claim {tx.owner}.</strong>{" "}
      <span>
        {tx.county} Count{tx.county.includes(" · ") ? "ies" : "y"} · {tx.props}{" "}
        propert{tx.props === 1 ? "y" : "ies"} · {fmt(tx.value)} appraised
        {tx.merged ? ` · ${tx.addresses.length} addresses merged.` : "."}
      </span>
      <br />
      <span className="text-[11px] text-mv-muted">
        You&rsquo;re claiming the owner record — every lease tied to it comes
        along.
      </span>
      <br />
      <Link
        href="/register?from=claim"
        className={`${btnPrimary} mt-3 !rounded-xl !px-[26px] !py-[14px] !text-[15px]`}
      >
        Create your free account &amp; save this record &rarr;
      </Link>
      <div className="mt-[14px] rounded-[14px] border border-mv-line bg-white px-4 py-[14px]">
        <h5 className="mb-1 text-[13.5px] font-bold">
          Make sure the county has your current address{" "}
          <span className="rounded-full bg-mv-mint px-[10px] py-[3px] text-[11.5px] font-semibold text-mv-green-ink">
            Free perk
          </span>
        </h5>
        <p className="mb-[10px] text-[12.5px] font-light text-mv-slate">
          Checks and notices go to the address on file — we&rsquo;ll prep the
          change-of-address filing for your county, free.
        </p>
        {perk === "idle" && (
          <button
            type="button"
            className={`${btnMint} ${btnSm}`}
            onClick={() => setPerk("form")}
          >
            Update my county address
          </button>
        )}
        {perk === "form" && (
          <div>
            <div className="mt-[10px] grid grid-cols-2 gap-2 max-[560px]:grid-cols-1">
              <input
                className={pfInput}
                placeholder="Owner name"
                aria-label="Owner name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className={pfInput}
                placeholder="County"
                aria-label="County"
                value={county}
                onChange={(e) => setCounty(e.target.value)}
              />
              <input
                className={`${pfInput} col-span-full`}
                placeholder="New mailing address — street, city, state, ZIP"
                aria-label="New mailing address"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`${btnPrimary} ${btnSm} mt-[10px]`}
              onClick={() => setPerk("done")}
            >
              Prepare my filing
            </button>
          </div>
        )}
        {perk === "done" && (
          <p className="mt-[10px] text-[12.5px]">
            <strong>✓ We&rsquo;ll prepare your county change-of-address.</strong>
          </p>
        )}
      </div>
    </div>
  );
}
