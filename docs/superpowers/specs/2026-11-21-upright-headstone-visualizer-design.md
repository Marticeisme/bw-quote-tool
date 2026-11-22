# Upright Headstone Visualizer: design (draft for Martice's approval)

2026-11-21. Requested through the Property Cards session, on Martice's word. Nothing is built
until Martice says go. Flat (flush marker) version follows later on the same page and code.

## Why
A family sees the upright they are choosing, drawn to scale in their granite color, with the
price building as they choose. The page doubles as their quote. Staff then move that same
headstone into a Pre-Need or At-Need quote in one click instead of re-picking every piece.

## Goals
- Live, to-scale front view of tablet, base, foundation and vases. Colors follow the chosen
  Group 2 granite.
- Price builds line by line: tablet + base, foundation, vases, installation, 10.4% tax
  (on every memorial line, installation included), total.
- Print / Save as PDF as the family's quote. The choices ride in the link, so a link
  reopens to the same headstone.
- Photos (WMP uprights + PCM examples) and an Explanation tab.
- Staff-only Import to Quote button: Pre-Need cemetery quote or At-Need CIRGAS.

## Added during the build (Martice, 2026-11-21)
- Finish differences must be visually obvious: 3/4 view (front, top and right side visible),
  rock pitch drawn as chipped relief, polished with sheen and a crisp edge, sawn matte; a
  close-up of the top corner; a finish legend; a one-line "what changed" note on every pick.
- Compare sizes: every size drawn side by side at one scale in the family's granite and finish,
  filter All / Single / Companion, each card with its total for the current options; tapping
  one picks it.
- Companion uprights ARE included (UPRIGHT_SIZES rows 6-9), so single vs companion can be
  compared and chosen; import accepts them. Companion foundations use the same rule
  (48x12 base -> 56x22x4 $1,350; 48x14 -> 54x24x4 $1,350; 60x14 -> 66x26x4 $1,815):
  CONFIRMED by Martice 2026-11-21.
- Real photos (Martice: a drawn texture alone would confuse a family): blank in-stock stones from
  Design Memorials, cropped into upright-images/photos/, shown as a "Real stone" panel that
  follows the finish choice, as the legend close-ups and on the explanation tab.

## Non-goals (this round)
- Flat markers (next round).
- Saving into Firebase. Nothing on this page writes to the database.
- Lettering/design layout on the drawing (the PCM design catalog already does that).

## Anti-goals
- Any granite group other than Group 2 for uprights.
- A price the family sees that differs from what the import puts in the quote.
- Family link that shows staff controls, the quote tool, or bwquotetool.com tool pages.

## Prices and rules (sources)
- Tablet + base: `UPRIGHT_SIZES` in index.html, Group 2 column (row[3], `MARKER_COLOR_IDX.g2`),
  first six rows only. Matches the PCM 2026 Markers Price Book, Upright Monuments sheet.
- Installation $795 (last column).
- Standard finish is included in the upright price: tablet "P2, BRP, Standard Top" (polished
  front and back, rock-pitched sides, flat top); base "Polished Top, BRP". (PCM 2026 book.)
- Foundation: Barrell Gray, polished top, sawn sides, from the `qFoundation` list. Rock-pitched
  foundation sides +10% (PCM 2026 book, the only priced finish option).
- Priced upgrades in the 2026 PCM xlsx (BW retail; same book as UPRIGHT_SIZES):
  tablet P3 (front, back + top polished) +$770; P5 "all polished" +$960; polished margins
  +$1,060. APPROVED by Martice 2026-11-21: offered as priced options, taxed like every
  memorial line. Imported into quotes as Custom Line Items (Pre-Need) / added to the Memorial &
  Setting Fee (At-Need).
- Top shapes: Flat, Oval, Serpentine all at the listed price (PCM price book p2 shows all three
  as "Standard Top"). Custom top shape $1,060 -> shown as "custom shapes priced by quote".
- Anything else (sawn sides, steeled, carving, etching, photos): "priced by quote" or the
  Explanation tab, no amount on the quote.
