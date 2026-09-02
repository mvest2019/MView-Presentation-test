/**
 * THE PER-WELL ALLOCATION — how a lease's forecast divides between its
 * wellbores, or why on this lease it does not have to.
 *
 * ── ONE WELL IS THE STRONGEST CASE, NOT THE EMPTIEST ──
 *
 * The engine ranks its evidence, and "sole well on a lease" sits second, above
 * every weighting rule: one well means that well's posted volume IS the lease's,
 * measured rather than apportioned. Smith is that case, so its share is 100.0%
 * on a basis of "sole well — no weighting applied" and nothing here is modelled.
 * The panel leads on that rather than apologising for a missing split.
 *
 * ── THE WORKED EXAMPLE EXISTS TO SHOW WHAT IS AT STAKE ──
 *
 * A single-well lease cannot demonstrate why allocation matters, so the
 * Professional tier reads a real four-well lease live from the engine. Its last
 * row is the argument: a wellbore barely half the length of the others takes
 * 14.56% against a 25% equal split — 29,403 BOE instead of 51,400. That gap is
 * the whole case for allocating at all, and it is on someone's cheque.
 *
 * ── TWO ADMISSIONS THAT COST SOMETHING TO PRINT ──
 *
 * The lateral term is basin-specific rather than physics (elasticity 0.11–0.48
 * across five Eagle Ford counties, ~0.90 in the Permian), and 52% of Texas wells
 * carry no wellbore profile at all — so for most of the state the basis falls
 * back and the confidence drops. Both are in the record because a share quoted
 * without them reads more solid than it is.
 */

/** One wellbore's share in the worked example. */
export interface AllocatedWell {
  api: string;
  perfLength: string;
  test24: string;
  share: string;
  /** Signed difference against an equal split, in percentage points. */
  vsEqualSplit: string;
  remaining: string;
  confidence: string;
}

export interface WellAllocationRecord {
  /** Both as-of dates: a split is only as current as the forecast under it. */
  splitComputed: string;
  curveResolved: string;

  /** This lease's own share — trivial where there is one well. */
  share: {
    ofLeaseVolumes: string;
    basis: string;
    gasStillToCome: string;
    wellsSharingLease: string;
  };

  /** How much raw proportional splitting over-paid the bigger well. */
  rawSplitOverpay: string;

  /** The real multi-well lease the Professional tier reads. */
  example: {
    lease: string;
    rrc: string;
    field: string;
    county: string;
    operator: string;
    eur: string;
    produced: string;
    remaining: string;
    curveResolved: string;
    wells: AllocatedWell[];
    /** The last row's argument, stated in figures. */
    lastRow: {
      share: string;
      equalSplit: string;
      difference: string;
      wouldHaveBeen: string;
      actual: string;
    };
    method: {
      version: string;
      basis: string;
      confidence: string;
      massBalanceError: string;
      monthsAllocated: string;
      monthsNote: string;
      sharesSumTo: string;
    };
    weakest: {
      elasticityRange: string;
      permianElasticity: string;
      noProfileShare: string;
    };
  };
}

export const smithWellAllocation: WellAllocationRecord = {
  splitComputed: "6 Aug 2026",
  curveResolved: "1 Feb 2026",

  share: {
    ofLeaseVolumes: "100.0%",
    basis: "sole well — no weighting applied",
    gasStillToCome: "290,000 mcf",
    wellsSharingLease: "1",
  },

  rawSplitOverpay: "3×",

  example: {
    lease: "DEFTONES EF UNIT",
    rrc: "02_11419",
    field: "Eagleville Eagle Ford-2",
    county: "Karnes",
    operator: "EnerVest",
    eur: "1,974,926",
    produced: "1,769,325",
    remaining: "205,601",
    curveResolved: "1 Feb 2026",

    wells: [
      {
        api: "42-255-35370-0000",
        perfLength: "4,372 ft",
        test24: "1,944",
        share: "31.52%",
        vsEqualSplit: "+6.52 pp",
        remaining: "65,147",
        confidence: "HIGH",
      },
      {
        api: "42-255-35369-0000",
        perfLength: "4,681 ft",
        test24: "1,488",
        share: "29.57%",
        vsEqualSplit: "+4.57 pp",
        remaining: "61,036",
        confidence: "HIGH",
      },
      {
        api: "42-255-35367-0000",
        perfLength: "4,335 ft",
        test24: "1,165",
        share: "24.34%",
        vsEqualSplit: "−0.66 pp",
        remaining: "50,015",
        confidence: "HIGH",
      },
      {
        api: "42-255-35386-0000",
        perfLength: "2,497 ft",
        test24: "1,214",
        share: "14.56%",
        vsEqualSplit: "−10.44 pp",
        remaining: "29,403",
        confidence: "HIGH",
      },
    ],

    lastRow: {
      share: "14.56%",
      equalSplit: "25%",
      difference: "10.44 pp",
      wouldHaveBeen: "51,400",
      actual: "29,403",
    },

    method: {
      version: "method v1.1",
      basis: "test24 + lateral, all 4 wells",
      confidence: "HIGH × 4",
      massBalanceError: "2.9 × 10⁻¹¹",
      monthsAllocated: "178",
      monthsNote: "(1 on fallback)",
      sharesSumTo: "1.000000",
    },

    weakest: {
      elasticityRange: "0.11–0.48",
      permianElasticity: "0.90",
      noProfileShare: "52%",
    },
  },
};
