# Milestone 1 Iteration 2 (Remediation) Analysis Report

**Agent**: `explorer_m1_iter2_3`  
**Date**: 2026-10-10  
**Focus**:
1. `src/ui/DifficultyModal.ts` lines 128–135 (`grade` property preservation in custom settings).
2. Comprehensive Regression Test Suite Design for `tests/mathEngine.test.ts` covering:
   - `generateOptions(-5, 4, false)` (deadlock prevention & valid option generation)
   - `generateOptions(0, 6, false)` (deadlock prevention & 6 non-negative options)
   - `validateProblem({ question: '10 ÷ 0 = ', answer: 0 })` (division-by-zero detection with whitespace)
   - Grade 6 problem generation with `{ allowNegative: false }` (zero negative solutions and zero hangs)

---

## 1. Executive Summary

During Milestone 1 Iteration 1 review and adversarial testing (`reviewer_m1_1`, `challenger_m1_1`), two critical functional bugs and one data persistence flaw were identified:
1. **Critical Hang Bug in `generateOptions()`**: An infinite loop in the fallback distractor while loop occurred whenever parity alternating `(optionsSet.size % 2 === 0 ? offset : -offset)` tried to generate negative offsets when `allowNegative === false`.
2. **Regex Anchor Flaw in `validateProblem()`**: The regex `/\b[÷/]\s*0\b/` failed to detect `'10 ÷ 0 = '` because `÷` (Unicode `\u00F7`) is a non-word character (`\W`), making the preceding word boundary `\b` fail after a space.
3. **Settings Curriculum Degradation in `DifficultyModal.ts`**: When saving customized math difficulty settings, `newSettings` omitted `grade: this.profile.gradeLevel`. This caused:
   - `GameEngine`'s `MathEngine` to fall back to heuristic `inferGradeFromSettings()`, permanently degrading Grade 8–10 players to Grade 7 or Grade 4.
   - `Profile.ts`'s `loadProfiles()` to treat the profile as a legacy unmigrated record (`mathSettings.grade === undefined`), discarding all custom player settings on page reload.

This report provides the full architectural analysis and concrete implementation strategy for the worker agent to fix `DifficultyModal.ts` and add bulletproof regression tests to `tests/mathEngine.test.ts`.

---

## 2. Deep Dive: `DifficultyModal.ts` Grade Preservation Defect

### 2.1 Code Walkthrough & Root Cause

In `src/ui/DifficultyModal.ts` lines 118–141:
```typescript
// Save
this.container.querySelector('#btn-save-diff')?.addEventListener('click', () => {
  const checkedOps: ('+' | '-' | '*' | '/' | 'x')[] = [];
  this.container.querySelectorAll('.op-checkbox:checked').forEach(cb => {
    checkedOps.push((cb as HTMLInputElement).value as any);
  });

  const maxNumber = parseInt(slider.value, 10) || 50;
  const allowNeg = (this.container.querySelector('#check-negatives') as HTMLInputElement).checked;

  const newSettings: MathSettings = {
    operations: checkedOps.length > 0 ? checkedOps : ['+'],
    minNumber: allowNeg ? -maxNumber : 1,
    maxNumber,
    maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
    allowNegative: allowNeg
    // BUG: Missing `grade: this.profile.gradeLevel`
  };

  this.profile.mathSettings = newSettings;
  updateActiveProfile(this.profile);
  this.onSettingsUpdated(this.profile);
  this.close();
});
```

### 2.2 Triple Impact Analysis

#### Impact A: Immediate Curriculum Downgrade in Active Gameplay
When the player saves custom settings and enters a sector:
1. `GameEngine.ts` line 34 instantiates the math engine:
   ```typescript
   this.mathEngine = new MathEngine(profile.mathSettings);
   ```
2. When an alien spawns in lane $L$, `GameEngine` calls `this.mathEngine.generateProblemForLane(L)`.
3. `MathEngine.ts` line 180 resolves the target grade:
   ```typescript
   const grade = this.settings.grade ?? this.inferGradeFromSettings();
   ```
