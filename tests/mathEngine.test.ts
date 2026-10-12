import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MathEngine,
  validateProblem,
  generateProblemForGrade,
  generateOptions
} from '../src/math/MathEngine.ts';
import type { MathProblem } from '../src/math/MathEngine.ts';
import { getDefaultMathSettingsForGrade, type MathSettings } from '../src/models/Profile.ts';

/**
 * Algebraic & Arithmetic equation verifier.
 * Checks whether problem.answer satisfies the question prompt mathematically.
 */
function verifyEquationTruth(question: string, answer: number): boolean {
  try {
    const q = question.trim();

    // Pattern: Systems of equations: x + y = S, x - y = D. x =
    const sysMatch = q.match(/x\s*\+\s*y\s*=\s*(\d+),\s*x\s*-\s*y\s*=\s*(\d+)\.\s*x\s*=/);
    if (sysMatch) {
      const S = parseInt(sysMatch[1], 10);
      const D = parseInt(sysMatch[2], 10);
      return answer === (S + D) / 2;
    }

    // Pattern: 2^a × 2^b = 2^x, x =
    const powLawMatch = q.match(/2\^(\d+)\s*×\s*2\^(\d+)\s*=\s*2\^x,\s*x\s*=/);
    if (powLawMatch) {
      const a = parseInt(powLawMatch[1], 10);
      const b = parseInt(powLawMatch[2], 10);
      return answer === (a + b);
    }

    // Pattern: If x = K, EXPR =
    const polyMatch = q.match(/If\s+x\s*=\s*(-?\d+),\s*(.*?)\s*=\s*$/);
    if (polyMatch) {
      const k = polyMatch[1];
      const expr = polyMatch[2]
        .replace(/²/g, '**2')
        .replace(/([0-9])x/g, `$1*(${k})`)
        .replace(/x/g, `(${k})`);
      const val = Function(`'use strict'; return (${expr})`)();
      return Math.abs(val - answer) < 1e-5;
    }

    // Clean standard equation
    let clean = q
      .replace(/\(x > 0\)/g, '')
      .replace(/\(x < 0\)/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/²/g, '**2')
      .replace(/³/g, '**3')
      .replace(/\^/g, '**')
      .replace(/√\(\s*(\d+)\*\*2\s*\+\s*(\d+)\*\*2\s*\)/g, 'Math.sqrt($1**2 + $2**2)')
      .replace(/√\s*(\d+)/g, 'Math.sqrt($1)')
      .replace(/√x/g, `Math.sqrt(${answer})`)
      .replace(/(\d+)%\s*(?:of|af|\*)\s*(\d+)/gi, '($1/100)*$2')
      .replace(/\b(of|af)\b/gi, '*');

    // Implicit multiplication: 3x -> 3*(answer), 3( -> 3*(
    clean = clean.replace(/([0-9])x/gi, `$1*(${answer})`);
    clean = clean.replace(/([0-9])\(/g, '$1*(');
    // Replace standalone x with (answer)
    clean = clean.replace(/\bx\b/gi, `(${answer})`);

    const parts = clean.split('=');
    if (parts.length < 2) return false;

    const lhsStr = parts[0].trim();
    const rhsStr = parts[1].replace(/\?/g, '').trim();

    const lhs = Function(`'use strict'; return (${lhsStr})`)();
    const rhs = rhsStr.length > 0
      ? Function(`'use strict'; return (${rhsStr})`)()
      : answer;

    return Math.abs(lhs - rhs) < 1e-5;
  } catch (err) {
    return false;
  }
}

/**
 * Validates invariant properties of every generated MathProblem.
 */
function assertProblemInvariants(problem: MathProblem, grade: number): void {
  // 1. Basic Structure
  assert.ok(problem, `Problem must be defined for Grade ${grade}`);
  assert.equal(typeof problem.id, 'string', `Problem must have string id`);
  assert.equal(typeof problem.question, 'string', `Question must be a string`);
  assert.ok(problem.question.trim().length >= 3, `Question "${problem.question}" is too short`);

  // 2. Numerical Validity
  assert.equal(typeof problem.answer, 'number', `Answer must be a number: ${problem.question}`);
  assert.ok(!Number.isNaN(problem.answer), `Answer must not be NaN: ${problem.question}`);
  assert.ok(Number.isFinite(problem.answer), `Answer must be finite: ${problem.question}`);
  assert.ok(Number.isInteger(problem.answer), `Answer must be an integer, got ${problem.answer}: ${problem.question}`);

  // 3. String Hygiene & Zero-Division Safety
  assert.ok(!problem.question.includes('NaN'), `Question contains NaN: "${problem.question}"`);
  assert.ok(!problem.question.includes('undefined'), `Question contains undefined: "${problem.question}"`);
  assert.ok(!problem.question.includes('null'), `Question contains null: "${problem.question}"`);
  assert.ok(!problem.question.includes('÷ 0'), `Division by zero detected: "${problem.question}"`);
  assert.ok(!problem.question.includes('/ 0'), `Division by zero detected: "${problem.question}"`);
  assert.ok(!problem.question.includes('÷0'), `Division by zero detected: "${problem.question}"`);
  assert.ok(!problem.question.includes('/0'), `Division by zero detected: "${problem.question}"`);

  // 4. Consecutive Operator Syntax Safety
  assert.ok(!/\+\s*-/.test(problem.question), `Malformed "+ -" syntax: "${problem.question}"`);
  assert.ok(!/-\s*-(?!\()/.test(problem.question), `Malformed "- -" syntax: "${problem.question}"`);

  // 5. Grade Boundary Limits
  if (grade === 1) {
    assert.ok(
      problem.answer >= 0 && problem.answer <= 10,
      `Grade 1 answer must be between 0 and 10, got ${problem.answer}: "${problem.question}"`
    );
  } else if (grade === 2) {
    assert.ok(
      problem.answer >= 0 && problem.answer <= 20,
      `Grade 2 answer must be between 0 and 20, got ${problem.answer}: "${problem.question}"`
    );
  } else if (grade <= 5) {
    assert.ok(
      problem.answer >= 0,
      `Grade ${grade} must not yield negative answers, got ${problem.answer}: "${problem.question}"`
    );
  }

  // 6. Multiple-Choice Distractors
  assert.ok(Array.isArray(problem.options), `Problem options must be an array: "${problem.question}"`);
  assert.equal(problem.options.length, 5, `Must have exactly 5 choices: "${problem.question}"`);
  assert.equal(new Set(problem.options).size, 5, `All 5 options must be unique: [${problem.options}]`);
  assert.ok(problem.options.includes(problem.answer), `Options must include correct answer: [${problem.options}]`);
  assert.ok(
    problem.options.every(Number.isInteger),
    `All options must be clean integers: [${problem.options}]`
  );
  if (grade <= 5 && !problem.isNegativeAllowed) {
    assert.ok(
      problem.options.every(o => o >= 0),
      `Options for Grade ${grade} must all be non-negative: [${problem.options}]`
    );
  }

  // 7. General Validator Function Compliance
  assert.ok(validateProblem(problem), `validateProblem returned false for: "${problem.question}"`);

  // 8. Mathematical Equation Truth
  const isEquationAccurate = verifyEquationTruth(problem.question, problem.answer);
  assert.ok(
    isEquationAccurate,
    `Mathematical mismatch in Grade ${grade}: "${problem.question}" does not evaluate to declared answer ${problem.answer}`
  );
}

describe('MathEngine 1,000-Problem Verification Suite', () => {
  const TOTAL_PROBLEMS_PER_GRADE = 100;
  let totalProblemsVerified = 0;

  it('Grade Presets: All 10 grades have differentiated, age-appropriate presets', () => {
    for (let g = 1; g <= 10; g++) {
      const preset = getDefaultMathSettingsForGrade(g);
      assert.ok(preset, `Preset for Grade ${g} must be defined`);
      assert.equal(preset.grade, g, `Preset grade must equal ${g}`);
      assert.ok(preset.operations.length > 0, `Grade ${g} must have operations`);
      if (g <= 5) {
        assert.equal(preset.allowNegative, false, `Grades 1-5 must disallow negatives`);
      } else {
        assert.equal(preset.allowNegative, true, `Grades 6-10 must allow negatives`);
      }
    }
  });

  for (let grade = 1; grade <= 10; grade++) {
    it(`Grade ${grade}: Generates ${TOTAL_PROBLEMS_PER_GRADE} valid, solvable, integer problems`, () => {
      const settings = getDefaultMathSettingsForGrade(grade);
      const engine = new MathEngine(settings);

      let negativeAnswersCount = 0;

      for (let i = 0; i < TOTAL_PROBLEMS_PER_GRADE; i++) {
        const lane = i % 5;
        const problem = engine.generateProblemForLane(lane);

        assertProblemInvariants(problem, grade);
        if (problem.answer < 0) {
          negativeAnswersCount++;
        }
        totalProblemsVerified++;
      }

      if (grade >= 6) {
        // Assert that the curriculum engine generates negative answers for grades 6-10
        assert.ok(
          negativeAnswersCount > 0,
          `Grade ${grade} with allowNegative=true should produce negative solutions across 100 trials, got ${negativeAnswersCount}`
        );
      }
    });
  }

  it('In-Stage Upgrade Drawer: Generates 50 valid bonus capacitor problems', () => {
    const engine = new MathEngine(getDefaultMathSettingsForGrade(5));
    for (let i = 0; i < 50; i++) {
      const problem = engine.generateUpgradeProblem();
      assertProblemInvariants(problem, 5);
      totalProblemsVerified++;
    }
  });

  it('Standalone generateProblemForGrade: Generates valid problems for each grade', () => {
    for (let g = 1; g <= 10; g++) {
      const prob = generateProblemForGrade(g);
      assertProblemInvariants(prob, g);
      totalProblemsVerified++;
    }
  });

  it('Plausible Distractor Generator: Produces strictly unique integer options', () => {
    const options = generateOptions(42, 4, false, { operation: '+', operands: [20, 22] });
    assert.equal(options.length, 4);
    assert.equal(new Set(options).size, 4);
    assert.ok(options.includes(42));
    assert.ok(options.every(Number.isInteger));
    assert.ok(options.every(o => o >= 0));

    // Negative answer options
    const negOptions = generateOptions(-15, 4, true, { operation: '-', operands: [5, 20] });
    assert.equal(negOptions.length, 4);
    assert.equal(new Set(negOptions).size, 4);
    assert.ok(negOptions.includes(-15));
    assert.ok(negOptions.every(Number.isInteger));
  });

  it('Summary: Total verified problems exceeds 1,000 across all suites', () => {
    assert.ok(totalProblemsVerified >= 1050, `Expected at least 1,050 problems tested, got ${totalProblemsVerified}`);
  });
});

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

