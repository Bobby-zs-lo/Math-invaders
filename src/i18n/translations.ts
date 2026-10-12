export type Language = 'da' | 'en';

// Always start on Danish ('da') per user specification, with runtime switching allowed
let currentLang: Language = 'da';

type LanguageListener = (lang: Language) => void;
const listeners: LanguageListener[] = [];

export function onLanguageChange(fn: LanguageListener): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function getLanguage(): Language {
  return currentLang;
}

export function setLanguage(lang: Language): void {
  if (currentLang !== lang) {
    currentLang = lang;
    for (const fn of listeners) {
      fn(lang);
    }
  }
}

export const translations = {
  da: {
    // Top bar & Navigation
    appTitle: 'Math Invaders — Matematik Arkade',
    selectPilot: 'Vælg pilot',
    gradeBadge: '{grade}. klasse',
    audioToggleTitle: 'Slå lyd til/fra',
    speechToggleTitle: 'Slå oplæsning af regnestykker til/fra',
    profilesBtn: '👥 Profiler',
    settingsBtn: '⚙️ Indstillinger',
    hangarBtn: '🛸 Hangar',
    reportBtn: '📊 Rapport',
    langToggle: '🇩🇰 DA',

    // Combat HUD
    scoreLabel: 'POINT:',
    sectorStage: 'SEKTOR {sector} — BANE {stage}',
    upgradeBtn: 'OPGRADÉR ({solved}/{req})',
    upgradeMaxPower: 'MAKS STYRKE ⚡',
    speedBtnTitle: 'Rumvæsnernes hastighed (Voksen-kontrol)',
    pauseBtnTitle: 'Sæt spil på pause',
    mapBtn: '🗺️ Kort',

    // Lane math
    laneShipHere: 'MÅL: BANE {lane} (DIT SKIB ER HER 🚀)',
    laneSolveToMove: 'MÅL: BANE {lane} (LØS FOR AT SKIFTE BANE)',
    solveLabel: 'LØS:',
    weaponJammed: 'VÅBEN BLOKERET! (FEJL)',
    shipUnlocked: 'SKIB LÅST OP! 🚀',
    correctAnswer: 'RIGTIGT! 🎉',
    wrongAnswer: 'FEJL! PRØV IGEN',
    btnDel: 'SLET',
    btnEnter: 'SVAR',

    // In-Game Speed flyout & Pause modal
    speedPanelTitle: '⚡ RUMVÆSNERNES HASTIGHED',
    speedMultiplierLabel: 'Hastighedsmultiplikator:',
    speedVerySlow: '0.2x (Super langsom)',
    speedSlow: '0.4x Langsom',
    speedGentle: '0.7x Rolig',
    speedNormal: '1.0x Normal',
    speedFast: '1.5x Hurtig',
    speedVeryFast: '2.0x Meget hurtig',
    speedHelpTxt: 'Juster hastigheden for at give barnet mere eller mindre tænketid.',
    pauseTitle: '⏸️ SPIL SAT PÅ PAUSE',
    pauseResumeBtn: 'Fortsæt spillet ▶️',
    pauseMapBtn: 'Gå til rumkortet 🗺️',

    // Upgrade Drawer
    upgradeDrawerTitle: '⚡ OPGRADÉR DIT SKIB',
    upgradeDrawerSubtitle: 'Løs bonusstykker for at styrke dine våben under kampen!',
    tier1Name: 'Niveau 1: Begynderspejder',
    tier2Name: 'Niveau 2: Jæger med vinger',
    tier3Name: 'Niveau 3: Plasmakrydser',
    tier4Name: 'Niveau 4: Neon Flagskib',
    nextTier2Desc: 'Næste: Dobbelt-laser & V-spredning',
    nextTier3Desc: 'Næste: Gennemtrængende plasmaskud',
    nextTier4Desc: 'Næste: Ultimativ kædelyn-kanon',
    maxTierReached: 'MAKSIMAL STYRKE NÅET! 🌟',
    solvedCount: '{solved} af {req} opgaver løst',
    maxedOut: 'Fuldt opgraderet!',

    // Settings Modal
    settingsTitle: '⚙️ Matematik & Indstillinger',
    settingsSectionLanguage: '🌐 SPROG / LANGUAGE',
    settingsSectionGrade: '🎓 VÆLG KLASSETRIN (1. – 10. KLASSE)',
    settingsGradeSubtitle: 'Vælg klassetrin for at tilpasse matematikken til den danske folkeskole.',
    settingsSectionAnswerMode: '🎯 SVARTYPE (HVORDAN SVARER BARNET?)',
    modeMultipleChoiceTitle: '🔘 5 Svarmuligheder (Anbefalet)',
    modeMultipleChoiceDesc: '1 rigtigt svar og 4 valgmuligheder. Hurtig arkadeoplevelse.',
    modeManualTitle: '⌨️ Tast selv (Virtuelt tastatur)',
    modeManualDesc: 'Barnet indtaster selv hele facit på skærmen eller tastaturet.',
    settingsSectionSpeech: '🗣️ OPLÆSNING AF REGNESTYKKER (TEKST-TIL-TALE)',
    speechEnabledTitle: '🗣️ Læs regnestykker og svar højt',
    speechEnabledDesc: 'Læser automatisk regnestykket op ved start, dit valgte svar samt om det er rigtigt eller forkert.',
    speechTestBtn: '🔊 Prøv oplæsning',
    settingsSectionSpeed: '⚡ RUMVÆSNERNES HASTIGHED (VOKSEN-KONTROL)',
    settingsSectionTailoring: '🛠️ DETALJERET FINJUSTERING',
    operationsLabel: 'Tilladte regnearter:',
    opAdd: 'Plus (+)',
    opSub: 'Minus (-)',
    opMul: 'Gange (×)',
    opDiv: 'Division (:)',
    opAlgebra: 'Ligninger (Find x)',
    maxNumberLabel: 'Maksimal talstørrelse:',
    allowNegativeLabel: 'Tillad negative tal (resultater under 0)',
    saveChangesBtn: '💾 Gem ændringer',

    // Profile Gateway
    gatewayTitle: 'MATH INVADERS',
    gatewaySubtitle: '🚀 VÆLG ELLER OPRET EN PILOTPROFIL FOR AT BEGYNDE',
    choosePilot: 'VÆLG DIN PILOT:',
    noProfilesYet: 'Ingen profiler oprettet endnu! Opret en profil nedenfor for at starte.',
    launchBtn: 'START 🚀',
    deleteProfilePrompt: 'Er du sikker på, at du vil slette denne profil?',
    createNewProfile: '➕ OPRET NY BØRNEPROFIL',
    namePlaceholder: 'Barnets navn (f.eks. Sofia eller Emil)',
    chooseAvatar: 'Vælg rumikon:',
    createProfileBtn: 'Opret profil & start ⚙️',
    backupBtn: '💾 Sikkerhedskopi (JSON)',
    restoreBtn: '📂 Gendan data',
    restoreSuccess: 'Profiler blev gendannet!',
    restoreFail: 'Ugyldig sikkerhedskopifil.',
    switchProfileTitle: '👨‍🚀 Skift pilotprofil',

    // Star Map
    starMapTitle: 'KOSMISK RUMKORT',
    starMapSubtitle: 'Forsvar solsystemet mod cyber-rumvæsnerne!',
    sector1Title: 'Sektor 1: Månebase Alfa',
    sector1Sub: 'Spejderbølger & grundlæggende træning',
    sector2Title: 'Sektor 2: Asteroidebæltet',
    sector2Sub: 'Hurtige zig-zag sværme af cyberdroner',
    sector3Title: 'Sektor 3: Mars Bane',
    sector3Sub: 'Pansrede krabber & tunge krigere',
    sector4Title: 'Sektor 4: Jupiters Ringe',
    sector4Sub: 'Tætte formationer & sårbare energikerner',
    sector5Title: 'Sektor 5: Den Dybe Tåge',
    sector5Sub: 'Det gigantiske mekaniske moderskib (Boss)',

    // Hangar
    hangarTitle: '🛸 Rumskibe & Hangar',
    yourTreasury: 'Din skattekiste:',
    equippedBadge: 'UDRUSTET',
    equipBtn: 'UDRUST',
    unlockBtn: 'LÅS OP',

    // Victory / Defeat
    victoryTitle: '🎉 BANE GENNEMFØRT!',
    victoryDesc: 'Sektor {sector} — Bane {stage} forsvaret!',
    scoreEarned: 'POINT: {score}',
    nextStageBtn: 'Næste bane 🚀',
    returnMapBtn: 'Rumkort 🗺️',
    defeatTitle: '💥 FORSVARSLINJEN BRUDT',
    defeatDesc: 'Rumvæsnerne trængte igennem dit forsvar!',
    defeatEncourage: 'Giv ikke op! Alle heltemodige piloter bliver stærkere med øvelse. Prøv igen!',
    retryBtn: 'Prøv igen 🔄',

    // Parent Report
    parentReportTitle: '📊 Forældrerapport: {name}',
    kpiSolved: 'OPGAVER LØST',
    kpiAccuracy: 'NØJAGTIGHED',
    kpiAvgSpeed: 'GNM. SVARTID',
    masteryTitle: '📈 MESTRING AF REGNEARTER',
    noProblemsSolvedYet: 'Ingen opgaver løst endnu. Spil en bane for at se resultater!',
    troubleSpotsTitle: '🎯 SVÆRE OPGAVER TIL ØVELSE ({count})',
    noTroubleSpots: '🌟 Perfekt! Ingen fejl registreret for nylig.',
    answerWas: 'Svarede: {user} (Rigtigt: {correct})',
    printWorksheetBtn: '🖨️ Udskriv øveark',
    printWorksheetTitle: 'Math Invaders — Matematisk Træningsark ({name})',
    allowPopupsAlert: 'Tillad venligst popups for at åbne det udskriftsvenlige øveark.'
  },
  en: {
    // Top bar & Navigation
    appTitle: 'Math Invaders — Retro Math Arcade',
    selectPilot: 'Select Pilot',
    gradeBadge: 'Grade {grade}',
    audioToggleTitle: 'Toggle Sound / Music',
    speechToggleTitle: 'Toggle Math Problem Speech (Read Aloud)',
    profilesBtn: '👥 Profiles',
    settingsBtn: '⚙️ Settings',
    hangarBtn: '🛸 Hangar',
    reportBtn: '📊 Report',
    langToggle: '🇬🇧 EN',

    // Combat HUD
    scoreLabel: 'SCORE:',
    sectorStage: 'SECTOR {sector} — STAGE {stage}',
    upgradeBtn: 'UPGRADE ({solved}/{req})',
    upgradeMaxPower: 'MAX POWER ⚡',
    speedBtnTitle: 'Alien Descent Speed Control',
    pauseBtnTitle: 'Pause Game',
    mapBtn: '🗺️ Map',

    // Lane math
    laneShipHere: 'TARGET: LANE {lane} (SHIP HERE 🚀)',
    laneSolveToMove: 'TARGET: LANE {lane} (SOLVE TO MOVE)',
    solveLabel: 'SOLVE:',
    weaponJammed: 'WEAPON JAMMED! (ERROR)',
    shipUnlocked: 'SHIP UNLOCKED! 🚀',
    correctAnswer: 'CORRECT! 🎉',
    wrongAnswer: 'ERROR! TRY AGAIN',
    btnDel: 'DEL',
    btnEnter: 'ENTER',

    // In-Game Speed flyout & Pause modal
    speedPanelTitle: '⚡ ALIEN DESCENT SPEED',
    speedMultiplierLabel: 'Speed Multiplier:',
    speedVerySlow: '0.2x (Super Slow)',
    speedSlow: '0.4x Slow',
    speedGentle: '0.7x Gentle',
    speedNormal: '1.0x Normal',
    speedFast: '1.5x Fast',
    speedVeryFast: '2.0x Very Fast',
    speedHelpTxt: 'Adjust speed to give your child more or less thinking time.',
    pauseTitle: '⏸️ GAME PAUSED',
    pauseResumeBtn: 'Resume Game ▶️',
    pauseMapBtn: 'Return to Star Map 🗺️',

    // Upgrade Drawer
    upgradeDrawerTitle: '⚡ UPGRADE YOUR SHIP',
    upgradeDrawerSubtitle: 'Solve bonus problems to empower your weapons in real-time!',
    tier1Name: 'Tier 1: Starter Scout',
    tier2Name: 'Tier 2: Dual-Wing Hunter',
    tier3Name: 'Tier 3: Plasma Cruiser',
    tier4Name: 'Tier 4: Neon Flagship',
    nextTier2Desc: 'Next: Dual-Wing Hunter (Dual Blasters + V-Spread)',
    nextTier3Desc: 'Next: Plasma Cruiser (Piercing Plasma Beams)',
    nextTier4Desc: 'Next: Neon Flagship (Ultimate Chain Lightning)',
    maxTierReached: 'MAXIMUM POWER ACHIEVED! 🌟',
    solvedCount: '{solved} of {req} problems solved',
    maxedOut: 'Maxed Out!',

    // Settings Modal
    settingsTitle: '⚙️ Math Difficulty & Settings',
    settingsSectionLanguage: '🌐 LANGUAGE / SPROG',
    settingsSectionGrade: '🎓 GRADE PRESET (GRADES 1 – 10)',
    settingsGradeSubtitle: 'Choose a grade level to tailor the math curriculum.',
    settingsSectionAnswerMode: '🎯 ANSWER INPUT MODE',
    modeMultipleChoiceTitle: '🔘 5 Multiple Choice Options (Recommended)',
    modeMultipleChoiceDesc: '1 correct answer and 4 distractors. Fast arcade experience.',
    modeManualTitle: '⌨️ Manual Entry (Keypad / Typing)',
    modeManualDesc: 'Player inputs full numerical answer via on-screen keypad or keyboard.',
    settingsSectionSpeech: '🗣️ READ ALOUD / TEXT-TO-SPEECH (TTS)',
    speechEnabledTitle: '🗣️ Read Math Problems and Answers Aloud',
    speechEnabledDesc: 'Speaks the math problem aloud, the chosen answer, and whether it is right or wrong.',
    speechTestBtn: '🔊 Test Voice',
    settingsSectionSpeed: '⚡ ALIEN DESCENT SPEED (ADULT CONTROL)',
    settingsSectionTailoring: '🛠️ GRANULAR TAILORING',
    operationsLabel: 'Allowed Operations:',
    opAdd: 'Addition (+)',
    opSub: 'Subtraction (-)',
    opMul: 'Multiplication (×)',
    opDiv: 'Division (÷)',
    opAlgebra: 'Pre-Algebra (Find x)',
    maxNumberLabel: 'Max Number Ceiling:',
    allowNegativeLabel: 'Allow Negative Numbers (Subtractions below zero)',
    saveChangesBtn: '💾 Save Changes',

    // Profile Gateway
    gatewayTitle: 'MATH INVADERS',
    gatewaySubtitle: '🚀 SELECT OR CREATE A PILOT PROFILE TO BEGIN',
    choosePilot: 'CHOOSE YOUR PILOT:',
    noProfilesYet: 'No pilot profiles created yet! Create your child\'s profile below.',
    launchBtn: 'LAUNCH 🚀',
    deleteProfilePrompt: 'Are you sure you want to delete this profile?',
    createNewProfile: '➕ CREATE NEW CHILD PROFILE',
    namePlaceholder: 'Child\'s Name (e.g. Leo or Mia)',
    chooseAvatar: 'Avatar:',
    createProfileBtn: 'Create Profile & Tailor Settings ⚙️',
    backupBtn: '💾 Backup Data (JSON)',
    restoreBtn: '📂 Restore Data',
    restoreSuccess: 'Profiles restored successfully!',
    restoreFail: 'Invalid backup file.',
    switchProfileTitle: '👨‍🚀 Switch Player Profile',

    // Star Map
    starMapTitle: 'COSMIC SECTOR MAP',
    starMapSubtitle: 'Defend the solar system against cyber-invaders!',
    sector1Title: 'Sector 1: Moon Base Alpha',
    sector1Sub: 'Recon Invasions & Basic Waves',
    sector2Title: 'Sector 2: Asteroid Belt',
    sector2Sub: 'Rapid Cyber-Drone Swarms',
    sector3Title: 'Sector 3: Mars Orbit',
    sector3Sub: 'Armored Mech-Crabs & Behemoths',
    sector4Title: 'Sector 4: Jupiter Rings',
    sector4Sub: 'Dense Formations & Vulnerable Energy Cores',
    sector5Title: 'Sector 5: Deep Space Nebula',
    sector5Sub: 'Colossal Mechanical Dreadnought Boss',

    // Hangar
    hangarTitle: '🛸 Ship Hangar & Shop',
    yourTreasury: 'Your Treasury:',
    equippedBadge: 'EQUIPPED',
    equipBtn: 'EQUIP',
    unlockBtn: 'UNLOCK',

    // Victory / Defeat
    victoryTitle: '🎉 SECTOR DEFENDED!',
    victoryDesc: 'Sector {sector} — Stage {stage} Cleared!',
    scoreEarned: 'SCORE: {score}',
    nextStageBtn: 'Next Stage 🚀',
    returnMapBtn: 'Star Map 🗺️',
    defeatTitle: '💥 DEFENSE LINE BREACHED',
    defeatDesc: 'Aliens broke through your defense line!',
    defeatEncourage: 'Don\'t give up! Every heroic pilot gets stronger with practice. Let\'s try again!',
    retryBtn: 'Retry Mission 🔄',

    // Parent Report
    parentReportTitle: '📊 Parent Analytics: {name}',
    kpiSolved: 'PROBLEMS SOLVED',
    kpiAccuracy: 'ACCURACY',
    kpiAvgSpeed: 'AVG RESPONSE',
    masteryTitle: '📈 MASTERY BY OPERATION',
    noProblemsSolvedYet: 'No problems answered yet. Play a stage to see results!',
    troubleSpotsTitle: '🎯 RECENT TROUBLE SPOTS ({count})',
    noTroubleSpots: '🌟 Flawless! No recent mistakes recorded.',
    answerWas: 'Answer: {user} (Correct: {correct})',
    printWorksheetBtn: '🖨️ Printable Practice Sheet',
    printWorksheetTitle: 'Math Invaders — Practice Sheet ({name})',
    allowPopupsAlert: 'Please allow popups to open the printable practice sheet.'
  }
};

export function t(key: keyof typeof translations['da'], params?: Record<string, string | number>): string {
  const lang = getLanguage();
  let text = translations[lang][key] || translations['da'][key] || String(key);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}
