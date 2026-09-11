import { formatCount } from "../../../_lib/lease-format";
import type { WellReport } from "../../_lib/well-report";

/**
 * THE HOLE, TO SCALE — and then the part that matters, magnified.
 *
 * ── THE POINT IS THE RATIO, AND IT IS A RATIO NOBODY GUESSES RIGHT ──
 *
 * Fifty-four feet of perforated interval in a hole nearly eleven thousand feet
 * long is half a percent. Drawn honestly it is a line one pixel high, which is
 * exactly the fact the left diagram exists to deliver: a reader who has been
 * looking at "10,561 ft" all page has no intuition for how little of that is
 * open to the rock.
 *
 * ── SO THE RIGHT DIAGRAM BREAKS THE SCALE, AND SAYS SO ──
 *
 * The only way to show a band that thin is to stop drawing it to scale, and the
 * only way that is honest is to put the two side by side and label the second
 * one "magnified". One diagram doing both jobs would have to lie about one of
 * them.
 *
 * ── MEASURED DEPTH, NOT DEPTH BELOW THE SURFACE ──
 *
 * Every number here is measured depth — the length of hole drilled, which on a
 * directional well is longer than the ground is deep. It is a rule down the
 * hole, not a path across the map; the map card is where the path lives.
 */

const HOLE = { width: 200, height: 230 } as const;
const TOP = 24;
const BOTTOM = 200;

