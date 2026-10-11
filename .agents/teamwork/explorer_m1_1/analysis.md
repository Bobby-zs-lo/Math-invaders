# Milestone 1 Code-Level Architecture Blueprint: MathEngine & Input Architecture

**Agent:** `explorer_m1_1`  
**Date:** 2026-10-10  
**Target:** Milestone 1 (Features 1–8: Grades 1–10 Curriculum Engine, Plausible Options/Distractors, Negative Input Architecture, Parent Analytics, and 1000-Problem Automated Test Suite)  
**Integrity Mode:** Development  

---

## 1. Executive Summary & Problem Formulation

In Math Invaders, Milestone 1 establishes the mathematical foundation and user input interface for the entire game. The existing codebase contained foundational prototypes but suffered from critical curriculum gaps:
1. Grades 1 and 3 lacked subtraction and division respectively.
2. Grades 5 and 6 lacked multi-step arithmetic, order of operations (PEMDAS), fractions/decimals with integer answers, and proper syntax for negative numbers.
3. Grades 7 through 10 were identical, offering only 3 basic algebraic templates without linear equations ($ax + b = c$), variables on both sides ($ax + b = cx + d$), distributive property, exponents, or quadratics.
4. The user interface had no negative sign (`-`) button and rejected keyboard `-`, making negative answers physically impossible to submit.
5. Multiple-choice arcade options / distractor generation was completely absent.
6. `PlayerStats` aggregate telemetry in `GameEngine.ts` was dead, and upgrade station problems were never logged to `problemHistory`.
7. Zero automated unit tests existed in the repository.

This blueprint provides the complete, concrete code-level specifications, mathematical formulas, algorithms, DOM layouts, and event handling logic for Milestone 1.

---

## 2. Profile & MathSettings Presets Blueprint (`src/models/Profile.ts`)

### 2.1 Interface Extensions
In `src/models/Profile.ts`, extend `MathSettings` and `ProblemHistoryRecord` to support grade awareness and multiple-choice options:

```typescript
export type MathOperation = '+' | '-' | '*' | '/' | 'x';

export interface MathSettings {
  operations: MathOperation[];
  minNumber: number;
  maxNumber: number;
  maxDigits: number;
  allowNegative: boolean;
  grade?: number; // Preserves grade identity in custom configurations
}
```

### 2.2 Grade 1–10 Curriculum Presets (`getDefaultMathSettingsForGrade`)
The preset function must return age-appropriate boundaries for all 10 grades:

```typescript
export function getDefaultMathSettingsForGrade(grade: number): MathSettings {
  switch (grade) {
    case 1:
      // Single-digit addition and subtraction within 10 and 20; strictly non-negative
      return {
        operations: ['+', '-'],
        minNumber: 1,
        maxNumber: 10,
        maxDigits: 1,
        allowNegative: false,
        grade: 1
      };

    case 2:
      // Addition and subtraction within 20 and up to 100; non-negative
      return {
        operations: ['+', '-'],
        minNumber: 1,
        maxNumber: 20,
        maxDigits: 2,
        allowNegative: false,
        grade: 2
      };

    case 3:
      // Multiplication tables (1-10/12), clean integer division, numbers to 50
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: 1,
        maxNumber: 50,
        maxDigits: 2,
        allowNegative: false,
        grade: 3
      };

    case 4:
      // Multiplication tables (1-12), clean integer division up to 144, numbers to 100
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: 1,
        maxNumber: 100,
        maxDigits: 3,
        allowNegative: false,
        grade: 4
      };

    case 5:
      // Multi-step arithmetic, order of operations, fractions & decimals with integer results
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: 1,
        maxNumber: 200,
        maxDigits: 3,
        allowNegative: false,
        grade: 5
      };

    case 6:
      // Order of operations, negative number arithmetic, mixed operations
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: -50,
        maxNumber: 300,
        maxDigits: 3,
        allowNegative: true,
        grade: 6
      };

    case 7:
      // Pre-algebra: 1-step and 2-step linear equations (ax + b = c), basic exponents (2^3)
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -100,
        maxNumber: 500,
        maxDigits: 3,
        allowNegative: true,
        grade: 7
      };

    case 8:
      // Linear equations with variables on both sides (ax + b = cx + d), integer powers, square roots
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -100,
        maxNumber: 500,
        maxDigits: 3,
        allowNegative: true,
        grade: 8
      };

    case 9:
      // Multi-step linear equations, distributive property a(x + b) = c, radicals, exponent rules
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -200,
        maxNumber: 800,
        maxDigits: 3,
        allowNegative: true,
        grade: 9
      };

    case 10:
    default:
      // Advanced linear equations, quadratics with integer roots, exponent equations (2^x = 32)
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -200,
        maxNumber: 1000,
        maxDigits: 4,
        allowNegative: true,
        grade: 10
      };
  }
}
```

