/**
 * Empirical Stress Test Harness for Mechanical Dreadnought Boss Battle (Milestone 2)
 * Tests actual GameEngine implementation in headless Node.js environment.
 */

// --- Browser Environment Mocks for Headless Node ---
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
      frequency: {
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {}
      },
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

function createMockCanvas(width = 800, height = 600): HTMLCanvasElement {
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

// Imports
import { GameEngine } from '../src/engine/GameEngine.ts';
import { createNewProfile, saveProfiles, setActiveProfile } from '../src/models/Profile.ts';
import { getStageWaveConfig } from '../src/engine/SectorConfig.ts';
import type { Alien, Bullet } from '../src/models/GameState.ts';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(id: string, name: string, passed: boolean, details?: string, error?: string) {
  results.push({ id, name, passed, details, error });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${id}] ${name}${details ? ` -> ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

function createTestHarness(profileName = 'Commander Challenger') {
  mockStorage.clear();
  const profile = createNewProfile(profileName, '🚀', 6);
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

// Helper to step engine with given dt without relying on requestAnimationFrame
function stepEngine(engine: GameEngine, dt: number) {
  (engine as any).update(dt);
}

// Helper to spawn and deliver a bullet to an alien
function deliverBullet(engine: GameEngine, alien: Alien, damage: number, type: 'laser' | 'plasma' = 'laser') {
  const bullet: Bullet = {
    id: 'test_bullet_' + Math.random(),
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

function getBoss(engine: GameEngine): Alien | undefined {
  return engine.state.aliens.find(a => a.type === 'boss' && a.isBoss);
}

async function runAllStressTests() {
  console.log('======================================================================');
  console.log('   MECHANICAL DREADNOUGHT BOSS BATTLE — EMPIRICAL STRESS TEST HARNESS  ');
  console.log('======================================================================\n');

  // --------------------------------------------------------------------
  // TEST SUITE 1: Complete 4-Phase Lifecycle (Spawn to Defeat)
  // --------------------------------------------------------------------
  console.log('--- TEST SUITE 1: COMPLETE 4-PHASE LIFECYCLE ---');
  {
    const { engine, profile, getVictoryCalls, getVictoryPayload } = createTestHarness();
    engine.startStage(5, 5); // Sector 5 Stage 5 = Dreadnought Boss

    const boss = getBoss(engine);
    if (!boss) {
      recordTest('T1.1', 'Boss Entity Spawn', false, undefined, 'Boss entity not found in Sector 5 Stage 5 formation');
      return;
    }

    // T1.1: Initial Boss State Verification
    const initCheck = boss.bossPhase === 1 && boss.shieldHp === 30 && boss.hp === 40 && boss.maxHp === 40;
    recordTest('T1.1', 'Phase 1 Initial State', initCheck, `Phase: ${boss.bossPhase}, Shield: ${boss.shieldHp}/30, Hull: ${boss.hp}/40`);

    // Deplete deflector shield by 10, 10, 10
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    recordTest('T1.2', 'Phase 1 Partial Shield Depletion (Hit 1)', boss.shieldHp === 20 && boss.hp === 40, `Shield: ${boss.shieldHp}, HP: ${boss.hp}`);

    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    recordTest('T1.3', 'Phase 1 Partial Shield Depletion (Hit 2)', boss.shieldHp === 10 && boss.hp === 40, `Shield: ${boss.shieldHp}, HP: ${boss.hp}`);

    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    // Shield reaches 0, next stepEngine should transition to Phase 2
    stepEngine(engine, 0.016);
    const p2Check = boss.bossPhase === 2 && boss.wingBaysOpen === true && boss.minionsSpawned === true;
    recordTest('T1.4', 'Phase 1 -> Phase 2 Transition upon Shield Collapse', p2Check, `Phase: ${boss.bossPhase}, WingBaysOpen: ${boss.wingBaysOpen}, MinionsSpawned: ${boss.minionsSpawned}`);

    // Verify minions exist in state
    const minionCount = engine.state.aliens.filter(a => a !== boss).length;
    recordTest('T1.5', 'Phase 2 Minion Escort Active', minionCount > 0, `Escort count in active formation: ${minionCount}`);

    // Damage hull in Phase 2 down to <= 65% (40 * 0.65 = 26)
    // Deal 15 damage (40 -> 25)
    deliverBullet(engine, boss, 15);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016); // state machine check in update
    const p3Check = boss.bossPhase === 3 && boss.coreRevealed === true && boss.overloadTimer === 6.0;
    recordTest('T1.6', 'Phase 2 -> Phase 3 Transition (Hull <= 65%)', p3Check, `Phase: ${boss.bossPhase}, CoreRevealed: ${boss.coreRevealed}, OverloadTimer: ${boss.overloadTimer}`);

    // Phase 3 Critical Damage test: 5 base damage should deal 10 effective damage (2.0x)
    const prevHp = boss.hp;
    deliverBullet(engine, boss, 5);
    stepEngine(engine, 0.016);
    const dmgDealt = prevHp - boss.hp;
    recordTest('T1.7', 'Phase 3 Core Overload 2.0x Critical Damage', dmgDealt === 10, `Dealt ${dmgDealt} dmg from base 5 (expected 10)`);

    // Deal lethal damage to trigger Phase 4
    deliverBullet(engine, boss, 10); // 10 * 2 = 20 dmg, remaining HP was 15 -> reaches 0
    stepEngine(engine, 0.016);
    const p4Check = boss.bossPhase === 4 && boss.hp === 0 && boss.speed === 0 && engine.state.screenShakeTimer > 0;
    recordTest('T1.8', 'Phase 3 -> Phase 4 Transition on Lethal Damage', p4Check, `Phase: ${boss.bossPhase}, HP: ${boss.hp}, Speed: ${boss.speed}, ScreenShakeTimer: ${engine.state.screenShakeTimer}`);

    // Clear any other aliens to test pure boss destruction completion
    engine.state.aliens = [boss];
    engine.state.aliensDefeated = engine.state.totalAliensWave - 1;

    // Simulate 3.0s destruction sequence at 60 FPS (180 ticks of 0.0166s)
    let maxShake = 0;
    for (let i = 0; i < 185; i++) {
      maxShake = Math.max(maxShake, engine.state.screenShakeIntensity);
      stepEngine(engine, 0.0166);
    }

    const bossRemoved = !engine.state.aliens.includes(boss);
    const victoryFired = getVictoryCalls() > 0;
    recordTest('T1.9', 'Phase 4 Cascading Destruction (3.0s) & Stage Victory', bossRemoved && victoryFired, `Boss Removed: ${bossRemoved}, Victory Fired: ${getVictoryCalls()} times`);
  }

  // --------------------------------------------------------------------
  // TEST SUITE 2: Phase 1 Overkill Damage Boundary & Shield Gating
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 2: OVERKILL DAMAGE BOUNDARY & SHIELD GATING ---');
  {
    // Test A: Single massive overkill hit on shield (e.g. 50 damage against 30 shield)
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    deliverBullet(engine, boss, 50); // Massive overkill hit
    stepEngine(engine, 0.016);

    // Shield should be 0, hull should be completely protected (40 HP)
    const overkillAbsorbed = boss.shieldHp === 0 && boss.hp === 40;
    recordTest('T2.1', 'Phase 1 Overkill Single-Hit Shield Absorption (50 dmg vs 30 shield)', overkillAbsorbed, `Shield: ${boss.shieldHp}, Hull: ${boss.hp} (Hull must remain 40)`);

    // Next frame transitions to Phase 2
    stepEngine(engine, 0.016);
    recordTest('T2.2', 'Phase 1 -> Phase 2 Transition Post-Overkill', boss.bossPhase === 2, `Phase is ${boss.bossPhase}`);
  }
  {
    // Test B: Multi-hit burst in same frame: 3 hits of 10 (deplete shield) + 1 hit of 10 (hits unshielded hull in same frame)
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    // Deliver 4 bullets simultaneously in one frame
    deliverBullet(engine, boss, 10);
    deliverBullet(engine, boss, 10);
    deliverBullet(engine, boss, 10);
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);

    // First 3 should deplete shield (30 -> 0), 4th bullet hits hull (40 -> 30)
    const multiHitCheck = boss.shieldHp === 0 && boss.hp === 30;
    recordTest('T2.3', 'Phase 1 Same-Frame Multi-Hit Depletion & Spillover', multiHitCheck, `Shield: ${boss.shieldHp}, Hull: ${boss.hp}`);
  }

  // --------------------------------------------------------------------
  // TEST SUITE 3: Phase 2 Minion Drone Deployment Mechanics
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 3: PHASE 2 MINION DRONE DEPLOYMENT ---');
  {
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;
    deliverBullet(engine, boss, 30);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016); // Phase 2 triggered

    // Check wing bays
    recordTest('T3.1', 'Phase 2 Wing Bays Open Flag', boss.wingBaysOpen === true, `wingBaysOpen: ${boss.wingBaysOpen}`);

    // Check spawned escort aliens (specifically the minions deployed in Phase 2)
    const escorts = engine.state.aliens.filter(a => a !== boss);
    recordTest('T3.2', 'Phase 2 Escorts Spawned', escorts.length >= 2, `Escorts count: ${escorts.length}`);

    // Check alien type: prompt specifies "Escort Minion Drone deployment launches minions into active state"
    // Inspect the 2 escorts spawned by spawnMinionDrones
    const spawnedMinions = escorts.filter(a => a.oscillationAmp === 20 && a.oscillationFreq === 3.2);
    const hasMinionDroneType = spawnedMinions.some(a => a.type === 'minion_drone');
    recordTest(
      'T3.3',
      'Phase 2 Escort Minion Alien Type Inspection',
      hasMinionDroneType,
      `Spawned minion type: ${spawnedMinions.map(m => m.type).join(', ')}`,
      hasMinionDroneType ? undefined : 'GameEngine.spawnMinionDrones spawns type "scout" instead of "minion_drone"'
    );

    // Check zigzag oscillation parameters on spawned minions
    const minionsHaveZigzag = spawnedMinions.length > 0 && spawnedMinions.every(a => a.oscillationAmp === 20 && a.oscillationFreq === 3.2);
    recordTest('T3.4', 'Phase 2 Spawned Minion Zigzag Parameters', minionsHaveZigzag, `Minions zigzag: ${minionsHaveZigzag}`);

    // Check transition to Phase 3 when escort minions are defeated without damaging boss hull below 65%
    // Kill all escorts while boss hp is still 40
    engine.state.aliens = [boss]; // Escorts destroyed
    stepEngine(engine, 0.016);
    recordTest('T3.5', 'Phase 2 -> Phase 3 Transition on Escorts Cleared (Boss HP 100%)', boss.bossPhase === 3, `Phase: ${boss.bossPhase}, Boss HP: ${boss.hp}`);
  }

  // --------------------------------------------------------------------
  // TEST SUITE 4: Phase 3 Core Overload Multiplier, Expiration & Re-Engagement
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 4: PHASE 3 CORE OVERLOAD & RE-ENGAGEMENT CYCLES ---');
  {
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    // Fast-forward to Phase 3 with full HP (40) so automatic base fire doesn't destroy boss
    boss.shieldHp = 0;
    boss.bossPhase = 2;
    boss.hp = 40;
    engine.state.aliens = [boss]; // Escorts cleared -> triggers Phase 3
    stepEngine(engine, 0.016); // Enters Phase 3

    recordTest('T4.1', 'Phase 3 Core Overload Initialized', boss.bossPhase === 3 && boss.coreRevealed === true && boss.overloadTimer === 6.0, `Phase: ${boss.bossPhase}, Timer: ${boss.overloadTimer}`);

    // Jam weapon so continuous base fire does not interfere with timer progression
    engine.state.weaponJamTimer = 10.0;

    // Simulate 3.0s of elapsed overload time
    for (let i = 0; i < 30; i++) stepEngine(engine, 0.1);
    recordTest('T4.2', 'Phase 3 Timer Countdown (t = 3.0s)', Math.abs((boss.overloadTimer ?? 0) - 3.0) < 0.15, `Remaining timer: ${boss.overloadTimer?.toFixed(2)}s`);

    // Verify 2.0x critical damage still applies at t = 3.0s
    const prevHp = boss.hp;
    deliverBullet(engine, boss, 4);
    stepEngine(engine, 0.016);
    const critDealt = prevHp - boss.hp;
    recordTest('T4.3', 'Phase 3 2.0x Critical Damage at Mid-Window', critDealt === 8, `Dealt ${critDealt} from base 4 (expected 8)`);

    // Allow overload timer to expire (advance another 3.5s to cross 6.0s total)
    engine.state.weaponJamTimer = 10.0;
    for (let i = 0; i < 35; i++) stepEngine(engine, 0.1);

    // Verify Re-Engagement Cycle:
    // Boss should reboot shield with 15 HP, close core, and reset to Phase 1
    const reengaged = boss.bossPhase === 1 && boss.shieldHp === 15 && boss.maxShieldHp === 15 && boss.coreRevealed === false;
    recordTest('T4.4', 'Phase 3 Expiration Reboots Shield & Re-engages Phase 1', reengaged, `Phase: ${boss.bossPhase}, Shield: ${boss.shieldHp}/15, CoreRevealed: ${boss.coreRevealed}`);

    // Test Cycle 2: Break 15 shield HP -> Transitions to Phase 2
    deliverBullet(engine, boss, 15);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);
    recordTest('T4.5', 'Cycle 2: Shield Depletion Transitions to Phase 2', boss.bossPhase === 2, `Cycle 2 Phase: ${boss.bossPhase}`);

    // Cycle 2: Damage hull from 32 down to <= 26 (deal 10 damage)
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    stepEngine(engine, 0.016);
    recordTest('T4.6', 'Cycle 2: Hull Damage <= 65% Re-triggers Phase 3 Core Overload', boss.bossPhase === 3 && boss.coreRevealed === true, `Cycle 2 Phase: ${boss.bossPhase}, HP: ${boss.hp}`);
  }

  // --------------------------------------------------------------------
  // TEST SUITE 5: Phase 4 Cascading Destruction Timing & Secondary Detonations
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 5: PHASE 4 CASCADING DESTRUCTION SEQUENCE ---');
  {
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    // Trigger Phase 4
    (engine as any).triggerBossDestruction(boss);

    recordTest('T5.1', 'Phase 4 Trigger State', boss.bossPhase === 4 && boss.hp === 0 && boss.speed === 0, `Speed: ${boss.speed}, Timer: ${boss.destructionTimer}`);

    // Track secondary explosions across 3.0s
    let secondaryExplosionTicks = 0;
    let prevStep = boss.destructionStep ?? 0;

    // Step through 30 increments of 0.1s = 3.0s
    for (let i = 1; i <= 30; i++) {
      stepEngine(engine, 0.1);
      const currStep = boss.destructionStep ?? 0;
      if (currStep > prevStep) {
        secondaryExplosionTicks += (currStep - prevStep);
        prevStep = currStep;
      }
    }

    recordTest('T5.2', 'Phase 4 Secondary Staggered Detonations Count', secondaryExplosionTicks >= 6, `Detonations triggered: ${secondaryExplosionTicks} (expected >= 6)`);
    recordTest('T5.3', 'Phase 4 Total Destruction Timer Reached 3.0s', (boss.destructionTimer ?? 0) >= 3.0, `Final destruction timer: ${boss.destructionTimer}`);
  }

  // --------------------------------------------------------------------
  // TEST SUITE 6: Edge Case 1 — Rapid Firing (Salvos & Same-Frame Bursts)
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 6: RAPID FIRING & SAME-FRAME BURST DAMAGE ---');
  {
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    // Fire 20 bullets of damage 2 in a single frame (40 damage total)
    for (let i = 0; i < 20; i++) {
      deliverBullet(engine, boss, 2);
    }
    stepEngine(engine, 0.016);

    // 30 should absorb into shield, 10 into hull
    recordTest('T6.1', 'Rapid Firing 20 Bullets in Single Frame', boss.shieldHp === 0 && boss.hp === 30, `Shield: ${boss.shieldHp}, HP: ${boss.hp}`);

    // Fire 40 more bullets (80 damage) to instantly overkill the boss
    for (let i = 0; i < 40; i++) {
      deliverBullet(engine, boss, 2);
    }
    stepEngine(engine, 0.016);

    // HP should clamp cleanly at 0, boss enter Phase 4, no negative HP
    recordTest('T6.2', 'Massive Burst Overkill to Zero HP', boss.hp === 0 && boss.bossPhase === 4, `HP: ${boss.hp}, Phase: ${boss.bossPhase}`);
  }

  // --------------------------------------------------------------------
  // TEST SUITE 7: Edge Case 2 — Extreme Delta Times (0s, 0.001s, 0.15s, 5.0s)
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 7: EXTREME DELTA TIMES ---');
  {
    // Test A: dt = 0
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;
    boss.bossPhase = 4;
    boss.destructionTimer = 1.0;
    stepEngine(engine, 0);
    recordTest('T7.1', 'Extreme dt = 0 (Static Tick)', boss.destructionTimer === 1.0, `Timer: ${boss.destructionTimer}`);

    // Test B: dt = 0.0001 (Microsecond frame)
    stepEngine(engine, 0.0001);
    recordTest('T7.2', 'Extreme dt = 0.0001 (Microsecond Tick)', Math.abs(boss.destructionTimer - 1.0001) < 1e-6, `Timer: ${boss.destructionTimer}`);

    // Test C: Shockwave flare skip bug with dt >= 0.15s
    // Notice line 267 in GameEngine.ts:
    // `if (timer >= 1.5 && timer < 1.6 && step < 10)`
    // If dt = 0.15s starting at timer = 1.48s -> timer becomes 1.63s, skipping [1.5, 1.6) completely!
    const { engine: engC } = createTestHarness();
    engC.startStage(5, 5);
    const bossC = getBoss(engC)!;
    bossC.bossPhase = 4;
    bossC.destructionTimer = 1.48;
    bossC.destructionStep = 4;

    const initialParticleCount = engC.state.particles.length;
    // Step with dt = 0.15s (jumps to 1.63s)
    stepEngine(engC, 0.15);

    // In GameEngine.ts, line 267 checks `timer >= 1.5 && timer < 1.6`.
    // At timer = 1.63, this condition is FALSE, so the 1.5s white shockwave flare is skipped!
    const shockwaveSkipped = (bossC.destructionTimer ?? 0) >= 1.6 && engC.state.particles.length === initialParticleCount;
    recordTest(
      'T7.3',
      'Phase 4 Shockwave Window Vulnerability on Frame Drop (dt = 0.15s)',
      !shockwaveSkipped,
      `Particles spawned: ${engC.state.particles.length - initialParticleCount}, timer: ${bossC.destructionTimer}`,
      shockwaveSkipped ? 'Narrow window [1.5, 1.6) causes shockwave flare to be completely skipped on frame drop / large dt' : undefined
    );

    // Test D: Multi-trigger shockwave on small dt (60 FPS)
    // If timer is between 1.5 and 1.6 for multiple frames, how many times does line 267 trigger?
    const { engine: engD } = createTestHarness();
    engD.startStage(5, 5);
    const bossD = getBoss(engD)!;
    bossD.bossPhase = 4;
    bossD.destructionTimer = 1.49;
    bossD.destructionStep = 4;

    let shockwaveFires = 0;
    // Advance 6 frames of 0.016s (1.49 -> 1.506 -> 1.522 -> 1.538 -> 1.554 -> 1.570 -> 1.586 -> 1.602)
    for (let f = 0; f < 7; f++) {
      const prevParticles = engD.state.particles.length;
      stepEngine(engD, 0.016);
      if (engD.state.particles.length - prevParticles >= 50) {
        shockwaveFires++;
      }
    }
    recordTest(
      'T7.4',
      'Phase 4 Shockwave Multiple Triggering on 60 FPS',
      shockwaveFires <= 1,
      `Shockwave fired ${shockwaveFires} times within [1.5, 1.6) window`,
      shockwaveFires > 1 ? `Shockwave lacks a one-shot boolean guard and re-fired ${shockwaveFires} consecutive times` : undefined
    );
  }

  // --------------------------------------------------------------------
  // TEST SUITE 8: Edge Case 3 — Player Death During Phase 4 Destruction Sequence
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 8: PLAYER DEATH DURING PHASE 4 DESTRUCTION SEQUENCE ---');
  {
    const { engine, profile, getGameOverCalls, getVictoryCalls } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    // Boss enters Phase 4 destruction
    (engine as any).triggerBossDestruction(boss);
    boss.destructionTimer = 1.0;

    // An escort alien reaches defense line and breaches, killing player (lives = 1 -> 0)
    engine.state.lives = 1;
    const escort = engine.state.aliens.find(a => a !== boss)!;
    escort.y = engine.state.playerY + 10;

    // Trigger breach
    (engine as any).handleAlienBreach(escort);

    recordTest('T8.1', 'Player Lives Depleted to 0 & Game Over Called', engine.state.lives === 0 && getGameOverCalls() === 1, `Lives: ${engine.state.lives}, GameOverCalls: ${getGameOverCalls()}`);
    recordTest('T8.2', 'Game Running Flag Set to False on Death', engine.state.isRunning === false, `isRunning: ${engine.state.isRunning}`);

    // Now advance time to complete boss destruction (t >= 3.0s)
    boss.destructionTimer = 2.95;
    stepEngine(engine, 0.1); // crosses 3.0s

    // Check if stage victory was erroneously triggered despite player death!
    const victoryTriggeredOnDeath = getVictoryCalls() > 0;
    recordTest(
      'T8.3',
      'Stage Victory Guarded Against Post-Death Execution',
      !victoryTriggeredOnDeath,
      `Victory calls: ${getVictoryCalls()}, Profile Stage Completed: ${profile.stageProgress['5-5']?.completed}`,
      victoryTriggeredOnDeath ? 'CRITICAL BUG: updateBossDestruction invokes handleStageVictory() even when player is dead (lives <= 0)' : undefined
    );
  }

  // --------------------------------------------------------------------
  // TEST SUITE 9: Edge Case 4 — Zero-Damage Hits & Post-Destruction Hits
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 9: ZERO-DAMAGE & POST-DESTRUCTION HITS ---');
  {
    const { engine } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    // Deliver bullet with 0 damage in Phase 1
    deliverBullet(engine, boss, 0);
    stepEngine(engine, 0.016);
    recordTest('T9.1', 'Zero-Damage Hit in Phase 1 (Shield Unchanged)', boss.shieldHp === 30 && boss.hp === 40, `Shield: ${boss.shieldHp}, HP: ${boss.hp}`);

    // Switch to Phase 3, deliver 0 damage bullet
    boss.shieldHp = 0;
    boss.bossPhase = 3;
    deliverBullet(engine, boss, 0);
    stepEngine(engine, 0.016);
    recordTest('T9.2', 'Zero-Damage Hit in Phase 3 (HP Unchanged)', boss.hp === 40, `HP: ${boss.hp}`);

    // Switch to Phase 4, deliver bullet
    boss.bossPhase = 4;
    boss.hp = 0;
    deliverBullet(engine, boss, 10);
    stepEngine(engine, 0.016);
    // Boss in Phase 4 should ignore incoming bullets
    recordTest('T9.3', 'Bullet Ignored in Phase 4 Destruction', boss.hp === 0 && boss.bossPhase === 4, `HP: ${boss.hp}, Phase: ${boss.bossPhase}`);
  }

  // --------------------------------------------------------------------
  // TEST SUITE 10: Double Stage Victory Trigger Bug Verification
  // --------------------------------------------------------------------
  console.log('\n--- TEST SUITE 10: DOUBLE STAGE VICTORY TRIGGER VERIFICATION ---');
  {
    const { engine, profile, getVictoryCalls, getVictoryPayload } = createTestHarness();
    engine.startStage(5, 5);
    const boss = getBoss(engine)!;

    // Destroy all other aliens first
    engine.state.aliens = [boss];
    engine.state.aliensDefeated = engine.state.totalAliensWave - 1; // 4 aliens defeated out of 5

    const initialCoins = profile.coins;
    const initialDiamonds = profile.diamonds;

    // Put boss in Phase 4 with timer at 2.95s
    (engine as any).triggerBossDestruction(boss);
    boss.destructionTimer = 2.95;

    // Step by 0.1s to cross 3.0s boundary
    stepEngine(engine, 0.1);

    const calls = getVictoryCalls();
    recordTest(
      'T10.1',
      'Stage Victory Callback Fired Exactly Once',
      calls === 1,
      `onStageVictory called ${calls} time(s)`,
      calls > 1 ? `DOUBLE VICTORY BUG: handleStageVictory() called ${calls} times (line 286 and line 754 in GameEngine.ts)` : undefined
    );

    // Check coin & diamond duplication
    const payload = getVictoryPayload();
    if (payload) {
      const expectedCoins = initialCoins + payload.coins;
      const expectedDiamonds = initialDiamonds + payload.diamonds;
      const coinsMatch = profile.coins === expectedCoins;
      const diamondsMatch = profile.diamonds === expectedDiamonds;
      recordTest(
        'T10.2',
        'Profile Reward Duplication Check',
        coinsMatch && diamondsMatch,
        `Expected Coins: ${expectedCoins}, Actual: ${profile.coins} | Expected Diamonds: ${expectedDiamonds}, Actual: ${profile.diamonds}`,
        (!coinsMatch || !diamondsMatch) ? `Rewards duplicated: profile credited twice due to double victory invocation` : undefined
      );
    }
  }

  // --------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log('                          TEST SUMMARY REPORT                         ');
  console.log('======================================================================');
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`TOTAL TESTS:  ${total}`);
  console.log(`PASSED:       ${passedCount}`);
  console.log(`FAILED:       ${failedCount}`);
  console.log('----------------------------------------------------------------------');

  if (failedCount > 0) {
    console.log('FAILED TESTS / REPRODUCED ANOMALIES:');
    results.filter(r => !r.passed).forEach(f => {
      console.log(`  - [${f.id}] ${f.name}: ${f.error || f.details}`);
    });
    console.log('\nVERDICT: REQUEST_CHANGES');
    process.exit(1);
  } else {
    console.log('\nVERDICT: APPROVE');
    process.exit(0);
  }
}

runAllStressTests().catch(err => {
  console.error('Stress test harness unhandled exception:', err);
  process.exit(1);
});
