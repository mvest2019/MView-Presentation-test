/**
 * The outer padding every library page hangs off — Blog, News, Glossary, FAQ,
 * their detail pages, and the skeletons that stand in for them.
 *
 * SHARED RATHER THAN REPEATED because the skeletons have to match the pages they
 * cover. This was the same literal written out in eight places; a page and its
 * skeleton drifting apart by even a few pixels shows up as the whole article
 * jumping the moment the content arrives.
 *
 * BOTTOM PADDING IS 32px, NOT THE 64px THIS CARRIED (Ryan, 2026-08-17:
 * "Remove that space", raised twice — first on FAQ, then on Blog, News and
 * Glossary). Measured on FAQ before the change: 64px of empty band between the
 * last card and the dark footer, all of it this padding, with the last card's own
 * margin already at zero. On a page that ends in a bordered card, or in one small
 * grey line of type, that much clearance reads as the page having run out rather
 * than having finished.
 *
 * Not zero: butted against the footer the last element looks clipped instead of
 * finished. 32px also sits close to the 26px above the breadcrumb, so these pages
 * are roughly evenly inset top and bottom.
 *
 * Privacy and Terms joined on 2026-08-17 via `legal-page.tsx`, so every page that
 * used to carry the old 64px now reads from here and there is nothing left to
 * diverge.
 */
export const pageShellClass = "pb-8 pt-[26px] max-[767px]:pb-6";
