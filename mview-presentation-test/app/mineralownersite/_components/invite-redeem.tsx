"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { formatInviteCode } from "@/lib/invite-code";
import { PORTAL_HOME } from "@/lib/routes";
import { PortalLoadOverlay } from "./portal-load-overlay";

/**
 * THE INVITE CODE'S LANDING — the redeem half of Invite Co-Owners.
 *
 * A member who registered off an invitation arrives at the portal as
 * `/mineralownersite?invite=48236898` (the register form appends the code they
 * actually registered with). This component runs the two calls that turn that
 * code into a claimed record, exactly as the letter promised — "your leases
 * come across on their own, so there is nothing for you to look up":
 *
 *   1 · POST `/api/invite/lookup` (through the same-origin forwarder) resolves
 *       the code to the owner OF RECORD it was minted for:
 *       `{ owner_name, owner_address, county }`.
 *
 *   2 · POST `/api/v1/owners/claim` files that name AND that address as this
 *       member's claim — the same endpoint and payload the manual claim wizard
 *       sends, `{ member_id, mineralOwners: [{ ownername, addresses }] }`. The
 *       address matters: a name alone claims every roll record spelling it,
 *       and the code was minted for ONE row.
 *
 * ── IT RUNS ONCE PER CODE, AND SAYS WHAT IT IS DOING ──
 *
 * A ref guards the double-mount of dev StrictMode; sessionStorage guards the
 * back button — a code whose claim already FILED must not file again on the
 * next visit to the same URL. The guard is written only on success: a failed
 * attempt stays retryable by reloading.
 *
 * ── SUCCESS ENDS IN A CLEAN RELOAD ──
 *
 * The dashboard around this banner was server-rendered BEFORE the claim
 * existed. `window.location.replace(PORTAL_HOME)` swaps the `?invite=` URL out
 * of history and re-renders the portal with the member's leases actually on
 * it — the reload IS the payoff. Replace, not assign: the code's work is done,
 * and the back button should not step through a URL that would try it again.
 *
 * ── FAILURE NEVER BLOCKS THE PORTAL ──
 *
 * A dead code (404 `INVITE_CODE_NOT_FOUND` — expired, revoked, mistyped) or a
 * refused claim leaves the dashboard fully usable and a corner banner
 * explaining, with the manual claim flow one link away. The invitation is a
 * shortcut, not a gate.
 *
 * ── WHILE IT WORKS, IT IS A LOADER OVER THE DASHBOARD'S OWN SPACE ──
 *
 * The dashboard behind this component was server-rendered BEFORE the claim
 * existed, so for the seconds the lookup and the claim take it says "claim
 * your record" — the one thing the invitation just promised would not be
 * asked. A member's first look at the portal must not be the product telling
 * them they own nothing. So the working phases cover the CONTENT AREA — the
 * region right of the sidebar, under the top bar, in the page's own quiet
 * background; see `PortalLoadOverlay` (requested: not a full-page sheet of
 * color) — with a spinner and a line saying what is actually happening, and
 * the dashboard only shows through once there is either a claimed record
 * behind the reload or a failure worth reading. The overlay is in the SERVER
 * HTML too — the phase starts at "looking" rather than null — so the
 * unclaimed dashboard cannot flash in the gap before hydration.
 */

const CLAIM_BASE =
  process.env.NEXT_PUBLIC_CLAIM_API_BASE_URL ||
  "https://mview-dev-api.mineralview.com";

/** Long enough for the roll read behind the claim write. */
const TIMEOUT_MS = 60_000;

/** The success banner stands this long before the clean reload. */
const RELOAD_AFTER_MS = 1_600;

/** sessionStorage key for a code whose claim has already filed. */
const doneKey = (code: string) => `mv-invite-redeemed:${code}`;

/**
 * THE CORNER CARD, shared by the two states that leave the portal usable.
 *
 * Fixed and self-styled: this renders BESIDE the portal shell, not inside it,
 * and must not depend on which route group's sheet happens to be loaded.
 */
const CORNER: React.CSSProperties = {
  position: "fixed",
  right: 18,
  bottom: 18,
  zIndex: 80,
  maxWidth: 420,
  padding: "14px 16px",
  borderRadius: 10,
  background: "#101828",
  color: "#f4f6fa",
  boxShadow: "0 12px 32px rgba(9, 14, 24, .45)",
  fontSize: 13,
  lineHeight: 1.5,
};

type Phase =
  | { step: "looking" }
  | { step: "claiming"; ownerName: string }
  | { step: "claimed"; ownerName: string; leases: number }
  | { step: "already"; ownerName: string }
  /** The reader already has a record of their own — see `HAS A RECORD`. */
  | { step: "hasRecord"; ownerName: string; yours: string[] }
  | { step: "failed"; message: string };

