# TRACK A — s21/import — PCM proof importer: singles class + companion top-off + PII release

You are an Opus track agent in the BW Quote Tool sprint system. You own this track
end-to-end. Work ONLY in your git worktree on branch `s21/import`. Do not touch
index.html, pcm-design-catalog.html (generated — Track C rebuilds it), or any guide.

## Stale-base check (FIRST, mandatory — this trap has hit every sprint)

```
git -C <your-worktree> merge-base --is-ancestor origin/main HEAD; git -C <your-worktree> log --oneline -1
```
Your branch must contain main's tip commit as of spawn (`git -C C:\Users\Martice\bw-quote-tool rev-parse main`).
If not, STOP and reset your worktree branch to local main before doing anything.

Always use `git -C <absolute-worktree-path>`. Stage by explicit path, never `git add -A`.

## Context

`scripts/pcm_companion_import.py` (READ ITS DOCSTRING FIRST — it is the spec of the
existing regime) imported 244 companion design proofs in s17: 232 shipped to
`pcm-companion-images/` + manifest `data/pcm-companion-proofs.json`, 12 HELD for PII.
Encode convention: 700px longest edge, LANCZOS, WebP q70 method 6, sha256 per output in
the manifest, byte-deterministic, idempotent.

New sources (no upscaling, no masking, no enhancement — same ruling as s17):

1. `D:\Cemetery Photos Misc\PCM SINGLE` — 373 `PCM<num>.jpg` (1100-series) + one .bat +
   `PCM_Headstone_Index.csv` (design_number, name, image_filename, image_url — PCM's own
   public gallery). NOTE the filename convention DIFFERS from the companion folder
   (`PCM1100.jpg`, not `Headstone-Design-PCM-1100.jpg`).
2. `D:\Cemetery Photos Misc\PCM COMPANION NEW` — 252 `PCM<num>.jpg`. Director's survey:
   230 numbers already shipped in `pcm-companion-images/` — **SKIP them, the shipped file
   wins, zero byte churn on the existing 232** (operator's rule). 22 are not shipped:
   - 10 genuinely new: 245, 258, 2260, 2261, 2263, 2267, 2343, 2352, 2355, 2538
   - 12 = the HELD set: 2500, 2501, 2503, 2504, 2506, 2508, 2509, 2510, 2514, 2515, 2516, 2529

**OPERATOR RULING 2026-08-07: the 12 HELD proofs are RELEASED.** Asked with the PII risk
spelled out; he chose full release; the images are already on PCM's public site. Remove
the hold and ship them like any other companion proof. Record the ruling + date in the
script/manifest provenance so the history is honest.

## Deliverables

1. **New script `scripts/pcm_single_import.py`** (model it on pcm_companion_import.py):
   imports PCM SINGLE → `pcm-single-images/` + manifest `data/pcm-single-proofs.json`.
   Same encode convention, same --check mode, same determinism. Carry the CSV's
   design_number → source name/url mapping into the manifest (provenance, not UI text).
   Verify all 373 sources parse to unique numbers; report any surprises rather than
   guessing. Do a PII eyeball pass over contact sheets (scripts/pcm_contact_sheets.py
   pattern or your own 12-up sheets): FLAG any real-identity content in your report
   (names+dates+portraits) — per the release posture these still SHIP, but the director
   wants the census on the record.
2. **Extend `scripts/pcm_companion_import.py`**: accept the new folder as an additional
   source (env var or second path), skip already-shipped numbers (shipped file wins),
   import the 22 (10 new + 12 released; source files are in PCM COMPANION NEW —
   filename convention differs, handle both). HELD dict: empty it (or convert to a
   RELEASED record) with the ruling comment. Existing 232 outputs must remain
   BYTE-IDENTICAL — prove with sha256 before/after.
3. **Manifests**: `data/pcm-companion-proofs.json` grows 232→254 entries;
   `data/pcm-single-proofs.json` new with 373. Deterministic ordering, sha256 per file.
4. **Gate additions**: extend `scripts/verify_pcm_catalog.mjs` ONLY IF it hard-fails on
   the new dirs' existence — otherwise leave the page-level gate to Track C. Add a small
   standalone check script `scripts/verify_pcm_proofs_import.mjs` (or extend an import
   --check) asserting: counts (254 companions on disk+manifest, 373 singles), the 12
   released numbers present, the 230 skipped numbers byte-identical to pre-track, every
   manifest sha256 matches disk, no file outside the manifest in either dir. Run it twice
   (idempotency).

## Definition of done

- Both import scripts run clean and idempotently (second run changes zero bytes).
- 232 pre-existing companion webps byte-identical (sha256 proof in your report).
- 373 + 22 new outputs on disk, manifest-recorded.
- Your verify script green; `node -e` syntax check on index.html still 8/0 (you didn't
  touch it — prove it anyway); full `npm test` from the worktree root GREEN — record the
  per-suite total. NEVER overlap test runs. Test scripts may READ Firebase paths but must
  NEVER call save/persist functions (live production data — wiped real data once).
- Commit on `s21/import` with explicit paths (scripts, data manifests, image dirs).
  New image dirs: make sure they are NOT gitignored; check .gitignore before assuming.
- Report: numbers, sha256 evidence, PII census findings, deviations, per-suite test total.
