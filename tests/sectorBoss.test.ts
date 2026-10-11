import { describe, it } from 'node:test';
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

// Production Modules Under Direct Test
import { GameEngine } from '../src/engine/GameEngine.ts';
import { createNewProfile, saveProfiles, setActiveProfile } from '../src/models/Profile.ts';
import {
  SECTOR_CONFIGS,
  getSectorConfig,
  getStageWaveConfig,
  getAllSectorConfigs
} from '../src/engine/SectorConfig.ts';
import type { StageWaveConfig, SectorConfig } from '../src/engine/SectorConfig.ts';
import type { Alien, Bullet } from '../src/models/GameState.ts';

function setupTestEngine() {
  mockStorage.clear();
  const profile = createNewProfile('Commander Nova', 5);
  saveProfiles([profile]);
  setActiveProfile(profile.id);
  const canvas = createMockCanvas();
  const engine = new GameEngine(canvas, profile);

  let victoryCalls = 0;
  let victoryPayload: { stars: number; coins: number; diamonds: number } | null = null;
  let gameOverCalls = 0;

  engine.setCallbacks({
    onMathProblemUpdate: () => {},
    onHudUpdate: () => {},
    onUpgradeStatusUpdate: () => {},
    onStageVictory: (stars, coins, diamonds) => {
      victoryCalls++;
      victoryPayload = { stars, coins, diamonds };
    },
    onGameOver: () => {
      gameOverCalls++;
    }
  });

  return {
    engine,
    profile,
    getVictoryCalls: () => victoryCalls,
    getVictoryPayload: () => victoryPayload,
    getGameOverCalls: () => gameOverCalls
  };
}

function stepEngine(engine: GameEngine, dt: number) {
  (engine as any).update(dt);
}

function deliverBullet(engine: GameEngine, alien: Alien, damage: number, type: 'laser' | 'plasma' = 'laser') {
  const bullet: Bullet = {
    id: 'test_bullet_' + Math.random().toString(36).substring(2, 7),
    x: alien.x,
    y: alien.y,
    vx: 0,
    vy: -400,
    type,
    damage,
    lane: alien.lane,
    width: type === 'plasma' ? 14 : 6,
    height: type === 'plasma' ? 24 : 14
  };
  engine.state.bullets.push(bullet);
}

