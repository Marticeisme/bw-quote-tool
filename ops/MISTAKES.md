# Director mistakes — a running record

Errors made while directing this project, kept because the lesson is reusable and because a
mistake nobody wrote down gets made again. Read this at boot, alongside `STATE.md`.

Entries are blunt on purpose. None of these were caught by being careful; they were caught by
someone measuring, usually a track. That is the actual finding.

---

## 2026-07-26

### 1. Reported a sample as though it were the population. Three times.

| I said | It was | Caught by |
|---|---|---|
| 6 map status values, "value set authoritative" | **10** — missed `road`, `walkway`, `monument`, `feature` | sprint-02 Track A |
| 7 discontinued vault prices | **5 products + 2 LIVE fees** inside the Standard Arrangement bundles | director, before spawning |
| ~88 overlapping prices | **11** — the 70 ROAC keys have no counterpart in the tool at all | sprint-03 Track A |

Each time I ran a quick scan, got a number, and wrote it into a sprint document as fact. The
sprint-02 case is the worst because I explicitly wrote "treat the ratios as indicative and the
**value set** as authoritative" — I named the uncertainty and then put it on the wrong half.

**Lesson: say which one you measured.** "Sampled 5,975 of ~79,000 records" is honest and costs
four words. And where a value set drives behaviour, make the code re-derive it — `status-coverage.test.mjs`
now fails on an unknown status, so the doc being wrong stops mattering.

### 2. Handed a track recon that was wrong, and called it findings.

Told sprint-03's predecessor that the sidebar at `index.html:629` was "already replaced at
runtime by `bwApplySignedInUser()`". It was not — that function only touches three sidebar
selectors, and the Overview contact panel had been showing Randy *Martice's* email and phone to
read out to a family. I also listed ~19 hardcoded name sites when there were **37**, missing the
advisor block printed on every family-quote PDF and the Insurance Producer email.

The track verified instead of trusting, which is the only reason either was caught.

**Lesson: a director's recon is a LEAD, not a finding. Label it as one when handing it over**, so
the track knows to check rather than build on it.

### 3. "Corrected" a track that was right.

Track A reported the Browser pane opening `index.html` "via the PostToolUse hook". I searched
`.claude/settings.json` and the user-level settings, found nothing, and recorded the track as
having misattributed it. It **is** a `PostToolUse:Edit` hook — a harness-level one, which is
precisely why it is in no settings file. I reproduced it myself minutes later.

**Lesson: absence from an incomplete search space is not a refutation.** The honest finding was
"I could not confirm it", not "it does not exist". Verify-don't-trust applies to your own
disconfirming evidence too.

### 4. Told tracks to push their branches. The repo is public.

`SPRINT_GUIDELINES.md` said "push the branch", which contradicted the standing rule in
`CLAUDE.md` — *"Commit or push only when I ask."* Two track branches reached the public origin
before anyone noticed. Deleted at Martice's instruction; no data exposure, but not my call to
make.

**Lesson: when a project doc and the operator's standing instruction disagree, the operator
wins, and the doc is the thing that is broken.** Fixed in all three ops docs: every push is an
operator gate, feature branches included, directors included.

### 5. `cd`'d into a worktree, then used bare `git`.

An `[s01/ops]` commit landed on a feature branch instead of `main`, while a track was live in
that worktree. Staging explicit paths is the only reason it did not also sweep the track's
in-flight edits into my commit.

This project's own guidelines say **"With worktrees, ALWAYS `git -C <absolute-path>`"**. The rule
existed. I broke it anyway, because the Bash tool's cwd persists between calls and I forgot.

**Lesson: `git -C <abs>` for every git call, and `( cd X && cmd )` subshells for anything else
needing a directory.** A scar nobody re-trips gets deleted as paranoia; this one is real.

### 6. Asked a question framed around the wrong artifact.

Asked whether seven prices in the Burial Vault Guide PDF were current, framing the question
entirely around the *guide*. Got "discontinued" and rebuilt the guide without them — then found
all seven live in the quote tool, two of them (`$685`, `$575`) as components of Standard
Arrangement bundles. Removing those would have under-quoted **every** standard arrangement on a
signed contract.

A product missing from a *guide page* says nothing about whether it is sold. The tool was one
grep away and is far better evidence.

**Lesson: before asking the operator a factual question, check the system that would know.** And
when an answer covers several items, check they are the same *kind* of item — five were products
in dropdowns, two were fees inside a bundle, and one answer could not correctly cover both.

### 7. Used `import()` to smoke-test a script. It ran.

`baseline-capture.mjs` executes on import, and with no `TAG` set it writes to
`%TEMP%\bw-baseline\before` — the reference every gate is measured against. I overwrote it.

It cost nothing, provably: the overwritten reference signs 14/14 identical to a verified capture.
That was luck. It also exposed a real ordering bug — the server-identity guard sat *after* the
destructive `rmSync`, so a foreign-server run would have wiped the reference and *then* refused.

**Lesson: `node --check` to smoke-test, never `import()`.** Destructive setup goes *after*
validation, never before. An archived copy of a verified reference costs nothing.

### 8. Drew conclusions from malformed commands.

Twice, a broken shell or regex produced output I nearly reported as a finding: a sabotage test
that removed an entry from the wrong object and "passed" (would have been reported as a toothless
gate), and a truncated regex reporting "1 O&C match" that looked like a real count.

**Lesson: when a check produces a surprising result, suspect the check first.** Confirm a
sabotage actually broke what you aimed at before concluding anything from it.

### 9. Claimed prices had "no external source" without asking.

`sprints/sprint-03/SPRINT.md` scoped the other ~750 priced items out on the grounds that they
"have no external source at all and no schema in `prices.json` to hold them". The first half is
false. Martice has two current price books:

- `E:\Downloads6 PCM Markers Price Book EFF 03.01.2026.xlsx` — most marker pricing (2.7 MB)
- `E:\Downloads\CEMETERY MERCH & SERVICES PRICE LIST EFF-03.01.2026.xlsx` — most merch and
  service pricing (67 KB)

Both effective 2026-03-01. I inferred "no source" from the fact that `prices.json` did not
cover them, which is a statement about the file, not about the world.

**Lesson: "there is no source" is a claim about the operator's filing cabinet, and only the
operator can confirm it.** Ask before scoping work out on that basis.

---

## The pattern across all of them

Every real defect this session — mine and the code's — was found by **counting something and
comparing it to an expectation**: images per page, sids indexed, pages in a contract, assertion
counts, dollar figures before and after, served bytes versus disk bytes. None was found by
looking at the thing and judging it.

The corollary is uncomfortable and worth keeping: **my confident prose was wrong more often than
the tracks' measurements were.** Where a number matters, measure it in code that runs every time,
not in a document written once.
