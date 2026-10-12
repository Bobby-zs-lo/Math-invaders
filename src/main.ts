import { getActiveProfile, PlayerProfile, updateActiveProfile } from './models/Profile';
import { GameEngine } from './engine/GameEngine';
import { soundEngine } from './engine/SoundEngine';
import { StarMapModal } from './ui/StarMapModal';
import { ProfileModal } from './ui/ProfileModal';
import { DifficultyModal } from './ui/DifficultyModal';
import { HangarModal } from './ui/HangarModal';
import { ParentReportModal } from './ui/ParentReportModal';
import { VictoryDefeatModal } from './ui/VictoryDefeatModal';
import { getLanguage, setLanguage, onLanguageChange, t } from './i18n/translations';
import { speechEngine } from './engine/SpeechEngine.ts';

class MathInvadersApp {
  public profile: PlayerProfile | null = null;
  public gameEngine: GameEngine | null = null;
  private currentInput: string = '';
  private currentUpgradeInput: string = '';
  private currentSector: number = 1;
  private currentStage: number = 1;

  // Views
  private profileSelectView: HTMLElement;
  private profileSelectMount: HTMLElement;
  private starMapView: HTMLElement;
  private starMapMount: HTMLElement;
  private gameArenaView: HTMLElement;
  private modalsRoot: HTMLElement;

  // Header UI
  private headerAvatar: HTMLElement;
  private headerName: HTMLElement;
  private headerGrade: HTMLElement;
  private headerCoins: HTMLElement;
  private headerDiamonds: HTMLElement;
  private btnAudio: HTMLButtonElement;
  private btnSpeech: HTMLButtonElement;

  // Game HUD UI
  private hudLives: HTMLElement;
  private hudScore: HTMLElement;
  private hudStageName: HTMLElement;
  private hudWaveFill: HTMLElement;
  private btnToggleUpgrade: HTMLElement;

  // Math HUD UI
  private mathLaneTag: HTMLElement;
  private mathQuestion: HTMLElement;
  private mathInputDisplay: HTMLElement;
  private mathFeedback: HTMLElement;
  private laneButtons: NodeListOf<HTMLButtonElement>;
  private laneClickCols: NodeListOf<HTMLElement>;

  // Side Upgrade Drawer UI
  private upgradeSidePanel: HTMLElement;
  private sideTierLabel: HTMLElement;
  private sideNextTierLabel: HTMLElement;
  private sideUpgradeProgressFill: HTMLElement;
  private sideUpgradeCaption: HTMLElement;
  private sideUpgQuestion: HTMLElement;
  private sideUpgInput: HTMLElement;
  private sideUpgFeedback: HTMLElement;
  private feedbackTimeoutId: any = null;
  private upgFeedbackTimeoutId: any = null;

  // Math & Upgrade Answer Mode UI
  private virtualNumpad: HTMLElement;
  private multipleChoiceContainer: HTMLElement;
  private sideMiniNumpad: HTMLElement;
  private sideUpgMultipleChoice: HTMLElement;
  private currentOptions: number[] = [];
  private currentUpgradeOptions: number[] = [];

  // Modals
  public profileModal: ProfileModal;
  public difficultyModal: DifficultyModal | null = null;
  public hangarModal: HangarModal | null = null;
  public parentReportModal: ParentReportModal | null = null;
  public victoryModal: VictoryDefeatModal;

  constructor() {
    (window as any).__mathApp = this;
    (window as any).app = this;
    // Cache views
    this.profileSelectView = document.getElementById('view-profile-select')!;
    this.profileSelectMount = document.getElementById('profile-select-mount')!;
    this.starMapView = document.getElementById('view-star-map')!;
    this.starMapMount = document.getElementById('star-map-mount')!;
    this.gameArenaView = document.getElementById('view-game-arena')!;
    this.modalsRoot = document.getElementById('modals-root')!;

    // Header UI
    this.headerAvatar = document.getElementById('header-avatar')!;
    this.headerName = document.getElementById('header-player-name')!;
    this.headerGrade = document.getElementById('header-grade-tag')!;
    this.headerCoins = document.getElementById('header-coins')!;
    this.headerDiamonds = document.getElementById('header-diamonds')!;
    this.btnAudio = document.getElementById('btn-audio-toggle') as HTMLButtonElement;
    this.btnSpeech = document.getElementById('btn-speech-toggle') as HTMLButtonElement;

    // Game HUD UI
    this.hudLives = document.getElementById('hud-lives')!;
    this.hudScore = document.getElementById('hud-score')!;
    this.hudStageName = document.getElementById('hud-stage-name')!;
    this.hudWaveFill = document.getElementById('hud-wave-fill')!;
    this.btnToggleUpgrade = document.getElementById('btn-toggle-upgrade-panel')!;

    // Math HUD UI
    this.mathLaneTag = document.getElementById('math-lane-tag')!;
    this.mathQuestion = document.getElementById('math-question')!;
    this.mathInputDisplay = document.getElementById('math-input-display')!;
    this.mathFeedback = document.getElementById('math-feedback')!;
    this.laneButtons = document.querySelectorAll('.lane-btn');
    this.laneClickCols = document.querySelectorAll('.lane-click-col');
    this.virtualNumpad = document.getElementById('virtual-numpad')!;
    this.multipleChoiceContainer = document.getElementById('multiple-choice-container')!;

    // Upgrade Drawer UI
    this.upgradeSidePanel = document.getElementById('upgrade-side-panel')!;
    this.sideTierLabel = document.getElementById('side-tier-label')!;
    this.sideNextTierLabel = document.getElementById('side-next-tier-label')!;
    this.sideUpgradeProgressFill = document.getElementById('side-upgrade-progress-fill')!;
    this.sideUpgradeCaption = document.getElementById('side-upgrade-caption')!;
    this.sideUpgQuestion = document.getElementById('side-upg-question')!;
    this.sideUpgInput = document.getElementById('side-upg-input')!;
    this.sideUpgFeedback = document.getElementById('side-upg-feedback')!;
    this.sideMiniNumpad = document.getElementById('side-mini-numpad')!;
    this.sideUpgMultipleChoice = document.getElementById('side-upg-multiple-choice')!;

    // Modals
    this.profileModal = new ProfileModal(this.modalsRoot, (prof, isNew) => {
      this.onProfileChosen(prof, isNew);
    });
    this.victoryModal = new VictoryDefeatModal(this.modalsRoot);

    this.setupEventListeners();
    onLanguageChange(() => this.applyLanguage());
    this.applyLanguage();

    // Check if an existing profile is active
    this.profile = getActiveProfile();
    if (!this.profile) {
      // Show startup profile gateway!
      this.showProfileGateway();
    } else {
      this.initProfileSession(this.profile);
    }
  }

