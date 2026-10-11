import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// --- In-Memory Headless Environment Mocks ---
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
  const dummyCtx: any = {
    canvas: null,
    imageSmoothingEnabled: false,
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    rect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    measureText: () => ({ width: 10 }),
    fillText: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    setLineDash: () => {},
    fillStyle: '#ffffff',
    strokeStyle: '#ffffff',
    lineWidth: 1,
    globalAlpha: 1.0,
    shadowColor: '#ffffff',
    shadowBlur: 0
  };

  const canvasObj: any = {
    width,
    height,
    clientWidth: width,
    clientHeight: height,
    getContext: () => dummyCtx,
    getBoundingClientRect: () => ({
      left: 0,
      top: 0,
      width,
      height,
      right: width,
      bottom: height
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  dummyCtx.canvas = canvasObj;
  return canvasObj as HTMLCanvasElement;
}

if (!globalThis.document) {
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return createMockCanvas(52, 52);
      return {
        classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
        setAttribute: () => {},
        getAttribute: () => null,
        style: {}
      };
    }
  };
}

import { GameEngine } from '../src/engine/GameEngine.ts';
import { createNewProfile } from '../src/models/Profile.ts';
import type { PlayerProfile } from '../src/models/Profile.ts';

describe('Weapon Archetypes, Piercing & Rebalanced Monster Life', () => {
  let profile: PlayerProfile;
  let mockCanvas: HTMLCanvasElement;
  let engine: GameEngine;

  beforeEach(() => {
    mockStorage.clear();
    profile = createNewProfile('Ace Pilot', '🚀', 3);
    mockCanvas = createMockCanvas(480, 640);
    engine = new GameEngine(mockCanvas, profile);
  });

  describe('1. Continuous Weapon Archetypes (Tiers 1–4)', () => {
    it('Tier 1 fires single emerald hyper-laser bolt', () => {
      engine.startStage(1, 1);
      engine.state.bullets = [];
      engine.state.inStageUpgradeTier = 1;

      (engine as any).fireContinuousBaseShot();

      assert.strictEqual(engine.state.bullets.length, 1, 'Tier 1 must spawn exactly 1 bullet');
      const b = engine.state.bullets[0];
      assert.strictEqual(b.type, 'laser');
      assert.strictEqual(b.damage, 1);
      assert.strictEqual(b.color, '#00ff66');
      assert.strictEqual(b.pierceRemaining, 0);
    });

    it('Tier 2 fires dual synchronized amber blasters + angled V-spread side cannons', () => {
      engine.startStage(1, 1);
      engine.state.bullets = [];
      engine.state.inStageUpgradeTier = 2;

      (engine as any).fireContinuousBaseShot();

      assert.strictEqual(engine.state.bullets.length, 4, 'Tier 2 must spawn 4 projectiles (2 blasters + 2 v-spreads)');
      const lasers = engine.state.bullets.filter(b => b.type === 'laser');
      const vspreads = engine.state.bullets.filter(b => b.type === 'vspread');

      assert.strictEqual(lasers.length, 2, '2 central blasters');
      assert.strictEqual(vspreads.length, 2, '2 angled v-spread cannons');
      assert.strictEqual(lasers[0].damage, 2, 'Tier 2 lasers deal 2 damage');
      assert.strictEqual(lasers[0].color, '#ffb700');
      assert.strictEqual(vspreads[0].damage, 1);
      assert.strictEqual(vspreads[0].color, '#ffd600');
    });

    it('Tier 3 fires piercing radiant super-plasma core + auxiliary blasters', () => {
      engine.startStage(1, 1);
      engine.state.bullets = [];
      engine.state.inStageUpgradeTier = 3;

      (engine as any).fireContinuousBaseShot();

      assert.strictEqual(engine.state.bullets.length, 3, 'Tier 3 must spawn 3 projectiles (1 plasma + 2 lasers)');
      const plasma = engine.state.bullets.find(b => b.type === 'plasma');
      assert.ok(plasma, 'Super-plasma core exists');
      assert.strictEqual(plasma.damage, 5, 'Super-plasma deals 5 damage');
      assert.strictEqual(plasma.pierceRemaining, 2, 'Super-plasma pierces up to 2 aliens');
      assert.strictEqual(plasma.color, '#00f3ff');
    });

    it('Tier 4 fires heavy neon plasma cannon + dual chain lightning discharges', () => {
      engine.startStage(1, 1);
      engine.state.bullets = [];
      engine.state.inStageUpgradeTier = 4;

      (engine as any).fireContinuousBaseShot();

      assert.strictEqual(engine.state.bullets.length, 3, 'Tier 4 must spawn 3 projectiles (1 heavy plasma + 2 lightning)');
      const plasma = engine.state.bullets.find(b => b.type === 'plasma');
      const lightnings = engine.state.bullets.filter(b => b.type === 'lightning');

      assert.ok(plasma, 'Heavy plasma exists');
      assert.strictEqual(plasma.damage, 8, 'Heavy plasma deals 8 damage');
      assert.strictEqual(plasma.pierceRemaining, 3, 'Heavy plasma pierces up to 3 aliens');
      assert.strictEqual(plasma.color, '#bc13fe');

      assert.strictEqual(lightnings.length, 2, '2 chain lightning arcs');
      assert.strictEqual(lightnings[0].damage, 4, 'Chain lightning deals 4 damage');
    });
  });

  describe('2. Piercing Mechanics & Multi-Alien Damage', () => {
    it('Piercing plasma punches through alien 1, reduces pierceRemaining, and damages alien 2 in same column', () => {
      engine.startStage(1, 1);
      engine.state.aliens = [];
      engine.state.bullets = [];

      // Spawn 2 scouts in lane 2 at different heights
      const scout1 = {
        id: 'scout_front',
        lane: 2,
        x: engine.state.getLaneCenterX(2),
        y: 200,
        type: 'scout' as const,
        hp: 6,
        maxHp: 6,
        scoreValue: 100,
        width: 34,
        height: 34,
        speed: 10,
        isHitFlash: 0
      };

      const scout2 = {
        id: 'scout_back',
        lane: 2,
        x: engine.state.getLaneCenterX(2),
        y: 150,
        type: 'scout' as const,
        hp: 6,
        maxHp: 6,
        scoreValue: 100,
        width: 34,
        height: 34,
        speed: 10,
        isHitFlash: 0
      };

      engine.state.aliens.push(scout1, scout2);
      engine.state.fireCooldown = 10; // Prevent background auto-fire during test step

      // Spawn Tier 3 plasma at y = 205 heading upward
      (engine as any).spawnBullet(scout1.x, 205, 0, -400, 'plasma', 5, 2, 2, '#00f3ff');
      assert.strictEqual(engine.state.bullets.length, 1);

      // Step 1: Hit scout1
      (engine as any).update(0.016);
      assert.strictEqual(scout1.hp, 1, 'Scout 1 took 5 damage (6 - 5 = 1)');
      assert.strictEqual(engine.state.bullets.length, 1, 'Piercing plasma must NOT be destroyed on first hit!');
      assert.strictEqual(engine.state.bullets[0].pierceRemaining, 1, 'pierceRemaining decremented to 1');

      // Teleport bullet to hit scout2
      engine.state.bullets[0].y = 155;
      (engine as any).update(0.016);
      assert.strictEqual(scout2.hp, 1, 'Scout 2 took 5 damage (6 - 5 = 1)');
      assert.strictEqual(engine.state.bullets[0].pierceRemaining, 0, 'pierceRemaining decremented to 0');
    });
  });

  describe('3. Floating Damage Numbers Feedback', () => {
    it('Creates floating damage text entries upon bullet impact and decays them over time', () => {
      engine.startStage(1, 1);
      engine.state.aliens = [];
      engine.state.bullets = [];
      engine.state.damageTexts = [];
      engine.state.fireCooldown = 10;

      const scout = {
        id: 'scout_target',
        lane: 2,
        x: engine.state.getLaneCenterX(2),
        y: 200,
        type: 'scout' as const,
        hp: 6,
        maxHp: 6,
        scoreValue: 100,
        width: 34,
        height: 34,
        speed: 10,
        isHitFlash: 0
      };
      engine.state.aliens.push(scout);

      (engine as any).spawnBullet(scout.x, 202, 0, -400, 'laser', 2, 2, 0, '#ffb700');
      (engine as any).update(0.016);

      assert.strictEqual(engine.state.damageTexts.length, 1, 'Must create 1 floating damage text');
      const dt = engine.state.damageTexts[0];
      assert.strictEqual(dt.text, '-2');
      assert.ok(dt.life > 0);

      // Advance time until decay
      (engine as any).update(0.8);
      assert.strictEqual(engine.state.damageTexts.length, 0, 'Damage text must decay and disappear after life expires');
    });
  });

  describe('4. Rebalanced Monster HP Across Sectors', () => {
    it('Scout base HP is 6, Crabs have 6 HP (+ 2 armor), and Behemoths have 12 HP', () => {
      // Sector 1 Stage 1
      engine.startStage(1, 1);
      const scoutS1 = engine.state.aliens.find(a => a.type === 'scout');
      assert.ok(scoutS1);
      assert.strictEqual(scoutS1.hp, 6, 'Sector 1 Scout base HP is 6 (preventing 1-hit kills with lowest weapon)');

      // Sector 3 Stage 1 (Armored Crab)
      engine.startStage(3, 1);
      const crab = engine.state.aliens.find(a => a.type === 'crab');
      assert.ok(crab);
      assert.strictEqual(crab.hp, 6, 'Armored Crab base HP is 6');
      assert.strictEqual(crab.armor, 2, 'Armored Crab has 2 armor points');

      // Sector 4 Stage 1 (Behemoth)
      engine.startStage(4, 1);
      const behemoth = engine.state.aliens.find(a => a.type === 'behemoth');
      assert.ok(behemoth);
      assert.strictEqual(behemoth.hp, 12, 'Assault Behemoth base HP is 12');
    });
  });
});
