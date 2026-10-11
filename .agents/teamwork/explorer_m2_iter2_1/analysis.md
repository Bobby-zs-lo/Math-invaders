# Milestone 2 Iteration 2: Technical Remediation Blueprint

**Author**: `explorer_m2_iter2_1`  
**Date**: 2026-10-10  
**Target Files**:
- `src/engine/GameEngine.ts`
- `src/engine/SectorConfig.ts`
- `src/models/GameState.ts`
- `src/engine/Renderer.ts`
- `src/rendering/Renderer.ts`
- `tests/sectorBoss.test.ts`

---

## 1. Executive Summary & Root-Cause Synthesis

Milestone 2 introduced procedural visual assets, continuous sinusoidal movement mechanics, armored carapaces, core vulnerability cycles, and a 4-phase Dreadnought Boss battle. However, adversarial review and stress testing across four independent reviewer/challenger agents revealed three critical integrity and architectural defects:

1. **Premature Boss Stage Victory (`src/engine/GameEngine.ts:753`)**: Defeating 5 non-boss aliens (starting escorts and minion drones) causes `aliensDefeated >= totalAliensWave` (`5 >= 5`) to evaluate to true. Because the boss is alive in Phase 2 or 3 (`bossPhase !== 4`), `!this.state.aliens.some(a => a.bossPhase === 4)` evaluated to true. As a result, the engine immediately invoked `handleStageVictory()`, ending combat while the Dreadnought Boss was still on screen with 40 HP, skipping Phase 3 (Core Overload) and Phase 4 (Meltdown).
2. **Self-Certifying Tests (INTEGRITY VIOLATION in `tests/sectorBoss.test.ts`)**: Suites 3, 4, and 5 implemented test-internal dummy mock functions (`simulateHit`, `calculateDamage`, `createDreadnought`, `hitBoss`) rather than testing the real `GameEngine` or exported engine logic. This self-certifying facade reported 100% green tests while masking the game-breaking victory condition flaw.
3. **Stage Wave Budget Discrepancies (`src/engine/SectorConfig.ts`)**: In 12 of 25 stages, declared `totalAliens` does not equal the non-null count in `formationGrid`. In 8 stages (`totalAliens < gridCount`), premature stage victory triggers with live aliens stranded on screen. In 4 stages (`totalAliens > gridCount`), waves respawn incompletely and abruptly terminate mid-battle.
4. **Boss Lifecycle Anomalies (`GameEngine.ts`)**:
   - Double victory invocation: `updateBossDestruction()` calls `handleStageVictory()` at 3.0s, and then Step 8 in `update()` calls `handleStageVictory()` again within the same frame, duplicating player rewards.
   - Post-mortem victory: `updateBossDestruction()` and `handleStageVictory()` lacked a death guard (`!this.state.isGameOver && this.state.lives > 0`), awarding stage completion to dead players.
   - Phase 4 shockwave spam: Range condition `timer >= 1.5 && timer < 1.6` lacked a one-shot boolean flag, re-firing large explosion shockwaves and screen shakes for 6 consecutive frames at 60 FPS.
   - Spawned minion drone type: `spawnMinionDrones(boss)` instantiated `'scout'` instead of `'minion_drone'`.
   - Node ESM imports: `GameEngine.ts:1-6` omitted `.ts` extensions, throwing `ERR_MODULE_NOT_FOUND` under native Node.js `--experimental-strip-types`.

---

## 2. Sector Wave Budget Discrepancy Catalog (`SectorConfig.ts`)

Across all 5 sectors (25 total stages), the table below documents the exact discrepancy between declared `totalAliens` and the non-null alien count in `formationGrid` (`gridCount`):

