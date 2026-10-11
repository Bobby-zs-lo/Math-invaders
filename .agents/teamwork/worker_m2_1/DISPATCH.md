## 2026-10-10T19:39:01Z
You are worker_m2_1, an implementation worker agent.
Your working directory is: c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m2_1
Your parent conversation ID is: e4d2cab8-c238-4225-807a-7d54d18368ab

MANDATORY FIRST STEP: Read the user request at:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture plan at:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\orchestrator_1\PROJECT.md

Read the full analysis and implementation blueprints from the Milestone 2 explorers:
1. c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\explorer_m2_1\analysis.md
2. c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\explorer_m2_2\analysis.md
3. c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\explorer_m2_3\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

USER RULE TO STRICTLY FOLLOW:
Always update the readme file after each feature change. You MUST update README.md documenting the 5 sector attack formations, alien types, and the multi-phase Dreadnought Boss battle.

Your task for Milestone 2:
1. Create `src/engine/SectorConfig.ts`:
   - Implement sector profiles for Sectors 1–5:
     * Sector 1 (Moon Base Alpha): Linear scouting drops with purple Cyber-Scout Drones.
     * Sector 2 (Asteroid Belt): Rapid zig-zag swarms.
     * Sector 3 (Mars Orbit): Armored Mech-Crab Enforcers requiring multiple hits.
     * Sector 4 (Jupiter Rings): Heavy Assault Behemoths with energy core reveals.
     * Sector 5 (Deep Space Nebula): Escalating elite armada culminating in Sector 5 Stage 5 colossal Dreadnought Boss.
   - Stage configurations, row counts, speed multipliers, and alien type compositions for all stages.
2. Update `src/models/GameState.ts`:
   - Extend `Alien` model with `baseX`, `oscillationPhase`, `oscillationAmp`, `oscillationFreq`, `armor`, `maxArmor`, `isArmorFlash`, `coreRevealed`, `coreTimer`, `bossPhase`, `shieldHp`, `maxShieldHp`, `overloadTimer`, `minionsSpawned`, `destructionTimer`.
3. Update `src/engine/GameEngine.ts`:
   - In `spawnAlienFormation()`, use `SectorConfig` to spawn sector-specific formations based on `this.state.sectorId` and `this.state.stageId`.
   - In `update(dt)`, implement continuous horizontal sinusoidal flight for Sector 2 zig-zag aliens: $x = \text{clamp}(baseX + A \sin(\omega t + \phi), w/2, W - w/2)$.
   - In bullet collision, implement:
     * Sector 3 Mech-Crabs: armor absorbs damage first, spawning cyan deflection sparks; when armor reaches 0, subsequent hits damage HP.
     * Sector 4 Behemoths: core reveal cycles (open/closed timers). Deals critical 2.0x damage when core is open, 0.5x damage when closed.
     * Sector 5 Stage 5 Dreadnought Boss state machine:
       - Phase 1 (Shield): Energy deflector shield absorbs hits with 30 shield HP.
       - Phase 2 (Minions): Wing bays deploy 2–4 minion escort drones.
       - Phase 3 (Core Overload): Core exposed, takes 2.0x critical damage.
       - Phase 4 (Destruction Sequence): Cascading secondary explosions across wings, screen shake for 3 seconds before final stage clear.
4. Update `src/rendering/SpriteGenerator.ts` & `src/rendering/Renderer.ts`:
   - Dreadnought boss sprite, energy deflector shield visual overlay, glowing energy core sprite, deflection sparks, destruction sequence explosions, and top Boss HUD (Boss HP bar + Deflector Shield bar).
5. Create tests in `tests/sectorBoss.test.ts` (runnable via Node 24 `--experimental-strip-types`) verifying:
   - All 5 sectors have distinct wave configurations.
   - Sector 2 horizontal oscillation math is bounded and continuous.
   - Sector 3 armor absorbs hits before HP.
   - Sector 4 core reveal cycle alternates vulnerability.
   - Sector 5 Stage 5 Dreadnought Boss transitions through all 4 phases (Shield -> Minions -> Overload -> Destruction).
   - Integrate into `npm test`.
6. Update `README.md` documenting all Milestone 2 mechanics.

Verification required:
- Run `npm test` and ensure all tests pass (unit math tests + sector boss tests).
- Run `npm run build` and ensure TypeScript and Vite build succeed with zero errors.
- Run `node test_qc.js` and `node test_mobile_qc.js`.

Report your changes in:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m2_1\changes.md
Write your handoff in:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m2_1\handoff.md
Send a completion message to parent (e4d2cab8-c238-4225-807a-7d54d18368ab).
