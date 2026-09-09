/**
 * Mailing the weekly report — `/api/weekly/email`.
 *
 * WHAT THIS DOES, AND WHAT IT HONESTLY CANNOT.
 *
 * Rendering the message is the app's job and it is done here in full: the
 * subject, a plain-text body, and the same standalone HTML document the
 * download produces. Actually putting it on the wire needs a mail transport,
 * and a transport is a piece of infrastructure this build is not given.
 *
 * So there are two paths, and the response says which one ran:
 *
 *   `webhook`  a transactional mail API — Postmark, Resend, SendGrid and the
 *              rest all accept one JSON POST. Configure `mail_webhook` (and
 *              optionally `mail_token`) in a `config.json` beside the process,
 *              or set MV_MAIL_WEBHOOK / MV_MAIL_TOKEN, and the message goes.
 *   `none`     nothing configured. The route returns `sent: false` WITH the
 *              rendered message, so the caller can hand it to the reader's own
 *              mail client instead. It does not pretend to have sent anything.
 *
 * The one thing this must never do is report success it cannot prove. A "sent"
 * that means "rendered" is the worst possible outcome for a report someone is
 * waiting on, so `sent` is true only when a transport returned a success.
 *
 * GET returns the transport that is configured, so the UI can label its own
 * button honestly before the reader presses it — "Send it" against a webhook,
 * "Prepare it" against none.
 *
 * PORTED FROM the reference's `src/app/api/weekly/email/route.ts`. Two
 * changes, both forced by there being no database here: the payload comes from
 * the data seam rather than `buildPayload()`, and the `mongoUri` guard that
 * answered 503 is gone because there is nothing to configure. Every message,
 * reason code, field name and rendered sentence is the reference's.
 */
import fs from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  getOwnerPayload,
  selectionFrom,
} from "@/app/mineralownersite/_lib/reference/owner-data";
import { sampleize } from "@/app/mineralownersite/_lib/reference/sample";
import * as render from "@/app/mineralownersite/_lib/reference/weekly-render";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * What can carry the mail, read the reference's own way.
 *
 * PORTED VERBATIM, environment first and then a `config.json` beside the
 * process, because the reference's own note tells the reader to "Set
 * `mail_webhook` in config.json" — and that sentence is rendered in the
 * mailer's UI. Reading only the environment would have made the reference's
 * copy a false instruction in this app, and rewording the copy is the thing
 * this port is not allowed to do. So the reader is told the truth and the
 * sentence stays the reference's.
 *
 * No `config.json` is committed here, so today both paths are simply empty and
 * the route answers `transport: 'none'` — which is the reference's own default
 * state too.
 */
function mailConfig(): { webhook: string; token: string; from: string } {
  const file = (() => {
    try {
      const p = path.join(process.cwd(), "config.json");
      return fs.existsSync(p)
        ? (JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  })();
  const s = (k: string, env: string) =>
    process.env[env] || (typeof file[k] === "string" ? (file[k] as string) : "");
  return {
    webhook: s("mail_webhook", "MV_MAIL_WEBHOOK"),
    token: s("mail_token", "MV_MAIL_TOKEN"),
    from: s("mail_from", "MV_MAIL_FROM") || "reports@mineralview.local",
  };
}

/** a deliberately strict address check: a typo in a recipient is a silent loss */
function validAddress(v: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v.trim()) && v.trim().length <= 254;
}

export async function GET() {
  const m = mailConfig();
  return NextResponse.json(
    {
      transport: m.webhook ? "webhook" : "none",
      from: m.from,
      can_send: Boolean(m.webhook),
      note: m.webhook
        ? "A mail webhook is configured, so the report can be sent from here."
        : "No mail transport is configured, so this build renders the message and hands it to " +
          'your own mail client rather than claiming to have sent it. Set "mail_webhook" in ' +
          "config.json (any transactional mail API that accepts a JSON POST) to send from here.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  let body: {
    to?: string;
    owner?: string;
    num?: string;
    dist?: string;
    sample?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: 'expected a JSON body with a "to" address' },
      { status: 400 },
    );
  }

  const to = String(body.to ?? "").trim();
  if (!to || !validAddress(to)) {
    return NextResponse.json(
      {
        error: "bad address",
        detail:
          "A recipient address is required, and it has to look like an address — a typo " +
          "here is a report nobody receives and nobody is told about.",
      },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  if (body.owner) url.searchParams.set("owner", body.owner);
  if (body.num) url.searchParams.set("num", body.num);
  if (body.dist) url.searchParams.set("dist", body.dist);

  try {
    /* `live: false` — the message is rendered from `payload.weekly` alone;
       see the same note in ../route.ts. */
    const live = await getOwnerPayload(selectionFrom(url), { live: false });
    const payload = body.sample ? sampleize(live).payload : live;
    const msg = render.email(payload.weekly, { sample: Boolean(body.sample) });

    const mail = mailConfig();
    if (!mail.webhook) {
      return NextResponse.json(
        {
          sent: false,
          transport: "none",
          reason: "no_transport",
          to,
          from: mail.from,
          subject: msg.subject,
          text: msg.text,
          /* the whole document, so the caller can attach or paste it */
          html: msg.html,
          detail:
            'Nothing was sent: this build has no mail transport configured, and reporting ' +
            '"sent" without one would be worse than reporting nothing. The rendered message is ' +
            "here — open it in your own mail client, or configure \"mail_webhook\" in config.json.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const res = await fetch(mail.webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(mail.token ? { Authorization: `Bearer ${mail.token}` } : {}),
      },
      body: JSON.stringify({
        from: mail.from,
        to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    const detail = await res.text().catch(() => "");
    if (!res.ok) {
      return NextResponse.json(
        {
          sent: false,
          transport: "webhook",
          reason: "transport_refused",
          status: res.status,
          to,
          subject: msg.subject,
          detail:
            `The mail transport refused the message (HTTP ${res.status}). ` +
            (detail.slice(0, 400) || "It returned no detail."),
        },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      {
        sent: true,
        transport: "webhook",
        to,
        from: mail.from,
        subject: msg.subject,
        week_ending: payload.weekly.week_ending_label,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { sent: false, reason: "error", detail: m },
      { status: 500 },
    );
  }
}
