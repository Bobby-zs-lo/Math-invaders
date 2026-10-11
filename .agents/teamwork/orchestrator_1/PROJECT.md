# Project: Math Invaders Expansion

## Architecture
Math Invaders is an educational arcade game built with Vanilla TypeScript and HTML5 Canvas.
- **MathEngine (`src/math/MathEngine.ts`)**: Problem generation, validation, and solvability across Grades 1–10.
- **Profile & Analytics (`src/models/Profile.ts`, `src/ui/ParentReportModal.ts`)**: Player settings, difficulty presets, and parent analytics telemetry.
- **Game Engine & Formations (`src/engine/GameEngine.ts`, `src/engine/SectorConfig.ts`)**: Wave generation, zig-zag movement, armor deflection, core reveal cycles, and boss state machines.
- **Graphics & Rendering (`src/rendering/SpriteGenerator.ts`, `src/rendering/Renderer.ts`)**: Procedural sprites, visual tier ship upgrades (T1–T4), boss deflector shields, core flares, and explosion animations.
- **Controls & UI (`src/main.ts`, `index.html`, `src/styles/main.css`)**: 5-lane targeting, bottom buttons `[1]–[5]`, keyboard input handling, live non-blocking upgrade drawer, and responsive viewports.
- **Verification Suite (`tests/mathEngine.test.ts`, `tests/playwright/`)**: 1000-problem unit tests across all 10 grades and comprehensive desktop/mobile Playwright E2E tests.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Grade 1–2 Curriculum | Single/double digit addition & subtraction within 10 and 20 | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Grade 3–4 Curriculum | Multiplication tables (1–12), clean integer division, numbers to 100 | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Grade 5–6 Curriculum | Multi-step arithmetic, order of operations, negative numbers, decimals/fractions | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Grade 7–10 Curriculum | Pre-algebra, linear equations ($ax + b = c$), integer exponents, algebraic variables | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Solvable Answers Guarantee | 100% valid solvable answers, zero division-by-zero or indeterminate states | M1 | ORIGINAL_REQUEST §R1 |
| 6 | 1000-Problem Automated Test | Automated test verifying 1000 generated problems across Grades 1–10 | M1 | ORIGINAL_REQUEST §R1, §R4 |
| 7 | Negative Number Input Support | `(-)` button on numpad & keyboard `-` listener support for entering negative answers | M1 | Survey Finding |
| 8 | Parent Analytics Telemetry | Log solve times, accuracy %, trouble spots, and include upgrade station problems | M1 | ORIGINAL_REQUEST §R1 |
| 9 | Sector 1 Moon Base Alpha | Linear scouting drops with purple Cyber-Scout Drones | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Sector 2 Asteroid Belt | Rapid zig-zag swarms with sinusoidal horizontal oscillation | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Sector 3 Mars Orbit | Armored Mech-Crab Enforcers requiring multiple hits with deflection feedback | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Sector 4 Jupiter Rings | Heavy Assault Behemoths with energy core reveal vulnerability cycles | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Sector 5 Stage 5 Dreadnought Boss | Colossal multi-phase boss: Phase 1 Shield, Phase 2 Minions, Phase 3 Overload, Phase 4 Destruction | M2 | ORIGINAL_REQUEST §R2 |
| 14 | Responsive 5-Lane Targeting | Canvas tap/click, bottom lane buttons `[1]–[5]`, Arrow/A/D navigation | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Keyboard Input Disambiguation | Prevent digits 1–5 from triggering lane switch when typing answers | M3 | Survey Finding |
| 16 | Real-Time Upgrade Drawer | Non-pausing live upgrade drawer; fix mobile default open state bug | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Ship Upgrade Visual Tiers | Tier 1 Starter, Tier 2 Dual-Wing Hunter, Tier 3 Plasma Cruiser, Tier 4 Neon Flagship sprites | M3 | ORIGINAL_REQUEST §R3 |
| 18 | Responsive Viewport Polish | Pixel-perfect canvas rendering across desktop (1280x800) and mobile (414x896) | M3 | ORIGINAL_REQUEST §R3 |
| 19 | Automated Playwright Desktop E2E | Profile creation, difficulty customization, star map, combat targeting, live upgrading, analytics on 1280x800 | M4 | ORIGINAL_REQUEST §R4 |
| 20 | Automated Playwright Mobile E2E | Comprehensive mobile test suite on 414x896 verifying responsive layout and touch controls | M4 | ORIGINAL_REQUEST §R4 |
| 21 | Build Verification & Zero Errors | `npm run build` succeeds with zero TypeScript or Vite errors | M4 | ORIGINAL_REQUEST Acceptance Criteria |
| 22 | README.md Maintenance | Update README.md after each feature milestone per user rule | M1–M4 | User Rule |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | MathEngine Grade 1–10 Curriculum & Parent Analytics | Features 1–8, 22: MathEngine expansion, presets for G1–10, negative input, parent telemetry, 1000-problem unit test | None | DONE |
| M2 | Sector Formations & Multi-Phase Dreadnought Boss | Features 9–13, 22: SectorConfig blueprints, zig-zag motion, armor deflection, core reveal, Dreadnought 4-phase boss battle | M1 | DONE |
| M3 | Controls, Live Upgrade Drawer & Ship Visual Tiers | Features 14–18, 22: 5-lane targeting, bottom buttons, mobile drawer fix, typing disambiguation, T1–T4 visual ship transformations | M2 | DONE |
| M4 | Playwright E2E Suite, Build Verification & README | Features 19–22: Comprehensive Playwright test suite for Desktop & Mobile, npm test integration, build validation, README update | M1, M2, M3 | DONE |

