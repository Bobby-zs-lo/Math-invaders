# Analysis: Milestone 1 Curriculum Engine & Mathematical Specification

## 1. Executive Summary
This document formalizes the complete mathematical curriculum, problem generation formulas, invariant guarantees, edge cases, and architectural contracts for **Math Invaders** spanning **Grades 1 through 10**.

Authoritative sources probed:
- `ORIGINAL_REQUEST.md` (§R1, §R4)
- `PROJECT.md` (§Milestones M1, §Interface Contracts, §Code Layout)
- Current codebase: `src/math/MathEngine.ts`, `src/models/Profile.ts`, `src/engine/GameEngine.ts`, `src/ui/ParentReportModal.ts`, `src/ui/DifficultyModal.ts`, `src/main.ts`, `index.html`

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Curriculum G1 | Single-Digit Addition & Subtraction (Within 10) | Generates addition and subtraction problems where operands and results are integers in $[0, 10]$, with $a \ge b$ for subtraction. | `grade=1`, `settings` (`+`, `-`) | `MathProblem` with question (e.g. `4 + 5 = `) and integer answer $\in [0, 10]$ | Negative answers disallowed; numbers $> 10$ disallowed | ORIGINAL_REQUEST §R1 |
| 2 | Curriculum G2 | Single & Double-Digit Addition & Subtraction (Within 20) | Generates addition and subtraction bridging 10 with operands and results within 20, non-negative. | `grade=2`, `settings` (`+`, `-`) | `MathProblem` with question (e.g. `14 - 6 = `) and integer answer $\in [0, 20]$ | Subtraction never yields $< 0$; sum never exceeds 20 | ORIGINAL_REQUEST §R1 |
| 3 | Curriculum G3 | Multiplication Tables (1–10) & Clean Division | Core multiplication facts up to $10 \times 10$, clean integer division ($c \pmod b == 0$, $b \neq 0$), 2-digit sums/diffs up to 100. | `grade=3`, `settings` (`+`, `-`, `*`, `/`) | `MathProblem` with question (e.g. `7 × 8 = `, `42 ÷ 6 = `) and answer $\in [1, 100]$ | Divisor never 0; division remainder is strictly 0 | ORIGINAL_REQUEST §R1 |
| 4 | Curriculum G4 | Full Multiplication (1–12) & Multi-Digit Division | Times tables up to $12 \times 12 = 144$, clean integer division with quotients up to 12, arithmetic within 100. | `grade=4`, `settings` (`+`, `-`, `*`, `/`) | `MathProblem` with question (e.g. `12 × 11 = `, `108 ÷ 9 = `) and answer $\in [1, 144]$ | Divisor never 0; non-integer division strictly prohibited | ORIGINAL_REQUEST §R1 |
| 5 | Curriculum G5 | Multi-Step Arithmetic & Order of Operations (PEMDAS) | Expressions with 3 terms, operator precedence, parentheses, and fraction/decimal problems yielding integer answers. | `grade=5`, `settings` | `MathProblem` with question (e.g. `4 + 6 × 3 = `, `1/2 of 18 = `, `1.5 × 6 = `) and answer $\in [1, 200]$ | Sub-divisions must be clean; all decimals/fractions must yield integers | ORIGINAL_REQUEST §R1 |
| 6 | Curriculum G6 | Signed Arithmetic & Negative Numbers | Addition, subtraction, multiplication, and multi-step arithmetic resulting in negative or positive integers. | `grade=6`, `settings` (`allowNegative=true`) | `MathProblem` with question (e.g. `5 - 12 = `, `-8 + 3 = `, `4 × (-6) = `) and answer $\in [-100, 100]$ | Negative answers are valid integers; divisor never 0 | ORIGINAL_REQUEST §R1 |
| 7 | Curriculum G7 | Pre-Algebra & 2-Step Equations ($ax + b = c$) | Linear equations solving for $x$, integer exponents ($x^2, x^3$), power evaluations with integer solutions. | `grade=7`, `settings` | `MathProblem` with question (e.g. `3x + 5 = 20`, `7² = `) and answer $\in [-20, 200]$ | $a \neq 0$; $(c - b) \pmod a == 0$; zero divide-by-zero prohibited | ORIGINAL_REQUEST §R1 |
| 8 | Curriculum G8 | Variables on Both Sides ($ax + b = cx + d$) & Roots | Linear equations with variables on both sides, square roots $\sqrt{n}$ of perfect squares, and negative coefficients. | `grade=8`, `settings` | `MathProblem` with question (e.g. `5x + 3 = 2x + 12`, `√64 = `) and answer $\in [-20, 100]$ | $a \neq c$ (avoids $0x = k$ indeterminate); $n$ must be perfect square | ORIGINAL_REQUEST §R1 |
| 9 | Curriculum G9 | Distributive Equations & Systems of Equations | Equations $a(x + b) = c$, systems $x + y = S, x - y = D$ solving for $x$, and exponent laws ($2^a \times 2^b = 2^x$). | `grade=9`, `settings` | `MathProblem` with question (e.g. `4(x - 3) = 24`, `x + y = 14, x - y = 4. x = `) and answer $\in [-30, 100]$ | $a \neq 0$; $c \pmod a == 0$; determinant $D \neq 0$ | ORIGINAL_REQUEST §R1 |
| 10 | Curriculum G10 | Quadratic Equations & Advanced Polynomials | Quadratics with integer roots ($(x - r_1)(x - r_2) = 0, x > 0$), polynomial evaluation, and Pythagorean triples. | `grade=10`, `settings` | `MathProblem` with question (e.g. `x² - 5x - 24 = 0 (x > 0)`, `√(6² + 8²) = `) and integer answer $\in [1, 200]$ | Real discriminant $D > 0$ that is perfect square; single unique positive root | ORIGINAL_REQUEST §R1 |
| 11 | Validation | Solvability & Invariant Verification Function | Pure validator function verifying non-null, finite integer solution, zero division by zero, and non-indeterminate state. | `MathProblem` | `boolean` (true if all mathematical invariants hold) | Returns false on NaN, non-integer, div-by-zero, or missing question | PROJECT.md Interface Contract |
| 12 | UI / Input | Negative Number Input Support | Virtual numpad `(-)` button and keyboard `-` listener enabling entry of negative answers during arcade combat. | Button click or `-` keypress | `this.currentInput` toggles leading minus (`-`) | Submitting bare `"-"` must be gracefully rejected without crash | PROJECT.md Feature 7 |
| 13 | Telemetry | Parent Analytics Problem History & Upgrade Tracking | Records all problem solves (lane defense + in-stage upgrade station) with timestamp, question, userAnswer, correctAnswer, timeTakenMs. | Solved problem + user input | Appended to `profile.stats.problemHistory` and aggregated KPIs | Must handle upgrade problems as well as lane problems | PROJECT.md Feature 8 |
| 14 | Quality | 1000-Problem Automated Test Suite | Automated test running 1000+ problem generations across Grades 1–10 (100 per grade), verifying 100% solvability and zero errors. | `npm test` / Node test runner | Test report: 1000/1000 pass, 0 errors, 0 invalid answers | Fails if any problem generates NaN, float, div-by-zero, or out-of-grade value | ORIGINAL_REQUEST §R4 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior | Expected / Required Behavior |
|---|---------|-------|-------------------|------------------------------|
| 1 | Negative Subtraction (G1–G2) | $a < b$ when `allowNegative = false` | Currently in `MathEngine.ts:46`, swaps $a$ and $b$ to avoid negative numbers. | Maintain $a \ge b \implies answer \ge 0$. In Grade 1, also enforce $a \le 10$ and $b \le 10$. |
| 2 | Division by Zero (G3–G4) | Random divisor generation | Currently in `MathEngine.ts:68`, `b = Math.floor(...) + 2`, preventing 0 and 1. | Invariant must hold universally: divisor $b \ge 2$. Never generate divisor from range containing 0. |
| 3 | Division with Remainder | Independent generation of dividend and divisor | Can produce floats (e.g. $7 \div 3 = 2.333$). | Invert generation: pick divisor $b$ and quotient $q$, compute dividend $a = b \times q$. Remainder is always 0. |
| 4 | Decimals & Fractions (G5) | $1/3$ of 20 or $0.3 \times 7$ | Produces repeating or non-integer decimals ($6.666...$, $2.1$). | Controlled denominators and factors: $den \in \{2, 3, 4, 5\}$, dividend $n = den \times q$, decimal $0.5 \times (2k) = k$, $1.5 \times (2k) = 3k$. Answer is strictly integer. |
| 5 | Linear Equations $ax + b = c$ (G7) | $a = 0$ or $(c - b) \pmod a \neq 0$ | $0x = c$ has no solution or infinite solutions; non-divisible produces fractional $x$. | Invert generation: pick integer root $x \in [-10, 10]$ and $a \in [-9, 9] \setminus \{0\}$, choose $b$, compute $c = ax + b$. Solvability is 100% guaranteed. |
| 6 | Equations on Both Sides (G8) | $a = c$ in $ax + b = cx + d$ | Results in $(a - c)x = 0x = d - b$, which is degenerate/indeterminate. | Enforce $c \neq a$ during random selection ($c \in \text{range} \setminus \{a\}$). |
| 7 | Quadratic Equations (G10) | Random coefficients $A, B, C$ | Often yields complex or irrational roots (e.g. $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$). | Invert generation: select integer roots $r_1 > 0$ and $r_2 < 0$, expand $(x - r_1)(x - r_2) = x^2 - (r_1 + r_2)x + r_1 r_2 = 0$. In prompt, specify `(x > 0)` so $r_1$ is unique answer. |
| 8 | Square Roots (G8, G10) | Arbitrary integer $n$ in $\sqrt{n}$ | Irrational floats (e.g. $\sqrt{50} \approx 7.071$). | Generate integer root $k \in [2, 15]$, square to $n = k^2$. Display `√n = `, answer is exact integer $k$. |
| 9 | Negative Number Input | Player presses `-` on numpad or keyboard | Currently no `-` button in `index.html` virtual numpad, and `src/main.ts` regex `/^[0-9]$/` ignores `-`. | Add `(-)` button to numpads; accept `-` in keyboard listener; toggle negative sign in input buffer; guard `isNaN(parseInt(input))` on bare `"-"`. |
| 10 | Upgrade Station Telemetry | Upgrade math solved in drawer | Currently `submitUpgradeAnswer` in `GameEngine.ts:227` does not write to `problemHistory`. | Record upgrade problem solves to `profile.stats.problemHistory` with `timeTakenMs`, `operation`, `isCorrect`. |

