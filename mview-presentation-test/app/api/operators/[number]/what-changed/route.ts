import { NextResponse } from "next/server";

import { fetchWhatChanged } from "@/lib/operator-what-changed-api";
import { getSessionUser } from "@/lib/session";

/**
 * `GET /api/operators/<number>/what-changed`
 *
 * The same-origin door in front of the tunnel. The section is lazy-loaded, so the
 * fetch starts in the browser — and a browser that called the tunnel directly would
 * need its address and bearer token in the shipped bundle. This runs server-side
 * instead, so the browser knows only its own origin and an operator number.
 *
 * IT IS ALSO THE CACHE. `fetchWhatChanged` tags its read, so a second reader of the
 * same operator inside the revalidate window is served without waking the Python
 * service, without touching MongoDB, and without another model call. That matters more
 * here than on the other endpoints: this one is the expensive path.
 *
 * IT IS ALSO WHERE THE SIGN-IN GATE LIVES, and it has to be here rather than on the
 * page. `/operators/[slug]` is statically prerendered for the best-known operators
 * (`generateStaticParams`), and reading a cookie in that server component would opt
 * the whole route out of static rendering — trading a prerendered page for a
 * per-request render on every visit, which is a far worse deal than anything the gate
 * buys. This handler is dynamic already, so the session read costs it nothing new and
 * the page above it stays static.
 *
 * THE GATE RETURNS BEFORE ANY WORK IS DONE, which makes it a performance WIN rather
 * than a cost. For a signed-out reader this endpoint no longer wakes the Python
 * service, no longer reads MongoDB and no longer makes a model call — the single most
 * expensive path on the site, skipped for the majority of visitors.
 *
 * FAILURES COME BACK AS 200 WITH A REASON. The panel has four distinct sad paths —
 * service unreachable, Mongo down, operator has no window, model unavailable — and the
 * UI draws each differently. Signalling them as HTTP errors would collapse the useful
 * distinction into `response.ok === false`, so the shape is always the same and the
 * client branches on `state`.
 */

/** The operator number is 6 digits — anything else is not worth a service round trip. */
const OPERATOR_NUMBER = /^\d{1,7}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;

  if (!OPERATOR_NUMBER.test(number)) {
    return NextResponse.json(
      { state: "error", detail: "operator number must be digits" },
      { status: 400 },
    );
  }

  /*
   * The gate, before the expensive path. `locked` is a fifth state alongside the four
   * the panel already draws, not an HTTP error: it is a normal, expected answer for a
   * visitor with no account, and collapsing it into `response.ok === false` would put
   * it in the same bucket as a service outage.
   *
   * `no-store` because the answer depends on who is asking — a shared cache holding
   * one reader's `locked` and serving it to a member, or the reverse, is the classic
   * way a gate like this breaks.
   */
  if (!(await getSessionUser())) {
    return NextResponse.json(
      { state: "locked" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await fetchWhatChanged(number);

    if (result.kind === "empty") {
      return NextResponse.json({ state: "empty", detail: result.detail });
    }
    return NextResponse.json({ state: "ready", panel: result });
  } catch (error) {
    // Logged server-side with the operator number so a failing operator is findable;
    // the reader gets a sentence, never the service's internals or its address.
    console.error(`[what-changed] ${number}:`, error);

    const message = error instanceof Error ? error.message : "";

    // Three distinct causes, three distinct answers. "Not configured" is a deploy
    // step, a timeout is a slow service worth retrying, and anything else is an
    // outage — reporting all three identically is what makes this section hard to
    // debug from the outside.
    if (message.startsWith("NOT_CONFIGURED")) {
      return NextResponse.json({
        state: "error",
        detail:
          "The analysis service is not configured for this environment yet.",
      });
    }

    const timedOut =
      (error instanceof Error && error.name === "TimeoutError") ||
      /timed? ?out/i.test(message);

    return NextResponse.json({
      state: "error",
      detail: timedOut
        ? "The analysis service took too long to respond."
        : "The analysis service could not be reached.",
    });
  }
}
