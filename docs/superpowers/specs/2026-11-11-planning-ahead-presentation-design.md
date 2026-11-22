# Planning Ahead with Bonney Watson: interactive presentation (design)

Approved by Martice 2026-11-11 ("Approved but there may be a lot of changes as I see what you're building").

## Purpose
A screen presentation Martice walks families through in person during pre-need appointments.
It explains everything Bonney Watson does, funeral side and cemetery side, visually, so the
family understands their choices. It replaces the Cairn "AP Dashboard" slideshow as the
family-facing piece, keeping that deck's useful features (Home always one tap away, jump
anywhere, the Circle of Protection wheel) and adding real depth.

## Out of scope
- Prices, quotes, contract figures. (This is understanding, not quoting.)
- PDF download / print output. Screen only.
- At-need. A separate at-need cemetery guide comes later; Martice does not do at-need funerals.
- Saving answers anywhere. Answers live only for the visit; "Start over" clears them.
- Any change to index.html (the quote tool) or the contract generators.

## Overall theme (hold this through every change)
- Pictures tell the story. One headline per screen; long text only behind "Go deeper".
- Real photos over drawings. Drawings only for what a photo can't show, and realistic.
- Bonney Watson specific: our two funeral homes, Washington Memorial Park, our gardens and buildings by name.
- Honest and calm: no pressure, nothing pre-selected, "Not sure yet" always allowed.
- Martice's voice: first person, contractions, no em dashes, no invented details or promises.
- Legal wording exact: vaults "resist water" (16 CFR 453.3(e)(2)); embalming not required by law;
  the vault requirement is the cemetery's rule, not state law.

## Structure
1. **Why plan ahead** (3 screens, skippable): your wishes become the plan (RCW 68.50.160: signed
   pre-arrangements can't be canceled or substantially revised by survivors); 100+ decisions made
   calmly now; since 1868 / Washington Memorial Park.
2. **Picture questionnaire**, one question per screen, big photo cards, no default, "Not sure yet"
   opens a side-by-side comparison:
   1. Burial, cremation, or terramation
   2. Just me, or the two of us
   3. Service (varies by Q1)
   4. Placement at Washington Memorial Park (varies by Q1)
   5. Memorial (marker / niche front / crypt front)
   6. Veteran
   7. Travel away from home (Inman)
3. **Circle of Protection wheel**, always available: funeral slices (orange) Service, Casket/Urn,
   Travel Protection; cemetery slices (navy) Property, Opening & Closing, Vault, Memorial. Slices
   fill as questions are answered; tapping a slice opens its guide.
4. **Your Guide**: the guides matching the answers, in order. Every guide has three layers:
   full-screen photo + headline; "How it works" visual; details and common questions.
5. **Close**: clarity check ("Do you feel clear on what matters to you?") and "tell your family
   where the plan and papers are kept".

## Navigation
Home, Wheel, Back, Library (every guide) always reachable. Arrow keys / presenter clicker.
Full screen (F). Works on TV, laptop, tablet.

## Technical shape
- One standalone page `planning-ahead.html` at the repo root like the other guides, with its
  photos in `planning-ahead-images/`.
- Questions and guides are data objects in the page, so adding a question or a guide is adding
  an entry, not rebuilding screens.
- No Firebase, no storage writes, no quote-tool code.
- Content sources: existing *-guide.html pages, research notes (side-session notes folder,
  planning-ahead-research/), bonneywatson.com photos, BW photos from the AP Dashboard slideshow,
  repo image folders, D:\Property Cards photo folders (never card scans: they carry PII).

## Stages
1. Frame: home, questionnaire engine, wheel, navigation, look; one complete path
   (cremation → glass-front niche) to judge the feel.
2. The remaining paths and guides, one at a time, with Martice's feedback.

## Verification
Playwright screenshots at TV (1920x1080) and tablet sizes; click through every question and
the wheel; console free of errors. Syntax check before any push.
