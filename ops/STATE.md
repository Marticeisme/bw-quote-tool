# STATE — Living Ledger

**s25 PUSHED LIVE 2026-08-20 (operator: "push it all live"; `31a4a3bb..c3f3d19d` +
build-log follow-up) — wire-verified 35/35** (scratch/s25-live-verify.mjs: every
pushed public file byte-identical sha256 vs HEAD blobs after 2 deploy-lag rounds;
probes: guide-nav.js serving, one tag per page — the PCM "2 mentions" probe blip was
the generator's own comment, real tag count 1 — and who-decides live at TWO ways).
The who-decides ruling commit rode this push as planned. s25a worktree removed
(junction deleted non-recursively FIRST this time; main node_modules verified
intact); s25/* + s24/* branches kept until pruned. VERIFIER LESSON (2nd occurrence
today, keep): probe for the exact MARKUP (`<script src="guide-nav.js"`), never a
bare substring — comments and JS-escaped apostrophes both false-fail substring
probes; byte-identity vs the HEAD blob remains the authoritative check.

**s25 CLOSED ON MAIN 2026-08-20 — Track A `s25/guide-sidebar` MERGED (track
`cd79ddd6`+`36447bdd`). Final main GREEN: index 8/0; `3484 passed, 0 failed across
47 suites` (NEW PIN, re-pinned in all three governing docs; reconciles 3063 + 421
test-guide-nav); family_type 121/0, guide_pages OK, photo_first 23/7 OK, catalogs
ALL OK, guide_nav 421/0 director-re-run on merged main; PDF manifest 60/0/0 with
ZERO PDF byte churn (track proved print-render identical 33/33 with nav on/off and
re-recorded hashes instead of rebuilding — the builder is not byte-reproducible);
index.html blob still f2c17d16… byte-identical.** Shipped: guide-nav.js (ONE shared
file = model + injected style + nav + drawer; gnav- namespace because `.sidebar` is
taken by the prose guides' pull-out boxes; brand values hardcoded — the pages don't
share token names), 34 pages wired (script tag IN the generators for generated pages;
build_urn_options.py ruled dead for HTML), drawer with bottom-left button (top-left
collides with sticky headers, bottom-right with flush-markers' action bar), ?family
bails out on EVERY page (regex identical to build_pcm_catalog.py's), sabotage-proven
test-guide-nav (2× red/green quoted). TRACK'S EYEBALL CAUGHT A REAL DEFECT: menu
button parked over the open drawer — now steps aside and becomes the × close.
DEVIATIONS/FINDS: brief said 35 pages, truth is 34 (gate derives the set from disk);
**build_guides_page.py CANNOT rebuild guides.html on pristine main** (CARD_RE parses
0 of 47 cards — the s22 rot finding now confirmed as a hard abort; guides.html is
hand-kept; tag added to the generator anyway for when it's repaired). OPEN OPERATOR
ITEMS (close gate): push word (who-decides two-ways commit rides the same push);
should counselors get the Letters & Forms pages in the sidebar (currently omitted —
they're operator tooling on a family-visible screen)?; ?family suppressing nav on
every guide (not just PCM) — broader than the original PCM-only intent, flag if
unwanted; build_guides_page.py repair as its own chip. Renders:
scratch/s25-a-renders (6). Worktree s25a pending removal at push; s25/* branch kept
until pruned.

**Current sprint: sprint-25 — OPENED 2026-08-20** (director: same Fable session as
s24; track: Opus). Scope: persistent left sidebar across the guides site per the
operator's ask, rulings: ALL guide+catalog pages (35 incl. guides.html; tools/maps/
internal excluded), slide-out drawer on phones, guides-brand skin. One track
`s25/guide-sidebar` (worktree s25a): shared guide-nav.js single source of truth,
script tag added in the CATALOG GENERATORS (hand-editing generated HTML = defect),
PCM ?family view stays navigation-free, PDFs must be byte-stable, new sabotage-proven
verify_guide_nav.mjs gate. WHO-DECIDES RULING EXECUTED SAME DAY, director-direct
(operator ruled TWO ways, restructure): signed-authorization card folded into the
written-wishes card as its "most useful form", PDF summary + cover line now say two,
"stronger of the two" now correct; PDF rebuilt 2pp, all four guide gates green,
committed on main (NOT pushed — rides the s25 push word). Gate 0: s24 close numbers
(3063/46, 8/0) + who-decides commit measured green this session. NO push pre-auth.

**s24 CLOSED + PUSHED LIVE 2026-08-20 (operator: "push it all live";
`08fdfb27..377b562e` + build-log follow-up) — wire-verified 27/27** (scratch/
s24-live-verify.mjs: every pushed HTML file byte-identical sha256 vs HEAD blobs after
one deploy-lag round; probes: banned opener GONE from live cemetery-property, new
openings live, flush-markers brochure copy gone, terrace 2-sentence card + fixed
footnote live, letter both-lines split live; the one probe "FAIL" was the probe's own
apostrophe-escaping — byte-identity + blob grep proves the sentence live). Final
contract on push bytes: index 8/0; `3063 passed, 0 failed across 46 suites` (solo
run); family_type 121/0; guide_pages OK; photo_first 23 cards/7 pages OK;
area_guide_ranges reconciles; PDF manifest 60/0/0; index.html blob byte-identical
through the sprint. PUSH-GUARD SCAR, promote to every guide-track brief:
`verify_photo_first.mjs` runs in `.claude/hooks/pre-git-guard.js` but was in NOBODY's
gate list — it blocked the push (a colon-split rewrite put the terrace niche-bank
card at 3 sentences vs a 2-sentence budget; colons are legal, restored the
two-sentence shape). Letter deliverable committed + pushed same round. Cleanup:
s24a/b/r worktrees removed (junctions deleted non-recursively AFTER `git worktree
remove` left the dirs on disk — remove junctions FIRST next time; main node_modules
verified intact); renders copied to scratch/s24-{a,b}-renders (12+14); s24/*
branches kept until pruned. OPEN OPERATOR ITEMS: who-decides §2 two-vs-three-ways
contradiction (body says two, PDF sidebar three, three cards shown — needs his
ruling); flush-markers.html orphaned + Download points at nonexistent "Granite
Marker Guide.pdf" (link/retire/repoint); optional guide-price-rule.mjs contraction
one-liner (site-wide regen). Voice-debrief staleness noted both directions — rely on
source, not its per-guide verdicts.

**Current sprint: sprint-24 — OPENED 2026-08-20** (director: Fable session; tracks:
Opus per policy). Scope: guide voice & style round per the operator's in-chat ask —
sample funeral-industry writing (consumer journalism first per ruling), distill into
`docs/GUIDE_STYLE_2026-08.md`, apply to all 23 prose guides at **openings + weak
passages** depth (operator ruling; gold-standard guides light touch), with the
meta-hook opener pattern BANNED (named example: cemetery-property-guide.html:440
"This is the thing families most often have wrong…" — the operator rejected the
pattern itself). Voice debrief rules stay binding over anything borrowed. Tracks:
R `s24/style-research` (worktree s24r, web research → style doc, director audits) →
A `s24/voice-decision-guides` (12 guides, worktree s24a) ∥ B
`s24/voice-location-guides` (14 guides, worktree s24b). Merge order R → A → B.
SCOPE AMENDMENT at R-audit (2026-08-20): three prose guides live OUTSIDE the
`*-guide.html` naming and were missing from the plan — direct-cremation.html (→A),
outside-marker-rules.html and flush-markers.html (→B); the first two are the voice
debrief's Tier 1/2 worst offenders and get the deeper per-guide treatment the debrief
prescribes. 26 prose guides total. R AUDITED+MERGED: docs/GUIDE_STYLE_2026-08.md
(15 sources actually read — TalkDeath/Cake/NYT-class unreachable, said so plainly;
banned-opener class with a mechanical delete-the-first-sentence test; reconciliation
table where voice rules win every conflict; §8 finds the debrief's gold-standard
list is NOT uniformly clean — cemetery-property's §1 body carries the banned sentence,
so tracks check openings section by section). B MERGED 2026-08-20 (track `60651eb2`+`39deb3c3`): 14 guides, 129-line diff, merged
clean (manifest auto-merged, director-verified 60 jobs/0 stale/0 missing on final
bytes), all 14 PDFs identical page counts inside caps, index.html blob still
f2c17d16… byte-identical vs pre-sprint. B's finds: (1) flush-markers.html was the
biggest offender and appears in NO debrief/plan — end-to-end brochure copy, 22
passages rewritten; it is ORPHANED (nothing links it) and its Download button points
at a nonexistent "Granite Marker Guide.pdf" — OPERATOR DECISION at close (link it /
retire it / repoint to "Granite Marker Sizes and Colors.pdf"); (2) terrace-garden's
gate-pinned stray-word footnote ("on it this location") — DIRECTOR FIXED post-merge
(guide ×2 + verify_area_guide_ranges needle to same intent, PDF rebuilt, 3pp in cap,
gate reconciles); (3) two em dashes deliberately kept (gomn/granite-niches): the
GOMN sheet's verbatim E.C.F quotation, gate-pinned — correct to keep; (4) the
BW:PRICE-RULE invitation block ("I would rather…I will put…") is GENERATED by
scripts/guide-price-rule.mjs across every guide — a one-line generator change + full
regen would give it contractions site-wide, offered at close; (5) markers-guide was
"gold standard" yet carried three globally-banned phrases — no guide is clean by
reputation. A MERGED 2026-08-20 (`2c21ffe1`, track `498be30d`): 12 guides, 70-line surgical diff,
zero voice violations in added lines, all 12 PDFs rebuilt at identical page counts,
index.html blob byte-identical vs pre-sprint (f2c17d16…), gates re-run by director on
merged main: index 8/0, family_type 121/0, guide_pages all OK, full suite running.
A's finds, on the record: (1) who-decides §2 says "two ways" in the body, "three ways"
in the PDF sidebar, and shows THREE cards — internal contradiction, OPERATOR QUESTION
at close; (2) style-doc §7 example 4 claimed "no individual space to buy" for
scattering but the page sells Scattering Spaces — director corrected the doc
(follow-up commit) + added the examples-are-style-not-fact rule; (3) the voice
debrief's Tier 1/2 verdicts are STALE for A's guides (earlier sprints already cleaned
them — zero "inventory"/"counselor"/banned phrases found); (4) NEW SCAR: `PORT=<n>
npm test` with nothing listening EXITS 0 HAVING RUN NOTHING ("does not answer; not
starting a server elsewhere") — a false green for any pinned-port run; start the
server first and judge by the assertion count. GATE 0 ADDENDUM: first full-suite run
read 3062/1 — the one red was test-combined-totals.mjs pinning the letter's OLD
one-side-split behavior, superseded by the operator's same-day ruling (this session's
payment-options-letter fix); assert updated to pin the new contract (both lines,
empty side $0.00), suite 50/0, full re-run green (see below).
index.html byte-untouched all sprint (sha256 audit); PDFs rebuilt per guide; suite
pin 3063/46 must not move. Gate 0 at open: origin 0 behind, index 8/0, full suite
run in progress at entry (confirmed green before spawn). NO push pre-authorization.
NOTE: working tree carries the session's uncommitted payment-options-letter.html fix
(both-lines split + wording, verified 20/20) — separate deliverable awaiting the
operator's word, outside sprint scope. OPS DRIFT FOUND: SPRINT_GUIDELINES still
instructs a Co-Authored-By trailer; the 2026-08-08 no-AI-trailer standing rule wins —
guideline correction queued as ops bookkeeping this sprint.

**CUSTOM DOMAIN LIVE 2026-08-15: https://bwquotetool.com** (operator bought it on
Cloudflare Registrar; director added the 5 DNS records via Claude-in-Chrome — 4×A
185.199.108-111.153 on @, CNAME www→marticeisme.github.io, ALL grey-cloud DNS
only — pushed the CNAME file `cfe368f3`, set https_enforced via gh api).
Wire-verified: apex serves latest bytes over valid HTTPS; the OLD
marticeisme.github.io/bw-quote-tool URL 301s to the new domain (bookmarks/printed
links survive); www still 404 at check time — GitHub's www→apex redirect
propagates on its own; if it's still dead later, add Cloudflare's suggested
www→root redirect rule (needs the www record flipped to PROXIED for the rule to
fire — apex records must STAY DNS only or the GitHub cert breaks). Post-s23
one-liner also live: discount rows render green (`61b20c1a`, .s-split-disc,
wire-verified). The tool's canonical address for future links/guides is now
bwquotetool.com.

**s23 PUSHED LIVE 2026-08-15 (operator: "push it all live"; `fbeefab7..ff22cf6c`,
14 commits) — wire-verified 7/7** (scratch/s23-live-verify.mjs, 2 deploy-lag
rounds): index.html, vital-worksheet.html, guides.html, payment-options-letter.html,
pcm-design-catalog.html, data/pcm-catalog.json, data/pcm-2020-family.json all
byte-identical sha256 vs the HEAD blobs on the wire, + 5 content probes OK (keyed
worksheet fields, quick-jump nav, both new PCM sections, CIRGAS priority list).
PUSH SCAR, keep: intermittent "Could not resolve host: github.com" needed
exit-code-judged retries — and `git push | tail` in a retry loop MASKS the failure
exit code (the pipe scar, nearly re-lived); judge pushes bare, never piped.
Worktrees s23a/b/c removed post-close (junctions non-recursively first); s23d dir
still locked by a dead process handle, delete after reboot; s23/* branches kept
until pruned. Still open with the operator: RIC Acrobat eyeball (2-garden
scatter), commission worksheet on the office printer, his-browser worksheet print
re-check, the Compare-B package-qty ruling, and the smaller flags in the close
entry below.

**s23 CLOSED ON MAIN 2026-08-15 — ALL FOUR TRACKS IN (A `s23/contract-fixes` →
C `s23/resources` → B `s23/quote-lane` → D `s23/pcm-restructure`, merged --no-ff
in that order). Final main GREEN: index 8/0; `3063 passed, 0 failed across 46
suites` (NEW PIN, re-pinned in all three governing docs; reconciles 2854 + 77 A
+ 111 B + 21 D; worktrees read −2, the wmp-map skip); verify_pcm_catalog 398/0
+ verify_guides_page ALL OK, both director-re-run on final main bytes; composed
baseline proof: pre-sprint fbeefab7 capture vs final-main capture = 12/14
byte-identical, the 2 changed are EXACTLY the intended ones
(clDownloadFilledWorksheet = A's print-path repair; downloadCombQuotePDF = B's
three-figure header, sums verified to the cent) — both RIC paths, GA, CP,
CIRGAS byte-identical.** Shipped: (A) RIC Qty 3/4 now correct for multi-garden
scatter (label carries ×N; labelQty reads it) + Compare-B 2nd/3rd-Right
undercharge fixed (was 1 half-space at qty 2); CIRGAS `IOA ADDL SIGNERS` sits
directly behind the IOA when iaMinSignatures>1, else stays at the back;
commission worksheet output gets calcChain strip + paperSize=1 + all three
stale printerSettings DEVMODEs removed (MOTW/Protected View is the residual
risk — untestable here). (C) vital-worksheet PDF pre-fill is keyed by data-key
(the 53-keys-vs-55-boxes off-by-two is dead; auditWorksheetKeys() warns on
drift), sex-at-birth pair in both layouts, phone/date/SSN live masks; DIRECT
print rebuilt as pure @media print — both modes ONE page (was 3), the zoom-
against-hardcoded-816×1056 mechanism deleted; guides.html sticky one-row
quick-jump pill nav (wrapped bar was 168px on a phone — nowrap+sideways
scroll), category ids added, verifier +8 asserts. (B) multi-contact linking:
_bwPendingLink is an array, chips w/ BW_ROLES dropdown + per-chip unlink,
restore ALL roles (roles[0]-only bug dead), reconciliation on save + orphan-
role cleanup in saveQuoteRecord's overwrite branch (real leak: every re-save
grew phantom holdings — measured 2→0 orphans); sidebar labels wrap 2 lines w/
title attr and ×N is its OWN pinned span (9/9 qtys readable vs 3/9);
cem/FH/grand totals on quote-PDF page 2 + combined email (now computes from
_combCemTotal/_combFhTotal, not DOM scraping) + optional letter fields. (D)
PCM catalog is TWO family-facing sections — Single Marker Designs (372 proofs
+ 457 plates) and Companion Designs (247 proofs + 242 plates) — proofs first
inside each, themes as groups, book = filter + detail row only; 2020's 354
plates HAND-CLASSIFIED BY LOOKING into checked-in `data/pcm-2020-family.json`
(241 single / 113 companion / 6 ambiguous documented; method validated 330/330
against the 2011 book's own split); theme derived deterministically from
pcm-subject-tags.json (rule table + 25 overrides); PCM 2271 dedup ruled to
Outdoors (699 cards from 700 rows, both pinned); gate sabotage-proven 3×
red/green. DEVIATIONS: A ruled Compare-B arrangement packages genuinely DON'T
scale with Qty(spaces) — matches the main builder — so brief's "fix amounts"
was wrong there; D's brief said sections sum to 700, truth is 699 (its own
dedupe); two tracks left stray 3737 dev servers (dev-server.mjs reads PORT not
--port/BW_PORT — director killed five strays; a runner-hardening chip stands);
s23d worktree dir still on disk, locked by a dead process handle (junction
already deleted non-recursively, git worktree pruned — delete the folder after
reboot). OPEN OPERATOR ITEMS (close gate): push word (nothing pushed); RIC
Acrobat eyeball recommended for a 2-garden scatter (baseline RIC byte-identical,
but qty VALUES change on that input shape — A's suite proves bytes, only
Acrobat proves appearance); commission worksheet on the office printer (if it
still fails → MOTW/Trusted Location, not code); re-check worksheet direct print
in HIS browser (track could not repro >3pp locally, fixed the mechanism);
COMPARE-B PACKAGE-QTY RULING WANTED (per-package qty boxes like the main
builder, or Qty(spaces) scales packages?); at-need print card 3 splits across
the column break (price of 1 page — say the word for 2pp clean boundaries);
guides pills go inert during active search (one-line dim if wanted); pre-need
worksheet still reads "Did THEY experience homelessness" in an About-Me sheet
(pre-existing); combined email still doesn't itemize custom lines (totals now
reconcile because they're included in the side totals). Renders for the
operator: scratch/s23-{b,c,d}-renders (43 files, copied out of worktrees) +
A's proof is suite-borne. s23/* branches kept until pruned. NOT PUSHED — no
pre-authorization.

**Current sprint: sprint-23 — OPENED 2026-08-15** (director: Fable session; tracks:
Opus per policy + operator word "use opus sprinters"). Scope: the operator's
9-issue list (`E:\Downloads\QUote tool issues and resources issues.docx`) — see
`sprints/sprint-23/SPRINT.md` for the issue→track map. Four tracks, two waves:
Wave 1 A `s23/contract-fixes` (RIC qty-from-label bug: scatter-garden recording
fee at index 7691 multiplies amount without ×N suffix, Compare-Options fee lines
8684–8714 ignore garden qty entirely — real undercharge; CIRGAS `IOA ADDL
SIGNERS` splices after `INTERMENT AUTH NEW` when iaMinSignatures>1; commission
worksheet gets the CIRGAS calcChain-strip treatment + paperSize fallback +
printerSettings removal — the print-failure screenshot was Excel repair/Protected
View on the office printer) ∥ C `s23/resources` (vital-worksheet.html checkbox
scatter = positional CHECK_KEYS map 53 keys vs 55 DOM boxes, the 2026-07-27
sex-at-birth pair never added — fix is data-key keyed mapping + phone/date/SSN
masks ported from index.html:20572; guides.html category quick-jump pill nav,
builder is rotted so hand-edit, verify_guides_page.mjs extended). Wave 2 (after A
merges) B `s23/quote-lane` (multi-contact linking — contractRoles join already
multi-capable, the single slot is `_bwPendingLink` 16467 + roles[0]-only restore
16853 + unlink-never-deletes bug; sidebar label wrap/qty visibility at 260px
locked width; payment split cem/FH/grand) ∥ D `s23/pcm-restructure` (two
top-level sections Single/Companion, proofs first inside each, themes as groups,
book = filter only; 354 2020 plates classified by looking into a checked-in
override file; verify_pcm_catalog.mjs re-pinned + sabotage-proven).
**OPERATOR RULINGS AT OPEN (in-chat 2026-08-15):** (1) payment split renders on
ALL combined surfaces — quote-PDF page 2 header three figures, combined email
per-side totals, letter page optional cem/FH fields; (2) PCM = the two-section
layout above (supersedes s21's proofs-atop-books placement). Merge order
A → C → B → D. MID-SPRINT AMENDMENT (operator, in-chat 2026-08-15, C's first
report in but unmerged): direct browser print of vital-worksheet.html must match
the fillable PDF's economy — hard cap 3 pages, target 2, both modes; brief
amended in place (Fix 3), running Track C agent messaged directly, merge of C
waits for the second report. Contract at open (Gate 0 measured): index 8/0; 2854/42 green;
main == origin/main; baseline 14/14 current. Close-gate items: RIC Acrobat check
(A changes qty field VALUES), commission-worksheet test on the office printer
(untestable here), PCM/guides/worksheet eyeballs. NO push pre-authorization.

**s22 OPERATOR ROUND + PUSH 2026-08-10 (operator: "fold tax in" + the official
CEMETERY MERCH & SERVICES PRICE LIST EFF-03.01.2026.xlsx + "push it all live once
done"):** director-direct on main (scratch/s22-fold-tax.mjs, 55 asserted edits):
bronze guide now prints ONE all-in column with 10.4% tax folded in (tables, the five
drawn prices, gov-match prose $3,521.76 / VA-install $1,308.24, Generally-ranges
regenerated tax-included $1,308–$27,843). THE PRICE LIST SETTLED EVERYTHING: every
qBronze figure matches it exactly; the $12,315/$12,475 companion IS 60×20 (rows
172-173 — my brief's 60×16 pin was wrong, the tool was right); the WMP rules' "24×30
companion" IS the half ledger, 24×30 on 28×34, $6,525/$6,780 (rows 163-164) — guide
now names it and carries its size-note; TWO honesty fixes from the list: "w/vase
core" includes only the fitting, the VASE ITSELF IS SEPARATE (bronze $1,340–$1,445
pre-tax, zinc $205 — guide now says so, the what-comes-with box no longer implies an
included vase), and extra wording/emblems/non-Latin lettering carry per-word/character
fees (rows 126-131) so "nothing else to add" got scoped honestly. Suite green
2854/42 AFTER one 2851/3 run whose 3 fails (catalog-filter-print + pcm-catalog) were
the KNOWN runner race — server on 3737 stopped mid-run by an overlapping tail; fresh
solo run + port ownership check (fresh-timestamp node = the run's own server, no
zombie) proved the flake; the standing-fix chip stands. Suite-count note: the tax
fold changed no assert counts (content-only edit).
**s22 CLOSED ON MAIN 2026-08-10 — BOTH TRACKS IN (A `s22/inman-travel-plan` →
B `s22/bronze-markers`, merged --no-ff). Final main GREEN: index 8/0;
`2854 passed, 0 failed across 42 suites` (NEW PIN, re-pinned in all three governing
docs — the old pin had DRIFTED, still reading s17's 2461/37; reconciles 2842 + 6 per
track: 5 verify_family_type + 1 family-register per new guide); verify_guide_pages all
pass w/ manifest floor 33 (director-resolved: both tracks independently pinned 32, the
one true conflict); verify_guides_page ALL OK; family_type 121/0; table alignment 0
failed; print headers 0 over cap; index.html BYTE-IDENTICAL to pre-sprint ab53d2c6
(diff empty, the sprint's standing rule held).** Shipped: (A)
`inman-travel-plan-guide.html` + `pdf-assets/Travel Plan by Inman.pdf` (4pp, own cap 4)
+ Getting Started card (pill 15→16) — leads with WHY per the operator's mid-sprint
amendment; call-Inman-first (888-889-8508) unmissable on p1 vs enroll-questions-to-
Martice; region-plates price graphic generated by `scripts/build_inman_region_map.mjs`
(the operator's source map PDF was NOT shippable: off-brand clipart whose price rows
would print 7.57pt, under the 10pt floor — render kept at
scratch/s22-a-renders/inman-source-map.png); his MAMOWEST1 enrollment link on page AND
PDF per ruling; $499/$974 + payment plans + forgiveness; honest "Is this worth it for
us?" passage. A's print-defect finds: data-pdf="summary" on a .note wrapper EATS the
wrapper's own h3/p (annotate the paragraph, never the container); .enroll-btn white
needed (0,2,1) specificity vs §5 a:link; break-after:avoid ignored before unbreakable
blocks (keep-together wrappers). (B) `bronze-markers-guide.html` +
`pdf-assets/Bronze Markers.pdf` (5pp, own cap 5) + Markers card (pill 4→5) —
foundation-first teaching (bronze never sits on bare lawn), scale drawings at the
granite guide's 4.607 px/in with all-in prices inside, WMP rules all three grave
cases, government-match section (Coldspring, $3,190 / VA-install $1,185), Expressions
in Bronze, 5 vendor webps (Matthews ×4, Coldspring ×1, magic-byte-verified, credited);
prices re-read from qBronze at build (one pin discrepancy found: the $12,315/$12,475
companion is 60×20 in the tool, not 60×16 — FILE WON, operator to confirm the size);
tax shown as its own ×1.104 column (qBronze is pre-tax; granite guide folds tax in —
deliberate, flagged). Director audit fixes: B's family-PDF "Granite or Bronze" summary
kicker printed bare "SECTION" (numbered summary kickers by hand — the counter doesn't
run in the family cut). OPEN operator items: 60×20-vs-60×16; 24×30 bronze companion
has NO price anywhere in the tool (prose only); single all-in tax column if wanted;
family PDF condenses B's price tables to Generally-ranges per s16 house style (drawn
prices survive) — flag if he wants every figure; A's suite-runner finding worth a
chip: run-all stops a dev server on 3737 it did not start, killing a parallel tree's
run (A went green pinned PORT=3757); `build_guides_page.py` CARD_RE is rotted
(doesn't know .guide-cardtop — guides.html cards are hand-edited now). Worktrees
s22a/s22b removed post-close (junctions non-recursively first); s22/* branches kept
until pruned. Renders for the operator: scratch/s22-a-renders (4pp + source map +
screen), scratch/s22-b-renders (5pp + screens). NOT PUSHED — no pre-authorization;
push gate must restate that the enrollment link (his name/work email/marketer ID) and
the vendor product photos go public.

**Current sprint: sprint-22 — OPENED 2026-08-10** (director: Fable session; tracks: Opus
per policy; operator: "boost as a director and use opus sprinters"). Scope: TWO new
family guides + PDFs + guides.html cards. Track A `s22/inman-travel-plan`:
inman-travel-plan-guide.html — the Travel Plan by Inman (Martice is a licensed Inman
agent; sources: his two Inman PDFs in E:\Downloads + travelplanbyinman.com + his live
enrollment link, all distilled into the brief); will anchor a future email campaign.
Track B `s22/bronze-markers`: bronze-markers-guide.html — bronze companion to the
granite marker guide (Matthews + Coldspring partners; WMP bronze rules from
`E:\Downloads\WMP_Marker_Rules___Regulations (2).pdf` pinned in the brief; all-in prices
pinned from index.html's qBronze dropdown). **OPERATOR RULINGS AT OPEN (in-chat
2026-08-10):** (1) Travel Plan prices = the LIVE enrollment page: $499 individual /
$974 couple + 3-mo/12-mo payment plans + forgiveness clause (FAQ's $495/$990 is stale);
(2) his personalized enrollment link (marketer ID MAMOWEST1) appears EVERYWHERE — page
and PDF, public repo understood; (3) bronze imagery pulled from the vendors' public
sites, one image MUST be the government bronze match for veteran spouses (ordered
through Coldspring); (4) bronze guide carries all-in prices like the granite guide;
(5) guides only — index.html byte-untouched all sprint (sha256 audit), no email draft
this sprint. Parallel worktrees ../bw-quote-tool-s22{a,b} pre-created by the director
from LOCAL main ab53d2c6 (stale-base scar), node_modules junctioned. Merge order A → B
(trivial add/add on guides.html + guide-print-meta.mjs resolved by director). Contract
at open: index 8/0 (measured); suite pin 2842/42 (Gate 0 run in progress at entry time,
confirmed before spawn: 2842/42 green). NO push pre-authorization. MID-SPRINT
AMENDMENT (operator, in-chat, tracks in flight): Track A must carry a map-style VISUAL
of the repatriation price ranges (render the Inman 2025 map PDF page + a brand-token
world-regions graphic, print-tested) and must LEAD with the why-a-family-wants-this
argument (scenario-driven, $1,500–$22,000 exposure vs $499 once, not-travel-insurance
distinctions) — brief amended in place, running Track A agent messaged directly.

**HISTORY REWRITTEN 2026-08-08 (operator-directed):** commit metadata normalized
across all 813 commits and example/annotation text cleaned throughout history;
`main` force-pushed. **Every commit SHA in the entries below this line is a
historical label that no longer resolves** — do not try to check them out; the
narrative stands as written. Tip tree verified byte-identical on the wire
(index.html sha256 match) post-push. Suite at the rewrite: 2842/42. Recovery for
any stale clone: clean tree → `git fetch origin && git reset --hard origin/main`
— NEVER pull/rebase across the rewrite. Worktrees pruned to main + the
discount-fix worktree; stale local branches deleted. Standing rule from the
operator, same date: commits carry no AI co-author trailers.

**s21 DROP-THE-8 PUSHED LIVE 2026-08-07 (6023278a..f0e6ae12) — wire-verified:** the 8
corrupt PCM sources are dropped for good per the operator (PCM delisted the designs);
placeholder files deleted from D:, manifests carry EMPTY unavailable lists (gates pin
them empty: import 42/0 x2, catalog 377/0, suite 2842/42), desc file _unavailable
block removed. NOTHING pending on the PCM proofs any more.

**s21 OPS ROUND PUSHED LIVE 2026-08-07 (operator: "push it all live";
`f73708a9..1e82619f`, 8 commits) — wire-verified 8/8 after 2 deploy-lag retries**
(scratch/s21-ops-live-verify.mjs: all four touched pages byte-identical sha256 vs HEAD
blobs + content probes). Shipped: RIC Import panel to top; deed-transfer-letter
property pickers/centered letterhead/$-format (+ test-deed-letter.mjs, 42nd suite,
parity-pins the qGarden/qNicheName/qMausName copies); Track D catalog "Print This
Design" (gate 377/0); Interlude Urn $655 taxable required in Garden of Meditation
Niches; per-item checkboxes on all 4 cemetery packages (defaults preserve totals);
dashboard sort dropdown (status=workflow order/service/name/newest, bw:caseSort4);
CIRGAS Mem Order sig-block fix (template cells were [1]Information! EXTERNAL-workbook
formulas — never resolvable; now direct writes, proven on generated flat+upright
workbooks 7/7). Final contract: **2842/42**, index 8/0, dashboard 2/0, catalog 1/0.
NOTE: the 8 corrupt PCM proof sources are DELISTED from PCM's site (all URL patterns
404, gallery no longer references the numbers) — recovery is via the PCM rep only.
s21d worktree + s21/* branches kept until pruned.

**s21 PUSHED LIVE 2026-08-07 (operator: "push it all live"; `de565e55..ff7cbae9`,
12 commits) — wire-verified 12/12 after 2 deploy-lag retries** (scratch/
s21-live-verify.mjs): live catalog page + index.html byte-identical sha256 vs the
HEAD blobs, source chip absent on the wire, both new sections + counts + vietnamese
facet serving, five proof webps byte-identical incl. released 2500/2529 and new-class
16521. The PII release is now PUBLIC per the operator's twice-confirmed ruling.
PUSH SCAR, promote: with local merge commits, `git pull --rebase` REPLAYS AND
FLATTENS the sprint's merge topology and re-fires resolved add/add conflicts even
when origin has NOTHING new — check `git log main..origin/main` FIRST; if empty,
skip integration entirely; if not, integrate by MERGE (s14 rule). One rebase-abort
recovered cleanly this time. s21 worktrees already removed; s21/* branches kept
until pruned. Open: 8 corrupt sources pending re-download; cover-subtitle one-liner;
ragged portrait rows — all on the operator's list.

**s21 CLOSED ON MAIN 2026-08-07 — ALL FOUR TRACKS IN (A `337b2508` → B1 `c2960d5f` →
B2 `e55337ab` → C `f8006386`). Final main GREEN: index 8/0 + catalog-page 1/0 syntax;
suite `2764 passed, 0 failed across 41 suites` (NEW PIN; C's worktree read 2762 — the
known +2 is test-contact-csv's wmp-map presence check); verify_pcm_catalog 315/0
(was 238) BW_BASE-pinned fresh 4173; verify_pcm_proofs_import 42/0; both desc
validators OK (372, 247); director re-proved the source-chip sabotage red/green on the
merged bytes himself.** Shipped: 372 single proofs (`pcm-single-images/`, NEW class,
string ids — `1148`≠`1148-2`, UI prints `num` never `id`, 8 differ, gate-pinned) + 247
companions (232 + 245/258/2538 + THE 12 RELEASED), every proof with a curated
by-looking title/desc/tags from the shared vocabulary (+menorah/horseshoe/snowman,
director-ruled), language-tagged (17 Vietnamese, 16 Hebrew, 2 Chinese, 2 Spanish
across both classes) and searchable; two proof sections at the TOP of the catalog,
books-dropdown entries (Single marker designs / Companion designs), `format: single`
facet, `source: full-colour proof` chip GONE chip-and-facet; proofs now join Compare +
print sheets (1,319 cards · 110 pages unfiltered); `pcm_extract.py --fold-proofs`
closes the manifest-vs-page refresh gap that stranded the count at 232. **PII RELEASE
ON THE RECORD: operator asked TWICE in-session (second time with Track A's census
quoted at scale — ~260 real-identity singles + the 12 held companions, portraits/
dates/hometowns, public repo), answered "Ship everything"; classifier blocked the
relayed instruction, so the director executed it himself after the second direct
answer (`67a4c81c`); every released image verifiably already public on PCM's own
gallery; hold reasons preserved as RELEASED provenance in script+manifest+gates.**
Deviations: 8 sources are CORRUPT DOWNLOADS (HTML error bodies as .jpg: companions
2260/2261/2263/2267/2343/2352/2355 + single 1348) — recorded unavailable in both
manifests, gates assert none quietly shipped; re-download from PCM's gallery slots in
with zero edits (magic-byte detection, 1348's URL pattern is `PCM-1348.jpg`). Track A's
transcript died post-report (3rd occurrence); B1/B2 wrote rival verify_pcm_desc.mjs
(add/add) — resolved to B1's, director added webp-dir mode + the 3 ruled vocab slugs.
SCAR, promote: a track brief that RELAYS a PII/publish ruling gets refused by the
track (correctly) — route release rulings through a direct operator answer, then
execute director-direct. OPERATOR EYEBALL at close (C's list): cover subtitle still
books-only + carries an em dash (pre-existing, one edit if wanted); `vietnamese`
search returns 36 (curated asian/mary synonym) vs exactly 17 language-chipped —
gate pins the honest rule; 17 portrait-ratio proofs leave ragged grid rows; renders
in scratch/s21-c-renders/. NOT PUSHED — push gate must restate the PII release.
Worktrees s21{a,b1,b2,c} removed (junctions non-recursive first); s21/* branches kept
until pruned.

**Current sprint: sprint-21 — OPENED 2026-08-07** (director: Fable session; tracks: Opus
per operator word). Scope: PCM proofs expansion — `D:\Cemetery Photos Misc\PCM SINGLE`
(373 single-marker proofs, new class) + `PCM COMPANION NEW` (252 files; survey: 230 are
repeats of the shipped 232 → SKIPPED per operator, 10 genuinely new, 12 = the s17
PII-held set). **OPERATOR RULINGS AT OPEN, all in-chat 2026-08-07:** (1) **RELEASE ALL 12
held proofs** — asked with the PII risk spelled out (real names/dates/hometowns/portraits,
public repo), he chose full release; survey fact: all are already on PCM's public gallery
(the SINGLE folder's CSV carries the public URLs). (2) TWO sections at the TOP of the
catalog (singles then companions, above the book plates), NO bespoke filter UI — integrate
into the EXISTING books dropdown + format facets + search bar. (3) Descriptions BY
LOOKING on all ~627 proofs, subject tags from the existing vocabulary, `source:
full-colour proof` chip REMOVED. (4) Non-English (esp. Vietnamese) lettering tagged +
searchable so families can find Vietnamese examples. (5) Repeats: shipped file wins, zero
byte churn on the 232. No-enhancement regime unchanged (no upscale, no masking). Waves:
Wave 1 parallel A `s21/import` ∥ B1 `s21/desc-singles` ∥ B2 `s21/desc-companions`
(worktrees ../bw-quote-tool-s21{a,b1,b2}, pre-created from LOCAL main by the director —
stale-base scar) → Wave 2 C `s21/catalog` (builder restructure + gate re-pin). Merge order
A → B1 → B2 → C. Briefs in `sprints/sprint-21/`. Contract at open: index 8/0, suite pin
2685/41, verify_pcm_catalog 238/0. NO push pre-authorization.

**s20 PUSHED LIVE 2026-08-06 (`0c2bae87..66c9fee1`, 21 commits incl. the quote
session's s19 operator round), wire-verified 7/7:** live dashboard.html AND index.html
byte-identical sha256 vs the HEAD blobs (4 deploy-lag retries), Pending Service +
sidebar + detail screen serving, body.light-mode and the old SC hex map absent from
the wire. s20d worktree removed post-push; s20/* branches kept until pruned.

**s19 OPERATOR ROUND MERGED 2026-08-06 late — Track F `f4b02cab` (track `31dc3d6b`),
main GREEN: 8/0; `2685 passed, 0 failed across 41 suites`** (2598 + 87
test-niche-maus-type). Shipped: (1) summary sidebar lists ALL quote items on cem/fh/
combined — the s19 3-line preview is overruled by the operator; `.s-items` is the only
scrolling region, total + actions always visible, geometry untouched; (2) niche/maus
selections auto-resolve their arrangement row via `BW_NICHE_TYPE`/`BW_MAUS_TYPE`
(operator's binding classification 2026-08-06: glass = Crystal/ECL-New/EL-Niches/
MVC-New/MVC-(Inside)/Radiance/Serenity; granite = CoH/Garden-Court/Terrace-Garden/
Gethsemane/GoM/MVC-(Outside)/ROAC; indoor = COM/ELM; outdoor = Garden-Court-Maus/
TG-Maus); hidden row force-UNCHECKED same pass (no invisible charges, sabotage-proven
6 ways); nothing auto-checks; old "Mountain View Columbarium" option REPLACED by
"(Inside)"/"(Outside)" pair, legacy saved value loads via the retired-option path
(shows both rows, "No longer offered" chip — wording slightly off for a split-not-
retired location, operator may want a variant). PDF byte-proof triple-run identical
w/ negative control; family-quote parity 40/0 unadjusted; Compare tool Option B left
manual per brief. NOTE: main ALSO carries the OTHER session's in-flight s20 dashboard
merges (cb1e192a, 9accbc7d) — A PUSH OF MAIN DEPLOYS THEIR PARTIAL SPRINT-20 TOO;
coordinate before pushing. NOT PUSHED. F worktree removed (junction-safe).
**PUSH HANDOFF 2026-08-06:** per the operator, the s20 dashboard session ("Dashboard
pending service option") now owns the push — it pushes EVERYTHING including these s19
commits when s20 is done; messaged with the contract numbers (2685/41, 8/0) and
protocol. This session stands down from the tree except ops bookkeeping.
**Current sprint: sprint-20 — OPENED 2026-08-06** (director: Fable session; tracks: Opus
per operator word). Scope: **dashboard.html full redesign** per the operator's
claude.ai-design brief (pinned `sprints/sprint-20/REDESIGN_BRIEF.md` + case-detail
mockup `CASE_DETAIL_MOCKUP.dc.html`; mockup PNGs operator-local, copied to
`scratch/s20-mockups/`) + **new 'Pending Service' status for Chloe**. Operator rulings
at open: Pending Service is CHLOE-ONLY (hidden viewing as Martice, mirrors the PMO
pattern; ordered after Pending Docs); full brief all 8 phases this sprint; NO push
pre-auth. DEVIATION logged: the brief's companion `DESIGN_REFRESH.md` does not exist
anywhere findable — brief §6 governs the audit carry-overs. **WAVE 0 SHIPPED
director-direct 2026-08-06: 'Pending Service' live in the OLD UI** — CASE_STATUSES +
SC + option gating (`psStatusOpt` shows only for wOwner chloe), quick-status gated by
c.owner, filter chips gated by activeUser (visible in chloe + all views, hidden for
martice); verified 13/13 by `scratch/s20-wave0-verify.mjs` (Playwright, Firebase
route-BLOCKED, seeded localStorage — the harness pattern for all s20 tracks; render
eyeballed). dashboard.html syntax: 2 blocks 0 errors. Four sequential Opus waves
follow (one file — no parallel tracks): A shell-foundations `s20/shell` → B
table-views `s20/tables` → C case-detail `s20/detail` → D polish-a11y `s20/polish`,
worktrees `../bw-quote-tool-s20{a..d}`, merge order = wave order. Briefs in
`sprints/sprint-20/`. Contract at open: 2598/40 (untouched by dashboard work — no
suite reads dashboard.html); index.html must stay byte-untouched all sprint.

**s20 WAVE 1 MERGED 2026-08-06, main GREEN 2598/40 + both syntax checks (dashboard 2/0,
index 8/0): A `cb1e192a` (track `02dfd031` — brief §2 token block verbatim light+dark,
body.light-mode block DELETED, data-theme set in <head> pre-stylesheet from
localStorage→prefers-color-scheme, old var names kept as aliases; <header>+tab strip
deleted, 240px sidebar with counts + segmented Viewing switcher + dark toggle, page
header + 3 stat cards with context notes, switchTab on data-tab, sync banner/modal
removed, 14-icon Lucide sprite, 64px rail <1100px). Director re-ran A's 89/0 verify
himself on branch AND merged main, re-eyeballed renders (17 in scratch/s20-a-renders).
A's deliberate deviations accepted: shared stat defs until B, honest subtitles until B,
Cases-scoped header row, sync dot + gcal btn kept in sidebar bottom (live consumers),
TYPE_COLORS neutralized-not-removed (B's job). NOTE: quote session committed 39b572a6
on main mid-wave (s19 operator-round brief) — merge integrated it cleanly. WAVE 2
SPAWNED: B table-views (Opus, ../bw-quote-tool-s20b from cb1e192a).**

**s20 WAVE 3 MERGED 2026-08-06 (`38fc84c6`), main GREEN: 2685/41, dashboard 2/0 +
index 8/0, C's gate 98/0 + B's 120/0 re-run by director on merged main.** C merged
(track `74b31ba7` — full-page #detailScreen replaces the accordion: breadcrumb,
identity row with pill-as-quickStatus control (.pill-ctl overlay select), blocker-only
alert band, four-up strip, contact strip, 1.25fr/1fr grouped checklist (collapsed by
default, exactly ONE auto-open: first incomplete blocking group) + touchpoints
timeline; NO new write sites — existing handlers repaint via renderCaseCard→
renderCaseDetail; accordion provably dead code DELETED: buildCaseCardHTML 313 lines,
toggleCard, expandedCards + bw:expanded mirror, 32 CSS rule groups, each grepped
first). Accepted deviations: Interment label for Martice's first stat, delete-case
kept as quiet text button (only path to deleteCase), add/delete-item rows kept,
overdue-at-any-amount = urgent for Martice, printCase restyle deferred to D. AUDIT
NOTE: B's K4 assert ("openCase lands on edit modal — C retargets it") went stale
exactly as written when C retargeted the seam; director updated s20-b-verify.mjs K4
to assert the new routing (superseded-assert fix, not a code fix), B back to 120/0.
WAVE 4 SPAWNED: D polish-a11y (Opus, ../bw-quote-tool-s20d from `38fc84c6`) — carries
the no-status-no-pill render-default nit, printCase restyle (script-free
document.write window), emoji sweep, styles-out-of-JS for the four non-case tabs,
modal focus-trap/Escape/sticky, :focus-visible, motion, print scoping, §9 walk.

**s20 CLOSED ON MAIN 2026-08-06 — ALL FOUR WAVES + WAVE 0 IN. Final main GREEN:
dashboard 2/0 + index 8/0 syntax; suite 2685/41; all five s20 gates green on final
bytes (A 88/0 updated-to-current-surfaces, B 120/0, C 98/0, D 136/0, data-preservation
9/9).** D merged (track `1f32ee68` — 16 more sprite icons, zero emoji in rendered
output, all six render fns + printCase emit no inline hex (pill classes with
--pill-bg/fg pairs, dark overrides), legacy var alias block retired at zero consumers,
modals sticky+focus-trap+Escape+role=dialog (CIRGAS Save reachable at 800px), zero
outline:none, no transition:all, reduced-motion honored, print scoped, no-status rows
render a New pill render-time-only; §9 walked item-by-item, all PASS — D's report has
the evidence table). DATA-PRESERVATION GATE (director-direct, operator's ask):
scratch/s20-data-preservation.mjs — seeds all four case shapes, opens edit modal,
saves with NO edits, asserts no original leaf lost + CIRGAS derivations
(disc←contractNum etc.); s20 main 9/9; PRE-SPRINT BASELINE FAILS IT (wipes
'Pending Service' on save — the option didn't exist), so wave 0 closed a real
data-loss path. GATE-MAINTENANCE SCAR, promote: a wave-N gate that pins wave-N
surfaces goes stale exactly as later briefed waves land (A's E/G/C7-C8/SC probes, B's
K4) — the fix is update-the-probe-to-the-same-intent-at-the-new-surface, never
delete the assert and never "fix" the code backward; C7 threshold moved AFTER seeing
results (D's F2 self-flag, same honesty rule). Firebase: zero test traffic all
sprint, asserted per-gate. Worktrees s20a/b/c removed (junctions non-recursive
first); s20d pending; s20/* branches kept until pruned.

**s20 PUSH PRE-AUTHORIZED (operator, direct in-chat, 2026-08-06): "push everything
live once its all done and green."** Fires after all four waves are merged and the
final contract is green (dashboard + index syntax checks, full suite ≥2685/41 at 0
failed, brief §9 walked). Includes the quote session's s19 operator-round commits
(their handoff confirmed: index.html + tests only, clean tree from their side).
Push protocol: pull --rebase check for out-of-band movement → syntax checks → full
suite → push → live wire verification of dashboard.html + a spot-check of the quote
session's index.html on the wire.

**s20 WAVE 2 MERGED 2026-08-06, main GREEN + both syntax checks; suite now 2685/41 —
grew from 2598/40 via the QUOTE SESSION's s19 Track F merge (`f4b02cab`, +1 suite),
not dashboard work; 2685/41 is the running pin.** B merged (track `6bb2b111` — §3
table card + §4 Martice/Chloe/All views, per-user stats with context notes, named
filter tabs, §2 pill map as CSS classes both themes, Pending Service pair light
#FBEAF1/#9B3D6A dark #33202B/#E79ABE; TYPE_COLORS/caseTypeColor/hex-SC DELETED, type
is plain text; buildCaseCardHTML kept compiling as C's source material; openCase(id)
seam + crow-<id> rows for C; chip filter bar + #caseList retired — s20-a/wave0 verify
scripts' chip probes superseded by s20-b-verify's same-contract asserts at the new
surface, 120/0, director re-ran on branch AND merged main; renders eyeballed).
Accepted deviations: quick-status select out of rows (pill per §3, modal still edits),
canonical status strings over mockup sentence case (§8 wins), Chloe sort
upcoming→past→undated, All view 7-slot grid, tab count badges dropped to match
mockups, due-banner left for D's sweep. Director-observed nit for D: seeded case
without status renders NO pill — D should confirm a real default. WAVE 3 SPAWNED:
C case-detail (Opus, ../bw-quote-tool-s20c from `01644a52`, which includes the quote
session's operator round — they've left a push-coordination note re s20 in-flight).

**s19 PUSHED LIVE 2026-08-06 (operator: "push it all live it looks great";
`e3c37ea5..9a56c7d2`, 12 commits) — wire-verified 8/8:** live index.html carries the
new chrome navy/summary-total/status-pill CSS, guides.html the category pills +
stretched links with zero old-palette hexes, guide-print.css the full-print section,
Cemetery Property PDF byte-identical sha256, burial-guide + granite-niches
byte-identical vs the COMMITTED blobs. VERIFIER SCAR, keep: a live-vs-local byte
compare on TEXT files must diff against `git show HEAD:` blobs, not the working tree —
autocrlf checkouts are CRLF while Pages serves the repo's LF bytes; two checks
false-failed for exactly this before the blob compare proved them identical. The five
s19 worktrees removed (node_modules junctions deleted non-recursively first);
`s19/*` branches kept until pruned. Close-gate rulings SHIPPED AS-BUILT (operator
pushed without amendments): exportedAt persists on next save; Contracted = RIC/CIRGAS
only; full-print page growth accepted; guides long-meta wrap accepted. Still open for
a future round: those two one-liners if he wants them, verify_full_print lock-in gate,
viewer GPL print-button chip, maps design consult.

**s19 CLOSED ON MAIN 2026-08-06 — ALL FIVE TRACKS MERGED (A `5b98aa33` → D `c5cdef78`
→ B `e4d9b7ef` → E `09e37d0e` → C `b96a122a`), final main GREEN: 8 blocks 0 errors;
`2598 passed, 0 failed across 40 suites`** (NEW contract number; reconciles 2501/38
+ 18 panel-summaries + 79 saved-status; per-wave numbers recorded in the wave entries
below). The whole Claude-Design handoff is in: brand ramp from official #466e86/#e84610
(chrome navy #1c2c36 = brand ×0.40 — the July "deeper navy" ask answered), summary
panels with the app's only 30px total + PDF-primary ranks, 44px panel headers with
persistent value summaries, four-rank buttons, saved lists as rows with derived
Draft/With-family/Contracted pills (additive `exportedAt`/`contractedAt` riding the
existing per-record save; zero new DB write sites, suite-asserted), guides.html on
shared tokens with hover-only orange, and full-print: Ctrl+P on a guide = the guide at
screen scale (three modes: none=FULL / ?print=family / ?print=compact), downloads
proven content-identical 33/33. Family-quote PDF byte-identical (negative-controlled)
through the index.html tracks; 14/14 generator signatures byte-identical through C.
BONUS pre-existing bugs fixed: Bronze Memorial stray </div> (panels below sat two DOM
levels shallow), unreachable saved-list empty state, granite/glass missed s16
regeneration, two guide-gate asserts measuring the wrong print mode. AWAITING THE
OPERATOR'S CLOSE GATE: eyeball renders in scratch/s19-{a,b,c,d,e}-renders (99 files,
copied from worktrees); rule on C#1 (persist exportedAt immediately on export? one-line
per-record save if yes — currently stamps persist on next save), C#3 (GA/CP Contracted
parity, one line each), E's grown full-print page counts (cemetery-property 4→13),
D's long-meta wrap on 4 cards, the navy shade itself. NOT PUSHED — no pre-auth.
DEFERRED, on the record: verify_full_print lock-in gate (E's rec — add when the
operator round settles, re-pin count); viewer.html printPDF() load-listener flakiness
on the GPL card (chip); the maps design consult (docs/DEBRIEF_design_maps_2026-08-06.md,
unrun). CLEANUP PENDING push word: five agent-* worktrees + s19/* branches; Track C's
worktree node_modules is a JUNCTION — delete non-recursively
(`[System.IO.Directory]::Delete($p,$false)`) before removing that worktree.

**Current sprint: sprint-19 — OPENED 2026-08-06** (director: Fable session, the same
session that ran the day's research phase; tracks: Opus per operator word + policy).
Scope: implement the Claude-Design UI-refresh handoff (verbatim-fidelity token
ramp/summary panel/buttons/panel headers/saved lists/guide cards — spec pinned at
`sprints/sprint-19/DESIGN_HANDOFF.md`, from the operator's claude.ai design consult
2026-08-06) + operator's in-HTML full-print fix for family guides (viewer prints the
condensed PDF today; he wants viewer/Ctrl+P = FULL guide, downloads stay condensed).
Operator rulings on record: PDF = summary primary; Contracted auto-stamps on RIC/CIRGAS
generation (additive fields ONLY — persist path untouched); no status tabs. **Gate 0
re-measured the contract on clean main: `2501 passed, 0 failed across 38 suites`,
8 blocks 0 errors — the s18 supersession note is resolved; 2501/38 is pinned in all
governing docs' spirit for s19.** Five tracks, waves: A chrome-tokens ∥ D
guides-refresh (spawned 2026-08-06, worktrees) → B panel-headers ∥ E guide-full-print
→ C saved-lists. Merge order A→D→B→E→C. Briefs in `sprints/sprint-19/`.
**WAVE 1 MERGED 2026-08-06, main GREEN `2501 passed, 0 failed across 38 suites` + 8/0
after both merges: A `5b98aa33` (track `0e607c5e` — token ramp verbatim, old var names
repointed not deleted, summary panel ×3 with PDF-primary/Save-secondary/quiet
Print+Copy/confirm-gated Reset, button ranks, 23 labels de-emoji'd; family-quote PDF
proven BYTE-IDENTICAL sha256 with a negative control; parity suite reads the rebuilt
panel — same five assertions) and D `c5cdef78` (track `5f01e9e7` — guides.html on
shared tokens + warm skin, stretched-link whole-card pattern with no nested anchors,
hover-only orange, category pills FREE for search since _hay already carried category
text, focus rings added; director accepted: Source Sans 3 stands in for the handoff
CSS's Public Sans per the no-new-families constraint, --serif-ink token added,
long-meta wrap on 4 cards — eyeball at close). Track A open item RULED to Track B
addendum: topbar .tb-action demotes to secondary on builder views via body class in
show(). WAVE 2 SPAWNED: B panel-headers ∥ E guide-full-print (Opus, worktrees, base
must include c5cdef78).
**WAVE 2 MERGED 2026-08-06, main GREEN at the NEW PIN `2519 passed, 0 failed across
39 suites` + 8/0: B `e4d9b7ef` (44px headers on all 39 panels, chip fills gone,
`.q-panel-sum` value summaries riding qsBegin/qsAt/qsEnd index ranges over the SAME
lines array renderSummary uses — nothing written onto line objects; +18-assert
test-panel-summaries suite; topbar orange demoted on builder views via
body:has(.summary-fixed.visible); FOUND+FIXED a pre-existing DOM defect: Bronze
Memorial's stray </div> had 'Bronze Add-Ons' rendering outside its card and panels
below sitting two levels shallow — .q-layout wrapper repaired at both ends;
_plHeaderTitle strips sum/tag so PRICE_INDEX stays clean, golden suite 6/6; audit:
261 inline styles, 29 relevant, all compatible, none migrated) and E `09e37d0e`
(DIRECTOR'S DIAGNOSIS WRONG, track proved it: viewer.html only ever served the GPL
card — the reduction was plain Ctrl+P itself, §7's 7.7pt two-column squeeze; now
three modes: none=FULL at screen scale, ?print=family unchanged, ?print=compact =
the old squeeze, named explicitly by the 3 build jobs that want it;
granite/glass-front had MISSED their s16 regeneration — fixed; 2 gate asserts were
measuring the wrong mode — fixed strict; downloads content-identical 33/33 proven
page-by-page + pixel on the 3 compact jobs; full-print page counts GROW, e.g.
cemetery-property 4→13 — inherent to the ask, operator eyeball at close; NO durable
full-print gate yet — director adds verify_full_print at close). E's viewer
printPDF() load-listener flakiness on the GPL card logged as future chip. WAVE 3
SPAWNED: C saved-lists (Opus, worktree, base must include 09e37d0e, pin 2519/39). Research
artifacts this sprint builds on: `docs/UI_RESEARCH_2026-08-06.md`,
`docs/DEBRIEF_design_2026-08-06.md` (+ the maps consult brief
`docs/DEBRIEF_design_maps_2026-08-06.md`, unrun, NOT s19 scope), all three untracked
in the working tree at open. NO push pre-authorization.

**s18 OPENED with the operator's first ask 2026-08-05: the worktree line-ending trap is
DEAD — `ebe2f20c` on main, NOT pushed.** Two layers: (1) `scripts/_pdf_manifest.mjs`
`sha()` now strips CR from text-extension sources before hashing (binary sources keep
raw bytes), so CRLF and LF checkouts of the same file hash identically; the manifest
was re-recorded once under the new normalization WITHOUT rebuilding (31 changed / 25
kept — the builds had just been wire-verified fresh, only the fingerprint algorithm
changed); (2) `.gitattributes` pins `guide-print.css text eol=lf` so fresh checkouts
match the generator's bytes on disk too. PROVEN end-to-end: a fresh worktree from
`ebe2f20c` checks out guide-print.css with zero CR bytes AND its dependency-free
freshness check reads 31 jobs / 56 hashes / 0 stale / 0 missing (previously ~25 stale
on pristine code); a CRLF-ified probe copy hashes to the canonical `58aede0fdef552a6`.
Full suite green after the fix. **CONTRACT-NUMBER NOTE for the next director:** the
s17 pin (2461/37) is superseded — the quote session's family-quote push added
`test-family-quote-subtotal.mjs` (the 38th suite, their memory records 2492/38), and
the 2026-08-05 measured run here printed **2501/38, 0 failed** with that session's
in-flight edit to the same test file present in the shared working tree. Re-measure
and re-pin at s18 boot from a clean tree; do not treat 2461 or 2492 as the expected
output any more.

**s17 PUSHED LIVE 2026-08-05, operator word "push it all live", wire-verified 8/8:
granite HTML (map-print ×8, figure-duo, 4.8in box), glass HTML (new footnote, radser
span, old slop gone), catalog proofs section, 2100.webp 200, HELD 2500.webp 404, both
live PDFs re-downloaded and rasterized — granite 7pp / glass 6pp, 0 dead "Open the"
links, 4+3 walk-you-through sentences. All push-gate items shipped as-was (16 MB
accepted, 12 proofs stay held, B's §7 edit stands). Note: the s17 commits reached
origin rebased under the quote-session's fa44cf14/8d8dfca2 (close commit is 9de3ff76
on the wire).**

**s17 CLOSED ON MAIN 2026-08-05 — operator fix round (three Opus tracks) + PCM
companion-proof class. Final main GREEN: 8 blocks 0 errors; 2461 passed, 0 failed
across 37 suites** (new contract number, governing docs re-pinned; reconciles exactly
2425 + 36 verify_pcm_catalog asserts, gate 202→238). AWAITING THE PUSH WORD — nothing
pushed. Merged in order: **A `48687c9`** granite-niches photos (operator: "too small";
root cause = the 2.55in print photo box binding all NINE portrait shots — raised to
4.8in/5.0in-pair, no object-fit anywhere, sections 1+4 print-only `.figure-duo` 2-up so
the PDF lands at 7pp inside the s13 8-page cap; screen `.figure-tall` 330→560px
centered; dead `.gomn-setting` selector deleted — it matched a FILENAME, the pair rule
had sized that photo all along); **B `c7242c1`** glass-front prose (the §5 "fee box"
footnote rewritten in the voice, all four facts + the gate-pinned
`data-rights="radser"` span intact; §7 checklist rights contradiction FIXED — flagged,
touches a claim; ALL THREE map lines got screen/paper halves: `.map-screen` clickable
sentence / `.map-print` "Ask me and I'll walk you through…" — NOT data-print-suppress,
the print generator strips hand-authored ones; B's first draft went 7pp with a stranded
sheet, fixed structurally back to 6pp); **director-direct `e66e3fcd`** ported B's
map-line mechanism to the granite guide (post-merge PDF sweep found its 4 dead "Open
the … map" links — now 0 across ALL built PDFs, proven both media directions by
Playwright probe); **C `e08def33`** PCM companion proofs — the brief's premise was
WRONG: `D:\...\PCM COMPANION` is 244 PCM full-colour DESIGN PROOFS (line art on real
granite colour, stock sample names), not installed-marker photos. 232 ship as their own
honestly-labeled class ("Companion Design Proofs", `source: full-colour proof` chip,
own `pcm-companion-images/` dir) with photos INTACT per the operator's 2026-08-05
ruling (~30 carry stock portrait insets); **12 HELD for real-identity PII** (2500-2516
odd set: Vietnamese families w/ dates+towns+portraits; 2529 Klotzner) — asserted absent
from data+manifest+disk, release = move out of HELD in
scripts/pcm_companion_import.py and re-run; 119 of 232 overlap 2011-book plates (both
ship, jump box prefers the plate); jpg/webp "twins" don't exist (webp keeps the jpg
name as prefix), one true byte-dup (2643). C found "companion" search matched through a
data-name SUBSTRING (the shadowed-rule scar as a search bug) — fixed the product.
Director re-ran on merged main: verify_pcm_catalog 238/0 BW_BASE-pinned at a fresh
4173 server, verify_pcm_upscale 42/0 (84 masked plates undisturbed), all guide gates,
2461/37 twice-built. SCARS: (1) all three worktrees stale-based AGAIN — every brief's
check caught it; (2) NEW, both guide tracks hit independently: `core.autocrlf=true`
checks `guide-print.css` out CRLF in fresh worktrees while the manifest records the
generator's LF hash → 24-25 staleness checks fail on PRISTINE code; both tracks
LF-normalized before rebuilding so the committed manifest stays correct for the main
tree — permanent fix (eol-insensitive hash or .gitattributes eol=lf) is a sprint-18
candidate; (3) DIRECTOR'S OWN: started the final npm test while the prior run was
still going — the first run stopped the shared dev server at its close and 26 suites
of the second died; suites NEVER overlap, same as walkthrough gates. PUSH-GATE items
for the operator: +16.07 MB companion proofs (q60 would be 14.2 MB); the 12 held
proofs (release any?); B's §7 rights-claim edit; granite p3 ~45% white (cost of
full-size photos on one-sheet-per-location); reading order in granite §1/§4 (second
photo now beside the first). Worktrees not yet removed; `worktree-agent-*` branches
kept until pruned.

**s16 CLOSED ON MAIN 2026-08-05 — THE FULL CONDENSED-PDF ROLLOUT IS IN. Final main
GREEN: 8 blocks 0 errors; 2425 passed, 0 failed across 37 SUITES** (new contract
number, all three governing docs re-pinned; reconciles 2303 + 11 marker asserts +
the new 111-assert verify_family_type suite). All 25 family-guide PDFs now build
condensed: operator approved the Cemetery Property reference cut on his phone, then
ruled ranges+medians on every card, replace-the-download, and "reduced but not to 2"
for the five area guides. Merged in order: **P pricing (director-PORTED — stale
worktree base)** gardens $4,995–$18,995 band $6,995–$9,995 / COM crypts
$9,895–$61,990 band $15,995–$28,995 (374 MIS-available; index.html prices crypts by
manual field, so COM is named); **B Tier 1** (7 guides to target; found
column-span-fragments-single-column + §7's 7.7pt li leak + .direct-panel widow +
charge-list strong break — all fixed shared); **D Tier 2** (5 area guides →3pp/2pp,
granite+glass HOLDS crop-verified untouched, scattering 1pp; area-photo box-not-crop
recut for 3pp); **E Tier 3** (all to target; medicaid-pro honest 3→5pp type-fix-only;
CSS-counter section numbering scoped to data-print-part — display:none generates no
box so numbering follows any selection; marker-prices suite 78→89, all 18 all-in
totals to the cent; true-size outlines dropped from the family cut, argued).
**LOCK-IN (director-direct, `1b41ae6`): scripts/verify_family_type.mjs + twin** — per
family guide on served bytes under print emulation: ≥10pt prose (named furniture
allowlist), no sheet column flow, no column-span, mode attribute live, pf-ask exactly
at the exemption table (ECL larger units = the one genuine ask left; urn-placement's
grave-space card got the gardens band instead). Sabotage-proven 22/21/1 named FAILs;
the first type needle was a DUD (body rule doesn't apply — p carries its own; the
hit-the-rule-that-APPLIES scar again). ALSO CLOSED THIS SPRINT: PCM roundel→blank
ceramic ovals (operator disliked the logo), and **Track C oval precision-fit — all 91
regions hand-read to inset bounds** after the operator saw ovals overlapping
lettering (director adopted C's region file onto main, repainted blank-style from
originals, re-read all 16 sweep sheets: 91/91 clean both classes; 4 _touchesArt
recorded). INFRA SCAR, promote: **agent-isolation worktrees sometimes branch from
origin/main, not local main** — P, C, D(first), E(first) all got stale bases; the
stale-base check in every brief caught D/E instantly; fix = reset the worktree to
main or pre-create by hand; P was ported, C's regions adopted+repainted. OPERATOR
FLAGS on the record: Pre-Planning's "Not for you" hook heading; urn-gardens lost its
lake banner photo to hold 1pp (ruling available: 2pp cap instead); ECL larger-units
ask-card is the named exemption; casket/urn catalogs still carry Side-by-Side.
PUSHED AND LIVE-VERIFIED 2026-08-05 (operator's standing word "push everything live
and call it a session"; e10ca73..816050c, 16 commits — includes s15's blank-oval
PCM commit): scratch/s16-live-verify.mjs 7/7 OK after 4 deploy-lag retries — the
live cemetery guide carries the gardens+crypt bands and the family annotations,
three condensed PDFs and two precision-fit PCM plates byte-identical sha256 on the
wire. s16 worktrees removed; worktree-agent-* and s16/* branches kept until pruned.

**Current sprint: sprint-16 — Track A MERGED 2026-08-04, AWAITING THE OPERATOR'S
STEP-3 GATE** (superseded by the close entry above) (condensed family PDFs; brief at sprints/sprint-16/SPRINT.md; sources
docs/PDF_DEBRIEF.md + docs/PDF_AUDIT.md + reference-docs/cemetery-property-condensed.pdf
— which turned out to BE the "PDF guide structural review.pdf" in his Downloads).
Track A `b04f917` merged --no-ff; merged main GREEN: guide page-shape gate all-pass,
**2303/36** (track's 2301 + the wmp tree variance), cemetery-property syntax 1/0.
Shipped: build_guide_print_system.mjs now emits a shared `?part=`/`?print=` selection
script (whitelisted, sets data-print-part/data-print-mode on <html>; regenerated for
cemetery-property ONLY); guide-print.css §8 = the debrief's three selection rules +
family type/geometry (10.5pt/1.5, one column); cemetery-property-guide.html annotated
data-pdf keep|drop|summary per the audit row, pdf-summary blocks in Martice's voice;
build job now maps `?print=family` → the guide's existing pdf-assets path (4pp→2pp;
Ctrl+P fallback still 4pp/8 sections, verified); PER_GUIDE_CAPS 4→2 for this one file.
Track scars: the debrief's bare `.pdf-summary{display:none}` LOSES to
`.charge-list span{display:block}` — needs !important (7 summary spans rendered LIVE,
caught only by the screen pixel-diff, which ended 0-differing-px at 2 widths);
a family-only <li> broke `:last-child` on screen (fixed with :has()); ALL 25 PDFs
freshness-rebuilt because guide-print.css is a shared source (director spot-rasterized
Pre-Planning + Granite Niches + Vault — content unchanged); verify_photo_first card-blurb
regex fixed minimally. HONEST SPEC CONFLICT, unresolved: debrief geometry table says
card sentences 12px (=9pt) vs its own "never below 10pt" rule — track followed the
table, matching the reference; settle before the lock-in assertions. OPERATOR GATE
(handoff step 3): PDF sent to him to read on his phone; his three decisions (ground/
crypt ranges; replace-vs-beside on guides.html — currently REPLACED per the debrief's
example, one line to flip; the five 8-page area guides) + the columbarium card photo
(indoor cabinet vs the reference's glass wall — director flag). Tiers 1-3 + lock-in
assertions ONLY after his word. NOT PUSHED (s15's blank-oval commit fe663ab also
awaits the push word).

**Current sprint: sprint-15 — OPENED 2026-08-04** (director: Fable session; operator
round on the PCM catalog, rulings arrived mid-conversation). Scope, in the operator's
order: (1) remove ALL photographs from the design plates (AI upscale mangles the ceramic
portrait faces) and replace with the BW logo / director's-taste placeholder — Track A
`s15/pcm-photo-mask` (Opus, isolated worktree, brief at
sprints/sprint-15/TRACK-A-pcm-photo-mask.md; census-by-eye over all 699 plates, checked-in
region file + deterministic mask script, manifest re-pin, EXPECT_PHOTO_MASKED gate both
directions; >120-plate census = stop-and-report); (2) Side-by-Side compare mode REMOVED
entirely, Plates is the only compare view (director-direct, DONE pre-suite: generator
tabs/specs-panel/spec-table/print-mode + all its CSS out, gate rewritten with
positive-absence asserts, sabotage-proven red/green — inject spec table → named FAIL
201/1, rebuild → 202/0 served-tree-pinned; overlay + 1-page 2×2 print PDF + renders
eyeballed); (3) Real Examples pruned 35→28 (operator picked marker-058 + marker-138, then
"these shouldn't be under the examples" at the guide-sourced class → all five
marker-images/ entries dropped from the catalog, files kept for the marker guide; the two
pcm-example-images files git-rm'd; data regenerated via pcm_extract.py --data with D:
sources verified — designs/elements/reference byte-identical, only photos changed; fold
render eyeballed, 28 cards 0 guide-sourced). Casket/urn catalogs KEEP their Side-by-Side
(operator's ask was PCM-scoped; flagged as an open question). NO PUSH — not pre-authorized.

**s15 PUSHED AND LIVE-VERIFIED 2026-08-04** (operator: "push it all live";
`c670f42..6d99e32`, 6 commits). Live wire checks (scratch/s15-live-verify.mjs, after
2 deploy-lag retries): 10/10 OK — no Side-by-Side tab/table/renderer in the served
page, 28 photo cards, zero references to the removed examples, FIVE masked plates
byte-identical sha256 vs local (668/682/845/932/1021), deleted marker-058.jpg 404s.
Track worktree removed (junction already gone, non-recursive-safe); `worktree-agent-*`
branch kept until pruned.

**s15 CLOSED ON MAIN 2026-08-04 — ALL THREE ITEMS IN. Final main GREEN: 8 blocks 0
errors; 2303 passed, 0 failed across 36 suites** (reconciles: 2288 post-direct-work +
15 pcm-upscale asserts 33→48; direct-work 2288 = 2297 − 9 net compare-rewrite);
verify_pcm_catalog 202/0 BW_BASE-pinned on merged main; verify_pcm_upscale 42/0; mask
script idempotent (84/84/0). Governing docs' contract number was STALE AT 2090 (drifted
through s13/s14 closes) — DESIGN §, SPRINT_GUIDELINES, DIRECTOR_GUIDELINES all pinned
to 2303/36 with a drift note. **Track A merged `bb8f1a7`** (track `36ca4dd` + director
refit `a7418f9`): 84 plates / 91 regions, every photographic inset replaced with the
ivory-oval navy-roundel placeholder; census by eye over all 699 (2011 book = line art
throughout, gate-pinned); EXPECT_PHOTO_MASKED both directions + region-file cross-check;
track's 8-case sabotage set incl. the no-op control. **DIRECTOR AUDIT FOUND THE TRACK'S
BOXES SYSTEMATICALLY SMALL** — the 91-region 4x rim sweep (original vs shipped) showed
surviving photo crescents on ~a third (932-left the tip-off; 744 half a face, 763 most
of the photo). Track agent's transcript was gone (second time — s14 C precedent), so the
refit was director-direct in its worktree: detector re-derive (chroma + smoothness) →
per-class re-anchor (the smoothness detector ATE POLISHED PANEL and stomped engraved
text on 682/834/858/985 — walked back to track-box +10%) → directional extends (14) →
hand-read grid boxes (668, 845). Five repaint iterations, EVERY one from the c670f42
originals so shipped plates stay single-generation; all 91 regions eyeballed clean in
final state. SCAR, promote: **a masking pass needs a rim sweep — diff the shipped plate
against the ORIGINAL around every region edge; the mask itself looking right at 3x is
not evidence the photo is gone.** Audit trail: scratch/s15-direct-renders/rim-sweep*/
+ scratch/s15a-mask-renders/ (final three-ups in before-after-final/). OPEN operator
items: 2011/1128 (full-plate laser etching of an infant — the etching IS the product;
NOT masked; drop the plate if he wants it gone); casket/urn catalogs still carry their
own Side-by-Side; guide-photo restores if "these shouldn't be under the examples" was
narrower than the five; PCM ships in zero built-PDF manifest jobs (s14 D finding —
no staleness rebuild needed). Worktree + s15 branches kept until push word.

**Current sprint: sprint-14 — OPENED 2026-08-03** (director: Fable session; tracks:
Opus per operator). Operator brief: three new walkthrough videos shot this morning
(TGMP 12:06 → ELM 12:17 → COM 12:27; 1080p30 HEVC, 8–14 min each, one continuous
shoot) → three photoreal splat reels (COLMAP+Brush on the 3090, s10 pipeline) + TWO NEW
MAPS: Terrace Garden Mausoleum (links TGMP_Map) and Eternal Light Mausoleum (links
ECL_NicheMap — the columbarium is INSIDE the ELM building; the memorial path is inside
the TG area; MIS overview's "Pool" is GONE, replaced by TGMP). **Operator rulings at
boot:** one reel per video (3 total); maps geometry-first, NO invented prices/statuses
("ask us" pattern), MIS exports later; reels committed but NOT LINKED family-facing
until the operator eyeballs each (COM's delisted card stays delisted); NO push
pre-authorization. Boot audit: tree clean, main==origin/main, 8 blocks 0 errors, full
suite run in progress at spawn-decision time. Three tracks in worktrees, disjoint
ownership, GPU serial inside Track A: A `s14/photoreels` (../bw-quote-tool-s14a),
B `s14/tg-maus-map` (../bw-quote-tool-s14b), C `s14/elm-map` (../bw-quote-tool-s14c).
Merge order B → C → A. Repo-growth flag: ~90 MB of splats expected — biggest delta
ever; explicit item at the push gate. The three-building MIS overview exists only as
the operator's chat screenshot — director transcribed it into the B/C track briefs.
See `sprints/sprint-14/SPRINT.md`.

**s14 POST-CLOSE ROUND — PUSHED AND LIVE-VERIFIED 2026-08-04** (`f1e1d0a..6020dc4`,
15 commits; operator: "push everything live once its done and then update our notes
and we can call it a session"). Final main: 8/0; **2297 passed, 0 failed across 36
suites**; COM slow pixel gate re-run PASS on merged bytes before push. Live verify
(scratch/s14-live-verify.mjs, extended): ALL OK — guides.html carries EXACTLY ONE
card each for COM+ELM walkthroughs and ZERO TG links on the wire; walk buttons live
on both maps; TGMP's HONOR/CELEBRATE/REMEMBER geometry serving; TG_Maus view3d
serving; vault guide's brochure copy gone from the wire ("mowers and backhoes"
present, "pinnacle" absent); pixel readback COM 99.4 / TG 100 / ELM 100 %lit, zero
page errors. **COM and ELM reels are now FAMILY-FACING; TG stays delisted awaiting
the re-shoot** (RESEARCH-outdoor-photoreels.md is the playbook). All four round-2
worktrees removed (junctions non-recursive), renders preserved in
scratch/s14-renders/, s14/* branches kept until pruned. OPEN with the operator
(carried): TG re-shoot (360-camera option); ossuary ruling (E: NO sighting
4:16–7:40, recorded); TG wings orientation one-look (G flag; director reads it as
north-wings-vs-south-tandem, consistent); ELN-W-1; crystal-room contents; MIS
exports for the two geometry-first maps; urn-placement §4 print column (chip
task_f1bfb521); casket compare 1px row headroom; "more of the building is still to
come" card wording is the director-approved track wording — reword on request.

**s14 POST-CLOSE OPERATOR ROUND (2026-08-04, superseded by the entry above):** operator word: reels look
good → LINK COM+ELM (TG stays delisted); TGMP map must match the video; TG Maus map
goes 3D; voice debrief (docs/GUIDES_VOICE_DEBRIEF_2026-08.md, now pinned atop
BRAND_AND_BUILD_LOG + in agent memory) must be IMPLEMENTED across guides; "push
everything live once its done and then update our notes and we can call it a
session." Four tracks: E tgmp-video-accuracy, F relist-reels, G tg-maus-3d,
H voice-sweep. **G MERGED (director-audited; gate 157 asserts + 24-mutation sabotage
suite re-run by director; his own ELEV-break sabotage red/green):** TG_Mausoleum_Map
gains a default 3D view (ELM idiom; 37 blocks; courtyard = click-through zone to
TGMP; wing roofs/5-course fronts/pink-speckled stone from video timestamps; heights
never printed, gate scans). G's open flag for operator: video reads two crypt walls
facing across the court; dataset has both wings on the north face per MIS — the
DIRECTOR's read is the video pair = north wings vs SOUTH TANDEM bank (consistent, no
change made); worth one look on site. G re-hit the CRLF sabotage-needle trap (\r?\n)
and found two by-looking bugs (rotateX ground-label mirror again; clipped bank labels
reading as wrong refs). **E MERGED (director-audited; both gates re-run + composition
eyeballed against the video via E's side-by-side):** TGMP re-derived from 4:16–7:40 —
enclosed sunken court (walls both sides, raised aprons), bank on 21" plinth up 3
risers with flanking urns, black polished bank field, walk-sized flagstone panel
mid-path (not a 100" circle), bench square on axis + HONOR/CELEBRATE/REMEMBER wave
sculptures, beds in two rows with 22 unpriced context memorials (regular fill,
stated), 4 large end planters; 8×5 grid now VIDEO-CONFIRMED (the s09 "position is
estimated" honesty sentence retired, gate asserts it's gone); NO ossuary sighting
4:16–7:40 (ruling stays open, recorded in module); plywood panel is at 3:04/3:44
INSIDE a corridor (boarded crypt front), not TGMP; camera scars re-hit: 892" wall
face crossed the eye plane (CSS3D drew nothing — walls now 8 bays), props preset
turned. Anchors intact ($544k+$218k=$762k/100 rights/fee math to the cent). E could
NOT settle absolute dimensions (kept s09 footprint rather than swap in a
differently-wrong one), bed drop, exact post census, handrails. Main after both
merges: 8/0; **2285/36** (twice, director's own runs — E/G asserts live in their
standalone gates, suite count unchanged). **H MERGED (director-audited: his own
sweep run — 23 in-scope files, 0 hits across all six banned classes, 2 documented
exemptions = the verbatim-quoted GOMN sheet text a gate asserts char-for-char;
verify_guide_pages + granite ranges + guides-page re-run; vault-p1 render
eyeballed — the rewrite IS the voice):** em dashes 308→0 in prose (first sweep pass
read 4 and was WRONG — guides encode &mdash;, the needle must match all four
encodings; en-dash ranges left alone, gate-asserted), inventory 9→0, counselor 3→0;
4 Tier-1 rewrites (vault/urn-placement/scattering/outside-marker-rules, every
fee/rule kept incl. the WHY of the inspection fee); guide-price-rule invite()
reworded = 17 dashes across 12 generated guides in one move; 22 PDFs rebuilt,
staleness green, caps hold. H also FIXED verify_guide_pages stricter: truncated
Ghostscript flate streams silently measured as gzip noise (inflateSync throw →
return raw) — now Z_SYNC_FLUSH fallback + exit 2 if undecodable; no assertion
relaxed. H flagged pre-existing: urn-placement §4 print table drops its 4th column
(chip task_f1bfb521 pending). Post-H main: 8/0, **2285/36**, per-suite lines
byte-identical to pre-sweep (H's diff moves no suite). **F MERGED (director-audited: his own
triple-red sabotage — swapping COM's card href to TG tripped "TG is delisted" +
"COM found 0" + category placement in ONE mutation, exit 1, 184/0 restored; guides
render eyeballed, pill 10 / both cards honest):** COM+ELM reels are FAMILY-FACING
(guides.html cards restored/added with descriptions rewritten against the ACTUAL
culled paths — no chapel/stained-glass promise, "the columbarium has its own niche
map"; COM/ELM map header .walk-btn buttons; Maps pill 8→10, cards 43→45); TG stays
delisted and BYTE-IDENTICAL (md5-proven by F). Listing is per-scene `listed` +
`mapPage` in walkthrough-scenes.mjs — mapPage deliberately ≠ sibling.href (ELM's
pricing sibling is the ECL map but its button home is ELM_CryptMap; the inferred
rule failed honest-red on ELM). Register suite 172→184 with positive
exactly-one-link asserts for listed scenes; F ran all THREE slow gates twice
(comment fixes in between) + fast suites + 7 sabotages; F also corrected the ELM
walkthrough page's own note (columbarium room is NOT on the path). verify_elm_map
sabotage set corrected 24→22 pre-existing, now 25 with F's three. Post-F main: 8/0,
**2297/36** (director's own run; 2285 + 12). All four post-close tracks are in;
push protocol executing (COM slow gate re-running on merged main first).

**Sprint-14 — PUSHED AND LIVE-VERIFIED 2026-08-04** (pre-authorized "push everything
live once its done"; `2251927..85ba8ff`, 22 commits incl. the chip session's casket
merge — the chip session started its merge IN THE SHARED MAIN TREE mid-close and the
director stood down until its MERGE_HEAD cleared rather than racing it, then re-ran
the contract on the true final bytes himself: **2285 passed, 0 failed across 36
suites** (reconciles 2255 + 30 chip asserts). Live verification (scratch/
s14-live-verify.mjs): all 3 splat assets byte-identical on the wire (24,000,000 B
each, sha256 vs local, gzip-decoded), TG/ELM maps + PCM catalog serving with
load-bearing content ("Glass wall" / "what look like crystals" / compareSheet /
"Print these"), and PIXEL readback on all three LIVE reels: COM 99.4% / TG 100% /
ELM 100% lit, zero page errors. VERIFIER SCAR (director's, caught before reporting):
first live readback read 0.0% on all three — drawImage/toDataURL on a GL context
created without preserveDrawingBuffer reads cleared black OUTSIDE the render loop;
proven a measurement bug by reproducing 0% against local, fixed by the gate's own
mechanism (addInitScript forcing preserveDrawingBuffer + gl.readPixels). The reels
are LIVE BUT UNLINKED (family-register gate enforces zero anchors) — operator
eyeball-then-link is the standing next step, per-reel. OPEN operator items carried:
drive COM/ELM/TG reels and rule on linking COM+ELM (TG honestly not showable —
re-shoot per RESEARCH-outdoor-photoreels.md, ideally with the capture protocol and
possibly a 360 camera); ossuary ruling; east-wing/tandem counts; ELN-W-1 reading;
crystal-niches room contents (walk it with a light); corridor keepsake banks
identity; MIS exports to price the two new maps; COM service door + cone on the
covered stretch. Sprint-15 candidates: TG re-shoot + retrain, MIS-export load into
TG/ELM maps, reel linking round, casket compare row-growth headroom (chip found
specs rows end 1px inside the table on all six pages).

**s14 Track A MERGED (director-audited, `b0c69d3`); merged main GREEN: 2255 passed,
0 failed across 36 suites** (director's own run; reconciles exactly: 2149 + 10
family-register reel guards (162→172) + 96 walkthrough-path rewrite (42→138)).
Three reels shipped ALL DELISTED (zero family-facing anchors — track proved it over
50 HTML files, director re-grepped; the one guides.html hit is the s11 delisting
comment): COM_Walkthrough rebuilt from the re-shoot (5 stops, marble/vases crisp —
the s11 fog delisting is answered), NEW ELM_Walkthrough (4 stops, best quality),
NEW TG_Walkthrough (3 stops, honest verdict NOT family-showable — turf renders as
spike-field; 3dgsconverter 0.9.1 cleanup attempted and recorded in
docs/SPLAT_CLEANUP_ATTEMPT_s14.md: the spikes ARE the model's turf representation,
not removable outliers; --sor_intensity alone is a no-op, --density_sensitivity is
the active flag; TG waits for the re-shoot protocol in RESEARCH-outdoor-photoreels).
Pipeline now scene-generic (walkthrough-scenes.mjs registry; build/verify_walkthrough
take a SCENE arg; paths DERIVED from registered camera poses). Director re-ran the
full COM pixel gate on merged main (PASS 0 mismatches, exit 0) + syntax + suite;
TG/ELM gates accepted on the track's serial runs (gate class ~20 min/scene, run
deliberately). A's scars worth keeping: phone clips carry a ROTATION MATRIX —
ffmpeg scale filters that look like no-ops downscale 45% (SIFT features 2805→5612
at native res); a confinement that works CANNOT be sabotaged from outside it (the
teleport sabotage measured the clamp, not the breach — sabotage must rebuild the
path with an outside stop); needle filter must use max/MID axis ratio (max/min
deletes surface discs); page.screenshot never settles on a splat viewer — canvas
toDataURL (50→20 min/gate); walkthrough gates NEVER overlap (interleaved logs
fabricate defects). Two operator rulings at push gate (2026-08-04): ELM's legible
names/dates SHIP AS-IS (s10 names-on-crypts + photo-PII precedent; page unlinked);
TG's 24 MB PUSHES TOO (drive it live, re-shoot replaces the asset). Also on the
record: COM's covered stretch shows a service door + orange traffic cone.

**s14 PUSH PRE-AUTHORIZED (operator, 2026-08-04): "push everything live once its
done."** Fires after Track A is audited+merged and the full contract is green on
final main. Push protocol: syntax check → fetch and check behind-count (the
casket-compare chip session is running against this same repo out-of-band —
integrate any out-of-band push by MERGE, never rebase) → push → live verification
(reel pages get PIXEL readback on the live URLs behind real gzip, maps get
served-byte checks). The reels ship LIVE BUT UNLINKED — the operator's
eyeball-before-linking gate on family-facing surfaces still stands (COM delisted-card
precedent); linking is a separate later word. Also queued into A mid-flight
(operator-approved): 3dgsconverter SOR/density cleanup pass on the TG model with
before/after captures, reproducible command manifest; blanket-apply to other scenes
only if their eyeballs show the same noise class.

**s14 CHIP CLOSED (zen-napier worktree, branch claude/gifted-bhabha-42ea91): the
casket compare-sheet blind spot is fixed on all six catalogs.** Track D's finding —
`scrollHeight-clientHeight===0` is BLIND under `.cmp-table overflow:hidden` — is now
closed: `scripts/verify_catalogs.mjs` and `tests/test-catalog-filter-print.mjs`
(new section 5, 94→124 asserts) drive the REAL `comparePrintBtn` (window.print
stubbed; afterprint never fires, tests strip `compare-printing` themselves — the
casket pages expose no `bwBuildCompareSheet`) with 4 items, both modes, on a true
816x1056 viewport, and assert last-row-inside-table + footer-inside-page + 4/4
items + real Chromium PDF = 1 page. Today's headroom: specs last row ends exactly
1px inside the table on ALL SIX pages (photos 6px) — fits, but any row growth
would have clipped silently. Sabotage proven both directions on the rule that
APPLIES (`body.compare-printing #compareSheet .cmp-label-cell`, the ID-carrying
rule, padding 8px→80px): gate exit 1 + suite 123/1 with the named clip FAIL (last
row −772px inside table), green on restore — and under the sabotage `over` stayed
0 AND the PDF stayed 1 page, so BOTH old-style signals were blind; only the
geometric assert catches it. **RECONCILED NUMBERS: merged main (post-Track-A +
this chip) is GREEN at 2285 passed / 0 failed across 36 suites** — exactly Track
A's 2255 + this chip's 30 (test-catalog-filter-print 94→124), per-suite output
recorded this time. That per-suite record also RESOLVED the worktree variance
(2147 in the zen-napier worktree vs the recorded 2149 on unchanged bytes): it is
test-contact-csv, 134 in a worktree vs 136 in the main tree — its
wmp-cemetery-map/ PII cross-check (2 asserts) only runs where that gitignored,
local-only directory exists, and the suite prints its own NOTE when skipping. Not
a regression; a tree-presence difference. Standing lesson stands: record
per-suite numbers alongside contract totals — it turned an unlocatable −2 into a
one-line explanation. Committed `842ca45`, merged to main post-Track-A (a true
merge — main had moved; STATE.md conflict resolved keeping the Track A and
push-preauth entries). Not pushed by this session; push per the pre-auth
protocol above.

**s14 Track D MERGED (director-audited, `c3b8649`); merged main GREEN: 2149 passed,
0 failed across 36 suites** (director's own run; reconciles 2092 + 57 new
test-pcm-catalog asserts, 165→222). PCM catalog now has casket-catalog parity:
per-card Compare (designs AND elements; photos/reference plates excluded — not
alternatives, no number to key on), 4-item tray, Side-by-Side/Plates overlay,
one-page clipping #compareSheet, paginating #filterSheet printing what's genuinely
on screen ("Print these N · k pages"; 12/page 3×4 — plates are wide/short, casket's
3/page left cells mostly empty; 700 designs = 59 pages, no cap, flagged as operator
call), and Real Examples as a fold toggle (starts OPEN — the 35 photos were already
visible; closing by default would hide content, not grant control; it's an .ex-cat
NOT .el-cat because the gate audits every .el-cat against element data). Gate
154→211; director re-ran it BW_BASE-pinned against the s14d tree AND merged main
(served-tree JSON quoted both times), re-proved the label-cell-padding sabotage
himself (first needle was a DUD — hit a lower-specificity rule that the
#compareSheet ID rule out-ranks; the real needle produced the exact 3 named clip
FAILs, exit 1, green on restore. Lesson: a sabotage needle must hit the rule that
APPLIES — check specificity, not just the class name), rebuild byte-identical on
merged main, renders eyeballed. **D's FINDING, real and out-of-scope: the s09
Track K compare-sheet check (`scrollHeight-clientHeight===0`) is BLIND on any
.cmp-table carrying overflow:hidden — rows clip silently while the check stays
green. ALL SIX casket catalogs carry that exact CSS.** D's PCM check asserts
last-row-inside-table + footer-inside-page instead; porting that to the six casket
gates is a sprint-15 candidate (chipped). Default print output proven unchanged
(sha256-identical page-1 with dates/ID blanked, captured twice pre-change to prove
determinism); PCM participates in ZERO built-PDF manifest jobs (staleness trap
checked, n/a). Facet quirk left deliberately: any book/format/colour filter hides
Installed Examples + reference plates — arguably wrong, separate ruling.

**s14 OPERATOR FIX ROUND (director-direct per lean-mode, `ca0a057`):** two operator
corrections during the sprint, both applied to the ELM map and verified (gate + 24
sabotages + ECL gate + 2092/36 + card renders eyeballed): (1) **crystal niches were
NEVER FILMED** — the room sits behind a glass door, dark, operator did not enter;
Track C's corridor keepsake-bank identification was WRONG (the confidence system
worked: it was flagged medium-high, not certain). All footage-derived interior claims
stripped; placement stays per drawing; cards say "not filmed inside — ask us to walk
it with you". What the corridor keepsake banks actually are is now itself an OPEN
question. (2) **the Pickel Wall (ELN-W-1) is the glass wall with what look like
crystals displayed inside** (operator saw it briefly in footage) — re-kinded from
'wall' (which rendered a false "Wall crypts" claim) to new kind 'glass' ("Glass
wall"), own hue + legend entry; ELN-prefix + labelUnverified guards intact. Track C's
agent transcript was gone (could not resume) — fix was director-direct.

**s14 Track C MERGED (director-audited, `d08896e`); merged main GREEN: 2092 passed,
0 failed across 36 suites** (director's own run; reconciles 2090 + 1 TG page + 1 ELM
page — test-family-register auto-discovers new family-facing pages, 160→162; post-B
main had run 2091/36). All three map gates + verify_ecl_map re-run green on merged
bytes by the director. C shipped `MAPS/ELM_CryptMap.html` (3D room view + plan +
sections; 28 named sections, 25 selectable, all "Ask us"; kind coded by hue, placement
CONFIDENCE coded by hatch, statuses reserved for the later data load) from
`elm-building-data.mjs` → `build_elm_map.mjs` → `verify_elm_map.mjs` (24 CRLF-tolerant
sabotages; director re-proved his own: inventing bank 1E → 6 named FAILs incl.
"invented: 1E", green on restore). Load-bearing C findings: **CRYSTAL NICHES ARE A
SEPARATE FEATURE, NOT THE ECL ROOM** (footage-established: ECL = the free-standing
painted island cabinet near the entry, matches ecl-niche-data exactly; crystal niches =
dark-wood bronze-mullioned keepsake banks along the central corridors); **ELN-W-1
transcribed verbatim and flagged unverified** (no signage in the footage; normalising
it to ELM would invent a reference the office can't find — sabotage prevents silent
normalization); **NO 1E in the Garden Mausoleum run** (1A-1D,1F-1I as drawn — the gap
is gate-anchored against well-meaning tidying); columbarium link-zone placement is
LOW confidence (drawing doesn't mark it; card says so). ECL anchor added (5-line
generator diff), ECL anchors unmoved (21 avail/$536,710). C's gate-quality scar worth
promoting: its sabotage needles used literal \n against CRLF sources — 6 of 24
sabotages would have silently no-opped in a fresh clone; caught ONLY because runSet
treats a no-op mutation as FAIL. That rule — **a sabotage that changes nothing must
itself fail** — belongs in the guidelines. DIRECTOR DEVIATION (own artifact, logged):
a zero-byte `scripts/elm-building-data.mjs` briefly existed untracked in the MAIN tree
— the director's first sabotage attempt used relative paths with .NET file APIs, which
resolve against the process cwd, not the shell cd; it blocked the C merge until
inspected (hash e69de29 = empty blob, no work lost) and deleted. Lesson: absolute
paths ALWAYS with [System.IO.File] calls. OPEN operator eyes from C: columbarium
placement south-end guess; ELN-W-1 reading; verify_elm_map (like every map gate) is
deliberately NOT in the pre-git-guard hook — wiring all seven is a separate ruling.

**s14 Track B MERGED (director-audited, `023642c`):** `MAPS/TG_Mausoleum_Map.html`
generated from `scripts/tg-maus-data.mjs` → `build_tg_maus_map.mjs` → gate
`verify_tg_maus_map.mjs` (84 asserts; director re-ran it, verify_tgmp_map and his OWN
price-a-bank sabotage — red exit 1, green after restore; the sabotage's red fired on
the byte-determinism assert, which is correct when data changes without a rebuild).
Geometry-first held rigorously: 29 selectable positions all `price:null/status:null`,
tandem bank's "~48" count NOT modeled (explicit positionsNote instead — inventing it
would be inventing inventory), east wing's 28 upper bound recorded as approximate
(`EAST_BOUND_APPROX`), water feature drawn but deliberately unnamed (MIS label
unreadable). Cross-links: 3 links out to TGMP_Map (header/courtyard-zone/footer) + one
5-line reciprocal anchor on TGMP's generator, its gate re-run green. Track B scars
worth keeping: CRLF emission caught from git's normalization warning (LF page would
have broken determinism on the NEXT clean checkout); Playwright's bundled ffmpeg can't
demux these HEVC phone clips — frames came out of Edge via Playwright, CPU-only.
Footage PII stayed OUT of the repo (frames/contact sheets in the session scratchpad;
gate asserts the page embeds no image). Director render-eyeballed overview + card.
Suite 2089/36 in worktree = documented wmp-map-absent variance (B proved the cause by
running the suite member solo and reading its NOTE line). OPEN operator rulings from
B: (1) the OSSUARY — MIS draws it, s09 deleted it from the TGMP map on inference, the
quote tool sells Terrace Ossuary scattering; B ships it as an inert labeled structure,
"not priced here"; (2) east wing true bank count (~28 unconfirmed) + tandem crypt
count (unsourced); (3) boarded plywood panel ≈6:40 in the footage suggests
construction on the NE face — not modeled.

**Sprint-13 — PUSHED AND LIVE-VERIFIED 2026-08-03** (operator: "push it all live";
`67e5b78..9879c94`; wire checks: all five new guide pages 200, guides.html carries all
5 new cards, live Terrace Garden PDF BYTE-IDENTICAL to the local build, 4pp). Post-push
cleanup: s13 worktrees removed (junctions deleted non-recursively first); photo
provenance manifest + both tracks' page renders preserved in main `scratch/`
(s13a-renders, s13b-renders, s13b-photo-manifest.json); `s13/*` branches kept until
pruned.

**Sprint-13 — CLOSED 2026-08-03, BOTH TRACKS MERGED (close record below; push gate
satisfied above).** Final main (director's own
runs): `8 blocks, 0 errors`; **2090 passed, 0 failed across 36 suites** (new contract
number, docs updated; reconciles 2085 + 5 family-register asserts for the new guides);
all seven guide/range verifiers green on merged bytes (page-shape incl. 31-PDF
staleness + register, area ranges 125, granite ranges, glass ranges, photo-first 23
cards / 7 pages, guides-page 43 cards, print header); all PDFs rebuilt on merged bytes
inside the B merge. SEVEN guides now photo-first: the 2 combined (redesigned) + 5 new
per-area. Guide family: 24 pages / 31 built PDFs. Repo delta this sprint ≈ +8.6 MB.
Close checklist → operator: eyeball the 7 PDFs (esp. ROAC/GOMN trailing whitespace,
gomn-setting lens flare, ecl-open-niches faint reflection, rad/ser-wall which-is-which
ruling), rule on the +8 MB, then push word. Sprint-14 candidates live in
sprints/sprint-13/SPRINT.md §candidates + the build_guides_page.py chip.

**Current sprint: sprint-13 — OPENED 2026-08-03** (same director session as s12;
tracks: Opus). Operator: granite-niches guide crops cut off the photos; guide may run
longer — a page per columbarium/niche section. Ruling: THIS guide's print cap is 8
total pages (per-guide exception, gated; all others stay 6); frames follow photos.
**s13 Track B MERGED (director-audited; conflict in verify_guide_pages resolved by
keeping A's Map cap system + folding B's five entries — 7 named exceptions at 8, shared
cap asserted 6; all PDFs rebuilt on merged bytes):** five NEW area guides — Rock of
Ages 5pp / MVC New Glass-Front 5pp / Eternal Light 4pp / Garden of Meditation 3pp /
Terrace Garden Memorial Path 4pp — 21 photos curated from ~73 candidates with
per-photo verdicts, every printed figure pinned by NEW verify_area_guide_ranges.mjs
(125 checks, 11 ranges/2 typical bands/23 counts/5 rights/fees both directions,
8-way sabotage self-test), 5 cards on guides.html (pill 10→15, added BY HAND — see
finding), director re-ran all seven guide/range verifiers green on merged main and
eyeballed ROAC p1 / TGMP p2 / MVC p3 from the MERGED PDFs. B's load-bearing photo
findings: Crystal Niche folder is NOT ECL (older brass room, = Old MVC's room);
Cremation Posts folder is NOT TGMP's posts (matches A's independent finding); Garden
Court folder is crypts. **B FINDING, chipped: scripts/build_guides_page.py DESTROYS
guides.html if run** (stale CARD_RE parses 0 cards, writes empty categories div) —
do not run until fixed; chip task filed. OPEN operator eyes: ecl-open-niches.jpg
carries a faint photographer reflection (inseparable from photographing glass);
ROAC p5 + GOMN p3 run ~60% empty (the page-per-section trade); GOMN folder has only
2 usable photos (re-shoot if he wants it fuller); repo delta +8.07 MB (separate ask
from the s12 +30 MB image cap — flag at push gate).

**s13 Track A MERGED (director-audited):** both combined niche guides page-per-section
at 6pp (cap 8), CROP ROOT CAUSE was print CSS (fixed-height + object-fit:cover = crop
by construction; both guides now single-column, width/height:auto, zero object-fit
left), 11 granite + 8 glass photos curated with per-photo verdicts (Cremation Posts
folder is the WRONG PROPERTY — pond-side garden, not TGMP's Paradiso posts; Garden
Court folder is mausoleum crypts; both wholly rejected), cap map PER_GUIDE_CAPS with
5-way sabotage incl. the bump-the-shared-cap case, per-guide print type sizes via
body[data-guide] in guide-print.css (reusable mechanism). **Track A also found and
fixed 6 checks RED ON MAIN since the s11 register sweep** (sweep deleted GOMN/Terrace
fee-provenance sentences verify_granite_niche_ranges asserts; standalone gate not in
npm test — sat red ~36h; director reproduced red on pre-merge main, green post-merge).
Suite 2083/36 in worktree = documented wmp-map-absent effect (main 2085/36). OPEN
operator eyes: gomn-setting.jpg ships with a lens-flare band (only garden-context
frame that exists); rad-wall/ser-wall NOT re-cut (three near-identical frames, can't
tell which wall is which — ruling wanted); small white temporary name cards visible on
two ROAC photos (judged family-facing signage, on the record).

Track A `s13/granite-niches-photos` spawned (../bw-quote-tool-s13a) — curates from the
operator's D:\ property-photo folders (photo-PII relaxed ruling applies; NO operational
paperwork in frame), photo-first template from BRAND_AND_BUILD_LOG, prices/ranges
untouched and re-verified. See `sprints/sprint-13/SPRINT.md`.

**Sprint-12 — PUSHED AND LIVE-VERIFIED 2026-08-03** (operator: "push it all live";
origin/main reached `50a103c` — the push landed via the shared repo moments before the
director's own push command, which found everything up-to-date; deploy verified ON THE
WIRE: live 2020/793.webp byte-exact vs the upscale manifest (49,932 B, esrgan), 700
data-facets cards in the served catalog page, rebuilt Pre-Planning PDF serving 200).
Post-push cleanup done: lossless plate masters + B's audit renders preserved in main
`scratch/` (pcm-plates-raw 63 MB, s12b-renders 35 MB; the 1 GB x4 cache was NOT kept —
a re-encode at a new size now needs the ~8-min GPU pass again); all three worktrees
removed (junctions deleted non-recursively first); `s12/*` branches kept until pruned.

**Sprint-12 — CLOSED 2026-08-03, ALL THREE TRACKS MERGED (close record below; push
gate satisfied above).**
Final main (director's own runs): `8 blocks, 0 errors`; **2085 passed, 0 failed across
36 suites** (the NEW contract number — DESIGN §5, SPRINT_GUIDELINES rule 4 and
DIRECTOR_GUIDELINES corrected from the drifted 1845/34; main was already 2000/35 at
boot); verify_pcm_catalog 154/0 served-tree-verified; verify_pcm_upscale 33/0;
verify_guide_pages (incl. 26-PDF staleness + family-register + new cream-ground/
brand-mark checks) / photo-first 13 cards / guides-page ALL green on merged main;
build_pcm_catalog byte-identical on merged bytes. Merges: B `a18f469` → A `e1e4be7` →
C (guide print). Repo delta from the image work ≈ +24 MB against the operator's
+30 MB cap (designs 22.48 MB / elements 19.75 / photos 8.75 / refs 0.94).
**Track C shipped (director-audited, eyeballed Pre-Planning p1 against the operator's
complaint screenshot):** logo restored as out-of-flow print-only navy fleur top-right
(zero page cost; vault-guide got it as ::before — it never had the img), cream
full-bleed via `@page{background}` (the only mechanism where full-bleed and margin-box
page counters coexist — @page margin:0 kills the footer, root background clips to the
content box), running header deleted generator-wide, footer on the cream by
construction, 20 PDFs rebuilt, every page count held (Outside Marker Rules 4→3), 5/5
screen screenshots byte-identical, cover gate SPLIT into cream-ground + no-cover with
3 latent gate bugs fixed (zero-byte /Contents reads, 10x-only full-bleed detection,
re-only rect detection — each found by a sabotage that wrongly passed), brand-mark
gate asserts the NAVY cut specifically (white logo.svg prints invisible on cream).
Known limitation documented in guide-print.css: @page background is Chromium-only —
Ctrl+P from other browsers shows white margins. OPEN operator eyes: 22 fallback
plates ship softer-but-honest (list in scripts/pcm_upscale_fallback.py); guide logo
size/placement; "flat" search matches only the 2020 book's 336 (2011's are physically
flat but the data doesn't say so — ruling needed to widen). Close checklist in the
director's final report; sprint-13 draft seeded at `sprints/sprint-13/SPRINT.md`.
Cleanup NOT yet done: s12 worktrees + branches kept until the operator's push word
(node_modules junctions in s12a/s12b/s12c must be deleted NON-recursively:
`[System.IO.Directory]::Delete($p,$false)`).

**Current sprint: sprint-12 — OPENED 2026-08-03** (director: Fable session; tracks:
Opus per operator). Operator request: PCM catalog image quality "not very good at all"
when enlarged — improve with AI — plus mid-boot: typing "companion" must show all
companion designs. Boot audit: tree clean, main==origin/main `1887e92`, `8 blocks, 0
errors`, **2000 passed, 0 failed across 35 suites** (the merged-main run the fix-round
entry was awaiting — this is the new contract number). Director probes established the
quality ceilings: design plates embedded at 347×199 in both books (AI is the only route
up), Elements book embeds 270–360px tiles vs our 150px cut (native re-extraction wins),
photos cut at 760px from ~4000px originals, lightbox stretches to min(96vw,1100px).
**Operator rulings at boot:** all four image classes in scope; repo growth cap +30 MB
hard (per-dir budgets in SPRINT.md); Real-ESRGAN ncnn-vulkan on the 3090 authorized
(binary in scratch/, extends the 2026-08-01 install ruling); format/category search
layered on the E2 subject search; NO push pre-authorization. Two tracks in worktrees,
disjoint file ownership, spawned in parallel 2026-08-03: **B** `s12/pcm-ai-upscale`
(../bw-quote-tool-s12b — lossless plate export → Real-ESRGAN → ~720px webp ≤20 MB,
manifest + standalone gate that never re-runs AI) and **A** `s12/pcm-native-res`
(../bw-quote-tool-s12a — elements native-res anti-aliased ≤28 MB, photos 1600px ≤9 MB,
references re-rendered ≤1 MB, companion/individual/ledger/flat format search with lit
chips, verify_pcm_catalog extended). Merge order B → A (A rebuilds data+HTML last on
top of B's plates). See `sprints/sprint-12/SPRINT.md`.

**Tracks B and A MERGED (director-audited, `a18f469` + `e1e4be7`); merged main GREEN:
2085 passed, 0 failed across 36 suites** (director's own run; reconciles 2000 + 33
upscale suite + 52 new catalog asserts), 8 blocks 0 errors, verify_pcm_catalog 154/0
(served-tree-verified), verify_pcm_upscale 33/0, build_pcm_catalog byte-identical on
merged bytes. B round 2: 700px on the raised 24 MB budget (22.48 MB exact-bytes on a
fresh checkout), full-699 eyeball sweep → 22 plates (3.1%) swapped to no-AI Lanczos
(20 garbled-text incl. two CHANGED DATE DIGITS — 2011/2251 2008→2009, 2011/2268
28→26 — and 2 granite-crazing), per-plate reasons in scripts/pcm_upscale_fallback.py,
manifest method split gate-asserted both ways; B deviated from the director's Hamming
instruction for the fallback (Hamming degenerates ~bilinear when ENLARGING; Lanczos is
the enlarging kernel) — correct call, accepted. Director eyeballs on the live merged
page: PCM 793 lightbox crisp (names/dates/faces correct), companion search 130 cards
all chipped, element lightbox smooth. Renders: scratch/s12-director-renders/ +
s12b's swap three-ups. Track C (guides) still in flight.

**Track B ROUND 1 REPORTED; director sent it back with two rulings (2026-08-03):**
B shipped 640px/q70/Hamming (19.85 MB ≤ its 20 MB sub-budget), x4plus over anime
(anime smears granite grain — decisive render kept), GPU-verified 3090 run, lossless
re-export first (each plate = granite RGB layer + grey art layer at the same rect;
extract_image alone loses ALL lettering), byte-deterministic encode, sha256 manifest +
26-assert gate sabotaged 5 ways. Two honest defects: sub-5px epitaph lines return as
confident WRONG letterforms ("Balovad Wlfa"), and some granite re-imagined as crazing
(2020/987). Director rulings: (1) designs budget raised to 24 MB — sprint-wide total
has headroom under the operator's +30 MB cap — re-encode at 700px (23.06 MB measured,
restores the ≥700px gate spec); (2) full-699 hallucination sweep by eye, swap affected
plates to plain Hamming-from-lossless (manifest records per-file method, gate asserts
the split; stop and report if >70 plates). B's x4 PNGs cached in scratch/ so re-encode
is ~2 min, no GPU. B also flagged: DESIGN §5 suite numbers stale (independent of Track
A's same finding); killed 3 stray dev-servers incl. possibly the main-tree 3737.

**Mid-sprint operator additions (2026-08-03):** (1) "companion" search ruling arrived
at boot and went into Track A. (2) Guides complaint with screenshot — "took a step
back… missing all bonney watson logoes… margins are supposed to be stretched to the
edge… do not need a header and the footer should just overlap with the cream… the
guides do not look good at all" — **Track C** `s12/guide-print-design` spawned
(../bw-quote-tool-s12c, Opus): logos restored (REVERSES the s10 print-hidden ruling),
cream full-bleed, running header removed, footer seated on the cream, 19 PDFs rebuilt,
caps hold. Merge order now B → A → C.

**Track A CORRECTION (2026-08-03): the 144/10 audit failure was the DIRECTOR falling
into the port-3737 served-tree trap** — verify_pcm_catalog's DOM half graded main's
page (3737 serves main) while its disk half read the worktree; A's own runs had used a
BW_BASE pin its report omitted. A's new `de5185f` makes assertServesThisTree the
gate's FIRST statement — director re-proved both directions himself (bare run in the
worktree now exits 1 loudly naming both trees; BW_BASE-pinned at a worktree-rooted
3765 server → 154/0 on clean committed HEAD). A stands green: 154/0 gate, 165/0 suite,
2050/35 npm test on committed bytes. LESSON, promote to guidelines: every verifier
that reads disk AND fetches a served page must call served-tree-check before its first
assert — the PCM gate was the last one missing it; and track reports must quote the
EXACT env-pinned command they ran.

**Track A REPORTED (awaiting B for merge-order):** elements re-extracted at the book's
true native ceiling (270×270@150ppi; palette-8 PNG, 19.75 MB ≤ 28), photos 1400px/q46
(NOT the brief's 1600 — 1600 cannot fit 9 MB at shippable quality; 8.75 MB), references
130dpi webp 0.94 MB ≤ 1; format/category facet search with lit chips ("companion" 130
incl. 6 companion-ledgers, gate asserts the 124 fmt=companion are a subset; "companions"
plural now works, was 0); gate 113→154 checks reading raw bytes with floors derived from
shipped history; suite 2050/35 in-tree. Honest flags: element lightbox is STILL ~3×
soft at 890px — 300px is the source ceiling; AI-upscaling elements is the follow-up
candidate if the operator wants more (Borders&Panels are vector, could re-render any
dpi). DESIGN §5 / SPRINT_GUIDELINES rule-4 contract numbers are stale (say 1845/34;
main is 2000/35) — director to fix at close. A killed+restarted the main-tree 3737 dev
server mid-track (process names indistinguishable); A's worktree node_modules junction
must be deleted non-recursively (`[System.IO.Directory]::Delete($p,$false)`) before
worktree removal.

**Post-close operator fix round, 2026-08-02 (in flight, awaiting operator push
word).** After the s11 push the operator drove the live surfaces and filed a
rapid round: (1) in-marker prices too small → 10.5px, verified by render;
(2) boats count under fishing in PCM search; (3) the Radiance Family contradiction
is ANSWERED BY THE LIVE PHOTOGRAPHS — standing ruling, recorded in the data
module; (4) PCM lightbox never actually enlarged (max-* never upscales; 360px
plates opened at card size) → width-forced to min(96vw,1100px); (5) examples
gallery re-curated by a track that graded all 228 photos (11 out, 11 in) — the
DIRECTOR'S material audit then caught THREE of the additions as BRONZE at full
resolution (ELBERT, NELSEN, DILL: screw-mounted date scrolls, cast vase hub) in a
granite-only catalog; replaced with verified granite (58 mahogany, 174 blue-pearl
etch, 138 black laser portrait); CRISTOBAL proved to be genuine granite and stays
(Track E's original bronze call was wrong); (6) THE BIG ONE — the operator caught
"operator, 2026-08-01" and Lot-Inquiry/export/SNAPSHOT language rendered on the
COM map: "never something a family sees." Track A2 swept the whole internal
register off all 43 family-facing surfaces (full before→after table in its
report), upgraded _no_mis_assert.mjs into a 20-term FAMILY-REGISTER GATE wired
into every map gate + verify_guide_pages (new surfaces inherit automatically;
155-assert suite; 4 sabotages both ways), fixed the stained-glass slab that
occluded bank 116-123's crypt fronts (new gate: no decor on any purchasable
front, 94 objects × 19 bands; also caught 2 pre-existing offenders on Radiance),
and DELISTED THE WALKTHROUGH (operator, seeing mid-glide fog live: "This is not
something I can show to families") — card + header link removed, page/builder/
gates intact for the post-re-shoot return. Director scars this round: an
incomplete `git add` left 18 rebuilt PDFs uncommitted while the manifest recorded
their hashes (fresh clone would have failed the gate) — caught and completed; the
lesson "check rendered REGISTER, not just banned words" is now a gate, not a
practice. Suite 1998/35 on A2's tree; final merged-main run pending. Lean-mode
policy adopted: operator fix rounds are director-direct with one combined verify
pass; tracks reserved for feature-sized work.

**Current sprint: sprint-11 — OPENED 2026-08-02** (director: Fable session; tracks:
Opus). Source: operator session notes + the two MIS wall sheets (originals at
`D:\Cemetery Photos Misc\Radiance and Serenity Niches\{Radiance,Serenity}.png`).
Boot audit clean: tree clean, main==origin/main `9e9dd34`, `8 blocks, 0 errors`,
`1538 passed, 0 failed across 31 suites`. Director drove the walkthrough headless:
renders 56fps but smeary on-path, fog off-path — capture problem; re-shoot queued.
Six tracks: A COM niche walls (RAD/SER split selections, true sizes from the sheet
PNGs, floor-plan section isolation), D guides wave-1 (covers OFF everywhere —
REVERSES the s10 cover decision by operator ruling — MIS sweep on all family-facing
surfaces, photo-first redesign of 5 property guides), B marker guide split (two
PDFs; ALL-IN group totals G1T/G1NT/G2 printed inside the scale-guide markers),
E PCM flat-marker design catalog (three PCM books on D:, 30 curated real photos,
publishes public per Batesville precedent), C catalog filters + print-filtered
(3/page caskets), F walkthrough constrained to filmed-path stops + preview label.
**Operator rulings at boot (2026-08-02):** covers off + key-guide redesign this
sprint (rest next); marker totals are all-in (marker+engraving+setting); PCM
catalog publishes like other catalogs; walkthrough constrain+keep; never render
"MIS" family-facing; sheet prices stale — sizes only; NO push pre-authorization —
push is an explicit close-gate ask. Waves: A+D → B+E → C+F; merge order
A→D→B→E→C→F. See `sprints/sprint-11/SPRINT.md`.

**Track A MERGED (director-audited, `884471d`):** COM niche walls. Size classes
PIXEL-MEASURED from the operator's two wall sheets by new
`scripts/measure_niche_sheets.mjs` — Serenity is drawn to scale (rows K/J/B/A =
[L,S,S,S,S,L], H–C = [L,L,L,L], every row 88.5"); Radiance is NOT to scale, solved
uniquely by constant-row-width over the four legend widths (rows K/H/F/C/A =
S L S L L S L S; J/G/B = the permutation; E/D = X F X X F X; every row 165").
**Director PHOTO-CORROBORATED both walls at the operator's request** (Chapel of
Memories 20260729_124445.jpg = Radiance: column-1 widths alternate exactly as
assigned, E-2 Family is a real double-height compartment; the 20240404 photos =
Serenity). FAMILY DISCREPANCY open: legend says same height/double depth, sheet
draws two rows tall — modeled as drawn, needs an inventory-system answer. RAD/SER
are separate selections; floor-plan section click isolates that section (all 19);
COM "MIS" sweep done (8 tokens remain, all in comments). Positional size checksums
RAD 592888 / SER 225852 guard the permutation blindspot; 13 sabotages proven both
directions; director re-ran gate + his own K/J-swap sabotage (exit 1) + rebuild
byte-identical. Anchors held: 122 niches / 27 avail / RAD $156,115 / SER $76,960 /
781 crypt units. Suite 1536/31 in worktree (documented env number), 1538/31 on main
post-merge. OPEN operator eyes: unpriced-niche chip now reads "CONFIRM" (ask-us
wording on the card); Serenity 3D labels crowd at fly-to zoom (truthful — LOD floor
raise available). Track A also filed a chip: tests/test-august-promo.mjs hardcodes
port 3737 (only suite skipping _base.mjs; fails in any worktree on a foreign port).

**Track D MERGED (director-audited, `e58ad6c`-ish; PDFs rebuilt on main's bytes in
`688c51b`):** covers OFF all 19 guide PDFs (generator no longer emits them; cap
re-based to 6 TOTAL pages; verify_guide_pages' cover gate INVERTED to
no-full-bleed-page + stranded-sheet gate now measures page 1, closing an Infinity
hole); MIS sweep — zero rendered "MIS" across 25 surfaces (19 guides + guides.html
+ 5 maps via data modules/builders, anchors unmoved, new `_no_mis_assert.mjs` wired
into all five map gates, 3 sabotages); photo-first wave 1 on urn-placement +
cemetery-property (+ photo/prose work on granite-niches + glass-front) with new
`verify_photo_first.mjs` (recomputes every printed range from live modules; wired
into the push hook additively). Every guide lost exactly one page. Template
documented in BRAND_AND_BUILD_LOG before §5. Director re-ran all verifiers on
merged main; the staleness gate fired cross-tree (worktree-built PDF hashes vs
main's checkout bytes — same as s10 close) and the director rebuilt all 19 PDFs on
main's bytes (`688c51b`), then ALL green: photo-first 13 cards, guide pages,
guides page, catalogs, COM/GOMN/ECL gates PASS. OPEN operator eyes: the Cemetery
Property Guide's all-columbariums range prints $2,195–$82,500 (honest, computed —
split it?); photo gaps recorded (lawn crypts, scattering gardens folder EMPTY,
ground-burial scene, veterans); masthead logo stays print-hidden (costs pages).
Wave 2 SPAWNED: B (marker guides, s11b worktree) + E (PCM catalog, s11e).

**Tracks E, C, F ALL MERGED; origin port fix integrated; final main GREEN at
1799/34** (director's own run; arithmetic reconciles 1538+58+67+42+94; suites
31+3). E2 (PCM subject search) IN FLIGHT — see below.

**Track E MERGED (`74a537d`):** pcm-design-catalog.html — 700 designs (2020 book
354, 2011 book 346) by the books' own categories, PCM number dominant + jump box,
3,973 elements in 18 on-demand categories, 30 curated real photos + the 5
markers-guide photos by reference, 13 reference plates; data→build→gate (pcm_extract.py
/ build_pcm_catalog.py / verify_pcm_catalog.mjs 67 checks + suite, 7 sabotages);
flat-granite-only proven by looking (ledger plates measured, "Silver Bronze" is a
granite colour); real bug caught: PCM 2271 printed twice in the 2011 book, now a
gated crossListed record. 16.75 MB / 4,717 files added (operator size note at push
gate). Websites scoped: designmemorials.com ideas adopted (number-first, jump box,
reference tools); pacificcoastmemorials.com had nothing structural. Director
re-ran gate on main (67/0) after killing a STALE s11d-rooted server on 3737 that
the /__served-tree identity route exposed (the cranky fix earning its keep).
guides.html pill collision (B+E both bumped Markers & Memorials) resolved to 4 by
the director (`53be9d1`).

**DEVIATION (director-owned, logged):** Track F was spawned INTO THE MAIN TREE
while merges remained, so the E merge + pill fix landed on F's branch while the
main REF stayed behind; repaired by `git branch -f main` onto the (linear-descendant)
merge commit — content verified intact, F simply continued from the newer base.
Lesson re-learned (s09 Track S had the same shape): never spawn a main-tree track
before the merge queue is empty. Also mid-sprint: the operator's chip session
pushed `6bef055` (test-august-promo reads BASE from _base.mjs — closes Track A's
port-3737 chip) to origin; the chip's "pull --rebase" advice was REFUSED (would
flatten seven --no-ff merges) and the commit was integrated by `git merge
origin/main` instead. Main is now strictly ahead of origin; NOTHING PUSHED.

**Track F/F2 MERGED:** walkthrough constrained to a 7-stop polyline through the
well-reconstructed region (chapel→stained-glass, 9.93m); look free, scroll/arrows
ease along the path, every escape vector removed at one choke point (view-matrix
injection attempt stays on-path to 1.4e-16 m); "photographic preview / more still
to come" label; verifier now pixel-gates EVERY stop (lit ≥85%, stdev/colour/detail
floors + camera-position readback from the actual draw matrix) — sabotage into fog
= named FAIL. First F agent died on a 401 mid-work; F2 inherited, audited, kept the
work, fixed 3 things (SHOTS path, doubled word, whitespace-brittle test). NOTE the
walkthrough gate is ~45 min under SwiftShader and NOT in npm test — run it
deliberately when that surface changes. Path JSON is tracked; never hand-place
stops without re-running the gate.

**Track C MERGED:** filters + print-what's-filtered on all six catalog pages. The
faceted engine existed; C added the shared 10-step price ladder (empty bands never
render) + `f.order`, and the paginated `#filterSheet` (static-flow pages,
break-after, fixed item heights — compare's position:fixed sheet CLIPS and was left
untouched). 3/page caskets (3.1in photos), 4/page urns/keepsakes. Sabotage asserts
a real Chromium PDF page count (reverting to compare's CSS → 4 pages collapse to
1, named FAIL). Print-media page-1 byte-identical ×6 → no catalog-PDF rebuild
needed, proven Track-K-style. Found+fixed pre-existing: build_all_caskets.py facet
regex dead since the 2026-07-30 Cremation facet (exited 1 before writing, nothing
corrupted). OPEN operator: price-ladder break points/labels are the track's;
no confirm on huge prints (button states "Print these N · k pages"); dead
Placement facet on cremation/rental page pre-existing, untouched.

**Track E2 MERGED (director-audited; the sprint-11 close):** "if I type rose or flowers
it should show me all the PCM designs and elements that have roses or flowers" —
all 700 designs subject-tagged by eye via 30 contact sheets (357-term vocabulary, 3.19 tags per design, zero untagged; elements rule-derived by stem), 280 family-word synonyms (plural-tolerant), search matches designs AND elements with lit tag chips explaining each hit; PCM gate now 113 checks; sabotage proven both directions (curated + derived files). Director spot-audited 4 sample designs against their images (all accurate) and eyeballed the roses search render (51 designs + 116 elements, all genuinely roses). FINAL MAIN: 8 blocks 0 errors; 1845 passed, 0 failed across 34 suites (1799+46, reconciles); PCM 113/0; guides page ALL OK. Contract docs updated to 1845/34. PUSH EXECUTED per pre-authorization.

**Track B MERGED (director-audited, clean merge):** ONE markers-guide.html generates
TWO PDFs via `?part=sizes|photos` (`data-print-part` + the guide's own print CSS —
deliberately not two HTML files, so the eighteen prices exist once): "Granite Marker
Sizes and Colors" 3pp (all-in totals INSIDE each to-scale marker at 4.6px/inch:
`(stone_with_standard_engraving + setting) × 1.104`, exactly the tool's quote line,
composition footnoted on the PDF) + "Marker Photos and Etching" 5pp (portraits,
diamond/laser etch, true-size photo outlines restored to print after the s07 hide).
Old Granite Marker Guide.pdf deleted, manifest 26 jobs, `?part=` stripped before
manifest recording (else the staleness gate silently stops watching the guide).
78-assert test-marker-guide-prices sabotage-proven to the cent. Suite 1594/31 in
worktree, **1596/31 on main post-merge** (the new contract number). OPEN operator:
Design Inspiration lives in the SIZES pdf (filled an empty page); both PDFs' running
header still reads "Granite Marker Guide" (per-part header = print-system change);
photos-p5 heart outline page is the weakest layout.

**Track D2 MERGED (director-audited, `8c389c1`):** typical bands. Glass-front
"most niches" band = middle 50% nearest-rank of AVAILABLE glass prices, computed by
new shared `scripts/_typical_band.mjs` (both verifiers import the one method;
endpoints are always real niche prices — interpolation rejected because it prints
figures no niche carries): glass aggregate **$8,000–$16,000** over 193 (ECL 21 avail
/ MVC 145 openings — the page's existing population definition / RAD 17 / SER 10);
cemetery-property columbarium card leads with the ALL-niches band **$9,895–$14,000**
(554) because that card spans granite too — glass band leads the glass guide §6.
Full spans demoted to secondary lines; "percentile" never rendered; TGMP exempted by
computed rule (its middle 50% is nearly its span). Sabotage proven both directions
incl. a module-price change that moves the band but NOT the min/max. guide-price-rule
suppressChips taught data-typical (without it print stripped all four bands — found
by render). Merge conflicted across all 19 PDFs + manifest + build log (both sides
rebuilt); director resolved by keeping both log entries, dropping the replaced marker
PDF + its manifest job, REBUILDING all PDFs on merged bytes inside the merge commit;
all guide verifiers re-run green. D2 notes: one unreproducible 17-suite Playwright
launch failure (flagged, two clean runs after); build log's "14 cards" claim was
already wrong at HEAD~ (13). OPEN operator eyes: the trimmed glass-guide closing
footnote and "Most niches $9,895–$14,000" wording on the cemetery-property card.

**Guide-PDF A+ system PUSHED LIVE 2026-08-01/02 (session close).** Track P3 audited all
26 PDF-linked artifacts (verdict: prints of web pages — no covers, no folios, stranded
blank sheets, 0.00–0.40" margins, THREE identities, and six guides shipping
file:///C:/Users/... links leaking the username + a worktree name). Operator chose A+
(polish + generated covers, packet C later) with the RANGE-ONLY pricing rule: printed
guides keep computed ranges, per-item prices/fee tables come OUT, families ask Martice
for exact quotes; web pages unchanged; catalogs + GPL untouched (GPL fully as-is per
operator). Track P4 built it: scripts/guide-print-system (generator, idempotent),
guide-print.css @page margins + running footer (name/phone/email, Page X of Y),
generated covers (photo where a real scene ships, typographic else), guide-price-rule
applied mechanically, file:// eradicated via _print-server (HTTP + Pages-origin
anchors) + gate, .build-manifest content-hash staleness gate, 33mm masthead cap.
Cap ruled SIX PAGES TOTAL (GUIDE_MAX_PAGES=5 interior). Terramation: operator-supplied
tree cover (terramation-images/memorial-lawn-tree.jpg) — which exposed a deterministic
blank-cover bug (cover hero = CSS background on screen-hidden element; page.pdf never
waits for it; unnoticed while every hero doubled as a body <img>) — builder now waits
for .pc-photo backgrounds. Terramation guide needed NO content additions: it already
carries Return Home, the soil story, and no-chemicals better than bonneywatson.com.
**FUTURE (operator): translated guide editions (site serves KO/VI/ES/UK/ZH) — do once
he "feels better about the state of the guides." Family packet (Option C) also
queued.** Session closed with all work pushed.

**Track S (MIS statuses ×3) + G2 + E3+M ALL PUSHED LIVE 2026-08-01** (`fa71607`).
The whole map family is now MIS-backed. ECL: statuses split occupied 36/reserved 28
(availability unmoved at 21/$536,710, perfect reconciliation vs the operator's list);
rights=2 per operator, stated on cards + glass guide. GOM: 92 occ/54 res/18 avail/
2 hold (B-10, D-18 On Hold per operator)/2 unruled; **Level-C discrepancy RESOLVED —
11 is correct, the summary's 12 was wrong** (settled by the operator's MIS wall
screenshot + the inquiry independently). ROAC: hand-maintained drift was 349/350
(only G-EXT A-1 available→not-for-sale); **118 interior niches REPRICED downward**
(A/G-INT and B/D/F-INT ladders, ~-$1,100–1,600 each), available 303/$3,626,785;
benches sold, 4 rights each (operator). Movement feel live on all five 3D maps
(ROAC = presets+inertia only — its camera has no position axis; floor-walk there
needs a camera-model change, operator ruling pending). Contract 1538/31; sabotage
suites now exist on ECL (20) and ROAC (28) — their headers had CLAIMED teeth that
didn't exist; Track S also fixed ROAC's absent fee assertions and a pre-existing
4.39:1 chip.
**OPEN (operator):** ROAC D-INT D-5 exports $16,495 where its face/level ladder says
$14,995 — reprice miss or real?; GOM B-7/B-11 read "Not For Sale" in two sources —
ruling pending, ship as unavailable; bench export shows 2 positions/bench vs the
4-rights ruling (depth notation, flagged); ECL legend's unused "Not Priced" swatch.

**N3 (dignified crypt fronts) PUSHED LIVE 2026-08-01** (`b3db930`): refs off the 3D
fronts (hover/card/callout/flat grids keep them), prices take the LOD with per-cell
`--pmax` ceilings (a wide companion can't shout over neighbours; nothing clips), tier
palette moved from signal hues to stone materials (slate/verdigris/moss/bronze/
terracotta/porphyry, all ≥5.2:1, saturation gate ≤0.34 so it can't be quietly
re-brightened), statuses lifted out of near-black; contrast now measured off the BUILT
page, not the data module. Contract 1538/31 green; deploy verified. NEXT CANDIDATE if
the operator wants calmer still: the 1px white available-cell border is now the wall's
brightest element.

**Sprint-10 COM finishing batch — PUSHED AND LIVE-VERIFIED 2026-08-01**
(`9b6c295..155739c`). Shipped: N (search/jump over all 903 positions, camera-controls-
semantics damping + inertia + floor-click walks with reticle, near-full-bleed scene,
LOD labels 23.9px desktop/16.9px phone at fly-to distance, family callout, fee toggles
Recording+O&C default UNCHECKED per operator, price-provenance prose removed), N2
(overview→inside entry eases the full camera state ~0.6s, 23+ measured intermediates,
interruptible — fixed after the DIRECTOR'S own hands-on drive found the snap), Y2
(walkthrough black-screen root cause: worker's Float32Array view over a buffer sized
from the GZIPPED Content-Length — 23,174,686 % 4 == 2 — threw on first message;
loader now sizes from received rows only, gate runs its whole render pass behind a
gzip proxy + vertexCount===bytes/32 assertion; LIVE pixel-verified post-deploy:
750,000 vertices, 99.9% lit, 0 errors), follow-up email subjects reworked per operator
(per-type, first-name: "[First]'s marker — whenever you're ready" / "Thinking of you
and [First]" / "Thinking of you and your family" / "Thinking of you since [First]'s
service"; auto-subject follows category until edited). Contract now **1538/31**.
**Director scars this batch:** reported the live walkthrough "healthy" from presence
checks (canvas/GL/api exist) while it rendered 0 lit pixels — operator caught it; only
pixel readback counts as rendering-verified, and post-deploy pixel checks are now the
close-gate norm. And the director edited followup-letter.html without re-running the
tracked suite — Track Y2's contract run caught the 5 stale subject assertions.
OPEN: operator's "not all the spaces are tandem crypts" remark never resolved to a
specific defect (type census is 480 tandem / 189 single / 84 deluxe / 28 hidden from
the sheet's own headers; massing is per-bank deepest-segment). Ask what he was seeing
if it recurs.

**Sprint-10 COM batch (2026-08-01) — PUSH PRE-AUTHORIZED: "once its done and verified
push it all live."** Fires after the final Z2 commit is audited+merged, the walkthrough
verifier is hardened (it can exit 0 after a headless browser crash — hollow-gate
defect, director-owned fix), and the full contract is green on final main. Merged so
far, all director-audited: X (chapel/corridor geometry from the walkthrough video),
X2 (RAD/SER placed from footage + rose-marble zones + type-derived bank depths:
tandem 95 / single 47, island exempt+documented), Z (statuses MIS-backed from the
8/1/2026 lot inquiry — 1355 rows reconciled, PII sweep proven empty), Z2 part 1 (694
CSV prices loaded, tandem prices proven stamped-not-summed 3 ways, sheetRaw deleted as
9/10 wrong), Z2 part 2 (crypt fees from the QUOTE TOOL per operator: O&C $1,205 /
Recording $235 / monobar $1,670; niches explicitly untouched, boundary gated both
ways), Y (photoreal walkthrough: COLMAP+Brush on the 3090 — Postshot activation never
materialized on disk despite operator sign-in; 22.89 MB splat, chapel photoreal,
glass-front walls DON'T reconstruct — needs a re-shoot that circles back).
IN FLIGHT: Z2 part 3 = operator rulings: available iff MIS-available AND price>0
(378 expected), A-183=$24,995 split-row exception, E-166 not offered ($0), bank
116-123 tier G retyped 8 singles → 4 companion pairs @ $45,990 (units 785→781).
Operator rulings log (all 2026-08-01): whole walk is inside COM; crypts ~2 caskets
deep when tandem; software installs + 3090 use authorized; crypt O&C+recording from
the tool, CRYPTS ONLY not niches; urn-garden rights fix pushed earlier (57ee209).

**Current sprint: sprint-09 — CLOSED AND FULLY PUSHED 2026-07-31** (operator: "push it all live"; 21f697d..5240db6; deploy verified on the wire — August banner + cmp-cols serving). Eleven tracks (A, B, C, D, D2, M,
U, S, T, I, K) all merged and director-audited. **Final main: `8 blocks, 0 errors`;
`1534 passed, 0 failed across 31 suites` (director's own readable run); baseline:
from the 2026-07-26 reference exactly `generateCirgasPacket` sheets 7/8 moved (Track
A's Memorial Order banner strip) and NOTHING else** — proven by the chain
s09a-audit-vs-pristine-reference (13/14 + the named change) then close-capture-vs-
re-captured-reference (14/14). NOTE: someone re-captured the `before` reference
untagged mid-sprint (MISTAKES #7 repeat) — the pristine 2026-07-26 archive still
exists beside it. **Everything through Track T is LIVE (pushed by a chip session,
see the mid-sprint push event below). Tracks I and K — the August incentives and the
casket-comparison fix — are LOCAL, 4 commits ahead of origin, awaiting the
operator's push.** Close-gate checklist in the final report + sprint-10 draft at
`sprints/sprint-10/SPRINT.md`.

**MID-SPRINT PUSH EVENT (2026-07-31 ~19:52, logged for the record):** a chip session
(the served-tree/price-update diagnosis work) ran `git pull --rebase` on the shared
main — FLATTENING all sprint-09 `--no-ff` merges into linear commits (the exact
SPRINT_GUIDELINES scar; triggered by CLAUDE.md's blanket "pull --rebase before you
start" rule — the two rules conflict and should be reconciled) — merged its
`claude/cranky-thompson-5cd19a` branch, and **PUSHED main live**. The director
verified the rebase content-pure (`git diff 8494b54 fa2625c` empty) and accepted the
linear history per the sprint-06 M5 precedent. The cranky merge is the REAL fix for
the all-sprint port-3737 artifact: dev-server `/__served-tree` identity route +
missing-files-404 (kills the SPA-fallback hazard), served-tree-check via identity
route→nonce probe→byte-compare, `tests/_base.mjs` single port source, run-all
auto-reroute off foreign servers, price-suite premise gate, 8-assert regression suite.
Everything through Track T is LIVE (director spot-checked 4 deployed URLs incl. Rose
UG $4,395); Tracks I and K merged locally after the push and await an explicit push.
Track I was integrated by cherry-pick (`2868de4`, merge `258cbbb`) because its branch
ancestry predated the rewrite.

**Track I MERGED (director-audited, `258cbbb`):** August incentives replace July —
banner/financing/optgroup/compare-calc all reworded (July remains only in month lists
and comments); burial 10% / cremation 20% (2nd rights excluded, label says so) /
maus rows E-F-G 20% via a new checkbox that round-trips save→load; O&C −$1,000
burial / −$500 cremation per space, capped at actual, stacking as previous months;
ECF never in the discount base; rights fold-in REMOVED for all August modes; internal
mode ids kept so saved July quotes load and recompute at August rates (asserted both
persisted shapes); Family 45-Day untouched. 59-assert suite; track's own A/B baseline
14/14 identical on its port. **OPEN for the operator: generate ONE mixed-rate (10%+20%)
quote's RIC and eyeball `compactDiscLabel` in Acrobat — the blended `13.3%`-style
label is up to 2 chars longer than any July value and RIC field overflow only shows
in Acrobat.**

**Track K MERGED (director-audited, `768d3fa`):** the side-by-side comparison sheet
(operator complaint w/ screenshot) now fills the page on all SIX catalog pages (the
brief said five; urns-guide.html carries the identical block — all six md5-identical
before and after): photos 110px fixed → 334px at 2 items / 218 at 3 / 161 at 4 via
`cmp-cols-N`, footer at the page bottom (636→1056 of 1056, overflow 0 — matters
because the sheet is position:fixed so overflow CLIPS not paginates), screen overlay
scaled too, object-fit contain. Proven not argued: catalog PDFs need no rebuild
(print-media page-1 IDENTICAL ×6 with no compare active); `build_all_caskets.py`
re-run came back byte-identical (the compare block survives regeneration; hazard
recorded in the build log — build_all_caskets templates from wood, build_cremation_rental
from urns-guide). verify_catalogs ALL PAGES OK re-run by the director post-merge.

**Current sprint: sprint-09 — OPENED 2026-07-31** (director: Fable session; tracks:
Opus). Sources: three operator docs (`Quote Tool Issues 07.30.26.docx`, `Map Issues
07.31.26.docx`, `followupemailtoolhandoff.md`) + the urn-garden packages workbook
supplied mid-boot. Boot audit clean: tree clean, main==origin/main, `8 blocks, 0
errors`, `1327 passed, 0 failed across 27 suites`. Eight tracks (A quote fixes, B
follow-up emails, C glass fees, D GOMN+granite, U urn pricing, S scattering move,
T TGMP layout, M COM rework flagship) — see `sprints/sprint-09/SPRINT.md`.
**Operator rulings at boot:** Interlude Urn (Matthews) $665; GOMN fees = MVC June-2026
schedule (O&C $875 / Rec $235 / Insc $660 +10.4% on inscription, toggle ×2); all
glass-front niches O&C $875 / Rec $235 / NO inscription / 10% ECF / no tax except ECL
vase+scroll add-ons; **Rose Urn Garden priced at last: $4,395 + $660 ECF** (from the
06/2026 packages sheet — closes the sprint-08 open item); COM and TGMP reworks both run
this sprint. **NO push pre-authorization this sprint — push is an explicit close-gate
ask.**

**Track A MERGED (director-audited, `3258c51`):** four quote-tool fixes on `s09/quote-fixes`.
(1) At-Need commission worksheet F6 was summing the three Commissionable Sale boxes —
which exclude ECF, discounts, O&C, recording, setting — so a $5,070.96 case printed
$2,305; F6 is now the quote's own grand total ("Total Contract Amount Paid", auto-filled
on both import paths, editable), commissionable subset printed separately. (2) CIRGAS
co-purchaser is prepended (deduped, capped at 4) into the IOA's own signer list at
generation time — SIGNATURE #2 on IOA ADDL SIGNERS — and I65 "Number of Signatures
required" ≥ 1 + filled blocks. (3) `anclImport()`/`anclImportFromCirgas()` route
decedent→Recipient/Deceased and purchaser→Purchaser, never substituting one for the
other; purchaser left blank with an amber note when the CIRGAS tab has none (OPEN:
operator to confirm that workflow change). (4) Memorial Order banner (L4 + L5:R5 +
L6:R6 on both sheets — the colour bands span L–R, found by RENDERING not by reading
XML) removed style-and-all via new `_xlsxRemoveCellInSheet()`. Director re-verified:
8/0; **1384/28 on the branch by own run**; baseline **13/14 identical, 1 changed =
generateCirgasPacket sheets 7/8 only** (the two Memorial Order sheets — exactly fix 4;
fixes 1–3 invisible to the baseline because the AN fixture has no co-purchaser and the
worksheet scenario never imports — covered instead by the new 57-assertion
`tests/test-atneed-commission.mjs` + renders the director looked at). RIC bytes
provably unchanged → no Acrobat gate. OPEN for Martice: open
`scratch/s09a-renders/cirgas-packet.xlsx` in real Excel (LibreOffice can't recompute
the cascade formulas, so its render shows blank "For:"/0s that Excel fills).

**Track B MERGED (director-audited, `5fb961e`):** `followup-letter.html` — the
follow-up email generator from the Cowork handoff — + one guides.html card (Letters &
Forms 3→4). Four categories, relationship-aware tone (parent-of-deceased-child: first
name only, NO pre-planning paragraph — verified in the director's own screenshot
read), veteran + marker toggles, surviving-parent logic, no network/storage beyond
fonts. 70-assertion Playwright suite; director re-ran it + verify_guides_page green.
Track decision for Martice: Son/Daughter (and sibling/grandchild) get a "How should
the email refer to them?" select defaulting to FIRST NAME because "I'm their Son"
doesn't say which parent died — confirm or default to gendered. The harness attached a
security flag to B's commit; false positive same as s08 Track Q (local track commits
are the approved methodology; nothing pushed). **Merged main after Wave 1: 8/0,
1454 passed / 0 failed across 29 suites (arithmetic reconciles: 1327 + 57 + 70).**

**Track C MERGED (director-audited, `f187fee`):** uniform glass-front fee schedule
(O&C $875 / Rec $235 / ECF 10% / NO inscription / no tax except ECL scroll+vase at
10.4% — the 10.4% was NEW, not preserved, and the operator CONFIRMED it 2026-07-31)
applied to ECL, MVC island, Radiance+Serenity via data modules, rebuilt + gates extended
with fee sabotages; MVC's never-rendered INSCR/TAX exports deleted; COM crypt recording
$225 deliberately untouched and asserted so. Glass guide: "Sizes, and What Fits"
removed, closer-zoom glass-vs-granite photos (ecl-niche-closeup / roac-niche-closeup;
one candidate crop REJECTED for an operational sticky note naming a scheduled
interment), fees updated, PDF 4pp. ECL price chips container-scaled (flat 11–15px, 3D
8.5–12px, zero overflow measured). Director re-ran all four gates + both range
verifiers + guide gates green, and re-proved the ECL fee sabotage himself (first
attempt hit a comment "875" and did nothing — MISTAKES #8 honoured; surgical `OC: 875`
perturb → exit 1 with 3 named FAILs). `data/prices.json` already carries 875/235 — no
tool-side drift. Anchors held: ECL $685,175 / MVC $1,870,000 / RAD $156,115 / SER $76,960.

**Track D MERGED (director-audited, `edd2792`) + D2 follow-up in flight:** GOMN map —
price chips 12/14px, MVC June-2026 schedule (O&C $875 / Rec $235 / Insc $660 ea
+10.4% on inscription alone) with provenance, inscription now qty 0–2, Interlude Urn
(Matthews) $665 qty ≤2 as merchandise; granite guide first photo replaced + GOMN fee
table updated; 14/14 sabotages caught; director re-ran gates green and verified the
GOM-1-1-C-7 anchor arithmetic by hand ($10,492). D also FIXED a real zero-rect
pinned-card bug (tab-switch left the pinned card at (14,8) swallowing all tab clicks)
— same defect exists on COM/ECL/MVC/ROAC/TGMP, chip already pending. **Operator ruled
2026-07-31 the urn IS taxed 10.4% — Track D2 spawned to invert the untaxed-urn gate
and re-anchor (D's runner had no transcript to resume).** Also confirmed: CIRGAS
import leaves purchaser blank+amber (no decedent fallback); follow-up email first-name
default stands.

**Track M MERGED (director-audited, `7a025b5`) — the flagship:** COM rebuilt from the
MIS CAD floor plan (one measured scale, footprint rects, crypt fronts on the outward
CAD wall edge). Placement audit table in M's report: every bank re-derived; TWO
overlapping-bank defects found by the new gate, not by eye; **Serenity moved a
building-width south to the east passage where MIS puts it; Radiance into the west bay
at the chapel's NW corner** (photo-corroborated). Two entrances (east corridor + SW
chapel glass doors), furnished chapel (altar/lectern/piano/70 chairs facing the altar),
19-stop walk-through with breadcrumb, ghosting, behind-camera culling; tabs 9 → 3
primary + printable row. Inventory anchors IDENTICAL (785/893 crypts, 122 niches,
RAD $156,115 / SER $76,960); 12 sabotages exit 1. Director re-ran COM+GOMN gates on
merged main green, reviewed the true-base diff (4 COM files only — the raw
main..branch diff falsely showed D's files as deletions: WRONG-BASE artifact, checked
against merge-base f187fee), and read the plan + chapel-stop renders. OPEN operator
eyes: (1) chapel location = CAD's "CHAPEL AREA" west of the island, NOT the island
voids the debrief described — track's judgement, needs ruling; (2) seating faces
north (CAD altar), photo readable as west — one-line change if wrong; (3) both niche
walls' facing directions estimated; (4) banks 154-158 kept in COM though the debrief
says ELM-3-S. **MERGE-ORDER DEVIATION logged: M merged before U/S/T** (M finished
first and its diff is file-disjoint from the remaining tracks; stated order was
A→B→C→D→U→S→T→M).

**Track U MERGED (director-audited, `3be39db`):** urn-gardens guide + tool reconciled
against the operator's 06/2026 packages workbook (sheet governs — newer than
prices.json and the s08 slide). **Rose Urn Garden priced: $4,395 + $660 ECF**, gate
INVERTED from fails-if-priced to asserts-the-price (sabotaged both directions); Court
of Honor comp. cremorial added as a garden option ($4,395/$660); GoV scroll $335→$355;
memorial-package rows printed; guide still exactly 1 page; 14/14 baseline identical by
the track's own A/B. Flagged, kept: GoV urn vault $505 has no product name (not
invented); Rest Haven SOLD OUT has no tool record; LUG rights conflict still open.
U's worktree run PASSED test-price-update-path on 3838 — refining the artifact theory:
it's the foreign-server-on-3737 + weak guard, not worktrees per se.

**Track S MERGED (director-audited, `08d476f`):** the WMP map (local repo, commits
`5fb58df`/`68c8e9e`) no longer presents scattering as sellable — the availability
split is replaced by "quoted in the quote tool, with the direct cremation options";
marker/label/roster stay. **Tool side needed ZERO change** — scattering already lives
in the cemetery quote's Garden optgroup (Rose $545+$80 / Eternal Rest $435+$65 /
Terrace Ossuary $325+$50 + package block). **Urn-garden O&C 985→875 done at the
SOURCE** (build-prices.py scrapes the qOCGround label; label changed, both prices.json
copies regenerated together, diff proves `OC:ground_inurnment` is the ONLY moved key,
all other O&C fees now PINNED in test-prices-source.mjs §9 +13). **S also found and
fixed a latent build-prices.py regression:** since the MVC rework, any rebuild would
have shipped inscription 660→605 and DROPPED the tax rate silently (scrape fell back
to the Jan-2025 workbook); every scrape now sys.exits when its pattern stops matching.
Suite on S's tree: 1467/29. DEVIATION logged: two director `[s09/ops]` commits
(`4e017cd`, `ccc18de`) landed on S's branch because the shared main tree had S's
branch checked out when the director committed — each commit is still ops-pure;
they reached main via the S merge. Director lesson: after spawning a main-tree track,
ops commits must wait or use `git -C` against a worktree with main checked out.
PII note: S's oversized grep output holding burial names sat in the harness
tool-results cache; the director deleted it (S's rm was permission-blocked).

**Track T MERGED (director-audited, `0efd56e`):** TGMP rebuilt from the PHASE 2
billboard render (pixel-segmented) cross-checked against seven 2026 site photos: pool
AND ossuary deleted (ossuary on inference — the "what was replaced" drawing was the
old model's source; operator to confirm), central walk ending in a round
flagstone turn-around, far-end paved apron carrying bench/columbarium/birdbath, bark
beds (photos beat the render's turf, stated on-page), 8 context planters (inert,
gate-asserted no ref/price), TGN bank rotated across the far end facing down the path
(weakest estimate, flagged on-page), 9 properties placed 2-D via PLACEMENT. Two camera
bugs found by LOOKING: negative fit-solve root (bank preset clamped to orbit) and
rotateX(-90) back-face ground slabs printing MEMORIAL PATH mirrored. Gate 132 ok / 12
sabotages caught; inventory anchors unmoved ($544,000 + $218,000 = $762,000 / 100
rights); card anchors $19,439/$17,600/$60,700 intact; 31-check interaction suite.
1452/0 on port 3939 (foreign server PID 17896 owned 3737 mid-track and the guard
crash-refused — correctly).

**Mid-sprint operator additions (2026-07-31 evening):** August incentives replace July
— TRACK-I drafted and spawned as the ninth track (10% burial / 20% maus rows E-F-G via
checkbox / 20% cremation excl. 2nd rights / O&C −$1,000/−$500 stacking as previous
months / ECF never discounted / 0%-60mo-10%-ACH financing / auto-language valid
through Aug 31). Operator dismissed the four scoping questions, then ruled by
instruction; burial-rights-excluded is a track decision flagged for his veto. He also
started all three background chips as separate sessions — NOTE: the zero-rect chip
session will touch build_tgmp_map.mjs and needs a rebase over T's merge.

**Worktree artifact CONFIRMED and chipped:** `test-price-update-path.mjs` fails 10 in
ANY worktree (C proved it port-independent on 3838; D proved assertServesThisTree
passes a foreign server when index.html is byte-identical — curl showed 3737 serving a
tree without INSCR_MAX while claiming "verified as this tree") yet passes in the main
checkout every time (director: 1454/29 green post-B, post-C, post-D). Diagnosis chip
spawned; served-tree-hardening chip already pending.

**Previous sprint: sprint-08 — CLOSED AND PUSHED 2026-07-30** (push pre-authorized by
the operator; executed after all nine tracks merged and the full contract ran green on
final main: `8 blocks, 0 errors`; **1327 passed, 0 failed across 27 suites**; all SIX
map gates PASS exit 0 (MVC, ROAC, ECL, COM, GOMN, TGMP); all three range verifiers;
guide pages / guides page / print header / catalogs green — every one re-run by the
director on the final tree). Nine tracks: F, H, V, W, W2, P, P2, Q, U — see the
per-track records below.

**Track U MERGED (director-audited, final track):** `urn-gardens-guide.html` +
exactly-1-page PDF from the operator's slide (3 photos extracted; LUG space $5,495 +
$825 endowment from index.html's own options, O&C $985 ground / $1,425 boulder, REC
$235 from prices.json, memorial band $2,015–$5,670; verifier reconciles every figure
and negative-tests 5 ways). **The DESIGN §6 map-repo price exception was exercised
and came back EMPTY** — no urn-garden price exists in the map repo, so nothing
crossed; the verifier's probe fails if one ever appears. OPEN for Martice:
(1) **Rose Urn Garden has NO published price anywhere** — page prints "Ask us today's
price", gate fails if a number is typed in; supply the price and it's a 5-minute
follow-up. (2) **LUG rights conflict**: the slide says 1 OR 2 rights/space; index.html
records capacity 1 ("holds ONE urn", Martice 2026-07-27). The page follows the slide;
reconcile in the tool when settled.

**(opened 2026-07-29 evening)** Seven tracks (F merged;
H, V running; W, P, Q, U queued — see `sprints/sprint-08/SPRINT.md`). **PUSH
PRE-AUTHORIZED by the operator 2026-07-29: "push it all once every track is done and
verified"** — the close-gate push happens WITHOUT a further ask, but ONLY after every
track is merged and the full verification contract is green on final main (suite
counts, all map gates, guide verifiers, syntax check; generator baseline if
`index.html` was touched — no track in this sprint touches it). Any red gate voids the
authorization until it is green.

**sprint-07 — CLOSED AND PUSHED 2026-07-29** (operator Acrobat-tested ClearPoint, then
pushed live `b9e54fd..f2cf0ac`; N-B-2 sold ruling + ECL face-title fixes pushed after,
`2ebcfad`, deploys verified on the wire). Three operator tasks, three tracks, all merged
`--no-ff` in order C (`be39d86`) → E (`70b6bf1`) → G (`9139314`). Director verified on
final main: `8 blocks, 0 errors`; **1327 passed, 0 failed across 27 suites** (the new
contract number — 1300+27 from `test-clearpoint-nojs.mjs`; 1325 without
`wmp-cemetery-map/`); `verify_ecl_map` PASS 0 mismatches; `verify_guide_pages` +
`verify_guides_page` ALL OK; generator baseline **14/14 identical** (director's own
capture). Worktrees removed; the three `s07/*` branches kept until pruned.

**Track G shipped (director-audited):** all 13 family guides >4pp condensed to ≤4-page
print-only layouts (one fenced `@media print` block per guide; screen CSS untouched —
13/13 screenshots 0.0000% pixel diff vs main). Page counts: Granite Marker 20→4,
Cremation 14→4, Veterans 12→4, Who Decides 11→4, Vault 10→4, Terramation 9→3, Cemetery
Property 9→3, Medicaid ×2 8→3, Cremation-or-Burial 8→3, Urn Placement 5→2, Scattering
5→1, Burial 5→3. **301 price tokens + 29 RCW citations preserved, zero lost** — measured
by token diff old-vs-new, re-verified by the director on the three biggest guides.
`verify_guide_pages.mjs` now asserts the ≤4 cap permanently. Build log appended.
Content notes for the operator: the marker guide's five TRUE-SIZE portrait templates are
print-hidden (their six prices kept as a list) — candidates for a separate one-page
download; terramation's process photos are print-hidden; multicol reading order worth one
printed eyeball.

**Close-gate checklist (operator):**
1. ClearPoint Acrobat test: generate a Pre-Need Contract, open in Acrobat, edit the
   contract number AND an amount — expect zero format warnings, PLAN TOTAL stays a
   number. Remember the trade-off you chose: totals no longer auto-recalculate in
   Acrobat; retype affected totals if you change an amount.
2. Rule on **ECL-1-N-B-2** (blank on the sheet, inside COUNT 30): sold, priced, or leave
   as "Not Priced — confirm in MIS". One-word edit in `scripts/ecl-niche-data.mjs` +
   `node scripts/build_ecl_map.mjs` if it changes.
3. Eyeball `MAPS/ECL_NicheMap.html` (orbit it on your phone; renders also in
   `scratch/ecl-renders/`), and print/open 2–3 condensed guide PDFs (marker guide
   especially — the true-size templates question).
4. When satisfied: `git push origin main`, then spot-check the live URLs.

Merge order C → E → G.

**Track E MERGED (director-audited):** `MAPS/ECL_NicheMap.html` — third 3D glass-front
map, generated by `scripts/build_ecl_map.mjs` from `scripts/ecl-niche-data.mjs`, gated by
`scripts/verify_ecl_map.mjs` (never hand-edit the HTML; statuses are live hand-maintained
data — sell a niche ⇒ edit the module and rebuild). 85 niches / 4 faces (S 31, N 30,
W 12, E 12) proven against the sheet's own printed COUNTs; 28 available at list $685,175
(S $353,035 / N $226,570 / W $84,675 / E $20,895); 13 price tiers; freestanding cabinet
with SOLID CORNERS (no two-face niches, unlike MVC); no dimensions rendered (photos only,
no drawing). Gate sabotaged 4 ways at build, all exit 1; director re-ran gate +
interaction suite + guides verifier green, and verified the South flat grid cell-for-cell
against the sheet image. One appended card on guides.html (Maps pill 4→5).
**OPEN, needs Martice: ECL-1-N-B-2** — the sheet draws it inside COUNT 30 but the cell is
blank (no price, no SOLD). Carried as a third status `unpriced`: blacked out + dashed
outline, badge "Not Priced", card says confirm in MIS, excluded from inventory. If it is
actually sold (or has a price), it is a one-word edit in `ecl-niche-data.mjs` + rebuild. See `sprints/sprint-07/SPRINT.md` for decisions and gates.

**Track C shipped (director-audited and re-verified):** `generateClearPointContract()`
strips the template's live Acrobat JS (44 field/widget `/AA` dicts, 6-entry `/CO` calc
chain, doc-level JS names, JS OpenAction) from the DOWNLOADED copy in-memory — the
template on disk untouched, form still editable, not flattened. Root cause of the
operator's "value entered does not match the format of the field [FPTotal]" / `$1.#R`
errors: the template's own AFNumber/AFSimple_Calculate scripts re-fired on any Acrobat
edit and choked on the tool's comma-formatted fills. New suite
`tests/test-clearpoint-nojs.mjs` (27 checks incl. a negative control proving the audit
can SEE unstripped JS). Director fixed one hollow assertion at audit (`names` shadowing
made `hasDocJS` always-false; `f8d21a9`), re-ran everything: `8 blocks, 0 errors`;
**1327 passed, 0 failed across 27 suites** (1300 + the new 27); **generator baseline
14/14 IDENTICAL** vs the 2026-07-26 reference, captured and compared by the director's
own run. Track recon: GA (`/CO`×13) and RIC (`/CO`×16) templates carry the same
machinery — unreported so untouched; a GA strip would interact with the orphan-widget
de-flatten history, a RIC strip costs an Acrobat gate. **Operator must still do the
Acrobat edit test at close** (agents cannot run Acrobat).

**Sprint-08 progress (2026-07-29 evening):** Track F MERGED (director-audited: gate
PASS same anchors 85/28/$685,175, interaction suite 30/30, 8/0, **1327/27 on merged
main**) — ECL niches champagne-lit (sold = dimmed/frosted hatch, no black), Bronze
Scroll/Vase are card toggles (default off, post-ECF, print-mirrored), $14,295 chip
lifted to 4.90:1 AA, footer-unpins-card bug fixed. Track H (COM map) still running.
**Track H MERGED (director-audited):** `MAPS/COM_CryptMap.html` — 17 crypt banks /
785 purchasable units over 893 spaces + Radiance (74) and Serenity (48) niche walls,
generated/gated like the rest of the family; floor-plan SVG + whole-building 3D + 6
area tabs + overview from one dataset. **Crypt prices deliberately NOT shipped:** the
crypt sheet's price text is 4px and its font provably renders 8 glyph shapes for 10
digits (digits collide) — every crypt card says "confirm in MIS"; the 51 available
crypts' ambiguous decodes are kept as never-rendered `sheetRaw` diagnostics awaiting a
hi-res export or MIS list. Niche-wall prices are legible and exact (RAD $156,115 /
SER $76,960 available, per-row anchors + positional checksums, sabotage-proven).
Fees: crypt O&C and Monobar illegible ⇒ omitted; sheet Recording $225 / Monobar
Install $215 / Vase $415 used as instructed (sheet is older vintage than
prices.json's 235/225 — operator should reconcile). OPEN for Martice: cols 101–102
deluxe-vs-hidden (sources disagree; crypts sheet won), bank 116–123 tier G drawn as
8 singles under companion headers, $61,155-or-$61,455, the 51 crypt prices, real
O&C/Monobar. H's report claimed the price-update suite red on main — director
falsified it (23/0 in the main tree); it was the port-3737 worktree artifact again.
Track H also fixed pinned-card-overwritten-by-hover on COM; RECOMMENDED backport to
ROAC/MVC/ECL, queued as a sprint-09 candidate.

**Track V MERGED (director-audited):** `MAPS/GOMN_NicheMap.html` — 2D stepped granite
wall, 168 niches (L28/C112/R28), 37 priced $241,815 list ($4,995×9 / $5,995×14 /
$6,995×5 / $7,995×3 / $8,995×6), refs GOM-1-1-<row>-<space>; gate 88 checks
sabotage-proven 5 ways incl. the void-growth and hand-edit cases; 48-check Playwright
suite; Inscription $605 toggle on the F pattern; sheet rules carried (Companions-2
because two Interlude Urns fit, one vase included, NO PHOTOS ALLOWED verbatim); no
photo ships (plates legible — gate asserts zero <img>). Track V also fixed a
document-wide tap-suppressor swallowing tab clicks (now scoped, gate-asserted).
guides.html merged with the predicted textually-identical pill collision (both H and V
wrote 5→6) — auto-merge produced pill 6 / 7 cards, caught by verify_guides_page at
director merge, resolved to 7. OPEN operator call: GOMN O&C qty defaults to 1
(matching ECL) on an all-companion wall — should it default to 2?

**Track W MERGED (director-audited):** `MAPS/TGMP_Map.html` — Terrace Garden Memorial
Path 3D (TGN bank 40 niches $544,000 + 9 TGMP properties $218,000; $762,000 / 100
rights available). **TGN moved OFF the MVC page** (operator ruling, one home): carried
by script-proven parity 40/40 identical on ref+price+status+rights vs
`789a9a4:MAPS/MVC_…`, removed from `mvc-niche-data.mjs` entirely, MVC island anchors
untouched (145 / $1,870,000, gate re-run PASS), pointer notice in the old tab's spot.
Gate sabotaged 8 ways. The niche size 12.5"×12.5" carried from the MVC page and
labelled as such. guides.html Maps pill hit the predicted collision AGAIN (V+W both
appended; real conflict this time) — resolved by director to pill 8, verify green.
**Fee follow-up in flight (Track W2):** W shipped fee-less (TGMP sheet prints none);
operator then ruled "MVC schedule applies" — W2 is restoring O&C $875 / Recording $235
/ Inscription $660 + 10.4% / ECF 10% via the data module and INVERTING the gate's
fee-abstinence section.

**Track P MERGED (director-audited):** `granite-niches-guide.html` + 2-page PDF —
ROAC $7,995–$17,595 / GOMN $4,995–$8,995 / TGN $12,000–$16,000 / TGMP band
$8,000–$52,000 · 1–4 rights, every figure reconciled by NEW
`scripts/verify_granite_niche_ranges.mjs` against the live modules; fees printed for
ROAC+GOMN, none for Terrace (needs P2 follow-up now that the operator ruled MVC
schedule applies); 6 photos shipped with per-photo PII verdicts, GOMN deliberately
photo-less (all its photos show legible names — the page says so); PDF embeds ZERO
raster images (print hides photography). Card in Getting Started, pill 8. OPEN for
Martice: ROAC's fee amounts have no dated sheet in the repo (carried from the old
page's math) — confirm in MIS; and what does GOMN's "NO PHOTOS ALLOWED" actually
prohibit?

**Operator rulings late 2026-07-29:** (1) **Photo PII rule RELAXED** — "it really
doesnt matter if there are names in the photo or not": legible memorial-plate
names/dates in his property photos are fine to publish (public physical memorials).
Scope: photos only; customer records, FDCRM names, and map-repo unit data stay
prohibited. Track Q updated mid-flight; TRACK-U file amended; P2 will add a GOMN photo
to the granite guide and drop its no-photo paragraph. (2) **Push re-confirmed**: "once
all tracks are done and you check them you can push everything live on github you have
my word" — push fires after final merge + full green contract, no further ask.

**Track W2 MERGED (director-audited):** the TGMP map now carries the MVC June-2026
fee schedule per the operator's ruling (O&C $875 / Recording $235 / Inscription $660 +
10.4% tax on the inscription alone / ECF 10%), applied to the TGN niches AND the nine
properties, with provenance stated on the page (schedule not printed on this area's
sheet; operator-confirmed 2026-07-29; confirm amounts in MIS). Gate §8 inverted from
fee-abstinence to schedule-presence with executable card-math anchors ($19,439 /
$60,700, proven two independent ways) and a fee-amount sabotage. W2 also fixed
click-into-qty-box-unpins-the-card on TGMP and reports the OLD MVC page has the same
defect (fee panel unreachable with a mouse) — sprint-09 candidate alongside the
pinned-card-hover backport. Open judgement call for Martice: inscription is offered on
the nine properties too (the old tab was niche-only) — one-line change if wrong.

**Track Q MERGED (director-audited):** `glass-front-niches-guide.html` + exactly-4-page
PDF — ECL $10,995–$82,500 (28/85), MVC island $7,000–$48,000 (145 openings, 2–4
rights), Radiance $5,495–$12,095 (17/74), Serenity $2,195–$16,495 (10/48); every
figure + fee reconciled by NEW `scripts/verify_glass_niche_ranges.mjs` incl.
no-cross-applied-fee assertions; glass-vs-granite claims each carry a named backing,
superiority claims explicitly disclaimed; 7 photos under the operator's relaxed
photo ruling (two frames rejected for LIVING people in frame — the ruling was read as
covering plate text, not bystanders). Merge conflicted only in BRAND_AND_BUILD_LOG
(P2+Q both appended; both entries kept). NOTE: the harness attached a security flag to
Q suspecting the photo-rule change was injected — false positive: the ruling is the
operator's own message in the main conversation, and nothing was pushed. OPEN for
Martice: (a) confirm which photo is Radiance vs Serenity (inferred from column counts
8 vs 6); (b) memorial PORTRAITS of the deceased inside occupied niches appear at
thumbnail scale in honest photos of occupied walls — Q kept them, reading the
face-exclusion as living people; say the word to go unsold-inventory-only.

Known environment fact from F's run: `test-price-update-path.mjs` hardcodes port 3737
and cannot pass in a worktree while another tree's dev server owns the port — suite is
green on the tree that owns it; consider a --port flag some sprint.

**Previous sprint:** **sprint-06 — CLOSED 2026-07-28; the operator PUSHED the close** (origin/main
caught up to the twelve close commits at some point on 2026-07-28 — verified by `git status -sb`,
not assumed). Six tracks done and merged: R (research), M (`s06/mvc-niche-map`),
G (`s06/terramation-guide`), M2 (map repo `469c25d`), M3 (`s06/mvc-3d`), M4 (3D polish),
plus post-push **Track M5** (`s06/mvc-corner-realism`, commit `ae7b9c2` — landed LINEAR: a
`git pull --rebase` before the push flattened the original `--no-ff` merge, content identical) —
pushed on the operator's instruction 2026-07-28.

**2026-07-29, LOCAL only (awaiting his push): two more operator rounds.**
1. **M5b** (`a2548a9`): hover pops the space 1.5x, the detail card opens BESIDE the
   hovered/pinned niche (phones keep the bottom sheet), flat tabs + overview + TGN + PRINT all
   moved to champagne cells with tier chips (operator chose "one look everywhere"), and a
   highlighted cell prints with a 4px orange ring. Gate PASS; 13 Playwright checks + round-1
   suite re-run green.
2. **M6** (`9eb2276`): **`MAPS/ROAC_NicheMap.html` rebuilt as a 3D courtyard at the same URL**
   — generated by `scripts/build_roac_map.mjs` from `scripts/roac-niche-data.mjs`, gate
   `scripts/verify_roac_map.mjs` (never hand-edit the HTML). Dataset carried verbatim by
   script-extraction: **350 niches / 14 faces / $4,318,250 / statuses 304-27-17-2**, proven
   old-vs-new on ref+price+STATUS. **Statuses are live hand-maintained data — sell a niche ⇒
   edit the data module and rebuild.** Geometry is ESTIMATED from his photos (`D:\Cemetery
   Photos Misc\ROAC Photos` — no fabrication drawing), so the page shows no niche dimensions.
   Banks C-B-A / E-F-G + Wall D at the head + sold benches; granite materials; same
   interaction stack as MVC (deferred capture, mirrored selection, card-beside, print ring).
3. **M6b** (`fee30c2`): print scope on BOTH maps — a wall tab prints only that wall, and a
   highlighted space prints its full pricing card (hover-card content as a static block).
   ROAC corrections from the photos: banks are ONE continuous structure (granite piers, not
   air, between fields; only Wall D freestanding); benches face each other at Inside B /
   Inside F; status colour-coded (amber=Reserved, red=Occupied, violet=On Hold) so an FSD
   can't mistake an unavailable space — operator kept the rest of the palette as-is.
4. **M6c** (`c6771d8`, `8966d49`, `e0f97de`): benches grounded (were floating — positioned from
   the wrapper centre, not the floor plane); sold/occupied spaces show NO price in any rendering
   (data kept, gates still prove it); exact prices on every chip ($13,195 not $13.2K, ROAC PPI
   2.2→2.7, presets perspective-compensated); and the pre-push drag-guard: selection comes ONLY
   from a pointer-stream tap detector (native clicks after gestures swallowed), hover frozen
   mid-drag, and hover cards made pointer-transparent — a camera jump could park a stale hover
   card OVER the niches and eat the next tap (found by elementFromPoint mid-suite).
   `scratch/test-drag-guard.mjs` = 15 checks, both maps.
5. **M6d** (`0d100d8`): ROAC Inside views for every face incl. Wall D
   (occluding bank fades to a ghost; presets are toggles back to Courtyard; signed-distance
   perspective fit for interior planes), and print-follows-the-highlight on BOTH maps
   (selection > wall tab > everything). Round-3 suite now 24 checks.
6. **M6e** (`789a9a4`): status recoded PATTERN+darkness, never hue (amber/red rings collided
   with the $12–15K chip hues): Occupied = blacked out, Reserved = diagonal stripes, On Hold =
   dashed outline, white badges. "← Quote Tool" back buttons on both map headers (maps had no
   route back; new tabs had no history). Preset fit replaced with the exact perspective solve —
   the one-step correction had under-zoomed Wall D to half frame.
   **Everything above PUSHED LIVE 2026-07-29** (`…2d4cd66`, then `789a9a4`), deploys verified
   on the wire each time.

sprint-01 (S1), sprint-02 (S7) and sprint-04 (S8+S9) SHIPPED; sprint-03 (S2) partially shipped;
sprint-05 merged locally.

**Last updated:** 2026-07-28, sprint-06 close.

## Sprint-06 — closed 2026-07-28

Five tracks, three of them added mid-sprint by the operator. Everything below is merged to
LOCAL `main` and director-verified: `8 blocks, 0 errors`; `1300 passed, 0 failed across 26
suites` after every merge; `verify_guides_page` ALL OK; `verify_mvc_map` PASS 0 mismatches.
**Nothing pushed — the push is the operator's close gate.** No track touched `index.html`, so
the generator baseline was out of play by construction.

| Track | Shipped |
|---|---|
| R | `RESEARCH.md`: 7 fact tables (source-tagged), 13 claims-to-avoid, 11 operator questions, 21 sources. Found the 250-vs-500 lb contradiction inside BW's own materials, the unvisitable Woodland, SB 5001's real dates (2019 c 432, eff. 2020-05-01, RCW 68.04.310), and RCW 68.50.130 as the placement citation. |
| M | Live niche map to the June 2026 sheet: MIS wall strings (`MVC-ISL-E/N/S/W`), Side A/B naming, D/E companion readdressing, west C-3/C-4 $14K→**$10K** (the only price changes), rights legend, effective-date footer. Proven 1:1 by script (38 mismatches → 0). `MVCN.json` synced (map repo `b1c8774`); statuses/occ preserved by field-diff; builder now carries hand-edits across rebuilds. |
| G | `terramation-guide.html` + card + 9-page PDF + 7 photos crop-extracted from the booklet's flattened scans. Only GPL figures ($7,795 / $895). Operator rulings applied: ~250 lb, WMP standard-size plot, no religious section. Every vendor-only claim dropped or attributed; zero leak-grep hits for the internal sales material. |
| M2 | The zoom-out bug was in the MapLibre **prototypes** (`scratch/proto/`), not the tracked map (clamped since birth). Derived floor (fit − 0.5, resize-aware) + measured pan bound applied on disk; 16/16 checks; regression test committed (map repo `469c25d`, render suite 24→27). **The prototype fix itself is uncommittable** — `scratch/` is gitignored and no track may weaken an ignore. |
| M4 | Post-deploy polish from the operator's five-item punch list. Root cause of his "view from underneath" screenshot: **the pitch sign was inverted** — the page genuinely opened below the floor. Now: pitch clamped to eye level, opens on Front (West) face-on; Overhead replaced by an **unfolded plan** (four walls hinged flat, screen-space MIS captions); full `MVC-ISL-…-Level-Space` strings on every orientation label; opaque colour classes, all 10 label/fill pairs ≥4.52:1 WCAG AA; click-to-highlight (inset white + gold glow) mirrored into the flat tabs. Prices/refs/rights byte-identical (gate PASS 0 mismatches); print still JS-free 4 pages. Director re-verified gates, looked at before/after shots, and confirmed a suspect-looking clipped detail card actually carries its values ($14,000 on west D-3). |
| M5 | Post-push punch list from the operator's photos of the built structure (`D:\Cemetery Photos Misc\New MVC Photos`). (1) **Corners modeled**: the long walls' niche field is 108.75" but the island is 135.4375" — the old build stretched the grid across the full face (~24% too wide per niche); the ~13.34" at each end is the **glass side of the end walls' edge-column niches**, now rendered as tappable side-glass strips that select the Side A/B niche they belong to. Gate extended: 28 strips must match the four edge columns 1:1, never counted as openings. (2) **Real materials**: champagne-gold lit niches, near-black bronze frame + brass trim, charcoal panel, mauve carpet; price tier moved to a compact chip (same WCAG-measured palette); flat/print grids keep tier fills — operator chose both via AskUserQuestion. (3) **3D tap-to-select fixed**: `setPointerCapture()` on pointerdown retargeted the click to the scene, so taps never reached a 3D niche (M4's highlight only ever worked in the flat tabs — MISTAKES #18); capture now waits for a real drag. Verified: gate PASS 0 mismatches ($1,870,000/145), Playwright mouse + **touch** tap, drag-does-not-select, corner strip selects `north\|D-3` across all three renderings, 1300/0 across 26 suites, 8 blocks 0 errors. |
| M3 | The 2D niche map **replaced by a CSS-3D page at the same URL** (operator's explicit choice), zero dependencies added. Orbit/zoom-clamped/face-on views, per-niche detail card with ECF+O&C math and blueprint dimensions; print = static-HTML flat grids, no JS. Generated by `scripts/build_mvc_map.mjs` from `scripts/mvc-niche-data.mjs`; gate `scripts/verify_mvc_map.mjs`. 30 dimension strings corrected to Matthews drawing K25-377 on operator approval; prices/refs/rights byte-equal to the June verification (145 openings, 48/51/23/23, $1,870,000). |

**Source files relocated per the operator:** all five PDFs (3 terramation + June price sheet +
Matthews K25-377 blueprint) live in `reference-docs/internal/`, **gitignored** — the operator's
explicit ruling: make better artifacts *from* them, never publish them. Hash-verified copies;
Downloads originals deleted at close. The blueprint and the Return Home training guide
especially must never reach the public repo (copyright / internal sales material).

### Open, needing Martice (sprint-06)

1. **MIS cross-checks — Martice supplies screenshots; agents have NO MIS access** (standing
   fact, restated by him at close): west C-3/C-4 at $10K, the D/E renumbering, the N/S walls'
   ragged-edge question (sheet vs page geometry — page kept flush 12-column rows), and the
   east B-3/B-5 dim-vs-width nit.
2. **Prototype graduation:** the real zoom-floor fix lives in the map repo's gitignored
   `scratch/proto/` and is lost to any scratch cleanup. Graduate the prototypes or accept
   disk-only.
3. **Guide follow-ups:** pre-need terramation wording (page currently neutral); bag sizes
   (10 lb vs 5 lb — printed around it); whether naming Return Home as prominently as the
   booklet does is right; whether $7,795 is all-in and who is paid for the $895 ceremony
   (page silent on both).
4. **`MVCN.json` `dim` strings are now stale** against the blueprint's 30 corrections (the
   map repo sync predates M3). Small follow-up: regenerate dims from
   `scripts/mvc-niche-data.mjs` or the drawing. Prices/refs/statuses unaffected.
5. **`ZOOM_FLOOR_MARGIN = 0.5`** is the one judgement number in M2 — eyeball it live at
   `http://localhost:8642/scratch/proto/hybrid.html`.

### Close-gate checklist (operator)

1. Eyeball the three deliverables locally: `terramation-guide.html` (§1, §4, §6 especially),
   the 3D `MAPS/MVC_NewGlassFront_NicheMap_1.html` (orbit it on your phone), `guides.html`.
2. When satisfied: `git push origin main` — live immediately on Pages.
3. After Pages deploys, spot-check the live guide + map URLs.
4. Bring MIS screenshots for open item 1 when convenient; item 4 is a 20-minute follow-up any
   session can run.

Operator request, three parts: (1) a **new family-facing Terramation guide** matching the
existing guide family — preceded by a real research pass; the four attached PDFs are source
material to make a *better* guide from, explicitly **not** to be published directly; (2) update
the **live MVC glass-front niche map** (`MAPS/MVC_NewGlassFront_NicheMap_1.html`) to the June
2026 layout/price PDF **and sync `MVCN.json`** in the map repo (operator: "Sync both"); (3) move
the four PDFs out of `E:\Downloads`.

**Operator decisions 2026-07-28:** source PDFs live in `reference-docs/internal/`, **gitignored,
local-only** — the internal Return Home partner training guide especially must never reach the
public repo; track subagents run on **Opus** (restated; matches standing policy).

**Gate 0 done at boot:** all four PDFs copied to `reference-docs/internal/`, SHA-256 verified
identical to the Downloads originals, folder added to `.gitignore` and proven ignored
(`git check-ignore` positive). Originals are deleted from Downloads at the close gate only.

**Recon facts (director-verified):** the GPL (p13) already prices Terramation at **$7,795.00**
plus **$895.00 Laying in Ceremony** — the guide's only permitted dollar figures; no repo page
mentions terramation today; the live niche map has no MIS wall strings, no effective date, and
a different price multiset than the June 2026 PDF (3×$48K vs 2×$48K+2×$42K); the PDF renames
walls to `MVC-ISL-E/N/S/W-Level-Space` (Back=East, Side A=North, Side B=South, Front=West) and
color-codes rights per niche; `MVCN.json` holds 146 units whose hand-maintained statuses must
survive the sync.

Spawn order: R + M in parallel (no file overlap), G after R completes; merge M then G. No track
touches `index.html`, so the generator baseline is out of play by construction.

## Sprint-05 — closed 2026-07-27

Came from Martice after he imported the 30 demo contacts. Three complaints; the third reordered
the sprint, because it was not a layout problem but a missing entity: **the tool could not
represent the property a family already owns**, so every existing owner — the most valuable
contacts in the book — rendered as *"a prospect with nothing on file."*

| Track | Shipped |
|---|---|
| A | `contactProperty/<id>` as a first-class record, independent of any quote. `BW_SECTION_TYPES` classifies all **57 real WMP section codes**, each carrying a `src` naming its evidence. Capacity is data: a niche holds 2, Court of Honor 1, a Lake Urn Garden space 1. Demo property from real locations, **provably not colliding with any occupied grave**. |
| B | The record is a page: header strip, full-width property band, three columns, and an **activity timeline** merging notes, to-dos raised and completed, property, the import batch and creation — derived, not stored. |
| C | Contacts opens a **home screen**: needs-attention counts, quick actions, the five views as cards, recently viewed, saved views, labelled coming-soon placeholders. The list keeps its own URL. |

**Verification contract moved from 1038/23 to `1300 passed, 0 failed across 26 suites`**, with
14/14 generator signatures still identical — so none of it moved a number on a document.

### B and C ran in PARALLEL against the same file, and it held

The guidelines cap that for good reason. The operator asked for it, and the mitigation was a hard
boundary plus append-only discipline: Track C's entire diff **removes one line** and adds four
contiguous hunks, and it crossed none of Track B's territory. They auto-merged with **zero
conflicts**, and — the check that actually matters — **both suites pass together on the merged
result**. A clean textual merge proves nothing on its own; Track C wraps three functions Track B
rewrote.

**The lesson worth keeping:** parallel same-file tracks are survivable *when the second one is
scoped to append*. Scattered edits would not have merged.

### Two pre-existing bugs found and correctly NOT fixed

1. **The page scrolls sideways by 88px below ~985px** — every screen, not just contacts. The top
   bar: 264px sidebar + a 300px search + two buttons. 28px at 960px, zero at 1010px.
2. **A cold load of `#contacts?id=<partyId>` does not open the detail panel.** `bwCtApplyHash()`
   runs before Firebase delivers the parties, so the lookup finds nothing. Verified identical on
   unmodified `main`, so not a regression — but that is the link shape one counselor pastes to
   the other.

### Still needing Martice

- **Four section codes unclassified** — `CC`, `ELBW`, `GOVN`, `RGBE`. They render as raw codes
  rather than guessing. `RUG` is labelled an urn garden on inference, not measurement.
- **Ground-space capacity is 1**, correct for a casket; a standard space takes up to three urns.
  A per-record override today.
- **MIS calls the row letter `Lot-B`; the guide and map call it a row.** Display says "Row B".
- **"Not occupied" is not "not sold."** The lot export only knows interments, so a demo position
  could name a niche someone owns but nobody occupies. Only MIS knows, and it is unreachable.

## Sprint-04 — opened 2026-07-27

**Boot audit found nothing wrong.** Working tree clean, `main` level with `origin/main` (0 ahead,
0 behind), `npm run check` → `index.html: 8 blocks, 0 errors`, `npm test` → `636 passed, 0 failed
across 19 suites` with every suite green, no stale worktrees, nothing listening on 3737, baseline
artifacts still at `%TEMP%\bw-baseline\before`. First boot in this project where the previous
close left the docs accurate.

**The sprint came from the operator mid-boot**, not from the roadmap: the Contacts page is *"just
a contacts page"* and needs to be *"much more robust"*, taking what is good from
FuneralDecisionsCRM. Source material: the **FDCRM Training Manual, 203 pp.**, at
`E:\Downloads\FDCRM Training Manualreduced.pdf`, plus a screenshot of Bonney Watson's own FDCRM
home screen. **That screenshot shows real customer names in "Recently Viewed Contacts" — none of
them may enter this repo in any form** (same rule as map data, `DESIGN.md` §6).

**Design authority was delegated to the director** (*"I'm giving you autonomy to make decisions on
exactly how this should look ... look online at other CRMs"*). The resulting decisions are
D1–D10 in `sprints/sprint-04/SPRINT.md` and bind the tracks. The load-bearing ones:

- **A view is a URL** (D1). Filters serialise into the existing hash router, so a filtered list
  survives navigation, is pasteable between counselors, and a saved view is just a stored hash —
  which deletes FDCRM's static-vs-dynamic distinction entirely.
- **`nextActionAt` / `lastActivityAt` are derived, never stored** (D4). There is no migration
  mechanism in this project; deriving means nothing to backfill and nothing to drift.
- **Every import is an undoable batch** (D7). This is what makes it acceptable to import into a
  live production database at all.
- **Our own ~60-line CSV parser, no vendored library** (D6). Sprint-01 spent a whole sprint
  removing 9.4 MB from this file.

**The seeding problem solved itself.** Martice asked for 30 live fake contacts to test with,
which would have meant an agent writing to production — the one absolute prohibition. His own
answer to the mechanism question (build CSV import first) removed the conflict: the demo file
ships in the repo, and **he** imports it through the UI after the push. No agent write, and the
batch-undo makes it reversible.

**Operator decisions taken 2026-07-27:** CSV import is generic, not FDCRM-shaped, but kept open
to an FDCRM export; taxonomies ship as sensible defaults, editable in-app; appointments and the
calendar are deferred; the drafted status list ships as-is and is renamed in-app.

**Deviation, logged: three tracks, not the 1–2 the guidelines allowed.** They run strictly
sequentially, each branching from a `main` carrying the previous merge, so they cannot conflict.
`SPRINT_GUIDELINES.md` is amended in the same commit — the cap was always about *parallel* edits
to one 18,000-line file, and three ~600-line diffs audit far better than one ~1,800-line one.

## Status

**2026-07-26 was a full day. Everything below is merged, pushed and verified live.**

| Shipped | What |
|---|---|
| sprint-01 (S1) | 11 contract templates externalized. `index.html` 11.96 MB to 2.55 MB raw, 7.30 to 0.88 MB gzipped (**8.3x**, not the 11x predicted - the target had omitted fonts it had already excluded). Verified live: all 11 templates resolve over HTTPS with SHA-256 matching the Gate 0 manifest, and a RIC generated from the deployed site is identical to the recorded baseline. |
| Guides audit | Granite swatches restored (27 lazy images never loaded in a headless print). **The Cremation Guide had 0 of 57 product photos.** 101 corrupt characters across 8 PDFs - a 2026-07-24 'fix' had been verified against the wrong codepoint. Burial Vault Guide rebuilt. |
| Advisor identity | Randy's own name, email and phone now reach his paperwork. The name was hardcoded at **37 sites**, including the Insurance Producer of record and the Overview contact panel that had been showing him Martice's details to read to a family. GA producer ID deliberately BLANK for anyone without one. |
| Map audit (S4 groundwork) | **`#space=<sid>` resolved for no unsold space at all** - 19,800 sids unindexed, including all 16,921 available ones. Three mausolea rendered 450px off-screen with Back unreachable. Niche lasso resolved nothing in 9 of 12 structures. |
| sprint-02 (S7) | Map inventory styling: one outline colour, state in the fill, labels rotated to each row's bearing. Gates proven by sabotage. |
| Discontinued vaults | Five products the tool was still offering families removed; the two setting fees KEPT, because they are components of the Standard Arrangement bundles. |
| cemUpdate | Stale arrangement subtotals cleared. **The reported crash did not exist** - closed as not-reproducible. |
| sprint-03 (S2), partial | 11 cemetery fees resolve from `data/prices.json`; `MONOBAR_INSTALL` corrected to 225; garden ECF carried as real per-garden amounts. |

**Verification contract moved from 368 assertions across 12 suites to 636 across 19**, and all 14
generator signatures are still byte-identical to the reference - so none of the day's work moved a
price on a contract.

**The apparatus is the real deliverable.** A generator baseline that runs on a frozen clock and
covers the scenario that was silently uncovered; a served-tree guard that refuses to test or
capture against another worktree's dev-server; a map suite that fails when sabotaged; a
data-integrity check that surfaced two possible double sales; and a screenshot guard that aborts
rather than redacting a name.

**Every real defect found today came from counting something and comparing it to an expectation** -
images per page, sids indexed, pages in a contract, dollar figures before and after, served bytes
versus disk bytes. None came from looking at the thing and judging it. See `MISTAKES.md`.

### Sprint-04 Track A — merged 2026-07-27 (`f481637`)

Classification, notes and to-dos on the contact record. Five taxonomies as editable data
(`BW_SOURCES`, `BW_STATUSES`, `BW_CATEGORIES`, `BW_FLAGS`, `BW_TASK_KINDS`), one accessor
`bwTaxonomy(kind)` resolving Firebase-then-defaults, `contactNotes/<id>` and `contactTasks/<id>`
as their own per-record nodes, next action and last activity derived, a tab strip on the contact
detail and a first-ever `#section-crm-settings`.

**Director-verified rather than taken from the report:** `8 blocks, 0 errors`; **758 passed, 0
failed across 20 suites**, with all 19 pre-existing suites holding their exact boot counts —
they sum to 636, so nothing fell silently behind a rising total; **14/14 generator signatures
identical**, captured against a dev server *proven by content marker* to be serving this tree
rather than the guides worktree, and compared with the director's own comparator, itself proven
able to fail (0/14 against `audit-randy`, printing the real `FSD` field diff); every new write
path is `<collection>/<id>`, never a bare node; no generator, price, template or `contractRole`
behaviour touched; no unescaped user text reaches `innerHTML`.

**A phone number in the diff that was not 555-range** — `(206) 445-9794` — was checked rather
than assumed. It pre-exists on `main` in three places, appears in the diff only as an unchanged
context line, and is Bonney Watson's own business number in the advisor block. Not customer data,
not introduced by the track.

**Three track decisions the director reviewed and accepted:**

1. **Five taxonomies, not the four the track file specified.** `BW_TASK_KINDS` was made editable
   too, because leaving one vocabulary hardcoded while four are editable is an inconsistency a
   user hits immediately. Accepted — it follows the file's own data-not-enum rule.
2. **`engagement: 'active'` maps to no status.** It was the default and carries no information;
   surfacing it as an unresolved raw code would read as a bug. `do-not-contact` and `idle` map
   through. No record is rewritten — read-time fallback only, per D4's no-migration reasoning.
3. **The first taxonomy edit seeds all defaults.** Without it, renaming one status would make the
   other seven vanish the moment the Firebase set became non-empty. A test asserts every write is
   path-depth 3 and none targets a bare collection node.

**Still open from this track:** the five `crmTaxonomy/<kind>` nodes do not exist in production
yet. Rules are `auth !== null` so reads are fine, but **live behaviour of the new nodes is
unverified by rule** — it is a first-boot check for Martice, not something an agent may confirm.

### Sprint-04 Track D — merged 2026-07-27 (`64d2f3f`)

The 21-item guides punch list. All 21 done. Highlights: the column-alignment defect was a real CSS
bug (`.price-table th` was `text-align:left` over `td:not(:first-child){text-align:right}`, so a
price sat ~125 px from the heading it belonged under) — **66 failing cells across all 10
marker-guide tables, now 0**; print headers cut from 52.8–87.7 mm to 24.2–36.2 mm across 15 guides
and 6 catalogs with screen heights byte-identical; vault guide 12→10 pages; direct cremation 4→2;
`outside-marker-rules.html` finally has a PDF; and a cremation facet on the casket catalogs built
by matching **item number, not name** — 18/18, zero fuzzy matches.

**The container images were not merely low-res, they were the wrong products.** 11 of 22 files in
`cremation-images/` showed a different item than their filename claimed, including two clean
swaps. Measured perceptually rather than eyeballed: each file scored 0.4–0.8 mean absolute
difference against a *different* catalog item and 16–30 against the one it was named for. All 22
references repointed at the real catalog images; 56 of 56 product photos embedded in the rebuild.

**Director-verified rather than taken from the report:** `index.html` untouched **against the
branch's own merge base** — an earlier check against a moved `main` showed it as changed, which
was an artifact of comparing the wrong thing, not a fact; `ops/` untouched;
`BRAND_AND_BUILD_LOG.md` +82/−0, appended not rewritten; `8 blocks, 0 errors`; 292 table cells
across 20 pages, 0 failed; 21 pages under the 40 mm cap; catalogs and guides-page verifiers green;
the price reconciliation test reports `14 cells reconciled, 4 escalated, 0 unmatched`.

**The new alignment gate was sabotaged by the director independently** — and the first attempt
*failed to apply*, because the search string omitted a trailing semicolon. Nothing was concluded
from that pass, per `MISTAKES.md` #8. Redone correctly: rule removed → **66 failed, exit 1**;
restored → 0 failed, exit 0.

**Full `npm test` on the merged `main` is still OUTSTANDING** — Track B holds port 3737 and the
served-tree guard correctly refuses to test against another tree's server. `npm run check` is
green. Run the suite once Track B lands; expect roughly 758 + 20.

### The 28″ × 34″ marker under-quote — FIXED 2026-07-27 (`2996575`, local only)

Operator instruction, direct: *"fix the 28x34 marker price too."* Done by the director as an
audit fix, on `main` in the ops worktree, while Track B held `index.html` in the main tree. The
change is one row in `FLUSH_SIZES`, in a region no other track is editing.

`['28"x34"x4"',2175,2610,3015,4060,5115,6135,495]` →
`['28"x34"x4"',2735,3280,4110,5050,6010,7210,495]`.

**Column mapping was validated, not assumed.** `guide price = (base + setting fee) × 1.104`
reproduces the printed marker guide **to the cent** on four independent cells, which
simultaneously confirms the six price columns and that the setting fee stays **495**, not the
795 used by the larger sizes.

**All 14 flush rows were reconciled against the book, not just the one that was reported.**
Eleven agree exactly. Of the three that did not: one was this defect; one is the book's own C16
typo (item 0 above); one is `36″ × 72″` encoding "call for quote" as `null`, which is correct.
Three other rows are legitimately identical to a neighbour because the book prices them the same
— so a duplicate row is not by itself evidence of a bug, which is why every row was checked
rather than every duplicate flagged.

**Generator baseline 14/14 identical.** No contract carries a 28 × 34 marker, so no generated
document moved — verified by a real capture, not inferred from a grep. Captured against a
dev server on port **3738** so the running track's server on 3737 was never disturbed.

### The two price disagreements as originally escalated

Both verified independently by the director, reading the price book and `index.html` directly.
**Nothing was changed. Only Martice can settle these.**

**1. The tool under-quotes a 28″ × 34″ flush marker.** `index.html:6935` is a **verbatim
duplicate** of the `32″ × 20″` row above it — both read
`[2175, 2610, 3015, 4060, 5115, 6135, 495]`. The price book (Flush Markers, row 15) gives 28 × 34
as `[2735, 3280, 4110, 5050, 6010, 7210]`. Base-price shortfall per granite column:
**$560, $670, $1,095, $990, $895, $1,075**. The guide and the price book agree with each other;
the tool is the odd one out. *(Track D reported the customer-facing range as $618.24–$2,880.24;
the director's directly-measured base deltas are the figures above. The discrepancy is in how the
tool marks up, which was not traced — the existence and direction of the defect are certain, the
exact figure on a family's quote is not.)* **Fixing it requires editing `index.html`, which Track
D was forbidden to touch. It belongs to a tool-side track.**

**2. The price book itself has a typo, and the tool is right.** Sheet `Flush Markers`, **cell C16
is a hard-coded `32610`** — no formula. Every other row's G1-Tariffed / G1-Non-Tariffed ratio
falls in 1.1981–1.2008; that row's is **14.9931**. `2175 × 1.20 = 2610` exactly, and the tool uses
2610. The marker guide had been printing **$4,146.62**, which back-solves to a base of 3261 — the
typo divided by ten. So the guide had inherited a data-entry error out of the price book.

**The director's original hypothesis was wrong.** The flagged anomaly was real, but the
explanation offered — "two values swapped between columns" — was not what was underneath. The
count found the defect; the story told about it did not survive contact with the source.

### Sprint-04 Track B — merged 2026-07-27 (`49ec0a5`)

Contacts is now a worklist whose entire state is a URL. Sortable table (Name · Status · Source ·
Next action · Last activity · Owner), basic filter bar plus an unlimited advanced builder (21
fields, 11 operators), filter chips, five built-in views with live counts, saved views at
`savedViews/<id>`, and in-place selection with a bulk action bar — no work-group screen, per D2.

**Director-verified rather than taken from the report:** `8 blocks, 0 errors`; **903 passed, 0
failed across 22 suites** — and the arithmetic reconciles exactly (636 at boot + 122 Track A + 20
Track D + 125 Track B = 903), with `test-contacts.mjs` still reporting its original 47 despite
Track B editing it; **14/14 baseline identical**, captured against a server proven by content
marker to be serving the merged tree; no generator, price or template touched.

**The merge was the risk and it was checked, not assumed.** Track B branched from `983b574`,
which predates the 28 × 34 price fix. A silent revert of that row would have put the under-quote
straight back. Verified after merging: corrected values present exactly once, old values absent.

**Track B caught a hollow test in its own suite, which is the report's most valuable line.** Its
first round-trip fixture used `status` + `source` + `q=ada`, where `q` alone was decisive — so a
serialiser that silently dropped `source` still round-tripped green. It reshaped the fixture so
every param is individually load-bearing **and added an assertion that verifies that property
before the round-trip runs**. Same class as the sprint-02 sabotage that hit the wrong object.

**Two UI reductions the director accepted but which Martice should see:** the per-row Edit button
is gone (the row name opens the detail, which has Edit — editing is one click deeper), and role
pills no longer appear on the row. Both follow from D9's column list; both are reversible.

**Open, and not a defect yet:** bulk actions have no undo. D7's undoable-batch rule was scoped to
import. A bulk status change across 40 records is currently irreversible. Worth deciding before
it bites.

### Sprint-04 Track C — merged 2026-07-27. SPRINT COMPLETE.

Generic CSV import — pick → map → preview → import, each step backable — with our own
`bwCsvParse`/`bwToCsv` (no vendored library, per D6), auto-mapping over a synonym table,
taxonomy label→code resolution, duplicate skip on exact email or 10-digit phone (D8), per-record
writes carrying `_prov`, `importBatches/<id>` with **full undo** (D7), an Imports list, and CSV
export folded into one serialiser shared with Track B's bulk export.

**Director-verified rather than taken from the report:** `8 blocks, 0 errors`; **1038 passed, 0
failed across 23 suites** with every pre-existing count unchanged; **14/14 baseline identical**;
every write is `<collection>/<id>`; no generator, price or template touched.

**The demo file was cleared for a public repo independently, not on the track's word.** 31 rows,
every email `@example.com`, all 29 phones inside the reserved `(206) 555-01xx` range, and **zero
surname collisions against 173 real map data files**. `data/demo-contacts.csv` is safe to publish.

**The SPA-fallback trap was re-measured, not trusted.** A missing file under `data/` still returns
**2,868,170 bytes of `index.html` at HTTP 200**. The loader ignores `res.ok` entirely and
validates the body shape and header row. Without this, "Load demo data" against a stale deploy
would have parsed 2.8 MB of HTML into nonsense contacts — in a live production database.

**The track's honesty is the reason to trust the rest of it.** It states plainly that undo is
proven against `tests/fake-firebase.js` and not production RTDB; that its "identical store"
comparison normalises empty containers symmetrically, because the stub leaves `importBatches: {}`
where real RTDB removes a childless node — so it could hide an *emptiness* production wouldn't
have, though not a record; that security-rule rejection is never exercised against a real
rejection; and that one demo contact (no email, no phone) would duplicate itself on an
export/re-import round trip, because there is nothing to match it on.

**Two dated time bombs it flagged:** `2029-04-12` and `2029-09-04` keep "Needs follow-up" at
exactly 6. The suite asserts they are still in the future and names them when they are not.

### Finding at the merge: the runner hides an announced skip

Merging Track C produced **1036** in the ops worktree against **1038** on the branch. Not a
regression — `wmp-cemetery-map/` is gitignored and absent from every worktree, so the demo file's
name cross-check does not run there. The suite *does* print `NOTE ... DID NOT RUN`, exactly as
designed; **`run-all.mjs` swallows per-suite stdout and shows only the summary line**, so nobody
ever sees it.

The falling count was the only visible signal, and it was visible only because counts were
compared across two trees. Recorded in `DESIGN.md` §5, and the expected figure is now written
with its caveat: **1038 with the map present, 1036 without.**

## Open, and needing Martice

0. **CLOSED 2026-07-27 — the marker price chain now agrees end to end.** Tool, guide and
   workbook all say **2610**, on Martice's ruling. The exception list is empty at 18 reconciled,
   0 escalated.

   **The workbook was corrected at source**, on his explicit instruction:
   `E:\Downloads\2026 PCM Markers Price Book EFF 03.01.2026.xlsx`, sheet `Flush Markers`,
   cell **C16**, `32610` → `2610`. Backup at
   `…BACKUP-2026-07-27.xlsx` before anything was touched.

   **Done by XML surgery, not `openpyxl`.** That workbook has **106 zip entries** including
   drawings; a library round-trip can silently drop images and conditional formatting. Only
   `xl/worksheets/sheet1.xml` was rewritten and every other entry was copied byte-for-byte with
   its original `ZipInfo`. Cleared first: C16 is a plain literal with no `<f>`, the sheet has
   **zero formulas**, **nothing anywhere references `'Flush Markers'!C16`**, there are no defined
   names and no `calcChain` — so nothing downstream needed recalculating.

   **Verified afterwards by diffing every cell of all 12 sheets against the backup: exactly one
   cell differs.** The tariffed/non-tariffed ratio is now 1.2000, matching rows 10 and 20 to four
   decimals; before, it was 14.9931 against a 1.1981–1.2008 spread everywhere else.

   *Why it was flagged:* every other row's tariffed/non-tariffed ratio sits in 1.1981–1.2008;
   that row's was **14.9931**. The guide's printed `$4,146.62` back-solved to the typo ÷ 10, and
   is now `(2610 + 495) × 1.104 = $3,427.92` — arithmetic verified against four other cells.
   The row is monotonic again, which is the property whose absence found it.

0b. **RESOLVED 2026-07-27 — the 28″ × 34″ under-quote is fixed** (`2996575`, local only).
   See below.
1. **Two possible double sales** in CN and ELN - two spaces each recording two different people at
   one interment position. Nothing in the data was changed; only MIS settles it.
2. **`VASE` and the O&C write-back loop** - the file has one vase per structure, the tool sells
   three SKUs; and `build-prices.py` scrapes the eight O&C amounts out of `index.html`, so they
   cannot yet be changed from the file end (~20 lines map-side).
3. **The map tint** - measurably real (24.7/255) but subtle over bright dry grass. One token,
   `--tint-alpha`. Only Martice can judge the photo case.
4. **Randy's GA producer ID** - blank by design until he has one.
5. **`available` is cream outdoors, green indoors** - deliberate, worth a decision.
6. **Five parked niche accuracy items** - recorded as DEFERRED in the map's docs, not to be chased.

## Read this too: `MISTAKES.md`

A running record of director errors and what each one taught, kept because a mistake nobody
wrote down gets made again. Read it at boot alongside this file. The short version: every real
defect this project has found was found by **counting something and comparing it to an
expectation** — not by looking at the thing and judging it. Confident prose has been wrong more
often than measurements have.

## Background jobs

| Job | Status | Where | Notes |
|---|---|---|---|
| sprint-01 Track A | **shipped, live** | `s01/externalize-templates` | merge `4019c92` |
| Guides audit | **shipped, live** | `guides/marker-pdf-colors` | merge `1e39642` |
| Advisor identity | **shipped, live** | `fix/advisor-identity` | merge `cd16fdf` |
| Map audit | **merged, local-only** | map `audit/map-bugs` | merge `b9677db`; map repo has no remote |
| sprint-02 Track A | **merged, local-only** | map `s02/map-inventory-styling` | map repo has no remote |
| Discontinued vaults | **shipped, live** | `fix/discontinued-vault-products` | merge `3c0228c` |
| cemUpdate (other session) | **shipped, live** | `claude/awesome-cerf-226213` | merge `56e3d49` |
| sprint-03 Track A | **shipped, live** | `s03/prices-single-source` | merge `875bcaf` |
| sprint-04 Track A | **merged, local only** | `s04/contact-record` | merge `f481637`; audited and re-verified by the director |
| sprint-04 Track B | **merged, local only** | `s04/contact-search` | merge `49ec0a5`; audited, and the 28x34 price fix verified to survive it |
| sprint-04 Track C | **merged, local only** | `s04/contact-csv` | final track; demo CSV cleared for public release by independent PII scan |
| sprint-04 Track D | **merged, local only** (2026-07-27) | `s04/guides-audit` | merge `64d2f3f`; all 21 items done. Ran S9 in worktree `../bw-quote-tool-guides`. Never touched `index.html`, verified against its own merge base |

All worktrees removed at close except the map's, which stay until their branches are pruned.
**Every branch above is LOCAL ONLY** - none was pushed, per the corrected rule that every push is
an operator gate.
## Director's boot audit, 2026-07-26 — what changed before Track A spawned

The 2026-07-25 Gate 0 ticks did not survive re-verification. Three defects, all found by
checking artifacts instead of trusting the doc. Fixes landed in `scratch/` and `ops/` only —
`index.html` was not touched.

1. **`GA_PDF` had zero baseline coverage** while the baseline reported "12/12 captured".
   `printGAContract` (`index.html:4737`) — the only generator that produces the GA contract
   itself — was simply absent from the harness's list, because `gaLines()` needs an imported
   funeral-home quote and without it the function alerts and returns (the same fixture trap as
   the RIC). `GA_PDF`'s only other call site is ClearPoint's `!isBurial` branch
   (`index.html:15270`), which the burial-default fixture never reached. So the sprint's
   most important gate had a hole directly over the largest template (1.49 MB). **Fixed:**
   both scenarios added, baseline is now **14/14**.
2. **The baseline was not reproducible.** A re-capture on 07-26 against an unmodified
   `index.html` changed 5 of 12 signatures — all wall clock: the RIC's `Time` field (4:33 vs
   10:10), its AM/PM checkboxes, `25th July` ordinals, and `Valid through <today+30>` on the
   three quote PDFs. The RIC's 141-field map is the designated template-swap detector; a
   signature that drifts daily cannot detect anything, and would have taught whoever read it
   to dismiss RIC field diffs. **Fixed:** capture clock frozen at
   `CLOCK = '2026-07-01T10:00:00'` via `page.clock.setFixedTime`, installed before any app
   code runs. Verified by two independent full captures producing identical signatures for
   all 14.
3. **`npm run check` will legitimately print 8 blocks, not 9,** after this sprint.
   `GA_CL_PDF_B64` occupies a `<script>` block of its own (`index.html:17620`, the last before
   `</body>`) containing nothing else. The track file demanded "exactly 9 blocks", which was
   unsatisfiable without leaving a junk empty block. **Fixed** in `SPRINT.md` and the track file.

Also confirmed by direct check, not assumed: **all 13 extracted templates are byte-identical
to the base64 `index.html` ships today** (decoded the live literals and compared SHA-256s).
That is the assumption the entire sprint rests on, and it holds.

**Current reference baseline:** `%TEMP%\bw-baseline\before` — 14 artifacts + `manifest.json`
+ `signatures.json`. Superseded copy kept at `before-ARCHIVE-2026-07-25-unfrozen-clock`.

**Durability gap — RESOLVED 2026-07-26 (`b8528cb`).** The harness is now tracked at
`scripts/baseline-capture.mjs` and `scripts/baseline-sign.mjs`. It had lived in gitignored
`scratch/`, meaning the gate that decides whether a PDF-touching sprint may merge existed on
exactly one machine and a fresh clone could not verify a sprint at all.

Copied, not moved: Track A was already running against the `scratch/` paths named in its
prompt, and removing them mid-flight would have broken its gate 4. **Delete
`scratch/baseline-capture.mjs` and `scratch/baseline-sign.mjs` at sprint close**, once Track A
has merged and nothing references them. Neither copy is edited in the meantime, so they cannot
drift. Import resolution from `scripts/` is verified (playwright and jszip both load); a full
runtime capture from the new path is deferred to the close gate, since running one during the
track would fight it for port 3737 and read a half-edited `index.html`.

## Verified facts a director can rely on (2026-07-25, amended 2026-07-26)

Do not re-derive these.

- **Baseline captured, 14/14 scenarios**, on unmodified `main`, frozen clock. Artifacts,
  `manifest.json` and `signatures.json` in `%TEMP%\bw-baseline\before`. Harness:
  `scripts/baseline-capture.mjs` + `scripts/baseline-sign.mjs` (tracked as of `b8528cb`;
  `scratch/` copies survive only until sprint-01 closes). Re-run with `TAG=after` from the
  repo root; the dev server must already be listening on 3737 (the script does not start it).
  Key signatures: RIC 6 pages / **141 AcroForm fields**, ClearPoint burial 3 / 106,
  **ClearPoint cremation 4 / 151**, **`printGAContract` 11 / 261**, the four checklists
  1 page / 10–15 fields, the three quote PDFs 2/1/3 pages / 0 fields (drawn — text-hashed
  instead), CIRGAS 179 zip entries, commission worksheet 21.
- **Templates extracted, 13 files**, to `pdf-templates/embedded/` with SHA-256s in its
  `manifest.json`. 9.42 MB base64 → 7.06 MB binary. Untracked so far; `index.html` untouched.
- **Extraction came from the embedded base64, never from `pdf-templates/*.pdf`.** Verified
  by hash: `ClearPoint Contract 2026.pdf` (448 KB) and
  `WMP_Retail_Installment_Contract_2026.pdf` (1,128 KB) are **different bytes** from what
  ships (440 KB and 1,073 KB). Only `GA Document Quote Tool.pdf` matches its blob. Whether
  those two are newer templates or stale originals is an OPEN QUESTION (below).
- **Externalize 11, not 13.** `FQ_LOGO_WHITE_B64` / `FQ_LOGO_COLOR_B64` are 5 KB each and
  feed *synchronous* functions in the family-quote PDF builder; async would ripple for 0.1%
  of the payload. They stay inline. The 11 others are 9.40 of the 9.42 MB.
- **The 18 unnamed base64 blobs are fonts** (`FQ_FONTS` + pdf-lib standard-14 AFM data),
  0.29 MB total, needed synchronously during PDF generation. Out of scope, leave inline.
- **Two `atob(` calls must not be touched** — lines 8546 and 15714 decode canvas
  `toDataURL()` output, unrelated to templates.
- **Measured file shape:** 11.96 MB raw / 17,622 lines / 7.30 MB gzipped per load; base64
  is 81.2%; the app's own source is 2.30 MB raw → 670 KB gzipped; ~435 ms load, 0 console
  errors. There is no runtime performance problem.
- **The generators are drivable headlessly.** All 13 entry points exist on `window`;
  Firebase can be hard-blocked with `page.route()`; the sign-in gate does NOT block PDF
  generation (`PRICE_INDEX` still builds all 841 entries with Firebase dead); hiding
  `#bwGate` in the DOM is enough — no credentials involved.
- **Two fixture traps**, learned the hard way: the Combined quote keeps its own state
  (`_combCemLines`/`_combFhLines`) and needs `_syncCombinedCemetery()`,
  `_syncCombinedFuneral()`, `combUpdate()`; and **the RIC contract is generated FROM a
  cemetery quote** — without one it alerts and produces no download. A naive baseline
  silently captures nothing for 3 of 12 generators.
- **12 of the 13 generator entry points are already `async`** with `await` inside. Only
  `clDownloadFilledWorksheet` is synchronous.
- `npm run check` → `index.html: 9 blocks, 0 errors`. `npm test` → `368 passed, 0 failed
  across 12 suites`.
- Firebase auth usernames (`martice`, `randy`) and `BW_LOGIN_SUFFIX = '@bwquote.local'` are
  already public in `index.html`'s `BW_USERS` map. Committing them in test fixtures adds no
  new exposure.
- **The map repo is sprint-ready.** `wmp-cemetery-map/` is its own git repo with **no
  remote** (so map-side work can be committed locally but never pushed anywhere), and it
  already has a real `npm test` = `bake-alignment.test.mjs && npm run validate`. Green as of
  2026-07-25: **19 assertions + 2/2 unit files + 2,770 units + index ok**, exit 0.
- **`scripts/validate.mjs` was red and is fixed (2026-07-25, uncommitted).** Its file filter
  swept in every `.json` under `data/geojson/`, so the `areas.json` index was validated
  against `unit.schema.json` and failed for not being a FeatureCollection — a false alarm
  that trains people to ignore a red suite. It now validates `.geojson` only and checks
  `areas.json` as an index in both directions. Proven to fail correctly: a listed area with
  no build → exit 1; a valid build not listed → exit 1.
- **The map repo has other work in flight** — `data/garden-markers.json`, `data/mausolea/SER.json`,
  `docs/INDOOR_AND_NICHE_BUILDINGS.md`, `index.html`, plus untracked `MVCN.json`,
  `buildings/MVC.json`, `SER_SERENITY_PRICING.md`. Not ours. Stage by name there too.
- **`prices.json` already exists on the map side** — `wmp-cemetery-map/data/prices.json`,
  schema 2, generated 2026-07-25, purpose: "Single fee/price schedule shared by the cemetery
  map and the quote tool, replacing three copies that disagreed." **Sprint S2 is about making
  the TOOL consume it**, not about inventing a format.
- **The map/tool integration contract is now written down** in `DESIGN.md` §7, verified
  against both codebases rather than recalled. It previously existed only in session memory —
  the exact context rot this system exists to prevent.

## Decisions log

| Date | Decision | Where recorded |
|---|---|---|
| 2026-07-25 | Standing decisions from init interview | `DESIGN.md` §8 |
| 2026-07-25 | `ops/` tracked; bookkeeping under `[sNN/ops]` | `SPRINT_GUIDELINES.md` |
| 2026-07-25 | Opus for all tracks | `SPRINT_GUIDELINES.md` |
| 2026-07-25 | Sprint-02 is `prices.json`, built for repeated updates | `ROADMAP.md` S2 |
| 2026-07-25 | No `file://` support needed | `DESIGN.md` §8 |
| 2026-07-25 | Prefetch + retry + explicit error; no persistent cache | `DESIGN.md` §8 |
| 2026-07-25 | One change: loader in, literals out | `DESIGN.md` §8 |
| 2026-07-25 | Acrobat gate only when a change touches the RIC itself | `DESIGN.md` §5 |
| 2026-07-25 | Cross-repo sprints use ONE director and ONE `ops/`; tracks may target either repo | `DESIGN.md` §7 |
| 2026-07-25 | Map data never crosses into this repo in any form — not fixtures, comments, or reports | `DESIGN.md` §6 |
| 2026-07-26 | Org rollout is a future milestone, not a non-goal; no design may make it a rewrite | `DESIGN.md` §1, §8 |
| 2026-07-26 | Baseline covers 14 scenarios on a frozen clock; signature equality is exact | `DESIGN.md` §5 |
| 2026-07-26 | Template LOAD failures must surface by name; FILL failures may still warn | `DESIGN.md` §8, TRACK-A step 4b |
| 2026-07-26 | The baseline harness is tracked in `scripts/`, not gitignored `scratch/` | `DESIGN.md` §5, commit `b8528cb` |
| 2026-07-26 | Future state is **multi-tenant** (separate organisations), not more users at one site. Rescopes S6 and promotes the price-book work from tidying to structural blocker | `DESIGN.md` §1, `ROADMAP.md` S6 |
| 2026-07-27 | Contacts becomes a CRM (S8). Design authority delegated to the director; decisions D1–D10 | `sprints/sprint-04/SPRINT.md` |
| 2026-07-27 | A contacts view IS a URL — filters serialise into the hash, saved views are stored hashes, every view is dynamic | `sprints/sprint-04/SPRINT.md` D1 |
| 2026-07-27 | Next action and last activity are DERIVED from notes/tasks, never stored — no migration mechanism exists | `sprints/sprint-04/SPRINT.md` D4 |
| 2026-07-27 | Every CSV import is a batch and every batch is undoable; this is what makes importing into live data acceptable | `sprints/sprint-04/SPRINT.md` D7 |
| 2026-07-27 | The 30 demo contacts reach production by MARTICE importing them through the UI. No agent writes to production, ever | `sprints/sprint-04/SPRINT.md` close gate |
| 2026-07-27 | Taxonomies (source/status/category/flags/task kinds) are editable data with code defaults; a contact stores the CODE, never the label | `sprints/sprint-04/SPRINT.md` D5 |
| 2026-07-27 | Appointments and the calendar are deferred; to-dos with due dates cover follow-up for now | operator, 2026-07-27 |
| 2026-07-27 | The track cap is on PARALLELISM, not count — sequential tracks cannot conflict | `SPRINT_GUIDELINES.md` |
| 2026-07-26 | Field/offline capability is a **goal post, not a requirement** — not scheduled, not a non-goal. Sprint-01's no-persistent-cache decision stands; a service worker is the answer if field use becomes real | `DESIGN.md` §1 |
| 2026-07-28 | Internal/partner source PDFs live in gitignored `reference-docs/internal/`; deliverables are built FROM them, the files themselves are never published | `.gitignore`, sprint-06 |
| 2026-07-28 | **Exception to DESIGN §8's "never load prices from a printed sheet":** the June 2026 MVC glass-front sheet was adopted as the price/layout source on explicit operator instruction — MVCN is new inventory with no MIS records yet. MIS verification stays an open item, via operator screenshots (agents have no MIS access) | sprint-06, Track M item 7 |
| 2026-07-28 | The MVC niche map is 3D-first at the same URL, print stays flat-grid static HTML; the page is GENERATED (`build_mvc_map.mjs`) — edit the data module, never the HTML by hand | sprint-06, Track M3 |
| 2026-07-28 | Physical niche dimensions follow the Matthews fabrication drawing (K25-377) over any prior page label — 30 corrections operator-approved | sprint-06 close |

## Sprint history

| Sprint | Outcome |
|---|---|
| sprint-01 | **SHIPPED AND LIVE, verified on GitHub Pages 2026-07-26.** Eleven contract templates externalized to `pdf-templates/embedded/`, loaded on demand. `index.html` 11.96 MB → 2.554 MB raw, 7.30 → 0.879 MB gzipped (**8.3×**, not the 11× predicted — see below). All 14 generator signatures byte-identical, verified independently by the director. Merge `4019c92`; track commit `1e0c986` on `s01/externalize-templates`. |

### Sprint-01 live verification (close gate items 3, 3b and 5 — CLOSED 2026-07-26)

Pushed to `origin/main` and verified against the real deployment at
`https://marticeisme.github.io/bw-quote-tool/`. **Note the Pages URL** — an earlier session
message guessed `mmorrison-bw.github.io`, which is wrong; the GitHub account is `Marticeisme`.

- **All 11 externalized templates resolve over HTTPS**: HTTP 200, correct content types
  (`application/pdf`, xlsx), correct magic bytes (`%PDF` / `PK`), and **SHA-256 identical to
  the Gate 0 manifest** — 11 identical, 0 differing. This was the one thing localhost could not
  prove.
- **Live transfer size: 928,172 bytes gzipped** for `index.html`, against 7.30 MB before.
  Confirmed on the wire, not measured on disk — the dev server does not compress, so the local
  close-gate check (item 3) was never actually checkable; it needed the real host.
- **A full RIC generated end to end from the live site** (`scratch/live-contract-check.mjs`,
  Firebase blocked and stubbed, read-only): 1,923 KB download, `%PDF`, no dialogs, no page
  errors. The templates fetched were `RIC_PDF_B64`, `ACH_PDF_B64`, `RULES_PDF_B64` **and
  `RIC_CL_PDF_B64`** — the fourth arriving because `bwPrefetchTemplates('ric')` fires on
  section entry, i.e. the prefetch works in production as designed.
- **That live PDF is identical to the verified baseline** (`scratch/live-ric-signature.py`):
  6 pages, 141 AcroForm fields, **0 of 141 field values differing, 0 of 6 pages of text
  differing**. The contract a counselor gets from the live site is the contract that was
  verified locally.
- The harness ran from `scripts/`, closing item 3b.

**A scar worth keeping:** the first version of that comparison reported a MISMATCH on
`textHash`/`fieldsHash` while showing zero differing fields. The signatures were recorded by
Node (`JSON.stringify`) and recomputed in Python (`json.dumps`), which inserts spaces after
`:` and `,` — different strings, identical data. **Never compare hashes across two serializers;
compare the content.** `signatures.json` stores the full text array and field map precisely so
content comparison is possible.

### Sprint-01 close notes

**Verified by the director, not taken from the track's report:** `npm run check` →
`index.html: 8 blocks, 0 errors`; `npm test` → `368 passed, 0 failed across 12 suites` with
per-suite counts unchanged; a fresh `TAG=audit` capture diffed against the reference baseline →
**all 14 signatures identical**, including the RIC's 6 pages / 141 fields and
`printGAContract`'s 11 / 261; all 13 committed templates hash-match the Gate 0 manifest; no
contract-template base64 remains inline; no emails or phone numbers anywhere in the diff. The
merged `main` is byte-identical to the audited branch for `index.html` and every template
(`git diff` empty), so the branch verification carries over — and with the capture clock frozen
there is no nondeterminism a re-run could surface.

**Deviation — the gzip target was wrong, not the work.** DoD item 1 demanded ≤750 KB; the
result is 879 KB. The residual 0.303 MB of inline base64 is pdf-lib's standard-14 AFM metrics,
`FQ_FONTS` and the two SVG logos, all explicitly out of scope. Stripping only those gives
656 KB — exactly the "~0.67 MB" the sprint predicted. The target was the *font-free* number
applied to a file that always keeps its fonts. Corrected in `SPRINT.md` to 880 KB.
**Lesson: when a size target excludes something, state the target including what it excludes.**

**Three track decisions the director reviewed and accepted:**

1. **The loader checks magic numbers, not just `res.ok`** — because `dev-server.mjs`'s SPA
   fallback answers a missing file with `index.html` at **HTTP 200**. The track's first gate-5
   run reproduced the pre-fix bug exactly: a 4-page RIC downloaded with no alert. Now `%PDF` /
   `PK` is required. Independently corroborated — the served `index.html` is 2,678,324 bytes,
   the exact figure in the track's error message. A captive portal or proxy error page behaves
   the same way, so this earns its keep in production.
2. **ClearPoint's cremation-authorization page got the same load/fill split** as ACH and Rules,
   one call site beyond the letter of step 4b. Accepted: `atob(GA_PDF)` on an always-present
   literal could never fail, so leaving `await bwTemplate()` inside that `catch(e){warn}` would
   have *introduced* a new silent failure. The change preserves the invariant rather than
   altering behavior, and `DESIGN.md` §8 states the load/fill rule generally.
3. **Five entry points gained a `try/catch` + `alert`** (`riclGeneratePdf`, `anclGeneratePdf`,
   `gaclGeneratePdf`, `cpclGeneratePdf`, `clDownloadFilledWorksheet`). None had any catch, so a
   loader rejection would have escaped as an unhandled promise rejection with nothing on
   screen — which would defeat the whole point of deleting the old `typeof … === 'undefined'`
   alerts. Each is a minimal 3-line wrap; no function body re-indented.

**A track claim the director wrongly "corrected".** Track A reported the Browser pane opening
`index.html` "via the PostToolUse hook". The director looked for that hook in
`.claude/settings.json` and the user-level settings, found none, and recorded the track as
having misattributed the mechanism. **The track was right and the correction was wrong.** It is
a genuine `PostToolUse:Edit` hook, implemented at the *harness* level — which is exactly why it
is in no settings file and cannot be disabled from one. The director reproduced it minutes
later on `vault-guide.html`, where it announced itself verbatim: `PostToolUse:Edit hook
additional context: <file> is now visible in the Browser pane`. `DESIGN.md` §6 now records the
correct mechanism.

**Lesson, and it cuts the opposite way to the usual one:** "verify, don't trust" applies to a
director's own disconfirming evidence too. Absence from the two settings files did not prove
absence of the hook; it only proved absence *from those files*. A negative result across an
incomplete search space is not a refutation. When a report names a mechanism you cannot find,
the honest finding is "I could not confirm it", not "it does not exist".

## The map audit — MERGED into the map's `main` 2026-07-26 (`b9677db`)

Branch `audit/map-bugs`, 9 commits, merged as **`b9677db`**. It had been held back while the
other session finished; that session committed (`2afde80`, `36aacd3`) and the merge went ahead.

**It conflicted, and the resolution mattered.** Both sides had rewritten the same rendering
code in `wmp-cemetery-map/index.html`. Taking either side wholesale would have silently
destroyed the other's fix:

- **CSS block** — kept both. Their `--col-cell`/`--col-gap` variables (a double-width unit must
  be exactly two cells *plus* the gap between them) and the audit's
  `max-width: min(2400px, 100%)` (which stopped the three widest structures hanging 450px off
  the left edge with the Back button unreachable). Orthogonal changes.
- **`renderColumbarium`** — took their CSS-grid layout, which draws units at real size via
  `w`/`h` spans, and carried the audit's `data-wall`/`data-lvl`/`data-sp` attributes and
  `escapeHtml` calls into it. `runColLassoHit` reads those attributes instead of splitting an
  id on hyphens; dropping them re-breaks the lasso in 9 of 12 structures.

**Verified in a browser at 1500px and 1100px**, not just by suite: TGM 318 units, COM 875,
COH 304, GCM 1011, ELM 477 — every card on screen, Back reachable, every unit carrying
`data-wall`, zero overlapping grid placements, no page errors. TGM at 1100px now sits at
left=0 with Back at 16; it was at −450. And **MVCN, their brand-new glass-front wall, renders
146 units all carrying `data-wall`** — it inherits the lasso fix, which neither branch could
have demonstrated alone. Suite: 19 + 7 + 8 and `2/2 unit files valid, 2770 units checked,
index ok`. No screenshots captured — the wall view renders occupant names.

**Director-verified, not taken from the report:** sid entries 59,693 → 79,493, exactly +19,800
added and **zero removed** (purely additive, no existing lookup disturbed); suite 19 → 34
assertions, 0 failed; `KNOWN_CONFLICTS` holds position identifiers only, no names; nothing
crossed into this public repo.

**Two live data conflicts are escalated and unresolved — these need MIS and the paperwork.**
Two spaces each record two different people at the same interment position, which `validate.mjs`
treats as the data shape of a double sale. One is two interments both at depth "2nd"; the other
is an interment at "2nd" plus a different person's reserved right at "2nd". They are in **CN**
and **ELN**, identified by position key in `KNOWN_CONFLICTS` at the top of
`wmp-cemetery-map/scripts/data-integrity.test.mjs`. The suite fails on any new conflict AND on a
listed one that stops conflicting, so the list cannot go stale. **Nothing was changed in the
data.** Resolving which record is correct is Martice's, against MIS.

## Advisor identity — shipped to local `main` 2026-07-26 (merge `cd16fdf`)

Out-of-sprint, operator-requested. Branch `fix/advisor-identity`, 6 commits, never pushed.

**The bug:** the signed-in counselor's identity reached nothing that got generated. Randy
signed in and Martice's name came out on the paperwork — including `A4176-PG1-1`, the
Insurance Producer of record on the Global Atlantic application. Identity now resolves
through one accessor, `bwCurrentAdvisor()`, with **no fallback**: an account missing from
`BW_USERS`, or an entry missing a field, gets nothing for it and never another counselor's
value. Also fixed: Family Guides opens in its own tab instead of destroying in-progress work,
and closing with unsaved changes now warns.

**The GA producer ID is deliberately blank** for anyone without one on file (Martice,
2026-07-26). A wrong-but-plausible ID reads as a complete form and gets filed; a blank field
is self-evidently unfinished and gets caught. Same fail-visibly rule as sprint-01's
load-versus-fill split. **Randy hand-writes his on the generated PDF until an ID is added.**

**Director-verified, not taken from the report:** `8 blocks, 0 errors`; `467 passed, 0 failed
across 14 suites` (up from 368/12, no suite fell); **as martice 14 identical, 0 differing** —
his identity is on file, so nothing of his moved, which is what proves the change is scoped;
**as randy 0 structural changes**, 14 field changes and 20 changed page-texts, all 20 texts
explained entirely by advisor identity once identity tokens are normalised; the producer-ID
change isolated against the prior randy capture as **exactly one field**, `A4176-PG1-2`
`"183881"` → `""`, with `printGAContract` still 11 pages / 261 fields.

**Two director errors this work exposed — both worth keeping.**

1. **The recon handed to the track was wrong twice.** It listed ~19 hardcoded sites when there
   are 37, missing the advisor block printed on every family-quote PDF and the Insurance
   Producer email; and it asserted the sidebar at line 629 was already resolved at runtime.
   It was not — the Overview contact panel had been showing Randy the wrong email and phone
   to read out to a family. The track verified instead of trusting, which is the only reason
   both were caught. **A director's recon is a lead, not a finding; say so when handing it over.**
2. **A `[s01/ops]` commit landed on the feature branch instead of `main`** (`a7ba776`). The
   director left a shell `cd`'d into the worktree and used bare `git` — violating this
   project's own "with worktrees, ALWAYS `git -C <absolute-path>`" rule, which exists for
   precisely this. Staging explicit paths is the only reason it did not also sweep the
   track's in-flight edits into the commit. It was left in place rather than reset, because
   git surgery inside a worktree while an agent is live is the more dangerous move; it rode
   in with the merge and the merge message records it. **Use subshells — `( cd X && cmd )` —
   for anything needing a working directory, and `git -C` for every git call.**

**Still open:** `BW_DEFAULT_ADVISOR` is `martice`, so if the auth SDK is unreachable and
someone reaches generation without a signed-in user, documents carry Martice's full identity
**including his producer ID** — the exact bug just fixed, resurfacing on one edge path. The
sign-in gate normally prevents it. Worth deciding whether an unauthenticated generation should
instead produce a visibly blank advisor.

## Sprint-02 (map inventory styling) — MERGED 2026-07-26

Branch `s02/map-inventory-styling`, 3 commits, merged `--no-ff` in the map repo. That repo has
no remote, so nothing is pushed and nothing can be.

**Director-verified rather than taken from the report.** Both new gates were proven by
**sabotage**, which is the only way to know a verification gate is real:

- dropping `--tint-alpha` to `.02` → `render.test.mjs` **exits 1**, five assertions red,
  including the direction check flipping to `rgb -6.7,-5.8,-0.1`. That one fires if the
  available/buried difference ever starts coming from headstones rather than from the styling.
- removing one `STATUS_TREATMENT` entry → `status-coverage` **exits 1**, `no treatment for: tree`.
- restored → `npm test` exits 0. Suite is now **19 + 7 + 8 + 11 + 24** plus validate; counts rose,
  none fell.

A first sabotage attempt hit a colour table instead of `STATUS_TREATMENT` and passed, which
would have been reported as a toothless gate. **Confirm a sabotage actually broke what you aimed
at before concluding anything from it.**

**Twelve indoor and routing functions are byte-identical to `b9677db`** — verified by extracting
each function body and comparing, not by reading the claim. That matters because `b9677db` was
the hand-resolved merge; all three of its markers (`data-wall`, `min(2400px, 100%)`,
`var(--col-cell)`) survive.

**OPERATOR GATE, open.** The 15% tint is *measurably* real — 24.7/255 at overview, 16.5 at scan
zoom, with wide machine margins — but over bright dry grass at zoom 4–8 it reads as a light cast
across whole blocks rather than something that jumps out. In digital mode it is unmistakable.
**Only Martice can judge the photo case.** Tuning is one token, `--tint-alpha` in `:root`, and
the thresholds sit at roughly half the measured values so raising it stays green.

**Known inconsistency, deliberate:** `available` is cream outdoors and green indoors. The indoor
palette was left alone because the sprint's visual argument is about photographic ground, and
indoors there is no photo. Worth a decision; was not worth risking in this sprint.

**New coupling to watch:** the map suite now needs Playwright, which is *not* a declared
dependency — `scripts/playwright-resolve.mjs` borrows this repo's install and fails loudly rather
than skipping. So that repo can no longer run its own suite from a clean clone. Same class of
durability gap as the baseline harness moved into `scripts/` earlier today.

**Pre-existing bug fixed in passing:** per-label `font-size` never applied — an SVG presentation
attribute outranks an author CSS rule, so 3,148 Lake Urn Garden labels rendered 4.5× too large
and hid the outlines beneath them.

**Pre-existing bug found and deliberately NOT fixed:** re-entering `#space=<sid>` while that
garden is *already open* never highlights — `showDetail` rebuilds the overlay asynchronously and
the wait is satisfied by the outgoing garden's polygons. Confirmed identical on `b9677db`, so not
a regression. Cold-load deep links, the real path from the quote tool, work. Routing, not
styling — wants its own ticket.

## Open items for upcoming sprints

- **The two mismatched templates.** `pdf-templates/ClearPoint Contract 2026.pdf` and
  `WMP_Retail_Installment_Contract_2026.pdf` differ from the bytes actually shipping. Are
  they newer templates Martice meant to adopt, or stale pre-processing originals? **Resolve
  in its own sprint, never inside sprint-01** — adopting them silently would change a live
  contract.
- **The real customer names remain in git history** on `index.html`, in prior commits.
  The live page is clean as of `0174bf3`. Rewriting public history is impractical; noted,
  accepted, not scheduled.
- `BW_MAP_BASE` still points at `http://localhost:8642/index.html`.
- Quotes saved before `d2a1cb2` carry no `lines` and are exposed to the price-change bug.
  Export a backup before any price edit — relevant to sprint-02.
- Timing of the contact link offer: it appears *after* save, once the view has already
  switched. Might sit better before. Raised twice, unanswered, needs real use.
- Sign-in usernames are public in `index.html`; account security rests entirely on the two
  passwords. Pre-existing, not urgent, worth a thought.
