export interface MathSettings {
  operations: ('+' | '-' | '*' | '/' | 'x')[];
  minNumber: number;
  maxNumber: number;
  maxDigits: number;
  allowNegative: boolean;
  grade?: number;
  answerMode?: 'manual' | 'multiple_choice';
  descentSpeedMultiplier?: number;
}

export interface StageResult {
  completed: boolean;
  stars: number; // 0 to 3
  highScore: number;
  accuracy: number; // percentage 0 to 100
}

export interface ProblemHistoryRecord {
  timestamp: number;
  question: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timeTakenMs: number;
  operation: string;
}

export interface PlayerStats {
  totalSolved: number;
  totalCorrect: number;
  totalErrors: number;
  averageTimeMs: number;
  problemHistory: ProblemHistoryRecord[];
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: string;
  gradeLevel: number; // 1 to 10
  mathSettings: MathSettings;
  coins: number;
  diamonds: number;
  currentSector: number;
  currentStage: number;
  stageProgress: Record<string, StageResult>;
  equippedShipId: string;
  unlockedShips: string[];
  equippedTrailId: string;
  unlockedTrails: string[];
  stats: PlayerStats;
}

const STORAGE_KEY = 'math_invaders_profiles_v1';
const ACTIVE_PROFILE_KEY = 'math_invaders_active_profile_id';

export function getDefaultMathSettingsForGrade(grade: number): MathSettings {
  const getBase = (): MathSettings => {
    switch (grade) {
    case 1:
      // Single-digit addition and subtraction within 10; strictly non-negative
      return {
        operations: ['+', '-'],
        minNumber: 1,
        maxNumber: 10,
        maxDigits: 1,
        allowNegative: false,
        grade: 1
      };

    case 2:
      // Addition and subtraction bridging 10 within 20; strictly non-negative
      return {
        operations: ['+', '-'],
        minNumber: 1,
        maxNumber: 20,
        maxDigits: 2,
        allowNegative: false,
        grade: 2
      };

    case 3:
      // Multiplication tables (1-10), clean division, arithmetic within 50
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: 1,
        maxNumber: 50,
        maxDigits: 2,
        allowNegative: false,
        grade: 3
      };

    case 4:
      // Full multiplication (1-12), multi-digit division up to 144, arithmetic to 100
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: 1,
        maxNumber: 100,
        maxDigits: 3,
        allowNegative: false,
        grade: 4
      };

    case 5:
      // Multi-step arithmetic, order of operations, fractions & decimals with integer answers <= 200
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: 1,
        maxNumber: 200,
        maxDigits: 3,
        allowNegative: false,
        grade: 5
      };

    case 6:
      // Negative numbers, signed arithmetic, signed multi-step
      return {
        operations: ['+', '-', '*', '/'],
        minNumber: -50,
        maxNumber: 300,
        maxDigits: 3,
        allowNegative: true,
        grade: 6
      };

    case 7:
      // Pre-algebra: linear equations (ax + b = c), integer exponents
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -100,
        maxNumber: 500,
        maxDigits: 3,
        allowNegative: true,
        grade: 7
      };

    case 8:
      // Both-sides linear equations (ax + b = cx + d), integer powers, square roots
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -100,
        maxNumber: 500,
        maxDigits: 3,
        allowNegative: true,
        grade: 8
      };

    case 9:
      // Distributive property a(x + b) = c, linear systems, exponent laws
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -200,
        maxNumber: 800,
        maxDigits: 3,
        allowNegative: true,
        grade: 9
      };

    case 10:
    default:
      // Quadratics with integer roots, polynomials, radicals, advanced algebra
      return {
        operations: ['+', '-', '*', '/', 'x'],
        minNumber: -200,
        maxNumber: 1000,
        maxDigits: 4,
        allowNegative: true,
        grade: 10
      };
    }
  };
  return { ...getBase(), answerMode: 'manual', descentSpeedMultiplier: 1.0 };
}