---

## Interface Contracts

### MathEngine ↔ GameEngine & Profile
```typescript
interface MathProblem {
  id: string;
  question: string;
  answer: number;
  grade: number;
  operation: string;
  lane?: number;
  options?: number[];
  hint?: string;
  isNegativeAllowed?: boolean;
}

function generateProblemForGrade(grade: number, settings?: Partial<MathSettings>): MathProblem;
function validateProblem(problem: MathProblem): boolean;
```

### SectorConfig ↔ GameEngine
```typescript
interface SectorConfig {
  sectorId: number;
  name: string;
  description: string;
  alienPool: ('scout' | 'crab' | 'behemoth')[];
  movementPattern: 'linear' | 'zigzag' | 'armored' | 'core_reveal';
  bossType?: 'dreadnought' | 'standard';
  stages: StageConfig[];
}

interface DreadnoughtState {
  phase: 'shield' | 'minions' | 'overload' | 'destruction';
  shieldHp: number;
  maxShieldHp: number;
  coreVulnerable: boolean;
  overloadTimer: number;
  minionsSpawned: boolean;
  destructionTimer: number;
}
```

### Controls ↔ GameEngine
```typescript
// Lane selection: 0 to 4
selectLane(laneIndex: number): void;
// Firing:
fireLane(laneIndex: number, answerInput?: string): boolean;
// Live upgrade solving:
solveUpgradeBonus(answer: number): boolean;
```

---

## Code Layout
- `src/math/MathEngine.ts`: Curriculum math generation logic
- `src/models/Profile.ts`: Math presets for Grades 1–10, PlayerStats & telemetry
- `src/ui/ParentReportModal.ts`: Parent analytics UI & offline practice report
- `src/engine/SectorConfig.ts`: Sector definitions (Sectors 1–5), wave configs, boss parameters
- `src/engine/GameEngine.ts`: Wave spawning, collision, Dreadnought boss state machine, live upgrades
- `src/models/GameState.ts`: Alien entity models (armor, core status, phase, oscillation)
- `src/rendering/SpriteGenerator.ts`: Sprites for Dreadnought boss, core flare, shields, and ship tiers 1–4
- `src/rendering/Renderer.ts`: Canvas rendering of shield effects, core vulnerability, ship tiers
- `src/main.ts`: Event listeners, keyboard input disambiguation, mobile drawer initialization
- `index.html`: UI structure, virtual numpad `(-)` button, lane buttons `[1]–[5]`
- `tests/mathEngine.test.ts`: 1000-problem automated test suite
- `tests/playwright/`: Comprehensive E2E tests for desktop and mobile
- `README.md`: Up-to-date documentation of game features and architecture
