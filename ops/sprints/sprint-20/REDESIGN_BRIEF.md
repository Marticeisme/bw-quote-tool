# dashboard.html — redesign brief

**Target:** `dashboard.html` in `Marticeisme/bw-quote-tool` (~2,570 lines, standalone, no build step, GitHub Pages).
**Approved direction:** light-first, sidebar-led, one indigo accent, Plus Jakarta Sans. Two distinct per-user views.
**Reference mockups:** `mockups/2 - Chloe view (light).png`, `mockups/1 - Martice view (light).png`, `mockups/3 - Chloe view (dark mode).png`, plus the case detail (2c) in `Dashboard - Directions.dc.html`.

Read `DESIGN_REFRESH.md` alongside this. That document is the audit of what's wrong with the current file and still holds — the token system, the inline-styles-in-JS problem, icons, accessibility. **This** document is what to build instead. Where they disagree, this one wins.

The app is a personal tool for two people. It does not carry Bonney Watson branding and is not constrained by a brand guide.

---

## 1. The one structural idea

Martice and Chloe are not doing the same job, and the current dashboard pretends they are — same card, same fields, same columns, with a user switcher that only filters rows.

- **Martice** runs cemetery and pre-need **sales**. He needs to know who is waiting on him, which quotes are out, and which commission packets are ready to submit. His work is a pipeline.
- **Chloe** runs **funeral direction**. She is not selling. She needs to know what is on the calendar, what is blocking each case from moving, and what has to be done before the service. Her work is case management against a deadline.

So the user switcher changes **which columns exist**, not just which rows show. Same shell, same components, same styling — different table and different summary stats.

There is no "value", "amount", "deal" or "pipeline" column anywhere in the UI. Money appears only inside a case's payment fields, where it already lives.

---

## 2. Foundations

### Typeface

Plus Jakarta Sans, weights 400 / 500 / 600 / 700 / 800.

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Playfair Display, DM Sans and JetBrains Mono all come out. No monospace anywhere — Plus Jakarta Sans has tabular figures; use `font-variant-numeric: tabular-nums` on counts, percentages and dates.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Page title | 26px | 800 | `letter-spacing:-.7px` |
| Case name (detail) | 28px | 800 | `letter-spacing:-.8px` |
| Stat value | 28px | 800 | `letter-spacing:-.9px`, `line-height:1` |
| Stat value (detail, 4-up) | 19px | 800 | `letter-spacing:-.5px` |
| Percentage in a row | 17px | 800 | `letter-spacing:-.5px` |
| Card heading | 14px | 800 | `letter-spacing:-.2px` |
| Row name | 14px | 700 | `letter-spacing:-.2px` |
| Body / inputs / buttons | 13.5px | 500–700 | |
| Table cell | 13.5px | 500 | |
| Row subtitle, meta | 12.5px | 500 | |
| Eyebrow / column header | 11px | 700 | `letter-spacing:.07em`, uppercase |

Nothing below 11px. `line-height:1.5` on body; `text-wrap:pretty` on note and remark blocks.

### Color

Two token layers. Components reference the semantic names only; the theme swaps the whole set on `<html data-theme>`.

```css
:root{
  --bg:#F6F6FA;            --surface:#FFFFFF;       --surface-sunk:#F5F7FB;
  --table-head:#FBFBFD;    --border:#ECECF3;        --border-strong:#E2E2EC;
  --divider:#F1F1F6;       --row-divider:#F4F4F8;   --track:#F0F0F5;
  --text:#16162A;          --text-2:#6E6E85;        --text-3:#8E8EA6;
  --accent:#5551E8;        --accent-hover:#4B47D6;  --accent-soft:#EEEDFC;
  --on-accent:#FFFFFF;
  --urgent:#C7304B;        --warn:#B26B00;          --ok:#12A150;
  --shadow-1:0 1px 2px rgba(20,20,43,.07);
  --shadow-2:0 1px 3px rgba(20,20,43,.08);
}

html[data-theme="dark"]{
  --bg:#131320;            --surface:#1B1B2B;       --surface-sunk:#232334;
  --table-head:#1F1F30;    --border:#272739;        --border-strong:#33334A;
  --divider:#232334;       --row-divider:#232334;   --track:#2C2C40;
  --text:#ECECF5;          --text-2:#9494AC;        --text-3:#8686A0;
  --accent:#7C79F0;        --accent-hover:#918EF5;  --accent-soft:#2B2955;
  --on-accent:#131320;
  --urgent:#F58A9C;        --warn:#E9AE5E;          --ok:#5FC98C;
  --shadow-1:none;         --shadow-2:none;
}
```

