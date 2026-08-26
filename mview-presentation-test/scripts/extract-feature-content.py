"""Regenerate app/feature/<slug>/content.ts from the prototype HTML file.

    python scripts/extract-feature-content.py [directory holding the prototype .html files]

The feature landing pages the cards on /, /owners and /professionals open are
`<section data-route="feature-<slug>">` blocks in the canonical prototype
revision. Unlike the marketing pages (see extract-proto.py), these are NOT
served as injected prototype markup: each is a real route under app/feature/,
composed from Tailwind utilities and the shared `FeatureLanding` component,
in the site's own Lexend Deca type. What this script extracts is therefore
CONTENT, not markup — headings, copy, list items, image URLs and CTA targets —
emitted as one generated `content.ts` per route that the hand-written
`page.tsx` beside it renders.

Every feature section in the v74 prototype follows one of two templates:

  fjp-  owner pages    hero → 4 numbered steps (lede/benefits/how-it-works/why)
                       → "How to access" card → CTA band
  fjq-  pro pages      hero → 5 numbered bands (saves/what/get/how/why)
                       → owner-trust guardrail card → CTA band

The parser walks those structures by class name. It is deliberately strict
about the pieces it knows and loud about the ones it does not: text that ends
up in no field is reported as uncaptured, so a template change upstream fails
visibly instead of silently dropping copy.

`map` is deliberately absent, as in extract-proto.py: the map's landing page is
the already-built /map-explorer.
"""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SRC_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"C:\Users\Pravin\AppData\Local\Temp"
)
OUT = Path(__file__).resolve().parent.parent / "app" / "feature"

SRC_FILE = "v44 (1).html"  # the canonical marketing/v44.html — see extract-proto.py

# Must stay in step with FEATURE_SLUGS in extract-proto.py, which is what routes
# the marketing pages' card links here.
FEATURE_SLUGS = [
    "valuation", "lease-audit", "alerts", "weekly-report", "production",
    "operators", "dossier", "community", "dashboard", "my-leases",
    "pro-map", "pro-intel", "pro-alerts", "pro-team", "pro-hub",
    "pro-portfolio", "pro-valuation", "pro-adv-alerts", "pro-reports",
]

# Metadata for each page — distilled from the section's own hero copy, which
# carries no <h1> and no metadata of its own. Kept here so the generated
# content.ts is the single import a page needs.
META = {
    "valuation": ("Valuation",
        "A straight answer to “what are my mineral rights worth?” — an estimate, not an appraisal, built from Railroad Commission production records with the math shown."),
    "lease-audit": ("Lease Audit",
        "Does your royalty check match what the well actually produced? The public production record lined up against what you were paid, month by month."),
    "alerts": ("Alerts & Activity",
        "New permits, completions, and status changes — the day they post, on your lease, your county, or an operator you follow."),
    "weekly-report": ("The Weekly Report",
        "What changed on your Texas minerals this week, in plain English — a five-minute read, written for owners."),
    "production": ("Production & Forecast",
        "What your wells made, and what's likely left — production charted per lease, with a decline-curve read on what's still in the ground."),
    "operators": ("Know Your Operators",
        "The Texas oil and gas companies behind your wells, in plain sight — the whole field of operators, ranked by reported production."),
    "dossier": ("AI Dossier",
        "Ask about your minerals in plain English — an assistant that has already read your leases, your production, and the activity around you."),
    "community": ("Owner Community",
        "The owners around you, in one place — co-owners and neighbors on your own lease, in a private group."),
    "dashboard": ("Dashboard",
        "Your whole position on one screen — every lease, every alert, and everything that changed, built around your own owner record."),
    "my-leases": ("My Leases",
        "Every lease you own, finally in one place — status, wells, production, and a value estimate for each lease tied to your owner record."),
    "pro-map": ("Operated-Acreage Map",
        "Your operated acreage, with every offset well on the map — permits, spuds, completions, and well paths from Railroad Commission filings."),
    "pro-intel": ("Offset & Competitor Intel",
        "Know every operator drilling around you — competitor activity around your leases, ranked from Railroad Commission filings."),
    "pro-alerts": ("RRC Filing Alerts",
        "Every public filing on your acreage, flagged the day it posts — permits, completions, production reports, and well status changes."),
    "pro-team": ("Team Filing Workspace",
        "A channel for every lease, with the data in the room — Field, Land, Regulatory, and Engineering in one workspace."),
    "pro-hub": ("Advisor Hub",
        "Your whole client book on one mineral-management dashboard — every client's leases, production, and expected-versus-paid audits in one delegated, revocable view."),
    "pro-portfolio": ("Client Portfolio",
        "Every mineral-owner client you manage in one sortable table — their leases, their county footprint, their estimated value, and what moved."),
    "pro-valuation": ("Mineral Valuation",
        "A production-based valuation for any client, on demand — trailing royalty cash flow times a market multiple, with every input on the screen."),
    "pro-adv-alerts": ("Client Alerts & Monitoring",
        "Every client's acreage watched, in one feed — new permits, completions, and status changes tagged to the client they touch."),
    "pro-reports": ("Client-Ready Reports",
        "The page you hand a client — a one-page mineral summary per client, and the royalty audit behind it."),
}

