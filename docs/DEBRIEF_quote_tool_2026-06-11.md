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

## Saved Quotes Section — Blank Cards + Name Prompt + Load Navigation (Commits: 18ab886, e072ad7)

### What Was Broken (three separate issues)

**1. Cards completely blank** — `renderSavedQuotesList` used white/transparent CSS colors (`rgba(255,255,255,.5)`, `color:#fff`) designed for a dark sidebar panel. The dedicated saved quotes sections have a white background, so all text was invisible.

**2. No name control on save** — quotes auto-saved with `{clientName} - {date}` label, no way to name them something meaningful before saving.

**3. Load button did nothing** — `loadSavedCemQuote` called `showSection('section-cem-quote')` which doesn't exist. The correct function is `show('cem-quote', navEl)`.

### What Was Fixed

**Cards:** Rewrote `renderSavedQuotesList` card HTML with proper light-mode colors — navy text on white cards with `border`, `border-radius`, `box-shadow`. Buttons use `var(--navy)` and `#f0f2f8` backgrounds.

**Name prompt:**
```js
var defaultLabel = (clientName || 'Cemetery Quote') + ' - ' + d;
var label = window.prompt('Name this quote:', defaultLabel);
if (label === null) return; // Cancel aborts save
label = label.trim() || defaultLabel;
```

**Load navigation:**
```js
// Before (function doesn't exist):
if (typeof showSection === 'function') showSection('section-cem-quote');

// After (correct):
show('cem-quote', document.querySelector('[onclick*="cem-quote"]'));
```

### Rules Going Forward

- `show(id, navEl)` is the nav function — id is WITHOUT the `section-` prefix. `navEl` can be `document.querySelector('[onclick*="id"]')` when there's no dedicated nav element ID.
- `renderSavedQuotesList` renders into `#section-cem-saved` / `#section-fh-saved` which have white backgrounds — never use dark/transparent colors there.

---

## Quote Load Coming Up Blank — CEM State Not Captured (Commit: e072ad7)

### What Was Broken

Loading a saved cemetery quote restored nothing — the builder appeared empty. Root causes:

1. **`CEM_FIELDS` never declared** — `captureCemState` used `typeof CEM_FIELDS !== 'undefined' ? CEM_FIELDS : []` which always returned `[]`. `captureFieldState([])` returns `{}` — no fields saved.

2. **JS arrays not saved** — the cemetery quote builder stores selected items in four global arrays: `inscriptions`, `vaultItems`, `bronzeItems`, `markerItems`. None of these were included in the save snapshot.

3. **`restoreDiscountRows` ran before rows existed** — after `resetCemQuote()`, the discount list is empty. The restore tried to find existing `<select>` elements to set, found none, and silently did nothing.

### What Was Fixed

**`captureCemState`:** Dynamically queries all `input[id]`, `select[id]`, `textarea[id]` inside `#section-cem-quote` to build the field list at runtime. Also explicitly saves the four item arrays:

```js
function captureCemState() {
  var section = el('section-cem-quote');
  var fieldIds = [];
  if (section) {
    section.querySelectorAll('input[id], select[id], textarea[id]').forEach(function(e) {
      if (e.id) fieldIds.push(e.id);
    });
  }
  return {
    fields: captureFieldState(fieldIds),
    customLines: captureCustomLines('cemCustomLines'),
    discounts: captureDiscountRows('cemDiscountList'),
    inscriptions: JSON.parse(JSON.stringify(typeof inscriptions !== 'undefined' ? inscriptions : [])),
    vaultItems:   JSON.parse(JSON.stringify(typeof vaultItems   !== 'undefined' ? vaultItems   : [])),
    bronzeItems:  JSON.parse(JSON.stringify(typeof bronzeItems  !== 'undefined' ? bronzeItems  : [])),
    markerItems:  JSON.parse(JSON.stringify(typeof markerItems  !== 'undefined' ? markerItems  : [])),
    total: _cemTotal || 0
  };
}
```

