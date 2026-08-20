import "server-only";

import { unstable_cache } from "next/cache";

import type { ChangeRow } from "./operator-detail-data";

/**
 * The "What changed" wording step, running on this app's server.
 *
 * WHY THIS FILE EXISTS AT ALL — THE DEPLOYMENT LIMIT IT WORKS AROUND. The analysis
 * service is a local Python process on `127.0.0.1:8733` that needs MongoDB. Vercel
 * cannot host it: there is no Python process in a Next.js deployment, and on Vercel
 * `127.0.0.1` is the serverless function's own loopback, not a developer's laptop. So
 * `mv/gemini_api.py` — and the key pasted into it — never executes in a Vercel build.
 * Filling that constant in cannot make a deployed page use Gemini.
 *
 * WHAT SPLITS, AND WHAT DOES NOT. The panel is two jobs, and only one of them needs
 * Mongo:
 *
 *   measured findings  ← the service. Reads five collections, computes the changes,
 *                        ranks them. Cannot move; the data lives there.
 *   the wording        ← a single HTTPS call to a model. Needs no database, so it can
 *                        run anywhere — including here, on Vercel, where an
 *                        environment variable is a thing that exists.
 *
 * So the wording step moves into this app and the key becomes `GEMINI_API_KEY` in the
 * Vercel project. The service keeps its own provider path untouched for local runs; if
 * it already had a model write the rows, this does not run.
 *
 * THE KEY CANNOT REACH THE BROWSER. `server-only` above means a client component that
 * imports this file fails the build. The key is read from `process.env` inside a
 * function — never at module scope into an exported constant — and it is not
 * `NEXT_PUBLIC_`, so it is not in the client bundle, not in the rendered HTML, and not
 * in any response this app sends: the browser receives the finished rows and nothing
 * else. Nothing here logs it, and the only text put into an error is Google's own.
 *
 * THE GUARANTEES ARE THE SERVICE'S, PORTED EXACTLY. The prompt, the balanced-array
 * extraction, the numeric guard and the fall back to measured wording are the same
 * rules as `mv/summarize.py`, because moving where the call happens must not change
 * what the panel is allowed to say. `kind`, `source` and `evidence` are carried across
 * from the measured row and never read from the model, and a row quoting a figure that
 * was not in its input is rejected outright. The model can change how a finding reads
 * and nothing about what it says.
 *
 * IT NEVER THROWS. Every failure — no key, a 403, a timeout, a malformed body, an
 * invented number — returns the measured rows with a note. A wording step that can
 * take the panel down would be a worse panel than a plain-spoken one.
 */

/** The pool of figures a row may quote. Ported from `summarize._NUM`. */
const NUMBER_PATTERN = /\d[\d,]*\.?\d*/g;

/** Current as of writing; the 2.5 family 404s for recently created projects. */
const DEFAULT_MODEL = "gemini-3.5-flash";
const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/** Low, because this is a rewrite of supplied facts, not a creative task. */
const TEMPERATURE = 0.2;
const MAX_OUTPUT_TOKENS = 4096;

/**
 * Kept well inside a serverless function's ceiling. The panel is lazy-loaded, so this
 * delays one section — but a request that outlives the function is a 504 for the whole
 * route, and the measured wording is right there for the asking.
 */
const CALL_TIMEOUT_MS = 25_000;

/** One retry, matching the service's `summarizer.retries` default. */
const ATTEMPTS = 2;

/** Production posts monthly. Identical findings do not need re-phrasing every hour. */
const REVALIDATE_SECONDS = 3_600;

/** The measured facts the prompt is allowed to state, and the guard draws numbers from. */
export interface RewriteFacts {
  operatorName: string;
  operatorNumber: string;
  asOfLabel: string;
  activityDays: number;
}

export interface Rewrite {
  /** Model-phrased rows on a clean run; the measured rows it was given otherwise. */
  rows: ChangeRow[];
  /** True only when every row on screen was phrased by the model. */
  byModel: boolean;
  /** Why the model did not write, when it did not. Empty on a clean run. */
  note: string;
}