---

## 2. Mathematical Formalization by Grade Level

### Grade 1: Foundation Addition & Subtraction (Within 10)
- **Target Audience**: 6–7 years old.
- **Cognitive Domain**: Single-digit part-whole relationships, numbers up to 10.
- **Operations**: Addition (`+`), Subtraction (`-`).
- **Invariants**:
  1. $a, b \in \mathbb{N}_0$, $a, b \in [1, 9]$.
  2. Addition: $a + b \le 10$, $answer \in [2, 10]$.
  3. Subtraction: $a \in [1, 10]$, $b \in [1, a]$, $answer = a - b \in [0, 9]$.
  4. Non-negative guarantee: $answer \ge 0$.
- **Formulas**:
  - Addition: Choose $a \in [1, 9]$, choose $b \in [1, 10 - a]$. Display: `${a} + ${b} = `. Answer: $a + b$.
  - Subtraction: Choose $a \in [1, 10]$, choose $b \in [1, a]$. Display: `${a} - ${b} = `. Answer: $a - b$.

### Grade 2: Bridging 10 & Double Digits (Within 20)
- **Target Audience**: 7–8 years old.
- **Cognitive Domain**: Teen numbers, bridging across 10, differences within 20.
- **Operations**: Addition (`+`), Subtraction (`-`).
- **Invariants**:
  1. Addition: $a \in [1, 18]$, $b \in [1, 20 - a]$, $a + b \le 20$.
  2. Subtraction: $a \in [2, 20]$, $b \in [1, a]$, $answer \ge 0$.
  3. At least 50% of problems involve bridging 10 (operands or sums between 11 and 20).
