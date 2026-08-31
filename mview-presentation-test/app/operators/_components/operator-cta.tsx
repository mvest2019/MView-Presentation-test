import Link from "next/link";
import { Unlock } from "lucide-react";

import { Band, Panel, Row } from "@/app/_components/cta-band";
import { inlineLink } from "@/app/_components/typography";

/**
 * The Operator Directory's registration ask.
 *
 * THE SAME BAND THE MAP FEATURE GUIDE USES — literally, not a copy: `Band`,
 * `Panel` and `Row` moved to `app/_components/cta-band.tsx` so the two surfaces
 * cannot drift apart. Same shell, same eyebrow chip, same primary/secondary
 * pair, same evidence panel on the right.
 *
 * A SERVER COMPONENT, and worth keeping that way. It has no state and no
 * handlers, so the whole band — including the panel of rows — costs this page
 * zero bytes of client JavaScript. It renders inside the existing
 * `max-w-[1200px]` column, so it adds no layout work either.
 *
 * WHAT THE COPY IS ALLOWED TO SAY. Only what the gate actually holds back: the
 * search endpoint returns the first three rows of every page and withholds the
 * rest while a quick filter is on. Browsing, searching, filtering by county,
 * status or play type, paging and every operator profile are free and stay free
 * — the page's own heading promises exactly that, and a band that implied
 * otherwise would be talking a visitor out of something they already have.
 *
 * WHY PRICING IS A FOOTNOTE AND NOT THE SECOND BUTTON. Sending free-account
 * intent into a plan comparison is the single most expensive defect on the
 * current site — visitors who reached the pricing page converted, but almost
 * nobody reached it, and "Register For Free" pointing at `/pricing` is why the
 * ask reads as a paywall. So the primary is registration, the secondary is sign
 * in, and plans get one quiet line underneath for the person who came looking
 * for them.
 *
 * `?from=operators` is an enumerated in-product source value, carried so a
 * registration can later be attributed to this page rather than guessed at. It
 * is deliberately not `unlock=` — that companion parameter belongs to the claim
 * flow's soft gate and means something specific there.
 */
export function OperatorRegisterCta() {
  return (
    <div className="mt-6">
      <Band
        tone="deep"
        icon={Unlock}
        eyebrow="Free account"
        title="Open the rest of the ranking — free"
        body="Search the directory, filter by county, status or play, page through all 24,744 operators and open any profile without an account. What a free account adds is the numbers: filed oil and gas volumes, lease and county counts, and the full ranking behind the quick filters."
        primary={{
          href: "/register?from=operators",
          label: "Register for free",
        }}
        secondary={{ href: "/login", label: "Sign in" }}
      >
        <Panel title="What a free account opens">
          <Row
            label="The full quick-filter ranking"
            note="not just the top three of each page"
          />
          <Row
            label="Filed oil and gas volumes"
            note="on every operator in the table"
          />
          <Row label="Lease and county counts" />
          <Row label="A link through to each operator's profile" />
          <Row label="Your own claimed owner record" note="and its activity" />
        </Panel>
      </Band>

      {/* One line, under the band rather than inside it — see the note above on
          why plans are not the second button. */}
      <p className="mt-3 text-center text-[12.5px] text-mv-muted">
        Comparing plans instead?{" "}
        <Link
          href="/pricing?from=operators"
          className={`${inlineLink} font-semibold`}
        >
          See pricing
        </Link>{" "}
        — most of what a mineral owner needs is in the free account.
      </p>
    </div>
  );
}
