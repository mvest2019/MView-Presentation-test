import {
  CalendarDays,
  Droplet,
  Eye,
  FileText,
  LayoutGrid,
  Link2,
  Map,
  ReceiptText,
  TrendingUp,
  Users,
} from "lucide-react";

import type { DoneIcon } from "../_lib/claim-done";

/**
 * The completion screen's glyphs, mapped from the string keys the `.ts` data
 * modules carry. One map rather than three, because the same key can appear in
 * more than one list — `groups` labels both a summary row and the private group
 * card, and they should not be able to drift to different pictures.
 */
export const DONE_ICONS: Record<DoneIcon, typeof FileText> = {
  record: FileText,
  leases: Link2,
  visible: Eye,
  groups: Users,
  briefing: CalendarDays,
  dashboard: LayoutGrid,
  stub: ReceiptText,
  audit: TrendingUp,
  county: Map,
  operator: Droplet,
  play: FileText,
};

/**
 * The tinted square every one of those glyphs sits in. Extracted because it
 * appears eleven times across three components on this screen, and a tile that
 * is 28px in one of them and 30px in another is the sort of thing nobody spots
 * and everybody feels.
 */
export function DoneIconTile({
  name,
  tone = "wash",
}: {
  name: DoneIcon;
  /** `mint` marks the things that are already true; `wash` the neutral rest. */
  tone?: "wash" | "mint";
}) {
  const Icon = DONE_ICONS[name];
  return (
    <span
      className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] ${
        tone === "mint"
          ? "bg-mv-mint text-mv-green-deep"
          : "bg-mv-portal-wash text-mv-slate"
      }`}
    >
      <Icon aria-hidden="true" className="h-[15px] w-[15px]" strokeWidth={2} />
    </span>
  );
}
