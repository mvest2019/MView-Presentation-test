import { Lightbulb } from "lucide-react";
import type { ReactNode } from "react";

/**
 * THE GUIDE BOX — every step ends with one, above the buttons.
 *
 * It is where the flow says what is happening TECHNICALLY: which sources the
 * query runs against, what a claim event actually writes, what "archived"
 * means at the database level. That belongs on the page — an owner deciding
 * whether to attach their name to a public record is entitled to know what the
 * button does — but it must not be the first thing they read, or the flow
 * becomes documentation with a form attached.
 *
 * So it is last, tinted, and headed "Guide", which is a promise that the step
 * is already complete without it.
 */
export function GuideNote({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    /* TIGHTER THAN THE CARDS AROUND IT (requested). 16px of padding on every
       side gave a two-line footnote the same weight of surround as a panel of
       form fields; 10px top and bottom keeps the tint reading as one block
       without the note looking like it holds a card's worth of content. The
       horizontal padding stays at 16px — that one is stopping the text touching
       the tinted edge, and it was never the space in question. */
    <aside className="rounded-[10px] border border-mv-mint-edge bg-mv-mint/60 px-4 py-[10px]">
      <h3 className="flex items-center gap-[7px] text-[12.5px] font-bold text-mv-green-deep">
        <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-mv-mint">
          <Lightbulb aria-hidden="true" className="h-[13px] w-[13px]" />
        </span>
        Guide — {title}
      </h3>
      <div className="mt-[3px] pl-[29px] text-[12px] leading-[1.6] text-mv-slate">
        {children}
      </div>
    </aside>
  );
}
