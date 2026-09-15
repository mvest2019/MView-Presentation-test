"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import { useState } from "react";

import { leaseValueBuiltExplainer } from "../_lib/explainers-lease";
import type { LeaseReport } from "../_lib/lease-report";
import { ExplainerDrawer, type Explainer } from "./explainer-drawer";

/**
 * THE DARK BAND'S OWN "HOW IT IS BUILT" CONTROL.
 *
 * ── IT USED TO BE AN ANCHOR AND THAT WAS THE WRONG ANSWER ──
 *
 * It jumped to `#twelve-months`, a card most of a page further down that shows
 * one year of workings. A reader who asks "how is this built" at the moment
 * they read the figure wants the answer beside the figure, not their scroll
 * position thrown somewhere else — and the card it landed on explains the next
 * twelve months, not the valuation. The panel is the answer that was missing.
 *
 * ── IT IS ITS OWN COMPONENT BECAUSE THE BAND IS A SERVER COMPONENT ──
 *
 * `ReportBand` renders on the server and has no business becoming a client
 * component to hold one boolean. This is the smallest possible island: the
 * button, the state behind it, and the drawer. The band keeps its own
 * rendering, and nothing else on it moves to the client.
 */
export function HowItIsBuilt({ report }: { report: LeaseReport }) {
  const [explainer, setExplainer] = useState<Explainer | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setExplainer(leaseValueBuiltExplainer(report))}
        className="inline-flex flex-none cursor-pointer items-center gap-2 rounded-full border border-white/25 px-3.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <ExternalLink aria-hidden="true" className="h-[13px] w-[13px]" />
        How it is built
        <ArrowRight aria-hidden="true" className="h-[13px] w-[13px]" />
      </button>

      <ExplainerDrawer
        explainer={explainer}
        onClose={() => setExplainer(null)}
      />
    </>
  );
}