### 2.3 Backward Compatibility & Profile Migration
In `loadProfiles()`:
```typescript
export function loadProfiles(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Auto-migrate legacy profiles missing modern grade settings
    return parsed.map(profile => {
      if (!profile.mathSettings || !profile.mathSettings.grade) {
        const grade = profile.gradeLevel || 2;
        profile.mathSettings = getDefaultMathSettingsForGrade(grade);
      }
      if (!profile.stats) {
        profile.stats = { totalSolved: 0, totalCorrect: 0, totalErrors: 0, averageTimeMs: 0, problemHistory: [] };
      }
      return profile;
    });
  } catch (err) {
    console.error('Failed to load profiles:', err);
    return [];
  }
}
```

---

## 3. MathEngine Architecture Blueprint (`src/math/MathEngine.ts`)

### 3.1 Extended `MathProblem` Interface
```typescript
export interface MathProblem {
  id: string;
  laneIndex: number;
  question: string;
  answer: number;
  operation: string;
  difficultyRating: number;
  startTime: number;
  grade?: number;
  options?: number[];        // 4 unique choices: correct answer + 3 plausible distractors
  hint?: string;
  isNegativeAllowed?: boolean;
}
```

### 3.2 Pedagogical Generator Helpers

All generator helpers must follow bounded closed-form generation with **zero while-loop re-rolls** to guarantee $O(1)$ constant time execution and absolute termination.

#### A. Addition Helper (`generateAddition`)
- **Grade 1:** $a \in [1, 9]$, $b \in [1, \min(9, 10 - a)] \implies a + b \le 10$ (or within 20 for upper G1).
- **Grade 2:** $a \in [10, 50]$, $b \in [5, 40] \implies a + b \le 100$.
- **Grades 3–4:** Multi-digit addition within $maxNumber$.
- **Grades 5–6:** If `allowNegative`:
  - With 50% probability, generate negative operand:
    - Example 1: `${a} + (${-b}) = ` where $a \in [10, 50]$, $b \in [5, 40]$ $\implies$ answer $a - b$.
    - Example 2: `${-a} + ${b} = ` where $a \in [5, 30]$, $b \in [10, 50]$ $\implies$ answer $-a + b$.
  - Strictly wrap negative operands in parentheses (never `${a} + -${b}`).
- **Grades 7–10:** Positive and negative integer additions across wider ranges.

#### B. Subtraction Helper (`generateSubtraction`)
- **Grade 1:** $a \in [2, 10]$, $b \in [1, a] \implies a - b \ge 0$ (strictly non-negative).
- **Grade 2:** $a \in [10, 99]$, $b \in [1, a] \implies a - b \ge 0$.
- **Grades 3–4:** Subtraction up to 100 with $a \ge b$.
- **Grades 5–6:** If `allowNegative`:
  - Subtractions yielding negative results: $a \in [5, 30]$, $b \in [a + 1, a + 40] \implies a - b < 0$.
  - Subtraction of negative number: `${a} - (${-b}) = ` $\implies a - (-b) = a + b$.
  - Both negative: `${-a} - (${-b}) = ` $\implies -a - (-b) = -a + b$.
  - Formatting rule: Never generate malformed `a - -b`. Always use `${a} - (${-b}) = `.

#### C. Multiplication Helper (`generateMultiplication`)
- **Grade 3:** $a \in [1, 12]$, $b \in [1, 10]$. Question: `${a} × ${b} = `.
- **Grade 4:** Full 1–12 tables + 2-digit by 1-digit:
  - Table: $a \in [2, 12]$, $b \in [2, 12]$.
  - 2-digit: $a \in [11, 20]$, $b \in [2, 5]$.
