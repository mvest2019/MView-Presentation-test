import { PortalIcon } from "../../_components/portal-icon";
import type { PortalIconName } from "../../_lib/portal-nav";
import type { AlertIconTone } from "../_lib/alert-types";

/**
 * THE 34px TILE AT THE START OF A ROW — `.al-ico`, `.al-ico.gold`, `.al-ico.blue`.
 *
 * ── THREE TINTS, AND THE THIRD ONE IS DOING REAL WORK ──
 *
 *   mint   the ordinary case — activity, a posting, a neighbour, a briefing
 *   gold   money and records: the payment check, and the annual owner-record
 *          refresh. Both are about the reader's own money or identity.
 *   blue   a MODEL output. The design keeps model indicators visually apart from
 *          measured facts everywhere it shows one, because "the spacing indicator
 *          moved" and "27,120 mcf was filed" are different kinds of claim and
 *          should not read as the same kind of news.
 *
 * ── THE LABEL IS NOT DECORATION ──
 *
 * `label` becomes the tile's `title`, exactly as the reference does it
 * ("Payment check", "Nearby activity", "Model indicator"). The icon itself stays
 * `aria-hidden` — the headline beside it is the accessible name, and an icon that
 * announced itself would make a screen reader read every row twice.
 */

const TONES: Record<AlertIconTone, string> = {
  mint: "bg-mv-mint text-mv-green-ink",
  gold: "bg-mv-portal-alert-gold-bg text-mv-portal-alert-gold-ink",
  blue: "bg-mv-portal-alert-blue-bg text-mv-blue",
};

export function AlertIconBox({
  icon,
  tone,
  label,
}: {
  icon: PortalIconName;
  tone: AlertIconTone;
  label: string;
}) {
  return (
    <span
      title={label}
      className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] ${TONES[tone]}`}
    >
      <PortalIcon name={icon} className="mvi h-4 w-4" />
    </span>
  );
}
