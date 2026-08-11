# TRACK A — Inman Travel Plan guide (`s22/inman-travel-plan`)

You are an Opus track subagent. Work ONLY in the worktree `../bw-quote-tool-s22a`
(absolute: `C:\Users\Martice\bw-quote-tool-s22a`), branch `s22/inman-travel-plan`.
Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Use `git -C <absolute-path>` for
every git command. NEVER push. NEVER edit index.html. NEVER write to Firebase.

**Stale-base check first:** `git -C C:\Users\Martice\bw-quote-tool-s22a log -1 --oneline`
must match `git -C C:\Users\Martice\bw-quote-tool log -1 --oneline main`. If not, STOP
and report. Verify `node_modules` exists in the worktree (junction) before running suites.

## Deliverable

`inman-travel-plan-guide.html` — a new family-facing guide in the existing guide family
(study `veterans-guide.html` and `medicaid-family-guide.html` for structure, tokens,
masthead, footer, print annotations), plus its PDF via the shared print pipeline, plus
one card on guides.html under **Getting Started**.

## Voice — BINDING

`docs/GUIDES_VOICE_DEBRIEF_2026-08.md` rules apply to every sentence: first person
(Martice talking across a table), contractions, short plain sentences, explain WHY.
NEVER: em dashes, "inventory", "counselor", "Dear", stacked adjectives, marketing copy.
Martice's title is "Family Service & Advanced Planning Director". Sign-off/contact
pattern: copy the veterans-guide footer block (Calendly link, tel 206-277-5417,
mmorrison@bonneywatson.com, fam-sign with (206) 445-9794).

## The facts (pinned — do not re-research, do not embellish)

**What the plan is.** Travel Plan by Inman, backed by Inman Shipping Worldwide —
America's largest provider of repatriation services for the deceased, in business since
1978, funeral director owned. One-time fee, lifetime coverage, any age accepted,
unlimited travel worldwide. Martice is a licensed agent through Inman.

**When it applies.** Death 75 miles or more from the participant's legal residence, or
in another country. If that happens, ONE call to Inman (888-889-8508, staffed 24/7/365)
and they handle everything below. **The family must call Inman FIRST, before making any
arrangements — it is not a reimbursement plan; arrangements made elsewhere are not
covered.** This warning must be prominent in the guide.

**What fulfillment covers (from the enrollment terms, keep all six):**
1. Contacting a licensed funeral home or professional embalming service center near the
   place of death
2. Transporting the deceased from the place of death to that facility
3. Preparation of the deceased for transport
4. The minimally necessary shipping container / air tray
5. Securing all shipping documentation including one death certificate
6. Arranging and paying for transportation back to the local funeral home

**What it costs without the plan (2025 Inman averages — use a selection, cite "Inman
Shipping, January 2025"):** domestic runs $1,500–$3,000 (e.g. West Coast to East Coast
$2,000–$3,000; Hawaii to Midwest $2,850–$6,250). International to the US: Mexico
$5,000–$6,500; England $8,000; Germany $9,000; France $9,500; Italy $11,000; Japan
$11,500; Philippines $11,500; Brazil $11,000; Sydney $8,700; South Africa $12,500;
Saudi Arabia $12,500–$14,000; China $22,000.

**Pricing (operator-ruled, matches the live enrollment page):**
- Individual plan $499. Couple plan $974.
- Pay in full, or $166.33/month for 3 months, or $41.58/month for 12 months.
- If a participant on a payment plan dies current on payments, the remaining payments
  are forgiven and the plan is fulfilled.
- The plan is not effective until paid in full or the first payment is received, and an
  enrollment number has been issued.

**Fine print that must appear (plainly, in the voice, not as legalese):**
- "Legal residence" is the fixed, full-time home. An address lived at 180+ days in the
  12 months before death counts as the legal residence; a nursing home stay of 180+ days
  makes the nursing home the legal residence.
- Enrolling while already away from home: the plan takes effect after the participant
  returns home, for later travel.
- Medical tourism is not covered.
- Inman encourages a call to the Service Center before international trips; coverage is
  good for unlimited international travel.
- Members receive a welcome letter, a wallet-size member ID card, and a change of
  address card.

**Who can enroll whom.** Anyone, any age — and you can buy it for someone else (a mom
covering her daughter who travels, adult children covering a snowbird parent). Say this
with one or two concrete examples in the voice.

**How to sign up (both paths, in this order):**
1. Call or sit down with Martice — he's a licensed Inman agent, answers questions, and
   walks the enrollment through with the family. This is the recommended path.
2. Enroll directly online at his link:
   `https://travelplan.shipinman.com/travelplan/cairn?MFN=Martice&MLN=Morrison&MID=MAMOWEST1&ME=mmorrison@bonneywatson.com`
   Render it as a labeled button/link ("Enroll online"), never the raw URL in prose.
   The link appears on BOTH the page and the PDF (operator ruling).

Keep the two phone numbers straight: enrollment questions go to Martice
(206-277-5417); at the time of a death away from home, the family calls INMAN first
(888-889-8508).

## Page + PDF mechanics

- Register the guide in `scripts/guide-print-meta.mjs` GUIDES (typographic cover is fine
  — no hero photo needed; PLACE line should be Bonney Watson, not WMP).
- Add the build job so the PDF lands at `pdf-assets/Travel Plan by Inman.pdf`; target
  ≤4 pages; the PDF must stand alone as an email attachment (it is the campaign piece).
- Register the page cap in `scripts/verify_guide_pages.mjs` and satisfy
  `scripts/verify_family_type.mjs` (≥10pt prose, no sheet column flow — read the script).
- guides.html: ONE card under Getting Started, pattern-matched to existing cards
  (guide-card, data-name search haystack with terms like: travel plan inman repatriation
  away from home death out of state overseas bring home shipping snowbird; PDF ↓ link).
  Touch NOTHING else on guides.html.
- Print tables must not clip (`verify_table_alignment` check C); no column-span:all
  after a page break.
- CRLF repo: never write a Node script matching multi-line content with bare `\n`.

## Verification (quote outputs verbatim in your report)

1. `npm run check` → `index.html: 8 blocks, 0 errors`
2. `npm test` → `2842 passed, 0 failed across 42 suites` (never overlap a running suite)
3. `node scripts/verify_guides_page.mjs`
4. `node scripts/verify_guide_pages.mjs`
5. `node scripts/verify_family_type.mjs`
6. PDF freshness: the manifest reports 0 stale / 0 missing after your build
7. `git -C <worktree> diff --stat main -- index.html` → empty
8. Rasterize the PDF (PyMuPDF or pdf.js under Playwright, from the repo root) and
   eyeball every page yourself; save renders to `scratch/s22-a-renders/`. Check: no
   orphaned headings, the warning box intact, the enroll link present and correct on
   the PDF, no em dashes anywhere in prose.

Commit locally on the branch with tag `[s22/inman-travel-plan]`, explicit paths only,
NO co-author trailers (operator standing rule 2026-08-08). Report per
SPRINT_GUIDELINES rule 8.