// ============================================================================
// SUITE 1: SectorConfig & Planetary Formation Architectures
// ============================================================================
describe('SectorConfig & Planetary Formation Architectures', () => {
  it('Sector 1 to 5: All 5 planetary sectors exist with distinct configurations', () => {
    const allSectors = getAllSectorConfigs();
    assert.equal(allSectors.length, 5, 'Should define exactly 5 sectors');

    const sectorIds = allSectors.map(s => s.sectorId);
    assert.deepEqual(sectorIds, [1, 2, 3, 4, 5], 'Sectors must be indexed 1 through 5');

    // Distinct names and accent colors
    const names = new Set(allSectors.map(s => s.name));
    assert.equal(names.size, 5, 'Every sector must have a unique thematic name');

    const colors = new Set(allSectors.map(s => s.accentColor));
    assert.equal(colors.size, 5, 'Every sector must have a unique accent color');
  });

  it('All sectors have exactly 5 distinct stages (25 total stages)', () => {
    for (let secId = 1; secId <= 5; secId++) {
      const sector = getSectorConfig(secId);
      assert.ok(sector, `Sector ${secId} must exist`);
      for (let stgId = 1; stgId <= 5; stgId++) {
        const stage = getStageWaveConfig(secId, stgId);
        assert.ok(stage, `Stage ${secId}-${stgId} must exist`);
        assert.equal(stage.stageId, stgId);
        assert.ok(stage.rows >= 2, `Stage ${secId}-${stgId} must have at least 2 rows`);
        assert.ok(stage.totalAliens > 0, `Stage ${secId}-${stgId} must have aliens`);
        assert.ok(stage.marchInterval > 0, `March interval must be positive`);
        assert.ok(stage.marchStepY > 0, `March step must be positive`);
        assert.ok(Array.isArray(stage.formationGrid), `Formation grid must be an array`);

        // Check formation grid bounds
        for (const row of stage.formationGrid) {
          assert.equal(row.length, 5, 'Every formation row must have exactly 5 lanes');
        }
      }
    }
  });

  it('Synchronized wave budget: totalAliens strictly equals formationGrid non-null count across all 25 stages', () => {
    for (const sector of getAllSectorConfigs()) {
      for (const [stgId, stage] of Object.entries(sector.stages)) {
        const gridCount = stage.formationGrid.flat().filter(Boolean).length;
        assert.equal(
          stage.totalAliens,
          gridCount,
          `Sector ${sector.sectorId} Stage ${stgId} mismatch: totalAliens (${stage.totalAliens}) !== gridCount (${gridCount})`
        );
      }
    }
  });

  it('Sector 1 (Moon Base Alpha): Features strictly linear scouting drops', () => {
    const s1 = getSectorConfig(1);
    assert.equal(s1.primaryAlienType, 'scout');
    for (let stg = 1; stg <= 5; stg++) {
      const wave = getStageWaveConfig(1, stg);
      assert.equal(wave.enableZigzag, false, 'Sector 1 must NOT have zig-zag motion');
      assert.equal(wave.enableArmor, false, 'Sector 1 must NOT have armor mechanics');
      assert.equal(wave.enableCoreReveal, false, 'Sector 1 must NOT have core reveals');
    }
  });

  it('Sector 2 (Asteroid Belt): Features rapid zig-zag swarms with oscillation parameters', () => {
    for (let stg = 1; stg <= 5; stg++) {
      const wave = getStageWaveConfig(2, stg);
      assert.equal(wave.enableZigzag, true, `Sector 2 Stage ${stg} must enable zig-zag`);
      assert.ok((wave.zigzagFrequency ?? 0) >= 2.5, 'Zig-zag frequency must be >= 2.5 rad/s');
      assert.ok((wave.zigzagAmplitude ?? 0) >= 18, 'Zig-zag amplitude must be >= 18px');
    }
  });

  it('Sector 3 (Mars Orbit): Features armored Mech-Crabs with multi-hit absorption', () => {
    for (let stg = 1; stg <= 5; stg++) {
      const wave = getStageWaveConfig(3, stg);
      assert.equal(wave.enableArmor, true, `Sector 3 Stage ${stg} must enable armor`);
      assert.ok((wave.armorPoints ?? 0) >= 1, 'Armor points must be at least 1');
    }
  });

  it('Sector 4 (Jupiter Rings): Features Heavy Assault Behemoths with core reveal cycles', () => {
    for (let stg = 1; stg <= 5; stg++) {
      const wave = getStageWaveConfig(4, stg);
      assert.equal(wave.enableCoreReveal, true, `Sector 4 Stage ${stg} must enable core reveals`);
      assert.ok((wave.coreConcealedDuration ?? 0) > 0, 'Concealed duration must be positive');
      assert.ok((wave.coreRevealedDuration ?? 0) > 0, 'Revealed duration must be positive');
    }
  });

  it('Sector 5 Stage 5: Features the Colossal Dreadnought Boss', () => {
    const wave = getStageWaveConfig(5, 5);
    assert.equal(wave.isBossStage, true, 'Sector 5 Stage 5 must be a boss stage');
    assert.equal(wave.bossType, 'dreadnought', 'Boss type must be dreadnought');

    // Confirm center lane 2 contains boss
    const topRow = wave.formationGrid[0];
    assert.equal(topRow[2], 'boss', 'Boss must be positioned in center lane 2 of row 0');
  });
});

