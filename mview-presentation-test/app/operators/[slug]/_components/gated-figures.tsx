"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { OperatorGatedFigures } from "@/lib/operator-gated-figures";

/**
 * The five figures the profile withholds from a signed-out reader, and the lock
 * that stands in for them.
 *
 * WHY THESE FIVE ARE NOT SERVER-RENDERED like the rest of the page. The route is
 * prerendered, so its HTML is one document served to members and visitors alike:
 * anything baked into it is a value everybody gets. The gate therefore has to be
 * resolved in the browser, against a handler that can read the session
 * (`/api/operators/<number>/figures`). OPERATORS.md section 2 is why the
 * alternative -- a `cookies()` read in the page -- is not on the table.
 *
 * ONE FETCH, NOT SEVEN. Seven slots need this answer: two hero pills, two rows of
 * "Company information" and three of "Production metrics". A hook per slot would be
 * seven identical requests per page view. The provider fetches once and the slots
 * read it through context, so closing the gate costs the page exactly one small
 * same-origin request.
 *
 * PENDING IS NEITHER STATE. It draws a plain skeleton -- not the lock, not a value.
 * Showing the lock while the answer is in flight would flash "create a free account"
 * at a member who has one; showing a value would flash the withheld figure at a
 * visitor for as long as the request takes. A neutral bar is the only honest thing
 * to draw before the answer arrives.
 *
 * NO RETRY. A failed read renders an em dash and stops (section 10, rule 5). The
 * reader can reload; the page will not sit re-requesting on a timer.
 */

/** Pending is its own state, distinct from both answers -- see the note above. */
type GateState =
  | { status: "pending" }
  | { status: "ready"; figures: OperatorGatedFigures }
  | { status: "error" };

const GateContext = createContext<GateState>({ status: "pending" });

