import type { InviteEmailView } from "../_api/invite-api";
import type { Letter } from "./invite-types";

/**
 * THE LETTERS AS ONE PRINTABLE DOCUMENT — a page per owner.
 *
 * PORTED FROM the reference build's `src/lib/invite-render.ts`, including its
 * print stylesheet. A LETTER IS A PIECE OF PAPER, so this is print-first: US
 * Letter, a posting block in the top left where a window envelope expects it,
 * one owner per sheet and a hard page break between them. What it is NOT is a
 * screen that happens to print.
 *
 * ── NO QR CODE, AND THE REASON MATTERS ──
 *
 * The design prints one. Generating a scannable QR needs a real encoder —
 * Reed-Solomon error correction, version selection, mask evaluation — and both
 * shortcuts are worse than leaving it out: a hand-rolled one cannot be verified
 * here without a scanner to read it back, and a QR image service would send
 * every invitee's personal link to a third party to draw it. So the code is
 * printed large and the claim address is printed in full, which is what the QR
 * was a shortcut for.
 *
 * ── EVERY VALUE IS ESCAPED ──
 *
 * An owner name is a record value and a letter is a file that gets mailed,
 * saved and forwarded; an unescaped one is a script that travels. `esc` is
 * applied to every interpolation below without exception, including the ones
 * that "cannot" contain markup today.
 */

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#f4f6f6;
  font:14px/1.65 "Segoe UI",-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#0f172a}
.sheet{background:#fff;width:8.5in;min-height:11in;margin:16px auto;padding:0.9in 0.95in;
  box-shadow:0 2px 14px rgba(15,23,42,.09);position:relative;display:flex;
  flex-direction:column}
