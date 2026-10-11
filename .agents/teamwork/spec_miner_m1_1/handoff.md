# Handoff Report: Milestone 1 Curriculum Engine Specification Mining

## 1. Observation
1. **Curriculum Scope**:
   In `ORIGINAL_REQUEST.md` (lines 12–18):
   > "### R1. Comprehensive Grade 1–10 Curriculum Engine
   > Expand `MathEngine` to support robust, age-appropriate problem generation across all 10 grades:
   > - Grades 1–2: Single/double-digit addition and subtraction within 10 and 20.
   > - Grades 3–4: Multiplication tables (1–12), clean integer division, and numbers to 100.
   > - Grades 5–6: Multi-step arithmetic, order of operations, negative numbers, and decimals/fractions.
   > - Grades 7–10: Pre-algebra, linear equations ($ax + b = c$), integer exponents, and algebraic variables.
   > Ensure all generated equations have well-defined, positive or negative integer solutions with zero divide-by-zero or indeterminate states."

2. **Existing Implementation Gap**:
   In `src/math/MathEngine.ts` (lines 24–114):
   - `MathEngine` generates problems solely based on `this.settings.operations` (`['+', '-', '*', '/', 'x']`). It does not receive `grade` during generation and lacks differentiation across Grades 1–10.
   - Operations `multi_step`, `fractions`, `decimals`, `exponents`, `roots`, and `quadratics` are not implemented.
   - Pre-algebra (`case 'x'`: lines 76–102) only generates positive single-step equations (`x + a = b`, `ax = b`, `2x + a = b`), missing $ax + b = c$ with negative values, both-sides equations ($ax + b = cx + d$), and distributive forms.
   - In `src/models/Profile.ts` (lines 69–75), Grades 7, 8, 9, and 10 all share the exact same default configuration:
     `{ operations: ['+', '-', '*', '/', 'x'], minNumber: -100, maxNumber: 1000, maxDigits: 3, allowNegative: true }`.

3. **Negative Input Support Gap**:
   In `index.html` (lines 125–138, 169–182):
   - The virtual numpad contains buttons `1` through `9`, `0`, `⌫`, and `FIRE 🚀`. There is no `(-)` key for negative numbers.
   - The upgrade mini numpad contains digits `0–9`, `⌫`, and `⚡ BUFF`, lacking a `(-)` key.
   In `src/main.ts` (line 446):
   - Keydown listener tests `/^[0-9]$/`. It does not listen for `e.key === '-'`.
   In `src/main.ts` (line 426):
   - Keys `'1'–'5'` when `currentInput === ''` intercept input to trigger lane selection, preventing the player from typing numbers starting with 1–5 as answers (Feature 15).

4. **Telemetry Logging Gap**:
   In `src/engine/GameEngine.ts` (lines 186–194 vs 227–252):
   - `submitMathAnswer` records problems into `this.profile.stats.problemHistory`.
   - `submitUpgradeAnswer` (line 227) checks answers but does NOT push to `problemHistory` or update solve metrics.

5. **Interface Contracts**:
   In `PROJECT.md` (lines 55–70):
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

---

## 2. Logic Chain
1. *From Observation 1 and 2*: The project requires 10 distinct, pedagogically calibrated grades. The current `MathEngine` only distinguishes operations based on basic arithmetic and simple positive pre-algebra without grade awareness.
2. *From Observation 1*: The invariant requires 100% solvable integer solutions ($answer \in \mathbb{Z}$) with zero divide-by-zero or indeterminate states.
3. *From Logic Steps 1 & 2*: Every problem generator must invert problem construction:
   - For division: generate quotient $q \in \mathbb{Z}$ and divisor $b \ge 2$, compute dividend $a = b \times q$. This guarantees $a \pmod b == 0$ with 0 remainder and no div-by-zero.
   - For decimals and fractions: generate integer quotient $q$ and base factor, guaranteeing whole-number evaluation (e.g. $0.5 \times 2k = k$, $\frac{n}{d} \times (d \cdot q) = n \cdot q$).
   - For linear equations: generate root $x \in \mathbb{Z}$ and non-zero coefficient $a \neq 0$, then compute constants ($c = ax + b$).
   - For both-sides equations ($ax + b = cx + d$): generate $a \neq c$ and integer root $x$, avoiding indeterminate $0x = k$.
   - For quadratics: generate integer roots $r_1 > 0$ and $r_2 < 0$, formulate standard form, and constrain domain in question prompt (`(x > 0)`).
4. *From Observation 3*: Because Grades 6–10 generate negative integer solutions, the virtual numpad and keyboard handlers must support negative input (`(-)` key and `-` key toggle) while guarding against bare `"-"` submission.
5. *From Observation 4*: For parent analytics to provide accurate diagnostics, both lane defense problems and upgrade drawer problems must be captured in telemetry with response times, correctness, and categorized operation labels.
6. *From Observation 1, 5*: An automated unit test suite `tests/mathEngine.test.ts` generating 100 problems per grade (1000 total) and asserting `validateProblem(p) === true` is required to verify all invariants.

---

## 3. Caveats
- Arcade gameplay requires fast mental calculations under pressure: multi-step and algebraic problems must have compact integer answers (fitting within $[-100, 1000]$ and $\le 5$ characters) so players can type them before aliens breach defenses.
- Grade levels 1–5 default to `allowNegative = false`, while Grades 6–10 default to `allowNegative = true`. Players can customize this in `DifficultyModal`.

---

## 4. Conclusion
The mathematical curriculum for Grades 1–10 has been fully specified in `c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\spec_miner_m1_1\analysis.md`.
The implementation roadmap for Milestone 1 requires:
1. Updating `MathEngine.ts` to implement `generateProblemForGrade(grade, settings)` with dedicated generators for all 10 grades and `validateProblem(problem)`.
2. Updating `Profile.ts` with distinct default settings for Grades 1 through 10.
3. Adding virtual numpad `(-)` button in `index.html` and `-` keyboard listener in `src/main.ts`.
4. Updating `submitUpgradeAnswer` in `GameEngine.ts` to record telemetry into `problemHistory`.
5. Creating `tests/mathEngine.test.ts` executing 1000 problems across all 10 grades to guarantee 100% solvability and zero mathematical errors.

---

## 5. Verification Method
1. **Specification Verification**:
   Inspect `c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders\.agents\teamwork\spec_miner_m1_1\analysis.md` to confirm all 10 grades have complete generation formulas, parameter bounds, invariants, and edge case treatments.
2. **TypeScript & Build Verification**:
   Run:
   ```powershell
   npm run build
   ```
   Ensures that existing code compiles cleanly with Vite and TypeScript compiler.
3. **Automated Curriculum Verification (Post-Implementation)**:
   Run:
   ```powershell
   node --experimental-strip-types tests/mathEngine.test.ts
   ```
   Validates 1000 problems across Grades 1–10 with 0 errors.
