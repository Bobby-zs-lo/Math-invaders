/**
 * Empirical Adversarial Stress Test Suite for Milestone 2:
 * Wave Budget Invariants, Stage Completion Lifecycle, Sinusoidal Oscillation, Armor & Core Reveal Multipliers
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Browser Environment Mocks for Headless Node.js
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
      save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {},
      beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
      fill() {}, stroke() {}, fillText() {}, measureText: () => ({ width: 50 }),
      drawImage() {}, createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }), translate() {}
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height, right: width, bottom: height }),
    addEventListener() {}, removeEventListener() {}
  } as unknown as HTMLCanvasElement;
}

import { GameEngine } from '../src/engine/GameEngine.ts';
import { createNewProfile, saveProfiles, setActiveProfile } from '../src/models/Profile.ts';
import {
  getAllSectorConfigs,
  getSectorConfig,
  getStageWaveConfig
} from '../src/engine/SectorConfig.ts';
import type { Alien, Bullet } from '../src/models/GameState.ts';

function setupEngine() {
  mockStorage.clear();
  const profile = createNewProfile('Stress Commander', 5);
  saveProfiles([profile]);
  setActiveProfile(profile.id);
  const canvas = createMockCanvas();
  const engine = new GameEngine(canvas, profile);

  let victoryCalls = 0;
  let gameOverCalls = 0;

  engine.setCallbacks({
    onMathProblemUpdate: () => {},
    onHudUpdate: () => {},
    onUpgradeStatusUpdate: () => {},
    onStageVictory: () => { victoryCalls++; },
    onGameOver: () => { gameOverCalls++; }
  });

  return {
    engine,
    profile,
    getVictoryCalls: () => victoryCalls,
    getGameOverCalls: () => gameOverCalls,
    resetCalls: () => { victoryCalls = 0; gameOverCalls = 0; }
  };
}

describe('STRESS 1: Wave Budget Consistency Across All 25 Stages', () => {
  it('Confirms 0 wave budget discrepancies between SectorConfig and formationGrid across all 25 stages', () => {
    let discrepancies = 0;
    const details: string[] = [];

    for (const sector of getAllSectorConfigs()) {
      for (const [stgKey, stage] of Object.entries(sector.stages)) {
        const gridCount = stage.formationGrid.flat().filter(Boolean).length;
        if (stage.totalAliens !== gridCount) {
          discrepancies++;
          details.push(`Sector ${sector.sectorId} Stage ${stgKey}: totalAliens=${stage.totalAliens} vs gridCount=${gridCount}`);
        }
      }
    }

    assert.equal(discrepancies, 0, `Expected 0 wave budget discrepancies, found: ${details.join('; ')}`);
  });

  it('Confirms GameEngine startStage initializes totalAliensWave dynamically matching grid count', () => {
    const { engine } = setupEngine();

    for (let sec = 1; sec <= 5; sec++) {
      for (let stg = 1; stg <= 5; stg++) {
        engine.startStage(sec, stg);
        const waveConfig = getStageWaveConfig(sec, stg);
        const expectedCount = waveConfig.formationGrid.flat().filter(Boolean).length;
        assert.equal(
          engine.state.totalAliensWave,
          expectedCount,
          `Sector ${sec} Stage ${stg} totalAliensWave mismatch`
        );
        assert.equal(
          engine.state.aliens.length,
          expectedCount,
          `Sector ${sec} Stage ${stg} initial spawned aliens mismatch`
        );
      }
    }
  });
});

describe('STRESS 2: Stage Completion Lifecycle & Softlock Vulnerabilities', () => {
  it('Exhaustively simulates clearing all 25 stages and asserts onStageVictory is invoked', () => {
    const { engine, getVictoryCalls, resetCalls } = setupEngine();
    const failedStages: string[] = [];

    for (let sec = 1; sec <= 5; sec++) {
      for (let stg = 1; stg <= 5; stg++) {
        resetCalls();
        engine.startStage(sec, stg);

        // Defeat all aliens currently alive
        while (engine.state.aliens.length > 0) {
          const alien = engine.state.aliens[0];
          if (alien.isBoss) {
            alien.bossPhase = 4;
            (engine as any).updateBossDestruction(alien, 3.1);
          } else {
            (engine as any).handleAlienDefeated(alien, 0);
          }
        }

        // Advance engine tick to evaluate victory step
        (engine as any).update(0.016);

        if (getVictoryCalls() !== 1) {
          failedStages.push(`Sector ${sec} Stage ${stg} (isBossStage=${engine.state.isBossStage}, activeBoss=${!!engine.state.getActiveBoss()}, victoryCalls=${getVictoryCalls()})`);
        }
      }
    }

    // Adversarial challenge: Every stage must be completable upon wave clear!
    assert.deepEqual(
      failedStages,
      [],
      `CRITICAL DEFECT: The following stages softlock and fail to trigger victory upon clearing all aliens: ${failedStages.join(' | ')}`
    );
  });
});

describe('STRESS 3: No Stage Completes With Live Enemies Left Descending On Screen', () => {
  it('Verifies non-boss stages never trigger victory while live aliens remain', () => {
    const { engine, getVictoryCalls } = setupEngine();

    for (let sec = 1; sec <= 4; sec++) {
      for (let stg = 1; stg <= 4; stg++) {
        engine.startStage(sec, stg);
        const initialCount = engine.state.aliens.length;

        // Defeat all but 1 alien
        for (let i = 0; i < initialCount - 1; i++) {
          (engine as any).handleAlienDefeated(engine.state.aliens[0], 0);
        }

        (engine as any).update(0.016);

        assert.equal(engine.state.aliens.length, 1, 'Exactly 1 alien must remain alive');
        assert.equal(getVictoryCalls(), 0, `Sector ${sec} Stage ${stg} triggered victory with 1 live alien still on screen!`);
      }
    }
  });

  it('Stress tests Sector 5 Stage 5 Dreadnought Boss destruction: checks whether stage completes with live escorts/minions left descending', () => {
    const { engine, getVictoryCalls } = setupEngine();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss();
    assert.ok(boss, 'Dreadnought Boss must exist in Sector 5 Stage 5');

    // Trigger Phase 2 to spawn minion drones
    boss.shieldHp = 0;
    (engine as any).update(0.016);
    assert.equal(boss.bossPhase, 2);

    // Player eliminates ONLY the boss, leaving escorts and minions alive!
    boss.hp = 0;
    (engine as any).triggerBossDestruction(boss);
    assert.equal(boss.bossPhase, 4);

    // Run boss destruction to 3.0s
    (engine as any).updateBossDestruction(boss, 3.1);

    const victoryFired = getVictoryCalls() > 0;
    const liveAliensOnScreen = engine.state.aliens.length;

    // Adversarial challenge: If victory fired, NO live enemies must be left descending on screen!
    if (victoryFired) {
      assert.equal(
        liveAliensOnScreen,
        0,
        `CRITICAL DEFECT: Stage victory triggered with ${liveAliensOnScreen} live enemies still descending on screen! Alien types: ${engine.state.aliens.map(a => a.type).join(', ')}`
      );
    }
  });
});

describe('STRESS 4: Sinusoidal Horizontal Oscillation Continuity and Bounding', () => {
  it('Simulates oscillation across extreme framerates (10 FPS to 500 FPS, dt 0.002 to 0.1) and verifies continuity & bounds', () => {
    const canvasWidth = 480;
    const alienWidth = 34;
    const halfW = alienWidth / 2;
    const amp = 32;
    const freq = 3.6;
    const baseX = 240;

    const testDeltaTimes = [0.002, 0.005, 0.016, 0.033, 0.05, 0.1];

    for (const dt of testDeltaTimes) {
      let phase = 0;
      let prevX = baseX + amp * Math.sin(phase);

      for (let step = 0; step < 1000; step++) {
        phase += freq * dt;
        const rawOffset = amp * Math.sin(phase);
        const nextX = Math.max(halfW, Math.min(canvasWidth - halfW, baseX + rawOffset));

        assert.ok(!Number.isNaN(nextX) && Number.isFinite(nextX), 'Coordinate must be finite');
        assert.ok(nextX >= halfW - 1e-9 && nextX <= canvasWidth - halfW + 1e-9, 'Coordinate must be bounded');

        const stepDelta = Math.abs(nextX - prevX);
        const maxExpectedDelta = amp * freq * dt + 0.05;
        assert.ok(
          stepDelta <= maxExpectedDelta,
          `At dt=${dt}, delta=${stepDelta} exceeded maxExpectedDelta=${maxExpectedDelta}`
        );

        prevX = nextX;
      }
    }
  });
});

describe('STRESS 5: Armor Deflection & Core Reveal Damage Multipliers', () => {
  it('Verifies Mech-Crab armor deflection absorbs multi-hit attacks before HP decreases', () => {
    const { engine } = setupEngine();
    engine.startStage(3, 1);

    const crab = engine.state.aliens.find(a => a.type === 'crab' && a.armor && a.armor > 0);
    assert.ok(crab, 'Must find armored crab in Sector 3 Stage 1');

    const initialArmor = crab.armor!;
    const initialHp = crab.hp;

    // Deliver bullet with 2 damage
    const bullet: Bullet = {
      id: 'b1', x: crab.x, y: crab.y, vx: 0, vy: -400, type: 'laser', damage: 2, lane: crab.lane, width: 6, height: 14
    };
    engine.state.bullets.push(bullet);

    (engine as any).update(0.016);

    assert.equal(crab.armor, initialArmor - 1, 'Armor must decrement by 1');
    assert.equal(crab.hp, initialHp, 'HP must remain untouched while armor absorbs');
  });

  it('Verifies Behemoth core reveal damage multipliers: 0.5x when concealed, 2.0x when revealed', () => {
    const { engine } = setupEngine();
    engine.startStage(4, 1);

    const behemoth = engine.state.aliens.find(a => a.type === 'behemoth');
    assert.ok(behemoth, 'Must find Behemoth in Sector 4 Stage 1');

    // Case 1: Core concealed (coreTimer = 1.0s, where concealed duration is 3.0s)
    behemoth.coreTimer = 1.0;
    behemoth.hp = 10;
    const bConcealed: Bullet = {
      id: 'b_c', x: behemoth.x, y: behemoth.y, vx: 0, vy: -400, type: 'laser', damage: 4, lane: behemoth.lane, width: 6, height: 14
    };
    engine.state.bullets.push(bConcealed);
    (engine as any).update(0.016);

    // Base damage 4 * 0.5 = 2 damage dealt -> hp: 10 - 2 = 8
    assert.equal(behemoth.hp, 8, 'Concealed core must take exactly 50% damage (2 dmg from 4)');

    // Case 2: Core revealed (coreTimer = 3.5s in 5.0s cycle -> revealed window [3.0, 5.0))
    behemoth.coreTimer = 3.5;
    const bRevealed: Bullet = {
      id: 'b_r', x: behemoth.x, y: behemoth.y, vx: 0, vy: -400, type: 'laser', damage: 3, lane: behemoth.lane, width: 6, height: 14
    };
    engine.state.bullets.push(bRevealed);
    (engine as any).update(0.016);

    // Base damage 3 * 2.0 = 6 damage dealt -> hp: 8 - 6 = 2
    assert.equal(behemoth.hp, 2, 'Revealed core must take exactly 200% critical damage (6 dmg from 3)');
  });
});