- **Grades 5–6:** Multiplications with negative numbers if `allowNegative`:
  - `${a} × (${-b}) = ` $\implies -ab$.
  - `${-a} × (${-b}) = ` $\implies ab$.

#### D. Clean Integer Division Helper (`generateDivision`)
- **Strict Invariant 1 (Zero-Division Immunity):** Divisor $b \ge 2$. Never 0 or 1.
- **Strict Invariant 2 (Clean Integer Guarantee):** Never divide arbitrary random numbers. Generate quotient $q$ and divisor $b$ first, then multiply: $a = b \times q$. Then question is `${a} ÷ ${b} = ` and answer is $q$.
- **Grade 3:** $b \in [2, 10]$, $q \in [1, 10]$, $a = b \times q \le 100$.
- **Grade 4:** $b \in [2, 12]$, $q \in [1, 12]$, $a = b \times q \le 144$.
- **Grades 5–6:** Negative division if `allowNegative`:
  - `${a} ÷ (${-b}) = ` $\implies -q$.
  - `${-a} ÷ (${-b}) = ` $\implies q$.

#### E. Multi-Step & Order of Operations Helper (`generateMultiStep`)
Designed for Grades 5–6:
- **Pattern 1 ($a \times b + c$):** $a \in [2, 9]$, $b \in [2, 9]$, $c \in [1, 25]$.
  - Question: `${a} × ${b} + ${c} = ` $\implies (a \times b) + c$.
- **Pattern 2 ($a + b \times c$):** Tests PEMDAS precedence ($b \times c$ first).
  - Question: `${a} + ${b} × ${c} = ` $\implies a + (b \times c)$.
- **Pattern 3 ($(a + b) \times c$):** Parentheses override.
  - Question: `(${a} + ${b}) × ${c} = ` $\implies (a + b) \times c$.
- **Pattern 4 ($a \times b - c$):**
  - Question: `${a} × ${b} - ${c} = ` $\implies (a \times b) - c$.
- **Pattern 5 ($(a - b) \div c$):** Parentheses with clean integer division.
  - $c \in [2, 6]$, $q \in [2, 8]$, diff $d = c \times q$. Choose $b \in [2, 15]$, $a = b + d$.
  - Question: `(${a} - ${b}) ÷ ${c} = ` $\implies q$.
- **Pattern 6 (Grade 6 3-step arithmetic):**
  - `${a} × ${b} - ${c} × ${d} = ` $\implies (a \times b) - (c \times d)$.

#### F. Fractions & Decimals Helper with Guaranteed Integer Results (`generateFractionsDecimals`)
Designed for Grades 5–6 to fulfill R1 curriculum requirement while preserving integer input constraints:
- **Fraction Patterns (Clean Integer Solutions):**
  - Fractions pool: `[{ num: 1, den: 2 }, { num: 1, den: 3 }, { num: 1, den: 4 }, { num: 2, den: 3 }, { num: 3, den: 4 }, { num: 2, den: 5 }]`.
  - Pick fraction `{ num, den }`. Choose integer multiplier $k \in [2, 10]$.
  - Total value $W = den \times k$. Correct answer is $num \times k$ (strictly integer!).
  - Question: `${num}/${den} of ${W} = ` $\implies num \times k$.
  - Examples: `"1/2 of 24 = "` $\implies 12$, `"3/4 of 20 = "` $\implies 15$, `"2/3 of 18 = "` $\implies 12$.
- **Decimal Patterns (Clean Integer Solutions):**
  - Decimals pool:
    - $0.5 \times (2k) \implies k$ ($k \in [2, 20]$). Question: `0.5 × ${2k} = ` $\implies k$.
    - $1.5 \times (2k) \implies 3k$ ($k \in [2, 10]$). Question: `1.5 × ${2k} = ` $\implies 3k$.
    - $2.5 \times (2k) \implies 5k$ ($k \in [1, 8]$). Question: `2.5 × ${2k} = ` $\implies 5k$.
    - $0.25 \times (4k) \implies k$ ($k \in [2, 10]$). Question: `0.25 × ${4k} = ` $\implies k$.
    - Decimal addition: `${k}.5 + ${(k + 1)}.5 = ` $\implies 2k + 2$. Example: `2.5 + 3.5 = ` $\implies 6$.

