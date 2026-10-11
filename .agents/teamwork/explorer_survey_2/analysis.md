# Architectural Investigation & Survey Report: Requirement 2 (R2)
## Sector Formations, Planetary Escalation & Multi-Phase Boss Battles

**Agent:** `explorer_survey_2`  
**Date:** 2026-10-10  
**Target Milestone:** Milestone 2 (Sectors 1–5 Formations & Dreadnought Boss Battle)  
**Reference Document:** `.agents/teamwork/ORIGINAL_REQUEST.md` (Requirement 2 & Acceptance Criteria)

---

## 1. Executive Summary

A comprehensive investigation of the `Math-invaders` codebase was conducted to evaluate existing alien wave generation, flight movement patterns, planetary sectors, alien types, boss mechanics, and rendering/collision loops.

While the existing game has established a functional prototype foundation—featuring 5 sectors on the Star Map, offscreen procedural sprite generation for 4 alien types, a discrete march rhythm, and basic health/bullet collision—**there are major architectural gaps compared to Requirement 2 (R2)**:
1. **Zero Sector Differentiation in Wave Logic:** `spawnAlienFormation()` in `GameEngine.ts` completely ignores `state.sectorId`. Sectors 1, 2, 3, 4, and 5 spawn the identical grid pattern of scouts and crabs (plus behemoths if `stageId >= 3`).
2. **Missing Zig-Zag Swarms in Sector 2:** Movement is strictly discrete vertical stepping (`alien.y += marchStepY`). There is no horizontal velocity, continuous flight, or sinusoidal weaving logic anywhere in the codebase.
3. **Missing Armor Mechanics in Sector 3:** Mech-crabs have `hp: 2`, but take damage unconditionally from all weapon types without armor feedback, deflection, or phased visual states.
4. **Missing Energy Core Reveals in Sector 4:** Assault Behemoths have `hp: 4` with a static sprite; they lack armor shielding, vulnerability cycles, and core exposure mechanics.
5. **Rudimentary Boss Implementation in Sector 5:** The "Boss" is currently just a standard alien with 20 HP spawned in lane 2 row 0 on any stage 5. It possesses **no active deflector shield**, **no minion drone deployment**, **no core overload phases**, and **no multi-stage destruction sequence** (it disappears immediately upon reaching 0 HP).

This report outlines the existing code artifacts with precise file and line references, maps every gap against R2 requirements, defines the necessary data structures, and presents a concrete, modular implementation plan for Milestone 2.

---

## 2. Existing Codebase Audit & Line-by-Line Findings

### 2.1 Game State & Entity Modeling (`src/models/GameState.ts`)
* **Lines 3–5:**
  ```typescript
  export type AlienType = 'scout' | 'crab' | 'behemoth' | 'boss';
  export type BulletType = 'laser' | 'vspread' | 'plasma' | 'lightning';
  ```
  * *Observation:* Alien types are limited to 4 simple strings. No distinct types exist for minion drones, armored variants, or boss components.
* **Lines 6–19:**
  ```typescript
  export interface Alien {
    id: string;
    lane: number;
    x: number;
    y: number;
    type: AlienType;
    hp: number;
    maxHp: number;
    scoreValue: number;
    width: number;
    height: number;
    speed: number;
    isHitFlash: number;
  }
  ```
  * *Observation:* The `Alien` interface lacks fields required for R2 behaviors:
    - No horizontal oscillation fields (`baseX`, `zigzagFreq`, `zigzagAmp`, `zigzagTimer`).
    - No armor state (`armorPlating`, `coreRevealed`, `coreTimer`).
    - No boss phase state (`bossPhase`, `shieldActive`, `shieldHp`, `maxShieldHp`, `coreOverloadTimer`, `droneDeployTimer`, `destructionTimer`).
* **Lines 78–95:**
  * `sectorId` and `stageId` are stored, alongside `isBossStage: boolean` and `totalAliensWave: number`.
  * `marchTimer`, `marchInterval = 1.0`, `marchStepY = 12` control global alien cadence.

---

### 2.2 Wave Spawning & Formation Logic (`src/engine/GameEngine.ts`)
* **Lines 79–88 (`startStage`):**
  ```typescript
  this.state.sectorId = sector;
  this.state.stageId = stage;
  this.state.isBossStage = stage === 5;
  this.state.totalAliensWave = stage === 5 ? 20 : 12 + stage * 2;
  ```
  * *Observation:* Any stage 5 is treated as a boss stage, regardless of sector (Sector 1 Stage 5 spawns a boss just like Sector 5 Stage 5).
