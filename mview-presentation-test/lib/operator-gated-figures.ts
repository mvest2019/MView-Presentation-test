/**
 * The five figures the operator profile withholds from a signed-out reader.
 *
 * WHY THIS FILE IS ITS OWN MODULE, AND WHY IT IMPORTS NOTHING. Both sides of the
 * gate need this contract: the route handler that answers it and the client
 * component that draws it. The obvious home would be `operator-detail.ts`, where
 * `OperatorDetail` already lives — but that module pulls in the fixture tables
 * (`operator-detail-data`, `operator-compare-data`), and its own note at
 * `titleCase` records why a client component must not import it: doing so ships
 * those tables to the browser. So the contract lives here, with no imports, and
 * costs the bundle nothing.
 *
 * WHY THE PROFILE GATES AT ALL. The directory withholds four fields from a
 * signed-out reader — `Total_Production_Oil`, `Total_Production_Gas`,
 * `countie_count`, `leaseCount` — masked server-side in
 * `app/api/operators/search/route.ts`. The profile served all four in plain HTML
 * to the same reader, so the directory's lock was one click deep: friction, not a
 * gate. This closes that.
 *
 * THE GATE IS OURS, NOT THE API'S. Measured against the dev host on 2026-08-31:
 * `POST /operators/details` for operator 665748 returns a byte-identical 3,845-byte
 * body at `member_id: "3448"` and at `member_id: "0"` — same `leaseCount: 10324`,
 * same `Totaloilproduction: "1,907,873.826 (MBBL)"`, same 79 counties. The endpoint
 * has no opinion about who is asking, so the decision has to be made here.
 *
 * BOE IS NOT IN THIS LIST, DELIBERATELY. The directory does not gate BOE and the
 * production map keeps it real for everyone (see OPERATORS.md §4). Gating it on the
 * profile alone would make the two pages disagree in the opposite direction.
 *
 * `oilPct` IS IN THIS LIST BECAUSE IT IS A KEY, NOT A FIGURE. "Oil share of BOE"
 * against an open BOE total recovers the oil volume exactly — 79% of 2,390,697.170
 * is the withheld 1,907,873.826 — so leaving it open would make the oil lock
 * decorative.
 */

/**
 * The gate's answer.
 *
 * `locked: true` CARRIES NO FIELDS AT ALL, rather than fields set to a sentinel.
 * OPERATORS.md §4 rule 3: a withheld value must never reach the page as something
 * that could be printed as a figure. There is nothing here to accidentally render.
 *
 * A NULL ON THE UNLOCKED BRANCH MEANS "THE RECORD DOES NOT CARRY IT" — an em dash
 * on screen, never a zero. §4 rule 2: the page must not infer a gate from a missing
 * value, which is why `locked` is a field of its own and not something derived from
 * the shape.
 */
export type OperatorGatedFigures =
  | { locked: true }
  | {
      locked: false;
      /** Printed as the API formats it, unit included: `"1,907,873.826 (MBBL)"`. */
      oilProduced: string | null;
      gasProduced: string | null;
      /** Whole percent, or null when there is nothing to divide. */
      oilPct: number | null;
      leases: number | null;
      counties: number | null;
    };
