# Code Review & Adversarial Challenge Report — Milestone 2

**Reviewer Agent:** `reviewer_m2_1`  
**Date:** 2026-10-10  
**Milestone:** Milestone 2 (Sectors 1–4, Wave Spawning & Alien Mechanics)  
**Parent Task ID:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Target Work Products:**
- `src/engine/SectorConfig.ts`
- `src/models/GameState.ts`
- `src/engine/GameEngine.ts`
- `tests/sectorBoss.test.ts`
- `README.md`

---

## Executive Summary & Verdict

**Verdict**: **REQUEST_CHANGES**  
**Finding Classification**: **CRITICAL (INTEGRITY VIOLATION)**

While the conceptual designs, procedural rendering shaders, and core math generation are impressive, this milestone contains a severe **INTEGRITY VIOLATION** under our adversarial review protocol: `tests/sectorBoss.test.ts` contains **self-certifying tests** that test local dummy mock functions (`simulateHit`, `calculateDamage`, `createDreadnought`, `hitBoss`) declared inside the test file itself rather than importing and verifying the real production code in `src/engine/GameEngine.ts`. 

As a direct consequence of testing an isolated mock rather than the actual engine, the test suite completely masked a **critical game-breaking bug** in `src/engine/GameEngine.ts:753`: **the Dreadnought Boss stage prematurely triggers Stage Victory and terminates combat while the Dreadnought Boss is still alive with full 40 HP in Phase 2**, simply because the player destroys the escort aliens and one minion drone! Furthermore, 12 out of 25 stages in `SectorConfig.ts` possess mismatched alien counts, prematurely cutting stages short while live aliens remain on screen.

---

## 1. Quality Review Findings

### 🔴 Finding 1 [Critical — INTEGRITY VIOLATION]: Self-Certifying Mock Tests in `tests/sectorBoss.test.ts`
- **What**: In `tests/sectorBoss.test.ts`, Suites 3, 4, and 5 do not import or exercise `src/engine/GameEngine.ts`. Instead, the test file implements its own isolated simulations:
  - Lines 154–161: `function simulateHit(alien, bulletDamage) { ... }`
  - Lines 195–200: `function calculateDamage(coreRevealed, baseDamage) { ... }`
  - Lines 253–268: `function createDreadnought(): BossSim { ... }`
  - Lines 270–304: `function hitBoss(boss: BossSim, damage: number): void { ... }`
- **Where**: `tests/sectorBoss.test.ts:154-304`
- **Why**: The unit test claims in its title to test "Sector 3 Armored Mech-Crab Hit Absorption", "Sector 4 Behemoth Energy Core Reveal Vulnerability Cycle", and "Sector 5 Stage 5 Dreadnought Boss 4-Phase Battle State Machine", but it exclusively executes test-internal mock functions. If the actual armor, core reveal, or boss state machine logic in `src/engine/GameEngine.ts` were corrupted, altered, or deleted entirely, `npm test` would still report 37 passing tests with 100% green status. This is textbook self-certifying facade verification.
- **Suggestion**:
  1. Refactor combat collision and damage resolution in `GameEngine.ts` (or extract a pure combat/damage resolver class or exportable pure helper functions) so that the actual engine physics functions are imported and verified by unit tests.
  2. Test `GameEngine` or its extracted combat rules directly without dummy standalone implementations in the test file.

---

### 🔴 Finding 2 [Critical]: Dreadnought Boss Fight Premature Victory Bug (`src/engine/GameEngine.ts:753`)
- **What**: In `src/engine/GameEngine.ts`, the stage completion check in `update(dt)` evaluates:
  ```typescript
  // 8. Check Stage Victory
  if (this.state.aliens.length === 0 && this.state.aliensDefeated < this.state.totalAliensWave) {
    this.spawnAlienFormation();
  } else if (this.state.aliensDefeated >= this.state.totalAliensWave && !this.state.aliens.some(a => a.bossPhase === 4)) {
    this.handleStageVictory();
  }
  ```