# Same link policy as extract-proto.py: prototype hash routes become real paths.
APP_ROUTES = {
    "", "home", "owners", "professionals", "pricing", "operators", "faq",
    "glossary", "blogs", "contact", "contact-us", "login", "signup", "register",
    "privacy", "privacy-policy", "terms", "terms-condition", "map-explorer",
    "oil-and-gas-news", "reset-password",
} | {"feature/" + s for s in FEATURE_SLUGS}
ROUTE_ALIAS = {
    "home": "/", "contact": "/contact-us", "privacy": "/privacy-policy",
    "terms": "/terms-condition", "signup": "/register", "blog": "/blogs",
    "feature/map": "/map-explorer",
}


def rewrite_href(raw):
    if not raw.startswith("#/"):
        return raw
    route = raw.split("?")[0].split("/", 1)[-1] if "/" in raw else ""
    if route in ROUTE_ALIAS:
        return ROUTE_ALIAS[route]
    return "/" + route  # off-site routes keep a path, as extract-proto.py does


# ---------------------------------------------------------------- mini DOM
VOID = {"img", "br", "hr", "source", "input", "meta", "link"}


class Node:
    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.parent = parent
        self.children = []  # Node or str

    def classes(self):
        return set(self.attrs.get("class", "").split())

    def walk(self):
        for child in self.children:
            if isinstance(child, Node):
                yield child
                yield from child.walk()

    def find(self, cls=None, tag=None):
        for node in self.walk():
            if cls and cls not in node.classes():
                continue
            if tag and node.tag != tag:
                continue
            return node
        return None

    def find_all(self, cls=None, tag=None):
        return [
            node for node in self.walk()
            if (not cls or cls in node.classes()) and (not tag or node.tag == tag)
        ]

    def text(self):
        parts = []
        for child in self.children:
            parts.append(child.text() if isinstance(child, Node) else child)
        return re.sub(r"\s+", " ", "".join(parts)).strip()

    def rich(self):
        """Text with <strong>/<b> runs kept as **markers** for the renderer."""
        parts = []
        for child in self.children:
            if isinstance(child, Node):
                if child.tag in ("strong", "b"):
                    inner = child.rich()
                    if inner:
                        parts.append(f"**{inner}**")
                else:
                    parts.append(child.rich())
            else:
                parts.append(child)
        return re.sub(r"\s+", " ", "".join(parts)).strip()


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = Node("#root")
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        self.cur.children.append(Node(tag, attrs, self.cur))

    def handle_endtag(self, tag):
        # Walk up to the matching open tag; tolerate stray closers.
        node = self.cur
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.cur = node.parent

    def handle_data(self, data):
        if data.strip():
            self.cur.children.append(data)


def parse_html(html):
    builder = TreeBuilder()
    builder.feed(html)
    return builder.root


# ------------------------------------------------------------ prototype IO
def load(name):
    return (SRC_DIR / name).read_text(encoding="utf-8", errors="replace")


def img_map(src):
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
    raw = re.sub(r"/\*.*?\*/", "", raw, flags=re.S)
    raw = re.sub(r"^\s*//[^\n]*$", "", raw, flags=re.M)
    raw = re.sub(r",(\s*[}\]])", r"\1", raw)
    return json.loads(raw)


def section(src, route):
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


def image_of(node, imgs):
    img = node.find(tag="img")
    if not img:
        return None
    token = img.attrs.get("data-mv-img")
    src = imgs.get(token) if token else img.attrs.get("src")
    if not src:
        return None
    return {"src": src, "alt": img.attrs.get("alt", "")}


