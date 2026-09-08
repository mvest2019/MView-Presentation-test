"use client";

import { CROW_A_PLAT, crowAUnitOutline } from "../_lib/unit-outline-data";
import type { UnitOutlineWell } from "../_lib/lease-report-types";
import {
  boundaryPoints,
  clusterSurfaceHoles,
  formatApi,
  FRAME,
  imageryUrl,
  project,
  wideViewMatrix,
  type Bbox,
} from "../_lib/unit-outline-projection";
import type { UnitOutlineLayers, UnitOutlineView } from "./unit-outline-panel";

/**
 * THE MAP ITSELF — one SVG over one satellite raster.
 *
 * ── DECLARATIVE, WHERE THE PROTOTYPE WAS IMPERATIVE ──
 *
 * The original built this by clearing eight `<g>` elements and re-appending
 * every node through `createElementNS` on each render, roughly 300 lines. Here
 * the layers are JSX and React does the diffing, which is the whole reason the
 * layer toggles are one boolean each rather than eight DOM sync routines.
 *
 * ── THE DRAWING RULES, WHICH ARE THE HONEST PART ──
 *
 * A MEASURED track (a digitized directional survey) is a solid amber path with a
 * dark casing under it. A well with no survey gets a DASHED, subdued chord from
 * its surface hole to its bottom hole, and its tooltip says the bore curves and
 * this line is not the track. Two of twenty-one wells here have surveys, and the
 * two kinds are never drawn alike — a Karnes lateral curves through its build
 * section, so a chord can sit hundreds of feet off the true path. Presenting an
 * estimate as a measurement is the one thing this panel must not do.
 *
 * Bottom holes are amber diamonds; surface holes are white circles, clustered by
 * pad. Neighbouring wells are grey, thin, and drawn first so they sit beneath
 * everything of the reader's own.
 *
 * ── EVERY FEATURE IS TITLED AND CLICKABLE ──
 *
 * `<title>` gives a native tooltip, and `onSelect` puts the same text in the
 * readout panel — because a tooltip is unreachable on a touchscreen and
 * unreadable by a screen reader on an SVG child. One string, three ways in.
 */