- **Where**: `src/engine/GameEngine.ts:753-755`
- **Why**: 
  1. In Sector 5 Stage 5, `totalAliensWave = 5`. The stage starts with 5 aliens: 1 boss, 2 crabs, 2 scouts.
  2. When the player breaks the boss's deflector shield, the boss enters `bossPhase = 2` and spawns 2 minion drones via `spawnMinionDrones(boss)` into lanes 1 and 3.
  3. If the player eliminates the 4 initial escorts (2 crabs, 2 scouts) and shoots 1 minion drone, `aliensDefeated` reaches 5 (`aliensDefeated >= totalAliensWave` is TRUE: `5 >= 5`).
  4. At this point, the Dreadnought Boss is in Phase 2 (`bossPhase === 2`, NOT 4). Therefore, `!this.state.aliens.some(a => a.bossPhase === 4)` evaluates to **TRUE**!
  5. Line 754 immediately triggers `this.handleStageVictory()`!
  6. **Impact**: The stage ends, victory fanfare plays, stars/coins are credited, and combat freezes while the Dreadnought Boss is still alive on screen with full 40/40 HP, having never entered Phase 3 Core Overload or Phase 4 Meltdown!
- **Suggestion**:
  - In boss stages (`this.state.isBossStage` or when `this.state.getActiveBoss()` is present), line 753 must **never** trigger `handleStageVictory()`.
  - Stage victory for the Dreadnought Boss must **only** be triggered when the boss is destroyed and its Phase 4 destruction sequence completes (which `updateBossDestruction()` already properly handles at `timer >= 3.0` at line 286).
  - For standard non-boss stages, victory must require that all aliens on screen are eliminated: `this.state.aliens.length === 0 && this.state.aliensDefeated >= this.state.totalAliensWave`.

---

### 🟠 Finding 3 [Major]: Severe Mismatch Between `totalAliens` and `formationGrid` in `SectorConfig.ts`
- **What**: Across 12 of the 25 stages in `SectorConfig.ts`, the statically declared `totalAliens` does not match the actual count of aliens populated in `formationGrid`:
  | Sector & Stage | Declared `totalAliens` | Actual `gridCount` | Runtime Defect |
  |---|---|---|---|
  | Sector 1 Stage 1 | 8 | 5 | Clears 5 $\to$ respawns 5 $\to$ kills 3 $\to$ victory triggers with 2 live aliens left on screen |
  | Sector 1 Stage 2 | 12 | 10 | Clears 10 $\to$ respawns 10 $\to$ kills 2 $\to$ victory triggers with 8 live aliens left on screen |
  | Sector 1 Stage 3 | 14 | 13 | Clears 13 $\to$ respawns 13 $\to$ kills 1 $\to$ victory triggers with 12 live aliens left on screen |
  | Sector 1 Stage 4 | 16 | 17 | Kills 16 $\to$ victory triggers with 1 live alien still descending |
  | Sector 2 Stage 1 | 10 | 8 | Clears 8 $\to$ respawns 8 $\to$ kills 2 $\to$ victory triggers with 6 live aliens left on screen |
  | Sector 3 Stage 2 | 14 | 15 | Kills 14 $\to$ victory triggers with 1 live alien still descending |
  | Sector 3 Stage 4 | 19 | 20 | Kills 19 $\to$ victory triggers with 1 live alien still descending |
  | Sector 4 Stage 1 | 14 | 15 | Kills 14 $\to$ victory triggers with 1 live alien still descending |
  | Sector 4 Stage 3 | 18 | 20 | Kills 18 $\to$ victory triggers with 2 live aliens still descending |
  | Sector 4 Stage 4 | 19 | 20 | Kills 19 $\to$ victory triggers with 1 live alien still descending |
  | Sector 5 Stage 3 | 18 | 20 | Kills 18 $\to$ victory triggers with 2 live aliens still descending |
  | Sector 5 Stage 4 | 19 | 20 | Kills 19 $\to$ victory triggers with 1 live alien still descending |
- **Where**: `src/engine/SectorConfig.ts` (lines 47, 65, 84, 103, 153, 288, 328, 381, 422, 444, 546, 571)
- **Why**: Because line 753 of `GameEngine.ts` ends the stage as soon as `aliensDefeated >= totalAliensWave` without checking `aliens.length === 0`, stages with `totalAliens < gridCount` abruptly end mid-wave while live enemies are still attacking the player. Stages with `totalAliens > gridCount` respawn the entire formation and then cut off awkwardly after a fraction of the second wave is destroyed.
- **Suggestion**:
  1. Synchronize `totalAliens` in `StageWaveConfig` so it exactly equals `gridCount` (the number of non-null cells in `formationGrid`), OR dynamically compute `waveConfig.totalAliens = waveConfig.formationGrid.flat().filter(Boolean).length` inside `startStage()`.
  2. Enforce `this.state.aliens.length === 0` in all victory conditions.

---

