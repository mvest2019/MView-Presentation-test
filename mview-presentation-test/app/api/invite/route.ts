import {
  codeFor,
  DEFAULT_BODY,
  letterFor,
} from "@/app/mineralownersite/(reference)/invite/_lib/invite-letters";
import {
  inviteLeases,
  inviteSender,
} from "@/app/mineralownersite/(reference)/invite/_lib/invite-records";
import {
  renderCsv,
  renderLetters,
} from "@/app/mineralownersite/(reference)/invite/_lib/invite-render";
import type {
  GreetingStyle,
  Letter,
} from "@/app/mineralownersite/(reference)/invite/_lib/invite-types";

/**
 * THE PRINTABLE LETTERS AND THE SPREADSHEET — `/api/invite`.
 *
 * The reference build's own route, ported. Everything the Invite page can put
 * on the clipboard it can also hand over as a file, and this is the half that
 * makes a file: `format=html` renders one sheet per owner ready for a printer,
 * `format=csv` the same letters as a spreadsheet.
 *
 * ── WHY IT IS A GET AND NOT A POST ──
 *
 * Because the answer is a document and the reader asked for it by pressing a
 * link. A GET is what makes "Print" open in a new tab and "Download" save a
 * file without JavaScript building a blob, and it is what makes the result
 * bookmarkable and re-openable. Nothing here writes, so the method is honest.
 *
 * ── THE SELECTION TRAVELS IN THE QUERY STRING ──
 *
 * `lease`, `owners` (a comma-separated list of owner numbers), and the three
 * things that change the wording: `greeting`, `custom`, `body`. The page holds
 * those in React state, and a link cannot see React state — so the link carries
 * them, and the document matches the preview the reader was looking at when
 * they pressed it. `body` is capped at the same 2,000 characters the editor
 * caps at, because a query string is not an unbounded channel.
 *
 * ── IT READS THE SAME FIXTURE THE PAGE DOES ──
 *
 * `inviteLeases` and `letterFor` are the page's own modules, imported rather
 * than reimplemented, so a letter that downloads cannot disagree with the
 * letter that was previewed — same code, same wording, same owner numbers. When
 * the co-owner lists become a real appraisal-roll read, this route changes with
 * the page and not separately.
 *
 * ── WHAT IT REFUSES ──
 *
 * An unknown lease and an empty selection both 400 rather than returning an
 * empty document: a printer that produces one blank sheet is a worse answer
 * than a message saying which parameter was wrong. Owner numbers that are not
 * on the named lease are dropped silently — they are the only case where the
 * caller and the fixture can legitimately disagree, after a lease switch.
 */
export const dynamic = "force-dynamic";

/** The editor's own ceiling — see `email-step.tsx`. */
const BODY_MAX = 2000;

const GREETINGS: readonly GreetingStyle[] = ["first", "name", "family", "custom"];

function bad(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const p = url.searchParams;

  const lease = inviteLeases.find((l) => l.leaseId === p.get("lease"));
  if (!lease) return bad("Unknown lease.");

  const wanted = (p.get("owners") ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (wanted.length === 0) return bad("No owners were chosen.");

  /* THE ORDER IS THE READER'S, not the roll's: the document should come out in
     the order they ticked, which is the order the link lists. */
  const owners = wanted
    .map((number) => lease.owners.find((o) => o.ownerNumber === number))
    .filter((o) => o !== undefined);
  if (owners.length === 0) return bad("None of those owners are on that lease.");

  const greetingParam = p.get("greeting");
  const greeting: GreetingStyle = GREETINGS.includes(
    greetingParam as GreetingStyle,
  )
    ? (greetingParam as GreetingStyle)
    : "first";

  const body = (p.get("body") ?? "").slice(0, BODY_MAX) || DEFAULT_BODY;

  const letters: Letter[] = owners.map((owner) =>
    letterFor({
      sender: inviteSender.name,
      leaseName: lease.leaseName,
      leaseNumber: lease.leaseNumber,
      county: lease.county,
      owner,
      code: codeFor(lease.leaseId, owner.ownerNumber),
      greeting,
      custom: p.get("custom") ?? "",
      body,
      claimUrl: inviteSender.claimUrl,
    }),
  );

  const csv = p.get("format") === "csv";
  const download = p.get("dl") === "1";

  /*
   * THE FILENAME IS THE PERSON WHEN THERE IS ONE, and the lease when there are
   * several. Saving five single-letter files all called `invite-letters.html`
   * is the defect the per-owner rows exist to avoid, so the name has to carry
   * what the file holds.
   */
  const slug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "invite";
  const stem =
    letters.length === 1
      ? `invite-${slug(letters[0].to)}`
      : `invite-letters-${slug(lease.leaseName)}`;

  const headers = new Headers({
    "content-type": csv
      ? "text/csv; charset=utf-8"
      : "text/html; charset=utf-8",
    /* Nothing here is cacheable: the wording travels in the query string and
       the reader edits it between presses. */
    "cache-control": "no-store",
  });
  if (download) {
    headers.set(
      "content-disposition",
      `attachment; filename="${stem}.${csv ? "csv" : "html"}"`,
    );
  }

  const madeOn = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return new Response(
    csv ? renderCsv(letters) : renderLetters(letters, inviteSender.name, madeOn),
    { headers },
  );
}
