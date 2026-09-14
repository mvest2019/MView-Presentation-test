"use client";

import { Fragment } from "react";

import { portalButtonClass } from "../../../_components/ui/button";
import { Notice } from "../../../_components/ui/notice";
import { SegmentedControl } from "../../../_components/ui/segmented-control";
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
          <span className="inline-flex items-center gap-1.5 text-[12px] text-mv-slate">
            {letters.length > 1 ? (
              <StepArrow
                label="Previous letter"
                onClick={() => onAt((index - 1 + letters.length) % letters.length)}
              >
                ‹
              </StepArrow>
            ) : null}
            <b className="font-semibold tabular-nums">
              {index + 1} of {letters.length}
            </b>
            {letters.length > 1 ? (
              <StepArrow
                label="Next letter"
                onClick={() => onAt((index + 1) % letters.length)}
              >
                ›
              </StepArrow>
            ) : null}
          </span>
        ) : null
      }
    >
      {one ? (
        <>
          {one.caution ? (
            <Notice tone="gold" glyph="!" className="mb-[10px]">
              <strong>Worth a look first:</strong> {one.caution}
            </Notice>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold tracking-[0.05em] text-mv-muted uppercase">
              Opens with
            </span>
            <SegmentedControl
              label="How the email opens"
              options={GREETINGS}
              value={greeting}
              onChange={onGreeting}
            />
            {greeting === "custom" ? (
              <input
                value={custom}
                maxLength={60}
                onChange={(event) => onCustom(event.target.value)}
                placeholder="Hi cousin"
                aria-label="Your own greeting"
                className="min-w-[140px] rounded-[9px] border border-mv-line bg-mv-card px-[10px] py-1.5 text-[12.5px] outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
              />
            ) : null}
          </div>

          {/* "DEAR FAMILY" IS WRONG FOR AN LLC, and the roll is full of them.
              The rule is stated where the choice is made, not discovered in the
              preview three letters later. */}
          {greeting !== "first" && greeting !== "name" && notPeople ? (
            <p className="m-0 mt-1.5 text-[11.5px] text-mv-muted">
              {notPeople} of your picks{" "}
              {notPeople === 1 ? "is a company or a trust" : "are companies or trusts"}
              . Those are always addressed by their own name, whatever you
              choose here.
            </p>
          ) : null}

          <div className="mt-3 overflow-hidden rounded-mv border border-mv-line">
            <MailRow label="To">
              <b className="font-semibold">{one.to}</b>
              <i className="ml-2 text-[11.5px] font-normal text-mv-muted not-italic">
                you add the address — the roll holds no email
              </i>
            </MailRow>
            <MailRow label="Subject">
              <b className="font-semibold">{subjectFor(one)}</b>
            </MailRow>
            <MailBody text={plainText(one)} code={one.codeLabel} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
            <QuietButton onClick={() => onEditing(!editing)}>
              {editing ? "Done editing" : "Change the wording"}
            </QuietButton>
          </div>

          {editing ? (
            <div className="mt-3 rounded-mv border border-mv-line bg-mv-portal-explain p-3">
              <span className="text-[11px] font-bold tracking-[0.05em] text-mv-muted uppercase">
                What it says
              </span>
              <p className="m-0 mt-1 text-[12px] leading-[1.5] text-mv-muted">
                It is your letter — change as much as you like. Each person gets
                their own name and their own code filled in when you copy it.
              </p>
              <textarea
                value={body}
                maxLength={BODY_MAX}
                rows={9}
                onChange={(event) => onBody(event.target.value)}
                aria-label="The wording of the email"
                className="mt-2 w-full resize-y rounded-[9px] border border-mv-line bg-mv-card p-[10px] font-mono text-[12px] leading-[1.6] outline-none transition-colors hover:border-mv-green focus-visible:border-mv-green focus-visible:ring-[3px] focus-visible:ring-[rgba(84,191,150,.16)]"
              />
              {/*
                THE INSERT BUTTONS SAY WHAT THEY ADD, IN WORDS. They were
                labelled with the brace syntax itself — `{name}`, `{code}` —
                which means nothing to a reader who has never written a
                template, beside a character counter nobody needs until they are
                near the limit.
              */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold tracking-[0.05em] text-mv-muted uppercase">
                  Add
                </span>
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
                    onClick={() =>
                      onBody(`${body}${body.endsWith(" ") ? "" : " "}${token}`)
                    }
                    className="cursor-pointer rounded-full border border-mv-line bg-mv-card px-[10px] py-1 text-[11.5px] font-semibold text-mv-slate transition-colors hover:border-mv-green hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
                  >
                    {what}
                  </button>
                ))}
                {body !== DEFAULT_BODY ? (
                  <span className="ml-auto">
                    <QuietButton onClick={() => onBody(DEFAULT_BODY)}>
                      Start again from the standard letter
                    </QuietButton>
                  </span>
                ) : null}
                {body.length > BODY_MAX * 0.8 ? (
                  <span className="text-[11.5px] text-mv-muted">
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
          <div className="mt-[18px] border-t border-mv-portal-hairline pt-3">
            <span className="text-[11px] font-bold tracking-[0.05em] text-mv-muted uppercase">
              Or send it on paper — one letter per person
            </span>
            <ul className="m-0 mt-2 flex list-none flex-col items-stretch gap-1.5 p-0">
              {letters.map((letter) => (
                <li
                  key={letter.ownerNumber}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[10px] bg-mv-portal-wash px-[10px] py-[7px] text-[12.5px]"
                >
                  <b className="font-semibold">{letter.to}</b>
                  <span className="font-mono text-[12px] tracking-[0.04em] text-mv-slate tabular-nums">
                    {letter.codeLabel}
                  </span>
                  {/* PRINT OPENS, DOWNLOAD SAVES, COPY PASTES — three ways out
                      of the same letter, because the reader's next move is not
                      knowable from here. Print is `target="_blank"`: it is a
                      document, and replacing the page the reader is working in
                      would lose their ticks. */}
                  <span className="ml-auto flex flex-wrap items-center gap-2">
                    <CopyButton
                      text={plainText(letter, { postal: true })}
                      label="Copy for post"
                      title="The same letter with the lease heading and their name above it, ready to paste into a document"
                    />
                    <a
                      className={portalButtonClass({ variant: "ghost", size: "sm" })}
                      href={lettersUrl("html", false, [letter.ownerNumber])}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Print
                    </a>
                    <a
                      className={portalButtonClass({ variant: "ghost", size: "sm" })}
                      href={lettersUrl("html", true, [letter.ownerNumber])}
                    >
                      Download
                    </a>
                  </span>
                </li>
              ))}
            </ul>

            {/* AND THE WHOLE SELECTION AT ONCE. The combined document is right
                for an actual print run — one trip to the printer, a page break
                between owners — and the spreadsheet is for a reader who mails
                their own way and wants the codes in a column. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {letters.length > 1 ? (
                <a
                  className={portalButtonClass({ variant: "ghost", size: "sm" })}
                  href={lettersUrl("html", false)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Print all {letters.length} in one go
                </a>
              ) : null}
              <a
                className={portalButtonClass({ variant: "ghost", size: "sm" })}
                href={lettersUrl("csv", true)}
              >
                {letters.length === 1
                  ? "Code as a spreadsheet"
                  : "All codes as one spreadsheet"}
              </a>
            </div>
          </div>

          {cautions ? (
            <p className="m-0 mt-3 border-l-[3px] border-l-mv-sand-line pl-[10px] text-[12px] leading-[1.55] text-mv-muted">
              {cautions === 1 ? "One of these" : `${cautions} of these`} wants a
              look before it goes — step through them with the arrows above.
            </p>
          ) : null}
        </>
      ) : (
        <p className="m-0 rounded-mv border border-dashed border-mv-line-strong px-4 py-6 text-center text-[13px] text-mv-muted">
          Tick somebody in step 2 and their email is written here, ready to copy.
        </p>
      )}

      <p className="m-0 mt-3 border-l-[3px] border-l-mv-line-strong pl-[10px] text-[12px] leading-[1.55] text-mv-muted">
        {sendNote}
      </p>
    </StepCard>
  );
}

function MailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 border-b border-mv-portal-hairline bg-mv-portal-explain px-3 py-2 text-[12.5px]">
      <span className="w-[52px] flex-none text-[11px] font-bold tracking-[0.05em] text-mv-muted uppercase">
        {label}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
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
    <pre className="m-0 max-h-[300px] overflow-y-auto overscroll-contain bg-mv-card p-3 font-mono text-[12px] leading-[1.65] whitespace-pre-wrap text-mv-ink-soft">
      {text.split("\n").map((line, i) => {
        const key = `${i}-${line.length}`;
        if (line.trim() === code) {
          return (
            <Fragment key={key}>
              <mark className="rounded-md bg-mv-mint px-1.5 py-px text-[15px] font-bold tracking-[0.06em] text-mv-green-ink">
                {code}
              </mark>
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
                {j < parts.length - 1 ? (
                  <mark className="rounded bg-mv-mint px-1 font-semibold text-mv-green-ink">
                    {code}
                  </mark>
                ) : null}
              </Fragment>
            ))}
            {"\n"}
          </Fragment>
        );
      })}
    </pre>
  );
}

function StepArrow({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-mv-line bg-mv-card text-[14px] leading-none text-mv-slate transition-colors hover:border-mv-green hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      {children}
    </button>
  );
}

function QuietButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-semibold text-mv-green-deep underline underline-offset-2 hover:text-mv-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
    >
      {children}
    </button>
  );
}
