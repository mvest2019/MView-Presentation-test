"use client";

import { ChevronDown } from "lucide-react";

import {
  CONTROL_CARET,
  CONTROL_TINT,
  SELECT_CLASS,
} from "@/app/_components/control-styles";

/**
 * The one dropdown control, shared by every operator page.
 *
 * IT WAS THE OPERATOR LISTING'S. It moved here so the listing, the operator detail
 * page and the production comparison use the same element rather than three that
 * merely resemble each other — which is the only way "the same style" survives the
 * next tweak to any one of them.
 *
 * A REAL `<select>`, DELIBERATELY. The design draws the chevron as an inline SVG
 * data-URI background; here it is a `lucide-react` icon absolutely positioned and
 * `pointer-events-none` over the select, which renders the same and keeps a
 * 200-character data URI out of the class string. Keeping the native element means
 * the keyboard, the mobile wheel picker and the platform's own accessibility all
 * behave without any of it being re-implemented — and it costs no JavaScript at all,
 * which is why swapping these for a custom panel would be the expensive direction on
 * a phone rather than the cheap one.
 *
 * THE POPUP IS THE OPERATING SYSTEM'S. That is the trade being made: it cannot be
 * styled, and a long list runs the height of the viewport. It is the platform's own
 * picker, so it is at least the one a visitor already knows.
 *
 * SINGLE-SELECT ONLY. `<select multiple>` renders as a scrolling box with no summary
 * of what is chosen, which is not this control. A filter that needs several values at
 * once needs a different control, not this one with a flag.
 */
export function SelectControl({
  label,
  value,
  onChange,
  className = "",
  children,
}: {
  /** The accessible name. These controls carry no visible `<label>`. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Sizing from the caller — these live in flex rows and grids of different shapes. */
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${SELECT_CLASS} ${CONTROL_TINT} min-h-[44px]`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={CONTROL_CARET}
        strokeWidth={1.8}
      />
    </div>
  );
}
