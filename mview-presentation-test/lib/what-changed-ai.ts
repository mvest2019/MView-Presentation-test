import "server-only";

import Anthropic from "@anthropic-ai/sdk";
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
 * So the wording step moves into this app and the key becomes `AI_SUMMARY_KEY` in the
 * Vercel project. The service keeps its own provider path untouched for local runs; if
 * it already had a model write the rows, this does not run.
 *
 * CLAUDE WRITES IT BY DEFAULT. `AI_PROVIDER` picks the vendor when it is set; when it
 * is not, a present key means Claude, so one variable is the whole configuration.
 * Gemini remains available for `AI_PROVIDER=gemini`.
 *
 * FRESH ON EVERY RENDER, by default. The wording is not reused between requests, so
 * refreshing the page gives differently-phrased rows over the same measured figures —
 * at the cost of one model call per render of this section. See `cacheSeconds`.
 *
 * THE KEY CANNOT REACH THE BROWSER. `server-only` above means a client component that
 * imports this file fails the build. The key is read from `process.env` inside a
 * function — never at module scope into an exported constant — and it is not
 * `NEXT_PUBLIC_`, so it is not in the client bundle, not in the rendered HTML, and not
 * in any response this app sends: the browser receives the finished rows and nothing
 * else. Nothing here logs it, and the only text put into an error is Google's own.
 *
 * THE GUARANTEES ARE THE SERVICE'S, PORTED EXACTLY, AND THEY DO NOT DEPEND ON THE
 * VENDOR. The prompt, the balanced-array extraction, the numeric guard and the fall
 * back to measured wording are the same rules as `mv/summarize.py`, and both providers
 * go through them — so switching vendor changes who phrases the rows and nothing about
 * what they are allowed to say. `kind`, `source` and `evidence` are carried across
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

/**
 * The Claude model the wording is written by.
 *
 * Overridable with `AI_SUMMARY_MODEL` for a deliberate change; not something to lower
 * casually, since this text is what a mineral owner reads.
 */
const DEFAULT_CLAUDE_MODEL = "claude-opus-5";

/**
 * The Gemini model, matched to the one the map pages already call successfully.
 *
 * `lib/ai-summary.ts` defaults to `gemini-3.6-flash` and the deployment's key works
 * against it. This file defaulted to `gemini-3.5-flash`, which is the call that came
 * back 403 PERMISSION_DENIED — the same key, a model the project is not enabled for.
 * Two files asking the same key for two different models is how one of them ends up
 * being the only one that fails.
 */
const DEFAULT_MODEL = "gemini-3.6-flash";
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
  /**
   * WHICH vendor phrased them — `claude` or `gemini` — and "" when none did.
   *
   * Reported rather than assumed, because the panel's badge and its `writer` field
   * say who wrote the wording. Hardcoding one vendor there meant a Claude-written
   * panel reporting itself as Gemini.
   */
  provider: string;
  /** Why the model did not write, when it did not. Empty on a clean run. */
  note: string;
}

function envText(name: string): string {
  return (process.env[name] ?? "").trim();
}

/**
 * The API key, read at call time.
 *
 * `AI_SUMMARY_KEY` IS THE NAME TO SET, and it is read first because it is the variable
 * that exists on the deployment. One name serves both providers: which vendor it
 * belongs to is `AI_PROVIDER`'s job, not the key name's. The provider-specific names
 * are still honoured so an existing local `.env.local` keeps working.
 *
 * NOT A MODULE CONSTANT. A top-level `const KEY = process.env...` is inlined at build
 * time, which on Vercel means the value baked into the build rather than the one
 * configured now — and it makes the key a value the bundler has seen. Reading it inside
 * a function keeps it a runtime lookup on the server.
 */
function aiKey(): string {
  return (
    envText("AI_SUMMARY_KEY") ||
    envText("ANTHROPIC_API_KEY") ||
    envText("GEMINI_API_KEY")
  );
}

/**
 * Which provider writes the wording here.
 *
 * `AI_SUMMARY_PROVIDER` IS READ TOO, because that is the name the map pages' summary
 * already uses (`lib/ai-summary.ts`) and one deployment should not need two variables
 * meaning the same thing. `AI_PROVIDER` still wins where it is set, so an existing
 * `.env.local` keeps working.
 *
 * THE DEFAULT IS INFERRED FROM THE KEY, NOT FIXED. This defaulted to Claude, and the
 * deployment holds a Google key under `AI_SUMMARY_KEY` — so every wording call went to
 * Anthropic carrying a Gemini key and came back 401, which reads on the page as "the
 * model did not write this" with no hint as to why. Anthropic keys are documented to
 * begin `sk-ant-`; anything else with a key present is Gemini, which is also what the
 * map's summary defaults to. Explicit configuration still overrides both.
 *
 * `claude-cli` IS DELIBERATELY NOT HANDLED. It shells out to a local binary, which
 * cannot exist in a serverless function. Answering a request for one provider with
 * another is how a deployment ends up billing a vendor nobody chose, so an unsupported
 * value is reported rather than substituted.
 */
