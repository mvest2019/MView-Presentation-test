# The portal's Tailwind primitives

Everything in this folder is a **portal-wide** building block: a surface, a
control or a piece of table furniture that more than one module needs. Modules
own their own components; this folder owns the vocabulary they are built from.

## Why these exist at all

`portal.css` already carries the portal's design system as a scoped stylesheet
(`.mv-portal .card`, `.mv-portal .chip`, `.mv-portal table`). The Dashboard is
built from those classes. The My Leases module is built from the components in
this folder instead — Tailwind utilities against the `mv-*` tokens in
`app/globals.css` — because that is the direction asked for, and because the
marketing half of this app has been Tailwind-first since it was written.

**The two produce identical pixels.** Every colour in `portal.css`'s `:root` has
the same hex as its `mv-*` counterpart (`--green` and `--color-mv-green` are both
`#54bf96`); the portal-only surfaces were added to `@theme` under the
`mv-portal-` prefix. So a Tailwind card and a `.card` card sit side by side
without a seam, and the geometry in each component below is the measured value
from the stylesheet rather than a nearby Tailwind default.

## What is deliberately NOT converted

Four class families stay as `portal.css` class names, on purpose. They are not
styling — they are the portal's **state machine**, and the CSS is the mechanism:

| Class | Owned by | What it does |
| --- | --- | --- |
| `tier-s` `tier-d` `tier-p` `tier-u` `hide-s` `hide-u` | `portal.css` §11 | Density. Which of the four reading tiers an element belongs to. |
| `nc-only` `nc-swap` `nc-hide` | `portal.css` §9 | The unclaimed swap. |
| `cl-lock` | `portal.css` §9 | Blurs a money figure for a claimed-but-unpaid account. |
| `mv-dash-routes` | `portal.css` §9/§11 | The page root the two rules above select children of. |

One class on a wrapper switches the whole page between four densities with no
re-render and no JavaScript. Reimplementing that in React state would ship the
mechanism to the browser, flash the wrong tier on first paint, and require every
one of these components to know about the funnel. They are applied via the
`portalGate` helpers in `portal-gating.ts` so the strings are named once.

## shadcn conventions followed here

Added **by hand, not by `shadcn init`** — the same call `app/_components/ui/tooltip.tsx`
documents. The CLI rewrites `globals.css` with its own `--background` /
`--foreground` system plus a global border reset, which would restyle the entire
site to install a table.

So: shadcn's component shapes and composition (`Table` + `TableRow` + `TableCell`,
`Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`), its tokens swapped for
`mv-*`, and its `cn()` helper dropped — `clsx` and `tailwind-merge` are not
dependencies of this project and none of these files need class-merge semantics
for the concatenation they do. Radix is the real dependency and is installed
normally: `@radix-ui/react-tabs` for `tabs.tsx`.

Two shadcn primitives were considered and turned down:

- **Select** — a native `<select>` is used instead. The repo already standardises
  filter controls on one (`app/_components/control-styles.ts`), Radix Select is
  ~30KB to reimplement a control every platform already ships with correct
  keyboard and screen-reader behaviour, and this one holds five options.
- **Collapsible** — a native `<details>` is used instead. The explainers work
  with JavaScript disabled, need no state, and `<details>` is what the design
  itself used.