### 🟡 Finding 4 [Minor]: Extensionless Imports in `GameEngine.ts` Break Headless Node.js Tests
- **What**: In `src/engine/GameEngine.ts:1-6`, imports omit file extensions:
  ```typescript
  import { GameState, Alien, Bullet, AlienType } from '../models/GameState';
  import { Renderer } from './Renderer';
  import { MathEngine, MathProblem } from '../math/MathEngine';
  import { soundEngine } from './SoundEngine';
  import { PlayerProfile, updateActiveProfile } from '../models/Profile';
  import { getStageWaveConfig, StageWaveConfig } from './SectorConfig';
  ```
- **Where**: `src/engine/GameEngine.ts:1-6`
- **Why**: When running native Node.js tests (`node --experimental-strip-types`), Node requires explicit file extensions (`.ts`). Attempting to import `GameEngine.ts` in Node fails with `Cannot find module ...\src\models\GameState`. Adding `.ts` extensions (matching `SectorConfig.ts` and `GameState.ts`) enables headless testing across both Vite and Node.js.
- **Suggestion**: Add `.ts` to relative imports in `GameEngine.ts`.

---

## 2. Verified Claims

| Claim / Deliverable | Verification Method | Status | Notes |
|---|---|---|---|
| 5 Planetary Sectors (25 Stages total) | Inspected `SectorConfig.ts` & verified via unit test | **PASS** | S1 to S5 with 5 stages each exist with distinct titles, descriptions, and accent colors. |
| Deterministic 5-lane grid formations | Inspected `formationGrid` across all 25 stages | **PASS** | Every row across all 25 stages contains an array of exactly 5 lane slots (`null` or `AlienType`). |
| Continuous Horizontal Sinusoidal Movement (S2) | Inspected `GameEngine.ts:573-579` | **PASS** | Implements $x = \text{clamp}(baseX + A\sin(\omega t + \phi), w/2, W - w/2)$ with smooth continuous bounding. |
| Armored Mech-Crab Carapace Mechanics (S3) | Inspected `GameEngine.ts:689-697` | **PASS** | Decrements `alien.armor` first, protecting `alien.hp` until armor is depleted. |
| Energy Core Reveal Cycle (S4) | Inspected `GameEngine.ts:581-593, 700-717` | **PASS** | Alternates between 3.0s concealed (0.5x mitigated) and 2.0s revealed (2.0x critical) damage. |
| Dreadnought Boss State Machine Mechanics (S5) | Inspected `GameEngine.ts:600-638, 221-288` | **PASS (Mechanics)** / **FAIL (Stage Victory Integration)** | The 4-phase transitions (Shield $\to$ Minions $\to$ Overload $\to$ Meltdown) are coded, but premature victory bug cuts the battle short. |
| `npm run build` zero compilation errors | Executed `npm run build` | **PASS** | `tsc && vite build` built production bundle in 260ms without warnings or errors. |
| User Rule: `README.md` updated after feature change | Inspected `README.md` | **PASS** | `README.md` comprehensively documents all 5 sectors, formations, and the Dreadnought Boss. |

---

## 3. Adversarial Challenges & Attack Scenarios

### Challenge 1: The Escort Minion Trap (Boss Defeat Bypass)
- **Assumption Challenged**: Stage victory in `GameEngine.ts` correctly requires the boss to be destroyed.
- **Attack Scenario**: 
  1. Player launches Sector 5 Stage 5.
  2. Player shoots lanes 1, 3, 0, 4, destroying the 2 scouts and 2 crabs (`aliensDefeated = 4`).
  3. Player fires at the Dreadnought Boss in lane 2. Deflector shield absorbs 30 damage and collapses.
  4. Boss enters Phase 2, opening hangar bays and deploying 2 minion drones into lanes 1 and 3.
  5. Player shoots lane 1, destroying 1 minion drone. `aliensDefeated` increments to 5.
- **Blast Radius**: `aliensDefeated (5) >= totalAliensWave (5)` triggers line 753 immediately. Victory fanfare plays, stage completes, and the Dreadnought Boss is never fought in Phase 3 or Phase 4!
- **Mitigation**: Guard line 753: `if (!this.state.isBossStage && !this.state.getActiveBoss() && this.state.aliens.length === 0 && this.state.aliensDefeated >= this.state.totalAliensWave)`. Boss stage victory must solely trigger via `updateBossDestruction()`.

### Challenge 2: Ghost Waves & Mid-Wave Truncation
- **Assumption Challenged**: Declared `totalAliens` represents a completed wave.
- **Attack Scenario**:
  1. Player enters Sector 1 Stage 1 (`totalAliens: 8`, `gridCount: 5`).
  2. Player wipes all 5 aliens on screen. `aliensDefeated = 5`.
  3. Line 751 detects `aliens.length === 0 && aliensDefeated < 8`, so it respawns the entire 5-alien grid!
  4. Player kills 3 aliens from the second wave (`aliensDefeated = 8`).
  5. Line 753 fires immediately, ending the stage with 2 live aliens hovering on screen.