interface LookupAnswer {
  owner_name?: string;
  owner_address?: string;
  county?: string;
}

/** One claimed identity on the reader's own account, as `/invite/leases` lists it. */
interface ClaimedOwnerRow {
  name?: string;
  active?: boolean;
}

/**
 * WHAT THIS ACCOUNT HAS ALREADY CLAIMED — names only, cheapest read there is.
 *
 * `null` MEANS "NOTHING CLAIMED, OR THE QUESTION COULD NOT BE ASKED", and both
 * of those come out the same way on purpose: the invitation is a shortcut, and
 * a check that cannot be made must never be the thing that stops it working.
 * The redeem path then runs exactly as it did before.
 */
async function claimedOwners(): Promise<string[] | null> {
  try {
    const res = await fetch("/api/invite/leases?limit=1", {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    /* 404 is the documented "this member has claimed nothing" — the state the
       invitation exists for. Anything else unreadable is treated the same. */
    if (!res.ok) return null;
    const data = (await res.json()) as { owners?: ClaimedOwnerRow[] };
    const names = (data.owners ?? [])
      .map((owner) => owner.name)
      .filter((name): name is string => typeof name === "string" && name !== "");
    return names.length ? names : null;
  } catch {
    return null;
  }
}

/** Case and punctuation folded, so "Kate Marmion Charitable Fndn" matches itself. */
function fold(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

interface ClaimAnswer {
  successful_owners?: { ownername: string; claimed_leases_count?: number }[];
  failed_owners?: { ownername: string; error?: string; error_code?: string }[];
}

/** The backend's one error envelope, as much of it as this banner reads. */
async function errorMessageOf(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as {
      error?: { message?: string };
    };
    return body.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function InviteRedeem({
  memberId,
  code,
}: {
  memberId: number;
  /** Already normalized — eight bare digits. */
  code: string;
}) {
  /* "looking" FROM THE FIRST SERVER BYTE — see the header's loader note. */
  const [phase, setPhase] = useState<Phase>({ step: "looking" });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    /* Filed on a previous visit to this URL — go straight to the clean
       reload rather than filing the same claim twice. */
    try {
      if (sessionStorage.getItem(doneKey(code))) {
        window.location.replace(PORTAL_HOME);
        return;
      }
    } catch {
      /* storage can be blocked; the claim endpoint tolerates a re-file */
    }

    (async () => {
      /* ---- 1 · the code → the owner of record ---------------------------- */
      let owner: { name: string; address: string | null };
      try {
        const res = await fetch("/api/invite/lookup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ invite_code: code }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) {
          setPhase({
            step: "failed",
            message: await errorMessageOf(
              res,
              "Your invite code could not be checked right now.",
            ),
          });
          return;
        }
        const data = (await res.json()) as LookupAnswer;
        if (!data.owner_name) {
          setPhase({
            step: "failed",
            message: "Your invite code could not be checked right now.",
          });
          return;
        }
        owner = { name: data.owner_name, address: data.owner_address ?? null };
      } catch {
        setPhase({
          step: "failed",
          message: "Your invite code could not be checked right now.",
        });
        return;
      }

      /* ---- 1b · HAS A RECORD? THEN NOTHING IS FILED WITHOUT ASKING -------
       *
       * The flow this component was built for is a member who has JUST
       * registered off an invitation and owns nothing yet: look the code up,
       * file the claim, reload onto their own minerals. It ran that way for
       * anybody who opened the link, including a member already signed in with
       * a record of their own — so clicking a relative's link silently
       * attached that relative's owner record to an established account and
       * announced it as "Welcome — your record is claimed", over somebody
       * else's name and lease count. Defect sheet · Invite co-owners row 22.
       *
       * FILING A CLAIM IS A WRITE AGAINST THE READER'S ACCOUNT, and one they
       * did not ask for by following a link. So an account that already holds
       * a claim is SHOWN the invitation and left to decide: which record it is
       * for, which records are already theirs, and the claim flow one link
       * away.
       *
       * UNLESS IT IS THE SAME RECORD, which is the flow having already worked
       * — a forwarded letter, a second registration — and is the existing
       * "nothing to claim twice" path rather than a decision to put to them.
       */
      const yours = await claimedOwners();
      if (yours) {
        if (yours.some((name) => fold(name) === fold(owner.name))) {
          setPhase({ step: "already", ownerName: owner.name });
          setTimeout(() => window.location.replace(PORTAL_HOME), RELOAD_AFTER_MS);
          return;
        }
        setPhase({ step: "hasRecord", ownerName: owner.name, yours });
        return;
      }

      /* ---- 2 · the owner of record → this member's claim ----------------- */
      setPhase({ step: "claiming", ownerName: owner.name });
      try {
        const res = await fetch(`${CLAIM_BASE}/api/v1/owners/claim`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            member_id: memberId,
            mineralOwners: [
              /* The address narrows the claim to the ROW the code was minted
                 for — absent when the roll filed none, never an empty array. */
              owner.address
                ? { ownername: owner.name, addresses: [owner.address] }
                : { ownername: owner.name },
            ],
          }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) {
          setPhase({
            step: "failed",
            message: await errorMessageOf(
              res,
              `Your record (${owner.name}) was found but could not be claimed automatically.`,
            ),
          });
          return;
        }
        const claim = (await res.json()) as ClaimAnswer;
        const filed = claim.successful_owners?.[0];
        if (filed) {
          try {
            sessionStorage.setItem(doneKey(code), "1");
          } catch {
            /* nothing to do — see the read above */
          }
          setPhase({
            step: "claimed",
            ownerName: filed.ownername,
            leases: filed.claimed_leases_count ?? 0,
          });
          setTimeout(() => window.location.replace(PORTAL_HOME), RELOAD_AFTER_MS);
          return;
        }
        const refusal = claim.failed_owners?.[0];
        /* A record already on this account is the flow having ALREADY worked —
           a re-registration, a shared letter — never an error to show red. */
        if (refusal?.error_code === "OWNER_ALREADY_CLAIMED") {
          try {
            sessionStorage.setItem(doneKey(code), "1");
          } catch {
            /* as above */
          }
          setPhase({ step: "already", ownerName: owner.name });
          setTimeout(() => window.location.replace(PORTAL_HOME), RELOAD_AFTER_MS);
          return;
        }
        setPhase({
          step: "failed",
          message:
            refusal?.error ??
            `Your record (${owner.name}) was found but could not be claimed automatically.`,
        });
      } catch {
        setPhase({
          step: "failed",
          message: `Your record (${owner.name}) was found but could not be claimed automatically.`,
        });
      }
    })();
  }, [code, memberId]);

  /* ---- already has a record: the dashboard shows through, and so does the
     invitation, with the decision left to the reader ---------------------- */
  if (phase.step === "hasRecord") {
    return (
      <div role="status" aria-live="polite" style={CORNER}>
        <strong>You already have a Mineral View account.</strong> It is signed
        in and{" "}
        {phase.yours.length === 1 ? (
          <>
            <em>{phase.yours[0]}</em> is claimed on it
          </>
        ) : (
          <>
            {phase.yours.length} owner records are claimed on it, including{" "}
            <em>{phase.yours[0]}</em>
          </>
        )}
        , so nothing has been changed. This invitation is for{" "}
        <em>{phase.ownerName}</em> — if that record is yours as well, claim it
        and its leases come across too.
        <div style={{ marginTop: 10 }}>
          <Link
            href="/mineralownersite/claim"
            style={{ color: "#9fd3ff", textDecoration: "underline" }}
          >
            Claim mineral owner record
          </Link>
          <Link
            href={PORTAL_HOME}
            style={{
              color: "#c7d1e0",
              textDecoration: "underline",
              marginLeft: 16,
            }}
          >
            Not mine — go to my minerals
          </Link>
        </div>
      </div>
    );
  }

  /* ---- failed: the dashboard shows through, a corner card explains ------- */
  if (phase.step === "failed") {
    return (
      <div role="status" aria-live="polite" style={CORNER}>
        <strong>Your invitation could not be redeemed.</strong> {phase.message}{" "}
        <Link
          href="/mineralownersite/claim"
          style={{ color: "#9fd3ff", textDecoration: "underline" }}
        >
          Claim your record yourself
        </Link>{" "}
        — it takes a couple of minutes.
      </div>
    );
  }

  /* ---- working or done: the loader owns the page -------------------------- */
  const line =
    phase.step === "looking" ? (
      <>Checking your invite code {formatInviteCode(code)}…</>
    ) : phase.step === "claiming" ? (
      <>
        Your invitation is for <strong>{phase.ownerName}</strong> — claiming
        that record for you…
      </>
    ) : phase.step === "claimed" ? (
      <>
        <strong>{phase.ownerName}</strong>
        {phase.leases
          ? ` came across with ${phase.leases} ${phase.leases === 1 ? "lease" : "leases"}.`
          : " is now on your account."}{" "}
        Loading your minerals…
      </>
    ) : (
      <>
        <strong>{phase.ownerName}</strong> is already on your account — nothing
        to claim twice. Loading your minerals…
      </>
    );

  return (
    <PortalLoadOverlay>
      <div style={{ maxWidth: 460 }}>
        <p
          style={{
            margin: "0 0 6px",
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: ".01em",
          }}
        >
          {phase.step === "claimed" || phase.step === "already"
            ? "Welcome — your record is claimed."
            : "Setting up your minerals"}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "#51606d",
          }}
        >
          {line}
        </p>
      </div>
    </PortalLoadOverlay>
  );
}
