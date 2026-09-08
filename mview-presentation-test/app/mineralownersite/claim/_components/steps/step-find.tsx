"use client";

import { Building2, CircleCheck, MapPin, Search, Tag, User } from "lucide-react";
import Link from "next/link";

import { PortalButton } from "../../../_components/ui/button";
import { ClaimSelectField, ClaimTextField } from "../claim-field";
import { GuideNote } from "../guide-note";
import { StepIntro } from "../step-intro";

/** The counties the demo index covers, plus the "all" default. */
const COUNTIES = ["Bee", "Cass", "Hood", "Karnes", "Lampasas", "Panola"];

/**
 * STEP 1 — search the public record.
 *
 * ── THE OPERATOR FIELD IS DISABLED AND STILL PRESENT ──
 *
 * "Not searchable yet" as its placeholder, greyed, not removed. Operator is the
 * one thing many owners know off the top of their head — it is printed on every
 * cheque stub — so someone who scans this form and does not see it concludes
 * the search is cruder than it is and goes looking for a different route. The
 * disabled field says the opposite: we know you have it, it is coming, use the
 * name for now.
 *
 * It follows `portal-nav.ts`'s rule for unbuilt things — inert and labelled,
 * never a control that looks live and does nothing.
 *
 * ── NOTHING IS VALIDATED HERE ──
 *
 * `onSearch` runs on submit and the step advances. The name field is `required`
 * so the browser enforces the one thing that is genuinely mandatory, and no
 * client-side rules stand between an owner and a search that costs nothing to
 * re-run — the design's own note is that this step writes no claim event.
 */
export function StepFind({ onSearch }: { onSearch: () => void }) {
  return (
    <form
      className="grid gap-[18px]"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch();
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
        <em>Smith Raymond E</em> both return. County is optional.
      </StepIntro>

      {/* NO FILL ON THIS PANEL (requested) — the hairline and the padding are
          what group the four fields, and they do it on their own. The wash it
          used to carry put a second grey plane inside an already-nested card
          (page ground → flow card → step card → this), and the inputs, which are
          white, ended up the brightest thing on the screen by accident. */}
      {/* A LITTLE MORE ROOM THAN THE REST OF THE STEP (requested). 20px of
          padding and 20px between the rows, against 16px elsewhere. This is the
          only panel on the flow someone has to type into, and it lost its fill
          when the tint came off — the breathing room is now the only thing
          separating the fields from the hairline that frames them. */}
      <div className="grid gap-5 rounded-mv border border-mv-line p-5 @[520px]:grid-cols-2">
        <ClaimTextField
          label="Owner name"
          qualifier="as it appears on checks or mail"
          required
          hint="Old rolls often carry initials or an entity name — try both."
          icon={User}
          name="ownerName"
          placeholder="e.g. Mineral Owner's Name"
          autoComplete="name"
        />
        <ClaimSelectField
          label="County"
          qualifier="narrow it down if you know it"
          icon={MapPin}
          name="county"
          defaultValue=""
        >
          <option value="">Any Texas county</option>
          {COUNTIES.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </ClaimSelectField>
        <ClaimTextField
          label="Lease or unit name"
          qualifier="optional"
          icon={Tag}
          name="lease"
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
