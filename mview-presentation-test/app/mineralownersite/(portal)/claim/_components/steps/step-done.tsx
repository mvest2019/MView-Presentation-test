"use client";

import {
  CalendarDays,
  Check,
  Eye,
  FileText,
  Info,
  LayoutGrid,
  Link2,
  TriangleAlert,
  UserPlus,
  Zap,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { ClaimResult } from "../../_api/claim-api";
import { Badge } from "../../../../_components/ui/badge";
import { PortalButtonLink } from "../../../../_components/ui/button";
import { PrototypeButton } from "../../../../_components/ui/prototype-button";
import { byValueDesc, leaseKey, money } from "../../_lib/claim-format";
import { freeVisibleLeases } from "../../_lib/claim-plans";
import type { OwnerLeaseSet, OwnerRecord } from "../../_lib/claim-types";

/**
 * THE COMPLETION SCREEN — the receipt for `POST /owners/claim`.
 *
 * ── IT REPORTS WHAT THE ENDPOINT ACTUALLY DID ──
 *
 * The claim response is per-owner, and partial success is normal: a claim of
 * three names can come back with two filed and one refused
 * (`OWNER_ALREADY_CLAIMED`, `LEASE_ALREADY_CLAIMED`). So this screen reads
 * `successful_owners` and `failed_owners` rather than treating the call as
 * pass/fail — a refusal shown as a success is the worst thing a receipt can do.
 *
 * ── THE OFF-ADDRESS RECORDS ARE REPORTED SEPARATELY ──
 *
 * Step 3 promised that a record whose mail goes elsewhere needs a posted code
 * before it attaches. If one was ticked, this screen says it is NOT attached
 * yet rather than folding it into the count.
 */
export function StepDone({
  record,
  pending,
  all,
  visibleKey,
  result,
}: {
  record: OwnerRecord | null;
  pending: OwnerRecord[];
  all: OwnerLeaseSet | null;
  visibleKey: string | null;
  result: ClaimResult | null;
}) {
  const leases = all?.leases ?? [];
  const ordered = byValueDesc(leases);
  const visible =
    ordered.find((l) => leaseKey(l) === visibleKey) ?? ordered[0] ?? null;
  const archived = Math.max(0, leases.length - freeVisibleLeases);

  const claimedLeases =
    result?.successful_owners.reduce(
      (sum, owner) => sum + owner.claimed_leases_count,
      0,
    ) ?? leases.length;

  const rows: { icon: typeof FileText; title: string; detail: ReactNode }[] = [
    {
      icon: FileText,
      title: "Record claimed",
      detail: record
        ? `${record.name} · ${record.county}${record.address ? ` · ${record.address}` : ""}`
        : "—",
    },
    {
      icon: Link2,
      title: "Leases attached",
      detail: `${claimedLeases} claimed${
        all && all.countyCount > 1
          ? ` across ${all.countyCount} counties · ${all.countyList}`
          : all?.countyList
            ? ` · ${all.countyList}`
            : ""
      }`,
    },
    {
      icon: Eye,
      title: "Visible on your plan",
      detail: visible ? (
        <>
          {Math.min(freeVisibleLeases, leases.length)} lease in full —{" "}
          <b className="font-semibold text-mv-ink">{visible.name}</b>
          {archived > 0 && (
            <>
              . The other {archived} stay archived: listed, counted, values
              locked, never deleted.
            </>
          )}
        </>
      ) : (
        "No leases to show yet."
      ),
    },
    {
      icon: CalendarDays,
      title: "Weekly briefing scheduled",
      detail: "Your first one lands this Saturday morning.",
    },
  ];

  return (
    <div className="grid gap-[14px]">
      <header className="flex items-start gap-3">
        <span className="mt-[1px] flex h-[36px] w-[36px] flex-none items-center justify-center rounded-full bg-mv-mint text-mv-green-deep">
          <Check aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={3} />
        </span>

        <div className="min-w-0">
          <p className="text-[10.5px] font-bold tracking-[.12em] text-mv-green-deep uppercase">
            Claim complete
          </p>

          <h2 className="mt-[4px] text-[clamp(18px,2.4vw,22px)] font-extrabold leading-[1.2] tracking-[-.015em] text-mv-ink">
            Claim written · {record?.name ?? "your record"} · {claimedLeases}{" "}
            lease{claimedLeases === 1 ? "" : "s"} joined
          </h2>

          {result?.claimedAt && (
            <p className="mt-[8px] text-[12px] leading-[1.6] text-mv-muted">
              Filed{" "}
              <b className="font-bold text-mv-ink">
                {new Date(result.claimedAt).toLocaleString("en-US")}
              </b>{" "}
              — a confirmation email is on its way.
            </p>
          )}
        </div>
      </header>

      <ul className="grid gap-[10px]">
        {rows.map((row) => (
          <li
            key={row.title}
            className="flex items-center gap-3 rounded-mv border border-mv-line bg-mv-card p-3"
          >
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-mv-portal-wash text-mv-slate">
              <row.icon aria-hidden="true" className="h-[15px] w-[15px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-mv-ink">{row.title}</p>
              <p className="mt-[2px] text-[11.5px] leading-[1.5] text-mv-muted">
                {row.detail}
              </p>
            </div>
            <Badge tone="mint" size="xs" className="flex-none self-start">
              Completed
            </Badge>
          </li>
        ))}
      </ul>

      {/* PARTIAL SUCCESS. The endpoint refuses a name it has already filed, and
          that refusal has to be visible — otherwise a reader believes they
          claimed something they did not. */}
      {result && result.failed_owners.length > 0 && (
        <div
          className="rounded-mv border border-mv-sand-line bg-mv-sand-tint px-4 py-3 text-[11.5px] leading-[1.55] text-mv-sand"
          role="status"
        >
          <p className="flex items-start gap-[9px]">
            <TriangleAlert
              aria-hidden="true"
              className="mt-[1px] h-[14px] w-[14px] flex-none"
            />
            <span>
              <b className="font-bold">
                {result.failed_owners.length} name
                {result.failed_owners.length === 1 ? "" : "s"} were not filed.
              </b>{" "}
              Most often this means the record is already claimed.
            </span>
          </p>
          <ul className="mt-[6px] grid gap-[3px] pl-[23px]">
            {result.failed_owners.map((owner) => (
              <li key={owner.ownername}>
                <b className="font-semibold">{owner.ownername}</b> — {owner.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pending.length > 0 && (
        <p className="flex items-start gap-[10px] rounded-mv border border-mv-line bg-mv-portal-wash/60 px-4 py-3 text-[11.5px] leading-[1.55] text-mv-slate">
          <Info
            aria-hidden="true"
            className="mt-[1px] h-[14px] w-[14px] flex-none text-mv-muted"
          />
          <span>
            <b className="font-semibold text-mv-ink">
              {pending.length} more record{pending.length === 1 ? "" : "s"}{" "}
              awaiting a mailed code
            </b>{" "}
            — their leases join your account once the code you post back is
            matched. Nothing else changes until then.
          </span>
        </p>
      )}

      <p className="flex items-start gap-[10px] rounded-mv border border-mv-mint-edge bg-mv-mint/50 px-4 py-3 text-[11.5px] leading-[1.55] text-mv-green-ink">
        <Zap
          aria-hidden="true"
          className="mt-[1px] h-[14px] w-[14px] flex-none text-mv-green-deep"
        />
        <span>
          <b className="font-bold">
            We&rsquo;re building your portfolio — we&rsquo;ll email you when
            it&rsquo;s ready.
          </b>
          <br />
          Verifying your record and assembling your map, production history and
          estimate takes up to 24 hours, usually much less.
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
        <PortalButtonLink variant="dark" href="/mineralownersite">
          <LayoutGrid aria-hidden="true" className="h-[15px] w-[15px]" />
          Open my dashboard →
        </PortalButtonLink>
        <PrototypeButton
          acknowledgement="Invites sent ✓ (prototype)"
          size="md"
          icon={<UserPlus aria-hidden="true" className="h-[15px] w-[15px]" />}
          title="Opens the co-owner invite flow"
        >
          Invite my co-owners
        </PrototypeButton>
        <p className="ml-auto text-[12px] text-mv-muted">
          Claimed by mistake?{" "}
          <Link
            href="/mineralownersite/settings"
            className="font-semibold text-mv-green-deep underline underline-offset-2"
          >
            Unclaim in Settings
          </Link>
        </p>
      </div>

      {visible && (
        <p className="text-[11px] text-mv-muted">
          Visible lease value {money(visible.value)} · appraised on the county
          roll, not an appraisal of your interest.
        </p>
      )}
    </div>
  );
}
