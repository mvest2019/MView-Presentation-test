import { ChevronDown, X, type LucideIcon } from "lucide-react";
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
 * ── NO FIELD HERE IS REQUIRED, AND NONE MAY CLAIM TO BE ──
 *
 * There was a `required` prop that drew a red asterisk on Owner name and set
 * the attribute on the input. Both are now wrong: `isSearchable` runs a search
 * on a county, an address or a lease name with no owner name at all, and the
 * endpoint answers them — `address=HARLEM` alone returns 19 owners. The
 * asterisk said a name was needed and the attribute made that true, blocking
 * searches the backend supports.
 *
 * The prop is gone rather than the asterisk alone: a marker without the
 * attribute is decoration, and the attribute without the marker is a trap
 * sprung at submit time.
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
  htmlFor,
  children,
}: {
  label: string;
  /** The lighter half of the label — "(optional)", "(street or city)". */
  qualifier?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  const row = (
    <>
      {label}
      {qualifier && (
        <span className="font-normal text-mv-muted">({qualifier})</span>
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

/**
 * THE X THAT EMPTIES ONE FIELD.
 *
 * ── WHY PER FIELD, WHEN THERE IS ALREADY A RESET ──
 *
 * "Reset filters" clears all four and drops the results with them. That is the
 * wrong tool for the common case: someone searches a name, adds a county to
 * narrow it, and then wants the county gone and the name kept. Reset means
 * retyping the name; the only alternative was select-all-and-delete inside a
 * box, which is a fiddly thing to ask for on a phone.
 *
 * ── IT ONLY EXISTS WHEN THERE IS SOMETHING TO CLEAR ──
 *
 * An X on an empty field is a control that does nothing, drawn on every field
 * of an untouched form — four of them, all inert. It appears with the first
 * character and goes with the last.
 *
 * ── AND CLEARING RE-RUNS THE SEARCH ──
 *
 * It goes through the same `onChange` as typing, so the wizard's debounce sees
 * an ordinary edit and asks the API for the narrower query. Nothing about this
 * button is a special path.
 */
export function FieldClear({
  onClick,
  label,
  className = "right-[8px]",
}: {
  onClick: () => void;
  /** Says WHICH field — "Clear owner name", not "Clear". */
  label: string;
  /** Where it sits, for a field that already has a glyph on its right edge. */
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`absolute top-1/2 z-10 flex h-[20px] w-[20px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-mv-muted transition-colors hover:bg-mv-hover hover:text-mv-ink ${className}`}
    >
      <X aria-hidden="true" className="h-[13px] w-[13px]" />
    </button>
  );
}

export function ClaimTextField({
  label,
  qualifier,
  icon: Icon,
  onClear,
  ...props
}: {
  label: string;
  qualifier?: string;
  icon: LucideIcon;
  /** Supplied by the caller that owns the value — see `FieldClear`. */
  onClear?: () => void;
} & ComponentProps<"input">) {
  const filled = String(props.value ?? "") !== "";

  return (
    <FieldFrame label={label} qualifier={qualifier}>
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 h-[14px] w-[14px] -translate-y-1/2 text-mv-muted"
      />
      {/* The right padding grows only while the X is there, so an empty field
          keeps the full width for its placeholder. */}
      <input
        className={`${FIELD_BASE} ${onClear && filled ? "!pr-9" : ""}`}
        {...props}
      />
      {/* A `<button>` inside the wrapping `<label>` is interactive content, so
          the label does not forward the click to the input — the X clears, and
          does not also focus. */}
      {onClear && filled && (
        <FieldClear onClick={onClear} label={`Clear ${label.toLowerCase()}`} />
      )}
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
