# Architectural Analysis & Investigation Report: Requirements 3 & 4

**Agent:** `explorer_survey_3`  
**Date:** 2026-10-10  
**Focus:** Requirement 3 (R3: Real-Time Gameplay Polish & Responsive Touch/Key Controls), Requirement 4 (R4: Automated Testing & Verification Suite), and Testing/UI Infrastructure.  
**Working Directory:** `c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\explorer_survey_3`

---

## Executive Summary

1. **Frontend Architecture:** Math Invaders is built using **Vanilla TypeScript + HTML5 Canvas** bundled with **Vite 6** (`vite.config.ts`), with procedural audio via the **Web Audio API** and persistent state in **LocalStorage**. There is **no React and no Vue** in the codebase. All UI components are structured as modular TypeScript classes mounting semantic HTML fragments and binding DOM events.
2. **In-Stage Upgrade Drawer (R3):** Operates completely in **real-time without pausing the game loop** or stopping alien descent. However, a major mobile bug was identified: on screen widths < 768px, the drawer starts **open** by default and overlays 68% of the mobile screen (width 280px out of 414px) with `z-index: 30`, obscuring the canvas and blocking the `#btn-toggle-upgrade-panel` HUD button (`z-index: 15`).
3. **Controls & 5-Lane Targeting (R3):** Supports 5 lanes via canvas clicks, on-screen DOM column overlays (`.lane-click-col`), bottom lane buttons (`.lane-btn [1]–[5]`), and Arrow/`A`/`D` navigation. However, a critical **keyboard numeric conflict** exists: in `src/main.ts:426`, keys `1`–`5` are intercepted to switch lanes whenever `currentInput === ''`, preventing players from entering answers starting with digits 1 through 5 from the standard number row.
4. **Canvas Sizing & Responsiveness (R3):** Desktop (1280x800) renders at 876x506 canvas resolution alongside the 320px upgrade sidebar. Mobile (414x896) renders at 410x459 canvas resolution above a compact 3-column numpad. Both viewports maintain pixel-perfect defense lines, starfields, and multi-tier ships without horizontal page overflow (`scrollWidth === clientWidth`).
5. **Testing & Build Infrastructure (R4):** `npm run build` passes cleanly (`tsc && vite build`, 234ms). Playwright is installed; headless execution works reliably using `{ channel: 'chrome', headless: true }` (Google Chrome 154.0.8037.98). Currently, there is **no `npm test` script**, **no 1000+ problem math unit test**, and mobile E2E tests only take a static screenshot of the gateway rather than validating actual gameplay.
6. **User Rule / README.md:** `README.md` exists (78 lines), but must be updated following feature completion to document the unified test suite, mobile controls, and multi-phase boss mechanics.

---

## 1. Frontend Setup & UI Architecture

### 1.1 Technology Stack & Directory Structure
- **Core Stack:** Vanilla TypeScript 5.7.3, HTML5 Canvas 2D Context, Vite 6.2.0, Web Audio API, LocalStorage.
- **Root Entry Point:** `index.html` mounts `./src/main.ts` as an ES module.
- **Core Modules:**
  - `src/main.ts` (524 lines): `MathInvadersApp` orchestrator, DOM event routing, keyboard bindings, and modal instantiation.
  - `src/engine/GameEngine.ts` (523 lines): 60 FPS `requestAnimationFrame` game loop, continuous baseline laser firing, alien march pacing, hit detection, particle pooling, lane selection, and stage progression.
  - `src/engine/Renderer.ts` (274 lines): Pixel-perfect rendering of starfields, vertical dashed lane dividers, defense line, alien sprites, bullet types, thruster particles, and player ships across tiers.
  - `src/engine/SpriteGenerator.ts` (323 lines): Offscreen canvas procedural pixel-art sprites for player ships (Tiers 1–4) and alien invaders (Scouts, Crabs, Behemoths, Boss).
  - `src/engine/SoundEngine.ts` (230 lines): Web Audio API synthesizer for 4-note Space Invader march rhythm, laser sweeps, noise explosions, chime arpeggios, and fanfare.
  - `src/math/MathEngine.ts` (120 lines): Procedural equation generation for lanes and upgrades.
  - `src/models/GameState.ts` (131 lines) & `Profile.ts` (178 lines): State models and LocalStorage persistence.
  - `src/ui/`: Modular modal classes (`ProfileModal`, `DifficultyModal`, `StarMapModal`, `HangarModal`, `ParentReportModal`, `VictoryDefeatModal`, `UpgradeStationModal`).

