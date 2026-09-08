"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

/*
 * The written read on one of a well's records, generated from the record itself.
 *
 * Written by the model, from that record and nothing else.
 *
 * One card, both tabs: the permit summary and the completion summary are the
 * same thing about different records, so the difference between them is which
 * route this posts to. `/api/permit-summary` reads the filing,
 * `/api/completion-summary` reads the completion — either way the route reads
 * the record, hands it to the model and returns what came back, so the key
 * stays on the server and the summary is of the record as the service holds
 * it.
 *
 * Labelled and dated, because that is the difference between a summary and a
 * claim. When the model cannot be reached the card says so rather than writing
 * something itself: a summary nobody generated should not look like one that
 * was.
 */

const TONES: Record<string, string> = {
  green: "border-[#bfe3cc] bg-mv-mint text-mv-green-deep",
  blue: "border-[#c7d7f2] bg-[#f3f7fd] text-mv-blue",
  amber: "border-mv-amber/40 bg-mv-amber-bg text-mv-amber",
  red: "border-[#f6c9c6] bg-mv-red-bg text-mv-red",
  slate: "border-mv-line bg-[#f4f6f5] text-mv-slate",
};

type Finding = {
  title?: string;
  badge?: string;
  tone?: string;
  body?: string;
};

type Summary = {
  lead?: string;
  findings?: Finding[];
  basis?: string;
};

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "ready";
      summary: Summary;
      generatedAt: string;
    }
  | { kind: "error"; message: string };

/**
 * The model's failure, said in one line.
 *
 * What comes back from the provider is written for whoever wired the key up:
 * a quota refusal arrives as three sentences, two documentation URLs and a
 * retry delay to nine decimal places. On a phone that is a wall of red with
 * links nobody can follow. The cases worth telling apart are named here; the
 * rest is passed through, trimmed.
 */
function readable(message: string): string {
  if (/quota|rate.?limit|429|exceeded/i.test(message)) {
    return "The summary service is over its quota for the moment. Try Regenerate in a minute.";
  }
  if (/failed to fetch|networkerror|502|503|timeout|timed out/i.test(message)) {
    return "The summary service did not answer. Try Regenerate in a moment.";
  }

  /* Whatever else it was, without the links: a URL in a paragraph this narrow
     wraps to four lines and cannot be clicked anyway. */
  const plain = message.replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  return plain.length > 180 ? `${plain.slice(0, 177)}…` : plain;
}

