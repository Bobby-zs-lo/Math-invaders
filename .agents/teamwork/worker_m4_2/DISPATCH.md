# DISPATCH: worker_m4_2 (Milestone 4 Implementation Worker Replacement)

You are worker_m4_2, replacing worker_m4_1 which halted due to an external quota limit.
Your working directory is: c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m4_2
Your parent conversation ID is: e4d2cab8-c238-4225-807a-7d54d18368ab

## Mandatory First Step
Read the original user request at:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture plan at:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\PROJECT.md

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory User Rule
Always update the readme file after each feature change. You MUST update README.md documenting the complete Playwright E2E test suite, test commands, build instructions, and full verification steps.

## Objectives for Milestone 4 (Playwright Automated E2E Suite & Build Verification)
1. Inspect existing `package.json`, `test_qc.js`, `test_mobile_qc.js`, and test scripts.
2. Inspect implementation details in `src/` (`main.ts`, `index.html`, `ParentReportModal.ts`, `HangarModal.ts`, etc.) to align tests precisely with element selectors and APIs.
3. Enhance `test_qc.js` (Desktop E2E, 1280x800) with headless Chrome launch (`{ channel: 'chrome', headless: true }`):
   - Profile creation with custom name and avatar selection.
   - Math difficulty customization (changing grade preset, operations checkboxes, range slider) and profile persistence.
   - Star map navigation and stage launching across sectors.
   - 5-lane targeting: canvas pointerdown, bottom buttons `.lane-btn [1]–[5]`, top-row keys `1`–`5`, and arrow/A/D steering.
   - Live upgrade drawer: solves bonus equations in real time via mini-numpad, verifies alien march continues live without pausing, and verifies ship upgrades through Tiers 1–4.
   - Combat equation solving via numpad and keyboard.
   - Parent Report Modal: verifies solve counts, accuracy %, avg speed, trouble spots, and printable offline worksheet generation (`generatePrintableWorksheet()`).
4. Enhance `test_mobile_qc.js` (Mobile E2E, 414x896) with headless Chrome launch (`{ channel: 'chrome', headless: true }`):
   - Full mobile profile creation gateway.
   - Mobile Star Map navigation.
   - Mobile combat arena: verifies upgrade drawer starts closed (`.closed`), toggles open via `#btn-toggle-upgrade-panel` without blocking HUD (z-index 35, top: 52px), solves bonus problem, minimizes drawer.
   - Mobile 5-lane selection via `.lane-btn [1]–[5]` and mobile virtual numpad.
   - Bounding box and overflow assertion (`document.documentElement.scrollWidth === document.documentElement.clientWidth`, zero horizontal scrolling).
   - Mobile Parent Report Modal.
5. Update `package.json` scripts:
   - `"test:unit": "node --experimental-strip-types tests/mathEngine.test.ts && node --experimental-strip-types tests/sectorBoss.test.ts && node --experimental-strip-types tests/milestone3ControlsAndVisuals.test.ts"`
   - `"test:e2e": "node test_qc.js && node test_mobile_qc.js"`
   - `"test": "npm run test:unit && npm run test:e2e"`
6. Verification commands:
   - Run `npm test` and ensure 100% of unit tests and Playwright E2E browser tests pass.
   - Run `npm run build` and ensure `tsc && vite build` succeeds with zero errors.
7. Update `README.md`:
   - Comprehensively update `README.md` with complete documentation of the entire game (Grades 1–10 Curriculum Engine, 5 Planetary Sectors, Dreadnought Boss Battle, 5-Lane Controls, Live Upgrade Drawer, Ship Visual Tiers, and all test commands).

Write your changes report in:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m4_2\changes.md
Write your handoff report in:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m4_2\handoff.md
Send a completion message to parent (e4d2cab8-c238-4225-807a-7d54d18368ab).


## 2026-10-11T03:30:36Z
[Message] timestamp=2026-10-11T03:30:36Z sender=e4d2cab8-c238-4225-807a-7d54d18368ab priority=MESSAGE_PRIORITY_HIGH content=You are worker_m4_2, an implementation worker agent replacing worker_m4_1.
Your working directory is: c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m4_2
Your parent conversation ID is: e4d2cab8-c238-4225-807a-7d54d18368ab