4. Because `this.settings.grade` is `undefined`, it invokes `inferGradeFromSettings()` (lines 734–741):
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
5. **Outcome**:
   - A **Grade 8** student (curriculum: two-sided linear equations $ax + b = cx + d$) with operation `'x'` enabled is immediately downgraded to Grade 7 single-step algebra.
   - A **Grade 9** student (curriculum: systems of equations and distributive expressions) is downgraded to Grade 7.
   - A **Grade 10** student (curriculum: quadratic equations, pythagorean theorem, exponent laws) is downgraded to Grade 7.
   - A **Grade 5** student (curriculum: multi-step order of operations) with operations `['+', '-', '*', '/']` is downgraded to Grade 4.

#### Impact B: Total Customization Loss on Page Reload
In `src/models/Profile.ts` lines 207–212:
```typescript
// Auto-migrate legacy profiles missing modern grade settings or stats
return parsed.map(profile => {
  if (!profile.mathSettings || profile.mathSettings.grade === undefined) {
    const grade = profile.gradeLevel || 2;
    profile.mathSettings = getDefaultMathSettingsForGrade(grade);
  }
  ...
```
When a profile is loaded from `localStorage`:
If `profile.mathSettings.grade` is `undefined`, the migration logic assumes the settings object is obsolete and **completely overwrites** `profile.mathSettings` with the default preset `getDefaultMathSettingsForGrade(grade)`. Any custom operation checkboxes, max number slider adjustments, or negative number toggles configured by the parent are permanently wiped out upon page refresh!

#### Impact C: Analytics & Parent Report Inconsistencies
In `src/ui/ParentReportModal.ts` line 13:
```typescript
const settings = profile.mathSettings || getDefaultMathSettingsForGrade(profile.gradeLevel || 2);
```
Parent report headers and telemetry tracking evaluate grade level from `settings.grade`. Without this property, reporting telemetry may misclassify student difficulty tiers.

### 2.3 Proposed Fix in `src/ui/DifficultyModal.ts`

Modify lines 128–135 of `src/ui/DifficultyModal.ts` to include `grade: this.profile.gradeLevel`:

```typescript
<<<<
      const newSettings: MathSettings = {
        operations: checkedOps.length > 0 ? checkedOps : ['+'],
        minNumber: allowNeg ? -maxNumber : 1,
        maxNumber,
        maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
        allowNegative: allowNeg
      };
====
      const newSettings: MathSettings = {
        operations: checkedOps.length > 0 ? checkedOps : ['+'],
        minNumber: allowNeg ? -maxNumber : 1,
        maxNumber,
        maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
        allowNegative: allowNeg,
        grade: this.profile.gradeLevel
      };
>>>>
```

---

## 3. Regression Test Design for `tests/mathEngine.test.ts`

To ensure zero regressions across all discovered failure modes, we formulate four explicit test cases plus one settings preservation verification test.

### 3.1 Regression Case 1: `generateOptions(-5, 4, false)`
- **Failure Mechanism**:
  With `correctAnswer = -5` and `allowNegative = false`, initial `optionsSet` is `{-5}`. The candidate pool filter skips negative candidates. The fallback while loop at lines 88–100 relied on `optionsSet.size % 2 === 0` to alternate between `+offset` and `-offset`. Because `optionsSet.size` was 1 (odd), it tested `-5 - offset < 0`, which was rejected by `allowNegative || fallbackVal >= 0`. `optionsSet.size` remained 1, locking the engine in an infinite while loop.
- **Test Invariants**:
  1. Function call must return immediately (execution time $< 10\text{ ms}$).
  2. Returned array length must equal exactly 4 (`options.length === 4`).
  3. All 4 items must be distinct (`new Set(options).size === 4`).
  4. Correct answer `-5` must be present (`options.includes(-5)`).
  5. All generated distractor options (i.e. options other than `-5`) must be non-negative (`options.filter(x => x !== -5).every(x => x >= 0)`).
  6. All options must be finite integers.

### 3.2 Regression Case 2: `generateOptions(0, 6, false)`
- **Failure Mechanism**:
  With `correctAnswer = 0`, `count = 6`, and `allowNegative = false`, the candidate pool adds 4 positive distractors (1, 2, 5, 10). `optionsSet.size` becomes 5. Because 5 is odd, the fallback while loop selected `0 - offset < 0`, which was rejected because `allowNegative` is false. The size never increased to 6, hanging the thread.
- **Test Invariants**:
  1. Function call must return immediately ($< 10\text{ ms}$).
  2. Returned array length must equal exactly 6 (`options.length === 6`).
  3. All 6 options must be unique (`new Set(options).size === 6`).
  4. Correct answer `0` must be included (`options.includes(0)`).
  5. **All 6 options must be strictly non-negative** (`options.every(x => x >= 0)`).
  6. All 6 options must be clean integers (`options.every(Number.isInteger)`).

