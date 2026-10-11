# Review and Adversarial Stress Test Report: Milestone 1

**Reviewer:** `reviewer_m1_1`  
**Date:** 2026-10-10  
**Target:** Milestone 1 (Features 1–8: Grade 1–10 Curriculum Engine, Plausible Distractor Options, Negative Sign Input, Parent Analytics & Printable Worksheet, and 1,000-Problem Automated Test Suite)  
**Verdict:** **REQUEST_CHANGES**

---

## Review Summary

While the worker successfully implemented rich curriculum generation across Grades 1–10, clean integer division ($|b| \ge 2$, 0 remainder), lifetime parent analytics with printable worksheets, and a fast 1,060-problem test suite, adversarial testing uncovered a **CRITICAL infinite loop bug** in `generateOptions()` and `MathEngine.generateProblemForLane()` that completely freezes the game process / browser JavaScript thread under realistic custom settings and distractor parameters. Additionally, saving customized settings in `DifficultyModal.ts` drops the `grade` property, degrading curriculum inference.

No integrity violations were found: the implementation contains genuine generative mathematical algorithms, zero hardcoded problem banks, and real assertions. However, changes must be requested to fix the infinite loop and settings persistence before Milestone 1 can be approved.

---

## 1. Observation

### Observation 1: Infinite Loop in `generateOptions` Fallback While Loop
- **File:** `src/math/MathEngine.ts`, lines 88–100:
  ```typescript
  // Fallback generation to guarantee exact count
  let offset = 3;
  while (optionsSet.size < count) {
    const fallbackVal = correctAnswer + (optionsSet.size % 2 === 0 ? offset : -offset);
    if (
      Number.isInteger(fallbackVal) &&
      Number.isFinite(fallbackVal) &&
      (allowNegative || fallbackVal >= 0) &&
      !optionsSet.has(fallbackVal)
    ) {
      optionsSet.add(fallbackVal);
    }
    offset++;
  }
  ```
- **Observed Behavior:**
  - Running `node -e "const { generateOptions } = await import('./src/math/MathEngine.ts'); generateOptions(-5, 4, false);"` resulted in a process that never terminated and had to be killed (`task-73` timed out and cancelled).
  - Running `node -e "const { generateOptions } = await import('./src/math/MathEngine.ts'); generateOptions(0, 6, false);"` also hung indefinitely (`task-63` cancelled).

### Observation 2: Browser Freeze in `MathEngine.generateProblemForLane()` with Custom Grade Settings
- **File:** `src/math/MathEngine.ts`, lines 416–425 and line 710:
  ```typescript
  case 6: {
    const pattern = Math.floor(Math.random() * 6);
    if (pattern === 0) {
      const a = Math.floor(Math.random() * 20) + 2;
      const diff = Math.floor(Math.random() * 20) + 1;
      const b = a + diff;
      question = `${a} - ${b} = `;
      answer = -diff;
  ...
  const options = generateOptions(answer, 4, allowNegative, { operation, operands, grade });
  ```
- **Observed Behavior:**
  - If a player or parent configures custom difficulty settings for Grade 6 with `allowNegative: false` (or when `allowNegative: false` is supplied to `MathEngine`), `generateProblemForLane()` selects Pattern 0, producing a negative answer `answer = -diff < 0` with `allowNegative: false`.
  - Calling `generateOptions(-diff, 4, false)` triggers the infinite loop in Observation 1.
  - Verbatim command:
    ```powershell
    node -e "const { MathEngine } = await import('./src/math/MathEngine.ts'); const engine = new MathEngine({ operations: ['-'], minNumber: 1, maxNumber: 20, maxDigits: 2, allowNegative: false, grade: 6 }); for (let i = 0; i < 20; i++) { engine.generateProblemForLane(0); }"
    ```
    This command hung and was killed (`task-77`).

### Observation 3: `DifficultyModal.ts` Drops `grade` Property on Save
- **File:** `src/ui/DifficultyModal.ts`, lines 128–135:
  ```typescript
  const newSettings: MathSettings = {
    operations: checkedOps.length > 0 ? checkedOps : ['+'],
    minNumber: allowNeg ? -maxNumber : 1,
    maxNumber,
    maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
    allowNegative: allowNeg
  };
  this.profile.mathSettings = newSettings;
  ```
- **Observed Behavior:**
  - `newSettings` omits `grade: this.profile.gradeLevel`.
  - Consequently, in `MathEngine.ts`, `this.settings.grade` becomes `undefined`, and `inferGradeFromSettings()` falls back to heuristic inference:
    ```typescript
    if (this.settings.operations.includes('x')) return 7;
    if (this.settings.operations.includes('/')) return 4;
    ```
  - For a Grade 8, 9, or 10 student who customizes any setting, their curriculum level is immediately downgraded to Grade 7 or Grade 4.

