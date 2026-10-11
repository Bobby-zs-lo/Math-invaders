# Milestone 2 Technical Analysis & Architecture Blueprint: Sector 5 Mechanical Dreadnought Boss & Visual Systems

**Author:** `explorer_m2_3`  
**Date:** 2026-10-10  
**Target Milestone:** Milestone 2 (Sector 5 Dreadnought Boss & Visuals)  
**Parent Conversation ID:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Target Files:**
- `src/models/GameState.ts`
- `src/engine/GameEngine.ts`
- `src/engine/SpriteGenerator.ts`
- `src/engine/Renderer.ts`
- `src/engine/SoundEngine.ts`

---

## 1. Executive Summary & Problem Statement

Requirement 2 (R2) of the Math Invaders expansion specifies:
> **Sector 5 (Deep Nebula Boss):** A colossal multi-phase Mechanical Dreadnought Boss featuring an active energy deflector shield, minion drone deployment, core overload vulnerability phases, and spectacular destruction sequences.

### Current Implementation Deficits (Ground-Truth Codebase Audit)
1. **Generic Boss Entity (`GameEngine.ts:110–155`):**
   In the existing code, on any stage 5 (`isBossStage = stage === 5`), `spawnAlienFormation()` places a standard alien with `type: 'boss'` at row 0, lane 2 with a flat 20 HP. It lacks any state machine, shield mechanics, drone launching, or overload cycles.
2. **Instant Deletion upon 0 HP (`GameEngine.ts:468–470, 524–530`):**
   When `alien.hp <= 0`, `handleAlienDefeated(alien, index)` executes `this.state.aliens.splice(index, 1)` immediately. The boss disappears in a single frame with a generic particle burst. If all aliens are defeated, `handleStageVictory()` is called immediately, making a cascading multi-second destruction sequence impossible without refactoring the defeat flow.
3. **Purely Cosmetic Shield (`Renderer.ts:128–132`, `SpriteGenerator.ts:141–206`):**
   `Renderer.ts` passes `alien.hp > alien.maxHp * 0.5` into `SpriteGenerator.getDreadnoughtBoss(frame, shieldActive)`. This shield is purely a cosmetic stroke line drawn when HP > 50%. It absorbs zero damage and has no gameplay impact or shield health bar.
4. **Missing Visual Assets:**
   Missing dedicated procedural sprites for an active deflector shield overlay, exposed glowing reactor core, open drone hangar bays, armor debris shards, and screen-top Boss HUD with dual shield/health bars.

---

## 2. Four-Phase Mechanical Dreadnought State Machine Architecture

### 2.1 State Transitions & Lifecycle Overview

