import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// --- In-Memory Browser Mocks for Headless Node Environment ---

class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

// Mock window and performance
if (!globalThis.window) {
  (globalThis as any).window = globalThis;
}
(globalThis as any).window.localStorage = mockStorage;

let lastAlertMessage: string | null = null;
(globalThis as any).window.alert = (msg: string) => {
  lastAlertMessage = msg;
};

// Mock AudioContext for headless test execution
class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  currentTime = 0;
  resume() {}
  createBuffer() {
    return { getChannelData: () => new Float32Array(100) };
  }
  createOscillator() {
    return {
      type: 'square',
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {}
      },
      connect: () => {}
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      playbackRate: { value: 1 },
      connect: () => {},
      start: () => {},
      stop: () => {}
    };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { setValueAtTime: () => {} },
      connect: () => {}
    };
  }
  destination = {};
}
(globalThis as any).window.AudioContext = MockAudioContext;
(globalThis as any).AudioContext = MockAudioContext;

// Window.open mock tracking
let lastOpenedWindow: {
  url: string;
  target: string;
  features: string;
  document: {
    content: string;
    open: () => void;
    write: (html: string) => void;
    close: () => void;
  };
} | null = null;

let popupBlocked = false;

(globalThis as any).window.open = (url: string, target: string, features: string) => {
  if (popupBlocked) return null;
  lastOpenedWindow = {
    url,
    target,
    features,
    document: {
      content: '',
      open() { this.content = ''; },
      write(html: string) { this.content += html; },
      close() {}
    }
  };
  return lastOpenedWindow;
};

if (!globalThis.window.addEventListener) {
  (globalThis as any).window.addEventListener = () => {};
}
if (!globalThis.window.removeEventListener) {
  (globalThis as any).window.removeEventListener = () => {};
}
if (!globalThis.cancelAnimationFrame) {
  (globalThis as any).cancelAnimationFrame = () => {};
}
if (!globalThis.requestAnimationFrame) {
  (globalThis as any).requestAnimationFrame = () => 1;
}

// Mock Canvas & 2D Context
function createMockCanvas(): HTMLCanvasElement {
  const listeners: Record<string, Function[]> = {};
  return {
    width: 800,
    height: 600,
    getContext: () => ({
      imageSmoothingEnabled: false,
      save: () => {},
      restore: () => {},
      clearRect: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 50 }),
      drawImage: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600
    }),
    addEventListener: (type: string, fn: Function) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(fn);
    },
    removeEventListener: () => {}
  } as unknown as HTMLCanvasElement;
}

// Mock DOM Container for Modals
class MockHTMLElement {
  public innerHTML: string = '';
  private listeners: Record<string, Function[]> = {};

  querySelector(sel: string): any {
    return {
      addEventListener: (type: string, fn: Function) => {
        if (!this.listeners[sel + ':' + type]) this.listeners[sel + ':' + type] = [];
        this.listeners[sel + ':' + type].push(fn);
      },
      click: () => {
        const fns = this.listeners[sel + ':click'] || [];
        fns.forEach(fn => fn());
      }
    };
  }

  querySelectorAll(): any[] {
    return [];
  }
}

// Dynamic imports after global mocks are installed in memory
let createNewProfile: any;
let getDefaultMathSettingsForGrade: any;
let loadProfiles: any;
let saveProfiles: any;
let setActiveProfile: any;
let updateActiveProfile: any;
let GameEngine: any;
let ParentReportModal: any;
let MathEngine: any;

beforeEach(async () => {
  mockStorage.clear();
  lastAlertMessage = null;
  lastOpenedWindow = null;
  popupBlocked = false;
});

