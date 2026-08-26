# TRACK A — s26/contact-autofill

Contact auto-import between the contacts layer and the four contract lanes in
`index.html`. Work in the worktree `../bw-quote-tool-s26a` on branch
`s26/contact-autofill` (the director created both; `node_modules` is junctioned). Obey
`ops/SPRINT_GUIDELINES.md` and `ops/DESIGN.md`. Everything you need is in this file plus
the code; log ambiguity as decisions in your report, never block.

## The behavior to build

Two directions, both **fill-blanks-only** (operator rulings, binding):

**1. Import at link time.** When a contact is linked to a contract module (RIC `ric`,
CIRGAS `an`, Global Atlantic `ga`, ClearPoint `cp`), fill that person's role block's
EMPTY fields from the party record: street/city/state/zip, phone(s), email. A field the
counselor already typed is NEVER overwritten. The existing name fill
(`_bwFillNameFromLink`, ~16577) stays as-is and is the pattern to generalize.

**2. Write-back at save time.** When a contract lane saves its record, copy typed
address/phone/email values onto each linked party ONLY where the party record is empty,
then `saveParty` — and only call `saveParty` for parties that actually changed. A party
with existing `phones`/`emails`/`addresses` keeps them untouched (fill only when the
whole sub-object is empty/null — never append p2/a2 variants).

## Role → field-block map

Drive both directions from ONE declarative map (extend `BW_LINK_MODULES` or add a
sibling table; roles are data, DESIGN §8):

- `ric`: role `purchaser` → `ricStreet, ricCity, ricZip, ricPhone` (phone), `ricDayPhone`
  (combined Email/Day-Phone: fill from party email only when blank; there is a standing
  rule at ~20736 that input masks must not touch this field — do not add one).
- `an` (CIRGAS): `purchaser` → `anPurch{Street,City,State,Zip,HomePhone,CellPhone,Email}`;
  `co-purchaser` → `anCoPurch{...}` same shape. Party primary phone → HomePhone; a second
  party phone (if any) → CellPhone; never duplicate one number into both.
- `ga`: `insured` → `gaInsured{Street,City,State,Zip,Phone}`; `owner` → `gaOwner{...}`;
  `beneficiary` → `gaBenef{...}`.
- `cp`: first person block `cpAddress, cpCity, cpState, cpZip, cpPhone`; second block
  `cpAddress2, ...2, cpPhone2`. Read the CP form to determine what the second block
  represents and map by role where the roles distinguish, falling back to link order
  (first link → block 1, second → block 2). Record the mapping you chose in your report.

Verify every field id against the live form before wiring it (the lists above were
grepped, not exercised). If a lane has a state field the map lacks (or vice versa), the
form wins; note it.

## Trigger points

- `bwSetPendingLink` and `bwAddPendingLink` (interactive linking) fill the mapped block.
- `bwSetPendingLinkRole` (role change on a chip) fills the NEW role's block (blanks only;
  it must not clear or move anything already in the old block).
- The RESTORE path (~17019, rebuilding `_bwPendingLink` when a saved record loads) must
  NOT trigger the fill — the saved record's own fields are authoritative on load, and a
  fill there would mutate a record the counselor merely opened.
- Write-back hooks into each lane's existing save path at the point where the
  contractRoles join is written (grep `saveQuoteRecord` / the per-lane save functions),
  AFTER a successful record save.

## Data hygiene (hard rules)

- Phones are stored DIGITS ONLY on the party (see `submitContactEditor` ~16498); format
  for display with `bwFmtPhone` when filling form fields that expect formatted numbers —
  match what each form's placeholder shows.
- Address shape: `{a1: {type:'mailing', street1, street2:'', city, state, postal,
  isPrimary:true}}`; emails `{e1: {value, isPrimary:true, note:''}}`.
- **No production Firebase writes from tests, ever** (`tests/fake-firebase.js`, network
  blocked). The write-back feature itself writes parties in production use — that is the
  point — but every test exercises it against the fake store only.
- No real customer data in fixtures: 555 phones, `@example.com`, invented names.

## Verification (quote outputs verbatim in your report)

- `npm run check` → `index.html: 8 blocks, 0 errors`
- `npm test` → full suite green; the pin rises from `3336 passed, 0 failed across 47
  suites` by exactly your new suite's count — report both numbers.
- New `tests/test-contact-autofill.mjs` (Playwright + fake-firebase, run from repo root)
  pinning at minimum:
  1. linking a contact with address+phone+email fills the empty block (per lane, all 4);
  2. a typed field survives linking (never overwritten);
  3. role change fills the new block, leaves the old block untouched;
  4. CIRGAS co-purchaser lands in `anCoPurch*`, not `anPurch*`;
  5. restore of a saved record does NOT fill;
  6. write-back fills an empty party's phone/address/email from the form at save;
  7. write-back never overwrites an existing party value, and a no-change save issues
     NO party write (count writes in the fake store);
  8. sabotage-proof the suite: break the feature two different ways, show red, restore,
     show green (quote both runs).
- Screen sanity: render a lane with a linked chip and eyeball your own screenshot
  (Playwright headless; MCP screenshots time out here).

## Report

What shipped; branch + commits (commit `[s26/contact-autofill]`, explicit paths, no AI
trailers); verbatim gate outputs; files changed; decisions & open questions; what the
director must verify by hand.
