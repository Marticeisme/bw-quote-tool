# Guides Voice Review Debrief — For Claude Code

**Site:** https://marticeisme.github.io/bw-quote-tool/guides.html
**Reviewed by:** Martice Morrison (via Cowork session, August 2026)
**Scope:** All interactive HTML guides on the BW Quote Tool site EXCEPT the General Price List (GPL stays as-is)

---

## Martice's Voice Rules (reference: /home/claude/martice-writing-voice.md)

These guides are shown directly to families. The tone should sound like Martice sitting across from someone at a table explaining things in plain language.

- Warm, direct, genuine, conversational
- Uses contractions naturally (I've, I'll, I'm, don't, we'll, that's)
- Short sentences, plain language
- Explains WHY things exist, not just what they cost
- Breaks down industry terms in plain English
- NEVER uses "Dear" in any context
- NEVER uses em dashes
- NEVER uses the word "inventory" (Martice says it "sounds bad")
- No corporate jargon, no marketing buzzwords, no brochure copy
- No overly formal or stiff language
- Uses "family service director" not "counselor"
- Title: "Family Service & Advanced Planning Director"

---

## Global Find-and-Replace Issues

These appear across many guides and should be fixed everywhere at once.

### 1. Remove ALL em dashes

Em dashes appear in 12 of 15 guides reviewed. The most common source is the recurring "additional charges" boilerplate paragraph that appears in at least 7 niche/columbarium guides:

> "They are straightforward, and they differ by location and by what you choose — call or email me and I will put the exact figures in writing for you, with no obligation."

Replace the em dash with a period and a new sentence, or restructure with a comma. Example fix:

> "They are straightforward, and they differ by location and by what you choose. Call or email me and I will put the exact figures in writing for you, with no obligation."

Search every guide HTML file for em dashes and replace them all.

### 2. Replace ALL uses of the word "inventory"

"Inventory" appears in at least 8 guides. It sounds like warehouse language, not family-facing language. Replace with context-appropriate alternatives:

- "new inventory" → "all new" or "brand new" or "recently added"
- "This is new inventory" → "Everything here is brand new" or "These are all new"
- "not inventory" → "not available for purchase" or "not currently offered"
- "inventory data" → "availability data" or "current pricing and availability"
- "Real inventory, not a waiting list" → "Available now, not a waiting list"

Specific locations:
- **Granite Niches Guide** (granite-niches-guide.html): "Everything here is new inventory" and footer "price and inventory data"
- **Glass-Front Niches Guide** (glass-front-niches-guide.html): "145 openings, all new inventory" and "This island is new inventory"
- **Rock of Ages Guide** (roac-guide.html): "Real inventory, not a waiting list" and "They are not inventory and cannot be quoted"
- **Eternal Light Guide** (ecl-guide.html): "This is a finished columbarium in an established building rather than new inventory"
- **Garden of Meditation Guide** (gomn-guide.html): "this is an established garden rather than new inventory"
- **Mountain View (MVC) Guide** (mvc-niches-guide.html): "This island is new inventory"

### 3. Replace "counselor" with first-person references

Found in:
- **Urn Placement Options Guide** (urn-placement-guide.html): "Your counselor can walk you through each location"
- **Direct Cremation Plan Guide** (direct-cremation.html): "Ask your counselor for a personalized quote"

Change to first-person references matching the rest of the guides ("I'm happy to walk you through each location" or "Reach out to me for a quote").

### 4. Kill "deeply personal decision"

Appears in at least 2 guides. Martice never says this. Replace with plain language like "There is no single right answer" or just cut it.

### 5. Cut stacked adjectives

"Dignified, straightforward option" / "beautiful, lasting memorials" / "permanent, secure, and elegant alternative." Martice picks one word, not two or three.

### 6. Use contractions more consistently

The guides use them sometimes but not as consistently as Martice does. "It is" → "It's", "You are" → "You're", "We will" → "We'll" throughout.

---

## Guide-by-Guide Assessment

### TIER 1: Need Full Rewrites (4 guides)

These guides do not sound like Martice at all. They read like manufacturer brochures, marketing copy, or corporate policy documents.

---

#### 1. Burial Vault Guide (vault-guide.html)

**Problem:** Reads like copy from the Wilbert vault manufacturer dropped in with minimal editing. Every product description is in marketing-brochure voice.

**Examples of bad language:**
- "A burial vault is a lined and sealed outer receptacle that houses the casket" → "outer receptacle" is clinical jargon
- "engineered to protect the casket from the weight of the earth" → corporate
- "The pinnacle of burial vault craftsmanship" → pure marketing
- "unmatched protection and enduring beauty" → pure marketing
- "A mid-range option that balances quality construction with value" → product-catalog language
- "An elegant reinforced concrete vault with a warm marbled finish" → marketing
- "Durable and dignified, the Continental offers reliable protection at an accessible price point" → "accessible price point" is corporate jargon
- "Our most selected burial vault" → "most selected" is marketing-speak
- "A dependable choice trusted by many families" → marketing tagline
- "Honoring those who served, the Veteran Triune features a distinguished navy blue exterior with patriotic accents" → brochure copy
- "triple-layer protection" / "maximum protection" / "engineered for long-term durability" → corporate