export function GatedFigures({
  operatorNumber,
  children,
}: {
  operatorNumber: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<GateState>({ status: "pending" });

  useEffect(() => {
    /* Aborted on unmount so a navigation away does not resolve into a dead tree.
       `ignore` guards the state write for the same reason. */
    const controller = new AbortController();
    let ignore = false;

    (async () => {
      try {
        const response = await fetch(
          `/api/operators/${encodeURIComponent(operatorNumber)}/figures`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(String(response.status));
        const figures = (await response.json()) as OperatorGatedFigures;
        if (!ignore) setState({ status: "ready", figures });
      } catch {
        // An aborted request is a navigation, not a fault, and its component is
        // already gone -- `ignore` keeps it from being reported as an error.
        if (!ignore) setState({ status: "error" });
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [operatorNumber]);

  return <GateContext value={state}>{children}</GateContext>;
}

/**
 * Renders its children only for a reader who is NOT signed in — DEFECT 199.
 *
 * "No need to show this content for login user." The profile's closing band offers a
 * free account to everyone, member and visitor alike, because the page is prerendered
 * and its HTML cannot know who is reading it. So a member who signed up months ago was
 * still being asked to create a free account at the foot of every operator they opened.
 *
 * IT REUSES THE GATE'S OWN ANSWER RATHER THAN ASKING ANYTHING NEW. `locked` on
 * `/api/operators/<number>/figures` is precisely "this reader has no session" — the
 * same request the seven figure slots already share — so this costs no extra round trip
 * and cannot disagree with the locks on the same page.
 *
 * IT RENDERS NOTHING WHILE PENDING, and that direction is deliberate. Showing the band
 * and then removing it is the flicker defect 194 is about, one section further down;
 * withholding it for the few hundred milliseconds the shared fetch takes costs a
 * visitor nothing, because the band is at the very bottom of a long page.
 *
 * ON ERROR IT STAYS HIDDEN, for the same reason the figures fall back to an em dash: a
 * failed read is not evidence that the reader is signed out, and guessing wrong here
 * means nagging a paying member.
 */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const state = useContext(GateContext);
  if (state.status !== "ready" || !state.figures.locked) return null;
  return <>{children}</>;
}

/**
 * One withheld value, drawn the way the directory draws it.
 *
 * THE SAME TREATMENT AS THE LISTING TABLE (requested): a redacted bar with a lock
 * and a "Free account" link beside it, so the reader sees there IS a value and what
 * it costs to read it -- rather than a bar that only says something is missing. The
 * listing's own note explains why the bar and the link sit on ONE line there
 * (thirty stacked cells would double every row); the profile has at most four in a
 * column, but keeping the same line-up is what makes the two pages read as one
 * treatment.
 *
 * EVERY LINK CARRIES ITS OWN `aria-label` naming the field, for the same reason the
 * listing's does: several links reading "Free account" would be several identical
 * stops in a screen reader's link list.
 *
 * `from=operator-profile` is the profile's enumerated source value (section 9), and
 * the target is `/register` -- never `/pricing`.
 *
 * NOT FOR TABLE CELLS ANY MORE -- DEFECT 188. This is the treatment for the profile's
 * handful of individual figure slots, where each lock names a different field and a
 * link on each is a genuine offer at the point of interest. In a table it was repeated
 * ten times a page down two columns, saying the same six words in every cell; those use
 * `LockedCell` and `LockedColumnsNotice` instead. See the note on those two.
 */
export function LockedValue({ label, width }: { label: string; width: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-[7px]">
      <LockedBar width={width} />
      <Link
        href="/register?from=operator-profile"
        aria-label={`Create a free account to see the ${label.toLowerCase()}`}
        className="inline-flex shrink-0 items-center gap-[4px] whitespace-nowrap text-[11.5px] font-semibold text-mv-green-deep no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        <Lock aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.3} />
        Free account
      </Link>
    </span>
  );
}

/**
 * A withheld figure in a TABLE cell -- DEFECT 188.
 *
 * "instead of Free account on multiple time show one popup on table."
 *
 * The lease table and the county table each show ten rows with two withheld columns, so
 * `LockedValue` put twenty copies of the same "Free account" link on screen at once.
 * Twenty identical offers is not twenty times the offer; it reads as chrome printed
 * through the data, and it crowded the columns badly enough that the bars stopped
 * looking like values.
 *
 * The bar and the padlock stay, so what is withheld and where is still obvious at a
 * glance. The offer moves to `LockedColumnsNotice`, once, at the top of the table.
 *
 * THE LABEL IS STILL CARRIED and is what a screen reader now gets in the link's place:
 * "Oil produced -- locked" says which cell it is in, where twenty identical "Free
 * account" links said only that there were twenty of them.
 */
export function LockedCell({ label, width }: { label: string; width: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-[7px]">
      <span className="sr-only">{label} — locked</span>
      <LockedBar width={width} />
      <Lock
        aria-hidden="true"
        className="h-3 w-3 shrink-0 text-mv-muted"
        strokeWidth={2.3}
      />
    </span>
  );
}

/**
 * The one unlock prompt for a table -- DEFECT 188, and the other half of `LockedCell`.
 *
 * ABOVE THE ROWS, INSIDE THE CARD, so it is read before the locked columns rather than
 * found after scrolling past them -- which is what the per-cell links were for. `what`
 * names the columns, because a reader looking at a lease table and a county table on
 * the same page should not have to work out which one this belongs to.
 */
export function LockedColumnsNotice({ what }: { what: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-mv-line-soft bg-mv-tint px-[22px] py-[10px] max-[560px]:px-4">
      <p className="m-0 flex min-w-0 items-center gap-2 text-[12.5px] text-mv-green-deep">
        <Lock
          aria-hidden="true"
          className="h-[13px] w-[13px] shrink-0"
          strokeWidth={2.3}
        />
        <span className="min-w-0">{what} need a free account.</span>
      </p>
      <Link
        href="/register?from=operator-profile"
        className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-mv-green-deep underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
      >
        Create a free account →
      </Link>
    </div>
  );
}

/** Decorative -- the link or the `sr-only` label beside it carries the meaning. */
function LockedBar({ width }: { width: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[10px] rounded-full bg-[linear-gradient(90deg,var(--color-mv-line),var(--color-mv-line-soft))] align-middle blur-[2.5px] ${width}`}
    />
  );
}

/** The in-flight bar. Same footprint as the value it stands in for, so the row does
    not change height when the answer lands. */
function PendingBar({ width }: { width: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-[10px] animate-pulse rounded-full bg-mv-line-soft align-middle ${width}`}
    />
  );
}

/** Which field a slot reads. */
type Field = "oilProduced" | "gasProduced" | "oilPct" | "leases" | "counties";

/** How a field prints once unlocked, or null when the record does not carry it. */
function printed(figures: OperatorGatedFigures, field: Field): string | null {
  if (figures.locked) return null;
  switch (field) {
    case "oilProduced":
      return figures.oilProduced;
    case "gasProduced":
      return figures.gasProduced;
    // A whole percent, exactly as the server-rendered row printed it.
    case "oilPct":
      return figures.oilPct === null ? null : `${figures.oilPct}%`;
    // `toLocaleString` here rather than `formatCount`: that helper lives in
    // `operator-detail.ts`, which a client component must not import -- doing so
    // ships the fixture tables to the browser (its own note at `titleCase` says so).
    case "leases":
      return figures.leases === null
        ? null
        : figures.leases.toLocaleString("en-US");
    case "counties":
      return figures.counties === null ? null : String(figures.counties);
  }
}

/** The page's ordinary "not on the record" mark. */
const EM_DASH = "—";

/**
 * One gated slot.
 *
 * `label` names the field for the lock's `aria-label`; `width` sizes the bar so it
 * reads as the size of the number it stands in for rather than as a uniform smudge
 * -- wider for a volume than for a county count, the same rule the listing follows.
 */
export function GatedFigure({
  field,
  label,
  width = "w-[28px]",
}: {
  field: Field;
  label: string;
  width?: string;
}) {
  const state = useContext(GateContext);

  if (state.status === "pending") return <PendingBar width={width} />;

  // A failed read is not a lock. Telling a member to create an account they already
  // have would be worse than saying nothing, so this is the page's ordinary
  // "not on the record" em dash.
  if (state.status === "error") return <>{EM_DASH}</>;

  if (state.figures.locked) return <LockedValue label={label} width={width} />;

  return <>{printed(state.figures, field) ?? EM_DASH}</>;
}

/**
 * The hero pill variant.
 *
 * IT CARRIES THE REDACTED BAR, like every other locked slot on the page (requested).
 * An earlier pass drew these two as a lock beside the field name -- "Leases",
 * "Counties on record" -- on the reasoning that the panel a screen below already
 * makes the offer. That was wrong in the way that matters: a lock with no bar reads
 * as a section heading rather than as a value being withheld, so the pills looked
 * like navigation while every other gated slot looked like a redaction. The bar is
 * what tells a reader there IS a figure here.
 *
 * THE NOUN STAYS BESIDE THE BAR -- "____ leases", "____ counties on record" -- for
 * the reason the panel does not need it: these two pills sit side by side with
 * nothing else naming them, so a bare bar and a "Free account" link would render two
 * chips that are indistinguishable from each other.
 */
export function GatedPill({
  field,
  label,
  suffix,
}: {
  field: Field;
  label: string;
  /** Written after the value when it is readable: "10,324 leases". */
  suffix: string;
}) {
  const state = useContext(GateContext);

  const pillClass =
    "rounded-full border border-mv-line bg-white px-3 py-[6px] text-[12.5px] font-semibold text-mv-muted";

  if (state.status === "pending") {
    return (
      <li className={pillClass}>
        <PendingBar width="w-[64px]" />
      </li>
    );
  }

  // A pill is a summary of what is below, so it has nothing to say about a read
  // that failed. The panel row carries the em dash.
  if (state.status === "error") return null;

  if (state.figures.locked) {
    return (
      <li className={`${pillClass} inline-flex items-center gap-[7px]`}>
        <LockedBar width="w-[34px]" />
        {suffix}
        <Link
          href="/register?from=operator-profile"
          aria-label={`Create a free account to see the ${label.toLowerCase()}`}
          className="inline-flex shrink-0 items-center gap-[4px] whitespace-nowrap font-semibold text-mv-green-deep no-underline underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
        >
          <Lock aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.3} />
          Free account
        </Link>
      </li>
    );
  }

  const value = printed(state.figures, field);
  // A pill with no figure in it is a chip saying nothing -- dropped rather than
  // shown as "-- leases".
  if (value === null) return null;

  return (
    <li className={pillClass}>
      {value} {suffix}
    </li>
  );
}
