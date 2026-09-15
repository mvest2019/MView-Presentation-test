"use client";

import { useState, type ChangeEvent } from "react";

import { formatPhoneNumber } from "@/lib/phone";

import { PortalButton } from "../../../_components/ui/button";
import {
  PROFILE_SECTIONS,
  identityForm,
  type ProfileField,
} from "../_lib/profile-data";
import { PROFILE_INPUT_CLASS, ProfileCardShell } from "./profile-shell";

/**
 * WHO YOU ARE — the page's only real form.
 *
 * MOVED HERE FROM `settings/_components/profile-card.tsx`, which is now a
 * pointer card. The markup is that component's, kept rather than rewritten, so
 * the move cannot have changed a hint, a `required`, an `autoComplete` or the
 * grouping. What follows is why it is shaped this way; all of it predates the
 * move.
 *
 * SOURCE: `PG.members_entity` for name, email and phone; the mailing address is
 * the one that verified the claim.
 *
 * ── IT IS A CLIENT COMPONENT NOW, BECAUSE THE CONTROLS ANSWER ──
 *
 * Every button on this page rendered enabled and did nothing when pressed —
 * the whole route was a server-rendered still. Asked for directly. Two things
 * moved here:
 *
 *   THE PHONE BOX FORMATS AS IT IS TYPED, the way the register form's does, off
 *   the same `formatPhoneNumber` — see `lib/phone.ts` for why there is one copy
 *   and why it caps at ten digits instead of using `maxLength`.
 *
 *   SAVE VALIDATES AND SAYS SO, through the `aria-live` region that was already
 *   here waiting for it. `identityForm` already carried `idle`, `invalid` and
 *   `saved` strings for this; none of them is new copy.
 *
 * WHAT IT DOES NOT DO IS PRETEND TO PERSIST. `saved` says "(prototype)" in the
 * record because nothing is written anywhere — there is no profile endpoint in
 * this repo. A confirmation that claimed the change had been stored would be
 * the one thing worse than a dead button.
 *
 * BUILD-CONTRACT, and both halves are product rules rather than form
 * decoration:
 *   · changing the email sends a 6-digit code and the change waits for it;
 *   · changing the mailing address RE-RUNS the claim address check before it
 *     applies, because that address is what proved the record was theirs.
 * Both are stated in the field hints, where somebody about to make the change
 * will actually read them.
 *
 * ── THE UI PASS: MARKUP, NOT SUBMISSION ──
 *
 * There is no submit handler and no validation state yet. The fields are
 * uncontrolled (`defaultValue`), and `required` is on the inputs — which means
 * the browser's own constraint validation already works and the message line
 * shows its idle promise. Wiring is a handler on the `<form>` plus a state for
 * that one line; nothing about the layout has to change for it.
 *
 * ── WHY THE FIELDS ARE GROUPED ──
 *
 * "Who you are" and "Where royalty mail arrives" are genuinely different
 * subjects — one is identity, the other is a verified fact about a mineral
 * record — and the mailing address gets read as just another contact detail
 * when it sits under the phone number. A `<fieldset>` with a `<legend>` is the
 * element for that, and it gives a screen reader the same grouping the eye
 * gets.
 *
 * ── REQUIRED IS MARKED, OPTIONAL IS SAID OUT LOUD ──
 *
 * Three of the four are required and the phone is not. The required ones carry
 * a red asterisk AND the card says "everything else is optional", so the reader
 * never has to infer optionality from the absence of a mark. The asterisk is
 * decorative — `aria-hidden` — because `required` on the input is what actually
 * tells assistive tech, and "Full name star" is not a field name.
 *
 * ── THE MESSAGE LINE IS ALREADY A LIVE REGION ──
 *
 * `aria-live="polite"`, so when the validation and confirmation states land in
 * it they are announced rather than only shown. Declaring the region up front
 * matters: a live region created at the same moment its text arrives is the one
 * case where announcements are unreliable.
 */
