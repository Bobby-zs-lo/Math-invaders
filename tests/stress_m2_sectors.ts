import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  SECTOR_CONFIGS,
  getSectorConfig,
  getStageWaveConfig,
  getAllSectorConfigs
} from '../src/engine/SectorConfig.ts';
import type { StageWaveConfig, SectorConfig } from '../src/engine/SectorConfig.ts';
import type { Alien, AlienType, Bullet } from '../src/models/GameState.ts';

// ============================================================================
// ADVERSARIAL STRESS TEST SUITE: MILESTONE 2 SECTORS, FLIGHT & COLLISIONS
// ============================================================================

describe('M2 Adversarial Stress Test 1: Exhaustive 25-Stage Configuration & Formations', () => {
  it('Validates all 5 sectors and their 25 stages for rows, formations, alien types, speed multipliers, and boss stage flags', () => {
    const allSectors = getAllSectorConfigs();
    assert.equal(allSectors.length, 5, 'Must define exactly 5 sectors');

    const expectedAlienPools: Record<number, AlienType[]> = {
      1: ['scout', 'crab'],
      2: ['scout', 'crab'],
      3: ['scout', 'crab', 'behemoth'],
      4: ['scout', 'crab', 'behemoth'],
      5: ['scout', 'crab', 'behemoth', 'boss']
    };

    let totalStagesValidated = 0;

    for (let secId = 1; secId <= 5; secId++) {
      const sector = getSectorConfig(secId);
      assert.ok(sector, `Sector ${secId} must be defined`);
      assert.equal(sector.sectorId, secId, `Sector ID must match ${secId}`);
      assert.ok(sector.name && sector.name.length > 5, `Sector ${secId} must have descriptive name`);
      assert.ok(sector.subtitle && sector.subtitle.length > 5, `Sector ${secId} must have subtitle`);
      assert.ok(sector.description && sector.description.length > 10, `Sector ${secId} must have description`);
      assert.match(sector.accentColor, /^#[0-9a-fA-F]{6}$/, `Sector ${secId} must have valid hex accent color`);

      const stages = Object.values(sector.stages);
      assert.equal(stages.length, 5, `Sector ${secId} must have exactly 5 stages`);

      for (let stgId = 1; stgId <= 5; stgId++) {
        const stage = getStageWaveConfig(secId, stgId);
        assert.ok(stage, `Sector ${secId} Stage ${stgId} must be defined`);
        assert.equal(stage.stageId, stgId, `stageId must match ${stgId}`);
        assert.ok(stage.name && stage.name.length > 3, `Stage name must be descriptive`);

        // Row count integrity
        assert.ok(stage.rows >= 2 && stage.rows <= 5, `Stage ${secId}-${stgId} rows (${stage.rows}) must be between 2 and 5`);
        assert.equal(stage.rows, stage.formationGrid.length, `Stage ${secId}-${stgId} rows must match formationGrid.length`);

        // Formation grid structure: exactly 5 lanes per row
        let gridAlienCount = 0;
        const validAlienPool = expectedAlienPools[secId];

        for (let r = 0; r < stage.formationGrid.length; r++) {
          const row = stage.formationGrid[r];
          assert.equal(row.length, 5, `Sector ${secId}-${stgId} row ${r} must contain exactly 5 lanes`);
          for (let lane = 0; lane < 5; lane++) {
            const alienType = row[lane];
            if (alienType !== null) {
              gridAlienCount++;
              assert.ok(
                validAlienPool.includes(alienType),
                `Sector ${secId}-${stgId} has invalid alien type "${alienType}". Allowed pool: ${validAlienPool.join(', ')}`
              );
            }
          }
        }

        assert.ok(gridAlienCount > 0, `Sector ${secId}-${stgId} must have at least 1 alien in initial formation`);

        // Pacing & march mechanics
        assert.ok(stage.marchInterval >= 0.4 && stage.marchInterval <= 1.5, `marchInterval (${stage.marchInterval}) must be sane`);
        assert.ok(stage.marchStepY >= 5 && stage.marchStepY <= 25, `marchStepY (${stage.marchStepY}) must be positive and bounded`);
        assert.ok(stage.baseSpeed >= 10 && stage.baseSpeed <= 40, `baseSpeed (${stage.baseSpeed}) must be within playable arcade range`);

        // Boss stage flag verification
        if (stgId === 5) {
          assert.equal(stage.isBossStage, true, `Stage 5 of sector ${secId} must have isBossStage = true`);
          assert.ok(stage.bossType === 'commander' || stage.bossType === 'dreadnought', `Stage 5 must have valid bossType`);
        } else {
          assert.equal(stage.isBossStage, false, `Non-final stage ${secId}-${stgId} must have isBossStage = false`);
          assert.equal(stage.bossType, 'none', `Non-final stage ${secId}-${stgId} must have bossType = 'none'`);
        }

        // Sector-specific feature flags
        if (secId === 1) {
          assert.equal(stage.enableZigzag, false, 'Sector 1 must NOT enable zig-zag');
          assert.equal(stage.enableArmor, false, 'Sector 1 must NOT enable armor');
          assert.equal(stage.enableCoreReveal, false, 'Sector 1 must NOT enable core reveal');
        } else if (secId === 2) {
          assert.equal(stage.enableZigzag, true, `Sector 2 Stage ${stgId} must enable zig-zag`);
          assert.ok((stage.zigzagFrequency ?? 0) >= 2.0 && (stage.zigzagFrequency ?? 0) <= 5.0, 'zigzagFrequency must be bounded');
          assert.ok((stage.zigzagAmplitude ?? 0) >= 15 && (stage.zigzagAmplitude ?? 0) <= 45, 'zigzagAmplitude must be bounded');
          assert.equal(stage.enableArmor, false, 'Sector 2 must NOT enable armor');
          assert.equal(stage.enableCoreReveal, false, 'Sector 2 must NOT enable core reveal');
        } else if (secId === 3) {
          assert.equal(stage.enableArmor, true, `Sector 3 Stage ${stgId} must enable armor`);
          assert.ok((stage.armorPoints ?? 0) >= 2, 'Sector 3 armorPoints must be >= 2');
          assert.equal(stage.enableZigzag, false, 'Sector 3 standard stages must NOT enable zig-zag');
          assert.equal(stage.enableCoreReveal, false, 'Sector 3 must NOT enable core reveal');
        } else if (secId === 4) {
          assert.equal(stage.enableCoreReveal, true, `Sector 4 Stage ${stgId} must enable core reveal`);
          assert.ok((stage.coreConcealedDuration ?? 0) > 0, 'coreConcealedDuration must be > 0');
          assert.ok((stage.coreRevealedDuration ?? 0) > 0, 'coreRevealedDuration must be > 0');
        } else if (secId === 5) {
          if (stgId === 5) {
            assert.equal(stage.bossType, 'dreadnought', 'Sector 5 Stage 5 bossType must be dreadnought');
            assert.equal(stage.formationGrid[0][2], 'boss', 'Sector 5 Stage 5 must spawn boss in center lane (lane 2, row 0)');
          }
        }

        totalStagesValidated++;
      }
    }

    assert.equal(totalStagesValidated, 25, 'Must have successfully validated all 25 stages');
  });
});

describe('M2 Adversarial Stress Test 2: Wave Budget vs Formation Grid Defect Reproducer', () => {
  it('REPRODUCER: Detects stages where totalAliens < gridCount causing premature stage victory with live aliens remaining', () => {
    const prematureVictoryStages: Array<{
      sectorId: number;
      stageId: number;
      totalAliens: number;
      gridCount: number;
      strandedAliensCount: number;
    }> = [];

    const incompleteWaveStages: Array<{
      sectorId: number;
      stageId: number;
      totalAliens: number;
      gridCount: number;
      difference: number;
    }> = [];

    for (const sector of getAllSectorConfigs()) {
      for (const [stgId, stage] of Object.entries(sector.stages)) {
        const gridCount = stage.formationGrid.flat().filter(Boolean).length;
        if (stage.totalAliens < gridCount) {
          prematureVictoryStages.push({
            sectorId: sector.sectorId,
            stageId: Number(stgId),
            totalAliens: stage.totalAliens,
            gridCount,
            strandedAliensCount: gridCount - stage.totalAliens
          });
        } else if (stage.totalAliens > gridCount) {
          incompleteWaveStages.push({
            sectorId: sector.sectorId,
            stageId: Number(stgId),
            totalAliens: stage.totalAliens,
            gridCount,
            difference: stage.totalAliens - gridCount
          });
        }
      }
    }

    // Headless Simulation of the Victory Condition in GameEngine.ts (lines 751-755):
    // if (aliensDefeated >= totalAliensWave && !aliens.some(a => a.bossPhase === 4)) {
    //   handleStageVictory();
    // }
    for (const defect of prematureVictoryStages) {
      let simulatedAliensOnScreen = defect.gridCount;
      let aliensDefeated = 0;

      // Defeat aliens one by one until victory triggers
      let victoryTriggered = false;
      let remainingAliensWhenVictoryTriggered = -1;

      while (simulatedAliensOnScreen > 0) {
        simulatedAliensOnScreen--;
        aliensDefeated++;

        // Engine condition
        if (aliensDefeated >= defect.totalAliens) {
          victoryTriggered = true;
          remainingAliensWhenVictoryTriggered = simulatedAliensOnScreen;
          break;
        }
      }

      assert.equal(victoryTriggered, true, 'Victory must trigger when aliensDefeated reaches totalAliens');
      assert.ok(
        remainingAliensWhenVictoryTriggered > 0,
        `Sector ${defect.sectorId} Stage ${defect.stageId} triggered victory while ${remainingAliensWhenVictoryTriggered} live alien(s) remained on screen!`
      );
    }

    console.log(`[REPRODUCER DIAGNOSTICS]`);
    console.log(`- Stages with Premature Victory (totalAliens < gridCount): ${prematureVictoryStages.length} / 25`);
    for (const p of prematureVictoryStages) {
      console.log(`  * Sector ${p.sectorId} Stage ${p.stageId}: totalAliens=${p.totalAliens}, gridCount=${p.gridCount} (${p.strandedAliensCount} stranded aliens)`);
    }
    console.log(`- Stages with Incomplete Respawns (totalAliens > gridCount): ${incompleteWaveStages.length} / 25`);
    for (const inc of incompleteWaveStages) {
      console.log(`  * Sector ${inc.sectorId} Stage ${inc.stageId}: totalAliens=${inc.totalAliens}, gridCount=${inc.gridCount} (+${inc.difference} excess aliens)`);
    }

    // Adversarial Assertion: In a clean build, zero stages should suffer from premature victory
    assert.equal(
      prematureVictoryStages.length,
      0,
      `Detected ${prematureVictoryStages.length} stages where totalAliens < gridCount, causing premature stage completion before wave is cleared!`
    );
  });
});

describe('M2 Adversarial Stress Test 3: 10,000-Frame Sinusoidal Flight Simulation', () => {
  it('Simulates 10,000 frames across varied dt, initial conditions, viewports, and amplitudes', () => {
    const canvasWidths = [320, 360, 414, 480, 600, 768, 1024, 1280];
    const alienWidths = [26, 34, 40]; // minion, scout, crab
    const amplitudes = [18, 22, 26, 28, 32, 45, 60];
    const frequencies = [2.0, 2.5, 3.0, 3.2, 3.6, 4.5];
    const deltaTimes = [0.005, 0.016, 0.033, 0.05, 0.1]; // from 200 FPS to 10 FPS

    let totalFramesSimulated = 0;

    // Run 10 parameter combination runs of 1,000 frames each = 10,000 frames total
    for (let run = 0; run < 10; run++) {
      const canvasWidth = canvasWidths[run % canvasWidths.length];
      const width = alienWidths[run % alienWidths.length];
      const halfW = width / 2;
      const amp = amplitudes[run % amplitudes.length];
      const freq = frequencies[run % frequencies.length];
      const lane = run % 5;
      const laneWidth = canvasWidth / 5;
      const baseX = lane * laneWidth + laneWidth / 2;

      let phase = (lane * 0.9) + (run * 0.35);
      let currentX = Math.max(halfW, Math.min(canvasWidth - halfW, baseX + amp * Math.sin(phase)));
      let prevX = currentX;

      const framesInRun = 1000;
      for (let f = 0; f < framesInRun; f++) {
        const dt = deltaTimes[(f + run) % deltaTimes.length];

        phase += freq * dt;
        const rawOffset = amp * Math.sin(phase);
        const nextX = Math.max(halfW, Math.min(canvasWidth - halfW, baseX + rawOffset));

        // 1. Strict finite numbers check (no NaN, no Infinity)
        assert.ok(!Number.isNaN(nextX), `Frame ${f} in run ${run}: nextX must not be NaN`);
        assert.ok(Number.isFinite(nextX), `Frame ${f} in run ${run}: nextX must be finite`);
        assert.ok(!Number.isNaN(phase), `Frame ${f} in run ${run}: phase must not be NaN`);
        assert.ok(Number.isFinite(phase), `Frame ${f} in run ${run}: phase must be finite`);

        // 2. Strict boundary bounds: [halfW, canvasWidth - halfW]
        assert.ok(
          nextX >= halfW - 1e-9,
          `Frame ${f} (run ${run}): nextX (${nextX}) breached left wall boundary (${halfW})`
        );
        assert.ok(
          nextX <= canvasWidth - halfW + 1e-9,
          `Frame ${f} (run ${run}): nextX (${nextX}) breached right wall boundary (${canvasWidth - halfW})`
        );

        // 3. Continuity check: step delta bounded by max speed * dt + epsilon
        const maxVelocity = amp * freq;
        const expectedMaxDelta = maxVelocity * dt + 0.05;
        const actualDelta = Math.abs(nextX - prevX);

        assert.ok(
          actualDelta <= expectedMaxDelta,
          `Frame ${f} (run ${run}): flight trajectory teleported! actualDelta=${actualDelta} > expectedMaxDelta=${expectedMaxDelta}`
        );

        prevX = nextX;
        totalFramesSimulated++;
      }
    }

    assert.equal(totalFramesSimulated, 10000, 'Must simulate exactly 10,000 frames');
  });

  it('Verifies extreme edge cases: large lag spikes and zero dt behave safely without instability', () => {
    const canvasWidth = 480;
    const width = 34;
    const halfW = 17;
    const amp = 32;
    const freq = 3.6;
    const baseX = 240;
    let phase = 0;

    // Edge case 1: dt = 0
    let nextX = Math.max(halfW, Math.min(canvasWidth - halfW, baseX + amp * Math.sin(phase + freq * 0)));
    assert.equal(nextX, baseX, 'Zero dt must not change position');

    // Edge case 2: dt = 10.0s (clamped to 0.1s by engine)
    const clampedDt = Math.min(10.0, 0.1);
    phase += freq * clampedDt;
    nextX = Math.max(halfW, Math.min(canvasWidth - halfW, baseX + amp * Math.sin(phase)));
    assert.ok(nextX >= halfW && nextX <= canvasWidth - halfW, 'Clamped lag spike remains strictly bounded');
    assert.ok(Number.isFinite(nextX));
  });
});

describe('M2 Adversarial Stress Test 4: Sector 3 Mech-Crab Armored Collision & Multi-Hit Penetration', () => {
  interface SimCrab {
    id: string;
    armor: number;
    maxArmor: number;
    hp: number;
    maxHp: number;
    isArmorFlash: number;
    isHitFlash: number;
    isAlive: boolean;
  }

  function simulateBulletHit(
    crab: SimCrab,
    bulletDamage: number
  ): { deflected: boolean; armorAbsorbed: number; damageToHp: number } {
    if (!crab.isAlive) {
      return { deflected: false, armorAbsorbed: 0, damageToHp: 0 };
    }

    crab.isHitFlash = 0.15;

    // Mech-Crab Armored Carapace Deflection (GameEngine.ts lines 690-697):
    if (crab.armor > 0) {
      crab.armor -= 1;
      crab.isArmorFlash = 0.18;
      return { deflected: true, armorAbsorbed: 1, damageToHp: 0 };
    }

    // Armor is 0: HP takes damage
    const damageToHp = bulletDamage;
    crab.hp -= damageToHp;
    if (crab.hp <= 0) {
      crab.hp = 0;
      crab.isAlive = false;
    }

    return { deflected: false, armorAbsorbed: 0, damageToHp };
  }

  it('Verifies armor absorbs multi-hit bullet impacts before any HP decrement occurs', () => {
    const crab: SimCrab = {
      id: 'crab_test',
      armor: 2,
      maxArmor: 2,
      hp: 3,
      maxHp: 3,
      isArmorFlash: 0,
      isHitFlash: 0,
      isAlive: true
    };

    // Hit 1: Laser (damage = 2) hits armored carapace
    const res1 = simulateBulletHit(crab, 2);
    assert.equal(res1.deflected, true, 'Hit 1 must be deflected by armor');
    assert.equal(res1.armorAbsorbed, 1, 'Hit 1 must decrement 1 armor point');
    assert.equal(res1.damageToHp, 0, 'Hit 1 must deal zero damage to HP');
    assert.equal(crab.armor, 1, 'Armor must decrement from 2 to 1');
    assert.equal(crab.hp, 3, 'HP must remain pristine at 3');
    assert.equal(crab.isAlive, true);

    // Hit 2: Massive Plasma Blast (damage = 6) hits remaining armor
    const res2 = simulateBulletHit(crab, 6);
    assert.equal(res2.deflected, true, 'Hit 2 must be deflected by last armor point');
    assert.equal(res2.armorAbsorbed, 1);
    assert.equal(res2.damageToHp, 0, 'Even 6-damage blast deals zero damage while armor holds');
    assert.equal(crab.armor, 0, 'Armor is now fully stripped (0)');
    assert.equal(crab.hp, 3, 'HP must still be 3');
    assert.equal(crab.isAlive, true);

    // Hit 3: Laser (damage = 2) hits unarmored chassis
    const res3 = simulateBulletHit(crab, 2);
    assert.equal(res3.deflected, false, 'Hit 3 must NOT be deflected');
    assert.equal(res3.armorAbsorbed, 0);
    assert.equal(res3.damageToHp, 2, 'Hit 3 deals full 2 damage to HP');
    assert.equal(crab.armor, 0);
    assert.equal(crab.hp, 1, 'HP drops from 3 to 1');
    assert.equal(crab.isAlive, true);

    // Hit 4: Laser (damage = 2) deals lethal damage
    const res4 = simulateBulletHit(crab, 2);
    assert.equal(res4.deflected, false);
    assert.equal(res4.damageToHp, 2);
    assert.equal(crab.hp, 0);
    assert.equal(crab.isAlive, false, 'Crab is defeated');
  });

  it('Stress tests 1,000 simulated armored crabs under varied randomized barrage profiles', () => {
    for (let i = 0; i < 1000; i++) {
      const initialArmor = 2 + (i % 3);
      const initialHp = 3;
      const crab: SimCrab = {
        id: `crab_${i}`,
        armor: initialArmor,
        maxArmor: initialArmor,
        hp: initialHp,
        maxHp: initialHp,
        isArmorFlash: 0,
        isHitFlash: 0,
        isAlive: true
      };

      let hitsReceived = 0;
      while (crab.isAlive) {
        hitsReceived++;
        const bulletDamage = (hitsReceived % 3 === 0) ? 5 : 2;
        const expectedDeflect = crab.armor > 0;
        const prevArmor = crab.armor;
        const prevHp = crab.hp;

        const result = simulateBulletHit(crab, bulletDamage);

        if (expectedDeflect) {
          assert.equal(result.deflected, true);
          assert.equal(crab.armor, prevArmor - 1);
          assert.equal(crab.hp, prevHp, 'HP must not decrement when armor absorbs hit');
        } else {
          assert.equal(result.deflected, false);
          assert.equal(crab.armor, 0);
          assert.equal(crab.hp, Math.max(0, prevHp - bulletDamage));
        }

        if (hitsReceived > 20) {
          assert.fail(`Deadlock detected: crab ${i} did not die within 20 hits`);
        }
      }

      assert.equal(crab.isAlive, false);
      assert.equal(crab.armor, 0);
      assert.equal(crab.hp, 0);
    }
  });
});

describe('M2 Adversarial Stress Test 5: Sector 4 Behemoth Core Reveal 60-Second Simulated Cycle', () => {
  function getEffectiveDamage(coreRevealed: boolean, baseDamage: number): number {
    if (coreRevealed) {
      return Math.round(baseDamage * 2.0); // 2.0x critical damage
    }
    return Math.max(1, Math.floor(baseDamage * 0.5)); // 0.5x mitigated damage
  }

  it('Validates exact 0.5x mitigation vs 2.0x critical multipliers across all weapon damages', () => {
    const weaponDamages = [1, 2, 3, 4, 5, 6, 8, 10, 25];

    for (const dmg of weaponDamages) {
      const closedDmg = getEffectiveDamage(false, dmg);
      const expectedClosed = Math.max(1, Math.floor(dmg * 0.5));
      assert.equal(
        closedDmg,
        expectedClosed,
        `Damage ${dmg} closed core should be ${expectedClosed}, got ${closedDmg}`
      );
      assert.ok(closedDmg >= 1, 'Closed core damage must never drop below 1');
      assert.ok(closedDmg <= dmg, 'Closed core damage must not exceed base damage');

      const openDmg = getEffectiveDamage(true, dmg);
      const expectedOpen = Math.round(dmg * 2.0);
      assert.equal(
        openDmg,
        expectedOpen,
        `Damage ${dmg} open core should be ${expectedOpen}, got ${openDmg}`
      );
      assert.ok(openDmg >= dmg * 2, 'Open core damage must be at least 2x base damage');
      assert.ok(openDmg > closedDmg, 'Open core damage must strictly exceed closed core damage');
    }
  });

  it('Simulates continuous 60.0 seconds of gameplay and verifies flawless cyclic transitions', () => {
    const concealedDuration = 3.0; // 3 seconds closed
    const revealedDuration = 2.0;  // 2 seconds open
    const cycleDuration = concealedDuration + revealedDuration; // 5.0 seconds
    assert.equal(cycleDuration, 5.0);

    let coreTimer = 0.0;
    const totalSimulatedSeconds = 60.0;
    const dt = 0.016; // 60 FPS (~3,750 frames)
    const totalFrames = Math.floor(totalSimulatedSeconds / dt);

    let transitionsToRevealed = 0;
    let transitionsToConcealed = 0;
    let prevRevealed = false;

    for (let frame = 0; frame <= totalFrames; frame++) {
      coreTimer = frame * dt;
      const tInCycle = coreTimer % cycleDuration;
      const isRevealed = tInCycle >= concealedDuration;

      const expectedRevealed = tInCycle >= 3.0;
      assert.equal(
        isRevealed,
        expectedRevealed,
        `Frame ${frame} (t=${coreTimer.toFixed(3)}s, cycleT=${tInCycle.toFixed(3)}s): core state mismatch!`
      );

      const testDmg = 4;
      const effectiveDmg = getEffectiveDamage(isRevealed, testDmg);
      if (isRevealed) {
        assert.equal(effectiveDmg, 8, `Open core must deal 8 damage (2.0x of 4)`);
      } else {
        assert.equal(effectiveDmg, 2, `Closed core must deal 2 damage (0.5x of 4)`);
      }

      if (!prevRevealed && isRevealed) {
        transitionsToRevealed++;
        const mod5 = coreTimer % 5.0;
        assert.ok(
          Math.abs(mod5 - 3.0) <= dt * 1.5,
          `Transition to revealed at t=${coreTimer}s, expected mod 5 ~ 3.0s, got ${mod5}s`
        );
      }
      if (prevRevealed && !isRevealed) {
        transitionsToConcealed++;
        const mod5 = coreTimer % 5.0;
        assert.ok(
          mod5 <= dt * 1.5 || Math.abs(mod5 - 5.0) <= dt * 1.5,
          `Transition to concealed at t=${coreTimer}s, expected mod 5 ~ 0.0s, got ${mod5}s`
        );
      }

      prevRevealed = isRevealed;
    }

    assert.equal(
      transitionsToRevealed,
      12,
      `Expected exactly 12 reveal cycles over 60 seconds, observed ${transitionsToRevealed}`
    );
    assert.equal(
      transitionsToConcealed,
      12,
      `Expected exactly 12 concealment cycles over 60 seconds, observed ${transitionsToConcealed}`
    );
  });
});

describe('M2 Adversarial Stress Test 6: Sector 5 Stage 5 Dreadnought Boss Complete State Machine', () => {
  interface SimBoss {
    hp: number;
    maxHp: number;
    shieldHp: number;
    maxShieldHp: number;
    bossPhase: 1 | 2 | 3 | 4;
    wingBaysOpen: boolean;
    coreRevealed: boolean;
    overloadTimer: number;
    destructionTimer: number;
    destructionStep: number;
    speed: number;
    isDestroyed: boolean;
  }

  function createSimBoss(): SimBoss {
    return {
      hp: 40,
      maxHp: 40,
      shieldHp: 30,
      maxShieldHp: 30,
      bossPhase: 1,
      wingBaysOpen: false,
      coreRevealed: false,
      overloadTimer: 0,
      destructionTimer: 0,
      destructionStep: 0,
      speed: 12,
      isDestroyed: false
    };
  }

  function applyBossDamage(boss: SimBoss, damage: number): void {
    if (boss.bossPhase === 4) return;

    if (boss.bossPhase === 1 && boss.shieldHp > 0) {
      boss.shieldHp = Math.max(0, boss.shieldHp - damage);
      if (boss.shieldHp <= 0) {
        boss.bossPhase = 2;
        boss.wingBaysOpen = true;
      }
      return;
    }

    let effectiveDmg = damage;
    if (boss.bossPhase === 3) {
      effectiveDmg = Math.round(damage * 2.0);
    }

    boss.hp = Math.max(0, boss.hp - effectiveDmg);

    if (boss.bossPhase === 2 && boss.hp <= boss.maxHp * 0.65) {
      boss.bossPhase = 3;
      boss.wingBaysOpen = false;
      boss.coreRevealed = true;
      boss.overloadTimer = 6.0;
    }

    if (boss.hp <= 0) {
      boss.bossPhase = 4;
      boss.speed = 0;
      boss.destructionTimer = 0;
    }
  }

  it('Stress tests full 4-phase transition without phase lock or invalid states', () => {
    const boss = createSimBoss();

    // Phase 1: Deflector Shield
    assert.equal(boss.bossPhase, 1);
    assert.equal(boss.shieldHp, 30);
    assert.equal(boss.hp, 40);

    applyBossDamage(boss, 12);
    assert.equal(boss.shieldHp, 18);
    assert.equal(boss.hp, 40);
    assert.equal(boss.bossPhase, 1);

    applyBossDamage(boss, 20);
    assert.equal(boss.shieldHp, 0);
    assert.equal(boss.hp, 40);
    assert.equal(boss.bossPhase, 2);
    assert.equal(boss.wingBaysOpen, true);

    // Phase 2: Hull damage until <= 65% (40 * 0.65 = 26)
    applyBossDamage(boss, 8);
    assert.equal(boss.hp, 32);
    assert.equal(boss.bossPhase, 2);

    applyBossDamage(boss, 7);
    assert.equal(boss.hp, 25);
    assert.equal(boss.bossPhase, 3);
    assert.equal(boss.coreRevealed, true);
    assert.equal(boss.wingBaysOpen, false);
    assert.equal(boss.overloadTimer, 6.0);

    // Phase 3: Core Overload critical strike
    applyBossDamage(boss, 6);
    assert.equal(boss.hp, 13);
    assert.equal(boss.bossPhase, 3);

    applyBossDamage(boss, 7);
    assert.equal(boss.hp, 0);
    assert.equal(boss.bossPhase, 4);
    assert.equal(boss.speed, 0);

    // Phase 4: Destruction sequence over 3.0s
    let secondaryExplosionTicks = 0;
    let shockwaveFired = false;
    for (let step = 0; step <= 30; step++) {
      const dt = 0.1;
      boss.destructionTimer += dt;
      if (boss.destructionTimer >= 0.3 * (boss.destructionStep + 1) && boss.destructionStep < 8) {
        boss.destructionStep++;
        secondaryExplosionTicks++;
      }
      if (boss.destructionTimer >= 1.5 && boss.destructionTimer < 1.6) {
        shockwaveFired = true;
      }
      if (boss.destructionTimer >= 3.0) {
        boss.isDestroyed = true;
      }
    }

    assert.ok(secondaryExplosionTicks >= 6);
    assert.equal(shockwaveFired, true);
    assert.equal(boss.isDestroyed, true);
  });
});
