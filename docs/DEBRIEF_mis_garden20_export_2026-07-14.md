# Debrief: pull per-grave coordinates out of MIS for **Section 20 — Garden of Light** (WMP)

You are being handed a focused, **read-only** data-extraction task. A different Claude session
already did this successfully for Section 18; this is the same job for Section 20. Read section 2
("what actually worked") before trying anything — it will save you the two dead ends we hit.

The user is **Martice** (Bonney Watson cemetery counselor), already logged into MIS as `mmorrison`.
Work in his browser (Chrome / DevTools).

**Base URL:** `https://bonneywatson.f3.batesvillemis.com/ENTERPRISEV150/`

---

## 1. What we need

We maintain an internal aerial map of Washington Memorial Park. MIS is our **source of truth for
grave positions**. We already have Section 20's status/owner data. We need **positions**.

### Deliverable A — Section 20 coordinates (the main job)

One CSV, one row per space, saved to `E:/Downloads/`. Match the Section 18 file's columns exactly:

```
lot_space_id,lot_location,section,row_num,row_alpha,lot_num,lot_alpha,space_nbr,space_nbr2,
depth,x,y,z,angle,grave_type,space_status,deceased_first,deceased_last,owner_first,owner_last
```

Name it `section20_coords_FULL_<N>rows.csv` (put the real row count in the name — it makes a
zero-row failure obvious immediately).

**Expected scale:** the Lot Inquiry export for `Section = 20` returns **8,693 space records** across
**520 blocks**. If your coordinate export returns dramatically fewer, say so rather than shipping it —
Section 18's mapping was incomplete in MIS (60 blocks had inventory but no coordinates), so a shortfall
is a real finding, not necessarily your bug. Just report the number.

### Deliverable B — the Garden of Light Niches (and anything like it)

Section 20's map has a **"Garden of Light Niches"** structure in the middle, and a **"Garden Monument"**
at the top right. In MIS these are **their own sections**, not blocks inside Section 20 — that's how the
Rose Urn Garden worked (it lived in sections `RUG` / `RGBE` / `SCGF`, not in Section 18).

**Please enumerate the Section dropdown on the Lot Inquiry screen and send back the full list of section
codes.** We want to know what exists cemetery-wide, not guess. Then export coordinates for any section
that belongs to Garden of Light (niches, monument, scattering, urn — whatever is there), same columns
as above, one file per section: `<SECTIONCODE>_coords_<N>rows.csv`.

Note: **niches are above-ground columbarium**, unlike the Rose Garden's in-ground urn containers. Their
coordinates may behave differently (many spaces sharing one X/Y, or Z/depth doing the work). Don't
force them into a grave-shaped model — just export what MIS has and describe what you see.

### Deliverable C — ~5 lat/longs for verification

From the **Property Info** popup, get real lat/longs for about **5 spaces spread to the far corners and
middle of Section 20** (not clustered). Report as `Sec-20 Blk-<x> Lot-<y> Sp-<z> -> lat, long`.

**Why:** we already have a CAD→WGS84 affine fitted from Section 18 that is good to 0.03m, and we expect
it to be global across the WMP drawing. We need these to **check** that, not to fit it. If Garden of
Light sits on a different drawing or origin, these 5 points are what reveals it. Spread matters more
than count — 5 corners beats 20 clustered.

---

## 2. What actually worked (and the two dead ends)

**Dead end 1 — `Mode=MapOnly` hides the tools.** `Cemetery/Mapping.aspx?Mode=MapOnly&...` sets
`btnQueryMap` and the Lot Space grid button to `display:none`, and `ddlQMSpaceStatus` comes back empty.
Don't use `Mode=MapOnly`. Reach the map through the **Lot Inquiry** screen (Cafe → Cemetery) instead.

**Dead end 2 — the grid is session/query-driven.** Our first export returned **0 rows**, because
`GetRowsForGrid` reads whatever the current *query* populated. **You must run a Query Map search for the
section first**; only then does the grid have rows to return. A zero-row result almost always means
"no query ran," not "no data."

