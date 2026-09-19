"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { formatPhoneNumber } from "@/lib/phone";

import { registerSchema } from "../../../../_components/auth-schema";
import { PortalButton } from "../../../_components/ui/button";
import { saveProfileAction } from "../_lib/profile-actions";
import type { ProfilePatch, UserProfile } from "../_lib/profile-api";
import {
  PROFILE_SECTIONS,
  identityForm,
  type ProfileField,
} from "../_lib/profile-data";
import { useProfileLive } from "./profile-live";
import { ProfileCardShell, profileInputClass } from "./profile-shell";

/**
 * WHO YOU ARE — the page's only real form, and IT SAVES NOW.
 *
 * `profile` is `GET /users/me`. When that read failed, `seed` is the SESSION
 * cookie's name and email — what the sign-in flow stored, so a signed-in
 * reader still sees and edits THEIR values rather than blanks, and the first
 * save patches them onto the record (user: "if user login then take their
 * info auto patch"). The seed is the diff baseline like any other: only boxes
 * the reader changes against it are sent. There is no fixture fallback and no
 * prototype save — with neither a profile nor a session the boxes render
 * empty and disabled with a sentence saying why. Everything below is the live
 * path.
 *
 * ── ONLY DIRTY FIELDS ARE SENT ──
 *
 * `PATCH /users/me` reads `""` as "clear this field" and an omitted key as
 * "leave it alone" — so a form that serialises every input would DELETE every
 * stored value the reader left blank. `savedValues` holds what the record
 * currently says (seeded from the GET, replaced from each write's own
 * response), the submit diffs the boxes against it, and only what moved goes
 * on the wire. A submit where nothing moved says "No changes" without a
 * round trip, which is also what the endpoint's `changed: []` would answer.
 *
 * ── THE EMAIL IS SHOWN, NOT EDITABLE ──
 *
 * The box renders disabled (`locked` on its field record) and the submit never
 * reads it into the patch: `PATCH /users/me` refuses the `email` key anyway
 * (400, unrecognized key). The card briefly offered the address's own
 * three-step change — send-code, verify-code, `PATCH /users/me/email`, behind
 * an inline code panel — and the OPTION was removed on request (user,
 * 2026-09-17: "do not give option to edit mail"). The server half stays wired
 * in `profile-actions.ts`, verified against the live API, so restoring the
 * option is re-adding the panel (git history, 2026-09-17), not re-learning
 * the contract.
 *
 * ── ONE NAME BOX MEANS `full_name`, AND THE SPLIT IS THE SERVER'S ──
 *
 * The API prefers `first_name`/`last_name` because it splits `full_name` on
 * the LAST space — right for "Mary Jane Smith", wrong for "Ana Van Der Berg".
 * This screen keeps its single box (the register form's shape), so it sends
 * `full_name` and accepts that documented behavior rather than re-guessing
 * the split in the browser.
 *
 * ── EVERY SUCCESSFUL WRITE IS PUBLISHED TO `ProfileLive` ──
 *
 * Both writes answer with the complete fresh profile, and the strip above
 * this card and the security card beside it read the live context — so a save
 * shows everywhere the same tick. This replaced `router.refresh()`, which
 * re-rendered the whole route and therefore waited on the chrome's
 * multi-minute cold owner scan before the strip moved (user, 2026-09-17).
 */

/** the form's boxes, keyed by input id — what the record currently says */
type BoxValues = Record<
  | "profile-name"
  | "profile-email"
  | "profile-phone"
  | "profile-address"
  | "profile-city"
  | "profile-zip",
  string
>;

function boxesFrom(p: UserProfile): BoxValues {
  return {
    "profile-name": p.full_name ?? "",
    "profile-email": p.email,
    "profile-phone": p.phone ?? "",
    "profile-address": p.mailing_address.street ?? "",
    "profile-city": p.mailing_address.city ?? "",
    "profile-zip": p.mailing_address.zip ?? "",
  };
}

/** input id → PATCH field, for the five that ride `PATCH /users/me` */
const PATCH_KEYS = {
  "profile-name": "full_name",
  "profile-phone": "phone",
  "profile-address": "mailing_address",
  "profile-city": "city",
  "profile-zip": "zip",
} as const;

