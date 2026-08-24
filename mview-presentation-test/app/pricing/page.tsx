import type { Metadata } from "next";

import { PRICING_MARKUP } from "../_proto/markup";
import { ProtoPage } from "../_proto/proto-page";

/** Pricing — the prototype's own page. See `_proto/markup.ts`. */
export const metadata: Metadata = {
  // The design's own title for this route, from its route/title map.
  title: "Plans & Pricing — Owner & Professional | Mineral View",
  description:
    "Owner plans free to start, and professional plans for operators and advisors. No auto-renew — renewal always needs your explicit click.",
};

export default function PricingPage() {
  /*
    `heading` is supplied because the prototype's pricing section has no `h1` of
    its own — its heading is set by the router, which swaps the document title
    between "Owner pricing" and "Professional pricing" as the segment changes.
    We hold a stable one instead; see the prop's doc comment in `proto-page.tsx`.
  */
  return <ProtoPage markup={PRICING_MARKUP} heading="Plans and pricing" />;
}
