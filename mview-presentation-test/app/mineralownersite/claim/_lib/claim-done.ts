/**
 * WHAT THE FLOW SAYS AFTER THE CLAIM IS WRITTEN.
 *
 * The completion screen has one job beyond congratulation: tell the owner what
 * happens NEXT, in a form they can act on. Three ordered actions, three things
 * that are now true, and the groups they were joined to — all fixtures, like
 * every other figure in this prototype.
 */

/**
 * THE CLAIM REFERENCE.
 *
 * A FIXTURE, DELIBERATELY, AND NOT GENERATED. A reference minted at render time
 * would change on every re-render and on every revisit, which is the opposite of
 * what a support reference is for — the screen tells the reader to keep it and
 * quote it. When this is wired to a real claim event the id comes back from the
 * server; until then a stable string is the honest stand-in.
 */
export const claimReference = "MV-CLM-260714-0031";

/**
 * Glyph keys. Kept as strings so this stays a plain `.ts` data module with no
 * React import — each component maps them to lucide components, the same way
 * `progress-rail.tsx` already does for the step icons.
 */
export type DoneIcon =
  | "record"
  | "leases"
  | "visible"
  | "groups"
  | "briefing"
  | "dashboard"
  | "stub"
  | "audit"
  | "county"
  | "operator"
  | "play";

/** The right rail's ordered next actions. */
export const nextActions = [
  {
    icon: "dashboard" as DoneIcon,
    title: "Open your dashboard",
    detail: "Your record fills it automatically",
  },
  {
    icon: "stub" as DoneIcon,
    title: "Upload a check stub",
    detail: "It makes your numbers exact instead of modeled",
  },
  {
    icon: "audit" as DoneIcon,
    title: "Run your first Lease Audit",
    detail: "See whether production and payments line up",
  },
] as const;

export interface OwnerGroup {
  icon: DoneIcon;
  name: string;
  /** Private groups are matched to the owner's own leases. */
  visibility: "Private" | "Public";
  blurb: string;
}

/**
 * THE FOUR GROUPS THE RECORD IS AUTO-JOINED TO — one per axis the match runs
 * on: the lease, the county, the operator, and the play.
 *
 * THE PLAY IS THE EAGLE FORD and not the design's Haynesville/Bossier. The mock
 * pairs that play with "your Cass County acreage", but the record this flow
 * claims is in BEE county, and Bee is Eagle Ford country. Copying the mock
 * verbatim would have put a card on screen naming a play and a county that do
 * not belong to the record described six inches above it.
 */
export const ownerGroups: OwnerGroup[] = [
  {
    icon: "groups",
    name: "Smith Gas Unit — Owners",
    visibility: "Private",
    blurb:
      "Matched owners of the Smith Gas Unit leases only. Advisor reps labeled. No operators — ever. Share audits, split professional review costs.",
  },
  {
    icon: "county",
    name: "Bee County Owners",
    visibility: "Public",
    blurb:
      "County-wide activity talk: permits, completions, who's drilling where.",
  },
  {
    icon: "operator",
    name: "Bluestem Oil and Gas — Owner Community",
    visibility: "Public",
    blurb:
      "Owners under Bluestem-operated units comparing notes on statements and pace.",
  },
  {
    icon: "play",
    name: "Eagle Ford Play",
    visibility: "Public",
    blurb:
      "The big-picture room for your Bee County acreage: rig moves, gas price talk, play-wide trends.",
  },
];
