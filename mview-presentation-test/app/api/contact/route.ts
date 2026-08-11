import { NextResponse } from "next/server";

import { contactSchema } from "@/app/contact/_components/contact-schema";

/**
 * Contact form endpoint. Re-validates with the same zod schema the client uses,
 * then (TODO) forwards the message to the support inbox / NewsFramework backend
 * — the blog/glossary clients POST to `{BASE_URL}/NewsFramework/...`; wire the
 * contact endpoint the same way once its name/fields are confirmed.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid fields.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // TODO: forward `parsed.data` to the support desk / backend endpoint.

  return NextResponse.json({ ok: true });
}
