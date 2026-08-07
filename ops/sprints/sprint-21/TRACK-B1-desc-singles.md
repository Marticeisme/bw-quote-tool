# TRACK B1 — s21/desc-singles — describe + tag all 373 single-marker proofs BY LOOKING

You are an Opus track agent in the BW Quote Tool sprint system. Branch `s21/desc-singles`
in your own worktree. This track is DATA-ONLY: you produce one curated JSON file and one
validator script. You do NOT touch the catalog page, the builder, index.html, or any
image. Always `git -C <absolute-worktree-path>`; stage explicit paths only.

## Stale-base check (FIRST)

Your branch must contain local main's tip (`git -C C:\Users\Martice\bw-quote-tool rev-parse main`).
If not, STOP and reset to local main.

## The job

The catalog is getting 373 new single-marker full-colour design proofs (Track A imports
them). The operator's ruling: every proof gets a short family-friendly description and
subject tags **written by actually looking at each image** — like the book designs' curated
tags (see `data/pcm-subject-tags.json`, "_provenance": curated by looking). PCM's CSV
names are generic and useless ("Individual Headstone Design (PCM1654)").

Sources to look at: `D:\Cemetery Photos Misc\PCM SINGLE\PCM<num>.jpg` (373 files, ignore
the .bat and .csv for content — the CSV is only a number census cross-check).

## Output: `data/pcm-desc-singles.json`

```json
{
  "_provenance": {
    "written": "2026-08-07", "by": "s21 Track B1, curated by looking at every image",
    "sources": "D:\\Cemetery Photos Misc\\PCM SINGLE", "count": 373
  },
  "designs": {
    "1100": {
      "title": "Roses and praying hands",
      "desc": "Climbing roses down the left side with praying hands beside the name panel.",
      "tags": ["roses", "religious"],
      "language": null
    }
  }
}
```

- `title`: 2–6 words, what a family would call it. `desc`: ONE sentence, plain language,
  what is actually on the stone. **Voice rules are BINDING** (docs/GUIDES_VOICE_DEBRIEF_2026-08.md):
  no em dashes, no marketing copy, no "inventory"/"counselor", contractions fine. Describe;
  don't sell.
- `tags`: ONLY slugs from the vocabulary in `data/pcm-subject-tags.json`. If a design
  genuinely needs a tag the vocabulary lacks, collect the candidates and LIST them in your
  report rather than inventing vocab silently (≤5 additions acceptable if you also add them
  to your validator's allowlist and flag them; more than that = stop and report).
- `language`: null for English; otherwise the language of the sample lettering
  ("vietnamese", "spanish", "chinese", …). The operator explicitly wants Vietnamese
  examples findable. When language is non-English, SAY SO in the desc too
  ("Sample lettering in Vietnamese.") so plain search hits it.
- Sample names/dates on proofs are PCM stock text; never copy them into desc. If a single
  carries what reads as a REAL identity (portrait photo + full name + exact dates), still
  describe the design normally but add `"piiFlag": true` and list it in your report.

## Method (mandatory discipline)

- Build your own contact sheets (2×2 from the ORIGINAL jpgs, PIL, into your worktree's
  scratch/) so lettering stays legible, and Read them sheet by sheet. EVERY design gets
  eyes on it — no batch-guessing, no extrapolating a run of similar numbers.
- Write the JSON INCREMENTALLY (every ~24 designs) so a crash loses minutes, not the track.
- Write `scripts/verify_pcm_desc.mjs`: validates a desc file (path as argv): every design
  number in the given source manifest/dir is present, no empty title/desc, desc has no em
  dash, every tag in vocabulary (+ your flagged additions), language values from a small
  allowlist, count matches. Run it green on your file. Track B2 will reuse this script —
  keep it generic (file path + expected-numbers source as args).

## Definition of done

- 373/373 entries, validator green, spot-check honesty: pick 12 random numbers, re-open
  the originals, confirm your own entries match what's on the stone (record the 12).
- Full `npm test` green from the worktree (your files touch no suite, prove it anyway;
  never overlap runs; never call Firebase save/persist).
- Commit `data/pcm-desc-singles.json` + `scripts/verify_pcm_desc.mjs` by explicit path.
- Report: tag-frequency table, language census (how many Vietnamese etc.), any piiFlag
  entries, proposed vocab additions, deviations.
