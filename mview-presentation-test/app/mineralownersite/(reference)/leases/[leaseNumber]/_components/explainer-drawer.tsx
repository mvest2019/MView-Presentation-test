"use client";

import { Fragment, useEffect, useRef, useState } from "react";

import { ExplainerChartBlock, type ExplainerChart } from "./explainer-chart";

/**
 * THE PLAIN-ENGLISH EXPLAINER, AS A SIDE PANEL.
 *
 * ── IT IS THE DASHBOARD'S DRAWER, IN TAILWIND ──
 *
 * `dashboard-reference.css`'s `.ctx-drawer` / `.ctx-scrim` / `.ctx-head` /
 * `.dx-*` are the panel this product already has, and a reader who has opened
 * one on the dashboard should not meet a different object here. Every measure
 * below is that rule's: 680px wide, the flat `#04231a` head with a 3px tone
 * rule under it, the 40px close square in the corner, the metric band, the
 * numbered step cards, the one highlighted "what to do", and the footnote over
 * a hairline.
 *
 * ── IT SLIDES, AND IT NEVER TOUCHES THE PAGE ──
 *
 * TWO THINGS MAKE A DRAWER FEEL RIGHT AND BOTH ARE ABOUT WHAT DOES *NOT*
 * HAPPEN.
 *
 *   · IT IS ALWAYS MOUNTED. A panel that is mounted on open cannot animate —
 *     there is no first frame to transition from, so it appears. This one sits
 *     at `translateX(102%)` with `visibility:hidden` the whole time and moves
 *     to zero over 280ms, which is the only reason the open reads as a slide
 *     rather than a flash. `visibility` is what keeps a hidden panel out of the
 *     tab order and off the screen reader, and it is the one property that can
 *     be transitioned alongside `transform`. It IS in the transition list, and
 *     that is not decoration: `visibility` steps rather than interpolates, so
 *     listing it holds the panel visible for the whole 280ms of the close and
 *     flips it at the end. Left out, it goes hidden on the first frame and the
 *     slide out never gets drawn — the panel just vanishes.
 *
 *   · THE PAGE BEHIND IT DOES NOT MOVE. Locking `body` scroll while a panel is
 *     open removes the scrollbar, the content widens by its width, and the
 *     whole report jumps sideways at the moment the panel opens and back when
 *     it closes. The dashboard's drawer does not do this and neither does this
 *     one: the report stays exactly where the reader left it, which is the
 *     point of an explainer — they are meant to read it *against* the figure
 *     behind it.
 *
 * ── THE CONTENT SURVIVES THE CLOSE ──
 *
 * `shown` holds the last explainer so the panel still has something in it while
 * it slides out. Rendering `explainer` directly would empty the panel on the
 * first frame of the close and animate a blank box off the screen. It is
 * adjusted during render rather than in an effect — React's own pattern for
 * state derived from a prop, and the only one that has the new content on the
 * same frame the panel starts moving.
 *
 * ── FOCUS ──
 *
 * Focus moves in on open, is trapped while open, and returns to the tile that
 * opened it on close — the same contract as `DrawerPanel`. A drawer a keyboard
 * user can tab out of, leaving focus on a page they cannot see, is worse than
 * no drawer.
 */

export interface ExplainerStat {
  label: string;
  value: string;
  /** The small line under the figure. */
  sub?: string;
}

/**
 * ONE LINE OF EVIDENCE.
 *
 * A plain string is the common case. The object form exists for the rows that
 * quote the record itself — "MCCABE ETAL GU — $26,453,622, your interest
 * 0.05138, your share $1,359,187" — where the name at the front and the figure
 * at the end are what a reader scans for and the middle is the working. Bolding
 * both ends turns a wall of near-identical sentences into a column of names and
 * a column of numbers.
 */
export type ExplainerBullet =
  string | { lead?: string; text: string; tail?: string };

export interface ExplainerSection {
  heading: string;
  /** A paragraph, or the bullets for "what this is built on". */
  body?: string;
  bullets?: ExplainerBullet[];
  /** The small right-hand note on the section heading. */
  aside?: string;
}

/**
 * WHAT KIND OF FIGURE THIS IS — `dashboard-reference.css`'s `.dx-money` /
 * `.dx-activity` / `.dx-models` / `.dx-record`.
 *
 * It names the eyebrow and colours the rule under the head, and it is the one
 * thing a reader takes in before any word of the panel: money is the amber one,
 * a model is the blue one. Getting it wrong is how a modelled remainder reads
 * as cash somebody has been paid.
 */
export type ExplainerTone = "money" | "activity" | "models" | "record";

