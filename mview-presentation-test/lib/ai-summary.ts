/*
 * Handing a record to a model and reading the answer back.
 *
 * Two pages want a written read now — the permit and the completion — and they
 * want it from the same model with the same key. What differs between them is
 * which record is fetched and what the model is told to do with it; that stays
 * in each route. Everything below is the part that would otherwise be copied
 * twice and drift.
 *
 * Server-only. Nothing here may be imported from a client component: the key is
 * read at module scope, and a client import would inline it into the JavaScript
 * sent to every visitor.
 *
 * Everything about the provider is configuration — the key, the endpoint, the
 * model and which of the two request shapes to use are environment variables.
 * Changing provider, or key, is changing `.env`, not this file.
 */

const KEY = process.env.AI_SUMMARY_KEY;
const MODEL = process.env.AI_SUMMARY_MODEL ?? "gemini-3.6-flash";
const PROVIDER = (process.env.AI_SUMMARY_PROVIDER ?? "gemini").toLowerCase();
const BASE =
  process.env.AI_SUMMARY_URL ??
  "https://generativelanguage.googleapis.com/v1beta";

/** What a route says when there is no key to call anything with. */
export const NO_KEY_MESSAGE =
  "No summary key configured. Set AI_SUMMARY_KEY in .env, with AI_SUMMARY_PROVIDER, AI_SUMMARY_URL and AI_SUMMARY_MODEL for anything other than Gemini.";

export function hasSummaryKey(): boolean {
  return Boolean(KEY);
}

/**
 * The shape every summary comes back in.
 *
 * Loose on purpose: the model writes the findings, and pinning their fields
 * here would mean a schema to keep in step with a prompt. What is checked is
 * what the card cannot render without — a lead and a list.
 */
export type Summary = {
  lead: string;
  findings: unknown[];
  basis?: string;
};

export type SummaryResult =
  | { ok: true; summary: Summary }
  | { ok: false; status: number; error: string };

/*
 * The two request shapes worth supporting, and how each carries its key.
 *
 * Gemini takes the key in the query and the prompt in `contents`; everyone
 * else — OpenAI, Azure, OpenRouter, Groq — takes a bearer token and the
 * chat-completions body. Switching between them is `AI_SUMMARY_PROVIDER`, which
 * is why the difference lives in one function rather than spread through a
 * handler.
 *
 * An Anthropic key needs a third shape adding here: Claude takes `x-api-key`
 * and `/v1/messages`.
 */
function providerRequest(
  instructions: string,
  record: string,
): { url: string; init: RequestInit } {
  if (PROVIDER === "gemini") {
    return {
      url: `${BASE}/models/${MODEL}:generateContent?key=${KEY}`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instructions }] },
          contents: [{ parts: [{ text: record }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    };
  }

  return {
    url: BASE.endsWith("/chat/completions")
      ? BASE
      : `${BASE}/chat/completions`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: record },
        ],
      }),
    },
  };
}

/** The text of the answer, wherever the provider puts it. */
function textOf(data: unknown): string | null {
  const body = data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    choices?: { message?: { content?: string } }[];
  };

  const gemini = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("");
  if (gemini) return gemini;

  const chat = body.choices?.[0]?.message?.content;
  return typeof chat === "string" ? chat : null;
}

/**
 * The shared half of the JSON contract.
 *
 * Both prompts ask for the same shape, because both feed the same card. Each
 * route says what to write; this says what to write it in.
 */
export const SUMMARY_SHAPE = `Answer with JSON only, in this shape:
{
  "lead": "one sentence on what this record is",
  "findings": [
    { "title": "short claim", "badge": "one word, e.g. Status, Location, Operator, Timing, Data", "tone": "green|blue|amber|red|slate", "body": "two or three sentences, each figure named" }
  ],
  "basis": "one sentence on which fields this was built from"
}
Between three and five findings. Use tone "amber" or "red" only for something a reader should be careful of, such as a missing field or a stale date.`;

/**
 * Ask the model to read one record.
 *
 * Returns a result rather than throwing, and never a half-checked answer: a
 * caller gets either a summary the card can render or the reason it cannot,
 * with the status to answer the page with.
 */
export async function generateSummary(
  instructions: string,
  record: unknown,
): Promise<SummaryResult> {
  try {
    const { url, init } = providerRequest(instructions, JSON.stringify(record));
    const answer = await fetch(url, init);
    const data = await answer.json();

    if (!answer.ok) {
      // The provider's own words, so a bad key or a wrong model says which.
      const message =
        ((data as { error?: { message?: string } })?.error?.message ??
          `The summary service answered ${answer.status}.`) as string;
      return { ok: false, status: 502, error: message };
    }

    const text = textOf(data);
    if (!text) {
      return {
        ok: false,
        status: 502,
        error: "The summary service returned nothing to read.",
      };
    }

    let summary: Summary;
    try {
      summary = JSON.parse(text) as Summary;
    } catch {
      return {
        ok: false,
        status: 502,
        error: "The summary came back in a shape this page cannot read.",
      };
    }

    if (!summary?.lead || !Array.isArray(summary?.findings)) {
      return {
        ok: false,
        status: 502,
        error: "The summary came back without a lead or any findings.",
      };
    }

    return { ok: true, summary };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error
          ? error.message
          : "Could not reach the summary service.",
    };
  }
}

/** The API number out of a posted body, or the reason it is unusable. */
export async function apiNumberFrom(
  request: Request,
): Promise<{ api: string } | { error: string }> {
  try {
    const body = (await request.json()) as { api?: unknown };
    const api = typeof body.api === "string" ? body.api : "";
    return api ? { api } : { error: "No API number given." };
  } catch {
    return { error: "Expected a JSON body." };
  }
}
