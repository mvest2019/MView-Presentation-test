import { ProtoPage } from "./_proto/proto-page";
import { HOME_MARKUP } from "./_proto/markup";

/**
 * Home — the prototype's own page (Ryan, 2026-08-19: "take as it is html design").
 *
 * The markup and CSS are the document's; see `_proto/markup.ts` for exactly what
 * was rewritten (image tokens, hash routes) and what that costs.
 *
 * This replaces a Tailwind rebuild of the same page. The rebuild worked, but it
 * re-interpreted the design while translating — the "Everything else about Mineral
 * View" folds were flattened, an audience-doors block was invented, and the family
 * story moved. Holding the document's HTML removes the room to paraphrase.
 */
export default function Home() {
  return (
    <ProtoPage markup={HOME_MARKUP} heading="A clearer view of your minerals" />
  );
}