```
                      ┌───────────────────────────────────────┐
                      │        Sector 5 Stage 5 Spawn         │
                      │  Colossal Dreadnought Boss (Center)  │
                      │   HP: 40/40, Shield HP: 30/30 (P1)    │
                      └──────────────────┬────────────────────┘
                                         │
                                         ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Phase 1: Active Energy Deflector Shield                                │
   │ • Blue hexagonal/elliptical energy shield absorbs all bullet damage.   │
   │ • Bullets spark off shield boundary; hull HP remains protected.       │
   │ • Transition: When Shield HP <= 0 -> Shield collapses -> Enter Phase 2│
   └─────────────────────────────────────┬──────────────────────────────────┘
                                         │
                                         ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Phase 2: Escort Minion Drone Deployment                                │
   │ • Wing launch bays open (wingBaysOpen = true).                         │
   │ • Launches 2–4 fast scout/escort drones into adjacent lanes (1, 3, etc)│
   │ • Boss hull vulnerable to standard 1x damage.                          │
   │ • Transition: Boss HP <= 65% (<= 26 HP) OR Escort drones cleared       │
   │               -> Reactor destabilizes -> Enter Phase 3                 │
   └─────────────────────────────────────┬──────────────────────────────────┘
                                         │
                                         ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Phase 3: Core Overload Vulnerability Window (6.0 Seconds)             │
   │ • Warning siren audio & flashing alert banner on screen.               │
   │ • Reactor core opens wide with radiant solar flare visuals.            │
   │ • CRITICAL VULNERABILITY: Takes 2x damage from all incoming hits!     │
   │ • Transition A: If Boss HP <= 0 -> Immediate Enter Phase 4             │
   │ • Transition B: If 6.0s timer expires and HP > 0                       │
   │                 -> Emergency shield reboot (15 HP) -> Cycle back to P1 │
   └─────────────────────────────────────┬──────────────────────────────────┘
                                         │ (When HP <= 0 at ANY point)
                                         ▼
   ┌────────────────────────────────────────────────────────────────────────┐
   │ Phase 4: Spectacular Cascading Destruction Sequence (3.0 Seconds)      │
   │ • Boss HP locked at 0; deletion intercepted; march descent halted.     │
   │ • Screen shake activated (intensity: 6 -> 12).                         │
   │ • T+0.0s – 1.0s: Staggered secondary wing explosions & flying armor.   │
   │ • T+1.0s – 2.0s: Hull fissures, fireball bursts, roaring cascade audio.│
   │ • T+2.0s – 2.8s: Reactor meltdown whiteout flare & expanding shockwave.│
   │ • T+3.0s: Catastrophic supernova blast, 80+ fiery debris particles,   │
   │           boss removed, +5000 score, Stage Victory triggered!          │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Phase Specifications

### Phase 1: Active Energy Deflector Shield
- **Trigger:** Spawn of Sector 5 Stage 5 (`sectorId === 5 && isBossStage`).
- **Initial Values:**
  - `bossPhase = 1`
  - `shieldHp = 30`, `maxShieldHp = 30`
  - `hp = 40`, `maxHp = 40`
  - `isShieldActive = true`
  - `isCoreExposed = false`
- **Damage Mechanics:**
  - All bullets striking the boss hitbox test against `alien.shieldHp > 0`.
  - `alien.shieldHp -= bullet.damage`.
  - If `bullet.type !== 'plasma'`, the bullet is consumed.
  - Spawns cyan/blue deflection spark particles (`#00f3ff`, `#448aff`) and plays `soundEngine.playShieldDeflect()`.
  - Boss hull HP remains protected at 40/40.
- **Visuals:**
  - Blue/cyan shimmering elliptical-hexagonal shield envelope rendered over boss sprite.
  - Screen-top Boss HUD shows full blue shield bar (`30 / 30`) above red hull bar (`40 / 40`).
- **Exit Condition:**
  - When `alien.shieldHp <= 0`:
    - Shield breaks with electrical overload shockwave (`#bc13fe`, `#00f3ff`).
    - `alien.isShieldActive = false`.
    - Automatically calls `transitionBossToPhase2(alien)`.

---

### Phase 2: Escort Minion Drone Deployment
- **Trigger:** Transition from Phase 1 upon shield collapse.
- **State Values:**
  - `bossPhase = 2`
  - `isShieldActive = false`
  - `wingBaysOpen = true`
- **Drone Launch Behavior:**
  - The Dreadnought's port and starboard launch bays open.
  - Instantly spawns 2 to 4 minion escort drones (`type: 'scout'`) in flanking lanes:
    - Left Wing Drone: `lane = 1`, `x = getLaneCenterX(1)`, `y = alien.y + 20`
    - Right Wing Drone: `lane = 3`, `x = getLaneCenterX(3)`, `y = alien.y + 20`
    - (Optional Outer Drones): `lane = 0` and `lane = 4` if hard difficulty
  - Drone Stats: `hp = 1`, `speed = 25` (faster descent), `scoreValue = 150`, `width = 32, height = 32`.
  - Adds drones directly to `this.state.aliens`.
  - Sound: Launch bays pneumatic hiss and high-tech deployment whoosh.
- **Boss Combat Behavior:**
  - Boss hull takes standard 1x damage from player shots.
  - Player must juggle defensive lane shooting against fast escort drones while attacking the exposed flagship hull.
- **Exit Condition:**
  - Reactor begins to destabilize when either:
    1. Boss hull drops to `<= 65%` (`alien.hp <= 26 / 40`), OR
    2. All escort drones from the wave are defeated.
  - Calls `transitionBossToPhase3(alien)`.

---

