# Bug Fixes Needed — BW Quote Tool

Read CLAUDE_CODE_DEBRIEF.md first for full project context, then fix these issues in BW_Quote_Tool_merged.html.

**IMPORTANT:** All generated PDFs are opened and printed in **Adobe Acrobat** (not Chrome viewer, not Preview). This means:
- Font encoding must be WinAnsi-compatible — no Unicode special characters (curly quotes, em-dashes, Unicode minus signs, etc.)
- Form fields must use `form.flatten()` so they render correctly in Adobe
- Test that filled PDFs open cleanly in Adobe without repair prompts or missing text

---

## 1. GA Contract — Prices Not Mapping Correctly from FH Quote

The `printGAContract()` function imports from `_fhLines` but several line items are not being mapped to GA PDF form fields.

### Missing Items:
- **Casket** — not filling the GA form's Casket field at all. The casket price (e.g. $1,755) should go in field `1002-14 - Casket` (or similar).
- **Evening Activity** and **Reception/Hospitality** — these have no direct GA fields. Combine them into ONE "Other" line: label = `Evening Activity & Reception`, amount = sum of both (e.g. $655 + $335 = $990). Use the GA "Other (specify)" service fields for this.
- **Urn** — currently showing the "Urn Allowance" package line ($325) instead of the actual urn selected ($395 Navy Synthetic Marble). The real urn from the catalog selection should take priority.
- **Death Certificates and County/Medical Examiner Fee** — these are currently missing or in the wrong section. They should go in **Non-Guaranteed Cash Advance Items**, NOT in guaranteed services. Map death certs to the `Death Certificate` cash advance field with quantity, and county fee to an "Other" cash advance field.

### Name Fields:
- **Purchaser name not filling on page 1** — the GA form page 1 has a Purchaser field near the bottom. It's not being written.
- **Funeral Firm Representative** — "Martice Morrison" is showing on the Cash Advance page in the wrong location. It should fill the "Funeral Firm Representative" or "Funeral Firm Name" field on page 1, and also appear correctly on the Cash Advance page as the representative (not the purchaser).

### Tax:
- Tax is wrong because the merchandise total is incomplete (missing casket, wrong urn). Fixing the items above should fix the tax.

---

## 2. ClearPoint Contract — Completely Broken

### Error: `CP_PDF_B64 is not defined`
The embedded ClearPoint PDF template variable was likely renamed at some point. Search the file for the actual variable name — it may be `CP_PDF_TEMPLATE` or `CLEARPOINT_PDF_B64` or similar. Fix the reference in `generateClearPointContract()` to use the correct variable name.

### Add Pay in Full Option
The payment schedule section currently only shows monthly payment breakdown. Add a "Pay in Full" option where:
- Down payment = full contract amount
- Monthly payment = $0
- Number of payments = 0
- Display clearly as a "Pay in Full" / single payment option

---

## 3. RIC Contract — Unicode Crash

### Error: `WinAnsi cannot encode "−" (0x2212)`
The code is writing a Unicode minus sign `−` (U+2212) to PDF form fields, but pdf-lib's WinAnsi encoding only supports the standard ASCII hyphen `-` (U+002D).

**Fix:** Before writing ANY string value to a PDF form field, sanitize it:
```javascript
function sanitizeForPdf(str) {
  return String(str)
    .replace(/\u2212/g, '-')   // Unicode minus → hyphen
    .replace(/\u2013/g, '-')   // en-dash → hyphen
    .replace(/\u2014/g, '-')   // em-dash → hyphen
    .replace(/\u2018/g, "'")   // left single quote
    .replace(/\u2019/g, "'")   // right single quote
    .replace(/\u201C/g, '"')   // left double quote
    .replace(/\u201D/g, '"')   // right double quote
    .replace(/\u2026/g, '...') // ellipsis
    .replace(/\u00D7/g, 'x');  // × multiplication sign
}
```
Apply this globally — use it everywhere `form.getField(...).setText(...)` is called. All PDFs are opened in **Adobe Acrobat** which strictly enforces WinAnsi encoding. Characters outside WinAnsi will crash the generation entirely.

---

## 4. RIC Contract — Show Payment Tier Table

On the RIC contract page, below the "Payment Options" panel (where Down Payment / Number of Payments / Rate / First Payment Date are set), display the **full payment options table** from the cemetery quote.

This is the table that shows:
- **10% Down (Minimum)** — with rows for 24mo/0%, 36mo/4%, 48mo/6%, 60mo/0%, 72mo/10%
- **20% Down** — with rows for 36mo/0%, 48mo/4%, 60mo/6%, 72mo/8%
- **25%+ Down** — with rows for 24-60mo/0%, 72mo/6%

This table is already computed and rendered in the cemetery quote section. Either:
- Re-render it on the RIC page by calling the same function, OR
- Clone/copy the HTML from the cemetery payment options panel when `ricImportFromQuote()` runs

The purpose is so the user can see all payment tiers without switching tabs, then pick the right down payment / term / rate to enter in the fields above.

---

## Priority Order
1. Fix #3 first (RIC Unicode crash) — one-line fix, unblocks testing
2. Fix #2 (ClearPoint undefined variable) — likely one-line fix
3. Fix #1 (GA mapping) — most complex, most impactful
4. Fix #4 (RIC payment table) — UI improvement

After each fix, verify in browser (F12 console open) that no errors appear.