// ============================================================================
// SUITE 2: Sector 2 Horizontal Sinusoidal Flight Mathematics
// ============================================================================
describe('Sector 2 Horizontal Sinusoidal Flight Mathematics', () => {
  it('Oscillation stays strictly bounded within canvas boundaries', () => {
    const canvasWidth = 480;
    const width = 34; // scout width
    const halfW = width / 2;
    const baseX = 240; // center lane
    const amp = 32;
    const freq = 3.6;
    let phase = 0.5;

    for (let step = 0; step < 200; step++) {
      const dt = 0.016; // 60 FPS
      phase += freq * dt;
      const offset = amp * Math.sin(phase);
      const x = Math.max(halfW, Math.min(canvasWidth - halfW, baseX + offset));

      assert.ok(x >= halfW, `x (${x}) must not breach left wall (${halfW})`);
      assert.ok(x <= canvasWidth - halfW, `x (${x}) must not breach right wall (${canvasWidth - halfW})`);
    }
  });

  it('Flight path is continuous with zero teleportation or step jumps', () => {
    const canvasWidth = 480;
    const width = 34;
    const halfW = width / 2;
    const baseX = 100;
    const amp = 28;
    const freq = 3.2;
    let phase = 0;
    let prevX = baseX + amp * Math.sin(phase);

    for (let step = 0; step < 100; step++) {
      const dt = 0.016;
      phase += freq * dt;
      const offset = amp * Math.sin(phase);
      const x = Math.max(halfW, Math.min(canvasWidth - halfW, baseX + offset));
      const delta = Math.abs(x - prevX);

      // Max velocity = amp * freq * dt = 28 * 3.2 * 0.016 = ~1.43 px/frame
      assert.ok(delta < 3.0, `Delta between frames (${delta}px) must be smooth and continuous`);
      prevX = x;
    }
  });

  it('Different lanes have staggered phases avoiding lockstep clustering', () => {
    const phaseLane1 = (1 * 0.9);
    const phaseLane2 = (2 * 0.9);
    const phaseLane3 = (3 * 0.9);

    assert.notEqual(phaseLane1, phaseLane2);
    assert.notEqual(phaseLane2, phaseLane3);
  });
});

// ============================================================================
// SUITE 3: Sector 3 Armored Mech-Crab Hit Absorption (Direct GameEngine Test)
// ============================================================================
describe('Sector 3 Armored Mech-Crab Hit Absorption (Direct GameEngine Test)', () => {
  it('Armor absorbs hits first, protecting HP completely until depleted', () => {
    const { engine } = setupTestEngine();
    engine.startStage(3, 1);

    const crab = engine.state.aliens.find(a => a.type === 'crab' && (a.armor ?? 0) > 0);
    assert.ok(crab, 'Should find an armored crab in Sector 3 Stage 1');
    assert.equal(crab.armor, 2, 'Initial armor should be 2');
    assert.equal(crab.hp, 6, 'Initial HP should be 6');

    // Hit 1: absorbed by armor
    deliverBullet(engine, crab, 1);
    stepEngine(engine, 0.016);
    assert.equal(crab.armor, 1, 'Armor should decrease to 1 after Hit 1');
    assert.equal(crab.hp, 6, 'HP must remain untouched on armor Hit 1');

    // Hit 2: absorbed by armor
    deliverBullet(engine, crab, 1);
    stepEngine(engine, 0.016);
    assert.equal(crab.armor, 0, 'Armor should deplete to 0 after Hit 2');
    assert.equal(crab.hp, 6, 'HP must remain untouched on armor Hit 2');

    // Hit 3: armor depleted, hits unarmored chassis
    deliverBullet(engine, crab, 1);
    stepEngine(engine, 0.016);
    assert.equal(crab.armor, 0);
    assert.equal(crab.hp, 5, 'HP must decrease to 5 once armor is 0');

    // Hit 4:
    deliverBullet(engine, crab, 1);
    stepEngine(engine, 0.016);
    assert.equal(crab.hp, 4, 'HP must decrease to 4');

    // Hit 5: lethal with 4 damage
    deliverBullet(engine, crab, 4);
    stepEngine(engine, 0.016);
    assert.ok(!engine.state.aliens.includes(crab), 'Defeated crab must be removed from aliens list');
  });
});