  private showProfileGateway(): void {
    this.profileSelectView.classList.remove('hidden');
    this.starMapView.classList.add('hidden');
    this.gameArenaView.classList.add('hidden');
    this.profileModal.renderGateway(this.profileSelectMount);
  }

  private onProfileChosen(prof: PlayerProfile, isNewProfile: boolean = false): void {
    this.initProfileSession(prof);

    // If new profile, immediately offer the Math Difficulty Configurator so they tailor the problems!
    if (isNewProfile) {
      this.difficultyModal = new DifficultyModal(this.modalsRoot, this.profile!, (updated) => {
        this.profile = updated;
        this.updateHeaderUI();
      });
      this.difficultyModal.show();
    }
  }

  private initProfileSession(prof: PlayerProfile): void {
    this.modalsRoot.innerHTML = '';
    this.profile = prof;
    if (this.profile?.mathSettings?.speechEnabled !== undefined) {
      speechEngine.setEnabled(this.profile.mathSettings.speechEnabled);
    }
    this.updateHeaderUI();

    this.profileSelectView.classList.add('hidden');
    this.starMapView.classList.remove('hidden');
    this.gameArenaView.classList.add('hidden');

    this.difficultyModal = new DifficultyModal(this.modalsRoot, this.profile, (updated) => {
      this.profile = updated;
      if (updated.mathSettings?.speechEnabled !== undefined) {
        speechEngine.setEnabled(updated.mathSettings.speechEnabled);
      }
      this.updateHeaderUI();
      if (this.gameEngine) {
        this.gameEngine.updateProfile(updated);
        const activeProb = this.gameEngine.getActiveMathProblem();
        if (activeProb) {
          this.renderAnswerInputControls(activeProb.options);
        }
        const activeUpgProb = this.gameEngine.getActiveUpgradeProblem();
        this.renderUpgradeAnswerInputControls(this.gameEngine.state.inStageUpgradeTier, activeUpgProb);
      }
    });
    this.hangarModal = new HangarModal(this.modalsRoot, this.profile, (updated) => {
      this.profile = updated;
      this.updateHeaderUI();
      if (this.gameEngine) this.gameEngine.updateProfile(updated);
    });
    this.parentReportModal = new ParentReportModal(this.modalsRoot, this.profile);

    // Initialize or update canvas engine
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.gameEngine) {
      this.gameEngine = new GameEngine(canvas, this.profile);
      this.setupEngineCallbacks();
    }