- **Formulas**:
  - Addition: Choose $a \in [2, 18]$, choose $b \in [1, 20 - a]$. Display: `${a} + ${b} = `. Answer: $a + b$.
  - Subtraction: Choose $a \in [5, 20]$, choose $b \in [1, a]$. Display: `${a} - ${b} = `. Answer: $a - b$.

### Grade 3: Times Tables (1–10) & Clean Division & Numbers to 100
- **Target Audience**: 8–9 years old.
- **Cognitive Domain**: Multiplication arrays, clean division groups, 2-digit sums.
- **Operations**: Addition (`+`), Subtraction (`-`), Multiplication (`*`), Division (`/`).
- **Invariants**:
  1. Multiplication: $a \in [2, 10]$, $b \in [1, 10]$, $a \times b \le 100$.
  2. Division: Divisor $b \in [2, 10]$, quotient $q \in [1, 10]$, dividend $c = b \times q$. Divisor $b \neq 0$. $c \pmod b == 0$.
  3. Addition: $a \in [10, 80]$, $b \in [1, 100 - a]$, sum $\le 100$.
  4. Subtraction: $a \in [10, 100]$, $b \in [1, a]$, difference $\ge 0$.
- **Formulas**:
  - Multiplication: Choose $a \in [2, 10]$, $b \in [2, 10]$. Display: `${a} × ${b} = `. Answer: $a \times b$.
  - Division: Choose $b \in [2, 10]$, $q \in [1, 10]$, $c = b \times q$. Display: `${c} ÷ ${b} = `. Answer: $q$.

