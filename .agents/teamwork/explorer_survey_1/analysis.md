# Requirement 1 (R1) & Curriculum Architecture Survey Report

**Agent:** `explorer_survey_1`  
**Date:** 2026-10-10  
**Target Project:** Math Invaders (`c:\Users\Bobby\OneDrive\Dokumenter\GitHub\Math-invaders`)  
**Scope:** Requirement 1 (R1: Comprehensive Grade 1–10 Curriculum Engine), Problem Generation & Validation, Math Difficulty / Presets, Parent Analytics, and Automated Unit Testing.

---

## 1. Executive Summary

Math Invaders is an educational arcade game built with Vite, TypeScript, and HTML5 Canvas, designed for children across Grades 1 through 10. While the project has a working foundational architecture (arcade game loop, canvas rendering, star map, and basic profile storage), **Requirement 1 (R1)** and **Parent Analytics** contain critical architectural gaps, math curriculum omissions, and input conflicts that currently prevent full compliance with the project specifications.

### Key Discoveries:
1. **Math Engine Curriculum Gaps (Grades 1–10):**
   - **Grades 1–2:** Grade 1 defaults omit subtraction entirely (`['+']`), while Grade 2 allows additions up to 40 instead of staying within 20.
   - **Grades 3–4:** Grade 3 omits division entirely (`['+', '-', '*']`). Multiplication maxes out at 10×10 instead of full 12×12 tables.
   - **Grades 5–6:** Completely missing multi-step arithmetic, order of operations (`2 + 3 × 4`), parentheses, fractions, and decimals yielding clean integer solutions.
   - **Grades 7–10:** Grades 7, 8, 9, and 10 share **identical, generic configuration** (`['+', '-', '*', '/', 'x']`) with only 3 hardcoded, trivial patterns ($x + a = b$, $ax = b$, $2x + a = b$). Linear equations ($ax + b = c$ with arbitrary coefficients), integer exponents ($x^2 = 49$, $2^3 = 8$), multi-step linear equations ($ax + b = cx + d$), distributive property ($a(x + b) = c$), and algebraic variables are **completely missing**.
2. **Negative Number Input Blocker:**
   - Grades 6–10 set `allowNegative: true`, but **neither the virtual on-screen numpad nor physical keyboard listener supports entering a negative sign (`-`)**. If an equation yields a negative integer solution (e.g. $x + 8 = 3 \implies x = -5$), the player is physically unable to type the answer.
3. **Keyboard Lane Selection vs. Number Entry Collision:**
   - When the user's input buffer is empty (`currentInput === ''`), pressing keyboard keys `1`, `2`, `3`, `4`, or `5` executes `selectLane(key - 1)` instead of typing the digit into the active problem. A player cannot type `1`–`5` as the first digit of their answer via the physical keyboard.
4. **Parent Analytics Telemetry Gaps:**
   - In `PlayerStats`, `totalSolved`, `totalCorrect`, `totalErrors`, and `averageTimeMs` are initialized to 0 and **never updated anywhere** in the codebase.
   - Problems solved in the non-blocking in-stage Upgrade Drawer are **never logged** into `problemHistory`.
   - `ParentReportModal` has no offline practice export or printable review sheet for trouble spots.
5. **Testing Suite Absence:**
   - There are **no unit tests** for `MathEngine` in `tests/` or `src/`.
   - `package.json` contains no `"test"` script.

---

## 2. Codebase Architecture & File Mapping

### 2.1 File Map & Responsibilities

