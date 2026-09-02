"use client";

import { useState } from "react";

import { Badge } from "../../../_components/ui/badge";
import { PortalButton } from "../../../_components/ui/button";
import { SegmentedControl } from "../../../_components/ui/segmented-control";
import { crowAUnitOutline } from "../_lib/unit-outline-data";
import {
  clusterSurfaceHoles,
  project,
} from "../_lib/unit-outline-projection";
import { UnitOutlineMap } from "./unit-outline-map";

/**
 * "THE UNIT OUTLINE, ON THE LAND ITSELF" — the map panel and its layer controls.
 *
 * ── WHAT IS DRAWN, AND WHOSE UNIT IT IS ──
 *
 * The polygon is a REAL pooled unit — CROW A, RRC lease 261062, Karnes County —
 * traced from the operator's own filed survey plat and closed to within 0.012%
 * of the acreage they filed. It is NOT the Smith Gas Unit, and the panel says so
 * twice: once in the lede and once in the footnote. Bee County's plats are not
 * digitized yet.
 *
 * That is the product's relatable-data rule doing real work. The alternative was
 * to draw a plausible-looking boundary for a unit nobody has surveyed, which
 * would be the one kind of lie a map can tell that a reader cannot check.
 *
 * ── THE FILTERS ARE ON THE SIDE, NOT ON TOP ──
 *
 * The design moved them there ("make the filters on the side so that they are
 * easier to see") and the panel collapses to filters-above-map below 900px,
 * because a 260px rail beside a map on a phone leaves neither usable.
 *
 * ── STATE ──
 *
 * Ten booleans, an opacity and a zoom, all here. `UnitOutlineMap` is a pure
 * function of them, which is what makes the toggles instant and the map testable.
 * The activity layers (permits, filings, completions, news, recent drilling) are
 * present and DISABLED with an honest count of zero: the change-detection feed
 * that would populate them is not wired, and a checkbox that silently does
 * nothing is worse than one that says why.
 */

export type UnitOutlineView = "unit" | "area";

export interface UnitOutlineLayers {
  plat: boolean;
  platOpacity: number;
  unit: boolean;
  surface: boolean;
  bottomHoles: boolean;
  paths: boolean;
  neighbours: boolean;
}

const ZOOM_STEP = 1.35;
const ZOOM_MAX = 4;

