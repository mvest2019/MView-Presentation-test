import Link from "next/link";

import { Badge, EstimateBadge } from "../../_components/ui/badge";
import { leaseReportPath } from "../../leases/_lib/lease-routes";
import type { AlertExplainer } from "./alert-types";

/**
 * "WHAT THIS ALERT MEANS" — the nine explainers, ported from v34.
 *
 * ── WHY THE PAGE CARRIES NINE ESSAYS AT ALL ──
 *
 * The reference's own note: every alert opens one of these on click, the owner
 * STAYS where they are, and the four headings are always the same — What this
 * is · What it means for you · The evidence · What to do next. Then, and only
 * then, an optional door to the full screen. "Explanation is the default;
 * navigation is the choice."
 *
 * That is the whole product argument for the inbox. An alert that only says
 * "11 permits filed near Ledbetter" makes an owner who does not know what a
 * permit is feel behind on something. The explainer is what turns the same fact
 * into "paperwork at the Railroad Commission, not a rig on the ground, and none
 * of these are on your land."
 *
 * ── THE HONESTY FRAMING IS THE POINT, AND IT IS PORTED WORD FOR WORD ──
 *
 * Three sentences recur across these nine and none of them may be softened into
 * a claim:
 *
 *   · "A signal to verify — never an accusation."   production is public,
 *     payment is not, and only the owner's own statements can settle a gap.
 *   · "An interest signal, not income."             a neighbour's permit is not
 *     money, and saying so is what stops the inbox reading as a payday.
 *   · "An estimate, not an appraisal."              on every forward figure.
 *
 * ── WHAT IS DELIBERATELY DROPPED ──
 *
 * Five explainers end with a button into a SECOND drawer — the permit table
 * (`permits38`), the gas chart (`priceGas`), the masked names (`matches3`), the
 * trend view (`permitTrend`), a private message to a co-owner (`dmMargaret`).
 * None of those surfaces exist in this build, and the portal's standing
 * convention is that an affordance never points at nothing (`portal-nav.ts`).
 *
 * Their INFORMATION is kept — the 38 standing filings, the $3.245 print, the
 * three masked names all remain in the evidence lists where the design put them.
 * What is dropped is the chrome around it. Each one becomes a link again when
 * its module lands, and `openHref` already carries the door that matters.
 */

/** Shared by three explainers — the reference repeats it verbatim. */
const SMITH_REPORT = leaseReportPath("305892");