| File Path | Lines | Primary Responsibilities & Exported Functions |
|---|---|---|
| `src/math/MathEngine.ts` | 1–120 | Problem generator (`generateProblemForLane`, `generateUpgradeProblem`), `MathProblem` interface. |
| `src/models/Profile.ts` | 1–178 | Data models (`MathSettings`, `PlayerProfile`, `PlayerStats`, `ProblemHistoryRecord`), `getDefaultMathSettingsForGrade(grade)`, profile persistence (`loadProfiles`, `saveProfiles`, `updateActiveProfile`). |
| `src/models/GameState.ts` | 1–131 | Runtime game state (`score`, `lives`, `laneProblems`, `selectedLane`, `inStageUpgradeTier`, `upgradesSolvedThisTier`). |
| `src/ui/ParentReportModal.ts` | 1–116 | Parent Analytics Modal: displays total solved, accuracy %, average response time, mastery by operation, and recent 8 trouble spots. |
| `src/ui/DifficultyModal.ts` | 1–147 | Grade preset buttons (G1–G10), operations checkboxes (`+`, `-`, `*`, `/`, `x`), number range ceiling slider, allow negatives checkbox. |
| `src/ui/UpgradeStationModal.ts` | 1–183 | Standalone modal version of upgrade solver with mini-numpad. |
| `src/engine/GameEngine.ts` | 1–523 | Combat loop, lane selection, `submitMathAnswer` (checks answer, appends to `problemHistory`), `submitUpgradeAnswer` (solves upgrade but skips history). |
| `src/main.ts` | 1–524 | App orchestration, DOM caching, virtual numpads (main and upgrade), keyboard event handling (`keydown`), UI feedback display. |
| `index.html` | 1–197 | DOM layout for header, star map, arena, HUD, 5 bottom lane buttons, main numpad, side upgrade drawer and mini numpad. |
| `test_qc.js` | 1–101 | Standalone Playwright script testing desktop startup, profile creation, stage launch, lane selection. |
| `test_mobile_qc.js` | 1–22 | Standalone Playwright script capturing mobile viewport screenshot. |
| `package.json` | 1–17 | Scripts (`dev`, `build`, `preview`), dependencies (`playwright`, `typescript`, `vite`). |

### 2.2 System Flow Diagram

```
+-----------------------------------------------------------------------------------+
|                                  PLAYER PROFILE                                    |
|   Grade Level (1-10) -> getDefaultMathSettingsForGrade() -> MathSettings          |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                   MATH ENGINE                                     |
|  MathEngine.generateProblemForLane(laneIndex)                                     |
|    -> Picks operation from settings.operations                                    |
|    -> Computes question string & answer number                                    |
|    -> Returns MathProblem: { id, laneIndex, question, answer, operation, ... }    |
+-----------------------------------------------------------------------------------+
             |                                                  |
             | (Lane Problems)                                  | (Upgrade Drawer)
             v                                                  v
+----------------------------------------+     +------------------------------------+
|            COMBAT ARENA                |     |       IN-STAGE UPGRADE DRAWER      |
| Lane 1 - Lane 5 Problem Prompts        |     | Bonus capacitor charging problem   |
| User selects lane & types answer       |     | Real-time live solve during combat |
+----------------------------------------+     +------------------------------------+
             \                                                  /
              \_________________                              /
                                \                            /
                                 v                          v
+-----------------------------------------------------------------------------------+
|                                GAME ENGINE & STATS                                 |
|  submitMathAnswer(userAnswer)                 submitUpgradeAnswer(userAnswer)      |
|   -> Compares userAnswer === answer            -> Compares userAnswer === answer   |
|   -> Logs to profile.stats.problemHistory       -> [BUG: Skips logging to history] |
|   -> Fires weapon salvo / triggers combo       -> Upgrades ship tier (Tier 1-4)    |
|   -> Saves to localStorage (updateActiveProfile)                                  |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             PARENT REPORT MODAL                                   |
|   Aggregates problemHistory: Total Solved, Accuracy %, Speed (s),                  |
|   Mastery by Operation, Recent Missed Trouble Spots                               |
+-----------------------------------------------------------------------------------+
```

---

## 3. Current Capabilities vs. Requirement 1 (Gap Analysis)

### 3.1 Grade-by-Grade Curriculum Audit Matrix

