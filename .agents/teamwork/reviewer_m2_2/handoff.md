# Milestone 2 Code Review & Adversarial Critic Report

**Agent:** `reviewer_m2_2`  
**Date:** 2026-10-10  
**Milestone:** Milestone 2 (Sector Formations & Multi-Phase Dreadnought Boss)  
**Parent Task ID:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Verdict:** **REQUEST_CHANGES**

---

## 1. Observation

1. **Premature Boss Stage Victory Bug in `src/engine/GameEngine.ts`:**
   - In `src/engine/SectorConfig.ts` (lines 596–613), Sector 5 Stage 5 is configured with:
     ```typescript
     totalAliens: 5,
     isBossStage: true,
     bossType: 'dreadnought',
     formationGrid: [
       [null, null, 'boss', null, null],
       ['crab', null, null, null, 'crab'],
       [null, 'scout', null, 'scout', null]
     ]
     ```
   - In `src/engine/GameEngine.ts` (lines 86, 750–755):
     ```typescript
     this.state.totalAliensWave = waveConfig.totalAliens; // = 5
     ...
     // 8. Check Stage Victory
     if (this.state.aliens.length === 0 && this.state.aliensDefeated < this.state.totalAliensWave) {
       this.spawnAlienFormation();
     } else if (this.state.aliensDefeated >= this.state.totalAliensWave && !this.state.aliens.some(a => a.bossPhase === 4)) {
       this.handleStageVictory();
     }
     ```
   - In `src/engine/GameEngine.ts` (lines 221–236), Phase 2 spawns 2 additional escort minion drones:
     ```typescript
     private spawnMinionDrones(boss: Alien): void {
       if (boss.minionsSpawned) return;
       boss.minionsSpawned = true;
       ...
       const spawnLanes = [1, 3];
       for (const lane of spawnLanes) {
         this.spawnConfiguredAlien(lane, boss.y + 36, 'scout', ...);
       }
     }
     ```
   - In `src/engine/GameEngine.ts` (lines 781–787), whenever any minion or escort alien is destroyed, `this.state.aliensDefeated++` is incremented.
   - Initial formation has 5 enemies (1 boss + 2 crabs + 2 scouts). Phase 2 spawns 2 more drones (total 6 non-boss targets).
   - If a player defeats 5 non-boss enemies (e.g. 2 starting scouts, 2 starting crabs, and 1 minion drone), `this.state.aliensDefeated` becomes 5.
   - At line 753, `5 >= 5` is true, and because the boss is alive in Phase 2 or 3 (`boss.bossPhase !== 4`), `!this.state.aliens.some(a => a.bossPhase === 4)` evaluates to `true`.
   - Result: `this.handleStageVictory()` triggers immediately on the next animation frame, awarding victory while the Dreadnought Boss is still on screen with active HP (40/40 or ~26/40), completely skipping Phase 3 (Core Overload) and Phase 4 (Destruction Sequence).

2. **Self-Certifying Tests in `tests/sectorBoss.test.ts` (INTEGRITY VIOLATION):**
   - In `tests/sectorBoss.test.ts`:
     * Line 1–11 imports only from `SectorConfig.ts` and `GameState.ts`. It does **not** import `GameEngine.ts`.
     * Lines 153–192 implement a local mock helper `function simulateHit(...)`.
     * Lines 194–235 implement a local mock helper `function calculateDamage(...)` and `function isRevealed(...)`.
     * Lines 237–397 implement a local mock interface `interface BossSim`, a local factory `function createDreadnought()`, and a local state machine `function hitBoss(...)`.
     * The tests in suites 3, 4, and 5 verify only these mock functions defined inside the test file itself.
     * The actual implementation in `src/engine/GameEngine.ts` is never executed or tested by `tests/sectorBoss.test.ts`.
     * This self-certifying mock testing allowed Critical Finding 1 (the premature boss victory bug) to pass completely undetected despite 37 passing unit tests.

3. **Missing `.ts` Extensions on ESM Imports in `src/engine/GameEngine.ts`:**
   - Lines 1–6 in `src/engine/GameEngine.ts`:
     ```typescript
     import { GameState, Alien, Bullet, AlienType } from '../models/GameState';
     import { Renderer } from './Renderer';
     import { MathEngine, MathProblem } from '../math/MathEngine';
     import { soundEngine } from './SoundEngine';
     import { PlayerProfile, updateActiveProfile } from '../models/Profile';
     import { getStageWaveConfig, StageWaveConfig } from './SectorConfig';
     ```
   - While Vite and `tsc` resolve these extensionless imports, Node.js native ESM (`node --experimental-strip-types`) requires explicit `.ts` extensions.
   - Running tests that import `GameEngine.ts` directly (such as `tests/analyticsEdgeCases.test.ts`) throws:
     `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/models/GameState' imported from .../src/engine/GameEngine.ts`.

