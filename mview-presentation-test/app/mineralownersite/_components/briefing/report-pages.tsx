import Link from "next/link";

import { PortalLink } from "../portal-link";
import {
  bluestemNote,
  briefingMeta,
  calendar,
  changedLeaseMinis,
  countyMaps,
  countyMapsFoot,
  coverAnswers,
  coverFoot,
  coverIntros,
  dataAppendix,
  dossierNote,
  drillingAroundYou,
  esriRaster,
  estimateByCounty,
  glossaryCorner,
  leaseMinisFoot,
  page2Anchor,
  page2Foot,
  page2Intro,
  page2Rows,
  page2Trend,
  page3Explain,
  page3GoodNews,
  page3Kpis,
  page4Foot,
  page4Lead,
  page5Foot,
  page5Watch,
  priceTickerNote,
  priceTickers,
  quietWeek,
  signalTable,
  sourceList,
  unchangedLeaseMinis,
  unchangedNote,
  whyGasMoved,
  worldContext,
  worldInOneLine,
  type LeaseMini,
} from "../../_lib/portal-briefing-data";
import { PortalIcon } from "../portal-icon";
import { JumpLink } from "./report-jump";

/**
 * THE FIVE PAGES.
 *
 * ONE COMPONENT PER PAGE, and each one is a `.wr-page` — the class the print
 * stylesheet turns into an actual sheet of paper with a page break after it.
 * That is why the pages are not merged into one long scroll: the printed
 * report is a deliverable owners file and forward to family, and its pagination
 * has to be real.
 *
 * WHAT IS REAL AND WHAT IS MODELLED runs through all five and the copy keeps
 * them apart everywhere. Posted volumes, prices, permit counts and map
 * coordinates are real. Every dollar is modelled and says so. Nothing about
 * PAYMENT is observed at all — page 1's Professional preface states that
 * outright, and no page below it may contradict it.
 */

/* ============================================================================
   PAGE 1 · THE COVER
   ============================================================================ */

/**
 * The cover carries a promise the other four pages have to keep: "if you stop
 * here, you will not have missed anything that mattered this week". A finding
 * that appears on page 3 but not here would break it — so the four answers are
 * the report's contents, not its summary.
 *
 * THREE INTROS, ONE PER DENSITY, because the cover of a 9-minute read and the
 * cover of a 35-minute record of work are not the same document. The
 * Professional one opens with two caveats rather than a welcome, which is what
 * a reader who intends to check the numbers needs first.
 */
export function ReportPage1() {
  return (
    <div className="wr-page" id="wrPage1">
      <div className="wr-head">
        <span className="wr-mast">Mineral View</span>
        <div style={{ textAlign: "right" }}>
          <div className="section-label">{briefingMeta.title}</div>
          <div className="small muted">
            Week ending <strong>{briefingMeta.weekEnding}</strong>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 26, marginBottom: 4 }}>
        Suzie, here&apos;s your week.
      </h2>
      <p className="small muted" style={{ marginBottom: 10 }}>
        Owner record {briefingMeta.recordFull} · {briefingMeta.leaseCount}{" "}
        leases · {briefingMeta.counties.join(", ")} counties ·{" "}
        <strong>2 min to read this cover</strong>, about 20 for all five pages
      </p>

      <p
        className="small tier-s wr-noprint"
        style={{ margin: "0 0 14px", lineHeight: 1.6 }}
      >
        {coverIntros.simple}
      </p>
      <p
        className="small tier-d wr-noprint"
        style={{ margin: "0 0 14px", lineHeight: 1.6 }}
      >
        {coverIntros.detailed}
      </p>
      <p
        className="small tier-p wr-noprint"
        style={{ margin: "0 0 14px", lineHeight: 1.6 }}
      >
        {coverIntros.pro}
      </p>

      {/* EACH ANSWER LINKS TO THE PAGE THAT PROVES IT. The cover promises "every
          page beneath is the evidence for these four lines" — without these
          four links that promise has no mechanism, and a reader who wants the
          evidence has to guess which page holds it. `wr-noprint`: on paper the
          pages are numbered sheets, so "Page 2 →" points at nothing. */}
      <div className="grid g2" style={{ gap: 12 }}>
        {coverAnswers.map((answer) => (
          <div className="card card-pad wr-answer" key={answer.n}>
            <div className="section-label">
              {answer.n} · {answer.question}
            </div>
            <p className="small" style={{ marginTop: 6 }}>
              {answer.answer}{" "}
              <JumpLink target={answer.page} className="tiny wr-noprint">
                Page {answer.page.replace("wrPage", "")} →
              </JumpLink>
            </p>
          </div>
        ))}
      </div>

      <p className="tiny muted" style={{ marginTop: 16 }}>
        {coverFoot}
      </p>

      <span className="wr-pageno">Page 1 of 5</span>
    </div>
  );
}