| Grade | R1 Specification | Existing Code Implementation (`Profile.ts:55-76`, `MathEngine.ts:33-103`) | Evaluation & Mathematical Gaps |
|:---:|---|---|---|
| **Grade 1** | Single/double-digit addition and subtraction within 10 and 20. Non-negative answers. | `ops: ['+']`, `min: 1`, `max: 10`, `allowNegative: false`. Problem: `a + b = ?` where $a, b \in [1, 10]$. | **GAP:** Subtraction (`-`) is completely missing from preset! Addition sum can reach $10 + 10 = 20$; does not enforce addition within 10 ($a + b \le 10$). |
| **Grade 2** | Addition and subtraction within 20 and up to 100. Non-negative answers. | `ops: ['+', '-']`, `min: 1`, `max: 20`, `allowNegative: false`. | **GAP:** `a + b` can reach $20 + 20 = 40$. Does not support structured two-digit addition/subtraction up to 100 with regrouping. |
| **Grade 3** | Multiplication tables (1–12), clean integer division, numbers to 100. | `ops: ['+', '-', '*']`, `min: 1`, `max: 50`, `allowNegative: false`. `tableMax = min(12, max(5, sqrt(100))) = 10`. | **GAP:** Division (`/`) is completely omitted from preset! Multiplication tableMax is 10 instead of full 12. |
| **Grade 4** | Multiplication tables (1–12), clean integer division up to 144, numbers to 100. | `ops: ['+', '-', '*', '/']`, `min: 1`, `max: 100`, `allowNegative: false`. `divisorMax = min(12, max(4, sqrt(200))) = 12`. | **PARTIAL:** Clean division works ($a = b \times q$), but limited to single-step operations. Division by numbers up to 12. |
| **Grade 5** | Multi-step arithmetic, order of operations, negative numbers, decimals/fractions with integer solutions. | `ops: ['+', '-', '*', '/']`, `min: 2`, `max: 200`, `allowNegative: false`. | **CRITICAL GAP:** Multi-step arithmetic (e.g. $4 \times 5 + 6$), order of operations ($7 + 3 \times 4 = 19$), parentheses ($(8 - 2) \times 3$), fractions ($\frac{1}{2} \text{ of } 20 = 10$), and decimals ($0.5 \times 12 = 6$) are **completely missing**! |
| **Grade 6** | Order of operations, negative numbers arithmetic, decimals/fractions with integer solutions. | `ops: ['+', '-', '*', '/']`, `min: -50`, `max: 500`, `allowNegative: true`. | **CRITICAL GAP:** Multi-step operations missing. When $a$ or $b$ is negative, string formatting outputs invalid expressions like `50 + -30 = ` or `-20 - -40 = `. Also, negative answers cannot be entered via UI! |
| **Grade 7** | Pre-algebra, linear equations ($ax + b = c$), integer exponents, algebraic variables. | `ops: ['+', '-', '*', '/', 'x']`, `min: -100`, `max: 1000`, `allowNegative: true`. Identical to Grades 8–10. | **CRITICAL GAP:** Only 3 trivial hardcoded patterns: $x + a = b$, $ax = b$, $2x + a = b$. Linear equations with coefficients $a > 2$ or negative constants missing. Integer exponents ($2^3 = 8$) missing. |
| **Grade 8** | Linear equations ($ax + b = c$, $ax + b = cx + d$), integer exponents ($x^2 = 49$, powers), square roots. | Shares identical configuration to Grade 7. | **CRITICAL GAP:** Zero differentiation from Grade 7. Variables on both sides, integer exponents ($x^2 = 64$, $3^3 = 27$), and square roots ($\sqrt{81} = 9$) missing. |
| **Grade 9** | Multi-step linear equations, distributive property $a(x + b) = c$, algebraic variables, integer exponents. | Shares identical configuration to Grade 7. | **CRITICAL GAP:** Zero differentiation from Grade 7. Distributive property, multi-step equations, radicals missing. |
| **Grade 10** | Advanced linear equations, quadratic with integer roots, exponent equations ($2^x = 32$), systems. | Shares identical configuration to Grade 7. | **CRITICAL GAP:** Zero differentiation from Grade 7. Factoring, quadratics with integer roots, exponent equations missing. |

---