- Foundation pairing (auto): smallest listed foundation at least 4in wider and 10in deeper than
  the base. 26/28in bases -> 32x24x4 $850; 30in bases -> 36x24x4 $990. Labeled "the monument
  company confirms the final foundation size."
- Vases: Paragon vase, $685 each (Martice 2026-11-21; matches the 2026 PCM xlsx "Metal Vases",
  Ray's v0.9 list and Nathan's 8/26 PCM quote at 2.75x). Choice of none / one / two, set on the
  base ends beside the tablet. No tariff. Paragon is die-cast aluminum (Everlife product pages),
  so it is drawn as a bronze-tone metal vase, not in the granite color.
- Granite: the 23 Group 2 colors in the 2026 xlsx (column F/D/D under "Group 2" on the
  Upright, Vase and Flush sheets). Blue Pearl is Group 2 on the Vase and Flush sheets but sits in
  the Group 3 column on the Upright sheet; treated as Group 2 (as the tool's labels do), flagged.
  Drawing uses real swatch photos (designmemorials.com / pacificcoastmemorials.com 576px
  polished-stone squares) as a texture, averaged color as the fallback.
- Where uprights are allowed: Section 6, designated blocks of Section 23, Cascade Court
  (markers-guide.html). Shown as a note; Superintendent approves the plot first.
- Upright price includes any standard design/emblem, names, dates, one line of epitaph, and
  proofs (say 3, per Martice's 11/09 ruling; PCM book says 4). Extra lines, etching, ceramic
  photo: chosen later, added cost.
- Check numbers (Group 2, installed, with tax, no vases): 18x24 $6,022.32; 20x18 $5,641.44;
  20x28 6in $6,717.84; 20x28 8in $8,346.24; 24x18 $6,359.04; 24x36 $11,912.16.

## Approaches
1. **Standalone page + handoff into the quote tool (picked, Claude's recommendation).**
   `upright-headstone.html` beside the other guides. Import stores the selection and opens
   index.html, which asks Pre-Need or At-Need and fills the fields. Family link = `?family`,
   no import button. Keeps the 11.9 MB index.html change small.
2. Build the visualizer inside index.html. Import is direct, but the family still needs a
   separate page, so the drawing code would live twice.
3. Standalone page with no handoff (staff re-pick). Fails the import request.

## Import mapping
- **Pre-Need cemetery quote:** `qMarkerType=upright`, `qMarkerSize` = the size row,
  `qMarkerColor=g2` (tablet + base + $795 install through the existing marker panel);
  `qFoundation` = the paired foundation. Custom Line Items: "Paragon vase x N" and
  "Rock-pitched foundation sides (+10%)" when chosen. Must be taxable.
- **At-Need CIRGAS:** Memorial Order fields filled as text (`anoMkCatUpright`,
  `anoMkUprightSize`, `anoMkGraniteColor`, `anoMkTabletFinish`, `anoMkBaseFinish`,
  `anoMkUprightFoundation`, `anoMkVaseOption`, `anoMkVaseType`). Amounts: "Memorial & Setting
  Fee" = tablet + base + install; "Vase / Base / Setting Fee" = foundation + vases.
- If the quote already has a marker, import asks before replacing it.
- Import never saves or persists the quote; staff save as usual.

## Research (2026-11-21)
- No PCM or Design Memorials online designer exists. Of the public tools (headstone.app 3D,
  Legacy Headstones, Memorials.com, Design Mart, Coldspring), none shows a live price that moves
  with color/finish/vases and none draws dimension lines on a front view. Those two are this
  page's edge.
- Borrowed: headstone.app's panel order (size -> stone -> base & vases), trade finish labels with
  a plain-English line under each, finishes visible on the drawing (rock pitch texture vs
  polished band), copy link / print, "lettering and art are settled on the proof."
- Explanation tab sources: PCM 2011/2020 design book "Additional Resources" + Glossary
  (combined PDF p393-414 / p512-529): tablet/die, base, foundation, P1/P2/P3/P5, BRP, BS,
  margins, top shapes, engraving styles, portraits (two-tone, tri-tone, hand diamond etch,
  laser etch), ceramic photos, vases. Warranty from PCM's warranty page. Timeline: proof ->
  production -> setting after the grave settles (no PCM lead time is published; say "several
  weeks", no number).
- Photos: Design Memorials in-stock uprights (mostly unlettered, e.g. IN000225 black serp,
  IN000227 flat). Custom galleries show family names and are not used.

## Look
House look: blue band #4a6b80 with the white BW logo, Cormorant headings with lining numerals,
orange #e84610 accents, house footer. Tabs: Design | Explanation | Photos.

## Left to the builder
Drawing details (reuse the front-view `draw()` from build_damte_uprights.py), swatch-to-color
mapping from the markers-guide Group 2 swatches, print layout, guides.html link placement.
Real WMP photos must be checked for readable names before use (repo is public).

## Rebuild after Martice's review (2026-11-21, supersedes the parts above it contradicts)
- STAFF ONLY: "we don't want the families having access ... competitors would use it". Page is
  `memorial-designer.html`, noindex, shows nothing until the quote tool's Firebase sign-in is
  present (dev bypass only on localhost with ?dev). Not on guides.html; no ?family mode; no
  copy-link buttons (it is printed for reference, never emailed). Opened from the quote tool's
  sidebar (Cemetery > Memorial Designer). The repo is public, so this stops casual access only.
- Real 3D (three.js 0.160, vendored in vendor/three): drag to rotate, scroll/pinch to zoom,
  Reset view. Rock pitch is real geometry (cellular chip relief), polished faces reflect a
  neutral sky (a green-lawn reflection made black read green), sawn is matte.
- Paragon vases modeled from Everlife's product drawing (4in rolled rim, neck, shoulder, waist,
  ring collar, 3 3/4in flared foot, 10in tall); die-cast aluminum in granite-look finishes,
  shown in the stone's color.
- FLAT MARKERS added (Upright | Flat switch): the six sizes the park allows per markers-guide
  (28x16, 32x20, 28x34 single or companion, 44x20 and 60x20 companion, 36x72 full ledger);
  Group 1, Group 1 Tariffed (Classic Gray, also listed as Cascade Gray) and Group 2, priced from
  FLUSH_SIZES; polished top, sawn sides; vase = 12x12x4 block in the same granite + $175 setting
  + one of the four vase-guide vases. Import fills marker, vase block and qVase.
- Design tab is the stone only: big sticky 3D view with the total, choices + price on the right,
  Print and Start over. Real Stone is its own tab (whole-stone photos, close-ups that pair two
  finishes; no flat-marker photos). How It Works is a few plain sentences. The "what you choose
  later, at added cost" section is gone: this is a baseline for at-need and pre-need families.
- At-Need import REPLACES the CIRGAS Memorial Order stone fields (a previous family's values
  survived the earlier fill-if-empty); lettering and instructions are untouched.
- Test: scratch/test-memorial-designer.mjs (129 checks, firebase traffic aborted).

## Round 3 (Martice, 2026-11-21 evening)
- Choices column on the LEFT, 3D on the right (phone: 3D on top).
- Granite flat vase block sits BELOW the marker. Companions: one vase block under ONE side (never
  centered across two spaces) or two, one under each side; import sets qty_vb / qty_vase.
- Bronze flat markers: every qBronze option in Standard, Expressions in Bronze and Veterans, drawn
  on its base (Barrell Gray granite or concrete), vase core where the size offers one (bronze vases).
  Sizes from the 11/04 price list (note: bronze-markers-guide says the 56x16 sits on a 64x20 base,
  the price list says 60x20; the designer follows the price list). Not included: urn-garden
  Cremorial scrolls, installation-only, niche/crypt scrolls and plaques.
- Upright base "All polished" (P5) +$960 (Martice: "I imagine it's the highest one"; PCM's top
  polish tier). Nathan's emails were not reachable (the connected Gmail is the HMIAF account);
  asked the Property Cards session.
- Flat 3D: orbits around the stone's face, camera stops at 68 degrees from overhead, flush stones
  cast no shadow (they read as floating).
- P5 = ONE matched set, tablet AND base polished all over, one $960 (Martice 11/21, "one $960 set";
  Nathan's quotes always pair a P5 tablet with a matching P5 base). The separate all-polished base
  option is gone; with P5 the base step says so and a polished margin does not apply.
