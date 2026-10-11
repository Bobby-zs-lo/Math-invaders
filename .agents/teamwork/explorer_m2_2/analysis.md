# Milestone 2 Technical Analysis & Blueprint
## Movement Patterns & Collision Dynamics (Sectors 2, 3, and 4)

**Agent:** `explorer_m2_2`  
**Date:** 2026-10-10  
**Target Milestone:** Milestone 2 (Movement Patterns & Collision Dynamics)  
**Parent Conversation ID:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Reference Document:** `ORIGINAL_REQUEST.md` (§R2) & `PROJECT.md` (Features 10, 11, 12)

---

## 1. Executive Summary & Objective

This analysis delivers the architectural blueprint and concrete code specifications for the three core movement and collision dynamics required in Milestone 2:
1. **Alien Entity Model Extension (`src/models/GameState.ts`):**
   Augment the `Alien` interface with horizontal oscillation parameters (`baseX`, `oscillationPhase`, `oscillationAmp`, `oscillationFreq`), armor durability states (`armor`, `maxArmor`, `isArmorFlash`), and energy core exposure timers (`coreRevealed`, `coreTimer`).
2. **Sector 2 Movement Updates (Asteroid Belt Zig-Zag Swarms in `src/engine/GameEngine.ts`):**
   Implement continuous frame-rate independent horizontal sinusoidal weaving $x(t) = \text{baseX} + A \sin(\omega t + \phi)$ with strict canvas boundary clamping, coupled with accelerated march tempo.
3. **Bullet Collision Dynamics (`src/engine/GameEngine.ts`):**
   - **Sector 3 (Armored Mech-Crab Enforcers):** Hardened exoskeleton armor absorbs hits first (requiring multiple bullet impacts to crack armor before taking HP damage), with metallic deflection sparks and audio/visual deflection feedback.
   - **Sector 4 (Heavy Assault Behemoths):** Periodic energy core reveal cycle (core closed for 3.0s, core exposed for 3.0s). Hits while the core is exposed deal $2.0\times$ critical/bonus damage with intense plasma bursts; hits while the blast doors are sealed deal $0.5\times$ reduced damage with deflection feedback.

All designs are 100% backward-compatible, type-safe, and ready for immediate drop-in implementation by the coding agents.

---

## 2. Current Codebase Audit & Line-by-Line Findings

### 2.1 Game State Alien Model (`src/models/GameState.ts`)
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
  * **Observation:** The `Alien` interface contains only static geometry and health attributes.
  * **Gap:** No fields exist for horizontal baseline positioning (`baseX`), sinusoidal oscillation phase/amplitude/frequency, armor plating durability, visual deflection flashes, or core exposure cycle timers.

