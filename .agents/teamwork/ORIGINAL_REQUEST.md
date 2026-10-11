# Original User Request

## Initial Request — 2026-10-10T18:31:58Z

Expand Math Invaders into a feature-complete educational arcade game spanning Grades 1 through 10, featuring distinctive alien attack patterns across all 5 cosmic sectors, multi-phase boss fights, real-time ship upgrade mechanics, and a rigorous automated multi-agent test suite verifying desktop and mobile gameplay.

Working directory: c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders
Integrity mode: development

## Requirements

### R1. Comprehensive Grade 1–10 Curriculum Engine
Expand `MathEngine` to support robust, age-appropriate problem generation across all 10 grades:
- Grades 1–2: Single/double-digit addition and subtraction within 10 and 20.
- Grades 3–4: Multiplication tables (1–12), clean integer division, and numbers to 100.
- Grades 5–6: Multi-step arithmetic, order of operations, negative numbers, and decimals/fractions.
- Grades 7–10: Pre-algebra, linear equations ($ax + b = c$), integer exponents, and algebraic variables.
Ensure all generated equations have well-defined, positive or negative integer solutions with zero divide-by-zero or indeterminate states.

### R2. Sector Formations & Multi-Phase Boss Battles
Implement unique alien formation behaviors and attack pacing across all 5 planetary sectors:
- Sector 1 (Moon Base Alpha): Linear scouting drops with purple Cyber-Scout Drones.
- Sector 2 (Asteroid Belt): Rapid zig-zag swarms.
- Sector 3 (Mars Orbit): Armored Mech-Crab Enforcers requiring multiple hits.
- Sector 4 (Jupiter Rings): Heavy Assault Behemoths with energy core reveals.
- Sector 5 (Deep Nebula Boss): A colossal multi-phase Mechanical Dreadnought Boss featuring an active energy deflector shield, minion drone deployment, core overload vulnerability phases, and spectacular destruction sequences.

### R3. Real-Time Gameplay Polish & Responsive Touch/Key Controls
- Maintain real-time arcade combat tension: the in-stage Upgrade Drawer must operate without pausing the game loop or stopping alien descent.
- Support seamless lane targeting across all 5 lanes via direct screen tap/click, bottom lane buttons with key indicators `[1]–[5]`, and arrow/`A`/`D` navigation.
- Ensure pixel-perfect canvas rendering where the player starship, defense line, laser barrages, and upgrade transformations (Tier 1 Starter, Tier 2 Dual-Wing Hunter, Tier 3 Plasma Cruiser, Tier 4 Neon Flagship) are clearly visible across desktop and mobile screens.

### R4. Automated Testing & Verification Suite
Implement an automated test suite verifying all aspects of the application:
- Math Engine unit tests generating and validating 1000+ math problems across all 10 grades.
- Playwright E2E browser tests validating profile creation, difficulty customization, star map progression, combat lane targeting, real-time upgrading, and parent analytics reporting on both desktop (1280x800) and mobile (414x896) viewports.

## Acceptance Criteria

### Curriculum & Math Verification
- [ ] Automated test verifying 1000 generated problems across Grades 1–10 with 100% valid solvable answers and zero mathematical errors.
- [ ] Parent analytics report accurately logs solve times, accuracy %, and recent trouble spots for offline practice.

### Sector & Boss Mechanics
- [ ] All 5 sectors have distinct alien wave compositions and escalations.
- [ ] Sector 5 Stage 5 features the multi-phase Mechanical Dreadnought Boss with energy shields and core reveal phases.

### Combat & Responsive UI
- [ ] Player can target any of the 5 lanes via canvas click, touch, and keys `1–5` without input lag.
- [ ] Upgrade drawer allows solving bonus math problems live while aliens continue descending, successfully unlocking Tier 2, Tier 3, and Tier 4 weapons.
- [ ] Desktop and mobile views render without horizontal clipping, with the player ship and HUD fully visible.

### Build & Test Automation
- [ ] `npm run build` succeeds with zero TypeScript or Vite errors.
- [ ] Automated Playwright tests pass with 100% green status on desktop and mobile viewports.
