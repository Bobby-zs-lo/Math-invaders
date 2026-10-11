# Milestone 3 Handoff Report

**Agent:** `worker_m3_1`  
**Milestone:** Milestone 3 (Controls, Live Upgrade Drawer & Ship Visual Tiers)  
**Parent:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Date:** 2026-10-10  

---

## 1. Observation
- In `index.html:145`, `#upgrade-side-panel` was previously defined with `class="upgrade-side-drawer open"`, causing it to default to open even on mobile viewports.
- In `src/main.ts:207-210`, `launchStage()` only removed `.closed` if `window.innerWidth >= 768`, but never added `.closed` when `< 768`.
- In `src/styles/main.css:302-314`, `.hud-layer` had `z-index: 15` while `.upgrade-side-drawer` had `z-index: 30`, which caused the drawer on mobile to obscure `.hud-right` and block `#btn-toggle-upgrade-panel`. Furthermore, when open at `top: 0`, the drawer header overlapped the HUD.
- In `src/main.ts:440`, number keys `1`–`5` switched lanes whenever `currentInput === ''`, preventing players from entering answers starting with digits 1–5 from the standard number row.
- In `src/ui/HangarModal.ts:15-18`, Tier 1 was named "Starter Interceptor" and Tier 3 was named "Crimson Vanguard", inconsistent with `UpgradeStationModal.ts` and `GameEngine.ts` which use "Starter Scout" and "Plasma Cruiser".
- In `src/engine/GameEngine.ts`, `inStageUpgradeTier` was always initialized to `1`, without reflecting the hangar-equipped ship (`profile.equippedShipId`).
- `npm test`, `npm run build`, `node test_qc.js`, and `node test_mobile_qc.js` are all configured and passing.

---

## 2. Logic Chain
1. **Mobile Drawer Default Open State Fix:**
   - Setting `class="upgrade-side-drawer closed"` in `index.html:145` and adding `this.upgradeSidePanel.classList.add('closed')` when `window.innerWidth < 768` in `src/main.ts:212` ensures that mobile screens start with the combat arena completely unobstructed.
   - Assigning `#game-hud` with `z-index: 35` and positioning the mobile drawer at `top: 52px; height: calc(100% - 52px)` in `src/styles/main.css:965-976` ensures both `#btn-toggle-upgrade-panel` (in HUD) and `#btn-minimize-upgrade` (in drawer header) occupy non-overlapping vertical zones, eliminating click interception.
2. **Keyboard Input Disambiguation:**
   - Physical numpad events (`e.code.startsWith('Numpad')`) are always routed directly into `currentInput`.
   - Top-row numeric keys (`Digit1`–`Digit5`): if `currentInput !== ''`, digits append to the input; if `currentInput === ''`, if the key matches `selectedLane + 1` (the currently active lane), it appends the digit rather than switching lanes; if it's a different lane, it switches lanes.
   - Smooth lane navigation via Arrow keys and `A` / `D` was preserved with bounds clamping `[0, 4]`.
3. **Responsive 5-Lane Controls:**
   - Added `pointerdown` and `click` listeners to `.lane-btn [1]–[5]` with `e.preventDefault()`, eliminating mobile 300ms click delay.
   - Maintained instant lane targeting via canvas click and `.lane-click-col` columns.
4. **Ship Visual Tiers (Tier 1–4) & Naming:**
   - Updated `SHOP_ITEMS` in `src/ui/HangarModal.ts`: Tier 1: Starter Scout, Tier 2: Dual-Wing Hunter, Tier 3: Plasma Cruiser (fixing "Crimson Vanguard"), Tier 4: Neon Flagship.
   - Polished procedural sprites in `src/engine/SpriteGenerator.ts`: Tier 1 (white fuselage, cyan canopy, red wingtips), Tier 2 (extended swept wings with wingtip blasters), Tier 3 (heavy twin-engine nacelles with cyan glow `shadowBlur: 8`), Tier 4 (radiant cyan energy blade wings `shadowBlur: 12` + golden core `shadowBlur: 8`). Added tier clamping `[1, 4]`.
   - Added `getEquippedTier()` and `updateProfile()` to `GameEngine.ts`, ensuring equipped ships from the Hangar update `inStageUpgradeTier` and canvas rendering immediately.
5. **Live Upgrade Drawer Non-Pausing Operation:**
   - Verified that solving equations in the upgrade drawer advances weapon tiers from Tier 1 to Tier 4 in real time while alien descent, march rhythm, and laser firing continue live.
6. **Documentation Compliance:**
   - Updated `README.md` per the mandatory user rule, documenting responsive 5-lane controls, keyboard input disambiguation, mobile drawer fix, live upgrade drawer, and ship visual tiers.

---

## 3. Caveats
- No caveats. All changes follow the minimal change principle, preserve existing functionality, and pass all automated verification suites.

---

## 4. Conclusion
Milestone 3 is complete, fully tested, and verified:
- Mobile drawer starts closed by default and toggles cleanly without blocking HUD controls.
- Keyboard input disambiguation distinguishes numpad and active lane digits from lane-switching shortcuts.
- 5-lane targeting operates responsively via bottom buttons, canvas clicks, and arrow/A/D steering.
- Ship upgrade tiers 1–4 are consistently named across all UI components and visually updated on canvas.
- Live upgrade drawer operates without pausing combat.
- `README.md` is updated per user rule.

---

## 5. Verification Method
Execute the following verification commands from the project root:
1. `npm test`
   - Runs `tests/mathEngine.test.ts`, `tests/sectorBoss.test.ts`, and `tests/milestone3ControlsAndVisuals.test.ts`.
   - Expected: 54/54 tests passing.
2. `npm run build`
   - Expected: Clean TypeScript compilation and Vite build with 0 errors.
3. `node test_qc.js`
   - Expected: Desktop 1280x800 audit passes, verifying canvas sizing, lane targeting, keyboard disambiguation, and drawer visibility.
4. `node test_mobile_qc.js`
   - Expected: Mobile 414x896 audit passes, verifying drawer default closed state, toggle/minimize actions, mobile lane buttons, numpad entry, and zero horizontal overflow.