### Phase 3: Core Overload Vulnerability Window
- **Trigger:** Transition from Phase 2 when hull threshold or minion clearance is met.
- **State Values:**
  - `bossPhase = 3`
  - `isCoreExposed = true`
  - `coreOverloadTimer = 6.0` (6.0-second countdown)
  - `coreOverloadDuration = 6.0`
- **Audio/Visual Alert:**
  - Klaxon alarm sounds: `soundEngine.playCoreAlarm()`.
  - Screen HUD flashes a pulsing warning banner:
    `⚠️ DREADNOUGHT REACTOR OVERLOAD — CORE EXPOSED! 2X CRITICAL DAMAGE!`
  - Ambient red vignette flashes along canvas edges.
- **Critical Damage Mechanics:**
  - When bullets strike the boss during Phase 3:
    - Damage is multiplied by `2.0` (`criticalDamage = bullet.damage * 2`).
    - `alien.hp -= criticalDamage`.
    - `alien.isHitFlash = 0.2`.
    - Spawns intense golden solar flares and critical plasma bursts (`#ffd600`, `#ff3d00`).
- **Core Visual Flare:**
  - The central reactor core pulses with a blazing radial gradient (white core, yellow corona, magma red corona) and 4 rotating energy flare beams.
- **Exit Conditions:**
  - **A. Boss Defeated (`alien.hp <= 0`):**
    - Transition immediately to **Phase 4: Spectacular Destruction Sequence**.
  - **B. Window Expiration (`alien.coreOverloadTimer <= 0` and `alien.hp > 0`):**
    - Core exhaust hatches seal (`alien.isCoreExposed = false`).
    - Emergency shield reboots: `alien.bossPhase = 1`, `alien.shieldHp = 15`, `alien.maxShieldHp = 15`, `alien.isShieldActive = true`.
    - The boss re-arms its shield and restarts the combat cycle!

---

### Phase 4: Spectacular Destruction Sequence
- **Trigger:** Any time `alien.hp <= 0` for `alien.type === 'boss'`.
- **State Values:**
  - `bossPhase = 4`
  - `alien.hp = 0`
  - `destructionTimer = 3.0`
  - `destructionDuration = 3.0`
  - `state.screenShakeTimer = 3.0`
  - `state.screenShakeIntensity = 6.0`
  - `alien.speed = 0` (halts descent)
- **Cascading Timeline (3.0 Seconds Total):**
  - **T+0.0s to T+1.0s (Wing Pod Ruptures):**
    - Boss hull starts violently vibrating.
    - Cascading explosions trigger across port and starboard wings:
      - Left wingtip `(boss.x - 34, boss.y - 10)`
      - Right wingtip `(boss.x + 34, boss.y - 10)`
    - Spawns flying armor debris particles (`#2d3340`, `#ff6d00`).
    - Sounds: Rapid secondary explosion thuds.
  - **T+1.0s to T+2.0s (Fuselage Rupture & Plasma Fires):**
    - Secondary blasts spread into weapon batteries and command deck.
    - Streams of dark smoke and fiery sparks erupt.
    - Screen shake escalates (`intensity = 10.0`).
  - **T+2.0s to T+2.8s (Supernova Core Flare & Shockwave):**
    - Hull turns blinding white (`#ffffff`).
    - Expanding cyan/white plasma shockwave ring radiates outward across the entire canvas (`radius = 20 -> 240px`).
    - Screen shake peaks (`intensity = 12.0`).
  - **T+3.0s (Catastrophic Obliteration & Victory):**
    - Final colossal detonation: `soundEngine.playExplosion('boss')`.
    - Spawns 80+ fiery debris & spark particles in all directions.
    - Removes boss from `state.aliens`.
    - `state.aliensDefeated++`.
    - `state.score += 5000`.
    - Calls `this.handleStageVictory()`.
    - Grand victory fanfare plays!

---

## 4. Concrete Code Blueprints

### 4.1 `src/models/GameState.ts` Extensions

