import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * STEP 1'S FIELDS. A label, an optional qualifier, and a control with a glyph
 * inside its left edge.
 *
 * ── THE QUALIFIER IS PART OF THE LABEL, NOT A PLACEHOLDER ──
 *
 * "Owner name (as it appears on checks or mail)" and "County (narrow it down if
 * you know it)". Both are the answer to the question the field provokes, and
 * both have to survive the moment someone types — a placeholder does not. They
 * are rendered lighter than the label so the field still scans as one word.
 *
 * ── `required` DRAWS THE ASTERISK AND SETS THE ATTRIBUTE ──
 *
 * One prop, both jobs. A red asterisk with no `required` on the input is a
 * decoration; `required` with no asterisk is a trap the reader walks into at
 * submit time.
 *
 * `FIELD_BASE` is copied in spirit from `_components/ui/form-controls.tsx` — the
 * portal's filter controls — but not imported from it: those are a compact
 * toolbar select and search box with their own sizing, and this is a full-width
 * form field. Sharing the ring and border treatment is what matters, and that
 * lives in the token names both use.
 */
export const FIELD_BASE =
  "w-full rounded-[9px] border border-mv-line bg-mv-card py-[10px] pr-3 pl-[34px] text-[13px] text-mv-ink outline-none transition-colors placeholder:text-mv-placeholder hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)] disabled:cursor-not-allowed disabled:bg-mv-portal-wash disabled:text-mv-placeholder disabled:hover:border-mv-line";

const LABEL_ROW =
  "mb-[6px] flex items-center gap-[5px] text-[12.5px] font-bold text-mv-ink";

/**
 * `htmlFor` SWITCHES THE WRAPPER FROM `<label>` TO `<div>`.
 *
 * A plain input is happiest wrapped in its own label — click the words, focus
 * the box, no id to keep in sync. A combobox is not: its popup listbox lives
 * inside this frame, and a click on an option inside a `<label>` gets
 * re-targeted to the labelled control, so the option never receives it.
 *
 * So a caller that owns a composite control passes the id it put on the input
 * and gets a `<div>` with a real `<label for>` instead — same label row, no
 * click capture.
 */
export function FieldFrame({
  label,
  qualifier,
  required,
  htmlFor,
  children,
}: {
  label: string;
  /** The lighter half of the label — "(optional)", "(street or city)". */
  qualifier?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}) {
  const row = (
    <>
      {label}
      {qualifier && (
        <span className="font-normal text-mv-muted">({qualifier})</span>
      )}
      {required && (
        <span aria-hidden="true" className="text-mv-required">
          *
        </span>
      )}
    </>
  );

  if (htmlFor) {
    return (
      <div className="block">
        <label htmlFor={htmlFor} className={LABEL_ROW}>
          {row}
        </label>
        <span className="relative block">{children}</span>
      </div>
    );
  }

  return (
    <label className="block">
      <span className={LABEL_ROW}>{row}</span>
      <span className="relative block">{children}</span>
    </label>
  );
}

export function ClaimTextField({
  label,
  qualifier,
  required,
  icon: Icon,
  ...props
}: {
  label: string;
  qualifier?: string;
  required?: boolean;
  icon: LucideIcon;
} & ComponentProps<"input">) {
  return (
    <FieldFrame label={label} qualifier={qualifier} required={required}>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-[14px] w-[14px] -translate-y-1/2 text-mv-muted"
      />
      <input className={FIELD_BASE} required={required} {...props} />
    </FieldFrame>
  );
}

export function ClaimSelectField({
  label,
  qualifier,
  icon: Icon,
  children,
  ...props
}: {
  label: string;
  qualifier?: string;
  icon: LucideIcon;
  children: ReactNode;
} & ComponentProps<"select">) {
  return (
    <FieldFrame label={label} qualifier={qualifier}>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-[14px] w-[14px] -translate-y-1/2 text-mv-muted"
      />
      <select
        className={`${FIELD_BASE} cursor-pointer appearance-none !pr-9 font-medium`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-mv-muted"
      />
    </FieldFrame>
  );
}
