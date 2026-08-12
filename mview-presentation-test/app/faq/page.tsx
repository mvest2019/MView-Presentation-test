import type { Metadata } from "next";

import { headingBase } from "../_components/typography";
import { ResourceTabs } from "../blog/_components/resource-tabs";
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
    <div className="py-16 pt-[26px] max-[767px]:pb-11">
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