type Status =
  | { kind: "idle" | "invalid" | "saving" | "noChanges" }
  | { kind: "saved"; message: string }
  | { kind: "error"; message: string; requestId?: string };

/**
 * ONE SENTENCE PER BOX THAT IS WRONG — keyed by input id.
 *
 * ── WHY THE SUMMARY LINE WAS NOT ENOUGH (QA, my profile #1) ──
 *
 * Emptying the name and pressing save DID refuse the write and DID say
 * "Please fill in the required fields marked *" — in muted grey, at the
 * bottom of a card whose form is eight boxes tall, naming none of them. QA
 * read that as no error at all, which is the correct reading: a refusal the
 * reader cannot see, beside a field the reader cannot find, is a form that
 * silently did nothing.
 *
 * So the fault is now stated ON the box that carries it — red border, red
 * sentence under the label, `aria-invalid` — the first one takes focus, and
 * the summary line turns red with the rest. The summary stays because a
 * screen-reader user who has not yet reached the field needs to be told
 * something happened; it is no longer the ONLY thing that speaks.
 */
type FieldErrors = Partial<Record<keyof BoxValues, string>>;

/**
 * THE PHONE RULE IS THE REGISTER FORM'S, NOT A SECOND ONE (QA, my profile #9).
 *
 * `(865) 424-54` saved without complaint — the box formatted as you typed and
 * validated nothing, so eight digits reached `PATCH /users/me` as a phone
 * number. The register form has refused exactly that since August, through
 * four rules (characters, exactly ten digits, no repdigit, NANP structure),
 * and the formatter under this box is already that form's own. Borrowing the
 * schema rather than restating the rules is the same decision `lib/phone.ts`
 * records: two boxes that ask one question must not answer it differently.
 *
 * Empty passes — the field is optional here as it is there.
 */
const phoneRule = registerSchema.shape.phone;

