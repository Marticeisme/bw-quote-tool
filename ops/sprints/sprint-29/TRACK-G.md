# TRACK G — s29/dt-permission-per-owner: one Permission of Use per living owner

Read `TRACK-F.md`, `TRACK-F-REPORT.md`, `TRACK-A-REPORT.md` (the page-copy scars: pdf-lib
page cache, /Fields re-registration, renamed fields) and this file, then
`ops/SPRINT_GUIDELINES.md`, `ops/DESIGN.md`, CLAUDE.md. Work in the worktree
`C:\Users\Martice\bw-quote-tool-s29e` on branch `s29/dt-permission-per-owner` (from main
`7860c82d`; `node_modules` junctioned), from the worktree root. Never push. Never kill
processes you did not start; leave none running. Never sign in to production Firebase from
any script — fake store only; check route filters before any Playwright one-liner. Edit
`index.html` through Node scripts (CRLF, 12 MB).

## The ruling (operator, verbatim, 2026-09-08 — binding)

> "Permission of use would only be one per."

Asked which: **"One Permission of Use per owner"** — each living owner gets their own
filled copy of the page with the single template signature line and their own name in the
signer box. No side-by-side lines on that form.

"NO regressions to my wordings" still stands.

## Build

1. **Permission of Use: one copy per living signer** (`dtSigners()`), only when the
   Permission is in the document set and there are 2+ living signers. Each copy is the
   template's Permission page (p7 notary / p8 plain per the DocuSign toggle) filled for
   THAT owner: the signer boxes (`I_2`/`I_3`, `Name_4`/`Name_5`) carry that owner's name
   alone; the Address line that owner's own address if typed else the shared one; the
   Phone that owner's phone. The decedent/interred/new-owner fields are the same on every
   copy. Nothing is drawn on the Permission any more — remove its side-by-side split
   (`DT_SPLITS` permission entries and the calls) and its on-rule widget removal; at one
   signer the page is the pristine template as today. The heir-affiant case (owner
   deceased, `dtHeirAffiant` set) stays ONE copy signed by the heir, exactly as today.
2. **Assembly.** The copies sit contiguously where the single Permission sat (cover,
   Release, Loss, Permission×N, Heirs, Statement, Terms — keep today's order). Build each
   extra copy by loading the template again, filling for that owner, pruning to the one
   page (Track A's `dtBuildOnePacket` pattern: bake appearances BEFORE page removal, prune
   orphan fields by /Annots and /P, then `doc.pageCache.invalidate()`), then `copyPages`
   into the base document and re-register the copied widgets on the base AcroForm under
   renamed fields (`' po2'`, `' po3'` suffix — same-named AcroForm fields are one field and
   would share a value). Track A's report has this working code; Track A's commit
   `a93f8c33` has it in history (`git show a93f8c33:index.html`, functions
   `dtAppendCoOwnerCopies`/`dtFieldText`). Reuse, do not reinvent.
3. **Screen.** `dtDocList` notes "one per owner (×N)" on the Permission row only, and the
   page count on screen reflects it.
4. Save/restore unchanged.

## Verification (verbatim outputs)

- `npm run check` → `index.html: 8 blocks, 0 errors`.
- `npm test`: baseline on this worktree `4068 passed, 0 failed across 51 suites`,
  test-deed-transfer 382; report the after numbers (Permission split assertions go,
  per-owner copy assertions come).
- Assertions: 2 living signers + permission on → two Permission pages, contiguous, in
  signer order, each carrying only its own owner's name in the signer boxes, own
  phone/address, identical decedent/interred/new-owner text; total page count = the
  1-signer count + 1; nothing drawn on either copy (no drawn text, template widgets
  intact including the on-rule ones); 1 signer → one pristine page; owner deceased +
  heir affiant → one page signed by the heir; the copied fields are registered on the
  form under suffixed names and `getForm().getFields()` on the saved bytes returns them;
  the saved file re-opens with pdf-lib and PyMuPDF without dangling references
  (`mutool`-free: PyMuPDF `doc.xref_length()` walk, or open + render every page).
  Sabotage-proven red/green twice.
- Render 2-signer notary + DocuSign into `scratch/s29-g-renders/`; LOOK at both
  Permission copies and confirm the rest of the packet is byte-identical to Track F's
  render for the same case except the Permission pages.

Commit `[s29/dt-permission-per-owner]`, explicit paths, no AI trailers. Report to
`ops/sprints/sprint-29/TRACK-G-REPORT.md`.
