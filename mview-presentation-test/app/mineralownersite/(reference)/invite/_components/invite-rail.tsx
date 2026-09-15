import { CREDIT } from "../_lib/invite-flow";
import type { CreditPlan, FlowStep } from "../_lib/invite-types";

/**
 * THE STEPS, AND WHAT THE SELECTION IS WORTH, IN ONE STICKY COLUMN.
 *
 * ── WHY A RAIL AND NOT A STRIP ACROSS THE TOP ──
 *
 * The nine steps as a row of pills above the cards read as a diagram to be
 * studied before the reader was allowed to begin, and took the top of the page
 * to do it. In a column beside the work they are the same information as
 * company: where you are, what is left, and what your cousin will be asked to
 * do — visible the whole way down instead of scrolled past once.
 *
 * ── THE READER'S OWN STEPS TICK; THEIR CO-OWNER'S DO NOT ──
 *
 * Steps 1-4 are the four things this page can watch happen, so they tick as
 * they happen and the rail is a position rather than a poster. Steps 5-8 are on
 * a claim-by-code flow that does not exist yet, and step 9 needs a credit
 * ledger — so they are drawn hollow, in their own panel, under a heading that
 * says whose they are. Styling all nine alike would promise five.
 *
 * That is the same rule the sidebar and `portal-routes.ts` already follow:
 * unbuilt is shown as unbuilt, never as locked or premium, and never as
 * working.
 *
 * ── THE TWO RUNGS THAT PAY NOTHING ARE SHOWN ON PURPOSE ──
 *
 * "A free month per co-owner" on its own invites a reader to write to every
 * name on the roll. Sending earns nothing and a free signup earns nothing, and
 * those two zeroes are the whole reason the page can be honest about the third
 * rung. Tidying them away would leave the number without its argument.
 *
 * ── WHAT THE RE-SKIN CHANGED ──
 *
 * Three `<Card>`s of Tailwind became `.iv-rail` and three `.iv-railcard`s, and
 * with them the rail's own RESPONSIVE BEHAVIOUR, which the old build did not
 * have. `.iv-rail` carries `order: -1` so a stacked layout puts the steps ABOVE
 * the work they introduce rather than below it; between a 600px and an 880px
 * container the three cards lay out two across with the earnings card spanning
 * both; at 880px and over it becomes the sticky side column it was always meant
 * to be. All three are container queries against the page's own box, because
 * this page is nearly the same width at a 1024px viewport as at 768px.
 *
 * AND THE EARNINGS CARD GOES DARK WHEN THERE IS SOMETHING TO EARN — `.live`,
 * the reference's own state, which this build had as a green left border.
 */
export function InviteRail({
  steps,
  at,
  plan,
}: {
  steps: FlowStep[];
  /** How many of the reader's own steps are done — 0 to 4. */
  at: number;
  plan: CreditPlan;
}) {
  const mine = steps.filter((step) => step.who === "you" && step.n <= 4);
  const theirs = steps.filter((step) => step.who === "them");
  const payoff = steps[steps.length - 1];

  return (
    <aside className="iv-rail">
      <div className="iv-railcard">
        <span className="iv-railk">How to invite</span>
        <ol className="iv-steps">
          {mine.map((step) => (
            <RailStep
              key={step.n}
              step={step}
              done={step.n <= at}
              now={step.n === at + 1}
            />
          ))}
        </ol>
      </div>

      <div className="iv-railcard soft">
        <span className="iv-railk">Then they</span>
        {/* NOTHING BETWEEN THE HEADING AND THE LIST. A sentence sat here saying
            these four steps are not built yet. It was this build's addition,
            the reference carries no such line, and the hollow step marks and
            the "Then they" heading already say whose steps these are. */}
        <ol className="iv-steps ghost">
          {theirs.map((step) => (
            <RailStep key={step.n} step={step} done={false} now={false} />
          ))}
        </ol>
      </div>

      <div className={`iv-railcard earn${plan.monthsMax ? " live" : ""}`}>
        <span className="iv-railk">What you earn</span>
        <div className="iv-earn">
          <strong className="num">{plan.monthsMax}</strong>
          <span>free {plan.monthsMax === 1 ? "month" : "months"}</span>
        </div>
        {/*
          THE SENTENCE EARNS ITS SPACE IN ONE STATE ONLY. With nothing ticked a
          bare "0 free months" explains nothing and needs the prompt; once there
          is a figure, the figure and the rungs below say it in less room.
        */}
        {plan.monthsMax === 0 ? <p className="iv-earnline">{plan.line}</p> : null}

        <div className="iv-rungs">
          {(
            [
              ["You send it", "nothing", false],
              ["They join free", "nothing", false],
              [
                "They go paid",
                `+${CREDIT.monthsOnPaid} ${CREDIT.monthsOnPaid === 1 ? "month" : "months"}`,
                true,
              ],
            ] as [string, string, boolean][]
          ).map(([what, earns, pays]) => (
            <div key={what} className={pays ? "hit" : undefined}>
              <span>{what}</span>
              <b>{earns}</b>
            </div>
          ))}
        </div>

        <p className="iv-earnnote">
          {payoff.detail} One month per person, ever — not per lease.
          {plan.repeat.length ? (
            <>
              {" "}
              <b>
                {plan.repeat.length === 1
                  ? "One of your picks"
                  : `${plan.repeat.length} of your picks`}
              </b>{" "}
              also {plan.repeat.length === 1 ? "owns" : "own"}{" "}
              {plan.repeatLeases === 1
                ? "another lease"
                : `${plan.repeatLeases} other leases`}{" "}
              of yours, so writing again from those earns nothing more.
            </>
          ) : null}
        </p>
      </div>
    </aside>
  );
}

/**
 * One step.
 *
 * THE GHOST LANE IS THE LIST'S, NOT THE ROW'S. `.iv-steps.ghost` styles every
 * row inside it, so the "not yet" treatment is set once on the `<ol>` that
 * holds the unbuilt four rather than passed down to each row — which is how
 * the reference does it, and it means a row cannot be ghosted by accident in
 * the lane where things actually work.
 *
 * It is deliberately NOT a lock icon or a dimmed premium treatment: those say
 * "not for you", and the truth here is "not yet, for anybody".
 */
function RailStep({
  step,
  done,
  now,
}: {
  step: FlowStep;
  done: boolean;
  now: boolean;
}) {
  return (
    <li className={done ? "done" : now ? "now" : undefined}>
      <span className="iv-rn" aria-hidden="true">
        {done ? "✓" : step.n}
      </span>
      <div>
        {/* THE TITLE AND NOTHING ELSE. A build-state tag ("in your own mail")
            hung off step 4 here, and it was saying what the step's own detail
            line already says in the reference's words — "Paste it into your own
            mail. It reads as personal because it is." Two labels for one fact,
            the shorter one stripped of the reason that makes it land. */}
        <strong>{step.title}</strong>
        <i>{step.detail}</i>
      </div>
    </li>
  );
}
