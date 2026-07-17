# Debrief: Pull per-grave coordinates out of MIS / CemeView (Batesville) for Washington Memorial Park

**You are being handed a focused data-extraction task.** A different Claude session built the context below by reverse-engineering the MIS client-side JavaScript. Read it, then help the user (Martice, a Bonney Watson cemetery counselor) get plot **position** data out of MIS. There is probably **no visible Export button** for his license — your job is to get the coordinates another way, from the browser, since the data is all there client-side.

You'll be working in the user's browser (Chrome, likely via a Claude-in-Chrome / DevTools-style setup). The user is already logged into MIS as `mmorrison`.

---

## 1. What we're building and why we need this

We maintain a separate internal web map of Washington Memorial Park (WMP) that overlays each cemetery section's grave grid on an aerial photo. We already pull **status/occupancy** (Available/Occupied/Reserved) and deceased/owner **names** from MIS's Lot Inquiry export. What we're missing is authoritative **positions** — where each grave physically sits. Our current positions came from old Excel maps and have real errors at section edges. **MIS is now our source of truth for positions.**

We need, per grave space, for one section at a time (start with **Section 18 = "Garden of Flowers"**, `LocationCd = WMP`):

- **Lot location**: `Sec-<section> Blk-<lot> Lot-<row> Sp-<space>` (e.g. `Sec-18 Blk-355 Lot-C Sp-1`) — or the component fields (Section, Row, Lot, Space, Depth).
- **Position**: MIS's `X / Y / Z / Angle` coordinates (internal CAD/DWG space is fine — we can calibrate it), **and/or** the per-space **Lat/Long** (geo — even better, directly plottable).
- Nice-to-have: `Grave Type` (marker template), `Lot_Space_Id` (MIS internal id).

Output we want: a **CSV or JSON**, one row per space, with those columns. If you can produce that for Section 18, we're set; the same method then repeats for the other ~22 sections.

---

## 2. The system (what we learned from the source)

