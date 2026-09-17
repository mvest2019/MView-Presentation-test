"use client";

import { Fragment } from "react";

import type { InviteEmailView } from "../_api/invite-api";
import { DEFAULT_BODY } from "../_lib/invite-letters";
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
  { value: "first", label: "First name" },
  { value: "name", label: "Name as filed" },
  { value: "family", label: "Dear family" },
  { value: "custom", label: "Your words" },
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
  body: string;
  onBody: (next: string) => void;
  editing: boolean;
  onEditing: (next: boolean) => void;
  sendNote: string;
}) {
  const index = Math.min(at, Math.max(0, emails.length - 1));
  const one = emails[index] ?? null;
  const cautions = emails.filter((email) => email.caution).length;
  const notPeople = emails.filter((email) => email.kind !== "person").length;

  return (
    <StepCard
      n={3}
      title="Copy the email and send it"
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
            <span className="iv-lbl">Opens with</span>
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
              <i className="tiny muted">
                you add the address — the roll holds no email
              </i>
            </div>
            <div className="iv-mailrow">
              <span>Subject</span>
              <b>{one.subject}</b>
            </div>
            <MailBody text={one.bodyText} code={one.codeLabel} />
          </div>

          <div className="iv-do">
            <CopyButton
              variant="primary"
              size="md"
              /* VERBATIM — the contract's rule. Plain text on purpose; pasting
                 HTML into a mail client is worse than a plain code. */
              text={one.copyText}
              label={(() => {
                const given = givenNameOf(one);
                return given ? `Copy this email — for ${given}` : "Copy this email";
              })()}
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
              {editing ? "Done editing" : "Change the wording"}
            </button>
          </div>

          {editing ? (
            <div className="iv-edit">
              <span className="iv-lbl">What it says</span>
              <p className="iv-editnote">
                It is your letter — change as much as you like. Each person gets
                their own name and their own code filled in when you copy it.
              </p>
              <textarea
                value={body}
                maxLength={BODY_MAX}
                rows={9}
                onChange={(event) => onBody(event.target.value)}
                aria-label="The wording of the email"
              />
              {/*
                THE INSERT BUTTONS SAY WHAT THEY ADD, IN WORDS. The tokens are
                the contract's own — the service substitutes them per recipient.
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
                      onBody(`${body}${body.endsWith(" ") ? "" : " "}${token}`)
                    }
                  >
                    {what}
                  </button>
                ))}
                {body !== DEFAULT_BODY ? (
                  <button
                    type="button"
                    className="iv-link"
                    style={{ marginLeft: "auto" }}
                    onClick={() => onBody(DEFAULT_BODY)}
                  >
                    Start again from the standard letter
                  </button>
                ) : null}
                {body.length > BODY_MAX * 0.8 ? (
                  <span className="tiny muted">
                    {BODY_MAX - body.length} characters left
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/*
            EACH PERSON'S CODE, BESIDE THE NAME IT BELONGS TO — the second of
            the two places a code is allowed to appear. The copy on each row is
            that one letter, for a reader working down twenty cousins one paste
            at a time without stepping the preview.
          */}
          <div className="iv-also">
            <span className="iv-alsok">Each person&rsquo;s own letter and code</span>
            <ul className="iv-each">
              {emails.map((email) => (
                <li key={email.ownerKey}>
                  <b>{email.to}</b>
                  <span className="iv-eachcode">{email.codeLabel}</span>
                  <CopyButton
                    size="sm"
                    text={email.copyText}
                    label="Copy"
                    title={`The email for ${email.to}, subject line included`}
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
          Tick somebody in step 2 and their email is written here, ready to copy.
        </p>
      )}

      <p className="pf2-note">{sendNote}</p>
    </StepCard>
  );
}

/**
 * The name for the copy button, read OUT OF THE GREETING the service resolved.
 *
 * The old build re-derived a first name from the roll spelling; the service
 * now owns that logic, and re-implementing it here would let the button
 * promise a letter to one name while the letter opened with another. "Dear
 * Judy," names Judy; "Dear family," and anything too long to fit on a button
 * fall back to the button's plain label.
 */
function givenNameOf(email: InviteEmailView): string | null {
  const match = /^Dear (.+),$/.exec(email.greeting.trim());
  if (!match) return null;
  const name = match[1];
  if (name.toLowerCase() === "family" || name.length > 24) return null;
  return name;
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