export const alertExplainers: Record<string, AlertExplainer> = {
  /* ── MONEY · the one row that asks something ─────────────────────────────── */
  "paid-check": {
    title: "Produced — but were you paid?",
    subtitle:
      "Alert explainer · you stay on this page · Ledbetter (74318) · detected Jul 04, 6:02 AM",
    what: (
      <>
        <strong>
          The public record shows your Ledbetter lease (74318) produced gas in
          three months we can see — Aug 2025, Nov 2025, and Feb 2026.
        </strong>{" "}
        What the public record can never show is whether the operator&apos;s
        checks for those months reached you correctly.
      </>
    ),
    means: (
      <>
        <strong>A signal to verify — never an accusation.</strong> Production
        filings and payment stubs usually match; deductions and timing explain
        most gaps. This alert exists for the times they don&apos;t match — that
        check is the single most valuable thing this service does for you. Worth
        a look, not a panic.
      </>
    ),
    evidence: (
      <>
        <li>
          RRC production postings on Ledbetter for{" "}
          <strong>Aug 2025 · Nov 2025 · Feb 2026</strong> — gas volumes filed by
          the operator (Caddo Pine Resources).
        </li>
        <li>
          We watch the record daily; this pattern was flagged{" "}
          <strong>Jul 04, 6:02 AM</strong> and sent to email + push.
        </li>
        <li>
          What we <em>don&apos;t</em> have: your check stubs. Payments only ever
          show on <em>your</em> statements — that&apos;s why the audit asks for
          them.
        </li>
      </>
    ),
    next: (
      <>
        Run your included <strong>Lease Audit</strong>: upload or send your check
        stubs and division orders, and it re-computes what each month should have
        paid on your decimal interest, flagging anything off in plain English.
      </>
    ),
    openHref: { href: "/lease-audit", label: "Open the full view — the Lease Audit" },
    foot: "Your statements are analyzed, not stored — we keep the findings, never the documents.",
  },

  /* ── ACTIVITY · the nearby-permit list ──────────────────────────────────── */
  "permits-11": {
    title: "11 permits within 1 mile of Ledbetter",
    subtitle:
      "Alert explainer · you stay on this page · Cass County · list updated Jul 03",
    what: (
      <>
        <strong>
          11 new drilling permits were filed within 1 mile of your Ledbetter
          lease (74318)
        </strong>{" "}
        in Cass County. A permit is an operator&apos;s filed permission to drill a
        well — paperwork at the Railroad Commission, not a rig on the ground, and
        none of these are on your land.
      </>
    ),
    means: (
      <>
        <strong>
          An interest signal about your rock — not income, and not a well on your
          land.
        </strong>{" "}
        Operators keep spending real money to drill next to you; that de-risks
        your area and tends to keep them interested in it. Nothing here changes
        your checks or your estimate by itself.
      </>
    ),
    evidence: (
      <>
        <li>
          <strong>11 permits</strong> on the Ledbetter 1-mile radius list — a real
          count from the nearby-permit scan, not a guess.
        </li>
        <li>
          Filed by area operators:{" "}
          <strong>EnerVista, Pine Belt, Cedarleaf</strong> — and 1 by{" "}
          <strong>Caddo Pine Resources, your own operator</strong> (a
          recompletion).
        </li>
        <li>
          Across all your leases the standing picture is{" "}
          <strong>38 distinct filings</strong>: 11 near Ledbetter · 6 near Averitt
          (4 shared) · 25 near the Cedar Bend pad.
        </li>
      </>
    ),
    next: (
      <>
        Nothing is required of you — file this under &ldquo;good to know.&rdquo;
        The one follow-up worth watching: if <em>your</em> operator files on{" "}
        <em>your</em> unit, that alert leads your weekly report the day it
        happens.
      </>
    ),
    foot: "Permit positions draw approximately until surface coordinates wire — said honestly, never faked as exact drill sites.",
  },

  /* ── ACTIVITY · the direction read ──────────────────────────────────────── */
  "permit-trend": {
    title: "Permit trend near Ledbetter",
    subtitle:
      "Alert explainer · you stay on this page · direction: holding, not fading",
    what: (
      <>
        <strong>
          A direction read on the drilling activity around your Ledbetter lease:
        </strong>{" "}
        the permit list near it keeps refilling rather than thinning — activity
        around your rock is <strong>holding, not fading</strong>.
      </>
    ),
    means: (
      <>
        Two questions decide whether nearby permits matter to you:{" "}
        <strong>
          is drilling moving toward your lease, and is any of it your own
          operator?
        </strong>{" "}
        Neighbour permitting de-risks your area without touching your acreage;
        your operator filing nearby is the pattern that most often precedes
        activity on your units. An interest signal, not income.
      </>
    ),
    evidence: (
      <>
        <li>
          Standing picture: <strong>11 permits within 1 mi of Ledbetter</strong>{" "}
          (real count) · filings skew to neighbour tracts.
        </li>
        <li>
          Operator split:{" "}
          <strong>1 your operator (Caddo Pine) · 10 neighbours</strong> — split
          labelled illustrative until the permit-detail join wires.{" "}
          <Badge tone="blue" size="xs">
            Trend data not available yet
          </Badge>
        </li>
      </>
    ),
    next: (
      <>
        Nothing to do today. When the dated permit feed wires, this alert starts
        saying explicitly &ldquo;moving toward you&rdquo; or &ldquo;moving
        away&rdquo; month by month.
      </>
    ),
  },

  /* ── ACTIVITY · a production posting ────────────────────────────────────── */
  "prod-smith": {
    title: "New production — Smith Gas Unit (305892)",
    subtitle:
      "Alert explainer · you stay on this page · posted Jul 02 · Bluestem batch",
    what: (
      <>
        <strong>
          Your strongest lease posted a new month of production to the public
          record:
        </strong>{" "}
        Smith Gas Unit (305892) filed{" "}
        <strong>27,120 mcf of gas and 133 bbl of oil</strong> on Jul 02, in the
        same batch as its sister Bee units.
      </>
    ),
    means: (
      <>
        Plainly good news: the unit behind the biggest slice of your value is
        still earning. One honest distinction —{" "}
        <strong>a posting is a production fact, not a payment</strong>. Your check
        for this month arrives on Bluestem&apos;s normal statement schedule; this
        filing is how we know the gas moved.
      </>
    ),
    evidence: (
      <>
        <li>
          <strong>305892 — 27,120 mcf · 133 bbl</strong>, posted Jul 02 (RRC
          production posting).
        </li>
        <li>
          Same batch: <strong>423065</strong> — 37,610 mcf · 303 bbl ·{" "}
          <strong>267145</strong> — 58,580 mcf · <strong>508936</strong> — 26,220
          mcf.
        </li>
        <li>
          This feeds the <strong>$8,700</strong> six-year share 305892 carries in
          your <strong>$26,340</strong> total — which held on this posting.{" "}
          <EstimateBadge />
        </li>
      </>
    ),
    next: (
      <>
        Nothing to do. When the matching month appears on your Bluestem
        statement, the two should line up — and if you ever want that checked line
        by line, that&apos;s exactly what your included{" "}
        <Link href="/lease-audit">Lease Audit</Link> does.
      </>
    ),
    openHref: {
      href: SMITH_REPORT,
      label: "Open the full view — the Smith lease report",
    },
  },

  /* ── MONEY · the price move ─────────────────────────────────────────────── */
  "gas-move": {
    title: "Gas +1.53% touched your estimate",
    subtitle:
      "Alert explainer · you stay on this page · Henry Hub $3.245 · week of Jul 04",
    what: (
      <>
        <strong>Natural gas firmed 1.53% to $3.245</strong> (Henry Hub — the
        benchmark your gas sells against) while{" "}
        <strong>WTI oil eased 0.13% to $68.78</strong>. Because your estimate is
        priced off these benchmarks, the model re-ran with the new numbers.
      </>
    ),
    means: (
      <>
        Mildly good for you: <strong>your record is gas-weighted</strong> — about
        92% of unit 305892&apos;s remaining value is gas — so gas is the price
        that moves your number most. This week&apos;s move was small:{" "}
        <strong>your $26,340 held</strong>. <EstimateBadge /> — and never a signal
        to buy, sell, or lease.
      </>
    ),
    evidence: (
      <>
        <li>
          Henry Hub gas <strong>$3.245 · ▲ 1.53%</strong> this week · WTI{" "}
          <strong>$68.78 · ▼ 0.13%</strong> · Brent $72.13 · ▲ 0.46%.
        </li>
        <li>
          The estimate model re-ran on the new strip: portfolio MVestimate{" "}
          <strong>$26,340 — unchanged</strong>; a sustained move above ~$4 gas is
          what would visibly lift it.
        </li>
      </>
    ),
    next: (
      <>
        Nothing to do — this is context, not a decision. If you want the story
        behind the move, this week&apos;s briefing charts exactly why gas firmed.
      </>
    ),
  },

  /* ── COMMUNITY · a co-owner's post ──────────────────────────────────────── */
  "group-post": {
    title: "Margaret D. posted in your group",
    subtitle:
      "Alert explainer · you stay on this page · Smith Gas Unit — Owners · 2h ago",
    what: (
      <>
        <strong>
          Margaret D., a co-owner of record on Smith Gas Unit (305892), posted in
          your private group
        </strong>{" "}
        &ldquo;Smith Gas Unit — Owners&rdquo; about two hours ago. This is a
        message from a neighbour-owner, not from Mineral View and not from the
        operator.
      </>
    ),
    means: (
      <>
        Your co-owners are paid from the same well off the same statements —{" "}
        <strong>
          owners comparing notes is how statement problems get caught early
        </strong>
        . Her question is one only the owners&apos; room can answer, and the room
        is private: owners only, operators never.
      </>
    ),
    evidence: (
      <>
        <li>
          Her post:{" "}
          <em>
            &ldquo;Saw Bluestem&apos;s new production posting on 305892 — does
            that change anyone&apos;s MVestimate?&rdquo;
          </em>
        </li>
        <li>
          Also in the thread: a co-owner pledged toward the shared royalty audit —{" "}
          <strong>3 of 12 pledged</strong>.
        </li>
        <li>
          Group: Smith Gas Unit — Owners · private ·{" "}
          <strong>20 owners of record</strong> on 305892 ·{" "}
          <strong>1 member joined</strong> — you · matched via ownership records.
        </li>
      </>
    ),
    next: (
      <>
        Reply in the thread if you have an answer (the honest one: the posting
        held your estimate at $26,340), or ask her something privately — DMs never
        enter the group.
      </>
    ),
  },

  /* ── MODELS · the spacing indicator ─────────────────────────────────────── */
  "new-well": {
    title: "New-well probability nudged up",
    subtitle:
      "Alert explainer · you stay on this page · Bee units · Moderate band",
    what: (
      <>
        <strong>
          Our spacing-based indicator of the chance a new well gets drilled on
          your Bee units moved up, staying within the Moderate band
        </strong>
        , after two nearby completion filings.
      </>
    ),
    means: (
      <>
        Directional context only —{" "}
        <strong>not a prediction, and we never show a made-up percentage</strong>.
        For your money: a new well on your acreage is the biggest upside a mineral
        owner has — a well like 305892 would add a six-year share on the scale of
        your current $8,700. <EstimateBadge />
      </>
    ),
    evidence: (
      <>
        <li>
          Trigger:{" "}
          <strong>two completions filed near your Bee units</strong> — completed
          wells nearby are the strongest spacing evidence there is.
        </li>
        <li>
          Indicator band: <strong>Moderate</strong> (directional). The fully
          backtested probability model is in build — until it ships, we say
          &ldquo;band,&rdquo; not &ldquo;percent.&rdquo;{" "}
          <Badge tone="blue" size="xs">
            Model in build
          </Badge>
        </li>
      </>
    ),
    next: (
      <>
        Nothing to do — you can&apos;t make an operator drill. The watch continues
        nightly, and a permit filed on <em>your</em> unit would be the alert that
        matters.
      </>
    ),
    openHref: {
      href: SMITH_REPORT,
      label: "Open the full view — the Smith report (“see the why”)",
    },
  },

  /* ── ACTIVITY · the digest itself ───────────────────────────────────────── */
  briefing: {
    title: "Your weekly briefing is ready",
    subtitle: "Alert explainer · you stay on this page · week ending Jun 27",
    what: (
      <>
        <strong>
          Your Saturday briefing for the week ending Jun 27 is ready
        </strong>{" "}
        — the once-a-week, plain-English summary of everything that touched your
        record: production postings, prices, permits, and anything that needs you.
      </>
    ),
    means: (
      <>
        That week&apos;s verdict, said explicitly:{" "}
        <strong>earning as expected — nothing needed your attention.</strong> We
        say that out loud so a quiet week never reads as neglect; the briefing is
        also where digest-class alerts roll up if you prefer weekly over
        per-event.
      </>
    ),
    evidence: (
      <>
        <li>
          Covers: your 10 leases&apos; postings · the price week (WTI · Henry Hub ·
          Brent) · nearby permits · the market context page with verify-here
          source links.
        </li>
        <li>
          Delivered email + in-app, Saturday morning · this one is marked read.
        </li>
      </>
    ),
    next: (
      <>
        Read it with coffee — it&apos;s built to take about four minutes. If
        you&apos;d rather get more (or fewer) alerts per-event instead of in the
        digest, tune classes in Settings.
      </>
    ),
  },

  /* ── MONEY · the annual records refresh ─────────────────────────────────── */
  "records-3": {
    title: "2026 owner records updated — 3 possible matches",
    subtitle:
      "Alert explainer · you stay on this page · Karnes & DeWitt counties · refresh detected Jul 03",
    what: (
      <>
        <strong>
          The county mineral-owner rolls received their 2026 refresh, and the new
          roll matched 3 records to your name variants
        </strong>{" "}
        (SMITH R E) on leases in Karnes and DeWitt counties — records that
        weren&apos;t matched to you before.
      </>
    ),
    means: (
      <>
        Possibly more minerals in your name — or a relative&apos;s, or a different
        C. D. Smith entirely. <strong>A matching name isn&apos;t proof.</strong>{" "}
        Nothing joins your record, and nothing counts in your $26,340, until you
        verify by the address on file. This fires only when records refresh — it is
        a records event, never a recurring nag.
      </>
    ),
    evidence: (
      <>
        <li>
          <strong>3 matched records</strong>: 2 in Karnes County (one producing
          gas, one inactive) · 1 in DeWitt County (producing oil).
        </li>
        <li>
          Matched on name variants: SMITH, C■■■■■S D · S■■■ONS, C D ET UX ·
          S■■■ONS FAMILY (C D) — masked here so a shoulder-surfer learns nothing.
        </li>
      </>
    ),
    next: (
      <>
        Verify by the address on file — it takes about a minute per record — or say
        &ldquo;not mine&rdquo; once and this stays quiet until the next records
        refresh.
      </>
    ),
    openHref: { href: "/claim", label: "Open the full view — the claim flow" },
  },
};