#### G. Pre-Algebra & Linear Equations Helper (`generatePreAlgebra`)
Designed for Grades 7–10 when `chosenOp === 'x'` (or operation pool contains `'x'`):

- **Grade 7 (1-Step and 2-Step Linear Equations & Exponents):**
  - 1-Step: `$x + ${a} = ${b}$` $\implies x = b - a$ (where $x \in [-10, 20]$).
  - 1-Step: `$x - ${a} = ${b}$` $\implies x = a + b$.
  - 2-Step ($ax + b = c$):
    - Choose $a \in [2, 8]$, integer $x \in [-10, 15]$ (if `allowNegative`), $b \in [1, 20]$.
    - Compute $c = a \times x + b$.
    - If $b > 0$, Question: `${a}x + ${b} = ${c}` $\implies x$.
    - If $b < 0$, Question: `${a}x - ${Math.abs(b)} = ${c}` $\implies x$.
  - Exponents: `$2^3 = $` $\implies 8$, `$3^2 = $` $\implies 9$, `$4^2 = $` $\implies 16$, `$5^2 = $` $\implies 25$.

- **Grade 8 (Variables on Both Sides & Integer Powers):**
  - Variables on both sides ($ax + b = cx + d$):
    - Choose $a \in [3, 8]$, $c \in [1, a - 1]$ (guarantees $a \ne c$).
    - Choose integer $x \in [-10, 12]$, $b \in [1, 20]$.
    - Compute $d = (a - c) \times x + b$.
    - Question: `${a}x + ${b} = ${c}x + ${d}` $\implies x$.
  - Exponents / Square Roots:
    - Choose $n \in [2, 15]$. Question: `√${n * n} = ` $\implies n$.
    - Choose $n \in [2, 12]$. Question: `x² = ${n * n} (x > 0)` $\implies n$.
    - Question: `2^x = ${Math.pow(2, p)}` where $p \in [2, 6]$ $\implies p$.

- **Grade 9 (Distributive Property & Radicals):**
  - Distributive property $a(x + b) = c$:
    - Choose $a \in [2, 5]$, integer $x \in [-8, 12]$, non-zero $b \in [-9, 9]$.
    - Compute $c = a \times (x + b)$.
    - Question: `${a}(x ${b > 0 ? '+ ' + b : '- ' + Math.abs(b)}) = ${c}` $\implies x$.
  - Radicals:
    - Choose $n \in [3, 10]$. Question: `√x = ${n}` $\implies n \times n$.
    - Question: `√x + ${k} = ${n + k}` $\implies n \times n$.
  - Exponent algebra:
    - Question: `x² + ${k} = ${n * n + k} (x > 0)` $\implies n$.

- **Grade 10 (Quadratics with Integer Roots & Exponential Equations):**
  - Quadratics with integer root:
    - Choose $n \in [2, 15]$. Question: `x² - ${n * n} = 0 (x > 0)` $\implies n$.
    - Choose $r_1 \in [2, 8]$, $r_2 \in [1, 7]$. Question: `(x - ${r_1})(x + ${r_2}) = 0 (x > 0)` $\implies r_1$.
  - Exponential equations:
    - Choose $p \in [2, 6]$. Question: `2^x = ${Math.pow(2, p)}` $\implies p$.
    - Choose $p \in [2, 4]$. Question: `3^x = ${Math.pow(3, p)}` $\implies p$.
    - Choose $p \in [2, 4]$. Question: `2^(x+1) = ${Math.pow(2, p + 1)}` $\implies p$.

---

## 4. Options & Plausible Distractor Generator Design

When problems are presented with multiple-choice choices or arcade distractor options, the generator must satisfy 4 non-negotiable invariants:
1. **Plausibility:** Distractors must reflect common student arithmetic errors rather than random arbitrary numbers.
2. **Uniqueness:** All 4 options must be distinct (`new Set(options).size === 4`).
3. **Strictly Integers:** Every option must satisfy `Number.isInteger(x)` and `Number.isFinite(x)`.
4. **Sign Safety:** When `allowNegative === false`, all options must be $\ge 0$.