| Sector | Stage | Name | Declared `totalAliens` | Actual `gridCount` | Diff (`total - grid`) | Runtime Anomaly |
|:---:|:---:|:---|:---:|:---:|:---:|:---|
| **1** | **1** | Moon Perimeter | **8** | **5** | +3 | Clears 5 $\to$ respawns 5 $\to$ kills 3 $\to$ victory triggers with 2 live aliens stranded |
| **1** | **2** | Crater Outpost | **12** | **10** | +2 | Clears 10 $\to$ respawns 10 $\to$ kills 2 $\to$ victory triggers with 8 live aliens stranded |
| **1** | **3** | Lunar Ravine | **14** | **13** | +1 | Clears 13 $\to$ respawns 13 $\to$ kills 1 $\to$ victory triggers with 12 live aliens stranded |
| **1** | **4** | Alpha Dome Approach | **16** | **17** | -1 | Kills 16 $\to$ victory triggers prematurely with 1 live alien still descending |
| 1 | 5 | Base Command Citadel | 18 | 18 | 0 | Perfect match |
| **2** | **1** | Debris Threshold | **10** | **8** | +2 | Clears 8 $\to$ respawns 8 $\to$ kills 2 $\to$ victory triggers with 6 live aliens stranded |
| 2 | 2 | Iron Swarm Ridge | 13 | 13 | 0 | Perfect match |
| 2 | 3 | Chondrite Corridor | 15 | 15 | 0 | Perfect match |
| 2 | 4 | Heavy Boulder Field | 18 | 18 | 0 | Perfect match |
| 2 | 5 | Vesta Gate Ambush | 20 | 20 | 0 | Perfect match |
| 3 | 1 | Rust Dunes Transit | 10 | 10 | 0 | Perfect match |
| **3** | **2** | Olympus Base Outskirts | **14** | **15** | -1 | Kills 14 $\to$ victory triggers prematurely with 1 live alien still descending |
| 3 | 3 | Cydonia Stronghold | 15 | 15 | 0 | Perfect match |
| **3** | **4** | Phobos Garrison | **19** | **20** | -1 | Kills 19 $\to$ victory triggers prematurely with 1 live alien still descending |
| 3 | 5 | Warlord Citadel | 20 | 20 | 0 | Perfect match |
| **4** | **1** | Radiation Belt Outpost | **14** | **15** | -1 | Kills 14 $\to$ victory triggers prematurely with 1 live alien still descending |
| 4 | 2 | Great Red Core Pass | 15 | 15 | 0 | Perfect match |
| **4** | **3** | Metallic Hydrogen Front | **18** | **20** | -2 | Kills 18 $\to$ victory triggers prematurely with 2 live aliens still descending |
| **4** | **4** | Europa Approach Trench | **19** | **20** | -1 | Kills 19 $\to$ victory triggers prematurely with 1 live alien still descending |
| 4 | 5 | Ganymede Orbital Bastion | 20 | 20 | 0 | Perfect match |
| 5 | 1 | Ion Shroud Nebula | 15 | 15 | 0 | Perfect match |
| 5 | 2 | Plasma Storm Nexus | 15 | 15 | 0 | Perfect match |
| **5** | **3** | Pulsar Rift Waypoint | **18** | **20** | -2 | Kills 18 $\to$ victory triggers prematurely with 2 live aliens still descending |
| **5** | **4** | Dark Matter Gate | **19** | **20** | -1 | Kills 19 $\to$ victory triggers prematurely with 1 live alien still descending |
| 5 | 5 | The Mechanical Dreadnought | 5 | 5 | 0 | Perfect match (1 Boss + 4 Escorts) |

### Remediation Action in `SectorConfig.ts`:
Update the 12 mismatched stages so `totalAliens` strictly equals `gridCount`:
- Sector 1 Stage 1: `totalAliens: 5` (was 8)
- Sector 1 Stage 2: `totalAliens: 10` (was 12)
- Sector 1 Stage 3: `totalAliens: 13` (was 14)
- Sector 1 Stage 4: `totalAliens: 17` (was 16)
- Sector 2 Stage 1: `totalAliens: 8` (was 10)
- Sector 3 Stage 2: `totalAliens: 15` (was 14)
- Sector 3 Stage 4: `totalAliens: 20` (was 19)
- Sector 4 Stage 1: `totalAliens: 15` (was 14)
- Sector 4 Stage 3: `totalAliens: 20` (was 18)
- Sector 4 Stage 4: `totalAliens: 20` (was 19)
- Sector 5 Stage 3: `totalAliens: 20` (was 18)
- Sector 5 Stage 4: `totalAliens: 20` (was 19)

### Dynamic Runtime Safeguard in `GameEngine.ts:startStage()`:
In `startStage()`, compute `this.state.totalAliensWave` directly from `formationGrid`:
```typescript
this.state.totalAliensWave = waveConfig.formationGrid.flat().filter(Boolean).length;
```
This guarantees runtime immunity against configuration drift.

