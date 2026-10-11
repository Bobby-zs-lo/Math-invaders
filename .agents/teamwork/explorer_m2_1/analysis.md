# Architectural Blueprint & Analysis: Milestone 2
## Sector Configurations, Wave Formations & Multi-Phase Boss Battles

**Agent:** `explorer_m2_1`  
**Date:** 2026-10-10  
**Target Milestone:** Milestone 2 (Sector Configurations & Wave Spawning)  
**Parent Conversation ID:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Target Files:** `src/engine/SectorConfig.ts`, `src/models/GameState.ts`, `src/engine/GameEngine.ts`, `src/engine/Renderer.ts`, `src/engine/SpriteGenerator.ts`, `src/engine/SoundEngine.ts`

---

## 1. Executive Summary

Milestone 2 addresses Requirement 2 (R2) of the Math Invaders expansion: transforming the currently static, sector-agnostic grid waves into five distinctive planetary combat sectors, each featuring specialized enemy dynamics, escalating wave architectures across stages 1 through 5, and culminating in the epic multi-phase Mechanical Dreadnought Boss battle in Sector 5 Stage 5.

### Key Architectural Deliverables
1. **`src/engine/SectorConfig.ts`**: A dedicated configuration engine defining exact sector profiles, flight models, mechanic toggles, and deterministic 5-lane formation grids for all 25 game stages (5 sectors $\times$ 5 stages).
2. **Dynamic Planetary Mechanics**:
   - **Sector 1 (Moon Base Alpha)**: Pure linear scouting drops with purple Cyber-Scout Drones at brisk baseline descent tempo.
   - **Sector 2 (Asteroid Belt)**: Sinusoidal zig-zag swarm flight models weaving continuously across lane boundaries.
   - **Sector 3 (Mars Orbit)**: Armored Mech-Crab Enforcers with multi-hit durability, hardened carapace absorption, and metallic spark deflection feedback.
   - **Sector 4 (Jupiter Rings)**: Heavy Assault Behemoths with dynamic Energy Core Reveal vulnerability cycles (concealed heavy armor vs. exposed core with 2.5x critical damage).
   - **Sector 5 (Deep Space Nebula)**: Escalating elite fleet combinations culminating in the 4-phase Mechanical Dreadnought Flagship Boss in Stage 5.
3. **`GameEngine.ts` Integration**: Refactored `startStage()` and `spawnAlienFormation()` consuming `SectorConfig.ts`, updating frame physics for zig-zag oscillation, core cycle timers, boss phase transitions, minion drone deployment, and the 3-second multi-stage destruction sequence.

---

## 2. Sector Profiles & Mechanical Specifications

### Sector 1: Moon Base Alpha
* **Thematic Identity:** Lunar surface recon outpost facing introductory alien drops.
* **Primary Enemy:** Purple Cyber-Scout Drones (`scout`, HP = 1, Score = 100, Size = 34x34).
* **Flight & Descent Physics:**
  - Strictly linear vertical drops (`isZigzag = false`).
  - Baseline march rhythm: `marchInterval = 0.95s` down to `0.72s`, `marchStepY = 12` to `15px`.
  - Predictable rhythmic cadence ideal for mastering 5-lane keyboard/click navigation and early math problem solving.
* **Stage Escalation:**
  - Stage 1-1: 2 rows (5 scouts in alternating lanes; total 8).
  - Stage 1-2: 3 rows (8 scouts in staggered formation; total 12).
  - Stage 1-3: 3 rows (10 scouts + 1 center Crab enforcer; total 14).
  - Stage 1-4: 4 rows (12 scouts + 3 Crab escorts; total 16).
  - Stage 1-5 (Climax): Scout Commander Vanguard (Lead Commander Crab with escort scout wings; total 18).

### Sector 2: Asteroid Belt
* **Thematic Identity:** Dense asteroid corridor swarming with agile, hyper-velocity drones.
* **Primary Enemy:** Swarm Cyber-Scouts (`scout` with `isZigzag = true`).
* **Flight & Descent Physics:**
  - Continuous horizontal sinusoidal flight:
    $$x(t) = \text{baseX} + \sin(\omega t + \phi) \cdot A$$
    where $\omega = \text{zigzagFreq}$ (2.5 to 3.6 rad/s) and $A = \text{zigzagAmp}$ (18 to 32 pixels).
  - High march cadence: `marchInterval = 0.75s` down to `0.52s`.
  - Weaving across lane boundaries forces players to lead shots and anticipate flight paths across adjacent lanes.
* **Stage Escalation:**
  - Stage 2-1: 2 rows of oscillating scouts ($A = 18\text{px}$, $\omega = 2.5\text{ rad/s}$; total 10).
  - Stage 2-2: 3 rows ($A = 22\text{px}$, $\omega = 2.8\text{ rad/s}$; total 13).
  - Stage 2-3: 3 rows with flanking crabs ($A = 26\text{px}$, $\omega = 3.0\text{ rad/s}$; total 15).
  - Stage 2-4: 4 rows of hyper-swarming drones ($A = 28\text{px}$, $\omega = 3.2\text{ rad/s}$; total 18).
  - Stage 2-5 (Climax): "Hyper-Velocity Swarm Storm" ($A = 32\text{px}$, $\omega = 3.6\text{ rad/s}$, 0.52s march interval; total 20).

### Sector 3: Mars Orbit
* **Thematic Identity:** Heavy planetary blockade defended by hardened robotic legions.
* **Primary Enemy:** Armored Mech-Crab Enforcers (`crab`, HP = 3, Size = 40x36, Score = 200).
* **Armor & Durability Mechanics:**
  - Hardened cyan exoskeleton plating (`isArmored = true`, `armorHitsRemaining = 1`).
  - First hit deflects off the armor: absorbs damage, shatters outer carapace, emits `#00e5ff` / `#ffd600` sparks, and plays metallic clank sound.
  - Subsequent hits damage unarmored chassis (HP 2 $\to$ 0).
  - Heavy march cadence: `marchInterval = 0.88s` down to `0.75s`, `marchStepY = 11` to `12px`.
