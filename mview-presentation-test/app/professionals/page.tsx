import type { Metadata } from "next";

import { PROFESSIONALS_MARKUP } from "../_proto/markup";
import { ProtoPage } from "../_proto/proto-page";

/** For professionals — the prototype's own page. See `_proto/markup.ts`. */
export const metadata: Metadata = {
  title: "For professionals — operators, advisors and data | Mineral View",
  description:
    "Everything happening around your acreage — and your whole book — in one workspace.",
};

export default function ProfessionalsPage() {
  // No `heading` — this page's markup carries its own `h1` below the hero.
  return <ProtoPage markup={PROFESSIONALS_MARKUP} />;
}
