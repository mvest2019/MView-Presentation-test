import type { Metadata } from "next";

import { headingBase } from "../_components/typography";
import { ResourceTabs } from "../blog/_components/resource-tabs";
import { FaqExplorer } from "./_components/faq-explorer";

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
    <div className="py-16 pt-[52px] max-[767px]:py-11">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <div>
          <h2
            className={`${headingBase} my-2 text-[clamp(26px,3vw,34px)] leading-[1.16]`}
          >
            Fair questions, straight answers
          </h2>
          <p className="m-0 max-w-[620px] text-mv-muted">
            What Mineral View is, what it isn&apos;t, and how your data is
            handled. Free to read — no account required.
          </p>
        </div>

        <ResourceTabs active="/faq" />

        <div className="mt-4">
          <FaqExplorer />
        </div>
      </div>
    </div>
  );
}