### 3.2 Division-by-Zero and Indeterminate States Audit

In `src/math/MathEngine.ts`, lines 65–74:
```typescript
case '/': {
  // Clean integer division: a / b = answer
  const divisorMax = Math.min(12, Math.max(4, Math.floor(Math.sqrt(max * 2))));
  const b = Math.floor(Math.random() * (divisorMax - 1)) + 2;
  const quotient = Math.floor(Math.random() * (divisorMax - 1)) + 1;
  const a = b * quotient;
  question = `${a} ÷ ${b} = `;
  answer = quotient;
  break;
}
```
**Findings:**
1. **Division by Zero:** Currently avoided because `b` starts at `+ 2` (`b >= 2`). Divisor `b` is never 0 or 1.
2. **Integer Division:** Solved correctly via inverse multiplication ($a = b \times \text{quotient}$).
3. **Vulnerability in Customization:** If a parent or user sets `maxNumber` below 4 in `DifficultyModal`, `Math.floor(Math.sqrt(max * 2))` can drop, but `Math.max(4, ...)` guards it. However, if division is ever expanded to negative numbers or algebraic equations ($\frac{x}{a} = b$ or $\frac{ax}{b} = c$), explicit guards ensuring $b \ne 0$ must remain strictly enforced.
4. **Indeterminate States:** No expressions currently yield $0/0$, $\infty$, $\sqrt{-1}$, or non-integer fractions.

---

### 3.3 Negative Numbers & User Input Blocker Audit

R1 states:
> "Ensure all generated equations have well-defined, positive or negative integer solutions with zero divide-by-zero or indeterminate states."

In `src/models/Profile.ts` (lines 68, 74), Grades 6 through 10 have `allowNegative: true`.
However, inspecting `index.html` (lines 124–139) and `src/main.ts` (lines 382–400, 446–458):

1. **Virtual Numpad Grid (`index.html:125-138`):**
   ```html
   <div id="virtual-numpad" class="numpad-grid">
     <button class="num-key" data-val="1">1</button>
     ...
     <button class="num-key" data-val="9">9</button>
     <button class="num-key action-key clear-key" data-action="backspace">⌫</button>
     <button class="num-key" data-val="0">0</button>
     <button class="num-key action-key submit-key" data-action="submit">FIRE 🚀</button>
   </div>
   ```
   **Observation:** There is **NO negative sign (`-`) button** on the virtual numpad.
2. **Upgrade Station Drawer Numpad (`index.html:169-182`):**
   **Observation:** Also contains only digits `0–9`, backspace, and submit. No negative sign.
3. **Physical Keyboard Listener (`src/main.ts:446`):**
   ```typescript
   if (/^[0-9]$/.test(e.key)) {
     if (this.currentInput.length < 5) {
       this.currentInput += e.key;
       this.updateMathInputDisplay();
     }
   }
   ```
   **Observation:** Keydown listener explicitly checks `/^[0-9]$/`. Typing `-` from a keyboard is completely ignored!
4. **String Formatting Bug with Negative Numbers:**
   In `MathEngine.ts`, when `minNumber = -50` and `maxNumber = 500`:
   - `a = 15`, `b = -20`: `question = "15 + -20 = "` (malformed syntax; should be `15 + (-20) = ` or `15 - 20 = `).
   - `a = -10`, `b = -30`: `question = "-10 - -30 = "` (malformed syntax; should be `-10 - (-30) = `).

---

### 3.4 Keyboard Lane Targeting vs. Number Entry Collision Audit

In `src/main.ts`, lines 425–431:
```typescript
// Direct Lane Selection Keys: 1, 2, 3, 4, 5 when input is empty
if (['1', '2', '3', '4', '5'].includes(e.key) && this.currentInput === '') {
  e.preventDefault();
  const targetLane = parseInt(e.key, 10) - 1;
  if (this.gameEngine) this.gameEngine.selectLane(targetLane);
  return;
}
```
**Observation & Critical UX Flaw:**
- When `this.currentInput === ''`, pressing `1`, `2`, `3`, `4`, or `5` selects that lane index instead of typing into the problem!
- Example: Target lane has problem `2 + 1 = ?` (answer `3`). The player wants to type `3`. Because `currentInput` is empty, pressing `3` **does not type 3**; it reselects Lane 3 and leaves `currentInput` completely blank!
- The player cannot type any answer starting with `1`, `2`, `3`, `4`, or `5` via keyboard unless they use the virtual mouse numpad or Numpad keys.

