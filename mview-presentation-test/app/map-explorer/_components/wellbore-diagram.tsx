/*
 * The wellbore in section, drawn to match the well's own profile.
 *
 * One picture per way of drilling: a vertical hole goes straight down, a
 * directional one leans off, a horizontal one turns and runs along the
 * formation with its perforations hanging off it. The card used to draw the
 * horizontal picture whatever the record said, so a well badged VERTICAL was
 * illustrated with a mile of lateral.
 *
 * The ground is three bands rather than one flat panel: the colour change is
 * what says the bore has left the near-surface and entered the producing
 * formation.
 */

const OIL = "#12a13f";
const BORE = "#111827";

/** Where the ground changes, in the SVG's own units. */
const SURFACE_BAND = 34;
const FORMATION_TOP = 80;

/** Which picture a profile gets. Anything unrecognised is drawn vertical. */
function shapeOf(kind: string | null | undefined) {
  const name = (kind ?? "").toLowerCase();
  if (name.includes("horizontal")) return "horizontal" as const;
  if (name.includes("directional") || name.includes("slant"))
    return "directional" as const;
  return "vertical" as const;
}

export function WellboreDiagram({
  kind,
  surface,
  formation,
}: {
  /** The record's `profile` — "Horizontal", "Directional", "Vertical". */
  kind: string | null | undefined;
  /** The ground-level note, top left. */
  surface: string;
  /** The producing formation, bottom right. */
  formation: string;
}) {
  const shape = shapeOf(kind);

  /*
   * The bore, and where its perforations sit.
   *
   * A vertical hole is perforated along its lower section, so the ticks hang
   * off either side of the pipe; the other two are perforated along the part
   * that lies in the formation, so they hang below it.
   *
   * The horizontal and directional bores start at the left because they need
   * the width to run into. A vertical hole needs none, so it is drawn down the
   * middle — against the left edge it read as a lateral that had been cut off.
   */
  const bore =
    shape === "horizontal"
      ? "M30 8 L30 74 Q30 92 52 92 L286 92"
      : shape === "directional"
        ? "M30 8 L30 52 Q30 66 44 74 L210 108"
        : "M150 8 L150 112";

  const label =
    shape === "horizontal"
      ? "Horizontal"
      : shape === "directional"
        ? "Directional"
        : "Vertical";

  return (
    <div className="mt-3 overflow-hidden rounded-lg">
      <svg
        viewBox="0 0 300 120"
        className="h-[120px] w-full"
        role="img"
        aria-label={`${label} wellbore in section`}
      >
        <rect x="0" y="0" width="300" height={SURFACE_BAND} fill="#f3efe4" />
        <rect
          x="0"
          y={SURFACE_BAND}
          width="300"
          height={FORMATION_TOP - SURFACE_BAND}
          fill="#eae4d3"
        />
        <rect
          x="0"
          y={FORMATION_TOP}
          width="300"
          height={120 - FORMATION_TOP}
          fill="#dff0e4"
        />

        <text
          x="10"
          y="14"
          className="text-[6px] font-bold uppercase tracking-[.12em]"
          fill="#8a8a5f"
        >
          {surface}
        </text>
        <text
          x="10"
          y="50"
          className="text-[6px] font-bold uppercase tracking-[.12em]"
          fill="#2e8f6d"
        >
          {label}
        </text>
        <text
          x="232"
          y="76"
          className="text-[6px] font-bold uppercase tracking-[.12em]"
          fill="#2e8f6d"
        >
          {formation}
        </text>

        <path
          d={bore}
          fill="none"
          stroke={BORE}
          strokeWidth="3"
          strokeLinecap="round"
        />

        {shape === "horizontal" &&
          Array.from({ length: 17 }, (_, index) => (
            <line
              key={index}
              x1={70 + index * 13}
              y1="92"
              x2={70 + index * 13}
              y2="104"
              stroke={OIL}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ))}

        {shape === "directional" &&
          Array.from({ length: 9 }, (_, index) => (
            <line
              key={index}
              // Along the slant, dropping away from it into the formation.
              x1={70 + index * 16}
              y1={80 + index * 3.2}
              x2={70 + index * 16}
              y2={92 + index * 3.2}
              stroke={OIL}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ))}

        {shape === "vertical" &&
          Array.from({ length: 6 }, (_, index) => (
            <g key={index}>
              {/* Either side of the pipe, down the producing section. */}
              <line
                x1="142"
                y1={84 + index * 6}
                x2="134"
                y2={84 + index * 6}
                stroke={OIL}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <line
                x1="158"
                y1={84 + index * 6}
                x2="166"
                y2={84 + index * 6}
                stroke={OIL}
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </g>
          ))}
      </svg>
    </div>
  );
}