* **Lines 110–126 (`spawnAlienFormation`):**
  ```typescript
  private spawnAlienFormation(): void {
    const rows = this.state.isBossStage ? 4 : 3;
    const alienTypePool: ('scout' | 'crab' | 'behemoth')[] = ['scout', 'crab'];
    if (this.state.stageId >= 3) alienTypePool.push('behemoth');

    for (let r = 0; r < rows; r++) {
      for (let l = 0; l < 5; l++) {
        if (Math.random() < 0.2 && !this.state.isBossStage) continue;

        const type = this.state.isBossStage && r === 0 && l === 2
          ? 'boss'
          : alienTypePool[Math.floor(Math.random() * alienTypePool.length)];

        this.spawnAlienInLane(l, 35 + r * 44, type);
      }
    }
  }
  ```
  * *Critical Defect:* **`this.state.sectorId` is never referenced in `spawnAlienFormation()`!**
  * Sector 1, Sector 2, Sector 3, Sector 4, and Sector 5 all spawn the exact same grid formation.
* **Lines 128–155 (`spawnAlienInLane`):**
  * Static HP map: scout = 1, crab = 2, behemoth = 4, boss = 20.
  * Static sizes: scout 34x34, crab 40x36, behemoth 48x48, boss 96x72.
  * Static scores: 100, 200, 400, 2000.

---

### 2.3 Alien Movement & Descent Rhythm (`src/engine/GameEngine.ts`)
* **Lines 351–367 (`update` step 3):**
  ```typescript
  this.state.marchTimer += dt;
  const remainingRatio = Math.max(0.2, this.state.aliens.length / this.state.totalAliensWave);
  const currentMarchInterval = Math.max(0.35, 1.0 * remainingRatio);

  if (this.state.marchTimer >= currentMarchInterval) {
    this.state.marchTimer = 0;
    soundEngine.playAlienMarchNext();

    for (const alien of this.state.aliens) {
      alien.y += this.state.marchStepY;

      if (alien.y >= this.state.playerY) {
        this.handleAlienBreach(alien);
      }
    }
  }
  ```
  * *Critical Defect:* Aliens only move via discrete downward steps (`alien.y += marchStepY`).
  * `alien.x` is permanently fixed to `getLaneCenterX(lane)`.
  * There is no continuous horizontal motion, no zig-zag wave function, and no sector-specific speed escalation.

---

### 2.4 Collision Detection & Damage Resolution (`src/engine/GameEngine.ts`)
* **Lines 374–404 (`update` step 5):**
  ```typescript
  for (let j = this.state.aliens.length - 1; j >= 0; j--) {
    const alien = this.state.aliens[j];
    const dist = Math.hypot(b.x - alien.x, b.y - alien.y);
    const hitRadius = (alien.width + b.width) / 2;

    if (dist < hitRadius) {
      alien.hp -= b.damage;
      alien.isHitFlash = 0.15;
      bulletHit = true;
      this.spawnExplosionParticles(b.x, b.y, '#ffe600', 6);

      if (alien.hp <= 0) {
        this.handleAlienDefeated(alien, j);
      }
      break;
    }
  }
  ```
  * *Critical Defect:*
    - No shield interception: Boss takes full bullet damage even if shield is supposed to be active.
    - No core reveal multiplier: Behemoths and Boss take damage uniformly without requiring exposed core timing.
    - No armored deflection: Mech-crabs take standard damage immediately.

---

### 2.5 Boss Defeat & Lifecycle (`src/engine/GameEngine.ts`)
* **Lines 448–455 (`handleAlienDefeated`):**
  ```typescript
  private handleAlienDefeated(alien: Alien, index: number): void {
    this.state.aliens.splice(index, 1);
    this.state.aliensDefeated++;
    this.state.score += alien.scoreValue;
    soundEngine.playExplosion(alien.type === 'boss' ? 'boss' : alien.type === 'behemoth' ? 'large' : 'small');
    this.spawnExplosionParticles(alien.x, alien.y, alien.type === 'boss' ? '#ff6d00' : '#00f3ff', 20);
  }
  ```
  * *Critical Defect:*
    - Boss deletion is instantaneous upon reaching 0 HP.
    - No destruction sequence: no multi-stage explosions, no secondary blasts, no hull rupture, no delay before stage victory.

---