---

## 3. Code-Level Remediation Specifications

### 3.1. `src/models/GameState.ts`

#### 1. Add `destructionShockwaveFired` to `Alien` interface:
```typescript
// Location: src/models/GameState.ts, lines 40-48
export interface Alien {
  // ... existing fields ...
  // Sector 5: Colossal Dreadnought Boss State Machine
  isBoss?: boolean;
  bossPhase?: 1 | 2 | 3 | 4 | 'shield' | 'minions' | 'overload' | 'destruction';
  shieldHp?: number;
  maxShieldHp?: number;
  overloadTimer?: number;
  minionsSpawned?: boolean;
  wingBaysOpen?: boolean;
  destructionTimer?: number;
  destructionStep?: number;
  destructionShockwaveFired?: boolean;
}
```

#### 2. Add `isGameOver` getter/setter to `GameState`:
```typescript
// Location: src/models/GameState.ts, lines 112-114
  public stageCompleted: boolean = false;
  public gameOver: boolean = false;

  public get isGameOver(): boolean {
    return this.gameOver || this.lives <= 0;
  }
  public set isGameOver(val: boolean) {
    this.gameOver = val;
  }
```

---

### 3.2. `src/engine/GameEngine.ts`

#### 1. ESM Imports with `.ts` Extensions (Lines 1–6):
```typescript
// Before:
import { GameState, Alien, Bullet, AlienType } from '../models/GameState';
import { Renderer } from './Renderer';
import { MathEngine, MathProblem } from '../math/MathEngine';
import { soundEngine } from './SoundEngine';
import { PlayerProfile, updateActiveProfile } from '../models/Profile';
import { getStageWaveConfig, StageWaveConfig } from './SectorConfig';

// After:
import { GameState, Alien, Bullet, AlienType } from '../models/GameState.ts';
import { Renderer } from './Renderer.ts';
import { MathEngine, MathProblem } from '../math/MathEngine.ts';
import { soundEngine } from './SoundEngine.ts';
import { PlayerProfile, updateActiveProfile } from '../models/Profile.ts';
import { getStageWaveConfig, StageWaveConfig } from './SectorConfig.ts';
```

#### 2. Dynamic Safeguard in `startStage()` (Line 86):
```typescript
// Before:
this.state.totalAliensWave = waveConfig.totalAliens;

// After:
this.state.totalAliensWave = waveConfig.formationGrid.flat().filter(Boolean).length;
```

#### 3. Minion Drone Spawn Type (Line 228):
```typescript
// Before:
this.spawnConfiguredAlien(lane, boss.y + 36, 'scout', {

// After:
this.spawnConfiguredAlien(lane, boss.y + 36, 'minion_drone', {
```

#### 4. Boss Destruction Initialization (Lines 238–247):
```typescript
// Before:
  private triggerBossDestruction(boss: Alien): void {
    boss.bossPhase = 4;
    boss.hp = 0;
    boss.destructionTimer = 0;
    boss.destructionStep = 0;
    boss.speed = 0;
    this.state.screenShakeTimer = 3.0;
    this.state.screenShakeIntensity = 8.0;
    soundEngine.playExplosion('boss');
  }

// After:
  private triggerBossDestruction(boss: Alien): void {
    boss.bossPhase = 4;
    boss.hp = 0;
    boss.destructionTimer = 0;
    boss.destructionStep = 0;
    boss.destructionShockwaveFired = false;
    boss.speed = 0;
    this.state.screenShakeTimer = 3.0;
    this.state.screenShakeIntensity = 8.0;
    soundEngine.playExplosion('boss');
  }
```