```typescript
// Additions to Alien interface:
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

  // --- Dreadnought Boss State Machine Fields ---
  isBoss?: boolean;
  bossPhase?: 1 | 2 | 3 | 4; // 1: Shield, 2: Drones, 3: Overload, 4: Destruction
  shieldHp?: number;
  maxShieldHp?: number;
  isShieldActive?: boolean;
  wingBaysOpen?: boolean;
  isCoreExposed?: boolean;
  coreOverloadTimer?: number;
  coreOverloadDuration?: number;
  destructionTimer?: number;
  destructionDuration?: number;
  nextSecondaryExplosionTimer?: number;
}

// Additions to GameState class:
export class GameState {
  // ... existing fields ...

  // Screen shake FX for boss explosions & heavy impacts
  public screenShakeTimer: number = 0;
  public screenShakeIntensity: number = 0;

  // Convenience helper
  public getActiveBoss(): Alien | undefined {
    return this.aliens.find(a => a.type === 'boss');
  }
}
```

---

### 4.2 `src/engine/GameEngine.ts` State Machine Implementation

#### 1. Boss Initialization in `spawnAlienFormation` / `spawnAlienInLane`

```typescript
// In spawnAlienInLane (or dedicated spawnDreadnoughtBoss):
if (type === 'boss') {
  const isDreadnought = this.state.sectorId === 5;
  const maxHp = isDreadnought ? 40 : 20;
  const shieldHp = isDreadnought ? 30 : 0;

  const bossAlien: Alien = {
    id: 'boss_' + Math.random().toString(36).substring(2, 8),
    lane,
    x,
    y: yPos,
    type: 'boss',
    hp: maxHp,
    maxHp,
    scoreValue: 5000,
    width: 96,
    height: 72,
    speed: 10,
    isHitFlash: 0,
    isBoss: true,
    bossPhase: 1, // Start Phase 1
    shieldHp,
    maxShieldHp: shieldHp,
    isShieldActive: shieldHp > 0,
    wingBaysOpen: false,
    isCoreExposed: false,
    coreOverloadTimer: 0,
    coreOverloadDuration: 6.0,
    destructionTimer: 0,
    destructionDuration: 3.0,
    nextSecondaryExplosionTimer: 0
  };
  this.state.aliens.push(bossAlien);
  return;
}
```

#### 2. Phase 2 Transition & Minion Drone Spawning

```typescript
private transitionBossToPhase2(boss: Alien): void {
  boss.bossPhase = 2;
  boss.isShieldActive = false;
  boss.shieldHp = 0;
  boss.wingBaysOpen = true;

  soundEngine.playShieldLost();
  this.spawnExplosionParticles(boss.x, boss.y, '#bc13fe', 25);

  // Deploy 2 to 4 escort minion drones from wing hangars
  const escortLanes = [1, 3]; // Adjacent lanes
  for (const lane of escortLanes) {
    const drone: Alien = {
      id: 'drone_' + Math.random().toString(36).substring(2, 7),
      lane,
      x: this.state.getLaneCenterX(lane),
      y: boss.y + 20,
      type: 'scout',
      hp: 1,
      maxHp: 1,
      scoreValue: 150,
      width: 32,
      height: 32,
      speed: 25, // Fast escort deployment
      isHitFlash: 0
    };
    this.state.aliens.push(drone);
  }
}
```

#### 3. Phase 3 Transition & Vulnerability Window

```typescript
private transitionBossToPhase3(boss: Alien): void {
  boss.bossPhase = 3;
  boss.wingBaysOpen = false;
  boss.isCoreExposed = true;
  boss.coreOverloadTimer = 6.0;
  boss.coreOverloadDuration = 6.0;

  soundEngine.playCoreAlarm();
  this.spawnExplosionParticles(boss.x, boss.y, '#ffd600', 30);
}
```

#### 4. Phase 4 Initiation (Intercepting Instant Splice)

```typescript
private triggerBossDestructionSequence(boss: Alien): void {
  boss.bossPhase = 4;
  boss.hp = 0;
  boss.destructionTimer = 3.0;
  boss.destructionDuration = 3.0;
  boss.nextSecondaryExplosionTimer = 0.15;
  boss.speed = 0;

  // Activate screen shake
  this.state.screenShakeTimer = 3.0;
  this.state.screenShakeIntensity = 6.0;

  soundEngine.playExplosion('large');
  this.spawnExplosionParticles(boss.x - 30, boss.y, '#ff6d00', 15);
  this.spawnExplosionParticles(boss.x + 30, boss.y, '#ff6d00', 15);
}
```

