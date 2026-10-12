import { PlayerProfile, getDefaultMathSettingsForGrade, updateActiveProfile, MathSettings, DANISH_GRADE_CURRICULUM } from '../models/Profile';
import { getLanguage, setLanguage, t } from '../i18n/translations';

export class DifficultyModal {
  private container: HTMLElement;
  private profile: PlayerProfile;
  private onSettingsUpdated: (profile: PlayerProfile) => void;
  private selectedGrade: number;

  constructor(container: HTMLElement, profile: PlayerProfile, onSettingsUpdated: (profile: PlayerProfile) => void) {
    this.container = container;
    this.profile = profile;
    this.onSettingsUpdated = onSettingsUpdated;
    this.selectedGrade = profile.gradeLevel || profile.mathSettings?.grade || 2;
  }

  public show(): void {
    const s = this.profile.mathSettings;
    const currentLang = getLanguage();
    const currInfo = DANISH_GRADE_CURRICULUM[this.selectedGrade] || DANISH_GRADE_CURRICULUM[2];

    const isDa = currentLang === 'da';

    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card" style="max-width: 680px; max-height: 90vh; overflow-y: auto; background: rgba(10, 14, 28, 0.96); border: 2px solid #00f3ff; border-radius: 18px; box-shadow: 0 0 45px rgba(0, 243, 255, 0.25);">
          
          <!-- Header -->
          <div class="modal-header" style="border-bottom: 1px solid rgba(0, 243, 255, 0.25); padding-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem;">⚙️</span>
              <span class="modal-title" style="font-size: 1.15rem; color: #00f3ff; font-family: 'Orbitron', sans-serif; font-weight: 800;">
                ${t('settingsTitle')}
              </span>
            </div>
            <button class="modal-close-btn" id="btn-close-diff" style="font-size: 1.2rem; cursor: pointer;">✕</button>
          </div>

          <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px; padding: 16px 4px;">

            <!-- 1. Language Toggle Section -->
            <div style="background: rgba(255, 255, 255, 0.04); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center;">
              <div>
                <span style="font-family: 'Orbitron', sans-serif; font-size: 0.8rem; color: #ffe600; font-weight: 700; display: block;">
                  ${t('settingsSectionLanguage')}
                </span>
                <span style="font-size: 0.75rem; color: #8ea1c0;">
                  ${isDa ? 'Vælg sprog for hele spillet (starter altid på dansk).' : 'Choose language for the game (starts in Danish by default).'}
                </span>
              </div>
              <div style="display: flex; gap: 8px;">
                <button id="lang-btn-da" class="lang-pill-btn ${currentLang === 'da' ? 'active' : ''}" style="
                  padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;
                  border: 1px solid ${currentLang === 'da' ? '#00f3ff' : 'rgba(255,255,255,0.2)'};
                  background: ${currentLang === 'da' ? 'rgba(0, 243, 255, 0.25)' : 'rgba(255,255,255,0.06)'};
                  color: #fff;
                ">🇩🇰 Dansk</button>
                <button id="lang-btn-en" class="lang-pill-btn ${currentLang === 'en' ? 'active' : ''}" style="
                  padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 0.85rem; cursor: pointer;
                  border: 1px solid ${currentLang === 'en' ? '#00f3ff' : 'rgba(255,255,255,0.2)'};
                  background: ${currentLang === 'en' ? 'rgba(0, 243, 255, 0.25)' : 'rgba(255,255,255,0.06)'};
                  color: #fff;
                ">🇬🇧 English</button>
              </div>
            </div>

            <!-- 2. Grade Selection Section -->
            <div style="background: rgba(0, 243, 255, 0.04); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(0, 243, 255, 0.25);">
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
                <span style="font-family: 'Orbitron', sans-serif; font-size: 0.85rem; color: #00f3ff; font-weight: 700;">
                  ${t('settingsSectionGrade')}
                </span>
                <span style="font-size: 0.75rem; color: #8ea1c0;">
                  ${isDa ? 'Tilpasset Fælles Mål i Danmark' : 'Aligned with Danish Curriculum'}
                </span>
              </div>

              <!-- Grade Pills (1 - 10) -->
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px;">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => {
                  const isActive = this.selectedGrade === g;
                  return `
                    <button class="grade-preset-btn ${isActive ? 'active' : ''}" data-grade="${g}" style="
                      padding: 10px 0; border-radius: 10px; font-family: var(--font-numbers); font-weight: 800; font-size: 0.95rem;
                      border: 1.5px solid ${isActive ? '#00f3ff' : 'rgba(255,255,255,0.18)'};
                      background: ${isActive ? 'linear-gradient(135deg, rgba(0, 243, 255, 0.4), rgba(0, 136, 255, 0.4))' : 'rgba(255,255,255,0.05)'};
                      color: #fff; cursor: pointer; transition: all 0.15s ease;
                      box-shadow: ${isActive ? '0 0 15px rgba(0, 243, 255, 0.4)' : 'none'};
                    ">
                      ${isDa ? `${g}. klasse` : `Grade ${g}`}
                    </button>
                  `;
                }).join('')}
              </div>

              <!-- Detailed Curriculum Description Card for Selected Grade -->
              <div style="background: rgba(0, 0, 0, 0.4); border-left: 3px solid #00f3ff; border-radius: 8px; padding: 10px 14px;">
                <div style="font-weight: 700; color: #fff; font-size: 0.85rem; margin-bottom: 4px;">
                  🎓 ${currInfo.title}
                </div>
                <div style="font-size: 0.8rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 6px;">
                  ${currInfo.fullDesc}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                  <span style="font-size: 0.72rem; color: #8ea1c0; font-weight: 600;">${isDa ? 'Eksempler:' : 'Examples:'}</span>
                  ${currInfo.examples.map(ex => `
                    <span style="background: rgba(0, 243, 255, 0.15); border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 6px; padding: 2px 8px; font-family: var(--font-numbers); font-size: 0.78rem; color: #00f3ff;">
                      ${ex}
                    </span>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- 3. Answer Input Mode Section -->
            <div style="background: rgba(255, 255, 255, 0.04); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <span style="font-family: 'Orbitron', sans-serif; font-size: 0.85rem; color: #ffe600; font-weight: 700; display: block; margin-bottom: 10px;">
                ${t('settingsSectionAnswerMode')}
              </span>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                
                <!-- Option 1: Multiple Choice -->
                <label style="
                  display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 10px; cursor: pointer;
                  background: ${s.answerMode === 'multiple_choice' ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
                  border: 1.5px solid ${s.answerMode === 'multiple_choice' ? '#00f3ff' : 'rgba(255, 255, 255, 0.15)'};
                ">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="radio" id="mode-multiple-choice" name="answer-mode" value="multiple_choice" ${s.answerMode === 'multiple_choice' ? 'checked' : ''} style="accent-color: #00f3ff;" />
                    <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">${t('modeMultipleChoiceTitle')}</span>
                  </div>
                  <span style="font-size: 0.75rem; color: #8ea1c0; padding-left: 24px;">
                    ${t('modeMultipleChoiceDesc')}
                  </span>
                </label>

                <!-- Option 2: Manual -->
                <label style="
                  display: flex; flex-direction: column; gap: 4px; padding: 12px; border-radius: 10px; cursor: pointer;
                  background: ${s.answerMode !== 'multiple_choice' ? 'rgba(0, 243, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
                  border: 1.5px solid ${s.answerMode !== 'multiple_choice' ? '#00f3ff' : 'rgba(255, 255, 255, 0.15)'};
                ">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="radio" id="mode-manual" name="answer-mode" value="manual" ${s.answerMode !== 'multiple_choice' ? 'checked' : ''} style="accent-color: #00f3ff;" />
                    <span style="font-weight: 700; font-size: 0.85rem; color: #fff;">${t('modeManualTitle')}</span>
                  </div>
                  <span style="font-size: 0.75rem; color: #8ea1c0; padding-left: 24px;">
                    ${t('modeManualDesc')}
                  </span>
                </label>

              </div>
            </div>

            <!-- 4. Alien Descent Speed (Adult Control) -->
            <div style="background: rgba(255, 183, 0, 0.06); padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(255, 183, 0, 0.25);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-family: 'Orbitron', sans-serif; font-size: 0.85rem; color: #ffe600; font-weight: 700;">
                  ${t('settingsSectionSpeed')}
                </span>
                <span id="display-descent-speed" style="font-family: var(--font-numbers); font-weight: 800; font-size: 1.1rem; color: #fff; background: rgba(0,0,0,0.5); padding: 2px 10px; border-radius: 6px; border: 1px solid #ffe600;">
                  ${(s.descentSpeedMultiplier ?? 1.0).toFixed(1)}x
                </span>
              </div>
              <input id="slider-descent-speed" type="range" min="0.2" max="2.0" step="0.1" value="${s.descentSpeedMultiplier ?? 1.0}" style="width: 100%; accent-color: #ffe600; cursor: pointer; margin-bottom: 8px;" />
              
              <!-- Quick Presets -->
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                <button type="button" class="speed-quick-btn" data-speed="0.4" style="padding: 5px 0; border-radius: 6px; font-size: 0.75rem; cursor: pointer; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff;">0.4x ${isDa ? 'Langsom' : 'Slow'}</button>
                <button type="button" class="speed-quick-btn" data-speed="0.7" style="padding: 5px 0; border-radius: 6px; font-size: 0.75rem; cursor: pointer; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff;">0.7x ${isDa ? 'Rolig' : 'Gentle'}</button>
                <button type="button" class="speed-quick-btn" data-speed="1.0" style="padding: 5px 0; border-radius: 6px; font-size: 0.75rem; cursor: pointer; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff;">1.0x ${isDa ? 'Normal' : 'Normal'}</button>
                <button type="button" class="speed-quick-btn" data-speed="1.5" style="padding: 5px 0; border-radius: 6px; font-size: 0.75rem; cursor: pointer; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff;">1.5x ${isDa ? 'Hurtig' : 'Fast'}</button>
              </div>
            </div>

            <!-- 5. Granular Tailoring (Optional folding section) -->
            <details style="background: rgba(0, 0, 0, 0.35); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
              <summary style="font-family: 'Orbitron', sans-serif; font-size: 0.8rem; color: #8ea1c0; font-weight: 700; cursor: pointer;">
                ${t('settingsSectionTailoring')}
              </summary>
              <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 12px;">
                <!-- Allowed operations -->
                <div>
                  <span style="font-size: 0.78rem; color: #8ea1c0; display: block; margin-bottom: 6px;">${t('operationsLabel')}</span>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${[
                      { key: '+', label: t('opAdd') },
                      { key: '-', label: t('opSub') },
                      { key: '*', label: t('opMul') },
                      { key: '/', label: t('opDiv') },
                      { key: 'x', label: t('opAlgebra') }
                    ].map(op => `
                      <label style="display: flex; align-items: center; gap: 5px; font-size: 0.82rem; background: rgba(255,255,255,0.06); padding: 5px 10px; border-radius: 6px; cursor: pointer;">
                        <input type="checkbox" class="op-checkbox" value="${op.key}" ${s.operations.includes(op.key as any) ? 'checked' : ''} />
                        ${op.label}
                      </label>
                    `).join('')}
                  </div>
                </div>

                <!-- Number ceiling -->
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: #8ea1c0; margin-bottom: 4px;">
                    <span>${t('maxNumberLabel')}</span>
                    <span id="display-max-num" style="color: #00f3ff; font-weight: 700; font-family: var(--font-numbers);">${s.maxNumber}</span>
                  </div>
                  <input id="slider-max-num" type="range" min="10" max="1000" step="10" value="${s.maxNumber}" style="width: 100%; accent-color: #00f3ff;" />
                </div>

                <!-- Allow negative numbers -->
                <div>
                  <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; cursor: pointer; color: #cbd5e1;">
                    <input id="check-negatives" type="checkbox" ${s.allowNegative ? 'checked' : ''} />
                    ${t('allowNegativeLabel')}
                  </label>
                </div>
              </div>
            </details>

          </div>

          <!-- Footer -->
          <div class="modal-footer" style="border-top: 1px solid rgba(0, 243, 255, 0.25); padding-top: 14px; display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btn-save-diff" class="primary-btn" style="padding: 10px 24px; font-size: 0.95rem; font-weight: 800;">
              ${t('saveChangesBtn')}
            </button>
          </div>

        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Close
    this.container.querySelector('#btn-close-diff')?.addEventListener('click', () => {
      this.close();
    });

    // Language Toggle
    this.container.querySelector('#lang-btn-da')?.addEventListener('click', () => {
      setLanguage('da');
      this.show();
    });
    this.container.querySelector('#lang-btn-en')?.addEventListener('click', () => {
      setLanguage('en');
      this.show();
    });

    // Max Number Slider display
    const slider = this.container.querySelector('#slider-max-num') as HTMLInputElement;
    const display = this.container.querySelector('#display-max-num') as HTMLElement;
    slider?.addEventListener('input', () => {
      if (display) display.textContent = slider.value;
    });

    // Descent Speed Slider display
    const speedSlider = this.container.querySelector('#slider-descent-speed') as HTMLInputElement;
    const speedDisplay = this.container.querySelector('#display-descent-speed') as HTMLElement;
    speedSlider?.addEventListener('input', () => {
      if (speedDisplay) speedDisplay.textContent = `${parseFloat(speedSlider.value).toFixed(1)}x`;
    });

    // Quick speed preset buttons
    this.container.querySelectorAll('.speed-quick-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const val = (e.currentTarget as HTMLElement).getAttribute('data-speed') || '1.0';
        if (speedSlider) {
          speedSlider.value = val;
          if (speedDisplay) speedDisplay.textContent = `${parseFloat(val).toFixed(1)}x`;
        }
      });
    });

    // Radio answer-mode styling toggle
    this.container.querySelectorAll('input[name="answer-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const val = (radio as HTMLInputElement).value;
        this.profile.mathSettings.answerMode = val as any;
        this.show();
      });
    });

    // Grade preset buttons
    this.container.querySelectorAll('.grade-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const grade = parseInt((e.currentTarget as HTMLElement).getAttribute('data-grade') || '2', 10);
        this.selectedGrade = grade;
        const currentMode = (this.container.querySelector('input[name="answer-mode"]:checked') as HTMLInputElement)?.value as 'manual' | 'multiple_choice' || this.profile.mathSettings.answerMode;
        const currentSpeed = parseFloat((this.container.querySelector('#slider-descent-speed') as HTMLInputElement)?.value) || this.profile.mathSettings.descentSpeedMultiplier || 1.0;
        
        this.profile.gradeLevel = grade;
        this.profile.mathSettings = getDefaultMathSettingsForGrade(grade);
        this.profile.mathSettings.answerMode = currentMode;
        this.profile.mathSettings.descentSpeedMultiplier = currentSpeed;
        this.show(); // re-render with new grade and curriculum description
      });
    });

    // Save
    this.container.querySelector('#btn-save-diff')?.addEventListener('click', () => {
      const checkedOps: ('+' | '-' | '*' | '/' | 'x')[] = [];
      this.container.querySelectorAll('.op-checkbox:checked').forEach(cb => {
        checkedOps.push((cb as HTMLInputElement).value as any);
      });

      const maxNumber = parseInt(slider?.value, 10) || 50;
      const allowNeg = (this.container.querySelector('#check-negatives') as HTMLInputElement)?.checked ?? false;
      const modeRadio = this.container.querySelector('input[name="answer-mode"]:checked') as HTMLInputElement;
      const answerMode: 'manual' | 'multiple_choice' = (modeRadio?.value as any) === 'multiple_choice' ? 'multiple_choice' : 'manual';
      const descentSpeedMultiplier = parseFloat(speedSlider?.value) || 1.0;

      const newSettings: MathSettings = {
        operations: checkedOps.length > 0 ? checkedOps : ['+'],
        minNumber: allowNeg ? -maxNumber : 1,
        maxNumber,
        maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
        allowNegative: allowNeg,
        grade: this.selectedGrade,
        answerMode,
        descentSpeedMultiplier
      };

      this.profile.gradeLevel = this.selectedGrade;
      this.profile.mathSettings = newSettings;
      updateActiveProfile(this.profile);
      this.onSettingsUpdated(this.profile);
      this.close();
    });
  }

  public close(): void {
    this.container.innerHTML = '';
  }
}