export function AiSummary({
  api,
  endpoint,
  caption,
  loadingLabel,
  title,
  context,
}: {
  /** The well the summary is of. */
  api: string;
  /** Which record to read — the route that fetches it and writes the summary. */
  endpoint: string;
  /** What the card says it is written from, beside the heading. */
  caption: string;
  /** What it says while the model is reading. */
  loadingLabel: string;
  /** The record's name, for the card's own header. */
  title: string;
  /** The one-line description under it. */
  context: string;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });
  /** Bumped by Regenerate; the effect below watches it. */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!api) return;

    let cancelled = false;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          setState({
            kind: "error",
            message:
              typeof data?.error === "string"
                ? data.error
                : `The summary service answered ${response.status}.`,
          });
          return;
        }

        setState({
          kind: "ready",
          summary: data.summary as Summary,
          generatedAt: String(data.generatedAt ?? ""),
        });
      })
      .catch((failure: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message:
            failure instanceof Error
              ? failure.message
              : "Could not reach the summary service.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [api, endpoint, attempt]);

  const loading = state.kind === "idle" || state.kind === "loading";
  const findings = state.kind === "ready" ? (state.summary.findings ?? []) : [];

  return (
    <section
      data-page-block=""
      className="@container rounded-xl border border-mv-line bg-mv-bg p-3 lg:p-4"
    >
      {/* ---------------- what this is ----------------
          The caption sits beside the heading where there is room for it and
          under it where there is not. Held on one line it squeezed "AI
          Summary" into two words on two lines with the caption in a column
          beside it. */}
      <div className="flex items-start gap-[10px] pb-3 @md:items-center">
        <span
          aria-hidden="true"
          className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
        >
          <Sparkles size={15} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1 @md:flex @md:items-center @md:gap-[10px]">
          <h2 className="whitespace-nowrap text-[14.5px] font-bold leading-none text-mv-ink">
            AI Summary
          </h2>
          <p className="mt-[4px] text-[11.5px] leading-snug text-mv-muted @md:mt-0 @md:leading-none">
            {caption}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-mv-line bg-white">
        {/* ---------------- which well, and when it was read ------------- */}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-mv-line px-4 py-[14px] @md:flex-nowrap">
          <span
            aria-hidden="true"
            className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
          >
            <Sparkles size={16} strokeWidth={2} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold leading-tight text-mv-ink">
              {title}
            </span>
            <span className="mt-[4px] block text-[11.5px] leading-snug text-mv-muted">
              {context}
            </span>
          </span>

          {/* Narrow, this is a row of its own under the name — held beside it
              the name had about forty pixels to wrap in. */}
          <span className="w-full text-right @md:ml-auto @md:w-auto">
            <button
              type="button"
              disabled={loading}
              onClick={() => {
                setState({ kind: "loading" });
                setAttempt((count) => count + 1);
              }}
              /* Screen only: a button in a PDF is a picture of a button, and
                 this one asks the model to write the summary again — which is
                 not something a printed page can offer. `mv-screen-only` is
                 stripped from the copy the capture is taken from. */
              data-screen-only=""
              className="mv-screen-only inline-flex items-center gap-[7px] rounded-lg border border-mv-line px-[12px] py-[7px] text-[12px] font-semibold text-mv-slate enabled:cursor-pointer enabled:hover:border-mv-green-deep enabled:hover:text-mv-green-deep disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                size={13}
                strokeWidth={2}
                aria-hidden="true"
                className={loading ? "animate-spin" : ""}
              />
              Regenerate
            </button>
            {state.kind === "ready" && state.generatedAt && (
              <span className="mt-[6px] block text-[10.5px] leading-none text-mv-muted">
                Generated {stamp(state.generatedAt)}
              </span>
            )}
          </span>
        </div>

        {/* ---------------- the read itself ---------------- */}
        {loading && (
          <p className="flex items-center gap-[10px] px-4 py-[22px] text-[12.5px] text-mv-slate">
            <span
              aria-hidden="true"
              className="h-[15px] w-[15px] shrink-0 animate-spin rounded-full border-2 border-mv-line border-t-mv-green-deep"
            />
            {loadingLabel}
          </p>
        )}

        {state.kind === "error" && (
          <div className="px-4 py-[16px]">
            <p
              role="alert"
              /* `break-words`: whatever survives the tidy-up may still be one
                 long token, and a panel this narrow has nowhere to put it. */
              className="break-words text-[12.5px] leading-snug text-mv-red"
            >
              {readable(state.message)}
            </p>
            <p className="mt-[6px] text-[11.5px] leading-snug text-mv-muted">
              The record above is unaffected — it comes from the map service,
              not from here.
            </p>
          </div>
        )}

        {state.kind === "ready" && (
          <>
            {state.summary.lead && (
              <p className="border-b border-mv-line px-4 py-[14px] text-[12.5px] leading-[1.6] text-mv-slate">
                {state.summary.lead}
              </p>
            )}

            {/* Ruled apart rather than boxed: cards inside a card is one
                border too many, and the rules already say where each ends. */}
            <ol className="px-4">
              {findings.map((finding, index) => (
                <li
                  key={`${finding.title ?? index}`}
                  className="flex gap-[12px] border-b border-mv-line py-[14px] last:border-0"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[1px] grid h-[20px] w-[20px] shrink-0 place-items-center rounded-md border border-mv-line bg-[#fafbfa] text-[10.5px] font-bold tabular-nums text-mv-slate"
                  >
                    {index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-[10px] gap-y-1">
                      <span className="text-[12.5px] font-bold leading-snug text-mv-ink">
                        {finding.title ?? "—"}
                      </span>
                      {finding.badge && (
                        <span
                          className={`rounded border px-[6px] py-[3px] text-[9px] font-extrabold uppercase leading-none tracking-[.07em] ${
                            TONES[finding.tone ?? "slate"] ?? TONES.slate
                          }`}
                        >
                          {finding.badge}
                        </span>
                      )}
                    </span>

                    {finding.body && (
                      <p className="mt-[6px] text-[12px] leading-[1.6] text-mv-slate">
                        {finding.body}
                      </p>
                    )}
                  </span>
                </li>
              ))}
            </ol>

            <p className="border-t border-mv-line bg-[#fafbfa] px-4 py-[12px] text-[11px] leading-[1.6] text-mv-muted">
              <span className="font-bold text-mv-slate">Basis.</span>{" "}
              {state.summary.basis ??
                "Written from the record shown above."}{" "}
              Generated text, not advice — check any figure against the filing
              before relying on it.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** `2026-08-19T12:46:11Z` → `19 Aug 2026, 12:46`. */
function stamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;

  return at.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
