# Planning Ahead: opening tracks and appointment flow (design, 2026-11-17)

Page: `planning-ahead.html` (+ `planning-ahead-images/`), worktree `elegant-ramanujan-d1be89`, uncommitted.
Earlier design: `2026-11-11-planning-ahead-presentation-design.md` (still holds for everything not named here).

## Why

Martice uses this on screen, in person, at pre-need appointments. Today every family walks the same
line: Home, three why-plan screens, the wheel, up to 16 questions, results, every guide, close. Real
visits don't go that way. In his words, "every pre-need appointment is different": a parent, a couple,
a parent with adult children, someone on their own. He asked for presets picked by one opening
question, which he can skip when he already knows the answer, and for families who already own
property here to see "different screens entirely".

What real appointments look like (his notes, via the daily-ops session, 11-17):
- Most common: already owns property here and is finishing it (opening and closing, vault, marker,
  sometimes a second right). They're often surprised the space alone isn't everything, and that the
  funeral home and the cemetery are separate.
- Then: an adult child planning for a parent (often urgent); couples doing both sides; the funeral side
  only, with the cemetery settled; new property near a loved one already buried here (his top priority
  through 12/31); single people and niche shoppers. Completely new families are the least common.
- The cemetery usually comes first, then the funeral side (same day or a later visit).
- The tour happens only for the cemetery, after burial or cremation, possible places and where other
  loved ones rest have been talked through.

## Goals

1. Open on **"What brings you in today?"** with six answers (approved by him, 11-17). Each answer is a
   track: which screens show and in what order.
2. **"Have you done this before?"** sets how much gets explained, on any track.
3. Owners get their own screens: what they own fills in the Circle, then only what's still open.
4. Families with someone already here can point to them on the aerial map.
5. A tour pause that holds their place.
6. The results screen says what's still to decide, so the next conversation is clear.

## Non-goals

- At-need. ("Has the person already passed?" is his first question, but this tool is pre-need only.)
- Saving a visit between appointments. Still nothing saved, by design.
- Prices, PDFs, quotes. Still none.
- Looking up real burials or property records. The family pin is placed by hand and never stored.

## Anti-goals (it fails if...)

- The family feels sorted into a box. The track screen reads like a friendly question, not a form.
- An owner has to sit through "where would you like to rest?" for a place they already own.
- Switching tracks mid-visit loses answers.
- Anything drawn or AI-made stands in for cemetery property (BINDING: real photos or none; the lawn
  crypt cutaway is the one approved drawing).

## Constraints

- One HTML file, no build step, CRLF line endings (normalize after edits).
- His voice: first person, contractions, no em dashes, no paired adjectives, no marketing words.
- Never guess pronouns for "someone I love": their name or they/them.
- Existing tests (`planning-ahead-tests/`, 10 scripts, 80 checks) keep passing, updated where the
  opening changes.

## Approaches considered

1. **One presentation, each track an ordered list of screens. (Picked by Martice, 11-17.)** Questions,
   guides, wheel and results stay shared; a track decides which screens show and in what order; new
   screens slot into the same engine. A fix reaches every track.
2. Separate page per track. Most freedom, but six copies of the guides and questions that drift apart.
3. Keep today's single line and only hide screens. Smallest change, but can't reorder, so owners would
   still march through burial or cremation and choosing a place before the vault.

## The opening (decided)

Home → **Begin** → **"What brings you in today?"** (six photo cards, single choice) →
**"Have you done this before?"** (Yes / No) → the track.

| Card | Track id | What it covers |
|---|---|---|
| We already have a place here | `own` | Finishing your plan |
| Family is already resting here | `family` | A place near them |
| I'm planning for Mom or Dad | `parent` | Honoring their wishes |
| Just the funeral side | `funeral` | Cemetery already taken care of |
| Starting from scratch | `scratch` | Everything, explained |
| Just looking at one thing | `one` | One guide, then what goes with it |

- **When he already knows:** he taps the card himself before they sit down. Quieter shortcut: number
  keys **1 to 6** on Home jump straight into that track (then the done-before question).
- **"Have you done this before?"** No → the three why-plan screens play, and on the guide walk-through
  "How it works" opens by default. Yes → skip the why-plan screens; "How it works" stays closed. (Note:
  my 11-17 message to him had this backwards. This is the correct direction.)
- **Switching mid-visit:** a "Change what we're looking at" button in the top bar returns to the track
  screen. Every answer is kept; the new track resumes at its first screen not yet seen.
- The "Go straight to the questions" button on Home goes away (the tracks replace it). "See the park"
  and the guide library stay.

## The tracks (screen order)

Shared head for every track except `one`: [why-plan screens if new] → who (one / two / someone I love)
→ their-wishes questions (if someone I love) → what matters most → faith (if picked).