### Grade 4: Full Times Tables (1–12), Division to 144, Numbers to 100
- **Target Audience**: 9–10 years old.
- **Cognitive Domain**: Fluency in 11 and 12 times tables, larger division, mental arithmetic.
- **Operations**: Addition (`+`), Subtraction (`-`), Multiplication (`*`), Division (`/`).
- **Invariants**:
  1. Multiplication: $a \in [2, 12]$, $b \in [2, 12]$, product up to 144.
  2. Division: Divisor $b \in [2, 12]$, quotient $q \in [2, 12]$, dividend $c = b \times q \le 144$. Remainder is 0. Divisor $\neq 0$.
  3. Multi-digit arithmetic: $a, b \in [10, 99]$ within 100.
- **Formulas**:
  - Multiplication: Choose $a \in [2, 12]$, $b \in [2, 12]$. Display: `${a} × ${b} = `. Answer: $a \times b$.
  - Division: Choose $b \in [2, 12]$, $q \in [2, 12]$, $c = b \times q$. Display: `${c} ÷ ${b} = `. Answer: $q$.

### Grade 5: Multi-Step Arithmetic, Order of Operations & Decimals/Fractions
- **Target Audience**: 10–11 years old.
- **Cognitive Domain**: PEMDAS (Parentheses, Exponents, Multiplication/Division, Addition/Subtraction), fractions and decimals with whole number results.
- **Operations**: Multi-step (`multi_step`), PEMDAS, Fractions (`fractions`), Decimals (`decimals`).
- **Invariants**:
  1. Every expression evaluates to a positive integer: $answer \in \mathbb{N}$.
  2. All sub-divisions evaluate cleanly ($b \pmod c == 0$, $c \neq 0$).
  3. Decimals have finite representations (e.g. $0.5, 1.5, 2.5, 0.25$) and yield whole integers when multiplied or added.
  4. Fractions $\frac{n}{d}$ multiplied by whole numbers $W$ satisfy $(n \times W) \pmod d == 0$.
- **Formulas**:
  - Pattern 1 ($a + b \times c$): Choose $a \in [1, 20]$, $b \in [2, 9]$, $c \in [2, 9]$. Display: `${a} + ${b} × ${c} = `. Answer: $a + b \times c$.
  - Pattern 2 ($(a + b) \times c$): Choose $a \in [1, 10]$, $b \in [1, 10]$, $c \in [2, 6]$. Display: `(${a} + ${b}) × ${c} = `. Answer: $(a + b) \times c$.
  - Pattern 3 ($a \times b - c$): Choose $a, b \in [2, 9]$, $c \in [1, a \times b - 1]$. Display: `${a} × ${b} - ${c} = `. Answer: $a \times b - c$.
  - Pattern 4 ($a + b \div c$): Choose $c \in [2, 8]$, $q \in [2, 10]$, $b = c \times q$, $a \in [1, 30]$. Display: `${a} + ${b} ÷ ${c} = `. Answer: $a + q$.
  - Pattern 5 (Fractions of a Number): Choose $den \in [2, 5]$, $num \in [1, den - 1]$, $q \in [2, 12]$, $W = den \times q$. Display: `${num}/${den} of ${W} = `. Answer: $num \times q$.
  - Pattern 6 (Decimals with Integer Result):
    - $0.5 \times (2k)$: Choose $k \in [2, 30]$, $W = 2k$. Display: `0.5 × ${W} = `. Answer: $k$.
    - $1.5 \times (2k)$: Choose $k \in [2, 15]$, $W = 2k$. Display: `1.5 × ${W} = `. Answer: $3k$.
    - $a.5 + b.5$: Choose $a, b \in [1, 20]$. Display: `${a}.5 + ${b}.5 = `. Answer: $a + b + 1$.

