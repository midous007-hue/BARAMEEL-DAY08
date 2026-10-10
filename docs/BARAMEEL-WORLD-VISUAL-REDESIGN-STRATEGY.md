# BARAMEEL WORLD — Visual Redesign Strategy
## Reference document for the post-core-logic redesign

**Status:** Approved direction / future work  
**When to execute:** Only after the core game logic, navigation, data flows, checkpoint validation, rewards, and Supabase integration are complete and stable.  
**Working branch:** `clean-development`  
**Scope:** Visual design, screen hierarchy, artwork direction, sound/interaction presentation, and brand/product integration. This document does not authorize changing established game rules or backend behavior.

---

## 1. The goal

Elevate BARAMEEL WORLD from a visually busy, sometimes AI-generated-looking arcade experience into a mature, distinctive, desirable youth-culture world that feels unmistakably like Barameel.

Keep the 1970s identity, arcade energy, Alexandria setting, and collectible spirit. Reduce unnecessary visual noise, clarify the hierarchy of actions, make the food and real Barameel experience integral to the world, and preserve Bruna as the central character and visual icon.

The goal is **not** to make the game plain, corporate, minimalist, or generic. It should remain expressive, colorful, tactile, and playful—but controlled, intentional, and mature.

## 2. Non-negotiable brand and character rules

### Bruna — the central Barameel character

Bruna is not a replaceable mascot or a decorative sticker. She is the primary heroine and a recognizable part of Barameel's identity. Her presence, silhouette, attitude, and distinctive styling must remain consistent across the world.

Preserve these character rules in every redesign:

- Keep her recognizable face, signature silhouette, and established appearance. Do not redesign her into a generic AI-generated character.
- Her signature 1970s look includes her distinctive Afro hairstyle, reflective round/disco sunglasses, confident streetwear/leather-jacket attitude, flared trousers, and peace-sign necklace where appropriate to the approved reference artwork.
- **She does not smile or laugh.**
- **She does not look directly at the camera.** Her gaze is directed into the scene, toward a destination, an object, or off-frame.
- Her posture and expression communicate self-respect, confidence, independence, and pride in her own worth.
- She feels mature and self-possessed even when depicted as young. Never infantilize her, make her cutesy, or use exaggerated childlike facial expressions.
- Use her with intention: a strong side-facing or three-quarter pose, partial/lateral placement, or a confident action pose. Avoid repeatedly placing her front-and-center as a product-selling mascot.
- She should guide and enrich the experience without covering essential navigation, buttons, map information, or gameplay content.
- Preserve continuity between screens: proportions, hair, glasses, clothing language, attitude, and gaze direction should not drift from one asset to another.

**Bruna test:** If the character could be swapped for a generic cartoon girl without changing the screen's identity, the design has failed. If she looks cute, cheerful, directly at the viewer, or younger than her intended attitude, it has failed.

## 3. Visual direction: mature 1970s, not old-fashioned and not childish

### Keep
- Deep Barameel navy, warm cream, signature red, golden yellow, and cyan/teal.
- Strong 1970s editorial and street-culture references: bold typography, screen-print character, vintage comic energy, tactile print texture, and arcade cues.
- Alexandria as a real place and source of atmosphere.
- Confident, high-contrast compositions and memorable visual moments.
- The collectible/card culture and the tactile feeling of exploring a city.

### Reduce or remove
- Excessive distressed edges, scratches, grain, glow, bevels, shadows, stickers, badges, and decorative marks all competing in the same screen.
- Repeated use of every brand color at full intensity in one composition.
- Over-detailed backgrounds that compete with the title, product, instructions, or main action.
- Decorative icons and labels that do not help a player understand what to do.
- Generic AI-looking imagery: inconsistent anatomy, meaningless micro-details, over-rendered surfaces, random text-like marks, excessive visual polish, and objects that have no functional role.
- Childlike symbols, toy-like controls, exaggerated cute expressions, and juvenile visual metaphors.
- Visual effects that make every button look equally important.

### Composition rule
Each screen gets:
1. **One visual hero** — a product, Bruna, the map, the current achievement, or another clear focal point.
2. **One primary message** — short enough to understand quickly.
3. **One primary action** — visually dominant and unambiguous.
4. Secondary information with quieter contrast and less decoration.

Use texture selectively. The artwork may carry the vintage surface, but dynamic text, navigation controls, and interactive areas must remain legible and uncluttered.

## 4. Food and the real Barameel experience must be part of the world

Barameel is a food brand, not only a game universe. The experience must make players understand what Barameel sells, what makes it desirable, and why visiting the place is worthwhile—without turning every screen into an advertisement.

### Product visual direction
- Use strong, appetizing, consistent food photography or deliberately art-directed product imagery.
- Feature the real product categories that matter: signature sandwiches, golden fries, and ice cream, along with other confirmed menu items.
- Prefer one large, craveable hero product in a suitable moment over many tiny product images in a crowded screen.
- Maintain consistent lighting, angle, color grading, scale, and image quality across the menu and rewards experience.
- Do not invent menu items, prices, availability, or rewards. Product data and availability must come from the approved menu/business logic.

### Where food should appear
- **First impression / entry:** establish that Barameel is a real food destination, using one strong product image or an intentional product cue.
- **Discovery and collection:** introduce products as part of the Barameel world, not as unrelated banners.
- **Rewards and Marks wallet:** make the reward tangible through clear product imagery, confirmed redemption requirements, and a legible next action.
- **Visit to Barameel:** make the physical location feel like the culmination of the journey.
- **Community and return visits:** show the social, collectible, and discovery culture around the brand without overloading every screen with food.

