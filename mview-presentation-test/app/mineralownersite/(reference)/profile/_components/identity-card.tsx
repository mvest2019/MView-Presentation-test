"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import { formatPhoneNumber } from "@/lib/phone";

import { PortalButton } from "../../../_components/ui/button";
import { saveProfileAction } from "../_lib/profile-actions";
import type { ProfilePatch, UserProfile } from "../_lib/profile-api";
import {
  PROFILE_SECTIONS,
  identityForm,
  type ProfileField,
} from "../_lib/profile-data";
import { useProfileLive } from "./profile-live";
import { PROFILE_INPUT_CLASS, ProfileCardShell } from "./profile-shell";

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
    const requiredIds = identityForm.groups.flatMap((group) =>
      group.fields.filter((f) => f.required).map((f) => f.id),
    ) as (keyof BoxValues)[];
    const emptiedRequired = requiredIds.some(
      (id) => box(id).trim() === "" && box(id) !== savedValues[id],
    );
    if (emptiedRequired) {
      setStatus({ kind: "invalid" });
      return;
    }

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
        onInput={() =>
          setStatus((s) => (s.kind === "saving" ? s : { kind: "idle" }))
        }
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
            className={`min-w-0 flex-1 self-center text-[11px] leading-[1.5] ${
              status.kind === "error" ? "text-mv-required" : "text-mv-muted"
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
}: {
  field: ProfileField;
  value: string;
  disabled?: boolean;
}) {
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
