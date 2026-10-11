import {
  MathEngine,
  validateProblem,
  generateProblemForGrade,
  generateOptions,
  type MathProblem,
  type DistractorContext
} from '../src/math/MathEngine.ts';
import { getDefaultMathSettingsForGrade } from '../src/models/Profile.ts';

// Comprehensive Oracle to verify mathematical truth of any generated problem
function verifyMathematicalTruth(problem: MathProblem): { valid: boolean; reason?: string } {
  const q = problem.question.trim();
  const ans = problem.answer;

  // 1. Systems of equations: x + y = S, x - y = D. x =
  const sysMatch = q.match(/x\s*\+\s*y\s*=\s*(\d+),\s*x\s*-\s*y\s*=\s*(\d+)\.\s*x\s*=/);
  if (sysMatch) {
    const S = parseInt(sysMatch[1], 10);
    const D = parseInt(sysMatch[2], 10);
    const expectedX = (S + D) / 2;
    if (ans !== expectedX) {
      return { valid: false, reason: `System solution mismatch: expected ${expectedX}, got ${ans}` };
    }
    return { valid: true };
  }

  // 2. Power law: 2^a × 2^b = 2^x, x =
  const powLawMatch = q.match(/2\^(\d+)\s*×\s*2\^(\d+)\s*=\s*2\^x,\s*x\s*=/);
  if (powLawMatch) {
    const a = parseInt(powLawMatch[1], 10);
    const b = parseInt(powLawMatch[2], 10);
    if (ans !== a + b) {
      return { valid: false, reason: `Exponent law mismatch: expected ${a + b}, got ${ans}` };
    }
    return { valid: true };
  }

  // 3. Polynomial evaluation: If x = K, EXPR =
  const polyMatch = q.match(/If\s+x\s*=\s*(-?\d+),\s*(.*?)\s*=\s*$/);
  if (polyMatch) {
    const k = parseInt(polyMatch[1], 10);
    const rawExpr = polyMatch[2];
    // Transform rawExpr: e.g. 2x² - 3x + 4
    let expr = rawExpr
      .replace(/²/g, '**2')
      .replace(/([0-9])x/g, `$1*(${k})`)
      .replace(/\bx\b/g, `(${k})`);
    try {
      const calculated = Function(`'use strict'; return (${expr})`)();
      if (Math.abs(calculated - ans) > 1e-5) {
        return { valid: false, reason: `Polynomial eval: expr "${expr}" evaluated to ${calculated}, declared answer ${ans}` };
      }
      return { valid: true };
    } catch (e: any) {
      return { valid: false, reason: `Polynomial eval syntax error: ${e.message} on "${expr}"` };
    }
  }

  // 4. Pythagorean triples: √( a² + b² ) =
  const pythMatch = q.match(/√\(\s*(\d+)²\s*\+\s*(\d+)²\s*\)\s*=\s*$/);
  if (pythMatch) {
    const a = parseInt(pythMatch[1], 10);
    const b = parseInt(pythMatch[2], 10);
    const expected = Math.sqrt(a * a + b * b);
    if (Math.abs(expected - ans) > 1e-5) {
      return { valid: false, reason: `Pythagorean mismatch: expected ${expected}, got ${ans}` };
    }
    return { valid: true };
  }

  // 5. Fraction of a number: a/b of W =
  const fracMatch = q.match(/(\d+)\/(\d+)\s+of\s+(\d+)\s*=\s*$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    const W = parseInt(fracMatch[3], 10);
    const expected = (num / den) * W;
    if (Math.abs(expected - ans) > 1e-5) {
      return { valid: false, reason: `Fraction mismatch: ${num}/${den} of ${W} expected ${expected}, got ${ans}` };
    }
    return { valid: true };
  }

  // 6. Quadratic with condition: x² ... = 0 (x > 0) or (x < 0)
  const quadMatch = q.match(/x²\s*([+-]\s*\d+)?x\s*([+-]\s*\d+)\s*=\s*0\s*\((x\s*[><]\s*0)\)/);
  if (quadMatch) {
    const bPart = quadMatch[1] ? quadMatch[1].replace(/\s+/g, '') : '+0';
    const bCoeff = parseInt(bPart, 10);
    const cPart = quadMatch[2].replace(/\s+/g, '');
    const cCoeff = parseInt(cPart, 10);
    const cond = quadMatch[3];

    // Check sign condition
    if (cond.includes('x > 0') && ans <= 0) {
      return { valid: false, reason: `Quadratic specified x > 0 but answer is ${ans}` };
    }
    if (cond.includes('x < 0') && ans >= 0) {
      return { valid: false, reason: `Quadratic specified x < 0 but answer is ${ans}` };
    }

    // Check quadratic equation: ans^2 + bCoeff * ans + cCoeff == 0
    const val = ans * ans + bCoeff * ans + cCoeff;
    if (val !== 0) {
      return { valid: false, reason: `Quadratic root mismatch: (${ans})² + (${bCoeff})*(${ans}) + (${cCoeff}) = ${val} != 0` };
    }
    return { valid: true };
  }

  // 7. Difference of squares: x² - k² = 0 (x > 0) or (x < 0)
  const diffSqMatch = q.match(/x²\s*-\s*(\d+)\s*=\s*0\s*\((x\s*[><]\s*0)\)/);
  if (diffSqMatch) {
    const kSq = parseInt(diffSqMatch[1], 10);
    const cond = diffSqMatch[2];
    if (cond.includes('x > 0') && ans <= 0) {
      return { valid: false, reason: `Difference of squares specified x > 0 but answer is ${ans}` };
    }
    if (cond.includes('x < 0') && ans >= 0) {
      return { valid: false, reason: `Difference of squares specified x < 0 but answer is ${ans}` };
    }
    if (ans * ans !== kSq) {
      return { valid: false, reason: `Difference of squares root mismatch: (${ans})² = ${ans * ans} != ${kSq}` };
    }
    return { valid: true };
  }

  // 8. General Algebraic or Arithmetic equation
  try {
    let clean = q
      .replace(/\(x > 0\)/g, '')
      .replace(/\(x < 0\)/g, '')
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/²/g, '**2')
      .replace(/³/g, '**3')
      .replace(/\^/g, '**')
      .replace(/√\s*(\d+)/g, 'Math.sqrt($1)')
      .replace(/√x/g, `Math.sqrt(${ans})`);

    // Handle linear algebra substitutions
    clean = clean.replace(/([0-9])x/gi, `$1*(${ans})`);
    clean = clean.replace(/([0-9])\(/g, '$1*(');
    clean = clean.replace(/\bx\b/gi, `(${ans})`);

    const parts = clean.split('=');
    if (parts.length < 2) {
      return { valid: false, reason: `No equals sign found in "${q}"` };
    }

    const lhsStr = parts[0].trim();
    const rhsStr = parts[1].replace(/\?/g, '').trim();

    const lhs = Function(`'use strict'; return (${lhsStr})`)();
    const rhs = rhsStr.length > 0
      ? Function(`'use strict'; return (${rhsStr})`)()
      : ans;

    if (Math.abs(lhs - rhs) > 1e-4) {
      return { valid: false, reason: `Equation balance failed: LHS ${lhs} != RHS ${rhs} in "${clean}"` };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Evaluation exception: ${err.message} on "${q}"` };
  }
}

async function runEmpiricalStressTest() {
  console.log('====================================================');
  console.log('   MATH INVADERS EMPIRICAL STRESS TEST HARNESS     ');
  console.log('====================================================\n');

  let totalProblems = 0;
  let totalErrors = 0;
  const failureLog: string[] = [];

  const gradeStats: Record<number, { count: number; negativeCount: number; maxAnswer: number; minAnswer: number }> = {};
  for (let g = 1; g <= 10; g++) {
    gradeStats[g] = { count: 0, negativeCount: 0, maxAnswer: -Infinity, minAnswer: Infinity };
  }

  // TEST 1: Generate 1,000 problems per grade for Grades 1-10 (10,000 problems)
  console.log('>> Generating 1,000 problems per grade (Grades 1–10: 10,000 total)...');
  for (let grade = 1; grade <= 10; grade++) {
    const settings = getDefaultMathSettingsForGrade(grade);
    const engine = new MathEngine(settings);

    for (let i = 0; i < 1000; i++) {
      totalProblems++;
      const lane = i % 5;
      const prob = engine.generateProblemForLane(lane);

      const stats = gradeStats[grade];
      stats.count++;
      if (prob.answer < 0) stats.negativeCount++;
      if (prob.answer > stats.maxAnswer) stats.maxAnswer = prob.answer;
      if (prob.answer < stats.minAnswer) stats.minAnswer = prob.answer;

      // 1. Integer check
      if (!Number.isInteger(prob.answer) || !Number.isFinite(prob.answer) || Number.isNaN(prob.answer)) {
        totalErrors++;
        failureLog.push(`[Grade ${grade}] Answer is not integer: ${prob.answer} for "${prob.question}"`);
      }

      // 2. Division by zero check
      if (prob.question.includes('/ 0') || prob.question.includes('÷ 0') || prob.question.includes('/0') || prob.question.includes('÷0')) {
        totalErrors++;
        failureLog.push(`[Grade ${grade}] Division by zero detected: "${prob.question}"`);
      }

      // 3. String hygiene
      if (prob.question.includes('NaN') || prob.question.includes('undefined') || prob.question.includes('null')) {
        totalErrors++;
        failureLog.push(`[Grade ${grade}] Malformed string detected: "${prob.question}"`);
      }

      // 4. Grade-level negative rules
      if (grade <= 5 && prob.answer < 0) {
        totalErrors++;
        failureLog.push(`[Grade ${grade}] Negative answer in Grades 1-5: ${prob.answer} for "${prob.question}"`);
      }
      if (grade === 1 && (prob.answer < 0 || prob.answer > 10)) {
        totalErrors++;
        failureLog.push(`[Grade 1] Out of bounds [0, 10]: ${prob.answer} for "${prob.question}"`);
      }
      if (grade === 2 && (prob.answer < 0 || prob.answer > 20)) {
        totalErrors++;
        failureLog.push(`[Grade 2] Out of bounds [0, 20]: ${prob.answer} for "${prob.question}"`);
      }

      // 5. Options check: exactly 4 unique integers containing answer
      if (!Array.isArray(prob.options) || prob.options.length !== 4) {
        totalErrors++;
        failureLog.push(`[Grade ${grade}] Options length != 4: [${prob.options}] for "${prob.question}"`);
      } else {
        const uniqueSet = new Set(prob.options);
        if (uniqueSet.size !== 4) {
          totalErrors++;
          failureLog.push(`[Grade ${grade}] Duplicate options detected: [${prob.options}] for "${prob.question}"`);
        }
        if (!prob.options.includes(prob.answer)) {
          totalErrors++;
          failureLog.push(`[Grade ${grade}] Options missing correct answer: [${prob.options}] ans=${prob.answer} for "${prob.question}"`);
        }
        if (!prob.options.every(Number.isInteger)) {
          totalErrors++;
          failureLog.push(`[Grade ${grade}] Non-integer options detected: [${prob.options}] for "${prob.question}"`);
        }
        if (grade <= 5 && !prob.isNegativeAllowed && prob.options.some(o => o < 0)) {
          totalErrors++;
          failureLog.push(`[Grade ${grade}] Negative option when allowNegative=false: [${prob.options}] for "${prob.question}"`);
        }
      }

      // 6. validateProblem validator check
      if (!validateProblem(prob)) {
        totalErrors++;
        failureLog.push(`[Grade ${grade}] validateProblem returned false for "${prob.question}" ans=${prob.answer}`);
      }

      // 7. Mathematical truth oracle
      const mathCheck = verifyMathematicalTruth(prob);
      if (!mathCheck.valid) {
        totalErrors++;
        failureLog.push(`[Grade ${grade}] Mathematical falsity: ${mathCheck.reason} in "${prob.question}"`);
      }
    }
  }

  // Check negative presence in Grades 6-10
  for (let g = 6; g <= 10; g++) {
    const s = gradeStats[g];
    console.log(`  Grade ${g}: ${s.count} problems generated, ${s.negativeCount} negative answers (${((s.negativeCount / s.count) * 100).toFixed(1)}%), answer range [${s.minAnswer}, ${s.maxAnswer}]`);
    if (s.negativeCount === 0) {
      totalErrors++;
      failureLog.push(`Grade ${g} produced ZERO negative answers across 1,000 trials!`);
    }
  }
  for (let g = 1; g <= 5; g++) {
    const s = gradeStats[g];
    console.log(`  Grade ${g}: ${s.count} problems generated, ${s.negativeCount} negative answers (0.0%), answer range [${s.minAnswer}, ${s.maxAnswer}]`);
  }

  // TEST 2: In-Stage Upgrade Drawer (1,000 problems across various grades)
  console.log('\n>> Testing In-Stage Upgrade Drawer problems (1,000 problems)...');
  for (let g = 1; g <= 10; g++) {
    const engine = new MathEngine(getDefaultMathSettingsForGrade(g));
    for (let i = 0; i < 100; i++) {
      totalProblems++;
      const prob = engine.generateUpgradeProblem();
      if (!validateProblem(prob)) {
        totalErrors++;
        failureLog.push(`[Upgrade Drawer Grade ${g}] validateProblem failed: "${prob.question}"`);
      }
      const mathCheck = verifyMathematicalTruth(prob);
      if (!mathCheck.valid) {
        totalErrors++;
        failureLog.push(`[Upgrade Drawer Grade ${g}] Math check failed: ${mathCheck.reason}`);
      }
    }
  }

  // TEST 3: Standalone generateProblemForGrade (1,000 problems)
  console.log('\n>> Testing standalone generateProblemForGrade (1,000 problems)...');
  for (let g = 1; g <= 10; g++) {
    for (let i = 0; i < 100; i++) {
      totalProblems++;
      const prob = generateProblemForGrade(g);
      if (!validateProblem(prob)) {
        totalErrors++;
        failureLog.push(`[Standalone Grade ${g}] validateProblem failed: "${prob.question}"`);
      }
      const mathCheck = verifyMathematicalTruth(prob);
      if (!mathCheck.valid) {
        totalErrors++;
        failureLog.push(`[Standalone Grade ${g}] Math check failed: ${mathCheck.reason}`);
      }
    }
  }

  // TEST 4: Boundary & Adversarial Inputs for generateOptions
  console.log('\n>> Stress-testing generateOptions with boundary values & edge cases...');
  const edgeAnswers = [0, 1, 2, -1, -2, 5, -5, 10, -10, 50, -50, 100, -100, 999, -999, 10000];
  const testContexts: (DistractorContext | undefined)[] = [
    undefined,
    { operation: '+', operands: [0, 0] },
    { operation: '+', operands: [1, 2] },
    { operation: '+', operands: [50, 50] },
    { operation: '-', operands: [10, 5] },
    { operation: '-', operands: [5, 10] },
    { operation: '*', operands: [0, 5] },
    { operation: '*', operands: [12, 12] },
    { operation: '/', operands: [100, 10] },
    { operation: '/', operands: [50, 2] }
  ];

  let optionTestsCount = 0;
  for (const ans of edgeAnswers) {
    for (const allowNeg of [false, true]) {
      // If ans < 0 and allowNeg is false, skip because correctAnswer itself is negative
      if (ans < 0 && !allowNeg) continue;

      for (const ctx of testContexts) {
        optionTestsCount++;
        totalProblems++;
        const opts = generateOptions(ans, 4, allowNeg, ctx);

        if (opts.length !== 4) {
          totalErrors++;
          failureLog.push(`generateOptions length != 4: [${opts}] for ans=${ans}, allowNeg=${allowNeg}`);
        }
        const set = new Set(opts);
        if (set.size !== 4) {
          totalErrors++;
          failureLog.push(`generateOptions duplicate options: [${opts}] for ans=${ans}, allowNeg=${allowNeg}`);
        }
        if (!opts.includes(ans)) {
          totalErrors++;
          failureLog.push(`generateOptions missing correct ans ${ans}: [${opts}], allowNeg=${allowNeg}`);
        }
        if (!opts.every(Number.isInteger)) {
          totalErrors++;
          failureLog.push(`generateOptions non-integers: [${opts}] for ans=${ans}`);
        }
        if (!allowNeg && opts.some(o => o < 0)) {
          totalErrors++;
          failureLog.push(`generateOptions produced negative option with allowNeg=false: [${opts}] for ans=${ans}`);
        }
      }
    }
  }
  console.log(`  Verified ${optionTestsCount} edge-case configurations of generateOptions.`);

  // TEST 5: Position Randomness Verification (No Fixed Option Bias)
  console.log('\n>> Testing generateOptions answer position distribution (1,000 trials)...');
  const positionCounts = [0, 0, 0, 0];
  for (let i = 0; i < 1000; i++) {
    const opts = generateOptions(42, 4, false);
    const pos = opts.indexOf(42);
    positionCounts[pos]++;
  }
  console.log(`  Position distribution across 4 slots: [${positionCounts.join(', ')}]`);
  // TEST 6: Adversarial Zero-Division & String Safety in validateProblem
  console.log('\n>> Testing validateProblem on adversarial inputs...');
  const adversarialNegativeProblems: { desc: string; prob: Partial<MathProblem> }[] = [
    { desc: 'Division by zero with unicode ÷ ("10 ÷ 0 = ")', prob: { question: '10 ÷ 0 = ', answer: 0 } },
    { desc: 'Division by zero with slash / ("10 / 0 = ")', prob: { question: '10 / 0 = ', answer: 0 } },
    { desc: 'Float answer (non-integer)', prob: { question: '5 ÷ 2 = ', answer: 2.5 } },
    { desc: 'NaN answer', prob: { question: '10 - 2 = ', answer: NaN } },
    { desc: 'Question containing NaN', prob: { question: 'NaN + 5 = ', answer: 5 } },
    { desc: 'Consecutive operators "+ -"', prob: { question: '5 + -3 = ', answer: 2 } },
    { desc: 'Grade 1 negative answer', prob: { question: '2 - 5 = ', answer: -3, grade: 1 } },
    { desc: 'Grade 1 out of bounds (> 10)', prob: { question: '8 + 4 = ', answer: 12, grade: 1 } }
  ];

  for (const item of adversarialNegativeProblems) {
    totalProblems++;
    const isValid = validateProblem(item.prob as MathProblem);
    if (isValid) {
      totalErrors++;
      failureLog.push(`[ADVERSARIAL FAIL] validateProblem accepted invalid problem: ${item.desc}`);
    }
  }

  // TEST 7: generateOptions termination check for count > 4 with answer=0 and allowNegative=false
  console.log('\n>> Testing generateOptions termination invariants...');
  totalProblems++;
  const count6Hangs = (() => {
    // Check if lines 89-100 of generateOptions can terminate when optionsSet.size is odd and allowNegative is false
    // We run a bounded iteration simulation of generateOptions(0, 6, false)
    let offset = 3;
    let size = 5; // optionsSet.size after candidatePool finishes for correctAnswer=0
    let iterations = 0;
    while (size < 6 && iterations < 1000) {
      const fallbackVal = 0 + (size % 2 === 0 ? offset : -offset);
      if (fallbackVal >= 0) {
        size++;
      }
      offset++;
      iterations++;
    }
    return iterations >= 1000;
  })();
  if (count6Hangs) {
    totalErrors++;
    failureLog.push(`[ADVERSARIAL FAIL] generateOptions(0, 6, false) has infinite loop bug: optionsSet.size parity deadlock prevents positive offsets`);
  }


  // SUMMARY & VERDICT
  console.log('\n====================================================');
  console.log(`TOTAL PROBLEMS/TRIALS EXECUTED: ${totalProblems}`);
  console.log(`TOTAL ERRORS/FAILURES DETECTED: ${totalErrors}`);
  console.log('====================================================\n');

  if (totalErrors > 0) {
    console.error(`VERDICT: REQUEST_CHANGES (${totalErrors} failures detected)`);
    console.error('\nFirst 20 failure logs:');
    failureLog.slice(0, 20).forEach((f, idx) => console.error(`  ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log('VERDICT: APPROVE (100% passed, 0 failures across all invariants)');
    process.exit(0);
  }
}

runEmpiricalStressTest().catch(err => {
  console.error('Stress test harness threw unhandled exception:', err);
  process.exit(1);
});