### Grade 6: Negative Numbers & Signed Multi-Step Arithmetic
- **Target Audience**: 11–12 years old.
- **Cognitive Domain**: Negative numbers on number line, signed addition/subtraction, signed multiplication, negative solutions.
- **Operations**: Signed addition/subtraction (`+/-`), signed multiplication (`*`), signed multi-step.
- **Invariants**:
  1. $answer \in [-100, 100]$. Both positive and negative integer answers are generated.
  2. Divisors are non-zero: $|b| \ge 2$.
  3. Clean division for signed values: $a \pmod b == 0$.
- **Formulas**:
  - Pattern 1 (Negative Difference): Choose $a \in [1, 20]$, $diff \in [1, 20]$, $b = a + diff$. Display: `${a} - ${b} = `. Answer: $-diff$.
  - Pattern 2 (Negative + Positive): Choose $a \in [2, 25]$, $b \in [1, 25]$. Display: `-${a} + ${b} = `. Answer: $-a + b$.
  - Pattern 3 (Negative - Positive): Choose $a \in [1, 20]$, $b \in [1, 20]$. Display: `-${a} - ${b} = `. Answer: $-(a + b)$.
  - Pattern 4 (Signed Multiplication): Choose $a \in [2, 9]$, $b \in [2, 9]$. Display: `${a} × (-${b}) = `. Answer: $-(a \times b)$. Or `(-${a}) × (-${b}) = ` with answer $a \times b$.
  - Pattern 5 (Signed Multi-Step): Choose $a \in [5, 30]$, $b, c \in [2, 8]$. Display: `-${a} + ${b} × ${c} = `. Answer: $-a + b \times c$. Or `${a} - ${b} × ${c} = ` with answer $a - b \times c$.

### Grade 7: Pre-Algebra, Linear Equations ($ax + b = c$), Exponents
- **Target Audience**: 12–13 years old.
- **Cognitive Domain**: Solving 1-step and 2-step linear equations for unknown $x$, integer exponents ($x^2, x^3, 2^p$).
- **Operations**: Linear equations (`algebra`), integer exponents (`exponents`).
- **Invariants**:
  1. Variable solution $x \in [-15, 15]$ is strictly an integer.
  2. Linear equation coefficients $a \neq 0$.
  3. Modular divisibility: $(c - b) \pmod a == 0$.
  4. Exponent bases $n \in [2, 15]$ for squares, $n \in [2, 5]$ for cubes, powers of 2 up to $2^6 = 64$.
- **Formulas**:
  - Pattern 1 ($x + a = b$): Choose $x \in [-15, 15]$, $a \in [-20, 20] \setminus \{0\}$, compute $b = x + a$. Display: `x + ${a} = ${b}` (or `x - ${-a} = ${b}`). Answer: $x$.
  - Pattern 2 ($ax + b = c$): Choose $x \in [-10, 10]$, $a \in [-9, 9] \setminus \{0, 1, -1\}$, $b \in [-20, 20]$, compute $c = a \times x + b$. Display: `${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}`. Answer: $x$.
  - Pattern 3 (Squares): Choose $n \in [2, 15]$. Display: `${n}² = `. Answer: $n^2$.
  - Pattern 4 (Cubes): Choose $n \in [2, 5]$. Display: `${n}³ = `. Answer: $n^3$.
  - Pattern 5 (Powers of 2): Choose $p \in [2, 6]$. Display: `2^${p} = `. Answer: $2^p$.
  - Pattern 6 (Power Equations): Choose $n \in [2, 12]$. Display: `x² = ${n * n} (x > 0)`. Answer: $n$.