const TONE_LABEL: Record<ExplainerTone, string> = {
  money: "Money",
  activity: "Activity",
  models: "Models & forecasts",
  record: "Your record",
};

/**
 * WHICH SECTION THE CHARTS FOLLOW.
 *
 * Index 1 — "what it means for you". The three sections always answer the same
 * three questions in the same order, so this is a position in a fixed grammar
 * rather than a guess about one panel's shape.
 */
const CHARTS_AFTER = 1;

const TONE_RULE: Record<ExplainerTone, string> = {
  money: "border-[#d9a441]",
  activity: "border-mv-green",
  models: "border-[#6a8cf0]",
  record: "border-[#7b8794]",
};

export interface Explainer {
  tone: ExplainerTone;
  title: string;
  subtitle: string;
  stats?: ExplainerStat[];
  sections: ExplainerSection[];
  /**
   * Trends, drawn after the second section.
   *
   * AFTER "WHAT IT MEANS FOR YOU" AND BEFORE "WHAT IT IS BUILT ON", which is
   * the reference's own order and the right one: the charts are the picture of
   * the sentence above them, and the record below then names the individual
   * figures. Put first they are decoration; put last they are an appendix.
   */
  charts?: ExplainerChart[];
  whatToDo: string;
  tags?: string[];
  footnote?: string;
}

