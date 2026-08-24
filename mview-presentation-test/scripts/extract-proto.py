"""Regenerate app/_proto/{markup.ts,proto.css} from the prototype HTML files.

    python scripts/extract-proto.py [directory holding the prototype .html files]

The prototype is a single self-contained hash-routed HTML file per revision, and
each of our three marketing pages is one `<section data-route="...">` inside it.
This script lifts those sections out, along with the CSS they need, so the pages
can be regenerated instead of hand-maintained when a new revision lands.

EACH PAGE NAMES ITS OWN REVISION, because they do not all come from the same one:
the v44 (1) revision DELETED the owners page — no section, no inbound links, none
of its classes — so /owners can only come from the earlier v44 until a revision
brings it back or the route is retired.
"""

import json
import re
import sys
from pathlib import Path

# The revisions are hand-delivered files, not repo assets; point this at wherever
# they were saved.
SRC_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"C:\Users\Pravin\AppData\Local\Temp"
)
OUT = Path(__file__).resolve().parent.parent / "app" / "_proto"

# (constant name, source file, data-route)
#
# "v44 (1).html" IS the redesign repo's `marketing/v44.html`, verified by hash
# (md5 21d2c54279adc99b2b11c8721a4dd90f) — the two names are the same 4,788,958
# byte file, delivered once loose and once inside the repo zip. Treat
# marketing/v44.html as the canonical name.
#
# "v44.html" is the EARLIER revision (md5 c39b4ac0d1baa974f13e1de0ac5092f0) and is
# kept for one reason only: it is the last revision that still contains the owners
# page. The current revision routes its own "Owners" and "For mineral owners" links
# to #/home, having folded that audience into the home page — but only 8 of the old
# page's 11 features made the move (Dashboard, My Leases and The Weekly Report did
# not), so the section is still served here rather than dropped.
PAGES = [
    ("HOME_MARKUP", "v44 (1).html", "home"),
    ("OWNERS_MARKUP", "v44.html", "owners"),
    ("PROFESSIONALS_MARKUP", "v44 (1).html", "professionals"),
    ("PRICING_MARKUP", "v44 (1).html", "pricing"),
]

# Routes this app actually serves; a prototype link to anything else cannot be
# rewritten to a real path without inventing a 404, so it is reported instead.
APP_ROUTES = {
    "", "home", "owners", "professionals", "pricing", "operators", "faq",
    "glossary", "blogs", "contact", "contact-us", "login", "signup", "register",
    "privacy", "privacy-policy", "terms", "terms-condition", "map-explorer",
    "oil-and-gas-news", "reset-password",
}
# AVAILABILITY TRIM — the one place this script edits content rather than form.
#
# The design's pricing page lists everything the product is planned to do. Ryan,
# 2026-08-24: show only what a customer can actually use today. That is a claim
# about the live product, not about the design, so it cannot be derived from the
# prototype — it is stated here explicitly and deliberately narrowly.
#
# Keyed on the prototype's own `data-tip-id` values, which are stable and unique
# per feature (`pricing.tip.free.map`), so this survives copy edits and card
# reordering. For each prefix, any feature `<li>` under it whose suffix is NOT
# listed is dropped; a suffix listed but missing is reported, so a renamed tip id
# fails loudly instead of silently keeping everything.
#
# Only the owner Free tier is trimmed so far — see the note in the run output.
KEEP_FEATURES = {
    "pricing.tip.free.": {"map", "opdata"},
}

# Ryan, 2026-08-24: "till show only 2" — every plan card lists at most two
# features for now, on both the owner and the professional ladder.
#
# Applied AFTER `KEEP_FEATURES`, so where an explicit pick exists it wins and this
# is a no-op; everywhere else the design's own ordering decides which two survive,
# since the prototype lists each tier's features in priority order. Raise this to
# put the full ladders back — it is the only number to change.
MAX_PLAN_FEATURES = 2

# The same claim, in the other place the page makes it.
#
# Trimming the Free card is not enough on its own: the comparison table below it
# repeats every feature as a row, and its cells carry no tip ids, so the trim
# above cannot reach them. Left alone the page contradicted itself — the Free card
# no longer offered a weekly briefing or a CSV download while the table still
# ticked both for Free. These row labels get the design's own "not included" cell
# in the Free column instead, so both halves of the page say the same thing.
CMP_FREE_UNAVAILABLE = {
    "Weekly owner briefing",
    "Downloads / exports",
}

