# Track R — s24/style-research

You are a research track for sprint-24 of the BW Quote Tool. You write ONE file:
`docs/GUIDE_STYLE_2026-08.md`. You do not touch any guide, any HTML, or index.html.
Obey `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Repo root:
`C:\Users\Martice\bw-quote-tool`. Work in the worktree the director created at
`..\bw-quote-tool-s24r` on branch `s24/style-research` (never switch branches in the
main tree — two other sessions share it). No node_modules needed; you run no tests.
FIRST ACTION: verify the worktree base matches local main's tip.

## The task

Martice Morrison writes family-facing guides for Bonney Watson (cemetery + funeral home).
He wants the guides' prose informed by the best published writing about death care, while
staying unmistakably in HIS voice. Your deliverable is a distilled style reference the
rewrite tracks will follow.

### 1. Sample (web research)

Read at least 12 substantial published pieces. Weight per the operator's ruling:

- **Primarily consumer-facing death-care journalism:** long-form features from major
  outlets (NYT, The Atlantic, Washington Post class) on funerals/cremation/green burial;
  TalkDeath; Modern Loss essays; Funeral Consumers Alliance explainers; The Order of the
  Good Death; Cake (joincake) guides.
- **A few trade pieces for contrast:** NFDA publications, Connecting Directors, American
  Funeral Director.

For each piece log: outlet, title, URL, 2–3 sentences on what its prose does well or
badly for a grieving/planning family reader. Quote sparingly: at most one short quoted
fragment (<15 words) per piece, attributed.

### 2. Distill

Write `docs/GUIDE_STYLE_2026-08.md` with these sections:

1. **Sources sampled** — the log above.
2. **Opening moves that work** — how the best pieces begin. Expect findings like:
   start inside a concrete scene or fact the reader already cares about; state the
   useful thing plainly in the first sentence; never announce the article's own
   importance. Contrast explicitly with the BANNED opener pattern (see below).
3. **Cadence & paragraph craft** — sentence-length variation, one-idea paragraphs,
   how good writers land a hard fact gently without cushioning it in euphemism.
4. **Trust techniques** — how the best consumer pieces earn trust: naming prices,
   admitting trade-offs, telling the reader what they don't need to buy.
5. **What NOT to import** — journalism moves that would be wrong here: detached
   third-person distance, news-hook topicality, investigative adversarialism toward
   the industry (Martice IS the industry, honestly so), literary flourishes.
6. **The reconciliation** — every technique above restated as it survives Martice's
   binding voice rules. Read `docs/GUIDES_VOICE_DEBRIEF_2026-08.md` FIRST and treat it
   as a hard filter: first person, contractions, short plain sentences, NEVER em
   dashes, NEVER "inventory"/"counselor", no marketing adjectives, no brochure copy,
   "family service director" as the title. Where a journalism technique conflicts with
   the voice rules, the voice rules win — say so in the doc.
7. **Banned openers** — the pattern the operator rejected, spelled out with the live
   example (cemetery-property-guide.html: "This is the thing families most often have
   wrong, and it shapes nearly everything else in this guide."). Define the class:
   any opening that editorializes about the guide itself, ranks its own importance,
   or tells the reader how wrong most families are, before saying anything useful.
   Give 3–4 rewritten example openings using real guide subject matter.

### 3. Calibrate against the existing gold standard

Read the openings of medicaid-family-guide.html, who-decides-guide.html,
cremation-or-burial-guide.html, veterans-guide.html and burial-guide.html (the debrief's
gold standard). Note in the doc which of your distilled techniques they already use —
the rewrite tracks must move guides TOWARD this register, not away from it.

## Rules

- No fabricated sources. Every logged piece must be one you actually fetched and read.
- Copyright: max one <15-word attributed quote per source; paraphrase everything else.
- Commit the one new file with explicit path, message tagged `[s24/style-research]`,
  NO Co-Authored-By or any AI trailer (standing operator rule 2026-08-08 — this
  overrides the stale trailer line in SPRINT_GUIDELINES).
- Do NOT push. Do not touch main.

## Report

What you sampled (count by outlet type), the doc's section list, 3 example rewritten
openings verbatim, branch + commit SHA, and any source you tried but couldn't reach.
