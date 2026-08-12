import Link from "next/link";

/**
 * Home › Current-page trail.
 *
 * EXTRACTED, NOT NEW — this is the markup the FAQ and Contact pages already
 * carried, character for character. It was about to be copied a third, fourth
 * and fifth time onto Blog, News and Glossary, so it is a component now and
 * those two use it too.
 *
 * `aria-current="page"` on the last crumb is what tells a screen reader which
 * one is the page you are on; the chevrons are `aria-hidden` because they are
 * punctuation, not content.
 */
export function Breadcrumb({
  /** The trail after Home. One entry for a top-level page, more for nested. */
  trail,
}: {
  trail: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-[13px]">
      <Link
        href="/"
        className="font-semibold text-mv-green-deep no-underline hover:underline"
      >
        Home
      </Link>
      {trail.map((crumb, i) => (
        <span key={crumb.label}>
          <span aria-hidden="true" className="mx-2 text-mv-muted">
            ›
          </span>
          {crumb.href && i < trail.length - 1 ? (
            <Link
              href={crumb.href}
              className="font-semibold text-mv-green-deep no-underline hover:underline"
            >
              {crumb.label}
            </Link>
          ) : (
            <span aria-current="page" className="font-bold text-mv-ink">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
