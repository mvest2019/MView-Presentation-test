/**
 * The weekly report, in whichever form the reader wants to keep.
 *
 *   /api/weekly                     the report as JSON
 *   /api/weekly?format=html         one standalone HTML document
 *   /api/weekly?format=html&dl=1    the same, as a download
 *   /api/weekly?format=csv          the week's filings as a spreadsheet
 *   &sample=1                       the not-claimed version, figures withheld
 *
 * The HTML form is deliberately a FILE and not a page of this app: every style
 * is inline, there is no script and no request to anything, so it opens the
 * same way on a machine that has never seen this server. That is what makes it
 * mailable and archivable — see `_lib/reference/weekly-render.ts`, which is the
 * reference's renderer, copied.
 *
 * PORTED FROM the reference's `src/app/api/weekly/route.ts`. Two changes, both
 * forced by there being no database here: the payload comes from the data seam
 * instead of `buildPayload()`, and the `mongoUri` guard that answered 503 is
 * gone because there is nothing to configure. Every URL, parameter, header,
 * filename and message is the reference's.
 */
import { NextResponse } from "next/server";

import {
  getOwnerPayload,
  selectionFrom,
} from "@/app/mineralownersite/_lib/reference/owner-data";
import { sampleize } from "@/app/mineralownersite/_lib/reference/sample";
import * as render from "@/app/mineralownersite/_lib/reference/weekly-render";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** a filename a reader can find again in six months */
function fileName(owner: string, week: string, ext: string): string {
  const slug = owner
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `weekly-report-${slug || "owner"}-${week}.${ext}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = (url.searchParams.get("format") ?? "json").toLowerCase();
  const sample = url.searchParams.get("sample") === "1";
  const download = url.searchParams.get("dl") === "1";

  try {
    /* `live: false` — this endpoint reads `payload.weekly` and nothing else,
       so it does not wait on the Alerts and Activity service, and a download
       cannot fail because that service is down. See `PayloadOptions`. */
    const live = await getOwnerPayload(selectionFrom(url), { live: false });
    /* the not-claimed form goes through the SAME transform the screen uses, so
       a downloaded sample cannot carry figures the screen withheld */
    const payload = sample ? sampleize(live).payload : live;
    const r = payload.weekly;

    if (format === "html") {
      return new NextResponse(render.html(r, { sample }), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          ...(download
            ? {
                "Content-Disposition": `attachment; filename="${fileName(r.owner_name, r.week_ending_iso, "html")}"`,
              }
            : {}),
        },
      });
    }

    if (format === "csv") {
      return new NextResponse(render.csv(r), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="${fileName(r.owner_name, r.week_ending_iso, "csv")}"`,
        },
      });
    }

    if (format === "email") {
      /* what WOULD be sent, so the reader can read it before it goes */
      const m = render.email(r, { sample });
      return NextResponse.json(
        { subject: m.subject, text: m.text, html_bytes: m.html.length },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "build failed", detail: msg },
      { status: 500 },
    );
  }
}
