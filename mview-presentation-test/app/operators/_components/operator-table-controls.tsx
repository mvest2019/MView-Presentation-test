"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/app/_components/button";
import type { OperatorColumns } from "@/lib/operator-types";

/**
 * The results toolbar: the "Columns ▾" popover (`.pop`) and "Export CSV ↓"
 * (`.btn`), right-aligned as in the prototype.
 *
 * Dismissal mirrors `SiteHeader`'s Learn dropdown — outside pointerdown and
 * Escape — rather than the prototype's single document-level click listener, so
 * the two dropdowns on the site behave the same way and keyboard users can get
 * out. Focus returns to the trigger on Escape.
 *
 * The Operator Name column is checked and disabled: the table is meaningless
 * without it, which is the design's `.pop label.lock`.
 */

const COLUMN_LABELS: { key: keyof OperatorColumns; label: string }[] = [
  { key: "oil", label: "Oil Produced" },
  { key: "gas", label: "Gas Produced" },
  { key: "cty", label: "Counties" },
  { key: "status", label: "Status" },
];

export function OperatorTableControls({
  columns,
  onColumnsChange,
  onExport,
}: {
  columns: OperatorColumns;
  onColumnsChange: (columns: OperatorColumns) => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="flex flex-wrap items-center gap-[10px]">
      <div ref={wrapRef} className="relative inline-block">
        <Button
          ref={triggerRef}
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((value) => !value)}
          className="max-[767px]:text-sm"
        >
          Columns
          <span aria-hidden="true" className="text-[11px]">
            ▾
          </span>
        </Button>

        {open && (
          // Anchored right on desktop; flipped to the left edge under 480px so a
          // 220px panel cannot push the page wider than the viewport.
          <div
            aria-label="Manage columns"
            className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[220px] rounded-xl border border-mv-line bg-white px-[14px] py-3 shadow-[0_12px_30px_rgba(13,14,23,.14)] max-[480px]:left-0 max-[480px]:right-auto"
          >
            <label className="flex cursor-not-allowed items-center gap-[9px] py-[6px] text-[13.5px] font-medium text-mv-muted">
              <input
                type="checkbox"
                checked
                disabled
                className="h-4 w-4 accent-mv-green-deep"
              />
              Operator Name (operator no.)
            </label>

            {COLUMN_LABELS.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-[9px] py-[6px] text-[13.5px] font-medium"
              >
                <input
                  type="checkbox"
                  checked={columns[key]}
                  onChange={(event) =>
                    onColumnsChange({ ...columns, [key]: event.target.checked })
                  }
                  className="h-4 w-4 cursor-pointer accent-mv-green-deep"
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      <Button onClick={onExport} className="max-[767px]:text-sm">
        Export CSV
        <span aria-hidden="true">↓</span>
      </Button>
    </div>
  );
}
