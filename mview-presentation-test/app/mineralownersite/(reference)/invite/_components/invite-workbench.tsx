"use client";

import { useMemo, useState } from "react";

import { CREDIT, creditPlan, FLOW } from "../_lib/invite-flow";
import { codeFor, DEFAULT_BODY, letterFor } from "../_lib/invite-letters";
import { inviteLeases, inviteSender } from "../_lib/invite-records";
import type { CoOwner, GreetingStyle, Letter } from "../_lib/invite-types";
import { EmailStep } from "./email-step";
import { InviteRail } from "./invite-rail";
import { LeaseStep } from "./lease-step";
import { PeopleStep } from "./people-step";

/**
 * THE ONE PIECE OF STATE ON THIS PAGE, and the three cards that read it.
 *
 * ── WHY THE STATE IS HERE AND NOT IN THE CARDS ──
 *
 * Every one of the reader's choices is read by at least two of the four panels.
 * The lease decides who is in the list AND what the letters say; the ticks
 * decide the letters AND what the rail says a month is worth; the greeting
 * decides the preview AND the warning about companies. Splitting the state into
 * the cards would mean lifting most of it back out again on the first change,
 * so it starts where it has to end up.
 *
 * The cards below take values and callbacks and hold nothing of their own
 * except what is purely theirs — which is why each of them is testable by
 * rendering it with props, and why the wiring pass has one file to look at when
 * the roll read replaces `inviteLeases`.
 *
 * ── WHAT THIS PASS DOES NOT DO ──
 *
 * Nothing here writes. The co-owner lists are the static fixture in
 * `_lib/invite-records.ts` rather than a read of the county appraisal roll; the
 * codes are worked out rather than issued; and no invitation is recorded, so
 * there is no sent list, no status and no credit ledger.
 *
 * NONE OF THAT IS SAID ON THE PAGE ANY MORE, and that was asked for. Two
 * sentences used to say it — `inviteSender.codeNote` in a footnote card, and a
 * line under "Then they" — and both were this build's own additions with no
 * counterpart in the reference this page is drawn from. They have gone.
 * `codeNote` is still on the record and is now unread; it is left there because
 * it is part of the shape a server would return, not because anything uses it.
 *
 * The shape it hands the letters is already the shape a server would return, so
 * wiring it is replacing one import.
 */
export function InviteWorkbench() {
  const [leaseId, setLeaseId] = useState(inviteLeases[0].leaseId);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  /*
   * `first` BY DEFAULT. The roll files a person as LAST FIRST MIDDLE, so
   * greeting them as filed opens the letter "Dear Kaiser David Keith," — which
   * is what a bill says, not a cousin. It falls back to the full name on any
   * row whose spelling cannot be read safely; see `firstNameOf`.
   */
  const [greeting, setGreeting] = useState<GreetingStyle>("first");
  const [custom, setCustom] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [editing, setEditing] = useState(false);
  const [at, setAt] = useState(0);

  const lease =
    inviteLeases.find((candidate) => candidate.leaseId === leaseId) ??
    inviteLeases[0];

  /*
   * A NEW LEASE IS A NEW LIST OF PEOPLE, so the selection cannot carry over.
   * Owner numbers are not shared between leases in any way the reader chose —
   * a tick that survived the switch would be a letter to somebody they never
   * picked, written from a lease they were no longer looking at.
   *
   * THE RESET HAPPENS IN THE EVENT, NOT IN AN EFFECT. Doing it in a
   * `useEffect` keyed on the lease works and is the obvious shape, but it
   * renders the new lease once with the old ticks still set before the effect
   * clears them — a cascading render React's own lint rule names, and one that
   * would flash somebody else's letter into step 3. Changing the lease is a
   * thing the reader DOES, so the three pieces of state it moves are moved
   * together in the handler.
   */
  const chooseLease = (nextLeaseId: string) => {
    setLeaseId(nextLeaseId);
    setPicked(new Set());
    setAt(0);
  };

  const chosen: CoOwner[] = useMemo(
    () => lease.owners.filter((owner) => picked.has(owner.ownerNumber)),
    [lease, picked],
  );

  const letters: Letter[] = useMemo(
    () =>
      chosen.map((owner) =>
        letterFor({
          sender: inviteSender.name,
          leaseName: lease.leaseName,
          leaseNumber: lease.leaseNumber,
          county: lease.county,
          owner,
          code: codeFor(lease.leaseId, owner.ownerNumber),
          greeting,
          custom,
          body,
          claimUrl: inviteSender.claimUrl,
        }),
      ),
    [chosen, lease, greeting, custom, body],
  );

  const plan = useMemo(
    () => creditPlan(inviteLeases, lease.leaseId, [...picked], CREDIT),
    [lease, picked],
  );

  return (
    /* `.iv-body` AND `.iv-main`, NOT A TAILWIND GRID — see `invite.css`.
       The old two-column grid was keyed to a 1100px VIEWPORT, and this page's
       content box is nearly the same width at 1024px (with the sidebar) as at
       768px (without it), so the breakpoint fired at the wrong moments. The
       sheet's version is a container query against the page's own box, and it
       carries `order: -1` on the rail so a stacked layout puts the steps above
       the work they introduce rather than below it. */
    <div className="iv-body">
      <div className="iv-main">
        <LeaseStep leases={inviteLeases} lease={lease} onChange={chooseLease} />

        <PeopleStep
          lease={lease}
          picked={picked}
          onToggle={(ownerNumber, on) =>
            setPicked((previous) => {
              const next = new Set(previous);
              if (on) next.add(ownerNumber);
              else next.delete(ownerNumber);
              return next;
            })
          }
          onClear={() => setPicked(new Set())}
          query={query}
          onQuery={setQuery}
          showAll={showAll}
          onShowAll={setShowAll}
        />

        <EmailStep
          leaseId={lease.leaseId}
          letters={letters}
          chosen={chosen}
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
