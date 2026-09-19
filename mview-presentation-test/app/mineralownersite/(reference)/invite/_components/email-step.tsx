"use client";

import { Fragment } from "react";

import { templateFrom, type InviteEmailView } from "../_api/invite-api";
import { DEFAULT_BODY } from "../_lib/invite-letters";
import { preparedOn, printDocument } from "../_lib/print-document";
import { renderInviteEmails } from "../_lib/invite-render";
import type { GreetingStyle } from "../_lib/invite-types";
import { CopyButton } from "./copy-button";
import { StepCard } from "./step-card";

/**
 * THE BODY HAS A CEILING — the contract's own: POST and GET both cap `body` at
 * 2,000 characters, and a letter that runs past that has stopped being a note
 * from a relative anyway. The counter stays out of sight until the reader is
 * near it.
 */
const BODY_MAX = 2000;

const GREETINGS: { value: GreetingStyle; label: string }[] = [
  { value: "first", label: "First Name" },
  { value: "name", label: "Name on Record" },
  { value: "family", label: "Family Greeting" },
  { value: "custom", label: "Custom Greeting" },
];

/**
 * STEP 3 · THE EMAIL — WRITTEN BY THE SERVICE, SHOWN AND COPIED HERE.
 *
 * ── THE LETTERS ARRIVE RENDERED; NOTHING IS COMPOSED IN THE BROWSER ──
 *
 * Ticking a box records the invite and the service answers with the finished
 * email: greeting resolved (a company is greeted by its own name whatever the
 * reader picked), tokens substituted, the code minted and RESERVED. What this
 * card holds is the reader's wording choices — which travel back on the next
 * render — and the stepping, copying and editing around the result.
 *
 * ── `copy_text` REACHES THE CLIPBOARD VERBATIM ──
 *
 * Subject + blank line + body, exactly as the service rendered it, per the
 * contract's own rule. The preview may highlight the code; the clipboard gets
 * the text untouched.
 *
 * ── THE CODE IS SHOWN AS `code_label` AND NOWHERE OUTSIDE A LETTER ──
 *
 * A code identifies ONE owner. The only places one appears are the letter
 * addressed to the person it names and the per-person row beside that name.
 *
 * ── THE PAPER ROW LOST ITS PRINT AND DOWNLOAD LINKS, for now ──
 *
 * They rendered through `/api/invite`, which still reads the demo fixture and
 * cannot print a letter for a real lease. The per-person rows stay — each
 * name, its code, and a copy of that one letter — and the links return when
 * the backend grows a render endpoint.
 *
 * ── `already_invited` IS INVISIBLE HERE, DELIBERATELY ──
 *
 * A box ticked in an earlier session comes back carrying the code issued then,
 * and it looks exactly like every other letter — same code, same copy button.
 * That is the contract's rule: it is a success, never an error.
 */
