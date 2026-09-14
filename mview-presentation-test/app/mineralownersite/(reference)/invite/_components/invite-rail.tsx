import { Card } from "../../../_components/ui/card";
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
 */
/* 70px clears `.app-top`, the reference shell's single 58px bar. It was 112 —
   the portal shell's two stacked bars, from before this page changed shells. */
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
    <aside className="flex flex-col items-stretch gap-3 min-[1100px]:sticky min-[1100px]:top-[70px]">
      <Card className="p-4">
        <RailHeading>How to invite</RailHeading>
        <ol className="m-0 mt-[10px] flex list-none flex-col items-stretch gap-[10px] p-0">
          {mine.map((step) => (
            <RailStep
              key={step.n}
              step={step}
              done={step.n <= at}
              now={step.n === at + 1}
            />
          ))}
        </ol>
      </Card>

      <Card className="bg-mv-portal-explain p-4">
        <RailHeading>Then they</RailHeading>
        {/* NAMED AS UNBUILT, IN WORDS. The hollow marks say "not yet" to a
            reader who notices the styling; this line says it to everyone, and
            says which part is missing rather than leaving the reader to guess
            whether it is their account or the product. */}
        <p className="m-0 mt-1 text-[11.5px] leading-[1.45] text-mv-muted">
          Claiming by code is still being built, so these four do not happen yet.
        </p>
        <ol className="m-0 mt-[10px] flex list-none flex-col gap-[10px] p-0">
          {theirs.map((step) => (
            <RailStep key={step.n} step={step} done={false} now={false} ghost />
          ))}
        </ol>
      </Card>

      <Card
        className={`p-4 ${
          plan.monthsMax
            ? "border-l-4 border-l-mv-green bg-mv-portal-hero-tint"
            : ""
        }`}
      >
        <RailHeading>What you earn</RailHeading>
        <p className="m-0 mt-2 flex items-baseline gap-2">
          <strong className="text-[26px] leading-none font-bold tabular-nums">
            {plan.monthsMax}
          </strong>
          <span className="text-[12.5px] text-mv-slate">
            free {plan.monthsMax === 1 ? "month" : "months"}
          </span>
        </p>
        {/*
          THE SENTENCE EARNS ITS SPACE IN ONE STATE ONLY. With nothing ticked a
          bare "0 free months" explains nothing and needs the prompt; once there
          is a figure, the figure and the rungs below say it in less room.
        */}
        {plan.monthsMax === 0 ? (
          <p className="m-0 mt-1.5 text-[12px] leading-[1.5] text-mv-muted">
            {plan.line}
          </p>
        ) : null}

        <div className="mt-3 flex flex-col items-stretch gap-1">
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
            <div
              key={what}
              className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[12px] ${
                pays
                  ? "bg-mv-mint text-mv-green-ink"
                  : "bg-mv-portal-wash text-mv-slate"
              }`}
            >
              <span>{what}</span>
              <b className="font-semibold tabular-nums">{earns}</b>
            </div>
          ))}
        </div>

        <p className="m-0 mt-[10px] text-[11.5px] leading-[1.5] text-mv-muted">
          {payoff.detail} One month per person, ever — not per lease.
          {plan.repeat.length ? (
            <>
              {" "}
              <b className="font-semibold text-mv-slate">
                {plan.repeat.length === 1
                  ? "One of your picks"
                  : `${plan.repeat.length} of your picks`}
              </b>{" "}
              also{" "}
              {plan.repeat.length === 1 ? "owns" : "own"}{" "}
              {plan.repeatLeases === 1
                ? "another lease"
                : `${plan.repeatLeases} other leases`}{" "}
              of yours, so writing again from those earns nothing more.
            </>
          ) : null}
        </p>
      </Card>
    </aside>
  );
}

function RailHeading({ children }: { children: string }) {
  return (
    <h2 className="m-0 text-[11px] font-bold tracking-[0.06em] text-mv-muted uppercase">
      {children}
    </h2>
  );
}

/**
 * One step.
 *
 * `ghost` IS THE UNBUILT LANE — hollow mark, muted type, and no "now" state to
 * land on. It is deliberately NOT a lock icon or a dimmed premium treatment:
 * those say "not for you", and the truth here is "not yet, for anybody".
 */
function RailStep({
  step,
  done,
  now,
  ghost = false,
}: {
  step: FlowStep;
  done: boolean;
  now: boolean;
  ghost?: boolean;
}) {
  return (
    <li className="flex items-start gap-[10px]">
      <span
        aria-hidden="true"
        className={`mt-[1px] flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full text-[10.5px] font-bold ${
          done
            ? "bg-mv-green text-mv-green-ink"
            : ghost
              ? "border border-dashed border-mv-line-strong text-mv-placeholder"
              : now
                ? "border-2 border-mv-green text-mv-green-deep"
                : "bg-mv-portal-wash text-mv-muted"
        }`}
      >
        {done ? "✓" : step.n}
      </span>
      <span className="min-w-0">
        <strong
          className={`block text-[12.5px] leading-[1.35] font-semibold ${
            ghost ? "text-mv-muted" : "text-mv-ink"
          }`}
        >
          {/* THE TITLE AND NOTHING ELSE. A build-state tag ("in your own mail")
              hung off step 4 here, and it was saying what the step's own detail
              line already says in the reference's words — "Paste it into your
              own mail. It reads as personal because it is." Two labels for one
              fact, the shorter one stripped of the reason that makes it land. */}
          {step.title}
        </strong>
        <span className="mt-px block text-[11.5px] leading-[1.45] text-mv-muted">
          {step.detail}
        </span>
      </span>
    </li>
  );
}
