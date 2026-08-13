/**
 * Category chip. The colour lookup is the prototype's `MV_BLOG_CHIP` map
 * (`marketing/src/routes/blog.html`) — a style table keyed on the category
 * names the API returns, with the design's own `chip-slate` fallback so a
 * category added later still renders.
 */

const CHIP_STYLES: Record<string, string> = {
  "chip-mint": "bg-mv-mint text-mv-green-ink",
  "chip-blue": "bg-mv-blue-bg text-mv-blue",
  "chip-slate": "bg-[#e8ecf3] text-mv-slate",
  "chip-est": "bg-mv-amber-bg text-mv-amber",
};

const CATEGORY_CHIP: Record<string, string> = {
  "Mineral Owners": "chip-mint",
  Operator: "chip-blue",
  "Play Type": "chip-blue",
  Headline: "chip-slate",
  "Most Popular": "chip-est",
  Field: "chip-slate",
  Other: "chip-slate",
};

export function BlogChip({
  category,
  size = "sm",
}: {
  category: string;
  size?: "sm" | "md";
}) {
  const variant = CHIP_STYLES[CATEGORY_CHIP[category] ?? "chip-slate"];

  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full px-[10px] py-[3px] font-semibold leading-[1.3] ${variant} ${
        size === "sm" ? "text-[10px]" : "text-[11.5px]"
      }`}
    >
      {category}
    </span>
  );
}