---

## 4. Parent Learning Analytics Architecture & Telemetry Audit

### 4.1 Data Models & State Persistence

In `src/models/Profile.ts`:
```typescript
export interface ProblemHistoryRecord {
  timestamp: number;
  question: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timeTakenMs: number;
  operation: string;
}

export interface PlayerStats {
  totalSolved: number;
  totalCorrect: number;
  totalErrors: number;
  averageTimeMs: number;
  problemHistory: ProblemHistoryRecord[];
}
```

### 4.2 Telemetry Tracking Audit

1. **Dead Aggregate Counters:**
   - In `src/engine/GameEngine.ts` (lines 186–194), when `submitMathAnswer()` is called, it executes:
     ```typescript
     this.profile.stats.problemHistory.push({
       timestamp: Date.now(),
       question: activeProblem.question,
       userAnswer,
       correctAnswer: activeProblem.answer,
       isCorrect,
       timeTakenMs: timeTaken,
       operation: activeProblem.operation
     });
     ```
   - **Gaps:**
     - `this.profile.stats.totalSolved` is never incremented.
     - `this.profile.stats.totalCorrect` is never incremented.
     - `this.profile.stats.totalErrors` is never incremented.
     - `this.profile.stats.averageTimeMs` is never computed.
2. **Missing Upgrade Station Telemetry:**
   - In `src/engine/GameEngine.ts` (lines 227–251), `submitUpgradeAnswer()` verifies bonus upgrade math problems, but **never logs to `problemHistory`**! Up to 25% of math problems solved during a stage are completely missing from the parent report.
3. **Storage Growth & LocalStorage Bounds:**
   - `problemHistory` grows indefinitely with each problem solved. Each answered question triggers `updateActiveProfile(this.profile)`, writing the entire serialized profile to `localStorage`.
   - Without rolling bounds (e.g. retaining the most recent 250 detailed problem records while maintaining cumulative statistics in `totalSolved`/`totalCorrect`), long play sessions can degrade performance or exceed `localStorage` storage limits.

### 4.3 Parent Report UI Capabilities & Gaps (`ParentReportModal.ts`)

- **Current Capabilities:**
  - Displays KPI cards: Solved count, Accuracy %, Average Speed.
  - Mastery progress bars by operation (`+`, `-`, `*`, `/`, `x`).
  - Recent Trouble Spots list (last 8 missed problems).
- **Gaps vs R1 / Acceptance Criteria:**
  - R1 Acceptance Criterion: *"Parent analytics report accurately logs solve times, accuracy %, and recent trouble spots for offline practice."*
  - **No Offline Practice Export / Print Mode:** There is no "Print Practice Sheet" or "Export Offline Review" button to generate a clean printable worksheet for parents to practice missed problems offline.
  - **Operation Labeling:** `opStats` only has labels for `+`, `-`, `*`, `/`, `x`. When new operations (Order of Operations, Exponents, Multi-step Linear Equations) are added, they must be formatted with human-readable labels.
  - **Zero Solved Edge Case:** When `history.length === 0`, accuracy is shown as `100%` instead of `N/A` or `--`.

---

## 5. Automated Testing & Verification Suite Audit

### 5.1 Current Test Coverage
- In `package.json`:
  ```json
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
  ```
  - **No `npm test` script.**
  - **Zero unit test files** in the entire repository.
- Standalone Playwright scripts:
  - `test_qc.js`: Verifies Profile creation, Star Map navigation, Lane selection (via canvas & keys).
  - `test_mobile_qc.js`: Takes a single mobile screenshot.
  - Neither script verifies mathematical correctness or problem generation.

