import { PortalButton } from "../../../_components/ui/button";
import { Notice } from "../../../_components/ui/notice";
import { FutureTag, SettingRow } from "../../settings/_components/setting-row";
import { SettingToggle } from "../../settings/_components/setting-toggle";
import {
  PROFILE_SECTIONS,
  securityNote,
  securityRows,
  sessions,
  sessionsBlock,
  type ProfileSession,
  type SecurityRow,
} from "../_lib/profile-data";
import { ProfileCardShell } from "./profile-shell";

/**
 * SECURITY & SIGN-IN — password, two-factor, passkeys, and the device list.
 *
 * ── THE CONTROLS ARE REAL; THE DATA IS A FIXTURE ──
 *
 * Nothing in this repo records a password age, a two-factor position or a
 * session list, so the values come from `_lib/profile-data.ts` as prototype
 * figures. The CONTROLS, though, are the real elements with the real roles:
 * the two-factor row is a `role="switch"` with `aria-checked`, the sign-outs
 * are `<button>`s, and every one of them is inert. Wiring is a handler each.
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
  return (
    <ProfileCardShell section={PROFILE_SECTIONS.security}>
      <div className="mt-1.5">
        {securityRows.map((row) => (
          <SecurityControlRow key={row.id} row={row} />
        ))}
      </div>

      <SessionList />

      <Notice tone="slate" glyph={securityNote.glyph} className="mt-4">
        <strong>{securityNote.lead}</strong> {securityNote.body}
      </Notice>
    </ProfileCardShell>
  );
}

/** One security row — a switch row, or a value plus the button that changes it. */
function SecurityControlRow({ row }: { row: SecurityRow }) {
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
              on={row.on ?? false}
            />
          ) : row.action ? (
            <PortalButton size="sm">{row.action}</PortalButton>
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
function SessionList() {
  return (
    <section aria-labelledby="profile-sessions" className="mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4
          id="profile-sessions"
          className="m-0 text-[13px] leading-[1.35] font-bold"
        >
          {sessionsBlock.heading}
        </h4>
        <PortalButton size="sm">{sessionsBlock.signOutAll}</PortalButton>
      </div>
      <p className="mt-0.5 text-xs leading-[1.5] text-mv-muted">
        {sessionsBlock.hint}
      </p>

      <ul className="mt-1.5 list-none p-0">
        {sessions.map((session) => (
          <SessionItem key={session.id} session={session} />
        ))}
      </ul>
    </section>
  );
}

function SessionItem({ session }: { session: ProfileSession }) {
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
          >
            {sessionsBlock.signOutOne}
          </PortalButton>
        )}
      </div>
    </li>
  );
}