# Ryan, 2026-08-24: remove the ladder's own title block.
#
# The pricing page stacks two headings within one screen — "Start free. Pay only
# if you want more." and then, a few hundred pixels later, "One ladder for every
# owner — upgrade when it pays for itself." — each with its own green kicker
# repeating "free to start". The second says nothing the first has not.
#
# Matched on the kicker's `.section-label` text, which removes the whole
# `div.mk-kicker` (label AND heading together); dropping only the `h2` would leave
# an orphan green label above the cards.
#
# BOTH LADDERS, not just the owner one that is visible by default. The
# professional ladder has the same construction, and the reason for removing one
# applies to the other — leaving it would mean the title appears and disappears as
# the segment switches. Delete an entry here to put a title back.
DROP_TITLE_BLOCKS = {
    "Owner plans &middot; free to start",
    "Professional plans &middot; operators &amp; advisors &middot; free to start",
}

# Classes that exist only once JavaScript runs, so they never appear in the
# markup we scan — keeping their rules has to be explicit.
#
# `hx7-dot` is the hero rotator's dot. The prototype ships `.hx7-dots` empty and
# builds the dots in script; `rotator.tsx` does the same. Without this the base
# rule is dropped while `.hx7-dot.on` survives (it happens to name `on`, which IS
# a markup class), so every dot but the current one renders at zero size —
# invisible, and easy to mistake for a working rotator.
RUNTIME_CLASSES = {"hx7-dot"}

# prototype route -> our path, where the names differ
ROUTE_ALIAS = {
    "home": "/", "contact": "/contact-us", "privacy": "/privacy-policy",
    "terms": "/terms-condition", "signup": "/register", "blog": "/blogs",
}

_cache = {}


def load(name):
    if name not in _cache:
        _cache[name] = (SRC_DIR / name).read_text(encoding="utf-8", errors="replace")
    return _cache[name]


def img_map(src):
    """Parse `window.MV_IMG = { ... };` into a dict."""
    i = src.index("window.MV_IMG")
    start = src.index("{", i)
    depth, j = 0, start
    while True:
        if src[j] == "{":
            depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0:
                break
        j += 1
    raw = src[start : j + 1]
    # The map is hand-maintained JS, not JSON: it carries /* ... */ notes and
    # trailing commas. `//` is left alone — every value contains `https://`.
    raw = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)
    raw = re.sub(r"^\s*//[^\n]*$", "", raw, flags=re.M)
    raw = re.sub(r",(\s*[}\]])", r"\1", raw)
    return json.loads(raw)


def section(src, route):
    """The `<section data-route="X">...</section>` element, nesting-aware."""
    m = re.search(r'<section\s+data-route="%s"[^>]*>' % re.escape(route), src)
    if not m:
        raise SystemExit(f"no section for route {route!r}")
    depth, pos = 1, m.end()
    tag = re.compile(r"</?section\b", re.I)
    while depth:
        t = tag.search(src, pos)
        if not t:
            raise SystemExit(f"unbalanced <section> for {route!r}")
        depth += -1 if t.group().startswith("</") else 1
        pos = t.end()
    return src[m.start() : src.index(">", pos) + 1]


def element_end(html, start):
    """Index just past the element opening at `start`, counting nested tags."""
    tag = re.match(r"<([a-zA-Z0-9]+)", html[start:]).group(1)
    pattern = re.compile(r"</?%s\b" % re.escape(tag), re.I)
    depth, pos = 1, html.index(">", start) + 1
    while depth:
        m = pattern.search(html, pos)
        if not m:
            raise SystemExit("unbalanced <%s> while trimming a title block" % tag)
        depth += -1 if m.group().startswith("</") else 1
        pos = m.end()
    return html.index(">", pos) + 1


