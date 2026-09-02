import { Badge } from "../../_components/ui/badge";
import type { AlertDeliveryClass } from "../_lib/alert-types";

/**
 * WHICH RAIL AN ALERT TRAVELLED ON — v30 · P2's delivery taxonomy.
 *
 * ── THE TAXONOMY EXISTS SO URGENT VALUE IS NEVER BURIED IN DIGEST NOISE ──
 *
 * Every alert is one of five classes, and the class decides what the reader can
 * switch off without switching off the thing they actually care about:
 *
 *   Urgent               needs a look now; reaches every enabled channel.
 *   Important digest     rolls up weekly if you would rather not hear each one.
 *   Educational          context. Never asks anything, ever.
 *   Community            one group's activity; mutable per group.
 *   Account / record      fires on a records refresh — roughly once a year.
 *
 * Without it the only honest preference is "all alerts" or "no alerts", and an
 * owner who mutes because of permit noise loses the payment check too. That is
 * the failure this taxonomy prevents, and it is why the class is on the row and
 * not only in Settings.
 *
 * ── IT IS PROFESSIONAL-TIER, AND THAT IS DELIBERATE ──
 *
 * v38 · P1-02 files the taxonomy as METHOD. Detailed keeps the chips and the
 * `why?`; only Professional gets the legend that names all five. An Essentials
 * reader is told what happened, not how the notification system is organised.
 * The `tier-p` gate lives on the caller — see `alert-row.tsx` — because it wraps
 * the chip and the `why?` together as one line.
 *
 * ── COLOUR FOLLOWS `Badge`'s MEANING, NOT THE CLASS'S NAME ──
 *
 * Urgent takes `estimate` (amber) because amber is this portal's "read this
 * carefully" tone; Community takes `mint`; the middle three take `slate`. That
 * is the reference's own mapping, and it deliberately does NOT give five classes
 * five colours — three tones for five classes keeps the amber meaning something.
 */

const LABELS: Record<AlertDeliveryClass, string> = {
  urgent: "Urgent",
  digest: "Important digest",
  educational: "Educational",
  community: "Community",
  record: "Account / record update",
};

const TONES = {
  urgent: "estimate",
  digest: "slate",
  educational: "slate",
  community: "mint",
  record: "slate",
} as const;

export function DeliveryClassBadge({
  deliveryClass,
}: {
  deliveryClass: AlertDeliveryClass;
}) {
  return (
    <Badge tone={TONES[deliveryClass]} size="xs">
      {LABELS[deliveryClass]}
    </Badge>
  );
}
