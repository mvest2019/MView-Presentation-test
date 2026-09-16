"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchInviteLeases,
  fetchInvites,
  fetchLeaseRoster,
  InviteApiError,
  recordInvites,
  revokeInvites,
  type InviteEmailView,
  type InviteWording,
  type LeaseChoice,
  type LeaseRoster,
} from "../_api/invite-api";
import { CREDIT, creditPlan, FLOW } from "../_lib/invite-flow";
import { DEFAULT_BODY } from "../_lib/invite-letters";
import { inviteSender } from "../_lib/invite-records";
import type { GreetingStyle } from "../_lib/invite-types";
import { EmailStep } from "./email-step";
import { UnclaimedInviteNotice } from "./invite-header";
import { InviteRail } from "./invite-rail";
import { LeaseStep } from "./lease-step";
import { PeopleStep } from "./people-step";

/**
 * THE ONE PIECE OF STATE ON THIS PAGE, and the three cards that read it.
 *
 * ── WIRED TO THE INVITE API NOW — the fixture pass this replaced is gone ──
 *
 * Everything the three steps print comes off `/api/v1/invite/*` through the
 * same-origin forwarder (see `_api/invite-api.ts`): the leases are the
 * member's CLAIMED leases, the people are the county appraisal roll, and the
 * codes are ISSUED — minted and reserved by the service the moment a box is
 * ticked, not worked out from a hash. That changes what a tick means:
 *
 *   TICKING WRITES. `POST /invite/co-owners` records the invite and returns
 *   the written email; `already_invited` comes back for a box ticked in an
 *   earlier session and is a SUCCESS carrying the code issued then. The tick
 *   only appears once the service has answered — a checkbox that ticked
 *   optimistically would show a letter whose code did not exist yet.
 *
 *   UNTICKING DEACTIVATES, NEVER DELETES. The code may already be in a sent
 *   email; re-ticking the same person returns the same code.
 *
 *   THE TICKS SURVIVE A RELOAD. `GET /invite/co-owners` restores them per
 *   lease, which the fixture build could not do — it had nowhere to write.
 *
 * ── EVERY WRITE ENDS IN A RE-READ ──
 *
 * After each POST/DELETE the workbench re-fetches the recorded state rather
 * than splicing the response into local arrays. One extra round trip buys the
 * property that matters: `emails` and `copy_all` are always the server's own
 * index-aligned answer, so the "Copy all" block can never carry a code the
 * previous click just revoked.
 *
 * ── THE WORDING RE-RENDERS WITHOUT WRITING ──
 *
 * Greeting, custom opener and the letter body re-render through the GET —
 * debounced, because it fires per keystroke in the editor. Codes are already
 * reserved, so re-rendering cannot change them; a failed re-render keeps the
 * previous emails rather than reporting an outage.
 *
 * ── WHY THE LEASE SWITCH RESETS IN THE EVENT, NOT IN AN EFFECT ──
 *
 * Same reason as ever: a `useEffect` keyed on the lease renders the new lease
 * once with the old letters still up before clearing them — a flash of
 * somebody else's letter in step 3. The load itself is an effect (it is
 * async); the SYNCHRONOUS reset of what is on screen happens in the handler.
 */

/** The contract's page ceiling — one read covers all but the largest members. */
const PAGE_LIMIT = 500;

/** How long the editor may go quiet before the emails re-render. */
const REWORD_DEBOUNCE_MS = 600;

type LeasesState =
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "ready"; leases: LeaseChoice[]; total: number };