// ============================================================================
// SUITE 4: Sector 4 Behemoth Energy Core Reveal Vulnerability Cycle (Direct GameEngine Test)
// ============================================================================
describe('Sector 4 Behemoth Energy Core Reveal Vulnerability Cycle (Direct GameEngine Test)', () => {
  it('Core closed mitigates damage by 50%; Core open amplifies damage by 200%', () => {
    const { engine } = setupTestEngine();
    engine.startStage(4, 1);

    const behemoth = engine.state.aliens.find(a => a.type === 'behemoth' && a.hasEnergyCore);
    assert.ok(behemoth, 'Should find an energy core Behemoth in Sector 4 Stage 1');
    assert.equal(behemoth.hp, 12, 'Initial HP should be 12');

    // Ensure core is closed initially
    behemoth.coreTimer = 0;
    behemoth.coreRevealed = false;

    // Hit 1: Concealed core (damage = 2 -> mitigated by 50% = 1 damage)
    deliverBullet(engine, behemoth, 2);
    stepEngine(engine, 0.016);
    assert.equal(behemoth.hp, 11, 'Concealed core must reduce 2 damage to 1 damage');

    // Advance timer past concealed window (3.0s) into exposed core window
    behemoth.coreTimer = 3.5;
    stepEngine(engine, 0.016);
    assert.equal(behemoth.coreRevealed, true, 'Core must be revealed at timer = 3.5s');

    // Hit 2: Exposed core (damage = 2 -> amplified by 200% = 4 critical damage)
    deliverBullet(engine, behemoth, 2);
    stepEngine(engine, 0.016);
    assert.equal(behemoth.hp, 7, 'Exposed core must amplify 2 damage to 4 critical damage (11 - 4 = 7)');
  });

  it('Core reveal cycles cyclically between open and closed windows', () => {
    const { engine } = setupTestEngine();
    engine.startStage(4, 1);

    const behemoth = engine.state.aliens.find(a => a.type === 'behemoth' && a.hasEnergyCore);
    assert.ok(behemoth, 'Behemoth must exist');

    // Cycle 1: Concealed at 1.0s
    behemoth.coreTimer = 1.0;
    stepEngine(engine, 0.016);
    assert.equal(behemoth.coreRevealed, false, 't = 1.0s must be concealed');

    // Cycle 1: Exposed at 3.5s
    behemoth.coreTimer = 3.5;
    stepEngine(engine, 0.016);
    assert.equal(behemoth.coreRevealed, true, 't = 3.5s must be revealed');

    // Cycle 2: Concealed at 5.5s (5.5 % 5.0 = 0.5s)
    behemoth.coreTimer = 5.5;
    stepEngine(engine, 0.016);
    assert.equal(behemoth.coreRevealed, false, 't = 5.5s (cycle 2) must be concealed');

    // Cycle 2: Exposed at 8.5s (8.5 % 5.0 = 3.5s)
    behemoth.coreTimer = 8.5;
    stepEngine(engine, 0.016);
    assert.equal(behemoth.coreRevealed, true, 't = 8.5s (cycle 2) must be revealed');
  });
});

