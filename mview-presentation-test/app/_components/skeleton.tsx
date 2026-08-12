/**
 * The loading placeholder block.
 *
 * SAME API AS shadcn/ui's `Skeleton` — `<Skeleton className="h-4 w-32" />` — so
 * swapping to theirs later is a one-file change. It is NOT installed from
 * shadcn, deliberately: `shadcn init` rewrites `globals.css` with its own
 * palette (`--background`, `--primary`, `--accent`, …), and this project's
 * `globals.css` is a documented extracted-token file with a rule against
 * authoring colours in it. Taking a second, competing palette for one four-line
 * component is a bad trade. If shadcn is adopted for real components later —
 * dialogs, selects, comboboxes — install it then and delete this file.
 *
 * The pulse colour is `mv-line`, the existing hairline grey, so no new colour
 * enters the system.
 */
export function Skeleton({
  className = "",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-mv-line ${className}`}
      {...props}
    />
  );
}

/**
 * Wraps a whole loading screen. `role="status"` with an off-screen label is what
 * tells a screen reader something is happening — the blocks themselves are
 * `aria-hidden`, so without this the page would announce as empty.
 */
export function SkeletonScreen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
