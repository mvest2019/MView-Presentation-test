"use client";

import { Fragment, useState } from "react";
import { z } from "zod";

import { changePasswordSchema } from "../../../../_components/auth-schema";
import { PortalButton } from "../../../_components/ui/button";
import { Notice } from "../../../_components/ui/notice";
import { FutureTag, SettingRow } from "../../settings/_components/setting-row";
import { SettingToggle } from "../../settings/_components/setting-toggle";
import { changePasswordAction } from "../_lib/profile-actions";
import type { PasswordInfo } from "../_lib/profile-api";
import {
  PROFILE_SECTIONS,
  changePassword,
  passwordCopy,
  securityNote,
  securityRows,
  sessions,
  sessionsBlock,
  type ProfileSession,
  type SecurityRow,
} from "../_lib/profile-data";
import { useProfileLive } from "./profile-live";
import { PROFILE_INPUT_CLASS, ProfileCardShell } from "./profile-shell";

/**
 * SECURITY & SIGN-IN — password, two-factor, passkeys, and the device list.
 *
 * ── THE PASSWORD ROW IS LIVE; THE REST IS THE UI PASS, KEPT ON REQUEST ──
 *
 * The password row's facts come from `GET /users/me` and its change goes to
 * `PUT /users/me/password` — the only security endpoint that exists
 * (PROFILE-API-FRONTEND.md). The other controls were briefly stripped in the
 * fixture purge and RESTORED as the UI pass built them (user, 2026-09-17:
 * "don't change this UI"):
 *
 *   CHANGE PASSWORD  opens `ChangePasswordPanel`, below, INSIDE this card —
 *                    not `/reset-password`, which is the FORGOTTEN-password
 *                    path: it mails a single-use link because that visitor
 *                    cannot prove who they are. A reader already signed in can,
 *                    with the password they are replacing. The button is
 *                    disabled only when the API SAYS no password exists (a
 *                    Google account); an unreadable profile leaves it enabled,
 *                    because an outage must not block a password change the
 *                    PUT itself may accept.
 *
 *   TWO-FACTOR       flips LOCAL state — there is nowhere to store it yet
 *                    (contract §7); what the reader gets is a switch that
 *                    behaves like one, and nothing persists a reload.
 *
 *   ADD A PASSKEY    is `disabled`, with the row's own "Future" tag saying
 *                    why. Unbuilt is shown as unbuilt, never as working.
 *
 *   THE DEVICE LIST  is the prototype's three rows; the sign-outs drop rows
 *                    from local state, which is the visible consequence of the
 *                    real action and the closest honest stand-in until the
 *                    server-side session store exists.
 *
 * ── `SettingRow` AND `SettingToggle` ARE IMPORTED FROM THE SETTINGS ROUTE ──
 *
 * Deliberately, and it is the one cross-route import here. Both are pure
 * presentation with no settings content in them — `SettingRow` is a
 * label/hint/control line and `SettingToggle` is the portal's 40 × 22 switch —
 * and a second copy of the switch is exactly how two pages end up with
 * switches that animate differently and disagree about the off colour. If a
 * third route needs them they should move up to `_components/ui/`; two is not
 * yet enough to justify the move.
 *
 * ── WHY THE PASSWORD VALUE IS A ROW OF DOTS AND NOT A LENGTH ──
 *
 * A fixed-width mask says "a password is set" without publishing how long it
 * is. It is `aria-hidden` with the state given as text instead, because a
 * screen reader reading twelve bullet characters is worse than useless.
 *
 * ── WHY THE CURRENT DEVICE HAS NO SIGN-OUT BUTTON ──
 *
 * Signing out the device you are reading on is the "Log out" control in the
 * account menu, where a reader already looks for it. Repeating it in a list of
 * suspicious-device sign-outs invites the misclick whose cost is losing the
 * session you were using to secure the account.
 */