.brand{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:#2e8f6d}
.head{font-size:11px;color:#64748b;margin:2px 0 34px;padding-bottom:10px;
  border-bottom:1px solid #e6ebea}
.to{margin:0 0 30px}
.to .line{display:block;font-size:14px;line-height:1.5}
.to .name{font-weight:700}
.date{font-size:12px;color:#64748b;margin:0 0 22px}
.greet{font-size:15px;font-weight:700;margin:0 0 14px}
p.body{margin:0 0 13px;font-size:13.5px;line-height:1.75}
.codebox{margin:26px 0 22px;border:1px solid #cfd8d5;border-radius:10px;padding:16px 18px;
  background:#fafbfb;text-align:center}
.codebox .k{font-size:9.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
  color:#64748b}
.codebox .v{font-size:34px;font-weight:800;letter-spacing:.09em;margin:6px 0 4px;
  font-variant-numeric:tabular-nums}
.codebox .u{font-size:12.5px;color:#334155}
.codebox .u b{font-weight:700}
.sign{margin-top:auto;padding-top:26px}
.sign .from{font-size:13.5px;font-weight:700}
.foot{margin-top:16px;padding-top:10px;border-top:1px solid #e6ebea;font-size:10px;
  line-height:1.6;color:#94a3b8}
.warn{margin:0 0 18px;border-left:3px solid #b8892f;background:#fdfaf3;padding:9px 12px;
  font-size:11px;color:#7a5b18}
@media print{
  html,body{background:#fff}
  .sheet{width:auto;min-height:auto;margin:0;padding:0.85in 0.9in;box-shadow:none;
    page-break-after:always;min-height:9.3in}
  .sheet:last-child{page-break-after:auto}
  .noprint{display:none!important}
  .warn{display:none}
}
.bar{max-width:8.5in;margin:16px auto 0;padding:0 4px;display:flex;gap:10px;
  align-items:center;flex-wrap:wrap}
.bar button{font:inherit;font-size:13px;font-weight:700;color:#fff;background:#2e8f6d;
  border:0;border-radius:9px;padding:10px 16px;cursor:pointer}
.bar span{font-size:12px;color:#64748b}
`;

/**
 * The invite code, set large in a bordered box.
 *
 * IT IS RENDERED WHERE THE PROSE LEADS TO IT. The body carries the code as a
 * paragraph of its own, and this replaces that paragraph — so the box lands
 * directly under "Here is your own invite code:" rather than after the closing
 * paragraph, which is where it would otherwise sit whatever the letter said.
 */
function codebox(letter: Letter): string {
  return `<div class="codebox">
    <div class="k">Your personal invite code</div>
    <div class="v">${esc(letter.codeLabel)}</div>
    <div class="u">Enter it at <b>${esc(letter.inviteUrl.split("?")[0])}</b></div>
  </div>`;
}

/**
 * One printable document holding every selected letter.
 *
 * `sender` is the reader's own name as it appears at the foot. The date is the
 * day the letters were MADE, not the day they are posted, and it says
 * "prepared" rather than printing a bare date nobody could interpret — a date
 * on its own at the top of a letter reads as a deadline.
 *
 * THE CAUTION IS ON SCREEN AND NOT ON THE PAPER (`.warn` is `display:none` in
 * the print stylesheet). "This owner has no address on the roll" is a note to
 * the sender while they look at the document; printed onto the sheet it would
 * be a sentence the recipient reads about themselves.
 */
export function renderLetters(
  letters: Letter[],
  sender: string,
  madeOn: string,
): string {
  const sheets = letters
    .map(
      (letter) => `<div class="sheet">
  <div class="brand">Mineral View</div>
  <div class="head">${esc(letter.heading)}</div>
  ${
    letter.caution
      ? `<p class="warn"><strong>Before you post this:</strong> ${esc(letter.caution)}</p>`
      : ""
  }
  <div class="to">
    <span class="line name">${esc(letter.to)}</span>
    ${
      letter.addressLines.length
        ? letter.addressLines
            .map((line) => `<span class="line">${esc(line)}</span>`)
            .join("\n    ")
        : '<span class="line">— no address on the appraisal roll —</span>'
    }
  </div>
  <p class="date">Prepared ${esc(madeOn)}</p>
  <p class="greet">${esc(letter.greeting)}</p>
  ${letter.paragraphs
    .map((p) => (p === letter.codeLabel ? codebox(letter) : `<p class="body">${esc(p)}</p>`))
    .join("\n  ")}
  ${letter.paragraphs.includes(letter.codeLabel) ? "" : codebox(letter)}
  <div class="sign">
    <div class="from">${esc(sender)}</div>
    <div class="foot">
      Claiming an owner record on Mineral View does not change legal ownership of anything,
      and creating an owner account is free. This letter was prepared by a co-owner of record
      on ${esc(letter.heading)} from the public appraisal roll. Mineral View did not send it.
    </div>
  </div>
</div>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invite letters — ${esc(letters.length)} ${
    letters.length === 1 ? "owner" : "owners"
  }</title>
<style>${CSS}</style></head>
<body>
<div class="bar noprint">
  <button type="button" onclick="window.print()">Print ${
    letters.length === 1 ? "this letter" : `all ${esc(letters.length)} letters`
  }</button>
  <span>One sheet per owner, each with that owner&rsquo;s own code. Mineral View does not
  post these for you.</span>
</div>
${sheets}
</body></html>`;
}

/**
 * THE SAME SHEET, BUILT FROM THE LETTERS THE SERVICE WROTE.
 *
 * `renderLetters` above takes a `Letter`, which is the FIXTURE's shape — this
 * page no longer composes letters, the invite service does, and what comes
 * back is an `InviteEmailView`. So the printable document is rebuilt from that
 * instead, reusing the stylesheet above rather than a second one: a letter that
 * prints must not be able to drift from the letter that was previewed.
 *
 * ── THE LETTER ARRIVES AS ONE BLOCK OF TEXT, AND IS TAKEN APART HERE ──
 *
 * `bodyText` is greeting through signature. On paper those are not paragraphs:
 * the greeting is set larger, the code becomes the bordered box the eye lands
 * on, and the signature is pinned to the foot of the sheet. So the block is
 * split on blank lines and each piece is placed by what it IS — matched
 * against the service's own `greeting`, `codeLabel` and `sender` fields rather
 * than by position, because a reader who has edited the wording can move any
 * of them.
 *
 * ── THE ADDRESS IS THE ROLL'S, AND IS OFTEN ABSENT ──
 *
 * Printing exists for the owners with a posting address and no email, so the
 * town goes in the window-envelope block when the roll filed one. The email
 * view does not carry it — it is on the roster row — so the caller passes it
 * in, and a missing one prints the same honest dash `renderLetters` prints.
 */
export function renderInviteEmails(
  emails: InviteEmailView[],
  madeOn: string,
  /** `ownerKey` → "Victoria, TX", for the posting block. */
  addresses?: ReadonlyMap<string, string | null>,
): string {
  const sheets = emails
    .map((email) => {
      const where = addresses?.get(email.ownerKey) ?? null;
      const blocks = email.bodyText
        .split(/\n{2,}/)
        .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
        .filter(Boolean);

      /* Placed by identity, not by index — see the header. */
      const greeting = email.greeting.trim();
      const sender = email.sender.trim();
      const body = blocks.filter(
        (block) => block !== greeting && block !== sender,
      );
      const hasCode = body.some((block) => block === email.codeLabel);

      const codebox = `<div class="codebox">
    <div class="k">Your unique invitation code</div>
    <div class="v">${esc(email.codeLabel)}</div>
    <div class="u">Enter it at <b>${esc(email.inviteUrl.split("?")[0])}</b></div>
  </div>`;

      return `<div class="sheet">
  <div class="brand">Mineral View</div>
  <div class="head">${esc(email.heading)}</div>
  ${
    email.caution
      ? `<p class="warn"><strong>Before you post this:</strong> ${esc(email.caution)}</p>`
      : ""
  }
  <div class="to">
    <span class="line name">${esc(email.to)}</span>
    <span class="line">${
      where ? esc(where) : "— no address on the appraisal roll —"
    }</span>
  </div>
  <p class="date">Prepared ${esc(madeOn)}</p>
  <p class="greet">${esc(greeting)}</p>
  ${body
    .map((block) =>
      block === email.codeLabel ? codebox : `<p class="body">${esc(block)}</p>`,
    )
    .join("\n  ")}
  ${hasCode ? "" : codebox}
  <div class="sign">
    <div class="from">${esc(sender)}</div>
    <div class="foot">
      Claiming an owner record on Mineral View does not change or transfer legal ownership of
      anything, and creating an owner account is free. This invitation was prepared by a
      co-owner of record on ${esc(email.heading)} from the public appraisal roll.
      Mineral View did not send it.
    </div>
  </div>
</div>`;
    })
    .join("\n");

  /* NO ON-SCREEN BAR. `renderLetters` is opened as a page and needs a Print
     button; this document is handed straight to the print dialog, so a button
     nobody will see would only be one more thing to keep working. */
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${
    emails.length === 1
      ? `Invitation — ${esc(emails[0].to)}`
      : `Invitations — ${esc(emails.length)} co-owners`
  }</title>
<style>${CSS}</style></head>
<body>
${sheets}
</body></html>`;
}

/**
 * The same letters as a spreadsheet, for a reader who mails their own way.
 *
 * EVERY FIELD IS QUOTED WHEN IT NEEDS TO BE, and a quote inside a value is
 * doubled — the one rule that separates a CSV a spreadsheet opens from a CSV
 * that silently loses a column the first time an owner is filed as
 * `SMITH, J "JACK"`.
 */
export function renderCsv(letters: Letter[]): string {
  const q = (value: unknown) => {
    const s = String(value ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    [
      "Owner",
      "Owner number",
      "Kind",
      "Invite code",
      "Invite link",
      "Town",
      "Needs a look",
    ]
      .map(q)
      .join(","),
  ];
  for (const letter of letters) {
    rows.push(
      [
        letter.to,
        letter.ownerNumber,
        letter.kind,
        letter.codeLabel,
        letter.inviteUrl,
        letter.addressLines[0] ?? "",
        letter.caution ?? "",
      ]
        .map(q)
        .join(","),
    );
  }
  return rows.join("\n");
}
