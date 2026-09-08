import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * THE RAIL'S STEP-SPECIFIC CARD — one component, five uses.
 *
 * Each step ends its rail with a short tinted card answering the question that
 * step raises and no other: "You can't break anything" on step 1, "Still
 * nothing committed" on 2, "Claimed by mistake?" on 3, "Nothing to fill in" on
 * 4, "Inactive isn't lost" on 5.
 *
 * THE TONE IS THE MEANING, and it follows `Notice`'s scheme next door so the
 * two cannot say different things with the same colour:
 *
 *   slate  a mechanical fact — nothing is committed, nothing to fill in
 *   amber  something the reader may need to act on later — how to undo a
 *          claim, why a $0 lease is not a worthless one
 *
 * `title` carries its own weight, so the body is optional: two of the five are
 * a heading and a sentence, and one is a heading alone.
 */
export function RailNote({
  icon: Icon,
  tone = "slate",
  title,
  children,
}: {
  icon: LucideIcon;
  tone?: "slate" | "amber";
  title: string;
  children?: ReactNode;
}) {
  const tones = {
    slate: "border-mv-line bg-mv-portal-wash text-mv-slate",
    amber: "border-mv-sand-line bg-mv-sand-tint text-mv-sand",
  };

  return (
    <section className={`rounded-mv border p-[18px] ${tones[tone]}`}>
      <h2 className="flex items-start gap-[7px] text-[12.5px] font-bold text-mv-ink">
        <Icon aria-hidden="true" className="mt-[1px] h-[14px] w-[14px] flex-none" />
        {title}
      </h2>
      {children && (
        <p className="mt-[6px] pl-[21px] text-[12px] leading-[1.5]">{children}</p>
      )}
    </section>
  );
}
