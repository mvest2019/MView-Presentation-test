/**
 * IS THE LEASE REPORT SHOWING THE RIGHT NUMBER, IN THE RIGHT PLACE?
 *
 *   1. `npm run dev`, sign in, open a lease: /mineralownersite/leases/08_46924
 *   2. Paste this whole file into the DevTools console.
 *
 * It prints two tables and a verdict.
 *
 * ── WHY TWO TABLES AND NOT ONE ──
 *
 * "Is the binding right" is two questions that fail in different ways, and a
 * check that answers only one of them is the reason a wrong binding survives
 * review:
 *
 *   VALUE     Did the page read the field it meant to read? A report bound to
 *             `owner_value_low` where it meant `owner_value` shows a plausible
 *             dollar figure in the right place, and no amount of looking at the
 *             screen catches it. This table compares the SERVICE'S OWN PAYLOAD
 *             against what the mapper produced, number against number, for
 *             every field — including the fifty-odd that are not on screen at
 *             the current density.
 *
 *   PLACEMENT Is that number under the heading that describes it? A value can
 *             be mapped perfectly and rendered in the wrong card — the two
 *             money columns on this page are three lines apart and mean
 *             different things. This table looks for each headline figure
 *             INSIDE the card it belongs to, not merely somewhere on the page.
 *
 * ── THE MAP BELOW IS THE SPECIFICATION ──
 *
 * Every row says: this field comes from this path, and it appears under this
 * heading. That is the only written statement of intent in the module — the
 * mapper says HOW and this says WHAT — so a disagreement between the two is
 * exactly what the check is for. When the service renames a field, this file is
 * where the rename is noticed.
 *
 * ── WHAT IT CANNOT TELL YOU ──
 *
 * It cannot say the service's own arithmetic is right: if `owner_value` is
 * wrong upstream, every row here passes and the page is still wrong. It checks
 * that the page faithfully repeats what it was told, which is the only half
 * the front end owns.
 *
 * Fields the service leaves empty on some leases — `ratios.season` on an oil
 * lease, `vs_model` when the model holds no expectation — are reported as SKIP
 * rather than FAIL, with the reason.
 */
