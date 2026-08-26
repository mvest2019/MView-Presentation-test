/**
 * Renders the extracted copy's `**bold**` runs as real <strong> elements.
 *
 * The generated content files carry the prototype's <strong> emphasis as
 * `**markers**` so they stay plain data (see `feature-content.ts`). This is
 * the whole grammar — no nesting, no other marks — so a split on `**` is the
 * entire parser: odd-indexed parts were inside markers.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-mv-ink">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}
