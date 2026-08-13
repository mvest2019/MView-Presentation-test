import Image from "next/image";
import Link from "next/link";

import {
  footerColumns,
  footerCompanyLinksBottom,
  footerCompanyLinksTop,
  logo,
} from "./site-nav";

/*
 * Marketing footer — a port of `marketing/src/shell/chunk-124.html` and the
 * `.mk-footer` / `.footgrid` / `.footnote` rules in the prototype stylesheet.
 * The dark surface takes the white-text logo variant.
 *
 * The two disclaimer paragraphs and the footnote line are compliance copy,
 * not filler — they say what Mineral View is not. Do not trim them.
 */

// `hover:underline` is explicit now: the prototype gets it from a global
// `a:hover` rule, which no longer exists.
const footerLink =
  "block py-1 text-[13.5px] text-[#cbd5e1] no-underline hover:text-mv-green hover:underline";

export function SiteFooter() {
  return (
    <footer className="bg-mv-ink pb-[30px] pt-[52px] text-[#cbd5e1]">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-[26px] max-[1024px]:grid-cols-2 max-[767px]:grid-cols-1">
          <div>
            <Image
              src={logo.onDark.src}
              alt="Mineral View"
              width={logo.onDark.width}
              height={logo.onDark.height}
              className="mb-[14px] block h-[30px] w-auto"
            />
            <p className="max-w-[300px] text-[13px] text-[#8a94a6]">
              A clearer view of your minerals — public-record intelligence,
              plain-English briefings, and a community of owners like you.
            </p>
            <p className="mt-[14px] text-xs text-[#5b6472]">
              Mineral View is not a broker and does not buy or sell mineral
              rights. Values shown are estimates — not appraisals. Your private
              data is never sold.
            </p>
          </div>

          {footerColumns.map((column) => (
            <div key={column.heading}>
              <FooterHeading>{column.heading}</FooterHeading>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} className={footerLink}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          <div>
            <FooterHeading>Company</FooterHeading>
            {footerCompanyLinksTop.map((link) => (
              <Link key={link.href} href={link.href} className={footerLink}>
                {link.label}
              </Link>
            ))}

            {/* Support address, replacing help@mineralview.com (Ryan,
                2026-08-13). The "· or chat with support in-app" line that sat
                beside it is gone with it: there is no in-app chat in this build,
                so it pointed at nothing.

                A `mailto:` now, not plain text — it reads the same but is one tap
                on a phone, where a footer address is most likely to be used. */}
            <a
              href="mailto:support@mineralview.com"
              className={`${footerLink} font-semibold`}
            >
              support@mineralview.com
            </a>

            {footerCompanyLinksBottom.map((link) => (
              <Link key={link.href} href={link.href} className={footerLink}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-9 flex flex-wrap justify-between gap-4 border-t border-[#263041] pt-5 text-xs text-[#8a94a6]">
          {/* Year from the clock, not typed in — it was hardcoded to 2026.
              This is a server component, so it resolves during rendering; on the
              statically prerendered routes that means BUILD time, which is
              accurate as long as the site is redeployed at least once a year (any
              deploy re-bakes it). Doing it in the browser instead would mean a
              hydration mismatch on the turn of the year, for no real gain. */}
          <span>© {new Date().getFullYear()} Mineral View, LLC · Texas</span>
          <span>
            Estimates are informational only — not legal, tax, or investment
            advice.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    // `h4` is not in the design's serif heading group, so it keeps the body
    // stack; only the 700 weight came from the global rule.
    <h4 className="mb-3 text-[13px] font-bold uppercase tracking-[.08em] text-white">
      {children}
    </h4>
  );
}