**Cemetery first, funeral second** on every track that has both, matching how his visits go. Between
the two halves, a short **bridge screen**: "That's the cemetery side. Now the funeral home side." with
one line that they're two separate pieces and can be planned on different days. (Answers the common
"is it one bill?" confusion without prices.)

- **`own` (finishing your plan):** *What do you already have here?* (new question; per person for
  couples; cards: a grave, a lawn crypt, a family estate, a crypt in a mausoleum, a glass-front niche,
  a granite niche, an urn garden spot) → burial or cremation (a grave can take an urn) → the marker or
  inscription (memorial question) → bridge → service, where, viewing, casket or urn, personal touches,
  keepsakes → military → travel. The Circle's property slice shows the owned place as **"Already
  yours"**; opening and closing, vault and memorial follow from it as "Still to arrange". The place
  question is never asked.
- **`family` (a place near them):** *Who's already here?* (new screen: the aerial map; tap to drop a pin
  and type a name like "Mom"; more than one pin allowed; skippable) → burial or cremation → where you
  rest (the map views in place guides show their pin) → **tour pause** → the marker → bridge → funeral
  questions → military → travel.
- **`parent` (honoring their wishes):** the who question is replaced by **"Mom, Dad, or both?"**
  (Martice, 11-18: both options). Each parent gets an optional name field. One parent works like
  today's "someone I love". **Both** is new: two people planned for in the third person, each with
  their own choices like a couple (the "Choosing for" switch, two-ring wheel), with wording such as
  "Where would your parents like to rest?" or their names, never guessed pronouns. Then the existing
  wishes / who signs / Medicaid screens (asked once, covering both), then the `scratch` order below.
  The "who signs" screen adds one line from BW's POA policy, pending his OK on the wording: bring
  the power of attorney paperwork and we'll have it reviewed (a medical or financial POA alone
  usually isn't enough).
- **`funeral` (just the funeral side):** burial or cremation → funeral questions → military → travel.
  Cemetery slices on the Circle show **"Already taken care of"**; no tour pause; cemetery guides left
  off the walk-through.
- **`scratch` (everything):** burial or cremation → where you rest → **tour pause** → the marker →
  bridge → funeral questions → military → travel.
- **`one` (one thing):** opens the guide library. After any guide, a row **"What goes with it"** shows
  2 to 4 related guides (e.g. glass niche → placing the urn, niche memorial, urns). From there,
  "See the whole plan" starts the `scratch` track with nothing lost.

## New screens and pieces

- **Track screen** and **done-before screen** (above).
- **What you already have** question (`own`), with the Circle and results showing "Already yours".
- **Family pin** screen on the aerial map (`family`): tap places a pin with an optional name; tap a pin
  to remove it. Pins show on every later map view. Never stored; Start over clears them.
- **Tour pause** ("Let's go see it"): the aerial map with their highlighted places (and family pins)
  marked, and one button, **"We're back"**, that continues to the next screen.
- **Bridge screen** between cemetery and funeral halves.
- **"Still to decide"** list on the results screen: every Circle slice not yet settled, plus for owners
  the pieces still to arrange. Plain list, no prices.

## Calls made after the builder check (mine, for Martice to correct)

1. **Owned places live in their own per-person field**, not in `place`. The "What do you already have
   here?" cards include **"Nothing yet"**; a person who picks it (e.g. one half of a couple) gets the
   normal place question. An owned grave plus cremation means an urn in the grave: urn vault and the
   urn opening and closing. An owned niche means placing the urn. A second right in a family grave is
   not modelled; he explains it in person.
2. **"Still to decide"** = every slice with nothing highlighted, plus any slice with more than one
   choice highlighted ("pick one of these"). Highlighting still means "show me", not "decided".
3. **Cemetery first applies everywhere**: question order, the results board (Cemetery column first),
   and the guide walk-through. The wheel's look doesn't change. Every track keeps today's frame: wheel
   intro after the shared head, results after the last question, the walk-through from results, then
   the close.
4. **Track switching:** anything a family actually said (who, names, owned places, highlights) is kept.
   Anything a track implies ("Already taken care of" on the funeral track) is worked out from the
   current track, so it disappears when the track changes. An owned place keeps showing "Already
   yours" on any track.
5. **`one` track:** opening a guide doesn't highlight anything. Each guide there has a "Add this to the
   plan" button that highlights its matching card, and "See the whole plan" carries those over. The
   "What goes with it" row shows only on the `one` track and in the library.

## Left to the builder

- Data shape for tracks (e.g. a `TRACKS` table of question order) and where the owned place lives in
  state, as long as the existing per-person couple logic keeps working.
- The photos for the six track cards and the done-before screen, from the approved photo pool only.
- Exact copy, in his voice, for the new screens; he reviews it on the screenshots.
- "What goes with it" pairings, from the existing guide links.
- Test updates: existing scripts enter through a track; new checks per track (screen order, owner
  slices, pin, tour pause, switching keeps answers, keys 1 to 6).