### 1.2 Views & Screen Lifecycle
`index.html` contains 3 distinct screen views toggled via CSS `.hidden`:
1. `#view-profile-select`: Gateway view where pilots are selected or created, with JSON backup/restore.
2. `#view-star-map`: Candy Crush-style progression map across 5 planetary sectors (5 stages per sector, 25 nodes total).
3. `#view-game-arena`: Combat arena containing `.combat-column` (canvas + HUD + bottom lane/math card) and `#upgrade-side-panel` (in-stage upgrade drawer).

---

## 2. Input Handling & 5-Lane Targeting (R3 Investigation)

### 2.1 Supported Input Modalities
| Modality | Implementation File & Lines | Mechanism | Status / Evaluation |
|---|---|---|---|
| **Direct Canvas Click / Tap** | `src/engine/GameEngine.ts:43-49` | `pointerdown` on `#game-canvas`: `clickX = e.clientX - rect.left`, `lane = Math.floor(clickX / laneWidth)` | ✅ Works seamlessly. |
| **On-Screen Canvas Column Overlays** | `index.html:93-99`, `src/main.ts:374-379` | 5 transparent DOM grid columns `.lane-click-col[data-lane="0..4"]` with `pointerdown` listener | ✅ Provides hover glow and visual feedback. |
| **Bottom Lane Buttons** | `index.html:105-111`, `src/main.ts:367-372` | 5 buttons `.lane-btn` with labels `[1]` through `[5]`, active yellow highlight and indicator dot | ✅ Responsive, touch-friendly, clear key indicators. |
| **Arrow & A / D Steering** | `src/main.ts:434-443` | `keydown`: `ArrowLeft` / `a` / `A` calls `shiftLane(-1)`; `ArrowRight` / `d` / `D` calls `shiftLane(1)` | ✅ Smooth and responsive. |
| **Keyboard Number Keys `1`–`5`** | `src/main.ts:426-431` | `keydown`: `['1', '2', '3', '4', '5'].includes(e.key) && this.currentInput === ''` | ⚠️ **Critical Bug / Conflict Detected** (see 2.2). |
| **Virtual Numpad** | `index.html:125-139`, `src/main.ts:382-400` | 12 buttons (`0`–`9`, `⌫`, `FIRE 🚀`) | ✅ Essential for mobile / touch devices. |

### 2.2 Critical Bug: Keyboard Numeric Row vs. Math Input
- **Observation:** `src/main.ts:426-431`:
  ```typescript
  // Direct Lane Selection Keys: 1, 2, 3, 4, 5 when input is empty
  if (['1', '2', '3', '4', '5'].includes(e.key) && this.currentInput === '') {
    e.preventDefault();
    const targetLane = parseInt(e.key, 10) - 1;
    if (this.gameEngine) this.gameEngine.selectLane(targetLane);
    return;
  }
  ```
- **The Defect:** When a player is presented with a math equation whose answer starts with `1`, `2`, `3`, `4`, or `5` (e.g. `2 + 3 = 5`, `10 + 2 = 12`, `7 - 6 = 1`), `this.currentInput` is initially `''`. When the child presses `1`–`5` on their keyboard to type their answer, the event is intercepted as a lane change rather than digit input. The ship jerks to another lane, resetting the input and discarding the problem.
- **Architectural Solution:**
  1. Distinguish physical numpad (`e.code.startsWith('Numpad')`): Always treat numpad keys as numeric input.
  2. For top-row number keys (`Digit1`–`Digit5`):
     - If the key corresponds to the **already active lane** (`targetLane === this.gameEngine.state.selectedLane`), treat it as digit entry into `currentInput`.
     - Or support modifier/dedicated lane shortcuts (e.g., `Alt+1..5`, or number row switches lanes only when not focused on answering, or top-row always enters digits while `ArrowLeft`/`ArrowRight`/`A`/`D` and canvas tap steer lanes).
     - To strictly satisfy R3 ("keys `1–5` without input lag") and Playwright tests: Allow pressing `1`–`5` to target lanes, but if the current lane is already selected, allow pressing that digit to append to `currentInput`.

---

## 3. In-Stage Upgrade Drawer (R3 Investigation)