### 2.2 Movement Loop in `GameEngine.ts`
* **Lines 427–443 (`update` step 3):**
  ```typescript
  // 3. March Rhythm & Alien Movement (Aliens descend continuously!)
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
  * **Observation:** Alien coordinates only change along the vertical Y axis during discrete march ticks (`alien.y += this.state.marchStepY`).
  * **Gap:** `alien.x` is completely static after spawning. There is zero continuous or frame-based horizontal movement logic anywhere in the codebase.

### 2.3 Bullet Collision Loop in `GameEngine.ts`
* **Lines 450–474 (`update` step 5):**
  ```typescript
  for (let i = this.state.bullets.length - 1; i >= 0; i--) {
    const b = this.state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    let bulletHit = false;
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
  * **Observation:** Every bullet unconditionally deals its raw `damage` to `alien.hp` upon radial proximity.
  * **Gap:**
    - No armor absorption: Mech-crabs take standard HP damage immediately from the very first shot.
    - No core reveal cycle: Behemoths take standard damage constantly; there is no bonus critical multiplier for timing shots during open core windows, and no damage mitigation during closed states.
    - Uniform particle feedback: All impacts produce generic `#ffe600` sparks.

---

## 3. Blueprint 1: Extension of `Alien` Model

### 3.1 Interface Definition (`src/models/GameState.ts`)

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

  // --- Milestone 2 Extensions ---
  // Sector 2: Horizontal Zig-Zag Oscillation
  baseX?: number;             // Baseline center X position (usually lane center)
  oscillationPhase?: number;  // Current phase angle φ (radians)
  oscillationAmp?: number;    // Amplitude A (pixels, sway distance from baseX)
  oscillationFreq?: number;   // Angular frequency ω (rad/sec)

  // Sector 3: Armored Enforcer Mechanics
  armor?: number;             // Current armor plating points remaining
  maxArmor?: number;          // Initial armor plating capacity
  isArmorFlash?: number;      // Visual deflection flash duration timer (seconds)

  // Sector 4: Behemoth Energy Core Reveal Mechanics
  coreRevealed?: boolean;     // Whether vulnerable reactor core is currently exposed
  coreTimer?: number;         // Elapsed cycle timer (seconds)
}
```

### 3.2 Spawning & Initialization Defaults

When an alien is created in `GameEngine.spawnAlienInLane(lane, yPos, type)`:

| Alien Type / Sector Context | Field | Recommended Default | Rationale |
| :--- | :--- | :--- | :--- |
| **Any Alien** | `baseX` | `x` (lane center) | Serves as the fixed gravitational anchor for horizontal sway |
| **Sector 2 Swarms** (`isZigzag`) | `oscillationAmp`<br>`oscillationFreq`<br>`oscillationPhase` | `28`<br>`3.8`<br>`(lane * 0.9) + Math.random() * 0.4` | Sway amplitude of $\pm 28$px covers ~60% of lane width ($96$px). Angular frequency $3.8$ rad/s yields a period $T \approx 1.65$s. Staggered phase prevents lockstep movement. |
| **Sector 3 Mech-Crab** | `armor`<br>`maxArmor`<br>`hp` | `2`<br>`2`<br>`2` | Absorbs exactly 2 hits in armor plating before HP is damaged. Total 4 hits to destroy. |
| **Sector 4 Behemoth** | `coreRevealed`<br>`coreTimer`<br>`hp` | `false`<br>`Math.random() * 2.0`<br>`6` | Starts in armored state. Randomized timer offset desynchronizes multiple behemoths on screen. Tanky 6 HP pool. |

---

## 4. Blueprint 2: Movement Updates & Zig-Zag Swarm Math

### 4.1 Mathematical Formulation
For each alien configured with horizontal oscillation:

$$x(t) = \text{clamp}\Big(\text{baseX} + A \cdot \sin(\omega t + \phi), \;\frac{w}{2}, \;W_{\text{canvas}} - \frac{w}{2}\Big)$$

Where:
- $\text{baseX}$: Anchor horizontal center (pixel coordinate).
- $A$: Horizontal oscillation amplitude (`alien.oscillationAmp`, typically 25–30px).
- $\omega$: Angular velocity (`alien.oscillationFreq`, typically 3.5–4.5 rad/s).
- $\phi$: Phase angle (`alien.oscillationPhase`, accumulated per-frame: $\phi \leftarrow \phi + \omega \cdot \Delta t$).
- $w$: Entity sprite width (`alien.width`).
- $W_{\text{canvas}}$: Screen width (`this.state.canvasWidth`, default 480px).

### 4.2 Continuous Frame Update vs. Discrete March Stepping
The horizontal oscillation must be updated **continuously every frame** in `update(dt)`, while vertical descent remains synchronized with the discrete march step:
- **Continuous $X$ update:** Ensures 60 FPS fluid weaving motion. Allows bullets travelling along lane axes to hit or miss depending on dynamic spatial alignment.
- **Discrete $Y$ descent:** Preserves the classic Space Invaders march cadence and sound rhythm (`soundEngine.playAlienMarchNext()`).

### 4.3 Code Implementation Blueprint in `GameEngine.update(dt)`

Insert between step 2 and step 3 (or at the top of alien updates):

```typescript
// 2b. Update Continuous Alien State (Zig-zag horizontal flight & Core cycle timers)
for (const alien of this.state.aliens) {
  // Horizontal Sinusoidal Oscillation (Sector 2 Asteroid Belt Swarms)
  if (alien.oscillationAmp && alien.oscillationFreq) {
    alien.oscillationPhase = (alien.oscillationPhase ?? 0) + alien.oscillationFreq * dt;
    const offset = alien.oscillationAmp * Math.sin(alien.oscillationPhase);
    const baseX = alien.baseX ?? alien.x;
    const halfW = alien.width / 2;
    alien.x = Math.max(halfW, Math.min(this.state.canvasWidth - halfW, baseX + offset));
  }

  // Energy Core Reveal Cycle (Sector 4 Heavy Assault Behemoths)
  if (alien.coreTimer !== undefined || alien.type === 'behemoth') {
    alien.coreTimer = (alien.coreTimer ?? 0) + dt;
    const cycleTotal = 6.0;   // 6.0 seconds complete period
    const openDuration = 3.0; // 3.0 seconds core exposed, 3.0 seconds blast doors shut
    const cycleProgress = alien.coreTimer % cycleTotal;
    
    // Core opens during the second half of the cycle [3.0s, 6.0s)
    const wasRevealed = alien.coreRevealed;
    alien.coreRevealed = cycleProgress >= (cycleTotal - openDuration);

    // Particle emission upon reactor state change
    if (!wasRevealed && alien.coreRevealed) {
      this.spawnExplosionParticles(alien.x, alien.y, '#76ff03', 6);
    }
  }

  // Decay visual hit & deflection flashes
  if (alien.isHitFlash > 0) alien.isHitFlash -= dt;
  if (alien.isArmorFlash && alien.isArmorFlash > 0) alien.isArmorFlash -= dt;
}
```

---

## 5. Blueprint 3: Bullet Collision Dynamics

### 5.1 Collision & Damage Resolution State Machine

```
Bullet Collision Detected (dist < hitRadius)
                     │
                     ▼
       ┌───────────────────────────┐
       │ Does alien have armor > 0?│
       └─────────────┬─────────────┘
                     │
        YES ─────────┴───────── NO
         │                       │
         ▼                       ▼
 ┌───────────────┐     ┌────────────────────────────────────┐
 │ ARMOR DEFLECT │     │ Does alien have core reveal cycle? │
 └───────┬───────┘     └─────────────────┬──────────────────┘
         │                               │
         │                 YES ──────────┴────────── NO
         │                  │                         │
         │                  ▼                         ▼
         │        ┌───────────────────┐      ┌─────────────────┐
         │        │ Is coreRevealed?  │      │ STANDARD HIT    │
         │        └─────────┬─────────┘      │ Dmg = b.damage  │
         │                  │                └────────┬────────┘
         │      YES ────────┴──────── NO              │
         │       │                     │              │
         │       ▼                     ▼              │
         │ ┌───────────────┐   ┌────────────────┐     │
         │ │ CORE CRITICAL │   │ ARMORED PLATES │     │
         │ │ Dmg = 2.0x    │   │ Dmg = 0.5x     │     │
         │ └───────┬───────┘   └───────┬────────┘     │
         │         │                   │              │
         ▼         ▼                   ▼              ▼
   [Absorption] [Damage HP]        [Damage HP]   [Damage HP]
         │         │                   │              │
         └─────────┴───────────────────┴──────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Check if alien.hp <= 0│
                     └───────────────────────┘
