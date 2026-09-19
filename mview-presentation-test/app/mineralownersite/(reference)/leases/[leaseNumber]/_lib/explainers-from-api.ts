import type {
  WireExplainer,
  WireExplainerBullet,
  WireExplainerChart,
  WireExplainers,
  WireExplainerSection,
} from "../../_api/leases-api";
import type { ExplainerChart } from "../_components/explainer-chart";
import type {
  Explainer,
  ExplainerBullet,
  ExplainerSection,
  ExplainerTone,
} from "../_components/explainer-drawer";

/**
 * THE DRAWERS, AS THE SERVICE WRITES THEM.
 *
 * ── WHAT THIS REPLACES ──
 *
 * `explainers-lease.ts` and its two siblings compose these panels in the
 * browser: the sentences are written here and the figures are interpolated from
 * the report. That works, and it was the only option while the service sent
 * figures and no prose. It sends both now, and the two were drifting — the same
 * rule this module has hit repeatedly, that binding the numbers and writing the
 * words locally leaves a page quietly contradicting its own source.
 *
 * ── A TRANSCRIPTION, NOT A TRANSLATION ──
 *
 * `tone`, `title`, `subtitle`, `stats`, `sections`, `whatToDo`, `tags` and
 * `footnote` arrive under the drawer's own field names. Only two things are
 * decided here:
 *
 *   `tone`   checked against the four the drawer knows, because an unrecognised
 *            one would put a class on the rule that `dashboard-reference.css`
 *            does not define — an invisible heading rather than a wrong colour.
 *
 *   empties  a section with nothing in it at all is dropped rather than
 *            rendered as a gap with a rule over it.
 *
 * ── EVERY FIELD, NOT THE OBVIOUS ONES ──
 *
 * A section is `heading` plus EITHER a `body` paragraph OR `bullets`, and it
 * can carry an `aside` — the small note on the heading, "154 posted months".
 * The third section of every panel is the bullets one, so reading only
 * `heading` and `body` printed "What this is built on" as an empty box with a
 * rule over it.
 *
 * Bullets come both as plain strings and as `{lead, text, tail}` for the rows
 * that quote the record, which is `ExplainerBullet` exactly.
 *
 * `charts` rides on the entries that have a trend behind them — the valuation
 * panel sends two — and its fields are `ExplainerChart`'s, tone included.
 */

const TONES: ExplainerTone[] = ["money", "activity", "models", "record"];

function toneOf(value: string | undefined): ExplainerTone {
  return TONES.includes(value as ExplainerTone)
    ? (value as ExplainerTone)
    : /* The neutral one. A panel whose tone the service names in a way this
         build does not know is still worth reading; guessing "money" would
         paint a modelled remainder as cash somebody has been paid. */
      "record";
}

function text(value: string | undefined): string {
  return typeof value === "string" ? value : "";
}

/** "gas" | "oil" | "cash". Anything else is not drawn rather than mis-coloured. */
function chartOf(wire: WireExplainerChart): ExplainerChart | null {
  const tone = wire.tone;
  if (tone !== "gas" && tone !== "oil" && tone !== "cash") return null;

  const values = wire.values ?? [];
  const labels = wire.labels ?? [];
  /* A trend with no points, or with more labels than readings, is not a
     picture of anything — the chart plots by index and would run off its own
     axis. */
  if (values.length === 0 || labels.length !== values.length) return null;

  return {
    title: text(wire.title),
    window: text(wire.window),
    labels,
    values,
    unit: text(wire.unit),
    tone,
    footnote: text(wire.footnote) || undefined,
  };
}

/** A string, or the lead/tail form for rows that quote the record. */
function bulletOf(wire: WireExplainerBullet): ExplainerBullet | null {
  if (typeof wire === "string") return wire || null;
  if (!text(wire.text)) return null;
  return {
    lead: wire.lead ?? undefined,
    text: text(wire.text),
    tail: wire.tail ?? undefined,
  };
}

function sectionOf(wire: WireExplainerSection): ExplainerSection | null {
  const bullets = (wire.bullets ?? [])
    .map(bulletOf)
    .filter((bullet): bullet is ExplainerBullet => bullet !== null);

  const body = text(wire.body);
  /* NOTHING AT ALL, not "no body" — a section whose content is its bullets is
     the common case, and testing only the paragraph is what rendered the third
     section of every panel as an empty box. */
  if (!text(wire.heading) && !body && bullets.length === 0) return null;

  return {
    heading: text(wire.heading),
    body: body || undefined,
    bullets: bullets.length ? bullets : undefined,
    aside: text(wire.aside) || undefined,
  };
}

function one(wire: WireExplainer): Explainer {
  const charts = (wire.charts ?? [])
    .map(chartOf)
    .filter((chart): chart is ExplainerChart => chart !== null);

  return {
    tone: toneOf(wire.tone),
    title: text(wire.title),
    subtitle: text(wire.subtitle),

    stats: (wire.stats ?? [])
      .filter((stat) => text(stat.label) || text(stat.value))
      .map((stat) => ({
        label: text(stat.label),
        value: text(stat.value),
        sub: stat.sub ?? undefined,
      })),

    sections: (wire.sections ?? [])
      .map(sectionOf)
      .filter((section): section is ExplainerSection => section !== null),

    charts: charts.length ? charts : undefined,
    whatToDo: text(wire.whatToDo),
    tags: wire.tags?.length ? wire.tags : undefined,
    footnote: text(wire.footnote) || undefined,
  };
}

/**
 * Every panel this tab has, by the key a tile names.
 *
 * FIRST ONE WINS ON A REPEATED KEY. The reservoir tab returns its six keys
 * nine times over for a lease with one rock — the entries differ, and nothing
 * in the payload says which rock any of them is about, so there is no basis for
 * choosing between them. Taking the first is the only rule that is stable
 * between reads; picking at random would change the drawer on refresh.
 */
export function explainersFromApi(
  wire: WireExplainers,
): Map<string, Explainer> {
  const byKey = new Map<string, Explainer>();

  for (const entry of wire.explainers ?? []) {
    const key = text(entry.key);
    /* A panel with no key cannot be opened by anything, so it is not kept. */
    if (!key || byKey.has(key)) continue;
    byKey.set(key, one(entry));
  }

  return byKey;
}
