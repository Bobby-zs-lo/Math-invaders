import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// --- Headless Browser Environment Mocks ---
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

if (!globalThis.window.addEventListener) globalThis.window.addEventListener = () => {};
if (!globalThis.window.removeEventListener) globalThis.window.removeEventListener = () => {};
if (!globalThis.cancelAnimationFrame) (globalThis as any).cancelAnimationFrame = () => {};
if (!globalThis.requestAnimationFrame) (globalThis as any).requestAnimationFrame = () => 1;

function createMockCanvas(width = 480, height = 640): HTMLCanvasElement {
  return {
    width,
    height,
    getContext: () => ({
      imageSmoothingEnabled: false,
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
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      fillText: () => {},
      strokeText: () => {},
      measureText: (text: string) => ({ width: text.length * 8 }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      setLineDash: () => {},
      shadowBlur: 0,
      shadowColor: '',
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left',
      textBaseline: 'top'
    }),
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => {}
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  } as unknown as HTMLCanvasElement;
}

import {
  createNewProfile,
  getDefaultMathSettingsForGrade,
  loadProfiles,
  saveProfiles
} from '../src/models/Profile.ts';
import type { PlayerProfile } from '../src/models/Profile.ts';
import { GameState } from '../src/models/GameState.ts';
import { GameEngine } from '../src/engine/GameEngine.ts';

describe('Adult Descent Speed Slider & Monster Life Rebalance', () => {
  let profile: PlayerProfile;
  let engine: GameEngine;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    mockStorage.clear();
    profile = createNewProfile('TestKid', '🚀', 2);
    canvas = createMockCanvas();
    engine = new GameEngine(canvas, profile);
  });

  describe('1. Profile & GameState Descent Speed Multiplier Defaults & Migration', () => {
    it('getDefaultMathSettingsForGrade sets descentSpeedMultiplier to 1.0 by default', () => {
      const s1 = getDefaultMathSettingsForGrade(1);
      assert.strictEqual(s1.descentSpeedMultiplier, 1.0);
      const s5 = getDefaultMathSettingsForGrade(5);
      assert.strictEqual(s5.descentSpeedMultiplier, 1.0);
      const s10 = getDefaultMathSettingsForGrade(10);
      assert.strictEqual(s10.descentSpeedMultiplier, 1.0);
    });

    it('GameState class initializes descentSpeedMultiplier to 1.0', () => {
      const state = new GameState();
      assert.strictEqual(state.descentSpeedMultiplier, 1.0);
    });

    it('loadProfiles auto-migrates legacy profiles missing descentSpeedMultiplier to 1.0', () => {
      const legacyProfile: any = {
        id: 'legacy_1',
        name: 'LegacyPlayer',
        avatar: '👾',
        gradeLevel: 3,
        mathSettings: {
          operations: ['+', '-'],
          minNumber: 1,
          maxNumber: 50,
          maxDigits: 2,
          allowNegative: false,
          grade: 3,
          answerMode: 'manual'
          // descentSpeedMultiplier missing!
        },
        coins: 10,
        diamonds: 2,
        currentSector: 1,
        currentStage: 1,
        stageProgress: {},
        equippedShipId: 'tier1_starter',
        unlockedShips: ['tier1_starter'],
        equippedTrailId: 'default',
        unlockedTrails: ['default']
      };
      saveProfiles([legacyProfile]);

      const loaded = loadProfiles();
      assert.strictEqual(loaded.length, 1);
      assert.strictEqual(loaded[0].mathSettings.descentSpeedMultiplier, 1.0, 'Legacy profile must be auto-migrated with descentSpeedMultiplier = 1.0');
    });
  });

  describe('2. In-Game Adult Descent Speed Multiplier Engine Integration', () => {
    it('setDescentSpeedMultiplier updates GameState, clamps bounds, and persists to profile', () => {
      engine.startStage(1, 1);
      assert.strictEqual(engine.getDescentSpeedMultiplier(), 1.0);

      // Change speed to 0.4x (Slow)
      engine.setDescentSpeedMultiplier(0.4);
      assert.strictEqual(engine.getDescentSpeedMultiplier(), 0.4);
      assert.strictEqual(engine.state.descentSpeedMultiplier, 0.4);
      assert.strictEqual(profile.mathSettings.descentSpeedMultiplier, 0.4);

      // Change speed to 1.5x (Fast)
      engine.setDescentSpeedMultiplier(1.5);
      assert.strictEqual(engine.getDescentSpeedMultiplier(), 1.5);
      assert.strictEqual(engine.state.descentSpeedMultiplier, 1.5);
      assert.strictEqual(profile.mathSettings.descentSpeedMultiplier, 1.5);

      // Clamping extreme values
      engine.setDescentSpeedMultiplier(0.01);
      assert.ok(engine.getDescentSpeedMultiplier() >= 0.1, 'Must clamp low values to safe threshold');

      engine.setDescentSpeedMultiplier(99.0);
      assert.ok(engine.getDescentSpeedMultiplier() <= 3.0, 'Must clamp excessive high values to safe threshold');
    });

    it('startStage maintains the adult descent speed setting from the profile', () => {
      profile.mathSettings.descentSpeedMultiplier = 0.5;
      engine.startStage(1, 2);
      assert.strictEqual(engine.state.descentSpeedMultiplier, 0.5, 'Stage must start with profile descentSpeedMultiplier');
    });

    it('marchTimer advances proportionally to descentSpeedMultiplier', () => {
      engine.startStage(1, 1);

      // Set to 0.5x speed
      engine.setDescentSpeedMultiplier(0.5);
      engine.state.marchTimer = 0;
      (engine as any).update(0.2); // dt = 0.2
      // marchTimer should advance by 0.2 * 0.5 = 0.1
      assert.ok(Math.abs(engine.state.marchTimer - 0.1) < 0.001, `marchTimer expected ~0.1, got ${engine.state.marchTimer}`);

      // Set to 2.0x speed
      engine.setDescentSpeedMultiplier(2.0);
      engine.state.marchTimer = 0;
      (engine as any).update(0.2); // dt = 0.2
      // marchTimer should advance by 0.2 * 2.0 = 0.4
      assert.ok(Math.abs(engine.state.marchTimer - 0.4) < 0.001, `marchTimer expected ~0.4, got ${engine.state.marchTimer}`);
    });
  });

  describe('3. Monster Life Rebalance: Eliminating 1-Hit Kills with Lowest Weapon', () => {
    it('Sector 1 Scout has 6 HP and survives lowest weapon hit', () => {
      engine.startStage(1, 1);
      const scout = engine.state.aliens.find(a => a.type === 'scout');
      assert.ok(scout, 'Must spawn scouts in Sector 1');
      assert.strictEqual(scout.hp, 6, 'Scout base HP must be 6 in Sector 1');
      assert.strictEqual(scout.maxHp, 6);

      // Lowest Tier 1 weapon continuous shot (1 damage)
      (engine as any).spawnBullet(scout.x, scout.y, 0, -400, 'laser', 1, scout.lane, 0, '#00ff66');
      (engine as any).update(0.016);

      assert.strictEqual(scout.hp, 5, 'Scout must have 5 HP remaining after 1 hit (not dead!)');
      assert.ok(engine.state.aliens.includes(scout), 'Scout must remain alive in arena');
    });

    it('Tier 1 Amplified Salvo (Math Correct) does 3 total damage and leaves 6 HP Scout alive', () => {
      engine.startStage(1, 1);
      const scout = engine.state.aliens.find(a => a.type === 'scout');
      assert.ok(scout);
      assert.strictEqual(scout.hp, 6);

      // Answer lane math problem correctly at Tier 1
      engine.state.inStageUpgradeTier = 1;
      const prob = engine.state.laneProblems[scout.lane];
      assert.ok(prob);
      engine.selectLane(scout.lane);
      const answered = engine.submitMathAnswer(prob.answer);
      assert.strictEqual(answered, true);

      // Salvo spawned 3 bullets with damage 1 each (3 damage total)
      const salvoBullets = engine.state.bullets.filter(b => b.lane === scout.lane);
      assert.strictEqual(salvoBullets.length, 3, 'Tier 1 salvo must spawn 3 bullets');
      salvoBullets.forEach(b => assert.strictEqual(b.damage, 1, 'Each Tier 1 salvo bullet must do 1 damage'));

      // Move bullets onto scout to deliver all 3 hits
      for (const b of salvoBullets) {
        b.x = scout.x;
        b.y = scout.y;
      }
      (engine as any).update(0.016);

      // Scout took 3 damage, survives with 3 HP!
      assert.strictEqual(scout.hp, 3, 'Scout must have 3 HP remaining after Tier 1 salvo (never 1-shot killed!)');
      assert.ok(engine.state.aliens.includes(scout), 'Scout must not be killed in one salvo by lowest weapon');
    });

    it('Crabs spawn with 6 HP across sectors, and Minion Drones spawn with 4 HP', () => {
      // Sector 2 Stage 2 (Crabs)
      engine.startStage(2, 2);
      const crab = engine.state.aliens.find(a => a.type === 'crab');
      assert.ok(crab, 'Crab must spawn in Sector 2 Stage 2');
      assert.strictEqual(crab.hp, 6, 'Crab base HP must be 6');

      // Sector 5 Stage 5 (Minions spawn during Dreadnought phase 2)
      engine.startStage(5, 5);
      const boss = engine.state.aliens.find(a => a.type === 'boss');
      assert.ok(boss);
      (engine as any).spawnMinionDrones(boss);
      const minion = engine.state.aliens.find(a => a.type === 'minion_drone');
      assert.ok(minion, 'Minion drone must spawn');
      assert.strictEqual(minion.hp, 4, 'Minion drone HP must be 4');

      // Tier 1 shot on minion
      minion.oscillationAmp = 0;
      (engine as any).spawnBullet(minion.x, minion.y, 0, 0, 'laser', 1, minion.lane, 0, '#00ff66');
      (engine as any).update(0.016);
      assert.strictEqual(minion.hp, 3, 'Minion survives with 3 HP (not a 1-hit kill)');
      assert.ok(engine.state.aliens.includes(minion));
    });
  });
});
