import {
  apiNumberFrom,
  generateSummary,
  hasSummaryKey,
  NO_KEY_MESSAGE,
  SUMMARY_SHAPE,
} from "@/lib/ai-summary";
import { getWellSummaryMap } from "@/lib/map-api";

/*
 * The written read on a completion record, generated.
 *
 * The permit route's twin — same key, same model, same JSON contract, same card
 * on the page. What differs is the record and what the model is told to look
 * for in it: a permit is an intention, a completion is a history, so this one
 * is about what the well has done and where the rate is going.
 *
 * The production series is deliberately not sent. `/wells/{api}/summary`
 * already carries the readings a reader asks about — last month, next month
 * estimated, last year, reserves, the month-on-month step, the implied annual
 * decline, GOR — and two hundred monthly rows would cost far more to send than
 * they add.
 */

const INSTRUCTIONS = `You are summarising a single Railroad Commission of Texas well completion record for a mineral owner.

Rules:
- Use only the fields given. Never invent a figure, a date, a depth or a name.
- Where a field is missing, say so plainly or leave it out. Do not guess.
- Volumes: oil is in barrels (BBL), gas in thousand cubic feet (MCF). Say which.
- analytics.oilStep and analytics.gasStep are month-on-month changes as
  fractions: -0.0051 is a fall of 0.51 per cent. analytics.impliedAnnualOil is
  already an annual rate. Do not restate a fraction as a percentage point.
- analytics.reserveToProductionMonths is how many months the booked reserves
  last at last month's rate. It is not a forecast of when the well stops.
- Quote a direction exactly as the field states it. wellbore.nearestWellDirection
  is the direction of that well from this one; do not reverse it.
- dates.lastProduction is the last month reported, not today. A gap between it
  and now is worth naming, but do not call a well shut in unless the status says so.
- No investment advice, no valuation, no recommendation to buy, sell or lease.
- Plain English. Name the figure you are drawing on.

Worth a finding when the record supports it: how the last month compares with
the year, whether the decline is steep or flat, how long the reserves last at
the current rate, the age against the wellbore length, and any field the record
leaves empty that a reader would expect.

${SUMMARY_SHAPE}`;

export async function POST(request: Request) {
  if (!hasSummaryKey()) {
    return Response.json({ error: NO_KEY_MESSAGE }, { status: 501 });
  }

  const posted = await apiNumberFrom(request);
  if ("error" in posted) {
    return Response.json({ error: posted.error }, { status: 400 });
  }

  /* Fetched here, not posted from the page: the read has to be of the record as
     the service holds it. */
  let summary;
  try {
    summary = await getWellSummaryMap(posted.api);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not read the well's record.",
      },
      { status: 502 },
    );
  }

  const result = await generateSummary(INSTRUCTIONS, summary);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    summary: result.summary,
    generatedAt: new Date().toISOString(),
  });
}
