# Milestone 4 Adversarial Challenger Handoff Report (Desktop E2E)

**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Baseline Desktop E2E Suite Verification (`node test_qc.js`)
Executed command:
```bash
node test_qc.js
```
Observation:
- Dev server detected on `http://localhost:5173/`.
- Test 1 (Profile Gateway): Created avatar `🤖`, pilot `Astra`, Grade 3. Zero horizontal overflow verified (`scrollWidth=1280, clientWidth=1280`).
- Test 2 (Math Difficulty Customization & Persistence): Preset switched to G4, slider set to 80, checkboxes saved to `localStorage`, confirmed in header and on modal reopen.
- Test 3 (Cosmic Star Map): 5 planetary sectors rendered, Sector 1 Stage 1 launched, `#btn-exit-to-map` tested, Sector 2 Stage 1 launched and exited.
- Test 4 (5-Lane Responsive Targeting): Canvas direct clicks on Lane 1 and Lane 5; bottom `.lane-btn` buttons on Lane 2 and Lane 4; top-row key '3' lane switch vs digit entry; ArrowRight, d, ArrowLeft, a directional steering validated.
- Test 5 (Live Upgrade Drawer): Non-pausing alien descent confirmed (`Alien Y: 71 -> 95` over 1000ms); mini-numpad solves advanced ship from Tier 1 (Starter Scout) to Tier 4 (Neon Flagship / MAX POWER).
- Test 6 (Combat Equations): Virtual numpad solve ("EXCELLENT! 🚀"), keyboard numpad solve ("EXCELLENT! 🚀"), intentional wrong answer ("WRONG! JAMMED!" with trouble spot logging).
- Test 7 (Parent Analytics & Offline Practice Sheet): Solved="9", Accuracy="89%", AvgResponse="1.5s", printable popup generated and verified with student name and parent answer key. Final zero horizontal overflow asserted.
- Status: Exited with code 0. Verbatim message: `✅ ALL DESKTOP PLAYWRIGHT E2E TESTS PASSED WITH 100% SUCCESS!`.

### 1.2 Full Test Pipeline Verification (`npm test`)
Executed command:
```bash
npm test
```
Observation:
- Executed `npm run test:unit && npm run test:e2e`.
- 54 unit tests passed (MathEngine 1,000 problems, Sector & Boss physics engine, Milestone 3 Controls and Visuals).
- Both `test_qc.js` (Desktop 1280x800) and `test_mobile_qc.js` (Mobile 414x896) passed with exit code 0.

### 1.3 Adversarial Stress Harness (`node tests/adversarial_desktop_stress.js`)
Constructed and executed independent adversarial stress harness `tests/adversarial_desktop_stress.js` covering 6 adversarial dimensions:
1. **Window Resizing Boundary Stress**:
   Tested dynamic resizing during active gameplay across 8 desktop resolutions:
   - `1280x800` (Standard Desktop)
   - `1366x768` (Standard Laptop)
   - `1024x768` (Legacy 4:3 Desktop)
   - `1280x1024` (5:4 SXGA Desktop)
   - `1600x900` (HD+ Widescreen)
   - `1920x1080` (1080p Full HD)
   - `800x600` (Minimal Window)
   - `1280x800` (Return to Standard)
   Result: `scrollWidth === clientWidth` (zero horizontal overflow) strictly satisfied across all resolutions with valid non-zero canvas dimensions.
2. **Extreme Difficulty Customization (Grade 10, All Ops, 1000 Ceiling, Negatives)**:
   - Enabled Grade 10 preset, all 5 operations (`+`, `-`, `*`, `/`, `x`), max number ceiling `1000`, and `allowNegative: true`.
   - Verified that `MathEngine` generated valid equations with strictly finite integer solutions (e.g. `√(5² + 12²) = 13`, `2^x = 16 (x=4)`, `x² - 169 = 0 (x < 0) (x=-13)`).
   - Successfully solved Grade 10 negative problem via virtual numpad sign toggle `(-)` ("EXCELLENT! 🚀").
3. **Rapid-Fire User Input Storm & Race Conditions**:
   - 50 rapid `.lane-btn` clicks in 250ms: `selectedLane` remained cleanly clamped in `[0, 4]`.
   - 50 rapid canvas clicks across coordinates: No exceptions.
   - 60 rapid keyboard storm (digits, backspaces, enter, signs, arrows): No buffer overflow or NaN desync.
   - 15 rapid upgrade drawer toggles: Drawer remained operational, subsequent solve advanced ship tier cleanly.
4. **Star Map Rapid Navigation & Boss Initialization**:
   - 5 rapid enter/exit arena cycles without memory leaks or crashed loops.
   - Sector 5 Stage 5 Dreadnought Boss Stage launch: Initialized multi-phase boss entity with dual health meters and stage title `SECTOR 5 — STAGE 5`.
5. **Process Isolation & Clean Shutdown**:
   - Zero uncaught page errors (`pageErrors.length === 0`).
   - Dev server cleanly stopped on completion.