#### 5. Shockwave Flare One-Shot & Post-Mortem Guard in `updateBossDestruction()` (Lines 249–288):
```typescript
// Before:
  private updateBossDestruction(boss: Alien, dt: number): void {
    boss.destructionTimer = (boss.destructionTimer ?? 0) + dt;
    const timer = boss.destructionTimer ?? 0;
    const step = boss.destructionStep ?? 0;

    // Staggered secondary wing explosions
    if (timer >= 0.3 * (step + 1) && step < 8) {
      boss.destructionStep = step + 1;
      const offsetX = (Math.random() - 0.5) * boss.width * 0.9;
      const offsetY = (Math.random() - 0.5) * boss.height * 0.9;
      this.spawnExplosionParticles(boss.x + offsetX, boss.y + offsetY, '#ff6d00', 12);
      this.spawnExplosionParticles(boss.x + offsetX, boss.y + offsetY, '#ffd600', 6);
      soundEngine.playExplosion('small');
      this.state.screenShakeTimer = Math.max(this.state.screenShakeTimer, 0.4);
      this.state.screenShakeIntensity = 6.0;
    }

    // Meltdown white shockwave flare at 1.5s
    if (timer >= 1.5 && timer < 1.6 && step < 10) {
      this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 30);
      this.spawnExplosionParticles(boss.x, boss.y, '#00f3ff', 20);
      soundEngine.playExplosion('large');
      this.state.screenShakeIntensity = 10.0;
    }

    // Catastrophic completion at 3.0s
    if (timer >= 3.0) {
      const idx = this.state.aliens.indexOf(boss);
      if (idx !== -1) {
        this.state.aliens.splice(idx, 1);
      }
      this.state.aliensDefeated++;
      this.state.score += boss.scoreValue;
      this.spawnExplosionParticles(boss.x, boss.y, '#ff6d00', 60);
      this.spawnExplosionParticles(boss.x, boss.y, '#00f3ff', 30);
      this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 30);
      soundEngine.playExplosion('boss');
      this.handleStageVictory();
    }
  }

// After:
  private updateBossDestruction(boss: Alien, dt: number): void {
    if (this.state.isGameOver || this.state.lives <= 0) return;

    boss.destructionTimer = (boss.destructionTimer ?? 0) + dt;
    const timer = boss.destructionTimer ?? 0;
    const step = boss.destructionStep ?? 0;

    // Staggered secondary wing explosions
    if (timer >= 0.3 * (step + 1) && step < 8) {
      boss.destructionStep = step + 1;
      const offsetX = (Math.random() - 0.5) * boss.width * 0.9;
      const offsetY = (Math.random() - 0.5) * boss.height * 0.9;
      this.spawnExplosionParticles(boss.x + offsetX, boss.y + offsetY, '#ff6d00', 12);
      this.spawnExplosionParticles(boss.x + offsetX, boss.y + offsetY, '#ffd600', 6);
      soundEngine.playExplosion('small');
      this.state.screenShakeTimer = Math.max(this.state.screenShakeTimer, 0.4);
      this.state.screenShakeIntensity = 6.0;
    }

    // Meltdown white shockwave flare at 1.5s (one-shot flag prevents multi-frame burst)
    if (timer >= 1.5 && !boss.destructionShockwaveFired) {
      boss.destructionShockwaveFired = true;
      this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 30);
      this.spawnExplosionParticles(boss.x, boss.y, '#00f3ff', 20);
      soundEngine.playExplosion('large');
      this.state.screenShakeIntensity = 10.0;
    }

    // Catastrophic completion at 3.0s
    if (timer >= 3.0) {
      const idx = this.state.aliens.indexOf(boss);
      if (idx !== -1) {
        this.state.aliens.splice(idx, 1);
      }
      this.state.aliensDefeated++;
      this.state.score += boss.scoreValue;
      this.spawnExplosionParticles(boss.x, boss.y, '#ff6d00', 60);
      this.spawnExplosionParticles(boss.x, boss.y, '#00f3ff', 30);
      this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 30);
      soundEngine.playExplosion('boss');
      if (!this.state.isGameOver && this.state.lives > 0) {
        this.handleStageVictory();
      }
    }
  }
```

#### 6. Stage Victory Invariant Check in `update(dt)` (Lines 750–756):
```typescript
// Before:
    // 8. Check Stage Victory
    if (this.state.aliens.length === 0 && this.state.aliensDefeated < this.state.totalAliensWave) {
      this.spawnAlienFormation();
    } else if (this.state.aliensDefeated >= this.state.totalAliensWave && !this.state.aliens.some(a => a.bossPhase === 4)) {
      this.handleStageVictory();
    }

// After:
    // 8. Check Stage Victory
    if (!this.state.isBossStage && !this.state.getActiveBoss() && this.state.aliens.length === 0 && this.state.aliensDefeated < this.state.totalAliensWave) {
      this.spawnAlienFormation();
    } else if (!this.state.isBossStage && !this.state.getActiveBoss() && this.state.aliens.length === 0 && this.state.aliensDefeated >= this.state.totalAliensWave) {
      this.handleStageVictory();
    }
```