- **Blast Radius**: Visual glitch where live alien sprites freeze or vanish upon victory modal display.
- **Mitigation**: Synchronize `totalAliens` to match the exact non-null count of `formationGrid` and require `aliens.length === 0`.

---

## 4. Handoff Protocol: 5-Component Report

### 1. Observation
- `tests/sectorBoss.test.ts:154-161`:
  ```typescript
  function simulateHit(alien: { armor: number; hp: number }, bulletDamage: number): { deflected: boolean; effectiveDamage: number } {
    if (alien.armor > 0) {
      alien.armor -= 1;
      return { deflected: true, effectiveDamage: 0 };
    }
    alien.hp -= bulletDamage;
    return { deflected: false, effectiveDamage: bulletDamage };
  }
  ```
- `src/engine/GameEngine.ts:750-756`:
  ```typescript
  // 8. Check Stage Victory
  if (this.state.aliens.length === 0 && this.state.aliensDefeated < this.state.totalAliensWave) {
    this.spawnAlienFormation();
  } else if (this.state.aliensDefeated >= this.state.totalAliensWave && !this.state.aliens.some(a => a.bossPhase === 4)) {
    this.handleStageVictory();
  }
  ```
- Command `node --experimental-strip-types -e "import('./src/engine/SectorConfig.ts').then(m => { for (const s of m.getAllSectorConfigs()) { for (const [k, st] of Object.entries(s.stages)) { const gridCount = st.formationGrid.flat().filter(Boolean).length; console.log('Sector', s.sectorId, 'Stage', k, 'totalAliens:', st.totalAliens, 'gridCount:', gridCount); } } })"` outputted:
  - `Sector 1 Stage 1 totalAliens: 8 gridCount: 5`
  - `Sector 1 Stage 4 totalAliens: 16 gridCount: 17`
  - `Sector 3 Stage 4 totalAliens: 19 gridCount: 20`
  - `Sector 4 Stage 3 totalAliens: 18 gridCount: 20`
  - `Sector 5 Stage 5 totalAliens: 5 gridCount: 5`
- Command `npm test`: Passed 37 tests across 7 suites in 41ms.
- Command `npm run build`: `tsc && vite build` completed in 260ms with exit code 0.

### 2. Logic Chain
1. In `tests/sectorBoss.test.ts`, Suites 3, 4, and 5 verify local helper functions `simulateHit`, `calculateDamage`, and `hitBoss` rather than `GameEngine.ts`.
2. Because `GameEngine.ts` was never tested in unit tests, the integration between alien destruction, wave count tracking, and stage completion went unverified.
3. In Sector 5 Stage 5, `totalAliensWave` is 5. Spawning minion drones increases the total destroyable entities to 7. Destroying 4 escorts + 1 minion drone reaches `aliensDefeated = 5 >= totalAliensWave (5)`.
4. In `GameEngine.ts:753`, `!this.state.aliens.some(a => a.bossPhase === 4)` is true because the boss is still alive in Phase 2.
5. Therefore, `this.handleStageVictory()` is executed while the boss has 40 HP and Phase 3 and Phase 4 are never played.
6. Additionally, 12 stages in `SectorConfig.ts` contain `totalAliens != gridCount`, causing premature victory or unexpected wave respawns with leftover aliens on screen.

### 3. Caveats
- No canvas rendering bugs were identified; the canvas shaders, Boss HUD, and procedural particle systems in `Renderer.ts` and `SpriteGenerator.ts` are high quality.
- The user rule requiring updating `README.md` after each feature change was completely followed.

### 4. Conclusion
Milestone 2 cannot be approved in its current state. The test suite exhibits a critical integrity violation by self-certifying mock functions rather than verifying real engine code, which allowed a critical bug in `GameEngine.ts` to bypass detection and break the Dreadnought Boss fight.

### 5. Verification Method
To verify the remediation:
1. Fix `src/engine/GameEngine.ts:753`: Prevent `handleStageVictory()` from firing in boss stages or when active aliens remain on screen.
2. Synchronize all `totalAliens` values in `src/engine/SectorConfig.ts` with their corresponding `formationGrid` non-null counts.
3. Update `tests/sectorBoss.test.ts` to import and test real production logic from `src/engine/` rather than internal mock functions.
4. Run `npm test` and `npm run build`.

---
