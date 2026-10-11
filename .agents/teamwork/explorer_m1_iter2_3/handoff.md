# Handoff Report — explorer_m1_iter2_3

**Role**: Explorer Agent (Milestone 1 Iteration 2 Remediation)  
**Parent**: `e4d2cab8-c238-4225-807a-7d54d18368ab`  
**Working Directory**: `c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\explorer_m1_iter2_3`  
**Date**: 2026-10-10  

---

## 1. Observation

### Observation 1: `DifficultyModal.ts` Omits `grade` in Saved `MathSettings`
- **Location**: `src/ui/DifficultyModal.ts`, lines 128–135:
  ```typescript
  const newSettings: MathSettings = {
    operations: checkedOps.length > 0 ? checkedOps : ['+'],
    minNumber: allowNeg ? -maxNumber : 1,
    maxNumber,
    maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
    allowNegative: allowNeg
  };
  ```
- **Observed Inferences in Dependent Files**:
  1. `src/math/MathEngine.ts`, lines 180 and 734–741:
     When `this.settings.grade` is `undefined`, `MathEngine.generateProblemForLane()` invokes `inferGradeFromSettings()`:
     ```typescript
     private inferGradeFromSettings(): number {
       if (this.settings.grade) return this.settings.grade;
       if (this.settings.operations.includes('x')) return 7;
       if (this.settings.operations.includes('/')) return 4;
       if (this.settings.operations.includes('*')) return 3;
       if (this.settings.operations.includes('-')) return 2;
       return 1;
     }
     ```
     For a player in Grade 8, 9, or 10 who customized difficulty, `inferGradeFromSettings` returns 7.
  2. `src/models/Profile.ts`, lines 208–212:
     ```typescript
     if (!profile.mathSettings || profile.mathSettings.grade === undefined) {
       const grade = profile.gradeLevel || 2;
       profile.mathSettings = getDefaultMathSettingsForGrade(grade);
     }
     ```
     When profiles are loaded from `localStorage`, any profile with `mathSettings.grade === undefined` is treated as a legacy profile, completely wiping out custom player settings back to defaults.