export function createNewProfile(name: string, avatar: string, gradeLevel: number): PlayerProfile {
  const id = 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  return {
    id,
    name: name.trim() || 'Hero Pilot',
    avatar: avatar || '🚀',
    gradeLevel,
    mathSettings: getDefaultMathSettingsForGrade(gradeLevel),
    coins: 100,
    diamonds: 5,
    currentSector: 1,
    currentStage: 1,
    stageProgress: {
      '1-1': { completed: false, stars: 0, highScore: 0, accuracy: 0 }
    },
    equippedShipId: 'tier1_interceptor',
    unlockedShips: ['tier1_interceptor'],
    equippedTrailId: 'plasma_blue',
    unlockedTrails: ['plasma_blue'],
    stats: {
      totalSolved: 0,
      totalCorrect: 0,
      totalErrors: 0,
      averageTimeMs: 0,
      problemHistory: []
    }
  };
}

export function createDefaultProfile(name: string, gradeLevel: number = 2, avatar: string = '🚀'): PlayerProfile {
  return {
    id: 'pilot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name,
    avatar,
    gradeLevel,
    mathSettings: getDefaultMathSettingsForGrade(gradeLevel),
    coins: 0,
    diamonds: 0,
    currentSector: 1,
    currentStage: 1,
    stageProgress: {
      '1-1': { completed: false, stars: 0, highScore: 0, accuracy: 0 }
    },
    equippedShipId: 'tier1_starter',
    unlockedShips: ['tier1_starter'],
    equippedTrailId: 'default',
    unlockedTrails: ['default'],
    stats: {
      totalSolved: 0,
      totalCorrect: 0,
      totalErrors: 0,
      averageTimeMs: 0,
      problemHistory: []
    }
  };
}

export function loadProfiles(): PlayerProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Auto-migrate legacy profiles missing modern grade settings or stats
    return parsed.map(profile => {
      if (!profile.mathSettings || profile.mathSettings.grade === undefined) {
        const grade = profile.gradeLevel || 2;
        profile.mathSettings = getDefaultMathSettingsForGrade(grade);
      }
      if (!profile.mathSettings.answerMode) {
        profile.mathSettings.answerMode = 'manual';
      }
      if (profile.mathSettings.descentSpeedMultiplier === undefined) {
        profile.mathSettings.descentSpeedMultiplier = 1.0;
      }
      if (!profile.stats) {
        profile.stats = {
          totalSolved: 0,
          totalCorrect: 0,
          totalErrors: 0,
          averageTimeMs: 0,
          problemHistory: []
        };
      }
      return profile;
    });
  } catch (err) {
    console.error('Failed to load profiles:', err);
    return [];
  }
}

export function saveProfiles(profiles: PlayerProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save profiles:', err);
  }
}

export function getActiveProfile(): PlayerProfile | null {
  const profiles = loadProfiles();
  const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  
  if (profiles.length === 0) {
    return null;
  }

  const found = profiles.find(p => p.id === activeId);
  if (found) return found;

  return profiles[0];
}

export function setActiveProfile(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export function updateActiveProfile(updated: PlayerProfile): void {
  const profiles = loadProfiles();
  const index = profiles.findIndex(p => p.id === updated.id);
  if (index !== -1) {
    profiles[index] = updated;
  } else {
    profiles.push(updated);
  }
  saveProfiles(profiles);
}

export function exportBackupJSON(): string {
  const profiles = loadProfiles();
  const activeId = localStorage.getItem(ACTIVE_PROFILE_KEY);
  return JSON.stringify({ profiles, activeId, exportDate: new Date().toISOString() }, null, 2);
}

export function importBackupJSON(jsonStr: string): boolean {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.profiles)) {
      saveProfiles(parsed.profiles);
      if (parsed.activeId) {
        setActiveProfile(parsed.activeId);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Invalid backup JSON:', err);
    return false;
  }
}
