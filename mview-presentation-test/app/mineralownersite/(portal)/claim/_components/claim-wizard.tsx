"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchClaimSet,
  fetchCounties,
  postClaim,
  searchOwners,
  type ClaimOwner,
  type ClaimResult,
} from "../_api/claim-api";
import { recordKey } from "../_lib/claim-format";
import type { ClaimSet, CountyIndex, OwnerRecord } from "../_lib/claim-types";
import { ClaimShell } from "./claim-shell";
import {
  SEARCH_DEBOUNCE_MS,
  emptyQuery,
  isSearchable,
  type ClaimQuery,
} from "./search-fields";
import { StepFind } from "./steps/step-find";
import { StepLeases } from "./steps/step-leases";
import { StepPick } from "./steps/step-pick";
import { StepProve } from "./steps/step-prove";
import { StepSuccess } from "./steps/step-success";

/** One request: what it holds, whether it is in flight, and how it failed. */
export interface Async<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const idle = <T,>(): Async<T> => ({ data: null, loading: false, error: null });

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

/**
 * THE FIVE-STEP CLAIM FLOW — the one client component in this module, and the
 * only one that talks to the network.
 *
 * ── WHY EVERY CALL LIVES HERE ──
 *
 * Endpoints feed more than one step. The `/same-name` answer alone drives step
 * 3's record list and step 4's lease table; the search result is step 2's cards
 * AND the input to that same-name call.
 * Fetching inside each step would mean calling `/same-name` three times for one
 * claim, and three chances for the three screens to disagree about what was
 * claimed.
 *
 * So the steps stay presentational: each takes the slice of state it renders
 * plus a callback, and none of them imports the API.
 *
 * ── WHICH ENDPOINT RUNS WHERE ──
 *
 *   1  GET  /owners/counties           on mount — step 1's dropdown and tally
 *   2  GET  /owners/search             step 1's submit → step 2's candidates
 *   4  GET  /owners/same-name          step 2's pick → steps 3 and 4
 *   5  POST /owners/claim              step 4's Claim button — the write
 *
 * Two of the six are exported but unused HERE. `/owners/lease-owners` answers
 * "who else is on this lease", which is the marketing finder's tick-a-lease
 * interaction; `/owners/address-correction` backed step 3's "Something looks
 * wrong", removed on request. Both stay in `_api/claim-api.ts` so the set of
 * six is complete and either is one component away from being wired back.
 *
 * ── THE CLAIM CARRIES ADDRESSES, NOT JUST NAMES ──
 *
 * `mineralOwners` entries are `{ownername, addresses?}`. Step 3 already asks
 * which addresses under a name are yours; the post now sends that answer
 * instead of discarding it, so a claim is as narrow as the reader said.
 *
 * ── THE API LAYER IS THIS MODULE'S OWN ──
 *
 * `_api/claim-api.ts` calls all six endpoints directly and imports nothing
 * from `lib/claim-search`, which serves the marketing finder.
 *
 * ── STEP 4 WRITES THE CLAIM; STEP 5 CONFIRMS IT ──
 *
 * The post fired on step 3 first, which asked the reader to commit before
 * seeing the lease set the claim would take; step 4 then arrived as a receipt
 * for a decision already made. Filing under the lease table makes that screen
 * the decision instead.
 *
 * Step 5 is what follows the write and nothing else: it says the claim landed,
 * reports any per-owner refusal, and offers the dashboard. It replaced a
 * visibility-allocation grid and a four-row receipt, neither of which asked the
 * reader for anything they had not already decided.
 *
 * Every caption in `claim-steps.ts` follows: steps 1 to 3 say nothing is
 * committed, step 4 says plainly that it commits, step 5 says it is done.
 * Posting anywhere else would make one of those a lie.
 */
/** `?step=3` — the flow's position, and the only thing it puts in the URL. */
const stepUrl = (step: number) => `${window.location.pathname}?step=${step}`;