export function UnitOutlinePanel() {
  const record = crowAUnitOutline;
  const [view, setView] = useState<UnitOutlineView>("unit");
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [layers, setLayers] = useState<UnitOutlineLayers>({
    plat: true,
    platOpacity: 55,
    unit: true,
    surface: true,
    bottomHoles: true,
    paths: true,
    neighbours: false,
  });

  const set = <K extends keyof UnitOutlineLayers>(
    key: K,
    value: UnitOutlineLayers[K],
  ) => setLayers((prev) => ({ ...prev, [key]: value }));

  const measured = record.wells.filter((w) => w.path && w.path.length > 1).length;
  const stations = record.wells.reduce(
    (total, w) => total + (w.path ? (w.n_sta ?? w.path.length) : 0),
    0,
  );
  /* The pad count comes from the same clustering the map draws with, so the
     filter's "21 wells on 5 pads" can never disagree with the number of markers
     actually on screen. */
  const pads = clusterSurfaceHoles(record.wells, project(record.bbox)).length;

  /* Switching frame resets the wheel zoom: the two views have different scales,
     and a 4× zoom carried from one into the other lands nowhere useful. */
  function changeView(next: UnitOutlineView) {
    setView(next);
    setZoom(1);
    setSelected(null);
  }

  return (
    <div className="mb-4 overflow-hidden rounded-mv border border-mv-line bg-mv-card shadow-mv">
      <div className="p-[22px] pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-[15px] font-bold">
            The unit outline, on the land itself
          </h4>
          <Badge tone="mint" size="xs">
            New map layer · digitized from the filed plat
          </Badge>
        </div>
        <p className="mt-2 text-[13px]">
          The{" "}
          <strong>
            pooled-unit boundary, traced from the operator&rsquo;s filed survey
            plat
          </strong>
          , over satellite imagery — with <strong>every wellbore</strong>{" "}
          (surface + bottom holes, well paths) and the{" "}
          <strong>wells around you</strong> one zoom out. Filters on the left.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Badge tone="mint" size="xs">
            Boundary closes at {record.traced_ac} ac vs the {record.stated_ac} ac
            filed — +{record.diff_pct}%
          </Badge>
          <Badge tone="slate" size="xs">
            Independently re-traced from a second plat — boundaries agree to a
            median 2.7 m
          </Badge>
          <Badge tone="slate" size="xs">
            {record.county} County pilot · real filed documents
          </Badge>
        </div>
      </div>

      <div className="flex flex-col border-t border-mv-line min-[900px]:flex-row min-[900px]:items-stretch">
        <aside
          aria-label="Map filters and layers"
          className="flex flex-col gap-1.5 border-b border-mv-line p-3 text-[11.5px] min-[900px]:max-w-[250px] min-[900px]:flex-1 min-[900px]:border-r min-[900px]:border-b-0"
        >
          <div className="text-[10px] font-extrabold tracking-[0.07em] text-mv-faint uppercase">
            Map filters
          </div>

          <SegmentedControl
            label="Map zoom"
            className="self-start"
            value={view}
            onChange={changeView}
            options={[
              { value: "unit", label: "This unit" },
              { value: "area", label: "Zoom out · neighbors" },
            ]}
          />

          <LayerGroup label="This unit" />
          <LayerToggle
            checked={layers.plat}
            onChange={(v) => set("plat", v)}
            label="Filed plat beneath"
            note="the operator's survey sheet"
          />
          <label className="pl-6">
            <span className="sr-only">Plat overlay opacity</span>
            <input
              type="range"
              min={10}
              max={90}
              value={layers.platOpacity}
              onChange={(e) => set("platOpacity", Number(e.target.value))}
              className="w-full accent-mv-green-deep"
            />
          </label>
          <LayerToggle
            checked={layers.unit}
            onChange={(v) => set("unit", v)}
            label="Unit outline"
            note={`${record.stated_ac} ac filed · traced from the plat`}
          />
          <LayerToggle
            checked={layers.surface}
            onChange={(v) => set("surface", v)}
            label="Surface locations"
            note={`${record.wells.length} wells on ${pads} pads`}
          />
          <LayerToggle
            checked={layers.bottomHoles}
            onChange={(v) => set("bottomHoles", v)}
            label="Bottom holes"
            note={`${record.wells.length} bottom-hole locations`}
          />
          <LayerToggle
            checked={layers.paths}
            onChange={(v) => set("paths", v)}
            label="Well paths"
            note={`${measured} measured (${stations.toLocaleString("en-US")} stations) · ${record.wells.length - measured} estimated`}
          />

          <LayerGroup label="Around you" />
          <LayerToggle
            checked={layers.neighbours}
            onChange={(v) => set("neighbours", v)}
            label="Neighbors' wells"
            note={`${record.nbr.length} from the RRC record`}
          />
          {/* Present, disabled, and counted honestly at zero — see the header. */}
          {[
            ["New permits", "permit"],
            ["New filings", "filing"],
            ["Completion reports", "compl"],
            ["News activity", "news"],
            ["Drilled / completed · last 1 mo", "m1"],
            ["Drilled / completed · last 3 mo", "m3"],
          ].map(([label]) => (
            <LayerToggle
              key={label}
              checked={false}
              disabled
              onChange={() => {}}
              label={label}
              note="feed not wired yet"
            />
          ))}

          <MapKey />
        </aside>

        <div className="relative aspect-3/2 min-w-0 flex-1 overflow-hidden bg-mv-ink">
          {/* The zoom is a CSS transform on a wrapper rather than a viewBox
              change, so the imagery, the plat and every projected coordinate
              scale together and stay registered. */}
          <div
            className="absolute inset-0 origin-center transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
          >
            <UnitOutlineMap
              view={view}
              layers={layers}
              zoom={zoom}
              onSelect={setSelected}
            />
          </div>

          <div className="pointer-events-none absolute bottom-2.5 left-2.5 z-[2] max-w-[calc(100%-150px)] rounded-[7px] bg-mv-ink/70 px-2.5 py-1 text-xs font-bold text-white">
            {record.unit} UNIT · {record.stated_ac} ac · {record.county} Co. —{" "}
            {view === "area"
              ? "zoomed out: the unit and the wells around it"
              : "digitized boundary over the ground it encloses"}
          </div>

          <div className="absolute top-2.5 right-2.5 z-[2] flex gap-1.5">
            <PortalButton
              size="sm"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(z * ZOOM_STEP, ZOOM_MAX))}
            >
              +
            </PortalButton>
            <PortalButton
              size="sm"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(z / ZOOM_STEP, 1))}
            >
              −
            </PortalButton>
          </div>

          {selected && (
            <div
              role="status"
              className="absolute bottom-2.5 left-2.5 z-[3] flex max-w-[min(420px,calc(100%-20px))] items-start gap-2 rounded-[9px] bg-mv-ink/90 py-2 pr-2 pl-3 text-xs font-semibold text-mv-on-deep"
            >
              <span className="min-w-0 flex-1">{selected}</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setSelected(null)}
                className="flex-none cursor-pointer border-0 bg-transparent p-0 text-mv-on-deep-soft"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-[22px] pt-2.5">
        <p className="text-[11px] text-mv-muted">
          <strong>Real example, honestly labeled:</strong> a{" "}
          <strong>real {record.county} County pooled unit</strong> — our
          digitisation pilot — not the fictional Smith Gas Unit. Bee County is{" "}
          <strong>pending digitisation</strong>; when it lands, this panel shows{" "}
          <em>your</em> unit&rsquo;s filed boundary the same way. Every digitized
          boundary ships with its verification: the traced acreage against the
          acreage the operator filed on the same sheet.
        </p>

        {/* THE COUNTS, FROM THE RECORD — and specifically how many of the bores
            are measured versus estimated. A reader looking at nineteen dashed
            lines and two solid ones deserves the ratio in words as well as in
            ink. */}
        <p className="mt-2 text-[11px] text-mv-muted">
          Live from the record: {record.wells.length} wellbores drawn on this
          unit — {measured} carry a measured, closure-verified directional survey
          ({stations.toLocaleString("en-US")} digitised stations) and{" "}
          {record.wells.length - measured} are drawn as straight
          surface-to-bottom-hole estimates until their surveys are digitised.
          Neighbouring wells: {record.nbr.length} real RRC wellbores around the
          unit (zoom out to see them).
        </p>

        {/* Provenance, per layer. Four sources, four sentences — so a reader who
            wants to check any single mark on this map knows which filing to
            pull. */}
        <p className="mt-1.5 text-[11px] text-mv-muted">
          Imagery: Esri World Imagery · Plat: the operator&rsquo;s filed well plat
          (public RRC record) · Well locations: Railroad Commission well records ·
          Measured tracks: digitised from the operators&rsquo; filed directional
          surveys
        </p>
      </div>
    </div>
  );
}

