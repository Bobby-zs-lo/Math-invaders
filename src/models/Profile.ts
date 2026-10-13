export interface MathSettings {
  operations: ('+' | '-' | '*' | '/' | 'x')[];
  minNumber: number;
  maxNumber: number;
  maxDigits: number;
  allowNegative: boolean;
  grade?: number;
  answerMode?: 'manual' | 'multiple_choice';
  descentSpeedMultiplier?: number;
  speechEnabled?: boolean;
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

export interface GradeCurriculumInfo {
  grade: number;
  title: string;
  shortDesc: string;
  fullDesc: string;
  examples: string[];
}

export const DANISH_GRADE_CURRICULUM: Record<number, GradeCurriculumInfo> = {
  1: {
    grade: 1,
    title: '1. klasse (Begynder)',
    shortDesc: '10\'er-venner, plus og minus inden for 0–20.',
    fullDesc: 'Fokus på talforståelse, 10\'er-venner (f.eks. 3 + 7 = 10) og enkle plus/minus stykker op til 20.',
    examples: ['3 + 7 = 10', '4 + 5 = 9', '10 - 4 = 6', '12 + 3 = 15']
  },
  2: {
    grade: 2,
    title: '2. klasse (Indskoling)',
    shortDesc: 'Plus og minus op til 100, 2-, 5- og 10-tabellen.',
    fullDesc: 'Regning med to-cifrede tal, tierovergange samt de første gangetabeller (2-, 5- og 10-tabellen).',
    examples: ['24 + 15 = 39', '50 - 18 = 32', '2 × 7 = 14', '5 × 6 = 30']
  },
  3: {
    grade: 3,
    title: '3. klasse (Den lille tabel)',
    shortDesc: 'Den lille tabel (1-10), division uden rest, tal op til 500.',
    fullDesc: 'Rutine i alle gangetabeller fra 1 til 10, division som omvendt gange samt regning med større tal.',
    examples: ['6 × 7 = 42', '8 × 9 = 72', '36 : 6 = 6', '56 : 8 = 7']
  },
  4: {
    grade: 4,
    title: '4. klasse (Mellemtrin)',
    shortDesc: 'Regnehierarki, stambrøker, store gangestykker, x-ligninger.',
    fullDesc: 'Regnearternes rækkefølge (gange/dividere før plus/minus), brøker af tal og enkle ligninger.',
    examples: ['5 + 3 × 4 = 17', '30 - 12 : 3 = 26', '1/2 af 60 = 30', 'x + 15 = 40']
  },
  5: {
    grade: 5,
    title: '5. klasse (Brøker & procenter)',
    shortDesc: 'Procent, brøker, parenteser, decimaltal, lineære udtryk.',
    fullDesc: 'Enkel procentregning (10%, 25%, 50%), parentesregneregler, regning med decimaltal og ligninger.',
    examples: ['10% af 250 = 25', '25% af 80 = 20', '(15 + 5) × 4 = 80', '2x + 10 = 34']
  },
  6: {
    grade: 6,
    title: '6. klasse (Negative tal)',
    shortDesc: 'Negative tal, fortegnsregneregler, sammensatte ligninger.',
    fullDesc: 'Regning med minustal (plus, minus, gange, division med fortegn) og ligninger med to led.',
    examples: ['5 - 14 = -9', '-8 + 3 = -5', '4 × (-6) = -24', '(-3) × (-5) = 15']
  },
  7: {
    grade: 7,
    title: '7. klasse (Udskoling & potenser)',
    shortDesc: 'Potenser, kvadratrødder, lineære ligninger med parenteser.',
    fullDesc: 'Potensregning (f.eks. 3² = 9, 2⁴ = 16), rødder (√81 = 9) og ligningsløsning med reduktion.',
    examples: ['3x + 8 = 29', '4² = 16', '√144 = 12', '2(x + 5) = 24']
  },
  8: {
    grade: 8,
    title: '8. klasse (To ligninger & geometri)',
    shortDesc: 'x på begge sider, Pythagoras, 2 ligninger med 2 ubekendte.',
    fullDesc: 'Ligninger med ubekendte på begge sider, Pythagoras\' sætning (a² + b² = c²) og potensregneregler.',
    examples: ['5x + 4 = 2x + 19', '√(3² + 4²) = 5', 'x + y = 16, x - y = 4', '2³ × 2⁴ = 2ˣ']
  },
  9: {
    grade: 9,
    title: '9. klasse (Afgangsklasse)',
    shortDesc: 'Andengradsligninger, brøkligninger, moms og vækst.',
    fullDesc: 'Andengradsligninger med hele rødder, brøker i ligninger, procentvis stigning/moms og avancerede rødder.',
    examples: ['x² - 25 = 0 (x > 0)', 'x² - 7x + 12 = 0', '200 kr. + 25% moms', '(2x + 8)/2 = 10']
  },
  10: {
    grade: 10,
    title: '10. klasse (Videregående udskoling)',
    shortDesc: 'Avancerede andengradsligninger, funktioner, eksponenter.',
    fullDesc: 'Videregående algebra, funktionsværdier f(x), komplekse ligningssystemer og eksponentielle ligninger.',
    examples: ['2x² - 32 = 0', 'f(3) i 2x² - 4x + 3', '2ˣ⁺² = 32', '3(x - 2) + 2x = 19']
  }
};

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
  return { ...getBase(), answerMode: 'manual', descentSpeedMultiplier: 1.0, speechEnabled: true };
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
      if (profile.mathSettings.speechEnabled === undefined) {
        profile.mathSettings.speechEnabled = true;
      }
      if (!profile.stageProgress || typeof profile.stageProgress !== 'object' || Object.keys(profile.stageProgress).length === 0) {
        profile.stageProgress = {
          '1-1': { completed: false, stars: 0, highScore: 0, accuracy: 0 }
        };
      } else if (!profile.stageProgress['1-1']) {
        profile.stageProgress['1-1'] = { completed: false, stars: 0, highScore: 0, accuracy: 0 };
      }
      if (profile.currentSector === undefined || typeof profile.currentSector !== 'number') {
        profile.currentSector = 1;
      }
      if (profile.currentStage === undefined || typeof profile.currentStage !== 'number') {
        profile.currentStage = 1;
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
  setActiveProfile(updated.id);
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
