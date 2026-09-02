import {
  Activity,
  ArrowLeft,
  Bell,
  CirclePlus,
  CreditCard,
  DollarSign,
  FileText,
  Flag,
  House,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Settings,
  ShieldCheck,
  TrendingUp,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { PortalIconName } from "../_lib/portal-nav";

/**
 * The portal's icon set.
 *
 * WHY LUCIDE AND NOT THE REFERENCE'S INLINE SVG SPRITE. The reference build
 * ships an SVG `<symbol>` sprite it hand-authored for one reason, recorded in
 * its own comment (v36 · #70): the emoji and glyph characters it used before
 * (⌂ ⚑ ▤ ◈ ⚡) "drew differently per platform", so it replaced them with real
 * vectors that "render identically on every device".
 *
 * THOSE VECTORS ARE FEATHER ICONS. Every path in that sprite is Feather's, and
 * lucide — already a dependency of this app, and used by the marketing header —
 * is Feather's maintained successor with the same geometry. So the mapping below
 * satisfies the requirement the sprite existed to satisfy, without shipping a
 * second icon system or an inline sprite that has to be kept in the document.
 * The reference's `mvi-*` ids are kept as the key names so the correspondence
 * stays auditable at a glance.
 *
 * Text labels stay literal beside every icon, exactly as the reference insists —
 * no icon in this portal is ever the only thing naming a destination.
 */
const ICONS: Record<PortalIconName, LucideIcon> = {
  // mvi-home — Feather `home`
  home: House,
  // mvi-bell — Feather `bell`
  bell: Bell,
  // mvi-leases — Feather `file-text`
  leases: FileText,
  // mvi-map — Feather `map-pin`
  map: MapPin,
  // mvi-activity — Feather `activity`
  activity: Activity,
  // mvi-mail — Feather `mail`
  mail: Mail,
  // mvi-user — Feather `user`
  user: User,
  // mvi-audit — Feather `shield` with a check, i.e. `shield-check`
  audit: ShieldCheck,
  // mvi-groups — Feather `users`
  groups: Users,
  // mvi-invite — Feather `user-plus`
  invite: UserPlus,
  // mvi-settings — Feather `settings`
  settings: Settings,
  // mvi-billing — Feather `credit-card`
  billing: CreditCard,
  // mvi-claim — Feather `plus-circle`
  claim: CirclePlus,
  // mvi-back — Feather `arrow-left`
  back: ArrowLeft,
  // mvi-trend — Feather `trending-up`
  trend: TrendingUp,
  // mvi-lock — Feather `lock`
  lock: Lock,
  /* The three the Alerts inbox adds. Each one's sprite `<symbol>` in the
     reference is the Feather path named beside it, checked path-by-path against
     the sprite in `owner/src/shell/` rather than picked by name. */
  // mvi-flag — Feather `flag`
  flag: Flag,
  // mvi-price — Feather `dollar-sign`
  price: DollarSign,
  // mvi-chat — Feather `message-square`
  chat: MessageSquare,
};

/**
 * `.mvi` carries the stroke, fill and cap geometry from `portal.css`, and the
 * size comes from whichever box the icon sits in (`.nav-ico`, `.t-ico`, the
 * account menu). That is the reference's arrangement, and it keeps every icon
 * in the portal at one weight without each call site restating it.
 *
 * Always `aria-hidden`: the label next to it is the accessible name, so a
 * screen reader that also announced the icon would say the row twice.
 */
export function PortalIcon({
  name,
  className = "mvi",
}: {
  name: PortalIconName;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