### 5.2 Node 24 Native Test Capability
- The system runs **Node.js v24.14.0**.
- Node 24 natively supports:
  - `node --experimental-strip-types --test tests/mathEngine.test.ts`
  - Native `node:test` and `node:assert` modules without needing additional runners or dependencies.
- This allows implementing a lightning-fast, zero-dependency unit test suite that generates and validates 1,000+ problems across Grades 1–10 in under 100 milliseconds!

---

## 6. Proposed Architecture & Implementation Plan

### 6.1 Expanded Math Engine Architecture (`src/math/MathEngine.ts`)

Refactor `MathEngine` to use dedicated, modular curriculum generators for each grade tier, with guaranteed mathematical validity and integer solutions:

```
                          MathEngine.generateProblem(laneIndex)
                                            |
                  +-------------------------+-------------------------+
                  |                         |                         |
            Grades 1-2                 Grades 3-4                 Grades 5-6
         Basic +/- within          Multiplication (1-12)      Order of Operations
             10 & 20               Clean Division <= 144     Parentheses, Multi-Step
                                                             Fractions/Decimals (Int)
                                                                      |
                                                            Grades 7-10 (Pre-Algebra)
                                                            G7: 1-Step & 2-Step ax+b=c, 2^3
                                                            G8: ax+b=cx+d, x^2=49, sqrt(81)
                                                            G9: a(x+b)=c, radicals, exponents
                                                            G10: Quadratics (int roots), 2^x=32
```

#### Curriculum Generator Specifications:
1. **Grade 1:**
   - Single-digit addition within 10 ($a + b \le 10$, $a, b \ge 0$).
   - Subtraction within 10 ($a \ge b$, $a - b \ge 0$).
   - Sums within 20 ($10 + a = 10 + a$, $a \le 10$).
2. **Grade 2:**
   - Double-digit addition without/with regrouping ($a + b \le 100$).
   - Subtraction within 20 and double-digit subtraction without negative answers ($a \ge b$).
3. **Grade 3:**
   - Multiplication tables 1–10/12 ($a \times b = c$, $a, b \in [1, 12]$).
   - Clean integer division within 100 ($b \in [2, 10]$, $q \in [1, 10]$, $a = b \times q$).
   - Addition and subtraction within 100.
4. **Grade 4:**
   - Full multiplication tables 1–12 ($a, b \in [1, 12]$) and 2-digit by 1-digit ($14 \times 3$).
   - Clean integer division up to 144 ($b \in [2, 12]$, $q \in [1, 12]$, $a = b \times q$).
   - Multi-digit addition and subtraction to 1,000.
5. **Grade 5:**
   - Multi-step arithmetic: $a \times b + c = ?$, $a + b \times c = ?$ (Order of Operations PEMDAS).
   - Parentheses arithmetic: $(a + b) \times c = ?$, $(a - b) \div c = ?$ (guaranteed integer).
   - Fractions with clean integer results: $\frac{1}{2} \text{ of } 24 = 12$, $\frac{3}{4} \text{ of } 20 = 15$, $\frac{2}{3} \text{ of } 18 = 12$.
   - Decimals with clean integer results: $0.5 \times 16 = 8$, $2.5 \times 4 = 10$, $1.5 + 2.5 = 4$.
6. **Grade 6:**
   - Advanced order of operations (3 operators): $a \times b - c \times d = ?$, $a + b \div c - d = ?$.
   - Negative number arithmetic with proper algebraic syntax:
     - $(-a) + b = ?$, $a + (-b) = ?$, $(-a) - b = ?$, $a - (-b) = ?$.
     - $(-a) \times b = ?$, $(-a) \times (-b) = ?$, $a \div (-b) = ?$.
   - Fractions/decimals mixed operations yielding integer answers.