* **Stage Escalation:**
  - Stage 3-1: 2 rows (front row armored crabs, back row scouts; total 12).
  - Stage 3-2: 3 rows (front 2 rows armored crabs, back row scouts; total 14).
  - Stage 3-3: 3 rows with vanguard Behemoth shielded behind armored crabs (total 16).
  - Stage 3-4: 4 rows (dense armored phalanx defending dual Behemoths; total 18).
  - Stage 3-5 (Climax): "Iron Phalanx Fortress" (triple armored crab lines leading assault; total 20).

### Sector 4: Jupiter Rings
* **Thematic Identity:** Gas giant radiation storms guarded by colossal siege titans.
* **Primary Enemy:** Heavy Assault Behemoths (`behemoth`, HP = 6, Size = 48x48, Score = 400).
* **Energy Core Reveal Mechanics:**
  - `hasEnergyCore = true`.
  - Alternates cyclically:
    * **Concealed Phase (3.0s)**: Heavy emerald blast doors sealed (`isCoreRevealed = false`). Hits deal reduced damage (50% or flat 1) with heavy deflection sparks.
    * **Exposed Core Phase (2.0s)**: Blast doors retract, chest reactor core glows pulsating lime/emerald (`isCoreRevealed = true`). Hits during this window deal **2.5x critical damage** (e.g. 5 damage from standard laser, 12+ from plasma/amplified salvo), emitting brilliant `#76ff03` plasma discharge.
  - Heavy march cadence: `marchInterval = 1.05s` down to `0.85s`, `marchStepY = 10` to `11px`.
* **Stage Escalation:**
  - Stage 4-1: 3 rows (1 center Behemoth flanked by crabs and scouts; total 14).
  - Stage 4-2: 3 rows (2 Behemoths in lanes 1 & 3; total 16).
  - Stage 4-3: 4 rows (3 Behemoths in front line; total 18).
  - Stage 4-4: 4 rows (3 Behemoths flanked by heavy armored crabs; total 20).
  - Stage 4-5 (Climax): "Dual Titan Siege" (4 Behemoths leading a massive armada; total 22).

### Sector 5: Deep Space Nebula
* **Thematic Identity:** Void abyss containing the alien invasion armada's flagship.
* **Primary Enemy:** Elite hybrid fleet across Stages 1–4, culminating in the colossal Dreadnought Boss in Stage 5.
* **Stage Escalation (Stages 1–4):**
  - Stage 5-1: Elite Recon Vanguard (zig-zag scouts + armored crabs; total 15).
  - Stage 5-2: Battle Fleet (zig-zag scouts + armored crabs + 2 core-revealing Behemoths; total 17).
  - Stage 5-3: Tri-Formation Armada (rapid swarms + heavy armored crabs + 3 Behemoths; total 19).
  - Stage 5-4: Dreadnought Vanguard Escort (dense 4-row elite fleet; total 22).
* **Stage 5-5: The Mechanical Dreadnought Boss Battle:**
  - **Entity Properties:** Colossal 96x72 dreadnought spanning center lanes (lanes 1, 2, 3) at top of canvas (`y = 65`).
  - **Total Hit Points:** 60 HP (20 Deflector Shield HP + 40 Reactor Core HP).
  - **Phase 1: Active Energy Deflector Shield & Minion Drones (100%–60% HP)**:
    * Shimmering elliptical purple deflector shield (`#bc13fe`, `shieldHp = 20`).
    * Direct attacks damage shield only. Bullet strikes trigger purple ripple arcs and deflection sound.
    * Every 3.5s, deploys 2 fast minion drones (`minion_drone`, HP = 1, rapid descent) from port/starboard wing bays into lanes 1 and 3.
    * At `shieldHp <= 0`, shield collapses with violent electrical shockwave!
  - **Phase 2: Core Overload Vulnerability & Retaliation (60%–25% HP)**:
    * Alert banners HUD: `⚠️ DREADNOUGHT REACTOR OVERLOAD — CORE EXPOSED!`.
    * Central reactor core glows white/magma orange; 6.0-second vulnerability window.
    * Attacks deal **1.5x amplified damage**!
    * If not defeated or brought to 25% within 6.0s, emergency reboot restores shield (`shieldHp = 10`), cycling back.
  - **Phase 3: Enraged Critical Stand (25%–0% HP)**:
    * Hull charred, smoke and fire particles stream continuously from both wings.
    * Shields permanently destroyed; reactor core permanently exposed and violently pulsating.
    * March interval drops to 0.60s; rapid drone deployments every 2.0s.
  - **Phase 4: Spectacular Multi-Stage Destruction Sequence (0 HP)**:
    * Triggered immediately upon HP reaching 0; normal descent and gameplay halt.
    * Duration: 3.0 seconds:
      - **T+0.0s to 0.8s (Hull Ruptures):** 6 localized secondary explosions across wings and weapon pods (staggered booms, orange fireball bursts).
      - **T+0.8s to 1.8s (Reactor Meltdown):** Central core flashes blinding white (`#ffffff`), expanding shockwave ring across canvas, camera screen shake.
      - **T+1.8s to 2.8s (Catastrophic Disintegration):** Full dreadnought sprite shatters into 60+ fiery debris particles (`#ff6d00`, `#ffd600`, `#00f3ff`).
      - **T+3.0s:** Epic victory fanfare plays, triggering `VictoryDefeatModal` with Grand Champion rewards (5 Diamonds, 500 Coins, 3 Stars).

---

## 3. Comprehensive Sector & Stage Configuration Matrix

Below is the complete specification for all 25 game stages across the 5 sectors:

