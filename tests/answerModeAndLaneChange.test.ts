import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameEngine } from '../src/engine/GameEngine.ts';
import { MathEngine } from '../src/math/MathEngine.ts';
import { createDefaultProfile, getDefaultMathSettingsForGrade, loadProfiles, saveProfiles } from '../src/models/Profile.ts';

// --- Headless Environment Mocks ---
class MockLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;
if (!globalThis.window) {
  (globalThis as any).window = globalThis;
}
(globalThis as any).window.localStorage = mockStorage;
if (!(globalThis.window as any).addEventListener) {
  (globalThis.window as any).addEventListener = () => {};
}
if (!(globalThis.window as any).removeEventListener) {
  (globalThis.window as any).removeEventListener = () => {};
}
if (!globalThis.cancelAnimationFrame) (globalThis as any).cancelAnimationFrame = () => {};
if (!globalThis.requestAnimationFrame) (globalThis as any).requestAnimationFrame = () => 1;

class MockAudioContext {
  state = 'running';
  sampleRate = 44100;
  currentTime = 0;
  resume() {}
  createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
  createOscillator() {
    return {
      type: 'square',
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {}, start() {}, stop() {}
    };
  }
  createGain() {
    return {
      gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
      connect() {}
    };
  }
  createBufferSource() {
    return { buffer: null, playbackRate: { value: 1 }, connect() {}, start() {}, stop() {} };
  }
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {}
    };
  }
  destination = {};
}
(globalThis as any).window.AudioContext = MockAudioContext;
(globalThis as any).AudioContext = MockAudioContext;

