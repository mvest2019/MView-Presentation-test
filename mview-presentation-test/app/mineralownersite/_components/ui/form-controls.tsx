import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * THE PORTAL'S TWO FILTER CONTROLS — a select and a search box.
 *
 * WHY A NATIVE `<select>` AND NOT shadcn's Select. shadcn's Select is Radix
 * Select: a listbox built out of divs, a portal, a positioning engine and about
 * 30KB of client JavaScript, and its whole reason to exist is styling the option
 * list — which this design does not style. Against that, the native control
 * arrives with correct keyboard handling, correct screen-reader semantics, and
 * the platform's own picker on a phone, which is the right control for someone
 * choosing between five sort orders one-handed. The repo already standardises
 * its filter selects on a native one (`app/_components/control-styles.ts`) for
 * the same reason.
 *
 * `appearance-none` plus a real `ChevronDown` positioned over the control is the
 * house pattern from that file, and it renders identically to a background-image
 * caret without carrying a 200-character data URI in the class string.
 *
 * BOTH CONTROLS TAKE A REQUIRED LABEL. `SearchField`'s can be visually hidden —
 * the design gives the search box a placeholder and no visible label — but a
 * placeholder is not a label: it disappears the moment someone types, and screen
 * readers are not required to announce it.
 */

const FIELD_BASE =
  "rounded-[9px] border border-mv-line bg-mv-card text-mv-ink outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]";

export function SelectField({
  label,
  className = "",
  children,
  ...props
}: {
  label: ReactNode;
  className?: string;
  children: ReactNode;
} & ComponentProps<"select">) {
  return (
    <label className={`flex items-center gap-2 ${className}`.trim()}>
      <span className="text-xs font-bold text-mv-muted">{label}</span>
      <span className="relative inline-flex">
        <select
          className={`${FIELD_BASE} cursor-pointer appearance-none py-1.5 pr-9 pl-[10px] text-[12.5px] font-medium`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-mv-muted"
        />
      </span>
    </label>
  );
}

export function SearchField({
  label,
  className = "",
  ...props
}: {
  label: string;
  className?: string;
} & ComponentProps<"input">) {
  return (
    <label className={`flex min-w-0 flex-1 ${className}`.trim()}>
      <span className="sr-only">{label}</span>
      <input
        type="search"
        className={`${FIELD_BASE} w-full max-w-[420px] min-w-[220px] px-3 py-2 text-[13px] placeholder:text-mv-placeholder`}
        {...props}
      />
    </label>
  );
}