export function UnitOutlineMap({
  view,
  layers,
  zoom,
  onSelect,
}: {
  view: UnitOutlineView;
  layers: UnitOutlineLayers;
  /** 1 = full frame. Above ~1.6 the per-well labels become legible. */
  zoom: number;
  onSelect: (info: string) => void;
}) {
  const record = crowAUnitOutline;
  const area = view === "area";
  const bbox: Bbox = area ? record.bbox_wide : record.bbox;
  const p = project(bbox);
  const pads = clusterSurfaceHoles(record.wells, p);

  const measured = record.wells.filter((w) => w.path && w.path.length > 1);
  const estimated = record.wells.filter((w) => !w.path || w.path.length <= 1);

  /* The label layer appears only once the wheel zoom makes it readable — the
     design's own rule, after "can't read what they are" at full frame. */
  const showLabels = zoom >= 1.6;

  const identify = (w: UnitOutlineWell) =>
    `${w.well ? `Well ${w.well}` : `API ${formatApi(w.api)}`}${
      w.rrc ? ` · RRC lease ${w.rrc}` : ""
    } · API ${formatApi(w.api)}`;

  return (
    <svg
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      role="img"
      aria-label={`Satellite imagery of the ${record.unit} pooled unit with its digitized boundary, every well's surface and bottom-hole location, the digitized well paths, and the operator's filed survey plat shown transparently beneath.`}
      /*
       * `slice`, NOT the default `meet`.
       *
       * The viewBox is 960x640 because that is the frame the boundary trace and
       * the plat transform were both solved in. The stage is whatever height the
       * filter rail beside it happens to be, so the two aspect ratios rarely
       * agree — and the default `meet` letterboxes the difference, painting black
       * bars above and below the imagery. (The prototype's answer was to extend
       * the viewBox to the stage's real aspect and re-request the Esri export for
       * the correspondingly wider bbox on every resize; its own note calls the
       * bars out as the thing to avoid.)
       *
       * `slice` fills the frame and crops the overflow instead. It is safe here
       * precisely because it scales UNIFORMLY and centres: the imagery, the plat,
       * the boundary and every wellbore share this one viewBox, so they all move
       * together and stay registered. The only cost is that a sliver of ground at
       * the frame's edge falls outside the stage — and the unit sits well inside
       * its bbox, so nothing of the reader's own is ever clipped.
       */
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 h-full w-full"
    >
      {/* The imagery. `preserveAspectRatio="none"` because the export was
          requested for exactly this bbox at exactly this pixel size, so it
          already matches the frame — any fitting would misregister it. */}
      <image
        href={imageryUrl(bbox)}
        width={FRAME.width}
        height={FRAME.height}
        preserveAspectRatio="none"
      />

      {layers.plat && (
        <g
          opacity={layers.platOpacity / 100}
          transform={area ? wideViewMatrix(record) : undefined}
        >
          <g transform={CROW_A_PLAT.matrix}>
            {/* A translucent white wash under the sheet: the plat is ink on
                transparent, and ink alone over dark satellite imagery is
                unreadable. */}
            <rect
              x={0}
              y={0}
              width={CROW_A_PLAT.width}
              height={CROW_A_PLAT.height}
              fill="#ffffff"
              fillOpacity={0.32}
            />
            <image
              href={CROW_A_PLAT.href}
              width={CROW_A_PLAT.width}
              height={CROW_A_PLAT.height}
            />
          </g>
        </g>
      )}

      {layers.neighbours &&
        record.nbr.map((w) => (
          <g key={`nbr-${w.api}`}>
            <line
              x1={p.x(w.s[0])}
              y1={p.y(w.s[1])}
              x2={p.x(w.b[0])}
              y2={p.y(w.b[1])}
              stroke="#94a3b8"
              strokeWidth={0.9}
              opacity={0.55}
            />
            <circle
              cx={p.x(w.s[0])}
              cy={p.y(w.s[1])}
              r={2.8}
              fill="#cbd5e1"
              stroke="#0d0e17"
              strokeWidth={1}
              opacity={0.9}
            />
          </g>
        ))}

      {layers.unit && (
        <polygon
          points={boundaryPoints(record, bbox)}
          fill="rgba(84,191,150,.12)"
          stroke="var(--color-mv-green)"
          strokeWidth={area ? 2.2 : 3.5}
          strokeLinejoin="round"
        />
      )}

      {layers.paths &&
        estimated.map((w) => {
          const info = `${identify(w)} — STRAIGHT-LINE ESTIMATE (survey not yet digitised): the true bore curves, this chord is not the track`;
          return (
            <line
              key={`est-${w.api}`}
              x1={p.x(w.s[0])}
              y1={p.y(w.s[1])}
              x2={p.x(w.b[0])}
              y2={p.y(w.b[1])}
              stroke="#e2e8f0"
              strokeWidth={1.7}
              strokeDasharray="7 5"
              opacity={0.75}
              className="cursor-pointer"
              onClick={() => onSelect(info)}
            >
              <title>{info}</title>
            </line>
          );
        })}

      {layers.paths &&
        measured.map((w) => {
          const d = w
            .path!.map(
              (pt, i) =>
                `${i ? "L" : "M"}${p.x(pt[0]).toFixed(1)} ${p.y(pt[1]).toFixed(1)}`,
            )
            .join("");
          const info = `${identify(w)} — MEASURED track: digitised directional survey, ${w.n_sta ?? w.path!.length} stations`;
          return (
            <g key={`meas-${w.api}`}>
              {/* Dark casing first, amber over it — the track stays legible over
                  both pale fields and dark tree cover. */}
              <path
                d={d}
                fill="none"
                stroke="#0d0e17"
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={d}
                fill="none"
                stroke="#ffb703"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="cursor-pointer"
                onClick={() => onSelect(info)}
              >
                <title>{info}</title>
              </path>
            </g>
          );
        })}

      {layers.bottomHoles &&
        record.wells.map((w) => {
          const bx = p.x(w.b[0]);
          const by = p.y(w.b[1]);
          const info = `${identify(w)} — bottom hole`;
          return (
            <rect
              key={`bh-${w.api}`}
              x={bx - 4}
              y={by - 4}
              width={8}
              height={8}
              transform={`rotate(45 ${bx.toFixed(1)} ${by.toFixed(1)})`}
              fill="#ffb703"
              stroke="#0d0e17"
              strokeWidth={1.6}
              className="cursor-pointer"
              onClick={() => onSelect(info)}
            >
              <title>{info}</title>
            </rect>
          );
        })}

      {layers.surface &&
        pads.map((pad) => {
          const info =
            (pad.count > 1
              ? `Shared pad — ${pad.count} surface holes: `
              : "Surface hole — ") + pad.names.join(", ");
          return (
            <g
              key={`pad-${pad.x.toFixed(1)}-${pad.y.toFixed(1)}`}
              className="cursor-pointer"
              onClick={() => onSelect(info)}
            >
              <title>{info}</title>
              <circle
                cx={pad.x}
                cy={pad.y}
                r={pad.count > 1 ? 9.5 : 4.5}
                fill="#ffffff"
                stroke="#0d0e17"
                strokeWidth={pad.count > 1 ? 2.2 : 2}
              />
              {pad.count > 1 && (
                <text
                  x={pad.x}
                  y={pad.y + 3.6}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={800}
                  fill="#0d0e17"
                  className="pointer-events-none"
                >
                  {pad.count}
                </text>
              )}
            </g>
          );
        })}

      {showLabels && (
        <g
          fontWeight={700}
          fill="#ffffff"
          stroke="#0d0e17"
          strokeWidth={2.6}
          paintOrder="stroke"
          className="pointer-events-none"
          /* The labels are drawn in frame coordinates, so they scale with the
             zoom transform on the wrapper. Shrinking the font by the zoom keeps
             them at a constant on-screen size. */
          fontSize={13 / zoom}
        >
          {record.wells.map((w) => (
            <text key={`lbl-${w.api}`} x={p.x(w.b[0]) + 7} y={p.y(w.b[1]) - 7}>
              {w.well ?? formatApi(w.api)}
            </text>
          ))}
          {layers.neighbours &&
            record.nbr.map((w) => (
              <text
                key={`nlbl-${w.api}`}
                x={p.x(w.s[0]) + 5}
                y={p.y(w.s[1]) - 5}
                fillOpacity={0.92}
              >
                {w.well ?? formatApi(w.api)}
              </text>
            ))}
        </g>
      )}

      {/* The measured tracks get named on the map while they are few — two here.
          Above four the labels crowd each other and the layer above carries the
          identity instead. */}
      {!area && layers.paths && measured.length <= 4 &&
        measured.map((w) => {
          const mid = w.path![Math.floor(w.path!.length / 2)];
          return (
            <text
              key={`mlbl-${w.api}`}
              x={p.x(mid[0]) + 10}
              y={p.y(mid[1]) - 8}
              fontSize={13}
              fontWeight={700}
              fill="#ffd166"
              stroke="#0d0e17"
              strokeWidth={3}
              paintOrder="stroke"
              className="pointer-events-none"
            >
              {w.well ?? w.api} — measured survey
            </text>
          );
        })}
    </svg>
  );
}
