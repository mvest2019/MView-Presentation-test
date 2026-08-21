import { getWellPermitMap } from "@/lib/map-api";

/*
 * The written read on a permit, generated.
 *
 * Server-side on purpose: the key never reaches the browser. The page posts an
 * API number, this asks the service, hands the filing to a model and returns
 * what came back.
 *
 * Everything about the provider is configuration — the key, the endpoint, the
 * model and which of the two request shapes to use are environment variables.
 * Changing provider, or key, is changing `.env.local`, not this file.
 */

const KEY = process.env.AI_SUMMARY_KEY;
const MODEL = process.env.AI_SUMMARY_MODEL ?? "gemini-3.6-flash";
const PROVIDER = (process.env.AI_SUMMARY_PROVIDER ?? "gemini").toLowerCase();
const BASE =
  process.env.AI_SUMMARY_URL ??
  "https://generativelanguage.googleapis.com/v1beta";

/*
 * The two request shapes worth supporting, and how each carries its key.
 *
 * Gemini takes the key in the query and the prompt in `contents`; everyone
 * else — OpenAI, Azure, OpenRouter, Groq — takes a bearer token and the
 * chat-completions body. Switching between them is `AI_SUMMARY_PROVIDER` in
 * `.env.local`, which is why the difference lives in one function rather than
 * spread through the handler.
 *
 * Not called `request`: the handler's own parameter is called that, and inside
 * `POST` it would shadow this — calling the Request object as a function.
 */
function providerRequest(
  prompt: string,
  filing: string,
): { url: string; init: RequestInit } {
  if (PROVIDER === "gemini") {
    return {
      url: `${BASE}/models/${MODEL}:generateContent?key=${KEY}`,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ parts: [{ text: filing }] }],
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
          { role: "system", content: prompt },
          { role: "user", content: filing },
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

/*
 * What to write, and what shape to write it in.
 *
 * The rules are the point of this prompt rather than the tone: a permit is a
 * filing, and a summary of one that invents a figure is worse than no summary.
 */
const INSTRUCTIONS = `You are summarising a single Railroad Commission of Texas drilling permit for a mineral owner.

Rules:
- Use only the fields given. Never invent a figure, a date, a depth or a name.
- Where a field is missing, say so plainly or leave it out. Do not guess.
- Quote a direction exactly as the field states it. nearestWell.direction is the
  direction of that well from this one; do not reverse it, and do not describe
  this well's position relative to it.
- No investment advice, no valuation, no recommendation to buy, sell or lease.
- Plain English. Name the figure you are drawing on.

Answer with JSON only, in this shape:
{
  "lead": "one sentence on what this permit is",
  "findings": [
    { "title": "short claim", "badge": "one word, e.g. Status, Location, Operator, Timing, Data", "tone": "green|blue|amber|red|slate", "body": "two or three sentences, each figure named" }
  ],
  "basis": "one sentence on which fields this was built from"
}
Between three and five findings. Use tone "amber" or "red" only for something a reader should be careful of, such as a missing field or a stale date.`;

export async function POST(request: Request) {
  if (!KEY) {
    return Response.json(
      {
        error:
          "No summary key configured. Set AI_SUMMARY_KEY in .env.local, with AI_SUMMARY_PROVIDER, AI_SUMMARY_URL and AI_SUMMARY_MODEL for anything other than Gemini.",
      },
      { status: 501 },
    );
  }

  let api = "";
  try {
    const body = (await request.json()) as { api?: unknown };
    api = typeof body.api === "string" ? body.api : "";
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  if (!api) {
    return Response.json({ error: "No API number given." }, { status: 400 });
  }

  /*
   * The filing is fetched here rather than posted from the page: the summary
   * has to be of the record as the service holds it, not of whatever a browser
   * chose to send.
   */
  let permit;
  try {
    permit = await getWellPermitMap(api);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Could not read the permit.",
      },
      { status: 502 },
    );
  }

  if (!permit) {
    return Response.json(
      { error: `No permit on file for ${api}.` },
      { status: 404 },
    );
  }

  try {
    const { url, init } = providerRequest(
      INSTRUCTIONS,
      JSON.stringify(permit),
    );
    const answer = await fetch(url, init);
    const data = await answer.json();

    if (!answer.ok) {
      // The provider's own words, so a bad key or a wrong model says which.
      const message =
        (data?.error?.message as string | undefined) ??
        `The summary service answered ${answer.status}.`;
      return Response.json({ error: message }, { status: 502 });
    }

    const text = textOf(data);
    if (!text) {
      return Response.json(
        { error: "The summary service returned nothing to read." },
        { status: 502 },
      );
    }

    let summary;
    try {
      summary = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "The summary came back in a shape this page cannot read." },
        { status: 502 },
      );
    }

    if (!summary?.lead || !Array.isArray(summary?.findings)) {
      return Response.json(
        { error: "The summary came back without a lead or any findings." },
        { status: 502 },
      );
    }

    return Response.json({ summary, generatedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not reach the summary service.",
      },
      { status: 502 },
    );
  }
}
