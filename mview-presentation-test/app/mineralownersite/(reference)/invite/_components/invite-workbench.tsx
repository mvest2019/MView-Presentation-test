"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildCopyAll,
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
import type { PrefetchedLeases } from "../_api/invite-prefetch";
import { CREDIT, creditPlan, FLOW } from "../_lib/invite-flow";
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
 * Wired to `/api/v1/invite/*` through the same-origin forwarder — see
 * `_api/invite-api.ts` for the contract rules the shapes enforce. Ticking
 * POSTs and shows the minted code; unticking DELETEs (deactivates, never
 * deletes); wording re-renders through GET without writing.
 *
 * A RELOAD STARTS WITH NOTHING TICKED. The recorded invites are deliberately
 * NOT read back on arrival — see the roll effect below for what that does and
 * does not change. Within the session the selection survives a lease switch,
 * from memory rather than from a re-read.
 *
 * ── WHERE THE TIME GOES, AND HOW THIS FILE SPENDS AS LITTLE AS POSSIBLE ──
 *
 * Every call to the service is ~half a second; what made the first pass feel
 * slow was STACKING them. Four rules keep the stack flat:
 *
 *   THE FIRST PAGE OF LEASES RIDES THE DOCUMENT. `page.tsx` prefetches it in
 *   parallel with the shell payload and hands it down as `initialLeases`, so
 *   on the happy path step 1 is filled at first paint and the only mount-time
 *   fetch left is the chosen lease's roll.
 *
 *   A TICK IS ONE ROUND TRIP AND THE BOX MOVES FIRST. The checkbox flips
 *   optimistically (`pending` overlays the recorded state), the POST's own
 *   response supplies the email, and a failure flips it back with the reason.
 *   The re-read that used to follow every write is gone — "Copy all" is built
 *   client-side from the emails on hand (`buildCopyAll`), which was the only
 *   thing the re-read still paid for.
 *
 *   A ROLL ALREADY READ IS NOT READ AGAIN. Rosters cache per lease for the
 *   session; switching back to a lease is instant, and only the recorded
 *   invites — the part that can change — are re-fetched.
 *
 *   ONLY TYPING IS DEBOUNCED. A greeting is a click with intent and re-renders
 *   at once; the 600ms wait belongs to the textarea, where every keystroke
 *   would otherwise be a request.
 *
 * ── THE LETTER ON SCREEN IS ADDRESSED BY KEY, NOT BY INDEX ──
 *
 * `atKey` names the owner whose letter step 3 shows; the index is derived at
 * render. The list reorders as ticks land and unticks remove rows, and an
 * index would silently show a different cousin's letter when it did.
 *
 * ── WHY THE LEASE SWITCH RESETS IN THE EVENT, NOT IN AN EFFECT ──
 *
 * A `useEffect` keyed on the lease renders the new lease once with the old
 * letters still up before clearing them — a flash of somebody else's letter in
 * step 3. The load is an effect (it is async); the SYNCHRONOUS reset of what
 * is on screen happens in the handler.
 */

/** The contract's page ceiling for one roll read. */
const ROSTER_LIMIT = 500;

/** How long the letter editor may go quiet before the emails re-render. */
const BODY_DEBOUNCE_MS = 600;
/** A greeting click, by contrast, is intent — only a beat, to coalesce two. */
const CLICK_DEBOUNCE_MS = 120;
/** The lease search box — a type-ahead against all 3,529, not a local filter. */
const LEASE_SEARCH_DEBOUNCE_MS = 350;

type LeasesState =
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | {
      phase: "ready";
      leases: LeaseChoice[];
      total: number;
      /**
       * The claimed identity this list is scoped to, or null for every claim.
       * Sent back on the type-ahead so a search cannot reach past the owner
       * the top bar is showing. See `prefetchInviteLeases`.
       */
      owner: string | null;
    };