### 4.1 Distractor Algorithm Implementation
```typescript
export interface DistractorContext {
  operation?: string;
  operands?: number[];
  grade?: number;
}

export function generateOptions(
  correctAnswer: number,
  count: number = 4,
  allowNegative: boolean = false,
  context?: DistractorContext
): number[] {
  const optionsSet = new Set<number>();
  optionsSet.add(correctAnswer);

  const candidatePool: number[] = [];

  // 1. Sign Inversion Error (if negatives allowed and answer != 0)
  if (allowNegative && correctAnswer !== 0) {
    candidatePool.push(-correctAnswer);
  }

  // 2. Operation Confusion based on context operands
  if (context && context.operands && context.operands.length >= 2) {
    const [a, b] = context.operands;
    if (context.operation === '+') {
      candidatePool.push(Math.abs(a - b)); // Subtracted instead of added
      if (a * b <= 100) candidatePool.push(a * b); // Multiplied instead of added
    } else if (context.operation === '-') {
      candidatePool.push(a + b); // Added instead of subtracted
    } else if (context.operation === '*') {
      candidatePool.push(a + b); // Added instead of multiplied
      candidatePool.push(a * (b + 1)); // Off-by-one in table
      candidatePool.push(a * Math.max(1, b - 1));
    } else if (context.operation === '/') {
      candidatePool.push(a * b); // Multiplied instead of divided
    }
  }

  // 3. Off-by-one errors (common counting/calculation mistakes)
  candidatePool.push(correctAnswer + 1);
  candidatePool.push(correctAnswer - 1);
  candidatePool.push(correctAnswer + 2);
  candidatePool.push(correctAnswer - 2);

  // 4. Base-10 Place-Value Errors
  candidatePool.push(correctAnswer + 10);
  candidatePool.push(correctAnswer - 10);
  candidatePool.push(correctAnswer + 5);
  candidatePool.push(correctAnswer - 5);

  // 5. Populate unique valid options
  for (const candidate of candidatePool) {
    if (optionsSet.size >= count) break;
    if (
      Number.isInteger(candidate) &&
      (allowNegative || candidate >= 0) &&
      candidate !== correctAnswer &&
      !optionsSet.has(candidate)
    ) {
      optionsSet.add(candidate);
    }
  }

  // 6. Guaranteed Fallback if pool exhausted
  let offset = 3;
  while (optionsSet.size < count) {
    const fallbackVal = correctAnswer + (optionsSet.size % 2 === 0 ? offset : -offset);
    if (
      Number.isInteger(fallbackVal) &&
      (allowNegative || fallbackVal >= 0) &&
      !optionsSet.has(fallbackVal)
    ) {
      optionsSet.add(fallbackVal);
    }
    offset++;
  }

  // 7. Fisher-Yates Shuffle
  const result = Array.from(optionsSet);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
```

---

## 5. User Input Architecture: Virtual Numpad & Keyboard Listeners

### 5.1 Virtual Numpad Layout in `index.html`
Currently, `#virtual-numpad` has 12 buttons arranged in a 6-column grid (`repeat(6, 1fr)`). To cleanly incorporate the `(-)` negative sign button without creating ragged rows or increasing vertical height:
- Configure `.numpad-grid` with **7 columns**: `grid-template-columns: repeat(7, 1fr)`.
- Row 1 (7 columns): `1`, `2`, `3`, `4`, `5`, `6`, `⌫` (backspace).
- Row 2 (7 columns): `7`, `8`, `9`, `0`, `(-)`, `FIRE 🚀` (spanning 2 columns: `grid-column: span 2`).

```html
<!-- Kid-Friendly Virtual Numpad -->
<div id="virtual-numpad" class="numpad-grid">
  <button class="num-key" data-val="1">1</button>
  <button class="num-key" data-val="2">2</button>
  <button class="num-key" data-val="3">3</button>
  <button class="num-key" data-val="4">4</button>
  <button class="num-key" data-val="5">5</button>
  <button class="num-key" data-val="6">6</button>
  <button class="num-key action-key clear-key" data-action="backspace">⌫</button>
  <button class="num-key" data-val="7">7</button>
  <button class="num-key" data-val="8">8</button>
  <button class="num-key" data-val="9">9</button>
  <button class="num-key" data-val="0">0</button>
  <button class="num-key action-key sign-key" data-action="neg">(-)</button>
  <button class="num-key action-key submit-key" data-action="submit">FIRE 🚀</button>
</div>
```

