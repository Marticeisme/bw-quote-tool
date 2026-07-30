# Sprint-08 — Chapel of Memories mausoleum 3D map + ECL polish

Operator request 2026-07-29 (evening), directly after sprint-07 shipped:

1. **Chapel of Memories (COM) mausoleum 3D map** — "a large project". Sources in
   `D:\Cemetery Photos Misc\Chapel of Memories`: THREE screenshots made today —
   `COM Maus Crypts.png` (the authoritative per-crypt price/status sheet,
   "OFFICIAL PROPERTY ADDRESS: COM-1-1-ROW-SPACE", columns 101–231, tiers A–G, bank
   headers SINGLES / TRUE COMPANIONS (TANDEMS) / DELUXE COMPANIONS / HIDDEN COMPANIONS,
   fee box), `Chapel Of Memories Overview.png` (CAD floor plan: chapel area, altar,
   hallways, entrance, restrooms, storage, Radiance + Serenity niche locations),
   `CHapel of Memory Maus.png` (color-coded plan with per-column type letters) — plus
   ~30 photos and a walkthrough video (`20260729_124129.mp4`, 223 MB).
   **Mid-boot upgrade (operator, 2026-07-29):** the Radiance and Serenity glass-front
   niche walls INSIDE the mausoleum ship in THIS sprint as full clickable inventory —
   the operator supplied their price sheets in
   `D:\Cemetery Photos Misc\Radiance and Serenity Niches` (`Radiance.png`:
   RAD-1-1-ROW-SPACE, rows A–K × cols 1–8, four size classes WITH dimensions, prices
   effective Jan 13 2025, O&C $835 / Recording $225 / ECF 10%; `Serenity.png`:
   SER-1-1-ROW-SPACE, rows A–K × cols 1–6, two size classes) plus three photos there
   and more among the COM photos.
2. **ECL map polish**: (a) niche colors — operator: "black does not look good here";
   (b) the Bronze Scroll ($785) and Vase with Ring ($370) add-ons must be toggleable
   into the detail-card math.

## Operator rulings (2026-07-29, binding)

- **COM crypt sheet reading (fail-safe, ECL precedent):** a printed price ⇒ AVAILABLE;
  "NOT SELLING" cells ⇒ blocked; **everything else ⇒ UNAVAILABLE** ("confirm in MIS" —
  no claim of sold vs reserved); cell colors and dotted marks carry NO meaning.
- **ECL niches go champagne-lit like MVC** (warm lit-glass interiors, bronze frame);
  sold = dimmed/frosted + SOLD badge — no solid black anywhere.

## Tracks (both Opus, both in worktrees; main tree stays on `main` for the director — MISTAKES #19)

| Track | Branch | Worktree | Files |
|---|---|---|---|
| H — COM map | `s08/com-map` | `../bw-quote-tool-com` | NEW `scripts/com-crypt-data.mjs`, `scripts/build_com_map.mjs`, `scripts/verify_com_map.mjs`, `MAPS/COM_CryptMap.html`; one appended card in `guides.html` |
| F — ECL polish | `s08/ecl-polish` | `../bw-quote-tool-eclp` | `scripts/ecl-niche-data.mjs` (fees/toggles if needed), `scripts/build_ecl_map.mjs`, `scripts/verify_ecl_map.mjs`, regenerated `MAPS/ECL_NicheMap.html` |
| P — ROAC guide | `s08/roac-guide` | `../bw-quote-tool-roacg` | NEW `rock-of-ages-guide.html` + photos + PDF; `scripts/build_guide_pdfs.mjs`, `scripts/verify_guide_pages.mjs`, `guides.html` card, build-log append |

Track P added mid-boot (operator, third request of the evening): a one-page Rock of
Ages family guide, printing ≤2 pages, from his own photos
(`D:\Cemetery Photos Misc\ROAC Photos`) — what a niche is, its benefit, the general
price range (computed from `scripts/roac-niche-data.mjs`, never typed), and that each
niche carries TWO inurnment rights. Photo PII rule: no legible plate text in any
published image.

| Q — glass infographic | `s08/glass-infographic` | `../bw-quote-tool-glassinfo` | NEW `glass-front-niches-guide.html` + photos + PDF; registrations in `build_guide_pdfs.mjs` / `verify_guide_pages.mjs`; `guides.html` card; build-log append |

Track Q added mid-boot (operator, fourth request): a glass-front niche INFOGRAPHIC,
exactly 4 printed pages, covering ECL + MVC + Serenity + Radiance — advantages of
glass-front vs granite-front (ROAC as the granite contrast, verifiable claims only),
photos from his folders (PII rule applies), and per-location price ranges COMPUTED from
the repo's data modules (RAD/SER ranges depend on Track H's landed data — hence Q runs
LAST). Q shares files with P (build_guide_pdfs, verify_guide_pages, guides.html), so
they are strictly sequential.

Parallelism stays ≤2: F + H spawn together; P spawns when F completes; Q spawns when
BOTH P and H have merged. Merge order: **F → P → H → Q**.

## Gates

- Universal: `npm run check` 8/0; `npm test` ≥ 1327/27, never falling;
  `verify_guides_page` ALL OK; determinism + sabotage-proven map gates; screenshots
  rendered AND looked at.
- Track H: transcription counts per bank/column vs the sheets (crypts + BOTH niche
  walls); zero prices rendered on
  unavailable/blocked crypts; **no occupant name from any photo/video frame may enter
  the repo in any form** (crypt fronts carry real names — PII, public repo).
- Track F: gate stays PASS with the same 85/28/$685,175 numbers (colors change, data
  does not); toggles change the card total by exactly $785 / $370; WCAG ≥ 4.5:1 on
  price chips kept.
- Close gate (operator): eyeball COM map against the building you walk daily; phone
  check; push.
