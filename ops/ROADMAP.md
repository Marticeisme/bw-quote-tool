# Roadmap — Sprint Arc

Confirmed 2026-07-25. Sprint-01 is detailed (`sprints/sprint-01/`); later milestones are
outlines that each closing director turns into detailed files. **Reality wins over this
outline** — the closing director redraws it from what actually shipped.

Martice's note on ordering, 2026-07-25: *"prices.json but some updates may be needed as we
go along."* Treat the arc below as a living outline, and treat S2 in particular as building
for **repeated** price updates rather than a one-time extraction.

## S1 — Externalize the embedded contract templates  [DETAILED → sprints/sprint-01/]

Stop shipping 9.4 MB of base64 to every visitor. The 11 large embedded templates become
binary files under `pdf-templates/embedded/`, fetched on demand and cached in memory for
the session. First load drops from **7.30 MB gzipped to ~0.67 MB (~11×)**, and the ~1 MB
of git growth per push stops.

One track (`s01/externalize-templates`). Gate 0 requires a generator baseline captured on
unmodified `main` — captured 2026-07-25, **rebuilt 2026-07-26** after the director's boot
audit found `GA_PDF` uncovered and the signatures drifting with the wall clock. Done means:
all **14** generator signatures identical to that baseline, `npm run check` (**8 blocks**) and
`npm test` green, and a template failure surfaces a visible error rather than a silent one —
including the ACH/Rules attachments, which previously swallowed failures. Close gate: merged
locally, then Martice pushes.

## S2 — `prices.json` as source of truth

Today an annual price update means hand-editing hundreds of HTML lines in a
`"Name — $1,234"` format that silently breaks the regex-scraped search index if the dash or
spacing is wrong. There are 1,157 hardcoded `$` literals, and `PRICE_INDEX` (841 items) is
built by scraping rendered DOM text.

Worse, the same fees now live in **three places and are already drifting**: the quote tool,
the WMP map's hardcoded `COLUMBARIUM_FEES`, and an older unused Rock of Ages sheet. Nothing
links them.

**Build for repeated updates, not a one-time extraction** — the deliverable is a price file
plus an update path Martice can run himself each year, not just a refactor. Depends on S1
only for file-size headroom; otherwise independent.

## S3 — Saved-list focus bug and accumulated debt

The saved-quote search box rebuilds its list via `innerHTML` on every keystroke, destroying
and recreating the `<input>` and losing focus. Pre-existing, known, deferred for scope
discipline. Alongside it: the dead tracked `BW_Quote_Tool_merged_11.html` (6.3 MB) and the
duplicate root-level marker image. Cheap, self-contained, no dependencies.

## S4 — WMP map integration

Blocked on a decision, not on code. `wmp-cemetery-map/data/` holds real burial records
including living property owners' names, and the tool deploys to a public GitHub Pages
site. Three options in the order previously discussed: deep-link only (map stays on
localhost:8642), move both behind auth, or publish a de-identified layer (space IDs and
availability, no names). **Do not start this sprint until Martice picks one.**

## S5 — Code splitting the contract generators

Only if session collisions still hurt after S1 shrinks `index.html` to ~2.3 MB. The seam
already exists and is already a rule: the six contract generators (RIC, GA, ClearPoint,
CIRGAS) are scope-isolated from the quote builders. Pull the vendored minified libraries
(pdf-lib, firebase, jszip — 3.7 MB of the file) out to `<script src>` files at the same
time; that part is free and carries no behavioral risk.

**This is a maintenance sprint, not a performance one.** After S1 there is no size argument
left for it — only the two-sessions-one-file merge pain. If that pain has gone away, so has
the sprint.

## S6 — Org readiness  [unscheduled; added 2026-07-26]

Martice intends an org rollout eventually. Per `DESIGN.md` §1 this is **not** licence to
pre-build now — account types, a manager role, rules-enforced ownership and a shared contact
directory stay unbuilt until a third kind of user actually exists. What this milestone owns is
the *audit*: confirm nothing shipped in the meantime has made org-readiness a rewrite rather
than an addition. The load-bearing invariants are `ownerUid` on records, roles as data
(`BW_ROLES`) rather than a hardcoded enum, and per-record `quotes/<type>/q<id>` storage that
security rules can later scope by owner without a migration — remembering there is no
migration mechanism, so a schema change is a code change.

Trigger this sprint when a real third user is imminent, not before. Until then it is a
constraint on other sprints, not work of its own.
