import Link from "next/link";

import { ExplainPanel } from "../../_components/ui/explain-panel";
import type { AlertExplainer as AlertExplainerContent } from "../_lib/alert-types";

/**
 * "WHAT THIS ALERT MEANS" — v34's drawer, as the row's own expander.
 *
 * ── WHY AN EXPANDER AND NOT THE DESIGN'S SIDE DRAWER ──
 *
 * The drawer's stated purpose is that the owner STAYS where they are:
 * "Explanation is the default; navigation is the choice." An inline `<details>`
 * satisfies that better than the drawer does, not worse — the explanation opens
 * directly under the row it explains, with the alert still on screen, and
 * nothing overlays the list.
 *
 * What the drawer additionally bought was room for a long essay without pushing
 * the page around. That is a real cost here, and it is the reason these stay
 * CLOSED by default and open one at a time by the reader's choice rather than
 * being rendered inline as prose.
 *
 * Everything `portal-ui.md` says about `<details>` applies with force to this
 * one: nine explainers that print, that the browser's own find-in-page can
 * search inside, and that work with JavaScript off — which the drawer, being
 * `mvCtxOpen()`, did not.
 *
 * ── THE FOUR HEADINGS ARE FIXED AND ORDERED ──
 *
 * What this is · What it means for you · The evidence · What to do next. The same
 * four, in the same order, on all nine — that repetition is what lets a reader
 * learn the shape once and then skim straight to the heading they want. Adding a
 * fifth heading to one alert would cost more than the heading is worth.
 *
 * ── THE DOOR COMES LAST, AND SAYS IT IS OPTIONAL ──
 *
 * "the explanation above is the whole story; navigating is your choice" is ported
 * verbatim. It is the sentence that stops the panel reading as a teaser for the
 * real page.
 */
export function AlertExplainer({
  explainer,
}: {
  explainer: AlertExplainerContent;
}) {
  return (
    <ExplainPanel
      className="mt-2"
      summary={<>What this alert means — {explainer.title}</>}
    >
      <p className="mb-2 text-[11px] text-mv-muted">{explainer.subtitle}</p>

      <Heading>What this is</Heading>
      <p className="mb-3">{explainer.what}</p>

      <Heading>What it means for you</Heading>
      <p className="mb-3">{explainer.means}</p>

      <Heading>The evidence</Heading>
      <ul className="mb-3 flex list-disc flex-col gap-[3px] pl-[18px]">
        {explainer.evidence}
      </ul>

      <Heading>What to do next</Heading>
      <p>{explainer.next}</p>

      {explainer.openHref && (
        <p className="mt-3 border-t border-mv-line pt-2.5">
          Want to go deeper?{" "}
          <Link href={explainer.openHref.href}>
            <strong>{explainer.openHref.label} →</strong>
          </Link>{" "}
          <span className="text-[11px] text-mv-muted">
            optional — the explanation above is the whole story; navigating is
            your choice.
          </span>
        </p>
      )}

      {explainer.foot && (
        <p className="mt-2 text-[11px] text-mv-muted">{explainer.foot}</p>
      )}
    </ExplainPanel>
  );
}

/**
 * The design's `<h4>` inside the drawer: deep green, tight to the paragraph
 * under it. Local because nothing outside this panel uses it — four call sites,
 * all in the component below the definition.
 */
function Heading({ children }: { children: string }) {
  return (
    <h4 className="mb-1.5 text-[12px] font-bold text-mv-green-deep">
      {children}
    </h4>
  );
}
