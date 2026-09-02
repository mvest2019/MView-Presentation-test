import type { ReactNode } from "react";

/**
 * AN EXPANDER — `portal.css`'s `.explain` / `.ex-body`.
 *
 * A NATIVE `<details>`, NOT shadcn's Collapsible, and the reason is what these
 * panels hold. Each one is the derivation behind a dollar figure the reader is
 * being asked to believe. It has no state worth managing, it wants to be
 * findable by the browser's own in-page search (Chrome and Safari expand a
 * closed `<details>` to show a match; a `hidden` div is invisible to it), it
 * wants to survive JavaScript failing to load, and it should print. Radix
 * Collapsible gives up all four in exchange for an animation.
 *
 * `list-none` plus `[&::-webkit-details-marker]:hidden` removes the default
 * triangle in both engines — the design uses its own ⓘ, and the arrow next to
 * it read as two disclosure affordances on one row.
 *
 * `defaultOpen` is `<details open>`, which is markup and therefore correct on
 * the server: the page can arrive with a panel already expanded (the dashboard
 * deep-links into this one) without a flash of it closed.
 */

export function ExplainPanel({
  summary,
  defaultOpen = false,
  id,
  className = "",
  children,
}: {
  summary: ReactNode;
  defaultOpen?: boolean;
  /** For the dashboard's deep links into a specific explainer. */
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className={`group rounded-[9px] border border-mv-line bg-mv-portal-explain ${className}`.trim()}
    >
      <summary className="cursor-pointer list-none px-[11px] py-[7px] text-[11.5px] font-bold text-mv-green-deep group-open:border-b group-open:border-mv-line [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="font-normal">
          ⓘ{" "}
        </span>
        {summary}
      </summary>
      <div className="px-[11px] py-[9px] text-xs leading-[1.55] text-mv-slate">
        {children}
      </div>
    </details>
  );
}