export function ExplainerDrawer({
  explainer,
  onClose,
}: {
  explainer: Explainer | null;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const open = Boolean(explainer);

  /* The panel keeps what it was last showing so the close animates something
     rather than an empty box. See the note above. */
  const [shown, setShown] = useState<Explainer | null>(explainer);
  if (explainer && explainer !== shown) setShown(explainer);

  useEffect(() => {
    if (!open) return;

    returnTo.current = document.activeElement as HTMLElement | null;
    const element = panel.current;

    const focusables = (): HTMLElement[] =>
      Array.from(
        element?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((node) => !node.hasAttribute("disabled"));

    focusables()[0]?.focus();

    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const targets = focusables();
      if (!targets.length) return;
      const first = targets[0];
      const last = targets[targets.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <>
      {/* The scrim fades rather than appearing, so the two halves of the open
          read as one movement. `pointer-events-none` when closed is what keeps
          an invisible sheet off the page the reader is still using. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ opacity: open ? 1 : 0 }}
        className={`fixed inset-0 z-[370] bg-[rgba(4,35,26,0.45)] transition-opacity duration-[280ms] ease-out motion-reduce:transition-none ${
          open ? "" : "pointer-events-none"
        }`}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={shown?.title ?? "Explanation"}
        /* The two moving properties are inline, not utilities. A utility pair
           that swaps one class for another leaves the browser interpolating
           between two different declarations; one declaration whose value
           changes is what a transition is defined on. */
        style={{
          transform: open ? "translateX(0)" : "translateX(102%)",
          visibility: open ? "visible" : "hidden",
        }}
        /*
         * `text-mv-ink` IS NOT DECORATION — IT IS THE PANEL REFUSING TO INHERIT.
         *
         * This drawer is rendered wherever its opener sits, and one of those
         * openers is the lease report's DARK BAND, which sets `text-white` on
         * everything inside it. A fixed panel is still a descendant in the
         * document tree, so every element in here with no colour of its own
         * came out white on a near-white card: the chart titles and the chart
         * readouts vanished completely while the rest of the panel, which does
         * set its own colours, looked fine.
         *
         * Setting the colour at the root fixes it once for every mount point,
         * rather than once per element that happens to have been noticed.
         */
        className="fixed top-0 right-0 bottom-0 z-[371] flex w-[min(680px,100vw)] flex-col overflow-hidden bg-mv-bg text-mv-ink shadow-[-12px_0_40px_rgba(0,0,0,0.25)] transition-[transform,visibility] duration-[280ms] ease-out motion-reduce:transition-none"
      >
        {/* ------------------------------------------------------- the head */}
        <div
          className={`relative flex flex-none items-start gap-2.5 border-b-[3px] bg-mv-green-ink px-4 py-3 pr-[54px] text-white ${
            TONE_RULE[shown?.tone ?? "record"]
          }`}
        >
          <div className="min-w-0 flex-auto">
            <span className="mb-[5px] inline-block rounded-full bg-white/[0.14] px-[7px] py-0.5 text-[9px] font-extrabold tracking-[0.1em] text-[#9fd7bd] uppercase">
              {TONE_LABEL[shown?.tone ?? "record"]}
            </span>
            <h3 className="m-0 text-[15.5px] leading-[1.25] font-semibold [overflow-wrap:anywhere] text-white">
              {shown?.title}
            </h3>
            <div className="mt-0.5 block text-[11px] leading-[1.45] text-[#9fc9b8]">
              {shown?.subtitle}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2 right-2 flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-[9px] border border-white/[0.16] bg-white/10 text-base leading-none text-[#d7efe3] hover:bg-white/20 hover:text-white focus-visible:bg-white/20 focus-visible:text-white focus-visible:outline-none"
          >
            ✕
          </button>
        </div>

        {/* ------------------------------------------------------- the body */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto px-4 pt-3.5 pb-5">
          {shown && (
            <>
              {shown.stats && shown.stats.length > 0 && (
                <div className="mb-4 rounded-xl border border-[#cdeadd] bg-[linear-gradient(165deg,#ffffff,#f2fdf8)] px-[15px] py-[13px] shadow-[0_2px_10px_rgba(4,35,26,0.05)]">
                  <div className="grid gap-x-4 gap-y-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(120px,100%),1fr))]">
                    {shown.stats.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex min-w-0 flex-col gap-px"
                      >
                        <span className="text-[9px] leading-[1.3] font-extrabold tracking-[0.07em] text-mv-muted uppercase">
                          {stat.label}
                        </span>
                        <span className="text-[19px] leading-[1.15] font-extrabold tabular-nums [overflow-wrap:anywhere] text-mv-green-ink">
                          {stat.value}
                        </span>
                        {stat.sub && (
                          <span className="text-[10.5px] leading-[1.4] text-mv-muted">
                            {stat.sub}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {shown.sections.map((section, position) => (
                <Fragment key={section.heading}>
                  <section className="mb-3 rounded-[11px] border border-mv-line bg-mv-card px-3.5 py-3">
                    <div className="mb-[7px] flex flex-wrap items-baseline gap-x-[9px] gap-y-1">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-5 w-5 flex-none items-center justify-center self-center rounded-md bg-mv-mint text-[11px] leading-none font-extrabold text-mv-green-ink"
                      >
                        {position + 1}
                      </span>
                      <h4 className="m-0 text-[13.5px] font-bold text-mv-green-deep">
                        {section.heading}
                      </h4>
                      {section.aside && (
                        <span className="ml-auto text-[10px] text-mv-muted">
                          {section.aside}
                        </span>
                      )}
                    </div>

                    {section.body && (
                      <p className="m-0 text-[13px] leading-[1.62] text-mv-slate">
                        {section.body}
                      </p>
                    )}

                    {section.bullets && (
                      <ul className="m-0 flex list-none flex-col p-0">
                        {section.bullets.map((bullet) => {
                          const row =
                            typeof bullet === "string"
                              ? { text: bullet }
                              : bullet;
                          return (
                            <li
                              key={`${row.lead ?? ""}${row.text}`}
                              className="flex items-baseline gap-[9px] border-t border-mv-line py-[7px] text-[12.5px] leading-[1.55] text-mv-slate first:border-t-0 first:pt-0"
                            >
                              <span
                                aria-hidden="true"
                                className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-mv-green"
                              />
                              <span>
                                {row.lead && (
                                  <strong className="font-bold text-mv-ink">
                                    {row.lead}
                                  </strong>
                                )}
                                {row.text}
                                {row.tail && (
                                  <strong className="font-bold tabular-nums text-mv-ink">
                                    {row.tail}
                                  </strong>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  {/* THE CHARTS SIT HERE, not under the last section — they
                      are the picture of the sentence just above them, and the
                      record below then names the individual figures. Rendered
                      inside the section loop rather than in a pass of their
                      own, because a separate pass can only ever put them at
                      the end. */}
                  {position === CHARTS_AFTER &&
                    shown.charts?.map((chart) => (
                      <ExplainerChartBlock key={chart.title} chart={chart} />
                    ))}
                </Fragment>
              ))}

              <div className="mt-3.5 rounded-[11px] border border-l-4 border-mv-green bg-[linear-gradient(165deg,#f2fdf8,#ffffff)] px-[15px] py-[13px]">
                <span className="mb-1 block text-[9.5px] font-extrabold tracking-[0.09em] text-mv-green-deep uppercase">
                  What to do
                </span>
                <p className="m-0 text-[13px] leading-[1.6] text-[#2e6b52]">
                  {shown.whatToDo}
                </p>
              </div>

              {shown.tags && shown.tags.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {shown.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-mv-amber-bg px-2.5 py-[3px] text-[11.5px] leading-[1.3] font-semibold text-mv-amber"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {shown.footnote && (
                <p className="mt-4 border-t border-mv-line pt-[11px] text-xs leading-[1.55] text-mv-muted">
                  {shown.footnote}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
