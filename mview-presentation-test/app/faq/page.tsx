import type { Metadata } from "next";

import { headingBase } from "../_components/typography";
import { ResourceTabs } from "../blogs/_components/resource-tabs";
import { FaqExplorer } from "./_components/faq-explorer";
import { Breadcrumb } from "../_components/breadcrumb";

/**
 * FAQ — the prototype's `route:faq`. Heading + lede, then the interactive
 * explorer (search, "Most asked", 6 category cards, 85 verbatim Q&As).
 */

export const metadata: Metadata = {
  title: "FAQ — Fair questions, straight answers | Mineral View",
  description:
    "What Mineral View is, what it isn't, and how your data is handled. Free to read — no account required.",
};

export default function FaqPage() {
  return (
    /* LESS BOTTOM PADDING THAN ITS SIBLING LIBRARY PAGES, deliberately (Ryan,
        2026-08-17: "Remove that space").

        Blog, News and Glossary all carry `pb-16` and end on a small grey line of
        type — a count, a "prefer to watch or listen?" link — so the 64px below it
        reads as breathing room. FAQ ends on a bordered white card against the
        dark footer, and the same 64px read as an empty band instead: measured at
        exactly 64px, all of it this padding, with the last card's own margin
        already zeroed by `last:mb-0`.

        32px, not 0: butted straight against the footer the last card looks
        clipped rather than finished. It also pairs with the 26px above the
        breadcrumb, so the page is close to evenly inset top and bottom. */
    <div className="pb-8 pt-[26px] max-[767px]:pb-6">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Breadcrumb trail={[{ label: "FAQ" }]} />

        <div>
          <h2
            className={`${headingBase} my-2 text-[clamp(26px,3vw,34px)] leading-[1.16]`}
          >
            Fair questions, straight answers
          </h2>
          {/* 760px, not the 620 the other library pages use. Their ledes are
              short enough to fit 620 on one line; this one measures 736px and
              was wrapping to two. The wider cap is what keeps all four looking
              alike — matching the number would not. Still wraps below ~790px
              wide, which is correct. */}
          <p className="m-0 max-w-[760px] text-mv-muted">
            What Mineral View is, what it isn&apos;t, and how your data is
            handled. Free to read — no account required.
          </p>
        </div>

        {/* Same row, same place as Blog, News and Glossary — directly under the
            lede — so the four library pages read as one set. FAQ is already an
            entry in it, so it marks itself as the current page. */}
        <ResourceTabs active="/faq" />

        <div className="mt-4">
          <FaqExplorer />
        </div>
      </div>
    </div>
  );
}
