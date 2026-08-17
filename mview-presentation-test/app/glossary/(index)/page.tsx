import type { Metadata } from "next";

import { getGlossaryTerms } from "@/lib/glossary-api";

import { headingBase } from "../../_components/typography";
import { ResourceTabs } from "../../blogs/_components/resource-tabs";
import { GlossaryIndex } from "../_components/glossary-index";
import { Breadcrumb } from "../../_components/breadcrumb";
import { pageShellClass } from "@/app/_components/page-shell";

/**
 * Glossary index — the prototype's `route:glossary`.
 *
 * Terms, categories and the A–Z letters all come from
 * `/NewsFramework/Glossary_data`; nothing about the corpus is hardcoded,
 * including the term count in the standfirst.
 */

/**
 * Heading and lede are the live site's own copy, supplied by Ryan — not the
 * prototype's ("Mineral terms, in plain English") and not written here.
 */
const HEADING = "Glossary of Oil & Gas Terms";
const LEDE =
  "Key industry terms and definitions related to mineral rights, oil, and gas.";

export const metadata: Metadata = {
  title: `${HEADING} | Mineral View`,
  description: LEDE,
};

export default async function GlossaryPage() {
  const terms = await getGlossaryTerms();

  return (
    <div className={pageShellClass}>
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <Breadcrumb trail={[{ label: "Glossary" }]} />
        {/* Matches the listing pages — see the note in `article-listing.tsx`
            for why the design's `.res-head` floor is dropped. */}
        {/* No kicker — the breadcrumb above already says Glossary. */}
        <div>
          <h2
            className={`${headingBase} my-2 text-[clamp(26px,3vw,34px)] leading-[1.16]`}
          >
            {HEADING}
          </h2>
          <p className="m-0 max-w-[620px] text-mv-muted">{LEDE}</p>
        </div>

        <ResourceTabs active="/glossary" />

        <GlossaryIndex terms={terms} />
      </div>
    </div>
  );
}