def clean(html, imgs, stats):
    # 1. the injected markup can never run these, so they are dead weight
    html = re.sub(r"<style\b.*?</style>", "", html, flags=re.S | re.I)
    html = re.sub(r"<script\b.*?</script>", "", html, flags=re.S | re.I)

    # 2. data-mv-img token -> real URL (img=src, source=srcset), per the
    #    prototype's own applier
    def swap(m):
        tag, attrs = m.group(1), m.group(2)
        tok = re.search(r'data-mv-img="([^"]+)"', attrs)
        if not tok:
            return m.group(0)
        url = imgs.get(tok.group(1))
        if not url:
            stats["unresolved"].append(tok.group(1))
            return m.group(0)
        target = "srcset" if tag.lower() == "source" else "src"
        stats["images"] += 1
        return "<%s%s%s=\"%s\">" % (
            tag,
            re.sub(r'\s*data-mv-img="[^"]+"', "", attrs),
            " " + target,
            url,
        )

    html = re.sub(r"<(img|source)((?:[^>\"]|\"[^\"]*\")*?)/?>", swap, html, flags=re.I)

    # 3. hash routes -> real paths
    def href(m):
        raw = m.group(1)
        route = raw.split("?")[0].split("/", 1)[-1] if "/" in raw else ""
        if route in ROUTE_ALIAS:
            stats["links"] += 1
            return 'href="%s"' % ROUTE_ALIAS[route]
        if route in APP_ROUTES:
            stats["links"] += 1
            return 'href="/%s"' % route
        stats["offsite"].append(route)
        return 'href="/%s"' % route  # keeps it a path, not a dead fragment

    html = re.sub(r'href="(#/[^"]*)"', href, html)

    # 4. availability trim — content, not form; see KEEP_FEATURES
    for prefix, keep in KEEP_FEATURES.items():
        seen = set()

        def cut(m, prefix=prefix, keep=keep, seen=seen):
            item = m.group(0)
            tip = re.search(
                r'data-tip-id="%s([^"]+)"' % re.escape(prefix), item
            )
            if not tip:
                return item
            seen.add(tip.group(1))
            if tip.group(1) in keep:
                return item
            stats["trimmed"].append(prefix + tip.group(1))
            return ""

        html = re.sub(r"<li\b[^>]*>(?:(?!</li>).)*</li>", cut, html, flags=re.S)
        # `seen` empty just means this page has no features under that prefix —
        # only a page that HAS them can be missing one.
        missing = (keep - seen) if seen else set()
        if missing:
            stats["missing_tips"] += [prefix + s for s in sorted(missing)]

    # Cap every plan's feature list. A plan list is identified by carrying at
    # least one `pricing.tip.*` feature, which is what distinguishes it from the
    # page's other lists (the reassurance bullets, the "vs" columns).
    def cap(m):
        open_tag, inner, close_tag = m.group(1), m.group(2), m.group(3)
        if 'data-tip-id="pricing.tip.' not in inner:
            return m.group(0)
        items = re.findall(r"<li\b[^>]*>(?:(?!</li>).)*</li>", inner, flags=re.S)
        # `li.no` is the design's "not included" line ("No self-checkout"). It is
        # a disclosure, not a claim, so it is never what gets cut — cutting it
        # would work against the point of the trim. Only positive feature lines
        # count towards the cap, and the exclusions ride along after them.
        feats = [i for i in items if 'class="no"' not in i]
        excl = [i for i in items if 'class="no"' in i]
        if len(feats) <= MAX_PLAN_FEATURES:
            return m.group(0)
        stats["capped"] += len(feats) - MAX_PLAN_FEATURES
        return open_tag + "".join(feats[:MAX_PLAN_FEATURES] + excl) + close_tag

    html = re.sub(
        r"(<ul\b[^>]*>)((?:(?!</ul>).)*)(</ul>)", cap, html, flags=re.S
    )

    # Drop the ladder title blocks; see DROP_TITLE_BLOCKS.
    while True:
        for m in re.finditer(r'<div class="mk-kicker"', html):
            end = element_end(html, m.start())
            block = html[m.start():end]
            label = re.search(r'class="section-label">([^<]*)<', block)
            if label and label.group(1).strip() in DROP_TITLE_BLOCKS:
                stats["dropped_titles"].append(label.group(1).strip())
                html = html[:m.start()] + html[end:]
                break
        else:
            break

    # The comparison table's Free column, kept in step with the cards above.
    for label in sorted(CMP_FREE_UNAVAILABLE):
        html, hits = re.subn(
            r"(<tr><th>%s</th>)<td>(?:(?!</td>).)*</td>" % re.escape(label),
            r"\1<td>—</td>",
            html,
            flags=re.S,
        )
        if hits:
            stats["trimmed"].append("cmp:" + label)
    return html


