"use client";

import type { ReactNode } from "react";

/**
 * STEP 3'S CHECKBOX. A real `<input type="checkbox">` with the portal's focus
 * ring, not a styled div.
 *
 * This is the control that writes the claim, so it is the last place in the app
 * to reinvent a checkbox: the native one arrives with the space key, the correct
 * role, the correct announced state, and the form semantics a `role="checkbox"`
 * div has to reimplement and usually gets wrong. Only the paint is ours —
 * `accent-mv-green-deep` is the whole styling budget.
 */
export function ClaimCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-[9px] text-[12.5px] leading-[1.55] text-mv-slate">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-[2px] h-[15px] w-[15px] flex-none cursor-pointer accent-mv-green-deep outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.28)]"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}