In dark mode cards get `border:1px solid var(--border)` instead of a shadow.

**Status pills.** Each pill is a soft background with a matching foreground and a 6px dot of `currentColor`. Map the existing `CASE_STATUSES` to these:

| Status | Light bg / fg | Dark bg / fg |
|---|---|---|
| New | `#F1F1F6` / `#6E6E85` | `#26263A` / `#9494AC` |
| In Progress | `#EEEDFC` / `#4B47D6` | `#2B2955` / `#A9A6FF` |
| Pending Family | `#FDF1E0` / `#9A5B00` | `#382C1A` / `#E9AE5E` |
| Pending Docs | `#EEF1F6` / `#4E6076` | `#242C36` / `#93A9C0` |
| Pending Payment | `#E9F5EE` / `#0F7A45` | `#17301F` / `#5FC98C` |
| Pending Marker Order | `#E6F1F7` / `#1B6A8C` | `#152C38` / `#68B4D6` |
| Complete | `#F1F1F6` / `#6E6E85` | `#26263A` / `#9494AC` |

Replace `SC` and `TYPE_COLORS` in the JS with a single map to these token pairs. `TYPE_COLORS` goes away entirely — case type is plain text in its own column now, not a colored border.

**Owner.** Avatar tile only. Martice `#EEEDFC`/`#4B47D6` light, `#2B2955`/`#A9A6FF` dark. Chloe `#E4F2F3`/`#0B7580` light, `#123137`/`#5FC4CE` dark. Two-letter initials from the case name, 34×34, `border-radius:11px`, 13px/700.

**Urgency.** `--urgent` / `--warn` / `--ok` are the only colors allowed to appear as bare text. They mean overdue, due soon, and done. Nothing decorative uses them.

### Shape and space

Radii: `6px` small controls, `8px` pills, `9px` icon tiles, `10px` nav items, `11px` buttons/inputs/group rows, `14px` cards, `15px` large avatar, `99px` full.

Spacing snaps to 4px. Sidebar 240px wide, `padding:22px 16px`. Content `padding:26px 30px 32px`. Cards `padding:18px 20px`. Table rows `padding:14px 20px`. 14px between cards in a row, 18–22px between blocks.

### Icons

One inline `<svg><symbol>` sprite at the top of `<body>`, Lucide geometry (MIT), 16–18px, `stroke:currentColor; stroke-width:1.7–1.9; fill:none`. Needed: `folder`, `check-square`, `utensils`, `calendar`, `graduation-cap`, `search`, `plus`, `phone`, `file-text`, `send`, `inbox`, `clock`, `alert-triangle`, `chevron-down`, `x`, `printer`, `more-horizontal`, `moon`, `sun`.

Every emoji comes out — nav, search, cards, buttons, the wizard's disposition buttons, the meal grid, the due banner. None of them are load-bearing.

---

## 3. Shell

```
┌──────────┬──────────────────────────────────────────┐
│ sidebar  │  page header (title + subtitle · search · New case)
│  240px   │  stat row  (3 cards)
│          │  table card (filter tabs · column headers · rows)
└──────────┴──────────────────────────────────────────┘
```

The `<header>` element and its tab strip are deleted. Navigation moves into the sidebar.

### Sidebar

Fixed 240px, `background:var(--surface)`, `border-right:1px solid var(--border)`, full height, `display:flex; flex-direction:column`.