7. **Grade 7:**
   - One-step equations with integers: $x + a = b \implies x = b - a$, $x - a = b \implies x = a + b$.
   - Two-step linear equations: $ax + b = c \implies x = (c - b) / a$ (where $a \in [2, 9]$, $x$ can be positive or negative integer).
   - Basic exponents: $2^3 = 8$, $3^2 = 9$, $4^2 - 6 = 10$.
8. **Grade 8:**
   - Linear equations with variables on both sides: $ax + b = cx + d \implies (a - c)x = d - b$.
   - Linear equations with negatives: $b - ax = c$, $-2x + 7 = 1$.
   - Integer exponents: $x^2 = 49 \implies x = 7$, $2^4 = 16$, $x^3 = 27 \implies x = 3$.
   - Square roots: $\sqrt{64} = 8$, $\sqrt{144} = 12$.
9. **Grade 9:**
   - Multi-step linear equations with distributive property: $a(x + b) = c \implies x = c/a - b$.
   - Equations with distribution on both sides: $2(x + 3) = x + 10$.
   - Exponent rules and radical equations: $\sqrt{x} = 6 \implies x = 36$, $x^2 + 5 = 30 \implies x = 5$.
10. **Grade 10:**
    - Advanced linear equations and factoring quadratics with integer roots:
      - $x^2 - 25 = 0 \implies x = 5$ (find positive root).
      - $(x - a)(x + b) = 0 \implies x = a$ or $-b$.
    - Exponent equations: $2^x = 32 \implies x = 5$, $3^{x+1} = 27 \implies x = 2$.
    - Evaluating quadratic expressions at integer points.

### 6.2 Negative Number Input Resolution

1. **Virtual Numpad Layout Update (`index.html` & `src/styles/main.css`):**
   - Add a dedicated `(-)` button to the numpad:
     ```html
     <button class="num-key sign-key" data-action="toggle-neg">(-)</button>
     ```
   - Toggles leading negative sign on `currentInput` (e.g. `""` -> `"-"` or `"5"` -> `"-5"`).
2. **Physical Keyboard Event Update (`src/main.ts`):**
   - In keydown handler, support `-` or `Minus` key:
     ```typescript
     if (e.key === '-' || e.key === 'Minus') {
       if (this.currentInput === '') {
         this.currentInput = '-';
       } else if (this.currentInput.startsWith('-')) {
         this.currentInput = this.currentInput.substring(1);
       } else {
         this.currentInput = '-' + this.currentInput;
       }
       this.updateMathInputDisplay();
     }
     ```

### 6.3 Resolving Keyboard Lane Selection vs. Number Entry Collision

- Modify the lane selection listener in `src/main.ts`:
  - If keys `1`–`5` are pressed from the **top number row** while `currentInput === ''`, check if the key matches the currently active lane or if `Numpad` is used:
  - Better yet: If keys `1`–`5` target lanes, lane switching occurs when `currentInput === ''` AND the key is different from the currently selected lane (`targetLane !== this.gameEngine.state.selectedLane`). If the player is already targeting Lane 3, pressing `3` types `3`!
  - In addition, keys from the numpad (`event.code.startsWith('Numpad')`) always input digits `0–9` directly into `currentInput`, never switching lanes.
  - Also provide `A` / `D` and `ArrowLeft` / `ArrowRight` for steering between lanes so number keys can freely type into math equations.

### 6.4 Parent Analytics Upgrade & Offline Practice Sheet

1. **Telemetry Fixes:**
   - In `GameEngine.ts`, update `totalSolved`, `totalCorrect`, `totalErrors`, and recalculate `averageTimeMs`.
   - In `submitUpgradeAnswer()`, log upgrade attempts into `problemHistory` with `operation: 'upgrade'`.
   - Cap `problemHistory` to the most recent 300 entries while keeping running totals in `PlayerStats`.
2. **Parent Report Enhancements (`ParentReportModal.ts`):**
   - Add **🖨️ Offline Practice Sheet**:
     - Generates a formatted practice sheet featuring the student's recent trouble spots and tailored practice equations matching their grade curriculum.
     - Supports `window.print()` or a clean pop-out modal view for printable offline study.
   - Comprehensive operations dictionary mapping all new curriculum keys (`pemdas`, `fractions`, `decimals`, `algebra_linear`, `exponents`, etc.) to clear titles.

