import type { Metadata } from "next";

import { FeatureLanding } from "../_components/feature-landing";
import { content } from "./content";

/**
 * The pro-team feature landing page. Copy and imagery live in the generated
 * `content.ts` beside this file (see scripts/extract-feature-content.py);
 * this file owns the route and its metadata.
 */
export const metadata: Metadata = {
  title: `${content.title} — Mineral View`,
  description: content.description,
};

export default function ProTeamFeaturePage() {
  return <FeatureLanding content={content} />;
}
