# Milestone 3 Changes Report

**Agent:** `worker_m3_1`  
**Date:** 2026-10-10  
**Milestone:** Milestone 3 (Controls, Live Upgrade Drawer & Ship Visual Tiers)

---

## Summary of File Modifications

### 1. `index.html`
- **Line 145:** Initialized `#upgrade-side-panel` with class `upgrade-side-drawer closed` instead of `open`. This guarantees mobile devices default to closed drawer mode while allowing desktop script to open on stage start.

### 2. `src/styles/main.css`
- **Lines 302–315:** Added `#game-hud` to `.hud-layer` and updated `z-index` from 15 to 35 (higher than `.upgrade-side-drawer` at `z-index: 30`). Ensures `#btn-toggle-upgrade-panel` remains clickable at all times on mobile.
- **Lines 965–976:** In `@media (max-width: 768px)`, positioned mobile drawer below `#game-hud` at `top: 52px; height: calc(100% - 52px);` with `backdrop-filter: blur(4px)` and semi-translucent background `rgba(14, 18, 36, 0.94)`. This guarantees that `#btn-toggle-upgrade-panel` (in HUD) and `#btn-minimize-upgrade` (in drawer header) occupy non-overlapping vertical space, eliminating click interception.

### 3. `src/main.ts`
- **Lines 158, 163:** Added `if (this.gameEngine) this.gameEngine.updateProfile(updated);` to both `difficultyModal` and `hangarModal` callbacks, immediately synchronizing equipped ship tier and difficulty parameters with the running engine.
- **Lines 209–213:** In `launchStage()`, explicitly added `.closed` when `window.innerWidth < 768` (and removed `.closed` when `>= 768`), ensuring the drawer defaults to closed on mobile viewports so players have an unobstructed view of the combat arena.
- **Lines 371–380:** Added `pointerdown` alongside `click` handlers with `e.preventDefault()` on `.lane-btn [1]–[5]` for instant touch responsiveness on mobile.
- **Lines 441–475:** Implemented keyboard input disambiguation:
  - Physical numpad (`e.code.startsWith('Numpad')`): always inputs digits into `currentInput`, never switching lanes.
  - Top-row numbers (`Digit1`–`Digit5`):
    - If `currentInput !== ''`: appends digit to `currentInput`.
    - If `currentInput === ''`: if the digit matches the active lane (`selectedLane + 1`), appends to `currentInput` rather than switching lanes!
    - If the digit matches a different lane, switches directly to that lane.
  - Arrow keys (`ArrowLeft`, `ArrowRight`) and `A` / `D` smoothly steer lanes with boundary clamping `[0, 4]`.

### 4. `src/engine/GameEngine.ts`
- **Lines 84–105:**
  - Added `getEquippedTier(shipId?: string)` mapping ship IDs to tiers 1–4.
  - Added `updateProfile(newProfile: PlayerProfile)` to update state, math settings, and ship tier in real time.
  - In `startStage()`, initialized `inStageUpgradeTier` based on `this.profile.equippedShipId` and set `upgradesRequiredForNextTier` accordingly.

### 5. `src/engine/SpriteGenerator.ts`
- **Lines 315–430:** Polished procedural pixel-art sprites for player ships:
  - Tier 1: Starter Scout (white fuselage, cyan canopy, red wingtips).
  - Tier 2: Dual-Wing Hunter (extended swept wings with wingtip blasters).
  - Tier 3: Plasma Cruiser (heavy twin-engine nacelles with cyan glow `shadowBlur: 8`).
  - Tier 4: Neon Flagship (radiant cyan energy blade wings `shadowBlur: 12` + golden core `shadowBlur: 8`).
  - Clamped input tier to `[1, 4]` range for complete robustness.

### 6. `src/ui/HangarModal.ts`
- **Lines 1–2:** Added `.ts` extension and type-only import for `PlayerProfile` for Node ESM compatibility.
- **Lines 15–18:** Standardized ship tier names in `SHOP_ITEMS`:
  - Tier 1: Starter Scout
  - Tier 2: Dual-Wing Hunter
  - Tier 3: Plasma Cruiser (replaced "Crimson Vanguard")
  - Tier 4: Neon Flagship

### 7. `tests/milestone3ControlsAndVisuals.test.ts`
- Created comprehensive test suite with 13 automated tests verifying:
  - HangarModal tier naming consistency and SpriteGenerator T1–T4 sprite generation & tier clamping.
  - GameEngine equipped tier mapping and real-time profile synchronization.
  - 5-lane targeting and smooth steering boundaries.
  - Keyboard disambiguation (numpad vs top-row digit vs active lane).
  - Live upgrade drawer non-pausing operation and continuous alien descent.
  - Mobile drawer closed state contracts.

### 8. `package.json`
- **Line 10:** Updated `"test"` script to run `tests/mathEngine.test.ts`, `tests/sectorBoss.test.ts`, and `tests/milestone3ControlsAndVisuals.test.ts`.

### 9. `test_qc.js` & `test_mobile_qc.js`
- Enhanced desktop Playwright QC test (`test_qc.js`) to assert keyboard input disambiguation, Arrow/A/D steering, and zero desktop horizontal overflow (`scrollWidth === clientWidth`).
- Enhanced mobile Playwright QC test (`test_mobile_qc.js`) to verify mobile drawer default closed state, toggle button opening, minimize button closing, mobile lane button targeting, numpad typing, and zero mobile horizontal overflow (414x896).

### 10. `README.md`
- Updated per the mandatory user rule, documenting responsive 5-lane controls, keyboard input disambiguation, mobile drawer fix, live upgrade drawer, and ship visual tiers.

---

## Verification Results
- `npm test`: Passed (54 tests passed across 3 test suites, 0 failures).
- `npm run build`: Passed (0 TypeScript errors, 0 Vite errors, completed in 279ms).
- `node test_qc.js`: Passed (Desktop 1280x800 audit fully green).
- `node test_mobile_qc.js`: Passed (Mobile 414x896 audit fully green).