function envText(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * The key, read at call time.
 *
 * NOT A MODULE CONSTANT. A top-level `const KEY = process.env...` is inlined at build
 * time, which on Vercel means the value baked into the build rather than the one
 * configured now — and it makes the key a value the bundler has seen. Reading it inside
 * a function keeps it a runtime lookup on the server.
 */
function geminiKey(): string {
  return envText("GEMINI_API_KEY");
}

/**
 * Which provider writes the wording here, from `AI_PROVIDER`.
 *
 * UNSET MEANS "NOT THIS APP'S JOB", which is what every existing install wants: the
 * service picks its own provider and this step stays out of the way. Only an explicit
 * `AI_PROVIDER=gemini` turns it on, so adding this file changes nothing until the
 * deployment asks for it.
 *
 * `claude` AND `claude-cli` ARE DELIBERATELY NOT HANDLED HERE. The CLI is a local
 * process and cannot exist in a serverless function, and the Messages API path already
 * lives in the service. Silently answering a request for one provider with another is
 * how a deployment ends up billing a vendor nobody chose.
 */
function providerName(): string {
  return envText("AI_PROVIDER").toLowerCase();
}

/** Every number in a string, normalised so `1,234` and `1234` compare equal. */
function numericTokens(value: string): Set<string> {
  const found = new Set<string>();
  // A fresh regex per call: a shared /g pattern carries `lastIndex` between calls.
  const pattern = new RegExp(NUMBER_PATTERN.source, "g");
  let match = pattern.exec(value);
  while (match !== null) {
    const token = match[0].replace(/,/g, "").replace(/\.+$/, "");
    if (token !== "") {
      found.add(token);
      if (token.endsWith(".0")) found.add(token.slice(0, -2));
      const dot = token.indexOf(".");
      if (dot >= 0) found.add(token.slice(0, dot));
    }
    match = pattern.exec(value);
  }
  return found;
}

/**
 * The pool a model output may draw numbers from.
 *
 * NARROWER THAN THE SERVICE'S, ON PURPOSE. `summarize._allowed_numbers` pools every
 * number in the whole facts blob, most of which the prompt never shows. This pools the
 * numbers the prompt actually contains — the findings plus the operator, the as-of
 * month and the window. A tighter pool can only reject more, never admit a figure that
 * was not on offer, so the guarantee moves the safe way.
 */
function allowedNumbers(rows: ChangeRow[], facts: RewriteFacts): Set<string> {
  const allowed = new Set<string>();
  const absorb = (value: string) => {
    for (const token of numericTokens(value)) allowed.add(token);
  };

  for (const row of rows) {
    absorb(row.headline);
    absorb(row.detail);
    absorb(row.source);
  }
  absorb(JSON.stringify(facts));

  // Rounding a supplied figure is the one liberty allowed: 12.24 -> 12.2 -> 12.
  for (const token of Array.from(allowed)) {
    const dot = token.indexOf(".");
    if (dot < 0) continue;
    allowed.add(token.slice(0, dot));
    if (token.length - dot - 1 > 1) {
      const value = Number(token);
      if (Number.isFinite(value)) allowed.add(value.toFixed(1));
    }
  }

  // Month and point ordinals in prose.
  for (let n = 0; n <= 12; n += 1) allowed.add(String(n));
  return allowed;
}

/** The service's prompt, word for word, so the wording does not drift by environment. */
function buildPrompt(rows: ChangeRow[], facts: RewriteFacts): string {
  const lines = [
    'You are writing the "What changed" panel on a Texas oil and gas operator page.',
    "The reader is a mineral owner or a land professional. Plain English, no jargon,",
    "no hedging, no marketing tone.",
    "",
    `OPERATOR: ${facts.operatorName} (RRC operator number ${facts.operatorNumber})`,
    `DATA AS OF: ${facts.asOfLabel}. This is the newest complete month on record, not today.`,
    `ACTIVITY WINDOW: last ${facts.activityDays} days of filings.`,
    "",
    `Below are ${rows.length} measured findings, already ranked. Rewrite each ONE as a single`,
    "sentence. Keep the order. Do not merge, drop, add, or reorder them.",
    "",
    "HARD RULES",
    "  1. Use ONLY the numbers given. Do not compute, round, combine or infer any new",
    "     figure. If a number is not written below, it may not appear in your output.",
    "  2. No adjectives that are not supported: no 'strong', 'impressive', 'concerning'.",
    "  3. Say what changed and by how much. If nothing changed, say that plainly - a",
    "     quiet quarter is a real finding and must not be dressed up as movement.",
    "  4. Each sentence is at most 30 words.",
    "  5. 'bold' is the 3-8 word claim shown in bold at the start. 'rest' continues the",
    "     sentence after it and must read as one sentence with it. 'rest' may be empty.",
    "",
    "OUTPUT",
    `  A JSON array of exactly ${rows.length} objects, in the given order, each with keys`,
    '  "bold" and "rest". No markdown, no code fence, no commentary. JSON only.',
    "",
    "FINDINGS",
  ];
  rows.forEach((row, index) => {
    lines.push(`${index + 1}. [${row.kind}] ${row.headline} - ${row.detail}`);
  });
  return lines.join("\n");
}

/** The first balanced `[...]` in the output. Survives a stray preamble or code fence. */
function extractJsonArray(raw: string): unknown {
  const start = raw.indexOf("[");
  if (start < 0) throw new Error("no JSON array in model output");

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(raw.slice(start, i + 1));
    }
  }
  throw new Error("unbalanced JSON array in model output");
}

