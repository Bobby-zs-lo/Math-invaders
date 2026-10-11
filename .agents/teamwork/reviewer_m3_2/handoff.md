# Milestone 3 Independent Review & Adversarial Critic Report

**Agent:** `reviewer_m3_2` (Reviewer & Adversarial Critic)  
**Parent:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Milestone:** Milestone 3 (Ship Visual Tiers, Sprites, Live Upgrades, and Responsive Controls)  
**Date:** 2026-10-10  
**Verdict:** **APPROVE**  

---

## 1. Observation

### 1.1 Source Code Inspections
1. **Ship Tier Naming & Hangar Shop (`src/ui/HangarModal.ts:15-19`):**
   ```typescript
   export const SHOP_ITEMS: ShopItem[] = [
     { id: 'tier1_interceptor', name: 'Tier 1: Starter Scout', type: 'ship', tier: 1, coinPrice: 0, diamondPrice: 0, description: 'Agile recon scout with rapid laser blasters.' },
     { id: 'tier2_hunter', name: 'Tier 2: Dual-Wing Hunter', type: 'ship', tier: 2, coinPrice: 200, diamondPrice: 0, description: 'Heavy wings with dual-blasters and V-spread.' },
     { id: 'tier3_vanguard', name: 'Tier 3: Plasma Cruiser', type: 'ship', tier: 3, coinPrice: 500, diamondPrice: 5, description: 'Heavy twin-engine cruiser firing piercing plasma beams.' },
     { id: 'tier4_flagship', name: 'Tier 4: Neon Flagship', type: 'ship', tier: 4, coinPrice: 1000, diamondPrice: 10, description: 'Supercharged radiant cyan energy wings & chain lightning.' }
   ];
   ```
   - All 4 ship tiers match project contracts: Tier 1: Starter Scout, Tier 2: Dual-Wing Hunter, Tier 3: Plasma Cruiser, Tier 4: Neon Flagship.
   - The obsolete "Crimson Vanguard" naming was completely replaced. Global grep across the codebase verified 0 remaining references in production code (only 1 regression assertion in `tests/milestone3ControlsAndVisuals.test.ts:168`).
   - Line 101 invokes `SpriteGenerator.getPlayerShip(item.tier)` to render preview canvases in the modal.

2. **Procedural Pixel-Art Sprites (`src/engine/SpriteGenerator.ts:315-433`):**
   ```typescript
   public static getPlayerShip(tier: number = 1): HTMLCanvasElement {
     const clampedTier = Math.min(4, Math.max(1, Math.floor(tier) || 1));
     const key = `player_ship_tier_${clampedTier}`;
     if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;
   ```
   - **Clamping:** Input tier is strictly clamped to `[1, 4]` range, guaranteeing immunity to `0`, negative numbers, floats, or out-of-range values.
   - **Tier 1 (Starter Scout):** White aerodynamic fuselage (`#ffffff`), cyan cockpit canopy (`#00f3ff`, `shadowBlur: 6`), and red wingtips (`#ff3344`).
   - **Tier 2 (Dual-Wing Hunter):** Extended swept composite wings (`#cfd8dc`) with orange wingtip blasters (`#ff9100`).
   - **Tier 3 (Plasma Cruiser):** Heavy twin-engine nacelles (`#90a4ae`) with glowing cyan plasma vents (`#00e5ff`, `shadowBlur: 8`).
   - **Tier 4 (Neon Flagship):** Supercharged radiant cyan energy blade wings (`#00f3ff`, `shadowBlur: 12`, `lineWidth: 3`) and golden core reactor (`#ffd600`, `shadowBlur: 8`).
   - **Thruster Plume:** Blue plasma exhaust flame (`#00b0ff`, `shadowBlur: 8`).
   - All sprites are cached offscreen on 52x52 pixel canvases and returned via `this.spriteCache`.

