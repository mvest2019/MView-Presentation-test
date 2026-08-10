import type { Metadata } from "next";

import { getGlossaryTerms } from "@/lib/glossary-api";

import { headingBase } from "../_components/typography";
import { ResourceTabs } from "../blog/_components/resource-tabs";
import { GlossaryIndex } from "./_components/glossary-index";

/**
 * Glossary index — the prototype's `route:glossary`.
 *
 * Terms, categories and the A–Z letters all come from
 * `/NewsFramework/Glossary_data`; nothing about the corpus is hardcoded,
 * including the term count in the standfirst.
 */

export const metadata: Metadata = {
  title: "Glossary — Mineral terms, in plain English | Mineral View",
  description:
    "Every term in the Mineral View glossary — a short definition inline, and the full plain-English article one click away.",
};

export default async function GlossaryPage() {
  const terms = await getGlossaryTerms();

  return (
    <div className="py-16 pt-[52px] max-[767px]:py-11">
      <div className="mx-auto max-w-[1200px] px-7 max-[767px]:px-4">
        <div className="min-h-[150px] max-[767px]:min-h-0">
          <div className="text-[11.5px] font-bold uppercase tracking-[.12em] text-mv-green-deep">
            Glossary
          </div>
          <h2
            className={`${headingBase} my-2 text-[clamp(26px,3vw,34px)] leading-[1.16]`}
          >
            Mineral terms, in plain English
          </h2>
          <p className="m-0 max-w-[620px] text-mv-muted">
            Every term in the Mineral View glossary — a short definition inline,
            and the full plain-English article one click away.
          </p>
        </div>

        <ResourceTabs active="/glossary" />

        <p className="mt-[10px] text-xs text-mv-muted">
          {terms.length} {terms.length === 1 ? "term" : "terms"}, A–Z.
        </p>

        <GlossaryIndex terms={terms} />
      </div>
    </div>
  );
}