/**
 * The model's wording onto the measured rows, or an error.
 *
 * ONLY `headline` AND `detail` COME FROM THE MODEL. `kind`, `source` and `evidence` are
 * spread from the row that was measured, so the direction arrow, the attribution line
 * and the expandable working cannot be influenced by what the model wrote.
 */
function validate(
  parsed: unknown,
  rows: ChangeRow[],
  facts: RewriteFacts,
): ChangeRow[] {
  if (!Array.isArray(parsed)) throw new Error("model output is not a list");
  if (parsed.length !== rows.length) {
    throw new Error(
      `model returned ${parsed.length} points, expected ${rows.length}`,
    );
  }

  const allowed = allowedNumbers(rows, facts);

  return parsed.map((entry, index) => {
    if (entry === null || typeof entry !== "object") {
      throw new Error(`point ${index + 1} is not an object`);
    }
    const record = entry as Record<string, unknown>;
    const bold = String(record.bold ?? "").trim();
    const rest = String(record.rest ?? "").trim();

    if (bold === "") {
      throw new Error(`point ${index + 1} has an empty bold claim`);
    }
    // The bold lead is a short claim, not the sentence. A model that bolds the whole
    // sentence produces six rows of solid bold, which renders as a wall.
    const boldWords = bold.split(/\s+/).length;
    if (boldWords > 9) {
      throw new Error(
        `point ${index + 1} bolds ${boldWords} words - the lead must be a short claim`,
      );
    }
    if (`${bold} ${rest}`.trim().split(/\s+/).length > 45) {
      throw new Error(`point ${index + 1} is over length`);
    }

    const invented = Array.from(numericTokens(`${bold} ${rest}`)).filter(
      (token) => !allowed.has(token),
    );
    if (invented.length > 0) {
      throw new Error(
        `point ${index + 1} invents figure(s) not in the data: ` +
          invented.sort().slice(0, 5).join(", "),
      );
    }

    return { ...rows[index], headline: bold, detail: rest };
  });
}

/**
 * One call to Gemini. Returns the model's text, or throws with something readable.
 *
 * THE KEY GOES IN A HEADER, NOT THE QUERY STRING. Gemini accepts `?key=`, and that is
 * how most examples show it, but a key in a URL lands in proxy logs, platform access
 * logs and crash reports. `x-goog-api-key` does not.
 */
