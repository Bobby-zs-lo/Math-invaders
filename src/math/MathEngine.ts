import type { MathSettings } from '../models/Profile.ts';
import { getDefaultMathSettingsForGrade } from '../models/Profile.ts';

export interface MathProblem {
  id: string;
  laneIndex: number;
  question: string;
  answer: number;
  operation: string;
  difficultyRating: number;
  startTime: number;
  grade?: number;
  options?: number[];
  hint?: string;
  isNegativeAllowed?: boolean;
}

export interface DistractorContext {
  operation?: string;
  operands?: number[];
  grade?: number;
}

/**
 * Generates an array of unique integer options containing the correct answer
 * and plausible distractor choices reflecting common learner mistakes.
 */
export function generateOptions(
  correctAnswer: number,
  count: number = 5,
  allowNegative: boolean = false,
  context?: DistractorContext
): number[] {
  const optionsSet = new Set<number>();
  optionsSet.add(correctAnswer);

  const candidatePool: number[] = [];

  // 1. Sign inversion distractor
  if (allowNegative && correctAnswer !== 0) {
    candidatePool.push(-correctAnswer);
  }

  // 2. Contextual arithmetic errors
  if (context && context.operands && context.operands.length >= 2) {
    const [a, b] = context.operands;
    if (context.operation === '+') {
      candidatePool.push(Math.abs(a - b));
      if (a * b <= 100) candidatePool.push(a * b);
    } else if (context.operation === '-') {
      candidatePool.push(a + b);
    } else if (context.operation === '*') {
      candidatePool.push(a + b);
      candidatePool.push(a * (b + 1));
      candidatePool.push(a * Math.max(1, b - 1));
    } else if (context.operation === '/') {
      candidatePool.push(a * b);
    }
  }

  // 3. Off-by-one errors (counting mistakes)
  candidatePool.push(correctAnswer + 1);
  candidatePool.push(correctAnswer - 1);
  candidatePool.push(correctAnswer + 2);
  candidatePool.push(correctAnswer - 2);

  // 4. Place-value shifts
  candidatePool.push(correctAnswer + 10);
  candidatePool.push(correctAnswer - 10);
  candidatePool.push(correctAnswer + 5);
  candidatePool.push(correctAnswer - 5);

  // Filter and insert candidates
  for (const candidate of candidatePool) {
    if (optionsSet.size >= count) break;
    if (
      Number.isInteger(candidate) &&
      Number.isFinite(candidate) &&
      (allowNegative || candidate >= 0) &&
      candidate !== correctAnswer &&
      !optionsSet.has(candidate)
    ) {
      optionsSet.add(candidate);
    }
  }

  // Fallback generation to guarantee exact count in O(count) steps
  const base = Number.isInteger(correctAnswer)
    ? (allowNegative || correctAnswer >= 0 ? correctAnswer : 0)
    : 0;

  let offset = 1;
  while (optionsSet.size < count) {
    const up = base + offset;
    if (
      Number.isInteger(up) &&
      Number.isFinite(up) &&
      (allowNegative || up >= 0) &&
      !optionsSet.has(up)
    ) {
      optionsSet.add(up);
      if (optionsSet.size >= count) break;
    }

    const down = base - offset;
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

  // Fisher-Yates shuffle
  const result = Array.from(optionsSet);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

/**
 * Validates mathematical invariants of a problem:
 * - Well-formed question string
 * - Finite integer solution (zero NaN, float, or indeterminate states)
 * - Zero division by zero
 * - Adherence to grade boundary limits
 */
export function validateProblem(problem: MathProblem): boolean {
  if (!problem) return false;
  if (typeof problem.question !== 'string' || problem.question.trim().length === 0) return false;
  if (typeof problem.answer !== 'number' || !Number.isInteger(problem.answer) || !Number.isFinite(problem.answer)) {
    return false;
  }
  if (Number.isNaN(problem.answer)) return false;

  // String hygiene
  if (problem.question.includes('NaN')) return false;
  if (problem.question.includes('undefined')) return false;
  if (problem.question.includes('null')) return false;

  // Zero-division check: matches ÷ 0 or / 0 with any preceding spacing
  if (/[÷/]\s*0(?!\d)/.test(problem.question)) return false;

  // Consecutive sign check (e.g., '+ -' or '- -' without parentheses)
  if (/\+\s*-/.test(problem.question)) return false;
  if (/-\s*-(?!\()/.test(problem.question)) return false;

  // Grade-level bounds check
  if (problem.grade === 1) {
    if (problem.answer < 0 || problem.answer > 10) return false;
  } else if (problem.grade === 2) {
    if (problem.answer < 0 || problem.answer > 20) return false;
  } else if (problem.grade && problem.grade <= 5 && !problem.isNegativeAllowed) {
    if (problem.answer < 0) return false;
  }

  // Character limit for arcade numpad
  if (String(problem.answer).length > 6) return false;

  return true;
}

/**
 * Standalone generator for a specific grade level.
 */
export function generateProblemForGrade(
  grade: number,
  customSettings?: Partial<MathSettings>,
  laneIndex: number = 0
): MathProblem {
  const baseSettings = getDefaultMathSettingsForGrade(grade);
  const settings: MathSettings = { ...baseSettings, ...customSettings, grade };
  const engine = new MathEngine(settings);
  return engine.generateProblemForLane(laneIndex);
}

export class MathEngine {
  private settings: MathSettings;

  constructor(settings: MathSettings) {
    this.settings = settings;
  }

  public updateSettings(settings: MathSettings): void {
    this.settings = settings;
  }

  public generateOptions(
    correctAnswer: number,
    count: number = 5,
    allowNegative: boolean = false,
    context?: DistractorContext
  ): number[] {
    return generateOptions(correctAnswer, count, allowNegative, context);
  }

  public generateProblemForLane(laneIndex: number): MathProblem {
    const grade = this.settings.grade ?? this.inferGradeFromSettings();
    const allowNegative = this.settings.allowNegative;

    let question = '';
    let answer = 0;
    let operation = '+';
    let operands: number[] = [];

    switch (grade) {
      case 1: {
        // Grade 1: Single-digit addition and subtraction within 10; strictly non-negative
        const ops = this.settings.operations.filter(op => op === '+' || op === '-');
        const chosenOp = ops.length > 0 ? ops[Math.floor(Math.random() * ops.length)] : '+';
        operation = chosenOp;

        if (chosenOp === '+') {
          const a = Math.floor(Math.random() * 9) + 1; // 1 to 9
          const maxB = Math.max(1, 10 - a);
          const b = Math.floor(Math.random() * maxB) + 1; // 1 to (10 - a)
          question = `${a} + ${b} = `;
          answer = a + b;
          operands = [a, b];
        } else {
          // Subtraction: a in [1, 10], b in [1, a] => answer in [0, 9]
          const a = Math.floor(Math.random() * 10) + 1;
          const b = Math.floor(Math.random() * a) + 1;
          question = `${a} - ${b} = `;
          answer = a - b;
          operands = [a, b];
        }
        break;
      }

      case 2: {
        // Grade 2: Addition and subtraction bridging 10 within 20; strictly non-negative
        const ops = this.settings.operations.filter(op => op === '+' || op === '-');
        const chosenOp = ops.length > 0 ? ops[Math.floor(Math.random() * ops.length)] : '+';
        operation = chosenOp;

        if (chosenOp === '+') {
          const a = Math.floor(Math.random() * 17) + 2; // 2 to 18
          const maxB = Math.max(1, 20 - a);
          const b = Math.floor(Math.random() * maxB) + 1;
          question = `${a} + ${b} = `;
          answer = a + b;
          operands = [a, b];
        } else {
          const a = Math.floor(Math.random() * 19) + 2; // 2 to 20
          const b = Math.floor(Math.random() * a) + 1;
          question = `${a} - ${b} = `;
          answer = a - b;
          operands = [a, b];
        }
        break;
      }

      case 3: {
        // Grade 3: Multiplication tables (1-10), clean division, arithmetic within 50
        const ops = this.settings.operations.length > 0 ? this.settings.operations : ['+', '-', '*', '/'];
        const chosenOp = ops[Math.floor(Math.random() * ops.length)];
        operation = chosenOp;

        if (chosenOp === '*') {
          const a = Math.floor(Math.random() * 9) + 2; // 2 to 10
          const maxB = Math.max(1, Math.min(10, Math.floor(50 / a)));
          const b = Math.floor(Math.random() * maxB) + 1;
          question = `${a} × ${b} = `;
          answer = a * b;
          operands = [a, b];
        } else if (chosenOp === '/') {
          // Clean division: divisor >= 2, dividend <= 50
          const b = Math.floor(Math.random() * 9) + 2; // 2 to 10
          const maxQ = Math.max(1, Math.min(10, Math.floor(50 / b)));
          const q = Math.floor(Math.random() * maxQ) + 1;
          const a = b * q;
          question = `${a} ÷ ${b} = `;
          answer = q;
          operands = [a, b];
        } else if (chosenOp === '-') {
          const a = Math.floor(Math.random() * 41) + 10; // 10 to 50
          const b = Math.floor(Math.random() * a) + 1;
          question = `${a} - ${b} = `;
          answer = a - b;
          operands = [a, b];
        } else {
          // Addition
          const a = Math.floor(Math.random() * 40) + 5;
          const maxB = Math.max(1, 50 - a);
          const b = Math.floor(Math.random() * maxB) + 1;
          question = `${a} + ${b} = `;
          answer = a + b;
          operands = [a, b];
        }
        break;
      }

      case 4: {
        // Grade 4: Full times tables (1-12), clean division to 144, arithmetic to 100
        const ops = this.settings.operations.length > 0 ? this.settings.operations : ['+', '-', '*', '/'];
        const chosenOp = ops[Math.floor(Math.random() * ops.length)];
        operation = chosenOp;

        if (chosenOp === '*') {
          const a = Math.floor(Math.random() * 11) + 2; // 2 to 12
          const b = Math.floor(Math.random() * 11) + 2; // 2 to 12
          question = `${a} × ${b} = `;
          answer = a * b;
          operands = [a, b];
        } else if (chosenOp === '/') {
          const b = Math.floor(Math.random() * 11) + 2; // 2 to 12
          const q = Math.floor(Math.random() * 11) + 2; // 2 to 12
          const a = b * q;
          question = `${a} ÷ ${b} = `;
          answer = q;
          operands = [a, b];
        } else if (chosenOp === '-') {
          const a = Math.floor(Math.random() * 85) + 15; // 15 to 100
          const b = Math.floor(Math.random() * a) + 1;
          question = `${a} - ${b} = `;
          answer = a - b;
          operands = [a, b];
        } else {
          const a = Math.floor(Math.random() * 75) + 10;
          const maxB = Math.max(5, 100 - a);
          const b = Math.floor(Math.random() * maxB) + 1;
          question = `${a} + ${b} = `;
          answer = a + b;
          operands = [a, b];
        }
        break;
      }

      case 5: {
        // Grade 5: Multi-step arithmetic, order of operations, fractions & decimals with integer results <= 200
        const pattern = Math.floor(Math.random() * 7);

        if (pattern === 0) {
          // a + b × c
          const a = Math.floor(Math.random() * 30) + 5;
          const b = Math.floor(Math.random() * 8) + 2;
          const c = Math.floor(Math.random() * 8) + 2;
          question = `${a} + ${b} × ${c} = `;
          answer = a + b * c;
          operation = 'multi_step';
          operands = [a, b, c];
        } else if (pattern === 1) {
          // (a + b) × c
          const a = Math.floor(Math.random() * 9) + 2;
          const b = Math.floor(Math.random() * 9) + 2;
          const c = Math.floor(Math.random() * 7) + 2;
          question = `(${a} + ${b}) × ${c} = `;
          answer = (a + b) * c;
          operation = 'multi_step';
          operands = [a, b, c];
        } else if (pattern === 2) {
          // a × b - c
          const a = Math.floor(Math.random() * 8) + 3;
          const b = Math.floor(Math.random() * 8) + 3;
          const maxC = Math.max(1, a * b - 1);
          const c = Math.floor(Math.random() * Math.min(25, maxC)) + 1;
          question = `${a} × ${b} - ${c} = `;
          answer = a * b - c;
          operation = 'multi_step';
          operands = [a, b, c];
        } else if (pattern === 3) {
          // (a - b) ÷ c
          const c = Math.floor(Math.random() * 7) + 2;
          const q = Math.floor(Math.random() * 9) + 2;
          const diff = c * q;
          const b = Math.floor(Math.random() * 15) + 2;
          const a = b + diff;
          question = `(${a} - ${b}) ÷ ${c} = `;
          answer = q;
          operation = 'multi_step';
          operands = [a, b, c];
        } else if (pattern === 4) {
          // a + b ÷ c
          const c = Math.floor(Math.random() * 7) + 2;
          const q = Math.floor(Math.random() * 9) + 2;
          const b = c * q;
          const a = Math.floor(Math.random() * 30) + 5;
          question = `${a} + ${b} ÷ ${c} = `;
          answer = a + q;
          operation = 'multi_step';
          operands = [a, b, c];
        } else if (pattern === 5) {
          // Fractions of a whole number yielding integer result
          const fractions = [
            { num: 1, den: 2 },
            { num: 1, den: 3 },
            { num: 1, den: 4 },
            { num: 2, den: 3 },
            { num: 3, den: 4 },
            { num: 2, den: 5 }
          ];
          const frac = fractions[Math.floor(Math.random() * fractions.length)];
          const k = Math.floor(Math.random() * 10) + 2; // 2 to 11
          const W = frac.den * k;
          question = `${frac.num}/${frac.den} of ${W} = `;
          answer = frac.num * k;
          operation = 'fractions';
          operands = [frac.num, frac.den, W];
        } else {
          // Decimals yielding integer result
          const decType = Math.floor(Math.random() * 3);
          if (decType === 0) {
            // 0.5 × (2k) = k
            const k = Math.floor(Math.random() * 25) + 3;
            const W = 2 * k;
            question = `0.5 × ${W} = `;
            answer = k;
            operands = [W];
          } else if (decType === 1) {
            // 1.5 × (2k) = 3k
            const k = Math.floor(Math.random() * 12) + 2;
            const W = 2 * k;
            question = `1.5 × ${W} = `;
            answer = 3 * k;
            operands = [W];
          } else {
            // a.5 + b.5 = a + b + 1
            const a = Math.floor(Math.random() * 20) + 2;
            const b = Math.floor(Math.random() * 20) + 2;
            question = `${a}.5 + ${b}.5 = `;
            answer = a + b + 1;
            operands = [a, b];
          }
          operation = 'fractions';
        }
        break;
      }

      case 6: {
        // Grade 6: Negative numbers, signed arithmetic, signed multi-step
        const pattern = Math.floor(Math.random() * 6);

        if (pattern === 0) {
          if (!allowNegative) {
            const b = Math.floor(Math.random() * 20) + 1;
            const diff = Math.floor(Math.random() * 20);
            const a = b + diff;
            question = `${a} - ${b} = `;
            answer = diff;
            operands = [a, b];
          } else {
            const a = Math.floor(Math.random() * 20) + 2;
            const diff = Math.floor(Math.random() * 20) + 1;
            const b = a + diff;
            question = `${a} - ${b} = `;
            answer = -diff;
            operands = [a, b];
          }
          operation = '-';
        } else if (pattern === 1) {
          if (!allowNegative) {
            const a = Math.floor(Math.random() * 20) + 1;
            const b = a + Math.floor(Math.random() * 20);
            question = `-${a} + ${b} = `;
            answer = -a + b;
            operation = '+';
            operands = [-a, b];
          } else {
            const a = Math.floor(Math.random() * 25) + 3;
            const b = Math.floor(Math.random() * 25) + 1;
            question = `-${a} + ${b} = `;
            answer = -a + b;
            operation = '+';
            operands = [-a, b];
          }
        } else if (pattern === 2) {
          if (!allowNegative) {
            const a = Math.floor(Math.random() * 20) + 2;
            const b = Math.floor(Math.random() * 20) + 2;
            question = `${a} - (-${b}) = `;
            answer = a + b;
            operation = '-';
            operands = [a, -b];
          } else {
            const a = Math.floor(Math.random() * 18) + 2;
            const b = Math.floor(Math.random() * 18) + 2;
            question = `-${a} - ${b} = `;
            answer = -(a + b);
            operation = '-';
            operands = [-a, b];
          }
        } else if (pattern === 3) {
          // a - (-b) = a + b
          const a = Math.floor(Math.random() * 20) + 2;
          const b = Math.floor(Math.random() * 20) + 2;
          question = `${a} - (-${b}) = `;
          answer = a + b;
          operation = '-';
          operands = [a, -b];
        } else if (pattern === 4) {
          // Signed multiplication
          const a = Math.floor(Math.random() * 8) + 2;
          const b = Math.floor(Math.random() * 8) + 2;
          const variant = allowNegative ? Math.floor(Math.random() * 3) : 1;
          if (variant === 0) {
            question = `${a} × (-${b}) = `;
            answer = -(a * b);
            operands = [a, -b];
          } else if (variant === 1) {
            question = `(-${a}) × (-${b}) = `;
            answer = a * b;
            operands = [-a, -b];
          } else {
            question = `(-${a}) × ${b} = `;
            answer = -(a * b);
            operands = [-a, b];
          }
          operation = '*';
        } else {
          // Signed multi-step
          const b = Math.floor(Math.random() * 7) + 2;
          const c = Math.floor(Math.random() * 7) + 2;
          const bc = b * c;
          const isNegativeFirst = Math.random() < 0.5;
          if (!allowNegative) {
            if (isNegativeFirst) {
              const a = Math.floor(Math.random() * bc);
              question = `-${a} + ${b} × ${c} = `;
              answer = -a + bc;
              operands = [-a, b, c];
            } else {
              const a = bc + Math.floor(Math.random() * 20);
              question = `${a} - ${b} × ${c} = `;
              answer = a - bc;
              operands = [a, b, c];
            }
          } else {
            const a = Math.floor(Math.random() * 25) + 5;
            if (isNegativeFirst) {
              question = `-${a} + ${b} × ${c} = `;
              answer = -a + bc;
            } else {
              question = `${a} - ${b} × ${c} = `;
              answer = a - bc;
            }
            operands = [a, b, c];
          }
          operation = 'multi_step';
        }
        break;
      }

      case 7: {
        // Grade 7: Pre-algebra: 1-step and 2-step linear equations (ax + b = c), exponents
        const pattern = Math.floor(Math.random() * 6);

        if (pattern === 0) {
          // 1-step linear: x + a = b or x - a = b
          const x = allowNegative ? ((Math.floor(Math.random() * 21) - 10) || 3) : (Math.floor(Math.random() * 10) + 1);
          const a = Math.floor(Math.random() * 15) + 1;
          const isAdd = Math.random() < 0.5;
          if (isAdd) {
            question = `x + ${a} = ${x + a}`;
          } else {
            question = `x - ${a} = ${x - a}`;
          }
          answer = x;
          operation = 'algebra';
        } else if (pattern === 1) {
          // 2-step linear: ax + b = c
          const x = allowNegative ? ((Math.floor(Math.random() * 17) - 8) || 2) : (Math.floor(Math.random() * 8) + 1);
          const a = Math.floor(Math.random() * 7) + 2; // 2 to 8
          const b = (Math.floor(Math.random() * 25) - 12) || 4; // non-zero
          const c = a * x + b;
          question = `${a}x ${b > 0 ? '+ ' + b : '- ' + Math.abs(b)} = ${c}`;
          answer = x;
          operation = 'algebra';
        } else if (pattern === 2) {
          // Squares: n²
          const n = Math.floor(Math.random() * 14) + 2; // 2 to 15
          question = `${n}² = `;
          answer = n * n;
          operation = 'exponents';
        } else if (pattern === 3) {
          // Cubes: n³
          const n = Math.floor(Math.random() * 4) + 2; // 2 to 5
          question = `${n}³ = `;
          answer = n * n * n;
          operation = 'exponents';
        } else if (pattern === 4) {
          // Powers of 2: 2^p
          const p = Math.floor(Math.random() * 5) + 2; // 2 to 6
          question = `2^${p} = `;
          answer = Math.pow(2, p);
          operation = 'exponents';
        } else {
          // x² = n² (x > 0)
          const n = Math.floor(Math.random() * 11) + 2; // 2 to 12
          question = `x² = ${n * n} (x > 0)`;
          answer = n;
          operation = 'algebra';
        }
        break;
      }

      case 8: {
        // Grade 8: Linear equations with variables on both sides (ax + b = cx + d), roots, signed powers
        const pattern = Math.floor(Math.random() * 5);

        if (pattern === 0) {
          // ax + b = cx + d (a > c to guarantee a != c and integer solution)
          const x = allowNegative ? ((Math.floor(Math.random() * 17) - 8) || 3) : (Math.floor(Math.random() * 8) + 1);
          const a = Math.floor(Math.random() * 6) + 3; // 3 to 8
          const c = Math.floor(Math.random() * (a - 2)) + 1; // 1 to a-2 => a > c
          const b = (Math.floor(Math.random() * 25) - 12) || 5;
          const d = (a - c) * x + b;
          question = `${a}x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)} = ${c}x ${d >= 0 ? '+ ' + d : '- ' + Math.abs(d)}`;
          answer = x;
          operation = 'algebra';
        } else if (pattern === 1) {
          // Square roots: √n = k
          const k = Math.floor(Math.random() * 14) + 2; // 2 to 15
          const n = k * k;
          question = `√${n} = `;
          answer = k;
          operation = 'exponents';
        } else if (pattern === 2) {
          // Sum of squares: a² + b²
          const a = Math.floor(Math.random() * 5) + 2;
          const b = Math.floor(Math.random() * 5) + 2;
          question = `${a}² + ${b}² = `;
          answer = a * a + b * b;
          operation = 'exponents';
        } else if (pattern === 3) {
          // Signed base powers: (-a)² or (-a)³
          const a = Math.floor(Math.random() * 5) + 2;
          const isEven = !allowNegative || Math.random() < 0.5;
          if (isEven) {
            question = `(-${a})² = `;
            answer = a * a;
          } else {
            question = `(-${a})³ = `;
            answer = -(a * a * a);
          }
          operation = 'exponents';
        } else {
          // Solve 2^x = 2^p
          const p = Math.floor(Math.random() * 5) + 2; // 2 to 6
          const val = Math.pow(2, p);
          question = `2^x = ${val}`;
          answer = p;
          operation = 'algebra';
        }
        break;
      }

      case 9: {
        // Grade 9: Distributive property a(x + b) = c, systems of equations, exponent laws
        const pattern = Math.floor(Math.random() * 5);

        if (pattern === 0) {
          // a(x + b) = c
          const x = allowNegative ? ((Math.floor(Math.random() * 17) - 8) || 3) : (Math.floor(Math.random() * 8) + 1);
          const a = Math.floor(Math.random() * 5) + 2; // 2 to 6
          const b = (Math.floor(Math.random() * 15) - 7) || 2; // non-zero
          const c = a * (x + b);
          question = `${a}(x ${b > 0 ? '+ ' + b : '- ' + Math.abs(b)}) = ${c}`;
          answer = x;
          operation = 'algebra';
        } else if (pattern === 1) {
          // a(x + b) + d = c
          const x = allowNegative ? ((Math.floor(Math.random() * 15) - 7) || 2) : (Math.floor(Math.random() * 7) + 1);
          const a = Math.floor(Math.random() * 4) + 2; // 2 to 5
          const b = (Math.floor(Math.random() * 11) - 5) || 1;
          const d = (Math.floor(Math.random() * 19) - 9) || 3;
          const c = a * (x + b) + d;
          question = `${a}(x ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}) ${d > 0 ? '+ ' + d : '- ' + Math.abs(d)} = ${c}`;
          answer = x;
          operation = 'algebra';
        } else if (pattern === 2) {
          // System of equations: x + y = S, x - y = D => solve for x
          const x = Math.floor(Math.random() * 12) + 4; // 4 to 15
          const y = Math.floor(Math.random() * (x - 2)) + 1; // 1 to x-2
          const S = x + y;
          const D = x - y;
          question = `x + y = ${S}, x - y = ${D}. x = `;
          answer = x;
          operation = 'algebra';
        } else if (pattern === 3) {
          // Product of powers law: 2^a × 2^b = 2^x, x = a + b
          const a = Math.floor(Math.random() * 4) + 2; // 2 to 5
          const b = Math.floor(Math.random() * 4) + 2; // 2 to 5
          question = `2^${a} × 2^${b} = 2^x, x = `;
          answer = a + b;
          operation = 'exponents';
        } else {
          // Radical equation: √x = n => x = n²
          const n = Math.floor(Math.random() * 9) + 2; // 2 to 10
          question = `√x = ${n}`;
          answer = n * n;
          operation = 'algebra';
        }
        break;
      }

      case 10:
      default: {
        // Grade 10: Quadratics with integer roots, polynomials, Pythagorean triples, advanced exponents
        const pattern = Math.floor(Math.random() * 5);

        if (pattern === 0) {
          // Quadratics: (x - r1)(x - r2) = 0 where r1 > 0 and r2 < 0
          const r1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
          const r2 = -(Math.floor(Math.random() * 7) + 1); // -1 to -7
          const B = -(r1 + r2);
          const C = r1 * r2;
          const askNegative = allowNegative && Math.random() < 0.5;
          if (askNegative) {
            question = `x² ${B >= 0 ? '+ ' + B : '- ' + Math.abs(B)}x ${C >= 0 ? '+ ' + C : '- ' + Math.abs(C)} = 0 (x < 0)`;
            answer = r2;
          } else {
            question = `x² ${B >= 0 ? '+ ' + B : '- ' + Math.abs(B)}x ${C >= 0 ? '+ ' + C : '- ' + Math.abs(C)} = 0 (x > 0)`;
            answer = r1;
          }
          operation = 'quadratics';
        } else if (pattern === 1) {
          // Difference of squares: x² - k² = 0
          const k = Math.floor(Math.random() * 12) + 3; // 3 to 14
          const askNegative = allowNegative && Math.random() < 0.5;
          if (askNegative) {
            question = `x² - ${k * k} = 0 (x < 0)`;
            answer = -k;
          } else {
            question = `x² - ${k * k} = 0 (x > 0)`;
            answer = k;
          }
          operation = 'quadratics';
        } else if (pattern === 2) {
          // Polynomial evaluation: If x = k, ax² + bx + c = ?
          const x = allowNegative ? ((Math.floor(Math.random() * 5) - 2) || 2) : (Math.floor(Math.random() * 3) + 1);
          const a = Math.floor(Math.random() * 3) + 1; // 1 to 3
          const b = allowNegative ? (Math.floor(Math.random() * 7) - 3) : Math.floor(Math.random() * 4);
          const c = allowNegative ? (Math.floor(Math.random() * 15) - 8) : (Math.floor(Math.random() * 8) + 1);
          const ans = a * x * x + b * x + c;
          const aStr = a === 1 ? '' : `${a}`;
          question = `If x = ${x}, ${aStr}x² ${b >= 0 ? '+ ' + b : '- ' + Math.abs(b)}x ${c >= 0 ? '+ ' + c : '- ' + Math.abs(c)} = `;
          answer = ans;
          operation = 'quadratics';
        } else if (pattern === 3) {
          // Pythagorean triples: √(a² + b²) = c
          const triples = [
            [3, 4, 5],
            [5, 12, 13],
            [6, 8, 10],
            [8, 15, 17],
            [9, 12, 15],
            [7, 24, 25]
          ];
          const [a, b, c] = triples[Math.floor(Math.random() * triples.length)];
          question = `√( ${a}² + ${b}² ) = `;
          answer = c;
          operation = 'quadratics';
        } else {
          // Advanced exponential equation: 2^x = val or 3^x = val
          const base = Math.random() < 0.6 ? 2 : 3;
          const p = base === 2 ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 3) + 2;
          const val = Math.pow(base, p);
          question = `${base}^x = ${val}`;
          answer = p;
          operation = 'algebra';
        }
        break;
      }
    }

    const options = generateOptions(answer, 5, allowNegative, {
      operation,
      operands,
      grade
    });

    return {
      id: 'prob_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      laneIndex,
      question,
      answer,
      operation,
      difficultyRating: grade >= 7 ? 3 : grade >= 4 ? 2 : 1,
      startTime: performance.now(),
      grade,
      options,
      isNegativeAllowed: allowNegative
    };
  }

  public generateUpgradeProblem(): MathProblem {
    return this.generateProblemForLane(-1);
  }

  private inferGradeFromSettings(): number {
    if (this.settings.grade) return this.settings.grade;
    if (this.settings.operations.includes('x')) return 7;
    if (this.settings.operations.includes('/')) return 4;
    if (this.settings.operations.includes('*')) return 3;
    if (this.settings.operations.includes('-')) return 2;
    return 1;
  }
}
