import { PortalButton } from "../../_components/ui/button";
import { PagePurpose } from "../../_components/ui/page-purpose";
import { MarkAllReadButton } from "./mark-all-read-button";

/**
 * THE PAGE HEAD — the title, the subtitle that states the product promise, and
 * the two inbox-wide controls.
 *
 * ── THE SUBTITLE IS A PROMISE, NOT A DESCRIPTION ──
 *
 * "Everything that changed on your record — each alert links to the exact
 * screen." The second half is the one the page has to keep, and it is why every
 * row below ends in a button. It is quoted verbatim for that reason.
 *
 * ── TWO CONTROLS, AND ONLY ONE OF THEM EXISTS ──
 *
 * "Mark all read" is real. "Alert preferences" points at Settings, which is not
 * built — so it renders as a labelled, inert affordance rather than a link into a
 * 404, which is `portal-nav.ts`'s convention for the whole portal.
 *
 * It is NOT a `PrototypeButton` here, and the difference from the row buttons is
 * deliberate. A prototype button acknowledges a click because a reviewer needs to
 * judge that control at its real weight in its real place. This one is a
 * navigation affordance in the page's chrome, which is exactly the case the
 * greyed-out convention was established for.
 */
export function AlertsHeader() {
  return (
    <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">Alerts</h2>
        <p className="text-[13px] text-mv-muted">
          Everything that changed on your record — each alert links to the exact
          screen
        </p>
        <div className="mt-2">
          <PagePurpose routeKey="app-alerts">
            everything that changed on your record since your last visit, with
            the one thing that asks something of you at the top — and a link from
            each alert straight to the screen it is about.
          </PagePurpose>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <MarkAllReadButton />
        <PortalButton
          size="sm"
          disabled
          title="Alert preferences — per class and per channel. Not open yet."
        >
          Alert preferences — soon
        </PortalButton>
      </div>
    </div>
  );
}
