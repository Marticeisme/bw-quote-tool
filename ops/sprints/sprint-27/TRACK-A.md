# TRACK A — s27/deed-transfer

Build the Deed Transfer lane in `index.html`: an HTML form that fills the fillable
AcroForm packet at `pdf-templates/Deed Transfer Fillable Forms 2026.pdf` and downloads
only the applicable pages. Work in the worktree `C:\Users\Martice\bw-quote-tool-s27a`
on branch `s27/deed-transfer` (already created; `node_modules` junctioned). Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Never block on questions; log decisions
in your report.

## The packet (read it yourself with PyMuPDF before writing any code)

10 pages, structure and rulings in `ops/sprints/sprint-27/SPRINT.md`. Facts that bite:

- **Field names are garbage strings** from the form author's editor ("Namesamelamegame",
  "SWORN BORN LORN", "undefined_4", "Row1231231321"). Map every field BY NAME after
  reading its position/context on the page with PyMuPDF (widget rects + surrounding
  text), exactly the way the RIC field map was built. Never guess from the name alone.
  Write the map as a commented table in the code, one line per field, saying what each
  garbage name actually is.
- **Variant pairs**: p2/p3 (Release of Interment Rights), p4/p5 (Affidavit for Loss),
  p7/p8 (Permission of Use) are notary/plain versions of the same document. The
  DocuSign toggle picks PLAIN (p3/p5/p8); in-person picks NOTARY (p2/p4/p7). Notary
  blocks are NEVER filled (operator ruling 4) — on the notary variants, fill only the
  grantor/grantee/property fields and leave every notary-block field untouched.
- **p1 cover**: header fields (current owner name/phone, Family Service counselor,
  date rows) + the document checklist. Checkmarks mirror the derived document set, in
  the style the commission packet uses. p1 mixes real checkboxes (Check Box1..7) and
  text fields sitting in the checklist rows — read the page to see which row each
  belongs to and use whichever mechanism the row actually has.
- **p6 Affidavit of Heirs** has 5 heir rows (name/relationship/address/age) plus
  decedent fields and a date of death. The HTML gets a repeatable heir-row UI capped
  at 5.
- **p9 Statement**: new owner block (`Purch *`), current owner block (`* Current`),
  date (`Date3_af_date`), `Full Name for Cirgas`, one checkbox. The $325 charge is
  FLAT TEXT on the page — fill no amounts, compute nothing.
- **p10 Terms**: no fields; it ships in the download (ruling 2) after the statement.

## The HTML lane

- Standalone section beside the other contract lanes (nav entry "Deed Transfer"),
  matching the app's existing lane look and structure. NO imports from other lanes and
  no contact-link machinery this sprint (BW_LINK_MODULES untouched).
- **First question: "Signing via DocuSign?"** — a prominent toggle at the top; it
  drives variant selection and shows/hides nothing else.
- **Situation questions derive the document set** (ruling 3):
  - Release of Interment Rights: ALWAYS included — it is the transfer.
  - "Is the original Certificate of Interment Rights lost?" → Affidavit for Loss.
  - "Is the current owner deceased?" → Affidavit of Heirs (and its heir rows appear).
  - Permission of Use: read p7's own text and the p1 checklist wording to determine
    the situation it belongs to, surface it as its own plain-language question, and
    record your reading in the report.
  The cover checklist checkmarks mirror exactly the derived set. Show the derived
  document list on screen so the counselor sees what the download will contain.
- Shared fields (grantor, property description Section/Row/Block/Lot/Plot, new owner)
  are entered ONCE in the HTML and fan out to every included page's fields.
- **Download = only the applicable pages**, assembled with pdf-lib the way the other
  lanes do it: fill the full template, then remove the non-applicable pages before
  save. Verify the page-removal order math with a test (removing by index shifts
  later indices).
- **Saving**: follow the existing per-record save conventions exactly (grep
  `saveQuoteRecord` and one existing lane's capture/restore pair). New type key and a
  saved-list view like Saved RICs. Do not invent a new storage shape.

## Template embedding

Follow the existing embed pipeline: the other templates live base64-embedded with
SHA-256s recorded in `pdf-templates/embedded/manifest.json`. Find how RIC/ClearPoint
embed and verify theirs (grep the manifest and the loader), do the same for this
template, and record the new SHA in the manifest.

## Hard rules

- No production Firebase writes from tests (tests/fake-firebase.js, network blocked).
- No real customer data anywhere; fixtures are 555/@example.com/invented.
- Scope discipline: contract-lane work only — the quote PDFs, catalogs, guides and the
  other lanes' download code stay byte-untouched.
- Commit `[s27/deed-transfer]`, explicit paths, no AI trailers, never push.

## Verification (quote outputs verbatim)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → rises from `3401 passed, 0 failed across 48 suites` by exactly your new
  suite's count (worktree reads −2 on test-contact-csv, note it).
- New `tests/test-deed-transfer.mjs` pinning at minimum: DocuSign path downloads
  p1+p3(+p5/p8 as derived)+p9+p10 and NO notary pages; in-person path downloads the
  notary variants and NO plain pages; notary-block fields are empty on the notary
  variants; each situation toggle adds exactly its document and flips exactly its
  cover checkmark; shared fields land on every included page; save/restore round-trip
  via fake Firebase; sabotage-proven red/green twice (two different breaks).
- Generate one notary-case and one DocuSign-case PDF, rasterize with PyMuPDF, and LOOK
  at every page yourself (pdf-lib hangs in the MCP preview browser — run everything
  headless from the repo root; renders into scratch/s27-a-renders/).

## Report

What shipped; branch + commits; verbatim gate output with exact commands and env pins;
files changed; the full garbage-name→meaning field map; decisions & open questions;
what the director must verify by hand.