#### 7. Player Breach & Game Over Flag Sync (Lines 775–778):
```typescript
// Before:
    if (this.state.lives <= 0) {
      this.state.isRunning = false;
      this.onGameOver();
    }

// After:
    if (this.state.lives <= 0) {
      this.state.isRunning = false;
      this.state.gameOver = true;
      this.onGameOver();
    }
```

#### 8. One-Shot & Post-Mortem Guard in `handleStageVictory()` (Lines 806–810):
```typescript
// Before:
  private handleStageVictory(): void {
    this.state.isRunning = false;
    soundEngine.playUpgradeFanfare();

// After:
  private handleStageVictory(): void {
    if (this.state.isGameOver || this.state.lives <= 0 || this.state.stageCompleted) return;
    this.state.stageCompleted = true;
    this.state.isRunning = false;
    soundEngine.playUpgradeFanfare();
```

---

### 3.3. Ancillary File Extension Fixes (`src/engine/Renderer.ts` & `src/rendering/Renderer.ts`)

In `src/engine/Renderer.ts:1-2`:
```typescript
import { GameState } from '../models/GameState.ts';
import { SpriteGenerator } from './SpriteGenerator.ts';
```

In `src/rendering/Renderer.ts:1`:
```typescript
export { Renderer } from '../engine/Renderer.ts';
```

---

## 4. Refactoring Design for `tests/sectorBoss.test.ts`

### 4.1. Core Anti-Pattern Elimination
The existing `tests/sectorBoss.test.ts` violates test integrity by declaring:
- `function simulateHit(...)` (lines 154–161)
- `function calculateDamage(...)` (lines 195–200)
- `function isRevealed(...)` (lines 217–220)
- `interface BossSim`, `createDreadnought()`, `hitBoss(...)` (lines 238–304)

These local functions duplicate the algorithmic intent without importing or touching the actual engine code.

### 4.2. Refactoring Architecture
The refactored `tests/sectorBoss.test.ts` will:
1. Provide a lightweight headless browser shim at the top of the test file:
   - `MockLocalStorage`
   - `MockAudioContext`
   - `MockCanvas` with `getContext('2d')` stub
   - `globalThis.window` binding
2. Import real production modules:
   - `import { GameEngine } from '../src/engine/GameEngine.ts';`
   - `import { createNewProfile, saveProfiles, setActiveProfile } from '../src/models/Profile.ts';`
   - `import { getStageWaveConfig, getAllSectorConfigs, getSectorConfig } from '../src/engine/SectorConfig.ts';`
   - `import type { Alien, Bullet } from '../src/models/GameState.ts';`
3. Structure test suites directly around production `GameEngine` interactions:

#### Suite 1: Planetary Sector Configurations (Preserved & Enhanced)
- Verifies all 5 sectors exist with unique thematic names, accent colors, and 5 stages each (25 total stages).
- Verifies exact wave grid count matches `totalAliens` across all 25 stages (`gridCount === totalAliens`).
- Verifies boss flags on Sector 5 Stage 5 (`bossType === 'dreadnought'`).

#### Suite 2: Sector 2 Continuous Sinusoidal Oscillation Mathematics (Preserved)
- Validates mathematical continuity and wall bounding for sinusoidal oscillation.

#### Suite 3: Sector 3 Armored Mech-Crab Hit Absorption (Refactored to `GameEngine`)
- Instantiates `engine = new GameEngine(mockCanvas, testProfile)`.
- Calls `engine.startStage(3, 1)`.
- Spawns Mech-Crab into lane 2 via `engine.spawnAlienInLane(2, 100, 'crab')`.
- Delivers a 1-damage bullet to crab position and steps engine via `(engine as any).update(0.016)`.
- Asserts `crab.armor` is reduced by 1 while `crab.hp` remains untouched at max HP (3).
- Delivers second 1-damage bullet and steps engine. Asserts `crab.armor` drops to 0 while `crab.hp` remains 3.
- Delivers third 1-damage bullet and steps engine. Asserts `crab.hp` decreases to 2.
- Delivers subsequent lethal hits. Asserts crab is defeated and removed from `engine.state.aliens`.