### Grade 8: Variables on Both Sides ($ax + b = cx + d$), Roots & Negative Coefficients
- **Target Audience**: 13–14 years old.
- **Cognitive Domain**: Linear equations with variables on both sides, square roots $\sqrt{n}$, exponent operations with negative bases.
- **Operations**: Multi-variable linear equations (`algebra`), square roots (`roots`), signed powers.
- **Invariants**:
  1. In $ax + b = cx + d$, $a \neq c$ strictly (guarantees non-degenerate, non-indeterminate state).
  2. Solution $x \in [-12, 12]$ is strictly an integer.
  3. In $\sqrt{n}$, $n$ is strictly a perfect square ($n = k^2, k \in [2, 15]$).
  4. No divide-by-zero or negative radicands.
- **Formulas**:
  - Pattern 1 ($ax + b = cx + d$):
    Choose integer root $x \in [-10, 10]$.
    Choose $a \in [2, 8]$, choose $c \in [-8, 8] \setminus \{a\}$.
    Choose constant $b \in [-15, 15]$.
    Compute $d = (a - c) \times x + b$.
    Display: `${a}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)} = ${c}x ${d >= 0 ? '+' : '-'} ${Math.abs(d)}`.
    Answer: $x$.
  - Pattern 2 (Square Roots): Choose $k \in [2, 15]$, $n = k^2$. Display: `√${n} = `. Answer: $k$.
  - Pattern 3 (Sum of Squares): Choose $a, b \in [2, 6]$. Display: `${a}² + ${b}² = `. Answer: $a^2 + b^2$.
  - Pattern 4 (Negative Base Powers): Choose $a \in [2, 6]$. Display: `(-${a})² = `. Answer: $a^2$. Or `(-${a})³ = ` with answer $-a^3$.

### Grade 9: Distributive Property $a(x + b) = c$, Algebraic Systems, Exponent Laws
- **Target Audience**: 14–15 years old.
- **Cognitive Domain**: Algebraic expansion, distributive factoring, systems of 2 linear equations, exponent multiplication rules.
- **Operations**: Distributive equations, linear systems, exponent laws.
- **Invariants**:
  1. In $a(x + b) = c$, $a \neq 0$ and $c \pmod a == 0$.
  2. In systems $x + y = S, x - y = D$, $S$ and $D$ have same parity ($S + D$ even), guaranteeing integer $x$.
  3. Determinants are non-zero.
- **Formulas**:
  - Pattern 1 ($a(x + b) = c$):
    Choose integer root $x \in [-10, 10]$, $b \in [-8, 8] \setminus \{0\}$, $a \in [-6, 6] \setminus \{0, 1, -1\}$.
    Compute $c = a \times (x + b)$.
    Display: `${a}(x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}) = ${c}`.
    Answer: $x$.
  - Pattern 2 ($a(x + b) + d = c$):
    Choose root $x \in [-10, 10]$, $b \in [-6, 6]$, $a \in [2, 5]$, $d \in [-12, 12]$.
    Compute $c = a \times (x + b) + d$.
    Display: `${a}(x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}) ${d >= 0 ? '+' : '-'} ${Math.abs(d)} = ${c}`.
    Answer: $x$.
  - Pattern 3 (2-Variable System solving for $x$):
    Choose positive integers $x \in [2, 15]$, $y \in [1, 10]$.
    Compute $S = x + y$, $D = x - y$.
    Display: `x + y = ${S}, x - y = ${D}. x = `.
    Answer: $x$.
  - Pattern 4 (Product of Powers Law):
    Choose $a \in [2, 5]$, $b \in [2, 5]$.
    Display: `2^${a} × 2^${b} = 2^x, x = `.
    Answer: $a + b$.

### Grade 10: Quadratic Equations (Positive Roots), Polynomials, Pythagorean Triples
- **Target Audience**: 15–16 years old.
- **Cognitive Domain**: Quadratic factoring, polynomial evaluation $P(x)$, Pythagorean geometry.
- **Operations**: Quadratics (`quadratics`), polynomial evaluation, Pythagorean hypotenuse.
- **Invariants**:
  1. Quadratics $(x - r_1)(x - r_2) = 0$ have integer roots with $r_1 > 0$ and $r_2 < 0$.
  2. Question prompt specifies `(x > 0)`, giving a unique, unambiguous positive integer answer $r_1$.
  3. Discriminant $D = B^2 - 4AC > 0$ and is a perfect square.
  4. Pythagorean triples $(a, b, c)$ satisfy $a^2 + b^2 = c^2$ with $c \in \mathbb{N}$.
