"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchClaimMeta,
  fetchLeaseOwners,
  fetchSameName,
  fetchSearch,
  postAddressCorrection,
  postClaim,
} from "@/lib/claim-search/api";
import { despace } from "@/lib/claim-search/scoring";
import type { ClaimMeta, LeaseAgg, ScoredOwner } from "@/lib/claim-search/types";

import {
  buildMergedTx,
  leftLeases,
  okey,
  sameNameOthers,
  totalLeaseCount,
  universe,
  workingSet,
} from "../_lib/working-set";
import { ClaimCard, type ClaimState } from "./claim-card";
import {
  LeaseDetailsModal,
  type LeaseDetailRow,
} from "./lease-details-modal";
import { LeaseDrawer } from "./lease-drawer";
import { LeasePanel } from "./lease-panel";
import { OwnerTable } from "./owner-table";
import { RecordModal, type ModalState } from "./record-modal";
import {
  fieldInput,
  fieldLabel,
  HomeIcon,
  InlineSpinner,
  LeaseIcon,
  LockIcon,
  PersonIcon,
  PinIcon,
  SearchIcon,
} from "./ui";

function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-mv-line bg-white px-[13px] py-[5px] text-xs text-mv-slate">
      {children}
    </span>
  );
}

/**
 * The pre-search state: four cards saying what the finder can do, in place of
 * two empty panels. The first card carries the live index numbers once the
 * meta call lands.
 */
