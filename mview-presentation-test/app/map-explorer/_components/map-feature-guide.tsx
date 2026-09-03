"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import {
  PlansCta,
  PricingCta,
  RegisterCta,
} from "./map-guide-ctas";
import {
  ChartColumn,
  ArrowRight,
  ArrowUpDown,
  Eye,
  Gauge,
  Hash,
  Info,
  ListChecks,
  Maximize,
  Menu,
  MapPin,
  Pause,
  Play,
  Rows3,
  Search,
  Share2,
  SlidersHorizontal,
  Sparkle,
  Spline,
  TrendingDown,
  Zap,
  Crosshair,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Filter,
  Compass,
  Image as ImageIcon,
  LandPlot,
  Map as MapIcon,
  Layers,
  Ruler,
  Clock,
  SquareDashed,
  Table2,
  type LucideIcon,
} from "lucide-react";

/*
 * What this map can do, shown in place of the map.
 *
 * A view rather than a page: it opens over the explorer at the same URL, the
 * way Table and Insights do, so reading about a feature and using it are one
 * click apart. Back to map returns the exact view that was left — the map is
 * covered, never unmounted.
 *
 * The pictures are the running product, captured from this build: the two map
 * shots through the view's own `takeScreenshot`, the panels through the same
 * capture the PDF export uses. Recapture them when the interface moves — a
 * stale screenshot shows a product that no longer exists.
 *
 * Every figure quoted is one the product reports for itself. Nothing is
 * claimed that the map cannot do today: time-lapse and the email watch are
 * left out, since neither is finished.
 */

/**
 * Every picture in the guide, once, for the strip that runs under the hero.
 *
 * The whole product in one pass — the map at both zooms, the table, the
 * filters, the record and the chart — so the first screen
 * says what this is without the reader scrolling for it.
 */
/**
 * The four views the hero moves through, and what each one is for.
 *
 * One picture at a time with its own words beside it, rather than a strip of
 * everything at once: a reader can take in one claim and one screenshot, and
 * the next pair arrives without them doing anything.
 */
const SLIDES = [
  {
    src: "/map-feature/map-bubbles.png",
    width: 1385,
    height: 816,
    alt: "The map at statewide zoom, well counts drawn as bubbles over Texas",
    icon: MapIcon,
    eyebrow: "The map",
    title: "Every Texas well, on one map",
    body: "Open it and the whole state is there — 1.1 million wells drawn as counts you can read at a glance, one bubble per district, sized by how many it holds.",
  },
  {
    src: "/map-feature/map-wells-field.png",
    width: 2800,
    height: 1632,
    alt: "The map at zoom 10 over Ector County, wells packed across the field, Odessa and Midland in frame",
    icon: Search,
    eyebrow: "Zoom in",
    title: "Down to the wells themselves",
    body: "Past zoom 10 the bubbles give way to the wells, each carrying the Commission's own symbol — oil, gas, plugged, permitted — with horizontal bores drawn along their whole length.",
  },
  {
    src: "/map-feature/view-table.png",
    width: 2800,
    height: 1632,
    alt: "The whole table view: filter bar, summary strip and the rows beneath",
    icon: Table2,
    eyebrow: "The table",
    title: "The same wells, as rows you can sort",
    body: "Switch to Table for API, operator, lease, type, status, county and production — with counts across the top that move as you filter, and a CSV of whatever you are looking at.",
  },
  {
    src: "/map-feature/view-insights.png",
    width: 2800,
    height: 1632,
    alt: "The Insights view: the map on the left, the well record on the right",
    icon: ChartColumn,
    eyebrow: "Insights",
    title: "Open one well and read its record",
    body: "Production and forecast, decline, reserves, the wellbore, the lease and the operator — the completion or the permit, whichever that well is, written up in plain English underneath.",
  },
];

/*
 * How long each slide holds before the next one takes over.
 *
 * Short enough that the bar under the active tab visibly moves rather than
 * creeping — five seconds read as a stall, and the four slides took the best
 * part of half a minute to come round. Hovering the hero pauses it, so anyone
 * still reading a slide can hold it there.
 */
const SLIDE_MS = 3200;


/**
 * What this map can do — the page `/map-explorer` serves when nobody is
 * signed in.
 *
 * It is the page itself now, not an overlay: there is no map behind it, no
 * button that opened it and nothing to close it onto. Signing in is what
 * replaces it, which the page decides on the server from the session cookie.
 */
