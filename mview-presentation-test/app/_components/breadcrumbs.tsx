import Link from "next/link";

/**
 * Marketing breadcrumb trail — the prototype's `.mv-crumbs`.
 *
 * The first breadcrumb on the site, so it is written generically rather than
 * for one page: pass the trail, leave `href` off the last item. Kept as a
 * server component; there is no interactive state here.
 *
 * The `›` separators are CSS `::before` content on each item after the first,
 * so they are decoration rather than text a screen reader announces between
 * every link. The list itself is a real `<ol>` inside a labelled `<nav>`, and
 * the leaf carries `aria-current="page"`.
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
      {/* Wraps rather than overflows on narrow screens; `min-w-0` lets the
          leaf truncate instead of pushing the page sideways. */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mv-muted">
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className={
              index === 0
                ? "min-w-0"
                : "min-w-0 before:mr-2 before:text-mv-muted before:content-['›']"
            }
          >
            {item.href ? (
              <Link
                href={item.href}
                className="text-mv-muted no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="block truncate">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
