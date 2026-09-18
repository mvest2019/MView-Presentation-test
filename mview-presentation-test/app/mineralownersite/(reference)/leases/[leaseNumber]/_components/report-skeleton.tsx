import { Card } from "../../../../_components/ui/card";

/**
 * THE SHAPE OF A REPORT THAT HAS NOT ARRIVED.
 *
 * ── WHY A SILHOUETTE AND NOT A SPINNER ──
 *
 * All three tabs used to answer a slow read with one small card and a moving
 * bar. That tells a reader something is happening and nothing about what, and
 * on this page the wait is long enough to matter — the first read of a lease
 * can take a minute while the service builds it. Worse, the card was a fifth
 * the height of the report it stood in for, so the page collapsed on every tab
 * change and grew again when the answer came.
 *
 * These blocks are the real cards' own proportions, so the page holds its
 * height and the layout a reader is about to get is the one already on screen.
 *
 * ── IT IS THE SAME ON ALL THREE TABS ON PURPOSE ──
 *
 * The three reports differ in content, not in build: a header, a row of tiles,
 * some prose cards, a chart, a table, a map. A skeleton per tab would be three
 * things to keep in step with three layouts for no gain a reader can see in the
 * second before it is replaced.
 */

/** The silhouettes, in the order every one of the three reports builds in. */
const SHAPES = [
  { kind: "header", title: "260px" },
  { kind: "tiles", title: "150px" },
  { kind: "split", title: "220px" },
  { kind: "chart", title: "190px" },
  { kind: "table", title: "240px" },
] as const;

export function ReportSkeleton({ what }: { what: string }) {
  return (
    <div>
      {SHAPES.map((shape, index) => (
        <Card key={index} padded={false} className="mt-4 px-[22px] py-[18px]">
          <span
            aria-hidden="true"
            className="block h-[22px] animate-pulse rounded bg-mv-portal-wash"
            style={{ width: shape.title }}
          />

          {shape.kind === "header" && (
            <div className="mt-4">
              <Lines widths={[72, 54]} />
            </div>
          )}

          {shape.kind === "tiles" && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, tile) => (
                <span
                  key={tile}
                  aria-hidden="true"
                  className="block h-[86px] animate-pulse rounded-mv bg-mv-portal-wash"
                />
              ))}
            </div>
          )}

          {shape.kind === "split" && (
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              {Array.from({ length: 2 }, (_, column) => (
                <Lines key={column} widths={[100, 84, 94, 72, 60]} />
              ))}
            </div>
          )}

          {shape.kind === "chart" && (
            <span
              aria-hidden="true"
              className="mt-4 block h-[230px] animate-pulse rounded-mv bg-mv-portal-wash"
            />
          )}

          {shape.kind === "table" && (
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 6 }, (_, row) => (
                <span
                  key={row}
                  aria-hidden="true"
                  className="block h-[18px] animate-pulse rounded bg-mv-portal-wash"
                />
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* THE ONLY THING A SCREEN READER GETS. Every block above is
          `aria-hidden` — a silhouette is a picture of a layout and has nothing
          to announce — so `role="status"` here is what says the page is
          working, and what it is working on. */}
      <p role="status" className="mt-4 text-center text-[11.5px] text-mv-muted">
        {what} The first read of a lease can take a minute while the service
        builds it; every read after that is instant.
      </p>
    </div>
  );
}

/** A stack of lines at given widths, in percent. */
function Lines({ widths }: { widths: number[] }) {
  return (
    <div className="space-y-2.5">
      {widths.map((width, line) => (
        <span
          key={line}
          aria-hidden="true"
          className="block h-[13px] animate-pulse rounded bg-mv-portal-wash"
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}