### 2.6 Alien Rendering & Visual Sprites (`src/engine/Renderer.ts` & `SpriteGenerator.ts`)
* **`Renderer.ts` (lines 113–160):**
  * Draws scout, crab, behemoth, and boss sprites.
  * For the boss, it passes `alien.hp > alien.maxHp * 0.5` as `shieldActive`:
    ```typescript
    sprite = SpriteGenerator.getDreadnoughtBoss(frame, alien.hp > alien.maxHp * 0.5);
    ```
    This is purely a cosmetic shield drawn around the boss sprite when HP > 50%. It has no gameplay defense effect.
  * Renders a small floating health bar for behemoths and bosses.
  * Lacks a prominent screen-top Boss HUD with Shield Bar and Phase Indicators.
* **`SpriteGenerator.ts` (lines 14–206):**
  * Excellent procedural art assets already implemented for:
    - `getCyberScout()`: Electric purple chassis, pink visor cyclops eye, dual thrusters (32x32).
    - `getMechCrab()`: Cyan exoskeleton, golden animated pinching claws (40x36).
    - `getAssaultBehemoth()`: Emerald green hull, golden armor shoulders, glowing chest core (48x48).
    - `getDreadnoughtBoss()`: Obsidian hull, magma circuits, central reactor, wing cannons, deflector shield ellipse (96x72).
  * High quality canvas generation, but needs variants for:
    - Behemoth (Armored Doors Closed vs Reactor Exposed).
    - Dreadnought Boss (Overload Core Flare, Phase 3 Damaged/Smoking Hull, Destruction Blast Stages).

---

### 2.7 Sector Progression & Star Map (`src/ui/StarMapModal.ts`)
* **Lines 10–16:**
  ```typescript
  export const SECTORS: SectorInfo[] = [
    { id: 1, name: 'Sector 1: Moon Base Alpha', subtitle: 'Recon Invasions & Basic Waves', icon: '🌑' },
    { id: 2, name: 'Sector 2: Asteroid Belt', subtitle: 'Rapid Cyber-Drone Swarms', icon: '☄️' },
    { id: 3, name: 'Sector 3: Mars Orbit', subtitle: 'Armored Mech-Crabs & Behemoths', icon: '🪐' },
    { id: 4, name: 'Sector 4: Jupiter Rings', subtitle: 'Dense Formations & High-Velocity Attacks', icon: '⚡' },
    { id: 5, name: 'Sector 5: Deep Space Nebula', subtitle: 'Ultimate Dreadnought Flagship Boss', icon: '🌌' }
  ];
  ```
  * *Observation:* Sector names and narrative subtitles already match the specification! The UI is ready for sector-specific gameplay.

---

## 3. Detailed Gap Analysis vs. Requirement 2 (R2)

| Requirement | Current State | Deficit & Architectural Gap | Severity |
| :--- | :--- | :--- | :--- |
| **Sector 1 (Moon Base Alpha):** Linear scouting drops with purple Cyber-Scout Drones | Generic mix of scouts and crabs spawned in static grid across all sectors | Sector 1 should feature pure/primary waves of purple Cyber-Scout Drones in clean linear drop formations with introductory pacing | **HIGH** |
| **Sector 2 (Asteroid Belt):** Rapid zig-zag swarms | Movement is 100% vertical stepping (`y += stepY`). `x` is static. No zig-zag motion exists. | Missing horizontal sinusoidal/erratic wave oscillation (`x = baseX + sin(t)*amp`), higher march velocity, and swarm wave patterns | **CRITICAL** |
| **Sector 3 (Mars Orbit):** Armored Mech-Crab Enforcers (multiple hits) | Mech-crab has 2 HP, but behaves like a generic alien; no armor deflection or distinct sound/visual feedback | Missing armored phalanx formations, heavy hit resistance, armored hit spark effects, and multi-hit durability tuning | **HIGH** |
| **Sector 4 (Jupiter Rings):** Heavy Assault Behemoths (energy core reveals) | Behemoth has static 4 HP with constant vulnerability and static sprite | Missing dynamic armor state machine: heavy armor deflection phase vs. pulsating exposed energy core vulnerability window | **CRITICAL** |
| **Sector 5 (Deep Nebula Boss):** Colossal multi-phase Mechanical Dreadnought Boss | 20 HP generic alien sitting in lane 2 row 0; no phases; dies immediately | Missing multi-phase state machine, active deflector shield, minion drone deployment, core overload vulnerability, and destruction sequence | **CRITICAL** |
| **Boss Active Energy Deflector Shield** | Purely a cosmetic circle drawn if HP > 50%; absorbs no damage | Bullets pass through and damage HP directly; no shield health pool, deflection sparks, or shield break event | **CRITICAL** |
| **Boss Minion Drone Deployment** | Zero drone spawning logic exists during boss battle | Boss does not spawn escort drones from wing bays during combat | **CRITICAL** |
| **Boss Core Overload Vulnerability** | No overload phase or vulnerability windows exist | Boss does not transition from shielded/invulnerable to exposed core state with visual alert and critical damage multiplier | **CRITICAL** |
| **Boss Spectacular Destruction Sequence** | Removed instantly in `handleAlienDefeated` upon HP <= 0 | Missing multi-stage death sequence (cascading hull explosions, white plasma flash, screen shake, slow-mo disintegration) | **CRITICAL** |

