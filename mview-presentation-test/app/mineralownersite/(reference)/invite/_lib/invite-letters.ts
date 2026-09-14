import type { CoOwner, GreetingStyle, Letter, LetterInput } from "./invite-types";

/**
 * THE CODES AND THE LETTERS — pure functions, no records and no database.
 *
 * This module is imported by the browser, so it holds nothing that could not
 * ship there. The roll read that would produce a real co-owner list is server
 * work and belongs in an API route when one exists; what is here is only the
 * arithmetic of a code and the wording of a letter, and neither needs the roll.
 *
 * WHY THE LETTER IS COMPOSED AT ALL, rather than being one canned paragraph
 * with a name swapped into it: every one of these goes out from the reader's
 * own mail account, to a relative, over their own signature. That is the whole
 * advantage of the page — a letter from a cousin gets opened and a mailshot
 * does not — and it only survives if the thing on the clipboard reads as
 * something a person wrote.
 */

/**
 * A stable eight-digit code for one owner on one lease.
 *
 * FNV-1a, WHICH IS NOT A SECURITY HASH AND IS NOT USED AS ONE. Nothing here is
 * secret; the only property wanted is that the same lease and the same owner
 * number always give the same code, so a letter reprinted next month carries
 * the code that was posted last month. A random code would need somewhere to be
 * stored to have that property, and this build has nowhere to store it — which
 * the page states rather than implies, because a code that is reserved nowhere
 * is not yet a promise.
 *
 * THE FIRST DIGIT IS FORCED NON-ZERO so the code is always eight characters.
 * A leading zero survives a string and does not survive a spreadsheet, and
 * these get typed into a form off a printed page.
 */