### Observation 4: Build and Test Command Results
- `npm test`:
  ```
  ✔ MathEngine 1,000-Problem Verification Suite (31.1528ms)
  ℹ tests 15
  ℹ suites 1
  ℹ pass 15
  ℹ fail 0
  ```
- `npm run build`:
  ```
  ✓ 17 modules transformed.
  dist/index.html                 10.55 kB │ gzip:  2.62 kB
  dist/assets/index-D5NLkXHj.css  13.92 kB │ gzip:  3.41 kB
  dist/assets/index-CuR5peSU.js   87.39 kB │ gzip: 22.01 kB │ map: 225.73 kB
  ✓ built in 285ms
  ```
- `node test_qc.js` and `node test_mobile_qc.js`: Both completed with exit code 0.
- `README.md`: Properly updated documenting all new features, user controls, and testing commands.

---

## 2. Logic Chain

1. **Root Cause of Infinite Loop:**
   - In `generateOptions()`, candidate generation starts with `correctAnswer` in `optionsSet`.
   - If `optionsSet.size < count`, the fallback while loop executes:
     `const fallbackVal = correctAnswer + (optionsSet.size % 2 === 0 ? offset : -offset);`
   - Notice that the choice of `+offset` vs `-offset` is conditioned on `optionsSet.size % 2 === 0`.
   - If `optionsSet.size` is an odd number (such as 1, 3, or 5), `optionsSet.size % 2 === 0` is `false`. The algorithm chooses `correctAnswer - offset`.
   - If `allowNegative === false` and `correctAnswer - offset < 0`, `fallbackVal` is rejected by `(allowNegative || fallbackVal >= 0)`.
   - Because `fallbackVal` is not added, `optionsSet.size` **does not increase**.
   - On the subsequent iteration, `optionsSet.size` remains the **exact same odd number**.
   - Consequently, `optionsSet.size % 2 === 0` is **still false**. It tries `correctAnswer - (offset + 1)`, which is even more negative, and is rejected again.
   - The loop will repeat indefinitely without ever evaluating a positive offset `+offset`, causing an infinite loop.

2. **Impact on Gameplay:**
   - While the preset for Grade 6 in `Profile.ts` sets `allowNegative: true`, players and parents can customize difficulty via `DifficultyModal.ts` (e.g. turning off negative numbers for a Grade 6 child).
   - In `MathEngine.ts`, Grade 6 generator patterns (Pattern 0, Pattern 2, Pattern 4, Pattern 5) generate negative answers unconditionally.
   - When a negative answer is passed into `generateOptions()` with `allowNegative: false`, the fallback loop hangs, completely locking the game loop during an active invasion wave.
   - Furthermore, any caller requesting `count = 6` (e.g. for a 6-option distractor grid) with `correctAnswer = 0` will hang because `candidatePool` fills 5 positive options, leaving `optionsSet.size = 5` (odd), which then hangs in the fallback loop.

3. **Curriculum Settings Degradation:**
   - When saving custom settings in `DifficultyModal.ts`, `newSettings` omits `grade: this.profile.gradeLevel`.
   - This causes `MathEngine` to fall back to `inferGradeFromSettings()`, which caps the inferred grade at Grade 7 (if 'x' is in operations) or Grade 4, stripping Grade 8 (both-sides algebra), Grade 9 (distributive systems), and Grade 10 (quadratics) problem generation.

---

## 3. Findings & Required Remediations

### Finding 1: [Critical] Infinite Loop in `generateOptions()`
- **Where:** `src/math/MathEngine.ts`, lines 88–100.
- **Why:** The sign choice `(optionsSet.size % 2 === 0 ? offset : -offset)` fails to alternate when an insertion is rejected, locking `optionsSet.size` in an odd state forever testing negative numbers.
- **Remediation:**
  Decouple the sign search from `optionsSet.size`. Instead, explore both directions in each step:
  ```typescript
  let offset = 1;
  while (optionsSet.size < count) {
    const up = correctAnswer + offset;
    if (
      Number.isInteger(up) &&
      Number.isFinite(up) &&
      (allowNegative || up >= 0) &&
      !optionsSet.has(up)
    ) {
      optionsSet.add(up);
      if (optionsSet.size >= count) break;
    }

    const down = correctAnswer - offset;
    if (
      Number.isInteger(down) &&
      Number.isFinite(down) &&
      (allowNegative || down >= 0) &&
      !optionsSet.has(down)
    ) {
      optionsSet.add(down);
      if (optionsSet.size >= count) break;
    }

    offset++;
  }
  ```

