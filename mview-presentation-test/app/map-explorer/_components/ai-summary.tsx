"use client";

import { RefreshCw, Sparkles } from "lucide-react";

import { PERMIT_AI_SUMMARY } from "./well-insights-data";

/*
 * The written read on a permit: a headline, five findings, and the note on
 * where the figures came from.
 *
 * Labelled as generated, and dated, because that is the difference between a
 * summary and a claim — the same reason the completion side badges its own
 * read. The findings are numbered rather than bulleted: they are meant to be
 * gone through in order, and the numbers give the eye somewhere to return to.
 *
 * `PERMIT_AI_SUMMARY` in `well-insights-data.ts` holds the text. Figures are
 * marked `**like this**` and field names `` `like this` ``; both are rendered
 * by `Marked` below, so the data stays plain strings.
 */

const TONES = {
  green: "border-[#bfe3cc] bg-mv-mint text-mv-green-deep",
  blue: "border-[#c7d7f2] bg-[#f3f7fd] text-mv-blue",
  amber: "border-mv-amber/40 bg-mv-amber-bg text-mv-amber",
  red: "border-[#f6c9c6] bg-mv-red-bg text-mv-red",
  slate: "border-mv-line bg-[#f4f6f5] text-mv-slate",
};

export function AiSummary() {
  return (
    <section className="rounded-xl border border-mv-line bg-mv-bg p-3 lg:p-4">
      {/* ---------------- what this is ---------------- */}
      <div className="flex items-center gap-[10px] pb-3">
        <span
          aria-hidden="true"
          className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
        >
          <Sparkles size={15} strokeWidth={2} />
        </span>
        <h2 className="text-[14.5px] font-bold leading-none text-mv-ink">
          AI Summary
        </h2>
        <p className="text-[11.5px] leading-none text-mv-muted">
          {PERMIT_AI_SUMMARY.subtitle}
        </p>
      </div>

      <div className="rounded-xl border border-mv-line bg-white">
        {/* ---------------- which well, and when it was read ------------- */}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3 border-b border-mv-line px-4 py-[14px]">
          <span
            aria-hidden="true"
            className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-lg bg-mv-mint text-mv-green-deep"
          >
            <Sparkles size={16} strokeWidth={2} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold leading-tight text-mv-ink">
              {PERMIT_AI_SUMMARY.title}
            </span>
            <span className="mt-[4px] block text-[11.5px] leading-snug text-mv-muted">
              {PERMIT_AI_SUMMARY.context}
            </span>
          </span>

          <span className="ml-auto text-right">
            {/* Nothing to regenerate against yet: the text below is written by
                hand until a summariser exists to ask. */}
            <button
              type="button"
              disabled
              title="Regenerating needs the summary service"
              className="inline-flex cursor-not-allowed items-center gap-[7px] rounded-lg border border-mv-line px-[12px] py-[7px] text-[12px] font-semibold text-mv-slate opacity-60"
            >
              <RefreshCw size={13} strokeWidth={2} aria-hidden="true" />
              Regenerate
            </button>
            <span className="mt-[6px] block text-[10.5px] leading-none text-mv-muted">
              Generated {PERMIT_AI_SUMMARY.generated}
            </span>
          </span>
        </div>

        {/* ---------------- the headline read ---------------- */}
        <p className="border-b border-mv-line px-4 py-[14px] text-[12.5px] leading-[1.6] text-mv-slate">
          <Marked text={PERMIT_AI_SUMMARY.lead} />
        </p>

        {/* ---------------- the five findings ----------------
            Ruled apart rather than boxed: five cards inside a card is one
            border too many, and the rules already say where each one ends. */}
        <ol className="px-4">
          {PERMIT_AI_SUMMARY.findings.map((finding, index) => (
            <li
              key={finding.title}
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
                    {finding.title}
                  </span>
                  <span
                    className={`rounded border px-[6px] py-[3px] text-[9px] font-extrabold uppercase leading-none tracking-[.07em] ${
                      TONES[finding.tone]
                    }`}
                  >
                    {finding.badge}
                  </span>
                </span>

                <p className="mt-[6px] text-[12px] leading-[1.6] text-mv-slate">
                  <Marked text={finding.body} />
                </p>
              </span>
            </li>
          ))}
        </ol>

        {/* ---------------- where the figures came from ---------------- */}
        <p className="border-t border-mv-line bg-[#fafbfa] px-4 py-[12px] text-[11px] leading-[1.6] text-mv-muted">
          <span className="font-bold text-mv-slate">Basis.</span>{" "}
          <Marked text={PERMIT_AI_SUMMARY.basis} />
        </p>
      </div>
    </section>
  );
}

/**
 * Renders `**figures**` in ink and `` `field names` `` as chips, leaving the
 * rest as it was written.
 *
 * One pass over both markers: splitting twice meant the second pass walked the
 * elements the first had already produced.
 */
function Marked({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-bold text-mv-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded border border-mv-line bg-white px-[5px] py-[1px] font-mono text-[10.5px] text-mv-slate"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}