export function HoleDiagram({ report }: { report: WellReport }) {
  const { well } = report;
  const depth = report.measuredFt;

  const y = (feet: number) => TOP + (feet / depth) * (BOTTOM - TOP);

  /* The magnified panel's window: the open interval with a margin either side,
     so the band has somewhere to sit rather than filling the frame. */
  const margin = Math.max(report.openFeet, 40);
  const windowTop = well.openTopFt - margin;
  const windowBottom = well.openBottomFt + margin;
  const zoomY = (feet: number) =>
    TOP + ((feet - windowTop) / (windowBottom - windowTop)) * (BOTTOM - TOP);

  return (
    <div>
      <h4 className="text-[13.5px] font-bold">The hole, to scale</h4>

      <div className="mt-2 grid gap-5 sm:grid-cols-2">
        <figure>
          <figcaption className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
            The hole
          </figcaption>
          <svg
            viewBox={`0 0 ${HOLE.width} ${HOLE.height}`}
            className="mt-1 w-full"
            role="img"
            aria-label={`The wellbore runs ${formatCount(depth)} ft of measured depth and is perforated over ${formatCount(report.openFeet)} ft of it.`}
          >
            <text x={72} y={14} className="fill-mv-muted text-[9px] font-bold tracking-[0.1em] uppercase">
              Surface
            </text>

            {/* The casing: the whole hole, in one pale column. */}
            <rect
              x={72}
              y={TOP}
              width={16}
              height={BOTTOM - TOP}
              rx={3}
              className="fill-mv-portal-wash"
            />

            {/* The open interval, drawn where it really is — a sliver. */}
            <rect
              x={70}
              y={y(well.openTopFt)}
              width={20}
              height={Math.max(y(well.openBottomFt) - y(well.openTopFt), 1.5)}
              className="fill-mv-ink"
            />

            {[0, depth / 2, depth].map((feet) => (
              <text
                key={feet}
                x={64}
                y={y(feet) + 3}
                textAnchor="end"
                className="fill-mv-muted text-[8.5px] tabular-nums"
              >
                {feet === 0 ? "0" : `${(feet / 1000).toFixed(1)}k`}
              </text>
            ))}

            {/* The callout, pulled clear of the column — at this scale a label
                beside the band would overlap the band. */}
            <line
              x1={90}
              x2={104}
              y1={y(well.openTopFt) + 1}
              y2={y(well.openTopFt) - 8}
              className="stroke-mv-line-strong"
              strokeWidth={1}
            />
            <text x={106} y={y(well.openTopFt) - 10} className="fill-mv-ink text-[10px] font-bold">
              open {formatCount(report.openFeet)} ft
            </text>
            <text x={106} y={y(well.openTopFt) + 2} className="fill-mv-muted text-[8.5px]">
              {formatCount(report.trueVerticalFt)} ft straight down
            </text>
            <text x={106} y={y(well.openTopFt) + 13} className="fill-mv-muted text-[8.5px]">
              {formatCount(depth)} ft of hole
            </text>
          </svg>
        </figure>

        <figure>
          <figcaption className="text-[10px] font-bold tracking-[0.08em] text-mv-muted uppercase">
            The open interval, magnified
          </figcaption>
          <svg
            viewBox={`0 0 ${HOLE.width} ${HOLE.height}`}
            className="mt-1 w-full"
            role="img"
            aria-label={`The perforated interval runs from ${formatCount(well.openTopFt)} to ${formatCount(well.openBottomFt)} ft, ${report.openPercentOfHole.toFixed(1)}% of the hole.`}
          >
            <rect
              x={62}
              y={TOP}
              width={22}
              height={BOTTOM - TOP}
              rx={3}
              className="fill-mv-portal-wash"
            />

            <rect
              x={62}
              y={zoomY(well.openTopFt)}
              width={22}
              height={zoomY(well.openBottomFt) - zoomY(well.openTopFt)}
              className="fill-mv-ink"
            />
            {/* The perforations themselves — hatching, so the dark band reads as
                holes in a pipe rather than as a solid plug. */}
            {Array.from({ length: 6 }, (_, step) => {
              const top = zoomY(well.openTopFt);
              const height = zoomY(well.openBottomFt) - top;
              return (
                <line
                  key={step}
                  x1={62}
                  x2={84}
                  y1={top + ((step + 1) * height) / 7}
                  y2={top + ((step + 1) * height) / 7}
                  className="stroke-mv-card"
                  strokeWidth={1.5}
                />
              );
            })}

            {[windowTop, well.openTopFt, well.openBottomFt, windowBottom].map(
              (feet) => (
                <text
                  key={feet}
                  x={56}
                  y={zoomY(feet) + 3}
                  textAnchor="end"
                  className="fill-mv-muted text-[8.5px] tabular-nums"
                >
                  {formatCount(Math.round(feet))}
                </text>
              ),
            )}

            {/* The bracket: the measured extent of the band, labelled. */}
            <path
              d={`M96 ${zoomY(well.openTopFt)}h6v${zoomY(well.openBottomFt) - zoomY(well.openTopFt)}h-6`}
              fill="none"
              className="stroke-mv-ink"
              strokeWidth={1.2}
            />
            <text
              x={108}
              y={(zoomY(well.openTopFt) + zoomY(well.openBottomFt)) / 2 - 4}
              className="fill-mv-ink text-[11px] font-bold"
            >
              {formatCount(report.openFeet)} ft open
            </text>
            <text
              x={108}
              y={(zoomY(well.openTopFt) + zoomY(well.openBottomFt)) / 2 + 8}
              className="fill-mv-muted text-[8.5px]"
            >
              {formatCount(well.openTopFt)} – {formatCount(well.openBottomFt)} ft
            </text>
            <text
              x={108}
              y={(zoomY(well.openTopFt) + zoomY(well.openBottomFt)) / 2 + 19}
              className="fill-mv-muted text-[8.5px]"
            >
              {report.openPercentOfHole.toFixed(1)}% of the hole
            </text>
          </svg>
        </figure>
      </div>

      <p className="mt-2 text-[12px] leading-[1.6] text-mv-slate">
        The scale is <strong>measured depth</strong> — the length of hole
        drilled, which on a directional well is longer than the depth below the
        surface. It is a depth rule and not the path: the map draws where the
        hole actually goes. The dark band is the perforated interval, the only
        part of the wellbore open to the reservoir, and the right panel is that
        band on its own scale — {formatCount(report.openFeet)} ft of a{" "}
        {formatCount(depth)} ft hole is too little to see against the whole.
      </p>
    </div>
  );
}
