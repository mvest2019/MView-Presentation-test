"use client";

import { Building2, CircleCheck, MapPin, Search, Tag, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PortalButton } from "../../../../_components/ui/button";
import type { Async } from "../claim-wizard";
import type { CountyIndex } from "../../_lib/claim-types";
import { ClaimSelectField, ClaimTextField } from "../claim-field";
import { FlowError, FlowLoading } from "../flow-state";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";

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
 *            zeros, so the counts are simply not printed. See `claim-api.ts`.
 *
 * ── THE OPERATOR FIELD IS DISABLED BECAUSE THE ENDPOINT REJECTS IT ──
 *
 * `/owners/search` answers 400 for `operator` — no roll carries one. The field
 * stays on screen because operator is the one thing many owners know off the
 * top of their head, and someone who does not see it concludes the search is
 * cruder than it is. Inert and labelled beats absent, and beats a live control
 * that would earn a 400.
 */
export function StepFind({
  counties,
  onRetryCounties,
  onSearch,
}: {
  counties: Async<CountyIndex>;
  onRetryCounties: () => void;
  onSearch: (query: { name: string; lease: string; county: string }) => void;
}) {
  const [name, setName] = useState("");
  const [lease, setLease] = useState("");
  const [county, setCounty] = useState("");

  const index = counties.data;
  const showCounts = index !== null && !index.pending;

  return (
    <form
      className="grid gap-[18px]"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch({ name, lease, county });
      }}
    >
      <StepIntro
        step={1}
        icon={Search}
        title="Find your record"
        lead="Search the public record to find the owner record you want to claim."
      >
        Claim is at owner-record level — joined leases inherit it. Name matching
        is fuzzy across RRC and county owner strings, so <em>Smith Gas D</em> and{" "}
        <em>Smith Raymond E</em> both return.{" "}
        {showCounts ? (
          <>
            Searching{" "}
            <b className="font-semibold text-mv-slate">
              {index.totalOwners.toLocaleString("en-US")}
            </b>{" "}
            owners across {index.counties.length} Texas counties.
          </>
        ) : (
          "County is optional."
        )}
      </StepIntro>

      {counties.error && (
        <FlowError message={counties.error} onRetry={onRetryCounties} />
      )}

      <div className="grid gap-5 rounded-mv border border-mv-line p-5 @[520px]:grid-cols-2">
        <ClaimTextField
          label="Owner name"
          qualifier="as it appears on checks or mail"
          required
          hint="Old rolls often carry initials or an entity name — try both."
          icon={User}
          name="ownerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mineral Owner's Name"
          autoComplete="name"
        />
        <ClaimSelectField
          label="County"
          qualifier="narrow it down if you know it"
          icon={MapPin}
          name="county"
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          disabled={counties.loading}
        >
          <option value="">
            {counties.loading ? "Loading counties…" : "Any Texas county"}
          </option>
          {(index?.counties ?? []).map((c) => (
            <option key={c.name} value={c.name}>
              {showCounts
                ? `${c.name} (${c.owners.toLocaleString("en-US")})`
                : c.name}
            </option>
          ))}
        </ClaimSelectField>
        <ClaimTextField
          label="Lease or unit name"
          qualifier="optional"
          icon={Tag}
          name="lease"
          value={lease}
          onChange={(e) => setLease(e.target.value)}
          placeholder="e.g. Smith Gas Unit"
        />
        <ClaimTextField
          label="Operator"
          qualifier="optional"
          icon={Building2}
          name="operator"
          placeholder="Not searchable yet"
          disabled
        />
      </div>

      {counties.loading && <FlowLoading label="Loading the county list…" />}

      <GuideNote title="Why this step matters">
        Query runs against matched owner records (RRC + county appraisal
        sources), ranked on name and county proximity. No claim event is written
        on this step — search only.
      </GuideNote>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-mv-line pt-[18px]">
        <PortalButton variant="primary" type="submit">
          <Search aria-hidden="true" className="h-[15px] w-[15px]" />
          Search public records →
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
