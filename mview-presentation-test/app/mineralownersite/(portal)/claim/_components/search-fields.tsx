"use client";

import { Mailbox, Tag, User } from "lucide-react";

import type { CountyIndex } from "../_lib/claim-types";
import type { Async } from "./claim-wizard";
import { ClaimTextField } from "./claim-field";
import { CountyCombobox } from "./county-combobox";

/** What the finder searches on. Held by the wizard so it survives step changes. */
export interface ClaimQuery {
  name: string;
  lease: string;
  county: string;
  /** Free text matched against the roll's mailing address — street or city. */
  address: string;
}

export const emptyQuery: ClaimQuery = {
  name: "",
  lease: "",
  county: "",
  address: "",
};

/** Wait this long after the last keystroke before asking the API. */
export const SEARCH_DEBOUNCE_MS = 400;

/** Below this, a text filter is too broad to be worth a request. */
export const MIN_QUERY_CHARS = 3;

/**
 * IS THIS QUERY WORTH A REQUEST YET?
 *
 * Typing "pooja" is five keystrokes, and a search fired on each one asks the
 * API for "p", "po", "poo", "pooj" and "pooja" — four answers nobody will ever
 * read, the first of which matches most of the roll. Debouncing alone does not
 * fix that: pause after "po" and it still fires.
 *
 * So there are two gates and they do different jobs. This one is about the
 * query being specific enough to mean anything; the debounce is about the
 * reader having stopped typing.
 *
 * COUNTY IS EXEMPT because it is not typed — it is one click on a fixed list,
 * and "every owner in Bee County" is a question somebody may genuinely be
 * asking. The same goes for a two-letter lease name only in combination, which
 * is why the check is per-field rather than over the whole string.
 */
export function isSearchable(query: ClaimQuery): boolean {
  const enough = (value: string) => value.trim().length >= MIN_QUERY_CHARS;
  return (
    enough(query.name) ||
    enough(query.lease) ||
    enough(query.address) ||
    query.county !== ""
  );
}

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
 * ── ADDRESS REPLACED THE OPERATOR FIELD ──
 *
 * Operator was drawn disabled, because `/owners/search` answers 400 for it —
 * no roll carries one. A permanently inert control is a poor use of the slot,
 * so it now holds the filter this step most needs.
 *
 * ADDRESS IS THE DISCRIMINATOR THIS FLOW ALREADY RELIES ON. A first name alone
 * matches over a thousand records and the whole of step 2 is about telling
 * identical owner strings apart; the endpoint filters on it properly —
 * `name=ryan` returns 1,153 and `name=ryan&address=HARLEM` returns 2.
 *
 * IT MATCHES STREET AND CITY, NOT ZIP. Verified against the live roll:
 * "HOUSTON" and "8800 S HARLEM" both narrow, "77057" returns nothing even
 * though the addresses contain it. That is why the label's qualifier reads
 * "street or city" rather than promising a postcode search that comes back
 * empty — it is in the qualifier because the label is always on screen, where
 * a hover tooltip is not.
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
  return (
    /* NO FRAME OF ITS OWN — the caller supplies it. Step 1 wraps these in a
       bordered box; on step 2 they sit inside the filter card, and a border
       here would draw a second rule just inside that card's own. */
    <div className={`grid @[520px]:grid-cols-2 ${compact ? "gap-3" : "gap-5"}`}>
      <ClaimTextField
        label="Owner name"
        qualifier="as it appears on checks or mail"
        required={!compact}
        icon={User}
        name="ownerName"
        value={query.name}
        onChange={(e) => onChange({ ...query, name: e.target.value })}
        placeholder="e.g. Mineral Owner's Name"
        autoComplete="name"
      />

      <CountyCombobox
        counties={counties}
        value={query.county}
        onChange={(county) => onChange({ ...query, county })}
      />

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
        label="Address"
        qualifier="optional · street or city"
        icon={Mailbox}
        name="address"
        value={query.address}
        onChange={(e) => onChange({ ...query, address: e.target.value })}
        placeholder="e.g. Houston, or 8800 S Harlem"
      />
    </div>
  );
}