function createMockCanvas(): HTMLCanvasElement {
  const canvas = {
    width: 480,
    height: 640,
    getContext: () => ({
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      fillRect: () => {},
      clearRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      stroke: () => {},
      fill: () => {},
      fillText: () => {},
      measureText: () => ({ width: 40 }),
      drawImage: () => {},
      setLineDash: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width: 480,
      height: 640
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  } as unknown as HTMLCanvasElement;
  return canvas;
}

describe('Strict Lane Change Enforcement & Answer Input Modes', () => {
  describe('1. Strict Lane Change Math Enforcement', () => {
    it('Selecting or shifting lanes does NOT move the ship or playerTargetX', () => {
      const profile = createDefaultProfile('Explorer', 2, '🚀');
      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);

      engine.startStage(1, 1);
      assert.strictEqual(engine.state.playerLane, 2, 'Ship starts in center lane (lane 2)');
      assert.strictEqual(engine.state.selectedLane, 2, 'Selected lane starts in center lane (lane 2)');
      const centerTargetX = engine.state.getLaneCenterX(2);
      assert.strictEqual(engine.state.playerTargetX, centerTargetX, 'playerTargetX starts at center lane');

      // Player selects Lane 0 (Lane 1)
      engine.selectLane(0);
      assert.strictEqual(engine.state.selectedLane, 0, 'Targeted lane updates to Lane 0');
      assert.strictEqual(engine.state.playerLane, 2, 'Ship playerLane remains locked in Lane 2');
      assert.strictEqual(engine.state.playerTargetX, centerTargetX, 'playerTargetX remains locked at Lane 2');

      // Player shifts lanes using shiftLane
      engine.shiftLane(1); // moves selectedLane from 0 to 1
      assert.strictEqual(engine.state.selectedLane, 1, 'Targeted lane shifted to Lane 1');
      assert.strictEqual(engine.state.playerLane, 2, 'Ship playerLane STILL locked in Lane 2');
      assert.strictEqual(engine.state.playerTargetX, centerTargetX, 'playerTargetX STILL locked at Lane 2');

      // Player selects Lane 4
      engine.selectLane(4);
      assert.strictEqual(engine.state.selectedLane, 4, 'Targeted lane updates to Lane 4');
      assert.strictEqual(engine.state.playerLane, 2, 'Ship playerLane STILL locked in Lane 2');
      assert.strictEqual(engine.state.playerTargetX, centerTargetX, 'playerTargetX STILL locked at Lane 2');

      engine.stop();
    });

    it('Submitting an incorrect math answer retains the ship in its current lane with weapon jam', () => {
      const profile = createDefaultProfile('Explorer', 2, '🚀');
      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);

      engine.startStage(1, 1);
      const initialShipLane = engine.state.playerLane;
      const initialTargetX = engine.state.playerTargetX;

      // Target Lane 1
      engine.selectLane(1);
      const activeProb = engine.getActiveMathProblem();
      assert.ok(activeProb, 'Math problem exists for lane 1');

      // Submit wrong answer
      const wrongAnswer = activeProb.answer + 1000;
      const isSuccess = engine.submitMathAnswer(wrongAnswer);
      assert.strictEqual(isSuccess, false, 'Wrong answer must fail');
      assert.strictEqual(engine.state.playerLane, initialShipLane, 'Ship must not move on wrong answer');
      assert.strictEqual(engine.state.playerTargetX, initialTargetX, 'playerTargetX must not move on wrong answer');
      assert.strictEqual(engine.state.wrongAnswersCount, 1, 'Wrong answers count incremented');
      assert.ok(engine.state.weaponJamTimer > 0, 'Weapon jam timer activated');

      engine.stop();
    });

    it('Submitting a correct math answer unlocks and moves the ship to the targeted lane', () => {
      const profile = createDefaultProfile('Explorer', 2, '🚀');
      const canvas = createMockCanvas();
      const engine = new GameEngine(canvas, profile);

      engine.startStage(1, 1);

      // Target Lane 0
      engine.selectLane(0);
      assert.strictEqual(engine.state.selectedLane, 0);
      assert.strictEqual(engine.state.playerLane, 2);

      const activeProb = engine.getActiveMathProblem();
      assert.ok(activeProb, 'Active problem exists');

      // Submit correct answer
      const isSuccess = engine.submitMathAnswer(activeProb.answer);
      assert.strictEqual(isSuccess, true, 'Correct answer must succeed');
      assert.strictEqual(engine.state.playerLane, 0, 'Ship must immediately shift to targeted Lane 0');
      assert.strictEqual(engine.state.playerTargetX, engine.state.getLaneCenterX(0), 'playerTargetX updates to Lane 0');
      assert.strictEqual(engine.state.playerX, engine.state.getLaneCenterX(0), 'playerX aligns with Lane 0');
      assert.strictEqual(engine.state.correctAnswersCount, 1, 'Correct answer count incremented');

      // A new math problem is generated for lane 0
      const nextProb = engine.getActiveMathProblem();
      assert.ok(nextProb, 'Replacement problem generated for lane 0');

      engine.stop();
    });
  });

  describe('2. Answer Mode & 5-Options Generation', () => {
    it('MathEngine generates exactly 5 unique options with exactly 1 correct answer', () => {
      const settings = getDefaultMathSettingsForGrade(3);
      const engine = new MathEngine(settings);

      for (let i = 0; i < 50; i++) {
        const prob = engine.generateProblemForLane(i % 5);
        assert.ok(Array.isArray(prob.options), 'Options must be an array');
        assert.strictEqual(prob.options.length, 5, 'Must generate exactly 5 choices');

        // Exactly one option is correct
        const matchCount = prob.options.filter(o => o === prob.answer).length;
        assert.strictEqual(matchCount, 1, `Exactly one option must equal answer ${prob.answer}, got ${matchCount} in [${prob.options.join(', ')}]`);

        // All 5 options are unique
        const uniqueOptions = new Set(prob.options);
        assert.strictEqual(uniqueOptions.size, 5, `All 5 choices must be unique: [${prob.options.join(', ')}]`);

        // All options are integers
        prob.options.forEach(opt => {
          assert.ok(Number.isInteger(opt), `Choice ${opt} must be an integer`);
        });

        // Non-negative when allowNegative is false
        if (!settings.allowNegative) {
          prob.options.forEach(opt => {
            assert.ok(opt >= 0, `Choice ${opt} must be non-negative when allowNegative=false`);
          });
        }
      }
    });

    it('Upgrade problems also generate 5 unique options', () => {
      const settings = getDefaultMathSettingsForGrade(5);
      const engine = new MathEngine(settings);

      for (let i = 0; i < 20; i++) {
        const upgProb = engine.generateUpgradeProblem();
        assert.ok(Array.isArray(upgProb.options), 'Upgrade options must be an array');
        assert.strictEqual(upgProb.options.length, 5, 'Upgrade problem must have 5 options');
        assert.strictEqual(new Set(upgProb.options).size, 5, 'Upgrade choices must be distinct');
        assert.ok(upgProb.options.includes(upgProb.answer), 'Upgrade answer must be one of the choices');
      }
    });

    it('Profile and Settings support answerMode manual and multiple_choice', () => {
      const p1 = createDefaultProfile('Child1', 2, '🐱');
      assert.strictEqual(p1.mathSettings.answerMode, 'manual', 'Default answerMode is manual');

      p1.mathSettings.answerMode = 'multiple_choice';
      assert.strictEqual(p1.mathSettings.answerMode, 'multiple_choice');

      const g4 = getDefaultMathSettingsForGrade(4);
      assert.strictEqual(g4.answerMode, 'manual');
    });

    it('Auto-migrates legacy profiles without answerMode to manual', () => {
      // Mock localStorage for node environment
      const storage: Record<string, string> = {};
      const mockLocalStorage = {
        getItem: (k: string) => storage[k] ?? null,
        setItem: (k: string, v: string) => { storage[k] = v; },
        removeItem: (k: string) => { delete storage[k]; },
        clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
      };
      (globalThis as any).localStorage = mockLocalStorage;

      // Store a profile lacking answerMode
      const legacyProfile = {
        id: 'legacy_1',
        name: 'LegacyKid',
        gradeLevel: 2,
        avatar: '🚀',
        coins: 100,
        diamonds: 5,
        mathSettings: {
          operations: ['+'],
          minNumber: 1,
          maxNumber: 20,
          maxDigits: 2,
          allowNegative: false,
          grade: 2
        },
        stageProgress: {},
        stats: { totalSolved: 0, totalCorrect: 0, totalErrors: 0, averageTimeMs: 0, problemHistory: [] }
      };
      saveProfiles([legacyProfile as any]);

      const loaded = loadProfiles();
      assert.strictEqual(loaded.length, 1);
      assert.strictEqual(loaded[0].mathSettings.answerMode, 'manual', 'Auto-migrated to manual answerMode');
    });
  });
});