4. **Inconsistent Alien Type in `spawnMinionDrones()`:**
   - `src/models/GameState.ts` line 3 defines `'minion_drone'`.
   - `src/engine/GameEngine.ts` line 228 spawns minion drones as `'scout'` instead of `'minion_drone'`:
     `this.spawnConfiguredAlien(lane, boss.y + 36, 'scout', ...)`

5. **Verified Independent Execution:**
   - `npm test`: 37 passing tests across 7 suites in 44ms (mathEngine) + 15ms (sectorBoss).
   - `npm run build`: `tsc && vite build` succeeded in 300ms, creating `dist/` bundle with zero compiler errors.
   - `node test_qc.js`: Playwright desktop audit passed with exit code 0.
   - `node test_mobile_qc.js`: Playwright mobile audit passed with exit code 0.
   - `README.md`: Verified fully updated with all 5 sector blueprints, alien archetypes, and multi-phase Dreadnought Boss mechanics.

---

## 2. Logic Chain

1. **From Requirements to Boss Stage Dynamics:**
   - Requirement R2 demands: "Sector 5 (Deep Nebula Boss): A colossal multi-phase Mechanical Dreadnought Boss featuring an active energy deflector shield, minion drone deployment, core overload vulnerability phases, and spectacular destruction sequences."
   - The stage design in `SectorConfig.ts` establishes `totalAliens = 5` and spawns 1 Boss + 2 Crabs + 2 Scouts.
2. **From Minion Spawning to Wave Counting Collision:**
   - Phase 2 spawns 2 additional Minion Drones. When any enemy is killed, `aliensDefeated` increments.
   - Total non-boss enemies available = 4 (initial) + 2 (minions) = 6.
   - Because `totalAliensWave` is 5, killing any 5 non-boss enemies satisfies `aliensDefeated >= totalAliensWave`.
3. **From Victory Trigger to Premature Battle Termination:**
   - Line 753 of `GameEngine.ts` evaluates:
     `else if (this.state.aliensDefeated >= this.state.totalAliensWave && !this.state.aliens.some(a => a.bossPhase === 4))`
   - Because the boss is alive (in Phase 2 or 3, so `bossPhase !== 4`), `!this.state.aliens.some(a => a.bossPhase === 4)` is true.
   - `this.handleStageVictory()` is immediately invoked while the boss is at full or 65% HP.
   - The player never experiences Phase 3 (Core Overload) or Phase 4 (Cascading Destruction) if they eliminate minions before boss hull.
4. **From Unit Test Architecture to Integrity Masking:**
   - `tests/sectorBoss.test.ts` wrote local implementations of `createDreadnought()` and `hitBoss()`.
   - These tests verified the worker's intended algorithm in isolation, but did not test `GameEngine.ts`.
   - As a result, the test suite reported 100% green while the actual game engine harbored a critical flaw where the boss fight could be bypassed.

---

## 3. Review Report

### Review Summary
**Verdict:** REQUEST_CHANGES

### Findings

#### [Critical] Finding 1: Premature Stage Victory in Sector 5 Stage 5 (Boss Fight Short-Circuit)
- **What:** In Sector 5 Stage 5, defeating 5 non-boss enemies (starting crabs/scouts and Phase 2 minion drones) causes `this.state.aliensDefeated >= this.state.totalAliensWave` to evaluate to true. The engine immediately invokes `handleStageVictory()`, skipping Phase 3 and Phase 4 while the boss is still alive.
- **Where:** `src/engine/GameEngine.ts`, lines 750–756
- **Why:** In boss stages, stage victory must be tied strictly to the boss entity's destruction, not generic wave kill counts. `updateBossDestruction()` already triggers `handleStageVictory()` when the 3.0s destruction timer completes.
- **Suggestion:** Guard line 753 so that in boss stages (`this.state.isBossStage` or when `this.state.getActiveBoss()` exists), victory is never triggered by generic wave counts:
  ```typescript
  if (!this.state.isBossStage && this.state.aliens.length === 0 && this.state.aliensDefeated < this.state.totalAliensWave) {
    this.spawnAlienFormation();
  } else if (!this.state.isBossStage && this.state.aliens.length === 0 && this.state.aliensDefeated >= this.state.totalAliensWave) {
    this.handleStageVictory();
  }
  ```

#### [Critical] Finding 2: Self-Certifying Test Implementation (INTEGRITY VIOLATION)
- **What:** Suites 3, 4, and 5 of `tests/sectorBoss.test.ts` test local mock simulation functions (`simulateHit`, `calculateDamage`, `isRevealed`, `hitBoss`) defined inside the test file, rather than importing and verifying `src/engine/GameEngine.ts`.
- **Where:** `tests/sectorBoss.test.ts`, lines 153–397
- **Why:** Tests that only verify local copies of logic provide false attestation and masked Finding 1. Under reviewer integrity rules, self-certifying tests without independent verification of source code constitute an integrity violation.
- **Suggestion:** Refactor `tests/sectorBoss.test.ts` to test actual production code (either by testing extracted pure engine modules or running against `GameEngine` methods).

