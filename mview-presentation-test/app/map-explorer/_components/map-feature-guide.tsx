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
            title="Start statewide, finish at a single well"
            lead="The map opens as count bubbles over Texas — one per district, sized and shaded by how many wells it holds. Click a bubble and it opens into sub-clusters. Click again and the wells themselves are drawn, each carrying the Railroad Commission's own symbol."
            points={[
              {
                icon: Layers,
                title: "Three levels, one gesture",
                body: "Clusters at zoom 5, sub-clusters at 8, wells at 10. A click takes you down a level and centres it.",
              },
              {
                icon: Sparkle,
                title: "The Commission's own symbols",
                body: "Oil, gas, plugged, dry hole, permitted, injection — each drawn as the Commission draws it.",
              },
              {
                icon: Spline,
                title: "The whole bore, not just the hole",
                body: "Horizontal wells draw their full path, so a lateral under your land shows as a line.",
              },
              {
                icon: Info,
                title: "Hover before you commit",
                body: "The tooltip gives API, well number, operator, status, type and county.",
              },
            ]}
            image={{
              src: "/map-feature/map-wells-field.png",
              width: 2800,
              height: 1632,
              alt: "The map past zoom 10 over a field, wells packed across it, each with its Railroad Commission symbol",
              caption:
                "Past zoom 10 the bubbles give way to the wells themselves — every one its own symbol.",
            }}
          />

          {/* ---------------- 2 · the table ---------------- */}
          <Section
            id="table"
            number="02"
            icon={Table2}
            eyebrow="The table"
            title="The same wells, as rows you can sort"
            lead="Switch to Table and the map's result set becomes a grid: API number, operator, lease, type, status, county, and the oil and gas each well has produced. A summary strip above it counts what you are looking at — not the whole state."
            points={[
              {
                icon: Hash,
                title: "Counts for this result set",
                body: "Wells, the oil and gas split, active count, operators and counties — recalculated as you filter.",
              },
              {
                icon: ArrowUpDown,
                title: "Sort by what matters",
                body: "Sort by operator, lease, county or volume — producing oil finds the wells worth reading.",
              },
              {
                icon: MapPin,
                title: "Back to the map in one click",
                body: "Each row has a pin to that well on the map; the row itself opens its full record.",
              },
              {
                icon: Filter,
                title: "Filter from the table itself",
                body: "The same facets sit above the table. Tick, Apply, and the rows and counts move together.",
              },
              {
                icon: Rows3,
                title: "Paged, not truncated",
                body: "Twenty thousand wells stays usable, and Export writes the page you are looking at.",
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
                "The facets sit above the counts — open one, tick, Apply.",
              frame: "wide",
              fit: "contain",
            }}
            second={{
              src: "/map-feature/table-rows.png",
              width: 2756,
              height: 1754,
              alt: "The table's rows: API, operator, lease, type, status, county and the produced volumes, with the pager beneath",
              caption:
                "Ten rows at a time out of 1,131,586, every column sortable.",
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
            title="Narrow it to the wells you care about"
            lead="Six facets, a lease search and production ranges. Tick what you want and press Apply; the map reloads to the matches and frames them, and the confirmation tells you how many there were."
            points={[
              {
                icon: ListChecks,
                title: "1 · Open Filters and pick what you want",
                body: "Six facets — county, operator, type, status, play and field — each counted and searchable.",
              },
              {
                icon: Zap,
                title: "2 · Press Apply, and watch the map change",
                body: "The map reloads to the matches, frames them, and says how many landed.",
              },
              {
                icon: SlidersHorizontal,
                title: "3 · Narrow further, or lift one filter at a time",
                body: "Filters show as chips; lift one and the rest stay. Production ranges need both ends.",
              },
              {
                icon: Search,
                title: "Or search a lease by name",
                body: "One box for leases, operators and counties. Pick one and the map filters at once.",
              },
            ]}
            image={{
              src: "/map-feature/filters-choosing.png",
              width: 2800,
              height: 1632,
              alt: "The filters rail with a county being searched for and ticked, before applying",
              caption: "Search the facet, tick what you want, press Apply.",
            }}
          />

          {/* ---------------- 4 · insights ---------------- */}
          <Section
            id="insights"
            number="04"
            icon={ChartColumn}
            eyebrow="Insights · completion summary"
            title="The completion summary — what the well has done"
            lead="Pick a well and Insights opens its record. A well that has been drilled and completed shows its completion summary: the production it has reported, how fast that is falling, what is booked against it, and the hole itself. The badge beside the heading says COMPLETION so you always know which of the two filings you are reading."
            points={[
              {
                icon: ChartColumn,
                title: "Production, reported and forecast",
                body: "Monthly oil and gas on twin axes, forecast marked off from reported. Hover for figures.",
              },
              {
                icon: TrendingDown,
                title: "Decline diagnostics",
                body: "Month-on-month step, implied annual decline, GOR, and how long the booked reserves last.",
              },
              {
                icon: Ruler,
                title: "The wellbore in section",
                body: "Drawn to the record's profile: vertical straight down, horizontal along the formation.",
              },
              {
                icon: FileText,
                title: "Lease, operator, dates, depth",
                body: "Lease and operator with their numbers, acreage, district, dates, depths and nearest well.",
              },
              {
                icon: Hash,
                title: "Six figures across the top",
                body: "Last month's oil and gas, next month estimated, and both reserve figures.",
              },
              {
                icon: Download,
                title: "The whole record, as a PDF",
                body: "Export PDF takes the page as laid out, written summary and all, stamped with the time it was read.",
              },
            ]}
            image={{
              src: "/map-feature/view-insights.png",
              width: 2800,
              height: 1632,
              alt: "The Insights view: the map on the left, the well's record on the right",
              caption:
                "The map stays beside the record — the well you are reading is the one ringed on it.",
            }}
            second={{
              src: "/map-feature/production-chart.png",
              width: 1800,
              height: 830,
              fit: "contain",
              frame: "flat",
              alt: "Crude oil and natural gas production chart with reported and forecast months",
              caption:
                "Reported months to the left of the marker, forecast to the right.",
            }}
          />

          {/* ---------------- 5 · the permit record ---------------- */}
          <Section
            id="permit"
            number="05"
            icon={FileText}
            eyebrow="Insights · permit summary"
            title="The permit summary — what was filed to drill"
            lead="A well that is permitted but not yet completed opens its permit instead, badged PERMIT. It is a different document and it answers different questions: who applied, for what, where exactly, and how it stands with the Commission."
            points={[
              {
                icon: FileText,
                title: "The filing itself",
                body: "Purpose, type, permit date, status number and approval — plus the filing's own columns.",
              },
              {
                icon: LandPlot,
                title: "Lease, operator and field",
                body: "Lease, county and district; the operator with its number; the field and reservoir named.",
              },
              {
                icon: MapPin,
                title: "Where it is, to six decimals",
                body: "Surface and bottom-hole coordinates, each with a copy button, and the nearest well.",
              },
              {
                icon: Sparkle,
                title: "Written up as well",
                body: "A written read sits under the filing, generated from the permit's own fields.",
              },
            ]}
            image={{
              src: "/map-feature/ai-summary.png",
              width: 1080,
              height: 338,
              alt: "The written summary card that sits under a record, with its heading, the well it describes and a Regenerate control",
              caption:
                "The written read that sits under the filing, dated and regenerable.",
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
            title="Watch the field fill in"
            lead="Time-lapse replays the wells on screen in the order they were drilled, plotting them year by year until the map you started with is back. It is the quickest way to see how a field grew — where the drilling started, and where it moved."
            points={[
              {
                icon: Play,
                title: "Press it and the map empties",
                body: "Everything drawn is taken off and replayed from bare ground rather than a full map.",
              },
              {
                icon: Gauge,
                title: "A counter, not a mystery",
                body: "The bar reports progress as it goes — “468 of 1,351 plotted” — so it never looks stalled.",
              },
              {
                icon: Pause,
                title: "Play, pause, and close",
                body: "Pause to hold a year on screen, or close the bar to put every well back.",
              },
              {
                icon: Eye,
                title: "What is on screen is what replays",
                body: "It replays the wells the map has loaded, so zoom or filter to the field first.",
              },
            ]}
            image={{
              src: "/map-feature/timelapse.png",
              width: 2800,
              height: 1632,
              alt: "The time-lapse bar part way through a replay, with wells plotted across the field",
              caption: "Part way through: 468 of 1,351 wells plotted.",
            }}
          />

          {/* ---------------- 7 · tools ---------------- */}
          <Section
            id="tools"
            number="07"
            icon={Crosshair}
            eyebrow="Tools"
            title="Ask questions of the ground itself"
            lead="Four tools sit over the map. Each opens with a worked example in its own window, so you can watch the gesture once before making it."
            points={[
              {
                icon: SquareDashed,
                title: "Draw an area",
                body: "Drag a box or click two opposite corners. Every well whose bore falls inside is counted — not just the surface holes near it — with the acreage, the square miles, and a CSV of exactly those wells.",
              },
              {
                icon: Ruler,
                title: "Measure distance",
                body: "Drag from one point to another for the distance across the ground. Geodesic, not across the screen, so the reading holds wherever on the map you take it and however far you are zoomed out.",
              },
              {
                icon: LandPlot,
                title: "Measure area",
                body: "Click a tract corner by corner, then click the first again to close it. The acreage is geodesic, as a survey gives it: a nominal one-mile section comes out at 640 acres.",
              },
              {
                icon: Crosshair,
                title: "What's near my land",
                body: "Click your land and the lease under that point is looked up. You get the wells inside the ring, permits and completions from the last three months, the closest bore, and a CSV of the filings.",
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
            title="The smaller controls, and what each is for"
            lead="Not everything needs a section of its own. These sit around the edge of the map and are worth knowing about before you need them."
            points={[
              {
                icon: Search,
                title: "Search by API number",
                body: "Type as much of an API number as you have and pick from the matches, each tagged with the county it sits in. Faster than filtering when you already know which well you want.",
              },
              {
                icon: Layers,
                title: "Legends",
                body: "The panel bottom-left names every symbol on the map — permitted location, dry hole, oil, gas, the plugged variants, injection and disposal. Leave it open while you learn them.",
              },
              {
                icon: MapIcon,
                title: "Basemap",
                body: "Streets by default; switch to satellite or a plain canvas when the roads are getting in the way of the wells, or when you want the land itself rather than what is drawn over it.",
              },
              {
                icon: Download,
                title: "Export CSV — what is in view",
                body: "Writes whatever the current extent holds — the wells themselves past zoom 10, or the count bubbles above it. Pan, zoom and export; nothing has to be drawn or filtered first.",
              },
              {
                icon: Share2,
                title: "Share, save and print",
                body: "Share copies a link back to the exact view you are looking at. Save image captures the map as drawn, and Print map sends that capture to paper rather than the whole page.",
              },
              {
                icon: Maximize,
                title: "Zoom, reset and full screen",
                body: "The buttons down the right zoom in and out and put the view back where it started. Full screen gives the map the whole window when the panels are in the way of it.",
              },
            ]}
            image={{
              src: "/map-feature/chrome-search-view.png",
              width: 1425,
              height: 836,
              alt: "The map over Midland with an API number part typed and the matching wells listed under the toolbar",
              caption:
                "Type part of an API number and the matches appear, each with its county.",
            }}
            second={{
              src: "/map-feature/chrome-share-field.png",
              width: 1425,
              height: 836,
              alt: "The map closer in over a Permian field, wells and their bores clearly spaced, with the Share menu open",
              caption:
                "Share carries the view in the link, and saves or prints the map as drawn.",
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
              Everything on screen comes off it
            </h2>
            <p className="mt-[10px] max-w-[70ch] text-[12.5px] leading-relaxed text-mv-slate lg:text-[13.5px]">
              Nothing is locked behind a request form. What you filtered, drew
              or read is what downloads — filters and all. Export from the map,
              from the table, from a drawn area, or from a well&rsquo;s own
              record.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: FileSpreadsheet,
                  title: "Table results — CSV",
                  body: "The rows you are looking at, filters and all, with every column the table shows.",
                  note: "API · operator · lease · type · status · county · oil · gas",
                },
                {
                  icon: SquareDashed,
                  title: "A drawn area — CSV",
                  body: "Every well whose bore falls inside the box you drew, not just the surface holes near it.",
                  note: "Counted well by well past zoom 10",
                },
                {
                  icon: MapIcon,
                  title: "What is in view — CSV",
                  body: "The toolbar's export takes the current extent as it stands: the wells past zoom 10, the counts above it.",
                  note: "mineral-view-wells.csv",
                },
                {
                  icon: ImageIcon,
                  title: "The map itself — PNG",
                  body: "Share → Save image captures the map as drawn, ready to drop into a report. Print map sends the same capture to paper.",
                  note: "mineral-view-map.png",
                },
                {
                  icon: FileText,
                  title: "Well summaries — PDF",
                  body: "Completion or permit, laid out as it appears on screen, in the page's own type — and the written summary comes with it, on the page where you read it.",
                  note: "completion-42-001-32729.pdf · permit-42-227-34620.pdf",
                },
                {
                  icon: Crosshair,
                  title: "Nearby filings — CSV",
                  body: "What the lease lookup found around your land: every permit and completion in the ring, each with its distance and bearing from the point you clicked.",
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
  lead: string;
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
      <p className="mt-4 text-[14px] leading-relaxed text-mv-slate lg:text-[15.5px]">
        {lead}
      </p>

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

        {/* Keyed by the slide, so the words fade in rather than swapping
            mid-sentence. */}
        <div key={index} className="mv-fade">
          <h1 className="mt-6 text-[32px] font-extrabold leading-[1.06] tracking-[-0.02em] text-mv-ink lg:text-[46px]">
            {slide.title}
          </h1>
          <p className="mt-4 max-w-[50ch] text-[13.5px] leading-relaxed text-mv-slate lg:text-[15.5px]">
            {slide.body}
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
            The map opens with a free account.
          </span>{" "}
          Create one — about a minute — and every well, filter, record and
          export on this page is yours to use.
        </p>

        {/* The ask, at the top of the page as well as in the band further
            down: someone who is already convinced by the picture beside this
            should not have to read eight sections to find the way in. */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-mv-green-deep px-[20px] py-[12px] text-[13.5px] font-semibold text-white shadow-mv transition-[filter] hover:brightness-105"
          >
            Create your free account
            <ArrowRight size={15} aria-hidden="true" />
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-[18px] py-[11px] text-[13.5px] font-semibold text-mv-green-deep ring-1 ring-mv-line transition-shadow hover:ring-mv-green-deep"
          >
            Sign in
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
      label: "Draw an area",
      note: "wells inside, counted",
      src: "/map-feature/tool-draw-area.png",
      alt: "The Draw an area window: a dashed box over a field of wells, with the count it found",
    },
    {
      icon: Ruler,
      label: "Measure distance",
      note: "miles across the ground",
      src: "/map-feature/tool-measure-distance.png",
      alt: "The Measure distance window: a line drawn between two points with the distance",
    },
    {
      icon: LandPlot,
      label: "Measure area",
      note: "acres, as a survey gives them",
      src: "/map-feature/tool-measure-area.png",
      alt: "The Measure area window: a tract clicked out corner by corner with its acreage",
    },
    {
      icon: Crosshair,
      label: "What's near my land",
      note: "wells and filings around a lease",
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