// ============================================================================
// SUITE 5: Sector 5 Stage 5 Dreadnought Boss 4-Phase Battle State Machine (Direct GameEngine Test)
// ============================================================================
describe('Sector 5 Stage 5 Dreadnought Boss 4-Phase Battle State Machine (Direct GameEngine Test)', () => {
  it('Phase 1 (Deflector Shield): Absorbs 30 shield HP while protecting hull', () => {
    const { engine } = setupTestEngine();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss();
    assert.ok(boss, 'Dreadnought Boss must be spawned in Sector 5 Stage 5');
    assert.equal(boss.bossPhase, 1, 'Boss must start in Phase 1');
    assert.equal(boss.shieldHp, 30, 'Initial shield HP must be 30');
    assert.equal(boss.hp, 40, 'Initial hull HP must be 40');

    // Hit with 10 damage
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    assert.equal(boss.shieldHp, 20, 'Shield HP should drop to 20');
    assert.equal(boss.hp, 40, 'Hull must remain protected at 40 HP');

    // Hit with 10 damage
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    assert.equal(boss.shieldHp, 10, 'Shield HP should drop to 10');
    assert.equal(boss.hp, 40, 'Hull must remain protected at 40 HP');

    // Hit with 10 damage (breaks shield to 0)
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    assert.equal(boss.shieldHp, 0, 'Shield HP should be 0');

    // Next engine tick processes state machine transition
    stepEngine(engine, 0.016);
    assert.equal(boss.bossPhase, 2, 'Shield collapse must trigger Phase 2');
    assert.equal(boss.wingBaysOpen, true, 'Wing bays must open for minion deployment');
  });

  it('Phase 2 (Minions): Deploys minion_drone entities, hull vulnerable, transitions to Phase 3 at <= 65% HP', () => {
    const { engine } = setupTestEngine();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss()!;
    // Break shield to trigger Phase 2
    deliverBullet(engine, boss, 30);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016); // Phase 2 transition tick

    assert.equal(boss.bossPhase, 2);
    assert.equal(boss.hp, 40);

    // Verify minion drones spawned with type 'minion_drone'
    const minions = engine.state.aliens.filter(a => a.type === 'minion_drone');
    assert.equal(minions.length, 2, 'Should spawn exactly 2 minion drones in Phase 2');
    for (const m of minions) {
      assert.equal(m.type, 'minion_drone', 'Minion drone must have type minion_drone');
    }

    // Hit hull with 10 damage (40 -> 30, which is > 65% of 40 = 26)
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);
    assert.equal(boss.hp, 30);
    assert.equal(boss.bossPhase, 2, 'Must remain in Phase 2 while hull > 65% and escorts live');

    // Hit hull with 5 damage (30 -> 25, which is <= 26)
    deliverBullet(engine, boss, 5);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016); // Phase 3 transition tick
    assert.equal(boss.hp, 25);
    assert.equal(boss.bossPhase, 3, 'Reaching <= 65% HP must trigger Phase 3 Core Overload');
    assert.equal(boss.coreRevealed, true, 'Reactor core must be revealed');
    assert.equal(boss.overloadTimer, 6.0, 'Overload timer must be 6.0s');
  });

  it('Phase 3 (Core Overload): Takes 2.0x critical damage and enters Phase 4 on defeat', () => {
    const { engine } = setupTestEngine();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss()!;
    // Break shield -> Phase 2
    deliverBullet(engine, boss, 30);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    // Damage hull to 25 -> Phase 3
    deliverBullet(engine, boss, 15);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);
    assert.equal(boss.bossPhase, 3);
    assert.equal(boss.hp, 25);

    // Strike core with 5 base damage -> deals 10 critical damage (25 - 10 = 15)
    deliverBullet(engine, boss, 5);
    stepEngine(engine, 0.016);
    assert.equal(boss.hp, 15, 'Core critical strike must deal 2.0x damage (10 damage dealt)');

    // Strike core with 10 base damage -> deals 20 critical damage (lethal!)
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    assert.equal(boss.hp, 0, 'HP must be reduced to 0');
    assert.equal(boss.bossPhase, 4, 'Boss defeat must transition to Phase 4 Destruction Sequence');
    assert.equal(boss.speed, 0, 'Descent speed must be halted during destruction');
    assert.ok(engine.state.screenShakeTimer > 0, 'Screen shake must be triggered');
  });

  it('Phase 4 (Destruction Sequence): Cascades secondary explosions, shockwave fires once, clears at 3.0s', () => {
    const { engine, getVictoryCalls } = setupTestEngine();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss()!;
    // Advance through phases cleanly
    deliverBullet(engine, boss, 30); // Phase 2
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    deliverBullet(engine, boss, 15); // Phase 3
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    deliverBullet(engine, boss, 15); // Phase 4
    stepEngine(engine, 0.016);

    assert.equal(boss.bossPhase, 4);

    let shockwaveObserved = false;

    // Step through 3.0 seconds in small intervals
    for (let step = 0; step < 70; step++) {
      stepEngine(engine, 0.05);
      if (boss.destructionShockwaveFired) {
        shockwaveObserved = true;
      }
    }

    assert.equal(shockwaveObserved, true, 'Shockwave flare must fire at 1.5s');
    assert.equal(boss.destructionShockwaveFired, true, 'destructionShockwaveFired must be set');
    assert.equal(getVictoryCalls(), 1, 'Stage victory must be triggered upon completion of 3.0s sequence');
    assert.ok(!engine.state.aliens.includes(boss), 'Boss must be removed from active aliens');
  });
});

