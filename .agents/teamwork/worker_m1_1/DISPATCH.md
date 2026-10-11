## 2026-10-10T18:49:35Z
You are worker_m1_1, an implementation worker agent.
Your working directory is: c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\worker_m1_1
Your parent conversation ID is: e4d2cab8-c238-4225-807a-7d54d18368ab

MANDATORY FIRST STEP: Read the user request at:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project architecture plan at:
c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\orchestrator_1\PROJECT.md

Read the full analysis and implementation blueprints from the explorers:
1. c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\spec_miner_m1_1\analysis.md
2. c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\explorer_m1_1\analysis.md
3. c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\explorer_m1_2\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

USER RULE TO STRICTLY FOLLOW:
Always update the readme file after each feature change. You MUST update README.md with the newly implemented Grade 1–10 Curriculum Engine, Parent Analytics & Offline Practice Worksheet, and 1000-problem test suite.

Your task for Milestone 1:
1. `src/models/Profile.ts`:
   - Refactor `getDefaultMathSettingsForGrade(grade: number)` to provide pedagogically differentiated presets for all 10 grades (G1 add/sub <=10; G2 add/sub <=20; G3 mult 1-12, clean div <=50; G4 mult/div <=100; G5 multi-step, decimals, fractions <=200; G6 negative numbers, multi-step; G7 linear eq ax+b=c, exponents; G8 both-sides linear eq ax+b=cx+d, exponents; G9 distributive a(x+b)=c; G10 quadratics, radicals, advanced algebra).
2. `src/math/MathEngine.ts`:
   - Implement comprehensive problem generation for Grades 1–10. All problems must have well-defined, positive or negative integer solutions with zero divide-by-zero or indeterminate states.
   - Implement `generateOptions(correctAnswer, count, allowNegative)` generating 4 unique, strictly integer choices with plausible distractors.
   - Implement `validateProblem(problem: MathProblem): boolean`.
   - Ensure clean integer division (divisor >= 2, dividend = divisor * quotient).
   - Ensure algebraic linear equations, exponents, and order of operations produce integer answers.
3. `src/engine/GameEngine.ts`:
   - Implement `recordProblemTelemetry()`: update lifetime `PlayerStats` (`totalSolved`, `totalCorrect`, `totalErrors`, `averageTimeMs`).
   - Log both combat math and upgrade capacitor solves into `problemHistory` (bound history to 300 entries).
4. `src/ui/ParentReportModal.ts`:
   - Fix zero-problem state accuracy (`--`).
   - Add operations breakdown.
   - Implement `generatePrintableWorksheet()` providing printable offline practice sheet with trouble spot review, bonus drills, and answer key.
5. `index.html`, `src/styles/main.css`, and `src/main.ts`:
   - Add `(-)` button to `#virtual-numpad` and upgrade drawer mini-numpad.
   - Update keydown listener in `main.ts` so `-` is accepted.
   - Fix lane key collision so typing digits for current lane doesn't intercept input.
6. `tests/mathEngine.test.ts` & `package.json`:
   - Create `tests/mathEngine.test.ts` using native `node:test` and `node:assert/strict`.
   - Test 100 problems per grade for Grades 1–10 (1000 problems total) + 50 upgrade problems.
   - Assert all answers are integers, finite, non-NaN, no division by zero, no non-integers, valid mathematical truth.
   - Add `"test": "node --experimental-strip-types tests/mathEngine.test.ts"` to `package.json`.
7. `README.md`:
   - Update README.md documenting the features implemented in Milestone 1.

Verification required:
- Run `npm test` (or `node --experimental-strip-types tests/mathEngine.test.ts`) and ensure 100% of the 1000+ problem tests pass.
- Run `npm run build` and ensure TypeScript and Vite build succeed with 0 errors.