### 3.3 Regression Case 3: `validateProblem({ question: '10 ÷ 0 = ', answer: 0 })`
- **Failure Mechanism**:
  In `validateProblem()` (line 133), the check was:
  `if (/\b[÷/]\s*0\b/.test(problem.question)) return false;`
  In JavaScript RegExp, `\b` requires one adjacent character to be `\w` (ASCII word character `[a-zA-Z0-9_]`) and the other to be `\W`. Because spaces `' '` and division operators `÷` (`\u00F7`) and `/` are both `\W`, there is NO word boundary between `' '` and `÷`. Consequently, expressions with standard spacing like `'10 ÷ 0 = '` or `'10 / 0 = '` were falsely accepted as valid.
- **Fix Pattern**:
  `if (/[÷/]\s*0(?!\d)/.test(problem.question)) return false;`
  This matches any `÷` or `/` followed by optional whitespace and a standalone zero (not followed by another digit, such as `05`).
- **Test Invariants**:
  1. `validateProblem({ question: '10 ÷ 0 = ', answer: 0 } as any)` must return `false`.
  2. `validateProblem({ question: '10 / 0 = ', answer: 0 } as any)` must return `false`.
  3. `validateProblem({ question: '12 ÷ 0', answer: 0 } as any)` must return `false`.
  4. `validateProblem({ question: '24 / 0', answer: 0 } as any)` must return `false`.
  5. Valid divisions like `'10 ÷ 2 = 5'` or `'12 / 3 = 4'` must continue returning `true`.

### 3.4 Regression Case 4: Grade 6 Problem Generation with `{ allowNegative: false }`
- **Failure Mechanism**:
  Grade 6 generators (lines 412–480) previously generated negative answers unconditionally (e.g. Pattern 0: $a - b$ with $b > a \implies answer = -diff < 0$). When passed to `generateOptions()` with `allowNegative: false`, it triggered the infinite loop hang. Even without the hang, it violated the user's explicit preference.
- **Test Invariants**:
  Instantiate `new MathEngine({ ...getDefaultMathSettingsForGrade(6), allowNegative: false })` and generate 50 problems across lanes 0 through 4:
  1. Execution completes in $< 20\text{ ms}$ (no infinite loops).
  2. Every problem's answer must be $\ge 0$ (`problem.answer >= 0`).
  3. Every problem's options must all be $\ge 0$ (`problem.options.every(o => o >= 0)`).
  4. Every problem passes `validateProblem(problem) === true`.
  5. Every equation is mathematically correct according to `verifyEquationTruth()`.

### 3.5 Regression Case 5: Curriculum Grade Level Preservation in `MathEngine`
- **Invariants**:
  1. When custom settings include `grade: 8`, `MathEngine.generateProblemForLane()` generates Grade 8 algebra problems with `problem.grade === 8`, not degraded to 7.
  2. When custom settings include `grade: 10`, problems generated have `problem.grade === 10`, containing quadratic or exponent law equations.

---

## 4. Proposed Code for `tests/mathEngine.test.ts`

Add the following suite to `tests/mathEngine.test.ts`:

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

## 5. Verification Plan

1. **Verify Unit Tests**:
   ```powershell
   npm test
   ```
   *Expected Result*: All 15 existing tests + 5 new regression tests pass (20 tests passed, 0 failed) in $< 50\text{ ms}$.

2. **Verify Build**:
   ```powershell
   npm run build
   ```
   *Expected Result*: Zero TypeScript compilation errors, Vite bundles cleanly to `dist/`.

3. **Verify Edge Case Scripts**:
   ```powershell
   node --experimental-strip-types --input-type=module -e "import { generateOptions, validateProblem } from './src/math/MathEngine.ts'; console.log('genOpt(-5):', generateOptions(-5, 4, false)); console.log('genOpt(0):', generateOptions(0, 6, false)); console.log('divByZero:', validateProblem({ question: '10 ÷ 0 = ', answer: 0 }));"
   ```
   *Expected Result*:
   - `genOpt(-5)` returns 4 options without hanging.
   - `genOpt(0)` returns 6 non-negative options without hanging.
   - `divByZero` returns `false`.