```

### 5.2 Detailed Mechanics Specification

#### A. Sector 3 Armored Mech-Crab Enforcers
- **Armor Durability:** Initial `armor = 2`.
- **Absorption:** When `alien.armor > 0`:
  - Armor absorbs the bullet: `alien.armor -= 1;`.
  - **HP is completely protected:** `alien.hp` does NOT decrease.
  - **Visual Feedback:**
    - `alien.isArmorFlash = 0.18;` (electric cyan deflection flash).
    - Deflection spark particles (`this.spawnDeflectionParticles(b.x, b.y, '#00e5ff', 8)`).
    - If armor drops to 0 (armor cracked): Shatter burst of 12 cyan particles (`#00f3ff`).
  - **Audio Feedback:**
    - High-frequency metallic ricochet clink (`soundEngine.playArmorDeflect()`).
  - **Bullet Lifecycle:** Bullet is consumed (`bulletHit = true;`), except piercing plasma.

#### B. Sector 4 Heavy Assault Behemoths
- **Core Open State (`alien.coreRevealed === true`):**
  - **Critical Bonus Damage:** `const damage = Math.round(b.damage * 2.0);`
    - Base starter shot ($1 \to 2$ damage).
    - Standard laser ($2 \to 4$ damage).
    - Plasma barrage ($5 \to 10$ damage — lethal one-shot!).
  - **Visual Feedback:**
    - Pulsating emerald/white reactor explosion (`#76ff03` and `#ffffff`, 12 particles).
    - `alien.isHitFlash = 0.25;`
  - **Audio Feedback:**
    - Resonant plasma critical burst (`soundEngine.playCoreCritical()`).