#### 5. Update Loop Enhancements (`GameEngine.update(dt)`)

```typescript
// Inside update(dt):

// Update Screen Shake
if (this.state.screenShakeTimer > 0) {
  this.state.screenShakeTimer -= dt;
  if (this.state.screenShakeTimer <= 0) {
    this.state.screenShakeIntensity = 0;
  }
}

// Update Active Boss State Machine
const boss = this.state.getActiveBoss();
if (boss) {
  // Phase 2 Check: Transition to Phase 3 if hull damaged <= 65% or no minions
  if (boss.bossPhase === 2) {
    const minionsRemaining = this.state.aliens.filter(a => a.type === 'scout' && a.id.startsWith('drone_')).length;
    if (boss.hp <= boss.maxHp * 0.65 || minionsRemaining === 0) {
      this.transitionBossToPhase3(boss);
    }
  }

  // Phase 3 Check: Core Overload Timer countdown
  if (boss.bossPhase === 3 && boss.isCoreExposed) {
    boss.coreOverloadTimer = (boss.coreOverloadTimer ?? 6.0) - dt;
    if (boss.coreOverloadTimer <= 0) {
      if (boss.hp > 0) {
        // Re-arm emergency shield and cycle back to Phase 1
        boss.bossPhase = 1;
        boss.isCoreExposed = false;
        boss.shieldHp = 15;
        boss.maxShieldHp = 15;
        boss.isShieldActive = true;
      }
    }
  }

  // Phase 4 Check: Cascading Destruction Sequence
  if (boss.bossPhase === 4) {
    boss.destructionTimer = (boss.destructionTimer ?? 3.0) - dt;
    boss.nextSecondaryExplosionTimer = (boss.nextSecondaryExplosionTimer ?? 0.2) - dt;

    const progress = 1 - (boss.destructionTimer / (boss.destructionDuration || 3.0));
    this.state.screenShakeIntensity = 6.0 + progress * 8.0;

    if (boss.nextSecondaryExplosionTimer <= 0) {
      boss.nextSecondaryExplosionTimer = Math.max(0.08, 0.25 - progress * 0.15);
      
      // Secondary explosions across wings, engines, bridge
      const offsetX = (Math.random() - 0.5) * 70;
      const offsetY = (Math.random() - 0.5) * 45;
      const expX = boss.x + offsetX;
      const expY = boss.y + offsetY;
      
      soundEngine.playExplosion(progress > 0.6 ? 'large' : 'small');
      this.spawnExplosionParticles(expX, expY, '#ff6d00', 12);
      this.spawnExplosionParticles(expX, expY, '#ffd600', 8);
      this.spawnArmorDebrisParticles(expX, expY, 4);
    }

    // Sequence Complete: Obliteration & Victory
    if (boss.destructionTimer <= 0) {
      const idx = this.state.aliens.indexOf(boss);
      if (idx !== -1) {
        this.state.aliens.splice(idx, 1);
      }
      this.state.aliensDefeated++;
      this.state.score += boss.scoreValue;
      soundEngine.playExplosion('boss');
      this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 40);
      this.spawnExplosionParticles(boss.x, boss.y, '#ff6d00', 50);

      this.handleStageVictory();
      return;
    }
  }
}
```

#### 6. Bullet Collision Logic Refinement (Lines 457–473)