# ---------------------------------------------------------------- markup.ts
pages, all_classes = [], set()
for const, filename, route in PAGES:
    src = load(filename)
    stats = {
        "images": 0, "unresolved": [], "links": 0, "offsite": [],
        "trimmed": [], "missing_tips": [], "capped": 0, "dropped_titles": [],
    }
    html = clean(section(src, route), img_map(src), stats)
    for cl in re.findall(r'class="([^"]*)"', html):
        all_classes |= set(cl.split())
    all_classes |= set(re.findall(r'\bid="([^"]+)"', html))
    pages.append((const, filename, route, html, stats))
    print(
        f"{const:22} {filename:14} {len(html):>7,}B  images={stats['images']:>3}"
        f"  links={stats['links']:>3}  unresolved={len(stats['unresolved'])}"
        f"  offsite={len(set(stats['offsite']))}"
    )
    if stats["unresolved"]:
        print("    UNRESOLVED:", sorted(set(stats["unresolved"])))
    if stats["offsite"]:
        print("    off-site routes:", sorted(set(stats["offsite"])))
    if stats["dropped_titles"]:
        print("    title blocks removed:", stats["dropped_titles"])
    if stats["capped"]:
        print("    feature lines capped past %d:" % MAX_PLAN_FEATURES, stats["capped"])
    if stats["trimmed"]:
        print("    TRIMMED as not-yet-available:", sorted(stats["trimmed"]))
    if stats["missing_tips"]:
        raise SystemExit(
            "  KEEP_FEATURES names tips that are not in the markup: %s\n"
            "  A tip id was renamed upstream. Fix the list rather than letting the"
            " trim silently stop applying." % stats["missing_tips"]
        )

all_classes |= RUNTIME_CLASSES
print(f"\ndistinct class and id names used across pages: {len(all_classes)}")


# ---------------------------------------------------------------- proto.css
def rules_for(filename, classes):
    """Every rule in the file's <style> blocks whose selector touches `classes`."""
    src = load(filename)
    kept, seen_sel = [], set()
    for block in re.findall(r"<style\b[^>]*>(.*?)</style>", src, flags=re.S | re.I):
        # Comments MUST go before parsing. The prototype's stylesheets are heavily
        # annotated, and a comment sitting above a rule otherwise becomes part of
        # that rule's selector — which both leaks the prose into our output and
        # makes the selector invalid, so the browser drops a rule that looked
        # present in the file. That silently lost styling in the first generation.
        block = re.sub(r"/\*.*?\*/", "", block, flags=re.S)
        for rule in split_rules(block):
            sel, body = rule
            if not body.strip() or is_router_chrome(sel):
                continue
            if wanted(sel, classes) and (sel, body) not in seen_sel:
                seen_sel.add((sel, body))
                kept.append((sel, body))
    return kept


_ROUTER_PART = re.compile(r"section\[data-route\](\.active)?$")


def is_router_chrome(sel):
    """Is this a rule from the prototype's hash router rather than its design?

    THIS EXCLUSION IS LOAD-BEARING. The prototype is one HTML file holding every
    page as a `<section data-route="...">`, and its router shows one at a time with

        section[data-route]        { display: none  }
        section[data-route].active { display: block }

    adding `.active` in JS. We render one section per URL and never add that class,
    so importing the first rule hides the entire page — which is exactly what it
    did: all three pages rendered as a header and a footer with nothing between.
    It only appeared once the comment-stripping above started parsing selectors
    correctly, because until then this rule was fused to a preceding comment and
    thrown away as invalid. The section we render IS the active one by
    construction, so the whole switch is shell mechanics and is dropped.
    """
    _, real = prefix_split(sel)
    parts = [p.strip() for p in real.split(",") if p.strip()]
    return bool(parts) and all(_ROUTER_PART.fullmatch(p) for p in parts)


def split_rules(css, prefix=""):
    """Flatten a stylesheet into (selector, body) pairs, keeping @media wrappers."""
    out, i, n = [], 0, len(css)
    while i < n:
        brace = css.find("{", i)
        if brace < 0:
            break
        sel = css[i:brace].strip()
        depth, j = 1, brace + 1
        while j < n and depth:
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
            j += 1
        body = css[brace + 1 : j - 1]
        if sel.startswith("@media") or sel.startswith("@supports"):
            out += split_rules(body, prefix=sel)
        elif sel.startswith("@"):
            pass  # @keyframes/@font-face handled separately
        else:
            out.append((sel if not prefix else prefix + " || " + sel, body))
        i = j
    return out


def wanted(sel, names):
    """Does this selector reach anything in our markup?

    `names` holds both the classes and the ids the sections use. Ids matter as
    much as classes here — the prototype hangs a few rules off `#proExStack` and
    friends, and a class-only test drops them, which is invisible until the
    widget they style turns out to be unstyled.
    """
    if prefix_split(sel)[1].strip() in (":root", "html", "body"):
        return True
    for name in re.findall(r"[.#]([A-Za-z0-9_-]+)", sel):
        if name in names:
            return True
    # bare element selectors (h1, p, a...) inside the prototype's own scope
    bare = prefix_split(sel)[1]
    return (
        bool(re.fullmatch(r"[a-z0-9\s,>+~:()\-\[\]=\"']+", bare))
        and "." not in bare
        and "#" not in bare
    )


