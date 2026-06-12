# Claude Code Debrief — Dashboard Changes
**Date:** 2026-06-11 / 2026-06-12
**File changed:** `dashboard.html`
**Commits:** 9f221c6 (Chloe save fix), 43de7a3 (light/dark toggle), bc376ec (touchpoints + detail forms + colors + fonts)

---

## What Was Broken (Session 1 — 2026-06-11)

Saving a new Chloe case threw a Firebase error and blocked the modal from closing:

> "Save error: set failed: value argument contains an invalid key (Death Certificates / Permits) in property 'dashboard.cases.1.checklist'. Keys must be non-empty strings and can't contain '.', '#', '$', '[', or ']'"

Firebase Realtime Database also forbids `/` in object keys because it uses `/` as a path separator. Two checklist group names in `CHLOE_CHECKLISTS` contained `/`:
- `'Death Certificates / Permits'`
- `'Contract / Payment'`

When `pushToFirebase()` called `fbDB.ref('dashboard').set(data)`, the Firebase SDK threw synchronously before making any network request. An earlier defensive try-catch in `saveCase()` caught this throw and returned early — so the modal stayed open and the case appeared unsaved, even though localStorage had already written it successfully.

---

## What Was Fixed (Session 1)

### 1. `CHLOE_CHECKLISTS` — Renamed invalid keys
**Lines:** ~575, 579, 582, 585

Renamed both problematic group keys in both `Cremation` and `Burial` checklists:
- `'Death Certificates / Permits'` → `'Death Certificates & Permits'`
- `'Contract / Payment'` → `'Contract & Payment'`

These are the keys used when new cases are created. The `&` renders fine in the UI checklist display.

### 2. `safeFBCases()` + `pushToFirebase()` — Sanitize old data
**Lines:** ~695–712

Added a sanitizer function that runs before every Firebase write. Replaces any `/` in checklist group names with ` & ` across ALL cases — this covers existing cases already in localStorage that still use the old key names:

```js
function safeFBCases(cs){
  return cs.map(function(c){
    if(!c.checklist) return c;
    var cl={};
    Object.entries(c.checklist).forEach(function(entry){
      cl[entry[0].replace(/\//g,' & ')]=entry[1];
    });
    return Object.assign({},c,{checklist:cl});
  });
}
```

`pushToFirebase()` now calls `safeFBCases(cases)` before passing to `.set()`.

### 3. `saveCase()` try-catch — Removed early return
**Line:** ~1080

The try-catch no longer returns early on error. As long as a decedent name is entered, the modal closes and "Case saved!" fires regardless of Firebase status. The case is always persisted to localStorage:

```js
// Before (blocked modal close on Firebase error):
try { save(); } catch(e){ showToast('Save error: '+e.message, false); return; }

// After (always closes modal):
try { save(); } catch(e){ console.error('save() error:',e); }
closeModal('caseModal');
renderCases();
showToast('Case saved!');
```

---

## Rules Going Forward (Session 1)

- **Firebase keys cannot contain:** `.` `#` `$` `/` `[` `]`
- **Any new checklist group names** added to `CHLOE_CHECKLISTS` or `MARTICE_CHECKLISTS` must not use those characters
- The `safeFBCases()` sanitizer handles `/` in legacy data automatically on every write
- The only required field to save a case is the decedent/family name — nothing else blocks save

---

## Data Flow on Save

1. User fills in name → clicks Save
2. `saveCase()` builds the case object with checklist from `CHLOE_CHECKLISTS[wDisp]`
3. `save()` → `localStorage.setItem('bw:cases4', ...)` succeeds (localStorage has no key restrictions)
4. `save()` → `pushToFirebase()` → `safeFBCases(cases)` sanitizes `/` → `.set(data)` succeeds
5. Modal closes, `renderCases()` fires, "Case saved!" toast shows

---

## Why Martice Cases Were Never Affected

`MARTICE_CHECKLISTS` group names (`'Commission Packet'`, `'New Property (if applicable)'`, `'Submission'`, `'Follow-Up'`, etc.) contain no Firebase-forbidden characters, so Martice saves always worked.

---

## Light / Dark Mode Toggle (Commit: 43de7a3)

### What Was Added

The dashboard is dark by default (navy background). A toggle was added so users can switch to a light theme.

### Changes

