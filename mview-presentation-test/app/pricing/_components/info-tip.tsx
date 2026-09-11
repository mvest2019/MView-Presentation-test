"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * The small circled "i" beside a feature, and the dark bubble it opens.
 *
 * The prototype opens these on hover and, because hover never fires on touch,
 * also on tap — and closes every other one when a new one opens. That is state
 * per trigger plus a document-level dismiss, so it is a component rather than a
 * CSS `:hover` rule: pointer devices get hover, and touch and keyboard get a
 * real toggle with the same bubble.
 *
 * `align="end"` right-edges the bubble. Inside a plan card the trigger sits hard
 * against the card's right edge, and a centred 250px bubble would hang outside
 * a 260px column; the design's own stylesheet had the same override.
 */
export function InfoTip({
  label,
  children,
  align = "center",
  triggerClass = "text-mv-line-strong hover:text-mv-green-deep group-hover/tip:text-mv-green-deep",
}: {
  /** Names the feature for screen readers — "About Dashboard". */
  label: string;
  children: React.ReactNode;
  align?: "center" | "end";
  /**
   * The trigger's resting colour. It has to be set from outside for the one
   * case that sits on a filled ground — the active segment pill, where the
   * default hairline grey disappears.
   */
  triggerClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={root} className="group/tip relative inline-block shrink-0">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex size-[15px] cursor-help items-center justify-center rounded-full border-[1.3px] border-current bg-transparent p-0 text-[9px] font-extrabold leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep ${triggerClass}`}
      >
        i
      </button>
      <span
        id={id}
        role="tooltip"
        /*
          Hidden from the accessibility tree and from pointer events when shut,
          rather than unmounted: `aria-describedby` has to resolve to a node that
          exists, or the trigger describes nothing.
        */
        aria-hidden={!open}
        className={`absolute top-[calc(100%+9px)] z-30 w-[252px] max-w-[76vw] rounded-[10px] bg-mv-tooltip px-[13px] py-[11px] text-left text-[11.8px] font-normal leading-[1.55] tracking-normal text-mv-on-deep normal-case shadow-[0_12px_30px_rgba(6,24,17,.34)] ${
          align === "end" ? "-right-1.5" : "left-1/2 -translate-x-1/2"
        } ${
          open
            ? "visible opacity-100"
            : "invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute bottom-full border-6 border-transparent border-b-mv-tooltip ${
            align === "end" ? "right-[11px]" : "left-1/2 -translate-x-1/2"
          }`}
        />
        {children}
      </span>
    </span>
  );
}