### 1.4 Defect Discovered: Profile Modal Switch Trap
Executed test harness `tests/test_profile_modal_bug.js`:
```bash
node tests/test_profile_modal_bug.js
```
Verbatim Output:
```
Opening switch profile modal...
Profile modal is open: true
Clicking LAUNCH on Pilot1...
Is modal overlay STILL VISIBLE after clicking LAUNCH? true
modalsRoot HTML length: 7834
BUG CONFIRMED: Modal overlay remains trapped on screen because closeModal() was not invoked on profile launch!
```
Inspection of `src/ui/ProfileModal.ts` lines 142–155:
```ts
142:     // Select existing profile
143:     targetEl.querySelectorAll('.btn-launch-prof').forEach(btn => {
144:       btn.addEventListener('click', (e) => {
145:         const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
146:         if (id) {
147:           const profiles = loadProfiles();
148:           const target = profiles.find(p => p.id === id);
149:           if (target) {
150:             setActiveProfile(target.id);
151:             this.onProfileSelected(target, false);
152:           }
153:         }
154:       });
155:     });
```
And `src/main.ts` lines 138–149:
```ts
138:   private onProfileChosen(prof: PlayerProfile, isNewProfile: boolean = false): void {
139:     this.initProfileSession(prof);
140: 
141:     // If new profile, immediately offer the Math Difficulty Configurator so they tailor the problems!
142:     if (isNewProfile) {
143:       this.difficultyModal = new DifficultyModal(this.modalsRoot, this.profile!, (updated) => {
144:         this.profile = updated;
145:         this.updateHeaderUI();
146:       });
147:       this.difficultyModal.show();
148:     }
149:   }
```
Observation:
When opening the profile modal via `#btn-switch-profile` (`ProfileModal.showModal()`), clicking `LAUNCH 🚀` (`.btn-launch-prof`) invokes `this.onProfileSelected(target, false)`. Because `isNewProfile === false`, `this.difficultyModal.show()` is not called (which normally overwrites `modalsRoot`), and `ProfileModal.closeModal()` is never called, nor does `initProfileSession` clear `this.modalsRoot`. Consequently, the modal overlay (`.modal-overlay`, `z-index: 1000`) remains permanently covering the Star Map / Game Arena, trapping the player behind an unclosed modal.

---

## 2. Logic Chain

1. Worker M4 implemented `test_qc.js` and `test_mobile_qc.js` covering the primary user flows from profile creation, difficulty settings, 5-lane targeting, live non-pausing upgrade drawer, combat solving, and parent reports.
2. In our verification, `node test_qc.js` and `npm test` execute with 100% green status and verify all baseline assertions.
3. However, adversarial challenge testing of user profile lifecycle exposed that while initial profile creation on startup works seamlessly, switching kid profiles mid-session via `#btn-switch-profile` fails to close the modal upon selecting an existing profile.
4. Step-by-step causal chain:
   - User clicks `👥 Profiles` (`#btn-switch-profile`) or `#btn-profile-badge`.
   - `this.profileModal.showModal()` renders `<div class="modal-overlay">...</div>` into `#modals-root`.
   - User clicks `LAUNCH 🚀` on any existing pilot row.
   - The event listener in `ProfileModal.bindGatewayEvents()` sets active profile and invokes callback `this.onProfileSelected(target, false)`.
   - Neither `this.closeModal()` is called in `ProfileModal.ts`, nor does `MathInvadersApp.initProfileSession()` clear `this.modalsRoot.innerHTML`.
   - The background switches to the chosen profile's star map, but the fixed fullscreen modal overlay remains in the DOM intercepting all pointer events.
   - The user is soft-locked behind the modal until they manually discover and click the small "✕" button in the corner.
5. Additionally, `renderGateway` hardcodes IDs (`#gateway-input-name`, `#gateway-select-grade`, `#gateway-btn-create`), creating duplicate IDs in the DOM when the modal is opened over the page.

---

## 3. Caveats

- Playwright tests require Google Chrome headless channel (`channel: 'chrome'`), which is present and working in the environment.
- The defect does NOT break initial startup profile creation (which uses `#view-profile-select` screen view rather than a modal overlay) or new profile creation inside the modal (which overwrites `modalsRoot` with `DifficultyModal`). It specifically affects switching to an **existing** profile from the `👥 Profiles` modal.
- No other defects were found: combat equations, 5-lane targeting, upgrade drawer, boss stage, window resizing, and parent reporting are completely robust.

---

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

Math Invaders Milestone 4 has achieved excellent technical quality across math generation, combat targeting, window resizing, and Playwright automation. However, the Profile Switch modal trap defect degrades user experience when switching between multiple kid profiles.

### Required Changes for Worker:
1. In `src/ui/ProfileModal.ts` (lines 148–153):
   Add `this.closeModal();` before invoking `this.onProfileSelected(target, false)` when `.btn-launch-prof` is clicked.
   ```ts
   if (target) {
     setActiveProfile(target.id);
     this.closeModal();
     this.onProfileSelected(target, false);
   }
   ```
2. In `src/main.ts` (`initProfileSession`):
   Ensure `this.modalsRoot.innerHTML = '';` is cleared upon initializing any profile session as defensive hygiene.
3. Re-run `node tests/test_profile_modal_bug.js` to verify it passes cleanly with code 0.
4. Re-run `npm test` and `npm run build` to confirm zero regressions.
5. Update `README.md` if necessary in accordance with user rules.

---

## 5. Verification Method

1. **Bug Reproduction Command**:
   ```bash
   node tests/test_profile_modal_bug.js
   ```
   *Expected Current Output*: Fails with exit code 1 / 101, `BUG CONFIRMED: Modal overlay remains trapped on screen`.
   *Expected Post-Fix Output*: Exits with code 0, `No bug: Modal closed properly`.

2. **Adversarial Stress Harness**:
   ```bash
   node tests/adversarial_desktop_stress.js
   ```
   Verifies all 6 adversarial dimensions (window resizing across 8 resolutions, extreme Grade 10 math, rapid input storms, star map, and boss stage).

3. **Baseline Full Test Pipeline**:
   ```bash
   npm test
   ```
   Verifies 54 unit tests and both desktop and mobile Playwright E2E suites.

4. **Production Build**:
   ```bash
   npm run build
   ```
   Verifies clean TypeScript compilation and Vite bundling.
