import { PlayerProfile, getDefaultMathSettingsForGrade, updateActiveProfile, MathSettings } from '../models/Profile';

export class DifficultyModal {
  private container: HTMLElement;
  private profile: PlayerProfile;
  private onSettingsUpdated: (profile: PlayerProfile) => void;

  constructor(container: HTMLElement, profile: PlayerProfile, onSettingsUpdated: (profile: PlayerProfile) => void) {
    this.container = container;
    this.profile = profile;
    this.onSettingsUpdated = onSettingsUpdated;
  }

  public show(): void {
    const s = this.profile.mathSettings;

    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-title">⚙️ Math Difficulty & Curriculum</span>
            <button class="modal-close-btn" id="btn-close-diff">✕</button>
          </div>
          <div class="modal-body">
            <!-- Grade Presets -->
            <div>
              <label style="font-family: 'Orbitron', sans-serif; font-size: 0.85rem; color: #00f3ff; font-weight: 700; display: block; margin-bottom: 8px;">
                GRADE PRESET (Grades 1 – 10)
              </label>
              <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => `
                  <button class="grade-preset-btn ${this.profile.gradeLevel === g ? 'active' : ''}" data-grade="${g}" style="
                    padding: 8px 0; border-radius: 8px; font-family: var(--font-numbers); font-weight: 800; font-size: 1rem;
                    border: 1px solid ${this.profile.gradeLevel === g ? '#00f3ff' : 'rgba(255,255,255,0.2)'};
                    background: ${this.profile.gradeLevel === g ? 'rgba(0, 243, 255, 0.3)' : 'rgba(255,255,255,0.05)'};
                    color: #fff; cursor: pointer;
                  ">G${g}</button>
                `).join('')}
              </div>
            </div>

            <!-- Granular Customization Section -->
            <div style="background: rgba(0, 0, 0, 0.4); padding: 12px; border-radius: 10px; border: 1px solid rgba(0, 243, 255, 0.2);">
              <h4 style="font-family: 'Orbitron', sans-serif; font-size: 0.8rem; color: #ffe600; margin-bottom: 10px;">
                🛠️ GRANULAR TAILORING
              </h4>

              <!-- Operations -->
              <div style="margin-bottom: 12px;">
                <span style="font-size: 0.8rem; color: #8ea1c0; display: block; margin-bottom: 6px;">Allowed Operations:</span>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                  ${[
                    { key: '+', label: 'Addition (+)' },
                    { key: '-', label: 'Subtraction (-)' },
                    { key: '*', label: 'Multiplication (×)' },
                    { key: '/', label: 'Division (÷)' },
                    { key: 'x', label: 'Pre-Algebra (Find x)' }
                  ].map(op => `
                    <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer;">
                      <input type="checkbox" class="op-checkbox" value="${op.key}" ${s.operations.includes(op.key as any) ? 'checked' : ''} />
                      ${op.label}
                    </label>
                  `).join('')}
                </div>
              </div>

              <!-- Number Ceiling -->
              <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #8ea1c0; margin-bottom: 4px;">
                  <span>Max Number Ceiling:</span>
                  <span id="display-max-num" style="color: #00f3ff; font-weight: 700;">${s.maxNumber}</span>
                </div>
                <input id="slider-max-num" type="range" min="10" max="1000" step="10" value="${s.maxNumber}" style="width: 100%; accent-color: #00f3ff;" />
              </div>

              <!-- Answer Input Mode -->
              <div style="margin-bottom: 12px; padding: 10px; background: rgba(0, 243, 255, 0.05); border-radius: 8px; border: 1px solid rgba(0, 243, 255, 0.2);">
                <span style="font-family: 'Orbitron', sans-serif; font-size: 0.8rem; color: #00f3ff; font-weight: 700; display: block; margin-bottom: 8px;">
                  🎯 ANSWER INPUT MODE
                </span>
                <div style="display: flex; gap: 16px; flex-wrap: wrap;">
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer; color: #fff;">
                    <input type="radio" name="answer-mode" value="manual" id="mode-manual" ${s.answerMode !== 'multiple_choice' ? 'checked' : ''} />
                    ⌨️ Manual Entry (Keypad / Typing)
                  </label>
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer; color: #fff;">
                    <input type="radio" name="answer-mode" value="multiple_choice" id="mode-multiple-choice" ${s.answerMode === 'multiple_choice' ? 'checked' : ''} />
                    🔘 5 Multiple Choice Options (1 Correct)
                  </label>
                </div>
              </div>

              <!-- Alien Descent Speed (Adult Control) -->
              <div style="margin-bottom: 12px; padding: 10px; background: rgba(255, 183, 0, 0.08); border-radius: 8px; border: 1px solid rgba(255, 183, 0, 0.3);">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #ffe600; font-family: 'Orbitron', sans-serif; font-weight: 700; margin-bottom: 6px;">
                  <span>⚡ ALIEN DESCENDING SPEED (ADULT SLIDER):</span>
                  <span id="display-descent-speed" style="color: #fff; font-weight: 800; font-family: var(--font-numbers);">${(s.descentSpeedMultiplier ?? 1.0).toFixed(1)}x</span>
                </div>
                <input id="slider-descent-speed" type="range" min="0.2" max="2.0" step="0.1" value="${s.descentSpeedMultiplier ?? 1.0}" style="width: 100%; accent-color: #ffe600; cursor: pointer;" />
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #8ea1c0; margin-top: 4px; font-family: var(--font-numbers);">
                  <span>0.2x (Super Slow)</span>
                  <span>0.5x (Slow)</span>
                  <span>1.0x (Normal)</span>
                  <span>2.0x (Fast)</span>
                </div>
              </div>

              <!-- Negative Numbers -->
              <div>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
                  <input id="check-negatives" type="checkbox" ${s.allowNegative ? 'checked' : ''} />
                  Allow Negative Numbers (Subtractions below zero)
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button id="btn-save-diff" class="primary-btn">Save Changes</button>
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

    // Grade preset buttons
    this.container.querySelectorAll('.grade-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const grade = parseInt((e.currentTarget as HTMLElement).getAttribute('data-grade') || '2', 10);
        const currentMode = (this.container.querySelector('input[name="answer-mode"]:checked') as HTMLInputElement)?.value as 'manual' | 'multiple_choice' || this.profile.mathSettings.answerMode;
        const currentSpeed = parseFloat((this.container.querySelector('#slider-descent-speed') as HTMLInputElement)?.value) || this.profile.mathSettings.descentSpeedMultiplier || 1.0;
        this.profile.gradeLevel = grade;
        this.profile.mathSettings = getDefaultMathSettingsForGrade(grade);
        this.profile.mathSettings.answerMode = currentMode;
        this.profile.mathSettings.descentSpeedMultiplier = currentSpeed;
        this.show(); // re-render with new settings
      });
    });

    // Save
    this.container.querySelector('#btn-save-diff')?.addEventListener('click', () => {
      const checkedOps: ('+' | '-' | '*' | '/' | 'x')[] = [];
      this.container.querySelectorAll('.op-checkbox:checked').forEach(cb => {
        checkedOps.push((cb as HTMLInputElement).value as any);
      });

      const maxNumber = parseInt(slider.value, 10) || 50;
      const allowNeg = (this.container.querySelector('#check-negatives') as HTMLInputElement).checked;
      const modeRadio = this.container.querySelector('input[name="answer-mode"]:checked') as HTMLInputElement;
      const answerMode: 'manual' | 'multiple_choice' = (modeRadio?.value as any) === 'multiple_choice' ? 'multiple_choice' : 'manual';
      const descentSpeedMultiplier = parseFloat(speedSlider?.value) || 1.0;

      const newSettings: MathSettings = {
        operations: checkedOps.length > 0 ? checkedOps : ['+'],
        minNumber: allowNeg ? -maxNumber : 1,
        maxNumber,
        maxDigits: maxNumber > 100 ? 3 : maxNumber > 10 ? 2 : 1,
        allowNegative: allowNeg,
        grade: this.profile.gradeLevel,
        answerMode,
        descentSpeedMultiplier
      };

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