---

## 4. Proposed Data Architecture & New Interfaces

To implement Requirement 2 cleanly and maintain high performance (60 FPS on desktop and mobile), we propose extending `GameState.ts` and introducing a dedicated `SectorConfig` module.

### 4.1 Extended `Alien` Interface
```typescript
export type AlienType = 'scout' | 'crab' | 'behemoth' | 'boss' | 'minion_drone';

export interface Alien {
  id: string;
  lane: number;
  x: number;
  y: number;
  type: AlienType;
  hp: number;
  maxHp: number;
  scoreValue: number;
  width: number;
  height: number;
  speed: number;
  isHitFlash: number;

  // Sector 2: Zig-zag & Swarm Dynamics
  isZigzag?: boolean;
  baseX?: number;
  zigzagPhase?: number;
  zigzagSpeed?: number;
  zigzagAmplitude?: number;

  // Sector 3: Armored Enforcer Mechanics
  isArmored?: boolean;
  armorHitsRemaining?: number;

  // Sector 4: Behemoth Energy Core Reveal
  hasEnergyCore?: boolean;
  isCoreRevealed?: boolean;
  coreCycleTimer?: number;

  // Sector 5: Boss Dreadnought Mechanics
  isBoss?: boolean;
  bossPhase?: 1 | 2 | 3 | 'destruction';
  shieldActive?: boolean;
  shieldHp?: number;
  maxShieldHp?: number;
  coreOverloadTimer?: number;
  droneSpawnCooldown?: number;
  destructionTimer?: number;
}
```

### 4.2 Boss Entity State & Lifecycle Architecture
```typescript
export interface DreadnoughtBossState {
  phase: 1 | 2 | 3 | 'destruction' | 'dead';
  hp: number;
  maxHp: number;
  shieldActive: boolean;
  shieldHp: number;
  maxShieldHp: number;
  coreOverloaded: boolean;
  coreOverloadTimer: number;
  droneDeployTimer: number;
  droneDeployInterval: number;
  maxDronesInWave: number;
  destructionTimer: number;
  destructionDuration: number;
  explosionStep: number;
}
```

### 4.3 Sector Wave Configuration Table (`src/engine/SectorConfig.ts`)
```typescript
export interface WaveFormation {
  rows: number;
  typesByRow: AlienType[][];
  speedMultiplier: number;
  marchInterval: number;
  enableZigzag: boolean;
  behemothCoreCycle: boolean;
  bossBattle?: boolean;
}

export interface SectorDefinition {
  sectorId: number;
  name: string;
  subtitle: string;
  primaryType: AlienType;
  baseSpeed: number;
  baseMarchInterval: number;
  getStageWave(stage: number): WaveFormation;
}
```

---

## 5. Detailed Sector & Boss Implementation Blueprint

### 5.1 Sector 1: Moon Base Alpha (Linear Scouting Drops)
* **Wave Composition:**
  - Stages 1–4: Rows of purple Cyber-Scout Drones (`scout`, HP = 1).
  - Stage 5: Scout Fleet Commander formation (lead commander drone with flanking scout escorts).
* **Movement & Behavior:**
  - Steady, linear vertical march. No zig-zags.
  - Smooth reconnaissance drops where scout drones descend in clean vertical lanes.
  - Predictable, rhythmic tempo ideal for learning lane switching and virtual numpad combat.

### 5.2 Sector 2: Asteroid Belt (Rapid Zig-Zag Swarms)
* **Wave Composition:**
  - High-velocity swarms of agile cyber-drones and scout interceptors.