export function MapFeatureGuide() {
  /* Opened at the top. A visitor arriving from elsewhere on the site may be
     part way down the previous page, and Next carries that over. */
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="relative w-full bg-mv-bg">
      {/* ---------------- hero ---------------- */}
      <header className="relative overflow-hidden border-b border-mv-line bg-gradient-to-b from-[#f2faf6] via-[#fbfdfc] to-white">
        {/* Faint section lines under the whole band — the map is a grid of
            surveys, and the page borrows the idea rather than sitting on flat
            colour. Masked so it fades out before the content ends. */}
        <span
          aria-hidden="true"
          className="mv-hero-grid pointer-events-none absolute inset-0"
          style={{
            maskImage:
              "radial-gradient(80% 60% at 50% 30%, #000, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(80% 60% at 50% 30%, #000, transparent 75%)",
          }}
        />

        <div className="relative mx-auto max-w-[1180px] px-4 lg:px-8">
          <Hero />
        </div>
      </header>

      <StatsBand />

      <main>
        <div>
          {/* ---------------- 1 · the map ---------------- */}
          <Section
            id="map"
            number="01"
            icon={Layers}
            eyebrow="The map"
            title="From Statewide Activity to Individual Well Detail"
            lead="Explore Texas well activity from a broad statewide perspective, then zoom in to districts, local clusters, and individual wells. Mineral View organizes the data visually so you can move from the big picture to specific well information quickly and intuitively."
            points={[
              {
                icon: Layers,
                title: "Navigate from Statewide to Individual Wells",
                body: "Zoom from statewide clusters to sub-clusters and individual wells, with each selection automatically centering the map.",
              },
              {
                icon: Sparkle,
                title: "Texas Railroad Commission Symbols",
                body: "Wells are displayed using familiar Railroad Commission classifications for quick, consistent interpretation.",
              },
              {
                icon: Spline,
                title: "View the Full Wellbore",
                body: "Horizontal wells show the complete wellbore path, helping you understand how laterals relate to nearby acreage and mineral interests.",
              },
              {
                icon: Info,
                title: "Preview Key Well Details",
                body: "Hover over any well to see the API number, well number, operator, status, type, and county.",
              },
            ]}
            image={{
              src: "/map-feature/map-wells-field.png",
              width: 2800,
              height: 1632,
              alt: "The map past zoom 10 over a field, wells packed across it, each with its Railroad Commission symbol",
              caption:
                "Zoom in from clustered well activity to individual well locations and symbols.",
            }}
          />

          {/* ---------------- 2 · the table ---------------- */}
          <Section
            id="table"
            number="02"
            icon={Table2}
            eyebrow="The table"
            title="Turn Map Results Into a Sortable Table"
            lead={[
              "Switch to Table view to explore the same well results in a structured format. Review API number, operator, lease, well type, status, county, and oil and gas production—all in one place.",
              "Summary metrics update automatically as you filter, so the data always reflects your current result set.",
            ]}
            points={[
              {
                icon: Hash,
                title: "Results at a Glance",
                body: "See total wells, oil and gas production, active wells, operators, and counties—updated as filters change.",
              },
              {
                icon: ArrowUpDown,
                title: "Sort by What Matters",
                body: "Sort results by operator, lease, county, production volume, and other key fields to quickly identify relevant wells.",
              },
              {
                icon: MapPin,
                title: "Return to the Map Instantly",
                body: "Use the map pin in any row to locate the well, or open the row to view its complete record.",
              },
              {
                icon: Filter,
                title: "Filter Directly From the Table",
                body: "Apply filters above the table and see both the results and summary metrics update together.",
              },
              {
                icon: Rows3,
                title: "Built for Large Result Sets",
                body: "Navigate large datasets through paginated results while keeping every column easy to sort and review.",
              },
            ]}
            /* In the order the product puts them: the filter bar and the
               counts sit above the rows on screen, so they sit above them
               here too. Reversed, the pair read as two unrelated shots. */
            image={{
              src: "/map-feature/table-toolbar.png",
              width: 2752,
              height: 462,
              alt: "The filter bar with the Status facet open over the summary strip",
              caption:
                "Apply filters directly above the table to refine your results.",
              frame: "wide",
              fit: "contain",
            }}
            second={{
              src: "/map-feature/table-rows.png",
              width: 2756,
              height: 1754,
              alt: "The table's rows: API, operator, lease, type, status, county and the produced volumes, with the pager beneath",
              caption:
                "Review wells page by page, with sortable data across every column.",
            }}
          />

          {/* The map and the table have both been shown by here — enough of
              the product to make signing up an answer to something rather
              than an interruption. */}
          <div className="border-b border-mv-line-soft bg-white">
            <div className="mx-auto max-w-[1180px] px-4 py-9 lg:px-8 lg:py-12">
              <RegisterCta />
            </div>
          </div>

          {/* ---------------- 3 · filters ---------------- */}
          <Section
            id="filters"
            number="03"
            icon={Filter}
            eyebrow="Filters"
            title="Focus on the Wells That Matter Most"
            lead="Refine your search using location, operator, well type, status, play, field, lease, and production criteria. Apply your filters to instantly update the map and view only the wells that match your selection."
            points={[
              {
                icon: ListChecks,
                title: "1 Choose Your Filters",
                body: "Filter by county, operator, well type, status, play, or field. Each option is searchable and shows the number of matching wells.",
              },
              {
                icon: Zap,
                title: "2 Apply and Update the Map",
                body: "Select Apply to refresh the map with your chosen criteria and automatically focus on the matching wells.",
              },
              {
                icon: SlidersHorizontal,
                title: "3 Refine Your Results",
                body: "Add or remove individual filters as needed while keeping the rest of your selections in place. Production ranges can be used to narrow results further.",
              },
              {
                icon: Search,
                title: "Search by Lease, Operator, or County",
                body: "Use the search field to quickly locate a lease, operator, or county and update the map with the relevant results.",
              },
            ]}
            image={{
              src: "/map-feature/filters-choosing.png",
              width: 2800,
              height: 1632,
              alt: "The filters rail with a county being searched for and ticked, before applying",
              caption:
                "Select your criteria, apply the filters, and view the matching wells directly on the map.",
            }}
          />

          {/* ---------------- 4 · insights ---------------- */}
          <Section
            id="insights"
            number="04"
            icon={ChartColumn}
            eyebrow="Insights · completion summary"
            title="Understand What the Well Has Produced"
            lead={[
              "Select a completed well to open its Insights record. The Completion Summary brings together reported production, forecast performance, decline trends, reserves, wellbore details, lease information, and operator data in one clear view.",
              "The Completion label makes it easy to distinguish completed wells from permit records.",
            ]}
            points={[
              {
                icon: ChartColumn,
                title: "Production History & Forecast",
                body: "Review monthly oil and gas production alongside projected future performance, with reported and forecast periods clearly separated.",
              },
              {
                icon: TrendingDown,
                title: "Decline & Reserve Insights",
                body: "See month-over-month production changes, estimated decline rates, gas-oil ratio, and reserve life indicators.",
              },
              {
                icon: Ruler,
                title: "Wellbore Profile",
                body: "View the wellbore configuration, including vertical depth and horizontal lateral placement where available.",
              },
              {
                icon: FileText,
                title: "Lease, Operator & Well Details",
                body: "Access lease and operator information, acreage, district, key dates, depths, and nearby well data.",
              },
              {
                icon: Hash,
                title: "Key Metrics at a Glance",
                body: "Quickly review recent oil and gas production, estimated next-month volumes, and reserve figures.",
              },
              {
                icon: Download,
                title: "Export the Complete Record",
                body: "Download the full well summary as a PDF, including key data, charts, and record details.",
              },
            ]}
            image={{
              src: "/map-feature/view-insights.png",
              width: 2800,
              height: 1632,
              alt: "The Insights view: the map on the left, the well's record on the right",
              caption:
                "The selected well remains highlighted on the map while its complete record is displayed alongside it.",
            }}
            second={{
              src: "/map-feature/production-chart.png",
              width: 1800,
              height: 830,
              fit: "contain",
              frame: "flat",
              alt: "Crude oil and natural gas production chart with reported and forecast months",
              caption:
                "Reported production is shown separately from forecast performance for a clearer view of historical and projected output.",
            }}
          />

          {/* ---------------- 5 · the permit record ---------------- */}
          <Section
            id="permit"
            number="05"
            icon={FileText}
            eyebrow="Insights · permit summary"
            title="Understand What Was Filed to Drill"
            lead="For wells that have been permitted but not yet completed, Mineral View displays the permit record instead of the completion summary. The Permit label clearly identifies the record and helps you review who filed it, what was proposed, where the well is planned, and its current status with the Texas Railroad Commission."
            points={[
              {
                icon: FileText,
                title: "Permit Details",
                body: "Review the filing purpose, permit type, permit date, status, approval information, and key filing data in one place.",
              },
              {
                icon: LandPlot,
                title: "Lease, Operator & Field",
                body: "See the associated lease, county, district, operator information, field, and reservoir details.",
              },
              {
                icon: MapPin,
                title: "Location & Coordinates",
                body: "View surface and bottom-hole coordinates, along with nearby well information for additional geographic context.",
              },
              {
                icon: Sparkle,
                title: "Clear Written Summary",
                body: "Mineral View organizes key permit information into an easy-to-read summary based on the underlying filing data.",
              },
            ]}
            image={{
              src: "/map-feature/ai-summary.png",
              width: 1080,
              height: 338,
              alt: "The written summary card that sits under a record, with its heading, the well it describes and a Regenerate control",
              caption:
                "Review the permit filing alongside a clear summary of the key details and current record information.",
              /* Fitted, not cropped: the card is far wider than the frame and
                 filling it would cut the text in half. */
              fit: "contain",
            }}
          />

          {/* Straight after the two summaries — the part of the product
              that most looks like it must be behind a paywall, and so the
              moment the question of cost actually arrives. */}
          <div className="border-b border-mv-line-soft bg-white">
            <div className="mx-auto max-w-[1180px] px-4 py-9 lg:px-8 lg:py-12">
              <PricingCta />
            </div>
          </div>

          {/* ---------------- 6 · time-lapse ---------------- */}
          <Section
            id="timelapse"
            number="06"
            icon={Clock}
            eyebrow="Time-lapse"
            title="See How a Field Developed Over Time"
            lead="Time-Lapse replays the wells currently shown on the map in the order they were drilled, year by year. It provides a clear visual view of where development began, how activity expanded, and how drilling progressed across the area."
            points={[
              {
                icon: Play,
                title: "Replay Development from the Beginning",
                body: "Start the Time-Lapse to clear the current well display and rebuild the field chronologically from the earliest wells forward.",
              },
              {
                icon: Gauge,
                title: "Track Progress as Wells Appear",
                body: "A live progress indicator shows how many wells have been plotted, so you can follow the replay as it moves through the selected area.",
              },
              {
                icon: Pause,
                title: "Play, Pause, and Resume",
                body: "Pause the replay at any point to examine development for a specific period, then continue when you are ready.",
              },
              {
                icon: Eye,
                title: "Replay the Area You Choose",
                body: "Time-Lapse uses the wells currently loaded on the map. Zoom in or apply filters first to focus the replay on a specific field or area.",
              },
            ]}
            image={{
              src: "/map-feature/timelapse.png",
              width: 2800,
              height: 1632,
              alt: "The time-lapse bar part way through a replay, with wells plotted across the field",
              caption:
                "Watch well development unfold over time as each well is plotted in chronological order.",
            }}
          />

          {/* ---------------- 7 · tools ---------------- */}
          <Section
            id="tools"
            number="07"
            icon={Crosshair}
            eyebrow="Tools"
            title="Explore the Ground with Interactive Map Tools"
            lead="Use Mineral View's map tools to measure, define, and investigate specific areas directly on the map. Each tool includes a guided example so you can quickly understand how it works before using it."
            points={[
              {
                icon: SquareDashed,
                title: "Draw an Area",
                body: "Define a custom area on the map to identify wells within its boundaries. View the acreage, square mileage, well count, and export the matching wells to CSV.",
              },
              {
                icon: Ruler,
                title: "Measure Distance",
                body: "Measure the real-world distance between two points on the map using geodesic calculations for consistent accuracy at any zoom level.",
              },
              {
                icon: LandPlot,
                title: "Measure Area",
                body: "Outline a tract or custom boundary to calculate its acreage using geodesic measurements.",
              },
              {
                icon: Crosshair,
                title: "What's Near My Land",
                body: "Select a location to identify the underlying lease and explore nearby wells, recent permits and completions, the closest wellbore, and related filing data.",
              },
            ]}
            art="tools"
          />
          {/* ---------------- 8 · the rest of the chrome ---------------- */}
          <Section
            id="more"
            number="08"
            icon={Compass}
            eyebrow="Around the map"
            title="Additional Map Controls for Faster Exploration"
            lead="Mineral View includes several supporting controls around the map to help you search, interpret, export, share, and navigate well data more efficiently."
            points={[
              {
                icon: Search,
                title: "Search by API Number",
                body: "Enter a full or partial API number to quickly find matching wells. Results are identified by county, making it easier to locate the correct record without applying multiple filters.",
              },
              {
                icon: Layers,
                title: "Map Legend",
                body: "Use the legend to identify well symbols and classifications, including permitted locations, dry holes, oil wells, gas wells, plugged wells, injection wells, disposal wells, and other statuses.",
              },
              {
                icon: MapIcon,
                title: "Choose Your Basemap",
                body: "Switch between street, satellite, and simplified map views depending on the level of geographic detail you need.",
              },
              {
                icon: Download,
                title: "Export the Current Map View",
                body: "Export the wells or clustered results currently visible on the map to CSV. Pan or zoom to define the area you want to include before exporting.",
              },
              {
                icon: Share2,
                title: "Share, Save, and Print",
                body: "Copy a link to the exact map view you are viewing, save the map as an image, or print the current map for offline reference.",
              },
              {
                icon: Maximize,
                title: "Zoom, Reset, and Full Screen",
                body: "Use the map controls to zoom in or out, return to the default view, or expand the map to full screen for a more focused experience.",
              },
            ]}
            image={{
              src: "/map-feature/chrome-search-view.png",
              width: 1425,
              height: 836,
              alt: "The map over Midland with an API number part typed and the matching wells listed under the toolbar",
              caption:
                "Search by full or partial API number to quickly locate matching wells.",
            }}
            second={{
              src: "/map-feature/chrome-share-field.png",
              width: 1425,
              height: 836,
              alt: "The map closer in over a Permian field, wells and their bores clearly spaced, with the Share menu open",
              caption:
                "Share, save, or print the current map view while preserving the area you are exploring.",
            }}
          />
        </div>

        {/* ---------------- downloads ---------------- */}
        <section
          id="guide-download"
          className="scroll-mt-20 border-b border-mv-line-soft bg-white"
        >
          <div className="mx-auto max-w-[1180px] px-4 py-10 lg:px-8 lg:py-14">
            {/* The same chapter mark the numbered sections carry, so this
                one reads as part of the sequence rather than as an appendix. */}
            <div className="flex items-center gap-3 lg:gap-4">
              <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full border border-mv-mint-edge bg-mv-mint px-[11px] py-[5px] text-[10px] font-extrabold uppercase tracking-[.1em] text-mv-green-deep">
                <Download size={12} strokeWidth={2.5} aria-hidden="true" />
                Take it with you
              </span>

              <span
                aria-hidden="true"
                className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-[#c2c9d2] via-[#dbe0e6] to-transparent"
              />
            </div>

            <h2 className="mt-4 text-[20px] font-bold leading-tight text-mv-ink lg:text-[26px]">
              Export Your Data in the Format You Need
            </h2>
            <p className="mt-[10px] max-w-[70ch] text-[12.5px] leading-relaxed text-mv-slate lg:text-[13.5px]">
              Mineral View makes it easy to take your work beyond the platform.
              Export filtered results, selected areas, current map views, well
              records, and nearby activity without submitting a separate
              request.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: FileSpreadsheet,
                  title: "Table Results — CSV",
                  body: "Export the rows currently displayed in the table, including applied filters and available columns such as API number, operator, lease, type, status, county, oil, and gas production.",
                  note: "API · operator · lease · type · status · county · oil · gas",
                },
                {
                  icon: SquareDashed,
                  title: "Selected Area — CSV",
                  body: "Export wells located within a custom area you draw on the map, based on the wellbore locations included within that boundary.",
                  note: "Counted well by well past zoom 10",
                },
                {
                  icon: MapIcon,
                  title: "Current Map View — CSV",
                  body: "Download the wells or clustered results currently visible on the map, based on your selected zoom level and map extent.",
                  note: "mineral-view-wells.xlsx",
                },
                {
                  icon: ImageIcon,
                  title: "Map View — PNG",
                  body: "Save the current map as an image for use in reports, presentations, or internal documentation.",
                  note: "mineral-view-map.png",
                },
                {
                  icon: FileText,
                  title: "Well Summaries — PDF",
                  body: "Download completion or permit records as formatted PDFs, including key well information and the accompanying written summary.",
                  note: "completion-42-001-32729.pdf · permit-42-227-34620.pdf",
                },
                {
                  icon: Crosshair,
                  title: "Nearby Activity — CSV",
                  body: "Export nearby permits and completions identified around a selected lease or location, including available distance and directional information.",
                  note: "near-7C-04254-1mi.csv",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  /* `flex-col` with the note pushed to the bottom: the bodies
                     are different lengths, and without it the filenames sat at
                     four different heights across the row. */
                  className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-mv-line transition-shadow hover:shadow-mv"
                >
                  {/* Icon and title on one line: stacked, the mark and the
                      name it belongs to read as two separate things. */}
                  <div className="flex items-center gap-[13px]">
                    <span
                      aria-hidden="true"
                      className="grid h-[40px] w-[40px] shrink-0 place-items-center rounded-xl bg-mv-mint text-mv-green-deep"
                    >
                      <card.icon size={19} strokeWidth={1.9} />
                    </span>

                    <h3 className="min-w-0 text-[14.5px] font-bold leading-snug text-mv-ink">
                      {card.title}
                    </h3>
                  </div>

                  <p className="mt-[13px] text-[12.5px] leading-relaxed text-mv-slate">
                    {card.body}
                  </p>

                  {/* What actually lands on disk, ruled off from the claim
                      above it — a filename is evidence, not description. */}
                  <div className="mt-5 flex items-start gap-[9px] border-t border-mv-line-soft pt-[13px]">
                    <FileDown
                      size={13}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="mt-[1px] shrink-0 text-mv-green-deep"
                    />
                    <span
                      title={card.note}
                      className="min-w-0 truncate text-[11.5px] leading-snug text-mv-muted"
                    >
                      {card.note}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- the close ----------------
          Everything has been shown and the downloads have been listed, so the
          last thing on the page is the choice rather than another pitch. It
          carries the free account as its second action: someone who reaches
          the bottom unsure should not have to scroll back up to start. */}
        <div className="mx-auto max-w-[1180px] px-4 py-10 lg:px-8 lg:py-14">
          <PlansCta />
        </div>
      </main>
    </div>
  );
}