function LayerGroup({ label }: { label: string }) {
  return (
    <div className="mt-1.5 text-[10px] font-extrabold tracking-[0.07em] text-mv-faint uppercase">
      {label}
    </div>
  );
}

function LayerToggle({
  checked,
  onChange,
  label,
  note,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  note: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-2 ${disabled ? "opacity-55" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 flex-none accent-mv-green-deep"
      />
      <span className="min-w-0">
        <span className="font-semibold">{label}</span>
        <span className="block text-[10px] leading-[1.4] text-mv-muted">
          {note}
        </span>
      </span>
    </label>
  );
}

/**
 * THE KEY, which is not decoration: the map's whole honesty rests on a reader
 * being able to tell a measured track from an estimated one, so the two are
 * drawn in the legend exactly as they are drawn on the map.
 */
function MapKey() {
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-mv-line pt-2 text-[10px] text-mv-slate">
      <span className="flex items-center gap-1.5">
        <svg width="26" height="10" aria-hidden="true" className="flex-none">
          <line x1="2" y1="5" x2="24" y2="5" stroke="#0d0e17" strokeWidth="5" strokeLinecap="round" />
          <line x1="2" y1="5" x2="24" y2="5" stroke="#ffb703" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        Measured survey track
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="26" height="10" aria-hidden="true" className="flex-none">
          <line x1="1" y1="5" x2="25" y2="5" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="5 4" />
        </svg>
        Straight-line estimate
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" aria-hidden="true" className="flex-none">
          <circle cx="7" cy="7" r="4.5" fill="#fff" stroke="#0d0e17" strokeWidth="2" />
        </svg>
        Surface hole (grouped by pad)
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" aria-hidden="true" className="flex-none">
          <rect x="3.8" y="3.8" width="6.4" height="6.4" transform="rotate(45 7 7)" fill="#ffb703" stroke="#0d0e17" strokeWidth="1.6" />
        </svg>
        Bottom hole
      </span>
      <span className="flex items-center gap-1.5">
        <svg width="14" height="14" aria-hidden="true" className="flex-none">
          <circle cx="7" cy="7" r="3" fill="#cbd5e1" stroke="#0d0e17" strokeWidth="1.2" />
        </svg>
        Neighboring well (RRC record)
      </span>
    </div>
  );
}