**How to fix:** Rewrite every product description in plain language. Tell families what the vault is made of, what it does, and how much it costs. No marketing adjectives, no "engineered," no "pinnacle," no "unmatched." Example:

Before: "The pinnacle of burial vault craftsmanship. Unmatched protection and enduring beauty."
After: "This is their top-of-the-line vault. It's triple-reinforced and comes with a polished granite cover."

The distinction between a vault and an outer burial container should also be explained more plainly.

---

#### 2. Urn Placement Options Guide (urn-placement-guide.html)

**Problem:** Reads like a marketing brochure from start to finish. Uses "counselor" instead of Martice's actual title or first-person references.

**Examples of bad language:**
- "A dignified above-ground resting place for cremated remains" → marketing heading
- "Columbariums offer a permanent, secure, and elegant alternative to scattering or in-ground burial" → brochure copy
- "A serene outdoor garden with curved columbarium walls surrounded by mature landscaping. One of the park's most visited and established areas" → marketing copy
- "A striking natural-stone columbarium built into the hillside, offering a distinctive and sheltered setting with panoramic views of the park" → marketing copy
- "Quiet, reflective atmosphere" → marketing bullet
- "A modern columbarium offering both indoor and outdoor niche options, with views of the Cascade foothills. One of our most popular locations for companion placements" → brochure copy
- "An elegant indoor columbarium featuring glass-front niches, allowing families to see the urn and any keepsakes placed inside" → marketing
- "Warm, inviting lighting" and "Year-round visitation comfort" → marketing bullets
- "An affordable option for families who value simplicity and community" → marketing/sales
- "Lock in today's pricing and relieve your family of difficult decisions later" → sales pitch
- "Pre-Planning Available" / "Beautiful Settings" / "Permanent & Secure" → marketing headlines
- "Your counselor can walk you through each location" → uses "counselor"

**How to fix:** Rewrite in Martice's voice. Describe each location plainly: where it is in the park, what it looks like, what a niche costs, who tends to choose it. Drop all the marketing headlines and sales language. Replace "counselor" with first-person references.

---

#### 3. Scattering Garden Options Guide (scattering-guide.html)

**Problem:** Reads like marketing copy. Flowery and sentimental in a way that doesn't match Martice's voice. The phrase "for generations to come" appears three times in different variations.

**Examples of bad language:**
- "A sacred final resting place with permanent memorialization" → "permanent memorialization" is industry jargon
- "a beautifully maintained, consecrated space where your loved one's cremated remains are lovingly returned to the earth" → flowery. "Consecrated" is a religious claim. "Lovingly returned to the earth" is sentimental marketing
- "a lasting tribute families can visit, grieve at, and find comfort in for generations to come" → marketing, and appears multiple times
- "Families deserve a permanent destination for remembrance" → sales language
- "professionally maintained, landscaped, and preserved in perpetuity" → corporate
- "providing families with certified documentation and peace of mind" → "peace of mind" is a sales cliche

**How to fix:** Strip the flowery language. Describe each scattering garden plainly: where it is, what it costs, what the memorial looks like, what families can expect. Martice would say something like: "The remains are scattered in the garden, and your loved one's name is engraved on a granite memorial so the family always has a place to visit."

---

#### 4. Outside Marker Installation Rules & Pricing (outside-marker-rules.html)

**Problem:** Reads like a corporate policy memo written by a compliance department, not a family guide.

**Examples of bad language:**
- "Bonney Watson memorialization products are designed specifically for the park and remain the preferred option for ease of process, cost efficiency, and long-term consistency" → corporate boilerplate. "Ease of process, cost efficiency, and long-term consistency" is jargon
- "Families may choose to use an outside vendor; however, additional coordination, compliance, and processing fees will apply" → corporate/legal tone
- "All memorial installations within the park must be performed by Bonney Watson's approved installation provider. Outside vendors are not permitted to perform installations on cemetery grounds" → legal notice
- "No discounts are applied to 3rd party memorialization fees" → stiff
- "Full payment is required before any work begins" → policy-document
- "Administrative Processing — Document processing, vendor coordination, and record keeping" → corporate jargon
- "Inspection & Design Review — Required review of all memorial proofs for compliance with cemetery standards" → corporate
- "All required documentation, approvals, and full payment must be received before the memorial will be scheduled for installation" → corporate/legal
- "Sign the Hold Harmless Agreement, cemetery contract, and submit full payment for all applicable fees" → legal/policy

**How to fix:** Rewrite as a guide, not a policy document. Communicate the same rules but in Martice's voice. Example:

Before: "Families may choose to use an outside vendor; however, additional coordination, compliance, and processing fees will apply."
After: "You're welcome to purchase a marker from another provider. There are a few additional fees that come with that, and I want to make sure you know about them upfront."

The fee structure (install + 50% inspection + $250 admin) should be explained more plainly, including why the inspection fee exists.

---