```typescript
// In bullet collision loop:
if (dist < hitRadius) {
  bulletHit = true;
  alien.isHitFlash = 0.15;

  if (alien.type === 'boss') {
    // Boss in Phase 4 is already exploding; ignore new bullet damage
    if (alien.bossPhase === 4) {
      continue;
    }

    // Phase 1: Deflector Shield Interception
    if (alien.bossPhase === 1 && (alien.shieldHp ?? 0) > 0) {
      alien.shieldHp = Math.max(0, alien.shieldHp! - b.damage);
      this.spawnShieldDeflectionParticles(b.x, b.y);
      soundEngine.playShieldDeflect();

      if (alien.shieldHp <= 0) {
        this.transitionBossToPhase2(alien);
      }
    } 
    // Phase 3: Core Overload 2x Critical Damage
    else if (alien.bossPhase === 3 && alien.isCoreExposed) {
      const critDmg = b.damage * 2;
      alien.hp -= critDmg;
      this.spawnExplosionParticles(b.x, b.y, '#ffd600', 10);
      this.spawnExplosionParticles(b.x, b.y, '#ff1744', 8);

      if (alien.hp <= 0) {
        this.triggerBossDestructionSequence(alien);
      }
    } 
    // Standard Boss Damage (Phase 2 or fallback)
    else {
      alien.hp -= b.damage;
      this.spawnExplosionParticles(b.x, b.y, '#ffe600', 6);

      if (alien.hp <= 0) {
        this.triggerBossDestructionSequence(alien);
      }
    }
  } else {
    // Non-boss alien damage
    alien.hp -= b.damage;
    this.spawnExplosionParticles(b.x, b.y, '#ffe600', 6);
    if (alien.hp <= 0) {
      this.handleAlienDefeated(alien, j);
    }
  }
  break;
}
```

---

### 4.3 `src/engine/SpriteGenerator.ts` Blueprints

#### 1. Multi-Phase Dreadnought Boss Sprite

```typescript
public static getDreadnoughtBoss(
  frame: number = 0,
  phase: number = 1,
  wingBaysOpen: boolean = false,
  coreOverload: boolean = false
): HTMLCanvasElement {
  const key = `dreadnought_boss_f${frame % 2}_p${phase}_b${wingBaysOpen}_o${coreOverload}`;
  if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

  const { canvas, ctx } = this.createOffscreen(96, 72);

  // Obsidian metallic hull
  ctx.fillStyle = '#1c1f26';
  ctx.beginPath();
  ctx.moveTo(48, 68);
  ctx.lineTo(8, 24);
  ctx.lineTo(16, 8);
  ctx.lineTo(80, 8);
  ctx.lineTo(88, 24);
  ctx.closePath();
  ctx.fill();

  // Steel armor plating
  ctx.fillStyle = phase === 4 ? '#181b22' : '#2d3340';
  ctx.fillRect(28, 16, 40, 36);

  // Wing Launch Bays (Phase 2 open bay animation)
  if (wingBaysOpen) {
    // Port bay
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(14, 20, 10, 14);
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(16, 22, 6, 10);
    // Starboard bay
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(72, 20, 10, 14);
    ctx.fillStyle = '#ffd600';
    ctx.fillRect(74, 22, 6, 10);
  } else {
    // Sealed wing armor
    ctx.fillStyle = '#263238';
    ctx.fillRect(14, 20, 10, 14);
    ctx.fillRect(72, 20, 10, 14);
  }

  // Magma-orange glowing circuit conduits
  ctx.fillStyle = coreOverload ? '#ff3d00' : '#ff6d00';
  ctx.shadowColor = coreOverload ? '#ff3d00' : '#ff6d00';
  ctx.shadowBlur = coreOverload ? 14 : 8;
  ctx.fillRect(34, 20, 28, 4);
  ctx.fillRect(46, 24, 4, 20);
  ctx.fillRect(20, 28, 12, 3);
  ctx.fillRect(64, 28, 12, 3);
  ctx.shadowBlur = 0;

  // Central Reactor Core
  if (coreOverload) {
    // Radiant core flare in Phase 3
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffd600';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(48, 36, 12 + (frame % 2 * 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff9100';
    ctx.beginPath();
    ctx.arc(48, 36, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    // Standard reactor
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.arc(48, 36, 8 + (frame % 2 * 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(48, 36, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Command eye visor
  ctx.fillStyle = '#ff1744';
  ctx.shadowColor = '#ff1744';
  ctx.fillRect(38, 12, 20, 4);
  ctx.shadowBlur = 0;

  // Wing cannons
  ctx.fillStyle = '#37474f';
  ctx.fillRect(6, 16, 6, 20);
  ctx.fillRect(84, 16, 6, 20);

  this.spriteCache.set(key, canvas);
  return canvas;
}
```

#### 2. Procedural Energy Shield Overlay Sprite