- **Brand block** — 30×30 `border-radius:9px` accent tile with `MF` in 14px/800, then "Morrison Frink" at 15px/700. 26px bottom margin.
- **Nav items** — icon + label + count, `padding:9px 11px`, `border-radius:10px`, 3px apart. Active: `background:var(--accent-soft)`, `color:var(--accent)`, weight 700. Inactive: `color:var(--text-2)`, weight 500. Count on the right, 12px/600, accent when active and `--text-3` otherwise. Order: Cases, Tasks, Meals, Calendar, School. **Keep all five and their names.**
- **Bottom block** — pushed down with `flex:1`, separated by `border-top:1px solid var(--border)`, `padding-top:14px`. An eyebrow "Viewing", then the three-way user switcher as a segmented control (`background:var(--surface-sunk)`, `border-radius:10px`, `padding:3px`; selected segment `background:var(--surface)` + `--shadow-1`). Below it a row with a moon/sun icon, the label "Dark mode", and a toggle.

Under 1100px the sidebar collapses to a 64px icon rail (labels and counts hidden, tooltips on hover). Desktop is the only target — do not build a mobile layout.

### Page header

Title 26px/800 on the left with a one-line subtitle in `--text-2` underneath, stating what the list is sorted by and what needs attention. Then a 200px search input and the primary `New case` button. Button: `background:var(--accent)`, `color:var(--on-accent)`, `border-radius:11px`, `padding:11px 17px`, 14px/700, plus icon.

### Stat row

Three equal cards, 14px gap. Each: a 30×30 `border-radius:9px` tinted icon tile, the label in 13px/600 `--text-2`, then the value at 28px/800, then a note line at 13px.

**Every stat carries context in its note.** A bare number is not allowed. "2" is meaningless; "2 · longest overdue 6 days" is the whole point. The note takes `--urgent` or `--warn` at 600 weight when it is bad news, and `--text-2` at 500 when it is not.

### Table card

One `--surface` card, `border-radius:14px`, `--shadow-1`, `overflow:hidden`.

1. **Filter row** — `padding:14px 20px`, `border-bottom:1px solid var(--divider)`. Pill tabs at 13px/600, `border-radius:9px`, `padding:7px 13px`; active gets `--accent-soft`/`--accent`. Right-aligned: the current sort, 13px/600 `--text-2`.
2. **Column header row** — `padding:11px 20px`, `background:var(--table-head)`, `border-bottom:1px solid var(--divider)`, eyebrow type. Last column right-aligned.
3. **Rows** — `padding:14px 20px`, `border-bottom:1px solid var(--row-divider)`, hover `background:var(--surface-sunk)`, whole row clickable to open the case.

Grid, identical for both users:

```css
grid-template-columns: 2.25fr 1.45fr 1.75fr 1.3fr 1.3fr 158px;
```

The 1.75fr status track is sized for `Pending Marker Order`, the longest real status. Do not narrow it.

**Case cell** — avatar tile, then name at 14px/700 with a 12.5px `--text-3` subtitle beneath (property location, service description, contract note).

**Checklist cell** (last, right-aligned) — this is the element carried over from the current design and it stays prominent:

```
        62%  13 / 21
   ▓▓▓▓▓▓▓▓▓░░░░░░░
```

Percentage 17px/800 in `--text` (`--ok` at 100%), count 12px/600 `--text-2` beside it, then a 7px `border-radius:99px` bar on `--track` filled with `--accent` (`--ok` at 100%). N/A items are excluded from the denominator, as they are today.

---

## 4. The two views

Everything above is shared. These are the differences.

### Martice — cemetery & pre-need

Subtitle: *"Cemetery and pre-need. Sorted by who is waiting on you."* Sort: by follow-up urgency (the existing `urgencyScore()` already does this).

| Column | Content |
|---|---|
| Case | Name + property/contract note |
| Type | `RIC · Quote`, `CIRGAS · Confirmed`, `GA Policy · Confirmed`, `Clearpoint · Quote`, `Work Order` |
| Status | Status pill |
| Interment | Interment date, or "Not set" / "Not applicable". `--warn` 700 when today or tomorrow |
| Follow-up | "Overdue 6 days" `--urgent` 700 · "Not contacted yet" `--warn` 700 · "Called 1 day ago" `--text-2` 500 |
| Packet complete | Percentage + bar |