    this.renderStarMap();
  }

  public applyLanguage(): void {
    const isDa = getLanguage() === 'da';
    document.documentElement.lang = getLanguage();
    document.title = t('appTitle');

    // Header buttons
    const btnLang = document.getElementById('btn-lang-toggle');
    if (btnLang) btnLang.textContent = t('langToggle');

    const btnProfiles = document.getElementById('btn-switch-profile');
    if (btnProfiles) btnProfiles.textContent = t('profilesBtn');

    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) btnSettings.textContent = t('settingsBtn');

    const btnHangar = document.getElementById('btn-hangar');
    if (btnHangar) btnHangar.textContent = t('hangarBtn');

    const btnReport = document.getElementById('btn-parent-report');
    if (btnReport) btnReport.textContent = t('reportBtn');

    if (this.btnSpeech) this.btnSpeech.title = t('speechToggleTitle');

    // Header Grade & Info
    this.updateHeaderUI();

    // In-game HUD
    const hudScoreLabel = document.querySelector('.score-display .hud-label');
    if (hudScoreLabel) hudScoreLabel.textContent = t('scoreLabel');

    if (!this.gameArenaView.classList.contains('hidden')) {
      this.hudStageName.textContent = t('sectorStage', { sector: this.currentSector, stage: this.currentStage });

      const currentShipLane = this.gameEngine ? this.gameEngine.state.playerLane : 2;
      const targetLane = this.gameEngine ? this.gameEngine.state.selectedLane : 2;
      const isShipLane = currentShipLane === targetLane;
      this.mathLaneTag.textContent = isShipLane
        ? t('laneShipHere', { lane: targetLane + 1 })
        : t('laneSolveToMove', { lane: targetLane + 1 });
    }

    // Lane Buttons & Click Overlay Labels
    this.laneButtons.forEach((btn, idx) => {
      const spans = btn.querySelectorAll('span');
      if (spans.length >= 2) {
        spans[1].textContent = `${isDa ? 'BANE' : 'LANE'} ${idx + 1}`;
      }
    });
    this.laneClickCols.forEach((col, idx) => {
      const span = col.querySelector('span');
      if (span) span.textContent = `${isDa ? 'BANE' : 'LANE'} ${idx + 1}`;
    });

    // Virtual Numpad Action Buttons
    const clearKey = document.querySelector('.clear-key');
    if (clearKey) clearKey.textContent = t('btnDel');
    const submitKey = document.querySelector('.submit-key');
    if (submitKey) submitKey.textContent = isDa ? 'AFFYR 🚀' : 'FIRE 🚀';

    // Upgrade drawer labels
    const drawerTitle = document.querySelector('.drawer-title');
    if (drawerTitle) drawerTitle.textContent = t('upgradeDrawerTitle');
    const upgInst = document.querySelector('.upg-inst');
    if (upgInst) upgInst.textContent = isDa ? 'Løs når du har et ledigt sekund:' : 'Solve when you have a spare second:';
    const upgSubmit = document.getElementById('btn-upg-submit');
    if (upgSubmit) upgSubmit.textContent = `⚡ ${isDa ? 'OPGRADÉR' : 'UPGRADE'}`;
    const upgClear = document.getElementById('btn-upg-clear');
    if (upgClear) upgClear.textContent = t('btnDel');

    // Adult Speed flyout
    const speedTitle = document.querySelector('.speed-panel-title');
    if (speedTitle) speedTitle.textContent = t('speedPanelTitle');
    const speedMultiplierLabel = document.querySelector('.speed-display-row .speed-label');
    if (speedMultiplierLabel) speedMultiplierLabel.textContent = t('speedMultiplierLabel');

    // Pause Modal
    const pauseTitle = document.querySelector('.pause-title');
    if (pauseTitle) pauseTitle.textContent = t('pauseTitle');
    const pauseDesc = document.querySelector('.pause-desc');
    if (pauseDesc) pauseDesc.textContent = isDa
      ? 'Tag en pause! Voksne kan justere rumvæsnernes hastighed her:'
      : 'Take a break! Adults can adjust the alien descent speed here:';
    const pauseResume = document.getElementById('btn-resume-game');
    if (pauseResume) pauseResume.textContent = isDa ? '▶️ FORTSÆT SPILLET' : '▶️ RESUME GAME';
    const pauseMap = document.getElementById('btn-pause-return-map');
    if (pauseMap) pauseMap.textContent = isDa ? '🗺️ GÅ TIL RUMKORTET' : '🗺️ RETURN TO MAP';

    // Map button on combat HUD
    const exitMapBtn = document.getElementById('btn-exit-to-map');
    if (exitMapBtn) exitMapBtn.textContent = t('mapBtn');

    // If Star Map is visible, re-render it
    if (!this.starMapView.classList.contains('hidden') && this.profile) {
      this.renderStarMap();
    }

    // If Profile Gateway is visible, re-render it
    if (!this.profileSelectView.classList.contains('hidden')) {
      this.profileModal.renderGateway(this.profileSelectMount);
    }
  }

  private updateHeaderUI(): void {
    if (!this.profile) return;
    this.headerAvatar.textContent = this.profile.avatar;
    this.headerName.textContent = this.profile.name;
    this.headerGrade.textContent = t('gradeBadge', { grade: this.profile.gradeLevel });
    this.headerCoins.textContent = String(this.profile.coins);
    this.headerDiamonds.textContent = String(this.profile.diamonds);
    this.btnAudio.textContent = soundEngine.getIsMuted() ? '🔇' : '🔊';
    this.btnSpeech.textContent = speechEngine.isEnabled() ? '🗣️' : '🔇';
    this.btnSpeech.title = t('speechToggleTitle');
  }

  private renderStarMap(): void {
    if (!this.profile) return;
    const starMap = new StarMapModal(this.starMapMount, this.profile, (sec, stg) => {
      this.launchStage(sec, stg);
    });
    starMap.render();
  }

  private launchStage(sector: number, stage: number): void {
    this.currentSector = sector;
    this.currentStage = stage;
    this.currentInput = '';
    this.currentUpgradeInput = '';
    this.updateMathInputDisplay();
    this.updateUpgradeInputDisplay();

    this.hudStageName.textContent = t('sectorStage', { sector, stage });
    this.starMapView.classList.add('hidden');
    this.profileSelectView.classList.add('hidden');
    this.gameArenaView.classList.remove('hidden');

    // Ensure upgrade drawer is open on desktop, or closed on mobile
    if (window.innerWidth >= 768) {
      this.upgradeSidePanel.classList.remove('closed');
    } else {
      this.upgradeSidePanel.classList.add('closed');
    }

    // Set answer controls visibility based on active answerMode setting
    if (this.profile?.mathSettings?.answerMode === 'multiple_choice') {
      this.virtualNumpad.classList.add('hidden');
      this.sideMiniNumpad.classList.add('hidden');
      this.multipleChoiceContainer.classList.remove('hidden');
      this.sideUpgMultipleChoice.classList.remove('hidden');
    } else {
      this.virtualNumpad.classList.remove('hidden');
      this.sideMiniNumpad.classList.remove('hidden');
      this.multipleChoiceContainer.classList.add('hidden');
      this.sideUpgMultipleChoice.classList.add('hidden');
    }

    // Ensure in-game speed panel and pause modal are hidden
    document.getElementById('in-game-speed-panel')?.classList.add('hidden');
    document.getElementById('in-game-pause-modal')?.classList.add('hidden');

    // Sync initial adult descent speed
    const currentSpeed = this.profile?.mathSettings?.descentSpeedMultiplier ?? 1.0;
    this.setGameDescentSpeed(currentSpeed);

    if (this.gameEngine) {
      this.gameEngine.startStage(sector, stage);
    }
  }

  private returnToStarMap(): void {
    if (this.gameEngine) {
      this.gameEngine.stop();
    }
    document.getElementById('in-game-speed-panel')?.classList.add('hidden');
    document.getElementById('in-game-pause-modal')?.classList.add('hidden');
    this.gameArenaView.classList.add('hidden');
    this.starMapView.classList.remove('hidden');
    this.updateHeaderUI();
    this.renderStarMap();
  }

  private setupEngineCallbacks(): void {
    if (!this.gameEngine) return;

    this.gameEngine.setCallbacks({
      onMathProblemUpdate: (lane, question, options) => {
        const currentShipLane = this.gameEngine ? this.gameEngine.state.playerLane : 2;
        const isShipLane = currentShipLane === lane;
        this.mathLaneTag.textContent = isShipLane
          ? t('laneShipHere', { lane: lane + 1 })
          : t('laneSolveToMove', { lane: lane + 1 });
        this.mathQuestion.textContent = question;
        this.currentInput = '';
        this.updateMathInputDisplay();
        this.clearFeedback();

        // Highlight lane buttons and canvas overlay columns
        this.laneButtons.forEach((btn, idx) => {
          if (idx === lane) btn.classList.add('active');
          else btn.classList.remove('active');

          if (idx === currentShipLane) btn.classList.add('ship-here');
          else btn.classList.remove('ship-here');
        });

        this.laneClickCols.forEach((col, idx) => {
          if (idx === lane) col.classList.add('active');
          else col.classList.remove('active');
        });

        this.renderAnswerInputControls(options);
        speechEngine.speakProblem(question);
      },

      onHudUpdate: (score, lives, progress, tier, solved, req) => {
        this.hudScore.textContent = String(score);
        this.hudWaveFill.style.width = `${Math.round(progress * 100)}%`;
        this.hudLives.innerHTML = Array(lives).fill('<span class="shield-heart">🛡️</span>').join('');

        const txt = this.btnToggleUpgrade.querySelector('.upgrade-txt');
        if (txt) {
          txt.textContent = tier >= 4 ? t('upgradeMaxPower') : t('upgradeBtn', { solved, req });
        }
      },

      onUpgradeStatusUpdate: (tier, solved, req, prob) => {
        const isDa = getLanguage() === 'da';
        const tierNames = isDa ? [
          '',
          t('tier1Name'),
          t('tier2Name'),
          t('tier3Name'),
          t('tier4Name')
        ] : [
          '',
          'Tier 1: Starter Scout',
          'Tier 2: Dual-Wing Hunter',
          'Tier 3: Plasma Cruiser',
          'Tier 4: Neon Flagship'
        ];
        const nextTierNames = isDa ? [
          '',
          t('nextTier2Desc'),
          t('nextTier3Desc'),
          t('nextTier4Desc'),
          t('maxTierReached')
        ] : [
          '',
          'Next: Dual-Wing Hunter (Dual Blasters + V-Spread)',
          'Next: Plasma Cruiser (Piercing Plasma Beams)',
          'Next: Neon Flagship (Ultimate Chain Lightning)',
          'MAXIMUM POWER ACHIEVED!'
        ];

        this.sideTierLabel.textContent = tierNames[tier] || `Tier ${tier}`;
        this.sideNextTierLabel.textContent = nextTierNames[tier] || '';

        const pct = req > 0 ? (solved / req) * 100 : 100;
        this.sideUpgradeProgressFill.style.width = `${pct}%`;
        this.sideUpgradeCaption.textContent = tier >= 4 ? t('maxedOut') : t('solvedCount', { solved, req });

        if (prob && tier < 4) {
          this.sideUpgQuestion.textContent = prob.question;
        } else {
          this.sideUpgQuestion.textContent = isDa ? 'MAKS NIVEAU! 🌟' : 'MAX TIER! 🌟';
        }
        this.currentUpgradeInput = '';
        this.updateUpgradeInputDisplay();
        this.renderUpgradeAnswerInputControls(tier, prob);
      },

      onStageVictory: (stars, coins, diamonds) => {
        this.updateHeaderUI();
        this.victoryModal.showVictory({
          sector: this.currentSector,
          stage: this.currentStage,
          stars,
          score: parseInt(this.hudScore.textContent || '0', 10),
          coinsWon: coins,
          diamondsWon: diamonds,
          onNextStage: () => {
            const nextStage = this.currentStage < 5 ? this.currentStage + 1 : 1;
            const nextSector = this.currentStage < 5 ? this.currentSector : Math.min(5, this.currentSector + 1);
            this.launchStage(nextSector, nextStage);
          },
          onReturnToMap: () => this.returnToStarMap()
        });
      },

      onGameOver: () => {
        this.victoryModal.showGameOver({
          sector: this.currentSector,
          stage: this.currentStage,
          onRetry: () => this.launchStage(this.currentSector, this.currentStage),
          onReturnToMap: () => this.returnToStarMap()
        });
      }
    });
  }

  private setupEventListeners(): void {
    // Header buttons
    document.getElementById('btn-profile-badge')?.addEventListener('click', () => {
      this.profileModal.showModal();
    });

    document.getElementById('btn-switch-profile')?.addEventListener('click', () => {
      this.profileModal.showModal();
    });

    const openSettings = () => {
      if (!this.profile) return;
      if (!this.difficultyModal) {
        this.difficultyModal = new DifficultyModal(this.modalsRoot, this.profile, (updated) => {
          this.profile = updated;
          this.updateHeaderUI();
          if (this.gameEngine) {
            this.gameEngine.updateProfile(updated);
            const activeProb = this.gameEngine.getActiveMathProblem();
            if (activeProb) {
              this.renderAnswerInputControls(activeProb.options);
            }
            const activeUpgProb = this.gameEngine.getActiveUpgradeProblem();
            this.renderUpgradeAnswerInputControls(this.gameEngine.state.inStageUpgradeTier, activeUpgProb);
          }
        });
      }
      this.difficultyModal.show();
    };

    document.getElementById('btn-settings')?.addEventListener('click', openSettings);

    document.getElementById('btn-lang-toggle')?.addEventListener('click', () => {
      const nextLang = getLanguage() === 'da' ? 'en' : 'da';
      setLanguage(nextLang);
    });

    document.getElementById('header-grade-tag')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettings();
    });

    this.btnAudio.addEventListener('click', () => {
      soundEngine.toggleMute();
      this.btnAudio.textContent = soundEngine.getIsMuted() ? '🔇' : '🔊';
    });

    this.btnSpeech.addEventListener('click', () => {
      const enabled = speechEngine.toggle();
      this.btnSpeech.textContent = enabled ? '🗣️' : '🔇';
      if (this.profile && this.profile.mathSettings) {
        this.profile.mathSettings.speechEnabled = enabled;
        updateActiveProfile(this.profile);
      }
      if (enabled) {
        speechEngine.speakTest();
      }
    });

    document.getElementById('btn-hangar')?.addEventListener('click', () => {
      if (this.hangarModal) this.hangarModal.show();
    });

    document.getElementById('btn-parent-report')?.addEventListener('click', () => {
      if (this.parentReportModal) this.parentReportModal.show();
    });

    // Adult Speed Control Button & Flyout Panel
    document.getElementById('btn-adult-speed')?.addEventListener('click', () => {
      const panel = document.getElementById('in-game-speed-panel');
      panel?.classList.toggle('hidden');
    });

    document.getElementById('btn-close-speed-panel')?.addEventListener('click', () => {
      document.getElementById('in-game-speed-panel')?.classList.add('hidden');
    });

    const inGameSlider = document.getElementById('in-game-speed-slider') as HTMLInputElement;
    inGameSlider?.addEventListener('input', () => {
      this.setGameDescentSpeed(parseFloat(inGameSlider.value));
    });

    document.querySelectorAll('.speed-preset-btn:not(.pause-preset)').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-speed') || '1.0');
        this.setGameDescentSpeed(val);
      });
    });

    // Pause Game & In-Game Pause Modal
    document.getElementById('btn-pause-game')?.addEventListener('click', () => {
      if (this.gameEngine) {
        this.gameEngine.pauseGame();
        const pauseModal = document.getElementById('in-game-pause-modal');
        if (this.gameEngine.state.isPaused) {
          pauseModal?.classList.remove('hidden');
          document.getElementById('in-game-speed-panel')?.classList.add('hidden');
        } else {
          pauseModal?.classList.add('hidden');
        }
      }
    });

    document.getElementById('btn-resume-game')?.addEventListener('click', () => {
      if (this.gameEngine && this.gameEngine.state.isPaused) {
        this.gameEngine.pauseGame();
      }
      document.getElementById('in-game-pause-modal')?.classList.add('hidden');
    });

    document.getElementById('btn-pause-return-map')?.addEventListener('click', () => {
      this.returnToStarMap();
    });

    const pauseSlider = document.getElementById('pause-speed-slider') as HTMLInputElement;
    pauseSlider?.addEventListener('input', () => {
      this.setGameDescentSpeed(parseFloat(pauseSlider.value));
    });

    document.querySelectorAll('.pause-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.getAttribute('data-speed') || '1.0');
        this.setGameDescentSpeed(val);
      });
    });

    document.getElementById('btn-exit-to-map')?.addEventListener('click', () => {
      this.returnToStarMap();
    });

    // In-Stage Upgrade Drawer Toggle Button (Non-blocking! Aliens keep descending!)
    this.btnToggleUpgrade.addEventListener('click', () => {
      this.upgradeSidePanel.classList.toggle('closed');
    });

    document.getElementById('btn-minimize-upgrade')?.addEventListener('click', () => {
      this.upgradeSidePanel.classList.add('closed');
    });

    // 5 Bottom Lane Buttons
    this.laneButtons.forEach((btn, idx) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.gameEngine) this.gameEngine.selectLane(idx);
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.gameEngine) this.gameEngine.selectLane(idx);
      });
    });

    // 5 Canvas Overlay Click Columns
    this.laneClickCols.forEach((col, idx) => {
      col.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (this.gameEngine) this.gameEngine.selectLane(idx);
      });
    });

    // Main Virtual Numpad
    document.querySelectorAll('.num-key').forEach(key => {
      key.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const val = el.getAttribute('data-val');
        const act = el.getAttribute('data-action');

        if (val !== null) {
          if (this.currentInput.length < 6) {
            this.currentInput += val;
            this.updateMathInputDisplay();
            speechEngine.speak(val, { priority: true, rate: 1.1 });
          }
        } else if (act === 'neg') {
          this.toggleMathNegative();
        } else if (act === 'backspace') {
          this.currentInput = this.currentInput.slice(0, -1);
          this.updateMathInputDisplay();
        } else if (act === 'submit') {
          this.submitCurrentAnswer();
        }
      });
    });

    // Upgrade Side Drawer Mini Numpad (Real-time live solving!)
    document.querySelectorAll('.upg-digit').forEach(key => {
      key.addEventListener('click', (e) => {
        const val = (e.currentTarget as HTMLElement).getAttribute('data-v');
        if (val && this.currentUpgradeInput.length < 6) {
          this.currentUpgradeInput += val;
          this.updateUpgradeInputDisplay();
        }
      });
    });

    document.getElementById('btn-upg-neg')?.addEventListener('click', () => {
      this.toggleUpgradeNegative();
    });

    document.getElementById('btn-upg-clear')?.addEventListener('click', () => {
      this.currentUpgradeInput = this.currentUpgradeInput.slice(0, -1);
      this.updateUpgradeInputDisplay();
    });

    document.getElementById('btn-upg-submit')?.addEventListener('click', () => {
      this.submitUpgradeCurrentAnswer();
    });

    // Physical Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      if (!this.gameArenaView.classList.contains('hidden')) {
        // Multiple choice direct key selection (keys 1-5 pick choices 1-5)
        if (this.profile?.mathSettings?.answerMode === 'multiple_choice') {
          if (['1', '2', '3', '4', '5'].includes(e.key)) {
            const choiceIdx = parseInt(e.key, 10) - 1;
            if (this.currentOptions && this.currentOptions[choiceIdx] !== undefined) {
              e.preventDefault();
              this.submitMultipleChoiceAnswer(this.currentOptions[choiceIdx]);
              return;
            }
          }
        }

        // Support negative numbers via '-' or 'Minus' or 'NumpadSubtract'
        if (e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          this.toggleMathNegative();
          return;
        }

        // Distinguish physical numpad (always treat as digit input into currentInput)
        const numpadMatch = e.code.match(/^Numpad([0-9])$/);
        const isNumpadDigit = !!numpadMatch || (e.code.startsWith('Numpad') && /^[0-9]$/.test(e.key));
        const numpadVal = numpadMatch ? numpadMatch[1] : e.key;

        if (isNumpadDigit) {
          if (this.currentInput.length < 6) {
            this.currentInput += numpadVal;
            this.updateMathInputDisplay();
            speechEngine.speak(numpadVal, { priority: true, rate: 1.1 });
          }
          return;
        }

        // For top-row number keys (Digit1–Digit5) or non-numpad 1-5 keys:
        if (!isNumpadDigit && ['1', '2', '3', '4', '5'].includes(e.key)) {
          if (this.currentInput !== '') {
            // If this.currentInput !== '', always append digit to this.currentInput
            if (this.currentInput.length < 6) {
              this.currentInput += e.key;
              this.updateMathInputDisplay();
              speechEngine.speak(e.key, { priority: true, rate: 1.1 });
            }
            return;
          } else {
            // If this.currentInput === '':
            const targetLane = parseInt(e.key, 10) - 1;
            const activeLane = this.gameEngine ? this.gameEngine.state.selectedLane : -1;
            if (this.gameEngine && (activeLane + 1) === parseInt(e.key, 10)) {
              // Matches currently active lane: append digit rather than switching lanes!
              if (this.currentInput.length < 6) {
                this.currentInput += e.key;
                this.updateMathInputDisplay();
                speechEngine.speak(e.key, { priority: true, rate: 1.1 });
              }
              return;
            } else {
              // Different lane: switch lanes!
              e.preventDefault();
              if (this.gameEngine) this.gameEngine.selectLane(targetLane);
              return;
            }
          }
        }

        // Arrow keys to steer lanes
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          if (this.gameEngine) this.gameEngine.shiftLane(-1);
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          if (this.gameEngine) this.gameEngine.shiftLane(1);
          return;
        }

        // Typing digits into active defense equation (includes numpad digits and digits 0, 6-9)
        if (/^[0-9]$/.test(e.key)) {
          if (this.currentInput.length < 6) {
            this.currentInput += e.key;
            this.updateMathInputDisplay();
            speechEngine.speak(e.key, { priority: true, rate: 1.1 });
          }
        } else if (e.key === 'Backspace') {
          this.currentInput = this.currentInput.slice(0, -1);
          this.updateMathInputDisplay();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.submitCurrentAnswer();
        }
      }
    });
  }

  private toggleMathNegative(): void {
    if (this.currentInput === '') {
      this.currentInput = '-';
    } else if (this.currentInput === '-') {
      this.currentInput = '';
    } else if (this.currentInput.startsWith('-')) {
      this.currentInput = this.currentInput.slice(1);
    } else if (this.currentInput.length < 6) {
      this.currentInput = '-' + this.currentInput;
    }
    this.updateMathInputDisplay();
  }

  private toggleUpgradeNegative(): void {
    if (this.currentUpgradeInput === '') {
      this.currentUpgradeInput = '-';
    } else if (this.currentUpgradeInput === '-') {
      this.currentUpgradeInput = '';
    } else if (this.currentUpgradeInput.startsWith('-')) {
      this.currentUpgradeInput = this.currentUpgradeInput.slice(1);
    } else if (this.currentUpgradeInput.length < 6) {
      this.currentUpgradeInput = '-' + this.currentUpgradeInput;
    }
    this.updateUpgradeInputDisplay();
  }

  private updateMathInputDisplay(): void {
    this.mathInputDisplay.textContent = this.currentInput || '?';
  }

  private updateUpgradeInputDisplay(): void {
    this.sideUpgInput.textContent = this.currentUpgradeInput || '?';
  }

  public setGameDescentSpeed(speed: number): void {
    const clamped = Math.max(0.2, Math.min(2.0, Math.round(speed * 10) / 10));
    if (this.gameEngine) {
      this.gameEngine.setDescentSpeedMultiplier(clamped);
    }
    if (this.profile && this.profile.mathSettings) {
      this.profile.mathSettings.descentSpeedMultiplier = clamped;
      updateActiveProfile(this.profile);
    }

    // Synchronize HUD and flyout badge
    const speedTxt = `${clamped.toFixed(1)}x`;
    const hudBadge = document.getElementById('hud-speed-badge');
    if (hudBadge) hudBadge.textContent = speedTxt;

    const flyoutDisplay = document.getElementById('speed-display-val');
    if (flyoutDisplay) flyoutDisplay.textContent = speedTxt;

    const pauseDisplay = document.getElementById('pause-speed-display-val');
    if (pauseDisplay) pauseDisplay.textContent = speedTxt;

    const flyoutSlider = document.getElementById('in-game-speed-slider') as HTMLInputElement;
    if (flyoutSlider) flyoutSlider.value = String(clamped);

    const pauseSlider = document.getElementById('pause-speed-slider') as HTMLInputElement;
    if (pauseSlider) pauseSlider.value = String(clamped);

    // Update preset button active states
    document.querySelectorAll('.speed-preset-btn').forEach(btn => {
      const btnSpeed = parseFloat(btn.getAttribute('data-speed') || '1.0');
      if (Math.abs(btnSpeed - clamped) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private submitCurrentAnswer(): void {
    if (!this.currentInput || this.currentInput === '-' || !this.gameEngine) return;

    const val = parseInt(this.currentInput, 10);
    if (isNaN(val)) return;

    const correct = this.gameEngine.submitMathAnswer(val);
    speechEngine.speakFeedback(val, correct);

    if (correct) {
      this.mathFeedback.textContent = t('correctAnswer');
      this.mathFeedback.className = 'feedback-msg correct';
    } else {
      this.mathFeedback.textContent = t('weaponJammed');
      this.mathFeedback.className = 'feedback-msg wrong';
    }

    this.currentInput = '';
    this.updateMathInputDisplay();

    if (this.feedbackTimeoutId) {
      clearTimeout(this.feedbackTimeoutId);
    }
    this.feedbackTimeoutId = setTimeout(() => {
      this.clearFeedback();
      this.feedbackTimeoutId = null;
    }, 1200);
  }

  private submitUpgradeCurrentAnswer(): void {
    if (!this.currentUpgradeInput || this.currentUpgradeInput === '-' || !this.gameEngine) return;

    const val = parseInt(this.currentUpgradeInput, 10);
    if (isNaN(val)) return;

    const result = this.gameEngine.submitUpgradeAnswer(val);
    speechEngine.speakFeedback(val, result.success);
    const isDa = getLanguage() === 'da';

    if (result.success) {
      this.sideUpgFeedback.textContent = result.tierChanged
        ? (isDa ? '⚡ NYT SKIBSNIVEAU LÅST OP!' : '⚡ NEW SHIP TIER UNLOCKED!')
        : (isDa ? '⚡ SKIBSENERGI OPLADT!' : '⚡ POWER CHARGED!');
      this.sideUpgFeedback.style.color = '#00ff66';
    } else {
      this.sideUpgFeedback.textContent = isDa ? '❌ REGNEFEJL!' : '❌ CALCULATION ERROR!';
      this.sideUpgFeedback.style.color = '#ff3344';
    }

    this.currentUpgradeInput = '';
    this.updateUpgradeInputDisplay();

    if (this.upgFeedbackTimeoutId) {
      clearTimeout(this.upgFeedbackTimeoutId);
    }
    this.upgFeedbackTimeoutId = setTimeout(() => {
      this.sideUpgFeedback.textContent = '';
      this.upgFeedbackTimeoutId = null;
    }, 1500);
  }

  public submitMultipleChoiceAnswer(val: number): void {
    if (!this.gameEngine) return;
    this.currentInput = String(val);
    this.updateMathInputDisplay();

    const correct = this.gameEngine.submitMathAnswer(val);
    speechEngine.speakFeedback(val, correct);

    if (correct) {
      this.mathFeedback.textContent = t('correctAnswer');
      this.mathFeedback.className = 'feedback-msg correct';
    } else {
      this.mathFeedback.textContent = t('weaponJammed');
      this.mathFeedback.className = 'feedback-msg wrong';
    }

    this.currentInput = '';
    this.updateMathInputDisplay();

    if (this.feedbackTimeoutId) {
      clearTimeout(this.feedbackTimeoutId);
    }
    this.feedbackTimeoutId = setTimeout(() => {
      this.clearFeedback();
      this.feedbackTimeoutId = null;
    }, 1200);
  }

  public submitUpgradeMultipleChoiceAnswer(val: number): void {
    if (!this.gameEngine) return;
    this.currentUpgradeInput = String(val);
    this.updateUpgradeInputDisplay();

    const result = this.gameEngine.submitUpgradeAnswer(val);
    speechEngine.speakFeedback(val, result.success);
    const isDa = getLanguage() === 'da';

    if (result.success) {
      this.sideUpgFeedback.textContent = result.tierChanged
        ? (isDa ? '⚡ NYT SKIBSNIVEAU LÅST OP!' : '⚡ NEW SHIP TIER UNLOCKED!')
        : (isDa ? '⚡ SKIBSENERGI OPLADT!' : '⚡ POWER CHARGED!');
      this.sideUpgFeedback.style.color = '#00ff66';
    } else {
      this.sideUpgFeedback.textContent = isDa ? '❌ REGNEFEJL!' : '❌ CALCULATION ERROR!';
      this.sideUpgFeedback.style.color = '#ff3344';
    }

    this.currentUpgradeInput = '';
    this.updateUpgradeInputDisplay();

    if (this.upgFeedbackTimeoutId) {
      clearTimeout(this.upgFeedbackTimeoutId);
    }
    this.upgFeedbackTimeoutId = setTimeout(() => {
      this.sideUpgFeedback.textContent = '';
      this.upgFeedbackTimeoutId = null;
    }, 1500);
  }

  public getCurrentOptions(): number[] {
    return this.currentOptions;
  }

  public getCurrentUpgradeOptions(): number[] {
    return this.currentUpgradeOptions;
  }

  private renderAnswerInputControls(options?: number[]): void {
    const isMultipleChoice = this.profile?.mathSettings?.answerMode === 'multiple_choice';

    if (isMultipleChoice) {
      // In multiple choice mode, strictly remove the rows with numbers for self-dialing
      this.virtualNumpad.classList.add('hidden');
      this.multipleChoiceContainer.classList.remove('hidden');
      this.multipleChoiceContainer.innerHTML = '';

      let opts = options;
      if (!opts || opts.length === 0) {
        const activeProb = this.gameEngine?.getActiveMathProblem();
        if (activeProb) {
          if (!activeProb.options || activeProb.options.length === 0) {
            activeProb.options = this.gameEngine!.getMathEngine().generateOptions(activeProb.answer, 5, this.profile?.mathSettings?.allowNegative ?? false);
          }
          opts = activeProb.options;
        }
      }

      if (opts && opts.length > 0) {
        this.currentOptions = opts;
        opts.forEach((opt, idx) => {
          const btn = document.createElement('button');
          btn.className = 'choice-btn';
          btn.setAttribute('data-choice-val', String(opt));
          btn.setAttribute('data-choice-idx', String(idx));
          btn.innerHTML = `
            <span class="choice-num">${opt}</span>
            <span class="choice-key-hint">[${idx + 1}]</span>
          `;
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.submitMultipleChoiceAnswer(opt);
          });
          this.multipleChoiceContainer.appendChild(btn);
        });
      }
    } else {
      this.currentOptions = [];
      this.virtualNumpad.classList.remove('hidden');
      this.multipleChoiceContainer.classList.add('hidden');
      this.multipleChoiceContainer.innerHTML = '';
    }
  }

  private renderUpgradeAnswerInputControls(tier: number, prob: any): void {
    const isMultipleChoice = this.profile?.mathSettings?.answerMode === 'multiple_choice';

    if (isMultipleChoice) {
      // In multiple choice mode, strictly remove the rows with numbers for self-dialing
      this.sideMiniNumpad.classList.add('hidden');
      this.sideUpgMultipleChoice.classList.remove('hidden');
      this.sideUpgMultipleChoice.innerHTML = '';

      if (tier >= 4) {
        this.currentUpgradeOptions = [];
        return;
      }

      let opts = prob?.options;
      if (!opts || opts.length === 0) {
        if (prob && this.gameEngine) {
          prob.options = this.gameEngine.getMathEngine().generateOptions(prob.answer, 5, this.profile?.mathSettings?.allowNegative ?? false);
          opts = prob.options;
        }
      }

      if (opts && opts.length > 0) {
        this.currentUpgradeOptions = opts;
        opts.forEach((opt: number, idx: number) => {
          const btn = document.createElement('button');
          btn.className = 'upg-choice-btn';
          btn.setAttribute('data-upg-val', String(opt));
          btn.setAttribute('data-upg-idx', String(idx));
          btn.textContent = String(opt);
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.submitUpgradeMultipleChoiceAnswer(opt);
          });
          this.sideUpgMultipleChoice.appendChild(btn);
        });
      }
    } else {
      this.currentUpgradeOptions = [];
      this.sideMiniNumpad.classList.remove('hidden');
      this.sideUpgMultipleChoice.classList.add('hidden');
      this.sideUpgMultipleChoice.innerHTML = '';
    }
  }

  private clearFeedback(): void {
    this.mathFeedback.textContent = '';
    this.mathFeedback.className = 'feedback-msg';
  }
}

// Start application
window.addEventListener('DOMContentLoaded', () => {
  new MathInvadersApp();
});
