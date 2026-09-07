/**
 * One unit convention per quantity, across the whole operator profile — DEFECT 147.
 *
 * "One unit convention per quantity across the page, or an explicit unit change
 * indicator when the scale switches."
 *
 * WHAT THE PAGE LOOKED LIKE. Four sections report oil and gas, and each printed
 * whatever its own endpoint declared:
 *
 *   Production metrics      MBBL   / MMCF    (`/operators/details`)
 *   Production over time    MBBL   / MMCF for All counties,
 *                           MMBBL  / BCF    for a single county
 *   Production by county    MMBBL  / BCF     (`/operators/production-by-county`)
 *   Operator leases         BBL    / MCF     (`/operators/leases`)
 *   Wells on a lease        BBL    / MCF     (`/operators/wells`)
 *
 * So one screen carried the same quantity at three magnitudes a thousand apart, and
 * selecting a county in the chart silently rescaled both its axes. A reader comparing
 * a lease against its county against the operator total was comparing 7,676,866,
 * 714.982 and 1,907,873.826 — three true numbers that cannot be read against each
 * other, with nothing on the page saying why.
 *
 * THE FIX IS THE FIRST OPTION THE DEFECT OFFERS, not the second. An indicator was
 * already there on the chart's axes and it did not help: knowing that the unit changed
 * does not let anyone compare across it. Every volume on the profile is now converted
 * to one convention and labelled with it.
 *
 * MBBL AND MMCF, because that is what `/operators/details` already answers and what
 * the profile's own headline "Production metrics" have always shown — so the section a
 * reader anchors on does not move, and the conversions happen on the sections that
 * were disagreeing with it.
 *
 * THE CONVERSIONS ARE EXACT AND MECHANICAL. Every factor here is a power of ten
 * between units that are defined in terms of each other — a barrel, a thousand
 * barrels, a million barrels; a thousand cubic feet, a million, a billion. Nothing is
 * estimated and no rate is applied. The API's declared unit is what selects the
 * factor, so a value whose unit this does not recognise is returned UNCHANGED with its
 * own unit rather than being guessed at: a wrong magnitude printed confidently is the
 * worst failure available here, and OPERATORS.md §4 rule 3 says so.
 *
 * WHY NOT NORMALISE AT THE API LAYER. Each parser is the contract for its endpoint and
 * is documented against measured responses; rewriting the numbers there would make
 * those notes false and hide the conversion from anyone diffing a payload against the
 * screen. This is a display concern and lives at the display boundary.
 */

/** The profile's oil convention: thousands of barrels. */
export const CANONICAL_OIL_UNIT = "MBBL";

/** The profile's gas convention: millions of cubic feet. */
export const CANONICAL_GAS_UNIT = "MMCF";

/**
 * How many of the canonical unit one of the declared unit is worth.
 *
 * Keyed upper-case; callers normalise the case before looking up, because the API is
 * inconsistent about it (`MMBBL` and `MMbbl` both appear).
 */
const TO_CANONICAL: Readonly<Record<string, number>> = {
  // Oil, into MBBL.
  BBL: 1 / 1_000,
  MBBL: 1,
  MMBBL: 1_000,
  // Gas, into MMCF. Mcf is a thousand cubic feet, MMcf a million, Bcf a billion — so
  // a Bcf is a thousand MMcf, and Mcf is a thousandth of one.
  MCF: 1 / 1_000,
  MMCF: 1,
  BCF: 1_000,
};

/** Whether a declared unit is one this can convert. */
export function isConvertibleUnit(unit: string): boolean {
  return unit.trim().toUpperCase() in TO_CANONICAL;
}

/**
 * A volume in the unit the API declared → the same volume in the page's convention.
 *
 * Returns the value and the unit to print beside it. An unrecognised or missing unit
 * comes back untouched, carrying whatever the API called it — see the note above on
 * why guessing is not an option.
 */
export function toCanonicalVolume(
  value: number,
  declaredUnit: string,
): { value: number; unit: string } {
  const key = declaredUnit.trim().toUpperCase();
  const factor = TO_CANONICAL[key];
  if (factor === undefined || !Number.isFinite(value)) {
    return { value, unit: declaredUnit.trim() };
  }
  const canonical =
    key === "BBL" || key === "MBBL" || key === "MMBBL"
      ? CANONICAL_OIL_UNIT
      : CANONICAL_GAS_UNIT;

  /*
   * SNAPPED, BECAUSE MULTIPLYING BY A POWER OF TEN IN BINARY FLOAT DOES NOT GIVE A
   * ROUND ANSWER. `714.982 * 1000` is `714982.0000000001`, and the chart prints its
   * figures with `maximumFractionDigits: 20` — so an unsnapped conversion would put
   * "714,982.000000000058" on an axis. That is defect 140 exactly, reintroduced by the
   * fix for 147, which is the kind of thing this file exists to not do.
   *
   * `toFixed` rather than `Math.round(v * 1e6) / 1e6`: the multiply would take a
   * billion-barrel figure past 2^53 and lose the precision it was meant to protect.
   *
   * SIX PLACES, not three. These endpoints report at three, and dividing by a thousand
   * moves them to six — so six is exactly enough to be lossless in both directions,
   * and the display formatters still cut back to the page's three.
   */
  return { value: Number((value * factor).toFixed(6)), unit: canonical };
}

/**
 * The same, formatted for a table cell.
 *
 * THREE DECIMALS, which is the convention defect 140 settled on for this page and the
 * precision `/operators/production-by-county` already reports at. It matters more
 * after a conversion than before one: 7,676,866 BBL becomes 7,676.866 MBBL, and
 * rounding that to a whole number would throw away digits the API actually sent.
 *
 * `minimumFractionDigits` is deliberately unset, so a whole number stays whole rather
 * than gaining ".000".
 */
export function formatCanonicalVolume(
  value: number,
  declaredUnit: string,
): { text: string; unit: string } {
  const converted = toCanonicalVolume(value, declaredUnit);
  return {
    text: converted.value.toLocaleString("en-US", {
      maximumFractionDigits: 3,
    }),
    unit: converted.unit,
  };
}