- **Formulas**:
  - Pattern 1 (Quadratic Factoring):
    Choose positive root $r_1 \in [2, 9]$, negative root $r_2 \in [-8, -1]$.
    Compute $B = -(r_1 + r_2)$, $C = r_1 \times r_2$.
    Display: `x² ${B >= 0 ? '+' : '-'} ${Math.abs(B)}x ${C >= 0 ? '+' : '-'} ${Math.abs(C)} = 0 (x > 0)`.
    Answer: $r_1$.
  - Pattern 2 (Difference of Squares):
    Choose $k \in [3, 12]$.
    Display: `x² - ${k * k} = 0 (x > 0)`.
    Answer: $k$.
  - Pattern 3 (Polynomial Evaluation):
    Choose $x \in [2, 4]$, $a \in [1, 3]$, $b \in [-3, 3]$, $c \in [-10, 10]$.
    Compute $ans = a \times x^2 + b \times x + c$.
    Display: `If x = ${x}, ${a === 1 ? '' : a}x² ${b >= 0 ? '+' : '-'} ${Math.abs(b)}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)} = `.
    Answer: $ans$.
  - Pattern 4 (Pythagorean Triples):
    Choose from known integer triples: $(3, 4, 5)$, $(5, 12, 13)$, $(6, 8, 10)$, $(8, 15, 17)$, $(9, 12, 15)$.
    Display: `√( ${a}² + ${b}² ) = `.
    Answer: $c$.

---