Stats: **Waiting on a call** (note: longest overdue) · **Quotes out** (note: oldest with no reply) · **Packets to submit** (note: which one and when it's due).

Filter tabs: All · Needs a call · Quotes out · Confirmed sales · Work orders.

### Chloe — funeral direction

Subtitle: *"Funeral direction. Sorted by next service."* Sort: by service date ascending, undated last.

| Column | Content |
|---|---|
| Case | Name + service description |
| Disposition | `Cremation · Witness`, `Burial · Graveside`, `Cremation · AOC`, `Burial · Traditional`, `Cremation · Memorial` |
| Status | Status pill |
| Service | Full date + time, or "Not scheduled". `--warn` 700 when within 48 hours |
| Certificates & permits | The current stage in plain words — "Awaiting KCME release" `--urgent`, "Permit pending" `--warn`, "DC worksheet signed" / "DCs released to family" `--text-2` |
| Checklist complete | Percentage + bar |

Stats: **Services this week** (note: when the next one is) · **Certificates pending** (note: which case and what it's waiting on) · **Items due today** (note: how many cases).

Filter tabs: All · This week · Awaiting permits · Cremation · Burial.

The certificates column derives from the `Death Certificates & Permits` checklist group — the last completed item, or the first incomplete one, whichever reads more usefully. That group is already in `CHLOE_CHECKLISTS` for both Cremation and Burial.

### "All"

Shows both users' cases with an extra Owner column, using the intersection of the two column sets: Case · Owner · Type/Disposition · Status · Date · Checklist.

---

## 5. Case detail

Replaces the expanding accordion. Opens as its own screen with the sidebar still in place — no modal, no in-place expansion.

1. **Breadcrumb** — `Cases / Hollis, Marie`, 13px/600.
2. **Identity row** — 52×52 `border-radius:15px` avatar, name at 28px/800, then type/disposition and the status pill on one line. Right side: `Print`, `Edit` (both `--surface` with `--border-strong`), and the primary action — `Log a touchpoint`.
3. **Alert band** — only when something is genuinely blocking or imminent. `--warn` or `--urgent` soft background, `border-radius:12px`, icon + one sentence naming the blocker and its consequence. This replaces `smart-alert`.
4. **Four-up stat strip** — Service · the user's blocking dimension (Certificates & permits for Chloe, Follow-up for Martice) · Last touchpoint · Case number. Eyebrow label, 19px/800 value, 12.5px note. The blocking cell's value goes `--urgent` when blocked.
5. **Contact strip** — one `--surface` card, a single line: name, relationship, phone, email, separated by `--border-strong` rules.
6. **Two columns, 1.25fr / 1fr** — checklist left, touchpoints right.

### Checklist

The single most important fix. A Chloe cremation case is five groups and 44 items; today they all render flat and expanded.

- Card header: "Checklist", then the overall percentage at 19px/800 and `12 of 44` beside it.
- Each group is a `border:1px solid var(--border)` block, `border-radius:11px`, 8px apart, with a header row: chevron, group name at 13.5px/700, an optional `2 N/A` note, a 64×5px bar, and `3/7`.
- **Collapsed by default. One group opens automatically — the first one that is incomplete and blocking.** For Chloe that is usually `Death Certificates & Permits`; for Martice, `Commission Packet`.
- Item rows: 18×18 `border-radius:6px` checkbox (`--ok` filled when done), label at 13px (struck through and `--text-3` when done), completion date, and an `N/A` button at 11px/700 in a `--border-strong` outline. N/A stays a first-class control — it is how you both keep the percentage honest.
- Group order and item text come from `CHLOE_CHECKLISTS` and `MARTICE_CHECKLISTS` unchanged.

### Touchpoints

Timeline down a 2px left rule. Newest entry's rule is `--accent` and its date is `--accent-hover`; older entries use `--border` and `--text-3`. Date at 11.5px/700, body at 13.5px/1.55. Composer textarea at the bottom on `--surface-sunk`.

---

## 6. Carried over from the audit

These are in `DESIGN_REFRESH.md` and still required. Short version:

- **Delete the entire `body.light-mode` block** (~45 rules). Light is the default now; dark is the `html[data-theme="dark"]` override. Set the attribute in `<head>` before the stylesheet, defaulting to `prefers-color-scheme`, and add `<meta name="color-scheme" content="light dark">` so native controls and the date picker theme themselves. Remove the `filter:invert(.6)` calendar-icon hack.
- **No colors or font sizes in JS template strings.** `buildCaseCardHTML`, `renderCalendar`, `renderSchool`, `renderMeals`, `renderRecipeLibrary` and `renderDueBanner` all emit inline `style=` with baked hex values. Promote to classes; pass only data-driven values through a `--pill` custom property.
- **Delete the `FONT / SPACING IMPROVEMENTS` block** and fold it into the base rules.
- **Add focus styles.** There is no `:focus-visible` rule anywhere and every input carries `outline:none`.
- **Fix `switchTab()`** — it finds the active button by positional index into `querySelectorAll('.nav-btn')`. Use `data-tab` attributes.
- **Modals** — sticky header and footer, body scrolls, `min(880px,94vw)`, Escape to close, focus trap, `role="dialog"`. The CIRGAS form is ~45 fields and the Save button currently scrolls out of reach.
- **Name transition properties** instead of `transition:all`, and honor `prefers-reduced-motion`.
- **Scope the print rule** to `body > *:not(#printArea)`.
- Remove the stale `sync-banner` — Firebase sync is automatic now and the "one-time setup guide" copy is wrong.

---

## 7. Order of work

| Phase | Work | Ship independently |
|---|---|---|
| 1 | Tokens + `data-theme` + delete the light-mode block | yes |
| 2 | Shell: sidebar, page header, stat row | yes |
| 3 | Table card + Martice columns | yes |
| 4 | Chloe columns + per-user stats and tabs | yes |
| 5 | Case detail screen, replacing the accordion | yes |
| 6 | Grouped collapsible checklist | yes |
| 7 | Icons: emoji → SVG sprite | yes |
| 8 | Modals, focus, motion, print | yes |

Run the syntax check from `CLAUDE.md` before every push. Verify each phase with Playwright at 1440px and 1280px, in both themes. Do not touch `index.html`, the contract generators, or any Firebase write path.

---

## 8. Do not change

- The five sections and their names: Cases, Tasks, Meals, Calendar, School.
- `CASE_STATUSES` and every status string.
- Case types (RIC, CIRGAS, GA Policy, Clearpoint Trust, Work Order) and dispositions (Cremation, Burial) and all service types.
- `CHLOE_CHECKLISTS` and `MARTICE_CHECKLISTS` — group names, item text, order.
- The new-case wizard's branching: owner → type → service type → checklist picker → form.
- Payment methods and payment statuses.
- Firebase read/write paths and the `dashboard` node shape.
- The percentage-and-bar progress indicator. It is the thing that works today; it gets bigger, not smaller.

---

## 9. Done when

- [ ] Light is the default; dark is one attribute on `<html>`; no `body.light-mode` rule survives.
- [ ] Sidebar in place, `<header>` and the tab strip gone.
- [ ] Switching to Martice changes the columns to Type / Interment / Follow-up; switching to Chloe changes them to Disposition / Service / Certificates & permits.
- [ ] The word "value" appears nowhere in the UI.
- [ ] `Pending Marker Order` fits its column on one line.
- [ ] Every stat card's note carries context, not a bare number.
- [ ] A 44-item Chloe case opens with one group expanded and four collapsed, each with its own bar.
- [ ] N/A still works on every checklist item and still adjusts the percentage.
- [ ] No emoji in the rendered UI; no monospace; nothing below 11px.
- [ ] Tab through the app in both themes — focus is visible at every stop.
- [ ] `node -e "…"` syntax check passes.
