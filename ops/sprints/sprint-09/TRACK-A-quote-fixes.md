# TRACK A — Quote-tool contract fixes (`s09/quote-fixes`)

You are a track subagent. Read `ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md` and obey
them. Work in `C:\Users\Martice\bw-quote-tool` on branch `s09/quote-fixes` from latest
`main`. Everything here lives in `index.html` (~17.6k lines, CRLF, no build step —
targeted edits / Node scripts only, never whole-file rewrites). **At most one `Edit` call
to `index.html`, then work via Node scripts** (the Browser pane reloads the file on every
Edit with live network access). Never write to production Firebase.

Four operator-reported defects, from `Quote Tool Issues 07.30.26.docx`. Fix in this
order (highest-impact first), committing separately per fix.

## 1. At-need commission worksheet under-reports what the family pays

> "The at need commission worksheet needs to show the total cost of the quote paid not
> just whats commissionable. Right now I just used the tool for an at need case where
> they are paying over 5,070.96 but I am only getting commission on the vault. The
> commission worksheet itself showed that they only paid 2305 (the cost of the vault)."

The worksheet must show the **total cost of the quote** (what the family actually pays)
as its own figure, alongside — not instead of — the commissionable subset. Find the
at-need commission worksheet generator (grep `commission`, ~77 hits; also `IOA` near
lines 3940/4001/4802/18545+). Understand how it derives "paid" today (it is evidently
summing only commissionable lines) and add/repair the total so a $5,070.96 case shows
$5,070.96 as total paid with the commissionable amount ($2,305 vault) still broken out.

## 2. CIRGAS co-purchaser must appear as second signer on the IOA

> "When a co-purchaser is put on the cirgas contract it needs to show as the second
> signer on the ioa but right now it does not the second signer of the ioa has to sign
> on the additional signatures."

When the CIRGAS (at-need) contract has a co-purchaser, the IOA's second-signer slot must
carry them, rather than leaving them to the "additional signatures" area. Map the IOA
fields, find where signer 1 is filled, and fill signer 2 from the co-purchaser.

## 3. CIRGAS import must identify decedent vs purchaser

> "Cirgas contract import needs to properly identify decedent vs purchaser when making
> the checklist and commission worksheet."

The CIRGAS import path currently confuses/conflates decedent and purchaser when it
builds the checklist and the commission worksheet. Trace the import, find where each
name lands, and route decedent→decedent fields, purchaser→purchaser fields on both
artifacts. Add a test with a synthetic fixture (555-phone/@example.com/invented names)
where decedent ≠ purchaser, asserting each lands correctly.

## 4. Remove the print-instructions banner from the Memorial Order form

The operator's screenshot shows the portion to remove — two banner lines on the
Memorial Order form: "NOTE THAT THIS FORM IS INTENDED TO PRINT AND COMPLETE." and
"GREEN FIELDS CAN HAVE ENTRIES TYPED BEFORE PRINTING." (plus the empty blue band
between them). Find the Memorial Order form template (grep `Memorial Order`, ~line
18676+) and remove that block only. Do not touch anything else on the form.

## Scope discipline

These are contract-generator-side items — that is the request, so contract code is in
scope. Do NOT touch the customer-facing quote PDFs, the RIC, GA, or ClearPoint
generators, guides, or maps.

## Verification (quote outputs verbatim in your report)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → all green; count must not fall below 1327/27 (add tests where specified —
  count should RISE; state the new expected line).
- Generator baseline: run `node scripts/baseline-capture.mjs` + `scripts/baseline-sign.mjs`
  against a dev server on 3737 serving YOUR tree (or 3738 if 3737 is owned — the capture
  script needs the port it's told). **Your fixes are allowed to move AN-scenario
  signatures ONLY. Name exactly which signatures changed and tie each change to fix 1–3.
  Every non-AN signature must be byte-identical, 11/14 or better unchanged.** If the AN
  baseline fixture has no co-purchaser, say so — then fix 2 shows no baseline diff and
  needs its own Playwright/pdf-assert evidence instead.
- Rasterize the changed at-need outputs (PyMuPDF or pdf.js under Playwright — never the
  Read tool on a PDF) and LOOK at them: worksheet shows both figures, IOA shows signer 2,
  memorial order form banner gone. Screenshots in `scratch/s09a-renders/`.

## Report

What shipped per fix; branch + commits; verbatim gate output; baseline diff table;
files/regions changed; decisions & open questions; what the director must verify.
