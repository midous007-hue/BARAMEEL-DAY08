# BARAMEEL WORLD — LOGIC MASTER

## 1. World hierarchy

BARAMEEL WORLD is the brand-level hub, not a synonym for BARAMEEL RUN.

RUN, DUO LINK, MENU, POST and MY BARAMEEL are separate experiences sharing one Player ID.

## 2. BARAMEEL RUN — MASTER FLOW

After the player chooses an avatar and confirms, BARAMEEL RUN splits into **two independent gameplay paths**.

The paths do not merge into one screen-to-screen sequence. They only converge at the player's shared server-side progression data.

### 2.1 Entry point

`Choose avatar → Confirm → MY RUN`

**MY RUN** is the player dashboard and the explicit branch point.

It must make both paths visible and understandable before the player enters either one.

### 2.2 PATH A — COLLECTION HUNT

Purpose: collect and complete the BARAMEEL collection.

`MY RUN → COLLECTION → BARAMEEL UNIVERSAL QR → server reward → collection piece / configured reward → collection progress`

This path covers:

- collection pieces;
- the approved printed / packaging-linked collection experience;
- the Universal BARAMEEL QR;
- server-selected collection rewards;
- collection progress;
- the receipt as a later physical purchase/reward bridge.

The Collection path is **not** the city movement path and does not contain the checkpoint route.

### 2.3 PATH B — CHECKPOINT RUN

Purpose: move through the city and earn points through valid checkpoints.

`MY RUN → CHECKPOINT RUN → LIVE ROUTE MAP → move → checkpoint → checkpoint QR scan → server validation → points → next checkpoint → ... → BARAMEEL FINAL ZONE`

This path covers:

- the live route/map;
- movement toward BARAMEEL;
- discoverable checkpoints;
- checkpoint QR scans;
- server-side checkpoint validation;
- points earned from valid checkpoint activity.

The Checkpoint path is **not** the collection-piece path and does not use the collection reward flow.

### 2.4 Shared player progression

The two paths remain separate at the experience layer.

They converge only in shared player data:

`COLLECTION PATH POINTS + CHECKPOINT PATH POINTS → ONE PLAYER POINT BALANCE`

The shared progression can drive:

- total points;
- weekly points;
- rank;
- eligibility for Marks;
- other server-defined player progression.

The player does not need to understand the backend model; the UI must simply show that both paths contribute to the same progress. The selected avatar is visual identity only; it has no gameplay stats or class behavior.

## 3. BARAMEEL VISIT AND RECEIPT REWARD LAYER

The receipt is **not a third gameplay path** and is not part of the Checkpoint route.

It is the physical purchase bridge that activates after the player reaches the appropriate BARAMEEL stage.

Conceptually:

`PLAY → COLLECT / MOVE → SHARED PLAYER PROGRESS → BARAMEEL VISIT → PURCHASE → RECEIPT CODE → server validation → physical / bonus reward`

The receipt code can award a configured outcome such as:

- points multiplier / points bonus;
- free fries;
- free drink;
- free ice cream;
- a larger configured reward;
- the future Grand Prize.

The reward outcome is server-defined and should not be hard-coded as one fixed reward type in the UI.

Receipt codes are one-time server-controlled inputs and must be validated and consumed atomically.

## 4. Final Barameel redemption

The final BARAMEEL interaction is the bridge from digital participation to physical redemption.

The intended meaning is:

`DIGITAL ENGAGEMENT → BARAMEEL VISIT → FINAL BARAMEEL CODE / REDEMPTION → ACTUAL REWARD CLAIM`

The final BARAMEEL code is distinct from:

- the Universal BARAMEEL QR used for the Collection path;
- checkpoint QR codes used by the Checkpoint path;
- the receipt code used for purchase-linked rewards.

Each code type must have a distinct purpose and clear UI language.

## 5. Universal QR

The printed BARAMEEL QR is universal. It is not a piece ID.

A production Collection scan requires a valid server-side scan ticket. The server consumes the ticket atomically before resolving a reward.

The reward can be:

- a missing collection piece;
- a duplicate with a defined duplicate value;
- points/bonus;
- a configured reward/voucher.

Weighted reward configuration is server-side and can be changed without reprinting the QR.

## 6. Checkpoint rules

Checkpoint discovery and validation are a separate server-controlled system.

A valid checkpoint scan must:

- identify the checkpoint;
- validate the player/session;
- prevent repeated farming of the same checkpoint;
- award the server-defined points;
- update the player's checkpoint/progress state.

The UI must never imply a successful checkpoint reward before the server confirms it.

## 7. Cross-device identity

The player ID is the persistent identity. LocalStorage is only a cache. Points, pieces, rewards, tickets, checkpoint progress and Duo Link results must be stored server-side.

## 8. Duo Link

Duo Link is not dating and is not a public chat system.

`Player A scans Player B code → server normalizes pair → checks pair history → creates one result → reward`

The same pair cannot repeatedly farm new results.

## 9. BARAMEEL POST

Post is a physical/social communication feature:

`choose postcard → recipient details → Barameel contacts recipient → recipient is told a Barameel post arrived → recipient receives a Barameel reward/voucher`

It is not a news feed and not an events page.

## 10. Product / business objective

Until the player reaches the physical BARAMEEL redemption stage, the RUN primarily serves engagement, collection, competition, movement and brand connection.

The final BARAMEEL purchase / code / redemption layer is what converts that digital participation into a physical visit and reward claim.

## 11. Locked UX principle

The UI must always answer:

1. Where am I?
2. Which path am I currently playing?
3. What do I earn here?
4. What is the next action?
5. Where does this path end?
6. What shared progress comes from it?
7. What is different about the final BARAMEEL redemption stage?

No screen should send the player to another path without explicitly explaining why.

## 12. Screen architecture impact

The screen plan must follow the master split:

**Entry / branch point**
- Nickname entry screen: player enters the persistent display name.
- Screen 02: AVATAR SELECTION.
- Screen 03: REMOVED from the live flow.
- Screen 04: MY RUN dashboard / branch selector.

**Collection path**
- Screen 05: Universal BARAMEEL QR / collection scan entry.
- Screen 06: Collection / ALEXANDRIA puzzle and collection progress.
- Collection reward / piece-reveal screens remain inside this path.

**Checkpoint path**
- Route Map: movement layer.
- Checkpoint Scanner: checkpoint QR validation.
- Checkpoint Found / reward state: checkpoint confirmation and points.
- Repeatable route/checkpoint loop.
- Final Zone / BARAMEEL finish.

**Physical purchase / redemption layer**
- Receipt Code.
- Receipt Verification.
- BARAMEEL Box / reveal.
- BARAMEEL Drop.
- Reward confirmation.
- Final completion / onward progression.

Leaderboard and Marks remain downstream shared progression surfaces, not substitutes for either gameplay path.

## 13. Current production blockers

The route/checkpoint system still requires production destination coordinates, a production checkpoint dataset/schema, and server-side checkpoint validation before it can be considered production-ready.

The Universal QR system and receipt reward flow must be protected with server-side validation, idempotency and one-time consumption.