- **Core Closed State (`alien.coreRevealed === false`):**
  - **Damage Mitigation:** `const damage = Math.max(1, Math.floor(b.damage * 0.5));`
    - Standard laser ($2 \to 1$ damage).
    - Plasma ($5 \to 2$ damage).
  - **Visual Feedback:**
    - Heavy armor ricochet sparks (`#ffd600`, 6 particles).
    - `alien.isHitFlash = 0.08;`
  - **Audio Feedback:**
    - Dull metallic impact sound.

#### C. Standard Entities (Scouts, Unarmored)
- Standard damage: `alien.hp -= b.damage;`
- Standard hit flash: `alien.isHitFlash = 0.15;`
- Standard yellow impact particles: `#ffe600`.

---

## 6. Concrete Code Blueprint (`GameEngine.ts`)

Here is the exact code block replacing lines 456–474 in `src/engine/GameEngine.ts`:

```typescript
      let bulletHit = false;
      for (let j = this.state.aliens.length - 1; j >= 0; j--) {
        const alien = this.state.aliens[j];
        const dist = Math.hypot(b.x - alien.x, b.y - alien.y);
        const hitRadius = (alien.width + b.width) / 2;

        if (dist < hitRadius) {
          bulletHit = true;

          // 1. Sector 3: Armored Enforcer Defense (Armor absorbs hits before HP)
          if (alien.armor !== undefined && alien.armor > 0) {
            alien.armor -= 1;
            alien.isArmorFlash = 0.18;
            soundEngine.playArmorDeflect();
            this.spawnDeflectionParticles(b.x, b.y, '#00e5ff', 8);

            if (alien.armor === 0) {
              // Armor cracked! Metallic shatter explosion
              this.spawnExplosionParticles(alien.x, alien.y, '#00f3ff', 12);
            }
          } else {
            // 2. Damage Resolution: Sector 4 Core Reveal Multiplier or Standard Damage
            let effectiveDamage = b.damage;

            if (alien.coreRevealed !== undefined || alien.type === 'behemoth') {
              if (alien.coreRevealed) {
                // Vulnerable reactor core exposed -> 2.0x Critical Bonus Damage!
                effectiveDamage = Math.round(b.damage * 2.0);
                alien.isHitFlash = 0.25;
                soundEngine.playCoreCritical();
                this.spawnExplosionParticles(b.x, b.y, '#76ff03', 10);
                this.spawnExplosionParticles(b.x, b.y, '#ffffff', 4);
              } else {
                // Armored blast doors closed -> 50% Reduced Damage
                effectiveDamage = Math.max(1, Math.floor(b.damage * 0.5));
                alien.isHitFlash = 0.08;
                soundEngine.playArmorDeflect();
                this.spawnDeflectionParticles(b.x, b.y, '#ffd600', 6);
              }
            } else {
              // Standard Alien Damage
              alien.isHitFlash = 0.15;
              this.spawnExplosionParticles(b.x, b.y, '#ffe600', 6);
            }

            alien.hp -= effectiveDamage;

            if (alien.hp <= 0) {
              this.handleAlienDefeated(alien, j);
            }
          }
          break;
        }
      }
```

### 6.1 Particle Helper Implementation (`GameEngine.ts`)

Add alongside `spawnExplosionParticles`:

```typescript
  private spawnDeflectionParticles(x: number, y: number, color: string = '#00e5ff', count: number = 8): void {
    for (let i = 0; i < count; i++) {
      // Sparks bounce downwards/outwards away from armor hull
      const angle = Math.PI * 0.2 + Math.random() * Math.PI * 0.6;
      const speed = Math.random() * 150 + 60;
      this.state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * speed * 1.4,
        vy: Math.sin(angle) * speed * 0.7,
        color,
        size: Math.random() * 2 + 1.5,
        life: 0.22,
        maxLife: 0.22
      });
    }
  }
```

---

## 7. Visual & Audio Integration

### 7.1 Visual Rendering Enhancements (`src/engine/Renderer.ts`)

