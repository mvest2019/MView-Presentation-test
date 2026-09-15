"use client";

import { Fragment } from "react";

import {
  DEFAULT_BODY,
  firstNameOf,
  plainAll,
  plainText,
  subjectFor,
} from "../_lib/invite-letters";
import type { CoOwner, GreetingStyle, Letter } from "../_lib/invite-types";
import { CopyButton } from "./copy-button";
import { StepCard } from "./step-card";

/**
 * THE BODY HAS A CEILING. Nothing technical forces one here — it is a textarea,
 * not a query string — but a letter that runs past two thousand characters has
 * stopped being a note from a relative, which is the only thing this page has
 * going for it. The counter stays out of sight until the reader is near it.
 */
const BODY_MAX = 2000;

const GREETINGS: { value: GreetingStyle; label: string }[] = [
  { value: "first", label: "First name" },
  { value: "name", label: "Name as filed" },
  { value: "family", label: "Dear family" },
  { value: "custom", label: "Your words" },
];

/**
 * STEP 3 · THE EMAIL.
 *
 * ── ONE BUTTON, AND IT IS THE JOB ──
 *
 * There were four here once — copy the code, copy the link, email this one, and
 * a preview toggle — and only one of them is what the reader came for: copy the
 * message and paste it into their own mail. Everything else on this card is
 * either a setting for that message or a quieter way to send the same thing on
 * paper.
 *
 * ── THE LETTERS ARE STEPPED THROUGH, NOT STACKED ──
 *
 * Twenty ticks is twenty letters, and twenty letters printed down the page is a
 * document rather than a card. One at a time with arrows keeps the "copy"
 * button in the same place for all twenty — which matters, because the reader
 * is going to press it twenty times, alternating with their mail client.
 *
 * ── HOW IT OPENS IS ON THE CARD; WHAT IT SAYS IS BEHIND A LINK ──
 *
 * The greeting is the one thing nearly every reader wants to set, and the
 * wording is the thing nearly none of them touch. They used to be the other way
 * round: a twelve-row textarea taking half the card, with the greeting hidden
 * behind it.
 *
 * ── THE CODE IS HIGHLIGHTED IN THE PREVIEW AND NOWHERE ELSE ──
 *
 * `MailBody` marks it so the reader can see the one thing the recipient has to
 * act on. What the copy button hands over is `plainText` untouched: a mail
 * client pasting markup is a worse outcome than a code nobody noticed.
 *
 * ── NO CODE IS SHOWN ON THIS PAGE EXCEPT INSIDE A LETTER ──
 *
 * A code identifies ONE owner. A "your share code" printed at the top of the
 * page, or a column of them in the table, hands the reader something they can
 * copy to two cousins — and then two people hold one identifier. The only place
 * a code appears is in the letter addressed to the person it names, and in the
 * paper row beside that person's name.
 *
 * ── WHAT THE RE-SKIN CHANGED ──
 *
 * `Notice`, `SegmentedControl` and `portalButtonClass` are gone; the card is
 * drawn with `.iv-warn`, `.ml-segs`, `.iv-mail`, `.iv-do`, `.iv-edit` and
 * `.iv-also` — the reference's own. The visible differences are the preview,
 * which now looks like a mail client rather than a bordered box, and the code,
 * which is picked out in INK rather than in mint: green is gas and gold is oil
 * across this site, and a letter is not a product.
 */