Food should be a recurring, purposeful presence—not forced onto every screen. The player should remain immersed in the game while gradually understanding the brand and wanting to experience it in real life.

## 5. Color, typography, buttons, and hierarchy

### Color
Keep the established Barameel palette:
- Deep navy: main environment and visual anchor.
- Warm cream: readable text surfaces and breathing room.
- Signature red: selected high-priority alerts/actions or brand accents.
- Golden yellow: reward, discovery, and primary action accents.
- Cyan/teal: navigation or supporting information where useful.

Do not use every color at maximum intensity in the same area. Assign colors a role per screen.

### Typography
- Use bold, confident display lettering for major titles.
- Use a highly legible, consistent text style for instructions, live values, and navigation.
- Avoid multiple competing display fonts in one screen.
- Keep dynamic data visually integrated into the artwork rather than looking pasted on top.
- Do not place essential text over noisy imagery.

### Interaction hierarchy
- One clear primary action per screen.
- Secondary actions are visibly secondary.
- Keep button placement and behavior consistent wherever possible.
- Do not invent visual buttons or overlapping hit areas that confuse the actual interaction.
- Artwork remains the visual foundation; HTML should provide only the dynamic content and precisely aligned transparent hit areas when appropriate.
- Preserve existing screen order, artwork proportions, dynamic-data placeholders, QR flows, and navigation logic unless a separate logic change is explicitly approved.

## 6. Screen-by-screen redesign order

This is a visual work plan, not permission to begin before core logic is complete.

1. **Entry / first QR experience:** immediately communicate Barameel, its food, and the next step.
2. **MY RUN / Stage briefing / compass:** strong, mature adventure identity; clear mission, map action, and start action.
3. **Live route map / checkpoint discovery:** make current position, direction, distance, and next action readable; keep Bruna helpful but never obstructive.
4. **Collection Hunt:** premium collectible presentation, consistent card framing, clear discovery state, less visual clutter.
5. **Wallet / Marks / rewards / product selection:** food-led reward presentation; clearly show balance, eligibility, product, and confirmation.
6. **Leaderboard / Duo Link / social features:** mature competition and community, with rank and progress as the focus.
7. **Menu / Post / MY BARAMEEL / supporting screens:** unify them under the same system and reinforce the brand without duplicating information.

## 7. Recommended workflow

### Phase A — Finish and verify core logic first
Do not begin the broad visual redesign until the essential game flow and backend behavior are stable, including:
- Player identity and persistence.
- Checkpoint QR validation and GPS handling.
- Points and collection rules.
- Wallet and atomic Points-to-Marks conversion.
- Redemption validation and product-claim flow.
- Leaderboard rules and reset behavior.
- Navigation, QR entry, and cross-screen transitions.
- Supabase integration and production security requirements.

Test the complete player journey on real devices before freezing the logic baseline.

### Phase B — Audit all screens
For each screen, record:
- Its single purpose.
- Its visual hero.
- Its primary action.
- Confusing or redundant details.
- Bruna's role, pose, gaze, and placement if present.
- Product/brand connection.
- Dynamic data, QR, GPS, and hit-area dependencies.
- Accessibility and mobile legibility concerns.

### Phase C — Approve a small visual system
Define palette roles, typography, spacing, button hierarchy, image art direction, texture limits, Bruna consistency rules, and product-photo treatment before redrawing screens.

### Phase D — Create three reference screens
Redesign and review:
1. First entry / initial impression.
2. MY RUN / Stage briefing.
3. Wallet / product rewards.

These three establish the entry impression, gameplay clarity, and commercial connection. Do not roll out a new style to every screen until these references are approved.

### Phase E — Roll out in controlled batches
Apply the approved system screen group by screen group. Work only on `clean-development`; preserve a known-good state and review each batch before proceeding.

### Phase F — Validate with players
Test with the same broad age range and observe behavior rather than asking only whether the art looks good:
- Can they identify the main action immediately?
- Can they explain the next step without help?
- Can they distinguish Collection Hunt from Checkpoint Run?
- Do they remember that Barameel sells food and which products stood out?
- Do they understand what Marks/rewards mean?
- Does Bruna feel distinctive, confident, and mature rather than childish?
- Does the world feel retro and youthful without feeling old-fashioned or visually noisy?

Record confusion points and revise the design system before scaling.

## 8. Acceptance checklist for every redesigned screen

- [ ] One clear visual hero.
- [ ] One short primary message.
- [ ] One obvious primary action.
- [ ] Secondary controls do not compete with the primary action.
- [ ] Color is expressive but not noisy.
- [ ] Text and live values are legible on a phone.
- [ ] No unnecessary AI-like micro-detail or decorative clutter.
- [ ] Barameel's real food/brand world is present where it serves the screen's purpose.
- [ ] Bruna, when present, follows every character rule in Section 2.
- [ ] Dynamic fields remain placeholders until populated by real data.
- [ ] Existing navigation, hit areas, QR behavior, and backend logic remain intact.
- [ ] The screen has been checked on a real mobile device.

## 9. Decision boundary

This document governs the **future visual redesign**. It does not authorize:
- Changing core game rules for visual reasons.
- Changing points, Marks, checkpoint, leaderboard, or redemption logic as part of a design pass.
- Replacing Bruna's established identity.
- Redrawing or moving controls without verifying their hit areas and interactions.
- Replacing functional product data with invented examples.
- Starting the comprehensive redesign before the core logic is complete and tested.

When the core logic is finished, return to this document, perform the screen audit, approve the three reference screens, and then proceed in batches.

---

**Guiding principle:**  
**A mature, unmistakable Barameel world: 1970s energy, Alexandria soul, food worth discovering, a game worth returning to, and Bruna—confident, iconic, and never childish—at its heart.**