In `Renderer.renderAliens()`:
1. **Armor Plating Bar for Mech-Crabs:**
   ```typescript
   if (alien.armor !== undefined && alien.armor > 0) {
     const barW = alien.width * 0.7;
     const barH = 3;
     const barX = alien.x - barW / 2;
     const barY = alien.y - alien.height / 2 - 6;

     ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
     ctx.fillRect(barX, barY, barW, barH);

     const armorRatio = alien.armor / (alien.maxArmor ?? 2);
     ctx.fillStyle = '#00e5ff';
     ctx.shadowColor = '#00e5ff';
     ctx.shadowBlur = 4;
     ctx.fillRect(barX, barY, barW * armorRatio, barH);
     ctx.shadowBlur = 0;
   }
   ```
2. **Deflection Flash Filter:**
   ```typescript
   if (alien.isArmorFlash && alien.isArmorFlash > 0) {
     ctx.filter = 'drop-shadow(0 0 6px #00e5ff) brightness(1.8)';
   } else if (alien.isHitFlash > 0) {
     ctx.filter = 'brightness(2.5)';
   }
   ```
3. **Pulsating Energy Core Aura for Behemoths:**
   ```typescript
   if (alien.coreRevealed) {
     ctx.save();
     ctx.translate(alien.x, alien.y);
     const pulse = Math.sin(performance.now() * 0.015) * 2;
     ctx.strokeStyle = '#76ff03';
     ctx.lineWidth = 2;
     ctx.shadowColor = '#00ff66';
     ctx.shadowBlur = 8 + pulse;
     ctx.beginPath();
     ctx.arc(0, 0, 10 + pulse, 0, Math.PI * 2);
     ctx.stroke();
     ctx.fillStyle = 'rgba(118, 255, 3, 0.2)';
     ctx.fill();
     ctx.restore();
   }
   ```

### 7.2 Web Audio Synthesis Enhancements (`src/engine/SoundEngine.ts`)

Add synthesized sound effects to `SoundEngine.ts`:

```typescript
  public playArmorDeflect(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // High-pitched metallic ricochet
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.08);

    gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playCoreCritical(): void {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Energetic plasma critical zap
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(1150, now + 0.14);

    gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);
  }
```

---

## 8. Automated Verification Test Suite

To prove correctness and prevent regressions, a dedicated unit test file `tests/movementAndCollision.test.ts` should be added to `package.json` test executions:

### Test Specifications

1. **Test 1: Alien Model Typing & Default Fields**
   - Asserts all new optional fields compile cleanly in TypeScript.
2. **Test 2: Sector 2 Sinusoidal Flight Invariants**
   - Simulates $1000$ dt frames ($dt = 0.016$s).
   - Verifies $x(t) \in [baseX - A, baseX + A]$ for unconstrained paths.
   - Verifies canvas boundary clamping strictly holds: $width/2 \le x \le canvasWidth - width/2$.
3. **Test 3: Sector 3 Mech-Crab Armor Durability**
   - Initializes crab with `armor: 2`, `hp: 2`.
   - Hit 1: `armor` decreases to 1, `hp` remains 2. Deflection triggered.
   - Hit 2: `armor` decreases to 0, `hp` remains 2. Armor broken.
   - Hit 3: `hp` decreases to 0. Alien defeated.
   - Asserts total hits required = 3 (strict multi-hit armor requirement verified).
4. **Test 4: Sector 4 Behemoth Core Reveal Vulnerability Windows**
   - Initializes behemoth with 6.0s cycle (3.0s closed, 3.0s open).
   - At $t = 1.0$s (closed): standard 2-dmg shot deals $1$ dmg ($50\%$ reduction).
   - At $t = 4.0$s (open): standard 2-dmg shot deals $4$ dmg ($2.0\times$ critical bonus).
   - Verifies state transitions occur predictably without memory leaks.
5. **Test 5: Backward Compatibility**
   - Verifies standard Scout entities without armor or core cycles continue taking standard $1\times$ damage.

---

## 9. Next Steps for Implementation Agents

1. **`GameState.ts`:** Add optional fields to `Alien` interface.
2. **`GameEngine.ts`:**
   - Add horizontal oscillation & core reveal cycle updates in `update(dt)`.
   - Update bullet collision loop with armor deflection & core critical multipliers.
   - Add `spawnDeflectionParticles` helper.
3. **`SoundEngine.ts`:** Add `playArmorDeflect` and `playCoreCritical`.
4. **`Renderer.ts`:** Render armor bars, deflection flashes, and pulsating core aura.
5. **Verification:** Run `tests/movementAndCollision.test.ts` and `npm run build`.
