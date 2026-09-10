"use client";

import { CircleCheck, Search } from "lucide-react";
import Link from "next/link";

import { PortalButton } from "../../../../_components/ui/button";
import type { CountyIndex } from "../../_lib/claim-types";
import type { Async } from "../claim-wizard";
import { FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import {
  ClaimSearchFields,
  isSearchable,
  type ClaimQuery,
} from "../search-fields";
import { SampleFlowButton } from "../sample-flow/sample-flow-dialog";
import { StepIntro } from "../step-intro";

/**
 * The disabled button's tooltip. It is the ONLY place this is said now — a
 * standing line of instruction beside the button was noise on a form that
 * explains itself, and the button greys and un-greys as you type, which is
 * the answer for anyone watching it.
 */
const NEEDS_A_FILTER =
  "Enter an owner name, address or lease — or pick a county.";

/**
 * STEP 1 — search the public record.
 *
 * ── THE COUNTY LIST IS LIVE ──
 *
 * `GET /owners/counties` fills the dropdown and the owner tally in the intro.
 * Three states, all of them real:
 *
 *   loading  the select is disabled and says so, rather than showing an empty
 *            list that looks like "no counties exist"
 *   error    the select still accepts "Any Texas county", because county is
 *            OPTIONAL — a failed dropdown must not block a search that never
 *            needed it
 *   pending  the backend's cold start. The names are there and the counts are
 *            zeros, so the counts are simply not printed.
 *
 * ── THE QUERY LIVES IN THE WIZARD, NOT HERE ──
 *
 * Step 2 shows the same fields so a search can be refined without coming back,
 * and it has to open with what was actually searched. Local state here would be
 * thrown away the moment this step unmounts.
 */
export function StepFind({
  query,
  onQueryChange,
  counties,
  onRetryCounties,
  onSearch,
}: {
  query: ClaimQuery;
  onQueryChange: (next: ClaimQuery) => void;
  counties: Async<CountyIndex>;
  onRetryCounties: () => void;
  onSearch: () => void;
}) {
  /*
   * THE BUTTON IS DEAD UNTIL A FILTER MEANS SOMETHING.
   *
   * `/owners/search` refuses an empty query outright, and a one-letter one
   * matches most of the roll — so an always-live button either 400s or hands
   * back an answer nobody can use. The same rule the debounce on step 2 uses
   * decides it here, so the two steps agree on what counts as a search.
   *
   * NO FIELD IS REQUIRED INDIVIDUALLY — a county on its own is a search, and so
   * is an address. The gate is on the query as a whole, which is why it lives
   * on the button rather than as a `required` mark against Owner name.
   */
  const canSearch = isSearchable(query);

  return (
    <form
      data-claim="find-form"
      className="grid gap-[18px]"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
      }}
    >
      {/* THE SAMPLE MOVED TO THE HEADING LINE (requested).
          Beside Search in the footer it read as the second of two ways to
          submit the form, which it is not — it files nothing and takes no
          input. In the card's top-right corner it is what it actually is: the
          way to see what this screen leads to, offered BEFORE the form rather
          than after the reader has already worked out what to type. */}
      <StepIntro
        step={1}
        icon={Search}
        title="Find your record"
        lead="Search the public record to find the owner record you want to claim."
        aside={<SampleFlowButton />}
      />

      {counties.error && (
        <FlowError message={counties.error} onRetry={onRetryCounties} />
      )}

      <div
        data-claim="find-fields"
        className="rounded-mv border border-mv-line p-5"
      >
        <ClaimSearchFields
          query={query}
          onChange={onQueryChange}
          counties={counties}
        />
      </div>

      {counties.loading && (
        <FlowLoading label="Loading the county list…" compact />
      )}

      <GuideNote title="Why this step matters">
        Query runs against matched owner records (RRC + county appraisal
        sources), ranked on name and county proximity. No claim event is written
        on this step — search only.
      </GuideNote>

      <div
        data-claim="step-actions"
        className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-mv-line pt-[18px]"
      >
        <PortalButton
          variant="primary"
          type="submit"
          disabled={!canSearch}
          className={canSearch ? undefined : "cursor-not-allowed opacity-50"}
          title={canSearch ? undefined : NEEDS_A_FILTER}
        >
          <Search aria-hidden="true" className="h-[15px] w-[15px]" />
          Search records →
        </PortalButton>

        <p className="flex items-center gap-[6px] text-[12px] text-mv-muted">
          <CircleCheck
            aria-hidden="true"
            className="h-[14px] w-[14px] text-mv-green-deep"
          />
          Free · No card required
        </p>
        <p className="ml-auto text-[12px] text-mv-muted">
          Not now?{" "}
          <Link
            href="/mineralownersite"
            className="font-semibold text-mv-green-deep underline underline-offset-2"
          >
            Back to your dashboard →
          </Link>
        </p>
      </div>
    </form>
  );
}
