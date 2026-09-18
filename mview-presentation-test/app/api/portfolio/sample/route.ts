/**
 * The record the not-claimed preview is built from — `/api/portfolio/sample`.
 *
 * WHY THIS ROUTE EXISTS AT ALL. `sampleize` needs one payload to rewrite, and
 * until now it was handed the reader's own. That made the shop window a
 * different shop for every visitor — and for a member who HAD claimed
 * something, their own portfolio under invented names, which is what was
 * reported. The preview should be one record for everybody: the committed
 * capture, which is the record the preview's copy was written against.
 *
 * WHY IT IS A FETCH AND NOT AN IMPORT. `sampleFixture()` lives behind
 * `owner-data.ts`, which imports 2 MB of JSON. `Portal` is a client component,
 * so importing it there would ship the whole capture to every browser on every
 * portal route — including the claimed readers who will never see a sample.
 * One request, made only by the readers who actually need it, is the cheaper
 * trade by a wide margin.
 *
 * WHY IT IS NOT `/api/portfolio?owner=<the fixture's owner>`. That path goes
 * through the seam, so with a real `mineralview-api` configured it would answer
 * with that owner's LIVE record — a real person's roll row, served as the
 * sample. The preview must not depend on what is configured.
 *
 * CACHEABLE, because it is a constant. The capture changes when the file in the
 * repository changes, which is a deploy, so a long browser cache is correct and
 * the payload never reaches the network twice for one reader.
 *
 * NOTHING HERE IS ANONYMISED — `sampleize` does that, on the client, the same
 * way it always has. This route serves the raw capture, which is the same
 * record `getOwnerPayload` already falls back to when no API is configured and
 * which this app has always been able to render.
 */
import { NextResponse } from "next/server";

import { sampleFixture } from "@/app/mineralownersite/_lib/reference/owner-data";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(sampleFixture(), {
    headers: {
      /* a deploy is the only thing that changes it */
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