**CSS** — Added `body.light-mode` block at the end of `<style>` (~line 151). Light mode palette:
- Background: `#f0f2f8` (light blue-grey)
- Cards: `#ffffff`
- Text: `#1a2744` (brand navy)
- Secondary text/labels: `#5a7090`
- Borders: `#dde3ec`
- Inputs: `#f5f7fb`
- All nav/header elements stay navy (brand identity preserved)

**HTML** — Added toggle button to the `<header>` between `.user-switcher` and `.gcal-btn`:
```html
<button id="dashModeBtn" onclick="toggleDashMode()" ...>🌙</button>
```
Shows 🌙 in dark mode, ☀️ in light mode.

**Flash prevention** — Added inline script immediately after `<body>` opens:
```html
<script>if(localStorage.getItem('bw:dashMode')==='light')document.body.classList.add('light-mode');</script>
```
This runs before any HTML renders, preventing a flash of dark mode when the user's saved preference is light.

**JS** — Added `toggleDashMode()` function and init IIFE before the `initFirebase()` call at the bottom of the script block. Persists preference to `localStorage['bw:dashMode']` (`'light'` or `'dark'`).

### Rules Going Forward

- The dashboard is dark by default — `body.light-mode` is the opt-in class, not `body.dark-mode`
- `localStorage['bw:dashMode']` is `'light'` or missing/`'dark'`
- The flash-prevention script must stay at the very top of `<body>` (before any other content) to work correctly
- Any new CSS elements added to the dashboard that use hardcoded dark colors (`#0e1829`, `#1a2744`, `#ffffff11` etc.) need a corresponding `body.light-mode` override to look correct in light mode

---

## Session 2 Changes (2026-06-12) — Commit: bc376ec

---

## Bug Fix — Touchpoint Logging Crash

### What Was Broken

Clicking "+ Log" on any case did nothing — textarea didn't clear, no note appeared, no visible error. Affected both Martice and Chloe.

Root cause: Firebase drops empty arrays on write. When a case is saved with `touchpoints: []`, Firebase stores nothing for that key. When the data is read back, `c.touchpoints` is `undefined`. The `addTouchpoint()` function called `c.touchpoints.unshift(...)` without guarding against `undefined`, throwing a silent `TypeError`.

### What Was Fixed

```js
// Before (crashes if Firebase dropped the empty array):
c.touchpoints.unshift({text, date: new Date().toISOString()});

// After:
if(!Array.isArray(c.touchpoints)) c.touchpoints = [];
c.touchpoints.unshift({text, date: new Date().toISOString()});
```

### Rules Going Forward

- **Firebase drops empty arrays** — never call array methods on data read from Firebase without first checking `Array.isArray()` or initializing with `|| []`
- This applies to any array field on cases: `touchpoints`, `misc`, `quoteCategories`, etc.
- Verified via Playwright automation: both Martice and Chloe cases log touchpoints correctly

---

## Checklist Additions

### CIRGAS Confirmed Sale — Submission group
Added two items to `MARTICE_CHECKLISTS['CIRGAS::Confirmed Sale']['Submission']`:
- `'Blind Check Placed'`
- `'Blind Check Submitted'`

### Chloe Checklists — Burial Transit Permit
Added `'Burial Transit Permit Uploaded'` immediately after `'DCs Ordered'` in the `'Death Certificates & Permits'` group of **both** `Cremation` and `Burial` checklists.

---

## Case Type Color-Coding

### What Was Added

A `TYPE_COLORS` constant maps each case type to a color:
```js
const TYPE_COLORS = {
  'RIC':             { sale: '#2a9d8f', quote: '#1e7a6e' },
  'CIRGAS':          { sale: '#3a7ca5', quote: '#2d6080' },
  'GA Policy':       { sale: '#5a8f3c', quote: '#476e2e' },
  'Clearpoint Trust':{ sale: '#7b5ea7', quote: '#5e4780' },
  'Work Order':      { sale: '#c8860a', quote: '#c8860a' }
};
```

`caseTypeColor(c)` returns the appropriate shade based on `c.disp` and `c.serviceType`.

Case cards use the type color for:
- Left border accent (`border-left-color`)
- Card border overall (`border-color` at lower opacity)
- The type tag badge on the card header

### Rules Going Forward

- Status color (`SC[c.status]`) is still used for some UI elements (status badge) but NOT for the card border
- When adding a new case type, add it to `TYPE_COLORS` with both `sale` and `quote` shades
- Quotes use a slightly darker shade than confirmed sales (counterintuitive — the sale shade is more saturated)

