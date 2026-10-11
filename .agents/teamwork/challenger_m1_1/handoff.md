# Handoff Report — challenger_m1_1

**Timestamp**: 2026-10-10T19:07:00Z  
**Role**: Adversarial Challenger (critic, specialist)  
**Target Milestone**: M1 (MathEngine Curriculum & Parent Analytics)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### A. Problem Generation Stress Test Execution
Command executed:
```bash
node --experimental-strip-types tests/stressTest.ts
```
Results over 12,259 trials:
- **Grades 1–10 generation (10,000 problems)**:
  - 100% solvable integer answers (`Number.isInteger(ans) === true`).
  - Zero `NaN`, `null`, `undefined`, or malformed string literals.
  - Zero division-by-zero generated across all lanes and grades.
  - Grades 1–5 produced 0 negative answers across 5,000 problems (100% non-negative; Grade 1 in [0, 10], Grade 2 in [0, 20]).
  - Grades 6–10 produced legitimate negative solutions with high frequency:
    - Grade 6: 62.0% negative answers (range: [-81, 72])
    - Grade 7: 14.2% negative answers (range: [-10, 225])
    - Grade 8: 20.9% negative answers (range: [-216, 72])
    - Grade 9: 17.7% negative answers (range: [-8, 100])
    - Grade 10: 23.9% negative answers (range: [-14, 25])
  - In-Stage Upgrade Drawer (1,000 problems): 100% valid, integer, and mathematically accurate.
  - Independent mathematical oracle: 100% agreement on equation truth across linear systems, quadratics, exponents, radicals, and multi-step arithmetic.
  - Option generation with default `count = 4`: exactly 4 unique integers containing the correct answer, uniformly distributed across slots (slot distribution: [255, 246, 249, 250]).

### B. Defect 1: Infinite Loop Hang in `generateOptions` with `count > 4`
- File: `src/math/MathEngine.ts`, lines 88–100:
  ```typescript
  88:   let offset = 3;
  89:   while (optionsSet.size < count) {
  90:     const fallbackVal = correctAnswer + (optionsSet.size % 2 === 0 ? offset : -offset);
  91:     if (
  92:       Number.isInteger(fallbackVal) &&
  93:       Number.isFinite(fallbackVal) &&
  94:       (allowNegative || fallbackVal >= 0) &&
  95:       !optionsSet.has(fallbackVal)
  96:     ) {
  97:       optionsSet.add(fallbackVal);
  98:     }
  99:     offset++;
  100:  }
  ```
- Command to reproduce:
  ```bash
  node --experimental-strip-types --input-type=module -e "import { generateOptions } from './src/math/MathEngine.ts'; generateOptions(0, 6, false);"
  ```
- Observed behavior:
  Process hangs indefinitely (timed out and was terminated).
  When `count = 6`, `correctAnswer = 0`, `allowNegative = false`, after the candidate pool finishes, `optionsSet` has size 5 (odd). At line 90, `5 % 2 === 0` is false, selecting `-offset` (`0 - offset < 0`). Since `allowNegative === false`, `fallbackVal >= 0` is false, so `optionsSet.add(fallbackVal)` is skipped. `optionsSet.size` remains 5 (odd). In every subsequent iteration, `size % 2 === 0` is still false, continually producing negative offsets and never adding an option, locking the JavaScript main thread forever.

### C. Defect 2: Word Boundary Regex Flaw in `validateProblem` Allows Divide-By-Zero
- File: `src/math/MathEngine.ts`, line 133:
  ```typescript
  132:   // Zero-division check
  133:   if (/\b[÷/]\s*0\b/.test(problem.question)) return false;
  ```
- Command to reproduce:
  ```bash
  node --experimental-strip-types --input-type=module -e "import { validateProblem } from './src/math/MathEngine.ts'; console.log(validateProblem({ question: '10 ÷ 0 = ', answer: 0 } as any));"
  ```
- Observed behavior:
  Returns `true`.
  In JavaScript RegExp, `\b` matches a word boundary between ASCII word characters (`\w`) and non-word characters (`\W`). Both space `' '` and division symbols `÷` (Unicode U+00F7) and `/` are `\W`. There is no word boundary between `' '` and `'÷'` or `'/'`. Thus, `/\b[÷/]\s*0\b/` fails to match `'10 ÷ 0 = '` and `'10 / 0 = '`.