/* ============================================================================
   PAGE 2 · AM I MAKING MONEY?
   ============================================================================ */

/** The `(±)` cell, which is three different things depending on the row. */
function Drift({
  expected,
  drift,
  direction,
  total,
}: {
  expected: string;
  drift: string;
  direction: "up" | "down" | "none";
  total?: boolean;
}) {
  if (total) {
    return (
      <>
        <strong>{expected}</strong> {drift}
      </>
    );
  }
  return (
    <>
      {expected}{" "}
      <span
        className={
          direction === "up"
            ? "delta-up"
            : direction === "down"
              ? "delta-down"
              : "tiny muted"
        }
      >
        {drift}
      </span>
    </>
  );
}

/**
 * RANKED BY DRIFT FROM EXPECTED, BIGGEST EXCEPTION FIRST — not by size and not
 * alphabetically. The ordering IS the analysis: a total that lands within ±2%
 * can hide one lease going quietly sideways, and this table's job is to put
 * that lease in the first row. Re-sorting it by MVestimate would destroy the
 * only thing it does that a list of leases does not.
 *
 * THE TABLE NEVER TRUNCATES, and the foot says so. "Top 10 shown" on a page
 * titled "am I making money" would be the exact failure the page exists to
 * prevent.
 */
export function ReportPage2() {
  return (
    <div className="wr-page" id="wrPage2">
      <p className="wr-q">
        1 · Am I making money?{" "}
        <span
          className="chip chip-slate"
          style={{ fontSize: 9.5, verticalAlign: 3 }}
        >
          4 min
        </span>
      </p>

      <p className="small" style={{ marginBottom: 12 }}>
        <strong className="delta-up">{page2Intro.verdict}</strong>{" "}
        {page2Intro.body}{" "}
        <strong className="num cl-lock">{page2Intro.ledbetterShare}</strong>.
      </p>

      <div>
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4 style={{ marginBottom: 8 }}>
            All 10 leases this month — ranked by drift from expected, biggest
            exception first
          </h4>
          <span className="chip chip-est" style={{ fontSize: 10 }}>
            ± column: our model vs the posted month — illustrative until the
            estimate feed connects
          </span>
        </div>

        <div className="tablewrap">
          <table style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Lease (no.)</th>
                <th className="right">Posted this month</th>
                <th className="right">We expected · (±)</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              {page2Rows.map((row) => (
                <tr
                  key={row.lease}
                  style={row.total ? { background: "#fafbfc" } : undefined}
                >
                  <td>
                    <strong>
                      {row.total ? (
                        row.lease
                      ) : (
                        <PortalLink href="/mineralownersite/leases">{row.lease}</PortalLink>
                      )}
                    </strong>
                    {row.county ? ` · ${row.county}` : null}
                  </td>
                  <td className="right num">
                    {row.total ? <strong>{row.posted}</strong> : row.posted}
                  </td>
                  <td className="right num">
                    <Drift
                      expected={row.expected}
                      drift={row.drift}
                      direction={row.driftDirection}
                      total={row.total}
                    />
                  </td>
                  <td className="tiny muted">
                    {row.means}
                    {row.meansLocked ? (
                      <>
                        <span className="cl-lock">{row.meansLocked}</span>
                        {row.meansTail}
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="tiny muted" style={{ marginTop: 6 }}>
          {page2Foot}
        </p>
      </div>

      {/* The one chart on this page, and its caption does most of the work:
          it is ONE lease, it is MODELLED, and it is not a payment ledger. A
          trend line labelled only "owner share" would read as income. */}
      <div className="wr-mini" style={{ padding: "10px 12px", margin: "12px 0" }}>
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>{page2Trend.heading}</h4>
          <span className="chip chip-est" style={{ fontSize: 10 }}>
            {page2Trend.chip}
          </span>
        </div>
        <p className="tiny muted" style={{ margin: "6px 0" }}>
          {page2Trend.foot}
        </p>
      </div>

      <div className="notice mint" style={{ marginTop: 12 }}>
        <span>▤</span>
        <div>
          <strong>{page2Anchor.lead}</strong> {page2Anchor.body}
        </div>
      </div>

      <span className="wr-pageno">Page 2 of 5</span>
    </div>
  );
}

/* ============================================================================
   PAGE 3 · ARE NEW WELLS BEING DRILLED AROUND ME?
   ============================================================================ */

/** One lease mini-map tile. */
function LeaseMiniTile({ mini }: { mini: LeaseMini }) {
  return (
    <div className="wr-leasemini">
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- an Esri
            export URL is a remote raster service, not an optimisable asset;
            `next/image` would proxy a map tile request per lease. */}
        <img
          src={esriRaster(mini.bbox, "300,210")}
          alt={`${mini.lease} — mini map`}
          loading="lazy"
          style={{ width: "100%", display: "block" }}
        />
        <span
          className={`wr-pin ${mini.pin}`}
          style={{ left: "50%", top: "50%" }}
          title={mini.lease}
        />
      </div>
      <div className="tiny" style={{ padding: "5px 8px", fontWeight: 700 }}>
        {mini.lease}
        <span className="muted" style={{ fontWeight: 400 }}>
          {mini.note}
        </span>
      </div>
    </div>
  );
}

/**
 * THE ANSWER IS ZERO AND ZERO LEADS THE PAGE. Two of the four KPIs are 0 and
 * they print as 0 with a sentence saying what was watched — the design's rule
 * that a quiet week is a reported result, never an empty state.
 *
 * THE MAPS ARE RASTERS, NOT A LIVE MAP, and that is a print decision. This
 * report gets printed and mailed; a canvas map prints blank, so the three
 * county views are Esri export images at real bounding boxes with pins at the
 * leases' reported surface locations. The bbox and its pin percentages are one
 * unit — change one without the other and the pins drift off their wells.
 *
 * LOOK-ALIKE TILES ARE HONEST. Four Cedar Bend leases share one pad and each
 * Smith pair rides one wellbore, so several minis are the same image. The
 * caption says so rather than jittering the boxes to make them look distinct.
 */
export function ReportPage3() {
  return (
    <div className="wr-page" id="wrPage3">
      <p className="wr-q">
        2 · Are new wells being drilled around me?{" "}
        <span
          className="chip chip-slate"
          style={{ fontSize: 9.5, verticalAlign: 3 }}
        >
          5 min
        </span>
      </p>

      <div className="grid g4" style={{ gap: 10, marginBottom: 12 }}>
        {page3Kpis.map((kpi) => (
          <div
            className="kpi"
            style={{
              boxShadow: "none",
              ...(kpi.hot ? { borderTop: "3px solid var(--green)" } : {}),
            }}
            key={kpi.label}
          >
            <div className="k-label">{kpi.label}</div>
            <div className="k-val num">{kpi.value}</div>
            <div className="k-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <details className="explain wr-noprint" style={{ margin: "0 0 12px" }}>
        <summary>{page3Explain.summary}</summary>
        <div className="ex-body">
          {page3Explain.body}{" "}
          <span className="chip chip-mint" style={{ fontSize: 9 }}>
            {page3Explain.chip}
          </span>
        </div>
      </details>

      {/* Standing counts real; month-by-month movement labelled a sample. The
          chip carries that distinction and must not be dropped. */}
      <div
        className="card card-pad wr-noprint"
        style={{ margin: "0 0 12px", borderLeft: "4px solid var(--green)" }}
      >
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>
            <PortalIcon name="trend" className="mvi mvi-inline" />{" "}
            {drillingAroundYou.heading}
          </h4>
          <span className="chip chip-blue" style={{ fontSize: 10 }}>
            {drillingAroundYou.chip}
          </span>
        </div>

        <div className="grid g4" style={{ gap: 10, margin: "8px 0" }}>
          {drillingAroundYou.cells.map((cell) => (
            <div key={cell.label}>
              <strong className="tiny wr-celllabel">{cell.label}</strong>
              <div className="num wr-cellval">{cell.value}</div>
              <div className="tiny muted">{cell.note}</div>
            </div>
          ))}
        </div>

        <p className="small" style={{ margin: "0 0 8px" }}>
          {drillingAroundYou.body}
        </p>

        <div className="flex" style={{ flexWrap: "wrap" }}>
          <PortalLink className="btn btn-primary btn-sm" href="/mineralownersite/map">
            Open the permit &amp; completion trend — map + operators
          </PortalLink>
          <Link
            className="btn btn-ghost btn-sm"
            href="/mineralownersite/activities?tab=trend"
          >
            Full Activities panel →
          </Link>
        </div>
      </div>

      {/* The three county maps. */}
      <div style={{ margin: "0 0 12px" }}>
        <div
          className="between"
          style={{ flexWrap: "wrap", marginBottom: 2 }}
        >
          <h4>Where your leases sit — and where this week&apos;s activity is</h4>
          <span className="chip chip-mint" style={{ fontSize: 10 }}>
            Real map · real coordinates · permit counts from the 1-mile lists
          </span>
        </div>

        <div className="grid g3" style={{ gap: 10, margin: "8px 0 0" }}>
          {countyMaps.map((map) => (
            <div className="wr-mini wr-mapmini" key={map.id}>
              <div className="wr-maphost">
                <div className="wr-raster">
                  {/* eslint-disable-next-line @next/next/no-img-element -- see
                      the note on `LeaseMiniTile`. */}
                  <img src={esriRaster(map.bbox)} alt={map.alt} loading="lazy" />
                  <span className="wr-mapco">{map.county}</span>
                  <span className="wr-mapbadge">{map.badge}</span>

                  {map.pins.map((pin, index) => (
                    <span
                      key={`${pin.title}-${index}`}
                      className={
                        pin.kind === "plain" ? "wr-pin" : `wr-pin ${pin.kind}`
                      }
                      style={{ left: pin.left, top: pin.top }}
                      title={pin.title}
                    />
                  ))}

                  {map.labels.map((label) => (
                    <span
                      key={label.text}
                      className="wr-maplabel"
                      style={{ left: label.left, top: label.top }}
                    >
                      {label.text}
                    </span>
                  ))}
                </div>
              </div>
              <div className="wr-mapcap">{map.caption}</div>
            </div>
          ))}
        </div>

        <p className="tiny muted" style={{ margin: "6px 0 0" }}>
          {countyMapsFoot}{" "}
          <PortalLink className="wr-noprint" href="/mineralownersite/map">
            Open the full interactive map →
          </PortalLink>
        </p>
      </div>

      <h4 style={{ margin: "0 0 6px" }}>
        Changed this week — one labeled mini map per changed lease (5)
      </h4>
      <div className="wr-minigrid">
        {changedLeaseMinis.map((mini) => (
          <LeaseMiniTile mini={mini} key={mini.lease} />
        ))}
      </div>

      <p className="small" style={{ margin: "0 0 8px" }}>
        <strong>{unchangedNote}</strong>
      </p>

      {/* The unchanged five are collapsed, not dropped: "nothing to map for
          them" is itself this week's finding, and a reader who wants to check
          it can. */}
      <details className="wr-noprint" style={{ margin: "0 0 12px" }}>
        <summary className="wr-summary">
          Show the 5 unchanged leases&apos; mini maps
        </summary>
        <div className="wr-minigrid" style={{ margin: "8px 0 0" }}>
          {unchangedLeaseMinis.map((mini) => (
            <LeaseMiniTile mini={mini} key={mini.lease} />
          ))}
        </div>
      </details>

      <p className="tiny muted" style={{ margin: "0 0 12px" }}>
        {leaseMinisFoot}
      </p>

      <p className="wr-q">{page3GoodNews.heading}</p>
      <p className="small">
        <strong className="delta-up">{page3GoodNews.lead}</strong>{" "}
        {page3GoodNews.body}
      </p>

      <span className="wr-pageno">Page 3 of 5</span>
    </div>
  );
}

/* ============================================================================
   PAGE 4 · PRICES AND THE WORLD
   ============================================================================ */

/**
 * THE HARDEST PAGE TO WRITE HONESTLY, because it is the one most likely to be
 * read as advice. Three rules hold it in place and all three are visible in
 * the markup:
 *
 *   EVERY BULLET ENDS IN "WHAT IT MEANS FOR YOU", tied to THIS record's
 *   weighting. A paragraph about Hormuz that does not land on Ledbetter is
 *   market commentary the owner did not ask for.
 *
 *   EVERY CLAIM CARRIES A SOURCE CHIP the reader can open. The sources block
 *   below repeats them grouped, so a sceptical reader can verify the page
 *   without reading it twice.
 *
 *   THE FOOT SAYS "never a signal to buy, sell, or lease" and it is not
 *   optional.
 */
export function ReportPage4() {
  return (
    <div className="wr-page" id="wrPage4">
      <p className="wr-q">
        4 · What do world events mean for oil &amp; gas prices — and for me?{" "}
        <span
          className="chip chip-slate"
          style={{ fontSize: 9.5, verticalAlign: 3 }}
        >
          5 min
        </span>
      </p>

      <div className="pricebox">
        {priceTickers.map((ticker) => (
          <div className="pb" key={ticker.label}>
            <div className="tiny muted">{ticker.label}</div>
            <div className="v num">{ticker.value}</div>
            <div className="tiny">
              <span
                className={ticker.direction === "up" ? "delta-up" : "delta-down"}
              >
                {ticker.change}
              </span>{" "}
              this week
            </div>
          </div>
        ))}
      </div>

      <p className="tiny muted wr-noprint" style={{ margin: "6px 0 0" }}>
        {priceTickerNote}
      </p>

      <p className="small" style={{ margin: "10px 0 12px" }}>
        {page4Lead.before}
        <span className="cl-lock">{page4Lead.locked1}</span>
        {page4Lead.middle}
        <span className="cl-lock">{page4Lead.locked2}</span>
        {page4Lead.after}
      </p>

      <div
        className="wr-mini"
        style={{
          padding: "10px 12px",
          marginBottom: 12,
          border: "2px solid var(--green)",
        }}
      >
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>{whyGasMoved.heading}</h4>
          <span className="chip wr-chip-amber" style={{ fontSize: 10 }}>
            {whyGasMoved.chip}
          </span>
        </div>

        <p className="small" style={{ margin: "6px 0 4px" }}>
          <strong>What drove it, in plain English:</strong>
        </p>
        <ul className="small wr-reasons">
          {whyGasMoved.drivers.map((driver) => (
            <li key={driver.lead}>
              <strong>{driver.lead}</strong> — {driver.body}{" "}
              <a
                className="src-chip"
                href={driver.href}
                target="_blank"
                rel="noopener"
              >
                {driver.source}
              </a>
            </li>
          ))}
        </ul>

        <p className="tiny muted" style={{ margin: 0 }}>
          <strong>What it means for you:</strong> {whyGasMoved.means}
        </p>
      </div>

      <div className="wr-mini" style={{ padding: "10px 12px", marginBottom: 12 }}>
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4>{estimateByCounty.heading}</h4>
          <span className="chip chip-est" style={{ fontSize: 10 }}>
            {estimateByCounty.chip}
          </span>
        </div>
        <p className="tiny muted" style={{ padding: "6px 2px 8px" }}>
          {estimateByCounty.foot}
        </p>
        <p className="small wr-noprint" style={{ padding: "0 2px 10px" }}>
          <strong>Open a county report:</strong>{" "}
          <PortalLink href="/mineralownersite/map?county=bee">Bee →</PortalLink> ·{" "}
          <PortalLink href="/mineralownersite/map?county=hood">Hood →</PortalLink> ·{" "}
          <PortalLink href="/mineralownersite/map?county=cass">Cass →</PortalLink>{" "}
          <span className="tiny muted">{estimateByCounty.countyNote}</span>
        </p>
      </div>

      <p className="small tier-s" style={{ margin: "0 0 12px" }}>
        <strong>The world in one line for you:</strong> {worldInOneLine}
      </p>

      <h4 className="hide-s" style={{ marginBottom: 6 }}>
        World context this week{" "}
        <span className="chip chip-slate" style={{ fontSize: 10 }}>
          Market commentary — not advice
        </span>
      </h4>

      <ul className="small hide-s wr-reasons" style={{ margin: "0 0 10px 18px" }}>
        {worldContext.map((bullet) => (
          <li key={bullet.lead}>
            <strong>{bullet.lead}</strong> {bullet.body}{" "}
            <em>What it means for you:</em> {bullet.means}{" "}
            <a
              className="src-chip"
              href={bullet.href}
              target="_blank"
              rel="noopener"
            >
              {bullet.source}
            </a>
          </li>
        ))}
      </ul>

      <div className="card card-pad hide-s wr-sources">
        <h4 style={{ fontSize: 13, marginBottom: 2 }}>Sources &amp; data</h4>
        <p className="tiny muted" style={{ margin: "2px 0 8px" }}>
          Representative market commentary for the prototype — verify against
          these public sources. The full product replaces it with a live
          world-events + analyst feed.
        </p>
        <div className="stack" style={{ gap: 7 }}>
          {sourceList.map((group) => (
            <div className="tiny" key={group.label}>
              <strong>{group.label}</strong>
              <br />
              {group.links.map((link) => (
                <a
                  className="src-chip"
                  href={link.href}
                  target="_blank"
                  rel="noopener"
                  key={link.href}
                >
                  {link.text}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="tiny muted" style={{ margin: "10px 0" }}>
        {page4Foot}
      </p>

      <span className="wr-pageno">Page 4 of 5</span>
    </div>
  );
}

/* ============================================================================
   PAGE 5 · WHAT TO WATCH
   ============================================================================ */

/**
 * THE ONLY FORWARD-LOOKING PAGE, and everything on it carries a DATE or a
 * TRIGGER. "Watch your mailbox" is a habit, not a forecast; "gas sustained
 * above ~$4 on a four-week average" is a condition that can be checked and
 * that has a stated consequence. That distinction is the whole difference
 * between this page and a horoscope, and the Professional signal table exists
 * to make it explicit: signal, where, trigger, what we would do.
 */
export function ReportPage5() {
  return (
    <div className="wr-page" id="wrPage5">
      <p className="wr-q">
        5 · What to watch next{" "}
        <span
          className="chip chip-slate"
          style={{ fontSize: 9.5, verticalAlign: 3 }}
        >
          4 min
        </span>
      </p>

      <div className="card card-pad wr-next" style={{ margin: "0 0 12px" }}>
        <div className="between" style={{ flexWrap: "wrap" }}>
          <h4 style={{ marginBottom: 4 }}>
            Next month&apos;s statement — August 2026
          </h4>
          <span className="chip chip-est" style={{ fontSize: 10 }}>
            Estimate with a range — not a promise
          </span>
        </div>
        <p className="num wr-next-range">
          $330 – $540{" "}
          <span className="wr-next-mid">· midpoint about $435</span>
        </p>
        <p className="small" style={{ margin: "4px 0 0" }}>
          Across the whole record. The next quarter (Aug–Oct) models at{" "}
          <strong className="num">$980 – $1,600</strong>, midpoint about{" "}
          <strong className="num">$1,290</strong>, and the six-year figure
          remains <strong className="num">$26,340</strong>.
        </p>
        <p className="tiny muted" style={{ margin: "6px 0 0" }}>
          <strong>Why a range:</strong> we hold today&apos;s prices flat (WTI
          $68.78 · gas $3.245), the differential on a barrel varies with oil
          quality and area, gathering and compression deducts differ lease by
          lease and we cannot see yours, and operators post two to three months
          behind. Upload a division order and your last five cheques and this
          band gets measurably narrower — see &ldquo;Make this estimate more
          accurate&rdquo; on screen.
        </p>
      </div>

      <div className="tier-s" style={{ marginBottom: 12 }}>
        <ul className="wr-bullets" style={{ fontSize: 14 }}>
          {page5Watch.map((item) => (
            <li key={item.lead}>
              <strong>{item.lead}</strong> {item.body}
            </li>
          ))}
        </ul>
      </div>

      <div
        className="card card-pad"
        style={{
          boxShadow: "none",
          borderLeft: "4px solid var(--green)",
          margin: "0 0 12px",
        }}
      >
        <h4 style={{ marginBottom: 6 }}>
          Next on the calendar — what&apos;s coming, dated
        </h4>
        <div className="grid g4" style={{ gap: 10 }}>
          {calendar.map((item) => (
            <div key={item.what}>
              <strong className="tiny wr-celllabel">{item.when}</strong>
              <div className="small" style={{ fontWeight: 700 }}>
                {item.what}
              </div>
              <div className="tiny muted">{item.note}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="small hide-s" style={{ marginBottom: 12 }}>
        {bluestemNote}
      </p>

      <div className="tablewrap tier-p" style={{ marginBottom: 12 }}>
        <table style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>Signal to watch</th>
              <th>Where</th>
              <th>Trigger</th>
              <th>What we&apos;d do</th>
            </tr>
          </thead>
          <tbody>
            {signalTable.map((row) => (
              <tr key={row.signal}>
                <td>{row.signal}</td>
                <td>{row.where}</td>
                <td>{row.trigger}</td>
                <td className="tiny muted">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid g2" style={{ gap: 12, marginBottom: 12 }}>
        {/* The quiet-week sample. Printing what a NOTHING week reads like is
            the strongest possible statement that we do not pad one. */}
        <div className="card card-pad" style={{ boxShadow: "none" }}>
          <div className="section-label">{quietWeek.label}</div>
          <p className="small" style={{ marginTop: 8, fontStyle: "italic" }}>
            {quietWeek.quote}
          </p>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {quietWeek.note}
          </p>
        </div>

        <div className="card card-pad" style={{ boxShadow: "none" }}>
          <h4>{dossierNote.heading}</h4>
          <p className="small muted" style={{ marginTop: 6 }}>
            {dossierNote.body}
          </p>
          <PortalLink
            className="btn btn-mint btn-sm wr-noprint"
            style={{ marginTop: 10 }}
            href="/mineralownersite/dossier"
          >
            {dossierNote.cta}
          </PortalLink>
        </div>
      </div>

      <h4 style={{ marginBottom: 4 }}>Glossary corner</h4>
      <dl>
        {glossaryCorner.map((entry) => (
          <div className="glossary-term" key={entry.term}>
            <dt>{entry.term}</dt>
            <dd>{entry.def}</dd>
          </div>
        ))}
      </dl>

      {/* Professional · the data appendix. Decimal interests AS RECORDED —
          this is the table an adviser checks the rest of the report against. */}
      <div className="chartbox tier-p" style={{ marginTop: 14, boxShadow: "none" }}>
        <div className="between">
          <h4>Data appendix — numbers behind this report</h4>
          <span className="chip chip-slate">Professional view</span>
        </div>

        {/* `id` is the claimed gate's handle — see the note on `wrEstByLease`.
            Here it blurs the MVestimate column only: the decimal interest and
            the posted volumes are the owner's own record and stay readable. */}
        <div className="tablewrap" style={{ marginTop: 8 }}>
          <table id="wrAppendix" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                <th>Lease (no.)</th>
                <th>Operator</th>
                <th className="right">Decimal interest</th>
                <th className="right">MVestimate</th>
                <th className="right">Gas (mcf)</th>
                <th className="right">Oil (bbl)</th>
              </tr>
            </thead>
            <tbody>
              {dataAppendix.map((row) => (
                <tr key={row.lease}>
                  <td>
                    <PortalLink href="/mineralownersite/leases">{row.lease}</PortalLink>
                  </td>
                  <td>{row.operator}</td>
                  <td className="right num">{row.decimal}</td>
                  <td className="right num">{row.estimate}</td>
                  <td className="right num">{row.gas}</td>
                  <td className="right num">{row.oil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="tiny muted" style={{ marginTop: 14 }}>
        {page5Foot}
      </p>

      <span className="wr-pageno">Page 5 of 5</span>
    </div>
  );
}
