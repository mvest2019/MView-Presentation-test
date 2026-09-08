import Link from "next/link";

/**
 * The portal sections that are not in this build.
 *
 * PORTED FROM the reference's `src/app/soon/[slug]/page.tsx`, and it exists for
 * its reason: "They are real routes rather than dead links, because a
 * navigation item that does nothing when clicked reads as a bug."
 *
 * ADAPTED — WHICH SECTIONS APPEAR, and the copy for two of them. The reference
 * lists eleven, including My Leases, Map and Settings. Those three ARE in this
 * app, so their sidebar rows point at the real pages and never reach here;
 * keeping the reference's "not in this build" copy for them would have printed
 * a false statement about a page sitting one click away. The four that
 * genuinely do not exist here keep the reference's own wording, verbatim, and
 * the two account rows keep theirs. The back buttons point at this app's paths.
 */
export const dynamic = "force-static";

const SECTIONS: Record<string, { title: string; what: string; when: string }> = {
  "production-and-forecast": {
    title: "Production & Forecast",
    what:
      "The full monthly history per lease against the decline model, with the forecast out to " +
      "the model horizon.",
    when:
      "The 24-month history and the reserves figures are on the Dashboard now; this page is " +
      "where the per-lease curves and the forecast tail will live.",
  },
  "lease-audit": {
    title: "Lease Audit",
    what:
      "A line-by-line comparison of the volumes filed with the state against the volumes on " +
      "your own royalty statements.",
    when:
      "This is the one thing the public record cannot answer on its own: it shows what came " +
      "out of the ground, never what reached you. It needs your statements.",
  },
  groups: {
    title: "Groups",
    what: "A private space per lease for the other owners in it.",
    when: "Not in this build.",
  },
  "invite-co-owners": {
    title: "Invite Co-Owners",
    what: "Invitations to the other owners on your leases.",
    when: "Not in this build.",
  },
  "my-profile": {
    title: "My Profile",
    what: "Your details and how you are identified on the roll.",
    when:
      "How this record was matched is live now — it is in your profile menu.",
  },
  "billing-and-plan": {
    title: "Billing & Plan",
    what: "Your plan and payment details.",
    when: "Not in this build.",
  },
};

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((slug) => ({ slug }));
}

export default async function Soon({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = SECTIONS[slug] ?? {
    title: "Not in this build",
    what: "This section is part of the wider portal and is not included here.",
    when: "This build covers the Dashboard and the Weekly Report.",
  };

  return (
    <main className="mv-soon">
      <div className="card card-pad" style={{ textAlign: "left" }}>
        <p
          className="tiny"
          style={{
            margin: "0 0 4px",
            fontWeight: 800,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--green-deep)",
          }}
        >
          Not in this build
        </p>
        <h1 style={{ margin: "0 0 10px", fontSize: 26 }}>{s.title}</h1>
        <p className="small" style={{ margin: "0 0 12px" }}>
          {s.what}
        </p>
        <p className="small" style={{ margin: "0 0 18px", color: "var(--slate)" }}>
          {s.when}
        </p>
        <p style={{ margin: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-mint" href="/mineralownersite">
            ← Back to the Dashboard
          </Link>
          <Link className="btn btn-ghost" href="/mineralownersite/briefing">
            Weekly Report
          </Link>
          <Link className="btn btn-ghost" href="/mineralownersite/alerts">
            Alerts
          </Link>
        </p>
      </div>
    </main>
  );
}