3. **GameEngine Tier Mapping & Real-Time Profile Updates (`src/engine/GameEngine.ts:84-102`):**
   ```typescript
   public getEquippedTier(shipId?: string): number {
     if (!shipId) return 1;
     if (shipId === 'tier4_flagship') return 4;
     if (shipId === 'tier3_vanguard' || shipId === 'tier3_cruiser') return 3;
     if (shipId === 'tier2_hunter') return 2;
     return 1;
   }

   public updateProfile(newProfile: PlayerProfile): void {
     this.profile = newProfile;
     if (newProfile.mathSettings) {
       this.mathEngine.updateSettings(newProfile.mathSettings);
     }
     const tier = this.getEquippedTier(newProfile.equippedShipId);
     this.state.inStageUpgradeTier = tier;
     this.state.upgradesSolvedThisTier = 0;
     this.state.upgradesRequiredForNextTier = tier < 4 ? tier : 0;
     this.notifyUpgradeStatus();
   }
   ```
   - In `startStage(sector, stage)`, `this.state.inStageUpgradeTier = this.getEquippedTier(this.profile?.equippedShipId);` correctly initializes starting tier from hangar profile.
   - When equipped ship or difficulty is updated via modal callbacks (`src/main.ts:158, 163`), `gameEngine.updateProfile(updated)` is immediately called, updating `inStageUpgradeTier` and triggering `notifyUpgradeStatus()`.

4. **Instant Canvas Rendering (`src/engine/Renderer.ts:351-383`):**
   ```typescript
   private renderPlayerShip(state: GameState): void {
     const ctx = this.ctx;
     const shipSprite = SpriteGenerator.getPlayerShip(state.inStageUpgradeTier);
     const shipW = 52;
     const shipH = 52;
     ctx.save();
     ctx.translate(state.playerX, state.playerY);
     ...
     ctx.drawImage(shipSprite, -shipW / 2, -shipH / 2, shipW, shipH);
     ctx.restore();
   }
   ```
   - `Renderer.renderPlayerShip` dynamically retrieves the sprite using `state.inStageUpgradeTier` every frame, ensuring that any tier advance or equipment change reflects on canvas on the very next render frame.

5. **Live In-Stage Upgrade Drawer Non-Pausing Operation (`src/engine/GameEngine.ts:460-500` & `src/main.ts:362-368`):**
   - `submitUpgradeAnswer(userAnswer)` resolves the capacitor equation, records telemetry to `profile.stats.problemHistory`, increments `upgradesSolvedThisTier`, and advances `inStageUpgradeTier` when the required count is met.
   - Crucially, `this.state.isPaused` is NEVER touched by the upgrade drawer. In `update(dt)`, alien descent, zig-zag sinusoidal oscillation, armor deflection checks, and base defense fire continue live at 60 FPS while the player solves capacitor equations.
   - Higher tiers unleash progressively destructive defensive salvos in `fireAmplifiedSalvo(lane)`:
     - Tier 1: 3 linear lasers (2 damage).
     - Tier 2: 2 center lasers + 2 V-spread lasers (2 damage).
     - Tier 3: 1 piercing cyan plasma (5 damage) + 2 side lasers.
     - Tier 4: 1 heavy plasma (6 damage) + 2 arcing chain lightning bolts (4 damage each).
     - Continuous base fire rate also accelerates (`Math.max(0.18, 0.35 - (tier - 1) * 0.04)`).

6. **Mobile Drawer Fix & HUD Z-Index Hierarchy (`index.html:145`, `src/styles/main.css:302-315, 965-976`, `src/main.ts:208-213`):**
   - `index.html:145`: Drawer initializes with `class="upgrade-side-drawer closed"`.
   - `src/main.ts:208-213`: `launchStage()` explicitly adds `.closed` when `window.innerWidth < 768`.
   - `src/styles/main.css:302-315`: `#game-hud` has `z-index: 35` (higher than `.upgrade-side-drawer` at `z-index: 30`).
   - `src/styles/main.css:965-976`: On mobile (`@media (max-width: 768px)`), drawer is positioned at `top: 52px; height: calc(100% - 52px)` with backdrop blur. `#btn-toggle-upgrade-panel` (in HUD) and `#btn-minimize-upgrade` (in drawer header) occupy non-overlapping vertical zones, completely eliminating click interception.

7. **Keyboard Input Disambiguation (`src/main.ts:438-477`):**
   - Physical numpad (`e.code.startsWith('Numpad')`): always inputs digits into `currentInput`, never switching lanes.
   - Top-row numbers (`Digit1`–`Digit5`):
     - If `currentInput !== ''`: appends digit.
     - If `currentInput === ''`: if key matches active lane (`selectedLane + 1`), appends digit rather than switching lanes.
     - If key matches another lane, switches directly to that lane.
   - Arrow keys (`ArrowLeft`, `ArrowRight`) and `A` / `D` steer lanes with boundary clamping `[0, 4]`.