```typescript
public static getDreadnoughtShield(frame: number = 0): HTMLCanvasElement {
  const key = `dreadnought_shield_${frame % 2}`;
  if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

  const { canvas, ctx } = this.createOffscreen(110, 86);
  const cx = 55;
  const cy = 43;

  // Hexagonal energy mesh pattern
  ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
  ctx.lineWidth = 1;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 50, cy + Math.sin(angle) * 36);
    ctx.stroke();
  }

  // Outer radiant shield barrier
  ctx.strokeStyle = '#00f3ff';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 12;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 48, 36, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner secondary shimmer
  ctx.strokeStyle = 'rgba(188, 19, 254, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 44, 32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  this.spriteCache.set(key, canvas);
  return canvas;
}
```

#### 3. Standalone Armor Plating Debris Sprite

```typescript
public static getArmorDebris(index: number = 0): HTMLCanvasElement {
  const key = `armor_debris_${index % 3}`;
  if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

  const { canvas, ctx } = this.createOffscreen(16, 16);
  ctx.fillStyle = '#2d3340';
  ctx.beginPath();
  if (index % 3 === 0) {
    ctx.moveTo(2, 2);
    ctx.lineTo(14, 5);
    ctx.lineTo(10, 14);
    ctx.lineTo(3, 11);
  } else if (index % 3 === 1) {
    ctx.moveTo(5, 1);
    ctx.lineTo(15, 8);
    ctx.lineTo(7, 15);
  } else {
    ctx.moveTo(3, 4);
    ctx.lineTo(13, 2);
    ctx.lineTo(14, 12);
    ctx.lineTo(1, 14);
  }
  ctx.closePath();
  ctx.fill();

  // Singed edge
  ctx.strokeStyle = '#ff6d00';
  ctx.lineWidth = 1;
  ctx.stroke();

  this.spriteCache.set(key, canvas);
  return canvas;
}
```

---

### 4.4 `src/engine/Renderer.ts` Implementation Blueprints

#### 1. Screen Shake Matrix Translation in `Renderer.render()`

```typescript
public render(state: GameState, dt: number): void {
  const ctx = this.ctx;
  const w = state.canvasWidth;
  const h = state.canvasHeight;
  this.animFrame += dt * 4;
  const frameIndex = Math.floor(this.animFrame);

  ctx.save();

  // Screen Shake Transform
  if (state.screenShakeTimer > 0) {
    const shake = state.screenShakeIntensity * Math.min(1, state.screenShakeTimer);
    const ox = (Math.random() - 0.5) * shake * 2;
    const oy = (Math.random() - 0.5) * shake * 2;
    ctx.translate(ox, oy);
  }

  // Clear Canvas
  ctx.fillStyle = '#060814';
  ctx.fillRect(-20, -20, w + 40, h + 40);

  // Render gameplay layers
  this.renderStarfield(state, dt);
  this.renderLanes(state);
  this.renderDefenseLine(state);
  this.renderAliens(state, frameIndex);
  this.renderBullets(state);
  this.renderParticles(state);
  this.renderPlayerShip(state);

  // Render Dreadnought Boss Overlays & Dedicated HUD
  const boss = state.getActiveBoss();
  if (boss) {
    this.renderBossHUD(boss, ctx, w);
    if (boss.bossPhase === 3) {
      this.renderOverloadWarningAlert(ctx, w, h);
    }
  }

  ctx.restore();
}
```

#### 2. Top-Screen Boss HUD Banner (`renderBossHUD`)