function providerName(): string {
  const explicit = (
    envText("AI_PROVIDER") || envText("AI_SUMMARY_PROVIDER")
  ).toLowerCase();
  if (explicit !== "") return explicit;

  const key = aiKey();
  if (key === "") return "";
  return key.startsWith("sk-ant-") ? "claude" : "gemini";
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
 * One call to Claude, through the official SDK.
 *
 * THE MODEL IS `claude-opus-5` and effort is `low`. This is a rewrite of supplied
 * facts, not a reasoning task: low effort is the documented setting for simple work and
 * keeps the per-render cost down, while thinking stays on — disabling it on this model
 * has two known failure modes, one of which writes into the visible text.
 *
 * NO TEMPERATURE. Sampling parameters are rejected on this model family; determinism
 * comes from the prompt and from the numeric guard, not from a temperature of zero.
 *
 * THE SDK, NOT `fetch`. It carries the auth header, the API version, typed errors and
 * retry/timeout handling, so none of that is reimplemented here.
 */
async function callClaude(prompt: string): Promise<string> {
  const apiKey = aiKey();
  if (apiKey === "") {
    throw new Error("AI_SUMMARY_KEY is not set on this deployment");
  }

  const client = new Anthropic({
    apiKey,
    // Kept well inside a serverless function's ceiling, and the SDK's own retries
    // are bounded so one slow call cannot outlive the request.
    timeout: CALL_TIMEOUT_MS,
    maxRetries: 1,
  });

  try {
    const message = await client.messages.create({
      model: envText("AI_SUMMARY_MODEL") || DEFAULT_CLAUDE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });

    // A safety decline is not an outage: it lands on the measured wording like any
    // other failure, but it says so rather than reading as a timeout.
    if (message.stop_reason === "refusal") {
      throw new Error(
        `Claude declined the prompt (${message.stop_details?.category ?? "unspecified"})`,
      );
    }

    const written = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (written === "") throw new Error("Claude returned empty text");
    return written;
  } catch (error) {
    // Typed classes, most specific first — a rate limit and a bad key need different
    // answers, and string-matching the message is how that distinction gets lost.
    if (error instanceof Anthropic.AuthenticationError) {
      throw new Error("Claude rejected the API key (check AI_SUMMARY_KEY)");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new Error("Claude rate-limited this deployment");
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error ${error.status}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * One call to Gemini. Returns the model's text, or throws with something readable.
 *
 * THE KEY GOES IN A HEADER, NOT THE QUERY STRING. Gemini accepts `?key=`, and that is
 * how most examples show it, but a key in a URL lands in proxy logs, platform access
 * logs and crash reports. `x-goog-api-key` does not.
 */
async function callGemini(prompt: string): Promise<string> {
  const key = aiKey();
  if (key === "") {
    throw new Error("AI_SUMMARY_KEY is not set on this deployment");
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
 * How long a piece of wording may be reused, in seconds. `0` disables reuse.
 *
 * ZERO BY DEFAULT (requested): the section should read differently when the page is
 * refreshed, and it cannot do that if the wording is served from a cache. That means a
 * model call per render of this section — it is lazy-loaded, so only for a reader who
 * scrolls to it, but it is a real per-view cost on a page that is otherwise static.
 *
 * SET `AI_SUMMARY_CACHE_SECONDS` TO PUT IT BACK. `3600` restores the previous
 * behaviour — one call per hour per operator — if the bill or the latency matters more
 * than fresh phrasing. The measured figures are unaffected either way: they come from
 * the analysis service, which has its own cache.
 */
function cacheSeconds(): number {
  const raw = envText("AI_SUMMARY_CACHE_SECONDS");
  if (raw === "") return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

/**
 * The wording, cached on the provider and the prompt — used only when caching is on.
 *
 * KEYED ON THE PROVIDER TOO, so switching `AI_PROVIDER` does not serve the other
 * vendor's phrasing for the rest of the window.
 *
 * A THROW IS NOT CACHED, which is the behaviour worth having: a 401 or a timeout is
 * retried on the next request rather than pinned for an hour.
 *
 * `revalidate` is read at module scope by `unstable_cache`, so the window is fixed for
 * the life of the server. That is why the zero case bypasses this wrapper entirely
 * rather than passing `revalidate: 0` — a cache with a zero window is still a cache.
 */
const cachedWording = unstable_cache(
  async (_operatorNumber: string, provider: string, prompt: string) =>
    provider === "gemini" ? callGemini(prompt) : callClaude(prompt),
  ["what-changed-ai", "wording", "v2"],
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
    return { rows, byModel: false, provider: "", note: "" };
  }

  const send =
    provider === "claude" || provider === "anthropic"
      ? callClaude
      : provider === "gemini"
        ? callGemini
        : null;

  if (!send) {
    return {
      rows,
      byModel: false,
      provider: "",
      note:
        `AI_PROVIDER=${provider} is not a provider this app can run — ` +
        "use claude or gemini, or leave it unset to let the analysis service decide",
    };
  }
  if (aiKey() === "") {
    return {
      rows,
      byModel: false,
      provider: "",
      note: `AI_PROVIDER=${provider} is selected but AI_SUMMARY_KEY is not set on this deployment`,
    };
  }
  if (rows.length === 0)
    return { rows, byModel: false, provider: "", note: "" };

  const prompt = buildPrompt(rows, facts);
  let last = "";

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      /* THE FIRST ATTEMPT GOES THROUGH THE CACHE ONLY WHEN CACHING IS ON. With
         `AI_SUMMARY_CACHE_SECONDS=0` — the default — every render asks the model
         again, which is what "it should change when the page is refreshed" means.
         The retry always bypasses: validation is deterministic, so a cached body
         that failed the guard would fail it again. */
      const raw =
        attempt === 1 && cacheSeconds() > 0
          ? await cachedWording(facts.operatorNumber, provider, prompt)
          : await send(prompt);
      return {
        rows: validate(extractJsonArray(raw), rows, facts),
        byModel: true,
        provider: provider === "anthropic" ? "claude" : provider,
        note: "",
      };
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
  }

  return { rows, byModel: false, provider: "", note: last };
}