export function ClaimWizard({ memberId }: { memberId: number | null }) {
  const [step, setStep] = useState(1);

  const [counties, setCounties] = useState<Async<CountyIndex>>({
    data: null,
    loading: true,
    error: null,
  });
  /*
   * THE QUERY LIVES HERE because BOTH step 1 and step 2 render the fields —
   * step 2 so a thousand-row result can be narrowed without losing it. Local
   * state in either step would be discarded the moment that step unmounted, and
   * the reader would find the filter bar blank on the results they just ran.
   */
  const [query, setQuery] = useState<ClaimQuery>(emptyQuery);
  const [results, setResults] = useState<Async<OwnerRecord[]>>(idle());
  /*
   * SEVERAL RECORDS, not one. An owner is often on the roll more than once, and
   * `/owners/claim` takes up to 25 names in a single transaction — so step 2
   * ticks a set and the whole set moves forward together.
   */
  const [picked, setPicked] = useState<OwnerRecord[]>([]);
  const [claimSet, setClaimSet] = useState<Async<ClaimSet>>(idle());
  const [claim, setClaim] = useState<Async<ClaimResult>>(idle());

  /** Step 3's ticks, keyed by county|name|address — seeded from the pick. */
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [attested, setAttested] = useState(false);
  /** Which selection `attested` was given for — see `resolveSelection`. */
  const attestedFor = useRef<string>("");

  /*
   * A PROMISE CHAIN, NOT AN AWAITED CALL — the pattern `app/claim`'s finder
   * already uses for its own mount fetch. Both settle the state in a callback
   * rather than in the effect body, which is what `set-state-in-effect` is
   * asking for: an awaited helper reads as a synchronous setState to the rule
   * even when the write happens a tick later.
   *
   * The "loading" flag is the state's INITIAL value, so mounting never has to
   * set it. Only the retry does, and that runs outside the effect.
   */
  const loadCounties = useCallback(() => {
    fetchCounties()
      .then((data) => setCounties({ data, loading: false, error: null }))
      .catch((error) =>
        setCounties({ data: null, loading: false, error: message(error) }),
      );
  }, []);

  useEffect(loadCounties, [loadCounties]);

  function retryCounties() {
    setCounties({ data: null, loading: true, error: null });
    loadCounties();
  }

  /*
   * ══════════════════════════════════════════════════════════════════════════
   * THE STEP IS A HISTORY ENTRY, SO BACK MEANS "BACK ONE STEP"
   * ══════════════════════════════════════════════════════════════════════════
   *
   * ── THE BUG THIS FIXES ──
   *
   * The step was state and nothing else, so the browser had never been told the
   * reader had moved. Back on step 4 left the claim page altogether and took
   * four screens of work with it — and Back is exactly the gesture people reach
   * for in a wizard that draws its own "Back to the addresses" button two lines
   * above the browser's.
   *
   * ── `history.pushState`, NOT THE ROUTER ──
   *
   * `router.push` would re-run the route on the server for a change that is
   * entirely client state. The native call is what Next supports for exactly
   * this — updating the URL without a navigation — and it leaves the mounted
   * component, and therefore the whole claim in progress, alone.
   *
   * ── A RELOAD ALWAYS LANDS ON STEP 1 ──
   *
   * `?step=4` in a bookmark or a reload describes a position, not the four
   * screens of state behind it, and none of that state survives a reload. So
   * the mount `replaceState`s back to step 1 rather than reading the parameter:
   * honouring it would open a lease table with no leases and a Claim button
   * with nothing to file.
   */
  useEffect(() => {
    window.history.replaceState(null, "", stepUrl(1));
  }, []);

  /** Forward: a new entry, so the one behind it is the step just left. */
  function goStep(next: number) {
    setStep(next);
    window.history.pushState(null, "", stepUrl(next));
  }

  /*
   * IN-APP BACK IS THE BROWSER'S BACK.
   *
   * "Back to the records" used to push a THIRD entry, which left the two
   * controls disagreeing: after clicking it, the browser's Back button moved
   * the reader FORWARD to the step they had just left. Delegating to
   * `history.back()` means one stack and one meaning.
   *
   * It cannot walk off the flow: those buttons only render on steps 3 and 4,
   * and every forward move pushed an entry, so there is always a step behind.
   */
  function goBack() {
    window.history.back();
  }

  /*
   * HOW FAR FORWARD THE DATA GOES — the clamp on a Back or a Forward.
   *
   * History entries outlive the state they described. `startOver` on step 5
   * drops the claim but the entries for steps 2 to 5 are still in the stack, so
   * Back from a fresh step 1 would otherwise re-open a receipt for a claim that
   * is no longer in memory. Each step names the one thing it cannot render
   * without, and the URL is corrected in place when a target is refused.
   */
  const furthest = claim.data
    ? 5
    : claimSet.data
      ? 4
      : picked.length > 0
        ? 3
        : results.data !== null || results.loading
          ? 2
          : 1;

  useEffect(() => {
    function onPop() {
      const asked =
        Number(new URLSearchParams(window.location.search).get("step")) || 1;
      const target = Math.min(Math.max(asked, 1), furthest);
      setStep(target);
      if (target !== asked) {
        window.history.replaceState(null, "", stepUrl(target));
      }
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [furthest]);

  /*
   * BACK TO STEP 1 FOR A DIFFERENT RECORD — and EVERY piece of the last claim
   * has to go with it.
   *
   * `setStep(1)` alone would leave the finished claim in state, and `claim.data`
   * is what tells step 4 the write already happened: the reader would search a
   * brand new owner, reach step 4, and find a button reading "View your claim →"
   * that files nothing and hands them the PREVIOUS claim's receipt.
   *
   * The county list is deliberately kept. It is 204 rows that have not changed,
   * and re-fetching them would make starting over slower than arriving.
   */
  /*
   * RESET ON STEP 2 — empty the fields AND drop the answer they produced.
   *
   * A named function rather than an inline arrow in the JSX. It makes the same
   * ref writes `startOver` does, but `react-hooks/immutability` rejects them
   * written inline at the call site — it reads a ref assignment inside a JSX
   * prop as a modification of something already handed to a hook.
   */
  function resetSearch() {
    searchRef.current?.abort();
    searchedRef.current = "";
    setQuery(emptyQuery);
    setResults(idle());
    /* The rows are gone, so the ticks on them go too — a count in the bar over
       an empty page is the same invisible selection, reached another way. */
    setPicked([]);
  }

  /*
   * EDITING A FILTER — AND EMPTYING THE LAST ONE DROPS THE ANSWER WITH IT.
   *
   * ── THE BUG THIS FIXES ──
   *
   * Search "ryan", then clear the owner name with its ✕. All four fields are
   * empty, so `isSearchable` is false and the debounce below refuses to ask the
   * API anything — correctly, there is nothing to ask. But the 1,153 rows from
   * the deleted query stayed on screen, under a heading counting them, and
   * "Reset filters" had hidden itself because there were no filters left to
   * reset. The page showed the answer to a question it was no longer asking,
   * with no control left to clear it short of a reload.
   *
   * ── WHY IT IS HERE AND NOT IN AN EFFECT ──
   *
   * This is an event, not a consequence to observe: the reader emptied the last
   * field. Watching `query` from an effect would mean a synchronous setState in
   * an effect body, which `react-hooks/set-state-in-effect` rejects, and
   * deferring it in a timer would leave a frame where the stale rows are still
   * there. `resetSearch` does exactly this for the Reset button — the two paths
   * now agree, which is the point: reaching the empty state one field at a time
   * has to land where reaching it in one click does.
   *
   * Not gated on `step === 2`. Step 1 shows no results, so clearing a field
   * there drops an `idle()` that is already idle — and a guard would be a rule
   * to keep in sync for no behaviour.
   */
  function changeQuery(next: ClaimQuery) {
    setQuery(next);

    /*
     * CHANGING A SEARCH FIELD EMPTIES THE SELECTION (requested).
     *
     * ── WHY THE WHOLE SELECTION, NOT JUST THE ROWS THAT LEFT ──
     *
     * Pruning only the picks the new answer no longer contains looks tidier and
     * reads worse. Filter to Anderson, tick a record, clear the county: that
     * record IS still in the 1,153 that come back, so it survived — as row 387,
     * a thousand rows below the fold, under a bar reading "1 selected" that
     * pointed at nothing the reader could see. Technically correct, and
     * indistinguishable from a bug.
     *
     * A change to these four fields is a new question. The ticks belonged to
     * the answer to the old one, so they go with it, and the bar disappears
     * rather than reporting a selection the screen cannot account for.
     *
     * ── IT IS THE FIELDS, NOT THE NARROW-DOWN BOX ──
     *
     * That box filters rows the reader already has and deliberately keeps its
     * ticks — step 2 reports how many are hidden by it. Only these four go back
     * to the API and come back with a different set.
     */
    setPicked([]);

    if (isSearchable(next)) return;
    searchRef.current?.abort();
    searchedRef.current = "";
    setResults(idle());
  }

  function startOver() {
    searchRef.current?.abort();
    searchedRef.current = "";
    goStep(1);
    setQuery(emptyQuery);
    setResults(idle());
    setPicked([]);
    setClaimSet(idle());
    setClaim(idle());
    setConfirmed([]);
    setAttested(false);
    attestedFor.current = "";
  }

  /*
   * ONE SEARCH AT A TIME, AND THE LATEST ONE WINS.
   *
   * Without this the flow has a race it loses silently. Type "poo", then
   * "pooja"; "poo" matches thousands and takes longer to come back, so it
   * lands AFTER "pooja" and overwrites five specific results with three
   * thousand vague ones — under a search box that says "pooja". The bug looks
   * like the API returning nonsense.
   *
   * So each new search aborts the one before it, and the response is thrown
   * away unless its own controller is still the live one. Aborting also stops
   * the browser holding open requests nobody is waiting for.
   */
  const searchRef = useRef<AbortController | null>(null);

  /* Serialised copy of the last query actually sent, so arriving on step 2
     does not immediately re-run the search step 1 just fired. */
  const searchedRef = useRef<string>("");

  const runSearch = useCallback((next: ClaimQuery) => {
    searchRef.current?.abort();
    const controller = new AbortController();
    searchRef.current = controller;
    searchedRef.current = JSON.stringify(next);

    /* KEEP THE ROWS THAT ARE ALREADY THERE. Blanking the list on every
       keystroke made the page flash between a full result and a loading slab;
       the old rows stay put and step 2 marks them as refreshing instead. */
    setResults((prev) => ({ data: prev.data, loading: true, error: null }));

    /* NO `limit` — paging on this endpoint is opt-in, and omitting it returns
       the whole result set. Sending one silently truncated the answer: step
       2's heading counts the cards on screen, so a capped response made it
       report fewer candidate records than the search actually matched. */
    searchOwners(next, controller.signal)
      .then((found) => {
        if (controller.signal.aborted) return;
        setResults({ data: found.owners, loading: false, error: null });

        /*
         * A BACKSTOP: no tick may outlive the rows it was made on.
         *
         * `changeQuery` already empties the selection whenever a search field
         * is edited, which is every ordinary way of getting here. This covers
         * the one path that does not go through it — Enter, and the retry after
         * an error, both of which re-run the SAME query. The endpoint scores
         * its matches, so "the same query" is not a promise of the same rows,
         * and a tick with no row on screen is the bug this whole area is about.
         */
        const kept = new Set(found.owners.map(recordKey));
        setPicked((current) =>
          current.filter((record) => kept.has(recordKey(record))),
        );
      })
      .catch((error) => {
        /* A superseded search is not a failure — it aborts into this catch
           exactly like a dead network would, and showing the reader an error
           for a request we cancelled ourselves would be a lie. */
        if (controller.signal.aborted) return;
        setResults({ data: null, loading: false, error: message(error) });
      });
  }, []);

  /** Step 1's button: go to the results and search at once, no debounce. */
  function startSearch() {
    goStep(2);
    if (isSearchable(query)) runSearch(query);
  }

  /*
   * THE DEBOUNCE — one request per pause, not one per keystroke.
   *
   * Only on step 2, because that is the only step showing results to update.
   * The timer is cleared on every change, so the request goes out 400ms after
   * typing STOPS rather than 400ms after it starts.
   *
   * The `searchedRef` guard is what stops this firing a second, identical
   * search the moment step 1 hands over — the button already sent that exact
   * query.
   */
  useEffect(() => {
    if (step !== 2 || !isSearchable(query)) return;
    if (JSON.stringify(query) === searchedRef.current) return;
    const timer = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [step, query, runSearch]);

  /* Nothing in flight should outlive the flow. */
  useEffect(() => () => searchRef.current?.abort(), []);

  /* STABLE ACROSS RENDERS, so `CandidateCard`'s `memo` can actually skip.
     A plain function here would be a new prop on all 1,153 cards on every
     render, which is exactly the identity check memo performs — the wrapper
     would then cost a comparison per card and save nothing. */
  const toggleRecord = useCallback((record: OwnerRecord, checked: boolean) => {
    setPicked((current) =>
      checked
        ? [...current, record]
        : current.filter((r) => recordKey(r) !== recordKey(record)),
    );
  }, []);

  /**
   * Confirming the selection resolves every picked record against
   * `/same-name` — in parallel, merged and deduplicated — and that one answer
   * feeds steps 3, 4 and 5.
   *
   * The step advances BEFORE the calls resolve so step 3 opens on its own
   * spinner, rather than leaving the reader on a list of a thousand rows
   * wondering whether the button registered.
   */
  async function resolveSelection() {
    if (picked.length === 0) return;

    /*
     * THE ATTESTATION BELONGS TO THE RECORDS IT WAS MADE ABOUT.
     *
     * ── THE BUG THIS FIXES ──
     *
     * Step 3's tick is a legal statement — "I have a good-faith basis and
     * authority to claim this record" — and it was plain state that nothing
     * ever cleared. Attest for Aaron Kenneth Ryan, go back, swap the pick to
     * Aasen Ryan R, and step 3 re-opened with the statement already ticked and
     * the Continue button already unlocked: the flow recorded a promise about a
     * person the reader had never been shown it for, and let them file on it.
     *
     * ── CLEARED ON A CHANGE, NOT ON EVERY VISIT ──
     *
     * The signature is the picked keys, sorted so a reordering is not a change.
     * Someone who goes back to re-read a record and returns having changed
     * nothing has already made this promise about exactly these records, and
     * making them tick it again teaches them to tick it without reading. A
     * DIFFERENT set has never been attested to, so it starts blank.
     *
     * `startOver` clears the signature with everything else, so a fresh claim
     * cannot inherit the last one's promise.
     */
    const signature = picked.map(recordKey).sort().join("|");
    if (signature !== attestedFor.current) {
      attestedFor.current = signature;
      setAttested(false);
    }

    setClaimSet({ data: null, loading: true, error: null });
    goStep(3);
    try {
      const set = await fetchClaimSet(picked);
      setClaimSet({ data: set, loading: false, error: null });
      setConfirmed(set.records.map(recordKey));
    } catch (error) {
      setClaimSet({ data: null, loading: false, error: message(error) });
    }
  }

  /**
   * THE WRITE. Owner NAMES are the unit of a claim — the backend resolves each
   * name's leases itself, statewide — so the ticked records are reduced to
   * their DISTINCT names. Two ticked records can carry the same name at two
   * addresses, and sending it twice would be a wasted round trip and a spurious
   * OWNER_ALREADY_CLAIMED in the results.
   */
  /**
   * WHAT STEP 3'S TICKS RESOLVE TO — one entry per owner NAME, carrying the
   * addresses ticked under it.
   *
   * This used to be a bare list of distinct names, and the addresses the reader
   * had just gone through step 3 to confirm were thrown away. `/owners/claim`
   * now takes them, so a name is claimed at exactly the doorsteps that were
   * ticked rather than at every roll row that happens to carry the string —
   * which matters precisely because one owner string can belong to two
   * unrelated parties, the thing step 3 exists to sort out.
   *
   * Grouped, not one entry per record: two ticked addresses under one name are
   * ONE owner with two addresses, not two owners. Sending the name twice would
   * be a wasted round trip and a spurious OWNER_ALREADY_CLAIMED on the second.
   *
   * A record with no address on file contributes its name and no address, and
   * `postClaim` then omits the key entirely for that owner.
   */
  const claimOwners: ClaimOwner[] = (() => {
    /*
     * ONE ENTRY PER OWNER NAME, carrying every address ticked under it.
     *
     * Step 3 now draws one row per record the endpoint returned, so a tick IS
     * an address — no merged row to unpack. Two ticked rows under one name are
     * still ONE owner with two addresses, not two owners: sending the name
     * twice would be a wasted round trip and a spurious OWNER_ALREADY_CLAIMED
     * on the second.
     */
    const byName = new Map<string, Set<string>>();
    for (const record of [
      ...(claimSet.data?.records ?? []),
      ...(claimSet.data?.others ?? []),
    ]) {
      if (!confirmed.includes(recordKey(record))) continue;
      const addresses = byName.get(record.name) ?? new Set<string>();
      if (record.address) addresses.add(record.address);
      byName.set(record.name, addresses);
    }

    /* `addresses` is omitted, not empty, when the roll carries none for a
       ticked record — the contract treats the key as absent-or-array. */
    return [...byName.entries()].map(([ownername, addresses]) => ({
      ownername,
      ...(addresses.size > 0 ? { addresses: [...addresses] } : {}),
    }));
  })();

  /**
   * STEP 3 — no longer the write. It settles which addresses are yours and
   * carries that forward; step 4 is where the claim is actually filed.
   */
  function reviewLeases() {
    goStep(4);
  }

  /**
   * STEP 4 — THE WRITE.
   *
   * ── WHY IT MOVED OFF STEP 3 ──
   *
   * The claim used to fire on step 3's Confirm, which meant the reader filed it
   * before ever seeing the lease set it would take: "See your leases" landed
   * after the fact and could only report what had already happened. With the
   * post here, that screen is the decision — the leases are on the table and
   * the button beneath them commits.
   *
   * ── ALREADY FILED, GO FORWARD ──
   *
   * A claim is not filed twice. The backend answers a repeat with
   * OWNER_ALREADY_CLAIMED per name, so a second press would turn the reader's
   * own successful claim into a page of failures.
   */
  async function fileClaim() {
    if (claim.data) {
      goStep(5);
      return;
    }
    if (memberId === null || claimOwners.length === 0) return;

    setClaim({ data: null, loading: true, error: null });
    try {
      const result = await postClaim(memberId, claimOwners);
      setClaim({ data: result, loading: false, error: null });
      /* Step 5 reads the response — including a partial refusal, which is the
         one thing it must not round up into "successfully claimed". */
      goStep(5);
    } catch (error) {
      setClaim({ data: null, loading: false, error: message(error) });
    }
  }

  const leases = claimSet.data?.all.leases ?? [];

  return (
    <ClaimShell current={step}>
      {step === 1 && (
        <StepFind
          query={query}
          onQueryChange={changeQuery}
          counties={counties}
          onRetryCounties={retryCounties}
          onSearch={startSearch}
        />
      )}

      {step === 2 && (
        <StepPick
          results={results}
          query={query}
          onQueryChange={changeQuery}
          counties={counties}
          selected={picked.map(recordKey)}
          onToggle={toggleRecord}
          onContinue={resolveSelection}
          resolving={claimSet.loading}
          /* Enter skips the debounce — the reader has clearly finished. */
          onSearch={() => runSearch(query)}
          tooShort={!isSearchable(query)}
          onClearSelection={() => setPicked([])}
          onReset={resetSearch}
        />
      )}

      {step === 3 && (
        <StepProve
          claimSet={claimSet}
          memberId={memberId}
          confirmed={confirmed}
          onToggleRecord={(key, checked) =>
            setConfirmed((current) =>
              checked
                ? [...new Set([...current, key])]
                : current.filter((held) => held !== key),
            )
          }
          attested={attested}
          onAttest={setAttested}
          onConfirm={reviewLeases}
          onBack={goBack}
        />
      )}

      {step === 4 && (
        <StepLeases
          records={claimSet.data?.records ?? picked}
          leases={leases}
          ownerCount={claimOwners.length}
          memberId={memberId}
          claiming={claim.loading}
          claimError={claim.error}
          alreadyClaimed={claim.data !== null}
          onContinue={fileClaim}
          onBack={goBack}
        />
      )}

      {step === 5 && (
        <StepSuccess
          result={claim.data}
          /* The receipt prints an RRC lease number per name, and the claim
             response has none — it answers in counts and statuses, never in
             lease identity. The confirmed set is where that number lives. */
          records={claimSet.data?.records ?? []}
          onStartOver={startOver}
        />
      )}
    </ClaimShell>
  );
}
