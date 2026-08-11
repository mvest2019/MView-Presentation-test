import type { Metadata } from "next";
import Link from "next/link";

import { headingBase } from "../_components/typography";
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
    <div className="py-16 pt-[26px] max-[767px]:pb-11">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px]">
          <Link
            href="/"
            className="font-semibold text-mv-green-deep no-underline hover:underline"
          >
            Home
          </Link>
          <span className="mx-2 text-mv-muted">›</span>
          <span className="font-bold text-mv-ink">FAQ</span>
        </nav>

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

        <div className="mt-4">
          <FaqExplorer />
        </div>
      </div>
    </div>
  );
}
