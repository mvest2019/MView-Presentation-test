"use client";

import { useState } from "react";

import type { GroupsAccess } from "../_lib/groups-access";
import type { Group } from "../_lib/groups-types";
import { PlusIcon, ShieldIcon, TrashIcon } from "./group-icons";

/**
 * THE ADMIN TOOLS — and the whole point of this file is WHEN IT IS NOT
 * RENDERED.
 *
 * ── ONE TEST, IN ONE PLACE ──
 *
 * `group.role === "admin"`. Nothing else. Not `visibility === "private"`, which
 * is true of every lease group the reader is merely a member of; not "the reader
 * claimed the lease", which is how they got IN rather than what they may do.
 * The caller makes that test once and this component is simply absent
 * otherwise — there is no disabled state of this card, because a row of greyed
 * controls would tell a co-owner that removing their relatives is something
 * they nearly have.
 *
 * ── THE THREE POWERS, IN THE ORDER AN ADMIN USES THEM ──
 *
 * Invite, then manage who is in, then — rarely and last — delete the group. The
 * destructive one is at the bottom, visually separated, and takes a second
 * press that names what it destroys.
 *
 * ── NOTHING HERE REACHES A SERVER ──
 *
 * This is the UI for these three powers. An invitation is added to the pending
 * list on screen and no mail is sent; a removal takes the row out of the list
 * on screen. The card says so once, quietly, rather than repeating it on every
 * control — and the sentence is worth keeping until the write store exists,
 * because an admin who believes they have just emailed six cousins is worse off
 * than one who knows they have not.
 */
export function GroupAdmin({
  group,
  access,
  invites,
  onInvite,
  onRemove,
  onDeleteGroup,
}: {
  group: Group;
  access: GroupsAccess;
  /** Addresses invited in this session, for this group. */
  invites: string[];
  onInvite: (email: string) => void;
  onRemove: (memberId: string) => void;
  onDeleteGroup: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    /* ONE CHECK, AND IT IS THE ONLY ONE WORTH MAKING HERE. An address either
       has a name, an @ and a domain or it is a typo; anything stricter rejects
       real addresses, and anything looser sends nothing anywhere. */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("That does not look like an email address.");
      return;
    }
    if (invites.includes(value.toLowerCase())) {
      setError("You have already invited that address.");
      return;
    }
    setError(null);
    onInvite(value.toLowerCase());
    setEmail("");
  };

  return (
    <section className="chartbox gr-admin" aria-label={`Admin tools for ${group.name}`}>
      <div className="gr-adminhead">
        <span className="gr-adminbadge">
          <ShieldIcon />
        </span>
        <div>
          <h3 className="gr-h">You run this group</h3>
          <p className="tiny muted">
            Only you can invite people, remove them, delete posts and delete the
            group itself.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- 1 · invite */}
      <div className="gr-adminblock">
        <h4 className="gr-k">Invite someone</h4>
        {/* `noValidate`, AND `type="email"` KEPT. The type is what gives a phone
            the @ keyboard, but leaving the browser's own validation on means a
            mistyped address is answered by a native bubble in the browser's
            voice and this card's own message — the one that also covers "you
            have already invited that address" — is never reached. One message,
            in one place, written for this page. */}
        <form className="gr-inviteform" onSubmit={submit} noValidate>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="name@example.com"
            aria-label="Email address to invite"
            aria-invalid={error ? true : undefined}
            disabled={!access.write}
          />
          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={!access.write || !email.trim()}
          >
            <PlusIcon />
            Send invitation
          </button>
        </form>
        {error ? (
          <p className="tiny gr-error" role="alert">
            {error}
          </p>
        ) : null}
        {invites.length ? (
          <ul className="gr-invites">
            {invites.map((address) => (
              <li key={address}>
                <span className="chip chip-est gr-chip">Invited</span>
                <span className="small">{address}</span>
                <span className="tiny muted">waiting for them to accept</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tiny muted">
            An invitation lets one person into this group. It does not give them
            anything else on your account.
          </p>
        )}
      </div>

      {/* ---------------------------------------------------- 2 · members */}
      <div className="gr-adminblock">
        <h4 className="gr-k">Who is in ({group.memberCount})</h4>
        <ul className="gr-memberlist">
          {group.members.map((member) => (
            <li key={member.id}>
              <span className="gr-av gr-av-sm" aria-hidden="true">
                {member.initials}
              </span>
              <span className="gr-membername">
                <span className="small">{member.name}</span>
                {member.note ? (
                  <span className="tiny muted">{member.note}</span>
                ) : null}
              </span>
              {member.role === "admin" ? (
                <span className="chip chip-mint gr-chip">Admin</span>
              ) : null}
              {member.you || member.role === "admin" ? null : removing ===
                member.id ? (
                <span className="gr-confirmbtns">
                  <button
                    type="button"
                    className="btn btn-sm gr-danger"
                    onClick={() => {
                      onRemove(member.id);
                      setRemoving(null);
                    }}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setRemoving(null)}
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className="gr-link gr-removebtn"
                  onClick={() => setRemoving(member.id)}
                  disabled={!access.write}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ---------------------------------------------------- 3 · delete */}
      <div className="gr-adminblock gr-danger-zone">
        <h4 className="gr-k">Delete this group</h4>
        {confirming ? (
          <div className="notice amber gr-confirmbox">
            <span aria-hidden="true">⚠</span>
            <span>
              <strong>Delete {group.name}?</strong> Every post and comment in it
              goes with it
              {group.memberCount > 1
                ? `, for all ${group.memberCount} members,`
                : ""}{" "}
              and it cannot be undone.
              <span className="gr-confirmbtns">
                <button type="button" className="btn btn-sm gr-danger" onClick={onDeleteGroup}>
                  Delete the group
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => setConfirming(false)}
                >
                  Keep it
                </button>
              </span>
            </span>
          </div>
        ) : (
          <>
            <p className="tiny muted">
              The group and everything posted in it is removed for everyone in
              it. There is no way back.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-ghost gr-dangerbtn"
              onClick={() => setConfirming(true)}
              disabled={!access.write}
            >
              <TrashIcon />
              Delete group
            </button>
          </>
        )}
      </div>
    </section>
  );
}
