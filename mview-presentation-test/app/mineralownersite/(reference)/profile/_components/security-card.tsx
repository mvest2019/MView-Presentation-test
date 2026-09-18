"use client";

import { Fragment, useCallback, useState } from "react";
import { z } from "zod";

import { changePasswordSchema } from "../../../../_components/auth-schema";
import { PortalButton } from "../../../_components/ui/button";
import { Notice } from "../../../_components/ui/notice";
import { FutureTag, SettingRow } from "../../settings/_components/setting-row";
import { SettingToggle } from "../../settings/_components/setting-toggle";
import {
  changePasswordAction,
  listSessionsAction,
  signOutOtherSessionsAction,
  signOutSessionAction,
} from "../_lib/profile-actions";
import type { PasswordInfo } from "../_lib/profile-api";
import {
  PROFILE_SECTIONS,
  SESSION_REVOKED,
  changePassword,
  lastActiveLabel,
  passwordCopy,
  securityNote,
  securityRows,
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
 *   THE DEVICE LIST  IS REAL NOW. It reads `GET /users/me/sessions`, both
 *                    sign-outs reach the API, and what they end stays ended
 *                    across a reload — the server-side session store the note
 *                    above was waiting for is `src/modules/sessions` on the
 *                    backend. The markup did not change; only where the rows
 *                    come from. The password row's hint about signing other
 *                    devices out is now true as well: the API does that sweep
 *                    itself, inside the write, so it reaches devices this page
 *                    never listed.
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
export function SecurityCard({
  password,
  sessions,
  sessionsError: initialSessionsError,
}: {
  password: PasswordInfo | null;
  /**
   * The signed-in devices, read by the PAGE and handed down.
   *
   * Not fetched here. The list arrives with the first paint rather than after
   * it, there is no loading state to render into a panel three rows tall, and
   * this repo's React Compiler lint refuses `setState` inside an effect — which
   * is what fetch-on-mount is. Re-reads after a sign-out run from an event
   * handler, which is allowed and is also when they are actually needed.
   */
  sessions: ProfileSession[];
  /**
   * Set when the page's read FAILED, null when it succeeded.
   *
   * It is what tells an empty `sessions` apart from an unknown one: empty with
   * this null means nothing else is signed in, empty with a message here means
   * we could not look. The panel must never render the first when it has the
   * second.
   */
  sessionsError: string | null;
}) {
  /* the live profile, so a save in the identity card moves this card's facts
     without re-rendering the route */
  const { profile: live } = useProfileLive();
  const passwordInfo = live ? live.password : password;
  const [twoFactor, setTwoFactor] = useState(
    () => securityRows.find((row) => row.toggle)?.on ?? false,
  );
  /* The page's read is the STARTING list. It moves from here on: a sign-out
     re-reads and replaces it, so what is on screen is always an answer the
     server gave rather than one this component inferred. */
  const [openSessions, setOpenSessions] = useState(sessions);
  const [sessionsError, setSessionsError] = useState(initialSessionsError);
  /* Which control is mid-flight: a session id, or ALL. Disables every button so
     two overlapping requests cannot each be followed by a re-read, with the
     older answer landing last and putting a signed-out row back. */
  const [busy, setBusy] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);

  /**
   * RE-READ, NEVER SPLICE — after every sign-out and after a password change.
   *
   * Removing the row locally looks identical in the happy case and lies in two
   * real ones: a device that signed in elsewhere while this page was open stays
   * invisible, and a row the server did NOT end (an id already gone, a sweep
   * that reached further than this list) changes on screen anyway. This panel's
   * whole job is telling a member the truth about their own account, so it asks.
   *
   * Called from event handlers only — never from an effect.
   */
  const loadSessions = useCallback(async () => {
    const result = await listSessionsAction();
    if (result.ok) {
      setOpenSessions(result.sessions);
      setSessionsError(null);
      return;
    }
    if (result.code === SESSION_REVOKED) return signInAgain();
    /* The list is LEFT AS IT WAS and the failure is stated beside it. Blanking
       it would turn "we could not re-read" into "nothing is signed in" — the
       one wrong answer on this panel that could matter. */
    setSessionsError(result.message);
  }, []);

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
                  /* THE API DID THE SWEEP, so the list is RE-READ rather than
                     edited. The hint above this panel promises a change "signs
                     out every other device" and the server now keeps that
                     promise itself — including for devices this page never
                     listed. Re-reading shows what actually happened; splicing
                     would show what we assumed. The server's own sentence is
                     what gets announced, because only it knows whether the
                     sweep ran and how far it reached. */
                  void loadSessions();
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
        error={sessionsError}
        busy={busy}
        onSignOut={async (session) => {
          setBusy(session.id);
          const result = await signOutSessionAction(session.id);
          setBusy(null);
          if (!result.ok) {
            if (result.code === SESSION_REVOKED) return signInAgain();
            setSessionsError(result.message);
            setAnnouncement(result.message);
            return;
          }
          await loadSessions();
          /* `signedOut: 0` is a SUCCESS — the row was already gone. Saying
             "signed out" about it would be a small lie, and this panel is read
             by somebody checking whether a stranger still has access. */
          setAnnouncement(
            result.signedOut > 0
              ? `${session.device} signed out.`
              : `${session.device} was already signed out.`,
          );
        }}
        onSignOutAll={async () => {
          setBusy(ALL);
          const result = await signOutOtherSessionsAction();
          setBusy(null);
          if (!result.ok) {
            if (result.code === SESSION_REVOKED) return signInAgain();
            setSessionsError(result.message);
            setAnnouncement(result.message);
            return;
          }
          await loadSessions();
          const going = result.signedOut;
          setAnnouncement(
            going === 0
              ? "No other devices were signed in."
              : `${going} ${going === 1 ? "device" : "devices"} signed out. Only this one is left.`,
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
        /* THE SERVER'S SENTENCE, when it has one. Only the API knows how many
           other devices the change actually signed out — or that the sweep
           could not run, which the member needs to hear because the password
           DID change either way. `changePassword.saved` stays as the fallback
           for an API that predates the sessions work. */
        onSaved(result.note ?? changePassword.saved);
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


/** `busy` when the "sign out everywhere else" request is in flight. */
const ALL = "__all__";

/**
 * THIS DEVICE HAS BEEN SIGNED OUT — leave, properly.
 *
 * The action has already dropped the session cookie by the time this runs, so
 * the reader really is signed out; this is what makes the screen agree with
 * that. `/login?signedOut=1` explains the sign-in page they did not ask for.
 *
 * ── A FULL NAVIGATION, NOT A ROUTER PUSH ──────────────────────────────────
 *
 * `window.location.assign` throws the whole page away. A soft navigation would
 * keep this React tree alive — including the portal chrome still showing a
 * signed-in member's name and whatever data the other cards had already
 * loaded. A device that has been signed out must not be left wearing the
 * signed-in shell.
 *
 * ── AND NOT A DISMISSABLE DIALOG ──────────────────────────────────────────
 *
 * A modal saying "you were signed out" leaves a reader who presses Escape
 * sitting on a private page their session no longer backs, with every control
 * silently broken. The honest response to "you are signed out" is the sign-in
 * screen.
 */
function signInAgain(): void {
  /* eslint-disable-next-line @next/next/no-location-assign-relative-destination --
     The rule prefers `router.push` for internal routes, and it is right almost
     everywhere. Not here: a soft navigation is exactly what must NOT happen.
     This is a sign-out, and the point is that nothing of the signed-in session
     survives it — no client cache, no already-fetched account data, no chrome
     still holding the member's name. A full document load guarantees that; a
     push only unmounts the route. */
  window.location.assign("/login?signedOut=1");
}

/**
 * WHERE YOU ARE SIGNED IN — now a read from `GET /users/me/sessions`.
 *
 * A `<ul>` and not a table: three columns of device, place and time look
 * tabular, but each row is one object with a control attached rather than a
 * grid of comparable values, and at phone width a table of this shape either
 * scrolls sideways or collapses into something a reader has to re-learn. The
 * list wraps. That was true of the prototype and is unchanged — the markup
 * below is the UI pass's, to the class.
 *
 * ── WHAT CHANGED IS ONLY WHERE THE ROWS COME FROM ─────────────────────────
 *
 * They are the member's real sessions, the sign-outs reach a server, and both
 * survive a reload. There is no loading state to render — the page reads the
 * list before it paints — but there are now two answers the prototype never
 * had, and they are NOT the same answer:
 *
 *   EMPTY         nothing else is signed in. Reassurance, and a real fact.
 *   UNAVAILABLE   the read failed. Says so. "No other devices are signed in"
 *                 when we could not look is the one wrong answer that would
 *                 matter here — exactly the reassurance a member checking for
 *                 an intruder must not be given falsely.
 */
function SessionList({
  openSessions,
  error,
  busy,
  onSignOut,
  onSignOutAll,
}: {
  openSessions: ProfileSession[];
  /** Set when the last read or write failed; shown under the list. */
  error: string | null;
  /** A session id, or `ALL`, while that control's request is in flight. */
  busy: string | null;
  onSignOut: (session: ProfileSession) => void;
  onSignOutAll: () => void;
}) {
  /* Nothing left but the device you are reading on — so the button that would
     sign out "everywhere else" has no "else" to act on. Disabled rather than
     hidden: a control that disappears once used leaves the reader wondering
     whether they imagined it. Disabled mid-request for the same reason. */
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
        <PortalButton
          size="sm"
          disabled={others === 0 || busy !== null}
          onClick={onSignOutAll}
        >
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
            busy={busy === session.id}
            disabled={busy !== null}
            onSignOut={() => onSignOut(session)}
          />
        ))}
      </ul>

      {/* The empty line renders only on a read that SUCCEEDED and came back
          with nothing. With an error standing, the error is the honest answer
          and this sentence would contradict it. */}
      {openSessions.length === 0 && !error ? (
        <p className="mt-2 text-xs leading-[1.5] text-mv-muted">
          {sessionsBlock.empty}
        </p>
      ) : null}

      {/* `role="alert"` so it is read on arrival: the reader has just pressed
          something and is waiting to be told what happened. */}
      {error ? (
        <p role="alert" className="mt-2 text-xs leading-[1.5] text-mv-required">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function SessionItem({
  session,
  busy,
  disabled,
  onSignOut,
}: {
  session: ProfileSession;
  /** This row's own request is in flight. */
  busy: boolean;
  /** Some other row's is — every button waits, so two cannot race. */
  disabled: boolean;
  onSignOut: () => void;
}) {
  /**
   * "Beeville, TX · Yesterday, 7:42 PM", or just the time.
   *
   * `place` is null on every row today (the API configures no geolocation
   * provider) and the separator goes with it — a leading " · " would read as a
   * fact that failed to load. The time is phrased HERE, in the browser, because
   * the API sends an ISO instant and the phrase belongs in the reader's own
   * timezone.
   */
  const when = lastActiveLabel(session.lastActive);
  const detail = session.place ? `${session.place} · ${when}` : when;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-mv-portal-hairline py-[11px] last:border-b-0">
      <div className="min-w-0 flex-1 basis-44">
        <strong className="block text-[13px] leading-[1.45]">
          {session.device}
        </strong>
        <span className="mt-0.5 block text-xs leading-[1.5] text-mv-muted">
          {detail}
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
               sequence give a screen-reader user no way to choose. It names the
               same `detail` line the row shows, so it never reads a location
               that is not on screen. */
            aria-label={`${sessionsBlock.signOutOne} — ${session.device}, ${detail}`}
            /* Disabled while ANY sign-out is in flight, not just this row's: two
               overlapping requests would each be followed by a re-read, and the
               older answer could land last and put a signed-out row back. */
            disabled={disabled}
            onClick={onSignOut}
          >
            {busy ? "Signing out…" : sessionsBlock.signOutOne}
          </PortalButton>
        )}
      </div>
    </li>
  );
}