export function EmailStep({
  emails,
  addresses,
  copyAll,
  rewording,
  at,
  onAt,
  greeting,
  onGreeting,
  custom,
  onCustom,
  body,
  onBody,
  editing,
  onEditing,
  sendNote,
}: {
  emails: InviteEmailView[];
  /** `ownerKey` → the roll's town, for the printed posting block. */
  addresses: ReadonlyMap<string, string | null>;
  /** Every recorded email in one block — the service's own "Copy all". */
  copyAll: string | null;
  /** True while a wording change is being re-rendered by the service. */
  rewording: boolean;
  at: number;
  onAt: (next: number) => void;
  greeting: GreetingStyle;
  onGreeting: (next: GreetingStyle) => void;
  custom: string;
  onCustom: (next: string) => void;
  /** The reader's own wording, or NULL for the service's default letter. */
  body: string | null;
  onBody: (next: string | null) => void;
  editing: boolean;
  onEditing: (next: boolean) => void;
  sendNote: string;
}) {
  const index = Math.min(at, Math.max(0, emails.length - 1));
  const one = emails[index] ?? null;
  /*
   * WHAT THE EDITOR SHOWS: THE READER'S EDIT, OR THE LETTER ON SCREEN.
   *
   * It was the reader's edit or `DEFAULT_BODY` — a template kept in this repo
   * — and that template had drifted from the service's own wording. Pressing
   * "Customize invitation" under a preview therefore opened a DIFFERENT letter
   * to edit, which is what QA saw as "a new email template instead of the one
   * already displayed". Defect sheet row 14.
   *
   * `templateFrom` walks the shown letter's own paragraphs back to the
   * template that produced them, so the textarea opens on the words above it
   * with the per-person parts back in their braces. The local default survives
   * as the last resort for a letter the service sent no paragraphs for.
   *
   * Only an actual edit travels to the service — `body` stays null until the
   * reader types, and null is what keeps the wording the service's own.
   */
  const draft = body ?? (one ? templateFrom(one) : null) ?? DEFAULT_BODY;
  const cautions = emails.filter((email) => email.caution).length;
  const notPeople = emails.filter((email) => email.kind !== "person").length;

  return (
    <StepCard
      n={3}
      title="Review and Send Invitation"
      action={
        emails.length ? (
          <span className="iv-nav">
            {emails.length > 1 ? (
              <button
                type="button"
                aria-label="Previous letter"
                onClick={() => onAt((index - 1 + emails.length) % emails.length)}
              >
                &lsaquo;
              </button>
            ) : null}
            <b>
              {index + 1} of {emails.length}
            </b>
            {emails.length > 1 ? (
              <button
                type="button"
                aria-label="Next letter"
                onClick={() => onAt((index + 1) % emails.length)}
              >
                &rsaquo;
              </button>
            ) : null}
          </span>
        ) : null
      }
    >
      {one ? (
        <>
          {/* THE SERVICE'S OWN CAUTION, PROMINENTLY — the operator, a missing
              address, an address that could not be split. All reasons a letter
              should get a second look before it goes out. */}
          {one.caution ? (
            <p className="iv-warn">
              <strong>Worth a look first:</strong> {one.caution}
            </p>
          ) : null}

          <div className="iv-greet">
            <span className="iv-lbl">Greeting style</span>
            <span className="ml-segs" role="group" aria-label="How the email opens">
              {GREETINGS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={greeting === option.value ? "on" : ""}
                  aria-pressed={greeting === option.value}
                  onClick={() => onGreeting(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </span>
            {greeting === "custom" ? (
              <input
                className="iv-custom"
                value={custom}
                maxLength={60}
                onChange={(event) => onCustom(event.target.value)}
                placeholder="Hi cousin"
                aria-label="Your own greeting"
              />
            ) : null}
            {/* The wording round-trips to the service; the pause is named
                rather than left as a preview that lags a beat behind. */}
            {rewording ? (
              <span className="tiny muted" role="status">
                rewording…
              </span>
            ) : null}
          </div>

          {/* "DEAR FAMILY" IS WRONG FOR AN LLC, and the service enforces that
              server-side. The rule is stated where the choice is made, not
              discovered in the preview three letters later. */}
          {greeting !== "first" && greeting !== "name" && notPeople ? (
            <p className="tiny muted" style={{ margin: "0 0 10px" }}>
              {notPeople} of your picks{" "}
              {notPeople === 1 ? "is a company or a trust" : "are companies or trusts"}
              . Those are always addressed by their own name, whatever you choose
              here.
            </p>
          ) : null}

          <div className="iv-mail">
            <div className="iv-mailrow">
              <span>To</span>
              <b>{one.to}</b>
              {/* Title case, and "in" left lowercase — the doc's own line. */}
              <MailHint text="Enter Recipient’s Email Address (Not Available in Appraisal Records)" />
            </div>
            <div className="iv-mailrow">
              <span>Subject</span>
              <b>{one.subject}</b>
            </div>
            {/*
              THE EDITOR TAKES THE LETTER'S OWN PLACE.
              Seeding the textarea from the displayed letter closed half of row
              14; the other half was that it opened as a SECOND block under the
              preview, so there were two letters on screen and the reader was
              still not editing the one they had been reading. It replaces the
              preview now, inside the same framed card, under the same To and
              Subject rows — one letter, either being read or being written.
            */}
            {editing ? (
              <div className="iv-edit">
                <p className="iv-editnote">
                  It is your letter — change as much as you like. Each person
                  gets their own name and their own code filled in when you
                  copy it.
                </p>
                <textarea
                  value={draft}
                  maxLength={BODY_MAX}
                  rows={14}
                  onChange={(event) => onBody(event.target.value)}
                  aria-label="The wording of the invitation"
                />
                {/*
                  THE INSERT BUTTONS SAY WHAT THEY ADD, IN WORDS. The tokens are
                  the contract's own — the service substitutes them per
                  recipient.
                */}
                <div className="iv-chips">
                  <span className="iv-chipk">Add</span>
                  {(
                    [
                      ["{name}", "their name"],
                      ["{code}", "their code"],
                      ["{url}", "the claim link"],
                      ["{lease}", "the lease name"],
                    ] as const
                  ).map(([token, what]) => (
                    <button
                      key={token}
                      type="button"
                      className="iv-tok"
                      onClick={() =>
                        onBody(
                          `${draft}${draft.endsWith(" ") ? "" : " "}${token}`,
                        )
                      }
                    >
                      {what}
                    </button>
                  ))}
                  {body !== null ? (
                    /* Back to NULL, not to a local template — the service's own
                       default letter returns on the next render. */
                    <button
                      type="button"
                      className="iv-link"
                      style={{ marginLeft: "auto" }}
                      onClick={() => onBody(null)}
                    >
                      Start again from the standard letter
                    </button>
                  ) : null}
                  {draft.length > BODY_MAX * 0.8 ? (
                    <span className="tiny muted">
                      {BODY_MAX - draft.length} characters left
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <MailBody text={one.bodyText} code={one.codeLabel} />
            )}
          </div>

          <div className="iv-do">
            <CopyButton
              variant="primary"
              size="md"
              /* VERBATIM — the contract's rule. Plain text on purpose; pasting
                 HTML into a mail client is worse than a plain code. */
              text={one.copyText}
              /*
               * ONE LABEL, WHICHEVER LETTER IS SHOWING.
               *
               * It used to carry the recipient's given name — "Copy invitation
               * for Judy" — and fall back to this sentence whenever the name
               * could not be had safely. Stepping through twenty letters then
               * renamed and resized the page's primary button on every arrow
               * press, and for a roll row the greeting could not shorten it
               * changed wording as well as width. Defect sheet row 13.
               *
               * The name is not lost: it is on the row's own copy button in
               * the list below, beside the code it belongs to, where it names
               * one letter among many rather than relabelling the one control
               * that never changes what it does.
               */
              label="Copy this invitation"
              title={`The invitation for ${one.to}, subject line included`}
            />
            {emails.length > 1 && copyAll ? (
              <CopyButton
                size="md"
                text={copyAll}
                label={`Copy all ${emails.length}`}
                title="Every chosen letter as one block, each with its own heading and code"
              />
            ) : null}
            <button
              type="button"
              className="iv-link"
              onClick={() => onEditing(!editing)}
            >
              {editing ? "Done customizing" : "Customize invitation"}
            </button>
          </div>


          {/*
            EACH PERSON'S CODE, BESIDE THE NAME IT BELONGS TO — the second of
            the two places a code is allowed to appear. The copy on each row is
            that one letter, for a reader working down twenty cousins one paste
            at a time without stepping the preview.
          */}
          <div className="iv-also">
            <span className="iv-alsok">
              Personalized invitation and unique code
            </span>
            <ul className="iv-each">
              {emails.map((email) => (
                <li key={email.ownerKey}>
                  <b>{email.to}</b>
                  <span className="iv-eachcode">{email.codeLabel}</span>
                  {/* PRINT COMES FIRST, so `.iv-each > li > .btn:first-of-type`
                      pushes the PAIR to the right edge — the rule was already
                      written for two buttons and had only one to work with. */}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    title={`A printable sheet for ${email.to}, with their own code`}
                    onClick={() =>
                      printDocument(
                        renderInviteEmails([email], preparedOn(), addresses),
                      )
                    }
                  >
                    Print
                  </button>
                  <CopyButton
                    size="sm"
                    text={email.copyText}
                    label="Copy"
                    title={`The invitation for ${email.to}, subject line included`}
                  />
                </li>
              ))}
            </ul>
          </div>

          {cautions ? (
            <p className="pf2-note">
              {cautions === 1 ? "One of these" : `${cautions} of these`} wants a
              look before it goes — step through them with the arrows above.
            </p>
          ) : null}
        </>
      ) : (
        <p className="iv-empty">
          Select a co-owner in step 2 and their invitation is prepared here,
          ready to copy.
        </p>
      )}

      <p className="pf2-note">{sendNote}</p>
    </StepCard>
  );
}

/**
 * THE TO ROW'S HINT — ONE SENTENCE, SITTING STILL.
 *
 * IT USED TO BE A TICKER. Two copies of the sentence on an infinite CSS
 * translate, duration measured off the text so the speed stayed constant
 * whatever the width. It read well for one pass and then never stopped: the
 * animation restarts every cycle for as long as the letter is on screen, and
 * beside a preview a reader is trying to proofread it is movement in the
 * corner of the eye that cannot be dismissed. QA reported it as the recipient
 * line "continuously re-triggering in a loop", which is exactly what it was.
 * Defect sheet · Invite co-owners row 11.
 *
 * SO IT WRAPS INSTEAD. The row is a grid with a flexible third column, and the
 * sentence takes as many lines as it needs there — nothing is clipped, so
 * nothing has to move to become readable. The `title` stays: it is the same
 * sentence, and a reader on a very narrow layout gets it as a tooltip.
 */
function MailHint({ text }: { text: string }) {
  return (
    <i className="tiny muted iv-mailhint" title={text}>
      {text}
    </i>
  );
}

/**
 * The email body, with the invite code set off from the rest.
 *
 * DISPLAY ONLY — the clipboard gets `copy_text` untouched. The line that is
 * NOTHING BUT the code is set large: a plain-text email has no type sizes, so
 * the letter itself uses position for that, and on screen there are type sizes
 * to use instead.
 */
function MailBody({ text, code }: { text: string; code: string }) {
  return (
    <pre className="iv-mailbody">
      {text.split("\n").map((line, i) => {
        const key = `${i}-${line.length}`;
        if (line.trim() === code) {
          return (
            <Fragment key={key}>
              <mark className="iv-hl big">{code}</mark>
              {"\n"}
            </Fragment>
          );
        }
        if (!code || !line.includes(code)) {
          return (
            <Fragment key={key}>
              {line}
              {"\n"}
            </Fragment>
          );
        }
        const parts = line.split(code);
        return (
          <Fragment key={key}>
            {parts.map((part, j) => (
              <Fragment key={`${key}-${j}`}>
                {part}
                {j < parts.length - 1 ? <mark className="iv-hl">{code}</mark> : null}
              </Fragment>
            ))}
            {"\n"}
          </Fragment>
        );
      })}
    </pre>
  );
}
