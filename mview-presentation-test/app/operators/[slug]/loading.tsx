/**
 * The operator profile's route-level loading state — DEFECT 198.
 *
 * "page not shown any loading and take too much time to redirect to the operator, no
 * understand its click it or not (also for mobile and ipad)."
 *
 * THE ROUTE HAD NO `loading.tsx` AT ALL — nothing under `app/operators` did, while
 * `/blogs`, `/glossary` and `/oil-and-gas-news` all have one. So a click on a related
 * operator, or on a row in the directory, left the current page fully rendered and
 * apparently inert while the next one's payload was fetched. On a fast connection that
 * is a blink; on a phone it is long enough to press again, which is exactly what the
 * defect describes.
 *
 * This is the fix Next's own guidance names first: a route-level fallback paints
 * immediately on navigation, so the old page is replaced the instant the link is
 * pressed and there is never a period where nothing has happened.
 * `useLinkStatus` on the cards is the second half — it marks WHICH card was pressed,
 * which a route-level fallback cannot say.
 *
 * IT MIRRORS THE PROFILE'S OWN SHAPE rather than being a spinner: the hero band, the
 * four condition tiles, and the map-and-panels row beneath. The page it replaces
 * therefore does not jump when it arrives, and the reader can see what is coming.
 *
 * Everything here is `aria-hidden` behind one `role="status"` line — a screen reader
 * needs "Loading operator profile", not forty shimmer bars.
 */
export default function Loading() {
  return (
    <div className="pb-4">
      <p role="status" className="sr-only">
        Loading operator profile…
      </p>

      {/* ---- hero, matching the real header's gradient and insets ---- */}
      <header
        aria-hidden="true"
        className="border-b border-mv-line bg-[linear-gradient(180deg,var(--color-mv-card),var(--color-mv-card-tint))]"
      >
        <div className="mx-auto max-w-[1200px] px-[22px] pb-[26px] pt-5 max-[767px]:px-4">
          <Bar className="h-[13px] w-[260px]" />

          <div className="mt-4 flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-[14px]">
              {/* The logo tile at its hero size — 54px, radius 13. */}
              <span className="h-[54px] w-[54px] shrink-0 animate-pulse rounded-[13px] bg-mv-line-soft" />
              <div className="min-w-0">
                <Bar className="h-[26px] w-[320px] max-w-full" />
                <Bar className="mt-[10px] h-[13px] w-[220px] max-w-full" />
              </div>
            </div>
            <Bar className="h-[38px] w-[150px]" />
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="mx-auto max-w-[1200px] px-[22px] max-[767px]:px-4"
      >
        {/* ---- the four condition tiles ---- */}
        <div className="grid grid-cols-4 gap-[14px] pt-[26px] max-[940px]:grid-cols-2">
          {[0, 1, 2, 3].map((tile) => (
            <div
              key={tile}
              className="rounded-[14px] border border-mv-line bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(24,24,27,.05)]"
            >
              <Bar className="h-[11px] w-[92px]" />
              <Bar className="mt-3 h-[22px] w-[120px]" />
              <Bar className="mt-[10px] h-[11px] w-[80px]" />
            </div>
          ))}
        </div>

        {/* ---- the footprint map beside its two panels ---- */}
        <div className="grid grid-cols-[1.45fr_1fr] items-start gap-4 pt-[26px] max-[940px]:grid-cols-1">
          <Panel className="h-[420px]" />
          <div className="grid gap-4">
            <Panel className="h-[200px]" />
            <Panel className="h-[200px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** One shimmer bar. `bg-mv-line-soft` is the tone every other skeleton on the site uses. */
function Bar({ className }: { className: string }) {
  return (
    <span
      className={`block animate-pulse rounded-md bg-mv-line-soft ${className}`}
    />
  );
}

/** A card-shaped placeholder, bordered like the panel it stands in for. */
function Panel({ className }: { className: string }) {
  return (
    <div
      className={`rounded-2xl border border-mv-line bg-white shadow-mv ${className}`}
    >
      <div className="border-b border-mv-line-soft px-[18px] py-[14px]">
        <Bar className="h-[13px] w-[160px]" />
      </div>
      <div className="flex h-[calc(100%-46px)] items-center justify-center">
        <Bar className="h-3 w-[220px] max-w-[70%]" />
      </div>
    </div>
  );
}