### Observation 2: Deadlock Hang in `generateOptions(-5, 4, false)` and `generateOptions(0, 6, false)`
- **Location**: `src/math/MathEngine.ts`, lines 88–100:
  ```typescript
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
- **Observed Behavior**:
  Executing `node --experimental-strip-types --input-type=module -e "import { generateOptions } from './src/math/MathEngine.ts'; generateOptions(0, 6, false);"` locked the JavaScript process in an infinite while loop (background task timed out and had to be killed).
  Similarly, `generateOptions(-5, 4, false)` hung because `optionsSet.size` is 1 (odd), which repeatedly produced negative candidate offsets rejected by `allowNegative || fallbackVal >= 0`.

### Observation 3: Boundary Regex Flaw in `validateProblem()`
- **Location**: `src/math/MathEngine.ts`, line 133:
  ```typescript
  if (/\b[÷/]\s*0\b/.test(problem.question)) return false;
  ```
- **Observed Verbatim Command and Result**:
  Command:
  ```powershell
  node --experimental-strip-types --input-type=module -e "import { validateProblem } from './src/math/MathEngine.ts'; console.log('validateProblem 10 ÷ 0:', validateProblem({ question: '10 ÷ 0 = ', answer: 0 }));"
  ```
  Result:
  ```
  validateProblem 10 ÷ 0: true
  ```
  `validateProblem()` returned `true` for division by zero because `÷` (Unicode `\u00F7`) and `/` are `\W` (non-word characters), meaning no word boundary `\b` exists between a preceding space and `÷` or `/`.

### Observation 4: Current Test Suite Status in `tests/mathEngine.test.ts`
- **Observed Verbatim Command and Result**:
  Command:
  ```powershell
  npm test
  ```
  Result:
  ```
  ✔ MathEngine 1,000-Problem Verification Suite (25.4945ms)
  ℹ tests 15
  ℹ suites 1
  ℹ pass 15
  ℹ fail 0
  ```
  The test suite currently contains 15 tests, but lacks explicit regression test cases covering the 4 edge cases identified above.

---

## 2. Logic Chain

1. **Premise 1 (Observation 1)**: In `DifficultyModal.ts`, saving customized settings constructs `newSettings` without setting `grade: this.profile.gradeLevel`.
2. **Inference 1.1**: Because `grade` is missing, `this.mathEngine` in `GameEngine.ts` executes `inferGradeFromSettings()`, which caps curriculum at Grade 7 (if 'x' is in operations) or Grade 4 (if '/' is in operations). Higher-grade students (Grades 8, 9, 10) lose their grade-appropriate curriculum.
3. **Inference 1.2**: Because `profile.mathSettings.grade` is `undefined`, `loadProfiles()` in `Profile.ts` detects the profile as an unmigrated legacy format upon page refresh and resets `profile.mathSettings = getDefaultMathSettingsForGrade(grade)`, erasing all user customizations.
4. **Premise 2 (Observation 2)**: Parity condition `optionsSet.size % 2 === 0` in `generateOptions()` fails to change parity when an insertion is rejected due to `allowNegative === false`.
5. **Inference 2.1**: The loop continuously tests negative candidates, rejecting every single one, never incrementing `offset` past positive bounds, causing an infinite while loop.
6. **Premise 3 (Observation 3)**: Regex `/\b[÷/]\s*0\b/` relies on `\b` before non-word characters `÷` and `/`, which fails whenever there is a space preceding the operator (`10 ÷ 0 = `).
7. **Inference 3.1**: The zero-division check is bypassed, allowing illegal mathematical problems to pass validation.
8. **Premise 4 (Observation 4)**: The test suite currently passes all 15 tests without triggering these code paths because existing tests only run default grade presets with `count = 4`.
9. **Conclusion**: Adding `grade: this.profile.gradeLevel` in `DifficultyModal.ts` line 134 restores grade preservation across runtime and persistence. Adding a dedicated `Milestone 1 Iteration 2 Regression Tests` suite with 5 explicit tests in `tests/mathEngine.test.ts` will permanently prevent regressions.

---

## 3. Caveats

- **Explorer Scope**: As an explorer agent, no direct modifications to source code files (`src/` or `tests/`) have been performed in this turn. Concrete code diffs and test implementations are provided in `analysis.md` and this handoff report for the worker agent (`worker_m1_1` or equivalent).
- **DOM Execution in Node**: `DifficultyModal.ts` interacts directly with browser DOM elements (`HTMLElement`, `querySelector`). Direct instantiation in Node without a browser/DOM mock is not supported; therefore, `MathSettings` preservation is tested at the engine layer in `tests/mathEngine.test.ts`, while full DOM/modal integration will be exercised during Playwright E2E tests (M4).

---

## 4. Conclusion & Concrete Implementation Instructions

### A. Fix for `src/ui/DifficultyModal.ts` (Lines 128–135)
Replace:
```typescript
      const newSettings: MathSettings = {
        operations: checkedOps.length > 0 ? checkedOps : ['+'],
        minNumber: allowNeg ? -maxNumber : 1,
        maxNumber,
        maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
        allowNegative: allowNeg
      };