describe('Adversarial Test Suite: Parent Analytics, Telemetry & Input Handling', async () => {
  const profileMod = await import('../src/models/Profile.ts');
  createNewProfile = profileMod.createNewProfile;
  getDefaultMathSettingsForGrade = profileMod.getDefaultMathSettingsForGrade;
  loadProfiles = profileMod.loadProfiles;
  saveProfiles = profileMod.saveProfiles;
  setActiveProfile = profileMod.setActiveProfile;
  updateActiveProfile = profileMod.updateActiveProfile;

  const engineMod = await import('../src/engine/GameEngine.ts');
  GameEngine = engineMod.GameEngine;

  const modalMod = await import('../src/ui/ParentReportModal.ts');
  ParentReportModal = modalMod.ParentReportModal;

  const mathMod = await import('../src/math/MathEngine.ts');
  MathEngine = mathMod.MathEngine;


  describe('1. Telemetry Bounds & Cumulative Analytics (500 Problem Submissions)', () => {

    it('Correctly bounds problemHistory at 300 while accumulating all 500 in lifetime stats', () => {
      const profile = createNewProfile('Astronaut Zoe', '👩‍🚀', 6);
      saveProfiles([profile]);
      setActiveProfile(profile.id);

      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);

      // Verify initial state
      assert.equal(profile.stats.totalSolved, 0);
      assert.equal(profile.stats.totalCorrect, 0);
      assert.equal(profile.stats.totalErrors, 0);
      assert.equal(profile.stats.averageTimeMs, 0);
      assert.equal(profile.stats.problemHistory.length, 0);

      // Simulate 500 problem submissions directly through the engine's telemetry recording
      const TOTAL_SUBMISSIONS = 500;
      let expectedCorrect = 0;
      let expectedErrors = 0;
      let runningAvg = 0;

      // Access private recordProblemTelemetry method for adversarial stress testing
      const recordMethod = (engine as any).recordProblemTelemetry.bind(engine);

      for (let i = 1; i <= TOTAL_SUBMISSIONS; i++) {
        // Every 3rd submission is incorrect (e.g. accuracy ~67%)
        const isCorrect = i % 3 !== 0;
        if (isCorrect) expectedCorrect++;
        else expectedErrors++;

        const responseTime = 1000 + (i % 20) * 100; // 1000ms - 2900ms
        const question = `${i} + 5 = ?`;
        const op = i % 2 === 0 ? '+' : '-';

        recordMethod(
          question,
          isCorrect ? i + 5 : -999,
          i + 5,
          isCorrect,
          responseTime,
          op
        );

        // Calculate expected weighted moving average
        runningAvg = i === 1
          ? responseTime
          : Math.round((runningAvg * (i - 1) + responseTime) / i);

        // Check incremental capping properties
        if (i <= 300) {
          assert.equal(profile.stats.problemHistory.length, i, `History should grow to ${i} at step ${i}`);
        } else {
          assert.equal(profile.stats.problemHistory.length, 300, `History MUST be capped at 300 after step 300 (step ${i})`);
        }
      }

      // --- Invariant Checks on Finished 500 Submissions ---

      // 1. Lifetime counters must reflect ALL 500 submissions
      assert.equal(profile.stats.totalSolved, 500, 'totalSolved must equal 500');
      assert.equal(profile.stats.totalCorrect, expectedCorrect, `totalCorrect must equal ${expectedCorrect}`);
      assert.equal(profile.stats.totalErrors, expectedErrors, `totalErrors must equal ${expectedErrors}`);
      assert.equal(profile.stats.totalCorrect + profile.stats.totalErrors, 500, 'Correct + Errors must sum to 500');

      // 2. Problem history must strictly contain 300 entries
      assert.equal(profile.stats.problemHistory.length, 300, 'problemHistory length must be exactly 300');

      // 3. FIFO Truncation check:
      // Oldest entry should be submission #201 (index 0 of history)
      const oldestKept = profile.stats.problemHistory[0];
      assert.equal(oldestKept.question, '201 + 5 = ?', 'Oldest entry in history should be submission #201');

      // Newest entry should be submission #500 (index 299 of history)
      const newestKept = profile.stats.problemHistory[299];
      assert.equal(newestKept.question, '500 + 5 = ?', 'Newest entry in history should be submission #500');

      // Submissions 1 through 200 must NOT be in history
      const hasSubmission1 = profile.stats.problemHistory.some(p => p.question === '1 + 5 = ?');
      const hasSubmission200 = profile.stats.problemHistory.some(p => p.question === '200 + 5 = ?');
      assert.equal(hasSubmission1, false, 'Submission #1 must have been purged from history');
      assert.equal(hasSubmission200, false, 'Submission #200 must have been purged from history');

      // 4. Cumulative average time
      assert.equal(profile.stats.averageTimeMs, runningAvg, `averageTimeMs must match cumulative weighted average of all 500 submissions`);

      // 5. Persistence: Verify saved profile in localStorage reloads correctly
      const loaded = loadProfiles().find(p => p.id === profile.id);
      assert.ok(loaded, 'Profile must exist in localStorage');
      assert.equal(loaded.stats.totalSolved, 500);
      assert.equal(loaded.stats.problemHistory.length, 300);
      assert.equal(loaded.stats.totalCorrect, expectedCorrect);
    });

    it('Parent Analytics UI accurately displays lifetime stats alongside bounded history', () => {
      const profile = createNewProfile('Commander Alex', '🚀', 7);
      profile.stats = {
        totalSolved: 500,
        totalCorrect: 350,
        totalErrors: 150,
        averageTimeMs: 2400,
        problemHistory: []
      };

      // Populate 300 history records with 20 errors
      for (let i = 1; i <= 300; i++) {
        const isErr = i % 15 === 0; // 20 errors
        profile.stats.problemHistory.push({
          timestamp: Date.now() - (300 - i) * 1000,
          question: `Problem ${i}`,
          userAnswer: isErr ? 999 : i,
          correctAnswer: i,
          isCorrect: !isErr,
          timeTakenMs: 2400,
          operation: i % 2 === 0 ? '+' : 'x'
        });
      }

      const container = new MockHTMLElement() as unknown as HTMLElement;
      const modal = new ParentReportModal(container, profile);
      modal.show();

      // Verify HTML contents generated in modal
      const html = container.innerHTML;

      // KPI checks:
      // Problems solved should show lifetime 500
      assert.ok(html.includes('>500<'), 'Modal must display total solved of 500');
      // Accuracy should show 70% (350 / 500)
      assert.ok(html.includes('70%'), 'Modal must display 70% accuracy');
      // Average response should show 2.4s (2400ms / 1000)
      assert.ok(html.includes('2.4s'), 'Modal must display 2.4s average response');

      // Recent trouble spots should cap at 10 items even though there are 20 errors in history
      assert.ok(html.includes('RECENT TROUBLE SPOTS (10)'), 'Recent trouble spots must be capped at 10');
    });

    it('Handles edge cases of 0 submissions, 1 submission, and uninitialized stats gracefully', () => {
      const profile = createNewProfile('Newbie', '🌱', 1);
      (profile as any).stats = undefined; // Corrupted / legacy profile

      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);

      // Record first problem on corrupted stats profile
      (engine as any).recordProblemTelemetry('2 + 3 = ?', 5, 5, true, 1200, '+');

      assert.ok(profile.stats, 'Stats should be auto-initialized');
      assert.equal(profile.stats.totalSolved, 1);
      assert.equal(profile.stats.totalCorrect, 1);
      assert.equal(profile.stats.totalErrors, 0);
      assert.equal(profile.stats.averageTimeMs, 1200);
      assert.equal(profile.stats.problemHistory.length, 1);

      // Test display on fresh profile
      const emptyProfile = createNewProfile('Fresh', '✨', 2);
      const container = new MockHTMLElement() as unknown as HTMLElement;
      const modal = new ParentReportModal(container, emptyProfile);
      modal.show();

      assert.ok(container.innerHTML.includes('>0<'), 'Displays 0 solved');
      assert.ok(container.innerHTML.includes('--'), 'Displays -- accuracy');
      assert.ok(container.innerHTML.includes('No problems answered yet'), 'Displays friendly empty notice');
    });
  });

  describe('2. Negative Input Typing & State Stability', () => {

    it('Toggling negative input functions as an exact invertible state machine', () => {
      // Simulate the toggleMathNegative state machine logic from main.ts
      function simulateToggle(input: string): string {
        if (input === '') return '-';
        if (input === '-') return '';
        if (input.startsWith('-')) return input.slice(1);
        if (input.length < 6) return '-' + input;
        return input;
      }

      // Empty string transitions
      assert.equal(simulateToggle(''), '-');
      assert.equal(simulateToggle('-'), '');

      // Positive numbers to negative
      assert.equal(simulateToggle('5'), '-5');
      assert.equal(simulateToggle('42'), '-42');
      assert.equal(simulateToggle('100'), '-100');

      // Negative numbers to positive
      assert.equal(simulateToggle('-5'), '5');
      assert.equal(simulateToggle('-42'), '42');
      assert.equal(simulateToggle('-100'), '100');

      // Negative zero
      assert.equal(simulateToggle('0'), '-0');
      assert.equal(simulateToggle('-0'), '0');

      // Rapid toggling sequence
      let val = '';
      for (let i = 0; i < 10; i++) {
        val = simulateToggle(val);
      }
      assert.equal(val, '', '10 toggles from empty must return to empty');

      // Length boundary: 6 characters maximum
      assert.equal(simulateToggle('123456'), '123456', 'Cannot prepend "-" if string is already 6 chars');
      assert.equal(simulateToggle('-12345'), '12345', 'Can strip "-" even if 6 chars');
    });

    it('Submitting empty string or lone "-" cleanly returns without corrupting game state', () => {
      const profile = createNewProfile('Ace Pilot', '🚀', 6);
      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);

      engine.startStage(1, 1);

      const initialTotalQuestions = engine.state.totalQuestionsAnswered;
      const initialScore = engine.state.score;
      const initialLives = engine.state.lives;
      const initialErrors = profile.stats?.totalErrors || 0;

      // Simulate submit logic from main.ts
      function simulateSubmit(input: string, eng: GameEngine): boolean | null {
        if (!input || input === '-' || !eng) return null;
        const val = parseInt(input, 10);
        if (isNaN(val)) return null;
        return eng.submitMathAnswer(val);
      }

      // 1. Submit empty string ""
      const resEmpty = simulateSubmit('', engine);
      assert.equal(resEmpty, null, 'Empty string must return null without calling engine');
      assert.equal(engine.state.totalQuestionsAnswered, initialTotalQuestions);
      assert.equal(engine.state.score, initialScore);
      assert.equal(engine.state.lives, initialLives);

      // 2. Submit lone "-"
      const resMinus = simulateSubmit('-', engine);
      assert.equal(resMinus, null, 'Lone "-" must return null without calling engine');
      assert.equal(engine.state.totalQuestionsAnswered, initialTotalQuestions);
      assert.equal(engine.state.score, initialScore);

      // 3. Submit multiple minus signs "--", "---"
      const resDoubleMinus = simulateSubmit('--', engine);
      assert.equal(resDoubleMinus, null, '"--" must return null (parseInt returns NaN)');
      const resTripleMinus = simulateSubmit('---', engine);
      assert.equal(resTripleMinus, null, '"---" must return null');

      // 4. Submit malformed string "- "
      const resMalformed = simulateSubmit('- ', engine);
      assert.equal(resMalformed, null, '"- " must return null');

      // Verify profile telemetry untouched by all rejected submissions
      assert.equal(profile.stats.totalErrors, initialErrors);
      assert.equal(profile.stats.totalSolved, 0);
    });

    it('Submitting "-0" evaluates to integer 0 safely without crashes or NaN', () => {
      const profile = createNewProfile('Math Specialist', '🧠', 6);
      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);
      engine.startStage(1, 1);

      // Manually set an active problem with answer 0
      engine.state.laneProblems[engine.state.selectedLane] = {
        id: 'test_zero',
        question: '5 - 5 = ?',
        answer: 0,
        grade: 6,
        operation: '-',
        options: [0, 1, -1, 5],
        startTime: performance.now()
      };

      const parsedVal = parseInt('-0', 10);
      assert.ok(parsedVal === 0, 'parseInt("-0") evaluates to integer 0');

      // Submitting 0 for answer 0 should succeed
      const isCorrect = engine.submitMathAnswer(parsedVal);
      assert.equal(isCorrect, true, 'Submitting -0 (as 0) must correctly solve equation with answer 0');
      assert.equal(profile.stats.totalCorrect, 1);
      assert.ok(profile.stats.problemHistory[0].userAnswer === 0, 'userAnswer should match 0');

      // Now set problem with answer 8, submit -0, should fail cleanly without crash
      engine.state.laneProblems[engine.state.selectedLane] = {
        id: 'test_nonzero',
        question: '4 + 4 = ?',
        answer: 8,
        grade: 6,
        operation: '+',
        options: [8, 6, 10, 0],
        startTime: performance.now()
      };

      const isWrong = engine.submitMathAnswer(parsedVal);
      assert.equal(isWrong, false, 'Submitting -0 for answer 8 must register as incorrect');
      assert.equal(profile.stats.totalErrors, 1);
      assert.equal(engine.state.weaponJamTimer, 1.2, 'Weapon jam timer should activate on wrong answer');
    });

    it('Submitting genuine negative integers correctly resolves negative equations', () => {
      const profile = createNewProfile('Algebra Pilot', '🚀', 7);
      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);
      engine.startStage(1, 1);

      // Problem with negative solution: 3 - 10 = -7
      engine.state.laneProblems[engine.state.selectedLane] = {
        id: 'neg_prob',
        question: '3 - 10 = ?',
        answer: -7,
        grade: 7,
        operation: '-',
        options: [-7, 7, -13, 13],
        startTime: performance.now()
      };

      const result = engine.submitMathAnswer(-7);
      assert.equal(result, true, 'Answer -7 must be accepted as correct');
      assert.equal(profile.stats.totalCorrect, 1);
      assert.equal(profile.stats.problemHistory[0].userAnswer, -7);
      assert.equal(profile.stats.problemHistory[0].isCorrect, true);
    });

    it('Upgrade drawer negative answer submission handles edge cases seamlessly', () => {
      const profile = createNewProfile('Engineer', '🛠️', 6);
      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);
      engine.startStage(1, 1);

      // Set upgrade problem with answer -12
      (engine as any).activeUpgradeProblem = {
        id: 'upg_neg',
        question: '-6 × 2 = ?',
        answer: -12,
        grade: 6,
        operation: '*',
        startTime: performance.now()
      };

      // 1. Submit wrong answer
      const wrongRes = engine.submitUpgradeAnswer(12);
      assert.equal(wrongRes.success, false, 'Positive 12 for answer -12 must fail');

      // 2. Submit correct negative answer
      const correctRes = engine.submitUpgradeAnswer(-12);
      assert.equal(correctRes.success, true, 'Negative -12 must succeed');

      // 3. Telemetry should record both upgrade problems
      assert.equal(profile.stats.totalSolved, 2);
      const lastRecorded = profile.stats.problemHistory.at(-1);
      assert.equal(lastRecorded?.operation, '*');
      assert.equal(lastRecorded?.userAnswer, -12);
      assert.equal(lastRecorded?.isCorrect, true);
    });
  });

  describe('3. Printable Worksheet Generation (generatePrintableWorksheet())', () => {

    it('Generates well-formed HTML practice sheet with trouble spots and answer key', () => {
      const profile = createNewProfile('Luna Star', '👩‍🚀', 4);
      const container = new MockHTMLElement() as unknown as HTMLElement;
      const reportModal = new ParentReportModal(container, profile);

      const missedProblems = [
        { question: '7 × 8 = ?', userAnswer: 54, correctAnswer: 56, operation: '*' },
        { question: '9 × 6 = ?', userAnswer: 52, correctAnswer: 54, operation: '*' },
        { question: '100 - 37 = ?', userAnswer: 73, correctAnswer: 63, operation: '-' }
      ];

      reportModal.generatePrintableWorksheet(missedProblems);

      assert.ok(lastOpenedWindow, 'window.open must have been called');
      assert.equal(lastOpenedWindow.target, '_blank');

      const html = lastOpenedWindow.document.content;

      // 1. Structural HTML Verification
      assert.ok(html.includes('<!DOCTYPE html>'), 'Must start with <!DOCTYPE html>');
      assert.ok(html.includes('<html>') && html.includes('</html>'), 'Must contain <html> tags');
      assert.ok(html.includes('<head>') && html.includes('</head>'), 'Must contain <head> tags');
      assert.ok(html.includes('<body>') && html.includes('</body>'), 'Must contain <body> tags');

      // 2. Title & Metadata
      assert.ok(html.includes('Luna Star'), 'Must include student pilot name');
      assert.ok(html.includes('Grade 4'), 'Must include curriculum grade');
      assert.ok(html.includes('Print Worksheet'), 'Must include print button');
      assert.ok(html.includes('window.print()'), 'Must include window.print() handler');

      // 3. Part 1: Trouble Spots Review
      assert.ok(html.includes('Part 1: Trouble Spots Review'), 'Must render Part 1 header');
      assert.ok(html.includes('7 × 8 = ?'), 'Must render missed question 1');
      assert.ok(html.includes('9 × 6 = ?'), 'Must render missed question 2');
      assert.ok(html.includes('100 - 37 = ?'), 'Must render missed question 3');
      assert.ok(html.includes('class="answer-box"'), 'Must render blank answer boxes for student writing');

      // 4. Part 2: Curriculum Drills
      assert.ok(html.includes('Part 2: Grade 4 Curriculum Practice Drills'), 'Must render Part 2 header');
      // Must contain 10 bonus curriculum drills (total 3 + 10 = 13 problems)
      assert.ok(html.includes('#13.'), 'Must number up to #13 for 3 missed + 10 bonus drills');

      // 5. Parent Answer Key
      assert.ok(html.includes('Parent Answer Key'), 'Must render Parent Answer Key');
      assert.ok(html.includes('#1: 56'), 'Answer key must contain answer 56 for problem #1');
      assert.ok(html.includes('#2: 54'), 'Answer key must contain answer 54 for problem #2');
      assert.ok(html.includes('#3: 63'), 'Answer key must contain answer 63 for problem #3');

      // 6. Hygiene: Zero NaN, undefined, or [object Object]
      assert.equal(html.includes('NaN'), false, 'HTML must not contain NaN');
      assert.equal(html.includes('undefined'), false, 'HTML must not contain undefined');
      assert.equal(html.includes('[object Object]'), false, 'HTML must not contain [object Object]');
    });

    it('Generates flawless worksheet when student has 0 missed problems', () => {
      const profile = createNewProfile('Perfect Ace', '🏆', 3);
      const container = new MockHTMLElement() as unknown as HTMLElement;
      const reportModal = new ParentReportModal(container, profile);

      // Flawless student: empty missed problems
      reportModal.generatePrintableWorksheet([]);

      assert.ok(lastOpenedWindow);
      const html = lastOpenedWindow.document.content;

      // Part 1 should NOT be rendered
      assert.equal(html.includes('Part 1: Trouble Spots Review'), false, 'Part 1 should not appear when 0 errors');

      // Part 2 should be rendered with 10 drills (#1 to #10)
      assert.ok(html.includes('Part 2: Grade 3 Curriculum Practice Drills'));
      assert.ok(html.includes('#1.'));
      assert.ok(html.includes('#10.'));

      // Answer key should only have drills #1 to #10
      assert.ok(html.includes('Parent Answer Key'));
      assert.ok(html.includes('#1:'));
      assert.ok(html.includes('#10:'));
    });

    it('Generates worksheet accurately for Grade 7+ pre-algebra with negative answers', () => {
      const profile = createNewProfile('Pre-Algebra Star', '⭐', 7);
      const container = new MockHTMLElement() as unknown as HTMLElement;
      const reportModal = new ParentReportModal(container, profile);

      const missedAlgebra = [
        { question: '2x + 10 = 4, x = ?', userAnswer: 3, correctAnswer: -3, operation: 'x' },
        { question: '-5 - 8 = ?', userAnswer: 13, correctAnswer: -13, operation: '-' }
      ];

      reportModal.generatePrintableWorksheet(missedAlgebra);

      assert.ok(lastOpenedWindow);
      const html = lastOpenedWindow.document.content;

      assert.ok(html.includes('2x + 10 = 4, x = ?'));
      assert.ok(html.includes('-5 - 8 = ?'));
      assert.ok(html.includes('#1: -3'), 'Answer key must contain negative solution -3');
      assert.ok(html.includes('#2: -13'), 'Answer key must contain negative solution -13');
    });

    it('Gracefully alerts and recovers when browser popup blocker intercepts window.open', () => {
      popupBlocked = true;
      const profile = createNewProfile('Blocked Pilot', '🛑', 5);
      const container = new MockHTMLElement() as unknown as HTMLElement;
      const reportModal = new ParentReportModal(container, profile);

      // Should not throw exception
      assert.doesNotThrow(() => {
        reportModal.generatePrintableWorksheet([{ question: '5 + 5 = ?', correctAnswer: 10 }]);
      });

      assert.equal(lastOpenedWindow, null, 'No window opened when blocked');
      assert.ok(lastAlertMessage, 'Must alert user');
      assert.ok(lastAlertMessage?.includes('Please allow popups'), 'Alert informs user about popups');
    });
  });
});
