# Sprint 15 — PCM catalog: photos off the plates, compare simplified

**Opened 2026-08-04.** Operator round, mid-conversation rulings (verbatim intent):

1. **Remove all photographs from the PCM design plates** ("the photos do not look good
   at all when enhanced with AI... best they are removed entirely"), replace with the
   Bonney Watson logo "or anything you think is best" — replacement judgment delegated.
   Reference screenshot: an AI-upscaled plate whose inset ceramic portrait photo (a
   child's face) came back visibly mangled. Class = continuous-tone photographic insets
   ONLY; etched/laser portraits are engravings and STAY.
2. **Side-by-Side compare mode removed entirely; Plates view stays** as the only compare
   view (operator first asked for bigger photos / 2×2 / no book-group-granite rows, then
   saw Plates already does that and ruled "just remove the side by side entirely and
   keep the plates").
3. **Real Examples pruned 35 → 28** (operator picked cards, then generalized "these
   shouldn't be under the examples" at the Classic Gray swatch): the two WMP photos he
   flagged (marker-058.jpg Mahogany sandblasted, marker-138.jpg Samoan laser portrait)
   plus ALL FIVE "Granite Marker Guide"-sourced entries (F1066 product shot,
   companion-marker sideways, diamond-etching detail, ceramic-steel-portrait product
   shot, classic-gray swatch) — guide assets, not installed examples. marker-images/
   files stay on disk (the Granite Marker Guide uses them); the two pcm-example-images
   files are deleted with their entries. Director's read of "these" = the guide-sourced
   class; flagged reversible in the report.

## Tracks

- **A `s15/pcm-photo-mask`** (Opus, worktree): item 1. Brief: TRACK-A-pcm-photo-mask.md.
- **Director-direct (lean-mode)**: items 2 + 3 in the main tree — generator +
  verify_pcm_catalog + tests, rebuild, combined verify pass.

## Merge order

Director-direct work commits first on main; Track A merges --no-ff after audit.
No push — push is the operator's word, not pre-authorized.

## Gates

- verify_pcm_upscale + test-pcm-upscale extended with the masked-plate registry (both
  directions), sabotage-proven; verify_pcm_catalog re-run served-tree-pinned on merged
  main; npm suite green; syntax check before any commit touching index.html (not
  expected to be touched).
- Contract number will move (compare-mode asserts change + photo count 35→32 +
  masked-set asserts); update DESIGN §5 / guidelines at close.
