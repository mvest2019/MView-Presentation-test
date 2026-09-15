/**
 * PRODUCED AGAINST STILL AHEAD, AS A RING.
 *
 * Two slices of one whole, read once — the one job a ring does better than a
 * bar. The figure is printed in the middle so nobody has to estimate it off an
 * arc, and both quantities are listed beside it so the ring never has to be
 * measured at all.
 *
 * `stroke-dasharray` ON A CIRCLE IS THE WHOLE MECHANISM: the circumference is
 * computed, the produced share becomes the dash and the remainder the gap, and
 * the circle is rotated so it starts at twelve o'clock. No path maths, no
 * library, and it scales with the viewBox.
 *
 * THE UNIT IS ANNOUNCED, NOT PRINTED. "Gas - MCF" used to sit as a chip to the
 * left of the ring. It was naming a ring that has the word PRODUCED through its
 * middle, sits under a heading saying GAS, and is drawn in the gas colour - a
 * fourth statement of something already said three times, and it pushed the
 * ring off centre to say it. The prop stays and carries the ring's accessible
 * name instead: a screen reader gets no colour and no heading, so for that
 * reader it is the only thing telling this ring from the one beside it.
 *
 * Shared by the lease report and the reservoir report, which ask the same
 * question of different scopes.
 */

const RING = {
  gas: {
    strong: "stroke-mv-green-deep",
    pale: "stroke-mv-green-deep/25",
    dot: "bg-mv-green-deep",
  },
  oil: {
    strong: "stroke-mv-oil",
    pale: "stroke-mv-oil/25",
    dot: "bg-mv-oil",
  },
} as const;

export type DonutTone = keyof typeof RING;

export function Donut({
  unit,
  tone,
  percent,
  produced,
  ahead,
  note,
}: {
  /** "Gas · MCF". */
  unit: string;
  tone: DonutTone;
  percent: number;
  produced: string;
  ahead: string;
  note: string;
}) {
  /* A THICKER RING THAN A DEFAULT ONE, and that is the design's judgement
     rather than decoration: this ring is read at a glance from across a card,
     and a thin arc makes the two shares a matter of measuring the line. 22 on
     a radius of 44 puts a fifth of the outer diameter into the band. */
  const radius = 44;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        <svg
          viewBox="0 0 120 120"
          className="h-[150px] w-[150px] flex-none"
          role="img"
          aria-label={`${unit} - ${percent.toFixed(1)}% produced`}
        >
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className={RING[tone].pale}
          />
          <circle
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${circumference - filled}`}
            transform="rotate(-90 60 60)"
            className={RING[tone].strong}
          />
          {/* SIZED AGAINST THE HOLE, NOT THE RING. The gap inside the band is
              2 × (radius − stroke/2) = 66 units across, and at 21 the figure
              filled almost all of it — "78.0%" ran to the inner edge of the
              arc on both sides, so the ring read as a frame squeezing the
              number rather than as a gauge around it. 17 leaves it breathing
              room and still makes it the largest thing in the card.

              The two baselines are set so the pair centres on 60, which is why
              they move together whenever either size changes. */}
          <text
            x={60}
            y={59}
            textAnchor="middle"
            className="fill-mv-ink text-[17px] font-bold"
          >
            {percent.toFixed(1)}%
          </text>
          <text
            x={60}
            y={71}
            textAnchor="middle"
            className="fill-mv-muted text-[7.5px] font-bold tracking-[0.1em] uppercase"
          >
            Produced
          </text>
        </svg>

        {/* THE TWO FIGURES ARE RIGHT-ALIGNED AGAINST EACH OTHER - `ml-auto` on
            the value, and a floor under the list so they have something to
            align to. Set hard against their labels they sat at two different x
            positions, which is the one thing a short table of quantities must
            not do. */}
        <dl className="min-w-[190px] space-y-3.5 text-[12px]">
          <Row tone={tone} label="Produced" value={produced} />
          <Row tone={tone} shade="pale" label="Still ahead" value={ahead} />
        </dl>
      </div>

      <p className="mt-4 text-[11.5px] leading-[1.55] text-mv-muted">{note}</p>
    </div>
  );
}

/** One legend line: the ring's colour, which slice it is, and how much. */
function Row({
  tone,
  shade,
  label,
  value,
}: {
  tone: DonutTone;
  shade?: DotShade;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <DonutDot tone={tone} shade={shade} />
      <dt className="text-mv-slate">{label}</dt>
      <dd className="ml-auto font-bold tabular-nums">{value}</dd>
    </div>
  );
}

export type DotShade = "strong" | "pale";

/**
 * The coloured dot the stat rows beside a ring use, so the two agree.
 *
 * `shade` IS WHICH SLICE THE DOT NAMES, and it is why "gas reserves" is a pale
 * green rather than a colour of its own. The design gives the four stats four
 * unrelated hues - green, teal, gold, purple - and the purple one sits beside a
 * ring segment drawn in pale cream. A dot in front of a figure is a key: its
 * one job is to point at the part of the ring it belongs to, and a fourth hue
 * that appears nowhere in either ring cannot do it. Strong for what has been
 * produced, pale for what is still ahead, in each product's own colour - the
 * same two shades the ring beside them is drawn in.
 */
export function DonutDot({
  tone,
  shade = "strong",
}: {
  tone: DonutTone;
  shade?: DotShade;
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2 w-2 flex-none rounded-full ${RING[tone].dot} ${
        shade === "pale" ? "opacity-30" : ""
      }`.trim()}
    />
  );
}
