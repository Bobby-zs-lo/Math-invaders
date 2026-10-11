# Handoff Report: Movement Patterns & Collision Dynamics (Milestone 2)

**Agent:** `explorer_m2_2`  
**Date:** 2026-10-10  
**Status:** Hard Handoff (Investigation & Blueprint Complete)  
**Parent Conversation ID:** `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Detailed Blueprint:** `.agents/teamwork/explorer_m2_2/analysis.md`

---

## 1. Observation

1. **`src/models/GameState.ts` (lines 6–19):**
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
   *Verbatim:* The existing interface lacks any attributes for horizontal oscillation (`baseX`, `oscillationPhase`, `oscillationAmp`, `oscillationFreq`), armor durability (`armor`, `maxArmor`), deflection flash (`isArmorFlash`), or core reveal status (`coreRevealed`, `coreTimer`).

2. **`src/engine/GameEngine.ts` (lines 427–443):**
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
   *Verbatim:* Aliens only move via vertical descent steps during march ticks (`alien.y += this.state.marchStepY`). `alien.x` is permanently frozen at its initial spawn position with zero horizontal velocity or oscillation logic.

3. **`src/engine/GameEngine.ts` (lines 457–473):**
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
   *Verbatim:* Collisions unconditionally subtract `b.damage` directly from `alien.hp`. No armor absorption exists (Mech-Crabs take HP damage immediately on first hit), and no vulnerability window or damage multipliers exist for Behemoths.

4. **Static Compilation & Test Suite Baseline:**
   - Command `npm test`: Exited with code 0 (`MathEngine 1,000-Problem Verification Suite`, 20 passed, 0 failed, 31.7ms).
   - Command `npm run build`: Exited with code 0 (`tsc && vite build`, 17 modules transformed, built in 263ms).

---

## 2. Logic Chain

1. **Model Extensibility (from Observation 1):**
   - Adding optional fields `baseX?: number`, `oscillationPhase?: number`, `oscillationAmp?: number`, `oscillationFreq?: number`, `armor?: number`, `maxArmor?: number`, `isArmorFlash?: number`, `coreRevealed?: boolean`, and `coreTimer?: number` to `Alien` in `GameState.ts` introduces zero breaking changes to existing instantiations while enabling full support for Sectors 2, 3, and 4.
2. **Continuous Horizontal Flight vs Discrete Vertical March (from Observation 2):**
   - In Sector 2, horizontal position must follow $x(t) = \text{clamp}(baseX + A \sin(\omega t + \phi), w/2, W - w/2)$ evaluated continuously every frame in `update(dt)`.
   - Discrete march cadence (`marchStepY`) is preserved along the Y-axis. This combines silky 60 FPS sinusoidal weaving with the classic Space Invaders march rhythm.
3. **Armor Absorption Before HP Damage (from Observation 3):**
   - In Sector 3, Mech-Crabs spawned with `armor: 2, maxArmor: 2` intercept incoming bullets.
   - When `alien.armor > 0`, incoming hits decrement `armor -= 1`, protect `hp`, spawn cyan deflection sparks (`#00e5ff`), play `playArmorDeflect()`, and trigger `isArmorFlash = 0.18`. Only after `armor` reaches 0 do subsequent hits damage `hp`.
4. **Periodic Core Reveal Vulnerability Cycle (from Observation 3):**
   - In Sector 4, Behemoths update `coreTimer += dt`. Over a 6.0s cycle, the core is closed for 3.0s and exposed for 3.0s.
   - When `coreRevealed === true`, hits deal $2.0\times$ critical damage (`Math.round(b.damage * 2.0)`) with glowing green/white plasma discharges (`#76ff03`).
   - When `coreRevealed === false`, closed blast doors mitigate damage by $50\%$ (`Math.max(1, Math.floor(b.damage * 0.5))`) with yellow deflection sparks (`#ffd600`).
5. **Architectural Coherence (from Observation 4):**
   - The proposed blueprint introduces cleanly isolated updates within `GameState.ts`, `GameEngine.ts`, `Renderer.ts`, and `SoundEngine.ts` that preserve the existing 100% green build and test status.

---

## 3. Caveats

- **Sector 5 Dreadnought Boss Integration:** Multi-phase boss mechanics (deflector shields, minion spawning, core overload) are assigned to peer agent `explorer_m2_3`. The collision loop blueprint is designed so boss-specific phase logic (e.g. boss shield interception) can plug directly above the standard alien checks.
- **Wave Spawning Parameters:** Exact wave compositions, stage escalations, and row allocations across stages 1–5 are designed by peer agent `explorer_m2_1` in `SectorConfig.ts`. Our collision and movement blueprint relies on standard initial values (`armor`, `oscillationAmp`, etc.) passed by `spawnAlienInLane`.

---

## 4. Conclusion

The movement patterns and collision dynamics for Milestone 2 have been thoroughly designed and specified with exact drop-in code snippets:
1. `Alien` model in `src/models/GameState.ts` extended with 9 optional fields.
2. Continuous horizontal sinusoidal oscillation in `GameEngine.ts` line 351/411 with canvas clamping.
3. Armor absorption state machine for Sector 3 Mech-Crab Enforcers (multi-hit armor durability + deflection feedback).
4. Core reveal cycle state machine for Sector 4 Heavy Assault Behemoths ($2.0\times$ critical damage when open, $0.5\times$ reduced damage when closed).
5. Comprehensive visual rendering and Web Audio API synthesis specifications in `Renderer.ts` and `SoundEngine.ts`.

All details and code snippets are available in `.agents/teamwork/explorer_m2_2/analysis.md`.

---

## 5. Verification Method

1. **Static Analysis & Type Checking:**
   ```bash
   npm run build
   ```
   Must succeed with zero TypeScript or Vite errors (`tsc && vite build`).

2. **Automated Unit & Math Verification:**
   ```bash
   npm test
   ```
   Must continue to pass 100% of tests.

3. **Movement & Collision Invariant Verification:**
   Inspect `tests/movementAndCollision.test.ts` to assert:
   - Sector 2: $x(t)$ remains bounded within $[baseX - A, baseX + A]$ and clamped to canvas dimensions.
   - Sector 3: Mech-Crab absorbs exactly 2 hits to armor before taking HP damage.
   - Sector 4: Behemoth takes $2.0\times$ damage when core is open and $0.5\times$ damage when closed.