### 5.2 Upgrade Drawer Mini Numpad in `index.html`
In `#upgrade-side-panel`, update `.mini-numpad-grid` (3 columns):
```html
<div class="mini-numpad-grid">
  <button class="mini-key upg-digit" data-v="1">1</button>
  <button class="mini-key upg-digit" data-v="2">2</button>
  <button class="mini-key upg-digit" data-v="3">3</button>
  <button class="mini-key upg-digit" data-v="4">4</button>
  <button class="mini-key upg-digit" data-v="5">5</button>
  <button class="mini-key upg-digit" data-v="6">6</button>
  <button class="mini-key upg-digit" data-v="7">7</button>
  <button class="mini-key upg-digit" data-v="8">8</button>
  <button class="mini-key upg-digit" data-v="9">9</button>
  <button class="mini-key sign-mini-key" id="btn-upg-neg">(-)</button>
  <button class="mini-key upg-digit" data-v="0">0</button>
  <button class="mini-key clear-mini-key" id="btn-upg-clear">⌫</button>
  <button class="mini-key submit-mini-key" id="btn-upg-submit" style="grid-column: span 3;">⚡ BUFF</button>
</div>
```

### 5.3 CSS Grid Updates in `src/styles/main.css`
```css
.numpad-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.submit-key {
  grid-column: span 2;
  background: linear-gradient(135deg, rgba(0, 255, 102, 0.35), rgba(0, 243, 255, 0.35));
  border-color: var(--neon-green);
  color: var(--neon-green);
  font-size: 0.85rem;
}

.sign-key {
  background: rgba(0, 243, 255, 0.15);
  border-color: rgba(0, 243, 255, 0.35);
  color: var(--neon-cyan);
}

.sign-mini-key {
  background: rgba(0, 243, 255, 0.15);
  border-color: rgba(0, 243, 255, 0.35);
  color: var(--neon-cyan);
}
```

### 5.4 Input Handling Logic in `src/main.ts`

#### Negative Sign Toggle Helper
```typescript
private toggleMathNegative(): void {
  if (this.currentInput === '') {
    this.currentInput = '-';
  } else if (this.currentInput === '-') {
    this.currentInput = '';
  } else if (this.currentInput.startsWith('-')) {
    this.currentInput = this.currentInput.slice(1);
  } else if (this.currentInput.length < 6) {
    this.currentInput = '-' + this.currentInput;
  }
  this.updateMathInputDisplay();
}

private toggleUpgradeNegative(): void {
  if (this.currentUpgradeInput === '') {
    this.currentUpgradeInput = '-';
  } else if (this.currentUpgradeInput === '-') {
    this.currentUpgradeInput = '';
  } else if (this.currentUpgradeInput.startsWith('-')) {
    this.currentUpgradeInput = this.currentUpgradeInput.slice(1);
  } else if (this.currentUpgradeInput.length < 6) {
    this.currentUpgradeInput = '-' + this.currentUpgradeInput;
  }
  this.updateUpgradeInputDisplay();
}
```

#### Virtual Numpad Click Listener Update
In `bindEvents()`:
```typescript
document.querySelectorAll('.num-key').forEach(key => {
  key.addEventListener('click', (e) => {
    const el = e.currentTarget as HTMLElement;
    const val = el.getAttribute('data-val');
    const act = el.getAttribute('data-action');

    if (val !== null) {
      if (this.currentInput.length < 6) {
        this.currentInput += val;
        this.updateMathInputDisplay();
      }
    } else if (act === 'neg') {
      this.toggleMathNegative();
    } else if (act === 'backspace') {
      this.currentInput = this.currentInput.slice(0, -1);
      this.updateMathInputDisplay();
    } else if (act === 'submit') {
      this.submitCurrentAnswer();
    }
  });
});

document.getElementById('btn-upg-neg')?.addEventListener('click', () => {
  this.toggleUpgradeNegative();
});
```