export function EmailStep({
  leaseId,
  letters,
  chosen,
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
  /** Which lease the letters are for — the download links carry it. */
  leaseId: string;
  letters: Letter[];
  chosen: CoOwner[];
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
  /**
   * THE LETTERS AS A DOCUMENT, AS A URL THE BROWSER CAN OPEN OR SAVE.
   *
   * THE WORDING TRAVELS IN THE QUERY STRING, and it has to: the greeting, the
   * custom opener and any edit to the body live in React state, and a link
   * cannot see React state. Carrying them means the sheet that prints is the
   * letter that was on screen when the reader pressed the button, rather than
   * the standard one.
   *
   * `who` NAMES THE OWNERS, defaulting to every one chosen. A letter is
   * addressed to one person, so the per-owner rows pass a single number and get
   * a single sheet named after that person; the batch passes none and gets all
   * of them in one document.
   */
  const lettersUrl = (format: "html" | "csv", download: boolean, who?: string[]) => {
    const params = new URLSearchParams();
    params.set("lease", leaseId);
    params.set("owners", (who ?? letters.map((l) => l.ownerNumber)).join(","));
    params.set("greeting", greeting);
    if (greeting === "custom" && custom.trim()) params.set("custom", custom.trim());
    if (body !== DEFAULT_BODY) params.set("body", body.slice(0, BODY_MAX));
    params.set("format", format);
    if (download) params.set("dl", "1");
    return `/api/invite?${params.toString()}`;
  };

  const index = Math.min(at, Math.max(0, letters.length - 1));
  const one = letters[index] ?? null;
  const cautions = letters.filter((letter) => letter.caution).length;
  const notPeople = chosen.filter((owner) => owner.kind !== "person").length;

  return (
    <StepCard
      n={3}
      title="Copy the email and send it"
      action={
        letters.length ? (
          <span className="iv-nav">
            {letters.length > 1 ? (
              <button
                type="button"
                aria-label="Previous letter"
                onClick={() => onAt((index - 1 + letters.length) % letters.length)}
              >
                &lsaquo;
              </button>
            ) : null}
            <b>
              {index + 1} of {letters.length}
            </b>
            {letters.length > 1 ? (
              <button
                type="button"
                aria-label="Next letter"
                onClick={() => onAt((index + 1) % letters.length)}
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
          </div>

          {/* "DEAR FAMILY" IS WRONG FOR AN LLC, and the roll is full of them.
              The rule is stated where the choice is made, not discovered in the
              preview three letters later. */}
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
              <b>{subjectFor(one)}</b>
            </div>
            <MailBody text={plainText(one)} code={one.codeLabel} />
          </div>

          <div className="iv-do">
            <CopyButton
              variant="primary"
              size="md"
              text={`${subjectFor(one)}\n\n${plainText(one)}`}
              /* THE NAME ON THE BUTTON IS THE NAME IN THE LETTER, worked out
                 the same way the greeting is. Taking the first word of the "To"
                 line would give the SURNAME — the roll files a person last name
                 first — and the button would promise a letter to "Dear McCabe"
                 while the letter said "Dear Corliss". */
              label={(() => {
                const owner = chosen[Math.min(index, chosen.length - 1)];
                const given = owner ? firstNameOf(owner) : null;
                return given ? `Copy this email — for ${given}` : "Copy this email";
              })()}
            />
            {letters.length > 1 ? (
              <CopyButton
                size="md"
                text={plainAll(letters)}
                label={`Copy all ${letters.length}`}
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
                THE INSERT BUTTONS SAY WHAT THEY ADD, IN WORDS. They were
                labeled with the brace syntax itself — `{name}`, `{code}` —
                which means nothing to a reader who has never written a
                template, beside a character counter nobody needs until they are
                near the limit.
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
            ON PAPER, ONE LETTER PER PERSON.

            It was one document holding all of them, which is right for a print
            run and wrong for everything else: to send Corliss hers you had to
            find her page inside a three-page file. Each owner has their own row
            now, carrying their own code — this is the second of the two places
            a code is allowed to appear, and it is beside the name it belongs to.

            THE POSTAL TEXT IS NOT THE EMAIL TEXT. It carries the lease heading
            and the recipient's name above the greeting, which a printed sheet
            needs and an email to a cousin does not.
          */}
          <div className="iv-also">
            <span className="iv-alsok">
              Or send it on paper — one letter per person
            </span>
            <ul className="iv-each">
              {letters.map((letter) => (
                <li key={letter.ownerNumber}>
                  <b>{letter.to}</b>
                  <span className="iv-eachcode">{letter.codeLabel}</span>
                  {/* PRINT OPENS AND DOWNLOAD SAVES — the reference's two ways
                      out of a letter, and no third. A "Copy for post" button
                      stood here as well; it was this build's addition and it
                      has gone. Print is `target="_blank"`: it is a document,
                      and replacing the page the reader is working in would lose
                      their ticks.

                      The first of the two is pushed right by
                      `.iv-each > li > .btn:first-of-type`, which is the
                      reference's own rule and can see these because they are
                      `<a class="btn">` rather than a component. */}
                  <a
                    className="btn btn-ghost btn-sm"
                    href={lettersUrl("html", false, [letter.ownerNumber])}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Print
                  </a>
                  <a
                    className="btn btn-ghost btn-sm"
                    href={lettersUrl("html", true, [letter.ownerNumber])}
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>

            {/* AND THE WHOLE SELECTION AT ONCE. The combined document is right
                for an actual print run — one trip to the printer, a page break
                between owners — and the spreadsheet is for a reader who mails
                their own way and wants the codes in a column. */}
            <div className="iv-alsobtns">
              {letters.length > 1 ? (
                <a
                  className="btn btn-ghost btn-sm"
                  href={lettersUrl("html", false)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Print all {letters.length} in one go
                </a>
              ) : null}
              <a className="btn btn-ghost btn-sm" href={lettersUrl("csv", true)}>
                {letters.length === 1
                  ? "Code as a spreadsheet"
                  : "All codes as one spreadsheet"}
              </a>
            </div>
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
 * The email body, with the invite code set off from the rest.
 *
 * IT WAS PLAIN TEXT IN A WALL OF PLAIN TEXT — the one thing in the message the
 * recipient has to act on, with nothing to mark it. It appears twice, once in
 * the sentence that introduces it and once on a line of its own, and the line
 * that is NOTHING BUT the code is set large: a plain-text email has no type
 * sizes, so the letter itself uses position for that, and on screen there are
 * type sizes to use instead.
 *
 * DISPLAY ONLY — see the note on the card about what reaches the clipboard.
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
        if (!line.includes(code)) {
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
