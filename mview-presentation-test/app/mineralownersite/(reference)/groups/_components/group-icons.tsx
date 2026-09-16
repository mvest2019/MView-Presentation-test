/**
 * THE ICONS THIS PAGE NEEDS THAT THE PORTAL'S SPRITE DOES NOT CARRY.
 *
 * `Sprite.tsx` holds twenty-one `mvi-*` symbols and this page uses four of them
 * through the normal `<use href="#mvi-...">` route — groups, lock, user, chat.
 * It has no heart, no share, no shield and no bin, because nothing in the
 * portal has ever needed them.
 *
 * THEY ARE DRAWN HERE RATHER THAN ADDED TO THE SPRITE on purpose: the sprite is
 * rendered by the route group's layout and is shared by every page under it, so
 * a page that wants four more glyphs should not widen a file six other pages
 * depend on. If Groups ever ships more surfaces that need them, moving these
 * four into the sprite is a mechanical change and this file goes away.
 *
 * THE FAMILY IS THE SPRITE'S OWN — Feather: a 24x24 box, no fill, 2px round
 * stroke in `currentColor`. They sit beside the `mvi-*` icons without reading
 * as a second icon set, which is the whole reason for matching rather than
 * reaching for a library.
 *
 * EVERY ONE IS `aria-hidden`. Each is rendered beside a real label — "Like",
 * "Comment", "Share" — so announcing the glyph as well would say everything
 * twice.
 */
import type { SVGProps } from "react";

const BASE: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

/** One of the portal sprite's own symbols, at this page's icon size. */
export function SpriteIcon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className ?? "gr-i"} aria-hidden="true" focusable="false">
      <use href={`#${id}`} />
    </svg>
  );
}

/** A public group. */
export function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg {...BASE} className={className ?? "gr-i"}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/** An admin — the one who may invite, remove and delete. */
export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg {...BASE} className={className ?? "gr-i"}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export function HeartIcon({
  filled = false,
  className,
}: {
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg {...BASE} className={className ?? "gr-i"} fill={filled ? "currentColor" : "none"}>
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

export function ShareIcon({ className }: { className?: string }) {
  return (
    <svg {...BASE} className={className ?? "gr-i"}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  );
}

export function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg {...BASE} className={className ?? "gr-i"}>
      <polyline points="9 17 4 12 9 7" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

export function TrashIcon({ className }: { className?: string }) {
  return (
    <svg {...BASE} className={className ?? "gr-i"}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function PlusIcon({ className }: { className?: string }) {
  return (
    <svg {...BASE} className={className ?? "gr-i"}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg {...BASE} className={className ?? "gr-i"}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
