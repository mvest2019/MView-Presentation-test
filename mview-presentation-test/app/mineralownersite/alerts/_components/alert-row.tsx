import { Badge } from "../../_components/ui/badge";
import { gates } from "../../_components/ui/portal-gating";
import type { AlertRecord } from "../_lib/alert-types";
import { AlertActions } from "./alert-actions";
import { AlertIconBox } from "./alert-icon-box";
import { AlertSeverityTag } from "./alert-severity-tag";
import { AlertWhy } from "./alert-why";
import { DeliveryClassBadge } from "./delivery-class-badge";

/**
 * ONE ALERT — `.al-row`, and the unit the whole page is made of.
 *
 * ── THE GREEN LEFT RULE IS "UNREAD", AND IT SWITCHES OFF FROM ABOVE ──
 *
 * `.al-row.unreadal` is a 4px green edge and a faint wash. "Mark all read"
 * removes it from every row at once, and in the reference that is a loop that
 * strips a class from nine elements.
 *
 * Here the row is rendered ON THE SERVER — all nine of them, explainers and all —
 * so it cannot re-render when a button in the page header is pressed. Instead the
 * unread styling is written as a rule that a parent can switch off:
 * `group-data-[all-read=true]/inbox:` reverts the edge and the wash. One data
 * attribute on the list turns nine rows read, no row re-renders, and the nine
 * explainers never enter the client bundle.
 *
 * That is the same trick `portal.css` uses for the density tiers, applied one
 * level down — and it is why `AlertInbox` can stay a thin client shell around
 * server-rendered content.
 *
 * ── THE ROW IS THE TRIGGER, AND IT LIVES ONE LEVEL UP ──
 *
 * Clicking anywhere on a row opens its explainer in the right-side drawer, which
 * is the reference's own behaviour and the reason the "expand →" pill reads as a
 * control rather than a label. The click handling is in `AlertRowTrigger`
 * (`alert-drawer.tsx`), which wraps this row in the inbox — so this component
 * stays a SERVER component and the nine explainer bodies stay out of the client
 * bundle.
 *
 * The pill below is therefore styling, not a second control: the row it sits in
 * is the button. That is `V40-AL-EXPAND` — the affordance "reads as a real
 * control, not a whisper" — and putting a real `<button>` inside a
 * `role="button"` would give the row two controls where the design has one.
 *
 * ── WHAT EACH DENSITY SEES ──
 *
 * The delivery-class chip and the `why?` gloss are `tier-p` — v38 · P1-02 files
 * the taxonomy as method. The headline, the sentence, the date and the buttons
 * are ungated: every tier gets the alert itself.
 */
export function AlertRow({ alert }: { alert: AlertRecord }) {
  return (
    <div
      data-alert-category={alert.category}
      /* `.al-row[role="button"]:hover` sets `border-color: var(--green)` and
         re-states the shadow it already has — so the hover is the green outline
         and nothing else, which is what the stylesheet actually does rather than
         what a lift would look like. */
      className={`group/row flex items-start gap-3 rounded-xl border border-mv-line bg-mv-card p-[13px_15px] shadow-mv transition-colors ${
        alert.explainer ? "hover:border-mv-green" : ""
      } ${
        alert.unread
          ? "border-l-4 border-l-mv-green bg-[linear-gradient(165deg,var(--color-mv-card),var(--color-mv-portal-alert-tint))] group-data-[all-read=true]/inbox:border-l group-data-[all-read=true]/inbox:border-l-mv-line group-data-[all-read=true]/inbox:bg-mv-card group-data-[all-read=true]/inbox:bg-none"
          : ""
      }`}
    >
      <AlertIconBox
        icon={alert.icon}
        tone={alert.iconTone}
        label={alert.iconLabel}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <strong className="text-[13px] leading-[1.4]">
            <AlertSeverityTag severity={alert.severity} />
            {alert.headline}
          </strong>

          {/*
            THE BUILD NOTE IS UNGATED; THE TAXONOMY IS PROFESSIONAL-ONLY.

            The reference wraps a row's chips and its `why?` in one `tier-p`
            span — except on the permit-trend row, where the same span is
            ungated. That row is the one carrying a "Trend data not available
            yet" chip, and the inconsistency reads as a decision rather than a
            slip: an honesty label saying the data behind a promise is not there
            yet must not disappear when the reader picks a calmer density. The
            reader who most needs telling is the one reading the least.

            So the two are separated here rather than copied with its exception:
            the blue build chip shows in every tier, and the delivery class plus
            `why?` stay Professional (v38 · P1-02 — the taxonomy is method).
          */}
          {alert.buildNote && (
            <Badge tone="blue" size="xs">
              {alert.buildNote}
            </Badge>
          )}

          <span
            className={`flex flex-wrap items-center gap-1.5 text-[11px] ${gates(
              "professionalOnly",
            )}`}
          >
            <DeliveryClassBadge deliveryClass={alert.deliveryClass} />
            <AlertWhy>{alert.why}</AlertWhy>
          </span>

          {/* THE DATE IS ALWAYS VISIBLE, in every tier. Every alert carries both
              when the event happened and how it reached the reader, and an
              undated alert is one the reader cannot place. */}
          <span className="text-[11px] text-mv-muted tabular-nums">
            {alert.meta}
          </span>
        </div>

        <p className="mt-[3px] mb-1.5 text-[11px] leading-[1.5] text-mv-muted">
          {alert.detail}
          {alert.explainer && (
            <>
              {" "}
              {/* `group-hover` fills it green, which is `V40-AL-EXPAND`'s own
                  hover rule — the row is the hover target, so the pill has to
                  read off an ancestor rather than itself. */}
              <span className="inline-block rounded-full border border-mv-green bg-mv-portal-expand-bg px-2.5 py-[2px] text-[11px] font-extrabold whitespace-nowrap text-mv-green-deep group-hover/row:bg-mv-green group-hover/row:text-white">
                expand →
              </span>
            </>
          )}
        </p>

        <AlertActions actions={alert.actions} />
      </div>
    </div>
  );
}