### 3.1 Live Non-Blocking Operation
- **Game Loop Independence:** Verified by inspecting `src/engine/GameEngine.ts:310-333` and running Playwright probes:
  - Toggling `#upgrade-side-panel` does **NOT** call `pauseGame()`.
  - `GameEngine.update(dt)` runs continuously via `requestAnimationFrame`.
  - Aliens continue descending via `marchTimer` and `marchStepY`. During our live probe, wave progress advanced from `0%` to `14%` while the upgrade drawer was open and awaiting input.
  - Baseline defense lasers continue firing automatically every `0.18s`–`0.35s`.

### 3.2 Upgrade Math Solving & Weapon Tiers
- **Math Generation:** `src/math/MathEngine.ts:116` generates `activeUpgradeProblem`.
- **Dedicated Mini Numpad:** `#upgrade-side-panel` contains 10 numeric buttons (`.upg-digit`), backspace (`#btn-upg-clear`), and submit (`#btn-upg-submit`).
- **Tier Progression Matrix:**

| Tier | Name | Weapons & Bullet Type | Solve Threshold | Visual Representation |
|---|---|---|---|---|
| **Tier 1** | Starter Scout | 3x Linear Green Lasers (`laser`, dmg 2) | Base (0 solved) | White fuselage, cyan canopy, red wingtips |
| **Tier 2** | Dual-Wing Hunter | Dual Lasers + 2x Yellow V-Spread (`vspread`, dmg 2) | 1 solve | Extended swept wings with wingtip blasters |
| **Tier 3** | Plasma Cruiser | Piercing Cyan Plasma (`plasma`, dmg 5) + Dual Lasers | +2 solves | Heavy twin-engine nacelles with cyan glow |
| **Tier 4** | Neon Flagship | Radiant Plasma (`plasma`, dmg 6) + 2x Chain Lightning (`lightning`, dmg 4) | +3 solves | Radiant cyan energy blade wings + golden core |

### 3.3 Identified Gaps & Deficiencies
1. **Mobile Default Open State (High Severity):**
   - In `index.html:144`: `<aside id="upgrade-side-panel" class="upgrade-side-drawer open">`.
   - In `src/main.ts:207-209`:
     ```typescript
     if (window.innerWidth >= 768) {
       this.upgradeSidePanel.classList.remove('closed');
     }
     ```
   - On screen widths < 768px, `.closed` is **not added**. Consequently, on mobile devices, the drawer starts **open**.
   - With CSS `.upgrade-side-drawer { position: absolute; right: 0; top: 0; width: 280px; height: 100%; z-index: 30; }`, it covers from `x = 132` to `412` (68% of a 414px screen).
   - Because the drawer has `z-index: 30` and `#game-hud` has `z-index: 15`, `.hud-right` is trapped underneath the drawer. Users cannot click `#btn-toggle-upgrade-panel` until they find the tiny `◀` minimize button (`#btn-minimize-upgrade`) inside the drawer header.
   - **Fix:** On mobile (`window.innerWidth < 768`), the drawer must initialize with `.closed` so the player sees the full arena and only opens it when tapping the `⚡ UPGRADE` button.
2. **Drawer Visual Feedback:** On mobile, when opened, the drawer should be semi-translucent (`backdrop-filter: blur(4px)`, `background: rgba(14, 18, 36, 0.88)`) so alien descent remains visible underneath.
3. **Naming Consistency:** In `src/ui/HangarModal.ts:17`, Tier 3 was named "Crimson Vanguard" instead of "Plasma Cruiser". This must match across all files.

---

## 4. Canvas Sizing & Responsive Scaling (R3 Investigation)

### 4.1 Desktop (1280x800) Viewport
- **Container:** `.arcade-container` has `max-width: 1200px; height: 100vh;`. Centered with 40px margins.
- **Layout:** Flex row: `.combat-column` (width ~876px) + `.upgrade-side-drawer` (fixed width 320px).
- **Canvas Dimensions:** Client width: 876px, Client height: 506px. Internal buffer: `876x506`.
- **Entity Placement:**
  - 5 Lanes: `laneWidth = 876 / 5 = 175.2px`.
  - Player Ship: Centered in active lane at `playerY = 506 - 45 = 461px`.
  - Defense Barrier Line: Drawn across full width at `playerY + 20 = 481px` with glowing magenta line (`rgba(255, 0, 127, 0.4)`).
  - Vertical Lane Dividers: Dashed cyan lines `rgba(0, 243, 255, 0.15)`. Active lane highlighted with subtle cyan gradient.
- **Clipping Check:** Zero horizontal clipping. All elements, HUD items, and drawer fit cleanly.