# ---------------------------------------------------------------- walkers
def parse_hero(root, prefix, imgs):
    hero = root.find(f"{prefix}-hero")
    wrap = hero.find("wrap")
    back = wrap.find("small", tag="a")
    label = wrap.find("section-label")
    h2 = wrap.find(tag="h2")
    # the hero sub is the first paragraph after the heading
    sub = next(
        (n for n in wrap.walk() if n.tag == "p" and f"{prefix}-hint" not in n.classes()),
        None,
    )
    hint = wrap.find(f"{prefix}-hint")
    steps = []
    count = ""
    if hint:
        if prefix == "fjp":
            spans = [n for n in hint.children if isinstance(n, Node) and n.tag == "span"]
            count = spans[0].text() if spans else ""
            if len(spans) > 1:
                steps = [s.strip() for s in spans[-1].text().split("·")]
        else:
            count_node = hint.find("fjq-count")
            count = count_node.text() if count_node else ""
            steps = [
                re.sub(r"^\d+\s*", "", n.text()) for n in hint.find_all("fjq-railstep")
            ]
    hero = {
        "back": {"href": rewrite_href(back.attrs.get("href", "/")), "label": back.text()},
        "label": label.text(),
        "heading": h2.rich(),
        "sub": sub.rich() if sub else "",
        "image": image_of(wrap.find("mv-featban") or wrap, imgs),
        "stepsHint": {"count": count, "titles": steps},
    }
    # my-leases carries a signup CTA right in the hero, with a reassurance note
    cta = next(
        (a for a in wrap.find_all(tag="a")
         if "btn-primary" in a.classes() and a.attrs.get("data-auth") != "in"),
        None,
    )
    if cta:
        note = cta.parent.find("tiny")
        hero["cta"] = {
            "label": cta.text(),
            "href": rewrite_href(cta.attrs.get("href", "#")),
            "note": note.text() if note else "",
        }
    # pro-valuation carries the "estimate, not an appraisal" disclaimer as an
    # amber notice card in the hero — compliance copy, so it must survive
    notice = wrap.find("card")
    if notice and notice.find(tag="p"):
        hero["notice"] = re.sub(r"^[\s⚠]+", "", notice.find(tag="p").rich())
    # The advisor heroes also carry a "See it live →" link into the pro demo
    # portal (#/pro-app-adv-*). Those demo routes are not served by this app,
    # so the link is deliberately NOT extracted — same policy as the signed-in
    # portal buttons in parse_cta.
    return hero


def parse_cta(band):
    strong = band.find(tag="strong")
    sub = band.find(tag="p")
    primary, links = None, []
    for a in band.find_all(tag="a"):
        # the signed-in variant points at portal routes this app does not serve
        if a.attrs.get("data-auth") == "in":
            continue
        entry = {"label": a.text(), "href": rewrite_href(a.attrs.get("href", "#"))}
        if "btn-primary" in a.classes() and primary is None:
            primary = entry
        else:
            links.append(entry)
    return {
        "heading": strong.rich() if strong else "",
        "sub": sub.rich() if sub else "",
        "primary": primary,
        "links": links,
    }


def fold_paragraphs(nodes):
    return [p.rich() for p in nodes if p.rich()]


def parse_owner(root, imgs):
    """The fjp- template: hero, four .fjp-step blocks, access card, CTA."""
    data = {"hero": parse_hero(root, "fjp", imgs), "steps": []}
    for step_node in root.find_all("fjp-step"):
        head = step_node.find("fjp-stephead")
        step = {
            "num": head.find("fjp-chip").text(),
            "kicker": (head.find("fjp-kicker") or Node("x")).text() or None,
            "title": head.find(tag="h3").rich(),
        }
        visual = step_node.find("fjp-visual")
        if visual:
            step["image"] = image_of(visual, imgs)
            split = step_node.find("fjp-split")
            first = next(
                (c for c in split.children if isinstance(c, Node)), None
            )
            step["imageFirst"] = first is visual
        ledes = fold_paragraphs(step_node.find_all("fjp-lede"))
        if ledes:
            step["lede"] = ledes
        benefits = step_node.find("fjp-benefits")
        if benefits:
            step["bullets"] = [li.rich() for li in benefits.find_all(tag="li")]
        hiw = step_node.find("fjp-hiw")
        if hiw:
            step["ordered"] = [li.rich() for li in hiw.find_all(tag="li")]
        more = step_node.find("fjp-morebody")
        if more:
            step["more"] = fold_paragraphs(more.find_all(tag="p"))
        data["steps"].append(step)

    access = root.find("fjp-access")
    if access:
        cols = []
        for col in access.find_all("grid")[0].children:
            if not isinstance(col, Node):
                continue
            label = col.find("tiny")
            body = col.find(tag="p")
            if label and body:
                cols.append({"label": label.text(), "body": body.rich()})
        data["access"] = cols

    band = root.find("gd-band")
    if band:
        data["cta"] = parse_cta(band)
    return data


