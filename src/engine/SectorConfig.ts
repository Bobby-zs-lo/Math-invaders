import type { AlienType } from '../models/GameState.ts';

export interface StageWaveConfig {
  stageId: number;
  name: string;
  rows: number;
  totalAliens: number;
  marchInterval: number;
  marchStepY: number;
  baseSpeed: number;
  enableZigzag: boolean;
  zigzagFrequency?: number;
  zigzagAmplitude?: number;
  enableArmor: boolean;
  armorPoints?: number;
  enableCoreReveal: boolean;
  coreConcealedDuration?: number;
  coreRevealedDuration?: number;
  isBossStage: boolean;
  bossType?: 'dreadnought' | 'commander' | 'standard' | 'none';
  formationGrid: (AlienType | null)[][];
}

export interface SectorConfig {
  sectorId: number;
  name: string;
  subtitle: string;
  description: string;
  accentColor: string;
  primaryAlienType: AlienType;
  stages: Record<number, StageWaveConfig>;
}

export const SECTOR_CONFIGS: Record<number, SectorConfig> = {
  1: {
    sectorId: 1,
    name: 'Sector 1: Moon Base Alpha',
    subtitle: 'Recon Invasions & Basic Drops',
    description: 'Lunar surface scouting drops with purple Cyber-Scout Drones. Fast baseline descent in linear formation.',
    accentColor: '#bc13fe',
    primaryAlienType: 'scout',
    stages: {
      1: {
        stageId: 1,
        name: 'Lunar Outpost Recon',
        rows: 2,
        totalAliens: 5,
        marchInterval: 0.95,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          [null, 'scout', null, 'scout', null],
          ['scout', null, 'scout', null, 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Scouting Sweep',
        rows: 3,
        totalAliens: 10,
        marchInterval: 0.90,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', null, 'scout', null, 'scout'],
          [null, 'scout', 'scout', 'scout', null],
          ['scout', 'scout', null, 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Drone Escort Entry',
        rows: 3,
        totalAliens: 13,
        marchInterval: 0.85,
        marchStepY: 13,
        baseSpeed: 16,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'scout', 'crab', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      4: {
        stageId: 4,
        name: 'Forward Enforcer Patrol',
        rows: 4,
        totalAliens: 17,
        marchInterval: 0.80,
        marchStepY: 14,
        baseSpeed: 16,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', null, 'scout', null]
        ]
      },
      5: {
        stageId: 5,
        name: 'Scout Fleet Commander',
        rows: 4,
        totalAliens: 18,
        marchInterval: 0.72,
        marchStepY: 15,
        baseSpeed: 18,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          [null, 'scout', 'crab', 'scout', null],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  2: {
    sectorId: 2,
    name: 'Sector 2: Asteroid Belt',
    subtitle: 'Rapid Cyber-Drone Swarms',
    description: 'Rapid zig-zag swarms. High march frequency, continuous sinusoidal horizontal movement across lanes.',
    accentColor: '#00f3ff',
    primaryAlienType: 'scout',
    stages: {
      1: {
        stageId: 1,
        name: 'Asteroid Drone Influx',
        rows: 2,
        totalAliens: 8,
        marchInterval: 0.75,
        marchStepY: 12,
        baseSpeed: 18,
        enableZigzag: true,
        zigzagFrequency: 2.5,
        zigzagAmplitude: 18,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      2: {
        stageId: 2,
        name: 'Sinusoidal Drift Swarm',
        rows: 3,
        totalAliens: 13,
        marchInterval: 0.70,
        marchStepY: 12,
        baseSpeed: 18,
        enableZigzag: true,
        zigzagFrequency: 2.8,
        zigzagAmplitude: 22,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'scout', 'crab', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      3: {
        stageId: 3,
        name: 'Dense Belt Weavers',
        rows: 3,
        totalAliens: 15,
        marchInterval: 0.65,
        marchStepY: 13,
        baseSpeed: 20,
        enableZigzag: true,
        zigzagFrequency: 3.0,
        zigzagAmplitude: 26,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Hyper-Frequency Incursion',
        rows: 4,
        totalAliens: 18,
        marchInterval: 0.60,
        marchStepY: 14,
        baseSpeed: 22,
        enableZigzag: true,
        zigzagFrequency: 3.2,
        zigzagAmplitude: 28,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          [null, 'scout', 'scout', 'scout', null]
        ]
      },
      5: {
        stageId: 5,
        name: 'Hyper-Velocity Swarm Storm',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.52,
        marchStepY: 14,
        baseSpeed: 24,
        enableZigzag: true,
        zigzagFrequency: 3.6,
        zigzagAmplitude: 32,
        enableArmor: false,
        enableCoreReveal: false,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          ['scout', 'scout', 'crab', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  3: {
    sectorId: 3,
    name: 'Sector 3: Mars Orbit',
    subtitle: 'Armored Mech-Crabs & Behemoths',
    description: 'Armored Mech-Crab Enforcers requiring multiple hits to break hardened carapace. Tough front lines.',
    accentColor: '#00e5ff',
    primaryAlienType: 'crab',
    stages: {
      1: {
        stageId: 1,
        name: 'Martian Vanguard',
        rows: 2,
        totalAliens: 10,
        marchInterval: 0.88,
        marchStepY: 11,
        baseSpeed: 14,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Armored Enforcer Line',
        rows: 3,
        totalAliens: 15,
        marchInterval: 0.85,
        marchStepY: 11,
        baseSpeed: 14,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Reinforced Orbital Gate',
        rows: 3,
        totalAliens: 15,
        marchInterval: 0.82,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'behemoth', 'crab', 'crab'],
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Heavy Mechanized Front',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.78,
        marchStepY: 12,
        baseSpeed: 15,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      5: {
        stageId: 5,
        name: 'Iron Phalanx Fortress',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.75,
        marchStepY: 12,
        baseSpeed: 16,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: false,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  4: {
    sectorId: 4,
    name: 'Sector 4: Jupiter Rings',
    subtitle: 'Dense Formations & High-Velocity Attacks',
    description: 'Heavy Assault Behemoths with energy core reveals. Alternating vulnerable core windows with 2x critical damage.',
    accentColor: '#00e676',
    primaryAlienType: 'behemoth',
    stages: {
      1: {
        stageId: 1,
        name: 'Jovian Radiation Ingress',
        rows: 3,
        totalAliens: 15,
        marchInterval: 1.05,
        marchStepY: 10,
        baseSpeed: 12,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'behemoth', 'scout', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Twin Behemoth Battery',
        rows: 3,
        totalAliens: 15,
        marchInterval: 1.00,
        marchStepY: 10,
        baseSpeed: 12,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['crab', 'crab', 'scout', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Ring Siege Fleet',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.95,
        marchStepY: 11,
        baseSpeed: 13,
        enableZigzag: false,
        enableArmor: false,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['behemoth', 'crab', 'behemoth', 'crab', 'behemoth'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Heavy Armored Core Battery',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.90,
        marchStepY: 11,
        baseSpeed: 13,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'behemoth', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      5: {
        stageId: 5,
        name: 'Dual Titan Siege',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.85,
        marchStepY: 11,
        baseSpeed: 14,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: true,
        bossType: 'commander',
        formationGrid: [
          ['behemoth', 'crab', 'behemoth', 'crab', 'behemoth'],
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      }
    }
  },
  5: {
    sectorId: 5,
    name: 'Sector 5: Deep Space Nebula',
    subtitle: 'Ultimate Dreadnought Flagship Battle',
    description: 'Escalating elite armada culminating in Sector 5 Stage 5 colossal Dreadnought Boss.',
    accentColor: '#ff6d00',
    primaryAlienType: 'boss',
    stages: {
      1: {
        stageId: 1,
        name: 'Nebula Recon Armada',
        rows: 3,
        totalAliens: 15,
        marchInterval: 0.78,
        marchStepY: 12,
        baseSpeed: 16,
        enableZigzag: true,
        zigzagFrequency: 3.0,
        zigzagAmplitude: 20,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: false,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      2: {
        stageId: 2,
        name: 'Heavy Assault Battlegroup',
        rows: 3,
        totalAliens: 15,
        marchInterval: 0.74,
        marchStepY: 12,
        baseSpeed: 17,
        enableZigzag: true,
        zigzagFrequency: 3.0,
        zigzagAmplitude: 22,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'crab', 'behemoth', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      3: {
        stageId: 3,
        name: 'Tri-Formation Armada',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.70,
        marchStepY: 13,
        baseSpeed: 18,
        enableZigzag: true,
        zigzagFrequency: 3.2,
        zigzagAmplitude: 24,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['behemoth', 'crab', 'behemoth', 'crab', 'behemoth'],
          ['crab', 'scout', 'crab', 'scout', 'crab'],
          ['scout', 'scout', 'scout', 'scout', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      4: {
        stageId: 4,
        name: 'Dreadnought Vanguard Escort',
        rows: 4,
        totalAliens: 20,
        marchInterval: 0.65,
        marchStepY: 13,
        baseSpeed: 19,
        enableZigzag: true,
        zigzagFrequency: 3.4,
        zigzagAmplitude: 26,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: false,
        bossType: 'none',
        formationGrid: [
          ['crab', 'behemoth', 'behemoth', 'behemoth', 'crab'],
          ['crab', 'crab', 'crab', 'crab', 'crab'],
          ['scout', 'crab', 'scout', 'crab', 'scout'],
          ['scout', 'scout', 'scout', 'scout', 'scout']
        ]
      },
      5: {
        stageId: 5,
        name: 'Mechanical Dreadnought Titan',
        rows: 3,
        totalAliens: 5,
        marchInterval: 0.90,
        marchStepY: 8,
        baseSpeed: 12,
        enableZigzag: false,
        enableArmor: true,
        armorPoints: 2,
        enableCoreReveal: true,
        coreConcealedDuration: 3.0,
        coreRevealedDuration: 2.0,
        isBossStage: true,
        bossType: 'dreadnought',
        formationGrid: [
          [null, null, 'boss', null, null],
          ['crab', null, null, null, 'crab'],
          [null, 'scout', null, 'scout', null]
        ]
      }
    }
  }
};

export function getSectorConfig(sectorId: number): SectorConfig {
  return SECTOR_CONFIGS[sectorId] || SECTOR_CONFIGS[1];
}

export function getStageWaveConfig(sectorId: number, stageId: number): StageWaveConfig {
  const sector = getSectorConfig(sectorId);
  return sector.stages[stageId] || sector.stages[1];
}

export function getAllSectorConfigs(): SectorConfig[] {
  return Object.values(SECTOR_CONFIGS);
}
