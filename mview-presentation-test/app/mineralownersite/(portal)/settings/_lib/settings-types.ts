/**
 * THE SHAPES THE SETTINGS PAGE IS BUILT FROM.
 *
 * NO JSX AND NO REACT IN THIS FOLDER — the same rule the leases module keeps.
 * A hint that needs two variants (claimed and unclaimed) is modelled as two
 * strings here and rendered as two gated spans by the component, rather than
 * as a node, so the data stays serialisable and diffable.
 */

/** The three places an alert can reach an owner. `inApp` always keeps history. */
export type AlertChannel = "email" | "push" | "inApp";

export const ALERT_CHANNELS: readonly AlertChannel[] = [
  "email",
  "push",
  "inApp",
];

/** What each channel is called on its chip. */
export const ALERT_CHANNEL_NAME: Record<AlertChannel, string> = {
  email: "Email",
  push: "Push",
  inApp: "In-app",
};

/**
 * ONE SWITCH ROW — a label, a line of explanation, and a starting position.
 *
 * `id` IS THE STATE KEY. It is what `SettingsStateProvider` stores the position
 * under and what "Use Recommended Settings" addresses a row by, so it has to be
 * stable and unique across the whole page — not just within its card.
 */
export interface ToggleSetting {
  id: string;
  label: string;
  /** The line under the label. Always present: a switch with no consequence
      stated is a switch nobody can make an informed choice about. */
  hint: string;
  /** What that line reads instead while no record is claimed. */
  unclaimedHint?: string;
  /** The position the page starts in. */
  on: boolean;
  /**
   * NOT BUILT YET — the row renders a "Future" tag where its switch would be,
   * because a switch that does nothing is worse than an honest label. The
   * design's own idiom.
   */
  future?: boolean;
  /** Turned on by "Use Recommended Settings". See the note in `settings-data`. */
  recommended?: boolean;
}

/** The starting position of one alert type across all three channels. */
export type ChannelSet = Record<AlertChannel, boolean>;

/**
 * ONE ALERT TYPE, and where it reaches you.
 *
 * The matrix, not a single switch: the design's position is that WHERE an alert
 * lands is a different question from WHETHER it fires, and collapsing the two
 * is how owners end up turning off a payment-gap alert to stop an email.
 */
export interface AlertPreference {
  id: string;
  label: string;
  hint: string;
  /** The design's `.anno` — an aside about the MODEL, not about the alert. */
  annotation?: string;
  channels: ChannelSet;
  recommended?: boolean;
}

/** One of the three quiet-week answers. */
export interface QuietWeekOption {
  id: string;
  label: string;
  /** Exactly one starts selected. */
  selected?: boolean;
}

/** A read-only label/value line — the Account card is five of them. */
export interface AccountRow {
  label: string;
  value: string;
  hint?: string;
  /** Rendered as a link rather than as text when set. */
  href?: string;
}