export function InviteWorkbench({
  initialLeases,
}: {
  /** The server-prefetched first page, or null when the client must ask. */
  initialLeases: PrefetchedLeases | null;
}) {
  const [leasesState, setLeasesState] = useState<LeasesState>(() =>
    initialLeases
      ? {
          phase: "ready",
          leases: initialLeases.leases,
          total: initialLeases.total,
          owner: initialLeases.owner,
        }
      : { phase: "loading" },
  );
  /** Bumped by the retry button — the load effect depends on it. */
  const [loadAttempt, setLoadAttempt] = useState(0);

  /*
   * THE SELECTED LEASE IS AN OBJECT, NOT A LOOKUP. The picker's option list
   * changes under the reader as they search, and the selection must survive
   * matching none of the current options.
   *
   * AND IT STARTS AS NULL. It used to open on `leases[0]` — the first row of
   * the first page of a list the reader had not looked at — so the page
   * arrived having answered step 1 on their behalf, read a stranger's roll and
   * printed a count for a lease nobody had chosen. Defect sheet row 6.
   */
  const [lease, setLease] = useState<LeaseChoice | null>(null);
  /** The claimed identity the list is narrowed to, or null for every claim. */
  const scopedOwner =
    leasesState.phase === "ready" ? leasesState.owner : null;

  const [leaseQuery, setLeaseQuery] = useState("");
  const [leaseResults, setLeaseResults] = useState<LeaseChoice[] | null>(null);
  const [searchingLeases, setSearchingLeases] = useState(false);

  const [roster, setRoster] = useState<LeaseRoster | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  /** Rolls already read this session, by lease id. */
  const rosterCache = useRef(new Map<string, LeaseRoster>());

  /** The recorded invites for the current lease. */
  const [emails, setEmails] = useState<InviteEmailView[]>([]);
  /** Optimistic overlay: owner key → the state its checkbox is moving to. */
  const [pending, setPending] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  /** The last thing a write had to say — a not-on-roll note, a rate limit. */
  const [notice, setNotice] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [greeting, setGreeting] = useState<GreetingStyle>("first");
  const [custom, setCustom] = useState("");
  /* NULL, NOT A LOCAL TEMPLATE. The letter's wording is the service's own —
     `wordingParams` sends no `body` when this is null, so the email arrives in
     the backend's default words. A string only appears here once the reader
     edits, and "start again" hands it back to null (the service default). */
  const [body, setBody] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [atKey, setAtKey] = useState<string | null>(null);
  const [rewording, setRewording] = useState(false);

  const wording: InviteWording = useMemo(
    () => ({ greeting, custom, body }),
    [greeting, custom, body],
  );
  const wordingRef = useRef(wording);
  const leaseIdRef = useRef(lease?.leaseId ?? null);
  const emailCountRef = useRef(emails.length);
  /* Written in an effect, not during render (the hooks lint rule). Declared
     FIRST so the refs are current before any later effect in the same commit
     reads them. */
  useEffect(() => {
    wordingRef.current = wording;
    leaseIdRef.current = lease?.leaseId ?? null;
    emailCountRef.current = emails.length;
  });

  /* ---- load the claimed leases when the server could not ----------------- */
  useEffect(() => {
    /* The prefetch already answered; the effect exists for the miss and for
       the retry button. */
    if (initialLeases && loadAttempt === 0) return;
    const controller = new AbortController();
    (async () => {
      try {
        /* The same two-step the server prefetch makes: the unscoped read names
           the claimed identities, and the active one narrows the list to the
           owner the top bar is showing. See `prefetchInviteLeases`. */
        const all = await fetchInviteLeases({ signal: controller.signal });
        if (controller.signal.aborted) return;
        let { leases, total } = all;
        let owner: string | null = null;
        if (all.owners.length > 1 && all.activeOwner) {
          const scoped = await fetchInviteLeases({
            owner: all.activeOwner,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (scoped.leases.length) {
            leases = scoped.leases;
            total = scoped.total;
            owner = all.activeOwner;
          }
        }
        setLeasesState({ phase: "ready", leases, total, owner });
        /* NOTHING IS SELECTED HERE. See the state's own note. */
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
  }, [initialLeases, loadAttempt]);

  /* A cleared search box restores page one AT THE KEYSTROKE — state moved by
     an event moves in the event, not in an effect chasing it. */
  const handleLeaseQuery = useCallback((next: string) => {
    setLeaseQuery(next);
    if (!next.trim()) {
      setLeaseResults(null);
      setSearchingLeases(false);
    }
  }, []);

  /* ---- the lease type-ahead — every claimed lease, not just page one ------ */
  useEffect(() => {
    const needle = leaseQuery.trim();
    if (!needle) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearchingLeases(true);
      try {
        const { leases } = await fetchInviteLeases({
          q: needle,
          owner: scopedOwner,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setLeaseResults(leases);
      } catch {
        /* A failed search leaves the previous options standing — the reader
           can still pick, and the next keystroke tries again. */
      } finally {
        if (!controller.signal.aborted) setSearchingLeases(false);
      }
    }, LEASE_SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [leaseQuery, scopedOwner]);

  /* ---- a new lease is a new roll ----------------------------------------- */
  /*
   * THE ROLL ONLY. A RELOAD NO LONGER RESTORES THE TICKS (asked for
   * 2026-09-17): this effect used to `fetchInvites` alongside the roster and
   * put every previously recorded invite back on screen, so opening the page
   * began with boxes already ticked and letters already in step 3.
   *
   * WHAT THAT DOES AND DOES NOT CHANGE. The invites are still RECORDED — the
   * codes were minted and reserved when they were ticked, and they stay that
   * way; this only stops the page presenting them as a live selection on
   * arrival. Re-ticking someone invited earlier is the contract's
   * `already_invited`, which comes back with the code issued the first time,
   * so nobody's code moves because the page forgot them.
   */
  const leaseId = lease?.leaseId ?? null;
  useEffect(() => {
    if (!leaseId) return;
    const controller = new AbortController();
    const cached = rosterCache.current.get(leaseId) ?? null;
    if (cached) return;
    (async () => {
      try {
        const nextRoster = await fetchLeaseRoster(leaseId, {
          limit: ROSTER_LIMIT,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        rosterCache.current.set(leaseId, nextRoster);
        setRoster(nextRoster);
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
   * WHAT WAS TICKED THIS SESSION, PER LEASE — memory, not a re-read.
   *
   * The reload starting empty is the point; stepping away to another lease and
   * back is NOT a reload, and losing the selection there would be the page
   * forgetting something the reader did a moment ago in front of them. So the
   * letters are kept in a ref, which a refresh throws away with the rest of the
   * JavaScript and a lease switch does not.
   */
  const invitesCache = useRef(new Map<string, InviteEmailView[]>());
  useEffect(() => {
    if (leaseId) invitesCache.current.set(leaseId, emails);
  }, [leaseId, emails]);

  /*
   * A NEW LEASE IS A NEW LIST OF PEOPLE, so nothing carries over. The reset is
   * synchronous and in the event — see the header. The cached roll, when there
   * is one, goes up in the same event for the same reason: rendering the new
   * lease with the OLD roll for a frame is the exact flash the reset avoids.
   */
  /*
   * THE WORDING GOES BACK TO THE SERVICE'S OWN WITH THE LEASE.
   *
   * A custom greeting is written FOR somebody — "Hi cousin" is addressed to
   * the family on one lease, and carrying it onto the next lease's roll opened
   * a stranger's letter with it. The custom body is worse: it names the lease
   * in its own words. Both survived a lease switch, and QA saw the greeting
   * they had typed for one lease still sitting over a different lease's
   * co-owners. Defect sheet row 20.
   *
   * SO THE LEASE SWITCH RESETS ALL THREE, in the event with the rest of the
   * reset — see the module header on why this is not an effect. It does NOT
   * reset when the reader steps between letters on the SAME lease: those are
   * the people the wording was written for.
   */
  const chooseLease = (nextLeaseId: string) => {
    if (nextLeaseId === leaseId) return;
    const options = leaseResults ?? (leasesState.phase === "ready" ? leasesState.leases : []);
    const next =
      options.find((candidate) => candidate.leaseId === nextLeaseId) ?? null;
    if (!next) return;
    setLease(next);
    setRoster(rosterCache.current.get(nextLeaseId) ?? null);
    setRosterError(null);
    /* Whatever was ticked on THAT lease earlier in this session, or nothing. */
    setEmails(invitesCache.current.get(nextLeaseId) ?? []);
    setPending(new Map());
    setNotice(null);
    setQuery("");
    setShowAll(false);
    setAtKey(null);
    setGreeting("first");
    setCustom("");
    setBody(null);
    setEditing(false);
  };

  /* ---- wording changed → re-render the recorded emails -------------------- */
  /* Its own ref, written INSIDE this effect: `wordingRef` is synced by an
     earlier effect in the same commit, so by the time this one runs it can no
     longer say which field moved. */
  const previousBodyRef = useRef(body);
  useEffect(() => {
    /* Only the textarea earns the long wait — see the constants. */
    const delay =
      body !== previousBodyRef.current ? BODY_DEBOUNCE_MS : CLICK_DEBOUNCE_MS;
    previousBodyRef.current = body;
    const currentLease = leaseIdRef.current;
    if (!currentLease || emailCountRef.current === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRewording(true);
      try {
        const snapshot = await fetchInvites(
          currentLease,
          { greeting, custom, body },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setEmails(snapshot.emails);
      } catch {
        /* The previous rendering stays up. A failed re-render is a stale
           greeting, not a failed invite, and it corrects itself on the next
           change or write. */
      } finally {
        if (!controller.signal.aborted) setRewording(false);
      }
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [greeting, custom, body]);

  /* ---- tick and untick — one round trip, box first ------------------------ */

  const setPendingFor = useCallback((keys: string[], to: boolean | null) => {
    setPending((previous) => {
      const next = new Map(previous);
      for (const key of keys) {
        if (to === null) next.delete(key);
        else next.set(key, to);
      }
      return next;
    });
  }, []);

  const toggle = useCallback(
    async (ownerKey: string, on: boolean) => {
      const currentLease = leaseIdRef.current;
      if (!currentLease) return;
      /* The box flips NOW; the service catches up or the box flips back. */
      setPendingFor([ownerKey], on);
      setNotice(null);
      try {
        if (on) {
          const outcome = await recordInvites(
            currentLease,
            [ownerKey],
            wordingRef.current,
          );
          if (leaseIdRef.current !== currentLease) return;
          if (outcome.notOnRoll.length) {
            setNotice(
              outcome.notOnRoll[0].note ??
                "The appraisal roll no longer carries that owner for this " +
                  "lease, so no invite was recorded.",
            );
          }
          if (outcome.emails.length) {
            setEmails((previous) => [
              ...previous.filter(
                (email) =>
                  !outcome.emails.some(
                    (fresh) => fresh.ownerKey === email.ownerKey,
                  ),
              ),
              ...outcome.emails,
            ]);
            setAtKey(ownerKey);
          }
        } else {
          await revokeInvites(currentLease, [ownerKey]);
          if (leaseIdRef.current !== currentLease) return;
          setEmails((previous) =>
            previous.filter((email) => email.ownerKey !== ownerKey),
          );
        }
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "That change did not go through. Try again.",
        );
      } finally {
        setPendingFor([ownerKey], null);
      }
    },
    [setPendingFor],
  );

  const clearAll = useCallback(async () => {
    const currentLease = leaseIdRef.current;
    const keys = emails.map((email) => email.ownerKey);
    if (!currentLease || keys.length === 0) return;
    setPendingFor(keys, false);
    setNotice(null);
    try {
      await revokeInvites(currentLease, keys);
      if (leaseIdRef.current !== currentLease) return;
      setEmails([]);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "That change did not go through. Try again.",
      );
    } finally {
      setPendingFor(keys, null);
    }
  }, [emails, setPendingFor]);

  /* ---- derived ------------------------------------------------------------ */

  /** Recorded state with the optimistic overlay on top. */
  const picked = useMemo(() => {
    const keys = new Set(emails.map((email) => email.ownerKey));
    for (const [key, to] of pending) {
      if (to) keys.add(key);
      else keys.delete(key);
    }
    return keys;
  }, [emails, pending]);

  const busy = useMemo(() => new Set(pending.keys()), [pending]);

  const copyAll = useMemo(() => buildCopyAll(emails), [emails]);

  /* THE ROLL'S TOWN, KEYED BY OWNER, FOR THE PRINTED POSTING BLOCK. The email
     the service writes carries no address — it is an email — but a sheet that
     will go in an envelope needs one, and the roster row has it. Built here
     because this is where both halves are on hand. */
  const addresses = useMemo(() => {
    const byOwner = new Map<string, string | null>();
    for (const owner of roster?.owners ?? []) {
      /* THE POSTING BLOCK WHEN THERE IS NO PARSED TOWN. The roll files the
         town inside the street line in some districts and the service returns
         `city: null` rather than guess where it ends — a printed sheet was
         then going out with no address at all for owners whose address was
         right there. Same fallback the on-screen row takes; see
         `people-step.tsx`. */
      const block = owner.addressLines
        .map((line) => line.trim())
        .filter(Boolean);
      byOwner.set(
        owner.ownerKey,
        owner.city
          ? `${owner.city}${owner.state ? `, ${owner.state}` : ""}`
          : block.length
            ? block.join(", ")
            : null,
      );
    }
    return byOwner;
  }, [roster]);

  const at = useMemo(() => {
    if (!atKey) return 0;
    const index = emails.findIndex((email) => email.ownerKey === atKey);
    return index >= 0 ? index : 0;
  }, [emails, atKey]);

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
  /* No claimed lease at all is the claim-first notice; no lease CHOSEN is the
     page's opening state and renders the three cards empty. */
  if (leases.length === 0 && total === 0) return <UnclaimedInviteNotice />;

  return (
    /* `.iv-body` AND `.iv-main`, NOT A TAILWIND GRID — see `invite.css`. */
    <div className="iv-body">
      <div className="iv-main">
        <LeaseStep
          leases={leaseResults ?? leases}
          total={total}
          lease={lease}
          peopleCount={roster?.counts.people ?? null}
          leaseQuery={leaseQuery}
          onLeaseQuery={handleLeaseQuery}
          searching={searchingLeases}
          onChange={chooseLease}
        />

        <PeopleStep
          hasLease={lease !== null}
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
          addresses={addresses}
          copyAll={copyAll}
          rewording={rewording}
          at={at}
          onAt={(next) => setAtKey(emails[next]?.ownerKey ?? null)}
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
