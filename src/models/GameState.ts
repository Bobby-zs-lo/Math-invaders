import type { MathProblem } from '../math/MathEngine.ts';

export type AlienType = 'scout' | 'crab' | 'behemoth' | 'boss' | 'minion_drone';
export type BulletType = 'laser' | 'vspread' | 'plasma' | 'lightning';

export interface Alien {
  id: string;
  lane: number;
  x: number;
  y: number;
  type: AlienType;
  hp: number;
  maxHp: number;
  scoreValue: number;
  width: number;
  height: number;
  speed: number;
  isHitFlash: number;

  // Sector 2: Continuous Horizontal Sinusoidal Oscillation
  baseX?: number;
  oscillationPhase?: number;
  oscillationAmp?: number;
  oscillationFreq?: number;

  // Sector 3: Armored Enforcer Mechanics
  armor?: number;
  maxArmor?: number;
  isArmorFlash?: number;

  // Sector 4: Energy Core Reveal Cycles
  hasEnergyCore?: boolean;
  coreRevealed?: boolean;
  coreTimer?: number;
  coreConcealedDuration?: number;
  coreRevealedDuration?: number;

  // Sector 5: Colossal Dreadnought Boss State Machine
  isBoss?: boolean;
  bossPhase?: 1 | 2 | 3 | 4 | 'shield' | 'minions' | 'overload' | 'destruction';
  shieldHp?: number;
  maxShieldHp?: number;
  overloadTimer?: number;
  minionsSpawned?: boolean;
  wingBaysOpen?: boolean;
  destructionTimer?: number;
  destructionStep?: number;
  destructionShockwaveFired?: boolean;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BulletType;
  damage: number;
  lane: number;
  width: number;
  height: number;
  pierceRemaining?: number;
  hitAlienIds?: string[];
  color?: string;
}

export interface DamageText {
  id: string;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  isCrit?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface StarfieldStar {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

export class GameState {
  public canvasWidth: number = 480;
  public canvasHeight: number = 640;
  public laneCount: number = 5;

  // Player Ship
  public playerLane: number = 2; // Starts center (lane index 2)
  public playerX: number = 240;
  public playerY: number = 580;
  public playerTargetX: number = 240;
  public lives: number = 3;
  public maxLives: number = 3;
  public inStageUpgradeTier: number = 1; // 1 to 4
  public upgradesSolvedThisTier: number = 0;
  public upgradesRequiredForNextTier: number = 1; // 1, then 2, then 3, etc.
  public weaponJamTimer: number = 0;
  public fireCooldown: number = 0;

  // Combat entities
  public aliens: Alien[] = [];
  public bullets: Bullet[] = [];
  public particles: Particle[] = [];
  public damageTexts: DamageText[] = [];
  public stars: StarfieldStar[] = [];

  // Stage & Waves
  public sectorId: number = 1;
  public stageId: number = 1;
  public isBossStage: boolean = false;
  public isRunning: boolean = false;
  public isPaused: boolean = false;
  public stageCompleted: boolean = false;
  public gameOver: boolean = false;

  public get isGameOver(): boolean {
    return this.gameOver || this.lives <= 0;
  }
  public set isGameOver(val: boolean) {
    this.gameOver = val;
  }
  
  public totalAliensWave: number = 15;
  public aliensDefeated: number = 0;
  public spawnTimer: number = 0;
  public spawnInterval: number = 2.2; // seconds between alien drops

  // March Rhythm & Descent Speed
  public marchTimer: number = 0;
  public marchInterval: number = 1.0;
  public marchStepY: number = 12;
  public descentSpeedMultiplier: number = 1.0;

  // Scoring & Math
  public score: number = 0;
  public combo: number = 0;
  public totalQuestionsAnswered: number = 0;
  public correctAnswersCount: number = 0;
  public wrongAnswersCount: number = 0;
  public stageStartTime: number = 0;

  // Math problems (1 active per lane)
  public laneProblems: (MathProblem | null)[] = [null, null, null, null, null];
  public selectedLane: number = 2;
  public currentInputValue: string = '';

  // Screen shake FX for boss explosions & heavy impacts
  public screenShakeTimer: number = 0;
  public screenShakeIntensity: number = 0;

  public getActiveBoss(): Alien | undefined {
    return this.aliens.find(a => a.type === 'boss');
  }

  constructor() {
    this.initStarfield();
  }

  public initStarfield(): void {
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 60 + 20,
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  public getLaneCenterX(laneIndex: number): number {
    const laneWidth = this.canvasWidth / this.laneCount;
    return laneIndex * laneWidth + laneWidth / 2;
  }
}