```typescript
private renderBossHUD(boss: Alien, ctx: CanvasRenderingContext2D, w: number): void {
  const barW = Math.min(300, w - 40);
  const barX = (w - barW) / 2;
  const barY = 24;

  ctx.save();

  // Boss Title & Phase Label
  ctx.font = 'bold 10px "Orbitron", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('SECTOR 5 FLAGSHIP: MECHANICAL DREADNOUGHT', barX, barY - 6);

  let phaseLabel = 'PHASE 1: SHIELD ACTIVE';
  let phaseColor = '#00f3ff';
  if (boss.bossPhase === 2) {
    phaseLabel = 'PHASE 2: MINION DRONE ESCORT';
    phaseColor = '#ff9100';
  } else if (boss.bossPhase === 3) {
    phaseLabel = 'PHASE 3: CORE OVERLOAD ⚠️ 2X CRIT';
    phaseColor = '#ff1744';
  } else if (boss.bossPhase === 4) {
    phaseLabel = 'PHASE 4: CATASTROPHIC COLLAPSE 💥';
    phaseColor = '#ffd600';
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = phaseColor;
  ctx.fillText(phaseLabel, barX + barW, barY - 6);

  // Shield Bar (if active or has max shield)
  if (boss.bossPhase === 1 || (boss.shieldHp ?? 0) > 0) {
    const shieldRatio = Math.max(0, (boss.shieldHp ?? 0) / (boss.maxShieldHp || 30));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX, barY, barW, 6);

    const shieldGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    shieldGrad.addColorStop(0, '#00f3ff');
    shieldGrad.addColorStop(1, '#0066ff');
    ctx.fillStyle = shieldGrad;
    ctx.fillRect(barX, barY, barW * shieldRatio, 6);

    // Border
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, 6);
  }

  // Hull Health Bar
  const hullY = (boss.bossPhase === 1 || (boss.shieldHp ?? 0) > 0) ? barY + 9 : barY;
  const hullRatio = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(barX, hullY, barW, 8);

  const hullGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  hullGrad.addColorStop(0, '#ff9100');
  hullGrad.addColorStop(1, '#ff1744');
  ctx.fillStyle = hullGrad;
  ctx.fillRect(barX, hullY, barW * hullRatio, 8);

  ctx.strokeStyle = '#ff3344';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, hullY, barW, 8);

  ctx.restore();
}
```

#### 3. Core Overload Flashing Alert Banner

```typescript
private renderOverloadWarningAlert(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  const alertY = 56;
  const alpha = 0.5 + Math.sin(this.animFrame * 3) * 0.4;

  ctx.fillStyle = `rgba(255, 23, 68, ${alpha * 0.2})`;
  ctx.fillRect(0, alertY - 14, w, 20);

  ctx.font = 'bold 11px "Orbitron", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(255, 214, 0, ${alpha})`;
  ctx.shadowColor = '#ff1744';
  ctx.shadowBlur = 8;
  ctx.fillText('⚠️ CORE EXPOSED — 2X CRITICAL DAMAGE WINDOW ⚠️', w / 2, alertY);

  ctx.restore();
}
```

---

### 4.5 `src/engine/SoundEngine.ts` Blueprints

```typescript
// Additions to SoundEngine:
public playShieldDeflect(): void {
  if (this.isMuted) return;
  this.initContext();
  if (!this.ctx) return;

  const osc = this.ctx.createOscillator();
  const gain = this.ctx.createGain();
  const now = this.ctx.currentTime;

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.linearRampToValueAtTime(1200, now + 0.08);

  gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

  osc.connect(gain);
  gain.connect(this.ctx.destination);
  osc.start(now);
  osc.stop(now + 0.1);
}

public playCoreAlarm(): void {
  if (this.isMuted) return;
  this.initContext();
  if (!this.ctx) return;

  const now = this.ctx.currentTime;
  const tones = [880, 587.33]; // A5 -> D5 siren alternation
  tones.forEach((freq, idx) => {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = now + idx * 0.14;

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(this.sfxVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  });
}
```

---

## 5. Verification & Testing Strategy

1. **Compilation & Build Integrity:**
   - Run `npm run build` (`tsc && vite build`).
   - Zero TypeScript typing errors, zero lint warnings.
2. **Phase 1 Verification:**
   - Start Sector 5 Stage 5. Verify boss spawns with Shield HP = 30 and Hull HP = 40.
   - Fire lasers into center lane: verify shield absorbs hits, shield bar decreases, deflection sparks appear, and hull HP remains at 40.
3. **Phase 2 Verification:**
   - Reduce shield to 0: verify shield breaks, wing bays open on sprite, 2–4 scout drones deploy into adjacent lanes.
4. **Phase 3 Verification:**
   - Reduce boss hull to <= 65% or clear drones: verify siren sounds, warning banner displays, core glows radiant white/yellow, and player attacks register 2x critical damage.
5. **Phase 4 Verification:**
   - Reduce boss HP to 0: verify boss is NOT immediately spliced. Verify 3.0s cascading wing explosions, camera screen shake, supernova shockwave ring, final boss explosion sound, and transition to victory screen.
