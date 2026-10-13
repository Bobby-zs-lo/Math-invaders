import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

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
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      drawImage: () => {},
      setLineDash: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      strokeText: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    addEventListener: () => {},
    removeEventListener: () => {}
  } as unknown as HTMLCanvasElement;
}

import {
  createNewProfile,
  loadProfiles,
  saveProfiles,
  getActiveProfile,
  setActiveProfile,
  updateActiveProfile,
  type PlayerProfile
} from '../src/models/Profile.ts';
import { GameEngine } from '../src/engine/GameEngine.ts';
import { GameState } from '../src/models/GameState.ts';
import { StarMapModal } from '../src/ui/StarMapModal.ts';

describe('Stage Progress & Tablet Persistence Verification', () => {
  let profile: PlayerProfile;
  let canvas: HTMLCanvasElement;
  let engine: GameEngine;

  beforeEach(() => {
    mockStorage.clear();
    profile = createNewProfile('Tablet Pilot', '🚀', 2);
    saveProfiles([profile]);
    setActiveProfile(profile.id);
    canvas = createMockCanvas();
    engine = new GameEngine(canvas, profile);
  });

  describe('1. Alien Breach Wave Resolution & Stage Victory Invariant', () => {
    it('Tracks aliensBreached in GameState and increments on breach', () => {
      engine.startStage(1, 1);
      assert.equal(engine.state.aliensBreached, 0);
      assert.equal(engine.state.lives, 3);
      assert.equal(engine.state.aliens.length, 5);

      const breachedAlien = engine.state.aliens[0];
      (engine as any).handleAlienBreach(breachedAlien);

      assert.equal(engine.state.aliensBreached, 1);
      assert.equal(engine.state.lives, 2);
      assert.equal(engine.state.aliens.length, 4);
    });

    it('Surviving a wave with 1 alien breach triggers stage victory instead of spawning endless waves', () => {
      let victoryFired = false;
      let starsAwarded = 0;
      engine.setCallbacks({
        onStageVictory: (stars) => {
          victoryFired = true;
          starsAwarded = stars;
        }
      });

      engine.startStage(1, 1);
      assert.equal(engine.state.totalAliensWave, 5);

      // Defeat 4 aliens
      for (let i = 0; i < 4; i++) {
        const alien = engine.state.aliens[0];
        (engine as any).handleAlienDefeated(alien, 0);
      }
      assert.equal(engine.state.aliensDefeated, 4);
      assert.equal(engine.state.aliens.length, 1);

      // The 5th alien breaches defense line
      const fifthAlien = engine.state.aliens[0];
      (engine as any).handleAlienBreach(fifthAlien);

      assert.equal(engine.state.aliensDefeated, 4);
      assert.equal(engine.state.aliensBreached, 1);
      assert.equal(engine.state.aliens.length, 0);
      assert.equal(engine.state.lives, 2); // Still alive!

      // Trigger engine update tick to evaluate wave victory
      (engine as any).update(0.016);

      // Victory must be triggered!
      assert.equal(victoryFired, true, 'Stage victory should trigger when all wave aliens are resolved and shields remain');
      assert.equal(starsAwarded >= 1, true, 'At least 1 star must be awarded');
      assert.equal(engine.state.aliens.length, 0, 'Should NOT spawn another formation of aliens');
    });

    it('Defeating all aliens with 0 breaches awards 3 stars with full shields and accurate answers', () => {
      let victoryFired = false;
      let starsAwarded = 0;
      engine.setCallbacks({
        onStageVictory: (stars) => {
          victoryFired = true;
          starsAwarded = stars;
        }
      });

      engine.startStage(1, 1);
      // Simulate answer accuracy
      engine.state.totalQuestionsAnswered = 5;
      engine.state.correctAnswersCount = 5;

      // Defeat all 5 aliens
      while (engine.state.aliens.length > 0) {
        const alien = engine.state.aliens[0];
        (engine as any).handleAlienDefeated(alien, 0);
      }

      (engine as any).update(0.016);

      assert.equal(victoryFired, true);
      assert.equal(starsAwarded, 3, 'Full health and 100% accuracy awards 3 stars');
    });
  });

  describe('2. Star Map Progress Persistence & Next Stage Unlocking', () => {
    it('Winning Stage 1-1 marks 1-1 as completed and unlocks Stage 1-2 in active profile', () => {
      engine.startStage(1, 1);

      // Defeat wave
      while (engine.state.aliens.length > 0) {
        const alien = engine.state.aliens[0];
        (engine as any).handleAlienDefeated(alien, 0);
      }
      (engine as any).update(0.016);

      // Profile inside engine should have updated
      const stage1Progress = engine.profile.stageProgress['1-1'];
      assert.ok(stage1Progress, 'Stage 1-1 progress exists');
      assert.equal(stage1Progress.completed, true);

      const stage2Progress = engine.profile.stageProgress['1-2'];
      assert.ok(stage2Progress, 'Stage 1-2 progress exists');
      assert.equal(stage2Progress.completed, false, 'Stage 1-2 is unlocked but not yet completed');

      assert.equal(engine.profile.currentStage, 2, 'Current stage advanced to 2');
      assert.equal(engine.profile.currentSector, 1, 'Current sector is 1');

      // Check localStorage persistence via getActiveProfile()
      const savedProfile = getActiveProfile();
      assert.ok(savedProfile);
      assert.equal(savedProfile.stageProgress['1-1']?.completed, true);
      assert.equal(savedProfile.stageProgress['1-2'] !== undefined, true, 'Stage 1-2 is saved to storage');
      assert.equal(savedProfile.currentStage, 2);
    });

    it('Winning Stage 1-5 unlocks Sector 2 Stage 1 (2-1)', () => {
      engine.startStage(1, 5);

      while (engine.state.aliens.length > 0) {
        const alien = engine.state.aliens[0];
        (engine as any).handleAlienDefeated(alien, 0);
      }
      (engine as any).update(0.016);

      assert.equal(engine.profile.stageProgress['1-5']?.completed, true);
      assert.equal(engine.profile.stageProgress['2-1'] !== undefined, true, 'Sector 2 Stage 1 is unlocked');
      assert.equal(engine.profile.currentSector, 2);
      assert.equal(engine.profile.currentStage, 1);
    });

    it('updateActiveProfile guarantees active profile ID is always stored in localStorage', () => {
      const p2 = createNewProfile('Kid Pilot', '🤖', 1);
      updateActiveProfile(p2);

      const active = getActiveProfile();
      assert.ok(active);
      assert.equal(active.id, p2.id);
      assert.equal(active.name, 'Kid Pilot');
    });

    it('loadProfiles auto-migrates missing or empty stageProgress to include 1-1', () => {
      const legacyRaw = [{
        id: 'legacy_pilot',
        name: 'Old Pilot',
        avatar: '🚀',
        gradeLevel: 2,
        coins: 10,
        diamonds: 1
      }];
      mockStorage.setItem('math_invaders_profiles_v1', JSON.stringify(legacyRaw));

      const loaded = loadProfiles();
      assert.equal(loaded.length, 1);
      assert.ok(loaded[0].stageProgress['1-1'], 'Auto-migrates 1-1 stageProgress');
      assert.equal(loaded[0].stageProgress['1-1'].completed, false);
      assert.equal(loaded[0].currentSector, 1);
      assert.equal(loaded[0].currentStage, 1);
    });
  });

  describe('3. Star Map Modal Touch Accessibility & Safe Rendering', () => {
    it('Renders Star Map without throwing even if stageProgress is initially empty', () => {
      const mockContainer = {
        innerHTML: '',
        querySelectorAll: () => []
      } as unknown as HTMLElement;

      const emptyProf = { ...profile, stageProgress: {} as any };
      const starMap = new StarMapModal(mockContainer, emptyProf, () => {});
      assert.doesNotThrow(() => {
        starMap.render();
      });
      assert.ok(mockContainer.innerHTML.includes('stage-node'));
      assert.ok(mockContainer.innerHTML.includes('unlocked current'));
    });
  });
});
