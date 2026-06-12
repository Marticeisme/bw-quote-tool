# Claude Code Debrief — BW Quote Tool Changes
**Date:** 2026-06-11
**Files changed:** `index.html`, `BW_Quote_Tool_merged_11.html`
**Commits:** 5699a7d (PDF layout), 43de7a3 (dark mode), 0c334bf (PDF download fix + filename prompt)

---

## What Was Broken

The `_buildQuotePDF()` function produced a navy rectangle header with just "BONNEY WATSON" — missing Washington Memorial Park, no client name, no "Quote valid through" date, no branded section headers. The old `downloadCemQuotePDF` and `downloadFhQuotePDF` passed hardcoded subtitle strings that didn't match the quote type (at-need vs pre-need).

---

## What Was Fixed

### `_buildQuotePDF(lines, clientName, subtitle, filePrefix, opts)`
Complete rewrite. Key changes:

- **Header:** White background (no navy rectangle). Left side: `BONNEY WATSON` in navy bold (18pt) + `· Washington Memorial Park` in navy regular (11pt). Right side: today's date + "Quote valid through [date+30 days]" in muted gray.
- **Subtitle:** Pulled from caller (`subtitle` param) — e.g. `'Cemetery At-Need Quote'`, `'Cemetery Pre-Need Quote'`, `'Funeral Home Quote'`.
- **Client name:** `Prepared for: [clientName]` line below subtitle, only rendered when clientName is non-empty.
- **Section headers:** Orange small-caps (`TAX-EXEMPT SERVICES`, `TAXABLE MERCHANDISE`, etc.) with a full-width border-top line. No gray background fill.
- **Discounts:** Rendered in green (`rgb(26,107,69)`).
- **Prices:** Bold, right-aligned.
- **Grand total:** Large orange bold text.
- **opts object:** Callers pass `exSection`, `taxSection`, `grandTotal` to control section header labels and total value.

### `downloadCemQuotePDF()`
- Subtitle now dynamic: `'Cemetery At-Need Quote'` or `'Cemetery Pre-Need Quote'` based on `cemQuoteType()`.
- Passes `{ exSection: 'Services & Cemetery Items', taxSection: 'Merchandise (Taxable)', grandTotal: _cemTotal }`.

### `downloadFhQuotePDF()`
- Subtitle: `'Funeral Home Quote'` (fixed string).
- Passes `{ exSection: 'Tax-Exempt Services', taxSection: 'Taxable Merchandise', grandTotal: _fhTotal }`.

---

## Lines Changed

Both files are identical for this section. The replaced block runs approximately lines 9470–9592 in both.

---

## Brand Constants Used

```js
NAVY   = rgb(26/255,  39/255,  68/255)
ORANGE = rgb(192/255, 103/255, 59/255)
GOLD   = rgb(184/255, 145/255, 42/255)
GREEN  = rgb(26/255, 107/255, 69/255)
DARK   = rgb(45/255,  51/255,  64/255)
MUTED  = rgb(107/255, 115/255, 130/255)
```

---

## Common Pitfalls

- Both `index.html` and `BW_Quote_Tool_merged_11.html` must be updated together — they share this function block.
- Read the file before editing (Claude Code requires a prior Read for Edit to work).
- `opts.grandTotal` is used for the final total line; if undefined, the grand total row is skipped. Make sure `_cemTotal` / `_fhTotal` are in scope at call time.
- The `PDFLib` global must be loaded on the page (`pdf-lib` CDN). The function destructures from it at the top — if it's not loaded, the PDF silently fails.

---

## Dark Mode Fix (Commit: 43de7a3)

### What Was Wrong

