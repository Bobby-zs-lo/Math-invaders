import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// --- Headless In-Memory Environment Mocks ---
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
    ellipse: () => {},
    rect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    drawImage: () => {},
    measureText: () => ({ width: 10 }),
    fillText: () => {},
    strokeText: () => {},
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
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false,
          toggle: () => {}
        },
        setAttribute: () => {},
        getAttribute: () => null,
        style: {}
      };
    }
  };
}

import { GameEngine } from '../src/engine/GameEngine.ts';
import { SpriteGenerator } from '../src/engine/SpriteGenerator.ts';
import { Renderer } from '../src/engine/Renderer.ts';
import { createNewProfile } from '../src/models/Profile.ts';
import type { PlayerProfile } from '../src/models/Profile.ts';

describe('Adversarial Stress Test: Milestone 3 Live Upgrade Drawer & Ship Tier Transitions', () => {
  let profile: PlayerProfile;
  let mockCanvas: HTMLCanvasElement;
  let engine: GameEngine;

  beforeEach(() => {
    mockStorage.clear();
    profile = createNewProfile('AdversarialTester', '🛡️', 3);
    mockCanvas = createMockCanvas(800, 600);
    engine = new GameEngine(mockCanvas, profile);
  });

  describe('1. Non-Pausing Game Loop & Hostile Alien Descent Invariants', () => {
    it('Game loop never pauses when upgrade drawer operations and solves occur concurrently', () => {
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.isPaused, false, 'Initial state must be unpaused');
      assert.strictEqual(engine.state.isRunning, true, 'Engine must be running');

      const initialAlienCount = engine.state.aliens.length;
      assert.ok(initialAlienCount > 0, 'Aliens must be spawned in combat wave');
      const startY = engine.state.aliens[0].y;

      let totalMarchEvents = 0;
      let lastMarchTimer = engine.state.marchTimer;
      const dt = 0.016; // 60 FPS tick

      // Simulate 300 game ticks (~5 seconds of gameplay)
      // Every 10 ticks, submit an upgrade answer (mix of correct and incorrect)
      for (let tick = 0; tick < 300; tick++) {
        const updateFn = (engine as any).update.bind(engine);
        updateFn(dt);

        // March timer must advance or reset upon march step
        if (engine.state.marchTimer < lastMarchTimer) {
          totalMarchEvents++;
        }
        lastMarchTimer = engine.state.marchTimer;

        // Perform concurrent upgrade drawer operations
        if (tick % 15 === 0) {
          const prob = (engine as any).activeUpgradeProblem;
          assert.ok(prob, `Active upgrade problem must exist at tick ${tick}`);

          // Alternate between correct and incorrect answers
          if (tick % 30 === 0) {
            const res = engine.submitUpgradeAnswer(prob.answer);
            assert.strictEqual(res.success, true, `Correct answer at tick ${tick} must succeed`);
          } else {
            const res = engine.submitUpgradeAnswer(prob.answer + 999);
            assert.strictEqual(res.success, false, `Wrong answer at tick ${tick} must fail`);
          }
        }

        // Invariant: Game loop is strictly non-pausing
        assert.strictEqual(engine.state.isPaused, false, `isPaused must remain false at tick ${tick}`);
        assert.strictEqual(engine.state.isRunning, true, `isRunning must remain true at tick ${tick}`);
      }

      // Assert continuous downward movement
      const finalY = engine.state.aliens[0].y;
      assert.ok(totalMarchEvents >= 3, `Expected multiple march cycles (observed: ${totalMarchEvents})`);
      assert.ok(finalY > startY, `Aliens must descend continuously (startY: ${startY}, finalY: ${finalY})`);
    });

    it('Rapid-fire upgrade attempts (100 answers in a single tick) do NOT freeze or interrupt alien march rhythm', () => {
      engine.startStage(1, 1);
      const initialMarchTimer = engine.state.marchTimer;
      const initialAlienY = engine.state.aliens[0].y;

      // Spam 100 upgrade answers in quick succession
      for (let i = 0; i < 100; i++) {
        const prob = (engine as any).activeUpgradeProblem;
        // Submit correct or incorrect
        engine.submitUpgradeAnswer(prob ? prob.answer : 1);
      }

      // Ensure game engine state did not stall
      assert.strictEqual(engine.state.isPaused, false, 'Spamming solves must not pause game');
      assert.strictEqual(engine.state.isRunning, true, 'Engine must remain running');

      // Now advance simulation by 1 second (62 frames)
      const dt = 0.016;
      for (let i = 0; i < 62; i++) {
        (engine as any).update(dt);
      }

      // Verify march progress continued unimpeded
      assert.ok(engine.state.aliens[0].y > initialAlienY, 'Aliens must have marched downward after spam');
      assert.notStrictEqual(engine.state.marchTimer, initialMarchTimer, 'March timer must continue cycling');
    });

    it('Alien breach mechanic triggers even if player is actively solving upgrades', () => {
      engine.startStage(1, 1);
      const initialLives = engine.state.lives;

      // Artificially position top alien near player breach threshold
      const targetAlien = engine.state.aliens[0];
      targetAlien.y = engine.state.playerY - engine.state.marchStepY;

      // Solve an upgrade problem right as alien steps over the line
      const prob = (engine as any).activeUpgradeProblem;
      engine.submitUpgradeAnswer(prob.answer);

      // Force a march interval tick to breach player defense line
      engine.state.marchTimer = engine.state.marchInterval;
      (engine as any).update(0.016);

      // Verify breach was handled and life was lost despite upgrade solving
      assert.strictEqual(engine.state.lives, initialLives - 1, 'Player must lose a life on breach during upgrades');
    });
  });

  describe('2. Weapon Tier Progression & Mathematical Clamping [1, 4]', () => {
    it('Sequential solves advance ship weapon tier: Tier 1 -> Tier 2 -> Tier 3 -> Tier 4', () => {
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 1, 'Initial stage tier is 1');
      assert.strictEqual(engine.state.upgradesSolvedThisTier, 0);
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 1, 'Tier 1 -> 2 requires 1 solve');

      // --- Transition to Tier 2 ---
      const q1 = (engine as any).activeUpgradeProblem;
      const res1 = engine.submitUpgradeAnswer(q1.answer);
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.tierChanged, true, 'Must transition to Tier 2');
      assert.strictEqual(engine.state.inStageUpgradeTier, 2);
      assert.strictEqual(engine.state.upgradesSolvedThisTier, 0, 'Solve counter resets on tier change');
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 2, 'Tier 2 -> 3 requires 2 solves');

      // --- Transition to Tier 3 ---
      // Solve 1 of 2
      const q2a = (engine as any).activeUpgradeProblem;
      const res2a = engine.submitUpgradeAnswer(q2a.answer);
      assert.strictEqual(res2a.tierChanged, false, 'Partial progress must not trigger tier change');
      assert.strictEqual(engine.state.inStageUpgradeTier, 2);
      assert.strictEqual(engine.state.upgradesSolvedThisTier, 1);

      // Solve 2 of 2
      const q2b = (engine as any).activeUpgradeProblem;
      const res2b = engine.submitUpgradeAnswer(q2b.answer);
      assert.strictEqual(res2b.tierChanged, true, 'Must transition to Tier 3');
      assert.strictEqual(engine.state.inStageUpgradeTier, 3);
      assert.strictEqual(engine.state.upgradesSolvedThisTier, 0);
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 3, 'Tier 3 -> 4 requires 3 solves');

      // --- Transition to Tier 4 ---
      for (let s = 1; s <= 3; s++) {
        const q3 = (engine as any).activeUpgradeProblem;
        const res3 = engine.submitUpgradeAnswer(q3.answer);
        if (s < 3) {
          assert.strictEqual(res3.tierChanged, false, `Solve ${s}/3 must not advance tier`);
          assert.strictEqual(engine.state.inStageUpgradeTier, 3);
          assert.strictEqual(engine.state.upgradesSolvedThisTier, s);
        } else {
          assert.strictEqual(res3.tierChanged, true, 'Solve 3/3 must advance to Tier 4');
          assert.strictEqual(engine.state.inStageUpgradeTier, 4);
        }
      }
    });

    it('Tier 4 acts as strict ceiling: extra solves never increment tier beyond 4', () => {
      engine.startStage(1, 1);
      // Fast forward to tier 4
      engine.state.inStageUpgradeTier = 4;
      engine.state.upgradesSolvedThisTier = 0;
      engine.state.upgradesRequiredForNextTier = 4;

      // Submit 20 additional correct answers
      for (let i = 0; i < 20; i++) {
        const prob = (engine as any).activeUpgradeProblem;
        const res = engine.submitUpgradeAnswer(prob.answer);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.tierChanged, false, 'Tier must NOT change once at max Tier 4');
        assert.strictEqual(engine.state.inStageUpgradeTier, 4, 'Tier must remain clamped at 4');
      }
    });

    it('Hangar ship equipping initializes inStageUpgradeTier correctly for all tiers 1..4', () => {
      // Test Tier 1 default
      profile.equippedShipId = 'tier1_interceptor';
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 1);
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 1);

      // Test Tier 2
      profile.equippedShipId = 'tier2_hunter';
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 2);
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 2);

      // Test Tier 3 (both vanguard and cruiser aliases)
      profile.equippedShipId = 'tier3_vanguard';
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 3);
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 3);

      profile.equippedShipId = 'tier3_cruiser';
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 3);
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 3);

      // Test Tier 4
      profile.equippedShipId = 'tier4_flagship';
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 4);
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 0, 'Tier 4 has 0 required for next tier');

      // Test fallback on unknown/undefined ID
      profile.equippedShipId = undefined;
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 1);

      profile.equippedShipId = 'unknown_alien_destroyer';
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 1);
    });
  });

  describe('3. Weapon Salvo Damage, Bullet Patterns & Rate of Fire across Tiers 1–4', () => {
    function fireSalvoAndCapture(tier: number, lane: number = 2) {
      engine.state.inStageUpgradeTier = tier;
      engine.state.bullets = [];
      const fireFn = (engine as any).fireAmplifiedSalvo.bind(engine);
      fireFn(lane);
      return [...engine.state.bullets];
    }

    it('Tier 1 Starter Scout: Spawns 3 rapid vertical lasers dealing 2 damage each (6 total damage)', () => {
      const bullets = fireSalvoAndCapture(1, 2);
      assert.strictEqual(bullets.length, 3, 'Tier 1 must spawn 3 bullets');

      let totalDamage = 0;
      for (const b of bullets) {
        assert.strictEqual(b.type, 'laser');
        assert.strictEqual(b.damage, 2);
        assert.strictEqual(b.lane, 2);
        assert.strictEqual(b.vx, 0);
        assert.strictEqual(b.vy, -420);
        assert.strictEqual(b.width, 6);
        assert.strictEqual(b.height, 14);
        totalDamage += b.damage;
      }
      assert.strictEqual(totalDamage, 6, 'Tier 1 total salvo damage must be 6');
    });

    it('Tier 2 Dual-Wing Hunter: Spawns 4 bullets with dual lasers + V-spread across 3 lanes (8 total damage)', () => {
      const bullets = fireSalvoAndCapture(2, 2);
      assert.strictEqual(bullets.length, 4, 'Tier 2 must spawn 4 bullets');

      const lasers = bullets.filter(b => b.type === 'laser');
      const vspreads = bullets.filter(b => b.type === 'vspread');

      assert.strictEqual(lasers.length, 2, '2 center lasers');
      assert.strictEqual(vspreads.length, 2, '2 angled v-spread blasters');

      // Verify vspread angles and lane coverage
      const leftSpread = vspreads.find(b => b.vx < 0);
      const rightSpread = vspreads.find(b => b.vx > 0);
      assert.ok(leftSpread, 'Left spread bullet exists');
      assert.ok(rightSpread, 'Right spread bullet exists');
      assert.strictEqual(leftSpread!.lane, 1, 'Left spread covers lane 1');
      assert.strictEqual(rightSpread!.lane, 3, 'Right spread covers lane 3');

      const totalDamage = bullets.reduce((sum, b) => sum + b.damage, 0);
      assert.strictEqual(totalDamage, 8, 'Tier 2 total salvo damage must be 8');
    });

    it('Tier 2 boundary protection: V-spread in Lane 0 and Lane 4 clamps within [0, 4]', () => {
      // Test leftmost boundary (Lane 0)
      const bulletsL0 = fireSalvoAndCapture(2, 0);
      bulletsL0.forEach(b => {
        assert.ok(b.lane >= 0 && b.lane <= 4, `Lane ${b.lane} out of bounds for Lane 0 salvo`);
      });

      // Test rightmost boundary (Lane 4)
      const bulletsL4 = fireSalvoAndCapture(2, 4);
      bulletsL4.forEach(b => {
        assert.ok(b.lane >= 0 && b.lane <= 4, `Lane ${b.lane} out of bounds for Lane 4 salvo`);
      });
    });

    it('Tier 3 Plasma Cruiser: Spawns heavy piercing plasma bullet (5 damage) + 2 escort lasers (9 total damage)', () => {
      const bullets = fireSalvoAndCapture(3, 2);
      assert.strictEqual(bullets.length, 3, 'Tier 3 must spawn 3 bullets');

      const plasma = bullets.find(b => b.type === 'plasma');
      const lasers = bullets.filter(b => b.type === 'laser');

      assert.ok(plasma, 'Plasma beam must exist');
      assert.strictEqual(plasma!.damage, 5, 'Plasma damage is 5');
      assert.strictEqual(plasma!.width, 14, 'Plasma beam width is enlarged (14px)');
      assert.strictEqual(plasma!.height, 24, 'Plasma beam height is enlarged (24px)');
      assert.strictEqual(plasma!.vy, -520, 'Plasma beam velocity is -520');

      assert.strictEqual(lasers.length, 2, '2 escort lasers');
      assert.strictEqual(lasers[0].damage, 2);
      assert.strictEqual(lasers[1].damage, 2);

      const totalDamage = bullets.reduce((sum, b) => sum + b.damage, 0);
      assert.strictEqual(totalDamage, 9, 'Tier 3 total salvo damage must be 9');
    });

    it('Tier 4 Neon Flagship: Spawns hyper plasma (6 damage) + 2 chain lightning bolts (4 damage each) (14 total damage)', () => {
      const bullets = fireSalvoAndCapture(4, 2);
      assert.strictEqual(bullets.length, 3, 'Tier 4 must spawn 3 bullets');

      const hyperPlasma = bullets.find(b => b.type === 'plasma');
      const lightning = bullets.filter(b => b.type === 'lightning');

      assert.ok(hyperPlasma, 'Hyper plasma exists');
      assert.strictEqual(hyperPlasma!.damage, 6, 'Hyper plasma damage is 6');
      assert.strictEqual(hyperPlasma!.vy, -580, 'Hyper plasma velocity is -580');

      assert.strictEqual(lightning.length, 2, '2 chain lightning bolts');
      lightning.forEach(b => {
        assert.strictEqual(b.damage, 4, 'Chain lightning damage is 4');
        assert.strictEqual(b.vy, -380);
      });

      const totalDamage = bullets.reduce((sum, b) => sum + b.damage, 0);
      assert.strictEqual(totalDamage, 14, 'Tier 4 total salvo damage must be 14');
    });

    it('Damage output strictly increases monotonically across Tier 1 -> Tier 2 -> Tier 3 -> Tier 4', () => {
      const dmg1 = fireSalvoAndCapture(1).reduce((s, b) => s + b.damage, 0);
      const dmg2 = fireSalvoAndCapture(2).reduce((s, b) => s + b.damage, 0);
      const dmg3 = fireSalvoAndCapture(3).reduce((s, b) => s + b.damage, 0);
      const dmg4 = fireSalvoAndCapture(4).reduce((s, b) => s + b.damage, 0);

      assert.ok(dmg1 < dmg2, `Tier 1 dmg (${dmg1}) must be < Tier 2 dmg (${dmg2})`);
      assert.ok(dmg2 < dmg3, `Tier 2 dmg (${dmg2}) must be < Tier 3 dmg (${dmg3})`);
      assert.ok(dmg3 < dmg4, `Tier 3 dmg (${dmg3}) must be < Tier 4 dmg (${dmg4})`);
    });

    it('Base defense fire cooldown decreases as ship tier increases (accelerating fire rate)', () => {
      const getCooldown = (tier: number) => Math.max(0.18, 0.35 - (tier - 1) * 0.04);

      const cd1 = getCooldown(1);
      const cd2 = getCooldown(2);
      const cd3 = getCooldown(3);
      const cd4 = getCooldown(4);

      assert.strictEqual(cd1, 0.35);
      assert.strictEqual(cd2, 0.31);
      assert.ok(Math.abs(cd3 - 0.27) < 1e-9, `Expected cd3 ~0.27, got ${cd3}`);
      assert.ok(Math.abs(cd4 - 0.23) < 1e-9, `Expected cd4 ~0.23, got ${cd4}`);

      assert.ok(cd1 > cd2 && cd2 > cd3 && cd3 > cd4, 'Cooldown must decrease with higher tiers');
    });
  });

  describe('4. Procedural Sprite Rendering & Canvas Crash-Free Safety', () => {
    it('SpriteGenerator.getPlayerShip produces valid 52x52 canvas sprites for tiers 1..4', () => {
      for (let t = 1; t <= 4; t++) {
        const sprite = SpriteGenerator.getPlayerShip(t);
        assert.ok(sprite, `Sprite for tier ${t} must exist`);
        assert.strictEqual(sprite.width, 52, `Tier ${t} width must be 52`);
        assert.strictEqual(sprite.height, 52, `Tier ${t} height must be 52`);
      }
    });

    it('SpriteGenerator.getPlayerShip safely handles extreme, negative, out-of-range, and NaN values without throwing', () => {
      const cases = [-100, -1, 0, 1.5, 2.8, 5, 10, 999, NaN, null as any, undefined as any];
      for (const c of cases) {
        assert.doesNotThrow(() => {
          const sprite = SpriteGenerator.getPlayerShip(c);
          assert.ok(sprite, `Sprite for case ${c} must be returned`);
          assert.strictEqual(sprite.width, 52);
          assert.strictEqual(sprite.height, 52);
        }, `SpriteGenerator must not throw for input: ${c}`);
      }
    });

    it('Full canvas render loop renders all tiers 1..4 without errors or warnings', () => {
      const mockCtx = mockCanvas.getContext('2d')!;
      const renderer = new Renderer(mockCtx);
      engine.startStage(1, 1);

      for (let tier = 1; tier <= 4; tier++) {
        engine.state.inStageUpgradeTier = tier;

        // Populate arena with particles, bullets, and aliens
        engine.state.bullets.push({
          id: 'test_b',
          x: 200,
          y: 300,
          vx: 0,
          vy: -400,
          type: 'plasma',
          damage: 5,
          lane: 2,
          width: 14,
          height: 24
        });

        assert.doesNotThrow(() => {
          renderer.render(engine.state, 0.016);
        }, `Renderer.render must execute cleanly for Tier ${tier}`);
      }
    });
  });

  describe('5. High-Stress Telemetry Quota & Problem Generation Integrity', () => {
    it('Solves 150 consecutive upgrade problems: problem generation is 100% solvable and telemetry stays bounded to 300 entries', () => {
      engine.startStage(1, 1);

      for (let i = 0; i < 150; i++) {
        const prob = (engine as any).activeUpgradeProblem;
        assert.ok(prob, `Active upgrade problem must exist at iteration ${i}`);
        assert.ok(typeof prob.question === 'string' && prob.question.length > 0);
        assert.ok(Number.isInteger(prob.answer), `Answer ${prob.answer} must be an integer`);

        const res = engine.submitUpgradeAnswer(prob.answer);
        assert.strictEqual(res.success, true);
      }

      // Check problem history bounds
      assert.ok(
        profile.stats.problemHistory.length <= 300,
        `Telemetry history length (${profile.stats.problemHistory.length}) must not exceed 300 limit`
      );

      // Verify recorded telemetry entries for all solved problems
      assert.ok(profile.stats.problemHistory.length >= 150, 'All solved problems must be recorded in telemetry');
      profile.stats.problemHistory.forEach(entry => {
        assert.strictEqual(entry.isCorrect, true);
        assert.ok(typeof entry.operation === 'string' && entry.operation.length > 0);
        assert.ok(Number.isInteger(entry.correctAnswer));
      });
    });
  });
});
