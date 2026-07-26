# Sprint 01 — Externalize the embedded contract templates

**Goal:** `index.html` stops shipping 9.40 MB of base64 to every visitor. The 11 large
embedded templates become binary files under `pdf-templates/embedded/`, fetched on demand
and cached in memory for the session. First load drops from **7.30 MB gzipped to ~0.67 MB
(~11×)**, templates are 25% smaller as binary than as base64, most sessions fetch few or
none of them, and the ~1 MB of git growth per push stops. Every generated contract stays
byte-for-byte what it is today.

**Definition of done:**

1. `index.html` raw ≤ 2.6 MB, gzip ≤ 750 KB (today: 11.96 MB / 7.30 MB).
2. `pdf-templates/embedded/` holds the 11 externalized templates, each SHA-256-identical to
   its entry in that directory's `manifest.json`, committed.
3. All 12 generator signatures identical to the captured baseline — same page count, same
   normalized text hash, same AcroForm field name→value map. Verified by
   `node scratch/baseline-capture.mjs` with `TAG=after`, then diffing `signatures.json`
   against `%TEMP%\bw-baseline\before\signatures.json`.
4. `npm run check` → `index.html: 9 blocks, 0 errors`.
   `npm test` → `368 passed, 0 failed across 12 suites`.
5. A template that fails to load produces a **visible, specific error naming the template** —
   never a silent failure, never a corrupt download mid-appointment.

## Tracks

| Track | Slug/branch | Model | Scope |
|---|---|---|---|
| A | `s01/externalize-templates` | Opus | Loader, prefetch, rewire 9 call sites, delete 11 literals, verify. Single track by design. |

**Why one track.** Every change lands in `index.html`. Two tracks on separate branches
would both rewrite the same 17,622-line CRLF file and merge by hand at the end — strictly
worse than sequential. Per `SPRINT_GUIDELINES.md`, a second track needs work that genuinely
lives elsewhere; this sprint has none.

## Gate 0 (before tracks spawn) — **COMPLETE 2026-07-25**

1. ✅ `git pull --rebase`, nothing unpushed, tree clean.
2. ✅ Claude Code Browser pane navigated off `index.html` (it reloads the file after every
   Edit with live network access, which boots the app against production Firebase).
3. ✅ **Baseline captured on unmodified `main` — 12/12 generators.** Artifacts +
   `manifest.json` + `signatures.json` in `%TEMP%\bw-baseline\before` (9.1 MB).
   **If that directory is gone, the sprint cannot be verified — re-capture it on a clean
   `main` BEFORE spawning the track, not after.**
4. ✅ **Templates extracted** to `pdf-templates/embedded/` (13 files + `manifest.json`),
   from the embedded base64, hash-verified. Still untracked; `index.html` untouched.
5. ✅ Operator decisions closed: no `file://` support needed; prefetch + retry + explicit
   error, no persistent cache; one change (loader in, literals out); Acrobat gate does not
   apply because the RIC's bytes are provably unchanged.

**The director must re-verify items 3 and 4 at boot rather than trusting these ticks.**

## Mid-sprint gates

None. This sprint touches no Firebase code, needs no external service, and requires no
human input between spawn and audit. That is deliberate — it is the first sprint run under
this system and the workflow itself is what is being proven.

## Merge order & rationale

Single track: merge `s01/externalize-templates` `--no-ff` into `main`. Re-run the full
verification contract on the branch before merging and on `main` after.

## Close gate (operator + director together)

1. Director re-runs the full verification contract on `main` — never trusts the track's
   report. Compare assertion **counts**, not just exit codes.
2. Director re-runs the generator baseline with `TAG=after` and diffs `signatures.json`.
   **Any difference in the RIC's 141-field map is a stop.**
3. Confirm transfer size locally: load `http://localhost:3737/` and check `index.html` is
   ~0.67 MB gzipped, not 7.30 MB.
4. **Martice pushes.** Not the director, not the track. Push to `main` is an immediate
   public deploy of a tool used in front of families.
5. After the push, load the live GitHub Pages URL once and generate one contract end to end
   to confirm the templates resolve over HTTPS — the one thing localhost cannot prove.

**No Adobe Acrobat check this sprint.** Martice's call, 2026-07-25: the Acrobat gate exists
for changes that touch the RIC itself — its content, fields, or field mapping. This sprint
changes only how identical bytes reach `PDFLib.PDFDocument.load()`, and the SHA-256 plus the
141-field signature prove the bytes are unchanged automatically.

## Risks specific to this sprint

| Risk | Mitigation already designed in |
|---|---|
| A disk template silently replaces a live contract | Extraction came from the embedded base64, not from `pdf-templates/*.pdf` — two of which are verifiably different bytes. SHA-256 asserted; the 141-field RIC map is the swap detector. |
| Network failure mid-appointment | `bwPrefetchTemplates(moduleType)` on section entry, one retry, explicit error naming the template. |
| Un-awaited async generator ships an empty PDF | Largely a non-risk: 12 of 13 entry points are ALREADY `async` with `await` inside. Only `clDownloadFilledWorksheet` needs its callers audited. |
| A find-and-replace breaks image embedding | Lines 8546 and 15714 decode canvas `toDataURL()` output, NOT templates. Named in the track file as untouchable. |
| Browser pane boots the app against production Firebase | Gate 0 item 2; restated in the track file. |
| Stale template cached in a counselor's browser | Templates are content-addressed by filename; a future template swap needs a hard refresh. Noted in `DESIGN.md` when the loader lands. |

**Not a risk, despite appearances:** the 155 MB git pack does not shrink — history keeps the
old blobs, and rewriting public history is out of scope per `DESIGN.md` §1. This stops
*future* growth. Adding 7.06 MB of binaries once, to stop ~1 MB per push forever, is the
trade being made deliberately.