### 6.5 Automated Test Suite (`tests/mathEngine.test.ts` & `package.json`)

1. **Add `package.json` Test Scripts:**
   ```json
   "scripts": {
     "dev": "vite",
     "build": "tsc && vite build",
     "preview": "vite preview",
     "test": "node --experimental-strip-types --test tests/mathEngine.test.ts",
     "test:e2e": "node test_qc.js && node test_mobile_qc.js"
   }
   ```
2. **1,000+ Problem Verification Unit Test (`tests/mathEngine.test.ts`):**
   - Iterates through Grades 1 to 10.
   - Generates 100 problems per grade (1,000 problems total).
   - Validates each problem against strict invariants:
     - `Number.isInteger(problem.answer) === true`
     - `Number.isFinite(problem.answer) === true`
     - Zero division-by-zero (`!problem.question.includes('÷ 0')` and `!problem.question.includes('/ 0')`)
     - Zero malformed double operators (`!problem.question.includes('+ -')` and `!problem.question.includes('- -')`)
     - Mathematical accuracy: evaluates equation / problem to confirm `calculatedAnswer === problem.answer`.
     - Non-negative answer checks for Grades 1–5 where negatives are disabled.
     - Positive and negative solutions present for Grades 6–10.

---

## 7. Risk Analysis & Implementation Dependencies

| Area | Potential Risk | Mitigation Strategy |
|---|---|---|
| **Math Generation** | Random generation could theoretically infinite-loop if constraints are too tight. | Ensure all arithmetic problem generators use bounded direct formulas (e.g. $b = \text{rand}$, $q = \text{rand}$, $a = b \times q$) with zero `while` loop re-rolls. |
| **Existing Saved Profiles** | Existing profiles in `localStorage` have old `MathSettings`. | Provide automatic migration in `Profile.ts` when loading profiles: if `gradeLevel` is set, ensure modern settings fallback is applied. |
| **UI Responsiveness** | Adding `(-)` button to numpad could overflow mobile displays. | Use CSS grid with responsive sizing; `repeat(6, 1fr)` or dynamic 4x3 keypad layout tailored for mobile (320px–414px). |
| **TypeScript Compilation** | Adding new operation types might break strict typing in `Profile.ts`. | Extend `MathSettings.operations` type union cleanly (`'+' \| '-' \| '*' \| '/' \| 'x' \| 'pemdas' \| 'fraction' \| 'decimal' \| 'linear' \| 'exponent'`). |

---

## 8. Summary of Recommendations for Implementation Phase

1. **Implement Grade-Specific Curriculum Generators in `src/math/MathEngine.ts`:**
   - Structure curriculum generator by Grade Level (1 through 10) covering all R1 topics (Addition/Subtraction in 10/20, 1–12 Times Tables & Clean Division, Multi-Step & Order of Operations, Fractions/Decimals, Linear Equations $ax + b = c$, Exponents & Algebraic Variables).
2. **Update Grade Default Presets in `src/models/Profile.ts`:**
   - Differentiate all 10 grades in `getDefaultMathSettingsForGrade(grade)`.
3. **Fix Negative Input & Keydown Listeners:**
   - Add `(-)` button to `#virtual-numpad` in `index.html` and `src/styles/main.css`.
   - Handle `-` key in `src/main.ts`.
   - Resolve `1`–`5` key collision for lane selection.
4. **Complete Parent Analytics Telemetry:**
   - Log all answers (including upgrade capacitor answers) into `problemHistory`.
   - Update aggregate statistics (`totalSolved`, `totalCorrect`, `totalErrors`, `averageTimeMs`).
   - Add offline practice sheet print/view option to `ParentReportModal.ts`.
5. **Add Automated Test Suite:**
   - Create `tests/mathEngine.test.ts` validating 1,000+ problems across Grades 1–10.
   - Add `"test"` script to `package.json`.
