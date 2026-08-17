import { NextResponse } from "next/server";

import { fetchWhatChanged } from "@/lib/operator-what-changed-api";

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
