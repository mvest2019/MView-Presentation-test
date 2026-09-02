import type { ReactNode } from "react";

import type { PortalIconName } from "../../_lib/portal-nav";

/**
 * THE SHAPE OF ONE ALERT — the five axes the design actually distinguishes.
 *
 * Four of them look similar on screen and mean completely different things, so
 * they are four fields rather than one "kind". Collapsing any pair loses a
 * decision the design made:
 *
 *   `category`   WHAT IT IS ABOUT. Money · Activity · Community · Models. This
 *                is the axis the filter row filters on, and the only one the
 *                reader chooses between.
 *
 *   `severity`   HOW LOUD IT IS, as TEXT. "Action recommended" / "Important" /
 *                nothing. V40-AL-SEV: the tag carries a colour AND the words,
 *                never colour alone, because a colour-blind reader must be able
 *                to sort the inbox too.
 *
 *   `deliveryClass`  WHICH RAIL IT TRAVELS ON — and therefore what the owner can
 *                turn off in Settings. Urgent reaches every enabled channel;
 *                Important digest can roll up weekly; Educational never asks
 *                anything; Community is one group; Record update fires about
 *                once a year. This is `Professional`-tier detail.
 *
 *   `unread`     WHETHER THEY HAVE SEEN IT. The green left rule and the sidebar
 *                badge, and the only one "Mark all read" touches.
 *
 * `actionRecommended` is DERIVED, not stored — see `alert-counts.ts`. It is
 * `severity === "action"`, and the ledger's "one asks something of you" figure
 * counts exactly those rows. Storing it twice is what BG-03 was about.
 */

/** The filter row's four buckets, plus `all`. */
export type AlertCategory = "money" | "activity" | "community" | "model";

/** The severity tag, when a row carries one. Most rows do not. */
export type AlertSeverity = "action" | "important";

/** The delivery class — the taxonomy tuned per-channel in Settings. */
export type AlertDeliveryClass =
  | "urgent"
  | "digest"
  | "educational"
  | "community"
  | "record";

/** The icon box's three tints — `.al-ico`, `.al-ico.gold`, `.al-ico.blue`. */
export type AlertIconTone = "mint" | "gold" | "blue";

/**
 * One button under an alert.
 *
 * `href` absent means the destination is not built. The row then renders the
 * portal's acknowledgement idiom rather than a link into a 404 — see
 * `_components/ui/prototype-button.tsx` for why that beats a greyed-out label.
 */
export interface AlertAction {
  label: string;
  href?: string;
  variant?: "primary" | "ghost";
  /** What the button says once pressed, for the unbuilt ones. */
  acknowledgement?: string;
  /**
   * A one-way dismissal, for the records-refresh row's "Not mine". Distinct
   * from `acknowledgement` because the design words it as a promise about
   * FUTURE alerts ("quiet until the next records refresh"), not as a receipt.
   */
  dismissal?: string;
}

/**
 * THE EXPLAINER BEHIND A ROW — v34's four headings, in the design's own order.
 *
 * The reference opens these in a right-side drawer on row click, and its note
 * on why is the important part: "Explanation is the default; navigation is the
 * choice." The owner should be able to understand an alert without leaving the
 * inbox, and `openHref` is offered afterwards as optional.
 *
 * This build renders the same four sections inline, in the row's own
 * `<details>` — see `_components/alert-explainer.tsx` for why an expander
 * rather than a drawer.
 */
export interface AlertExplainer {
  /** The drawer's title, minus the glyph the icon box already carries. */
  title: string;
  /** The provenance line — "Alert explainer · Ledbetter (74318) · …". */
  subtitle: string;
  what: ReactNode;
  means: ReactNode;
  /** The bullet list. A node, because every item carries emphasis. */
  evidence: ReactNode;
  next: ReactNode;
  /** The optional deeper view, and its own wording. */
  openHref?: { href: string; label: string };
  /** The closing caveat, when the design gives one. */
  foot?: ReactNode;
}

export interface AlertRecord {
  /** Stable, and the reference's own drawer key without the `ax` prefix. */
  id: string;
  category: AlertCategory;
  severity?: AlertSeverity;
  deliveryClass: AlertDeliveryClass;
  unread: boolean;

  icon: PortalIconName;
  iconTone: AlertIconTone;
  /** The icon box's `title` — what the glyph stands for, in words. */
  iconLabel: string;

  /** Plain text. The row's own heading, after the severity tag. */
  headline: string;
  /** The one-line summary. A node because the emphasis is the design's. */
  detail: ReactNode;
  /** "Jul 04 · email + push" — the event date and the channels it used. */
  meta: string;
  /** The `why?` gloss: the reason this alert reached this reader. */
  why: string;
  /**
   * A blue "we do not have this yet" chip, when the row promises something the
   * data cannot deliver — the design's own honesty label.
   */
  buildNote?: string;

  actions: AlertAction[];
  explainer?: AlertExplainer;

  /**
   * WHAT THE SEARCH BOX MATCHES — and deliberately not a copy of `detail`.
   *
   * The reference searches `row.textContent`, which it can because its rows are
   * strings in a document. `detail` here is a React node, so there is no text to
   * read at render time without walking the tree.
   *
   * Rather than duplicate the prose, this field is the search INDEX the
   * placeholder actually promises — "lease, operator, county, or any word" —
   * which means the entities a reader would type. Several of them (the lease
   * number, the operator, the county) are not in the visible sentence at all, so
   * this is strictly more searchable than `textContent` was, and it stays
   * honest: `headline` and `meta` are matched from the record itself.
   */
  keywords: string;
}
