import { GameState } from '../models/GameState.ts';
import type { Alien, Bullet, AlienType } from '../models/GameState.ts';
import { Renderer } from './Renderer.ts';
import { MathEngine } from '../math/MathEngine.ts';
import type { MathProblem } from '../math/MathEngine.ts';
import { soundEngine } from './SoundEngine.ts';
import { updateActiveProfile } from '../models/Profile.ts';
import type { PlayerProfile } from '../models/Profile.ts';
import { getStageWaveConfig } from './SectorConfig.ts';
import type { StageWaveConfig } from './SectorConfig.ts';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  public state: GameState;
  private mathEngine: MathEngine;
  private profile: PlayerProfile;
  private lastTime: number = 0;
  private animId: number = 0;

  // Active in-stage upgrade problem
  private activeUpgradeProblem: MathProblem | null = null;

  // Callbacks for UI sync
  private onMathProblemUpdate: (lane: number, question: string, options?: number[]) => void = () => {};
  private onHudUpdate: (score: number, lives: number, progressRatio: number, tier: number, solved: number, required: number) => void = () => {};
  private onUpgradeStatusUpdate: (tier: number, solved: number, required: number, problem: MathProblem | null) => void = () => {};
  private onStageVictory: (stars: number, coinsWon: number, diamondsWon: number) => void = () => {};
  private onGameOver: () => void = () => {};

  constructor(canvas: HTMLCanvasElement, profile: PlayerProfile) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.renderer = new Renderer(this.ctx);
    this.state = new GameState();
    if (profile.mathSettings?.descentSpeedMultiplier) {
      this.state.descentSpeedMultiplier = profile.mathSettings.descentSpeedMultiplier;
    }
    this.profile = profile;
    this.mathEngine = new MathEngine(profile.mathSettings);

    this.setupCanvasInteractions();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private setupCanvasInteractions(): void {
    // Direct pointer/touch click on canvas selects that lane
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const laneWidth = rect.width / this.state.laneCount;
      const clickedLane = Math.min(4, Math.max(0, Math.floor(clickX / laneWidth)));
      this.selectLane(clickedLane);
    });
  }

  public setCallbacks(callbacks: {
    onMathProblemUpdate: (lane: number, question: string, options?: number[]) => void;
    onHudUpdate: (score: number, lives: number, progressRatio: number, tier: number, solved: number, required: number) => void;
    onUpgradeStatusUpdate: (tier: number, solved: number, required: number, problem: MathProblem | null) => void;
    onStageVictory: (stars: number, coinsWon: number, diamondsWon: number) => void;
    onGameOver: () => void;
  }): void {
    this.onMathProblemUpdate = callbacks.onMathProblemUpdate;
    this.onHudUpdate = callbacks.onHudUpdate;
    this.onUpgradeStatusUpdate = callbacks.onUpgradeStatusUpdate;
    this.onStageVictory = callbacks.onStageVictory;
    this.onGameOver = callbacks.onGameOver;
  }

  public resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.canvas.width = Math.floor(rect.width);
      this.canvas.height = Math.floor(rect.height);
      this.state.canvasWidth = this.canvas.width;
      this.state.canvasHeight = this.canvas.height;
      this.state.playerY = this.canvas.height - 45; // Clearly visible player ship
      this.state.playerX = this.state.getLaneCenterX(this.state.playerLane);
      this.state.playerTargetX = this.state.getLaneCenterX(this.state.playerLane);
    }
  }

  public getEquippedTier(shipId?: string): number {
    if (!shipId) return 1;
    if (shipId === 'tier4_flagship') return 4;
    if (shipId === 'tier3_vanguard' || shipId === 'tier3_cruiser') return 3;
    if (shipId === 'tier2_hunter') return 2;
    return 1;
  }

  public updateProfile(newProfile: PlayerProfile): void {
    this.profile = newProfile;
    if (newProfile.mathSettings) {
      this.mathEngine.updateSettings(newProfile.mathSettings);
      if (newProfile.mathSettings.descentSpeedMultiplier) {
        this.state.descentSpeedMultiplier = newProfile.mathSettings.descentSpeedMultiplier;
      }
    }
    const tier = this.getEquippedTier(newProfile.equippedShipId);
    this.state.inStageUpgradeTier = tier;
    this.state.upgradesSolvedThisTier = 0;
    this.state.upgradesRequiredForNextTier = tier < 4 ? tier : 0;

    // Refresh active math problems if a stage is running so grade changes take effect immediately
    if (this.state.isRunning) {
      for (let l = 0; l < 5; l++) {
        this.state.laneProblems[l] = this.mathEngine.generateProblemForLane(l);
      }
      this.activeUpgradeProblem = this.mathEngine.generateUpgradeProblem();
      const activeProb = this.state.laneProblems[this.state.selectedLane];
      if (activeProb) {
        this.onMathProblemUpdate(this.state.selectedLane, activeProb.question, activeProb.options);
      }
    }
    this.notifyUpgradeStatus();
  }

  public startStage(sector: number, stage: number): void {
    const waveConfig = getStageWaveConfig(sector, stage);
    this.state = new GameState();
    this.state.descentSpeedMultiplier = this.profile?.mathSettings?.descentSpeedMultiplier ?? 1.0;
    const startTier = this.getEquippedTier(this.profile?.equippedShipId);
    this.state.inStageUpgradeTier = startTier;
    this.state.upgradesSolvedThisTier = 0;
    this.state.upgradesRequiredForNextTier = startTier < 4 ? startTier : 0;
    this.state.sectorId = sector;
    this.state.stageId = stage;
    this.state.isBossStage = waveConfig.isBossStage;
    this.state.totalAliensWave = waveConfig.formationGrid.flat().filter(Boolean).length;
    this.state.stageCompleted = false;
    this.state.marchInterval = waveConfig.marchInterval;
    this.state.marchStepY = waveConfig.marchStepY;
    this.state.aliensDefeated = 0;
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.state.stageStartTime = performance.now();

    this.resizeCanvas();

    // Populate initial math problems for all 5 lanes
    for (let l = 0; l < 5; l++) {
      this.state.laneProblems[l] = this.mathEngine.generateProblemForLane(l);
    }
    this.selectLane(2); // Center lane default

    // Generate in-stage upgrade problem
    this.activeUpgradeProblem = this.mathEngine.generateUpgradeProblem();
    this.notifyUpgradeStatus();

    // Spawn initial wave of aliens
    this.spawnAlienFormation();

    this.lastTime = performance.now();
    cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(t => this.gameLoop(t));
  }

  private spawnAlienFormation(): void {
    const waveConfig = getStageWaveConfig(this.state.sectorId, this.state.stageId);
    const grid = waveConfig.formationGrid;

    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let l = 0; l < 5; l++) {
        const type = row[l];
        if (!type) continue;
        this.spawnConfiguredAlien(l, 35 + r * 44, type, waveConfig);
      }
    }
  }

  private spawnConfiguredAlien(
    lane: number,
    yPos: number,
    type: AlienType,
    waveConfig: StageWaveConfig
  ): void {
    const x = this.state.getLaneCenterX(lane);
    const hpMap: Record<AlienType, number> = {
      scout: 6 + Math.floor((this.state.sectorId - 1) * 1.5),
      crab: 6,
      behemoth: 12,
      boss: waveConfig.bossType === 'dreadnought' ? 40 : 20,
      minion_drone: 4
    };
    const scoreMap: Record<AlienType, number> = {
      scout: 100,
      crab: 200,
      behemoth: 400,
      boss: 5000,
      minion_drone: 75
    };
    const sizeMap: Record<AlienType, { w: number; h: number }> = {
      scout: { w: 34, h: 34 },
      crab: { w: 40, h: 36 },
      behemoth: { w: 48, h: 48 },
      boss: { w: 96, h: 72 },
      minion_drone: { w: 26, h: 26 }
    };

    const alien: Alien = {
      id: 'alien_' + Math.random().toString(36).substring(2, 8),
      lane,
      x,
      y: yPos,
      type,
      hp: hpMap[type] ?? 1,
      maxHp: hpMap[type] ?? 1,
      scoreValue: scoreMap[type] ?? 100,
      width: sizeMap[type]?.w ?? 34,
      height: sizeMap[type]?.h ?? 34,
      speed: waveConfig.baseSpeed,
      isHitFlash: 0
    };

    // Sector 2: Horizontal Zigzag Movement (Scouts, Crabs, Minions)
    if (waveConfig.enableZigzag && (type === 'scout' || type === 'minion_drone' || type === 'crab')) {
      alien.baseX = x;
      alien.oscillationAmp = waveConfig.zigzagAmplitude ?? 26;
      alien.oscillationFreq = waveConfig.zigzagFrequency ?? 3.0;
      alien.oscillationPhase = (lane * 0.9) + Math.random() * 0.5;
    }

    // Sector 3: Armored Enforcers
    if (type === 'crab' && waveConfig.enableArmor) {
      alien.armor = waveConfig.armorPoints ?? 2;
      alien.maxArmor = waveConfig.armorPoints ?? 2;
      alien.isArmorFlash = 0;
    }

    // Sector 4: Energy Core Reveals
    if (type === 'behemoth' && waveConfig.enableCoreReveal) {
      alien.hasEnergyCore = true;
      alien.coreRevealed = false;
      alien.coreTimer = Math.random() * 1.5;
      alien.coreConcealedDuration = waveConfig.coreConcealedDuration ?? 3.0;
      alien.coreRevealedDuration = waveConfig.coreRevealedDuration ?? 2.0;
    }

    // Sector 5: Colossal Dreadnought Boss State Machine
    if (type === 'boss') {
      alien.isBoss = true;
      if (waveConfig.bossType === 'dreadnought') {
        alien.bossPhase = 1;
        alien.shieldHp = 30;
        alien.maxShieldHp = 30;
        alien.overloadTimer = 0;
        alien.minionsSpawned = false;
        alien.wingBaysOpen = false;
        alien.destructionTimer = 0;
        alien.destructionStep = 0;
      } else {
        alien.bossPhase = 1;
      }
    }

    this.state.aliens.push(alien);
  }

  public spawnAlienInLane(lane: number, yPos: number, type: 'scout' | 'crab' | 'behemoth' | 'boss'): void {
    const waveConfig = getStageWaveConfig(this.state.sectorId, this.state.stageId);
    this.spawnConfiguredAlien(lane, yPos, type, waveConfig);
  }

  private spawnMinionDrones(boss: Alien): void {
    if (boss.minionsSpawned) return;
    boss.minionsSpawned = true;
    const waveConfig = getStageWaveConfig(this.state.sectorId, this.state.stageId);
    soundEngine.playLaser(1);
    const spawnLanes = [1, 3];
    for (const lane of spawnLanes) {
      this.spawnConfiguredAlien(lane, boss.y + 36, 'minion_drone', {
        ...waveConfig,
        baseSpeed: 24,
        enableZigzag: true,
        zigzagAmplitude: 20,
        zigzagFrequency: 3.2
      });
    }
  }

  private triggerBossDestruction(boss: Alien): void {
    boss.bossPhase = 4;
    boss.hp = 0;
    boss.destructionTimer = 0;
    boss.destructionStep = 0;
    boss.destructionShockwaveFired = false;
    boss.speed = 0;
    this.state.screenShakeTimer = 3.0;
    this.state.screenShakeIntensity = 8.0;
    soundEngine.playExplosion('boss');
  }

  private updateBossDestruction(boss: Alien, dt: number): void {
    if (this.state.isGameOver || this.state.lives <= 0) return;

    boss.destructionTimer = (boss.destructionTimer ?? 0) + dt;
    const timer = boss.destructionTimer ?? 0;
    const step = boss.destructionStep ?? 0;

    // Staggered secondary wing explosions
    if (timer >= 0.3 * (step + 1) && step < 8) {
      boss.destructionStep = step + 1;
      const offsetX = (Math.random() - 0.5) * boss.width * 0.9;
      const offsetY = (Math.random() - 0.5) * boss.height * 0.9;
      this.spawnExplosionParticles(boss.x + offsetX, boss.y + offsetY, '#ff6d00', 12);
      this.spawnExplosionParticles(boss.x + offsetX, boss.y + offsetY, '#ffd600', 6);
      soundEngine.playExplosion('small');
      this.state.screenShakeTimer = Math.max(this.state.screenShakeTimer, 0.4);
      this.state.screenShakeIntensity = 6.0;
    }

    // Meltdown white shockwave flare at 1.5s
    if (timer >= 1.5 && !boss.destructionShockwaveFired) {
      boss.destructionShockwaveFired = true;
      this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 30);
      this.spawnExplosionParticles(boss.x, boss.y, '#00f3ff', 20);
      soundEngine.playExplosion('large');
      this.state.screenShakeIntensity = 10.0;
    }

    // Catastrophic completion at 3.0s
    if (timer >= 3.0) {
      for (const remaining of this.state.aliens) {
        if (remaining !== boss) {
          this.state.aliensDefeated++;
          this.state.score += remaining.scoreValue;
          this.spawnExplosionParticles(remaining.x, remaining.y, '#00f3ff', 12);
        }
      }
      this.state.aliens = [];
      this.state.aliensDefeated++;
      this.state.score += boss.scoreValue;
      this.spawnExplosionParticles(boss.x, boss.y, '#ff6d00', 60);
      this.spawnExplosionParticles(boss.x, boss.y, '#00f3ff', 30);
      this.spawnExplosionParticles(boss.x, boss.y, '#ffffff', 30);
      soundEngine.playExplosion('boss');
      if (!this.state.isGameOver && this.state.lives > 0) {
        this.handleStageVictory();
      }
    }
  }

  public selectLane(laneIndex: number): void {
    if (typeof laneIndex !== 'number' || Number.isNaN(laneIndex) || laneIndex < 0 || laneIndex >= 5) return;
    this.state.selectedLane = laneIndex;

    // Refresh problem if needed
    if (!this.state.laneProblems[laneIndex]) {
      this.state.laneProblems[laneIndex] = this.mathEngine.generateProblemForLane(laneIndex);
    }

    const prob = this.state.laneProblems[laneIndex]!;
    this.onMathProblemUpdate(laneIndex, prob.question, prob.options);
  }

  public shiftLane(direction: -1 | 1): void {
    const nextLane = Math.min(4, Math.max(0, this.state.selectedLane + direction));
    this.selectLane(nextLane);
  }

  /**
   * Unified telemetry logger for all math challenges (combat lane and upgrade capacitor).
   * Updates lifetime PlayerStats, calculates weighted moving average response time,
   * stores bounded problem history, and persists the active profile.
   */
  private recordProblemTelemetry(
    question: string,
    userAnswer: number,
    correctAnswer: number,
    isCorrect: boolean,
    timeTakenMs: number,
    operation: string
  ): void {
    if (!this.profile.stats) {
      this.profile.stats = {
        totalSolved: 0,
        totalCorrect: 0,
        totalErrors: 0,
        averageTimeMs: 0,
        problemHistory: []
      };
    }

    const stats = this.profile.stats;
    const roundedTime = Math.max(0, Math.round(timeTakenMs));

    // Update cumulative lifetime counters
    stats.totalSolved = (stats.totalSolved || 0) + 1;
    if (isCorrect) {
      stats.totalCorrect = (stats.totalCorrect || 0) + 1;
    } else {
      stats.totalErrors = (stats.totalErrors || 0) + 1;
    }

    // Weighted moving average response time in milliseconds
    const prevSolved = stats.totalSolved - 1;
    stats.averageTimeMs = prevSolved > 0
      ? Math.round(((stats.averageTimeMs || 0) * prevSolved + roundedTime) / stats.totalSolved)
      : roundedTime;

    if (!Array.isArray(stats.problemHistory)) {
      stats.problemHistory = [];
    }

    // Append to detailed history
    stats.problemHistory.push({
      timestamp: Date.now(),
      question,
      userAnswer,
      correctAnswer,
      isCorrect,
      timeTakenMs: roundedTime,
      operation
    });

    // Bound detailed history to 300 entries to protect localStorage quota
    if (stats.problemHistory.length > 300) {
      stats.problemHistory = stats.problemHistory.slice(-300);
    }

    // Persist to storage
    updateActiveProfile(this.profile);
  }

  public submitMathAnswer(userAnswer: number): boolean {
    const activeProblem = this.state.laneProblems[this.state.selectedLane];
    if (!activeProblem) return false;

    const isCorrect = userAnswer === activeProblem.answer;
    const timeTaken = performance.now() - activeProblem.startTime;

    this.state.totalQuestionsAnswered++;

    // Record to Profile Stats Telemetry
    this.recordProblemTelemetry(
      activeProblem.question,
      userAnswer,
      activeProblem.answer,
      isCorrect,
      timeTaken,
      activeProblem.operation
    );

    if (isCorrect) {
      this.state.correctAnswersCount++;
      this.state.combo++;
      this.state.score += 250 + this.state.combo * 50;
      soundEngine.playCorrectAnswer();

      // Ship ONLY moves to selected lane when math question is answered correctly!
      this.state.playerLane = this.state.selectedLane;
      this.state.playerTargetX = this.state.getLaneCenterX(this.state.selectedLane);
      this.state.playerX = this.state.playerTargetX;

      // Unleash amplified defensive salvo in this lane!
      this.fireAmplifiedSalvo(this.state.selectedLane);

      // Generate replacement math problem for this lane
      this.state.laneProblems[this.state.selectedLane] = this.mathEngine.generateProblemForLane(this.state.selectedLane);
      const nextProb = this.state.laneProblems[this.state.selectedLane]!;
      this.onMathProblemUpdate(this.state.selectedLane, nextProb.question, nextProb.options);

      return true;
    } else {
      this.state.wrongAnswersCount++;
      this.state.combo = 0;
      this.state.weaponJamTimer = 1.2;
      soundEngine.playWrongAnswer();
      // On incorrect answer, ship stays in current playerLane!
      return false;
    }
  }

  // Non-blocking in-stage upgrade solve
  public submitUpgradeAnswer(userAnswer: number): { success: boolean; tierChanged: boolean } {
    if (!this.activeUpgradeProblem) return { success: false, tierChanged: false };

    const isCorrect = userAnswer === this.activeUpgradeProblem.answer;
    const timeTaken = performance.now() - this.activeUpgradeProblem.startTime;

    // Log upgrade problem to telemetry
    this.recordProblemTelemetry(
      this.activeUpgradeProblem.question,
      userAnswer,
      this.activeUpgradeProblem.answer,
      isCorrect,
      timeTaken,
      this.activeUpgradeProblem.operation || 'upgrade'
    );

    if (isCorrect) {
      this.state.upgradesSolvedThisTier++;
      soundEngine.playCorrectAnswer();
      let tierChanged = false;

      if (this.state.upgradesSolvedThisTier >= this.state.upgradesRequiredForNextTier) {
        if (this.state.inStageUpgradeTier < 4) {
          this.state.inStageUpgradeTier++;
          this.state.upgradesSolvedThisTier = 0;
          this.state.upgradesRequiredForNextTier++;
          tierChanged = true;
          soundEngine.playUpgradeFanfare();
        }
      }

      this.activeUpgradeProblem = this.mathEngine.generateUpgradeProblem();
      this.notifyUpgradeStatus();
      return { success: true, tierChanged };
    } else {
      // On incorrect attempt, reset timer for next attempt
      this.activeUpgradeProblem.startTime = performance.now();
      soundEngine.playWrongAnswer();
      return { success: false, tierChanged: false };
    }
  }

  public notifyUpgradeStatus(): void {
    this.onUpgradeStatusUpdate(
      this.state.inStageUpgradeTier,
      this.state.upgradesSolvedThisTier,
      this.state.upgradesRequiredForNextTier,
      this.activeUpgradeProblem
    );
  }

  public getMathEngine(): MathEngine {
    return this.mathEngine;
  }

  public getActiveUpgradeProblem(): MathProblem | null {
    return this.activeUpgradeProblem;
  }

  public getActiveMathProblem(): MathProblem | null {
    return this.state.laneProblems[this.state.selectedLane] || null;
  }

  private fireAmplifiedSalvo(lane: number): void {
    const cx = this.state.getLaneCenterX(lane);
    const y = this.state.playerY - 20;
    const tier = this.state.inStageUpgradeTier;

    soundEngine.playLaser(tier);

    if (tier === 1) {
      for (let i = 0; i < 3; i++) {
        this.spawnBullet(cx, y - i * 15, 0, -440, 'laser', 1, lane, 0, '#00ff66');
      }
    } else if (tier === 2) {
      this.spawnBullet(cx - 10, y, 0, -460, 'laser', 3, lane, 0, '#ffb700');
      this.spawnBullet(cx + 10, y, 0, -460, 'laser', 3, lane, 0, '#ffb700');
      this.spawnBullet(cx, y, -60, -420, 'vspread', 2, Math.max(0, lane - 1), 0, '#ffd600');
      this.spawnBullet(cx, y, 60, -420, 'vspread', 2, Math.min(4, lane + 1), 0, '#ffd600');
    } else if (tier === 3) {
      this.spawnBullet(cx, y, 0, -520, 'plasma', 6, lane, 2, '#00f3ff');
      this.spawnBullet(cx - 14, y, 0, -460, 'laser', 3, lane, 0, '#00e5ff');
      this.spawnBullet(cx + 14, y, 0, -460, 'laser', 3, lane, 0, '#00e5ff');
    } else {
      this.spawnBullet(cx, y, 0, -580, 'plasma', 10, lane, 3, '#bc13fe');
      this.spawnBullet(cx, y, -120, -400, 'lightning', 6, Math.max(0, lane - 1), 0, '#00e5ff');
      this.spawnBullet(cx, y, 120, -400, 'lightning', 6, Math.min(4, lane + 1), 0, '#00e5ff');
    }
  }

  private spawnDamageText(x: number, y: number, text: string, color: string, isCrit: boolean = false): void {
    if (!this.state.damageTexts) {
      this.state.damageTexts = [];
    }
    this.state.damageTexts.push({
      id: 'dt_' + Math.random().toString(36).substring(2, 7),
      x: x + (Math.random() - 0.5) * 16,
      y: y - 10,
      vy: -55,
      text,
      color,
      life: 0.65,
      maxLife: 0.65,
      isCrit
    });
  }

  private spawnBullet(
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: 'laser' | 'vspread' | 'plasma' | 'lightning',
    damage: number,
    lane: number,
    pierceRemaining: number = 0,
    color?: string
  ): void {
    const bullet: Bullet = {
      id: 'bullet_' + Math.random().toString(36).substring(2, 7),
      x,
      y,
      vx,
      vy,
      type,
      damage,
      lane,
      width: type === 'plasma' ? 18 : type === 'lightning' ? 12 : 8,
      height: type === 'plasma' ? 24 : type === 'lightning' ? 18 : 14,
      pierceRemaining,
      hitAlienIds: [],
      color
    };
    this.state.bullets.push(bullet);
  }

  private gameLoop(time: number): void {
    if (!this.state.isRunning) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (!this.state.isPaused) {
      this.update(dt);
    }

    this.renderer.render(this.state, dt);

    const progress = Math.min(1, this.state.aliensDefeated / this.state.totalAliensWave);
    this.onHudUpdate(
      this.state.score,
      this.state.lives,
      progress,
      this.state.inStageUpgradeTier,
      this.state.upgradesSolvedThisTier,
      this.state.upgradesRequiredForNextTier
    );

    this.animId = requestAnimationFrame(t => this.gameLoop(t));
  }

  private update(dt: number): void {
    // 1. Interpolate Ship Movement
    this.state.playerX += (this.state.playerTargetX - this.state.playerX) * Math.min(1, dt * 14);

    // 2. Weapon Jam & Continuous Base Defense Fire
    if (this.state.weaponJamTimer > 0) {
      this.state.weaponJamTimer -= dt;
    } else {
      this.state.fireCooldown -= dt;
      if (this.state.fireCooldown <= 0) {
        this.fireContinuousBaseShot();
        const baseInterval = Math.max(0.18, 0.35 - (this.state.inStageUpgradeTier - 1) * 0.04);
        this.state.fireCooldown = baseInterval;
      }
    }

    // 3. Screen Shake Decay
    if (this.state.screenShakeTimer > 0) {
      this.state.screenShakeTimer -= dt;
    }

    // 4. Update Continuous Alien State (Oscillation, Core Cycles, Boss State Machine)
    for (const alien of this.state.aliens) {
      if (alien.bossPhase === 4) {
        this.updateBossDestruction(alien, dt);
        continue;
      }

      // Horizontal Sinusoidal Oscillation (Sector 2 Asteroid Belt Swarms)
      if (alien.oscillationAmp && alien.oscillationFreq) {
        alien.oscillationPhase = (alien.oscillationPhase ?? 0) + alien.oscillationFreq * dt;
        const offset = alien.oscillationAmp * Math.sin(alien.oscillationPhase);
        const baseX = alien.baseX ?? alien.x;
        const halfW = alien.width / 2;
        alien.x = Math.max(halfW, Math.min(this.state.canvasWidth - halfW, baseX + offset));
      }

      // Energy Core Reveal Cycle (Sector 4 Heavy Assault Behemoths)
      if (alien.hasEnergyCore || (alien.type === 'behemoth' && alien.coreTimer !== undefined)) {
        alien.coreTimer = (alien.coreTimer ?? 0) + dt;
        const concealed = alien.coreConcealedDuration ?? 3.0;
        const revealed = alien.coreRevealedDuration ?? 2.0;
        const cycle = concealed + revealed;
        const t = alien.coreTimer % cycle;
        const wasRevealed = alien.coreRevealed;
        alien.coreRevealed = t >= concealed;
        if (!wasRevealed && alien.coreRevealed) {
          this.spawnExplosionParticles(alien.x, alien.y, '#76ff03', 6);
        }
      }

      // Hit & Armor Flash Decay
      if (alien.isHitFlash > 0) alien.isHitFlash -= dt;
      if (alien.isArmorFlash && alien.isArmorFlash > 0) alien.isArmorFlash -= dt;

      // Dreadnought Boss State Machine Updates
      if (alien.type === 'boss' && alien.isBoss) {
        if (alien.bossPhase === 1) {
          if ((alien.shieldHp ?? 0) <= 0) {
            // Deflector shield collapsed -> Transition to Phase 2 (Minions)
            alien.bossPhase = 2;
            alien.wingBaysOpen = true;
            this.spawnMinionDrones(alien);
            this.spawnExplosionParticles(alien.x, alien.y, '#bc13fe', 24);
            this.spawnExplosionParticles(alien.x, alien.y, '#00f3ff', 12);
            soundEngine.playExplosion('large');
          }
        } else if (alien.bossPhase === 2) {
          // Escort minions deployed. Transition when hull damaged <= 65% or escort minions defeated
          const otherAliensAlive = this.state.aliens.some(a => a !== alien);
          if (alien.hp <= alien.maxHp * 0.65 || !otherAliensAlive) {
            alien.bossPhase = 3;
            alien.wingBaysOpen = false;
            alien.coreRevealed = true;
            alien.overloadTimer = 6.0;
            soundEngine.playCoreAlarm();
            this.spawnExplosionParticles(alien.x, alien.y, '#ffd600', 16);
          }
        } else if (alien.bossPhase === 3) {
          // Core Overload vulnerability window (6.0s countdown)
          alien.overloadTimer = (alien.overloadTimer ?? 6.0) - dt;
          if (alien.overloadTimer <= 0) {
            if (alien.hp > 0) {
              // Emergency shield reboot -> cycle back to Phase 1
              alien.bossPhase = 1;
              alien.shieldHp = 15;
              alien.maxShieldHp = 15;
              alien.coreRevealed = false;
              soundEngine.playShieldDeflect();
            } else {
              this.triggerBossDestruction(alien);
            }
          }
        }
      }
    }

    // 5. March Rhythm & Alien Movement (Aliens descend continuously!)
    this.state.marchTimer += dt * (this.state.descentSpeedMultiplier ?? 1.0);
    const remainingRatio = Math.max(0.2, this.state.aliens.length / this.state.totalAliensWave);
    const currentMarchInterval = Math.max(0.35, this.state.marchInterval * remainingRatio);

    if (this.state.marchTimer >= currentMarchInterval) {
      this.state.marchTimer = 0;
      soundEngine.playAlienMarchNext();

      for (const alien of this.state.aliens) {
        if (alien.bossPhase === 4) continue;
        alien.y += this.state.marchStepY;

        if (alien.y >= this.state.playerY) {
          this.handleAlienBreach(alien);
        }
      }
    }

    // 6. Update Bullets & Damage Collision
    for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const b = this.state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      let bulletHit = false;
      for (let j = this.state.aliens.length - 1; j >= 0; j--) {
        const alien = this.state.aliens[j];
        if (alien.bossPhase === 4) continue;

        // Piercing check: if bullet already damaged this alien, skip
        if (b.hitAlienIds && b.hitAlienIds.includes(alien.id)) {
          continue;
        }

        const isHit = alien.isBoss
          ? Math.abs(b.x - alien.x) <= alien.width * 0.55 && Math.abs(b.y - alien.y) <= alien.height * 0.55
          : Math.hypot(b.x - alien.x, b.y - alien.y) < (alien.width + b.width) / 2;

        if (isHit) {
          bulletHit = true;
          alien.isHitFlash = 0.15;
          if (!b.hitAlienIds) b.hitAlienIds = [];
          b.hitAlienIds.push(alien.id);

          // 1. Boss Deflector Shield Absorption (Phase 1)
          if (alien.type === 'boss' && alien.shieldHp && alien.shieldHp > 0) {
            alien.shieldHp = Math.max(0, alien.shieldHp - b.damage);
            alien.isArmorFlash = 0.15;
            this.spawnExplosionParticles(b.x, b.y, '#bc13fe', 8);
            this.spawnExplosionParticles(b.x, b.y, '#00f3ff', 4);
            this.spawnDamageText(b.x, b.y, `-${b.damage} SHIELD`, '#00f3ff');
            soundEngine.playShieldDeflect();
            break;
          }

          // 2. Mech-Crab Armored Carapace Deflection (absorbs damage first)
          if (alien.armor && alien.armor > 0) {
            alien.armor -= 1;
            alien.isArmorFlash = 0.18;
            this.spawnExplosionParticles(b.x, b.y, '#00e5ff', 8);
            this.spawnExplosionParticles(b.x, b.y, '#ffd600', 4);
            this.spawnDamageText(b.x, b.y, 'BLOCKED', '#00e5ff');
            soundEngine.playArmorDeflect();
            break;
          }

          // 3. Behemoth Core Reveal / Dreadnought Core Overload Critical Damage
          let effectiveDamage = b.damage;
          if (alien.hasEnergyCore || alien.type === 'behemoth') {
            if (alien.coreRevealed) {
              effectiveDamage = Math.round(b.damage * 2.0); // 2.0x critical damage
              this.spawnExplosionParticles(b.x, b.y, '#76ff03', 12);
              this.spawnExplosionParticles(b.x, b.y, '#ffffff', 6);
              this.spawnDamageText(b.x, b.y, `CRIT -${effectiveDamage}!`, '#76ff03', true);
            } else {
              effectiveDamage = Math.max(1, Math.floor(b.damage * 0.5)); // 0.5x mitigated damage
              this.spawnExplosionParticles(b.x, b.y, '#ffd600', 6);
              this.spawnDamageText(b.x, b.y, `-${effectiveDamage}`, '#ffd600');
              soundEngine.playArmorDeflect();
            }
          } else if (alien.type === 'boss' && alien.bossPhase === 3) {
            effectiveDamage = Math.round(b.damage * 2.0); // 2.0x critical damage during core overload
            this.spawnExplosionParticles(b.x, b.y, '#ff6d00', 14);
            this.spawnExplosionParticles(b.x, b.y, '#ffd600', 8);
            this.spawnDamageText(b.x, b.y, `OVERLOAD -${effectiveDamage}!`, '#ff3d00', true);
          } else {
            this.spawnExplosionParticles(b.x, b.y, '#ffe600', 6);
            const numColor = b.type === 'plasma' ? '#00f3ff' : b.type === 'lightning' ? '#e040fb' : '#ffe600';
            this.spawnDamageText(b.x, b.y, `-${effectiveDamage}`, numColor);
          }

          alien.hp -= effectiveDamage;

          if (alien.hp <= 0) {
            if (alien.type === 'boss') {
              this.triggerBossDestruction(alien);
            } else {
              this.handleAlienDefeated(alien, j);
            }
          }
          break;
        }
      }

      if (bulletHit) {
        if (b.pierceRemaining && b.pierceRemaining > 0) {
          b.pierceRemaining--;
        } else {
          this.state.bullets.splice(i, 1);
          continue;
        }
      }

      if (b.y < -20 || b.x < -20 || b.x > this.state.canvasWidth + 20) {
        this.state.bullets.splice(i, 1);
      }
    }

    // 6b. Update Floating Damage Texts
    if (this.state.damageTexts) {
      for (let i = this.state.damageTexts.length - 1; i >= 0; i--) {
        const dtObj = this.state.damageTexts[i];
        dtObj.y += dtObj.vy * dt;
        dtObj.life -= dt;
        if (dtObj.life <= 0) {
          this.state.damageTexts.splice(i, 1);
        }
      }
    }

    // 7. Update Particles
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }

    // 8. Check Stage Victory
    if (this.state.aliens.length === 0 && this.state.aliensDefeated < this.state.totalAliensWave) {
      this.spawnAlienFormation();
    } else if (!this.state.getActiveBoss() && this.state.aliens.length === 0 && this.state.aliensDefeated >= this.state.totalAliensWave) {
      this.handleStageVictory();
    }
  }

  private fireContinuousBaseShot(): void {
    const cx = this.state.playerX;
    const y = this.state.playerY - 24;
    const tier = this.state.inStageUpgradeTier;
    const lane = this.state.playerLane;

    soundEngine.playLaser(tier);

    if (tier === 1) {
      // Tier 1: Starter Emerald Hyper-Laser (1 damage, fast single bolt)
      this.spawnBullet(cx, y, 0, -400, 'laser', 1, lane, 0, '#00ff66');
    } else if (tier === 2) {
      // Tier 2: Dual-Wing Amber Blasters + Angled V-Spread Side Cannons
      this.spawnBullet(cx - 10, y, 0, -440, 'laser', 2, lane, 0, '#ffb700');
      this.spawnBullet(cx + 10, y, 0, -440, 'laser', 2, lane, 0, '#ffb700');
      this.spawnBullet(cx - 12, y, -60, -400, 'vspread', 1, Math.max(0, lane - 1), 0, '#ffd600');
      this.spawnBullet(cx + 12, y, 60, -400, 'vspread', 1, Math.min(4, lane + 1), 0, '#ffd600');
    } else if (tier === 3) {
      // Tier 3: Radiant Piercing Super-Plasma (5 dmg, pierces 2 aliens) + Twin Auxiliary Blasters
      this.spawnBullet(cx, y - 6, 0, -480, 'plasma', 5, lane, 2, '#00f3ff');
      this.spawnBullet(cx - 14, y, 0, -440, 'laser', 2, lane, 0, '#00e5ff');
      this.spawnBullet(cx + 14, y, 0, -440, 'laser', 2, lane, 0, '#00e5ff');
    } else {
      // Tier 4: Supercharged Neon Heavy Plasma (8 dmg, pierces 3 aliens) + Arcing Chain Lightning
      this.spawnBullet(cx, y - 8, 0, -520, 'plasma', 8, lane, 3, '#bc13fe');
      this.spawnBullet(cx - 16, y, -80, -420, 'lightning', 4, Math.max(0, lane - 1), 0, '#00e5ff');
      this.spawnBullet(cx + 16, y, 80, -420, 'lightning', 4, Math.min(4, lane + 1), 0, '#00e5ff');
    }
  }

  private handleAlienBreach(alien: Alien): void {
    this.state.lives--;
    soundEngine.playShieldLost();
    this.spawnExplosionParticles(alien.x, alien.y, '#ff3344', 16);

    const idx = this.state.aliens.indexOf(alien);
    if (idx !== -1) {
      this.state.aliens.splice(idx, 1);
    }

    if (this.state.lives <= 0) {
      this.state.isRunning = false;
      this.state.gameOver = true;
      this.onGameOver();
    }
  }

  private handleAlienDefeated(alien: Alien, index: number): void {
    this.state.aliens.splice(index, 1);
    this.state.aliensDefeated++;
    this.state.score += alien.scoreValue;
    soundEngine.playExplosion(alien.type === 'boss' ? 'boss' : alien.type === 'behemoth' ? 'large' : 'small');
    this.spawnExplosionParticles(alien.x, alien.y, alien.type === 'boss' ? '#ff6d00' : '#00f3ff', 20);
  }

  private spawnExplosionParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 120 + 40;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 2,
        life: 0.4,
        maxLife: 0.4
      });
    }
  }

  private handleStageVictory(): void {
    if (this.state.isGameOver || this.state.lives <= 0 || this.state.stageCompleted) return;
    this.state.stageCompleted = true;
    this.state.isRunning = false;
    soundEngine.playUpgradeFanfare();

    const accuracy = this.state.totalQuestionsAnswered > 0
      ? (this.state.correctAnswersCount / this.state.totalQuestionsAnswered) * 100
      : 100;

    let stars = 1;
    if (accuracy >= 80) stars = 2;
    if (accuracy >= 95 && this.state.lives === 3) stars = 3;

    const coinsWon = 50 + stars * 25 + this.state.score / 50;
    const diamondsWon = stars === 3 ? 3 : stars >= 2 ? 2 : 1;

    const stageKey = `${this.state.sectorId}-${this.state.stageId}`;
    this.profile.coins += Math.floor(coinsWon);
    this.profile.diamonds += diamondsWon;
    this.profile.stageProgress[stageKey] = {
      completed: true,
      stars: Math.max(stars, this.profile.stageProgress[stageKey]?.stars || 0),
      highScore: Math.max(this.state.score, this.profile.stageProgress[stageKey]?.highScore || 0),
      accuracy: Math.floor(accuracy)
    };

    if (this.state.stageId < 5) {
      const nextKey = `${this.state.sectorId}-${this.state.stageId + 1}`;
      if (!this.profile.stageProgress[nextKey]) {
        this.profile.stageProgress[nextKey] = { completed: false, stars: 0, highScore: 0, accuracy: 0 };
      }
    } else if (this.state.sectorId < 5) {
      const nextSectorFirstStage = `${this.state.sectorId + 1}-1`;
      if (!this.profile.stageProgress[nextSectorFirstStage]) {
        this.profile.stageProgress[nextSectorFirstStage] = { completed: false, stars: 0, highScore: 0, accuracy: 0 };
      }
    }

    updateActiveProfile(this.profile);
    this.onStageVictory(stars, Math.floor(coinsWon), diamondsWon);
  }

  public pauseGame(): void {
    this.state.isPaused = !this.state.isPaused;
  }

  public setDescentSpeedMultiplier(mult: number): void {
    const clamped = Math.max(0.1, Math.min(3.0, mult));
    this.state.descentSpeedMultiplier = clamped;
    if (this.profile && this.profile.mathSettings) {
      this.profile.mathSettings.descentSpeedMultiplier = clamped;
      updateActiveProfile(this.profile);
    }
  }

  public getDescentSpeedMultiplier(): number {
    return this.state.descentSpeedMultiplier ?? 1.0;
  }

  public stop(): void {
    this.state.isRunning = false;
    cancelAnimationFrame(this.animId);
  }
}