**`loadSavedCemQuote`:** Restores arrays and calls render functions before `cemUpdate()`:

```js
if (s.inscriptions && s.inscriptions.length) { inscriptions = s.inscriptions; inscRender(); }
if (s.vaultItems   && s.vaultItems.length)   { vaultItems   = s.vaultItems;   vaultRender(); }
if (s.bronzeItems  && s.bronzeItems.length)  { bronzeItems  = s.bronzeItems;  bronzeRender(); }
if (s.markerItems  && s.markerItems.length)  { markerItems  = s.markerItems;  markerRender(); }
```

### Cem Quote Builder Architecture (critical for future save/load work)

The cemetery quote builder state lives in:
- **DOM inputs** — selected via dynamic `querySelectorAll` in `captureCemState`
- **`inscriptions` array** — inscription items added via the UI
- **`vaultItems` array** — vault items
- **`bronzeItems` array** — bronze items
- **`markerItems` array** — marker items
- **Custom lines** — `.custom-line-row` elements in `#cemCustomLines`
- **Discounts** — `.disc-row` elements in `#cemDiscountList`

`_cemLines` is the computed OUTPUT of `cemUpdate()` — setting it directly has no effect because `cemUpdate()` rebuilds it from the above sources on the next tick.

### Rules Going Forward

- There is no `CEM_FIELDS` or `FH_FIELDS` constant anywhere in the codebase. Do not reference them.
- To save/restore cem state, use the dynamic query approach + explicitly save the four arrays.
- Always call `inscRender()`, `vaultRender()`, `bronzeRender()`, `markerRender()` after restoring their arrays, then call `cemUpdate()` last.

---

## PDF — All Three Payment Tiers (Commit: e072ad7)

### What Was Broken

`_buildQuotePDF` rendered only one payment tier (whichever tier matched `finTierKey`). The UI shows all three tiers (10% / 20% / 25%+), but the PDF only showed one table.

### What Was Fixed

Replaced single-tier rendering with a loop over all three tier definitions:

```js
var tierDefs = [
  {key:0.10, label:'10% Down (Minimum)'},
  {key:0.20, label:'20% Down'},
  {key:0.25, label:'25%+ Down'}
];
tierDefs.forEach(function(td) {
  var tiers   = FIN_TIERS[td.key];
  var downAmt = Math.ceil(grand * td.key);
  var balance = grand - downAmt;
  // ... renders header line + navy table header + tier rows
  y -= 10; // spacing between tier blocks
});
```

Each tier calculates its own `downAmt` and `balance` from the grand total — not from `_finData` — so all three always render correctly regardless of what the user entered in the financing panel.

---

## PDF — Notes Section (Commit: a300a71)

### What Was Broken

Quote notes (from `#cemQuoteNotes` / `#fhQuoteNotes` textareas) appeared in the print popup but were not passed to `_buildQuotePDF`, so they never showed on downloaded PDFs.

### What Was Fixed

Both download functions now pass `notes`:
```js
await _buildQuotePDF(lines, ..., {
  ...,
  notes: val('cemQuoteNotes') || ''   // or fhQuoteNotes
});
```

`_buildQuotePDF` renders notes between the payment options block and the footer:
```js
if (opts.notes) {
  checkY(40);
  y -= 10;
  page.drawRectangle({x:M, y:y-14, width:3, height:22, color:ORANGE}); // left accent bar
  var notesLabelW = bold.widthOfTextAtSize('Notes: ', 9);
  page.drawText('Notes: ', {x:M+10, y, size:9, font:bold, color:DARK});
  page.drawText(trunc(safeText(opts.notes), RX-M-14-notesLabelW, reg, 9), {x:M+10+notesLabelW, y, size:9, font:reg, color:DARK});
  y -= 18;
}
```

Note: long notes are truncated to fit one line. If multi-line notes are needed, text wrapping will need to be added.

---

## Discount Save/Restore (Commit: a300a71)

### What Was Broken

