# TRACK B — Follow-up email generator (`s09/followup-emails`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. Work on branch `s09/followup-emails` in your assigned worktree. New page + one
guides.html card; you do NOT touch `index.html`.

## Mission

Build `followup-letter.html` — an interactive follow-up email generator — to the spec in
**`E:\Downloads\followupemailtoolhandoff.md`**. Read that file first; it is the complete
requirements document (4 categories, relationship-aware tone logic, exact email
templates, voice rules, subject lines, timing note). Follow it faithfully — the email
copy in it is FINAL operator-approved text; do not rewrite it, including its deliberate
contractions and its "no em dashes" rule. The referenced `/home/claude/
martice-writing-voice.md` does not exist on this machine — the handoff doc's templates
and voice rules are sufficient and authoritative.

## Model page

Match `deed-transfer-letter.html` (same repo root): same CSS variables, header/footer,
fonts (Source Sans 3, Cormorant Garamond), navy/orange/cream scheme, two-panel layout
(form left, live preview right), "Copy for Email" / "Copy Plain Text" / "Print / Save as
PDF" button bar, and the same privacy notice ("Nothing here is saved or uploaded
anywhere…"). Nothing is saved or uploaded — no Firebase, no network.

## Key behaviors (from the handoff, restated as the gate)

- Category pill/radio selector at top: Marker / Cremation Only / Outside Burial / Full
  Service at WMP. Switching preserves common field values.
- Subject line pre-filled per category ("Checking In — [Decedent Full Name]"), editable,
  copies with the body.
- Relationship dropdown drives decedent reference, check-in tone, AND the pre-planning
  paragraph per the handoff's summary table. Son/Daughter reveals the surviving-parent
  dropdown → name field. Mother/Father (deceased child) = softest tone, first-name-only
  references, pre-planning paragraph REMOVED entirely.
- Marker category: Veteran checkbox adds the VA bronze-marker paragraph.
- Full Service category: "Has marker?" checkbox; unchecked adds the gentle marker
  paragraph before pre-planning.
- Signature block exactly as specified (Martice Morrison, Family Service & Advanced
  Planning Director, (206) 445-9794, mmorrison@bonneywatson.com, calendly link, SeaTac
  address).

## guides.html

Add ONE card linking the page alongside Deed Transfer Letter / Payment Options Letter /
Vital Worksheet (whatever tools-group markup those use — mirror it). Run
`node scripts/verify_guides_page.mjs` after. Title: "Follow-Up Emails · Bonney Watson";
header "Follow-Up Emails".

## Verification (quote outputs verbatim)

- `npm run check` (must stay `8 blocks, 0 errors` — you didn't touch index.html; prove it).
- `npm test` green, counts not falling (1327/27 baseline; add a Playwright suite
  `tests/test-followup-letter.mjs` covering: category switching preserves fields; each
  relationship produces its specified decedent reference; parent-of-deceased-child omits
  pre-planning; surviving-parent name flows into the paragraph; veteran paragraph
  appears/disappears; copy button produces the full email including subject; state the
  new total).
- `node scripts/verify_guides_page.mjs` → ALL OK.
- Playwright screenshots of all 4 categories in `scratch/s09b-renders/` — and LOOK at
  them (layout matches the deed-transfer look, preview reads correctly).

## Report

What shipped; branch + commits; verbatim gate outputs; files changed; decisions & open
questions; what the director must verify by hand.