- **App**: ASP.NET WebForms, `Mapping.aspx` (the "CemeView" mapping tool) and a `Lot Inquiry` screen under Cafe → Cemetery. Uses jQuery + **Snap.svg** to render graves as SVG, and **AjaxPro** for server calls.
- **Base URL**: `https://bonneywatson.f3.batesvillemis.com/ENTERPRISEV150/`
- **Mapping page**: `Cemetery/Mapping.aspx?Mode=MapOnly&Map_Details_ID=1&LocationCd=WMP` — NOTE: `Mode=MapOnly` **hides** the editing/query tools (`btnQueryMap`, the Lot Space Details grid button, etc. are `display:none`). To get the full toolbar you likely need to reach Mapping.aspx **without** `Mode=MapOnly` — e.g. via the Lot Inquiry → map path, or an "Edit Map" entry. Check which mode gives a visible toolbar with the grid/CemeCAD icons.
- **AjaxPro namespace**: `Cemetery_Mapping`, loaded from `/ENTERPRISEV150/ajaxpro/Cemetery_Mapping,App_Web_*.ashx`. Server methods are callable **directly from the DevTools console** as `Cemetery_Mapping.MethodName(arg1, arg2, ..., callback)`; the callback receives `{ value: ... }` (or you can call synchronously and read the return's `.value`). This is the key lever — you can call server methods without clicking through the UI.

### The data we want lives in the "Lot Space Details" grid
- Toolbar button `#btnShowLotSpaceGrid` (a `fa-th` grid icon) opens window `#navLotSpaceGrid` containing table `#LotSpaceDetailsTable`.
- That grid's **rendered columns already include** exactly what we need: `Lot Space ID, Section, Row Number, Row Alpha, Lot Number, Lot Alpha, Grave Number, Grave Alpha, Depth, Location, X Coor, Y Coor, Z Coor, Angle, Grave Type, First Name, Last Name, ..., X Coor Alt, Y Coor Alt`.
- The page holds these column keys in a JS array named `coulmnIds` (note the typo) = `["Lot_Space_Id","Section","Lot_Row_Nbr_Num","Lot_Row_Nbr_Alpha","Lot_Lot_Nbr_Num","Lot_Lot_Nbr_Alpha","Lot_Space_Nbr","Lot_Space_Nbr_2","Lot_Depth","Lot_Location","Lot_X_Coor","Lot_Y_Coor","Lot_Z_Coor","Lot_A_Coor","Lot_Gr_Type","Deceased_First_Name","Deceased_Last_Name","Deceased_Name","Owner_First_Name","Owner_Last_Name","Owner_Name","Lot_X_Coor_Alt","Lot_Y_Coor_Alt"]`.
- The grid is populated/paginated by functions `fnShowLotSpaceGrid`, `BindGridPage` / grid-bind helpers, sorted via `sortLSGrid`, total count via `Cemetery_Mapping.GetTotalvalues()`, rows via `Cemetery_Mapping.GetRowsForGrid(pageNumber, sortColumn, sortDirection, callback)`.
- **There ARE export/import functions in the loaded JS**: `fnExportLotSpaceData` and `fnImportLotSpaceData` (17-column tab-delimited). Even if no button is visible, the function object exists on the page.

### Coordinate systems (important for interpreting X/Y)
- `Lot_X_Coor / Lot_Y_Coor` are MIS **DWG/CAD** coordinates (an internal drawing space), NOT lat/lon. `Lot_A_Coor` = angle, `Lot_Z_Coor` = depth layer.
- The page exposes the DWG↔SVG mapping via hidden fields: `XSVGCoor=5100, YSVGCoor=5100, XDWGCoor=5000, YDWGCoor=5000, hdnUCS=4.7123889804` (radians ≈ 270°), `hdnPageRotation`, and paper bounds `hdnPaperLeft/Right/Top/Bottom`. JS helper `fnConvertDWFtoSVG(x,y)` converts DWG→SVG.
- **Lat/Long per space** is computed server-side and returned by `Cemetery_Mapping.GetPropertyInfoFromLotSpaceID(lotSpaceId, "WMP", callback)` — the result rows contain a `LATLONG` field (e.g. `"47.451105,-122.297763"`), plus `Lot_Location`, `Space_Status`, names, `Lot_X_Coor/Y_Coor/Z_Coor/A_Coor`, `Lot_Space_Id`. This is the direct geo we'd love in bulk, but the Property Info popup fetches it one space at a time.

---

## 3. Approaches, in order of preference — try them in the console

**A. Call the export function directly.** In the console on the Mapping page (full mode, after opening the Lot Space Details grid for Section 18), try invoking `fnExportLotSpaceData()` (inspect it first: `fnExportLotSpaceData.toString()`). If it builds tab-delimited text or triggers a download, that's the whole job. If it depends on a selection/state, replicate that state first.

**B. Pull the grid data via the server method.** Determine total rows with `Cemetery_Mapping.GetTotalvalues()`, then loop `Cemetery_Mapping.GetRowsForGrid(page, "", "", cb)` across all pages (or find/raise the page size) and collect every row object. Each row has the `Lot_*` fields above including `Lot_X_Coor/Y_Coor/Z_Coor/A_Coor` and `Lot_Location`. Dump to JSON/CSV. **First** you must scope it to Section 18 — the grid is populated after a query; figure out how `fnShowLotSpaceGrid` / the query sets the section filter (it may key off the current map/section or a query the user runs), then read the rows the same source feeds the grid.

**C. Scrape the rendered grid DOM.** Open `#LotSpaceDetailsTable`, page through with the pagination controls (or bump page size), and read each `<tr>`'s cells (columns listed above). Slower but dead simple and needs no method reverse-engineering.

**D. Parse the SVG.** When a section is rendered on the map, each grave is an SVG `<rect>` with `name="lsId_<Lot_Space_Id>"` inside `#LAYER_QUERYRESULTS`, positioned/rotated by its transform (derived from X/Y/Angle). You can walk those elements. Prefer A–C; the raw grid data is cleaner than back-computing from SVG transforms.

**E. Bulk-ish Lat/Long.** If we end up wanting geo directly and no bulk method exposes `LATLONG`, you can iterate `GetPropertyInfoFromLotSpaceID` over the `Lot_Space_Id`s gathered in B/C to collect `LATLONG` per space. That's N server calls — fine for one section (~a few hundred–thousand spaces) if throttled politely, but confirm with the user before hammering the server.

---

## 4. Deliverable & handoff back

Produce, for **Section 18** first: a CSV (or JSON) with columns roughly:
`lot_location, section, lot(block), row, space, depth, x, y, z, angle, grave_type, lot_space_id, lat, long`
(lat/long optional if only DWG X/Y are obtainable — we can calibrate DWG→our-aerial from a handful of known lat/longs).

Save it where Martice can find it (e.g. `E:/Downloads/`) and tell him the filename. He'll hand it back to the map-building Claude session, which will transform these into our overlay's grid.

**Verification the other session can cross-check against** (Section 18, real values already confirmed from MIS Property Info popups):
- `Sec-18 Blk-355 Lot-C Sp-1` → lat/long `47.451105, -122.297763`, Status Available
- `Sec-18 Blk-211 Lot-D Sp-4` → `47.451576, -122.298378`
- `Sec-18 Blk-220 Lot-D Sp-4` → `47.451576, -122.297795`, Occupied (name withheld)
- `Sec-18 Blk-160 Lot-A Sp-4` → `47.451826, -122.29773`, Occupied (name withheld)
- `Sec-18 Blk-48 Lot-D Sp-1` → `47.45226, -122.29786`, Occupied (name withheld)
- Section 18 has **449 blocks**, 16 spaces each nominal (some edge/road/rose-garden blocks are half-blocks with only 8 real spaces), ~7,600 space rows total.

## 5. Guardrails
- This is **read-only extraction**. Do **not** use `fnImportLotSpaceData`, save, or any write/edit method — those modify the live cemetery system of record. Only read.
- Throttle any bulk server-call loop; don't overwhelm MIS. Ask Martice before running anything that fires thousands of requests.
- If the full-toolbar Mapping page or the grid genuinely isn't reachable for his login, say so plainly — then the fallback is manual transcription from map screenshots, which the other session can handle.