#### Physical Keyboard Listener Update
In the `window.addEventListener('keydown', (e) => { ... })` listener:
```typescript
// Support negative numbers via '-' or 'Minus' or 'NumpadSubtract'
if (e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
  e.preventDefault();
  this.toggleMathNegative();
  return;
}

// Disambiguate top-row digits 1-5 vs typing when input is active
// If user already pressed '-' (e.g. currentInput === '-'), typing 1-5 MUST enter the digit, not change lane!
if (['1', '2', '3', '4', '5'].includes(e.key) && this.currentInput === '') {
  // Only trigger lane switch if the key does not match the already-selected lane
  const targetLane = parseInt(e.key, 10) - 1;
  if (this.gameEngine && this.gameEngine.state.selectedLane !== targetLane) {
    e.preventDefault();
    this.gameEngine.selectLane(targetLane);
    return;
  }
}

// Digits 0-9 entry
if (/^[0-9]$/.test(e.key)) {
  if (this.currentInput.length < 6) {
    this.currentInput += e.key;
    this.updateMathInputDisplay();
  }
}
```

#### Submit Validation Guard
In `submitCurrentAnswer()`:
```typescript
private submitCurrentAnswer(): void {
  if (!this.currentInput || this.currentInput === '-' || !this.gameEngine) return;

  const val = parseInt(this.currentInput, 10);
  if (isNaN(val)) return;

  const correct = this.gameEngine.submitMathAnswer(val);
  // ...
}
```

---

## 6. Parent Analytics & Telemetry Blueprint

### 6.1 Telemetry Fixes in `src/engine/GameEngine.ts`
1. **Aggregate Counters:**
   Whenever `submitMathAnswer(userAnswer)` is called:
   ```typescript
   this.profile.stats.totalSolved++;
   if (isCorrect) {
     this.profile.stats.totalCorrect++;
   } else {
     this.profile.stats.totalErrors++;
   }
   
   // Recalculate rolling average speed
   const n = this.profile.stats.totalSolved;
   this.profile.stats.averageTimeMs = Math.round(
     ((this.profile.stats.averageTimeMs * (n - 1)) + timeTaken) / n
   );
   ```

2. **In-Stage Upgrade Problem Logging:**
   In `submitUpgradeAnswer(userAnswer)`:
   ```typescript
   if (this.activeUpgradeProblem) {
     const isCorrect = userAnswer === this.activeUpgradeProblem.answer;
     this.profile.stats.problemHistory.push({
       timestamp: Date.now(),
       question: this.activeUpgradeProblem.question,
       userAnswer,
       correctAnswer: this.activeUpgradeProblem.answer,
       isCorrect,
       timeTakenMs: 0,
       operation: 'upgrade'
     });
     this.profile.stats.totalSolved++;
     if (isCorrect) this.profile.stats.totalCorrect++;
     else this.profile.stats.totalErrors++;
   }
   ```

3. **Storage Bounded Rolling History:**
   Cap `problemHistory` to the most recent 300 entries:
   ```typescript
   if (this.profile.stats.problemHistory.length > 300) {
     this.profile.stats.problemHistory = this.profile.stats.problemHistory.slice(-300);
   }
   ```

### 6.2 Offline Practice Sheet Export in `ParentReportModal.ts`
Add a dedicated printable sheet action to `ParentReportModal`:
```typescript
const printBtn = this.container.querySelector('#btn-print-practice');
printBtn?.addEventListener('click', () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  const troubleSpots = this.profile.stats.problemHistory.filter(h => !h.isCorrect).slice(-10);
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Math Invaders — Practice Sheet for ${this.profile.name}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #222; }
          h1 { color: #003366; }
          .problem-row { font-size: 1.4rem; margin: 15px 0; padding: 10px; border-bottom: 1px solid #ccc; }
        </style>
      </head>
      <body>
        <h1>Math Invaders: Offline Practice Worksheet</h1>
        <p>Student: <b>${this.profile.name}</b> | Grade: <b>${this.profile.gradeLevel}</b> | Date: ${new Date().toLocaleDateString()}</p>
        <hr/>
        <h3>Target Trouble Spots for Review:</h3>
        ${troubleSpots.map((t, idx) => `
          <div class="problem-row">${idx + 1}. &nbsp;&nbsp; ${t.question} &nbsp; ______</div>
        `).join('')}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
});
```

---

## 7. 1000-Problem Automated Verification Test Suite (`tests/mathEngine.test.ts`)