#### [Major] Finding 3: Missing `.ts` Extensions on ESM Imports in `GameEngine.ts`
- **What:** Imports in `src/engine/GameEngine.ts` omit `.ts` extensions, breaking direct imports under Node.js native ESM (`--experimental-strip-types`).
- **Where:** `src/engine/GameEngine.ts`, lines 1–6
- **Why:** Causes `ERR_MODULE_NOT_FOUND` when executing Node test harnesses like `tests/analyticsEdgeCases.test.ts`.
- **Suggestion:** Add `.ts` to relative imports in `src/engine/GameEngine.ts`.

#### [Minor] Finding 4: Minion Drone Spawn Type
- **What:** `spawnMinionDrones` spawns type `'scout'` instead of `'minion_drone'`.
- **Where:** `src/engine/GameEngine.ts`, line 228
- **Why:** Inconsistency with `AlienType` definition and HUD/stat tracking.
- **Suggestion:** Pass `'minion_drone'` to `spawnConfiguredAlien`.

---

## 4. Adversarial Challenge Report

### Challenge Summary
**Overall risk assessment:** HIGH

### Challenges

#### [Critical] Challenge 1: Defeating Escort Minions Bypasses Boss
- **Assumption challenged:** The player will always fight the boss to completion before stage victory occurs.
- **Attack scenario:** Player in Sector 5 Stage 5 eliminates the 2 starting scouts, 2 starting crabs, breaks boss deflector shield to enter Phase 2, and shoots 1 of the 2 newly deployed minion drones.
- **Blast radius:** Total aliens defeated reaches 5 (`totalAliensWave = 5`). Line 753 immediately awards Stage Victory, granting full stars, coins, diamonds, and star map progression while the Dreadnought Boss is completely intact.
- **Mitigation:** Disallow wave-counter victory in boss stages.

#### [High] Challenge 2: Test Suite Immunity to Engine Regressions
- **Assumption challenged:** `tests/sectorBoss.test.ts` proves that `GameEngine.ts` correctly handles the 4-phase boss battle.
- **Attack scenario:** Any breaking change made to `GameEngine.ts` (e.g., breaking shield math, reversing phase orders, breaking timers) leaves `tests/sectorBoss.test.ts` 100% green because the test file only executes its own internal `hitBoss` function.
- **Blast radius:** Engine regressions can be introduced without failing unit tests.
- **Mitigation:** Bind tests directly to `GameEngine` or shared engine logic.

---

## 5. Verified Claims vs Unverified Items

### Verified Claims
- Sector 1 to 5 configs present with 5 stages each (25 total) $\to$ Verified via `SectorConfig.ts` and `npm test` $\to$ **PASS**
- Sector 2 sinusoidal continuous oscillation within bounds $\to$ Verified via math and tests $\to$ **PASS**
- Dreadnought procedural graphics & reactor flares $\to$ Verified via `SpriteGenerator.ts` $\to$ **PASS**
- Screen-top Boss HUD (Title, Phase Pill, Shield bar, Hull HP bar) $\to$ Verified via `Renderer.ts` $\to$ **PASS**
- Canvas screen shake using `ctx.translate` $\to$ Verified in `Renderer.render()` $\to$ **PASS**
- `npm run build` succeeds $\to$ Verified with `tsc && vite build` (300ms) $\to$ **PASS**
- `README.md` updated with boss specifications $\to$ Verified in `README.md` $\to$ **PASS**

### Coverage Gaps / Failed Verifications
- Sector 5 Stage 5 boss fight completion without bypass $\to$ **FAILED** (premature victory triggered by minion kills)
- Independent unit testing of `GameEngine.ts` boss state machine $\to$ **FAILED** (tests only exercised local mocks)

---

## 6. Caveats

- Playwright QC tests (`test_qc.js` and `test_mobile_qc.js`) test Stage 1-1 and general UI responsiveness; they do not play through to Sector 5 Stage 5.
- Audio synthesis safely degrades in headless test runners via `typeof window !== 'undefined'` checks.

---

## 7. Conclusion

Milestone 2 introduced exceptional procedural visual design, smooth sinusoidal physics, and comprehensive planetary sector wave configurations. However, a critical gameplay flaw allows the Dreadnought Boss battle to be abruptly bypassed by destroying 5 minion/escort enemies, and the associated unit test suite self-certified this behavior by testing local mock functions rather than `GameEngine.ts`. 

Therefore, the verdict is **REQUEST_CHANGES**.

---

## 8. Verification Method

To independently verify these findings:
1. Inspect `src/engine/GameEngine.ts` lines 750–755 and observe line 753 victory condition vs line 86 `totalAliensWave = 5`.
2. Inspect `tests/sectorBoss.test.ts` lines 1–11 and 237–305 and observe that `GameEngine.ts` is neither imported nor invoked.
3. Run `npm test` to confirm current suite passes (due to isolated mocks).
4. Run `npm run build` to verify clean build.