---

## 2. Logic Chain

1. **Premise 1**: `generateOptions` takes an optional `count: number = 4`. If called with `count > 4` (e.g. `count = 6` for custom UI choices) when `correctAnswer = 0` and `allowNegative = false`, the fallback loop at lines 89–100 relies on `optionsSet.size % 2 === 0` to alternate between `+offset` and `-offset`.
2. **Premise 2**: If `optionsSet.size` is odd, `fallbackVal` is `correctAnswer - offset`. For `correctAnswer = 0`, this is always negative. Since `allowNegative = false`, the candidate is rejected.
3. **Inference 1**: `optionsSet.size` never increments, so its parity never changes. The loop indefinitely tests `-offset`, indefinitely rejects it, and never terminates. This is a critical Denial-of-Service / browser thread hang bug.
4. **Premise 3**: `validateProblem` is specified to ensure "Zero division by zero" across all mathematical inputs.
5. **Premise 4**: Mathematical expressions are conventionally formatted with spaces around operators (`10 ÷ 0 = ` or `10 / 0 = `).
6. **Inference 2**: Because `\b` requires a word character before `[÷/]`, any question with a space before the operator bypasses the zero-division check, causing `validateProblem` to accept illegal divide-by-zero expressions.

---

## 3. Caveats

- In normal arcade gameplay where `count` defaults to 4 and problem generation only creates non-zero divisors, neither bug immediately crashes the standard user path.
- However, as an adversarial verification harness, these are real edge-case and contract failures in public exported API functions (`generateOptions` and `validateProblem`).
- Canvas rendering and UI responsiveness were not evaluated (deferred to M3/M4).

---

## 4. Conclusion & Required Changes

**Verdict**: **REQUEST_CHANGES**

The core problem generator in `MathEngine.ts` is robust, producing 10,000+ flawless, age-appropriate, integer problems with 100% mathematical validity. However, the worker must apply two surgical fixes before M1 sign-off:

### Required Fix 1: Fix Fallback Parity Alternation in `generateOptions`
In `src/math/MathEngine.ts`, lines 88–100, replace the parity condition based on `optionsSet.size` with an alternator that cannot deadlock, or simply try both `+offset` and `(allowNegative ? -offset : +offset)`:
```typescript
  // Fallback generation to guarantee exact count
  let offset = 3;
  while (optionsSet.size < count) {
    const candidates = allowNegative
      ? [correctAnswer + offset, correctAnswer - offset]
      : [correctAnswer + offset];

    for (const fallbackVal of candidates) {
      if (
        Number.isInteger(fallbackVal) &&
        Number.isFinite(fallbackVal) &&
        (allowNegative || fallbackVal >= 0) &&
        !optionsSet.has(fallbackVal)
      ) {
        optionsSet.add(fallbackVal);
        if (optionsSet.size >= count) break;
      }
    }
    offset++;
  }
```

### Required Fix 2: Fix Zero-Division Regex in `validateProblem`
In `src/math/MathEngine.ts`, line 133, remove the preceding `\b` anchor so that leading spaces do not prevent matching:
```typescript
  // Zero-division check: matches ÷ 0 or / 0 with any preceding spacing
  if (/[÷/]\s*0(?!\d)/.test(problem.question)) return false;
```

---

## 5. Verification Method

To verify the fixes independently:
1. Run existing unit test suite:
   ```powershell
   npm test
   ```
2. Run empirical stress test harness:
   ```powershell
   node --experimental-strip-types tests/stressTest.ts
   ```
3. Test edge-case termination:
   ```powershell
   node --experimental-strip-types --input-type=module -e "import { generateOptions } from './src/math/MathEngine.ts'; console.log(generateOptions(0, 6, false));"
   ```
   *Pass criteria*: Exits within 5ms returning 6 distinct non-negative integers.
4. Test zero-division detection:
   ```powershell
   node --experimental-strip-types --input-type=module -e "import { validateProblem } from './src/math/MathEngine.ts'; console.log(validateProblem({ id: '1', laneIndex: 0, question: '10 ÷ 0 = ', answer: 0, operation: '/', difficultyRating: 1, startTime: 0 }));"
   ```
   *Pass criteria*: Returns `false`.