(() => {
  const wire = window.__leaseWire;
  const report = window.__leaseReport;

  if (!wire || !report) {
    console.error(
      "%cNo lease report on this page.",
      "font-weight:bold;color:#b91c1c",
      "\n\nOpen a lease whose URL is a service id — /mineralownersite/leases/08_46924 —" +
        "\nand wait for it to finish loading. A fixture lease (290271-mccabe-etal-gu)" +
        "\nis built locally and never calls the service, so there is nothing to compare.",
    );
    return;
  }

  const L = wire.lease ?? {};

  /** Read a dotted path off the payload. */
  const at = (path) =>
    path.split(".").reduce((node, key) => (node == null ? node : node[key]), L);

  const near = (a, b) => {
    if (typeof a !== "number" || typeof b !== "number") return a === b;
    if (a === b) return true;
    /* A relative tolerance, because a few fields are a ratio of two figures on
       the payload and float division does not land on the same last bit. */
    return Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * 1e-9;
  };

  /* ═══════════════════════════════════════════════════════════════════════
     THE MAP — report field ← payload path, and the card it shows up in
     ═══════════════════════════════════════════════════════════════════════ */

  const MAP = [
    // ── identity ──────────────────────────────────────────────────────────
    ["lease.name", "lease_name", "heading"],
    ["lease.number", "lease_number", "heading"],
    ["lease.id", "lease_id", "url"],
    ["lease.county", "county", "heading"],
    ["lease.operator", "operator_name", "heading"],
    ["lease.acres", "acres", "facts strip"],
    ["lease.status", "lease_status", "band footer"],
    ["lease.wells", "well_count", "band footer"],
    ["lease.producingWells", "producing_wells", "band footer"],
    ["lease.decimalInterest", "interest", "header chip"],
    ["lease.reservoir", "reservoirs.0.name", "tab strip"],

    // ── the dark band ─────────────────────────────────────────────────────
    ["yourValue", "owner_value", "Your share — MVestimate value"],
    ["yourValueLow", "owner_value_low", "Your share — MVestimate value"],
    ["yourValueHigh", "owner_value_high", "Your share — MVestimate value"],
    ["grossValuation", "gross_value", "Gross lease valuation"],
    ["countyYourInterest", "appraised_value", "County appraised"],
    ["nextMonthLabel", "next_month_label", "Next month"],
    ["nextMonthLow", "next_month_low", "Next month"],
    ["nextMonthHigh", "next_month_high", "Next month"],
    ["nextQuarterLow", "quarter_low", "Next quarter"],
    ["nextQuarterHigh", "quarter_high", "Next quarter"],

    // ── the filing record ─────────────────────────────────────────────────
    ["firstPosting", "first_prod_label", "facts strip"],
    ["lastPosting", "last_posted_label", "facts strip"],
    ["postedMonths", "months_posted", "precision record"],
    ["gasFiled", "gas_to_date_share", "Filed to date"],
    ["oilFiled", "oil_to_date_share", "Filed to date"],
    ["gasProduced", "gas_to_date_share", "What is left"],
    ["gasReserves", "reserves_gas_share", "What is left"],
    ["oilProduced", "oil_to_date_share", "What is left"],
    ["oilReserves", "reserves_oil_share", "What is left"],

    // ── the trailing year ─────────────────────────────────────────────────
    ["trailingFrom", "year.from_label", "The last twelve months"],
    ["trailingTo", "year.to_label", "The last twelve months"],
    ["trailingGas", "year.gas_total", "The last twelve months"],
    ["trailingOil", "year.oil_total", "The last twelve months"],
    ["trailingShare", "year.cash_total", "The last twelve months"],
    ["yearToDateShare", "year.cash_total", "The last twelve months"],
    ["gasPerDayLow", "year.gas_lo_d", "The last twelve months"],
    ["gasPerDayHigh", "year.gas_hi_d", "The last twelve months"],
    ["gasPerDayAvg", "year.gas_avg_d", "The last twelve months"],
    ["oilPerDayLow", "year.oil_lo_d", "The last twelve months"],
    ["oilPerDayHigh", "year.oil_hi_d", "The last twelve months"],
    ["oilPerDayAvg", "year.oil_avg_d", "The last twelve months"],
    ["strongestMonth", "year.peak_label", "The last twelve months"],
    ["thinnestMonth", "year.trough_label", "The last twelve months"],
    ["bestMonthForYou", "year.rev_hi_label", "The last twelve months"],
    ["bestMonthShare", "year.rev_hi", "The last twelve months"],
    ["thinnestMonthForYou", "year.rev_lo_label", "The last twelve months"],
    ["thinnestMonthShare", "year.rev_lo", "The last twelve months"],
    ["declinePerMonth", "year.decline_pct", "The last twelve months"],
    ["oilYield", "year.yield_bbl_per_mmcf", "The last twelve months"],

    // ── the twelve months ahead ───────────────────────────────────────────
    ["forwardTotal", "price_test.at_deck", "What the next year looks like"],
    ["forwardLowDeck", "price_test.down20", "What the next year looks like"],
    ["forwardHighDeck", "price_test.up20", "What the next year looks like"],

    // ── where it stands ───────────────────────────────────────────────────
    ["position", "standing.rank_value", "Where it sits"],
    ["total", "standing.of", "Where it sits"],
    ["rankByValue", "standing.rank_value", "Where it sits"],
    ["rankLastMonth", "standing.rank_month", "Where it sits"],
    ["rankGasEver", "standing.rank_gas", "Where it sits"],
    ["shareOfRecordValue", "standing.share_value_pct", "Where it sits"],
    ["shareOfRecordLastMonth", "standing.share_month_pct", "Where it sits"],
    ["shareOfRecordGasEver", "standing.share_gas_pct", "Where it sits"],

    // ── the ratios ────────────────────────────────────────────────────────
    ["valuePerAcre", "ratios.per_acre_share", "The ratios that compare it"],
    ["realisedGas", "ratios.realised_gas", "The ratios that compare it"],
    ["realisedOil", "ratios.realised_oil", "The ratios that compare it"],
    ["halfMadeBy", "ratios.half_label", "The ratios that compare it"],
    ["halfMadeInMonths", "ratios.half_months", "The ratios that compare it"],
    ["acresPerWell", "ratios.acres_per_well", "The ratios that compare it"],
    ["stateBehindMonths", "ratios.lag_months", "The ratios that compare it"],
    ["projectedOilPercent", "ratios.oil_share_pct", "The ratios that compare it"],
  ];

  /** Fields that are a ratio of two payload figures, not a copy of one. */
  const DERIVED = [
    [
      "countyAgreementPercent",
      "appraised_value ÷ owner_value × 100",
      () =>
        report.yourValue > 0
          ? (report.countyYourInterest / report.yourValue) * 100
          : 0,
    ],
    [
      "gasProducedPercent",
      "gas_to_date_share ÷ (that + reserves_gas_share) × 100",
      () => {
        const whole = report.gasProduced + report.gasReserves;
        return whole > 0 ? (report.gasProduced / whole) * 100 : 0;
      },
    ],
    [
      "oilProducedPercent",
      "oil_to_date_share ÷ (that + reserves_oil_share) × 100",
      () => {
        const whole = report.oilProduced + report.oilReserves;
        return whole > 0 ? (report.oilProduced / whole) * 100 : 0;
      },
    ],
    [
      "projectedGasPercent",
      "100 − ratios.oil_share_pct",
      () => {
        const oil = at("ratios.oil_share_pct") ?? 0;
        return oil > 0 ? 100 - oil : 0;
      },
    ],
  ];

  /* ═══════════════════════════════════════════════════════════════════════
     TABLE 1 — VALUE
     ═══════════════════════════════════════════════════════════════════════ */

  const read = (obj, path) =>
    path.split(".").reduce((node, key) => (node == null ? node : node[key]), obj);

  const values = [];
  let pass = 0;
  let fail = 0;
  let skip = 0;

  for (const [field, path, card] of MAP) {
    const got = read(report, field);
    const want = at(path);

    /* The service did not send it. The mapper floors that to 0 or "", which is
       a deliberate choice, not a binding error — so it is reported, not
       failed. */
    if (want === undefined || want === null) {
      skip += 1;
      values.push({
        field,
        "from (payload)": path,
        payload: String(want),
        page: JSON.stringify(got),
        "": "SKIP — not sent",
        card,
      });
      continue;
    }

    const ok = near(got, want);
    ok ? (pass += 1) : (fail += 1);
    values.push({
      field,
      "from (payload)": path,
      payload: want,
      page: got,
      "": ok ? "ok" : "✗ MISMATCH",
      card,
    });
  }

  for (const [field, rule, compute] of DERIVED) {
    const got = read(report, field);
    const want = compute();
    const ok = near(got, want);
    ok ? (pass += 1) : (fail += 1);
    values.push({
      field,
      "from (payload)": rule,
      payload: want,
      page: got,
      "": ok ? "ok" : "✗ MISMATCH",
      card: "derived",
    });
  }

  /* ── the arrays, by shape rather than element by element ─────────────── */
  const arrays = [
    ["series.labels", (L.months ?? []).length, "month-by-month chart"],
    ["series.share.cash", (L.months ?? []).length, "month-by-month chart"],
    ["forward", (L.ahead ?? []).length, "What the next year looks like"],
    ["cumulativeGas", (L.cumulative ?? []).length, "Filed to date"],
    ["seasonality", 12, "Which months pay"],
  ];

  for (const [field, expected, card] of arrays) {
    const got = read(report, field);
    const length = Array.isArray(got) ? got.length : null;
    const ok = length === expected;
    ok ? (pass += 1) : (fail += 1);
    values.push({
      field: `${field}.length`,
      "from (payload)": "array length",
      payload: expected,
      page: length,
      "": ok ? "ok" : "✗ MISMATCH",
      card,
    });
  }

  /* ── the two seams, which is where this module has broken before ─────── */
  const seamFromLabel = (L.months ?? []).findIndex(
    (m) => m.label === L.last_posted_label,
  );
  values.push({
    field: "series.lastPostedIndex",
    "from (payload)": "months[] index of last_posted_label · seam − 1",
    payload: `${seamFromLabel} · ${(L.seam ?? 0) - 1}`,
    page: report.series?.lastPostedIndex,
    "":
      report.series?.lastPostedIndex === seamFromLabel
        ? "ok"
        : "✗ CHECK — label and seam disagree",
    card: "month-by-month chart",
  });
  if (report.series?.lastPostedIndex !== seamFromLabel) fail += 1;
  else pass += 1;

  console.log(
    `%c1. VALUE — the payload against what the page made of it  (${pass} ok, ${fail} mismatched, ${skip} not sent)`,
    "font-weight:bold;font-size:13px",
  );
  console.table(values);

  /* ═══════════════════════════════════════════════════════════════════════
     TABLE 2 — PLACEMENT
     ═══════════════════════════════════════════════════════════════════════ */

  /** Every way this app might render one number, so a hit is a hit. */
  const renderings = (n) => {
    if (typeof n !== "number" || !Number.isFinite(n)) return [];
    const abs = Math.abs(n);
    const commas = (v, digits = 0) =>
      v.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    const out = [commas(Math.round(n))];
    if (abs >= 1e9) out.push(`${commas(n / 1e9, 2)}B`, `${commas(n / 1e9, 1)}B`);
    if (abs >= 1e6) out.push(`${commas(n / 1e6, 2)}M`, `${commas(n / 1e6, 1)}M`);
    if (abs >= 1e3) out.push(`${commas(n / 1e3, 1)}K`, `${commas(Math.round(n / 1e3))}K`);
    if (abs < 1e3) out.push(commas(n, 1), commas(n, 2), commas(n, 3), String(n));
    out.push(commas(n, 1), commas(n, 2));
    return [...new Set(out)];
  };

  /**
   * The card a heading belongs to.
   *
   * Headings are h1/h2/h3 or the band's own uppercase labels, so the search is
   * over any element whose own text starts with the wanted string, and the card
   * is the nearest rounded container above it. Scoping to that container is the
   * whole point — `$109,716,097` appears in three places on this page and only
   * one of them is "Your share".
   */
  const cardFor = (heading) => {
    const wanted = heading.toLowerCase();
    const nodes = [...document.querySelectorAll("h1,h2,h3,h4,span,p,div")];
    const hit = nodes.find((n) => {
      const own = [...n.childNodes]
        .filter((c) => c.nodeType === 3)
        .map((c) => c.textContent)
        .join(" ")
        .trim()
        .toLowerCase();
      return own.startsWith(wanted);
    });
    if (!hit) return null;
    return (
      hit.closest("[class*='rounded-mv'],[class*='rounded-['],section,article") ??
      hit.parentElement
    );
  };

  /** The headline figures, and the heading each must sit under. */
  const PLACED = [
    ["yourValue", "Your share"],
    ["yourValueLow", "Your share"],
    ["yourValueHigh", "Your share"],
    ["grossValuation", "Gross lease valuation"],
    ["countyYourInterest", "County appraised"],
    ["nextMonthLow", "Next month"],
    ["nextMonthHigh", "Next month"],
    ["nextQuarterLow", "Next quarter"],
    ["nextQuarterHigh", "Next quarter"],
    ["lease.acres", "Acres"],
    ["lease.wells", "Lease status"],
    ["rankByValue", "Where it sits"],
    ["total", "Where it sits"],
    ["valuePerAcre", "The ratios that compare it"],
    ["acresPerWell", "The ratios that compare it"],
  ];

  const placement = PLACED.map(([field, heading]) => {
    const value = read(report, field);
    const card = cardFor(heading);
    const forms = renderings(value);

    if (!card) {
      return {
        field,
        "expected under": heading,
        value,
        "": "? card not found",
        note: "heading not on screen — wrong tab, or hidden at this density",
      };
    }
    if (forms.length === 0) {
      return {
        field,
        "expected under": heading,
        value,
        "": "— not a number",
        note: "",
      };
    }

    const cardText = card.innerText.replace(/\s+/g, " ");
    const pageText = document.body.innerText.replace(/\s+/g, " ");
    const inCard = forms.find((f) => cardText.includes(f));
    const onPage = forms.find((f) => pageText.includes(f));

    return {
      field,
      "expected under": heading,
      value,
      "": inCard
        ? "ok"
        : onPage
          ? "✗ WRONG CARD"
          : "✗ NOT RENDERED",
      note: inCard
        ? `found "${inCard}"`
        : onPage
          ? `"${onPage}" is on the page but not under this heading`
          : `tried: ${forms.slice(0, 4).join(" / ")}`,
    };
  });

  const misplaced = placement.filter((r) => r[""].startsWith("✗")).length;

  console.log(
    `%c2. PLACEMENT — is the figure under the heading that describes it  (${placement.length - misplaced} ok, ${misplaced} wrong)`,
    "font-weight:bold;font-size:13px",
  );
  console.table(placement);

  /* ═══════════════════════════════════════════════════════════════════════ */

  const broken = fail + misplaced;
  console.log(
    `%c${broken === 0 ? "✔ every checked binding agrees with the payload" : `✗ ${broken} binding${broken === 1 ? "" : "s"} to look at`}`,
    `font-weight:bold;font-size:14px;color:${broken === 0 ? "#047857" : "#b91c1c"}`,
  );
  console.log(
    `lease ${L.lease_id} · ${L.lease_name} · payload built ${wire.built_at ?? "?"}` +
      (wire.degraded_sources?.length
        ? `\n⚠ the service reported degraded sources: ${wire.degraded_sources.join(", ")}`
        : ""),
  );

  return { values, placement, wire, report };
})();