---

## Type-Specific Case Detail Forms

### Architecture

Three new detail form sections were added inside wizard step 4 (`#ws4`):
- `#cirgasDetailSection` — CIRGAS Confirmed Sale
- `#ricDetailSection` — RIC Confirmed Sale
- `#gaDetailSection` — GA Policy / Clearpoint Trust Confirmed Sale

`populateCaseForm()` shows exactly one section (or none) based on `wDisp` and `wServiceType`. The generic top-level fields (`cDisc`, `cPassare`, `cServiceDate`) are hidden for CIRGAS and RIC confirmed sales since the detail sections cover those fields.

Case data is stored in `c.caseDetail` (a plain object saved alongside the case). Existing cases without `caseDetail` display normally — no migration needed.

### CIRGAS Confirmed Sale — Family Service Information Sheet

Fields added (all prefixed `cd`):
- `cdContractNum` — Contract #  
- `cdFhOrigin` — Funeral Home of Origin
- `cdFsd` — Family Service Director (defaults to "Martice Morrison")
- `cdFuneralDirector`
- `cdDecFirst`, `cdDecMiddle`, `cdDecLast` — Deceased name
- `cdDob`, `cdDod`, `cdAge` — DOB, DOD, Age (auto-calculated via `calcCirgasAge()`)
- `cdArrangementDate`, `cdFuneralDate`, `cdFuneralTime`, `cdIntermentDate`, `cdIntermentTime`
- Purchaser: `cdPurchName`, `cdPurchRelationship`, `cdPurchStreet`, `cdPurchCity`, `cdPurchState`, `cdPurchZip`, `cdPurchHomePhone`, `cdPurchCellPhone`, `cdPurchEmail`
- `cdHasCoPurch` checkbox — toggles `#cdCopurchBlock` with matching co-purchaser fields
- `cdPropertyLocation`, `cdVault`

On save: `c.serviceDate` ← `cdFuneralDate`, `c.intermentDate` ← `cdIntermentDate`, `c.disc` ← `cdContractNum`, `c.passare` ← `cdPropertyLocation`.

### RIC Confirmed Sale

Fields added (all prefixed `rd`):
- Purchaser: `rdPurchName`, `rdPurchRelationship`, `rdPurchStreet`, `rdPurchCity`, `rdPurchState`, `rdPurchZip`, `rdPurchPhone`, `rdPurchEmail`
- `rdHasCoPurch` checkbox — toggles `#rdCopurchBlock` with matching co-purchaser fields
- `rdContractNum`, `rdForBenefitOf`, `rdPropertyType` (select), `rdLocation`, `rdPaymentAmount`
- `rdServicesFull` (checkbox, checked by default) — when unchecked, reveals `rdFollowUpDays` (default 90)

**Services Not Full behavior:** If unchecked on first save, a task is auto-created in `tasks[]`:
```js
tasks.push({
  id: uid(),
  text: 'RIC Follow-Up: ' + decedent + ' — Services Not Full',
  priority: 'High', cat: 'Work',
  dueDate: today + followUpDays,
  notes: 'Auto-created: RIC services not full at time of sale.'
});
```
The case card also shows a `⚠ Services Not Full` badge in the header.

On save: `c.disc` ← `rdContractNum`, `c.passare` ← `rdLocation`.

### GA Policy / Clearpoint Trust Confirmed Sale

Fields added (all prefixed `gd`):
- Funeral Recipient: `gdRecipTitle` (Mr./Mrs./Ms./Miss), `gdRecipFirst`, `gdRecipMiddle`, `gdRecipLast`, `gdRecipDob`, `gdRecipPhone`, `gdRecipStreet`, `gdRecipCity`, `gdRecipState`, `gdRecipZip`
- `gdPurchSameAsRecip` checkbox — hides `#gdPurchBlock` when checked
- Purchaser: `gdPurchName`, `gdPurchPhone`, `gdPurchStreet`, `gdPurchCity`, `gdPurchState`, `gdPurchZip`
- Disposition: two `.ga-disp-btn` buttons (Casket Placement / Cremation). `selectGaDisp(disp)` renders service type radio list matching Chloe's wizard options. Selection stored in hidden `gdDisposition` + `gdServiceType`.
- `gdPaymentAmount`

---

## Purchaser Contact at Top of Card

For cases with `c.caseDetail`, the purchaser name, phone, and email are extracted and shown in the card header **above** the disc/passare/date row, visible without expanding.