The original dark mode used cold Tailwind gray palette (`#111827`, `#1f2937`, `#374151`) with no overrides for:
- `.section-header h2` — used `color:var(--navy)` = dark text invisible on dark bg
- `.q-price-disp` — used `color:var(--navy)` = invisible prices
- Table row stripes — `tr:nth-child(even) td` had hardcoded `#f5f7fa` (light cream)
- Quick ref cards (`.qr-card`) — used `background:#fff`
- Callout boxes (`.callout-green`) — hardcoded light green background
- Tab toggle buttons (Pre-Need/At-Need) — inactive tab had `background:#fff` set via inline JS style
- Inline `style="color:var(--navy)"` elements throughout HTML — invisible on dark bg
- `.subsection-title` — used `color:var(--blue)` = dark blue text invisible

### What Was Changed

Replaced the entire `body.dark-mode` CSS block (~lines 9452–9465 in both files) with a comprehensive 50-rule set.

**New palette** (warm dark navy, not cold gray):
- Background: `#141824`
- Panels: `#1c2236`
- Sidebar: `#0c1020`
- Inputs: `#10141e`
- Borders: `#2a3050`
- Text: `#dde1ec`
- Text secondary: `#8892a8`

**Key additions:**
- `.section-header h2` → `#dde1ec`
- `.q-price-disp` → `var(--gold) !important` (prices now show in brand gold)
- `.price` → `var(--gold) !important`
- `[style*="color:var(--navy)"]` → `#8099cc !important` (catches all inline navy text)
- `tr:nth-child(even) td` → `#161c2c` (subtle dark striping)
- `.qr-card` → `#1c2236` with dark border
- `.callout-blue/gold/green` — all get dark-mode-appropriate tinted backgrounds
- Tab buttons use CSS `:has()` pseudo-class to style checked/unchecked state without modifying JS:
  ```css
  body.dark-mode #cemTypePNLabel:has(input:not(:checked)) { background:#1c2236 !important; }
  body.dark-mode #cemTypePNLabel:has(input:checked) { background:#284878 !important; }
  ```
- `.summary-panel` separated from `.q-panel` override — keeps its own `#0e1830` deep navy

---

## PDF Download Fix + Filename Prompt (Commit: 0c334bf)

### What Was Broken

Clicking "Download PDF" produced nothing — no file, no error, no feedback. Two root causes:

1. **Detached `<a>` element** — the download anchor was created but never appended to the DOM before `.click()`. Chrome tolerates this for `http://` URLs but often silently drops `blob:` URL clicks on detached elements.
2. **Silently swallowed errors** — `_buildQuotePDF` is `async`. Any exception inside it creates a rejected Promise. Because the `onclick` caller doesn't `.catch()` it, the error disappears completely and nothing happens from the user's perspective.

### What Was Fixed (both `index.html` and `BW_Quote_Tool_merged_11.html`)

**`_buildQuotePDF`** — three changes:

1. **Full try-catch wrapper** around the entire function body. Any error (including PDFLib not loaded, font embed failure, draw call error) now shows an `alert('Could not generate PDF: ...')` instead of vanishing silently.

2. **DOM-attached download** — the anchor is now appended to `document.body`, clicked, then removed after 2 seconds (giving the browser time to initiate the download):
   ```js
   document.body.appendChild(a);
   a.click();
   setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
   ```
   Also added `URL.revokeObjectURL` to clean up the blob URL after download.

3. **Filename prompt** — before the download triggers, a `window.prompt()` asks the user to confirm or change the filename. Default is `{filePrefix}_{clientName}_{date}`. The `.pdf` extension is always appended automatically:
   ```js
   var customName = window.prompt('Save PDF as:', defaultSlug);
   if (customName === null) return; // user cancelled
   customName = (customName.trim() || defaultSlug).replace(/\.pdf$/i, '');
   a.download = customName + '.pdf';
   ```
   If the user clicks Cancel, the download is aborted.

### Rules Going Forward

- Always wrap `async` PDF/download functions in try-catch. Unhandled rejections are invisible to the user.
- Always append download anchors to `document.body` before calling `.click()`, even in Chrome.
- Always call `URL.revokeObjectURL` after the download to avoid memory leaks.

