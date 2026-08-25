"use client";

import { useState } from "react";

import type { OwnerRow, ScoredOwner } from "@/lib/claim-search/types";

import { fmt, okey } from "../_lib/working-set";
import { btnGhost, btnPrimary, btnSm } from "./ui";

export interface ModalItem {
  r: OwnerRow;
  county: string;
  key: string;
}

export interface ModalState {
  base: ScoredOwner;
  /**
   * Same-name records at other addresses: the base's FULL county roll first,
   * then same-name rows from the current result set in other counties.
   */
  items: ModalItem[];
}

/**
 * The "Is this you?" popup, opened by ticking an owner: the picked record
 * first (pre-checked, locked), then every same-name record at a different
 * address, each tickable. Any record's mailing address can be corrected;
 * corrections persist locally and are posted for the data team to review.
 */
export function RecordModal({
  modal,
  corr,
  selO,
  onSaveCorrection,
  onClose,
}: {
  modal: ModalState;
  corr: Record<string, string>;
  selO: Record<string, boolean>;
  onSaveCorrection: (
    key: string,
    owner: string,
    county: string,
    oldAddress: string,
    newAddress: string,
  ) => void;
  onClose: (confirmed: boolean, checkedKeys: string[]) => void;
}) {
  const { base, items } = modal;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const it of items) init[it.key] = !!selO[it.key];
    return init;
  });
  const confirm = () =>
    onClose(
      true,
      items.filter((it) => checked[it.key]).map((it) => it.key),
    );
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(20,30,26,.5)] p-5 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(false, []);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirm your record"
        className="flex max-h-[min(84vh,720px)] w-[min(620px,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(15,25,20,.35)]"
      >
        <div className="border-b border-mv-line px-[22px] pb-3 pt-[18px]">
          <h3 className="mb-[3px] text-[17px] font-bold">
            Is this you? — {base.r[0]}
          </h3>
          <p className="text-[12.5px] font-light text-mv-muted">
            {items.length
              ? `The same name appears at ${items.length} other address${items.length === 1 ? "" : "es"} — county rolls often keep an old address next to a newer one. Tick every record that is you.`
              : "Check the mailing address to make sure this record is yours."}
          </p>
        </div>
        <div className="overflow-y-auto px-[22px] py-[14px]">
          <SectionLabel first>Your selected record</SectionLabel>
          <ModalRow
            item={{ r: base.r, county: base.county, key: okey(base) }}
            isBase
            corr={corr}
            onSaveCorrection={onSaveCorrection}
          />
          {items.length > 0 && (
            <>
              <SectionLabel>Same name — other addresses</SectionLabel>
              {items.map((it) => (
                <ModalRow
                  key={it.key}
                  item={it}
                  corr={corr}
                  checked={!!checked[it.key]}
                  onCheck={() =>
                    setChecked((c) => ({ ...c, [it.key]: !c[it.key] }))
                  }
                  onSaveCorrection={onSaveCorrection}
                />
              ))}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-[10px] border-t border-mv-line px-[22px] py-[13px]">
          <button type="button" className={btnPrimary} onClick={confirm}>
            Confirm selection
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => onClose(false, [])}
          >
            Cancel
          </button>
          <span className="ml-auto text-[11.5px] font-light text-mv-muted">
            Wrong address? Use <b>edit address</b> on any record.
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({
  children,
  first,
}: {
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className={`mb-[6px] text-[10.5px] font-bold uppercase tracking-[.07em] text-mv-muted ${first ? "" : "mt-3"}`}
    >
      {children}
    </div>
  );
}

function ModalRow({
  item,
  isBase,
  checked,
  onCheck,
  corr,
  onSaveCorrection,
}: {
  item: ModalItem;
  isBase?: boolean;
  checked?: boolean;
  onCheck?: () => void;
  corr: Record<string, string>;
  onSaveCorrection: (
    key: string,
    owner: string,
    county: string,
    oldAddress: string,
    newAddress: string,
  ) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(corr[item.key] ?? "");
  const [savedNow, setSavedNow] = useState(false);
  const r = item.r;
  const shown = corr[item.key] ?? ((r[4] as string) || "");
  const save = () => {
    const val = draft.trim();
    if (!val) return;
    onSaveCorrection(item.key, r[0], item.county, (r[4] as string) || "", val);
    setEditing(false);
    setSavedNow(true);
  };
  return (
    <div
      className={`mb-2 rounded-[11px] border px-3 py-[10px] ${isBase ? "border-[#bcd8cb] bg-mv-mint" : "border-mv-line bg-[#fbfcfb]"}`}
    >
      <div className="flex items-start gap-[10px]">
        <input
          type="checkbox"
          checked={isBase || checked}
          disabled={isBase}
          onChange={onCheck}
          className="mt-[2px] h-4 w-4 flex-none cursor-pointer accent-mv-green-deep"
          aria-label={isBase ? "The record you picked" : `Include ${shown || "this record"}`}
        />
        <div className="min-w-0 flex-1">
          {isBase && (
            <div className="text-[10.5px] font-bold uppercase tracking-[.05em] text-mv-green-deep">
              The record you picked
            </div>
          )}
          <div className="text-[13px] font-semibold text-mv-ink">
            {shown || "(no address on the roll)"}
            {corr[item.key] && (
              <span className="ml-[6px] rounded-md border border-[#f0dcae] bg-[#fdf3dd] px-[7px] py-[1.5px] align-middle text-[10px] font-bold text-[#8a6116]">
                updated by you
              </span>
            )}
          </div>
          <div className="mt-[1px] text-[11.5px] text-mv-muted">
            {item.county} County · {r[1]} propert{r[1] === 1 ? "y" : "ies"} ·{" "}
            {fmt(r[2])}
          </div>
          {editing && (
            <div className="mt-[9px] flex flex-wrap gap-2">
              <input
                autoFocus
                placeholder="Correct mailing address — street, city, state, ZIP"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                className="h-[38px] min-w-[220px] flex-1 rounded-[9px] border-[1.5px] border-[#dce4e0] px-[11px] text-[12.5px] focus-visible:border-mv-green-deep focus-visible:shadow-[0_0_0_3px_rgba(46,143,109,.12)] focus-visible:outline-none"
              />
              <button
                type="button"
                className={`${btnPrimary} ${btnSm}`}
                onClick={save}
              >
                Save address
              </button>
            </div>
          )}
          {savedNow && !editing && (
            <div className="mt-[7px] text-[11.5px] font-semibold text-mv-green-deep">
              ✓ Address correction saved — our team will review it.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="ml-auto flex-none cursor-pointer text-[11.5px] font-semibold text-mv-green-deep underline underline-offset-2"
        >
          edit address
        </button>
      </div>
    </div>
  );
}