Logic:
```js
const purchName = cd.purchName || (cd.recipFirst ? [cd.recipTitle, cd.recipFirst, ...].join(' ') : '');
const purchPhone = cd.purchPhone || cd.purchCellPhone || cd.purchHomePhone || cd.recipPhone || '';
```

---

## Martice Sort by Interment Date

Martice's case list sorts by `c.intermentDate || c.serviceDate` soonest-first. Cases with no date sort last. Secondary sort is urgency score (same as before).

```js
if(activeUser === 'martice') {
  const dateA = a.intermentDate || a.serviceDate || '';
  const dateB = b.intermentDate || b.serviceDate || '';
  if(!dateA && !dateB) return urgencyScore(a) - urgencyScore(b);
  if(!dateA) return 1; if(!dateB) return -1;
  if(dateA !== dateB) return dateA.localeCompare(dateB);
}
return urgencyScore(a) - urgencyScore(b);
```

This sort only applies when `activeUser === 'martice'`. "All Cases" view still sorts by urgency only.

---

## Modal Close Button

Added `<button id="caseModalCloseBtn">` as an absolute-positioned X button in the top-right of the case modal.

`closeCaseModal()` — when no `caseId` is set (new case creation), shows `confirm('Discard this case?')` before closing. When editing an existing case, closes immediately.

### Rules Going Forward

- `closeCaseModal()` handles the confirm logic — do NOT call `closeModal('caseModal')` directly from new UI that closes the case modal
- The close button is always visible (all wizard steps) — `position:absolute;top:14px;right:14px` on the modal

---

## Font / Spacing Improvements

Base font increased from browser default (~13px) to **14px**. Key size changes:
- `.case-card-title`: 16px (was 15px)
- `.check-label`: 13px (was 12px)
- `.field input/select/textarea`: 14px (was 13px)
- `.touchpoint-text`: 13px (was 12px)
- `.nav-btn`: 13px, more padding
- `.btn-sm`: 12px, more padding
- Card header and body padding increased by 2px each

---

## JS Helper Functions Added

| Function | Purpose |
|---|---|
| `caseTypeColor(c)` | Returns hex color for case type + service type |
| `calcCirgasAge()` | Auto-fills `#cdAge` from DOB and DOD |
| `selectGaDisp(disp)` | Renders GA service type radio list; updates hidden fields |
| `collectCirgasDetail()` | Reads all `cd*` fields → returns `caseDetail` object |
| `collectRicDetail()` | Reads all `rd*` fields → returns `caseDetail` object |
| `collectGaDetail()` | Reads all `gd*` fields → returns `caseDetail` object |
| `v(id)` | `document.getElementById(id)?.value` shorthand |
| `restoreCirgasDetail(d)` | Populates `cd*` form fields from saved `caseDetail` |
| `restoreRicDetail(d)` | Populates `rd*` form fields from saved `caseDetail` |
| `restoreGaDetail(d)` | Populates `gd*` form fields from saved `caseDetail` |
| `clearDetailSections()` | Resets all detail section fields + checkboxes to defaults |
| `closeCaseModal()` | Closes case modal with confirm-on-discard for new cases |

---

## Pre-Push Testing Checklist

Before any future push to dashboard.html:

1. **Syntax check:**
   ```
   node -e "var fs=require('fs');var h=fs.readFileSync('dashboard.html','utf8');var m=h.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/g);if(m)m.forEach(function(s,i){var src=s.replace(/<script[^>]*>/,'').replace(/<\/script>/,'');try{new Function(src);}catch(e){console.log('ERROR block '+i+': '+e.message);}});console.log('done');"
   ```

2. **Verify touchpoints** — open a case, log a touchpoint for both Martice and Chloe users.

3. **Verify case detail forms** — create a new CIRGAS Confirmed Sale, RIC Confirmed Sale, and GA Policy Confirmed Sale. Confirm detail sections appear and form saves correctly.

4. **Firebase keys** — any new checklist group names must not contain `.` `#` `$` `/` `[` `]`.

5. **Array fields from Firebase** — always guard with `Array.isArray()` or `|| []` before calling array methods on data read from Firebase.

6. **`c.caseDetail`** — existing cases don't have this field; always read as `c.caseDetail || {}`.

7. **Sort** — Martice sort only applies when `activeUser === 'martice'`; All Cases view stays urgency-sorted.