def parse_pro(root, imgs):
    """The fjq- template: hero, five .fjq-band blocks, guardrail card, CTA."""
    data = {"hero": parse_hero(root, "fjq", imgs), "steps": []}
    for band in root.find_all("fjq-band"):
        head = band.find("fjq-head")
        step = {
            "num": head.find("fjq-chip").text(),
            "title": head.find(tag="h3").rich(),
        }
        saves = band.find("fjq-saves-list")
        if saves:
            step["saves"] = []
            for li in saves.find_all(tag="li"):
                lead = li.find(tag="b")
                detail = re.sub(r"^[\s—–-]+", "", li.text()[len(lead.text()):].strip())
                step["saves"].append({"lead": lead.text(), "detail": detail})
        why = band.find("fjq-why")
        if why:
            step["lede"] = [why.rich()]
        paragraphs = []
        for copy in band.find_all("fjq-copy"):
            paragraphs += fold_paragraphs(copy.find_all(tag="p"))
        if paragraphs:
            step["paragraphs"] = paragraphs
        hownums = band.find("fjq-hownums")
        if hownums:
            step["ordered"] = [
                li.find(tag="p").rich() for li in hownums.find_all(tag="li")
            ]
        split = band.find("fjq-split")
        if split:
            figure = split.find(tag="figure")
            if figure:
                step["image"] = image_of(figure, imgs)
                first = next((c for c in split.children if isinstance(c, Node)), None)
                step["imageFirst"] = first is figure
        card = band.find("card")
        if card and card.find(tag="h4"):
            data["guardrail"] = {
                "title": card.find(tag="h4").rich(),
                "body": card.find(tag="p").rich(),
            }
        gd = band.find("gd-band")
        if gd:
            data["cta"] = parse_cta(gd)
        data["steps"].append(step)
    return data


# ---------------------------------------------------------------- coverage
def coverage_report(slug, root, data):
    """Copy in the section that reached no field — loud, and fatal at the end.

    Compared with `**` emphasis markers stripped from both sides, since the
    extracted rich text carries them and the DOM text does not. List items that
    the schema splits into parts (the saves lead/detail pairs, the numbered
    how-it-works rows) are checked part by part. The advisor heroes' "See it
    live →" demo links are the one knowingly dropped piece — see parse_hero.
    """
    # `\"` unescaped, or any copy containing a quote never matches its field
    captured = (
        json.dumps(data, ensure_ascii=False)
        .replace("**", "")
        .replace('\\"', '"')
        .lower()
    )

    def miss(text):
        t = re.sub(r"\s+", " ", text.replace("**", "")).strip()
        t = re.sub(r"^[\s\d⚠✓·—–-]+", "", t)
        return len(t) > 30 and t.lower()[:60] not in captured

    candidates = []
    for node in root.find_all(tag="p") + root.find_all(tag="h3"):
        if node.find(tag="a"):  # a CTA row — button label and note are separate fields
            candidates += [c.text() for c in node.children if isinstance(c, Node)]
        else:
            candidates.append(node.text())
    for li in root.find_all(tag="li"):
        if li.find(tag="p"):
            continue  # its paragraphs are already candidates
        lead = li.find(tag="b")
        if lead:  # a saves row — lead and detail live in separate fields
            candidates.append(lead.text())
            candidates.append(li.text()[len(lead.text()):])
        else:
            candidates.append(li.text())

    missing = [t[:80] for t in candidates if miss(t)]
    if missing:
        print(f"  {slug}: UNCAPTURED {len(missing)} block(s):")
        for m in missing:
            print(f"    · {m}")
    return not missing


# ---------------------------------------------------------------- emit
HEADER = """// GENERATED — do not hand-edit. See scripts/extract-feature-content.py.
//
// Content of the prototype's `feature-%s` section (%s), parsed to
// structured data. The page beside this file renders it through the shared
// `FeatureLanding` component; `**bold**` runs are the prototype's own
// <strong> emphasis, rendered by `RichText`.

import type { FeatureContent } from "../_components/feature-content";

export const content: FeatureContent = """


src = load(SRC_FILE)
imgs = img_map(src)
ok = True
for slug in FEATURE_SLUGS:
    root = parse_html(section(src, "feature-" + slug))
    data = parse_pro(root, imgs) if slug.startswith("pro-") else parse_owner(root, imgs)
    title, description = META[slug]
    data = {"slug": slug, "title": title, "description": description, **data}
    ok &= coverage_report(slug, root, data)
    out_dir = OUT / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    body = HEADER % (slug, SRC_FILE) + json.dumps(
        data, ensure_ascii=False, indent=2
    ) + ";\n"
    (out_dir / "content.ts").write_text(body, encoding="utf-8")
    print(
        f"feature/{slug:16} steps={len(data['steps'])}"
        f"  access={'access' in data}  guardrail={'guardrail' in data}"
        f"  cta={'cta' in data and bool(data['cta'].get('primary'))}"
    )
if not ok:
    print("\nUNCAPTURED BLOCKS ABOVE — the template changed; extend the parser.")
    sys.exit(1)