| Sector | Stage | Name / Profile | Rows | Total Aliens | March Interval | Step Y | Zigzag? (Freq, Amp) | Armor? | Core Reveal? | Boss Type | Initial Formation Grid |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **S1** | 1 | Lunar Outpost Recon | 2 | 8 | 0.95s | 12 | No | No | No | none | R0: `[., S, ., S, .]`<br>R1: `[S, ., S, ., S]` |
| **S1** | 2 | Scouting Sweep | 3 | 12 | 0.90s | 12 | No | No | No | none | R0: `[S, ., S, ., S]`<br>R1: `[., S, S, S, .]`<br>R2: `[S, S, ., S, S]` |
| **S1** | 3 | Drone Escort Entry | 3 | 14 | 0.85s | 13 | No | No | No | none | R0: `[S, S, C, S, S]`<br>R1: `[S, S, S, S, S]`<br>R2: `[., S, S, S, .]` |
| **S1** | 4 | Forward Enforcer Patrol | 4 | 16 | 0.80s | 14 | No | No | No | none | R0: `[C, S, C, S, C]`<br>R1: `[S, S, S, S, S]`<br>R2: `[S, S, S, S, S]`<br>R3: `[., S, ., S, .]` |
| **S1** | 5 | Scout Fleet Commander | 4 | 18 | 0.72s | 15 | No | No | No | commander | R0: `[., S, C, S, .]`<br>R1: `[S, C, S, C, S]`<br>R2: `[S, S, S, S, S]`<br>R3: `[S, S, S, S, S]` |
| **S2** | 1 | Asteroid Drone Influx | 2 | 10 | 0.75s | 12 | Yes (2.5, 18) | No | No | none | R0: `[S, S, S, S, S]`<br>R1: `[., S, S, S, .]` |
| **S2** | 2 | Sinusoidal Drift Swarm | 3 | 13 | 0.70s | 12 | Yes (2.8, 22) | No | No | none | R0: `[S, S, C, S, S]`<br>R1: `[S, S, S, S, S]`<br>R2: `[., S, S, S, .]` |
| **S2** | 3 | Dense Belt Weavers | 3 | 15 | 0.65s | 13 | Yes (3.0, 26) | No | No | none | R0: `[C, S, C, S, C]`<br>R1: `[S, S, S, S, S]`<br>R2: `[S, S, S, S, S]` |
| **S2** | 4 | Hyper-Frequency Incursion | 4 | 18 | 0.60s | 14 | Yes (3.2, 28) | No | No | none | R0: `[S, C, S, C, S]`<br>R1: `[S, S, S, S, S]`<br>R2: `[S, S, S, S, S]`<br>R3: `[., S, S, S, .]` |
| **S2** | 5 | Hyper-Velocity Swarm Storm | 4 | 20 | 0.52s | 14 | Yes (3.6, 32) | No | No | none | R0: `[S, S, C, S, S]`<br>R1: `[S, S, S, S, S]`<br>R2: `[S, S, S, S, S]`<br>R3: `[S, S, S, S, S]` |
| **S3** | 1 | Martian Vanguard | 2 | 12 | 0.88s | 11 | No | Yes (1 hit) | No | none | R0: `[C, C, C, C, C]`<br>R1: `[S, S, S, S, S]` |
| **S3** | 2 | Armored Enforcer Line | 3 | 14 | 0.85s | 11 | No | Yes (1 hit) | No | none | R0: `[C, C, C, C, C]`<br>R1: `[S, C, S, C, S]`<br>R2: `[S, S, S, S, S]` |
| **S3** | 3 | Reinforced Orbital Gate | 3 | 16 | 0.82s | 12 | No | Yes (1 hit) | No | none | R0: `[C, C, B, C, C]`<br>R1: `[C, S, C, S, C]`<br>R2: `[S, S, S, S, S]` |
| **S3** | 4 | Heavy Mechanized Front | 4 | 18 | 0.78s | 12 | No | Yes (1 hit) | No | none | R0: `[C, C, C, C, C]`<br>R1: `[C, B, C, B, C]`<br>R2: `[C, C, C, C, C]`<br>R3: `[S, S, S, S, S]` |
| **S3** | 5 | Iron Phalanx Fortress | 4 | 20 | 0.75s | 12 | No | Yes (1 hit) | No | none | R0: `[C, C, C, C, C]`<br>R1: `[C, C, C, C, C]`<br>R2: `[C, B, C, B, C]`<br>R3: `[S, S, S, S, S]` |
| **S4** | 1 | Jovian Radiation Ingress | 3 | 14 | 1.05s | 10 | No | No | Yes (3s/2s) | none | R0: `[C, S, B, S, C]`<br>R1: `[S, C, S, C, S]`<br>R2: `[S, S, S, S, S]` |
| **S4** | 2 | Twin Behemoth Battery | 3 | 16 | 1.00s | 10 | No | No | Yes (3s/2s) | none | R0: `[C, B, C, B, C]`<br>R1: `[C, C, S, C, C]`<br>R2: `[S, S, S, S, S]` |
| **S4** | 3 | Ring Siege Fleet | 4 | 18 | 0.95s | 11 | No | No | Yes (3s/2s) | none | R0: `[B, C, B, C, B]`<br>R1: `[C, C, C, C, C]`<br>R2: `[S, S, S, S, S]`<br>R3: `[S, S, S, S, S]` |
| **S4** | 4 | Heavy Armored Core Battery | 4 | 20 | 0.90s | 11 | No | Yes | Yes (3s/2s) | none | R0: `[C, B, B, B, C]`<br>R1: `[C, C, C, C, C]`<br>R2: `[S, C, S, C, S]`<br>R3: `[S, S, S, S, S]` |
| **S4** | 5 | Dual Titan Siege | 4 | 22 | 0.85s | 11 | No | Yes | Yes (3s/2s) | none | R0: `[B, C, B, C, B]`<br>R1: `[C, B, C, B, C]`<br>R2: `[C, C, C, C, C]`<br>R3: `[S, S, S, S, S]` |
| **S5** | 1 | Nebula Recon Armada | 3 | 15 | 0.78s | 12 | Yes (3.0, 20) | Yes | No | none | R0: `[C, S, C, S, C]`<br>R1: `[S, S, S, S, S]`<br>R2: `[S, S, S, S, S]` |
| **S5** | 2 | Heavy Assault Battlegroup | 3 | 17 | 0.74s | 12 | Yes (3.0, 22) | Yes | Yes (3s/2s) | none | R0: `[C, B, C, B, C]`<br>R1: `[S, C, S, C, S]`<br>R2: `[S, S, S, S, S]` |
| **S5** | 3 | Tri-Formation Armada | 4 | 19 | 0.70s | 13 | Yes (3.2, 24) | Yes | Yes (3s/2s) | none | R0: `[B, C, B, C, B]`<br>R1: `[C, S, C, S, C]`<br>R2: `[S, S, S, S, S]`<br>R3: `[S, S, S, S, S]` |
| **S5** | 4 | Dreadnought Vanguard Escort | 4 | 22 | 0.65s | 13 | Yes (3.4, 26) | Yes | Yes (3s/2s) | none | R0: `[C, B, B, B, C]`<br>R1: `[C, C, C, C, C]`<br>R2: `[S, C, S, C, S]`<br>R3: `[S, S, S, S, S]` |
| **S5** | 5 | **Dreadnought Titan Boss** | 3 | 25 | 0.90s | 8 | No | Yes | Yes | **dreadnought** | R0: `[., ., Boss, ., .]`<br>R1: `[C, ., ., ., C]`<br>R2: `[., S, ., S, .]` |

