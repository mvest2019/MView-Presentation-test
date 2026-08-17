import { NextResponse } from "next/server";

import { fetchOperatorLogo, isAbortError } from "@/lib/operator-api";

/**
 * Same-origin passthrough for an operator's logo.
 *
 * WHY IT EXISTS. The upstream logo response sets
 * `Cross-Origin-Resource-Policy: same-origin`, so a browser will fetch the image
 * from our page and then refuse to display it — `<img onerror>` fires on a
 * perfectly good 512×512 PNG. Serving the same bytes from our own origin makes the
 * embed same-origin and the header is satisfied. See `fetchOperatorLogo` for the
 * measurements behind that, and for the one-line upstream fix that makes this
 * whole file deletable.
 *
 * It is a passthrough, not a transform: status, `Content-Type` and the validators
 * come from upstream so the browser can still revalidate with `If-None-Match`.
 *
 * The static `/api/operators/search` route is unaffected — Next matches literal
 * segments before dynamic ones, so `search` never falls into `[number]`.
 */

/** Operator numbers are six digits, zero-padded (`020528`). Nothing else passes. */
const OPERATOR_NUMBER = /^\d{6}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const { number } = await params;

  // Validated, not just escaped: this value is interpolated into an upstream URL,
  // so anything that is not a plain operator number is refused here rather than
  // forwarded and hoped about.
  if (!OPERATOR_NUMBER.test(number)) {
    return NextResponse.json(
      { error: "Not an operator number" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetchOperatorLogo(number, request.signal);

    // 404 is the normal answer for an operator with no logo on file, and it is not
    // an error worth logging. It is passed through so the client's `onError` runs
    // and the monogram takes over.
    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    // Only ever re-serve an image. If the endpoint answers 200 with JSON — which is
    // what its error bodies are — passing it through under an image request would
    // be handing the browser a mislabelled payload.
    if (!contentType.startsWith("image/")) {
      console.error("[operators] logo response was not an image", {
        number,
        contentType,
      });
      return new NextResponse(null, { status: 502 });
    }

    const etag = upstream.headers.get("etag");

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // A logo changes about never. Long-lived and revalidatable, matching what
        // the upstream itself sends.
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        ...(etag ? { ETag: etag } : {}),
        // Explicit, so this response cannot inherit a restrictive default and
        // reintroduce the very problem the route exists to solve.
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (isAbortError(error)) return new NextResponse(null, { status: 499 });

    console.error("[operators] logo fetch failed", { number, error });
    return new NextResponse(null, { status: 502 });
  }
}
