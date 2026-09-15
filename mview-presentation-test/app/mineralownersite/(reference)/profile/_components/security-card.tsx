"use client";

import { Fragment, useState } from "react";
import { z } from "zod";

import { changePasswordSchema } from "../../../../_components/auth-schema";
import { PortalButton } from "../../../_components/ui/button";
import { Notice } from "../../../_components/ui/notice";
import { FutureTag, SettingRow } from "../../settings/_components/setting-row";
import { SettingToggle } from "../../settings/_components/setting-toggle";
import {
  PROFILE_SECTIONS,
  changePassword,
  securityNote,
  securityRows,
  sessions,
  sessionsBlock,
  type ProfileSession,
  type SecurityRow,
} from "../_lib/profile-data";
import { PROFILE_INPUT_CLASS, ProfileCardShell } from "./profile-shell";

/**
 * SECURITY & SIGN-IN — password, two-factor, passkeys, and the device list.
 *
 * ── THE CONTROLS ARE REAL; THE DATA IS A FIXTURE ──
 *
 * Nothing in this repo records a password age, a two-factor position or a
 * session list, so the values come from `_lib/profile-data.ts` as prototype
 * figures. The CONTROLS are the real elements with the real roles: the
 * two-factor row is a `role="switch"` with `aria-checked` and the sign-outs are
 * `<button>`s.
 *
 * ── AND NOW EVERY ONE OF THEM ANSWERS ──
 *
 * They all rendered enabled and did nothing when pressed. Asked for directly.
 * Each is wired to the most honest thing available to it, which is a different
 * thing in each case and deliberately so:
 *
 *   CHANGE PASSWORD  opens `ChangePasswordPanel`, below, INSIDE this card.
 *                    It briefly linked to `/reset-password` instead; asked for
 *                    directly, and the panel is the better answer anyway. That
 *                    route is the FORGOTTEN-password path: it mails a
 *                    single-use link because the visitor cannot prove who they
 *                    are. A reader already signed in can prove it, with the
 *                    password they are replacing — so the round trip through
 *                    their inbox bought nothing and cost the reader their place
 *                    on the page.
 *
 *   TWO-FACTOR       flips. Local state, because there is nowhere to store it;
 *                    what the reader gets is a switch that behaves like one.
 *
 *   SIGN OUT / ALL   drop rows out of the device list. That is the whole
 *                    visible consequence of the real action, and running it
 *                    locally is the closest honest thing to it. A `sr-only`
 *                    live region announces what left, because a row silently
 *                    vanishing is invisible to a screen reader.
 *
 *   ADD A PASSKEY    is `disabled`. It is the one control with nothing behind
 *                    it and no honest stand-in, and the row already says
 *                    "Future" beside it — so the button now LOOKS as inert as
 *                    it is instead of inviting a press that goes nowhere. That
 *                    is the same rule the invite rail and `portal-routes.ts`
 *                    follow: unbuilt is shown as unbuilt, never as working.
 *
 * NOTHING HERE PERSISTS, and nothing claims to. Reload and the fixture is back.
 * A confirmation that claimed a device had really been signed out would be the
 * one thing worse than a dead button.
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
export function SecurityCard() {
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
     else" does, and it is ALSO what the password row has always promised in
     its hint — so both call this rather than each keeping its own copy of what
     "everywhere else" means. */
  const signOutOthers = () => {
    const going = openSessions.filter((session) => !session.current).length;
    setOpenSessions((open) => open.filter((session) => session.current));
    return going;
  };

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
              row={row}
              on={row.toggle ? twoFactor : undefined}
              onToggle={row.toggle ? setTwoFactor : undefined}
              panelId={row.panel ? PASSWORD_PANEL_ID : undefined}
              panelOpen={row.panel ? passwordOpen : undefined}
              onPanelToggle={
                row.panel ? () => setPasswordOpen((open) => !open) : undefined
              }
            />
            {row.panel && passwordOpen ? (
              <ChangePasswordPanel
                onCancel={() => setPasswordOpen(false)}
                onSaved={() => {
                  signOutOthers();
                  setPasswordOpen(false);
                  /* The record's sentence and nothing appended. It already ends
                     "every other device has been signed out", and a count after
                     it said the same fact twice. */
                  setAnnouncement(changePassword.saved);
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
 * ── NOTHING IS SENT, AND THE COPY SAYS SO ──
 *
 * There is no change-password endpoint in this repo. On success the panel does
 * the one thing it can honestly do — the sign-out-everywhere the row above has
 * always promised — and says "(prototype)". It never claims the password was
 * stored.
 */
function ChangePasswordPanel({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  return (
    <form
      id={PASSWORD_PANEL_ID}
      noValidate
      className="mt-1 mb-3 rounded-xl border border-mv-line bg-mv-portal-explain px-3.5 pt-3 pb-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
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
        onSaved();
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

      <div className="flex flex-wrap items-center justify-end gap-2">
        <PortalButton size="sm" onClick={onCancel}>
          {changePassword.cancel}
        </PortalButton>
        <PortalButton size="sm" variant="primary" type="submit">
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
               `cursor-not-allowed` and 55% opacity — and the row's own "Future"
               tag gives the reason in words. */
            <PortalButton size="sm" disabled>
              {row.action}
            </PortalButton>
          ) : null}
        </>
      }
    />
  );
}

/**
 * WHERE YOU ARE SIGNED IN.
 *
 * A `<ul>` and not a table: three columns of device, place and time look
 * tabular, but each row is one object with a control attached rather than a
 * grid of comparable values, and at phone width a table of this shape either
 * scrolls sideways or collapses into something a reader has to re-learn. The
 * list wraps.
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
