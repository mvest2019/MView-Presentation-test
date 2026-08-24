import type { Metadata } from "next";

import { OWNERS_MARKUP } from "../_proto/markup";
import { ProtoPage } from "../_proto/proto-page";

/** For owners — the prototype's own page. See `_proto/markup.ts`. */
export const metadata: Metadata = {
  title: "For owners — everything Mineral View does | Mineral View",
  description:
    "Eleven features, organized by the question you actually have. Every page is free to read.",
};

export default function OwnersPage() {
  return (
    <ProtoPage
      markup={OWNERS_MARKUP}
      heading="For owners — everything Mineral View does"
    />
  );
}
