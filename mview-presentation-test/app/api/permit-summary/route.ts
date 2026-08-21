import {
  apiNumberFrom,
  generateSummary,
  hasSummaryKey,
  NO_KEY_MESSAGE,
  SUMMARY_SHAPE,
} from "@/lib/ai-summary";
import { getWellPermitMap } from "@/lib/map-api";

/*
 * The written read on a permit, generated.
 *
 * Server-side on purpose: the key never reaches the browser. The page posts an
 * API number, this asks the service for the filing, hands it to the model and
 * returns what came back.
 *
 * What is here is the permit's half — which record to read and what to say
 * about it. The provider, the key and the JSON contract are shared with the
 * completion summary in `lib/ai-summary.ts`.
 */

/*
 * The rules are the point of this prompt rather than the tone: a permit is a
 * filing, and a summary of one that invents a figure is worse than no summary.
 */
const INSTRUCTIONS = `You are summarising a single Railroad Commission of Texas drilling permit for a mineral owner.

Rules:
- Use only the fields given. Never invent a figure, a date, a depth or a name.
- Where a field is missing, say so plainly or leave it out. Do not guess.
- Quote a direction exactly as the field states it. nearestWell.direction is the
  direction of that well from this one; do not reverse it, and do not describe
  this well's position relative to it.
- No investment advice, no valuation, no recommendation to buy, sell or lease.
- Plain English. Name the figure you are drawing on.

${SUMMARY_SHAPE}`;

export async function POST(request: Request) {
  if (!hasSummaryKey()) {
    return Response.json({ error: NO_KEY_MESSAGE }, { status: 501 });
  }

  const posted = await apiNumberFrom(request);
  if ("error" in posted) {
    return Response.json({ error: posted.error }, { status: 400 });
  }

  /*
   * The filing is fetched here rather than posted from the page: the summary
   * has to be of the record as the service holds it, not of whatever a browser
   * chose to send.
   */
  let permit;
  try {
    permit = await getWellPermitMap(posted.api);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not read the permit.",
      },
      { status: 502 },
    );
  }

  if (!permit) {
    return Response.json(
      { error: `No permit on file for ${posted.api}.` },
      { status: 404 },
    );
  }

  const result = await generateSummary(INSTRUCTIONS, permit);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    summary: result.summary,
    generatedAt: new Date().toISOString(),
  });
}
