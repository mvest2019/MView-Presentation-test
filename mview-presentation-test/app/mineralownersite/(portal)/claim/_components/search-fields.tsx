"use client";

import { Building2, MapPin, Tag, User } from "lucide-react";

import type { CountyIndex } from "../_lib/claim-types";
import type { Async } from "./claim-wizard";
import { ClaimSelectField, ClaimTextField } from "./claim-field";

/** What the finder searches on. Held by the wizard so it survives step changes. */
export interface ClaimQuery {
  name: string;
  lease: string;
  county: string;
}

export const emptyQuery: ClaimQuery = { name: "", lease: "", county: "" };

/**
 * THE FOUR SEARCH FIELDS — shared by step 1 and step 2.
 *
 * ── WHY BOTH STEPS ──
 *
 * A name like "ryan" matches over a thousand records. Sending someone back to
 * step 1 to add a county means losing the results they are looking at to change
 * one field, so the same fields sit above the candidate list and re-run the
 * search in place.
 *
 * ONE DEFINITION, TWO PLACEMENTS. The county dropdown alone carries the loading
 * state, the cold-start rule and 200-odd options; a second copy on step 2 would
 * be the place those quietly drift apart.
 *
 * ── THE OPERATOR FIELD IS DISABLED BECAUSE THE ENDPOINT REJECTS IT ──
 *
 * `/owners/search` answers 400 for `operator` — no roll carries one. The field
 * stays on screen because operator is the one thing many owners know off the
 * top of their head, and someone who does not see it concludes the search is
 * cruder than it is. Inert and labelled beats absent, and beats a live control
 * that would earn a 400.
 */
export function ClaimSearchFields({
  query,
  onChange,
  counties,
  compact = false,
}: {
  query: ClaimQuery;
  onChange: (next: ClaimQuery) => void;
  counties: Async<CountyIndex>;
  /** Step 2's filter card: tighter gaps, and the name is not `required` there. */
  compact?: boolean;
}) {
  const index = counties.data;
  const showCounts = index !== null && !index.pending;

  return (
    /* NO FRAME OF ITS OWN — the caller supplies it. Step 1 wraps these in a
       bordered box; on step 2 they sit inside the filter card, and a border
       here would draw a second rule just inside that card's own. */
    <div
      className={`grid @[520px]:grid-cols-2 ${compact ? "gap-3" : "gap-5"}`}
    >
      <ClaimTextField
        label="Owner name"
        qualifier="as it appears on checks or mail"
        required={!compact}
        hint="Old rolls often carry initials or an entity name — try both."
        icon={User}
        name="ownerName"
        value={query.name}
        onChange={(e) => onChange({ ...query, name: e.target.value })}
        placeholder="e.g. Mineral Owner's Name"
        autoComplete="name"
      />

      <ClaimSelectField
        label="County"
        qualifier="narrow it down if you know it"
        icon={MapPin}
        name="county"
        value={query.county}
        onChange={(e) => onChange({ ...query, county: e.target.value })}
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
        value={query.lease}
        onChange={(e) => onChange({ ...query, lease: e.target.value })}
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
  );
}
