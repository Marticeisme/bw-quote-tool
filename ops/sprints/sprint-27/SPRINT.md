# Sprint-27 — Deed Transfer lane

**Opened 2026-08-25.** Director: same Fable session as s26. Track: Opus per policy +
operator word ("use opus sprinters"). Operator's ask, in-chat 2026-08-25: a new
standalone Deed Transfer section in index.html that works like the RIC/ClearPoint lanes
— an HTML form that fills the fillable AcroForm packet. No imports from other lanes.

## Operator rulings at open (in-chat 2026-08-25)

1. **DocuSign question first.** The packet carries notary and non-notary variants of
   three documents; whether the signing is via DocuSign decides which variant fills
   (DocuSign overrides the notary requirement).
2. **Download contains ONLY the pages that apply**: cover checklist + the applicable
   variant of each needed document + the $325 statement page + the terms page. Unused
   documents and the unused variants are dropped.
3. **Situation questions decide the document set** (certificate lost? current owner
   deceased? etc.), and the cover page's checkmarks mirror the derived set — checkmark
   style like the commission-packet checklists.
4. **Notary blocks stay blank** — the notary completes their own block. The tool fills
   only family/property fields.
5. **Saves like the other lanes**: a Saved Deed Transfers list with restore, on the
   same per-record storage conventions.

## Source template

`pdf-templates/Deed Transfer Fillable Forms 2026.pdf` (director copied it from
E:\Downloads this session). 10 pages:
p1 cover/steps checklist (7 checkboxes + header fields) · p2 Release of Interment
Rights, NOTARY variant · p3 Release, PLAIN (DocuSign) variant · p4 Affidavit for Loss
of Certificate, NOTARY · p5 Loss affidavit, PLAIN · p6 Affidavit of Heirs (5 heir
rows) · p7 Permission of Use, NOTARY · p8 Permission of Use, PLAIN · p9 CIRGAS-style
Statement (new owner + current owner blocks; the $325 transfer fee is flat text baked
into the page — no math) · p10 Terms, no fields.

## Reality at open

Gate 0 measured on main at spawn: index 8/0; `3401 passed, 0 failed across 48 suites`
(the s26 close numbers, main == origin/main at `522a6990`).

## Track

**A `s27/deed-transfer`**, worktree `../bw-quote-tool-s27a`. Brief: `TRACK-A.md`.

## Gates

- Track gate: 8/0; full suite (pin rises from 3401/48 — re-pin at close); new deed
  transfer suite sabotage-proven; template SHA recorded in the embedded manifest.
- Close gate (operator): push word; eyeball the generated PDF for one notary case and
  one DocuSign case (Acrobat not required — this is not the RIC template).

## Merge order

A alone, `--no-ff`. **NO push pre-authorization.**
