import Link from "next/link";

import { PortalButtonLink } from "../../_components/ui/button";
import { PrototypeButton } from "../../_components/ui/prototype-button";
import type { AlertExplainer as AlertExplainerContent } from "../_lib/alert-types";

/**
 * THE BODY OF ONE EXPLAINER DRAWER — `mvAxHtml()`, as JSX.
 *
 * ── THE FOUR HEADINGS ARE FIXED AND ORDERED ──
 *
 * What this is · What it means for you · The evidence · What to do next. The
 * same four, in the same order, on all nine — that repetition is what lets a
 * reader learn the shape once and then skim straight to the heading they want.
 * `mvAxHtml` is a template for exactly this reason, and adding a fifth heading
 * to one alert would cost more than the heading is worth.
 *
 * ── THE DOOR COMES LAST, AND SAYS IT IS OPTIONAL ──
 *
 * "optional — the explanation above is the whole story; navigating is your
 * choice" is ported verbatim. It is the sentence that stops the panel reading as
 * a teaser for the real page, and it is the reason the drawer exists rather than
 * the row simply linking somewhere.
 *
 * ── `deeper` IS THE DRAWER'S OWN BUTTON ROW ──
 *
 * Five explainers end with a control that opened a SECOND drawer in the
 * reference — the permit table, the gas chart, the masked names, the trend view,
 * a private message. None of those panels exists in this build, so each renders
 * through `PrototypeButton`: a real, enabled control at its real weight that
 * says plainly what is missing when pressed. That is the portal's standing
 * convention (see `prototype-button.tsx`), and it keeps the drawer's layout
 * honest — these buttons are part of how the panel reads, and dropping them
 * changed it.
 */
export function AlertExplainerBody({
  explainer,
}: {
  explainer: AlertExplainerContent;
}) {
  return (
    <div className="text-[13px] leading-[1.55] text-mv-ink">
      <Heading>What this is</Heading>
      <p className="mb-3">{explainer.what}</p>

      <Heading>What it means for you</Heading>
      <p className="mb-3">{explainer.means}</p>

      <Heading>The evidence</Heading>
      <ul className="mb-3 flex list-disc flex-col gap-[3px] pl-[18px]">
        {explainer.evidence}
      </ul>

      {explainer.deeper && (
        <div className="mt-2 mb-3 flex flex-wrap gap-2">
          {explainer.deeper.map((panel) => (
            <PrototypeButton
              key={panel.label}
              size="sm"
              acknowledgement={`${panel.label} — opens here ✓ (prototype)`}
            >
              {panel.label}
            </PrototypeButton>
          ))}
        </div>
      )}

      <Heading>What to do next</Heading>
      <p>{explainer.next}</p>

      {explainer.actions && (
        <div className="mt-2 flex flex-wrap gap-2">
          {explainer.actions.map((action) =>
            action.href ? (
              <PortalButtonLink
                key={action.label}
                size="sm"
                variant={action.variant ?? "ghost"}
                href={action.href}
              >
                {action.label}
              </PortalButtonLink>
            ) : (
              <PrototypeButton
                key={action.label}
                size="sm"
                variant={action.variant ?? "ghost"}
                acknowledgement={
                  action.dismissal ??
                  action.acknowledgement ??
                  `${action.label} ✓ (prototype)`
                }
              >
                {action.label}
              </PrototypeButton>
            ),
          )}
        </div>
      )}

      {explainer.openHref && (
        <p className="mt-3 border-t border-mv-line pt-2.5">
          Want to go deeper?{" "}
          <Link
            href={explainer.openHref.href}
            className="font-bold text-mv-green-deep"
          >
            {explainer.openHref.label} →
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
    </div>
  );
}

/**
 * The design's `<h4>` inside the drawer: deep green, tight to the paragraph
 * under it. Local because nothing outside this panel uses it.
 */
function Heading({ children }: { children: string }) {
  return (
    <h4 className="mb-1.5 text-[14px] font-bold text-mv-green-deep">
      {children}
    </h4>
  );
}