export function IdentityCard() {
  /*
   * `idle` UNTIL A PRESS, AND BACK TO `idle` ON THE NEXT KEYSTROKE. A "Saved ✓"
   * left standing over a form the reader has since edited is a false statement
   * about the current contents, and an "fill in the required fields" left
   * standing after they have filled them in is nagging. Both clear on input.
   */
  const [status, setStatus] = useState<"idle" | "invalid" | "saved">("idle");

  return (
    <ProfileCardShell section={PROFILE_SECTIONS.identity} className="flex flex-col">
      <p className="mt-1 mb-3 text-[11px] leading-[1.55] text-mv-muted">
        <span aria-hidden="true" className="font-extrabold text-mv-required">
          *
        </span>{" "}
        {identityForm.requiredNote}
      </p>

      {/* `flex-1` TAKES WHATEVER THE ROW IS TALLER THAN THIS CARD. The grid
          stretches both columns to the height of security, which runs ~260px
          longer; without this the form would keep its natural height and hand
          that 260px to the card as blank padding. With it the form owns the
          slack and `mt-auto` on the save row below spends it, putting the
          action on the card's bottom edge. At one column, or any width where
          this card is the taller of the two, there is no slack and both rules
          are inert — the row sits under the last fieldset exactly as before. */}
      <form
        className="flex flex-1 flex-col"
        /* `noValidate` HANDS VALIDATION TO US, NOT TO THE BROWSER. Without it
           the browser's own bubble fires first and the live region below never
           gets a turn, so the page would say one thing and the tooltip
           another. The `required` attributes stay on the inputs — they are what
           `checkValidity()` reads, and what a screen reader announces. */
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setStatus(event.currentTarget.checkValidity() ? "saved" : "invalid");
        }}
        onInput={() => setStatus("idle")}
      >
        {identityForm.groups.map((group) => (
          <fieldset
            key={group.legend}
            className="mb-3 rounded-xl border border-mv-line bg-mv-portal-explain px-3.5 pt-3 pb-1"
          >
            <legend className="px-1 text-[10px] font-extrabold tracking-[0.09em] text-mv-muted uppercase">
              {group.legend}
            </legend>
            {group.fields.map((field) => (
              <ProfileInput key={field.id} field={field} />
            ))}
          </fieldset>
        ))}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span
            aria-live="polite"
            className="text-[11px] leading-[1.5] text-mv-muted"
          >
            {identityForm[status]}
          </span>
          <PortalButton type="submit" variant="primary" size="sm">
            {identityForm.submit}
          </PortalButton>
        </div>
      </form>
    </ProfileCardShell>
  );
}

/** One labelled input — the design's `.field` / `.hint` pair. */
function ProfileInput({ field }: { field: ProfileField }) {
  return (
    <div className="mb-3.5 flex flex-col gap-1.5">
      <label
        htmlFor={field.id}
        className="text-[12.5px] font-bold text-mv-slate"
      >
        {field.label}{" "}
        {field.required ? (
          <span aria-hidden="true" className="font-extrabold text-mv-required">
            *
          </span>
        ) : (
          <span className="font-normal text-mv-muted">
            {identityForm.optionalMark}
          </span>
        )}
      </label>
      <input
        id={field.id}
        name={field.id}
        type={field.type}
        required={field.required}
        defaultValue={field.defaultValue}
        placeholder={field.placeholder}
        autoComplete={field.autoComplete}
        {...(field.type === "tel"
          ? {
              inputMode: "tel" as const,
              /* REWRITTEN IN THE EVENT, BEFORE REACT SEES IT — the same shape
                 the register form uses. The box is uncontrolled (`defaultValue`
                 from the record), so there is no state to round-trip through
                 and no second source of truth for the value. */
              onChange: (event: ChangeEvent<HTMLInputElement>) => {
                event.target.value = formatPhoneNumber(event.target.value);
              },
            }
          : null)}
        aria-describedby={field.hint ? `${field.id}-hint` : undefined}
        className={PROFILE_INPUT_CLASS}
      />
      {field.hint ? (
        <span id={`${field.id}-hint`} className="text-xs text-mv-muted">
          {field.hint}
        </span>
      ) : null}
    </div>
  );
}