function IntroFeatures({ meta }: { meta: ClaimMeta | null }) {
  const items = [
    {
      icon: <SearchIcon size={17} stroke={2.2} />,
      title: meta
        ? `${meta.totalOwners.toLocaleString("en-US")} records`
        : "The whole state, indexed",
      text: meta
        ? `Every county appraisal mineral roll in Texas — ${meta.counties.length} counties, searchable in one place.`
        : "Every county appraisal mineral roll in Texas, searchable in one place.",
    },
    {
      icon: <PersonIcon size={17} stroke={2.2} />,
      title: "Forgiving search",
      text: "Part of a name is enough — typos, word order and punctuation don't matter.",
    },
    {
      icon: <LeaseIcon size={17} stroke={2.2} />,
      title: "Leases & owners, linked",
      text: "Tick a lease to see everyone on it; tick records to see just their leases.",
    },
    {
      icon: <HomeIcon size={17} />,
      title: "Same name, many addresses",
      text: "Rolls keep old addresses beside new ones. Tick every record that is you and claim them as one.",
    },
    {
      icon: <PinIcon />,
      title: "Lease reports",
      text: "Open any lease for its owner count and appraised total, straight from the county roll.",
    },
    {
      icon: <LockIcon size={16} />,
      title: "Claim it free",
      text: "Searching needs no account. A free one unlocks mailing addresses and appraised values.",
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-[18px] pb-2 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
      {items.map((it) => (
        <div
          key={it.title}
          className="rounded-mv border border-mv-line bg-mv-card px-5 py-[18px] shadow-mv transition-shadow hover:shadow-mv-lg"
        >
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-[10px] bg-mv-mint text-mv-green-deep">
            {it.icon}
          </span>
          <h3 className="text-[14.5px] font-bold text-mv-ink">{it.title}</h3>
          <p className="mt-1 text-[12.5px] leading-[1.5] text-mv-muted">
            {it.text}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Find your record — the prototype's `#/claim` two-panel finder, as pure UI.
 *
 * ALL data comes through the API client in `lib/claim-search/api.ts` (the
 * contract the backend team implements); this component only holds view
 * state and the panel-linking algebra from `_lib/working-set.ts`. Two locked
 * behaviours preserved from the handoff build: an owner-name search term
 * persists after ticking a lease (the v102 fix), and lease membership is
 * exact — fuzzy scoring only ever ranks.
 */
export function ClaimFinder({
  signedIn,
  memberId,
}: {
  signedIn: boolean;
  /** The signed-in member's id, or null when anonymous — see `api.ts`. */
  memberId: number | null;
}) {
  const router = useRouter();
  const [meta, setMeta] = useState<ClaimMeta | null>(null);

  // The form is draft state; a search commits it into `query` so typing in
  // the boxes never moves the panels until Search (or Enter) fires.
  const [form, setForm] = useState({ name: "", lease: "", addr: "", county: "*" });
  const [query, setQuery] = useState({ name: "", lease: "", county: "*" });
  const [owners, setOwners] = useState<ScoredOwner[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState("");

  // Post-search filters: the two refine boxes and the county chip.
  const [refine, setRefine] = useState("");
  const [refL, setRefL] = useState("");
  const [cty, setCty] = useState("*");

  // Ticks and the exact-membership cache for ticked leases.
  const [selO, setSelO] = useState<Record<string, boolean>>({});
  const [selL, setSelL] = useState<Record<string, boolean>>({});
  const [memb, setMemb] = useState<Record<string, ScoredOwner[]>>({});

  // In-flight flags for the two slow lookups — the panels show a loader
  // overlay (search / lease membership) or a row spinner (same-name) while
  // the API works, because the dev backend can take seconds.
  const [leaseLoading, setLeaseLoading] = useState(false);
  const [pendingOwnerKey, setPendingOwnerKey] = useState<string | null>(null);

  /**
   * PHONE-ONLY VIEW STATE (2026-08-25). Stacked, the lease panel came first
   * and buried the owner records 1100px down the page — but owners are what
   * people came to find. Phones now show ONE panel at a time behind a tab
   * pair, owners first. Both panels render together above 768px as before.
   */
  const [mobilePanel, setMobilePanel] = useState<"owners" | "leases">("owners");
  /**
   * The filter card is ~400px of a 812px screen. Once a search is committed
   * it collapses to a one-line sticky summary so the results own the screen,
   * with Edit always a tap away. Expanded before the first search.
   */
  const [filtersOpen, setFiltersOpen] = useState(true);
  /** True while `POST /owners/claim` is in flight — guards a double file. */
  const [claiming, setClaiming] = useState(false);

  const [claim, setClaim] = useState<ClaimState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [drawer, setDrawer] = useState<LeaseAgg | null>(null);
  const [details, setDetails] = useState<LeaseDetailRow[] | null>(null);

  // Address corrections, keyed by record identity — mirrored to localStorage
  // and posted through the API for the data team.
  const [corr, setCorr] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchClaimMeta()
      .then((m) => {
        setMeta(m);
        // Saved corrections ride along with the meta load: both are needed
        // only once results render, and reading localStorage here (not in
        // the effect body) keeps server render and hydration identical.
        try {
          setCorr(JSON.parse(localStorage.getItem("mvAddrCorrections") ?? "{}"));
        } catch {
          /* corrupt store — start clean */
        }
      })
      .catch(() =>
        setStatus("The search service is unavailable — refresh to try again."),
      );
  }, []);

  /* ---------- the single working set, derived every render ---------- */
  const anyLeaseTicked = Object.keys(selL).some((k) => selL[k]);
  const anyOwnerTicked = Object.keys(selO).some((k) => selO[k]);
  const selLeaseCount = Object.keys(selL).filter((k) => selL[k]).length;

  const U = useMemo(() => universe(owners, selL, memb), [owners, selL, memb]);
  const W = useMemo(
    () =>
      workingSet(U, {
        cty,
        nameQ: query.name,
        refine,
        refL,
        selO,
        anyLeaseTicked,
      }),
    [U, cty, query.name, refine, refL, selO, anyLeaseTicked],
  );
  // Lease aggregation runs over ticked owners only, once any are ticked.
  const L = useMemo(() => {
    const WL = anyOwnerTicked ? W.filter((w) => selO[w.key]) : W;
    return leftLeases(WL, refL, selL);
  }, [W, anyOwnerTicked, selO, refL, selL]);
  const totalLeases = useMemo(() => totalLeaseCount(U), [U]);

  /** One line describing the applied filters, for the collapsed phone bar. */
  const filterSummary =
    [
      form.county === "*" ? "All of Texas" : `${form.county} County`,
      form.name.trim() && `owner “${form.name.trim()}”`,
      form.lease.trim() && `lease “${form.lease.trim()}”`,
      form.addr.trim() && form.addr.trim(),
    ]
      .filter(Boolean)
      .join(" · ") || "All of Texas";

  const countyOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of owners) counts[o.county] = (counts[o.county] ?? 0) + 1;
    return Object.keys(counts)
      .sort()
      .map((county) => ({ county, count: counts[county] }));
  }, [owners]);

  /* ---------- actions ---------- */

  // Monotonic sequence so a slow response never overwrites a newer one —
  // with live search two requests can easily be in flight at once.
  const searchSeq = useRef(0);
  const resultsAnchor = useRef<HTMLDivElement>(null);
  /** The live-search debounce, so an explicit Enter can cancel it. */
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * PHONES ONLY: bring the results into view once they land (2026-08-25).
   * The filter card is static and nearly a screen tall at 375px, so a search
   * used to complete entirely below the fold — it looked like nothing had
   * happened.
   *
   * Skipped while a filter field still has focus: live search fires on every
   * debounce, and yanking the page away mid-word (taking the keyboard's
   * anchor with it) would be worse than not scrolling at all. Pressing Enter
   * blurs the field, so an explicit search always scrolls; so does picking a
   * county. Desktop never scrolls — the results are already visible there.
   */
  function scrollToResultsOnPhone() {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      active.closest("form") &&
      (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
    )
      return;
    // Collapsing first shortens the page, which is why the scroll target is
    // measured inside the timeout below rather than now.
    setFiltersOpen(false);
    // A frame late: the results replace the intro cards, so the anchor's
    // position is only final after that paint. 72px clears the sticky header.
    setTimeout(() => {
      const el = resultsAnchor.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    }, 80);
  }

  /** Enter commits the filters immediately rather than waiting out the debounce. */
  function onFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    // Cancel the pending debounce: without this, Enter searches AND the
    // timer fires the same search again a moment later.
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const el = e.target as HTMLElement;
    el.blur?.();
    void doSearch();
  }

  const anyFilter =
    form.name.trim() !== "" ||
    form.lease.trim() !== "" ||
    form.addr.trim() !== "" ||
    form.county !== "*";

  function clearFilters() {
    setForm({ name: "", lease: "", addr: "", county: "*" });
  }

  async function doSearch() {
    const seq = ++searchSeq.current;
    const q = {
      name: form.name.trim(),
      lease: form.lease.trim(),
      addr: form.addr.trim(),
      county: form.county,
    };
    setSearching(true);
    setStatus("");
    try {
      const { owners: results } = await fetchSearch(q);
      if (seq !== searchSeq.current) return; // a newer search superseded this one
      setOwners(results);
      setQuery({ name: q.name, lease: q.lease, county: q.county });
      setSelO({});
      setSelL({});
      // The address box seeds the owner refine — same field, same tokens.
      setRefine(q.addr);
      setRefL("");
      setCty("*");
      setSearched(true);
      setClaim(null);
      scrollToResultsOnPhone();
    } catch {
      if (seq === searchSeq.current)
        setStatus("Search failed to load — try again.");
    } finally {
      if (seq === searchSeq.current) setSearching(false);
    }
  }

  /**
   * LIVE SEARCH (2026-08-25) — no Search button: results follow the filters.
   * Typing is debounced 450ms; picking a county fires through the same path.
   * A name or lease needs two characters before it searches, so a single
   * keystroke doesn't sweep the statewide index. Clearing every filter
   * returns the page to its intro state.
   */
  useEffect(() => {
    const name = form.name.trim();
    const lease = form.lease.trim();
    const active =
      name.length >= 2 || lease.length >= 2 || form.county !== "*";
    if (!active) searchSeq.current++; // cancel anything in flight NOW
    const t = setTimeout(
      () => {
        debounceTimer.current = null;
        if (!active) {
          if (searched || searching || owners.length) {
            setOwners([]);
            setSearched(false);
            setSearching(false);
            setSelO({});
            setSelL({});
            setClaim(null);
            setStatus("");
          }
          return;
        }
        void doSearch();
      },
      active ? 450 : 0,
    );
    debounceTimer.current = t;
    return () => clearTimeout(t);
    // doSearch reads the same `form` this effect keys on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  async function toggleLease(key: string) {
    const turningOn = !selL[key];
    setSelL((s) => ({ ...s, [key]: turningOn }));
    if (!turningOn || memb[key]) return;
    // First tick of this lease: fetch its full membership (exact despaced
    // name match on the server — never fuzzy).
    setLeaseLoading(true);
    setStatus("Loading every owner on that lease…");
    try {
      const [county, lease] = key.split("|");
      const { owners: rows } = await fetchLeaseOwners(county, lease);
      setMemb((prev) => ({ ...prev, [key]: rows }));
      setStatus("");
    } catch {
      setStatus("Couldn't load that lease's owners — try again.");
    } finally {
      setLeaseLoading(false);
    }
  }

  function ownerByKey(key: string): ScoredOwner | null {
    return U.find((o) => okey(o) === key) ?? owners.find((o) => okey(o) === key) ?? null;
  }

  /** Tick = open the "Is this you?" popup; tick again = plain untick. */
  async function tickOwner(key: string) {
    if (selO[key]) {
      setSelO((s) => ({ ...s, [key]: false }));
      return;
    }
    if (pendingOwnerKey) return; // one lookup at a time — no double-click pileup
    const o = ownerByKey(key);
    if (!o) return;
    setPendingOwnerKey(key);
    try {
      const { items } = await fetchSameName(
        o.county,
        o.r[0],
        (o.r[4] as string) || "",
      );
      const merged = [...items];
      // Statewide searches can hold the same name in other counties too.
      const bn = despace(o.r[0]);
      for (const x of owners) {
        if (x.county === o.county) continue;
        if (despace(x.r[0]) !== bn) continue;
        const k = okey(x);
        if (k === okey(o)) continue;
        if (!merged.some((it) => it.key === k))
          merged.push({ r: x.r, county: x.county, key: k });
      }
      setModal({ base: o, items: merged });
    } catch {
      /* lookup failed — leave the tick alone */
    } finally {
      setPendingOwnerKey(null);
    }
  }

  function closeModal(confirmed: boolean, checkedKeys: string[]) {
    if (!modal) return;
    const baseKey = okey(modal.base);
    if (confirmed) {
      const checked = new Set(checkedKeys);
      // A confirmed sibling that came from the full county roll may not be in
      // the result set yet — add it so its tick has a row to live on.
      setOwners((prev) => {
        const next = [...prev];
        for (const it of modal.items) {
          if (!checked.has(it.key)) continue;
          if (!next.some((x) => okey(x) === it.key))
            next.push({ r: it.r, county: it.county, s: 1 });
        }
        return next;
      });
      setSelO((prev) => {
        const next = { ...prev, [baseKey]: true };
        for (const it of modal.items) next[it.key] = checked.has(it.key);
        return next;
      });
    } else {
      setSelO((prev) => ({ ...prev, [baseKey]: false }));
    }
    setModal(null);
  }

  function saveCorrection(
    key: string,
    owner: string,
    county: string,
    oldAddress: string,
    newAddress: string,
  ) {
    setCorr((prev) => {
      const next = { ...prev, [key]: newAddress };
      try {
        localStorage.setItem("mvAddrCorrections", JSON.stringify(next));
      } catch {
        /* private mode — the POST below still records it */
      }
      return next;
    });
    postAddressCorrection({ owner, county, oldAddress, newAddress }, memberId);
  }

  /**
   * Commit a claim.
   *
   * MEMBERS FILE IT FOR REAL: `POST /owners/claim` takes the owner NAMES and
   * resolves each one's leases server-side, reporting per-name outcomes. An
   * all-successful claim goes straight to the portal, where the records now
   * live; anything rejected (usually `OWNER_ALREADY_CLAIMED`) stops instead
   * and shows what did and did not land — silently redirecting would hide a
   * failure the visitor needs to read.
   *
   * ANONYMOUS VISITORS CANNOT: the endpoint rejects a visitor id, so they get
   * the sign-up card and the stashed payload, exactly as before.
   */
  async function finishClaim(base: ScoredOwner, merged: ScoredOwner[]) {
    if (claiming) return;
    const tx = buildMergedTx(base, merged);
    try {
      sessionStorage.setItem("mvClaimedOwner", JSON.stringify(tx));
    } catch {
      /* signup/portal flow just won't be pre-filled */
    }

    if (!signedIn || memberId === null) {
      setClaim({ phase: "done", base, tx });
      return;
    }

    setClaiming(true);
    setStatus("Filing your claim…");
    try {
      const result = await postClaim(memberId, tx.owners);
      setStatus("");
      if (result.failed_owners.length === 0) {
        router.push("/portal");
        return;
      }
      setClaim({ phase: "result", base, tx, result });
    } catch {
      setStatus("");
      setClaim({ phase: "error", base, tx });
    } finally {
      setClaiming(false);
    }
  }

  /** The Claim button: merge-ask first when the name exists elsewhere. */
  function claimOne(o: ScoredOwner) {
    const others = sameNameOthers(o, U);
    if (others.length) setClaim({ phase: "ask", base: o, others });
    else void finishClaim(o, []);
  }

  /** Multi-claim: the user ticked the records themselves — no merge-ask. */
  function claimSelected() {
    const picked = U.filter((o) => selO[okey(o)]);
    if (!picked.length) return;
    void finishClaim(picked[0], picked.slice(1));
  }

  /**
   * "View lease details": one row per lease per ticked record. The lease
   * number is whatever trailing "(12345)" the county roll baked into the
   * lease name; the value column carries the API's PER-LEASE appraised value
   * (`leaseValues`, aligned with the lease list), falling back to the
   * record's total only for rows the API sent without it.
   */
  function viewLeaseDetails() {
    const rows: LeaseDetailRow[] = [];
    const seen = new Set<string>();
    for (const o of U) {
      if (!selO[okey(o)]) continue;
      const leases = (o.r[3] as string[]) ?? [];
      leases.forEach((lease, i) => {
        const dedup = okey(o) + "|" + lease;
        if (seen.has(dedup)) return;
        seen.add(dedup);
        rows.push({
          lease,
          leaseNo: /\((\d+)\)\s*$/.exec(lease)?.[1] ?? "—",
          owner: o.r[0],
          county: o.county,
          value: o.leaseValues?.[i] ?? o.r[2],
          workingInterest: !!o.workingInterest,
        });
      });
    }
    if (rows.length) setDetails(rows);
  }

  // Escape closes the popup (as cancel) first, then the drawer — as the
  // prototype's document-level handler did.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (modal) closeModal(false, []);
      else if (details) setDetails(null);
      else setDrawer(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  /* ---------- page ---------- */
  return (
    <div className="bg-mv-bg">
      {/* hero — NO background of its own (2026-08-25): it sits straight on
          the page ground, so the copy flips to ink/muted and the pills to
          bordered white chips. The search card below keeps its hero overlap. */}
      {/* Padding is now just breathing room (2026-08-25). It used to be 86px
          so the search card could overlap a dark hero band; with the band
          gone, that padding plus the card's -62px pull was dead space that
          pushed the filters and both panels down the page. */}
      <section className="pb-5 pt-5 max-[767px]:pb-4 max-[767px]:pt-4">
        <div className="mx-auto max-w-[1140px] px-7 max-[767px]:px-4">
          {/* Headline and stat pills share ONE row (2026-08-25): pills on a
              row of their own left an empty band above the h1. They wrap
              under the headline on narrow screens. */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h1 className="text-[clamp(24px,4.5vw,31px)] font-extrabold leading-[1.15] tracking-[-.02em] text-mv-ink">
              Find your record —{" "}
              <em className="not-italic text-mv-green-deep">
                no account needed
              </em>
            </h1>
            <div className="flex flex-wrap gap-2">
              {meta ? (
                <>
                  <HeroPill>
                    <b className="font-bold text-mv-ink">
                      {meta.totalOwners.toLocaleString("en-US")}
                    </b>{" "}
                    total owners
                  </HeroPill>
                  <HeroPill>
                    <b className="font-bold text-mv-ink">
                      {meta.counties.length}
                    </b>{" "}
                    Texas counties
                  </HeroPill>
                  <HeroPill>Free · no account</HeroPill>
                </>
              ) : (
                <HeroPill>Loading index…</HeroPill>
              )}
            </div>
          </div>
          {/* No width cap: the sentence fits the 1140px wrap on one line at
              desktop widths; narrower screens still wrap naturally. */}
          <p className="text-sm font-light text-mv-muted">
            Fill in whatever you know — part of a <strong>name</strong>, a{" "}
            <strong>lease</strong>, or just your <strong>county</strong>. You
            claim the owner record: every lease tied to it follows
            automatically.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1140px] px-7 max-[767px]:px-4">
        {/* Collapsed filters — phones only. Sticky so the summary of what is
            applied, and the way back to the fields, are always in reach. */}
        {!filtersOpen && (
          <div className="sticky top-[72px] z-40 mb-3 hidden items-center gap-2 rounded-mv border border-mv-line bg-mv-card px-3 py-[10px] shadow-mv max-[767px]:flex">
            <span className="flex-none text-mv-green-deep">
              <SearchIcon size={15} stroke={2.4} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-mv-slate">
              {filterSummary}
            </span>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="min-h-[34px] flex-none cursor-pointer rounded-lg border border-mv-line-strong bg-white px-3 text-[12.5px] font-semibold text-mv-green-deep"
            >
              Edit
            </button>
          </div>
        )}

        {/* sticky search card — overlaps the hero; sits under the h-16 header.
            NO Search button (2026-08-25): results follow the filters live, so
            the card is just the four fields plus the running tally. */}
        <form
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={onFormKeyDown}
          className={`${filtersOpen ? "" : "max-[767px]:hidden"} sticky top-[72px] z-40 mb-[18px] rounded-mv border border-mv-line bg-mv-card p-[18px] pb-[14px] shadow-mv-lg max-[767px]:static max-[767px]:p-[14px] max-[767px]:pb-3`}
        >
          <div className="grid grid-cols-[1fr_1.4fr] items-end gap-3 max-[640px]:grid-cols-1 max-[640px]:gap-[10px]">
            <div>
              <div className={fieldLabel}>
                <PinIcon />
                County
              </div>
              <select
                className={fieldInput}
                value={form.county}
                onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))}
              >
                <option value="*">All of Texas — statewide</option>
                {meta?.counties.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className={fieldLabel}>
                <HomeIcon />
                Address
              </div>
              <input
                className={fieldInput}
                placeholder="Street, city, or ZIP"
                value={form.addr}
                onChange={(e) => setForm((f) => ({ ...f, addr: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-3 max-[640px]:mt-[10px] max-[640px]:grid-cols-1 max-[640px]:gap-[10px]">
            <div>
              <div className={fieldLabel}>
                <LeaseIcon />
                Lease Name
              </div>
              <input
                className={fieldInput}
                placeholder="e.g. Smith Gas Unit"
                value={form.lease}
                onChange={(e) => setForm((f) => ({ ...f, lease: e.target.value }))}
              />
            </div>
            <div>
              <div className={fieldLabel}>
                <PersonIcon />
                Owner Name
              </div>
              <input
                className={fieldInput}
                placeholder="e.g. Cochran"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-3 flex min-h-[26px] flex-wrap items-center gap-2">
            {searching ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-mv-line bg-mv-hover px-3 py-1 text-xs font-semibold text-mv-slate">
                <InlineSpinner />
                Searching the rolls…
              </span>
            ) : searched ? (
              <>
                <span className="rounded-full border border-mv-line bg-mv-hover px-3 py-1 text-xs text-mv-slate">
                  <b className="text-mv-green-deep">{W.length}</b> of {U.length}
                  {!anyLeaseTicked && owners.length === 500 ? "+" : ""} owner
                  {U.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full border border-mv-line bg-mv-hover px-3 py-1 text-xs text-mv-slate">
                  <b className="text-mv-green-deep">{L.length}</b> of{" "}
                  {totalLeases} lease{totalLeases === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
            {searched && (
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="hidden min-h-[32px] cursor-pointer rounded-lg bg-mv-ink px-3 text-[12.5px] font-semibold text-white max-[767px]:inline-flex max-[767px]:items-center"
              >
                Done
              </button>
            )}
            {anyFilter ? (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto cursor-pointer rounded-lg px-2 py-1 text-[12px] font-semibold text-mv-green-deep hover:bg-mv-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mv-green-deep"
              >
                Clear filters
              </button>
            ) : (
              <span className="ml-auto text-[11px] text-mv-muted">
                Results update as you type
              </span>
            )}
          </div>
        </form>

        <p aria-live="polite" className={status ? "mb-[10px] text-[13px] text-mv-muted" : "sr-only"}>
          {status}
        </p>
        {/* Scroll target for phones — see `scrollToResultsOnPhone`. */}
        <div ref={resultsAnchor} aria-hidden="true" />

        {/* Before the first filter: what this page can do, instead of two
            empty panels staring back. Any filter swaps this for the results. */}
        {!searched && !searching && <IntroFeatures meta={meta} />}

        {searched && !searching && (
          <p className="mb-[14px] rounded-[10px] border border-mv-line border-l-4 border-l-mv-green bg-white px-[14px] py-[9px] text-[13px] text-mv-slate">
            {owners.length ? (
              <strong>Your matches</strong>
            ) : (
              <strong>No records matched</strong>
            )}{" "}
            — {query.county === "*" ? "all of Texas" : `${query.county} County`}
            {query.name || query.lease ? (
              <>
                {query.name && <> · owner &ldquo;{query.name}&rdquo;</>}
                {query.lease && <> · lease &ldquo;{query.lease}&rdquo;</>}
              </>
            ) : (
              <> · browsing the county roll</>
            )}
            . Filters below move <em>both</em> panels.
          </p>
        )}

        {/* Panel switch — phones only; both panels show side by side above
            768px, so the tabs are pure mobile chrome. The inactive panel is
            hidden with `!hidden`: the grid sets `[&>*]:flex` on its children,
            which otherwise wins over a plain `hidden`. */}
        {(searched || searching) && (
          <div className="mb-3 hidden gap-2 max-[767px]:flex" role="tablist">
            {(
              [
                ["owners", `Owners (${W.length})`],
                ["leases", `Leases (${L.length})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mobilePanel === key}
                onClick={() => setMobilePanel(key)}
                className={`min-h-[42px] flex-1 cursor-pointer rounded-full border text-[13px] font-semibold transition-colors ${
                  mobilePanel === key
                    ? "border-mv-green-deep bg-mv-tint text-mv-green-ink"
                    : "border-mv-line bg-white text-mv-slate"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div
          className={`grid grid-cols-[370px_1fr] items-stretch gap-[18px] pb-2 max-[900px]:grid-cols-1 max-[767px]:gap-3 [&>*]:flex [&>*]:min-w-0 ${
            !searched && !searching ? "hidden" : ""
          }`}
        >
          <div className={mobilePanel === "leases" ? "" : "max-[767px]:!hidden"}>
            <LeasePanel
              searched={searched}
              signedIn={signedIn}
              busyLabel={
                searching
                  ? "Searching the rolls…"
                  : leaseLoading
                    ? "Loading every owner on that lease…"
                    : null
              }
              leases={L}
              ownerCount={W.length}
              anyOwnerTicked={anyOwnerTicked}
              anyLeaseTicked={anyLeaseTicked}
              refL={refL}
              onRefL={setRefL}
              countyOptions={countyOptions}
              cty={cty}
              onCty={setCty}
              selL={selL}
              onToggleLease={toggleLease}
              onOpenReport={setDrawer}
              onClearTicks={() => setSelL({})}
            />
          </div>
          <div className={mobilePanel === "owners" ? "" : "max-[767px]:!hidden"}>
            <OwnerTable
              searched={searched}
              signedIn={signedIn}
              busyLabel={
                searching
                  ? "Searching the rolls…"
                  : leaseLoading
                    ? "Loading every owner on that lease…"
                    : null
              }
              pendingOwnerKey={pendingOwnerKey}
              W={W}
              universeCount={U.length}
              corr={corr}
              selO={selO}
              nameQ={query.name}
              anyLeaseTicked={anyLeaseTicked}
              selLeaseCount={selLeaseCount}
              refine={refine}
              onRefine={setRefine}
              onTickOwner={tickOwner}
              onClaim={claimOne}
              onClearTicks={() => setSelO({})}
              onClaimSelected={claimSelected}
              onViewLeaseDetails={viewLeaseDetails}
            />
          </div>
        </div>

        {claim && (
          <ClaimCard
            claim={claim}
            onMerge={(merged) => {
              if (claim) void finishClaim(claim.base, merged);
            }}
          />
        )}

        <footer className="mb-[34px] mt-[26px] border-t border-mv-line pt-[18px] text-center text-[11.5px] text-mv-sublabel">
          Source: county appraisal mineral rolls · latest roll per county.
          Claiming does not change legal ownership.
        </footer>
      </div>

      {modal && (
        <RecordModal
          modal={modal}
          corr={corr}
          selO={selO}
          onSaveCorrection={saveCorrection}
          onClose={closeModal}
        />
      )}
      {details && (
        <LeaseDetailsModal
          rows={details}
          signedIn={signedIn}
          onClose={() => setDetails(null)}
        />
      )}
      <LeaseDrawer
        lease={drawer}
        signedIn={signedIn}
        onClose={() => setDrawer(null)}
      />
    </div>
  );
}