## 3. Universal Mathematical Invariants & Verification Contract

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      UNIVERSAL MATHEMATICAL INVARIANTS                   │
├──────────────────────────────────────────────────────────────────────────┤
│ 1. INTEGER COMPLETION: ∀ problem P, P.answer ∈ ℤ.                        │
│    Number.isInteger(P.answer) === true && Number.isFinite(P.answer)      │
├──────────────────────────────────────────────────────────────────────────┤
│ 2. NON-ZERO DIVISORS: ∀ division A ÷ B, B ≠ 0.                           │
│    Math.abs(B) ≥ 1 (typically ≥ 2). Divisor range excludes 0.            │
├──────────────────────────────────────────────────────────────────────────┤
│ 3. CLEAN DIVISIBILITY: ∀ division A ÷ B, A mod B === 0.                  │
│    Constructed via Dividend = Divisor × Quotient.                        │
├──────────────────────────────────────────────────────────────────────────┤
│ 4. INDETERMINATE EXCLUSION: No 0/0, 0⁰, √(-k) for k>0, or 0x = k.        │
├──────────────────────────────────────────────────────────────────────────┤
│ 5. UNIQUE ARCADE SOLUTION: Single integer response accepted by numpad.  │
│    Multi-root problems constrain domain (e.g. "x > 0").                  │
├──────────────────────────────────────────────────────────────────────────┤
│ 6. BUFFER SAFETY: Answer ∈ [-999, 9999], string length ≤ 5 chars.        │
├──────────────────────────────────────────────────────────────────────────┤
│ 7. GRADE RANGE COMPLIANCE: Settings bounds & operations strictly honored. │
└──────────────────────────────────────────────────────────────────────────┘
```

### Pure Validation Function: `validateProblem(problem: MathProblem): boolean`
```typescript
export function validateProblem(problem: MathProblem): boolean {
  if (!problem) return false;
  if (typeof problem.question !== 'string' || problem.question.trim().length === 0) return false;
  if (!Number.isInteger(problem.answer) || !Number.isFinite(problem.answer)) return false;
  if (isNaN(problem.answer)) return false;

  // Grade-level boundary checks
  if (problem.grade === 1) {
    if (problem.answer < 0 || problem.answer > 10) return false;
  } else if (problem.grade === 2) {
    if (problem.answer < 0 || problem.answer > 20) return false;
  }

  // Answer buffer check (must fit 5-character numpad limit)
  const str = String(problem.answer);
  if (str.length > 5) return false;

  return true;
}
```

---

## 4. UI & Input Integration Specifications

### 4.1 Negative Number Input Support (Feature 7)
1. **Virtual Numpad in `index.html`**:
   - Add a `(-)` button with `data-action="negate"` or `data-val="-"`.
   - Layout:
     ```
     [1] [2] [3]
     [4] [5] [6]
     [7] [8] [9]
     [⌫] [0] [FIRE 🚀]
     [(-)]
     ```
     Or replace the grid to include `(-)` alongside `0` and `⌫`.
2. **Upgrade Station Drawer Mini Numpad**:
   - Add `(-)` button alongside mini digit keys.
3. **Keyboard Listener in `src/main.ts`**:
   - Listen for `e.key === '-'`.
   - Toggles leading minus sign:
     - If `this.currentInput === ''`, becomes `'-'`.
     - If `this.currentInput.startsWith('-')`, strips `'-'`.
     - Else prepends `'-'`.
4. **Input Submission Safety**:
   - In `submitCurrentAnswer()`:
     ```typescript
     if (!this.currentInput || this.currentInput === '-' || isNaN(parseInt(this.currentInput, 10))) {
       return;
     }
     ```

### 4.2 Keyboard Disambiguation (Feature 15)
- In `src/main.ts:426`:
  Currently: `if (['1', '2', '3', '4', '5'].includes(e.key) && this.currentInput === '')` switches lane.
  This prevents typing `1` to `5` as the first digit of an answer!
  **Specification**:
  - Lane selection via number keys should only trigger when holding a modifier (e.g. `Ctrl`/`Alt`) OR dedicate dedicated keys (like `ArrowLeft`/`ArrowRight`, `A`/`D`, or bottom lane buttons), OR distinguish typing mode from lane targeting.
  - At minimum, typing digits `1–5` must enter the number into `this.currentInput` when the player is in combat, while arrow keys or bottom lane buttons steer the ship.

### 4.3 Parent Analytics Telemetry (Feature 8)
- In `src/engine/GameEngine.ts`:
  1. `submitMathAnswer`: Already records to `profile.stats.problemHistory`.
     Additionally update `profile.stats.totalSolved++`, `profile.stats.totalCorrect++`, `profile.stats.totalErrors++`.
  2. `submitUpgradeAnswer`: Add telemetry recording!
     ```typescript
     this.profile.stats.problemHistory.push({
       timestamp: Date.now(),
       question: this.activeUpgradeProblem.question,
       userAnswer,
       correctAnswer: this.activeUpgradeProblem.answer,
       isCorrect: isSuccess,
       timeTakenMs: upgradeTimeTaken,
       operation: this.activeUpgradeProblem.operation || 'upgrade'
     });
     ```
  3. `ParentReportModal.ts`:
     Add display labels for new operation categories:
     `'multi_step'`: 'Order of Operations',
     `'fractions'`: 'Fractions & Decimals',
     `'exponents'`: 'Exponents & Roots',
     `'algebra'`: 'Linear Equations (Pre-Algebra)',
     `'quadratics'`: 'Quadratics & Advanced'.

---

## 5. Automated Verification Plan (1000-Problem Test)

### Test Target: `tests/mathEngine.test.ts`
- **Execution Command**: `node --experimental-strip-types tests/mathEngine.test.ts` (or configured via `npm test`).
- **Scope**:
  - Generate 100 problems for each grade from 1 to 10 ($10 \times 100 = 1000$ problems).
  - Verify for every single problem:
    1. `validateProblem(prob) === true`.
    2. `Number.isInteger(prob.answer) === true`.
    3. `Number.isNaN(prob.answer) === false`.
    4. Divisor is never 0 in any generated expression.
    5. No indeterminate forms ($0/0$, $\sqrt{-n}$, $\text{NaN}$, $\infty$).
    6. Grade 1 answers are $\in [0, 10]$.
    7. Grade 2 answers are $\in [0, 20]$.
    8. Grades 1–5 answers are non-negative when `allowNegative = false`.
    9. Grades 6–10 generate both positive and negative solutions when `allowNegative = true`.
  - Assert 100% pass rate across all 1000 problems with 0 errors.