```
With:
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

### B. Regression Suite for `tests/mathEngine.test.ts`
Append the following test suite to `tests/mathEngine.test.ts`:

```typescript
describe('Milestone 1 Iteration 2 Regression Tests', () => {
  it('Regression 1: generateOptions(-5, 4, false) terminates immediately without deadlock and produces 4 valid options', () => {
    const startTime = performance.now();
    const options = generateOptions(-5, 4, false);
    const duration = performance.now() - startTime;

    assert.ok(duration < 100, `generateOptions(-5, 4, false) took too long (${duration}ms) - potential deadlock`);
    assert.equal(options.length, 4, 'Must return exactly 4 options');
    assert.equal(new Set(options).size, 4, 'All 4 options must be unique');
    assert.ok(options.includes(-5), 'Options must include the correct answer -5');
    assert.ok(options.every(Number.isInteger), 'All options must be clean integers');
    assert.ok(
      options.filter(x => x !== -5).every(x => x >= 0),
      `All distractor options must be non-negative when allowNegative=false: [${options}]`
    );
  });

  it('Regression 2: generateOptions(0, 6, false) terminates immediately and returns 6 non-negative options', () => {
    const startTime = performance.now();
    const options = generateOptions(0, 6, false);
    const duration = performance.now() - startTime;

    assert.ok(duration < 100, `generateOptions(0, 6, false) took too long (${duration}ms) - potential deadlock`);
    assert.equal(options.length, 6, 'Must return exactly 6 options');
    assert.equal(new Set(options).size, 6, 'All 6 options must be unique');
    assert.ok(options.includes(0), 'Options must include correct answer 0');
    assert.ok(options.every(Number.isInteger), 'All options must be clean integers');
    assert.ok(
      options.every(x => x >= 0),
      `All options must be strictly non-negative when allowNegative=false: [${options}]`
    );
  });

  it('Regression 3: validateProblem correctly flags division by zero with spaced operators (÷ 0 and / 0)', () => {
    // Spaced unicode division
    const p1 = { id: 'div-0-1', laneIndex: 0, question: '10 ÷ 0 = ', answer: 0, operation: '/', difficultyRating: 1, startTime: 0 };
    assert.equal(validateProblem(p1), false, 'validateProblem must reject "10 ÷ 0 = "');

    // Spaced slash division
    const p2 = { id: 'div-0-2', laneIndex: 0, question: '10 / 0 = ', answer: 0, operation: '/', difficultyRating: 1, startTime: 0 };
    assert.equal(validateProblem(p2), false, 'validateProblem must reject "10 / 0 = "');

    // Unspaced division
    const p3 = { id: 'div-0-3', laneIndex: 0, question: '10÷0 = ', answer: 0, operation: '/', difficultyRating: 1, startTime: 0 };
    assert.equal(validateProblem(p3), false, 'validateProblem must reject "10÷0 = "');

    // Valid division must pass
    const pValid = { id: 'div-ok', laneIndex: 0, question: '10 ÷ 2 = ', answer: 5, operation: '/', difficultyRating: 1, startTime: 0 };
    assert.equal(validateProblem(pValid), true, 'validateProblem must accept valid division');
  });

  it('Regression 4: Grade 6 with allowNegative=false produces zero negative answers and never hangs', () => {
    const engine = new MathEngine({
      ...getDefaultMathSettingsForGrade(6),
      allowNegative: false
    });

    const startTime = performance.now();
    for (let i = 0; i < 50; i++) {
      const lane = i % 5;
      const problem = engine.generateProblemForLane(lane);

      assert.ok(problem, 'Problem must be defined');
      assert.ok(
        problem.answer >= 0,
        `Grade 6 with allowNegative=false must not produce negative answer, got ${problem.answer}: "${problem.question}"`
      );
      assert.ok(
        problem.options.every(o => o >= 0),
        `Options must all be non-negative, got [${problem.options}]: "${problem.question}"`
      );
      assert.ok(validateProblem(problem), `Problem must pass validation: "${problem.question}"`);
    }
    const elapsed = performance.now() - startTime;
    assert.ok(elapsed < 200, `50 Grade 6 problems took too long (${elapsed}ms)`);
  });

  it('Regression 5: MathSettings preserves grade level and prevents curriculum degradation', () => {
    const customGrade8Settings: MathSettings = {
      operations: ['+', '-', '*', '/', 'x'],
      minNumber: 1,
      maxNumber: 50,
      maxDigits: 2,
      allowNegative: true,
      grade: 8
    };

    const engine8 = new MathEngine(customGrade8Settings);
    const prob8 = engine8.generateProblemForLane(0);
    assert.equal(prob8.grade, 8, 'Grade 8 must be preserved in generated problem');

    const customGrade10Settings: MathSettings = {
      operations: ['+', '-', '*', '/', 'x'],
      minNumber: 1,
      maxNumber: 100,
      maxDigits: 2,
      allowNegative: true,
      grade: 10
    };

    const engine10 = new MathEngine(customGrade10Settings);
    const prob10 = engine10.generateProblemForLane(0);
    assert.equal(prob10.grade, 10, 'Grade 10 must be preserved in generated problem');
  });
});
```

---

## 5. Verification Method

Once the worker agent applies the fixes:

1. **Run Unit Tests**:
   ```powershell
   npm test
   ```
   *Expected Result*: 20 passing tests, 0 failing tests, completing in $< 50\text{ ms}$.
   *Invalidation Condition*: Any test timeout, uncaught error, or assertion failure.

2. **Run Edge Case Terminal Check**:
   ```powershell
   node --experimental-strip-types --input-type=module -e "import { generateOptions, validateProblem } from './src/math/MathEngine.ts'; console.log('genOpt(-5):', generateOptions(-5, 4, false)); console.log('genOpt(0):', generateOptions(0, 6, false)); console.log('divByZero:', validateProblem({ question: '10 ÷ 0 = ', answer: 0 }));"
   ```
   *Expected Output*:
   - `genOpt(-5)` returns 4 items immediately.
   - `genOpt(0)` returns 6 non-negative items immediately.
   - `divByZero` returns `false`.

3. **Verify Build**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Clean build with exit code 0 and zero TypeScript errors.