*(Key: `S` = scout, `C` = crab, `B` = behemoth, `Boss` = dreadnought boss, `.` = empty cell)*

---

## 4. Concrete Code Blueprint: `src/engine/SectorConfig.ts`

The complete, strongly-typed source code implementation for `src/engine/SectorConfig.ts`:

```typescript
import { AlienType } from '../models/GameState';

export interface StageWaveConfig {
  stageId: number;
  name: string;
  rows: number;
  totalAliens: number;
  marchInterval: number;
  marchStepY: number;
  baseSpeed: number;
  enableZigzag: boolean;
  zigzagFrequency?: number;
  zigzagAmplitude?: number;
  enableArmor: boolean;
  enableCoreReveal: boolean;
  coreConcealedDuration?: number;
  coreRevealedDuration?: number;
  isBossStage: boolean;
  bossType?: 'dreadnought' | 'commander' | 'none';
  formationGrid: (AlienType | null)[][];
}

export interface SectorConfig {
  sectorId: number;
  name: string;
  subtitle: string;
  description: string;
  accentColor: string;
  primaryAlienType: AlienType;
  stages: Record<number, StageWaveConfig>;
}

export const SECTOR_CONFIGS: Record<number, SectorConfig> = {
  1: {
    sectorId: 1,
    name: 'Sector 1: Moon Base Alpha',
    subtitle: 'Recon Invasions & Basic Waves',
    description: 'Lunar surface scouting drops with purple Cyber-Scout Drones. Fast baseline descent.',
    accentColor: '#bc13fe',
    primaryAlienType: 'scout',
    stages: {
      1: {
        stageId: 1,
        name: 'Lunar Outpost Recon',
        rows: 2,
        totalAliens: 8,
        marchInterval: 0.95,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          [null, 'scout', null, 'scout', null],
          ['scout', null, 'scout', null, 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Scouting Sweep',
        rows: 3,
        totalAliens: 12,
        marchInterval: 0.90,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', null, 'scout', null, 'scout'],
          [null, 'scout', 'scout', 'scout', null],
          ['scout', 'scout', null, 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Drone Escort Entry',
        rows: 3,
        totalAliens: 14,
        marchInterval: 0.85,
        marchStepY: 13,
        baseSpeed: 16,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'scout', 'crab', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      4: {
        stageId: 4,
        name: 'Forward Enforcer Patrol',
        rows: 4,
        totalAliens: 16,
        marchInterval: 0.80,
        marchStepY: 14,
        baseSpeed: 16,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', null, 'scout', null]
        ]
      },
      5: {
        stageId: 5,
        name: 'Scout Fleet Commander',
        rows: 4,
        totalAliens: 18,
        marchInterval: 0.72,
        marchStepY: 15,
        baseSpeed: 18,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          [null, 'scout', 'crab', 'scout', null],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  2: {
    sectorId: 2,
    name: 'Sector 2: Asteroid Belt',
    subtitle: 'Rapid Cyber-Drone Swarms',
    description: 'Rapid zig-zag swarms. High march frequency, sinusoidal horizontal movement.',
    accentColor: '#00f3ff',
    primaryAlienType: 'scout',
    stages: {
      1: {
        stageId: 1,
        name: 'Asteroid Drone Influx',
        rows: 2,
        totalAliens: 10,
        marchInterval: 0.75,
        marchStepY: 12,
        baseSpeed: 18,
        enableZigzag: true,
        zigzagFrequency: 2.5,
        zigzagAmplitude: 18,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      2: {
        stageId: 2,
        name: 'Sinusoidal Drift Swarm',
        rows: 3,
        totalAliens: 13,
        marchInterval: 0.70,
        marchStepY: 12,
        baseSpeed: 18,
        enableZigzag: true,
        zigzagFrequency: 2.8,
        zigzagAmplitude: 22,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'scout', 'crab', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      3: {
        stageId: 3,
        name: 'Dense Belt Weavers',
        rows: 3,
        totalAliens: 15,
        marchInterval: 0.65,
        marchStepY: 13,
        baseSpeed: 20,
        enableZigzag: true,
        zigzagFrequency: 3.0,
        zigzagAmplitude: 26,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Hyper-Frequency Incursion',
        rows: 4,
        totalAliens: 18,
        marchInterval: 0.60,
        marchStepY: 14,
        baseSpeed: 22,
        enableZigzag: true,
        zigzagFrequency: 3.2,
        zigzagAmplitude: 28,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      5: {
        stageId: 5,
        name: 'Hyper-Velocity Swarm Storm',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.52,
        marchStepY: 14,
        baseSpeed: 24,
        enableZigzag: true,
        zigzagFrequency: 3.6,
        zigzagAmplitude: 32,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          ['scout', 'scout', 'crab', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  3: {
    sectorId: 3,
    name: 'Sector 3: Mars Orbit',
    subtitle: 'Armored Mech-Crabs & Behemoths',
    description: 'Armored Mech-Crab Enforcers requiring multiple hits. Tougher front lines.',
    accentColor: '#00e5ff',
    primaryAlienType: 'crab',
    stages: {
      1: {
        stageId: 1,
        name: 'Martian Vanguard',
        rows: 2,
        totalAliens: 12,
        marchInterval: 0.88,
        marchStepY: 11,
        baseSpeed: 14,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Armored Enforcer Line',
        rows: 3,
        totalAliens: 14,
        marchInterval: 0.85,
        marchStepY: 11,
        baseSpeed: 14,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Reinforced Orbital Gate',
        rows: 3,
        totalAliens: 16,
        marchInterval: 0.82,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'behemoth', 'crab', 'crab'],
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Heavy Mechanized Front',
        rows: 4,
        totalAliens: 18,
        marchInterval: 0.78,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      5: {
        stageId: 5,
        name: 'Iron Phalanx Fortress',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.75,
        marchStepY: 12,
        baseSpeed: 16,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: false,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  4: {
    sectorId: 4,
    name: 'Sector 4: Jupiter Rings',
    subtitle: 'Dense Formations & High-Velocity Attacks',
    description: 'Heavy Assault Behemoths with energy core reveals. Slow, tanky with vulnerable cycles.',
    accentColor: '#00e676',
    primaryAlienType: 'behemoth',
    stages: {
      1: {
        stageId: 1,
        name: 'Jovian Radiation Ingress',
        rows: 3,
        totalAliens: 14,
        marchInterval: 1.05,
        marchStepY: 10,
        baseSpeed: 12,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'behemoth', 'scout', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Twin Behemoth Battery',
        rows: 3,
        totalAliens: 16,
        marchInterval: 1.00,
        marchStepY: 10,
        baseSpeed: 12,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['crab', 'crab', 'scout', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Ring Siege Fleet',
        rows: 4,
        totalAliens: 18,
        marchInterval: 0.95,
        marchStepY: 11,
        baseSpeed: 13,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['behemoth', 'crab', 'behemoth', 'crab', 'behemoth'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Heavy Armored Core Battery',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.90,
        marchStepY: 11,
        baseSpeed: 13,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'behemoth', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      5: {
        stageId: 5,
        name: 'Dual Titan Siege',
        rows: 4,
        totalAliens: 22,
        marchInterval: 0.85,
        marchStepY: 11,
        baseSpeed: 14,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          ['behemoth', 'crab', 'behemoth', 'crab', 'behemoth'],
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  5: {
    sectorId: 5,
    name: 'Sector 5: Deep Space Nebula',
    subtitle: 'Ultimate Dreadnought Flagship Boss',
    description: 'Escalating elite fleet culminating in Sector 5 Stage 5 colossal Dreadnought Boss.',
    accentColor: '#ff6d00',
    primaryAlienType: 'boss',
    stages: {
      1: {
        stageId: 1,
        name: 'Nebula Recon Armada',
        rows: 3,
        totalAliens: 15,
        marchInterval: 0.78,
        marchStepY: 12,
        baseSpeed: 16,
        enableZigzag: true,
        zigzagFrequency: 3.0,
        zigzagAmplitude: 20,
        enableArmor: true,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Heavy Assault Battlegroup',
        rows: 3,
        totalAliens: 17,
        marchInterval: 0.74,
        marchStepY: 12,
        baseSpeed: 17,
        enableZigzag: true,
        zigzagFrequency: 3.0,
        zigzagAmplitude: 22,
        enableArmor: true,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Tri-Formation Armada',
        rows: 4,
        totalAliens: 19,
        marchInterval: 0.70,
        marchStepY: 13,
        baseSpeed: 18,
        enableZigzag: true,
        zigzagFrequency: 3.2,
        zigzagAmplitude: 24,
        enableArmor: true,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['behemoth', 'crab', 'behemoth', 'crab', 'behemoth'],
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Dreadnought Vanguard Escort',
        rows: 4,
        totalAliens: 22,
        marchInterval: 0.65,
        marchStepY: 13,
        baseSpeed: 19,
        enableZigzag: true,
        zigzagFrequency: 3.4,
        zigzagAmplitude: 26,
        enableArmor: true,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'behemoth', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      5: {
        stageId: 5,
        name: 'Mechanical Dreadnought Titan',
        rows: 3,
        totalAliens: 25,
        marchInterval: 0.90,
        marchStepY: 8,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: true,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: true,
        bossType: 'dreadnought',
        formationGrid: [
          [null, null, 'boss', null, null],
          ['crab', null, null, null, 'crab'],
          [null, 'scout', null, 'scout', null]
        ]
      }
    }
  }
};

export function getSectorConfig(sectorId: number): SectorConfig {
  return SECTOR_CONFIGS[sectorId] || SECTOR_CONFIGS[1];
}

export function getStageWaveConfig(sectorId: number, stageId: number): StageWaveConfig {
  const sector = getSectorConfig(sectorId);
  return sector.stages[stageId] || sector.stages[1];
}

export function getAllSectorConfigs(): SectorConfig[] {
  return Object.values(SECTOR_CONFIGS);
}
```