### 4.2 Mobile (414x896) Viewport
- **Container:** `.arcade-container` is 414px x 896px (`100vw` x `100dvh`).
- **Layout:** Flex column. Upgrade drawer is positioned absolute (`transform: translateX(100%)` when closed).
- **Canvas Dimensions:** Client width: 410px, Client height: 459px. Internal buffer: `410x459`.
- **Bottom Math HUD:**
  - `.lane-selector-bar`: 5 buttons, ~78px width each, height ~45px.
  - `.math-card`: Equation prompt (~38px height).
  - `.numpad-grid`: Media query `(max-width: 768px)` switches grid to 3 columns (`repeat(3, 1fr)`). 4 rows of 3 keys (`1`–`9`, `⌫`, `0`, `FIRE 🚀`), height ~190px.
  - Total Math HUD height: ~340px.
- **Entity Placement:**
  - Player ship: `playerY = 459 - 45 = 414px`.
  - Defense line: `playerY + 20 = 434px`.
- **Clipping Check:** `scrollWidth === 414`, `clientWidth === 414`. Zero horizontal scrollbar or overflow.

---

## 5. Build Setup & Tooling Infrastructure

### 5.1 Package & Bundler Configurations
- `package.json`:
  ```json
  {
    "name": "math-invaders",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview"
    },
    "devDependencies": {
      "playwright": "^1.64.0",
      "typescript": "^5.7.3",
      "vite": "^6.2.0"
    }
  }
  ```
  - **Missing:** No `"test"` script exists in `package.json`.
- `tsconfig.json`: Strict mode enabled, ES2022 target, bundler module resolution, `allowImportingTsExtensions: true`.
  - Build test: `tsc` produces **0 type errors**.
- `vite.config.ts`: Configures output to `dist/`, sourcemaps enabled.
  - Build test: `npm run build` completes in **234ms**, generating production assets in `dist/`.

### 5.2 Playwright Runtime Capabilities
- **Browser Executable Observation:**
  - Running Playwright using default bundled chromium (`chromium.launch({ headless: true })`) errors with:
    `Executable doesn't exist at C:\Users\Bobby\AppData\Local\ms-playwright\...`
  - Running with `{ channel: 'chrome', headless: true }` launches the installed system Google Chrome (v154.0.8037.98) **immediately, headlessly, and without errors**.
  - All automated test scripts must either specify `channel: 'chrome'` or run `npx playwright install chromium`.

---

## 6. Automated Testing Suite & Gaps vs. R4

### 6.1 Status of Existing Tests
| Script | Scope | Strengths | Gaps vs R4 |
|---|---|---|---|
| `test_qc.js` | Desktop E2E (1280x800) | Tests startup, profile creation ("Mia", G3), difficulty modal save, star map, stage 1 launch, canvas click, key '2', drawer visibility | Does not test: difficulty customization controls, star map progression, solving math in combat, unlocking upgrade tiers, parent analytics report. |
| `test_mobile_qc.js` | Mobile QC (414x896) | Takes screenshot of gateway screen | Does not test: profile creation, star map, stage launch, canvas sizing, mobile lane buttons, mobile numpad, upgrade drawer toggle/solve, parent report. |
| *Unit Tests* | Math Engine unit test | None exists | **Completely missing:** R4 requires validating 1000+ math problems across all 10 grades. |

### 6.2 Acceptance Criteria Gap Analysis (R4)
1. **Automated test verifying 1000 generated problems across Grades 1–10:**
   - **Gap:** No test currently checks 1000 problems.
   - **Requirements for test:**
     - Test each grade (Grades 1 through 10), generating at least 100 problems per grade (total 1000+).
     - Validate that `answer` is a finite, solvable integer.
     - Validate that division problems have non-zero divisor (`b !== 0`) and clean integer results (`a % b === 0`).
     - Validate that subtraction satisfies `allowNegative` constraints.
     - Validate that pre-algebra linear equations ($ax + b = c$) resolve cleanly.
     - Ensure zero runtime exceptions, zero NaN, zero indeterminate states.