async function callGemini(prompt: string): Promise<string> {
  const key = geminiKey();
  if (key === "") {
    throw new Error("GEMINI_API_KEY is not set on this deployment");
  }

  const model = envText("GEMINI_MODEL") || DEFAULT_MODEL;
  const base =
    envText("GEMINI_BASE_URL").replace(/\/+$/, "") || DEFAULT_BASE_URL;

  const response = await fetch(`${base}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        // Asks Gemini for JSON rather than hoping for it. `extractJsonArray` still
        // runs, because "asks for" is not "guarantees".
        responseMimeType: "application/json",
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
  });

  const payload: unknown = await response.json().catch(() => null);
  const body = (payload ?? {}) as Record<string, unknown>;

  if (!response.ok) {
    // Google's own message, which names the real problem — a denied project, a model
    // that does not exist for this key — far better than the status alone.
    const error = (body.error ?? {}) as Record<string, unknown>;
    const detail =
      typeof error.message === "string" && error.message.trim() !== ""
        ? error.message.trim()
        : `Gemini HTTP ${response.status}`;
    throw new Error(`Gemini HTTP ${response.status}: ${detail}`);
  }

  // A prompt refused outright reports no candidates but does say why.
  const feedback = (body.promptFeedback ?? {}) as Record<string, unknown>;
  if (typeof feedback.blockReason === "string" && feedback.blockReason !== "") {
    throw new Error(`Gemini blocked the prompt: ${feedback.blockReason}`);
  }

  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  if (candidates.length === 0) {
    throw new Error("Gemini returned no candidates");
  }

  const candidate = (candidates[0] ?? {}) as Record<string, unknown>;
  const finish =
    typeof candidate.finishReason === "string" ? candidate.finishReason : "";
  if (finish !== "" && finish !== "STOP" && finish !== "MAX_TOKENS") {
    throw new Error(`Gemini stopped early: ${finish}`);
  }

  const content = (candidate.content ?? {}) as Record<string, unknown>;
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const written = parts
    .map((part) => {
      const value = (part ?? {}) as Record<string, unknown>;
      return typeof value.text === "string" ? value.text : "";
    })
    .join("")
    .trim();

  if (written === "") throw new Error("Gemini returned empty text");
  return written;
}

/**
 * `callGemini`, cached on the prompt.
 *
 * WHY THIS IS CACHED AND THE SERVICE CALL IS NOT ENOUGH. The upstream panel read is
 * already cached, so on a cache hit the findings cost nothing — and re-phrasing
 * identical findings on every request would put a paid, multi-second HTTPS call in
 * front of a section that otherwise serves instantly. The prompt is a pure function of
 * the findings, so the same findings reuse the same wording and a genuinely new month
 * gets a new key on its own.
 *
 * A THROW IS NOT CACHED, which is the behaviour worth having: a 403 or a timeout is
 * retried on the next request rather than pinned for an hour.
 */
const cachedGemini = unstable_cache(
  async (_operatorNumber: string, prompt: string) => callGemini(prompt),
  ["what-changed-ai", "gemini", "v1"],
  { revalidate: REVALIDATE_SECONDS, tags: ["what-changed-ai"] },
);

/**
 * Measured rows in, model-phrased rows out — or the measured rows back, with a reason.
 *
 * Never throws. See the note on this module: the wording is the one part of this panel
 * that is allowed to be missing, because the measured sentences are already complete
 * and correct.
 */
export async function rewriteWording(
  rows: ChangeRow[],
  facts: RewriteFacts,
): Promise<Rewrite> {
  const provider = providerName();

  if (provider === "" || provider === "none" || provider === "off") {
    return { rows, byModel: false, note: "" };
  }
  if (provider !== "gemini") {
    return {
      rows,
      byModel: false,
      note:
        `AI_PROVIDER=${provider} is written by the analysis service, not by this ` +
        "app; set AI_PROVIDER=gemini here to phrase the wording on the server",
    };
  }
  if (geminiKey() === "") {
    return {
      rows,
      byModel: false,
      note: "AI_PROVIDER=gemini is selected but GEMINI_API_KEY is not set on this deployment",
    };
  }
  if (rows.length === 0) return { rows, byModel: false, note: "" };

  const prompt = buildPrompt(rows, facts);
  let last = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      // The retry deliberately bypasses the cache. Validation is deterministic, so a
      // cached body that failed the guard would fail it again — the only retry worth
      // making is a fresh call.
      const raw =
        attempt === 1
          ? await cachedGemini(facts.operatorNumber, prompt)
          : await callGemini(prompt);
      return {
        rows: validate(extractJsonArray(raw), rows, facts),
        byModel: true,
        note: "",
      };
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
  }

  return { rows, byModel: false, note: last };
}