export function SecurityCard({ password }: { password: PasswordInfo | null }) {
  /* the live profile, so a save in the identity card moves this card's facts
     without re-rendering the route */
  const { profile: live } = useProfileLive();
  const passwordInfo = live ? live.password : password;
  const [twoFactor, setTwoFactor] = useState(
    () => securityRows.find((row) => row.toggle)?.on ?? false,
  );
  /* The fixture is the STARTING list, not the list. Signing a device out
     removes it from here; `sessions` itself is never mutated, so a second
     mount is unaffected by what happened on this screen. */
  const [openSessions, setOpenSessions] = useState(sessions);
  const [announcement, setAnnouncement] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);

  /* Signing out every device but this one. It is what "Sign out everywhere
     else" does, and it is ALSO what the password row's hint promises — so the
     password panel's save calls it too, keeping the on-screen list true to the
     sentence above it. (The API itself invalidates no server-side sessions
     yet; this list is the prototype's, restored on request.) */
  const signOutOthers = () => {
    const going = openSessions.filter((session) => !session.current).length;
    setOpenSessions((open) => open.filter((session) => session.current));
    return going;
  };

  /*
   * THE PASSWORD ROW, off `GET /users/me` — and off NOTHING ELSE.
   *
   *   · THERE IS NO "LAST CHANGED" LINE ANY MORE. The contract's second
   *     revision dropped `last_changed_*` outright — `members_entity` records
   *     that a password exists and nothing about when — so the row's hint is
   *     its own copy, never a date, and never `member_since` (a different
   *     fact wearing the answer's clothes);
   *   · `set: false` is the Google account: no password exists, the button is
   *     disabled, and the row says the API's own `unavailable_reason`. Left
   *     enabled, the PUT would answer 409 `USERS_PASSWORD_NOT_SET` and the
   *     reader would be told to fix a password they have never had;
   *   · `password: null` — the read failed — leaves the button ENABLED with
   *     the row's own copy hint. The gate exists for the one account shape the
   *     API has NAMED as passwordless, not for outages (user, 2026-09-17). If
   *     a Google account does slip through, the PUT's 409 lands in the panel
   *     as the same sentence the gate would have shown.
   */
  const passwordHint =
    passwordInfo && !passwordInfo.set
      ? (passwordInfo.unavailable_reason ?? passwordCopy.noPassword)
      : null;
  const canChangePassword = passwordInfo?.set !== false;

  return (
    <ProfileCardShell section={PROFILE_SECTIONS.security}>
      <div className="mt-1.5">
        {securityRows.map((row) => (
          /* THE PANEL IS RENDERED INSIDE THE MAP, not after it, so it opens
             DIRECTLY UNDER the row whose button opened it. Mounted after the
             loop it appeared below Passkey — two rows further down than the
             control that summoned it, which reads as a fourth setting rather
             than as that row unfolding. `aria-controls` cannot fix a position;
             it only names what to look for once you have been told to look. */
          <Fragment key={row.id}>
            <SecurityControlRow
              row={
                row.panel
                  ? {
                      ...row,
                      /* null → the row keeps its own copy hint (the GET
                         failed, so there is no live fact to state) */
                      hint: passwordHint ?? row.hint,
                      /* the mask claims "a password is set" — only the API may
                         say that, so it renders only when it did */
                      value: passwordInfo?.set ? row.value : undefined,
                    }
                  : row
              }
              /* the switch flips LOCAL state — restored UI-pass behavior;
                 there is no 2FA API yet (contract §7) so nothing persists */
              on={row.toggle ? twoFactor : undefined}
              onToggle={row.toggle ? setTwoFactor : undefined}
              panelId={row.panel ? PASSWORD_PANEL_ID : undefined}
              panelOpen={row.panel ? passwordOpen : undefined}
              onPanelToggle={
                /* no handler only when the API SAID no password exists → the
                   row's own fallback renders the button disabled, exactly
                   like Passkey's */
                row.panel && canChangePassword
                  ? () => setPasswordOpen((open) => !open)
                  : undefined
              }
              disabledTitle={
                /* the tooltip says WHY, right under the pointer that just
                   found a dead button (user, 2026-09-17) — only on the
                   Google-account case; Passkey's "Future" tag speaks for
                   itself */
                row.panel && !canChangePassword
                  ? passwordCopy.googleDisabled
                  : undefined
              }
            />
            {row.panel && passwordOpen ? (
              <ChangePasswordPanel
                onCancel={() => setPasswordOpen(false)}
                onSaved={(message) => {
                  /* the hint above this panel promises "signs out every other
                     device" — the on-screen list keeps that promise locally.
                     Nothing is re-fetched: the contract carries no "last
                     changed" fact any more, so the row has nothing new to
                     learn from a GET. */
                  signOutOthers();
                  setPasswordOpen(false);
                  setAnnouncement(message);
                }}
              />
            ) : null}
          </Fragment>
        ))}
      </div>

      <SessionList
        openSessions={openSessions}
        onSignOut={(session) => {
          setOpenSessions((open) => open.filter((s) => s.id !== session.id));
          setAnnouncement(`${session.device} signed out.`);
        }}
        onSignOutAll={() => {
          const going = signOutOthers();
          setAnnouncement(
            `${going} ${going === 1 ? "device" : "devices"} signed out. Only this one is left.`,
          );
        }}
      />

      {/* THE ANNOUNCEMENT HAS NO VISIBLE FORM, and that is not an oversight.
          The list itself is the sighted reader confirmation — the row they
          pressed is gone from under their finger. A screen-reader user gets no
          such signal from a removal, so the same fact is spoken here. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <Notice tone="slate" glyph={securityNote.glyph} className="mt-4">
        <strong>{securityNote.lead}</strong> {securityNote.body}
      </Notice>
    </ProfileCardShell>
  );
}

const PASSWORD_PANEL_ID = "profile-change-password";

/**
 * CHANGE YOUR PASSWORD, WITHOUT LEAVING THE PAGE.
 *
 * ── IT VALIDATES WITH THE APP'S OWN RULE, NOT ITS OWN ──
 *
 * `changePasswordSchema` is built on `registerSchema.shape.password`, so the
 * password this panel accepts is exactly the password the sign-up form accepts.
 * A form that took `abc12345` where register refused it would be a trap the
 * reader only discovers at their next sign-in.
 *
 * ── PLAIN STATE AND A `safeParse`, NOT react-hook-form ──
 *
 * The auth routes use RHF because their forms are long, asynchronous and have
 * per-keystroke gating. This is three boxes checked once on submit. Pulling a
 * form library into the portal bundle to do that would cost every reader of
 * every portal page the download, and the whole handler is the four lines
 * below.
 *
 * ── EVERY MESSAGE THE SCHEMA PRODUCES IS SHOWN, AGAINST ITS OWN FIELD ──
 *
 * `z.flattenError` keys the issues by field name, which is why `fields[].key`
 * in the record is typed as the schema's own keys rather than as `string`: a
 * renamed field then fails to compile here instead of silently losing its error
 * message at runtime.
 *
 * ── IT SENDS — `PUT /users/me/password`, AND ONLY THAT ──
 *
 * The panel can only open when `GET /users/me` answered `password.set: true`,
 * so there is no prototype branch left: every submit that passes the schema
 * goes to the API, and the API's refusals land on their own fields:
 *
 *   · 403 `USERS_PASSWORD_INCORRECT` → inline on the current-password box,
 *     and nothing more — the response carries no details, deliberately;
 *   · 400 `VALIDATION_ERROR` → each `details[].path` against its field;
 *   · anything else → the one form-level line, with the requestId for support.
 *
 * PASSWORDS ARE NOT TRIMMED anywhere on the way through — spaces are part of
 * the secret, and one trimmed here would not match at the next sign-in.
 */
function ChangePasswordPanel({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      id={PASSWORD_PANEL_ID}
      noValidate
      className="mt-1 mb-3 rounded-xl border border-mv-line bg-mv-portal-explain px-3.5 pt-3 pb-3.5"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const parsed = changePasswordSchema.safeParse({
          currentPassword: String(data.get("currentPassword") ?? ""),
          password: String(data.get("password") ?? ""),
          confirmPassword: String(data.get("confirmPassword") ?? ""),
        });
        if (!parsed.success) {
          setErrors(z.flattenError(parsed.error).fieldErrors);
          return;
        }
        setErrors({});
        setFormError(null);

        setBusy(true);
        const result = await changePasswordAction(parsed.data);
        setBusy(false);
        if (!result.ok) {
          if (result.fieldErrors) {
            setErrors(
              Object.fromEntries(
                Object.entries(result.fieldErrors).map(([key, message]) => [
                  key,
                  [message],
                ]),
              ),
            );
          } else {
            setFormError(
              result.requestId
                ? `${result.message} (request ${result.requestId})`
                : result.message,
            );
          }
          return;
        }
        form.reset();
        onSaved(changePassword.saved);
      }}
    >
      <p className="mb-2.5 text-[10px] font-extrabold tracking-[0.09em] text-mv-muted uppercase">
        {changePassword.legend}
      </p>

      {changePassword.fields.map((field) => {
        const message = errors[field.key]?.[0];
        return (
          <div key={field.id} className="mb-3 flex flex-col gap-1.5">
            <label
              htmlFor={field.id}
              className="text-[12.5px] font-bold text-mv-slate"
            >
              {field.label}
            </label>
            <input
              id={field.id}
              name={field.key}
              type="password"
              autoComplete={field.autoComplete}
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? `${field.id}-error` : undefined}
              className={PROFILE_INPUT_CLASS}
            />
            {/* The message is the schema's, verbatim. `role="alert"` so it is
                read on arrival rather than only on a deliberate re-read — the
                reader has just pressed submit and is waiting to be told. */}
            {message ? (
              <span
                id={`${field.id}-error`}
                role="alert"
                className="text-xs text-mv-required"
              >
                {message}
              </span>
            ) : null}
          </div>
        );
      })}

      {/* the one form-level line, for refusals that belong to no single box —
          `role="alert"` so it is read on arrival, requestId included because it
          is what support will ask for */}
      {formError ? (
        <p role="alert" className="mb-2.5 text-xs text-mv-required">
          {formError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <PortalButton size="sm" onClick={onCancel} disabled={busy}>
          {changePassword.cancel}
        </PortalButton>
        <PortalButton size="sm" variant="primary" type="submit" disabled={busy}>
          {changePassword.submit}
        </PortalButton>
      </div>
    </form>
  );
}

/** One security row — a switch row, or a value plus the control that changes it. */
function SecurityControlRow({
  row,
  on,
  onToggle,
  panelId,
  panelOpen,
  onPanelToggle,
  disabledTitle,
}: {
  row: SecurityRow;
  /** The live position, for the one row that is a switch. */
  on?: boolean;
  onToggle?: (next: boolean) => void;
  /** For the one row whose button opens a panel: what it controls, whether
   *  that panel is open, and how to flip it. */
  panelId?: string;
  panelOpen?: boolean;
  onPanelToggle?: () => void;
  /** the native tooltip on the DISABLED fallback button — why this press has
   *  nowhere to go, said where the pointer already is */
  disabledTitle?: string;
}) {
  return (
    <SettingRow
      label={row.label}
      hint={row.hint}
      control={
        <>
          {row.value ? (
            <>
              <span className="sr-only">Set</span>
              <span
                aria-hidden="true"
                className="mr-1 text-[13px] leading-none tracking-[0.12em] text-mv-muted"
              >
                {row.value}
              </span>
            </>
          ) : null}

          {row.future ? <FutureTag /> : null}

          {row.toggle ? (
            <SettingToggle
              id={row.id}
              label={row.label}
              on={on ?? row.on ?? false}
              onToggle={onToggle}
            />
          ) : row.action && onPanelToggle ? (
            /* `aria-expanded` AND `aria-controls` ARE THE WHOLE CONTRACT. The
               panel opens somewhere below this row rather than inside it, so
               without them a screen-reader user presses a button, hears
               nothing, and has no way to know something appeared — or where.
               The label stays "Change password" in both positions: it names the
               destination, and swapping it to "Cancel" would leave the reader
               who tabbed away unsure what the button now does. The panel has a
               Cancel of its own. */
            <PortalButton
              size="sm"
              aria-expanded={panelOpen}
              aria-controls={panelId}
              onClick={onPanelToggle}
            >
              {row.action}
            </PortalButton>
          ) : row.action ? (
            /* No panel and no handler: there is nowhere for this press to
               go, so it says so. `PortalButton` already dresses `:disabled` —
               `cursor-not-allowed` and 55% opacity — and the reason arrives in
               words: the caller's `disabledTitle` as a tooltip under the
               pointer (the Google-account password row), or the row's own
               "Future" tag (Passkey). */
            <PortalButton size="sm" disabled title={disabledTitle}>
              {row.action}
            </PortalButton>
          ) : null}
        </>
      }
    />
  );
}


/**
 * WHERE YOU ARE SIGNED IN — the UI pass's list, restored on request.
 *
 * A `<ul>` and not a table: three columns of device, place and time look
 * tabular, but each row is one object with a control attached rather than a
 * grid of comparable values, and at phone width a table of this shape either
 * scrolls sideways or collapses into something a reader has to re-learn. The
 * list wraps.
 *
 * The rows are prototype figures and the sign-outs act on local state — there
 * is no server-side session store yet (contract §7), so nothing here persists
 * a reload and nothing claims to have reached a server.
 */
function SessionList({
  openSessions,
  onSignOut,
  onSignOutAll,
}: {
  openSessions: ProfileSession[];
  onSignOut: (session: ProfileSession) => void;
  onSignOutAll: () => void;
}) {
  /* Nothing left but the device you are reading on — so the button that would
     sign out "everywhere else" has no "else" to act on. Disabled rather than
     hidden: a control that disappears once used leaves the reader wondering
     whether they imagined it. */
  const others = openSessions.filter((session) => !session.current).length;

  return (
    <section aria-labelledby="profile-sessions" className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4
          id="profile-sessions"
          className="m-0 text-[13px] leading-[1.35] font-bold"
        >
          {sessionsBlock.heading}
        </h4>
        <PortalButton size="sm" disabled={others === 0} onClick={onSignOutAll}>
          {sessionsBlock.signOutAll}
        </PortalButton>
      </div>
      <p className="mt-0.5 text-xs leading-[1.5] text-mv-muted">
        {sessionsBlock.hint}
      </p>

      <ul className="mt-1.5 list-none p-0">
        {openSessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            onSignOut={() => onSignOut(session)}
          />
        ))}
      </ul>
    </section>
  );
}

function SessionItem({
  session,
  onSignOut,
}: {
  session: ProfileSession;
  onSignOut: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mv-portal-hairline py-[11px] last:border-b-0">
      <div className="min-w-0 flex-1 basis-44">
        <strong className="block text-[13px] leading-[1.45]">
          {session.device}
        </strong>
        <span className="mt-0.5 block text-xs leading-[1.5] text-mv-muted">
          {session.place} · {session.lastActive}
        </span>
      </div>
      <div className="ml-auto flex-none">
        {session.current ? (
          /* Not a `Badge` — this marks the reader's own row rather than
             classifying it, and the mint badge tone reads as a status the way
             "Estimate" does. A quiet label is the right weight. */
          <span className="text-[11.5px] font-semibold text-mv-muted">
            {sessionsBlock.currentTag}
          </span>
        ) : (
          <PortalButton
            size="sm"
            /* The visible label is "Sign out" on every row; the accessible name
               says which device, because three identical buttons read in
               sequence give a screen-reader user no way to choose. */
            aria-label={`${sessionsBlock.signOutOne} — ${session.device}, ${session.place}`}
            onClick={onSignOut}
          >
            {sessionsBlock.signOutOne}
          </PortalButton>
        )}
      </div>
    </li>
  );
}