* **Movement & Behavior:**
  - Continuous sinusoidal horizontal flight:
    ```typescript
    alien.zigzagPhase += dt * alien.zigzagSpeed;
    alien.x = alien.baseX + Math.sin(alien.zigzagPhase) * alien.zigzagAmplitude;
    ```
  - Aliens weave across lane boundaries, forcing players to anticipate their trajectory and time shots accurately across lanes!
  - 30% faster march cadence (`marchInterval = 0.7s`).

### 5.3 Sector 3: Mars Orbit (Armored Mech-Crab Enforcers)
* **Wave Composition:**
  - Armored Mech-Crab Enforcers (`crab`, HP = 2 to 3) in front lines, defending light scouts behind them.
* **Armor & Durability Mechanics:**
  - Mech-Crabs have hardened cyan exoskeletons.
  - First hit cracks armor plating with metallic spark particles (`#00e5ff` / `#ffd600`) and distinct impact audio.
  - Second hit penetrates core and neutralizes the enforcer.
  - Heavier march sound effect (`playAlienMarchNext`) with clanking servo rhythm.

### 5.4 Sector 4: Jupiter Rings (Heavy Assault Behemoths & Core Reveals)
* **Wave Composition:**
  - Formations headed by Heavy Assault Behemoths (`behemoth`, HP = 6).
* **Energy Core Reveal Cycle:**
  - **Closed Armor State (3.0s):** Behemoth's heavy blast doors are sealed. Bullets hitting the hull deal only 1 damage or reflect off armor plates with heavy deflection sparks.
  - **Exposed Core State (2.0s):** Exhaust vents open, revealing the pulsating lime-green reactor core!
  - Attacks hitting the exposed core deal **2.5x critical damage**, triggering intense plasma discharge effects.
  - `SpriteGenerator.getAssaultBehemoth` receives `isCoreExposed: boolean` to render closed heavy armor vs. dazzling exposed energy core.

### 5.5 Sector 5: Deep Nebula Boss (The Mechanical Dreadnought Flagship)
* **Encounter Location:** Sector 5 Stage 5.
* **Entity Placement:** Colossal 96x72 dreadnought spanning center lanes (lanes 1, 2, 3) at top of canvas.
* **Total Health:** 60 HP (20 Shield HP + 40 Core HP).
* **Phase Breakdown:**

#### Phase 1: Active Deflector Shield & Minion Drone Deployment (100%–60% HP)
1. **Deflector Shield Online:** A shimmering elliptical energy barrier (`#bc13fe` / `#00f3ff`) surrounds the flagship (`shieldHp = 20`).
2. Player base shots and standard lasers bounce off or deal damage only to the shield pool.
3. **Minion Drone Launch:** Every 3.5 seconds, the Dreadnought deploys 2 fast cyber-drone minions (`minion_drone`, HP = 1) from its port and starboard wing hangars into lanes 1 and 3.
4. Players must divide attention between shooting down descending minion drones and blasting the deflector shield.
5. When `shieldHp` reaches 0, the deflector collapses with a loud electrical shockwave sound!

#### Phase 2: Core Overload Vulnerability & Retaliation (60%–25% HP)
1. **Reactor Overload Alert:** HUD flashes `⚠️ DREADNOUGHT REACTOR OVERLOAD — CORE EXPOSED!`.
2. Reactor vents ignite in magma orange and white heat. The central energy core is fully exposed.
3. **Vulnerability Window (6.0 seconds):** All player hits deal direct damage with 1.5x amplification!
4. Dreadnought fires retaliatory energy suppression or pulses shockwaves down active lanes.
5. If the boss is not defeated within the window, emergency shields reboot (`shieldHp = 10`), cycling the phase once more.

#### Phase 3: Enraged Critical Stand (25%–0% HP)
1. Hull plating is heavily charred; smoke and fire particles stream from both wing engines.
2. Deflector shields are permanently fried; the core is permanently exposed and violently pulsating.
3. Boss march interval accelerates (rapid descent / lane shifting), launching frantic minion drone waves.
4. Final salvoes breach the main reactor.

