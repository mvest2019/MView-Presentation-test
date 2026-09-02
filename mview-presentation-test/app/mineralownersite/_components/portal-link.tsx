import Link from "next/link";

import { UNBUILT_TITLE, isBuiltRoute } from "../_lib/portal-routes";

/**
 * A cross-link that degrades to plain text when its module is not built.
 *
 * USE THIS FOR EVERY IN-PORTAL CROSS-LINK IN BODY COPY. The design's writing
 * points at other screens constantly — "see them on the map →", "open the
 * lease report →", "run your included Lease Audit" — and most of those screens
 * do not exist yet. A plain `<Link>` to an unbuilt module ships a page whose
 * links 404, which teaches the reader the product is broken rather than
 * unfinished.
 *
 * WHAT THE INERT FORM IS, AND WHAT IT IS NOT. It keeps the words, drops the
 * arrow's promise, and carries a title saying the module is not open yet. It
 * is NOT styled as locked, blurred or premium: `portal-nav.ts` is explicit that
 * "not built" and "not for your plan" must never look the same, because one is
 * a temporary build fact and the other is the product's funnel.
 *
 * THE SIDEBAR ALREADY DOES THIS with `href: undefined`; this is the same rule
 * for prose. When a module ships, one line in `portal-routes.ts` turns every
 * mention of it across the portal back into a working link.
 */
export function PortalLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  if (isBuiltRoute(href)) {
    return (
      <Link href={href} className={className} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <span
      className={`mv-unbuilt${className ? ` ${className}` : ""}`}
      style={style}
      title={UNBUILT_TITLE}
    >
      {children}
    </span>
  );
}