---

## Save Failure — CEM_FIELDS ReferenceError (Commit: b4baef0)

### What Was Broken

Clicking "Save Quote" in the Cemetery Quote Builder threw an alert: **"Save failed: CEM_FIELDS is not defined"**. Quote never saved.

Root cause: `CEM_FIELDS` is never declared anywhere in the file. The original code in `captureCemState()` was:

```js
fields: captureFieldState(CEM_FIELDS || []),
```

JavaScript throws a `ReferenceError` when accessing an **undeclared** variable. The `|| []` fallback never executes — the error fires before `||` is evaluated. A try-catch around the call caught the error and showed it as an alert.

### What Was Fixed

Changed `captureCemState()` in **both** `index.html` and `BW_Quote_Tool_merged_11.html`:

```js
// Before (throws ReferenceError):
fields: captureFieldState(CEM_FIELDS || []),

// After (safe typeof guard):
var fields = (typeof CEM_FIELDS !== 'undefined') ? CEM_FIELDS : [];
return {
  fields: captureFieldState(fields),
  ...
};
```

### Rules Going Forward

- **Never use `undeclaredVar || fallback`** — the fallback is unreachable if the variable was never declared. Always use `typeof varName !== 'undefined'` when the variable might not exist.
- Before referencing any global variable in a new function, grep for where it is declared. If it isn't declared anywhere, use a `typeof` guard or declare it.

---

## PDF Payment Options Not Showing (Commit: b4baef0)

### What Was Broken

The Payment Options table (financing tiers) never appeared on downloaded Cemetery PDFs. The sidebar "Est. payment" hint showed correctly, but the PDF had no payment section.

Root cause: `downloadCemQuotePDF()` only passed `finData` to `_buildQuotePDF` when the user had manually entered a down payment in the financing panel (which sets the `_finData` global). The sidebar estimate uses a completely separate auto-calc code path that does **not** set `_finData`. Most users never open the financing panel — so `_finData` was always null, and no payment section appeared.

### What Was Fixed

`downloadCemQuotePDF()` now always computes a default 10% down payment object when `_finData` is not set, applied to **both** `index.html` and `BW_Quote_Tool_merged_11.html`:

```js
var cemTotal = (typeof _cemTotal !== 'undefined') ? _cemTotal : 0;
var pdfFinData = null;
if (typeof _finData !== 'undefined' && _finData && _finData.downAmt > 0) {
  pdfFinData = _finData;
} else if (cemTotal > 0) {
  var defDown = Math.ceil(cemTotal * 0.10);
  pdfFinData = { downAmt: defDown, tierKey: 0.10, balance: cemTotal - defDown };
}
await _buildQuotePDF(lines, val('cemClientName')||'', subtitle, 'BW_Cemetery_Quote', {
  exSection: 'Services & Cemetery Items',
  taxSection: 'Merchandise (Taxable)',
  grandTotal: cemTotal || undefined,
  finData: pdfFinData
});
```

### Rules Going Forward

- The sidebar financing estimate and `_finData` are decoupled — sidebar calculates on the fly, `_finData` is only set when the user interacts with the financing panel. Never assume `_finData` is set just because numbers appear in the UI.
- Any PDF section that should "always" appear needs a default fallback value, not a conditional that silently skips it.

---

## Dedicated Saved Quotes Sections (Commit: b4baef0)

### What Was Added

Two new nav items and full-page sections for saved quotes:

- **Nav:** `💾 Saved Cem Quotes` (`navCemSaved`) and `💾 Saved FH Quotes` (`navFhSaved`)
- **Sections:** `#section-cem-saved` and `#section-fh-saved` — proper `.section` divs that follow the same `show(id, navEl)` pattern as all other sections
- **Auto-navigate:** After saving, `saveCemQuote()` / `saveFhQuote()` call `show('cem-saved', el('navCemSaved'))` so the user lands directly on their saved quote
- **Max 10** quotes per section (down from 20, then 8 — landed at 10 per user request)
- **Auto-label:** Quote label is `{clientName} - {date}` with no prompt; client name pulled from `val('cemClientName')` / `val('fhClientName')`