### 7.1 Execution Environment & Runner
- **Runner:** Node.js v24.14.0 native test runner (`node:test`, `node:assert/strict`) via `--experimental-strip-types`.
- **Command:** `node --experimental-strip-types --test tests/mathEngine.test.ts`
- **Zero Additional Dependencies Required.**

### 7.2 Test Suite Architecture
Create `tests/mathEngine.test.ts` verifying:
1. `getDefaultMathSettingsForGrade(grade)` returns valid settings for Grades 1–10.
2. 1000 generated problems (100 problems $\times$ 10 grades) satisfy:
   - `Number.isInteger(problem.answer) === true`
   - `Number.isFinite(problem.answer) === true`
   - `!isNaN(problem.answer)`
   - No divide-by-zero: `!problem.question.includes('÷ 0')` and `!problem.question.includes('/ 0')`.
   - No malformed signs: `!problem.question.includes('+ -')` and `!problem.question.includes('- -')`.
   - In Grades 1–5 (`allowNegative: false`), `problem.answer >= 0`.
   - In Grades 6–10 (`allowNegative: true`), test that negative numbers and equations are supported.
3. Multiple-choice options generator:
   - Exactly 4 options per problem.
   - `new Set(options).size === 4` (100% unique).
   - All options are strictly integers (`Number.isInteger(opt)`).
   - `options.includes(problem.answer) === true`.
   - For non-negative grades, all options $\ge 0$.

### 7.3 `package.json` Integration
Add test script to `package.json`:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "test": "node --experimental-strip-types --test tests/mathEngine.test.ts"
}
```

---

## 8. File-by-File Change Matrix for Milestone 1

| Target File | Modifications Required | Risk Level |
|---|---|---|
| `src/models/Profile.ts` | 1. Update `getDefaultMathSettingsForGrade(g)` presets for Grades 1–10.<br>2. Add `grade?: number` to `MathSettings`.<br>3. Add auto-migration in `loadProfiles()`. | Low |
| `src/math/MathEngine.ts` | 1. Extend `MathProblem` with `options?: number[]`, `hint?: string`, `grade?: number`.<br>2. Implement helpers: `generateAddition`, `generateSubtraction`, `generateMultiplication`, `generateDivision`, `generateMultiStep`, `generateFractionsDecimals`, `generatePreAlgebra`.<br>3. Implement `generateOptions(...)`.<br>4. Implement standalone `generateProblemForGrade(grade, settings)`. | Medium |
| `index.html` | 1. Update `#virtual-numpad` to 7-column layout with `(-)` key and wide `FIRE 🚀` key.<br>2. Update `#upgrade-side-panel` mini numpad with `(-)` key. | Low |
| `src/styles/main.css` | 1. Update `.numpad-grid` to `repeat(7, 1fr)`.<br>2. Add styles for `.sign-key`, `.sign-mini-key`, and `.submit-key` span. | Low |
| `src/main.ts` | 1. Add `toggleMathNegative()` and `toggleUpgradeNegative()`.<br>2. Handle `act === 'neg'` on numpad click.<br>3. Handle `-`, `Minus`, `NumpadSubtract` in `keydown` listener.<br>4. Disambiguate top-row digits 1–5 vs lane selection.<br>5. Guard `submitCurrentAnswer` against `-` or `NaN`. | Medium |
| `src/engine/GameEngine.ts` | 1. Increment `totalSolved`, `totalCorrect`, `totalErrors`, recalculate `averageTimeMs`.<br>2. Log upgrade problems to `problemHistory`.<br>3. Cap `problemHistory` at 300 entries. | Low |
| `src/ui/ParentReportModal.ts` | 1. Add offline printable worksheet generator button.<br>2. Update operation labels for new curriculum types. | Low |
| `tests/mathEngine.test.ts` | New file: 1000-problem unit test suite across all 10 grades using Node 24 native test runner. | Low |
| `package.json` | Add `"test": "node --experimental-strip-types --test tests/mathEngine.test.ts"`. | Low |

---

## 9. Next Steps for Implementation
This blueprint is ready for implementation by the builder agent in Milestone 1. All algorithms, mathematical proofs of integer solutions, DOM structure, and event handling have been specified.