#### Suite 4: Sector 4 Behemoth Energy Core Reveal Vulnerability Cycle (Refactored to `GameEngine`)
- Spawns Behemoth into lane 2 via `engine.spawnAlienInLane(2, 100, 'behemoth')`.
- Steps engine through core cycle:
  - During concealed phase ($t < 3.0\text{s}$): delivers a 2-damage bullet. Asserts effective damage is mitigated by 50% ($\lfloor 2 \times 0.5 \rfloor = 1$). Delivers a 5-damage bullet. Asserts effective damage is $\lfloor 5 \times 0.5 \rfloor = 2$.
  - Steps engine past 3.0s into revealed window ($t \ge 3.0\text{s}$): verifies `alien.coreRevealed === true`.
  - During revealed phase: delivers a 2-damage bullet. Asserts critical amplified damage ($2 \times 2.0 = 4$). Delivers a 5-damage bullet. Asserts critical amplified damage ($5 \times 2.0 = 10$).

#### Suite 5: Sector 5 Stage 5 Dreadnought Boss 4-Phase Battle State Machine (Refactored to `GameEngine`)
- Starts stage 5-5 via `engine.startStage(5, 5)`.
- Verifies Dreadnought Boss is initialized in lane 2 with Phase 1, 30 shield HP, and 40 hull HP.
- **Phase 1**: Delivers bullets. Verifies shield absorbs hits while hull HP stays at 40.
- **Phase 1 $\to$ 2 Transition**: Collapses remaining shield. Steps engine. Verifies `boss.bossPhase === 2`, `boss.wingBaysOpen === true`, and `boss.minionsSpawned === true`.
- **Phase 2 Entity Conformance**: Verifies spawned minion drones in lanes 1 and 3 have `type === 'minion_drone'`.
- **Phase 2 $\to$ 3 Transition**: Hits boss hull until `hp <= 40 * 0.65` (26). Steps engine. Verifies `boss.bossPhase === 3`, `boss.coreRevealed === true`, and `boss.overloadTimer === 6.0`.
- **Phase 3 Critical Strike**: Delivers 5 base damage. Steps engine. Verifies 10 damage dealt (2.0x critical multiplier).
- **Phase 3 $\to$ 4 Transition**: Delivers lethal damage to reduce HP to 0. Steps engine. Verifies `boss.bossPhase === 4`, `boss.hp === 0`, `boss.speed === 0`, and `screenShakeTimer > 0`.
- **Phase 4 Destruction**: Steps engine through 3.0s. Verifies secondary wing explosions cascade, shockwave flare fires exactly once at 1.5s (`destructionShockwaveFired === true`), and at 3.0s the boss is removed from aliens, `onStageVictory` callback is fired, and profile rewards are credited.

#### Suite 6: Victory Invariant & Defect Regression Verifications
- **Regression 1 (Escort Minion Trap)**: In Sector 5 Stage 5, player destroys all 4 initial escorts (2 scouts, 2 crabs) and 1 minion drone (`aliensDefeated = 5`). Boss remains in Phase 2 with 40 HP. Steps engine. Asserts `onStageVictory` has NOT been called and stage is NOT completed.
- **Regression 2 (Double Victory Prevention)**: Boss finishes Phase 4 destruction. Asserts `onStageVictory` is called exactly 1 time (not 2).
- **Regression 3 (Post-Mortem Victory Guard)**: Player lives reach 0 while boss is exploding in Phase 4. Steps engine to 3.0s. Asserts `onGameOver` was invoked, `onStageVictory` was NEVER invoked, and profile stage progress was not marked complete.

---

## 5. Verification Gate & Acceptance Criteria

When `worker_m2_1` implements this remediation blueprint:
1. `npm test` (`node --experimental-strip-types tests/mathEngine.test.ts && node --experimental-strip-types tests/sectorBoss.test.ts`) must pass with 100% green status.
2. `node --experimental-strip-types tests/stress_m2_sectors.ts` must pass all 9 tests across 6 suites with 0 failures (previously failed on Test 2).
3. `npx tsx tests/stress_m2_boss.ts` must pass all 40 tests across 10 suites with 0 failures (previously failed on T3.3, T7.4, T8.3, T10.1, T10.2).
4. `npm run build` (`tsc && vite build`) must succeed with zero TypeScript diagnostics or Vite bundler warnings.
5. `README.md` must be maintained in accordance with project user rules.
