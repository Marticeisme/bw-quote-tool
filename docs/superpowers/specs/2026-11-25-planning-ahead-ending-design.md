# Planning Ahead: the end of the questions (design, 2026-11-25)

## Why

Martice: "once families come to the end of the questions it isn't very clear what the next step is and it
doesn't build a great guide."

What the presentation is (his words, 11/25): a **visual ice breaker** that gets families talking, and a way to
**make sure we're covering everything fully** so an FSD doesn't miss anything. Families only ever see it in an
appointment with a Bonney Watson FSD; they never get a link to it. After it, the appointment goes into detail:
quotes, a tour of the park, paperwork.

So the end of the questions is a **hand-off into the rest of the appointment**, not a take-home.

## Goals

- One clear end screen: everything in a complete plan, theirs highlighted, each piece marked as we talk it through.
- Every slice of the Circle of Protection gets talked about once, including the ones they didn't highlight.
- A "Did we miss anything?" screen (his ask) before the next steps.
- A clear "Here's what we'll do next" that leads into the tour and the quote.
- An FSD sheet: talking points per section, what families often miss, what to pull up next, and a short
  "About your family" fill-in.

## Non-goals

- No email, no PDFs, nothing families take home from this (their quote packet covers that). Revisit later.
- No prices. No links or website addresses on anything printed (bwquotetool.com is internal only).
- Nothing stored: marks live for the visit only, Start over clears them (same as the answers today).

## Anti-goals

- A second "here's your plan" screen in a row (two endings is the problem we're fixing).
- Anything that reads like a sales script on the TV.
- Talking points that state a fact the guides or his rulings don't support.

## Approaches considered

1. **Replace the results screen ("Here's what you highlighted") and the 14-guide walk-through with one plan
   screen.** One clear end. The results screen's plain words, faith and tradition and still-to-decide parts fold
   into it. **Picked** (my recommendation; he added the "Did we miss anything?" screen on top of it and didn't
   ask for the results screen to stay).
2. Keep the results screen and add the plan screen after it. Less change, but two plan screens back to back.
3. (Earlier in the conversation, dropped) Email the family a PDF bundle of guides. He reframed the presentation as
   an ice breaker for the appointment, so the take-home stays the quote packet.

## The design

### Flow after the last question

`last question` -> **Let's go over your plan** -> **Did we miss anything?** -> **Here's what we'll do next**

The top-bar Your plan / All guides / Back / Home keep working everywhere, and each screen has the on-screen Back.

### 1. "Let's go over your plan"

- Left: the Circle of Protection wheel (as today, two rings for couples / both parents).
- Right: a list of all eight sections, cemetery first (his appointments start with the cemetery):
  Cemetery property, Opening and closing, Vault, Memorial | Service, Personal touches, Casket or urn,
  Travel protection. Plus rows when they apply: Faith and tradition (if picked), Veterans (if yes),
  Who signs / their wishes (someone-else track).
- Each row: section name, what they highlighted in plain words (per person with initials for two people),
  or a dimmed "Not chosen" line.
- Each row has three marks: **Covered** · **Still thinking** · **Not for us**. One tap sets, a second tap clears.
- Tapping the row itself opens its guide on screen (the guide's Back returns to the list, marks intact).
- The wheel shows progress: a marked slice gets a check / fills in; "N of M talked through" over the list.
- When every row has a mark the primary button reads "Did we miss anything?"; before that it still works
  (never blocks the FSD) but the unmarked rows stay visibly unmarked.
- Rows the page already knows don't apply ("Not needed", e.g. a vault when the ashes go home; "Already taken
  care of" on the funeral-only track) show that line and count as handled without a tap (my call).
- The "Just looking at one thing" track keeps its own ending (See the whole plan); this flow starts if they go on.
- Rows marked Still thinking feed the existing "Still to decide" list.
- "Plan for someone else too" stays (keeps the first plan, as today).

### 2. "Did we miss anything?"

Big, calm, one headline and a few open prompts in his voice (first person, contractions, no em dashes):

- Is there anyone else in your family we should plan for while you're here?
- Does anyone else need to be part of these decisions?
- Is there anything about your faith, your culture or your family's way of doing things we haven't talked about?
- Have you been to a service you loved, or one you didn't? What stood out?
- What questions do you have for me?

Buttons: Back to the plan · Plan for someone else too · Here's what we'll do next (primary).
(Prompts are a draft for his edit. Wording follows the existing rules: never guess pronouns, never "separate plans".)

### 3. "Here's what we'll do next"

Built from their answers, three or four big numbered steps, no prices. Draft set:

1. **See it in person.** We'll walk out and look at the spaces you highlighted. (Owners: "We'll go see your
   family's place." Funeral-only track: dropped.)
2. **Put your plan in writing.** I'll put together the quote for everything we talked about, both sides
   together. (Never "separate plans".)
3. **Who decides.** Who signs, and who you want making decisions later. (Links the Who Decides guide on screen.)
4. **Make it official.** Sign today in person, or later through DocuSign.

Buttons: Back · Print my sheet (FSD) · Start over (smaller, still needs the second tap).
Replaces today's close screen ("Do you feel clear on what matters to you?"); its "tell your family where the
papers are kept" line moves into step 4.

### 4. The FSD sheet (print)

A print stylesheet that prints a sheet instead of the screen (letter, house look: navy band, logo, orange rule).

- Header: who the plan is for (names typed during the visit), date, what matters most, faith/tradition.
- One block per Circle section: their highlight and mark (Covered / Still thinking / Not for us), **talking
  points** (2-4 short lines), **often missed** (1 line), **pull up next** (the guide/catalog name to open in
  the detailed part).
- "About your family" fill-in: this plan is for; loved ones already resting here (pins from the map, printed in);
  who should know about this plan (name, phone x2); where the papers will be kept; notes. No SSNs, no bank info.
- Still to decide list.

Talking points are drafted from the existing guides and his recorded rulings only (e.g. vault: "resists water",
never "keeps water out"; 0% plans need ACH; cemetery prices locked when done ahead; ClearPoint doesn't lock prices).
He edits them. They're written so the family seeing them would be fine (see the print preview note below).

## Constraints and gotchas

- planning-ahead.html is CRLF; edit with node, never `sed -i`. Syntax check before any push. Push only on his word.
- Mirrored TV: Chrome's print preview shows on the TV for a moment. So the FSD sheet holds nothing the family
  shouldn't see (my call), and the button says "Print my sheet".
- Couples / both parents / someone-else tracks: per-person rows with initials, names or they/them, never a guessed
  pronoun.
- Tests that use the results screen (`goTo('yours')`, results.mjs, scenarios*.mjs, walk*.mjs) move to the new
  screen; the 170 checks stay green, plus new checks for marks, the missed screen, next steps and the print sheet.

## Left to the builder

Exact layout and type sizes on the TV, the wheel's "covered" look, row order within a side, print page breaks.

## Open for Martice

- Edit the "Did we miss anything?" prompts and the next-step wording.
- Review the drafted talking points before they go live.
