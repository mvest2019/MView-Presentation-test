"use client";

import {
  Crosshair,
  Download,
  LandPlot,
  Ruler,
  SquareDashed,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

/*
 * Each map tool, shown once in a window of its own before you use it.
 *
 * The samples used to play on the live map, and that was the problem: the
 * demonstration and the thing being demonstrated shared one surface, so the
 * drawn box or line landed on the reader's own view and had to be cleared
 * before anything could be done. Here it happens in a window, and closing the
 * window hands the real map over armed and empty.
 *
 * The little map is not a second Esri view — one is expensive, and a demo does
 * not need a basemap. It is the wells the map has actually loaded, plotted into
 * a box, so the field in the picture is this reader's own.
 *
 * Every figure the demo lands on is worked out from those plotted wells: the
 * count is the dots inside the shape, and the distances and acres come from the
 * coordinates the dots were placed from. Nothing here is written down as a
 * plausible-looking number.
 */

export type DemoTool =
  | "draw-area"
  | "measure-distance"
  | "whats-near-my-land"
  | "measure-area";

export type DemoWell = { lon: number; lat: number };

/** The mini-map's own coordinate space. */
const BOX = { width: 520, height: 300 };

/** The inset the dots are plotted within, leaving the edges clear. */
const INSET = 14;

/*
 * How long the gesture takes, and in how many steps.
 *
 * About four seconds — slower than the drag it stands in for, deliberately.
 * The gesture is the whole point of the window, and it is being watched rather
 * than made: at the speed someone would actually draw it, it was over before
 * the eye had found it. The tract has four corners to place inside this, which
 * is the slowest of the four and sets the pace for the rest.
 */
const FRAMES = 60;
const FRAME_MS = 68;

/** A beat on the finished shape before its reading appears. */
const SETTLE_MS = 260;

/** Metres per degree, near enough at Texas latitudes for a demo's figures. */
const METRES_PER_DEGREE_LAT = 110574;
const METRES_PER_DEGREE_LON = 111320;
const METRES_PER_MILE = 1609.344;
const SQUARE_METRES_PER_ACRE = 4046.8564224;

/** What each tool is called, and what it tells you to do next. */
const COPY: Record<
  DemoTool,
  { icon: LucideIcon; title: string; lead: string; then: string }
> = {
  "draw-area": {
    icon: SquareDashed,
    title: "Draw an area",
    lead: "Watch it once here, then do it on the map yourself.",
    then: "Press and drag a box across the map — or click two opposite corners. Every well inside it is counted, and the CSV is those wells.",
  },
  "measure-distance": {
    icon: Ruler,
    title: "Measure distance",
    lead: "Watch it once here, then do it on the map yourself.",
    then: "Press at one point and drag to another. The reading is the distance across the ground, not across the screen.",
  },
  "whats-near-my-land": {
    icon: Crosshair,
    title: "What's near my land?",
    lead: "Watch it once here, then do it on the map yourself.",
    then: "Click your land. The lease under that point is looked up, and the Commission's own records say what is around it.",
  },
  "measure-area": {
    icon: LandPlot,
    title: "Measure area",
    lead: "Watch it once here, then do it on the map yourself.",
    then: "Click each corner of the tract, then click the first one again to close it. The acreage is geodesic, as a survey would give it.",
  },
};

export function ToolDemo({
  tool,
  wells,
  onClose,
}: {
  tool: DemoTool;
  /** Whatever the map has loaded — plotted as the field to work over. */
  wells: DemoWell[];
  /** Closing hands the tool to the real map. */
  onClose: () => void;
}) {
  /** 0 → nothing done, 1 → the gesture is complete. */
  const [through, setThrough] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      setThrough(Math.min(1, frame / FRAMES));
      if (frame >= FRAMES) clearInterval(timer);
    }, FRAME_MS);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (through < 1) return;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [through]);

  /* Esc closes it, as it cancels every tool on the map. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const field = plot(wells);
  const copy = COPY[tool];
  const Icon = copy.icon;

  /* Eased, so the gesture slows as it lands rather than stopping dead. */
  const eased = 1 - (1 - through) ** 3;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`How ${copy.title} works`}
      className="absolute inset-0 z-40 grid place-items-center bg-[#0d0e17]/45 px-4"
    >
      <div className="w-[min(560px,100%)] overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv-lg">
        {/* ---------------- what this is ---------------- */}
        <div className="flex items-start gap-3 border-b border-mv-line px-[18px] py-[14px]">
          <span
            aria-hidden="true"
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
          >
            <Icon size={16} strokeWidth={2} />
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[14.5px] font-bold leading-tight text-mv-ink">
              {copy.title}
              <span className="ml-[8px] inline-block rounded bg-mv-mint px-[6px] py-[3px] align-[2px] text-[9px] font-extrabold uppercase leading-none tracking-[.08em] text-mv-green-deep">
                Sample
              </span>
            </h2>
            <p className="mt-[4px] text-[11.5px] leading-snug text-mv-muted">
              {copy.lead}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded text-mv-muted hover:bg-[#f2f8f5] hover:text-mv-green-deep"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* ---------------- the little map ---------------- */}
        <div className="px-[18px] pt-[14px]">
          <div className="relative overflow-hidden rounded-xl border border-mv-line bg-[#f7f7ee]">
            <svg
              viewBox={`0 0 ${BOX.width} ${BOX.height}`}
              className="block h-auto w-full"
              role="img"
              aria-label={`${copy.title} demonstrated over ${field.dots.length} wells`}
            >
              {/* Section lines, for something under the dots. */}
              <g stroke="#e6e4d2" strokeWidth="1">
                {[0.25, 0.5, 0.75].map((at) => (
                  <line
                    key={`v${at}`}
                    x1={at * BOX.width}
                    y1="0"
                    x2={at * BOX.width}
                    y2={BOX.height}
                  />
                ))}
                {[0.33, 0.66].map((at) => (
                  <line
                    key={`h${at}`}
                    x1="0"
                    y1={at * BOX.height}
                    x2={BOX.width}
                    y2={at * BOX.height}
                  />
                ))}
              </g>

              {field.dots.map((dot, index) => (
                <circle
                  key={index}
                  cx={dot.x}
                  cy={dot.y}
                  r="3"
                  fill="#12a13f"
                  opacity="0.9"
                />
              ))}

              <Gesture tool={tool} eased={eased} through={through} />
            </svg>

            {/* The reading the real tool lands on, in miniature. */}
            {settled && <Reading tool={tool} field={field} />}
          </div>
        </div>

        {/* ---------------- what to do next ---------------- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-[18px] py-[14px]">
          <p className="min-w-0 flex-1 text-[11.5px] leading-snug text-mv-slate">
            {copy.then}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg bg-mv-green-deep px-[15px] py-[9px] text-[12.5px] font-semibold text-white hover:brightness-105"
          >
            Let me try
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the gesture */

/** Where each tool's shape sits, as shares of the mini-map. */
const AREA = { left: 0.17, top: 0.16, right: 0.72, bottom: 0.74 };
const LINE = { from: [0.15, 0.7], to: [0.78, 0.26] } as const;
const WATCH = { at: [0.45, 0.5], radius: 0.3 } as const;
const TRACT = [
  [0.2, 0.24],
  [0.66, 0.2],
  [0.72, 0.68],
  [0.24, 0.72],
] as const;

const BLUE = "#2563eb";

function Gesture({
  tool,
  eased,
  through,
}: {
  tool: DemoTool;
  eased: number;
  through: number;
}) {
  if (through <= 0) return null;

  if (tool === "draw-area") {
    return (
      <rect
        x={AREA.left * BOX.width}
        y={AREA.top * BOX.height}
        width={(AREA.right - AREA.left) * BOX.width * eased}
        height={(AREA.bottom - AREA.top) * BOX.height * eased}
        fill={BLUE}
        fillOpacity="0.08"
        stroke={BLUE}
        strokeWidth="2"
        strokeDasharray="7 5"
      />
    );
  }

  if (tool === "measure-distance") {
    const from = { x: LINE.from[0] * BOX.width, y: LINE.from[1] * BOX.height };
    const to = { x: LINE.to[0] * BOX.width, y: LINE.to[1] * BOX.height };
    const now = {
      x: from.x + (to.x - from.x) * eased,
      y: from.y + (to.y - from.y) * eased,
    };

    return (
      <g>
        <line
          x1={from.x}
          y1={from.y}
          x2={now.x}
          y2={now.y}
          stroke={BLUE}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={from.x} cy={from.y} r="5" fill="#fff" stroke={BLUE} strokeWidth="2.5" />
        <circle cx={now.x} cy={now.y} r="5" fill="#fff" stroke={BLUE} strokeWidth="2.5" />
      </g>
    );
  }

  if (tool === "whats-near-my-land") {
    const at = { x: WATCH.at[0] * BOX.width, y: WATCH.at[1] * BOX.height };
    /* Never quite zero: a circle of no radius has nothing to draw. */
    const radius = Math.max(2, WATCH.radius * BOX.height * eased);

    return (
      <g>
        <circle
          cx={at.x}
          cy={at.y}
          r={radius}
          fill={BLUE}
          fillOpacity="0.07"
          stroke={BLUE}
          strokeWidth="2"
          strokeDasharray="7 5"
        />
        <circle cx={at.x} cy={at.y} r="5" fill={BLUE} />
      </g>
    );
  }

  /*
   * The tract is clicked out corner by corner, which is the gesture it stands
   * in for — one beat each, then the ring closes.
   */
  const placed = Math.min(TRACT.length, Math.ceil(eased * (TRACT.length + 1)));
  const corners = TRACT.slice(0, placed).map(([x, y]) => ({
    x: x * BOX.width,
    y: y * BOX.height,
  }));
  const closed = eased >= 1;

  return (
    <g>
      {corners.length > 1 && (
        <polyline
          points={corners.map((corner) => `${corner.x},${corner.y}`).join(" ")}
          fill={closed ? BLUE : "none"}
          fillOpacity={closed ? 0.08 : 0}
          stroke={BLUE}
          strokeWidth="2"
          strokeDasharray="7 5"
        />
      )}
      {closed && (
        <line
          x1={corners[corners.length - 1].x}
          y1={corners[corners.length - 1].y}
          x2={corners[0].x}
          y2={corners[0].y}
          stroke={BLUE}
          strokeWidth="2"
          strokeDasharray="7 5"
        />
      )}
      {corners.map((corner, index) => (
        <circle
          key={index}
          cx={corner.x}
          cy={corner.y}
          r="4.5"
          fill="#fff"
          stroke={BLUE}
          strokeWidth="2.5"
        />
      ))}
    </g>
  );
}

/* ------------------------------------------------------------ the reading */

function Reading({ tool, field }: { tool: DemoTool; field: Field }) {
  if (tool === "draw-area") {
    const box = {
      x: AREA.left * BOX.width,
      y: AREA.top * BOX.height,
      width: (AREA.right - AREA.left) * BOX.width,
      height: (AREA.bottom - AREA.top) * BOX.height,
    };
    const inside = field.dots.filter(
      (dot) =>
        dot.x >= box.x &&
        dot.x <= box.x + box.width &&
        dot.y >= box.y &&
        dot.y <= box.y + box.height,
    ).length;

    return (
      <Card>
        <Figure value={inside.toLocaleString("en-US")} unit={"wells in\nthis area"} />
        <Chip>
          <Download size={11} aria-hidden="true" />
          Export CSV
        </Chip>
      </Card>
    );
  }

  if (tool === "measure-distance") {
    const miles = field.milesBetween(
      { x: LINE.from[0] * BOX.width, y: LINE.from[1] * BOX.height },
      { x: LINE.to[0] * BOX.width, y: LINE.to[1] * BOX.height },
    );

    return (
      <Card>
        <Figure
          value={miles === null ? "—" : miles.toFixed(2)}
          unit={"miles\nacross"}
        />
      </Card>
    );
  }

  if (tool === "whats-near-my-land") {
    const at = { x: WATCH.at[0] * BOX.width, y: WATCH.at[1] * BOX.height };
    const radius = WATCH.radius * BOX.height;
    const inside = field.dots.filter(
      (dot) => Math.hypot(dot.x - at.x, dot.y - at.y) <= radius,
    ).length;
    const miles = field.milesBetween(at, { x: at.x + radius, y: at.y });

    return (
      <Card>
        <Figure
          value={inside.toLocaleString("en-US")}
          unit={
            miles === null
              ? "wells\nnearby"
              : `wells within\n${miles.toFixed(1)} miles`
          }
        />
      </Card>
    );
  }

  const acres = field.acresOf(
    TRACT.map(([x, y]) => ({ x: x * BOX.width, y: y * BOX.height })),
  );

  return (
    <Card>
      <Figure
        value={acres === null ? "—" : Math.round(acres).toLocaleString("en-US")}
        unit={"acres in\nthis tract"}
      />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-[10px] rounded-xl border border-mv-line bg-white px-[13px] py-[9px] shadow-mv">
      {children}
    </div>
  );
}

function Figure({ value, unit }: { value: string; unit: string }) {
  const [first, second] = unit.split("\n");

  return (
    <>
      <span className="text-[19px] font-bold leading-none tabular-nums text-mv-ink">
        {value}
      </span>
      <span className="text-[11px] leading-tight text-mv-muted">
        {first}
        <br />
        {second}
      </span>
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 flex items-center gap-[5px] rounded-lg bg-mv-green-deep px-[9px] py-[6px] text-[10.5px] font-semibold text-white">
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- the field */

type Field = {
  dots: { x: number; y: number }[];
  /** Ground miles between two points of the mini-map, or null with no bbox. */
  milesBetween: (
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => number | null;
  /** Acres inside a ring of mini-map points, or null with no bbox. */
  acresOf: (ring: { x: number; y: number }[]) => number | null;
};

/**
 * The loaded wells, fitted into the mini-map — and the way back out again.
 *
 * Scaled to their own bounding box rather than the map's extent, so a field off
 * in one corner of the view still fills the picture. Latitude is flipped, north
 * being up.
 *
 * Keeping the box means the picture can be measured: a length or an area drawn
 * over these dots is turned back into degrees and then into miles or acres, so
 * the readings the demo lands on are the ones the real tool would give over the
 * same ground.
 *
 * Where the map has no wells loaded — zoomed out over the bubbles — a scattered
 * field stands in and the measurements are withheld rather than guessed.
 */
function plot(wells: DemoWell[]): Field {
  const width = BOX.width - INSET * 2;
  const height = BOX.height - INSET * 2;

  if (wells.length < 12) {
    /* A fixed pseudo-random field: the same every time, so the demo does not
       flicker between openings, and no `Math.random` in a render. */
    const dots = Array.from({ length: 150 }, (_, index) => {
      const x = (Math.sin(index * 12.9898) + 1) / 2;
      const y = (Math.sin(index * 78.233) + 1) / 2;
      return { x: INSET + x * width, y: INSET + y * height };
    });

    return { dots, milesBetween: () => null, acresOf: () => null };
  }

  const lons = wells.map((well) => well.lon);
  const lats = wells.map((well) => well.lat);
  const west = Math.min(...lons);
  const east = Math.max(...lons);
  const south = Math.min(...lats);
  const north = Math.max(...lats);

  const spanLon = east - west || 1;
  const spanLat = north - south || 1;
  const midLat = (north + south) / 2;

  /** A mini-map point, back in metres from the box's south-west corner. */
  const metres = (point: { x: number; y: number }) => ({
    east:
      (((point.x - INSET) / width) * spanLon) *
      METRES_PER_DEGREE_LON *
      Math.cos((midLat * Math.PI) / 180),
    north:
      ((1 - (point.y - INSET) / height) * spanLat) * METRES_PER_DEGREE_LAT,
  });

  return {
    dots: wells.slice(0, 600).map((well) => ({
      x: INSET + ((well.lon - west) / spanLon) * width,
      y: INSET + ((north - well.lat) / spanLat) * height,
    })),

    milesBetween: (a, b) => {
      const one = metres(a);
      const other = metres(b);
      return (
        Math.hypot(one.east - other.east, one.north - other.north) /
        METRES_PER_MILE
      );
    },

    /* Shoelace over the ring in metres. */
    acresOf: (ring) => {
      const points = ring.map(metres);
      let twice = 0;
      for (let index = 0; index < points.length; index += 1) {
        const one = points[index];
        const next = points[(index + 1) % points.length];
        twice += one.east * next.north - next.east * one.north;
      }
      return Math.abs(twice / 2) / SQUARE_METRES_PER_ACRE;
    },
  };
}