export function InviteWorkbench() {
  const [leasesState, setLeasesState] = useState<LeasesState>({
    phase: "loading",
  });
  /** Bumped by the retry button — the load effect depends on it. */
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [roster, setRoster] = useState<LeaseRoster | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);

  /** The recorded invites for the current lease — the server's own answer. */
  const [emails, setEmails] = useState<InviteEmailView[]>([]);
  const [copyAll, setCopyAll] = useState<string | null>(null);

  /** Owner keys with a POST/DELETE in flight — their checkboxes hold still. */
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  /** The last thing a write had to say — a not-on-roll note, a rate limit. */
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [greeting, setGreeting] = useState<GreetingStyle>("first");
  const [custom, setCustom] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [editing, setEditing] = useState(false);
  const [at, setAt] = useState(0);
  const [rewording, setRewording] = useState(false);

  /*
   * THE WORDING TRAVELS ON EVERY CALL, read through a ref where an effect or
   * handler needs "whatever it is right now" without re-running on each
   * keystroke. `body` is sent even unedited: the preview, the editor and the
   * copy button must all be the same letter, and the only way to guarantee
   * that is for the text in the textarea to be the text the service renders.
   */
  const wording: InviteWording = useMemo(
    () => ({ greeting, custom, body }),
    [greeting, custom, body],
  );
  const wordingRef = useRef(wording);
  const leaseIdRef = useRef(leaseId);
  const emailCountRef = useRef(emails.length);
  /* Written in an effect, not during render (the hooks lint rule). Declared
     FIRST so the refs are current before any later effect in the same commit
     reads them. */
  useEffect(() => {
    wordingRef.current = wording;
    leaseIdRef.current = leaseId;
    emailCountRef.current = emails.length;
  });

  /* ---- load the claimed leases once, and again on retry ------------------ */
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const { leases, total } = await fetchInviteLeases({
          limit: PAGE_LIMIT,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setLeasesState({ phase: "ready", leases, total });
        setLeaseId(leases[0]?.leaseId ?? null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setLeasesState({
          phase: "error",
          code: error instanceof InviteApiError ? error.code : "UNREACHABLE",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong loading your leases.",
        });
      }
    })();
    return () => controller.abort();
  }, [loadAttempt]);

  /* ---- a new lease is a new roll and a new set of recorded invites ------- */
  useEffect(() => {
    if (!leaseId) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [nextRoster, snapshot] = await Promise.all([
          fetchLeaseRoster(leaseId, {
            limit: PAGE_LIMIT,
            signal: controller.signal,
          }),
          fetchInvites(leaseId, wordingRef.current, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setRoster(nextRoster);
        setEmails(snapshot.emails);
        setCopyAll(snapshot.copyAll);
      } catch (error) {
        if (controller.signal.aborted) return;
        setRosterError(
          error instanceof Error
            ? error.message
            : "Could not read the co-owner roll.",
        );
      }
    })();
    return () => controller.abort();
  }, [leaseId]);

  /*
   * A NEW LEASE IS A NEW LIST OF PEOPLE, so nothing carries over. The reset is
   * synchronous and in the event — see the header.
   */
  const chooseLease = (nextLeaseId: string) => {
    if (nextLeaseId === leaseId) return;
    setLeaseId(nextLeaseId);
    setRoster(null);
    setRosterError(null);
    setEmails([]);
    setCopyAll(null);
    setNotice(null);
    setQuery("");
    setShowAll(false);
    setAt(0);
  };

  /* ---- wording changed → re-render the recorded emails, debounced -------- */
  useEffect(() => {
    const lease = leaseIdRef.current;
    if (!lease || emailCountRef.current === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRewording(true);
      try {
        const snapshot = await fetchInvites(
          lease,
          { greeting, custom, body },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setEmails(snapshot.emails);
        setCopyAll(snapshot.copyAll);
      } catch {
        /* The previous rendering stays up. A failed re-render is a stale
           greeting, not a failed invite, and it corrects itself on the next
           change or write. */
      } finally {
        if (!controller.signal.aborted) setRewording(false);
      }
    }, REWORD_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [greeting, custom, body]);

  /* ---- tick and untick ---------------------------------------------------- */

  /** Re-read the recorded state — every write's last step. */
  const refresh = useCallback(async (lease: string) => {
    const snapshot = await fetchInvites(lease, wordingRef.current);
    /* The reader may have switched lease while the write was in flight. */
    if (leaseIdRef.current !== lease) return null;
    setEmails(snapshot.emails);
    setCopyAll(snapshot.copyAll);
    return snapshot;
  }, []);

  const toggle = useCallback(
    async (ownerKey: string, on: boolean) => {
      const lease = leaseIdRef.current;
      if (!lease) return;
      setBusy((previous) => {
        if (previous.has(ownerKey)) return previous;
        const next = new Set(previous);
        next.add(ownerKey);
        return next;
      });
      setNotice(null);
      try {
        if (on) {
          const outcome = await recordInvites(
            lease,
            [ownerKey],
            wordingRef.current,
          );
          if (outcome.notOnRoll.length) {
            setNotice(
              outcome.notOnRoll[0].note ??
                "The appraisal roll no longer carries that owner for this " +
                  "lease, so no invite was recorded.",
            );
          }
          const snapshot = await refresh(lease);
          if (snapshot) {
            const index = snapshot.emails.findIndex(
              (email) => email.ownerKey === ownerKey,
            );
            if (index >= 0) setAt(index);
          }
        } else {
          await revokeInvites(lease, [ownerKey]);
          await refresh(lease);
        }
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "That change did not go through. Try again.",
        );
      } finally {
        setBusy((previous) => {
          const next = new Set(previous);
          next.delete(ownerKey);
          return next;
        });
      }
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    const lease = leaseIdRef.current;
    const keys = emails.map((email) => email.ownerKey);
    if (!lease || keys.length === 0) return;
    setBusy(new Set(keys));
    setNotice(null);
    try {
      await revokeInvites(lease, keys);
      await refresh(lease);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "That change did not go through. Try again.",
      );
    } finally {
      setBusy(new Set());
    }
  }, [emails, refresh]);

  /* ---- derived ------------------------------------------------------------ */

  const picked = useMemo(
    () => new Set(emails.map((email) => email.ownerKey)),
    [emails],
  );

  const plan = useMemo(() => creditPlan(emails, CREDIT), [emails]);

  /* ---- the states with nothing to work on -------------------------------- */

  if (leasesState.phase === "loading") {
    return (
      <p className="tiny muted" style={{ padding: "24px 0" }}>
        Reading your claimed leases…
      </p>
    );
  }

  if (leasesState.phase === "error") {
    /* The two 404s that mean "there is no record to read co-owners from" get
       the same claim-first notice the unclaimed funnel shows — they are the
       server saying the same thing. */
    if (
      leasesState.code === "INVITE_NO_CLAIM" ||
      leasesState.code === "INVITE_NO_LEASES"
    ) {
      return <UnclaimedInviteNotice />;
    }
    if (leasesState.code === "NOT_SIGNED_IN") {
      return (
        <div className="notice slate" style={{ margin: "18px 0 0" }}>
          <span aria-hidden="true">ⓘ</span>
          <span>
            <strong>Sign in first.</strong> The co-owners this page lists are
            the other owners of <em>your</em> claimed leases, so it needs to
            know who you are. <Link href="/login">Sign in</Link> and come back.
          </span>
        </div>
      );
    }
    return (
      <div className="notice slate" style={{ margin: "18px 0 0" }}>
        <span aria-hidden="true">ⓘ</span>
        <span>
          <strong>Your leases could not be read.</strong> {leasesState.message}{" "}
          <button
            type="button"
            className="iv-link"
            onClick={() => {
              /* The load effect no longer resets the phase itself (setState in
                 an effect body cascades); the one caller that needs the reset
                 does it here, where it is an event. */
              setLeasesState({ phase: "loading" });
              setLoadAttempt((attempt) => attempt + 1);
            }}
          >
            Try again
          </button>
        </span>
      </div>
    );
  }

  const { leases, total } = leasesState;
  if (leases.length === 0) return <UnclaimedInviteNotice />;

  const lease =
    leases.find((candidate) => candidate.leaseId === leaseId) ?? leases[0];

  return (
    /* `.iv-body` AND `.iv-main`, NOT A TAILWIND GRID — see `invite.css`. */
    <div className="iv-body">
      <div className="iv-main">
        <LeaseStep
          leases={leases}
          total={total}
          lease={lease}
          peopleCount={roster?.counts.people ?? null}
          onChange={chooseLease}
        />

        <PeopleStep
          roster={roster}
          rosterError={rosterError}
          picked={picked}
          busy={busy}
          onToggle={toggle}
          onClear={clearAll}
          query={query}
          onQuery={setQuery}
          showAll={showAll}
          onShowAll={setShowAll}
        />

        {notice ? (
          <p className="iv-warn" role="status">
            <strong>Worth knowing:</strong> {notice}
          </p>
        ) : null}

        <EmailStep
          emails={emails}
          copyAll={copyAll}
          rewording={rewording}
          at={at}
          onAt={setAt}
          greeting={greeting}
          onGreeting={setGreeting}
          custom={custom}
          onCustom={setCustom}
          body={body}
          onBody={setBody}
          editing={editing}
          onEditing={setEditing}
          sendNote={inviteSender.sendNote}
        />
      </div>

      <InviteRail steps={FLOW} plan={plan} />
    </div>
  );
}