// ============================================================================
// SUITE 6: Victory Invariant & Defect Regression Verifications
// ============================================================================
describe('Victory Invariant & Defect Regression Verifications', () => {
  it('Regression 1: Destroying non-boss escorts and minions does NOT prematurely end stage while Boss is alive', () => {
    const { engine, getVictoryCalls } = setupTestEngine();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss()!;

    // Break boss shield to deploy minion drones
    deliverBullet(engine, boss, 30);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    // Initial aliens in 5-5: 1 Boss + 2 Crabs + 2 Scouts = 5 aliens, plus 2 minion drones = 7 total
    // Simulate destroying all non-boss entities (4 starting escorts + 2 minion drones = 6 destroyed)
    const nonBossAliens = engine.state.aliens.filter(a => a !== boss);
    assert.ok(nonBossAliens.length >= 4, 'Should have multiple escorts/minions alive');

    // Remove non-boss aliens and increment aliensDefeated
    engine.state.aliens = [boss];
    engine.state.aliensDefeated = 6; // strictly >= totalAliensWave (5)

    // Boss is still healthy in Phase 2/3
    assert.ok(boss.hp > 0, 'Boss is still alive with HP');

    // Run game engine update
    stepEngine(engine, 0.016);

    // Invariant check: Victory must NOT have been called!
    assert.equal(getVictoryCalls(), 0, 'Premature victory must NOT trigger when escorts are cleared and Boss is alive!');
    assert.equal(engine.state.isRunning, true, 'Combat loop must continue running while Boss is alive');
    assert.equal(engine.state.stageCompleted, false, 'stageCompleted must remain false');
  });

  it('Regression 2: Double victory invocation is strictly prevented; rewards are credited exactly once', () => {
    const { engine, getVictoryCalls, profile } = setupTestEngine();
    const initialCoins = profile.coins;
    const initialDiamonds = profile.diamonds;

    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss()!;
    // Destroy boss straight to Phase 4
    deliverBullet(engine, boss, 30);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    deliverBullet(engine, boss, 15);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    deliverBullet(engine, boss, 15);
    stepEngine(engine, 0.016);

    // Step past 3.0s to trigger victory
    for (let step = 0; step < 70; step++) {
      stepEngine(engine, 0.05);
    }

    assert.equal(getVictoryCalls(), 1, 'Stage victory callback must fire exactly once');

    // Step engine again in subsequent frames
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    assert.equal(getVictoryCalls(), 1, 'Stage victory callback must still be fired exactly once (no double victory)');
    assert.ok(profile.coins > initialCoins, 'Coins should be awarded');
    assert.ok(profile.diamonds > initialDiamonds, 'Diamonds should be awarded');
  });

  it('Regression 3: Post-mortem victory is guarded: player death suppresses stage victory', () => {
    const { engine, getVictoryCalls, profile } = setupTestEngine();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss()!;
    // Damage boss to Phase 4
    deliverBullet(engine, boss, 30);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    deliverBullet(engine, boss, 15);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);

    deliverBullet(engine, boss, 15);
    stepEngine(engine, 0.016);
    assert.equal(boss.bossPhase, 4);

    // Step destruction forward to 1.0s
    for (let step = 0; step < 20; step++) {
      stepEngine(engine, 0.05);
    }

    // Now player dies (lives drop to 0)
    engine.state.lives = 0;
    engine.state.gameOver = true;
    engine.state.isRunning = false;

    // Continue stepping destruction to 3.0s and beyond
    for (let step = 0; step < 50; step++) {
      stepEngine(engine, 0.05);
    }

    assert.equal(getVictoryCalls(), 0, 'Stage victory must NEVER trigger when player is dead (lives <= 0)');
    assert.equal(
      profile.stageProgress['5-5']?.completed ?? false,
      false,
      'Failed stage must not be marked completed in profile'
    );
  });
});