#### Phase 4: Spectacular Multi-Stage Destruction Sequence (0 HP)
1. Upon reaching 0 HP, normal alien descent halts, and the destruction state machine triggers:
   - **T+0.0s to T+0.8s (Hull Ruptures):** Rapid series of 6 localized secondary explosions across the wings and weapon pods (staggered explosion sound effects, orange fireball bursts).
   - **T+0.8s to T+1.8s (Reactor Meltdown):** Central core flashes blinding white (`#ffffff`), emitting an expanding shockwave ring across the canvas, camera screen shake.
   - **T+1.8s to T+2.8s (Catastrophic Disintegration):** Full dreadnought sprite shatters into 60+ multi-colored fiery debris particles (`#ff6d00`, `#ffd600`, `#00f3ff`).
   - **T+3.0s:** Epic victory fanfare plays, triggering the `VictoryDefeatModal` with special Sector 5 Grand Champion rewards (5 Diamonds, 500 Coins, 3 Stars)!

---

## 6. Rendering, HUD & Audio Enhancements Needed

### 6.1 Top Boss HUD Bar (`src/engine/Renderer.ts`)
* When an active boss is present:
  - Render a dedicated top-screen Boss Bar:
    - Title: `DREADNOUGHT TITAN CLASS — SECTOR 5`
    - Top Bar: Purple Shield Bar (`shieldHp / maxShieldHp`)
    - Bottom Bar: Red/Orange Hull Health Bar (`hp / maxHp`)
    - Phase Status Pill: `[SHIELDED]`, `[CORE OVERLOAD ⚠️]`, or `[CRITICAL 💥]`

### 6.2 Screen Shake & Visual Particle FX
* Add screen shake offset `(shakeX, shakeY)` to `Renderer.render()` when heavy explosions or boss core overloads occur.
* Add energy deflector ripple arcs when bullets strike the boss shield.

### 6.3 Sound Engine Additions (`src/engine/SoundEngine.ts`)
* `playShieldDeflect()`: High-tech energy buzz when deflector blocks a shot.
* `playCoreAlarm()`: Pulsing klaxon / alarm tone during Core Overload.
* `playBossDestructionCascade()`: Heavy sequence of deep reverberating thunder booms.

---

## 7. Implementation Roadmap & Milestones

| Step | Action Item | Target Files | Complexity |
| :---: | :--- | :--- | :---: |
| **Step 1** | Implement `SectorConfig.ts` with distinct wave patterns, speeds, and enemy compositions for Sectors 1–5. | `src/engine/SectorConfig.ts` (new) | Medium |
| **Step 2** | Extend `Alien` interface in `GameState.ts` with zigzag, armor, core reveal, and boss phase attributes. | `src/models/GameState.ts` | Low |
| **Step 3** | Implement Sector 2 zig-zag swarm flight math and collision updates in `GameEngine.update()`. | `src/engine/GameEngine.ts` | Medium |
| **Step 4** | Implement Sector 3 Mech-Crab armor durability and Sector 4 Behemoth energy core reveal cycles. | `src/engine/GameEngine.ts`, `SpriteGenerator.ts` | Medium |
| **Step 5** | Implement Sector 5 Dreadnought Boss multi-phase state machine (Deflector Shield, Drone Spawning, Core Overload, Destruction Sequence). | `src/engine/GameEngine.ts` | High |
| **Step 6** | Enhance `Renderer.ts` with Boss HUD Bar, shield effects, core flare visuals, screen shake, and death sequence. | `src/engine/Renderer.ts`, `SpriteGenerator.ts` | Medium |
| **Step 7** | Add supporting audio effects in `SoundEngine.ts` (shield deflect, core alarm, destruction thunder). | `src/engine/SoundEngine.ts` | Low |
| **Step 8** | Verify automated compilation (`npm run build`) and add comprehensive automated Playwright tests covering all 5 sectors and boss phases. | `tests/`, `package.json` | High |

---

## 8. Verification Strategy

1. **Static Analysis & Build Verification:**
   - Run `npm run build` (`tsc && vite build`) to verify 100% type safety with zero TypeScript compilation errors.
2. **Behavioral Wave Verification:**
   - Sector 1: Validate wave only spawns linear Cyber-Scouts.
   - Sector 2: Validate `alien.x` oscillates in horizontal sine wave pattern.
   - Sector 3: Validate Mech-Crabs require multiple hits and display armor hit sparks.
   - Sector 4: Validate Behemoth alternates between armored and vulnerable core states with 2.5x critical damage multiplier.
   - Sector 5: Validate Dreadnought Boss spawns on Stage 5, deflects damage during Shield phase, spawns minion drones, triggers Core Overload phase, and plays complete 3-second destruction sequence upon defeat.
3. **Automated Playwright QC:**
   - Execute headless browser tests launching each sector, validating DOM/HUD updates, and defeating the boss.