2. **Playwright E2E Browser Tests across Desktop (1280x800) and Mobile (414x896):**
   - **Desktop test must validate:**
     - Profile creation with custom name and avatar.
     - Math difficulty customization (changing grade preset, operations checkboxes, number range slider).
     - Star map progression (unlocked nodes, sector navigation).
     - Combat lane targeting: canvas click, bottom lane buttons, keyboard keys `1`–`5`, arrow keys.
     - Real-time upgrade: reading live bonus problem, submitting answer via mini-numpad, verifying alien descent continues live, verifying ship upgrades from Tier 1 to Tier 2, 3, 4.
     - Parent analytics report modal: verifying solve count, accuracy %, avg speed, operations breakdown, and trouble spots.
   - **Mobile test (414x896) must validate:**
     - Same complete flow on a 414x896 viewport.
     - Upgrade drawer defaults to closed on mobile; opens via `#btn-toggle-upgrade-panel` without blocking HUD.
     - Virtual numpad entries fire lasers into targeted lanes.
     - Zero horizontal clipping or page scrolling.

---

## 7. Concrete Architectural Plan for Implementer

### Step 1: Fix Mobile Drawer & Keyboard Input (`src/main.ts`, `src/styles/main.css`, `index.html`)
1. **Mobile Drawer State:**
   - In `index.html:144`: Change `<aside id="upgrade-side-panel" class="upgrade-side-drawer open">` to `<aside id="upgrade-side-panel" class="upgrade-side-drawer closed">` (or dynamically initialize in `main.ts`).
   - In `src/main.ts:207-210`:
     ```typescript
     if (window.innerWidth >= 768) {
       this.upgradeSidePanel.classList.remove('closed');
     } else {
       this.upgradeSidePanel.classList.add('closed');
     }
     ```
   - In `src/styles/main.css`: Add `z-index: 35` to `#game-hud` or ensure `#btn-toggle-upgrade-panel` is accessible when the drawer is open.
2. **Keyboard Disambiguation:**
   - In `src/main.ts:423-458`:
     - Allow physical numpad (`e.code.startsWith('Numpad')`) to enter digits into `currentInput`.
     - When `Digit1`–`Digit5` is pressed: if `this.currentInput === ''` AND the key matches `this.gameEngine.state.selectedLane + 1`, treat it as digit entry; otherwise switch lanes.
3. **Tier Name Consistency:**
   - Ensure "Tier 3: Plasma Cruiser" is consistently used in `src/ui/HangarModal.ts` and `src/engine/GameEngine.ts`.

### Step 2: Implement Comprehensive Math Engine 1000-Problem Test Suite
- Create `tests/math_engine_1000.test.ts` (or `test_math_1000.js`):
  - Iterates over Grades 1 to 10.
  - Generates 150 problems per grade (1500 total problems).
  - Asserts mathematical correctness, non-zero divisor, clean integers, valid equation syntax.
  - Logs summary table of tested operations and accuracy.

### Step 3: Implement Automated Playwright E2E Suite (Desktop & Mobile)
- Create `tests/e2e_desktop.spec.js` and `tests/e2e_mobile.spec.js` (or upgrade `test_qc.js` and `test_mobile_qc.js`):
  - Desktop (1280x800):
    1. First-time profile creation.
    2. Difficulty customization & save.
    3. Star map inspection & stage launch.
    4. 5-lane targeting verification (canvas clicks, buttons, keys).
    5. Live upgrade drawer interaction: solves problems live, verifies tier increases to Tier 2 and Tier 3 while aliens march.
    6. Combat answer submission via virtual numpad & keyboard.
    7. Parent report modal inspection (KPIs, accuracy, trouble spots).
  - Mobile (414x896):
    1. Full mobile profile gateway & creation.
    2. Star map on mobile viewport.
    3. Combat arena: verifies upgrade drawer starts closed.
    4. Toggles upgrade drawer open, solves bonus problem, closes drawer.
    5. Mobile lane button selection (`[1]`–`[5]`) and mobile numpad firing.
    6. Parent report validation.
    7. Bounding box & clipping assertions (`scrollWidth === clientWidth`).

### Step 4: Package Script & Configuration Integration
- In `package.json`:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test:math": "node tests/math_engine_1000.test.js",
    "test:e2e": "node tests/e2e_desktop.spec.js && node tests/e2e_mobile.spec.js",
    "test": "node tests/math_engine_1000.test.js && node tests/e2e_desktop.spec.js && node tests/e2e_mobile.spec.js"
  }
  ```

### Step 5: README.md Update
- Update `README.md` to document the new `npm test` scripts, the 1000-problem math test, responsive mobile mechanics, and multi-tier upgrade system.

---

## Conclusion
The application architecture is robust, fast, and cleanly separated. Addressing the mobile upgrade drawer overlay bug, resolving the keyboard digit entry conflict, and providing the required 1000-problem math test alongside comprehensive Playwright E2E suites will bring Math Invaders to 100% compliance with Requirements 3 & 4.
