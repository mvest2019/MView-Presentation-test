/**
 * THE POINTER THE WALKTHROUGH DRIVES.
 *
 * ── AN OVERLAY, NOT A REAL CURSOR ──
 *
 * Nothing here touches the page's own pointer. It is a drawn arrow positioned
 * over the stage, so it can move where the reader's mouse is not and cannot
 * fight it for control. The stage beneath is `inert`, so the two can never
 * disagree about what is being pressed.
 *
 * ── IT MOVES WITH A TRANSITION, NOT A LOOP ──
 *
 * `transform` on a CSS transition, so the browser animates it off the main
 * thread and a script busy re-rendering twenty record cards does not make the
 * pointer stutter. Each act sets a destination; the transition does the travel.
 *
 * `cubic-bezier(.4,0,.2,1)` rather than linear: a pointer that accelerates and
 * settles reads as a hand moving a mouse, and one at constant speed reads as a
 * machine — which is exactly the difference between "here is how you use it"
 * and "here is an animation".
 *
 * ── THE RING IS THE CLICK ──
 *
 * A press has no other visible sign: the stage is inert, so nothing under the
 * pointer can show a `:active` state. The ring expands and fades once per
 * click, keyed on a counter so a second click at the same coordinates still
 * replays it.
 */
export function SampleCursor({
  x,
  y,
  clicks,
  visible,
}: {
  x: number;
  y: number;
  /** Increments on every click act — the ring's replay key. */
  clicks: number;
  visible: boolean;
}) {
  /*
   * NOT RENDERED AT ALL WHEN HIDDEN, rather than faded to `opacity: 0`.
   *
   * This span is absolutely positioned INSIDE the stage, which is the scroll
   * container — and a translated absolute element extends its scroller's
   * scrollable area whether it is visible or not. Step 5 has no `target` acts,
   * so the pointer kept step 4's coordinates: a few hundred pixels below the
   * receipt, holding open a band of empty scroll under the card that no content
   * accounted for. Unmounting it removes the box, and with it the overflow.
   */
  if (!visible) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-30"
      style={{
        transform: `translate3d(${x}px, ${y}px, 0)`,
        transition: "transform 620ms cubic-bezier(.4,0,.2,1), opacity 260ms",
      }}
    >
      {/* THE RING SITS BEHIND THE ARROW and is centred on the arrow's TIP,
          which is the top-left corner of this box — the point a real cursor
          actually presses with. */}
      <span
        key={clicks}
        className="absolute rounded-full border-2 border-mv-green-deep"
        style={{
          left: "-19px",
          top: "-19px",
          width: "38px",
          height: "38px",
          animation: clicks > 0 ? "mv-sample-click 620ms ease-out" : undefined,
          opacity: 0,
        }}
      />

      <svg
        viewBox="0 0 24 24"
        className="relative h-[26px] w-[26px] drop-shadow-[0_2px_4px_rgba(13,14,23,.35)]"
      >
        <path
          d="M5 2.5 L5 19 L9.2 15.2 L11.9 21.2 L14.6 20 L11.9 14.1 L17.6 13.8 Z"
          fill="#fff"
          stroke="var(--color-mv-ink)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>

      {/* Scoped to this component rather than `globals.css`: it is the only
          thing that uses it, and a keyframe in the global sheet that one
          preview dialog animates is a keyframe nobody can safely delete. */}
      <style>{`
        @keyframes mv-sample-click {
          0%   { opacity: .85; transform: scale(.3); }
          70%  { opacity: .35; transform: scale(1); }
          100% { opacity: 0;   transform: scale(1.25); }
        }
      `}</style>
    </span>
  );
}