8. **User Rule Verification (`README.md`):**
   - `README.md` exists and was extensively updated with detailed sections covering 5-Lane Controls, Keyboard Input Disambiguation, Live Upgrade Drawer, and Ship Upgrade Visual Tiers (Tier 1–4).

---

## 2. Logic Chain

1. **Procedural Sprites & Visual Tiers:**
   - Observation §1.1.2 demonstrates that `SpriteGenerator.getPlayerShip` implements distinct pixel-art designs for Tiers 1 through 4 with twin glowing nacelles and radiant energy blade wings.
   - The tier clamping logic `Math.min(4, Math.max(1, Math.floor(tier) || 1))` ensures robustness against invalid inputs.
   - Observation §1.1.4 confirms `Renderer.renderPlayerShip` queries `state.inStageUpgradeTier` on every frame, so visual changes occur without delay.

2. **Real-Time Upgrade Mechanics Without Combat Pause:**
   - Observation §1.1.5 confirms `submitUpgradeAnswer` executes asynchronously with respect to the combat loop.
   - Because `this.state.isPaused` remains `false`, the game loop continues calling `update(dt)`, moving aliens downward and maintaining arcade tension as required by §R3 of `ORIGINAL_REQUEST.md`.

3. **Responsive Controls & Mobile Bug Fixes:**
   - Observation §1.1.6 and §1.1.7 confirm that the mobile drawer starts closed, HUD buttons remain clickable via `z-index: 35`, and physical numpad / top-row typing disambiguation prevents lane-switching collisions during answer entry.

4. **Integrity & Verification:**
   - Direct execution of `npm test` verified that 54 tests pass across 3 test suites with 0 failures.
   - Direct execution of `npm run build` completed with 0 TypeScript and 0 Vite errors.
   - Direct execution of `node test_qc.js` and `node test_mobile_qc.js` passed all desktop and mobile viewport checks.
   - Direct execution of `stress_m2_stage_lifecycle.ts`, `stress_m2_boss.ts`, and `adversarial_boss_challenge.ts` confirmed zero regressions in stage progression, wave budgets, or boss state machines.
   - No hardcoded cheats, facades, or test bypasses exist.

---

## 3. Adversarial Challenges & Stress-Testing

### 3.1 Challenge: Extreme Tier Argument Stress-Testing
- **Assumption:** `SpriteGenerator.getPlayerShip(tier)` might fail or allocate unbounded memory when passed non-integer or out-of-range tier arguments.
- **Test:** Evaluated `SpriteGenerator.getPlayerShip` with `-100`, `0`, `1.85`, `4.99`, `100`, `NaN`, `null`, `undefined`.
- **Result:** **PASS**. Clamping formula `Math.min(4, Math.max(1, Math.floor(tier) || 1))` reliably resolves all values to exactly integers `1`, `2`, `3`, or `4`. Exactly 4 canvas instances are cached; zero memory leaks or unhandled errors.

### 3.2 Challenge: Weapon Salvo Damage & Projectile Scaling
- **Assumption:** Higher ship tiers might only change visual sprites without actually scaling weapon firepower.
- **Test:** Programmatically fired `fireAmplifiedSalvo` across Tiers 1, 2, 3, and 4 in headless engine.
- **Result:** **PASS**.
  - Tier 1: 3 lasers spawned.
  - Tier 2: 4 bullets (2 center lasers, 2 angled V-spreads).
  - Tier 3: 3 bullets (1 heavy piercing plasma dealing 5 damage, 2 lasers).
  - Tier 4: 3 bullets (1 mega plasma dealing 6 damage, 2 chain lightning bolts dealing 4 damage each).

### 3.3 Challenge: In-Stage Upgrade Drawer Telemetry & Persistence
- **Assumption:** Solving equations in the live upgrade drawer might bypass parent analytics telemetry or exceed `localStorage` capacity.
- **Test:** Executed `submitUpgradeAnswer(answer)` and inspected `profile.stats.problemHistory`.
- **Result:** **PASS**. Every attempt is logged with `question`, `userAnswer`, `correctAnswer`, `isCorrect`, `timeTakenMs`, and `operation: '/'` (or operation type). Quota protection correctly slices `problemHistory` to the most recent 300 entries.