---

## 5. Extended Entity Modeling: `src/models/GameState.ts`

To support these dynamic mechanics, `AlienType` and the `Alien` interface in `src/models/GameState.ts` must be extended:

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

  // Sector 2: Sinusoidal Zig-Zag Swarm Movement
  isZigzag?: boolean;
  baseX?: number;
  zigzagPhase?: number;
  zigzagFreq?: number;
  zigzagAmp?: number;

  // Sector 3: Armored Enforcer Mechanics
  isArmored?: boolean;
  armorHitsRemaining?: number;

  // Sector 4: Behemoth Energy Core Reveal Mechanics
  hasEnergyCore?: boolean;
  isCoreRevealed?: boolean;
  coreCycleTimer?: number;
  coreConcealedDuration?: number;
  coreRevealedDuration?: number;

  // Sector 5: Colossal Dreadnought Boss Multi-Phase Mechanics
  isBoss?: boolean;
  bossPhase?: 1 | 2 | 3 | 'destruction';
  shieldActive?: boolean;
  shieldHp?: number;
  maxShieldHp?: number;
  coreOverloadTimer?: number;
  droneSpawnTimer?: number;
  droneSpawnInterval?: number;
  destructionTimer?: number;
  destructionStep?: number;
}
```

---

## 6. `GameEngine.ts` Integration Blueprint

### 6.1 Refactoring `startStage()`
In `GameEngine.ts`:
```typescript
import { getStageWaveConfig, StageWaveConfig } from './SectorConfig';

