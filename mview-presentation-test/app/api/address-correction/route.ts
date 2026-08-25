import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

/**
 * Address corrections from the Find Your Record page (`/claim`).
 *
 * Owners can flag a wrong mailing address from the record popup; the finder
 * POSTs `{owner, county, oldAddress, newAddress}` here. A port of the
 * standalone build's Express endpoint (`FindYourRecord/server/server.js`),
 * with one change: corrections are appended as JSON Lines rather than
 * rewriting one growing JSON array, so concurrent submissions can't clobber
 * each other.
 *
 * Stored under `data/` at the project root for the data team to review. On
 * Vercel that filesystem is per-instance and ephemeral — good enough for this
 * presentation build; a durable store can replace the file when the flow is
 * wired for real.
 */
const CORR_FILE = path.join(process.cwd(), "data", "address-corrections.jsonl");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const rec = {
    owner: String(body.owner ?? "").slice(0, 200),
    county: String(body.county ?? "").slice(0, 60),
    oldAddress: String(body.oldAddress ?? "").slice(0, 300),
    newAddress: String(body.newAddress ?? "").slice(0, 300),
    when: new Date().toISOString(),
  };
  if (!rec.owner || !rec.newAddress) {
    return NextResponse.json(
      { error: "owner and newAddress required" },
      { status: 400 },
    );
  }

  await mkdir(path.dirname(CORR_FILE), { recursive: true });
  await appendFile(CORR_FILE, JSON.stringify(rec) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}