export function IdentityCard({
  profile,
  seed,
}: {
  profile: UserProfile | null;
  /** the session cookie's name and email — the boxes' values and diff baseline
   *  when the GET failed, so their first save patches the login's own info */
  seed: { name: string; email: string } | null;
}) {
  /* where every write's fresh profile goes, so the strip and the security
     card reflect a save the same tick — see `profile-live.tsx` for why this
     replaced `router.refresh()` (the route re-render dragged the chrome's
     multi-minute owner scan along, and the reader watched the old name stand) */
  const { update: publishProfile } = useProfileLive();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [savedValues, setSavedValues] = useState<BoxValues | null>(() =>
    profile
      ? boxesFrom(profile)
      : seed
        ? {
            "profile-name": seed.name,
            "profile-email": seed.email,
            "profile-phone": "",
            "profile-address": "",
            "profile-city": "",
            "profile-zip": "",
          }
        : null,
  );
  const busy = status.kind === "saving";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    /* unreachable while the button is disabled, kept as the guard it is */
    if (!savedValues) return;

    /* read through `form.elements`, NOT `FormData`: FormData omits disabled
       inputs, so the locked email box would read as "" — which the required
       check below would take for an emptied field and refuse every save */
    const box = (id: keyof BoxValues) => {
      const el = form.elements.namedItem(id);
      return el instanceof HTMLInputElement ? el.value : "";
    };

    const patch: ProfilePatch = {};
    for (const id of Object.keys(PATCH_KEYS) as (keyof typeof PATCH_KEYS)[]) {
      const value = box(id);
      if (value !== savedValues[id]) patch[PATCH_KEYS[id]] = value;
    }

    /*
     * REQUIRED GUARDS THE STORED VALUE, NOT THE BOX. `form.checkValidity()`
     * used to run here, and it refused the whole save while ANY required box
     * was empty — so with the record unreadable (street seeded empty), editing
     * just the name was blocked by a field the reader never touched (user,
     * 2026-09-17: "editing my name but not work"). Only dirty fields are sent,
     * so an untouched empty box was never going anywhere anyway.
     *
     * What `required` still refuses is EMPTYING one of those boxes: a dirty
     * empty required field would be sent as `""`, which the API reads as
     * "clear this stored value" — exactly what a required field must not let
     * happen.
     */
    /* `ProfileField[]` written out: `groups` is a readonly tuple of readonly
       tuples, so an un-annotated `flatMap` infers the tuple rather than the
       union and every `field.id` below reads as `unknown`. */
    const allFields: ProfileField[] = identityForm.groups.flatMap(
      (group) => [...group.fields],
    );
    const errors: FieldErrors = {};

    for (const field of allFields) {
      const id = field.id as keyof BoxValues;
      const value = box(id);
      if (field.locked) continue;

      if (field.required && value.trim() === "" && value !== savedValues[id]) {
        /* names the box, because "the required fields" names none of them */
        errors[id] = `${field.label} is required.`;
        continue;
      }

      /* THE PHONE IS CHECKED WHENEVER IT IS DIRTY AND NOT EMPTY. Clearing it
         is legitimate (the field is optional), so "" skips the rule — but a
         half-typed number does not, which is the whole of QA #9. */
      if (field.type === "tel" && value.trim() !== "" && value !== savedValues[id]) {
        const parsed = phoneRule.safeParse(value);
        if (!parsed.success) errors[id] = parsed.error.issues[0].message;
      }
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setStatus({ kind: "invalid" });
      /* THE FIRST BAD BOX TAKES FOCUS. On a form this tall the fault can be
         off-screen under the fold, and a message about a field you cannot see
         is the defect this fix exists for — the browser scrolls to it. */
      const firstBad = allFields.find((f) => errors[f.id as keyof BoxValues]);
      if (firstBad) {
        const el = form.elements.namedItem(firstBad.id);
        if (el instanceof HTMLInputElement) el.focus();
      }
      return;
    }
    setFieldErrors({});

    if (!Object.keys(patch).length) {
      setStatus({ kind: "noChanges" });
      return;
    }

    setStatus({ kind: "saving" });

    const result = await saveProfileAction(patch);
    if (!result.ok) {
      setStatus({
        kind: "error",
        message: result.message,
        requestId: result.requestId,
      });
      return;
    }
    setSavedValues(boxesFrom(result.profile));
    publishProfile(result.profile);
    setStatus({ kind: "saved", message: identityForm.savedLive });
  }

  const message = !savedValues
    ? identityForm.unavailable
    : status.kind === "saved" || status.kind === "error"
      ? status.message
      : identityForm[status.kind];

  return (
    <ProfileCardShell section={PROFILE_SECTIONS.identity} className="flex flex-col">
      <p className="mt-1 mb-3 text-[11px] leading-[1.55] text-mv-muted">
        <span aria-hidden="true" className="font-extrabold text-mv-required">
          *
        </span>{" "}
        {identityForm.requiredNote}
      </p>

      {/* `flex-1` takes whatever the row is taller than this card; `mt-auto`
          on the save row spends it — see the grid note in `page.tsx`. */}
      <form
        className="flex flex-1 flex-col"
        /* `noValidate` hands validation to us so the live region below speaks,
           not the browser's bubble; `required` stays on the inputs for
           assistive tech and the submit's own emptied-required check. */
        noValidate
        onSubmit={onSubmit}
        onInput={(event) => {
          setStatus((s) => (s.kind === "saving" ? s : { kind: "idle" }));
          /* THE SENTENCE GOES WHEN THE BOX IS TOUCHED, not when the next
             submit re-checks it: a red border standing under a field the
             reader has just fixed reads as "still wrong". Only that box's
             error clears — the others are still true. */
          const target = event.target;
          if (!(target instanceof HTMLInputElement)) return;
          const id = target.id as keyof BoxValues;
          setFieldErrors((current) =>
            current[id] ? { ...current, [id]: undefined } : current,
          );
        }}
      >
        {identityForm.groups.map((group) => (
          <fieldset
            key={group.legend}
            className="mb-3 rounded-xl border border-mv-line bg-mv-portal-explain px-3.5 pt-3 pb-1"
          >
            <legend className="px-1 text-[10px] font-extrabold tracking-[0.09em] text-mv-muted uppercase">
              {group.legend}
            </legend>
            {group.fields.map((field: ProfileField) => (
              <ProfileInput
                key={field.id}
                field={field}
                /* the record's value, seeded once (uncontrolled) — or empty
                   AND disabled when the record could not be read. No fixture.
                   A `locked` field (the email) is disabled even when the
                   record loaded: shown, never editable. */
                value={
                  savedValues ? savedValues[field.id as keyof BoxValues] : ""
                }
                disabled={!savedValues || Boolean(field.locked)}
                error={fieldErrors[field.id as keyof BoxValues]}
              />
            ))}
          </fieldset>
        ))}

        {/* THE BUTTON MUST NOT MOVE WHEN THE MESSAGE GROWS (user, 2026-09-17).
            A long message — a service error with its requestId — used to do it
            twice over: `flex-wrap` pushed the button onto its own line, and
            once that was fixed, `items-center` re-centered it in the taller
            row, which grows UPWARD because `mt-auto` pins this row to the
            card's bottom edge — measured, the button floated up 39px. So: no
            wrap (the message owns the leftover width, `min-w-0 flex-1`, and
            wraps inside it), the button is `shrink-0`, and the row is
            `items-end` — the button hugs the pinned bottom edge and stays
            exactly where it was pressed, however many lines the sentence
            takes. */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span
            aria-live="polite"
            /* RED FOR `invalid` AS WELL AS `error` (QA, my profile #1). A
               refusal printed in the same muted grey as "Changes apply
               immediately after you save." is a refusal nobody reads — it was
               there, and QA logged the save as silently doing nothing. */
            className={`min-w-0 flex-1 self-center text-[11px] leading-[1.5] ${
              status.kind === "error" || status.kind === "invalid"
                ? "text-mv-required"
                : "text-mv-muted"
            }`}
          >
            {message}
            {status.kind === "error" && status.requestId ? (
              /* what support will ask for, so it is on screen already */
              <> (request {status.requestId})</>
            ) : null}
          </span>
          <PortalButton
            type="submit"
            variant="primary"
            size="sm"
            className="shrink-0"
            disabled={busy || !savedValues}
          >
            {status.kind === "saving" ? identityForm.saving : identityForm.submit}
          </PortalButton>
        </div>
      </form>
    </ProfileCardShell>
  );
}