public startStage(sector: number, stage: number): void {
  const waveConfig = getStageWaveConfig(sector, stage);
  this.state = new GameState();
  this.state.sectorId = sector;
  this.state.stageId = stage;
  this.state.isBossStage = waveConfig.isBossStage;
  this.state.totalAliensWave = waveConfig.totalAliens;
  this.state.marchInterval = waveConfig.marchInterval;
  this.state.marchStepY = waveConfig.marchStepY;
  this.state.aliensDefeated = 0;
  this.state.isRunning = true;
  this.state.isPaused = false;
  this.state.stageStartTime = performance.now();

  this.resizeCanvas();

  for (let l = 0; l < 5; l++) {
    this.state.laneProblems[l] = this.mathEngine.generateProblemForLane(l);
  }
  this.selectLane(2);

  this.activeUpgradeProblem = this.mathEngine.generateUpgradeProblem();
  this.notifyUpgradeStatus();

  this.spawnAlienFormation();

  this.lastTime = performance.now();
  cancelAnimationFrame(this.animId);
  this.animId = requestAnimationFrame(t => this.gameLoop(t));
}
```

### 6.2 Refactoring `spawnAlienFormation()`
Replace the generic random loop with sector-aware formation spawning:
```typescript
private spawnAlienFormation(): void {
  const waveConfig = getStageWaveConfig(this.state.sectorId, this.state.stageId);
  const grid = waveConfig.formationGrid;

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let l = 0; l < 5; l++) {
      const type = row[l];
      if (!type) continue;
      this.spawnConfiguredAlien(l, 35 + r * 44, type, waveConfig);
    }
  }
}
```

### 6.3 Helper: `spawnConfiguredAlien()`
```typescript
private spawnConfiguredAlien(
  lane: number,
  yPos: number,
  type: AlienType,
  waveConfig: StageWaveConfig
): void {
  const x = this.state.getLaneCenterX(lane);
  const hpMap: Record<AlienType, number> = {
    scout: 1,
    crab: 2,
    behemoth: 6,
    boss: 40,
    minion_drone: 1
  };
  const scoreMap: Record<AlienType, number> = {
    scout: 100,
    crab: 200,
    behemoth: 400,
    boss: 3000,
    minion_drone: 75
  };
  const sizeMap: Record<AlienType, { w: number; h: number }> = {
    scout: { w: 34, h: 34 },
    crab: { w: 40, h: 36 },
    behemoth: { w: 48, h: 48 },
    boss: { w: 96, h: 72 },
    minion_drone: { w: 26, h: 26 }
  };

  const alien: Alien = {
    id: 'alien_' + Math.random().toString(36).substring(2, 8),
    lane,
    x,
    y: yPos,
    type,
    hp: hpMap[type],
    maxHp: hpMap[type],
    scoreValue: scoreMap[type],
    width: sizeMap[type].w,
    height: sizeMap[type].h,
    speed: waveConfig.baseSpeed,
    isHitFlash: 0
  };

  // Sector 2: Zigzag Swarm Movement
  if (waveConfig.enableZigzag && (type === 'scout' || type === 'minion_drone')) {
    alien.isZigzag = true;
    alien.baseX = x;
    alien.zigzagPhase = Math.random() * Math.PI * 2;
    alien.zigzagFreq = waveConfig.zigzagFrequency ?? 3.0;
    alien.zigzagAmp = waveConfig.zigzagAmplitude ?? 24;
  }

  // Sector 3: Armored Enforcers
  if (type === 'crab' && waveConfig.enableArmor) {
    alien.isArmored = true;
    alien.armorHitsRemaining = 1;
    alien.hp = 3;
    alien.maxHp = 3;
  }

  // Sector 4: Energy Core Reveals
  if (type === 'behemoth' && waveConfig.enableCoreReveal) {
    alien.hasEnergyCore = true;
    alien.isCoreRevealed = false;
    alien.coreCycleTimer = 0;
    alien.coreConcealedDuration = waveConfig.coreConcealedDuration ?? 3.0;
    alien.coreRevealedDuration = waveConfig.coreRevealedDuration ?? 2.0;
  }

  // Sector 5: Colossal Dreadnought Boss
  if (type === 'boss') {
    alien.isBoss = true;
    alien.bossPhase = 1;
    alien.shieldActive = true;
    alien.shieldHp = 20;
    alien.maxShieldHp = 20;
    alien.droneSpawnTimer = 0;
    alien.droneSpawnInterval = 3.5;
    alien.coreOverloadTimer = 0;
    alien.destructionTimer = 0;
    alien.destructionStep = 0;
  }

  this.state.aliens.push(alien);
}
```

### 6.4 Frame Physics & Entity State Machine in `update(dt)`
In `update(dt)`:
```typescript
// A. Update Zigzag Horizontal Oscillation
for (const alien of this.state.aliens) {
  if (alien.isZigzag && alien.baseX !== undefined) {
    alien.zigzagPhase = (alien.zigzagPhase ?? 0) + dt * (alien.zigzagFreq ?? 3.0);
    alien.x = alien.baseX + Math.sin(alien.zigzagPhase) * (alien.zigzagAmp ?? 24);
  }
}

