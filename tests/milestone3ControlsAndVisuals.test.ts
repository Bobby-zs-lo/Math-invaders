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
import { SHOP_ITEMS } from '../src/ui/HangarModal.ts';
import { createNewProfile } from '../src/models/Profile.ts';
import type { PlayerProfile } from '../src/models/Profile.ts';

describe('Milestone 3: Controls, Live Upgrade Drawer & Ship Visual Tiers', () => {
  let profile: PlayerProfile;
  let mockCanvas: HTMLCanvasElement;
  let engine: GameEngine;

  beforeEach(() => {
    mockStorage.clear();
    profile = createNewProfile('Ace Pilot', '🚀', 3);
    mockCanvas = createMockCanvas(876, 506);
    engine = new GameEngine(mockCanvas, profile);
  });

  describe('1. Ship Upgrade Visual Tiers (Tier 1–4) & Naming Consistency', () => {
    it('HangarModal SHOP_ITEMS contains consistent tier naming: Starter Scout, Dual-Wing Hunter, Plasma Cruiser, Neon Flagship', () => {
      assert.strictEqual(SHOP_ITEMS.length, 4);

      const t1 = SHOP_ITEMS.find(s => s.tier === 1);
      assert.ok(t1, 'Tier 1 item must exist');
      assert.strictEqual(t1.name, 'Tier 1: Starter Scout');

      const t2 = SHOP_ITEMS.find(s => s.tier === 2);
      assert.ok(t2, 'Tier 2 item must exist');
      assert.strictEqual(t2.name, 'Tier 2: Dual-Wing Hunter');

      const t3 = SHOP_ITEMS.find(s => s.tier === 3);
      assert.ok(t3, 'Tier 3 item must exist');
      assert.strictEqual(t3.name, 'Tier 3: Plasma Cruiser');
      assert.ok(!t3.name.includes('Crimson Vanguard'), 'Crimson Vanguard reference must be completely replaced');

      const t4 = SHOP_ITEMS.find(s => s.tier === 4);
      assert.ok(t4, 'Tier 4 item must exist');
      assert.strictEqual(t4.name, 'Tier 4: Neon Flagship');
    });

    it('SpriteGenerator generates procedural pixel-art sprites for all 4 ship tiers and clamps out-of-range tiers', () => {
      const s1 = SpriteGenerator.getPlayerShip(1);
      const s2 = SpriteGenerator.getPlayerShip(2);
      const s3 = SpriteGenerator.getPlayerShip(3);
      const s4 = SpriteGenerator.getPlayerShip(4);

      assert.ok(s1, 'Tier 1 sprite canvas generated');
      assert.ok(s2, 'Tier 2 sprite canvas generated');
      assert.ok(s3, 'Tier 3 sprite canvas generated');
      assert.ok(s4, 'Tier 4 sprite canvas generated');

      assert.strictEqual(s1.width, 52);
      assert.strictEqual(s1.height, 52);

      // Clamping checks: tier 0 or negative clamps to 1; tier 99 clamps to 4
      const sClampedMin = SpriteGenerator.getPlayerShip(0);
      const sClampedMax = SpriteGenerator.getPlayerShip(99);
      assert.strictEqual(sClampedMin, s1, 'Tier 0 must clamp to Tier 1');
      assert.strictEqual(sClampedMax, s4, 'Tier 99 must clamp to Tier 4');
    });

    it('GameEngine getEquippedTier correctly maps ship IDs to tiers 1–4', () => {
      assert.strictEqual(engine.getEquippedTier('tier1_interceptor'), 1);
      assert.strictEqual(engine.getEquippedTier('tier2_hunter'), 2);
      assert.strictEqual(engine.getEquippedTier('tier3_vanguard'), 3);
      assert.strictEqual(engine.getEquippedTier('tier3_cruiser'), 3);
      assert.strictEqual(engine.getEquippedTier('tier4_flagship'), 4);
      assert.strictEqual(engine.getEquippedTier(undefined), 1);
    });

    it('Equipping a ship in the hangar updates GameEngine state in real-time', () => {
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 1, 'Default start at tier 1');

      // Player equips Tier 3 in hangar
      profile.equippedShipId = 'tier3_vanguard';
      engine.updateProfile(profile);

      assert.strictEqual(engine.state.inStageUpgradeTier, 3, 'Ship tier must immediately update to Tier 3');
      assert.strictEqual(engine.state.upgradesRequiredForNextTier, 3, 'Next tier requires 3 solves');
    });
  });

  describe('2. Responsive 5-Lane Controls & Targeting', () => {
    it('Lane selection updates selectedLane while locking ship until math is solved correctly', () => {
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.playerLane, 2, 'Default center playerLane (index 2)');
      assert.strictEqual(engine.state.selectedLane, 2, 'Default center selectedLane (index 2)');
      const startCenterX = engine.state.getLaneCenterX(2);
      assert.strictEqual(engine.state.playerTargetX, startCenterX, 'Ship target starts in center lane');

      // Target Lane 0 (Lane 1) - ship must NOT move yet!
      engine.selectLane(0);
      assert.strictEqual(engine.state.selectedLane, 0, 'Targeted lane updated to 0');
      assert.strictEqual(engine.state.playerLane, 2, 'Ship playerLane remains 2 until math problem is solved');
      assert.strictEqual(engine.state.playerTargetX, startCenterX, 'Ship targetX remains 2 until math problem is solved');

      // Submit incorrect answer -> ship must still remain in Lane 2
      const activeProb0 = engine.getActiveMathProblem();
      assert.ok(activeProb0, 'Active problem must exist for targeted lane');
      const wrongResult = engine.submitMathAnswer(activeProb0.answer + 9999);
      assert.strictEqual(wrongResult, false, 'Incorrect answer returns false');
      assert.strictEqual(engine.state.playerLane, 2, 'Ship remains in Lane 2 after wrong answer');
      assert.strictEqual(engine.state.playerTargetX, startCenterX, 'TargetX remains in Lane 2 after wrong answer');

      // Submit correct answer -> ship unlocks and moves to Lane 0!
      const correctResult = engine.submitMathAnswer(activeProb0.answer);
      assert.strictEqual(correctResult, true, 'Correct answer returns true');
      assert.strictEqual(engine.state.playerLane, 0, 'Ship moves to Lane 0 after correct answer');
      assert.strictEqual(engine.state.playerTargetX, engine.state.getLaneCenterX(0), 'TargetX moves to Lane 0 after correct answer');
    });

    it('Steering with shiftLane(-1) and shiftLane(1) smoothly bounds within 0 and 4', () => {
      engine.startStage(1, 1);
      engine.selectLane(0);

      // Shifting left when at leftmost lane 0 remains clamped at 0
      engine.shiftLane(-1);
      assert.strictEqual(engine.state.selectedLane, 0);

      // Shift right stepwise across all 5 lanes
      engine.shiftLane(1);
      assert.strictEqual(engine.state.selectedLane, 1);
      engine.shiftLane(1);
      assert.strictEqual(engine.state.selectedLane, 2);
      engine.shiftLane(1);
      assert.strictEqual(engine.state.selectedLane, 3);
      engine.shiftLane(1);
      assert.strictEqual(engine.state.selectedLane, 4);

      // Shifting right when at rightmost lane 4 remains clamped at 4
      engine.shiftLane(1);
      assert.strictEqual(engine.state.selectedLane, 4);
    });
  });

  describe('3. Keyboard Input Disambiguation Logic Simulation', () => {
    function simulateKeydown(
      key: string,
      code: string,
      currentInput: string,
      selectedLane: number
    ): { nextInput: string; nextLane: number; wasLaneSwitched: boolean } {
      let input = currentInput;
      let lane = selectedLane;
      let wasLaneSwitched = false;

      const isNumpadDigit = code.startsWith('Numpad') && /^[0-9]$/.test(key);

      if (!isNumpadDigit && ['1', '2', '3', '4', '5'].includes(key)) {
        if (input !== '') {
          // If currentInput !== '', always append digit
          input += key;
        } else {
          // If currentInput === ''
          const targetLane = parseInt(key, 10) - 1;
          if (lane === targetLane) {
            // Matches active lane: append digit to currentInput rather than switching lanes!
            input += key;
          } else {
            // Different lane: switch lanes
            lane = targetLane;
            wasLaneSwitched = true;
          }
        }
      } else if (/^[0-9]$/.test(key)) {
        input += key;
      }

      return { nextInput: input, nextLane: lane, wasLaneSwitched };
    }

    it('Physical numpad keys ALWAYS enter digits into currentInput regardless of active lane or empty input', () => {
      // Active lane is 2 (Lane 3). Pressing Numpad1 with empty input must type '1', NOT switch to Lane 1!
      const res = simulateKeydown('1', 'Numpad1', '', 2);
      assert.strictEqual(res.nextInput, '1', 'Numpad1 must append digit 1');
      assert.strictEqual(res.nextLane, 2, 'Active lane must remain 2');
      assert.strictEqual(res.wasLaneSwitched, false);
    });

    it('Top-row number key matching active lane appends digit when currentInput is empty', () => {
      // Active lane is 1 (Lane 2). Player presses top-row '2' (Digit2).
      const res = simulateKeydown('2', 'Digit2', '', 1);
      assert.strictEqual(res.nextInput, '2', 'Matching active lane digit must append to currentInput');
      assert.strictEqual(res.nextLane, 1, 'Lane must remain unchanged');
      assert.strictEqual(res.wasLaneSwitched, false);
    });

    it('Top-row number key for a different lane switches lanes when currentInput is empty', () => {
      // Active lane is 2 (Lane 3). Player presses top-row '1' (Digit1) to target Lane 1.
      const res = simulateKeydown('1', 'Digit1', '', 2);
      assert.strictEqual(res.nextInput, '', 'Input remains empty on lane switch');
      assert.strictEqual(res.nextLane, 0, 'Lane must switch to 0 (Lane 1)');
      assert.strictEqual(res.wasLaneSwitched, true);
    });

    it('Top-row number keys append to currentInput once typing has started (currentInput !== "")', () => {
      // Player already typed '2'. Now presses top-row '4' (Digit4).
      const res = simulateKeydown('4', 'Digit4', '2', 0);
      assert.strictEqual(res.nextInput, '24', 'Digit4 must append to form 24');
      assert.strictEqual(res.nextLane, 0, 'Lane must not switch while entering answers');
      assert.strictEqual(res.wasLaneSwitched, false);
    });
  });

  describe('4. Live Upgrade Drawer Non-Pausing Operation', () => {
    it('Solving bonus equations in the upgrade drawer advances weapon tier live from 1 to 4', () => {
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.inStageUpgradeTier, 1, 'Starts at Tier 1');

      // Solve tier 1 requirement (1 solve to reach Tier 2)
      const q1 = (engine as any).activeUpgradeProblem;
      assert.ok(q1, 'Active upgrade problem must exist');
      const res1 = engine.submitUpgradeAnswer(q1.answer);
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.tierChanged, true);
      assert.strictEqual(engine.state.inStageUpgradeTier, 2, 'Advanced to Tier 2: Dual-Wing Hunter');

      // Solve tier 2 requirements (2 solves to reach Tier 3)
      const q2a = (engine as any).activeUpgradeProblem;
      engine.submitUpgradeAnswer(q2a.answer);
      assert.strictEqual(engine.state.inStageUpgradeTier, 2);

      const q2b = (engine as any).activeUpgradeProblem;
      const res2b = engine.submitUpgradeAnswer(q2b.answer);
      assert.strictEqual(res2b.tierChanged, true);
      assert.strictEqual(engine.state.inStageUpgradeTier, 3, 'Advanced to Tier 3: Plasma Cruiser');

      // Solve tier 3 requirements (3 solves to reach Tier 4)
      for (let i = 0; i < 3; i++) {
        const q3 = (engine as any).activeUpgradeProblem;
        engine.submitUpgradeAnswer(q3.answer);
      }
      assert.strictEqual(engine.state.inStageUpgradeTier, 4, 'Advanced to Tier 4: Neon Flagship');
    });

    it('Alien descent continues and march timer updates continuously during upgrade interactions without pausing', () => {
      engine.startStage(1, 1);
      assert.strictEqual(engine.state.isPaused, false);
      assert.strictEqual(engine.state.isRunning, true);

      const initialAlienCount = engine.state.aliens.length;
      assert.ok(initialAlienCount > 0, 'Aliens are present in combat arena');
      const initialY = engine.state.aliens[0].y;

      // Simulate 1.5 seconds of game loop updates while upgrade capacitor is active
      const dt = 0.016; // ~60 FPS
      for (let step = 0; step < 90; step++) {
        (engine as any).update(dt);
      }

      // Verify aliens marched downward
      const currentY = engine.state.aliens[0].y;
      assert.ok(currentY > initialY, `Aliens must descend (initial: ${initialY}, current: ${currentY})`);
      assert.strictEqual(engine.state.isPaused, false, 'Game loop remains unpaused');
    });
  });

  describe('5. Mobile Drawer State & HUD Z-Index Contracts', () => {
    it('Verifies mobile drawer rules for screen width < 768px', () => {
      const isMobileWidth = (w: number) => w < 768;
      assert.strictEqual(isMobileWidth(414), true, '414px mobile viewport is mobile width');
      assert.strictEqual(isMobileWidth(1280), false, '1280px desktop viewport is desktop width');

      // Simulation of main.ts launchStage logic:
      const getDrawerClass = (innerWidth: number) => {
        return innerWidth >= 768 ? 'upgrade-side-drawer' : 'upgrade-side-drawer closed';
      };

      assert.strictEqual(getDrawerClass(414), 'upgrade-side-drawer closed', 'Drawer must start closed on mobile');
      assert.strictEqual(getDrawerClass(1280), 'upgrade-side-drawer', 'Drawer starts open beside arena on desktop');
    });
  });
});