**The path that worked:**
1. Lot Inquiry → run a search for the section (`Location = WMP`, `Section = 20`).
2. Get to Mapping.aspx with the full toolbar (no `Mode=MapOnly`), open the Lot Space Details grid
   (`#btnShowLotSpaceGrid`, the `fa-th` icon) → window `#navLotSpaceGrid`, table `#LotSpaceDetailsTable`.
3. Pull rows via AjaxPro from the DevTools console. The namespace is `Cemetery_Mapping`; methods are
   callable directly as `Cemetery_Mapping.Method(args, cb)` and the callback gets `{value: ...}`.
   - `Cemetery_Mapping.GetTotalvalues()` → row count
   - `Cemetery_Mapping.GetRowsForGrid(pageNumber, sortColumn, sortDirection, cb)` → page of rows
   - Column keys live in a JS array named `coulmnIds` (yes, the typo is in their source):
     `Lot_Space_Id, Section, Lot_Row_Nbr_Num, Lot_Row_Nbr_Alpha, Lot_Lot_Nbr_Num, Lot_Lot_Nbr_Alpha,
     Lot_Space_Nbr, Lot_Space_Nbr_2, Lot_Depth, Lot_Location, Lot_X_Coor, Lot_Y_Coor, Lot_Z_Coor,
     Lot_A_Coor, Lot_Gr_Type, Deceased_First_Name, Deceased_Last_Name, Owner_First_Name, Owner_Last_Name, ...`
4. Fallbacks if that stalls: scrape `#LotSpaceDetailsTable` rows directly, or inspect
   `fnExportLotSpaceData` (`fnExportLotSpaceData.toString()`) — it exists on the page even with no
   visible button. Per-space lat/long comes from
   `Cemetery_Mapping.GetPropertyInfoFromLotSpaceID(lotSpaceId, "WMP", cb)` → `LATLONG` field.

**Coordinates:** `Lot_X_Coor / Lot_Y_Coor` are internal CAD/DWG feet, not lat/lon. That's fine — send
them raw, we transform on our end. Don't try to convert.

---

## 3. Section 20's shape — so you can sanity-check your own output

From the Lot Inquiry export (`Location = WMP. Section = 20.`, 8,693 records), confirmed:

- **One section: `20`.** Address format: `Sec-20 Blk-1A Lot-A Sp-1`.
- **Blocks are number+letter**: `1A` … `78M`. Letters **A–M**, numbers roughly 1–78. **520 distinct blocks.**
- **Rows** are `Lot-A/B/C/D`; **spaces** are `Sp-1..4` → **16 spaces per block**, same as Section 18.
- 277 blocks have exactly 16 records; the rest have more, because of multi-depth (below).

### ⚠️ Multi-depth — do not collapse these

Some graves are dug deeper with **more than one person buried in them**. MIS encodes this as a suffix:
`Sp-1-2nd`, `Sp-1-3rd`, `Sp-2-2nd`, `Sp-3-2nd`, `Sp-4-2nd` (and `(2nd)`-style parentheses elsewhere).

**Export every row. Do not de-duplicate by space.** A previous pass deduped these and silently dropped
**424 real burials** in Section 18 before Martice caught it. Keep `depth` / `space_nbr_2` intact so each
occupant survives. If you are ever unsure whether two rows are duplicates, **keep both** and flag it.

There are also **4 rows with `Sp-5`** in Section 20 — unexpected for a 4-space row. Don't "fix" them;
export as-is and mention them.

---

## 4. Guardrails

- **Read-only.** Do **not** call `fnImportLotSpaceData`, save, or any write/edit method. This is the live
  cemetery system of record for real burials. Only read.
- **Throttle bulk loops.** Ask Martice before firing anything in the thousands of requests.
- If the full-toolbar Mapping page or the grid genuinely isn't reachable for his login, **say so plainly**
  rather than improvising — the fallback is manual transcription, which the map session can handle.
- Report row counts honestly, including shortfalls. "MIS has no coordinates for these blocks" is a
  legitimate and useful answer; a quietly truncated file is not.
