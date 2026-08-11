import Link from "next/link";

/**
 * Marketing breadcrumb trail — the prototype's `.mv-crumbs`.
 *
 * The first breadcrumb on the site, so it is written generically rather than
 * for one page: pass the trail, leave `href` off the last item. Kept as a
 * server component; there is no interactive state here.
 *
 * The `›` separators are `aria-hidden` spans on each item after the first, so
 * they are decoration rather than text announced between every link. The list
 * itself is a real `<ol>` inside a labelled `<nav>`, and the leaf carries
 * `aria-current="page"`.
 */

export type Crumb = {
  label: string;
  /** Omit on the final item — the current page is not a link. */
  href?: string;
};

export function Breadcrumbs({
  items,
  className = "",
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      {/* Each item is its own flex row so the separator and the label always sit
          side by side. The trail wraps between items on narrow screens; the
          label wraps by word rather than truncating, because an ellipsis on a
          two-word page name reads worse than a second line. */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-[1.5] text-mv-muted">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className="flex min-w-0 items-center gap-2"
          >
            {/* A real element rather than a CSS `::before`: some screen readers
                announce generated content, and this stays reliably hidden. */}
            {index > 0 && (
              <span aria-hidden="true" className="shrink-0">
                ›
              </span>
            )}

            {item.href ? (
              <Link
                href={item.href}
                className="text-mv-muted no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="min-w-0">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
