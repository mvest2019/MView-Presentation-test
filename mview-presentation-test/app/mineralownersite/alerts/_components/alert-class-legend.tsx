import { Badge } from "../../_components/ui/badge";
import { gates } from "../../_components/ui/portal-gating";

/**
 * THE DELIVERY-CLASS LEGEND — Professional tier only.
 *
 * v38 · P1-02: the class taxonomy is METHOD, so the LEGEND is Professional while
 * Detailed keeps the per-alert chips and the `why?` without it. The distinction
 * is worth holding on to — a reader who wants to know why one alert reached them
 * asks the row; a reader who wants to know how the notification system is
 * organised is reading the manual, and only the densest tier is the manual.
 *
 * It ends by pointing at the two places the taxonomy is actionable: Settings,
 * where each class × channel is tuned, and the `why?` on any row. A legend that
 * only names five categories teaches a vocabulary with nothing to do with it.
 *
 * Settings is not built, so it is named rather than linked — `portal-nav.ts`'s
 * standing convention for an unbuilt destination.
 */
export function AlertClassLegend() {
  return (
    <p
      className={`mt-2 text-[11px] leading-[1.6] text-mv-muted ${gates(
        "professionalOnly",
      )}`}
    >
      Classes:{" "}
      <Badge tone="estimate" size="xs">
        Urgent
      </Badge>{" "}
      ·{" "}
      <Badge tone="slate" size="xs">
        Important digest
      </Badge>{" "}
      ·{" "}
      <Badge tone="slate" size="xs">
        Educational
      </Badge>{" "}
      ·{" "}
      <Badge tone="mint" size="xs">
        Community
      </Badge>{" "}
      — tune each in Settings · open <em>why?</em> on any alert.
    </p>
  );
}