// B. Update Behemoth Energy Core Cycles
for (const alien of this.state.aliens) {
  if (alien.hasEnergyCore) {
    alien.coreCycleTimer = (alien.coreCycleTimer ?? 0) + dt;
    const concealed = alien.coreConcealedDuration ?? 3.0;
    const revealed = alien.coreRevealedDuration ?? 2.0;
    const cycle = concealed + revealed;
    const t = (alien.coreCycleTimer) % cycle;
    alien.isCoreRevealed = t >= concealed;
  }
}

// C. Update Dreadnought Boss State Machine
for (const alien of this.state.aliens) {
  if (alien.isBoss) {
    if (alien.bossPhase === 1) {
      // Phase 1: Deflector Shield Online + Minion Drone Sorting
      alien.droneSpawnTimer = (alien.droneSpawnTimer ?? 0) + dt;
      if (alien.droneSpawnTimer >= (alien.droneSpawnInterval ?? 3.5)) {
        alien.droneSpawnTimer = 0;
        this.spawnMinionDronesFromBoss(alien);
      }
      if ((alien.shieldHp ?? 0) <= 0) {
        // Shield collapse shockwave
        alien.shieldActive = false;
        alien.bossPhase = 2;
        alien.coreOverloadTimer = 6.0;
        soundEngine.playExplosion('large');
        this.spawnExplosionParticles(alien.x, alien.y, '#bc13fe', 25);
      }
    } else if (alien.bossPhase === 2) {
      // Phase 2: Reactor Overload Vulnerability Window
      alien.coreOverloadTimer = (alien.coreOverloadTimer ?? 0) - dt;
      if ((alien.coreOverloadTimer ?? 0) <= 0) {
        if (alien.hp > alien.maxHp * 0.25) {
          // Emergency shield reboot
          alien.bossPhase = 1;
          alien.shieldActive = true;
          alien.shieldHp = 10;
          alien.maxShieldHp = 10;
          soundEngine.playShieldDeflect();
        } else {
          alien.bossPhase = 3;
        }
      } else if (alien.hp <= alien.maxHp * 0.25) {
        alien.bossPhase = 3;
      }
    } else if (alien.bossPhase === 3) {
      // Phase 3: Enraged Critical Stand
      alien.droneSpawnTimer = (alien.droneSpawnTimer ?? 0) + dt;
      if (alien.droneSpawnTimer >= 2.0) {
        alien.droneSpawnTimer = 0;
        this.spawnMinionDronesFromBoss(alien);
      }
      // Trailing smoke and fire particles
      if (Math.random() < 0.3) {
        this.spawnExplosionParticles(alien.x - 30, alien.y - 10, '#ff6d00', 2);
        this.spawnExplosionParticles(alien.x + 30, alien.y - 10, '#37474f', 2);
      }
    } else if (alien.bossPhase === 'destruction') {
      // Phase 4: Staggered Destruction Sequence
      alien.destructionTimer = (alien.destructionTimer ?? 0) + dt;
      this.updateBossDestructionSequence(alien, dt);
    }
  }
}
```

### 6.5 Minion Drone Deployment
```typescript
private spawnMinionDronesFromBoss(boss: Alien): void {
  const waveConfig = getStageWaveConfig(this.state.sectorId, this.state.stageId);
  soundEngine.playLaser(1);
  // Deploy drone in Lane 1 (port wing) and Lane 3 (starboard wing)
  this.spawnConfiguredAlien(1, boss.y + 25, 'minion_drone', waveConfig);
  this.spawnConfiguredAlien(3, boss.y + 25, 'minion_drone', waveConfig);
}
```

### 6.6 Collision Resolution for Shields, Armor & Core Reveals
In `update(dt)` bullet collision loop:
```typescript
for (let j = this.state.aliens.length - 1; j >= 0; j--) {
  const alien = this.state.aliens[j];
  
  // AABB Hit-Test for Boss across Lanes 1–3, circle test for others
  const isHit = alien.isBoss
    ? Math.abs(b.x - alien.x) <= alien.width * 0.55 && Math.abs(b.y - alien.y) <= alien.height * 0.55
    : Math.hypot(b.x - alien.x, b.y - alien.y) < (alien.width + b.width) / 2;

  if (isHit) {
    bulletHit = true;
    alien.isHitFlash = 0.15;

    // 1. Boss Deflector Shield Absorption
    if (alien.isBoss && alien.shieldActive && (alien.shieldHp ?? 0) > 0) {
      alien.shieldHp = Math.max(0, (alien.shieldHp ?? 0) - b.damage);
      soundEngine.playShieldDeflect();
      this.spawnExplosionParticles(b.x, b.y, '#bc13fe', 8);
      break;
    }

    // 2. Mech-Crab Armored Carapace Deflection
    if (alien.isArmored && (alien.armorHitsRemaining ?? 0) > 0) {
      alien.armorHitsRemaining!--;
      alien.isArmored = false;
      alien.hp -= 1;
      soundEngine.playShieldDeflect();
      this.spawnExplosionParticles(b.x, b.y, '#00e5ff', 8);
      this.spawnExplosionParticles(b.x, b.y, '#ffd600', 4);
      if (alien.hp <= 0) {
        this.handleAlienDefeated(alien, j);
      }
      break;
    }

    // 3. Behemoth Energy Core Vulnerability vs Armored Deflection
    let effectiveDamage = b.damage;
    if (alien.hasEnergyCore) {
      if (alien.isCoreRevealed) {
        // Critical Core Strike: 2.5x damage!
        effectiveDamage = Math.round(b.damage * 2.5);
        this.spawnExplosionParticles(b.x, b.y, '#76ff03', 14);
        soundEngine.playExplosion('large');
      } else {
        // Concealed Armor Deflection: 50% damage
        effectiveDamage = Math.max(1, Math.floor(b.damage * 0.5));
        this.spawnExplosionParticles(b.x, b.y, '#ffab00', 6);
        soundEngine.playShieldDeflect();
      }
    } else if (alien.isBoss && alien.bossPhase === 2) {
      // Overload vulnerability: 1.5x damage!
      effectiveDamage = Math.round(b.damage * 1.5);
      this.spawnExplosionParticles(b.x, b.y, '#ff6d00', 12);
    } else {
      this.spawnExplosionParticles(b.x, b.y, '#ffe600', 6);
    }

    alien.hp -= effectiveDamage;

    if (alien.hp <= 0) {
      if (alien.isBoss && alien.bossPhase !== 'destruction') {
        this.triggerBossDestruction(alien);
      } else if (!alien.isBoss) {
        this.handleAlienDefeated(alien, j);
      }
    }
    break;
  }
}
```

### 6.7 Staggered Multi-Stage Boss Destruction Sequence
```typescript
private triggerBossDestruction(boss: Alien): void {
  boss.bossPhase = 'destruction';
  boss.destructionTimer = 0;
  boss.destructionStep = 0;
  soundEngine.playExplosion('boss');
}

