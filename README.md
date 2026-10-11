# Math Invaders 🚀👾

An educational, retro arcade-style math game heavily inspired by *Space Invaders*. Built for children and students to advance their mathematical fluency throughout 10 school years (Grades 1 through 10) through engaging stage-based progression, customizable math problems, tactical ship upgrades, and alien-blasting action.

**🌐 Live Game:** [https://bobbylo.dk/math/](https://bobbylo.dk/math/)

---

## 🎮 Core Gameplay Mechanics

### 1. Pedagogical Grade 1–10 Curriculum Engine
- **Grade 1 (Foundation):** Single-digit addition and subtraction within 10 ($a + b \le 10$, $a - b \ge 0$), strictly non-negative.
- **Grade 2 (Bridging 10):** Addition and subtraction up to 20 bridging 10 ($a + b \le 20$, $a - b \ge 0$).
- **Grade 3 (Multiplication & Groups):** Times tables (1–10), clean integer division with remainder 0, arithmetic within 50.
- **Grade 4 (Fluency & Division):** Full multiplication tables (1–12), multi-digit division up to 144, mental arithmetic to 100.
- **Grade 5 (Multi-Step & Fractions/Decimals):** Order of operations (PEMDAS), multi-step expressions, fractions of whole numbers ($1/2$ of $24$), decimals with guaranteed integer solutions ($0.5 \times 16$, $1.5 \times 12$).
- **Grade 6 (Signed Arithmetic & Negative Numbers):** Negative differences ($5 - 12 = -7$), signed additions ($-8 + 3 = -5$), signed multiplications ($4 \times (-6) = -24$, $(-4) \times (-6) = 24$), signed multi-step arithmetic.
- **Grade 7 (Pre-Algebra & Exponents):** 1-step and 2-step linear equations ($ax + b = c$), integer exponents ($n^2, n^3, 2^p$).
- **Grade 8 (Variables on Both Sides & Roots):** Multi-variable linear equations ($ax + b = cx + d$), square roots ($\sqrt{64} = 8$), sum of squares, signed powers.
- **Grade 9 (Distributive Property & Systems):** Equations with distributive factoring ($a(x + b) = c$), 2-variable systems of linear equations ($x + y = S, x - y = D$), product of powers exponent laws ($2^a \times 2^b = 2^x$).
- **Grade 10 (Quadratics & Advanced Algebra):** Quadratic equations with integer roots ($(x - r_1)(x - r_2) = 0$ solving for $x > 0$ or $x < 0$), difference of squares ($x^2 - 64 = 0$), polynomial evaluation, Pythagorean triples ($\sqrt{a^2 + b^2} = c$).

### 2. Universal Solvability & Distractor Options
- **100% Clean Integer Guarantee:** Zero non-integers, zero NaN, zero floats, and zero indeterminate forms.
- **Zero Division-by-Zero Immunity & Regex Validation:** Divisors strictly satisfy $|b| \ge 2$, with clean integer divisibility guaranteed by construction. Validated via `validateProblem()` using `/[÷/]\s*0(?!\d)/` to reject all zero-division attempts across Unicode `÷` and ASCII `/` regardless of whitespace.
- **Decoupled Bidirectional Distractor Algorithm:** Fallback option generation in `generateOptions()` uses a decoupled bidirectional $O(\text{count})$ search anchored at `base = (allowNegative || correctAnswer >= 0) ? correctAnswer : 0`. Completely eliminates parity deadlocks on odd option sets or negative answers while ensuring 100% unique, finite integer choices.
- **Strict Non-Negative Enforcement:** All problem generators across Grades 6–10 honor `allowNegative: false`. When negative numbers are disabled in custom difficulty, equations generate non-negative solutions ($ans \ge 0$) and all distractor options remain strictly non-negative.

### 3. Strict Lane Change Math Enforcement & 5-Lane Matrix
- **Strict Lane-Lock Math Requirement:** To prevent bypassing the pedagogical curriculum by freely switching lanes to eliminate invaders, **the player's starship is strictly prevented from changing lanes until the math question for the targeted lane is solved correctly!**
  - **Targeting vs. Ship Position:** Selecting a lane (via canvas tap/click, bottom buttons `[1]–[5]`, or `A`/`D`/Arrow keys) designates that lane as the active target (`selectedLane`) and renders an animated pulsing holographic cyber reticle (`[ TARGET LOCK ]`) in that lane.
  - **Continuous Firing in Current Lane:** The player's ship remains anchored in its current lane (`playerLane`), continuously auto-firing baseline defense lasers into that lane.
  - **Incorrect Answer Penalty:** Submitting a wrong answer triggers a `WEAPON JAMMED!` alert (1.2s cooldown), sounds an error buzzer, breaks combo streak, and keeps the ship firmly locked in its current lane.
  - **Correct Answer Lane Transition:** Submitting the correct answer unlocks the ship, moves it directly to the targeted lane (`playerLane = selectedLane`), unleashes an amplified defensive salvo in that lane, increments combo score, and generates a fresh replacement math problem.
  - **Dual Tactical HUD Indicators:** Bottom lane buttons display distinct visual indicators:
    - `.lane-btn.ship-here`: Glowing green border and dot indicating the starship's live physical location (`playerLane`).
    - `.lane-btn.active`: Cyber cyan/yellow targeting glow indicating the lane whose math problem is currently being solved (`selectedLane`).
    - When both match, the button displays a combined green/cyan dual glow.
- **Keyboard Input Disambiguation:** Completely resolves conflict between lane shortcuts and numerical equation entry:
  - **Physical Numpad Priority:** Numeric keys from physical numpads (`e.code.startsWith('Numpad')`) always input digits into `currentInput`, never triggering unintended lane switches.
  - **Top-Row Number Row Disambiguation (`Digit1`–`Digit5`):**
    - In Manual mode: if `currentInput !== ''`, digits are always appended to the current answer. If `currentInput === ''` and matches `selectedLane + 1`, the digit is appended. If it differs, it targets that lane.
    - In Multiple Choice mode: keys `1`–`5` directly activate choice buttons `[1]`–`[5]`, while `ArrowLeft`/`ArrowRight`/`A`/`D` or direct canvas clicks switch targeted lanes.
- **Negative Number Support:** Dedicated `(-)` toggle button on both combat numpad and upgrade drawer, with physical `-` / `Minus` / `NumpadSubtract` key listeners.

### 4. Answer Input Modes (Manual Entry vs. 5 Multiple Choice Options)
- **Pilot Profile Customization:** Configurable per pilot profile in the Math Difficulty & Curriculum modal:
  - **⌨️ Manual Entry Mode:** Traditional entry via kid-friendly on-screen virtual numpad or physical keyboard.
  - **🔘 5 Multiple Choice Options Mode:** The student is presented with **5 different answer choices**, exactly one of which is correct and 4 are unique, plausible distractors.
- **5-Choice Mathematical Rigor:**
  - Generated via `generateOptions(answer, 5, allowNegative, ...)`.
  - Guaranteed 5 unique integers (zero duplicates, zero decimals/fractions, zero NaNs).
  - Strictly non-negative when `allowNegative: false`.
  - Distractors are mathematically plausible based on common student arithmetic errors (e.g. sign flips, nearby multiples, single-digit carry mistakes).
- **Complete Removal of Self-Dial Rows in Multiple Choice Mode:**
  - When the pilot selects **"5 Multiple Choice Options Mode"**, all rows of self-dial numeric buttons are completely removed from both the combat interface (`#virtual-numpad`) and the upgrade drawer (`#side-mini-numpad`) using `display: none !important`.
  - The student interacts exclusively with the 5 answer option buttons (or keyboard keys `[1]`–`[5]`), eliminating dial clutter and focusing attention on option evaluation.
- **Responsive Dynamic UI & Upgrade Drawer Integration:**
  - Combat `#math-card` cleanly toggles between the `#virtual-numpad` grid (Manual mode) and the 5-button `#multiple-choice-container` grid.
  - Non-blocking in-stage ship upgrade capacitor drawer dynamically presents 5 upgrade choice buttons (`.upg-choice-btn`), enabling seamless quick-tap buffs while aliens continue descending.
  - Zero horizontal overflow across mobile (414px) and desktop (1280px).
- **Live Non-Blocking Operation:** Opening and interacting with the upgrade drawer operates completely in real-time **without pausing the game loop** or halting alien descent.
- **Mobile Default Closed State Fix:** On mobile screens (`window.innerWidth < 768`), `#upgrade-side-panel` explicitly initializes with `.closed`, giving pilots an unobstructed view of the combat arena. Tapping the `⚡ UPGRADE` HUD button smoothly slides the drawer in from the right.
- **HUD Z-Index Hierarchy & Mobile Layout:** `#game-hud` is assigned `z-index: 35`, and the mobile drawer is positioned at `top: 52px; height: calc(100% - 52px)` with `backdrop-filter: blur(4px)`. Both the HUD toggle button (`#btn-toggle-upgrade-panel`) and drawer minimize button (`#btn-minimize-upgrade`) remain distinct, accessible, and clickable with zero touch interception.
- **Dedicated Live Capacitor Mini-Numpad:** Features 10 numeric buttons, backspace, and submit key for rapid problem solving between alien waves.

### 5. Ship Upgrade Visual Tiers (Tier 1–4) & Procedural Sprites
Consistent tier progression and visual transformations across both in-stage upgrades and the Hangar shop:
- **Tier 1 (Starter Scout):** White aerodynamic fuselage, glowing cyan cockpit canopy, and red wingtips with linear laser blasters.
- **Tier 2 (Dual-Wing Hunter):** Extended swept composite wings, wingtip blasters, and yellow V-spread lasers (unlocked after 1 upgrade solve or 200 coins in Hangar).
- **Tier 3 (Plasma Cruiser):** Heavy twin-engine nacelles with cyan glow and piercing cyan plasma beams dealing 5 damage (unlocked after +2 solves or 500 coins + 5 diamonds in Hangar).
- **Tier 4 (Neon Flagship):** Supercharged radiant cyan energy blade wings, golden reactor core, and arcing blue chain lightning dealing 6 plasma + 4 lightning damage (unlocked after +3 solves or 1000 coins + 10 diamonds in Hangar).
- **Live Visual Updates:** Ship sprites update instantaneously on canvas whenever the tier changes (via live upgrade capacitor solves or hangar equipment changes), accompanied by retro fanfare sound effects.

### 6. Planetary Sectors, Attack Formations & Alien Archetypes
Math Invaders features 5 distinct cosmic planetary sectors with specialized enemy dynamics across 25 total stages (5 stages per sector):
- **Sector 1 (Moon Base Alpha):** Linear scouting drops with purple Cyber-Scout Drones. Predictable vertical cadence designed for mastering lane targeting and early problem solving.
- **Sector 2 (Asteroid Belt):** Rapid zig-zag swarms. Drones execute continuous horizontal sinusoidal flight across lane boundaries:
  $$x(t) = \text{clamp}\Big(\text{baseX} + A \sin(\omega t + \phi), \;\frac{w}{2}, \;W - \frac{w}{2}\Big)$$
  where $\omega = 2.5\text{–}3.6\text{ rad/s}$ and $A = 18\text{–}32\text{px}$. Staggered phase offsets prevent lockstep clustering and test player trajectory anticipation.
- **Sector 3 (Mars Orbit):** Armored Mech-Crab Enforcers with hardened carapace plating. Initial hits are absorbed completely by outer armor plating (producing cyan deflection sparks and metallic clank SFX), requiring multiple shots to crack armor before taking HP damage.
- **Sector 4 (Jupiter Rings):** Heavy Assault Behemoths with dynamic Energy Core Reveal vulnerability cycles:
  - **Concealed Blast Doors (3.0s):** Sealed heavy emerald doors mitigate incoming damage by 50% ($0.5\times$ damage).
  - **Exposed Reactor Core (2.0s):** Blast doors open revealing a glowing lime reactor core; strikes during this window deal **$2.0\times$ critical bonus damage** with intense plasma bursts.
- **Sector 5 (Deep Space Nebula):** Escalating elite armada featuring hybrid waves of zig-zag scouts, armored crabs, and core-revealing behemoths, culminating in the Stage 5 Dreadnought Boss battle.

### 7. Mechanical Dreadnought Boss Battle (Sector 5 Stage 5)
A colossal 96x72 mechanical titan flagship defending Deep Space Nebula, featuring a dedicated screen-top Boss HUD (dual Deflector Shield & Hull Integrity health bars) and a 4-phase combat state machine:
- **Phase 1 (Active Energy Deflector Shield):** Shimmering elliptical blue/purple deflector shield with 30 Shield HP absorbing all direct hits while hull HP remains protected at 40/40.
- **Phase 2 (Escort Minion Drone Deployment):** Shield collapses with electrical shockwaves; port and starboard wing hangar bays open and deploy agile escort drones (type `minion_drone`) into flanking lanes 1 and 3. Flagship hull takes standard $1.0\times$ damage.
- **Phase 3 (Core Overload Vulnerability Window):** DESTABILIZED REACTOR! Klaxon warning siren sounds, alert banner flashes, and the central solar reactor core opens wide. Incoming strikes deal **$2.0\times$ critical damage** during a 6.0-second vulnerability countdown! If not defeated within 6.0s, the flagship reboots emergency shields (15 HP) and restarts the cycle.
- **Phase 4 (Cascading Destruction Sequence & Catastrophic Supernova Fleet Clearance):** Upon reaching 0 HP, descent halts, screen shake triggers (intensity 8–12), cascading secondary explosions erupt across port and starboard wings for 3.0 seconds, and a single whiteout meltdown shockwave flares at $T+1.5$s guarded by a one-shot flag. At $T+3.0$s, a catastrophic supernova explosion shatters the hull into 80+ fiery debris particles, **instantly vaporizing all remaining escort and minion drone entities** in the arena. Score values and kill counts are fully credited for all eliminated escorts, completely emptying `aliens` before invoking `handleStageVictory()`, ensuring zero live enemies remain descending on screen.
- **Universal Stage Lifecycle & Victory Gating:**
  - **Sector 1–4 Stage 5 Softlock Resolution:** Stages configured with `isBossStage: true` but featuring elite commander fleet formations rather than a singular boss entity now cleanly evaluate victory via `!this.state.getActiveBoss() && this.state.aliens.length === 0 && this.state.aliensDefeated >= this.state.totalAliensWave`. Clearing all fleet waves reliably triggers stage progression without softlocking.
  - **Boss Stage Victory Invariants:** For stages with an active boss entity (Sector 5 Stage 5), stage completion is strictly gated behind total boss destruction. Clearing escorts or minion drones never ends combat prematurely. A one-shot `stageCompleted` guard eliminates duplicate victory calls and prevents reward doubling. Post-mortem victory is strictly guarded so that player defeat during the destruction sequence correctly results in Game Over rather than stage completion.

### 8. Parent Learning Analytics & Printable Offline Practice Sheet
- **Comprehensive Lifetime Telemetry:** Tracks `PlayerStats` (`totalSolved`, `totalCorrect`, `totalErrors`, weighted `averageTimeMs`).
- **Unified Problem History:** Automatically logs both combat math and upgrade capacitor solves (bounded to 300 entries in `localStorage`).
- **Mastery by Operation:** Granular breakdown across Addition, Subtraction, Multiplication, Division, Pre-Algebra, Order of Operations, Fractions/Decimals, Exponents, and Quadratics.
- **🖨️ Printable Offline Practice Sheet:** Export button generates a clean, printer-friendly study worksheet in a pop-up window featuring:
  - Target trouble spots review (recent missed equations with blank answer boxes).
  - Grade-tailored bonus curriculum practice drills.
  - A fold-away Parent Answer Key.

### 9. Multi-Profile Management & Switching Modal Architecture
- **Multi-Pilot Gateway:** Supports multiple child/student profiles with individual avatars, coins, diamonds, grade levels, and customized math parameters.
- **Profile Switching Modal Lifecycle:** Accessing `#btn-switch-profile` or `#btn-profile-badge` opens `ProfileModal.showModal()` inside `#modals-root`. When selecting an existing pilot (`.btn-launch-prof`), `ProfileModal.closeModal()` is explicitly invoked prior to executing `onProfileSelected()`, completely dismantling the fixed modal overlay.
- **Defensive DOM Hygiene:** `MathInvadersApp.initProfileSession()` explicitly clears `modalsRoot.innerHTML = ''` upon initializing any profile session, providing double-layer immunity against modal overlay trapping or orphan dialogs.

### 10. Distinctive Weapon Archetypes, Piercing Projectiles & Monster Life Rebalance
- **Visual & Tactical Shot Archetypes (Tiers 1–4):**
  Continuous base defense fire dynamically adapts to the starship's active weapon tier (whether unlocked via the live in-stage upgrade capacitor or equipped in the Hangar):
  - **Tier 1 (Starter Scout):** Single emerald hyper-laser bolt (`damage = 1`, `vy = -400`, `#00ff66` with glowing white core, interval `0.35s`).
  - **Tier 2 (Dual-Wing Hunter):** Dual synchronized amber blasters (`cx - 10, cx + 10`, `damage = 2` each, `vy = -440`, `#ffb700`) + angled V-spread side cannons firing diamond golden projectiles into adjacent lanes (`damage = 1`, `#ffd600`, interval `0.31s`).
  - **Tier 3 (Plasma Cruiser):** Radiant piercing super-plasma core (`damage = 5`, `vy = -480`, electric cyan `#00f3ff` with intense white fusion core and trailing comet wake, `pierceRemaining = 2`) + twin auxiliary blasters (`damage = 2` each, interval `0.27s`). The plasma core punches *through* up to 2 alien rows without detonating on the first target!
  - **Tier 4 (Neon Flagship):** Supercharged heavy core plasma cannon (`damage = 8`, `vy = -520`, radiant magenta `#bc13fe`, `pierceRemaining = 3`) + dual arcing chain lightning discharges (`damage = 4` each, `#00e5ff` with branching electric arcs, interval `0.23s`).
- **Overhead Arcade Health Bars & Armor Indicators:**
  - All non-boss aliens feature an overhead arcade health bar (`hp / maxHp`) with a dynamic green $\to$ yellow $\to$ red health ratio gradient.
  - Armored enemies (Mech-Crabs) display distinctive cyan armor pips above their health bar, visually indicating hits absorbed by heavy carapace plating before hull damage occurs.
- **Floating Neon Combat Numbers:**
  - Real-time upward drifting neon damage text renders on bullet impacts:
    - Normal hits: `-${effectiveDamage}` in glowing gold, cyan, or magenta depending on weapon type.
    - Armored deflections: `BLOCKED` in bright cyan.
    - Boss deflector shield: `-${b.damage} SHIELD` in purple/cyan.
    - Critical hits & Core reveals: `CRIT -${effectiveDamage}!` in high-voltage neon lime `#76ff03` with glowing drop shadow.
- **Rebalanced Monster HP & Elimination of 1-Hit Kills with Lowest Weapon:**
  - **Scouts:** Rebalanced to **6 base HP** ($6 + \lfloor(\text{sector} - 1) \times 1.5\rfloor$, so Sector 1 Scout = 6 HP).
    - Tier 1 continuous fire does 1 damage (requires 6 hits to defeat).
    - Tier 1 amplified salvo (from solving a lane math problem) fires 3 bolts of 1 damage each (3 damage total). A full salvo leaves a Sector 1 Scout with 3 HP remaining—**eliminating 1-hit kills on starter weapons!**
    - Higher tiers (Tier 2 Dual Blasters with 4+ total damage, Tier 3 Piercing Plasma with 5 damage, and Tier 4 Flagship with 8+ damage) vaporize scouts with immense visual and auditory satisfaction, making upgrades feel truly rewarding.
  - **Mech-Crabs:** Rebalanced to **6 base HP** across all sectors. In Sector 3+, Crabs gain +2 armor points (8 effective HP), requiring sustained fire or high-tier piercing weapons to crack.
  - **Minion Drones:** Rebalanced to **4 base HP** (takes 4 hits from Tier 1 continuous fire).
  - **Heavy Behemoths:** Rebalanced to **12 base HP** (50% mitigated damage with closed blast doors, or 200% critical damage when reactor core is exposed).
  - **Dreadnought Boss:** 30 Shield HP + 40 Hull HP (70 total HP).

### 11. Adult In-Game Alien Descent Speed Slider & Controls
- **Accessible Live in Combat:** Parents and educators can adjust the invaders' descending speed in real time without leaving the game or disturbing student focus.
- **In-Game HUD Speed Button (`⏳ 1.0x`):** Located in `#game-hud` (`#btn-adult-speed`), tapping this button opens the floating `#in-game-speed-panel` directly above the combat arena.
- **Granular Speed Slider ($0.2\times$ to $2.0\times$):** Continuous slider adjustment with live speed multiplier badge feedback.
- **One-Tap Quick Presets:**
  - `0.4x Slow` (Ideal for younger learners or children needing extra time to calculate)
  - `0.7x Gentle` (Relaxed practice pace)
  - `1.0x Normal` (Standard Space Invaders cadence)
  - `1.5x Fast` (Arcade challenge pace for advanced mental math speed)
- **Pause Modal Integration:** Pausing the game (`⏸️`) brings up the `#in-game-pause-modal` where the adult speed slider and presets can also be adjusted while combat is completely frozen.
- **Curriculum & Settings Sync:** Also accessible from the main profile setup via `DifficultyModal.ts`. The setting is saved in `profile.mathSettings.descentSpeedMultiplier` and immediately persisted in `localStorage`.
- **Rhythm Pacing Engine:** Scales the Space Invaders march cadence linearly (`marchTimer += dt * descentSpeedMultiplier`). Lower multipliers smoothly space out the vertical drops while preserving responsive laser physics and math problem timers.

### 12. Kid-Friendly Typography & High-Legibility Numerical Architecture
- **Educational Font Science & Glyphs Clarity:**
  - Traditional arcade pixel fonts (like *Press Start 2P*) and geometric futuristic display fonts (like *Orbitron*) create cognitive fatigue and visual confusion for children, especially under real-time game tension. Digits like $1$ vs $7$, $0$ vs $8$, $3$ vs $8$, and $5$ vs $6$ can look ambiguous at a glance.
  - Math Invaders integrates **Lexend** (specifically engineered by educational researchers Dr. Bonnie Shaver-Troup and Thomas Jockin to improve visual tracking, reading speed, and digit comprehension for young learners) alongside **Fredoka** as secondary/fallback.
- **Dedicated Numerical CSS Variable (`--font-numbers`):**
  - Standardized as `--font-numbers: 'Lexend', 'Fredoka', system-ui, -apple-system, sans-serif;`.
  - Applied across all mathematical content:
    - Active combat equations (`.equation-text`) and student input values (`.input-display`) scaled up to an expansive, readable `1.55rem` / `1.65rem`.
    - Multiple-choice answer option buttons (`.choice-btn .choice-num`) and in-stage upgrade choice buttons (`.upg-choice-btn`).
    - Virtual numpad keys (`.num-key` and `.mini-key`) with bold, clear numbers.
    - Upgrade drawer math problem row (`.upg-math-row`, `.upg-equation`, `.upg-input`).
    - Top header currency pills (`.currency-pill`), score display (`.score-display`), and grade level badge (`.grade-badge`).
    - Cosmic Star Map stage nodes (`.stage-node .node-num`) ensuring stage numbers $1$ through $25$ pop crisply without pixel blur.
    - Modal math problem challenge in the Upgrade Station and Parent Learning Analytics KPI summary cards and missed problem review.
- **Tabular Numerals & Monospaced Digits:**
  - Enforces `font-variant-numeric: tabular-nums` across all numeric elements. Multi-digit calculations, timers, currencies, and equations remain aligned without horizontal jitter or twitching as digits change.
- **Floating Combat Damage Numbers on Canvas:**
  - Canvas rendering in `Renderer.ts` outputs upward floating combat damage text in crisp bold Lexend (`11px` normal, `14px` critical), ensuring damage feedback is effortlessly legible against space backgrounds and alien particle bursts.
- **Preserved Thematic Balance:**
  - The futuristic retro arcade aesthetic is preserved by keeping `Orbitron` exclusively for decorative sector titles and logos, while all educational and numeric content enjoys optimal pedagogical legibility.
- **Automated Verification:**
  - Unit test suite `tests/typographyAndLegibility.test.ts` asserts Google Fonts link inclusion, CSS `--font-numbers` definitions, tabular numeric alignment, and modal font contracts.

---

### 13. Playwright Automated End-to-End (E2E) Verification Suite
Math Invaders includes a battle-tested Playwright browser automation suite that simulates realistic human and touch interactions on Google Chrome across standard desktop and mobile viewports:
- **Desktop E2E Suite (`test_qc.js` — 1280x800 Viewport):**
  - **Custom Profile Gateway:** Selects avatar (e.g. 🤖), pilot name ("Astra"), grade preset, and validates creation.
  - **Math Difficulty Tailoring & Persistence:** Customizes grade presets (e.g. G4), toggles operations, adjusts number ceiling slider to 80, saves settings, and validates persistence in both `localStorage` and UI header upon reopening.
  - **Cosmic Star Map Navigation:** Verifies all 5 planetary sectors render, launches Sector 1 Stage 1, returns to map via `#btn-exit-to-map`, and launches unlocked stages in subsequent sectors.
  - **5-Lane Responsive Targeting:**
    - Canvas direct pointerdown/click (Lane 1 at 10% width, Lane 5 at 90% width).
    - Bottom tactical `.lane-btn [1]–[5]` buttons with active class state changes.
    - Top-row numeric keys `1`–`5` with keyboard input disambiguation (lane switching vs digit appending).
    - Smooth directional steering via `ArrowRight`, `ArrowLeft`, `d`, and `a` keys with edge boundary clamping.
  - **Live In-Stage Upgrade Drawer:**
    - Operates live in real-time **without pausing** the game loop; verifies alien descent Y-coordinates continue advancing during active drawer interaction.
    - Solves bonus equations via the mini-numpad to advance ship weapons and visual sprites through Tier 1 (Starter Scout), Tier 2 (Dual-Wing Hunter), Tier 3 (Plasma Cruiser), and Tier 4 (Neon Flagship / MAX POWER).
  - **Combat Defense Equations:** Solves active lane math problems via the virtual on-screen numpad, physical keyboard numpad, and tests intentional incorrect inputs to verify error feedback ("WRONG! JAMMED!") and error tracking.
  - **Parent Analytics & Printable Worksheet:** Inspects lifetime KPI summary cards (Total Solved, Accuracy %, Average Speed), validates recent trouble spots logging, and opens/verifies the pop-up Printable Offline Worksheet (`window.open`) including title, pilot name, and parent answer key.
  - **Desktop Zero-Overflow Assertion:** Enforces `scrollWidth === clientWidth` to prevent unwanted horizontal scrolling.

- **Mobile E2E Suite (`test_mobile_qc.js` — 414x896 Standard Mobile Viewport):**
  - **Mobile Profile Gateway:** Validates touch-friendly profile creation with mobile avatars (e.g. 🛸) and grade selection.
  - **Mobile Star Map Navigation:** Tests responsive vertical scrolling and touch-launching of planetary stages across all 5 sectors.
  - **Mobile Combat Arena & Non-Blocking Layout:**
    - Verifies upgrade drawer initializes strictly in the **closed state** (`.closed`) on screens $< 768\text{px}$ to preserve arena visibility.
    - Enforces layout contracts: `#game-hud` at `z-index: 35`, and mobile drawer at `top: 52px; height: calc(100% - 52px)` so HUD buttons remain unblocked.
    - Toggles drawer open via `#btn-toggle-upgrade-panel`, solves bonus problem via mini-numpad, and minimizes drawer via `#btn-minimize-upgrade`.
  - **Mobile 5-Lane Buttons & Virtual Numpad:** Tests dedicated `.lane-btn` buttons, virtual numpad digit entry, negative sign toggle `(-)`, and backspace.
  - **Mobile Parent Analytics & Offline Practice Sheet:** Opens parent report modal, validates mobile KPI metrics, and verifies printable offline sheet generation.
  - **Strict Mobile Zero-Overflow Invariant:** Repeatedly asserts `document.documentElement.scrollWidth === document.documentElement.clientWidth` across all mobile views, modals, and open/closed drawer states.

---

## 🛠️ Technology Stack
- **Framework:** Vite + Vanilla TypeScript
- **Rendering:** HTML5 Canvas (60 FPS pixel-perfect rendering loop)
- **Audio:** Web Audio API (procedural retro synthesis)
- **Storage:** LocalStorage with JSON Export/Import backup
- **Testing & Verification:**
  - Automated 1,000-Problem Unit Test Suite (`node:test` + `node:assert/strict` with native Node 24 type stripping)
  - Direct GameEngine Sector & Boss Test Suite (`tests/sectorBoss.test.ts` exercising production engine physics, armor deflection, core reveal cycles, and 4-phase boss battles without dummy mocks)
  - Controls, Live Drawer & Ship Visual Tiers Test Suite (`tests/milestone3ControlsAndVisuals.test.ts` verifying responsive 5-lane buttons, numpad vs top-row disambiguation, live non-pausing upgrades, and T1–T4 sprites)
  - Strict Lane Locking & Answer Modes Suite (`tests/answerModeAndLaneChange.test.ts` verifying math-gated lane movement and multiple-choice options)
  - Weapon Archetypes & Monster HP Rebalance Suite (`tests/weaponArchetypesAndMonsterLife.test.ts` verifying continuous shots, piercing, and damage indicators)
  - Kid-Friendly Typography & Legibility Suite (`tests/typographyAndLegibility.test.ts` verifying Lexend font rules, tabular numbers, and modal contracts)
  - Adversarial Lifecycle, Sector & Boss Stress Harnesses (`tests/stress_m2_stage_lifecycle.ts`, `tests/stress_m2_sectors.ts`, & `tests/stress_m2_boss.ts`)
  - Playwright browser E2E test suites with headless Google Chrome (`test_qc.js`, `test_mobile_qc.js`, and `test_multiple_choice_qc.js`) featuring self-starting dev server detection

---

## 🚀 Getting Started & Local Play

### 1. Run Development Server
```bash
npm run dev
```
- **Desktop (Chrome / Edge / Firefox):** [http://localhost:5173/](http://localhost:5173/)
- **Mobile / Tablet on local network:** `http://<your-local-ip>:5173/`

### 2. Run Complete Verification Suite (Unit + E2E)
```bash
npm test
```
Executes the full test pipeline:
1. `npm run test:unit`: Runs all 7 unit test suites (`tests/mathEngine.test.ts`, `tests/sectorBoss.test.ts`, `tests/milestone3ControlsAndVisuals.test.ts`, `tests/answerModeAndLaneChange.test.ts`, `tests/weaponArchetypesAndMonsterLife.test.ts`, `tests/typographyAndLegibility.test.ts`, `tests/adultDescentSpeedAndMonsterLife.test.ts`).
2. `npm run test:e2e`: Runs all 4 Playwright browser E2E suites (`test_qc.js` for Desktop, `test_mobile_qc.js` for Mobile, `test_multiple_choice_qc.js` for Multiple Choice, and `test_adult_speed_qc.js` for Adult Speed Controls & Pause Modal).

### 3. Run Individual Test Suites

#### A. Unit Tests Only
```bash
npm run test:unit
```
Executes:
- **MathEngine Suite (`tests/mathEngine.test.ts`):** Verifies 100 problems across every grade (Grades 1–10) + 50 upgrade capacitor problems with 100% solvable integer answers, zero divide-by-zero, and algebraic correctness.
- **Sector & Boss Suite (`tests/sectorBoss.test.ts`):** Directly exercises the real `GameEngine` with headless mocks, verifying all 5 planetary sectors, synchronized wave budgets, continuous sinusoidal flight, Mech-Crab armor absorption, Behemoth core reveal cycles, the 4-phase Dreadnought Boss battle state machine, and victory defect regression invariants.
- **Milestone 3 Controls & Visuals Suite (`tests/milestone3ControlsAndVisuals.test.ts`):** Verifies responsive 5-lane targeting, keyboard numpad vs top-row digit disambiguation, mobile drawer closed state contracts, live non-pausing upgrade progression, and procedural ship visual transformations (T1–T4).
- **Strict Lane Locking & Answer Modes Suite (`tests/answerModeAndLaneChange.test.ts`):** Verifies ship stays locked until math is solved, and tests 5 multiple choice options generation.
- **Weapon Archetypes & Monster Balance Suite (`tests/weaponArchetypesAndMonsterLife.test.ts`):** Verifies continuous laser, dual blaster, piercing super-plasma, chain lightning, and overhead monster health bars.
- **Kid-Friendly Typography & Legibility Suite (`tests/typographyAndLegibility.test.ts`):** Verifies Lexend font imports, tabular number alignment, equation text sizing, and modal font rules.
- **Adult Descent Speed & Monster Life Suite (`tests/adultDescentSpeedAndMonsterLife.test.ts`):** Verifies adult speed multiplier scaling ($0.2\times$ to $2.0\times$), presets, profile persistence, and 6 HP Scout survival eliminating 1-hit kills with Tier 1 weapons.

#### B. Playwright Automated E2E Browser Tests Only
```bash
npm run test:e2e
```
Or run individually:
```bash
node test_qc.js                 # Desktop E2E (1280x800)
node test_mobile_qc.js          # Mobile E2E (414x896)
node test_multiple_choice_qc.js # Multiple Choice & Lane Locking E2E
node test_adult_speed_qc.js     # Adult Speed Controls & Pause Modal E2E
```
*Note: E2E scripts automatically detect whether the Vite dev server is running on `http://localhost:5173/`, dynamically spawning and shutting it down if necessary.*

### 4. Run Adversarial Stress Test Harnesses
```bash
node --experimental-strip-types tests/stress_m2_stage_lifecycle.ts
node --experimental-strip-types tests/stress_m2_sectors.ts
node --experimental-strip-types tests/stress_m2_boss.ts
node --experimental-strip-types tests/adversarial_boss_challenge.ts
node tests/stress_mobile_interactions.js
```
- **Desktop E2E Adversarial Stress Harness (`tests/adversarial_desktop_stress.js`):** Exercises 6 adversarial desktop stress dimensions:
  1. *Profile Gateway Edge Cases:* Adversarial pilot names, XSS payloads, blank fallback to "Hero Pilot", and modal overlay dismissal when switching existing profiles.
  2. *Extreme Math Ranges:* Grade 10 preset with all 5 operations (`+`, `-`, `*`, `/`, `x`), maximum number ceiling (1000), and negative numbers, verifying strictly finite integer solutions and correct numpad sign toggle solving.
  3. *Rapid-Fire Input Storm & Race Conditions:* 50 rapid `.lane-btn` clicks clamped to `[0, 4]`, 50 rapid canvas clicks, 100 rapid keyboard events, and 15 drawer toggles.
  4. *Star Map Transitions & Boss Launch:* 5 rapid stage enter/exit cycles and launch of Sector 5 Stage 5 Dreadnought Boss Stage.
  5. *Dynamic Viewport Resizing Stress:* Dynamic runtime resizing across 8 desktop resolutions (1280x800, 1366x768, 1024x768, 1280x1024, 1600x900, 1920x1080, 800x600, 1280x800) with zero horizontal overflow (`scrollWidth === clientWidth`).
  6. *Uncaught Error Audit:* Page error listener intercepting uncaught runtime exceptions and ensuring process isolation.
- **Profile Switching Modal Regression Test (`tests/test_profile_modal_bug.js`):** Verifies that selecting and launching an existing profile from the `👥 Profiles` modal overlay cleanly invokes `closeModal()`, completely removing the modal overlay and zeroing `#modals-root` HTML length to prevent modal trapping.
- **Mobile E2E Adversarial Stress Harness (`tests/stress_mobile_interactions.js`):** Stress-tests mobile drawer rapid toggling (40 rapid open/minimize cycles without deadlock or z-index clobbering), multi-viewport horizontal overflow matrix (320x568, 360x640, 375x667, 390x844, 414x896) asserting `scrollWidth === clientWidth` across all views, rapid lane tap barrages (30 rapid taps across lanes 0–4), virtual numpad rapid typing/negation/capping, touch combat problem solving, and wrong answer recovery.
- **Stage Completion Lifecycle & Softlock Stress Harness (`tests/stress_m2_stage_lifecycle.ts`):** Exhaustively simulates clearing all 25 stages to guarantee zero softlocks in Sector 1–4 Stage 5, asserts that non-boss stages never trigger victory while live enemies remain, verifies catastrophic boss supernova fleet clearance leaving 0 hostile entities upon victory, and validates sinusoidal horizontal oscillation bounds and armor deflection / core reveal multipliers.
- **Sector Formations & 10,000-Frame Flight Simulation (`tests/stress_m2_sectors.ts`):** Validates all 25 stages, confirms zero wave budget discrepancies, and stress tests sinusoidal boundary physics across extreme frame rates and lag spikes.
- **Mechanical Dreadnought Boss 40-Test Stress Harness (`tests/stress_m2_boss.ts`):** Validates overkill damage boundaries, minion drone deployment, core overload cycles, single-fire shockwaves, death guards, and reward integrity.
- **Mechanical Dreadnought Boss Adversarial Challenge (`tests/adversarial_boss_challenge.ts`):** Validates 5-escort defeat victory guards, smooth 4-phase transitions (30 Shield HP -> Minions -> Core Overload 2.0x crit -> 3.0s Destruction), single shockwave flare trigger invariance under extreme dt, and zero double / post-mortem victory calls.

### 5. Build for Production / Static Web Hosting
```bash
npm run build
```
Executes `tsc && vite build`. The compiled, zero-dependency static assets are output to `dist/`, fully optimized for production deployment.

### 6. Live Web Deployment
The game is deployed live at **[bobbylo.dk/math](https://bobbylo.dk/math/)** (served directly via GitHub Pages on [Bobby-zs-lo.github.io](https://github.com/Bobby-zs-lo/Bobby-zs-lo.github.io)).
To update production:
1. Run `npm run build` in `Math-invaders`.
2. Copy `dist/*` into `Bobby-zs-lo.github.io/math/`.
3. Commit and push `Bobby-zs-lo.github.io` to `main`.
