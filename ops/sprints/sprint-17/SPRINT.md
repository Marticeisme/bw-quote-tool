# Sprint-17 — Operator fix round: live-guide corrections + PCM companion designs

**Opened 2026-08-05.** Director: Fable session. Tracks: Opus per operator ("opus sprinters").
Operator brief, verbatim intent:

1. **Granite Niches guide — photos too small.** His screenshots are the print/family
   layout (cream sheet, FAMILY GUIDE header): print CSS boxes every photo at
   `max-height:2.55in` with `object-fit:contain`, so portrait shots render narrow and
   centered. Screen has its own small case (`.figure-tall` capped 330px). Track A.
2. **Glass-Front Niches guide — slop paragraphs.** The §5 footnote ("Both walls carry
   the same fee box: …") reads as compressed slop; the map line ("Open the Chapel of
   Memories map for both walls, space by space, with prices") is unclear AND is a dead
   link for anyone reading a printed or emailed PDF. Track B.
3. **New folder `D:\Cemetery Photos Misc\PCM COMPANION`** — 245 files
   (Headstone-Design-PCM-2100+, mixed .jpg and GUID-suffixed .webp). Additional
   companion designs for the PCM catalog. **Operator ruling 2026-08-05: photos in
   THESE images are NOT masked** — quality is good, scoped to this new class only;
   existing masked plates stay masked. Track C.

## Tracks

| Track | Branch | Files owned | Model |
|---|---|---|---|
| A granite-photo-size | s17/granite-photo-size | granite-niches-guide.html + its pdf-assets | Opus |
| B glass-prose-fix | s17/glass-prose-fix | glass-front-niches-guide.html + its pdf-assets | Opus |
| C pcm-companion-designs | s17/pcm-companion | PCM catalog data/images/page/gate | Opus |

All three in isolation worktrees. **Stale-base check mandatory** (s16 scar: agent
worktrees sometimes branch from origin/main, not local main — verify HEAD matches
local main's `4203070` lineage at start).

Merge order: A → B → C (A and B may collide on shared PDF manifest entries — director
resolves by rebuilding on merged main; C is disjoint).

Contract at open: **2425 passed / 0 failed across 37 suites**; 8 blocks 0 errors.
NO push pre-authorization — push is an explicit operator ask at close.