private updateBossDestructionSequence(boss: Alien, dt: number): void {
  const timer = boss.destructionTimer ?? 0;
  const step = boss.destructionStep ?? 0;

  // Secondary localized explosions across hull
  if (timer >= 0.2 * (step + 1) && step < 6) {
    boss.destructionStep = step + 1;
    const offsetX = (Math.random() - 0.5) * boss.width * 0.8;
    const offsetY = (Math.random() - 0.5) * boss.height * 0.8;
    this.spawnExplosionParticles(boss.x + offsetX, boss.y + offsetY, '#ff6d00', 12);
    soundEngine.playExplosion('small');
  }

  // Meltdown white shockwave flare
  if (timer >= 1.5 && timer < 1.6) {
    this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 30);
    soundEngine.playExplosion('large');
  }

  // Catastrophic disintegration & stage victory
  if (timer >= 3.0) {
    const idx = this.state.aliens.indexOf(boss);
    if (idx !== -1) {
      this.state.aliens.splice(idx, 1);
    }
    this.state.aliensDefeated++;
    this.state.score += boss.scoreValue;
    this.spawnExplosionParticles(boss.x, boss.y, '#ff6d00', 60);
    this.spawnExplosionParticles(boss.x, boss.y, '#00f3ff', 30);
    soundEngine.playExplosion('boss');
    this.handleStageVictory();
  }
}
```

---

## 7. Rendering, HUD & Audio Enhancements

### 7.1 Dedicated Boss HUD (`src/engine/Renderer.ts`)
When an active boss is in the arena, render a prominent top HUD banner:
- **Title Banner**: `DREADNOUGHT TITAN CLASS — SECTOR 5` (`#ff6d00`, neon glow).
- **Upper Shield Bar**: Purple energy fill (`shieldHp / maxShieldHp`, `#bc13fe`).
- **Lower Hull Health Bar**: Red/Orange hull integrity (`hp / maxHp`, `#ff3344`).
- **Phase Status Pill**:
  - Phase 1: `[ DEFLECTOR SHIELD ONLINE ]` (`#bc13fe`)
  - Phase 2: `[ ⚠️ CORE OVERLOAD — EXPOSED ]` (`#ffd600` / `#ffffff`)
  - Phase 3: `[ CRITICAL STAND — ENRAGED ]` (`#ff1744`)
  - Phase 4: `[ HULL INTEGRITY CATASTROPHIC ]` (`#ffffff`)

### 7.2 Sound Engine Enhancements (`src/engine/SoundEngine.ts`)
Add high-tech sound effects:
- `playShieldDeflect()`: 300Hz saw downward chirp (0.08s) simulating shield ripple impact.
- `playCoreAlert()`: Pulsing 700Hz/440Hz klaxon alarm tone for core overload state.

---

## 8. Verification Strategy & Test Matrix

1. **Static Analysis & Build Verification**:
   - Execute `npm run build` (`tsc && vite build`) verifying 0 TypeScript errors.
2. **SectorConfig Integrity Unit Tests**:
   - Verify all 5 sectors exist with valid ids 1–5.
   - Verify every sector has exactly 5 stages (stages 1–5).
   - Verify formation grids are within valid lane bounds (5 columns).
   - Verify Sector 1 has strictly linear movement (`enableZigzag === false`).
   - Verify Sector 2 has `enableZigzag === true` with frequencies 2.5–3.6 rad/s and amplitudes 18–32px.
   - Verify Sector 3 has `enableArmor === true`.
   - Verify Sector 4 has `enableCoreReveal === true`.
   - Verify Sector 5 Stage 5 configures the Dreadnought Boss (`bossType === 'dreadnought'`).
3. **Gameplay Regression Tests**:
   - Verify existing math engine test suite passes (`npm test`).
   - Verify stages start smoothly, formations spawn according to sector/stage parameters, and boss battle functions without hangs.