/**
 * The four figures the product reports for itself.
 *
 * A card lifted over the seam between the hero and the first section rather
 * than a band of its own. A full-width dark strip cut the page in half and
 * announced itself louder than anything it introduced; this ties the two
 * halves together instead, and reads as part of the product rather than as a
 * banner bolted above it.
 *
 * Every number is the map's own — the counts across the top of the table, and
 * the span the time-lapse actually replays.
 */
function StatsBand() {
  const figures = [
    { icon: Layers, value: "1,131,586", label: "Wells mapped" },
    { icon: MapIcon, value: "282", label: "Texas counties" },
    { icon: LandPlot, value: "31,521", label: "Operators" },
    { icon: Clock, value: "1900–2026", label: "Years of record" },
  ];

  return (
    <div className="relative z-10 mx-auto -mt-12 max-w-[1180px] px-4 lg:-mt-16 lg:px-8">
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-mv-lg ring-1 ring-mv-line sm:grid-cols-4">
        {figures.map(({ icon: Icon, value, label }, at) => (
          <div
            key={label}
            /* Hairlines between rather than around: four bordered boxes read
               as four cards, and this is one figure said four ways. */
            className={`flex min-w-0 items-center gap-[13px] px-5 py-[18px] lg:px-6 lg:py-[22px] ${
              at % 2 === 1 ? "border-l border-mv-line-soft" : ""
            } ${at >= 2 ? "border-t border-mv-line-soft sm:border-t-0" : ""} ${
              at === 2 ? "sm:border-l sm:border-mv-line-soft" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="hidden h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-mv-mint text-mv-green-deep sm:grid"
            >
              <Icon size={16} strokeWidth={2} />
            </span>

            <div className="min-w-0">
              <dd className="text-[19px] font-extrabold leading-none tracking-[-0.01em] text-mv-ink tabular-nums lg:text-[23px]">
                {value}
              </dd>
              <dt className="mt-[7px] text-[10px] font-semibold uppercase leading-[1.3] tracking-[.11em] text-mv-muted">
                {label}
              </dt>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

type Shot = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /*
   * The frame's shape, when the default 16:10 is wrong for the picture.
   *
   * `flat` (16:7) is for charts and panels about twice as wide as they are
   * tall; `wide` (16:3) is for strips like a filter bar with its facet open.
   * Both exist so a picture fills its frame instead of sitting in a band of
   * empty space with the frame's own padding around it.
   */
  frame?: "flat" | "wide";
  /*
   * How the picture sits in the frame.
   *
   * Every frame is the same shape, so the column reads as one set rather than
   * as a pile of odd rectangles. A screenshot of a whole view fills it and is
   * cropped a little at the bottom, which costs nothing. Anything with its own
   * edges — a chart, a card — is fitted inside instead, on a tint.
   */
  fit?: "cover" | "contain";
};

function Section({
  id,
  number,
  icon: Icon,
  eyebrow,
  title,
  lead,
  points,
  image,
  second,
  art,
}: {
  id: string;
  number: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  /** One paragraph, or several — some sections open with two. */
  lead: string | string[];
  points: { icon: LucideIcon; title: string; body: string }[];
  image?: Shot;
  second?: Shot;
  art?: "tools";
}) {
  /* Even-numbered sections put the picture on the left. Eight identical
     words-left/picture-right blocks read as a list rather than a story: the
     eye settles into one gutter and stops looking. Mobile always stacks the
     words first — the picture is the evidence, not the claim.

     `number` is no longer printed: it only decides this and the band colour. */
  const flipped = Number(number) % 2 === 0;
  const hasArt = Boolean(image || second || art);

  /*
   * Bands alternate, white then the page's own grey.
   *
   * Eight sections on one flat sheet read as a long document. Giving each its
   * own full-width band, and alternating the two, turns the page into chapters
   * you can see the edges of — and it costs one class rather than a rule, a
   * gap and a margin to keep in step.
   */
  return (
    <section
      id={`guide-${id}`}
      className={`scroll-mt-20 border-b border-mv-line-soft ${
        flipped ? "bg-white" : "bg-mv-bg"
      }`}
    >
      <div className="mx-auto max-w-[1180px] px-4 py-10 lg:px-8 lg:py-14">
      {/* ---------------- the chapter mark ----------------
          What this section is, and a rule out to the margin: enough to read as
          the start of something without a heavy divider. */}
      <div className="flex items-center gap-3 lg:gap-4">
        <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full border border-mv-mint-edge bg-mv-mint px-[11px] py-[5px] text-[10px] font-extrabold uppercase tracking-[.1em] text-mv-green-deep">
          <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
          {eyebrow}
        </span>

        <span
          aria-hidden="true"
          className="h-[2px] flex-1 rounded-full bg-gradient-to-r from-[#c2c9d2] via-[#dbe0e6] to-transparent"
        />
      </div>

      <h2 className="mt-5 text-[26px] font-extrabold leading-[1.08] tracking-[-0.02em] text-mv-ink lg:text-[38px]">
        {title}
      </h2>
      {(Array.isArray(lead) ? lead : [lead]).map((paragraph, at) => (
        <p
          key={paragraph}
          className={`text-[14px] leading-relaxed text-mv-slate lg:text-[15.5px] ${
            at === 0 ? "mt-4" : "mt-3"
          }`}
        >
          {paragraph}
        </p>
      ))}

      <div
        className={`mt-8 grid gap-6 lg:mt-10 lg:gap-10 ${
          /* Without a picture the points take the full width in two columns,
             rather than leaving half the row empty beside them. */
          hasArt ? "lg:grid-cols-2" : ""
        }`}
      >
        {/*
          One card per point, not one panel of rows.

          Each carries its own icon on the left, so four of them can be told
          apart at a glance rather than read in order, and a tick on the right
          to close the line off. Cards rather than a divided list because they
          are separate claims about separate controls — a shared panel implied
          a sequence that most of these sections do not have.
        */}
        <ul
          className={`flex min-w-0 flex-col gap-3 ${
            hasArt ? (flipped ? "lg:order-2" : "") : "sm:grid sm:grid-cols-2"
          }`}
        >
          {points.map((point) => (
            <li
              key={point.title}
              className="group flex items-start gap-4 rounded-2xl bg-white p-4 shadow-mv ring-1 ring-mv-line transition-shadow hover:shadow-mv-lg lg:p-[18px]"
            >
              <span
                aria-hidden="true"
                className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-mv-mint text-mv-green-deep ring-1 ring-mv-mint-edge"
              >
                <point.icon size={19} strokeWidth={1.9} />
              </span>

              <div className="min-w-0">
                <h3 className="text-[13px] font-bold leading-snug text-mv-ink lg:text-[14px]">
                  {point.title}
                </h3>
                <p className="mt-[6px] text-[12px] leading-relaxed text-mv-slate lg:text-[13px]">
                  {point.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {hasArt && (
          <div className={`min-w-0 ${flipped ? "lg:order-1" : ""}`}>
            <div className="flex flex-col gap-4 lg:sticky lg:top-24">
              {image && <Frame {...image} />}
              {second && <Frame {...second} />}
              {art === "tools" && <ToolsArt />}
            </div>
          </div>
        )}
      </div>
      </div>
    </section>
  );
}

/**
 * The hero: what this is on the left, what it looks like on the right.
 *
 * Four views, one at a time. The words and the picture change together, so
 * every pair is a claim and its evidence rather than a wall of both.
 *
 * The control underneath is four named tabs, not dots: a dot says "there is
 * more" and nothing else, while a tab says what the next thing is and lets a
 * reader go straight to it. The active tab fills as its slide runs, which is
 * also the only clock on the page — see `.mv-progress` in `globals.css`.
 */
function Hero() {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(
      () => setIndex((current) => (current + 1) % SLIDES.length),
      SLIDE_MS,
    );
    return () => clearInterval(timer);
  }, [held]);

  const slide = SLIDES[index];

  return (
    <div
      className="grid items-center gap-9 pb-20 pt-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-14 lg:pb-24 lg:pt-9"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
    >
      {/* ---------------- what it is ---------------- */}
      <div className="min-w-0">
        <span className="inline-flex items-center gap-[7px] rounded-full border border-[#bfe3cc] bg-white px-[12px] py-[6px] text-[10px] font-extrabold uppercase tracking-[.12em] text-mv-green-deep shadow-mv">
          <Layers size={12} strokeWidth={2.5} aria-hidden="true" />
          The map explorer
        </span>

        {/* One heading for the block, rather than a line per slide: the four
            below switch the picture, and the words above them say what the
            whole thing is. */}
        <div>
          <h1 className="mt-6 text-[32px] font-extrabold leading-[1.06] tracking-[-0.02em] text-mv-ink lg:text-[46px]">
            One Well. Every Detail That Matters
          </h1>
          <p className="mt-4 max-w-[50ch] text-[13.5px] leading-relaxed text-mv-slate lg:text-[15.5px]">
            Access the production history, forecasts, decline trends, reserves,
            wellbore details, lease information, operator data, permits, and
            completion records connected to each well.
          </p>
          <p className="mt-3 max-w-[50ch] text-[13.5px] leading-relaxed text-mv-slate lg:text-[15.5px]">
            Mineral View brings essential well information together in one
            place.
          </p>
        </div>

        {/* ---------------- the four, named ----------------
            One rule runs under all four, and only the live tab's length of it
            fills — so the line reads as a single track being worked through
            rather than as four separate meters. The icons are what make them
            scannable: four words in the same weight take a moment to tell
            apart, four different marks do not. */}
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-mv-line pt-0 sm:grid-cols-4">
          {SLIDES.map((option, at) => {
            const live = at === index;

            return (
              <button
                key={option.src}
                type="button"
                onClick={() => {
                  setIndex(at);
                  setHeld(true);
                }}
                aria-current={live}
                className="group -mt-px cursor-pointer text-left"
              >
                <span className="block h-[2px] w-full overflow-hidden bg-transparent">
                  {live && (
                    <span
                      key={index}
                      data-held={held}
                      style={{ "--mv-slide": `${SLIDE_MS}ms` } as CSSProperties}
                      className="mv-progress block h-full w-full bg-mv-green-deep"
                    />
                  )}
                </span>

                <span
                  className={`mt-[13px] flex items-center gap-[9px] whitespace-nowrap text-[11px] font-bold uppercase leading-none tracking-[.09em] transition-colors ${
                    live
                      ? "text-mv-green-deep"
                      : "text-mv-muted group-hover:text-mv-slate"
                  }`}
                >
                  <option.icon
                    size={15}
                    strokeWidth={2}
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  {option.eyebrow}
                </span>
              </button>
            );
          })}
        </div>

        {/* Why the buttons are here at all.

            This page is what the map explorer shows before you sign in, and
            nothing above says so — a reader could take the screenshots for the
            product and wonder why pressing them does nothing. One line, in
            plain terms: the account is the way in. */}
        <p className="mt-7 max-w-[46ch] text-[13px] leading-relaxed text-mv-slate lg:text-[13.5px]">
          <span className="font-semibold text-mv-ink">
            Start exploring with a free account.
          </span>{" "}
          Create your account in about a minute to explore wells, apply
          filters, review detailed records, and access available data and
          export tools across the Mineral View map.
        </p>

        {/* The ask, at the top of the page as well as in the band further
            down: someone who is already convinced by the picture beside this
            should not have to read eight sections to find the way in. */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-mv-green-deep px-[20px] py-[12px] text-[13.5px] font-semibold text-white shadow-mv transition-[filter] hover:brightness-105"
          >
            Create Your Free Account
            <ArrowRight size={15} aria-hidden="true" />
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-[18px] py-[11px] text-[13.5px] font-semibold text-mv-green-deep ring-1 ring-mv-line transition-shadow hover:ring-mv-green-deep"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* ---------------- what it looks like ----------------
          All four are mounted and cross-faded rather than swapped, so nothing
          is fetched at the moment it is needed and the frame never collapses
          between slides. */}
      <div className="relative min-w-0">
        <div className="overflow-hidden rounded-2xl border border-mv-line bg-white shadow-mv-lg">
          {/* A title bar rather than three dots and a label: the name sits
              in the middle where an application puts it, and the counter says
              which of the four is on screen. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-mv-line bg-[#fafbfa] px-[14px] py-[11px]">
            <Menu
              size={15}
              strokeWidth={2}
              aria-hidden="true"
              className="text-mv-muted"
            />

            <span className="truncate text-center text-[11px] font-semibold uppercase tracking-[.13em] text-mv-slate">
              Mineral View · {slide.eyebrow}
            </span>

            <span className="justify-self-end text-[10.5px] font-semibold tabular-nums text-mv-muted">
              {String(index + 1).padStart(2, "0")} /{" "}
              {String(SLIDES.length).padStart(2, "0")}
            </span>
          </div>

          <div className="relative aspect-[1385/816] w-full bg-[#f7f7ee]">
            {SLIDES.map((option, at) => (
              <Image
                key={option.src}
                src={option.src}
                width={option.width}
                height={option.height}
                alt={option.alt}
                priority={at === 0}
                sizes="(max-width: 1024px) 100vw, 720px"
                className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${
                  at === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A screenshot in a window frame.
 *
 * The three dots and the hairline are what make a picture read as a capture of
 * software rather than as decoration — without them a cropped panel on a pale
 * ground looks like part of this page.
 */
function Frame({
  src,
  width,
  height,
  alt,
  caption,
  fit = "cover",
  frame,
  priority,
}: Shot & { priority?: boolean }) {
  return (
    <figure className="overflow-hidden rounded-2xl bg-white shadow-mv-lg ring-1 ring-mv-line">
      {/* A window bar, so a flat screenshot reads as a piece of software
          rather than as decoration. */}
      <div className="flex items-center gap-[5px] border-b border-mv-line bg-[#fafbfa] px-[13px] py-[8px]">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            aria-hidden="true"
            className="h-[7px] w-[7px] rounded-full bg-mv-line"
          />
        ))}
        <span className="ml-2 truncate text-[9.5px] font-semibold uppercase tracking-[.08em] text-mv-muted">
          Mineral View · map explorer
        </span>
      </div>

      {/* The fixed shape. Every picture on the page is presented at the same
          size, which is most of what makes a column of them look composed. */}
      <div
        className={`relative w-full ${
          frame === "wide"
            ? "aspect-[16/3]"
            : frame === "flat"
              ? "aspect-[16/7]"
              : "aspect-[16/10]"
        } ${fit === "contain" ? "bg-mv-card-tint p-3" : "bg-[#f7f7ee]"}`}
      >
        <Image
          src={src}
          width={width}
          height={height}
          alt={alt}
          priority={priority}
          sizes="(max-width: 1024px) 100vw, 560px"
          className={`absolute inset-0 h-full w-full ${
            fit === "contain"
              ? "object-contain p-2"
              : "object-cover object-top"
          }`}
        />
      </div>

      <figcaption className="border-t border-mv-line bg-mv-card-tint px-[13px] py-[10px] text-[11.5px] leading-snug text-mv-slate">
        {caption}
      </figcaption>
    </figure>
  );
}

/** The four tools, with the readings each one lands on. */
/**
 * The four tools, each showing its own worked example.
 *
 * The pictures are the demonstration windows the tools actually open — the
 * gesture drawn over the reader's own wells, with the reading it lands on. A
 * card that only named the tool made the reader take the rest on trust.
 */
function ToolsArt() {
  const tools = [
    {
      icon: SquareDashed,
      label: "Draw an Area",
      note: "Identify and export wells within a selected area.",
      src: "/map-feature/tool-draw-area.png",
      alt: "The Draw an area window: a dashed box over a field of wells, with the count it found",
    },
    {
      icon: Ruler,
      label: "Measure Distance",
      note: "Measure real-world distance between map points.",
      src: "/map-feature/tool-measure-distance.png",
      alt: "The Measure distance window: a line drawn between two points with the distance",
    },
    {
      icon: LandPlot,
      label: "Measure Area",
      note: "Calculate acreage for a selected tract.",
      src: "/map-feature/tool-measure-area.png",
      alt: "The Measure area window: a tract clicked out corner by corner with its acreage",
    },
    {
      icon: Crosshair,
      label: "What's Near My Land",
      note: "Explore nearby wells, leases, and recent activity.",
      src: "/map-feature/tool-nearby.png",
      alt: "The What's near my land window: a ring around a point with the wells inside it",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {tools.map((tool) => (
        <figure
          key={tool.label}
          className="overflow-hidden rounded-xl border border-mv-line bg-white"
        >
          <Image
            src={tool.src}
            width={1120}
            height={902}
            alt={tool.alt}
            sizes="(max-width: 640px) 100vw, 260px"
            className="block h-auto w-full border-b border-mv-line"
          />
          <figcaption className="flex items-start gap-[9px] p-3">
            <span className="mt-[1px] grid h-[22px] w-[22px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep">
              <tool.icon size={12} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] font-bold leading-snug text-mv-ink">
                {tool.label}
              </span>
              <span className="mt-[2px] block text-[10.5px] leading-snug text-mv-muted">
                {tool.note}
              </span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