### Finding 2: [Major] Grade 6–10 Math Generators Ignore `allowNegative === false`
- **Where:** `src/math/MathEngine.ts`, lines 412–707.
- **Why:** Grade 6–10 generators unconditionally produce negative answers even if `allowNegative` is configured as `false` in custom settings.
- **Remediation:**
  In Grade 6–10 generators, check `allowNegative`. If `!allowNegative`:
  - Grade 6: Ensure $a - b \ge 0$ (e.g., $a \ge b$), only use positive multiplication, and positive multi-step expressions.
  - Grades 7–10: Only select positive solutions ($x > 0$, positive coefficients).

### Finding 3: [Major] `DifficultyModal.ts` Drops `grade` in Saved `MathSettings`
- **Where:** `src/ui/DifficultyModal.ts`, line 133.
- **Why:** When constructing `newSettings`, `grade: this.profile.gradeLevel` is omitted, causing `MathEngine.settings.grade` to become undefined and downgrading Grade 8–10 curriculum.
- **Remediation:**
  Include `grade: this.profile.gradeLevel` in `newSettings`:
  ```typescript
  const newSettings: MathSettings = {
    operations: checkedOps.length > 0 ? checkedOps : ['+'],
    minNumber: allowNeg ? -maxNumber : 1,
    maxNumber,
    maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
    allowNegative: allowNeg,
    grade: this.profile.gradeLevel
  };
  ```

### Finding 4: [Minor] Missing Unit Tests for Edge Cases in `tests/mathEngine.test.ts`
- **Where:** `tests/mathEngine.test.ts`.
- **Why:** The test suite only runs against default presets and standard 4-option calls, masking the infinite loop bugs.
- **Remediation:**
  Add explicit tests in `tests/mathEngine.test.ts`:
  1. `generateOptions` with negative answers and `allowNegative = false` (must not hang, must return 4 non-negative options).
  2. `generateOptions` with `count = 6` and `count = 8` for $ans = 0$.
  3. `MathEngine` generation for Grades 6–10 with `{ allowNegative: false }` (must not produce negative answers and must not hang).

---

## 4. Integrity Assessment

- **Hardcoded Test Outputs:** None found. Problem generation is algorithmic and dynamic.
- **Facade/Dummy Implementations:** None found.
- **Verification Integrity:** Tests run real Node assertions and Playwright audits.
- **Status:** **PASSED** (no integrity violation; purely algorithmic bug).

---

## 5. Caveats

- Playwright tests in `test_qc.js` and `test_mobile_qc.js` passed because they test default Grade 3 profile settings, which do not trigger negative answers or the distractor while loop flaw.
- Sector 2–5 alien formations and the Dreadnought multi-phase boss are planned for Milestone 2 and were not evaluated in this milestone.

---

## 6. Conclusion & Actionable Next Steps

Milestone 1 is well-architected and close to completion, but cannot be approved until the infinite loop in `generateOptions()` and the curriculum settings loss in `DifficultyModal.ts` are resolved.

**Required Actions for Worker:**
1. Fix the fallback while loop in `generateOptions` in `src/math/MathEngine.ts` to test both positive and negative offsets without depending on `optionsSet.size % 2 === 0`.
2. Ensure Grade 6–10 generators in `src/math/MathEngine.ts` respect `allowNegative === false`.
3. Add `grade: this.profile.gradeLevel` to `newSettings` in `src/ui/DifficultyModal.ts`.
4. Add regression unit tests in `tests/mathEngine.test.ts` covering `generateOptions(-5, 4, false)`, `generateOptions(0, 6, false)`, and Grade 6 with `allowNegative: false`.
5. Run `npm test` and `npm run build` to confirm zero errors and instant termination.

---

## 7. Verification Method

To verify the fixes:
1. Run:
   ```powershell
   node -e "const { generateOptions } = await import('./src/math/MathEngine.ts'); console.log(generateOptions(-5, 4, false)); console.log(generateOptions(0, 6, false));"
   ```
   *Expected:* Returns immediately with clean options arrays without hanging.
2. Run:
   ```powershell
   node -e "const { MathEngine } = await import('./src/math/MathEngine.ts'); const engine = new MathEngine({ operations: ['-'], minNumber: 1, maxNumber: 20, maxDigits: 2, allowNegative: false, grade: 6 }); for (let i = 0; i < 50; i++) { const p = engine.generateProblemForLane(0); if (p.answer < 0) throw new Error('Negative answer generated!'); } console.log('Grade 6 without negatives verified!');"
   ```
   *Expected:* Completes cleanly in < 20ms with no negative answers.
3. Run `npm test` and `npm run build`.
   *Expected:* All unit tests pass and production build succeeds cleanly.