### TIER 2: Need Moderate Fixes (2 guides)

---

#### 5. Direct Cremation Plan Guide (direct-cremation.html)

**Issues:**
- Em dashes: "Direct cremation — sometimes called simple cremation — is a dignified, straightforward option..."
- Marketing language: "Our most straightforward cremation option — dignified, simple, and complete"
- "caring for your loved one with respect and professionalism" → brochure copy
- "cremated in a timely manner" → "in a timely manner" is corporate-speak
- "the urn of your choosing" → stiff
- "Ask your counselor for a personalized quote" → "counselor" inconsistency + "personalized quote" is sales-speak
- "Our most affordable container option" → marketing
- "This is a sample quote for reference only. Actual pricing may vary based on individual circumstances" → corporate disclaimer

**How to fix:** Keep the itemized quote structure (that's great). Rewrite the surrounding copy in Martice's voice. Drop the marketing phrases and replace "counselor."

---

#### 6. Urn Gardens Guide (urn-gardens-guide.html)

**Issues:**
- Opening sentence is stiff and clinical: "An urn garden is a type of memorial garden that is specifically designed to accommodate the placement of urns containing the cremated remains of loved ones"

**How to fix:** Rewrite the opening to something like: "An urn garden is a garden built for urns instead of caskets. Your loved one's urn is buried in the ground and marked the same way any other grave would be."

The rest of the guide is fine.

---

### TIER 3: Minor Targeted Fixes Only (9+ guides)

These guides are in Martice's voice and just need the global fixes above (em dashes, "inventory," etc.).

**Gold standard guides (no issues):**
- **Pre-Planning Guide** (pre-planning-guide.html)
- **Who Decides Guide** (who-decides-guide.html)
- **Cemetery Property Guide** (cemetery-property-guide.html)
- **Cremation or Burial Guide** (cremation-or-burial-guide.html)
- **Burial Guide** (burial-guide.html)
- **Cremation Guide** (cremation-guide.html)
- **Veterans Guide** (veterans-guide.html)
- **Medicaid Family Guide** (medicaid-family-guide.html)
- **Granite Marker Guide** (markers-guide.html)

**Need em dash fixes only:**
- **Terramation Guide** (terramation-guide.html): Several em dashes

**Need "inventory" + em dash fixes:**
- **Granite Niches Guide** (granite-niches-guide.html): "inventory" x2, em dashes in boilerplate
- **Glass-Front Niches Guide** (glass-front-niches-guide.html): "inventory" x2, em dashes
- **Rock of Ages Guide** (roac-guide.html): "inventory" x2, em dash in boilerplate
- **Eternal Light Guide** (ecl-guide.html): "inventory" x1, em dash in boilerplate
- **Garden of Meditation Guide** (gomn-guide.html): "inventory" x1, em dashes x2
- **Mountain View (MVC) Guide** (mvc-niches-guide.html): "inventory" x1, em dashes x2

**Need boilerplate personalization fix:**
- **Terrace Garden Guide** (terrace-garden-guide.html): Boilerplate says "call or email to receive" instead of "call or email me and I will put" (should match the other guides)

---

## Guides NOT Reviewed / Out of Scope

- **General Price List** (GPL) — Martice said this stays as-is
- **Medicaid Professional Reference** (medicaid-professional-reference.html) — Professional/internal reference, not family-facing in the same way
- **PCM Design Catalog** (pcm-design-catalog.html) — Product catalog, appropriate as-is
- **Metal Caskets / Wood Caskets / All Caskets** — Product catalogs, appropriate as-is
- **Urn Catalog / Keepsake Urn Catalog** — Product catalogs, appropriate as-is
- **Cremation Containers & Rental Caskets** — Product catalog, appropriate as-is
- **Interactive Niche Maps** — Maps, not prose guides
- **Vital Information Worksheet** — Form, not a prose guide
- **Deed Transfer Letter / Payment Options Letter / Follow-Up Emails** — Tools, not guides

---

## Voice Reference: What "Right" Sounds Like

The Medicaid Family Guide, Who Decides Guide, Cremation or Burial Guide, Cemetery Property Guide, and Veterans Guide are the gold standard. When rewriting the problem guides, use those as the model for tone. Key patterns:

- Opens with what the family actually needs to know, not a marketing headline
- Uses "we" and "us" and "I" naturally
- Explains legal or technical things by saying what they mean in practice
- Doesn't sell. Informs. The family decides.
- Doesn't use adjectives to dress things up ("elegant," "distinguished," "serene," "dignified"). Just describes what something is.
- Short paragraphs, plain sentences, contractions
- When in doubt, ask: "Would Martice say this to a family sitting across from him?" If it sounds like a pamphlet, rewrite it.

---

## Priority Order for Implementation

1. Global find-and-replace: em dashes, "inventory," "counselor"
2. Full rewrites: Vault Guide, Urn Placement Options, Scattering Garden, Outside Marker Rules
3. Moderate fixes: Direct Cremation Plan, Urn Gardens opening
4. Minor fixes: Terrace Garden boilerplate personalization, remaining em dashes in individual guides