Discounts were lost when loading a saved quote. Two root causes:

1. **`captureDiscountRows` only saved select values** — the discount amount (`disc-amt`) and label (`disc-note`) inputs were ignored.

2. **`restoreDiscountRows` couldn't restore into empty list** — after `resetCemQuote()`, `#cemDiscountList` is empty. The restore tried to find existing `<select>` elements to set values on — found none — silently did nothing.

### Discount Row Structure

**CEM rows** (created by `addCemDiscount()`):
- `.disc-mode` — select (discount type, including special promotions)
- `.disc-amt` — number input (amount)
- `.disc-note` — text input (label)

**FH rows** (created by `addFhDiscount()`):
- `.disc-applies` — select (all/exempt/taxable)
- `.disc-mode-fh` — select (percent/flat)
- `.disc-amt` — number input
- `.disc-note` — text input

### What Was Fixed

**`captureDiscountRows`** now saves all fields in each `.disc-row` by querying `select` and `input` elements and keying them by their first CSS class name:

```js
container.querySelectorAll('.disc-row').forEach(function(row) {
  var r = {};
  row.querySelectorAll('select, input').forEach(function(e) {
    var key = (e.className || '').split(' ')[0];
    if (key) r[key] = (e.type === 'checkbox') ? e.checked : e.value;
  });
  rows.push(r);
});
```

**`restoreDiscountRows`** now creates new rows first via `addCemDiscount()` / `addFhDiscount()`, then sets all field values. Handles old plain-string format for backward compatibility:

```js
var addFn = isCem ? addCemDiscount : addFhDiscount;
rows.forEach(function(r) {
  addFn(); // creates the row in the DOM
  var row = container.querySelectorAll('.disc-row')[last];
  // set all fields by class name key
  if (isCem) cemDiscModeChange(row.querySelector('.disc-mode')); // show/hide amount field
});
```

### Rules Going Forward

- Always create DOM rows before trying to set their values — you can't set values on elements that don't exist yet.
- CEM and FH discount rows have different structures — they share `captureDiscountRows`/`restoreDiscountRows` but the add function differs. The container ID determines which add function to use.

---

## Pre-Push Testing Checklist

These steps must be completed before every push — not after the user reports a bug.

1. **Grep for every variable referenced in changed functions.** Confirm it is declared somewhere in the file. If not, use a `typeof` guard — do NOT assume it exists.
   ```
   grep -n "VARIABLE_NAME" index.html
   ```

2. **Run Node.js syntax check (both files):**
   ```
   node -e "var fs=require('fs'); ['index.html','BW_Quote_Tool_merged_11.html'].forEach(function(f){ var h=fs.readFileSync('C:/Users/Martice/bw-quote-tool/'+f,'utf8'); var m=h.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g); if(m) m.forEach(function(s){ var src=s.replace(/<script[^>]*>/,'').replace(/<\/script>/,''); try{new Function(src);}catch(e){console.log(f+' ERROR: '+e.message);} }); console.log(f+': OK'); });"
   ```

3. **Trace the full execution path.** Before claiming a fix works, trace what every relevant variable equals at the moment it's used — not just in the function being edited. Follow callers and callees.

4. **Both files must be updated together.** `index.html` and `BW_Quote_Tool_merged_11.html` are always kept in sync. A fix applied to one must be applied to the other before committing.

5. **For save/restore changes:** Verify the save actually captures something by mentally running `captureXxxState()` with a real quote open. Ask: "What does this return if the user has selected a niche and a discount?"

6. **For DOM manipulation:** Verify the target elements exist at the time of the operation. If a function creates elements, make sure you're not trying to set values before calling the create function.

7. **For pdf-lib:** Grep for `drawRect\b` (should be `drawRectangle`). Grep for any other pdf-lib method calls and verify the method exists.

8. **For nav/section changes:** Verify the `show()` call uses the correct id format (WITHOUT `section-` prefix) and that the navEl argument is a real DOM element.