def prefix_split(sel):
    return sel.split(" || ") if " || " in sel else ("", sel)


def scope(sel):
    """Prefix every selector in the list with .mv-proto."""
    parts = []
    for one in sel.split(","):
        one = one.strip()
        if not one:
            continue
        if one in (":root", "html", "body"):
            parts.append(".mv-proto")
        else:
            parts.append(".mv-proto " + one)
    return ", ".join(parts)


classes = all_classes
css_out, seen = [], set()
for filename in dict.fromkeys(f for _, f, _ in PAGES):
    for sel, body in rules_for(filename, classes):
        pre, real = prefix_split(sel)
        key = (pre, real, body.strip())
        if key in seen:
            continue
        seen.add(key)
        css_out.append((pre, scope(real), body.strip()))

# keyframes and font-faces referenced by the kept rules
anim = set()
for _, _, body in css_out:
    anim |= set(re.findall(r"animation(?:-name)?\s*:\s*([^;]+)", body))
kf = []
for filename in dict.fromkeys(f for _, f, _ in PAGES):
    for m in re.finditer(
        r"@keyframes\s+([A-Za-z0-9_-]+)\s*\{", load(filename)
    ):
        name = m.group(1)
        if not any(name in a for a in anim):
            continue
        depth, j = 1, m.end()
        src = load(filename)
        while depth:
            if src[j] == "{":
                depth += 1
            elif src[j] == "}":
                depth -= 1
            j += 1
        if (block := src[m.start() : j]) not in kf:
            kf.append(block)

lines = [
    "/* GENERATED — do not hand-edit. See scripts/extract-proto.py.",
    " *",
    " * The prototype's own CSS for the three marketing pages, every selector",
    " * scoped under `.mv-proto`. The scoping is load-bearing: the prototype uses",
    " * names as generic as `.card`, `.btn`, `.grid` and `.wrap`, which would",
    " * otherwise repaint the whole app.",
    " *",
    " * `:root` becomes `.mv-proto` so the palette lands on the wrapper. No colour",
    " * mapping was needed — the prototype's values already ARE our `mv-*` tokens.",
    " */",
    "",
]
cur = None
for pre, sel, body in css_out:
    if pre != cur:
        if cur:
            lines.append("}")
        if pre:
            lines.append(pre + " {")
        cur = pre
    ind = "  " if pre else ""
    lines.append(f"{ind}{sel} {{ {' '.join(body.split())} }}")
if cur:
    lines.append("}")
lines += ["", *kf, ""]
(OUT / "proto.css").write_text("\n".join(lines), encoding="utf-8")
print(f"proto.css: {len(css_out)} rules, {len(kf)} keyframes, "
      f"{(OUT / 'proto.css').stat().st_size:,}B")

# markup.ts
head = '''/* GENERATED — do not hand-edit. See scripts/extract-proto.py.
 *
 * The prototype's three marketing pages, held as build-time constants. Rendered
 * by `proto-page.tsx`; read the comment there for why injecting them is safe and
 * what it costs.
 *
 * WHICH REVISION EACH PAGE COMES FROM, because they differ:
%s *
 * ONLY THREE MECHANICAL REWRITES are applied, so a diff against the prototype
 * stays readable:
 *   1. `<style>` and `<script>` are dropped — injected HTML runs neither, so the
 *      CSS is extracted to `proto.css` and the hero rotator reimplemented in
 *      `rotator.tsx`.
 *   2. `data-mv-img="token"` becomes a real `src` (`srcset` on `<source>`),
 *      resolved through the prototype's own `window.MV_IMG` map exactly as its
 *      applier does.
 *   3. `href="#/route"` becomes a real path, since we route by URL and not by
 *      hash fragment.
 * Nothing else is touched.
 */

'''
manifest = "".join(
    f" *   {c.replace('_MARKUP','').lower():15} {f} (data-route=\"{r}\")\n"
    for c, f, r, _, _ in pages
)
body = head % manifest
for const, filename, route, html, _ in pages:
    body += f"export const {const} = {json.dumps(html)};\n\n"
(OUT / "markup.ts").write_text(body, encoding="utf-8")
print(f"markup.ts: {(OUT / 'markup.ts').stat().st_size:,}B")