export function codeFor(leaseId: string, ownerNumber: string): string {
  const key = `${leaseId}|${ownerNumber}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return String((hash % 90_000_000) + 10_000_000);
}

/** `1234-5678` — the code as it is printed, because that is how it is typed. */
export function codeLabel(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/**
 * WORDS THAT MEAN THIS IS NOT A PERSON, whatever the roll filed the row as.
 *
 * A PLAIN LIST, JOINED INTO ONE PATTERN. Keeping it as an array leaves the only
 * backslashes in the template literal below, where they are unmissable — a
 * `\b` written inside an ordinary quoted string is a BACKSPACE character rather
 * than a word boundary, the pattern then matches nothing, and "CROFT
 * EXPLORATION" is handed back a given name of "Exploration". That typechecks,
 * because a string is a string.
 */
const NOT_A_PERSON_WORDS = [
  "exploration", "explor", "operating", "resources", "royalty", "royalties",
  "energy", "petroleum", "mineral", "minerals", "oil", "gas", "land",
  "ranch", "ranches", "farm", "farms", "partner", "partners", "holding",
  "holdings", "county", "judge", "clerk", "receiver", "estate", "heirs",
  "etal", "church", "university", "school", "district", "city", "bank",
] as const;

const NOT_A_PERSON = new RegExp(`\\b(?:${NOT_A_PERSON_WORDS.join("|")})\\b`, "i");

/**
 * The given name of an individual, or null when it cannot be had safely.
 *
 * THE ROLL FILES A PERSON AS "LAST FIRST MIDDLE", so the second word is the
 * given name: "KAISER DAVID KEITH" is David Kaiser. That is what a relative
 * would write, and "Dear Kaiser David Keith," is what a bill says.
 *
 * IT REFUSES FAR MORE THAN IT ACCEPTS, ON PURPOSE. Three words at most, no
 * ampersand — a couple is two people and neither of their names is the greeting
 * — letters only, nothing from the institutional list, and no one-character
 * second word, because "SMITH C CORLISS" would otherwise be greeted "Dear C,".
 * Getting this wrong means a letter to a stranger opening "Dear Exploration,",
 * so every case it is unsure about keeps the full name as filed.
 */
export function firstNameOf(owner: CoOwner): string | null {
  if (owner.kind !== "person") return null;
  const name = owner.name.trim();
  if (name.includes("&") || /\bjr\b|\bsr\b|\bii+\b|\biv\b/i.test(name)) return null;
  if (NOT_A_PERSON.test(name)) return null;
  const words = name.split(/\s+/);
  if (words.length < 2 || words.length > 3) return null;
  if (!words.every((word) => /^[A-Za-z][A-Za-z’'-]*$/.test(word))) return null;
  const given = words[1];
  if (given.length < 2) return null;
  return given[0].toUpperCase() + given.slice(1).toLowerCase();
}

/**
 * How a letter opens.
 *
 * "DEAR FAMILY" IS WRONG FOR AN LLC, and the roll is full of them — LPs, ranch
 * partnerships, trusts, an estate in probate. A reader who picks the family
 * greeting and has a partnership among their ticks would otherwise post a
 * letter addressed to a company as though it were a cousin. So a company or a
 * trust is always greeted by its own name whatever the reader chose, and the
 * page says so where the choice is made rather than leaving them to discover it
 * in the preview.
 */
export function greetingFor(
  style: GreetingStyle,
  custom: string,
  owner: CoOwner,
): string {
  if (owner.kind !== "person") return `Dear ${owner.name},`;
  if (style === "family") return "Dear family,";
  if (style === "first") {
    const given = firstNameOf(owner);
    return given ? `Dear ${given},` : `Dear ${owner.name},`;
  }
  if (style === "custom") {
    const words = custom.trim();
    if (!words) return `Dear ${owner.name},`;
    return /[,:]$/.test(words) ? words : `${words},`;
  }
  return `Dear ${owner.name},`;
}

/**
 * THE STANDARD LETTER, which most readers will send exactly as it stands.
 *
 * THREE THINGS IN IT ARE LOAD-BEARING AND SHOULD SURVIVE A COPY EDIT:
 *
 * IT NAMES THE SITE. Without that, the recipient is asked to type an eight-digit
 * number into a domain they have never heard of, which is the shape of a
 * phishing email whether or not this one is genuine.
 *
 * IT SAYS CLAIMING CHANGES NOTHING ABOUT LEGAL OWNERSHIP. That is the first
 * question a mineral owner asks about anything calling itself a claim, and a
 * letter that leaves it unanswered gets forwarded to a lawyer instead of acted
 * on.
 *
 * THE CODE STANDS ON A LINE OF ITS OWN. A plain-text email has no type sizes,
 * so position is the only weight available — and `plainText` indents that line
 * for the same reason.
 *
 * `{name}` `{code}` `{url}` `{lease}` are filled per recipient. The editor
 * offers them as "their name" and "their code": a reader who has never written
 * a template should not have to learn brace syntax to add a cousin's name.
 */
export const DEFAULT_BODY =
  "We both own a share of {lease}, and I have just been through what the " +
  "state’s own records say about it — the wells on it, what they have " +
  "produced, who is operating them, and what the county has it valued at.\n\n" +
  "I keep all of it in one place now, on a site called Mineral View, and it " +
  "let me bring the other owners in. Opening your own account is free, and " +
  "claiming your record does not change legal ownership of anything — it only " +
  "means you can see the same figures I can.\n\n" +
  "Here is your own invite code:\n\n" +
  "{code}\n\n" +
  "Enter it at {url} and your leases come across on their own, so there is " +
  "nothing for you to look up. The code is yours alone, and it claims your own " +
  "share and nothing else.\n\n" +
  "Once you are in, we are in the same private group — so we can compare what " +
  "we are each being paid, follow the same production month by month, and " +
  "share the cost of a professional review if we ever decide we want one.";

/** One letter, for one owner. */
export function letterFor(input: LetterInput): Letter {
  const label = codeLabel(input.code);
  const paragraphs = input.body
    .replace(/\{code\}/g, label)
    .replace(/\{url\}/g, input.claimUrl)
    .replace(/\{name\}/g, input.owner.name)
    .replace(/\{lease\}/g, input.leaseName)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  return {
    ownerNumber: input.owner.ownerNumber,
    to: input.owner.name,
    greeting: greetingFor(input.greeting, input.custom, input.owner),
    paragraphs,
    code: input.code,
    codeLabel: label,
    inviteUrl: `${input.claimUrl}?code=${input.code}`,
    heading: [
      input.leaseName,
      input.leaseNumber ? `Lease ${input.leaseNumber}` : null,
      `${input.county} County`,
    ]
      .filter(Boolean)
      .join(" · "),
    sender: input.sender,
    kind: input.owner.kind,
    caution:
      input.owner.kind === "operator"
        ? "This is the working-interest party — the operator side of the lease, " +
          "not a fellow mineral owner. Inviting them into a private owners’ " +
          "group is very unlikely to be what you meant."
        : input.owner.city === null
          ? "The roll carries no address for this owner, so there is no way to " +
            "post this one. The code still works if you can reach them another way."
          : null,
  };
}

/**
 * One letter as text the reader can paste into their own mail.
 *
 * THIS IS THE MAIN WAY THESE GO OUT, not a fallback — Mineral View posts
 * nothing. So the text has to arrive complete: greeting, body, the code where
 * it cannot be missed, the link, and a signature.
 *
 * `postal` ADDS THE LEASE HEADING, for a letter that will be printed. It is
 * left off the email form deliberately: a heading block above "Dear David,"
 * reads as a database talking rather than a relative.
 */
export function plainText(letter: Letter, options?: { postal?: boolean }): string {
  const out: string[] = [];
  if (options?.postal) out.push(letter.heading, "", letter.to, "");
  out.push(letter.greeting, "");
  /* A PARAGRAPH THAT IS NOTHING BUT THE CODE IS INDENTED — position is the only
     weight a plain-text email has. Four spaces survives every mail client; a
     tab does not. */
  letter.paragraphs.forEach((paragraph) => {
    out.push(paragraph === letter.codeLabel ? `    ${paragraph}` : paragraph, "");
  });
  out.push(`Claim your share: ${letter.inviteUrl}`, "", letter.sender);
  return out.join("\n");
}

/**
 * The subject line, which is the half of an email that decides whether it opens.
 *
 * IT NAMES THE LEASE AND NOTHING ELSE. A subject carrying a product name reads
 * as a mailshot, and this letter's one advantage is that it is not one.
 */
export function subjectFor(letter: Letter): string {
  return `Our minerals on ${letter.heading.split(" · ")[0]}`;
}

/**
 * Every chosen letter as one block of text.
 *
 * SEPARATED BY A RULE THAT NAMES THE RECIPIENT, because the reason to copy
 * twenty at once is to work down them one paste at a time — and a reader who
 * cannot see where one letter ends sends the wrong code to the wrong cousin.
 */
export function plainAll(letters: Letter[]): string {
  return letters
    .map((letter, index) =>
      [
        `----- ${index + 1} of ${letters.length} · to ${letter.to}  (code ${letter.codeLabel}) -----`,
        "",
        `Subject: ${subjectFor(letter)}`,
        "",
        plainText(letter),
      ].join("\n"),
    )
    .join("\n\n\n");
}
