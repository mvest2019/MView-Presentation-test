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
 * ── THE MESSAGE LINE IS ALREADY A LIVE REGION ──
 *
 * `aria-live="polite"`, so when the validation and confirmation states land in
 * it they are announced rather than only shown. Declaring the region up front
 * matters: a live region created at the same moment its text arrives is the one
 * case where announcements are unreliable.
 */
export function ProfileCard() {
  return (
    <SettingsCard section={SETTINGS_SECTIONS.profile}>
      <p className="mt-1 mb-3 text-[11px] leading-[1.55] text-mv-muted">
        <span aria-hidden="true" className="font-extrabold text-mv-required">
          *
        </span>{" "}
        {profileCard.requiredNote}
      </p>

      <form>
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
            className="text-[11px] leading-[1.5] text-mv-muted"
          >
            {profileCard.idle}
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