/*
 * `EmailCodePanel` — the inline six-digit step of the email change — lived
 * here and was removed WITH the option to edit the address (user, 2026-09-17:
 * "do not give option to edit mail"). The panel, its copy (`emailVerify` in
 * `profile-data.ts`) and the card's dirty-email branch are all in git history
 * (2026-09-17); the server half — send-code, verify-code,
 * `PATCH /users/me/email`, verified against the live API's own Swagger — stays
 * wired in `profile-actions.ts`, so restoring the option is UI work only.
 */

/** One labelled input — the design's `.field` / `.hint` pair. */
function ProfileInput({
  field,
  value,
  disabled,
  error,
}: {
  field: ProfileField;
  value: string;
  disabled?: boolean;
  /** What is wrong with this box right now — see `FieldErrors` above. */
  error?: string;
}) {
  const errorId = `${field.id}-error`;
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
        defaultValue={value}
        disabled={disabled}
        placeholder={field.placeholder}
        autoComplete={field.autoComplete}
        {...(field.type === "tel"
          ? {
              inputMode: "tel" as const,
              /* rewritten in the event, before React sees it — the register
                 form's shape; the box stays uncontrolled */
              onChange: (event: ChangeEvent<HTMLInputElement>) => {
                event.target.value = formatPhoneNumber(event.target.value);
              },
            }
          : null)}
        aria-invalid={error ? true : undefined}
        /* the error FIRST, so it is the thing read on arrival at the box —
           the hint still follows for a reader who needs the rule as well */
        aria-describedby={
          [error ? errorId : null, field.hint ? `${field.id}-hint` : null]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={profileInputClass(Boolean(error))}
      />
      {/* `role="alert"` — the reader has just pressed save and is waiting to
          be told. Same treatment as the change-password panel's messages. */}
      {error ? (
        <span id={errorId} role="alert" className="text-xs text-mv-required">
          {error}
        </span>
      ) : null}
      {field.hint ? (
        <span id={`${field.id}-hint`} className="text-xs text-mv-muted">
          {field.hint}
        </span>
      ) : null}
    </div>
  );
}