### Why Previous Approaches Failed

1. Banner at top of Cemetery section — scrolled past when section loaded
2. `q-panel` at bottom of Cemetery section — buried at line ~1,700+ on a long page, never visible
3. Final fix: dedicated nav sections — directly reachable, user can't miss them

### Rules Going Forward

- Saved/history UI belongs in its own nav section, not appended to a builder section. Builder sections are long; anything added at the bottom is effectively invisible.
- Always call `show()` after a save so the user gets visual confirmation that something happened.

---

### Rules Going Forward (Dark Mode)

- When adding new CSS classes that use `var(--navy)` as text color, add a `body.dark-mode` override.
- Never hardcode light colors (`#fff`, `#f5f7fa`, `#e8f5e9`) in elements that appear in the main content area — use CSS variables or add a dark mode override.
- Tab toggle buttons set `background:#fff` via JS inline style; override them with `:has()` selectors + `!important`, NOT by modifying the JS (the JS is shared with light mode).

---

## PDF Crash — page.drawRect is not a function (Commit: 02115ce)

### What Was Broken

Every cemetery PDF download threw: **"Could not generate PDF: page.drawRect is not a function"**

Root cause: pdf-lib's page API uses `page.drawRectangle()`, not `page.drawRect()`. Two calls in the payment options table used the wrong method name:
- Navy header row background
- Alternating row stripe (even rows)

Because these calls are inside the `try-catch` wrapper in `_buildQuotePDF`, the error was caught and shown as an alert rather than crashing silently.

### What Was Fixed

Both `index.html` and `BW_Quote_Tool_merged_11.html`:

```js
// Before (wrong — method does not exist):
page.drawRect({x:M, y:y-4, width:RX-M, height:17, color:NAVY});

// After (correct pdf-lib API):
page.drawRectangle({x:M, y:y-4, width:RX-M, height:17, color:NAVY});
```

### pdf-lib Correct API Reference

| Wrong | Correct |
|-------|---------|
| `page.drawRect()` | `page.drawRectangle()` |
| `page.drawLine()` | `page.drawLine()` ✓ |
| `page.drawText()` | `page.drawText()` ✓ |
| `page.drawImage()` | `page.drawImage()` ✓ |

### Rules Going Forward

- **pdf-lib method is `drawRectangle`, not `drawRect`** — grep for `drawRect\b` before pushing any PDF changes to catch this.
- The try-catch in `_buildQuotePDF` is essential — it converts silent async failures into visible alerts. Keep it.

---

## Pre-Push Testing Checklist

These steps must be completed before every push — not after the user reports a bug.

1. **Grep for every variable referenced in changed functions** — confirm it is declared somewhere. If not, use a `typeof` guard.
2. **Run Node.js syntax check:**
   ```
   node -e "var fs=require('fs'); ['index.html','BW_Quote_Tool_merged_11.html'].forEach(function(f){ var h=fs.readFileSync('C:/Users/Martice/bw-quote-tool/'+f,'utf8'); var m=h.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g); if(m) m.forEach(function(s){ var src=s.replace(/<script[^>]*>/,'').replace(/<\/script>/,''); try{new Function(src);}catch(e){console.log(f+' ERROR: '+e.message);} }); console.log(f+': OK'); });"
   ```
3. **Trace the full execution path** of any logic change — not just the function being edited. Follow what every variable is set to at the point it's used.
4. **Both files must be updated together** — `index.html` and `BW_Quote_Tool_merged_11.html` are always kept in sync. A fix applied to one must be applied to the other before committing.