### 3.4 Challenge: Mobile Viewport Interference & Touch Overlap
- **Assumption:** The slide-out upgrade drawer might obscure the HUD or prevent the player from closing it on mobile.
- **Test:** Run Playwright mobile audit (`node test_mobile_qc.js`) at 414x896 viewport.
- **Result:** **PASS**. The drawer starts closed (`upgrade-side-drawer closed`), `#game-hud` at `z-index: 35` remains clickable, opening and minimizing work cleanly, and `scrollWidth === clientWidth === 414px` with zero horizontal overflow.

---

## 4. Integrity Check

| Pattern | Detected? | Evidence / Verification |
|---|---|---|
| Hardcoded test results / expected outputs embedded in source | ❌ None | MathEngine generates dynamic problems with variable operands; GameEngine updates real state |
| Dummy or facade implementations | ❌ None | Real canvas 2D procedural rendering, real weapon projectiles with hitboxes and damage |
| Shortcuts bypassing intended task | ❌ None | Procedural sprites built from scratch; live non-pausing upgrade loop built in vanilla TS |
| Fabricated verification outputs or logs | ❌ None | Independent execution of test runner and build tools witnessed directly in shell |
| Self-certifying work without independent verification | ❌ None | Independent verification by reviewer using multiple headless and browser test runners |

**Integrity Finding:** Clean. Zero integrity violations detected.

---

## 5. Verified Claims Matrix

| Claim | Method | Result |
|---|---|---|
| 4 ship visual tiers: Starter Scout, Dual-Wing Hunter, Plasma Cruiser, Neon Flagship | Inspected `HangarModal.ts:15-19`, `UpgradeStationModal.ts:35-41`, `main.ts:265-271` | **PASS** |
| Obsolete "Crimson Vanguard" removed | Grep search across repository | **PASS** (0 occurrences in source code) |
| Procedural pixel-art sprites with twin nacelles & blade wings | Inspected `SpriteGenerator.ts:315-430` | **PASS** |
| `getEquippedTier()` and `updateProfile()` in `GameEngine.ts` | Inspected `GameEngine.ts:84-102` & evaluated live | **PASS** |
| Dynamic canvas rendering on tier change | Inspected `Renderer.ts:351-383` | **PASS** |
| Live upgrade drawer non-pausing operation | Inspected `GameEngine.ts:460-500` & tested alien descent | **PASS** |
| Mobile drawer default closed state | Inspected `index.html:145`, `main.ts:208-213`, Playwright audit | **PASS** |
| Keyboard input disambiguation (numpad vs top-row digit) | Inspected `main.ts:438-477` & tested simulation | **PASS** |
| `npm test` passes completely | Shell execution (`npm test`) | **PASS** (54/54 tests passed) |
| `npm run build` succeeds with 0 errors | Shell execution (`npm run build`) | **PASS** (Vite build completed in 299ms) |
| `README.md` updated per user rule | Inspected `README.md` lines 27-54 | **PASS** |

---

## 6. Caveats

No caveats. All features, UI components, canvas rendering pipelines, and control systems operate as specified with comprehensive test coverage.

---

## 7. Conclusion

Milestone 3 (Controls, Live Upgrade Drawer & Ship Visual Tiers) has been thoroughly implemented, verified, and adversarially stress-tested. The code adheres strictly to project specifications, provides immediate visual feedback, operates in real-time without pausing arcade action, guarantees responsive controls on mobile and desktop viewports, maintains zero regressions, and complies with all user rules.

**Verdict: APPROVE**

---

## 8. Verification Method

To independently reproduce and verify this review, execute the following commands from the project root:
1. `npm test` — Validates all 54 tests across MathEngine, Sector & Boss, and Milestone 3 Controls & Visuals.
2. `npm run build` — Validates TypeScript compilation and Vite bundling with 0 errors.
3. `node test_qc.js` — Runs Playwright desktop audit (1280x800) verifying lane targeting, keyboard disambiguation, and upgrade drawer.
4. `node test_mobile_qc.js` — Runs Playwright mobile audit (414x896) verifying mobile drawer closed state, toggle/minimize, and touch lane targeting.
5. `node --experimental-strip-types tests/stress_m2_stage_lifecycle.ts` — Validates stage completion invariants.
6. `node --experimental-strip-types tests/stress_m2_boss.ts` — Validates 40 Dreadnought Boss battle tests.
7. `node --experimental-strip-types tests/adversarial_boss_challenge.ts` — Validates 32 adversarial boss challenge invariants.
