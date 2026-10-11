/**
 * Adversarial Boss Challenge Test Suite
 * Author: challenger_m2_iter2_2
 *
 * Exhaustive empirical challenge harness for Mechanical Dreadnought Boss (Sector 5 Stage 5):
 * 1. 5-Escort Defeat Victory Guard (No premature victory while Dreadnought Boss is alive).
 * 2. 4-Phase Transition Mechanics:
 *    Phase 1 Shield (30 HP) -> Phase 2 Minions -> Phase 3 Core Overload (2.0x crit) -> Phase 4 Destruction (3.0s).
 * 3. Exactly 1 shockwave flare burst at 1.5s under normal, micro-dt, large frame drop, and erratic dt.
 * 4. Zero double victory calls and zero post-mortem victory calls on player death.
 */

// Headless Environment Setup
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
import type { Alien, Bullet } from '../src/models/GameState.ts';

interface ChallengeResult {
  code: string;
  name: string;
  passed: boolean;
  message: string;
  error?: string;
}

const challengeResults: ChallengeResult[] = [];

function assertChallenge(code: string, name: string, condition: boolean, message: string, error?: string) {
  challengeResults.push({ code, name, passed: condition, message, error });
  const icon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${code}] ${name} -> ${message}${error ? ` | Error: ${error}` : ''}`);
}

function createHarness(profileName = 'Challenger Alpha') {
  mockStorage.clear();
  const profile = createNewProfile(profileName, '🛡️', 5);
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

function step(engine: GameEngine, dt: number) {
  (engine as any).update(dt);
}

function fireBulletAt(engine: GameEngine, target: Alien, damage: number, type: 'laser' | 'plasma' = 'laser') {
  const bullet: Bullet = {
    id: 'b_' + Math.random().toString(36).substring(2, 7),
    x: target.x,
    y: target.y,
    vx: 0,
    vy: -400,
    type,
    damage,
    lane: target.lane,
    width: type === 'plasma' ? 14 : 6,
    height: type === 'plasma' ? 24 : 14
  };
  engine.state.bullets.push(bullet);
}

async function runAdversarialChallenge() {
  console.log('================================================================================');
  console.log('   ADVERSARIAL STRESS CHALLENGE: MECHANICAL DREADNOUGHT BOSS BATTLE (S5-S5)     ');
  console.log('================================================================================\n');

  // ============================================================================
  // CHALLENGE SECTION 1: 5-ESCORT DEFEAT VICTORY GUARD
  // ============================================================================
  console.log('--- SECTION 1: 5-ESCORT DEFEAT VICTORY GUARD (BOSS ALIVE) ---');

  // Test 1.1: Sector 5 Stage 5 initial composition
  {
    const { engine } = createHarness();
    engine.startStage(5, 5);

    const boss = engine.state.getActiveBoss();
    const escorts = engine.state.aliens.filter(a => a !== boss);

    assertChallenge(
      'CH1.1',
      'Sector 5 Stage 5 Initial Composition',
      Boolean(boss && escorts.length === 4 && engine.state.totalAliensWave === 5),
      `Boss: ${Boolean(boss)}, Initial Escorts: ${escorts.length}, Wave Budget: ${engine.state.totalAliensWave}`
    );
  }

  // Test 1.2: Defeating all 4 initial escorts does NOT trigger victory while Boss is alive
  {
    const { engine, getVictoryCalls } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;

    // Destroy 4 initial escorts (crabs have armor, so fire until defeated)
    const escorts = engine.state.aliens.filter(a => a !== boss);
    for (const escort of escorts) {
      while (engine.state.aliens.includes(escort)) {
        fireBulletAt(engine, escort, 10);
        step(engine, 0.016);
      }
    }

    assertChallenge(
      'CH1.2',
      'Defeating 4 Initial Escorts',
      engine.state.aliens.length === 1 && engine.state.aliens[0] === boss && engine.state.aliensDefeated === 4,
      `Aliens Remaining: ${engine.state.aliens.length}, Defeated Count: ${engine.state.aliensDefeated}`
    );

    // Simulate 120 frames (2.0s) of active combat while Boss is alive
    for (let f = 0; f < 120; f++) {
      step(engine, 0.016);
    }

    assertChallenge(
      'CH1.3',
      'No Victory Fired After 4 Escorts Cleared',
      getVictoryCalls() === 0 && engine.state.isRunning === true && engine.state.stageCompleted === false,
      `Victory Calls: ${getVictoryCalls()}, isRunning: ${engine.state.isRunning}, stageCompleted: ${engine.state.stageCompleted}`
    );
  }

  // Test 1.3: Defeating 5 escorts (4 escorts + 1 deployed minion drone) reaches wave budget (5) -> Boss alive
  {
    const { engine, getVictoryCalls } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;

    // Deplete boss shield to trigger Phase 2 and deploy minion drones
    fireBulletAt(engine, boss, 30);
    step(engine, 0.016);
    step(engine, 0.016); // Phase 2 triggered -> minion drones deployed

    const allNonBoss = engine.state.aliens.filter(a => a !== boss);
    assertChallenge(
      'CH1.4',
      'Phase 2 Minion Drones Deployed Alongside Escorts',
      allNonBoss.length >= 6 && boss.wingBaysOpen === true,
      `Non-Boss Aliens Count: ${allNonBoss.length}, WingBaysOpen: ${boss.wingBaysOpen}`
    );

    // Eliminate 5 non-boss enemies (4 original escorts + minion drones)
    let defeatedEscorts = 0;
    while (defeatedEscorts < 5) {
      const escort = engine.state.aliens.find(a => a !== boss);
      if (!escort) break;
      while (engine.state.aliens.includes(escort)) {
        fireBulletAt(engine, escort, 20);
        step(engine, 0.016);
      }
      defeatedEscorts++;
    }

    assertChallenge(
      'CH1.5',
      'Exactly 5 Escort Enemies Defeated',
      engine.state.aliensDefeated >= 5 && boss.hp > 0,
      `Defeated Count: ${engine.state.aliensDefeated} (>= totalAliensWave 5), Boss HP: ${boss.hp}`
    );

    // Invariant Check: Run 150 frames of engine update
    for (let f = 0; f < 150; f++) {
      step(engine, 0.016);
    }

    assertChallenge(
      'CH1.6',
      'No Victory Fired When Defeated Count Reaches/Exceeds Wave Budget While Boss Lives',
      getVictoryCalls() === 0 && engine.state.stageCompleted === false,
      `Victory Calls: ${getVictoryCalls()}, stageCompleted: ${engine.state.stageCompleted}`
    );
  }

  // Test 1.4: Extreme Escort Trap: 10 escorts defeated, boss has 1 HP in Phase 3
  {
    const { engine, getVictoryCalls } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    boss.bossPhase = 3;
    boss.hp = 1;
    engine.state.aliens = [boss];
    engine.state.aliensDefeated = 10; // Double the wave budget

    for (let f = 0; f < 60; f++) {
      step(engine, 0.016);
    }

    assertChallenge(
      'CH1.7',
      'Extreme Escort Trap (10 Defeated, Boss at 1 HP)',
      getVictoryCalls() === 0 && engine.state.stageCompleted === false,
      `Victory Calls: ${getVictoryCalls()}, stageCompleted: ${engine.state.stageCompleted}`
    );
  }

  // ============================================================================
  // CHALLENGE SECTION 2: 4-PHASE STATE MACHINE TRANSITIONS & DAMAGE MATH
  // ============================================================================
  console.log('\n--- SECTION 2: 4-PHASE STATE MACHINE & DAMAGE SCALING ---');

  // Test 2.1: Phase 1 Deflector Shield exact absorption
  {
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;

    // Initial state
    assertChallenge(
      'CH2.1',
      'Phase 1 Initialization: Shield 30 HP, Hull 40 HP',
      boss.bossPhase === 1 && boss.shieldHp === 30 && boss.hp === 40,
      `Phase: ${boss.bossPhase}, Shield: ${boss.shieldHp}/30, HP: ${boss.hp}/40`
    );

    // Hit with 12 damage bullet
    fireBulletAt(engine, boss, 12);
    step(engine, 0.016);
    assertChallenge(
      'CH2.2',
      'Shield Absorbs 12 Damage -> 18 Shield, Hull Protected at 40',
      boss.shieldHp === 18 && boss.hp === 40,
      `Shield: ${boss.shieldHp}, HP: ${boss.hp}`
    );

    // Hit with 18 damage bullet (exactly depletes shield to 0)
    fireBulletAt(engine, boss, 18);
    step(engine, 0.016);
    assertChallenge(
      'CH2.3',
      'Shield Reduced to Exactly 0, Hull Remains 40',
      boss.shieldHp === 0 && boss.hp === 40,
      `Shield: ${boss.shieldHp}, HP: ${boss.hp}`
    );

    // Next engine tick triggers Phase 2
    step(engine, 0.016);
    assertChallenge(
      'CH2.4',
      'Phase 1 -> Phase 2 Transition upon Shield Zero',
      boss.bossPhase === 2 && boss.wingBaysOpen === true && boss.minionsSpawned === true,
      `Phase: ${boss.bossPhase}, WingBaysOpen: ${boss.wingBaysOpen}, MinionsSpawned: ${boss.minionsSpawned}`
    );
  }

  // Test 2.2: Phase 2 -> Phase 3 Transition Trigger Paths
  {
    // Path A: Hull damage threshold (HP <= 65% of maxHp 40 = 26)
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    boss.shieldHp = 0;
    boss.bossPhase = 2;

    // Deal 14 damage (40 -> 26, exactly 65%)
    fireBulletAt(engine, boss, 14);
    step(engine, 0.016);
    step(engine, 0.016);

    assertChallenge(
      'CH2.5',
      'Phase 2 -> Phase 3 Transition at Exactly 65% Hull (26 HP)',
      boss.bossPhase === 3 && boss.coreRevealed === true && boss.overloadTimer === 6.0,
      `Phase: ${boss.bossPhase}, HP: ${boss.hp}, CoreRevealed: ${boss.coreRevealed}, OverloadTimer: ${boss.overloadTimer}`
    );
  }
  {
    // Path B: Clearing all escort enemies while Hull is at 100% (40 HP)
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    boss.shieldHp = 0;
    boss.bossPhase = 2;
    boss.hp = 40;

    // Wipe escorts
    engine.state.aliens = [boss];
    step(engine, 0.016);

    assertChallenge(
      'CH2.6',
      'Phase 2 -> Phase 3 Transition when Escorts Cleared at Full Hull',
      boss.bossPhase === 3 && boss.coreRevealed === true && boss.hp === 40,
      `Phase: ${boss.bossPhase}, CoreRevealed: ${boss.coreRevealed}, HP: ${boss.hp}`
    );
  }

  // Test 2.3: Phase 3 Core Overload 2.0x Critical Damage Scaling
  {
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    boss.shieldHp = 0;
    boss.bossPhase = 2;
    boss.hp = 40;
    engine.state.aliens = [boss]; // Escorts cleared -> triggers Phase 3
    step(engine, 0.016); // Enters Phase 3 with overloadTimer = 6.0, coreRevealed = true

    // Jam weapon so continuous base defense shot doesn't alter exact discrete damage measurements
    engine.state.weaponJamTimer = 10.0;

    // Test with base damage 1 (1 * 2.0 = 2 damage)
    fireBulletAt(engine, boss, 1);
    step(engine, 0.016);
    assertChallenge(
      'CH2.7',
      'Phase 3 Crit: Base 1 Damage -> 2 Damage Dealt',
      boss.hp === 38,
      `HP: ${boss.hp} (expected 38)`
    );

    // Test with base damage 7 (7 * 2.0 = 14 damage)
    fireBulletAt(engine, boss, 7);
    step(engine, 0.016);
    assertChallenge(
      'CH2.8',
      'Phase 3 Crit: Base 7 Damage -> 14 Damage Dealt',
      boss.hp === 24,
      `HP: ${boss.hp} (expected 24)`
    );

    // Lethal damage to transition to Phase 4
    // HP is 24, bullet of 12 deals 24 damage -> 0 HP
    fireBulletAt(engine, boss, 12);
    step(engine, 0.016);
    assertChallenge(
      'CH2.9',
      'Phase 3 -> Phase 4 Transition on Lethal Damage',
      boss.bossPhase === 4 && boss.hp === 0 && boss.speed === 0 && boss.destructionTimer === 0,
      `Phase: ${boss.bossPhase}, HP: ${boss.hp}, Speed: ${boss.speed}, Timer: ${boss.destructionTimer}`
    );
  }

  // Test 2.4: Phase 4 3.0s Destruction Sequence Timeline
  {
    const { engine, getVictoryCalls } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);

    // Step to t = 2.90s
    for (let i = 0; i < 29; i++) {
      step(engine, 0.1);
    }

    assertChallenge(
      'CH2.10',
      'Destruction at t = 2.90s (Boss Still Present, Victory Not Yet Fired)',
      engine.state.aliens.includes(boss) && getVictoryCalls() === 0,
      `Boss In Aliens: ${engine.state.aliens.includes(boss)}, Victory Calls: ${getVictoryCalls()}, Timer: ${boss.destructionTimer?.toFixed(2)}`
    );

    // Step across 3.0s boundary (t = 3.00s)
    step(engine, 0.1);

    assertChallenge(
      'CH2.11',
      'Destruction at t >= 3.00s (Boss Removed, Stage Victory Fired)',
      !engine.state.aliens.includes(boss) && getVictoryCalls() === 1,
      `Boss Removed: ${!engine.state.aliens.includes(boss)}, Victory Calls: ${getVictoryCalls()}, Timer: ${boss.destructionTimer?.toFixed(2)}`
    );
  }

  // ============================================================================
  // CHALLENGE SECTION 3: EXACTLY 1 SHOCKWAVE FLARE BURST (dt INVARIANCE)
  // ============================================================================
  console.log('\n--- SECTION 3: EXACTLY 1 SHOCKWAVE FLARE BURST (dt INVARIANCE) ---');

  // Test 3.1: 60 FPS standard frames across [1.45s, 1.65s]
  {
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);
    boss.destructionTimer = 1.45;

    let flaresCount = 0;
    // Step 15 frames of 0.016s (~0.24s total, advancing 1.45 -> 1.69s)
    for (let f = 0; f < 15; f++) {
      const prevFired = boss.destructionShockwaveFired;
      step(engine, 0.016);
      if (!prevFired && boss.destructionShockwaveFired) {
        flaresCount++;
      }
    }

    assertChallenge(
      'CH3.1',
      'Shockwave Flare Under 60 FPS (Fires Exactly Once)',
      flaresCount === 1 && boss.destructionShockwaveFired === true,
      `Flares Count: ${flaresCount}, destructionShockwaveFired: ${boss.destructionShockwaveFired}`
    );
  }

  // Test 3.2: 1000 FPS micro-delta-times across [1.48s, 1.55s] (70 frames)
  {
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);
    boss.destructionTimer = 1.48;

    let flaresCount = 0;
    for (let f = 0; f < 70; f++) {
      const prevFired = boss.destructionShockwaveFired;
      step(engine, 0.001);
      if (!prevFired && boss.destructionShockwaveFired) {
        flaresCount++;
      }
    }

    assertChallenge(
      'CH3.2',
      'Shockwave Flare Under 1000 FPS Micro-Delta-Time (Fires Exactly Once)',
      flaresCount === 1 && boss.destructionShockwaveFired === true,
      `Flares Count: ${flaresCount}, Final Timer: ${boss.destructionTimer?.toFixed(4)}`
    );
  }

  // Test 3.3: Large frame drop (dt = 0.35s) jumping from 1.40s to 1.75s
  {
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);
    boss.destructionTimer = 1.40;

    let flaresCount = 0;
    const prevFired = boss.destructionShockwaveFired;
    step(engine, 0.35); // timer jumps to 1.75s
    if (!prevFired && boss.destructionShockwaveFired) {
      flaresCount++;
    }

    assertChallenge(
      'CH3.3',
      'Shockwave Flare Under Severe Frame Drop dt = 0.35s (Guaranteed Trigger, Exactly Once)',
      flaresCount === 1 && boss.destructionShockwaveFired === true && (boss.destructionTimer ?? 0) >= 1.75,
      `Flares Count: ${flaresCount}, Timer Post-Jump: ${boss.destructionTimer?.toFixed(2)}`
    );
  }

  // Test 3.4: Erratic randomized delta times throughout complete 3.0s destruction sequence
  {
    const { engine } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);

    let flaresCount = 0;
    while ((boss.destructionTimer ?? 0) < 3.0) {
      const randomDt = 0.005 + Math.random() * 0.12; // between 5ms and 125ms
      const prevFired = boss.destructionShockwaveFired;
      step(engine, randomDt);
      if (!prevFired && boss.destructionShockwaveFired) {
        flaresCount++;
      }
    }

    assertChallenge(
      'CH3.4',
      'Shockwave Flare Under Random Jitter dt (0.005s to 0.125s) (Fires Exactly Once)',
      flaresCount === 1 && boss.destructionShockwaveFired === true,
      `Flares Count: ${flaresCount}, Final Destruction Timer: ${boss.destructionTimer?.toFixed(2)}`
    );
  }

  // ============================================================================
  // CHALLENGE SECTION 4: ZERO DOUBLE VICTORY & ZERO POST-MORTEM VICTORY
  // ============================================================================
  console.log('\n--- SECTION 4: VICTORY INVARIANTS & PLAYER DEATH DEFENSE ---');

  // Test 4.1: Post-Victory Idle Stepping (Zero duplicate victory calls)
  {
    const { engine, getVictoryCalls, profile } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);

    // Fast-forward to victory
    boss.destructionTimer = 2.95;
    step(engine, 0.1); // triggers handleStageVictory()

    const initialVictoryCalls = getVictoryCalls();
    assertChallenge(
      'CH4.1',
      'Initial Stage Victory Invocation',
      initialVictoryCalls === 1,
      `Victory Calls: ${initialVictoryCalls}`
    );

    // Step 300 additional frames (5.0s of idling post-victory)
    for (let f = 0; f < 300; f++) {
      step(engine, 0.016);
    }

    assertChallenge(
      'CH4.2',
      'Zero Duplicate Victory Calls After 300 Additional Frames',
      getVictoryCalls() === 1,
      `Victory Calls: ${getVictoryCalls()} (Strictly 1)`
    );

    // Directly invoke private handleStageVictory() 5 times consecutively
    for (let k = 0; k < 5; k++) {
      (engine as any).handleStageVictory();
    }

    assertChallenge(
      'CH4.3',
      'Direct handleStageVictory Re-invocation Guarded by stageCompleted Flag',
      getVictoryCalls() === 1,
      `Victory Calls: ${getVictoryCalls()} (Strictly 1)`
    );
  }

  // Test 4.2: Post-Mortem Player Death at 1.0s of Phase 4 Destruction
  {
    const { engine, getVictoryCalls, getGameOverCalls, profile } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);
    boss.destructionTimer = 1.0;

    // Player loses last life
    engine.state.lives = 1;
    const dummyEscort: Alien = {
      id: 'killer_escort',
      lane: 2,
      x: engine.state.playerX,
      y: engine.state.playerY + 10,
      type: 'scout',
      hp: 1,
      maxHp: 1,
      scoreValue: 100,
      width: 30,
      height: 30,
      speed: 10,
      isHitFlash: 0
    };
    (engine as any).handleAlienBreach(dummyEscort);

    assertChallenge(
      'CH4.4',
      'Player Death Triggered: Lives = 0, GameOver Called',
      engine.state.lives === 0 && engine.state.isGameOver === true && getGameOverCalls() === 1,
      `Lives: ${engine.state.lives}, isGameOver: ${engine.state.isGameOver}, GameOverCalls: ${getGameOverCalls()}`
    );

    // Step forward past 3.0s (timer = 3.5s)
    for (let i = 0; i < 25; i++) {
      step(engine, 0.1);
    }

    assertChallenge(
      'CH4.5',
      'Zero Post-Mortem Victory Triggered When Player Dead (lives <= 0)',
      getVictoryCalls() === 0,
      `Victory Calls: ${getVictoryCalls()} (Strictly 0)`
    );

    assertChallenge(
      'CH4.6',
      'Profile Does NOT Record Stage 5-5 Completed After Player Death',
      profile.stageProgress['5-5']?.completed !== true,
      `Stage 5-5 Completed in Profile: ${profile.stageProgress['5-5']?.completed ?? false}`
    );
  }

  // Test 4.3: Simultaneous Player Death at 2.99s Boundary
  {
    const { engine, getVictoryCalls, getGameOverCalls, profile } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;
    (engine as any).triggerBossDestruction(boss);
    boss.destructionTimer = 2.99;

    // Player takes fatal damage exactly before completion
    engine.state.lives = 0;
    engine.state.gameOver = true;
    engine.state.isRunning = false;

    // Step across 3.0s boundary
    step(engine, 0.05);

    assertChallenge(
      'CH4.7',
      'Simultaneous Death at 2.99s Suppresses Stage Victory at 3.0s',
      getVictoryCalls() === 0,
      `Victory Calls: ${getVictoryCalls()} (Strictly 0)`
    );
  }

  // Test 4.4: Player Death in Phase 1, Phase 2, Phase 3 Suppresses Any Victory Call
  {
    const { engine, getVictoryCalls } = createHarness();
    engine.startStage(5, 5);
    const boss = engine.state.getActiveBoss()!;

    // Player dies in Phase 1
    engine.state.lives = 0;
    engine.state.gameOver = true;
    step(engine, 0.016);
    assertChallenge(
      'CH4.8',
      'Zero Victory When Player Dies in Phase 1',
      getVictoryCalls() === 0,
      `Victory Calls: ${getVictoryCalls()}`
    );

    // Player dies in Phase 2
    boss.bossPhase = 2;
    step(engine, 0.016);
    assertChallenge(
      'CH4.9',
      'Zero Victory When Player Dies in Phase 2',
      getVictoryCalls() === 0,
      `Victory Calls: ${getVictoryCalls()}`
    );

    // Player dies in Phase 3
    boss.bossPhase = 3;
    step(engine, 0.016);
    assertChallenge(
      'CH4.10',
      'Zero Victory When Player Dies in Phase 3',
      getVictoryCalls() === 0,
      `Victory Calls: ${getVictoryCalls()}`
    );
  }

  // ============================================================================
  // SUMMARY REPORT & VERDICT
  // ============================================================================
  console.log('\n================================================================================');
  console.log('                          CHALLENGE SUMMARY REPORT                              ');
  console.log('================================================================================');
  const total = challengeResults.length;
  const passed = challengeResults.filter(r => r.passed).length;
  const failed = challengeResults.filter(r => !r.passed).length;

  console.log(`TOTAL ADVERSARIAL CHALLENGES:  ${total}`);
  console.log(`PASSED:                        ${passed}`);
  console.log(`FAILED:                        ${failed}`);
  console.log('--------------------------------------------------------------------------------');

  if (failed > 0) {
    console.log('FAILED CHALLENGES:');
    challengeResults.filter(r => !r.passed).forEach(f => {
      console.log(`  - [${f.code}] ${f.name}: ${f.message}${f.error ? ` | Error: ${f.error}` : ''}`);
    });
    console.log('\nCHALLENGER VERDICT: REQUEST_CHANGES');
    process.exit(1);
  } else {
    console.log('\nCHALLENGER VERDICT: APPROVE');
    process.exit(0);
  }
}

runAdversarialChallenge().catch(err => {
  console.error('Unhandled failure in adversarial challenge:', err);
  process.exit(1);
});
