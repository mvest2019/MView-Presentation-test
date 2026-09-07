"use client";

import { useState } from "react";

import { PortalButton } from "../../_components/ui/button";
import { SETTINGS_SECTIONS, profileCard } from "../_lib/settings-data";
import type { ProfileField } from "../_lib/settings-data";
import { SettingsCard } from "./settings-card";

/**
 * PROFILE & CONTACT — the page's only real form.  (v35 · feedback 19)
 *
 * SOURCE: `PG.members_entity` for name, email and phone; the mailing address is
 * the one that verified the claim.
 *
 * BUILD-CONTRACT, and both halves are product rules rather than form
 * decoration:
 *   · changing the email sends a 6-digit code and the change waits for it;
 *   · changing the mailing address RE-RUNS the claim address check before it
 *     applies, because that address is what proved the record was theirs.
 * Both are stated in the field hints, where somebody about to make the change
 * will actually read them. In this build the save is a confirmation only.
 *
 * ── WHY THE FIELDS ARE GROUPED ──
 *
 * Feedback 19 was that this card was a flat stack of four inputs. "Who you are"
 * and "Where royalty mail arrives" are genuinely different subjects — one is
 * identity, the other is a verified fact about a mineral record — and the
 * mailing address gets read as just another contact detail when it sits under
 * the phone number. A `<fieldset>` with a `<legend>` is the element for that,
 * and it gives a screen reader the same grouping the eye gets.
 *
 * ── REQUIRED IS MARKED, OPTIONAL IS SAID OUT LOUD ──
 *
 * Three of the four are required and the phone is not. The design marks the
 * required ones with a red asterisk AND says "everything else is optional", so
 * the reader never has to infer optionality from the absence of a mark. The
 * asterisk is decorative — `aria-hidden` — because `required` on the input is
 * what actually tells assistive tech, and "Full name star" is not a field name.
 *
 * ── THE MESSAGE LINE, AND WHY IT IS A LIVE REGION ──
 *
 * One line does three jobs: the idle promise, the validation failure, and the
 * confirmation. It is `aria-live="polite"` so a change of state is announced
 * rather than only shown — a sighted reader sees the text turn red, and this is
 * the same information for somebody who cannot.
 */
export function ProfileCard() {
  const [status, setStatus] = useState<"idle" | "invalid" | "saved">("idle");

  const message =
    status === "invalid"
      ? profileCard.invalid
      : status === "saved"
        ? profileCard.saved
        : profileCard.idle;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    /*
     * ALWAYS PREVENTED. There is nowhere to submit to — this is a design build —
     * and letting the form navigate would reload the portal and drop the
     * reader's `?view=` and `?state=`.
     */
    event.preventDefault();

    /* `checkValidity()` rather than the prototype's hand-rolled scan for
       `input:required:invalid` plus a second pass for empty values. The browser
       already knows, and it knows about the email field's format too, which the
       hand-rolled version missed. */
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      setStatus("invalid");
      /*
       * `input:invalid`, AND THE `input` IS LOAD-BEARING.
       *
       * A bare `:invalid` also matches the `<fieldset>` wrapping the fields —
       * HTML gives fieldsets and forms that pseudo-class when they CONTAIN an
       * invalid control — and a fieldset is not focusable, so `.focus()` was a
       * silent no-op. Measured: the message line turned red and the caret stayed
       * wherever it was, which on a four-field form is the reader hunting for
       * which one is missing.
       */
      form.querySelector<HTMLInputElement>("input:invalid")?.focus();
      return;
    }
    setStatus("saved");
  }

  return (
    <SettingsCard section={SETTINGS_SECTIONS.profile}>
      <p className="mt-1 mb-3 text-[11px] leading-[1.55] text-mv-muted">
        <span aria-hidden="true" className="font-extrabold text-mv-required">
          *
        </span>{" "}
        {profileCard.requiredNote}
      </p>

      {/* `noValidate` so the browser's own bubble does not pre-empt the card's
          message line — the validity check above is still the browser's. */}
      <form onSubmit={onSubmit} noValidate>
        {profileCard.groups.map((group) => (
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span
            aria-live="polite"
            className={`text-[11px] leading-[1.5] ${
              status === "invalid"
                ? "text-mv-required"
                : status === "saved"
                  ? "font-semibold text-mv-green-deep"
                  : "text-mv-muted"
            }`}
          >
            {message}
          </span>
          <PortalButton type="submit" variant="primary" size="sm">
            {profileCard.submit}
          </PortalButton>
        </div>
      </form>
    </SettingsCard>
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
            {profileCard.optionalMark}
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
        aria-describedby={field.hint ? `${field.id}-hint` : undefined}
        className="w-full rounded-[9px] border border-mv-line-strong bg-mv-card px-3 py-[11px] text-sm text-mv-ink outline-none placeholder:text-mv-placeholder focus-visible:border-mv-green focus-visible:outline-2 focus-visible:outline-mv-green"
      />
      {field.hint ? (
        <span id={`${field.id}-hint`} className="text-xs text-mv-muted">
          {field.hint}
        </span>
      ) : null}
    </div>
  );
}
