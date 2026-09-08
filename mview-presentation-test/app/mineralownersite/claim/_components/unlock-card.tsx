import { Check, Lock } from "lucide-react";

/**
 * WHAT YOU'LL UNLOCK — step 2's rail card.
 *
 * ── IT CARRIES NO NUMBERS, AND THAT IS THE POINT NOW ──
 *
 * It used to show an estimated yearly value, a modelled range and three sample
 * lease names. All of it was invented: on step 2 nothing has been verified, so
 * the flow has no figure for this reader — and the step's own promise is that
 * values stay hidden until a record is confirmed. A confident dollar amount in
 * the rail, beside `$•,•••` in the main column, was one glance away from being
 * read as one of the candidates' real numbers.
 *
 * So the card says what confirming a record OPENS, in words. Every line is
 * something the endpoints genuinely return once `/same-name` has been called
 * with an address: the appraised value per lease, the operator and decimal
 * interest, and the full statewide set rather than one county's slice.
 */
const UNLOCKS = [
  "The appraised value on every lease tied to your record",
  "Operator and decimal interest, lease by lease",
  "Every lease the name holds statewide — not just this county",
];

export function UnlockCard() {
  return (
    <section
      className="rounded-mv border border-mv-sand-line bg-mv-sand-tint p-[18px]"
      aria-label="What you'll unlock"
    >
      <h2 className="flex items-center gap-[8px] text-[15px] font-extrabold tracking-[-.01em] text-mv-ink">
        <Lock
          aria-hidden="true"
          className="h-[15px] w-[15px] flex-none text-mv-green-deep"
        />
        What you&rsquo;ll unlock
      </h2>

      <p className="mt-[8px] text-[12px] leading-[1.5] text-mv-muted">
        Confirming a record on the next step opens its figures to you:
      </p>

      <ul className="mt-[10px] grid gap-[7px]">
        {UNLOCKS.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 text-[12px] leading-[1.45] text-mv-slate"
          >
            <Check
              aria-hidden="true"
              className="mt-[2px] h-[12px] w-[12px] flex-none text-mv-green-deep"
              strokeWidth={3}
            />
            {line}
          </li>
        ))}
      </ul>
    </section>
  );
}
