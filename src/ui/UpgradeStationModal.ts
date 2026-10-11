import { MathEngine, MathProblem } from '../math/MathEngine';

export class UpgradeStationModal {
  private container: HTMLElement;
  private mathEngine: MathEngine;
  private currentTier: number;
  private solvedCount: number;
  private requiredCount: number;
  private currentProblem: MathProblem | null = null;
  private currentInput: string = '';
  private onAnswerSubmitted: (answer: number, expected: number) => boolean;
  private onClose: () => void;

  constructor(
    container: HTMLElement,
    mathEngine: MathEngine,
    currentTier: number,
    solvedCount: number,
    requiredCount: number,
    onAnswerSubmitted: (answer: number, expected: number) => boolean,
    onClose: () => void
  ) {
    this.container = container;
    this.mathEngine = mathEngine;
    this.currentTier = currentTier;
    this.solvedCount = solvedCount;
    this.requiredCount = requiredCount;
    this.onAnswerSubmitted = onAnswerSubmitted;
    this.onClose = onClose;
    this.currentProblem = this.mathEngine.generateUpgradeProblem();
  }

  public show(): void {
    const isMaxTier = this.currentTier >= 4;
    const tierNames = [
      '',
      'Tier 1: Starter Scout',
      'Tier 2: Dual-Wing Hunter',
      'Tier 3: Plasma Cruiser',
      'Tier 4: Neon Flagship'
    ];
    const nextTierNames = [
      '',
      'Tier 2: Dual-Wing Hunter (Dual Blasters + V-Spread)',
      'Tier 3: Plasma Cruiser (Piercing Plasma Beams)',
      'Tier 4: Neon Flagship (Ultimate Chain Lightning)',
      'MAX TIER REACHED!'
    ];

    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-title">⚡ Tactical Ship Upgrade Station</span>
            <button class="modal-close-btn" id="btn-close-upgrade-station">✕</button>
          </div>
          <div class="modal-body">
            <!-- Current Ship Status -->
            <div style="background: rgba(0,0,0,0.4); padding: 12px; border-radius: 10px; border: 1px solid rgba(188, 19, 254, 0.4);">
              <div style="font-size: 0.8rem; color: #8ea1c0;">CURRENT COMBAT SHIP:</div>
              <div style="font-family: 'Orbitron', sans-serif; font-size: 1.1rem; font-weight: 800; color: #00f3ff; margin-bottom: 6px;">
                ${tierNames[this.currentTier]}
              </div>

              ${!isMaxTier ? `
                <div style="font-size: 0.8rem; color: #ffe600; margin-top: 6px;">
                  NEXT UPGRADE: <b style="color: #fff;">${nextTierNames[this.currentTier]}</b>
                </div>
                <div style="margin-top: 8px;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #8ea1c0; margin-bottom: 2px;">
                    <span>Progress:</span>
                    <span style="color: #00ff66; font-weight: 700;">${this.solvedCount} / ${this.requiredCount} Problems Solved</span>
                  </div>
                  <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${(this.solvedCount / this.requiredCount) * 100}%; background: linear-gradient(90deg, #bc13fe, #00f3ff);"></div>
                  </div>
                </div>
              ` : `
                <div style="font-size: 0.9rem; color: #00ff66; font-weight: 700; margin-top: 8px;">
                  🌟 MAXIMUM COMBAT POWER ACHIEVED!
                </div>
              `}
            </div>

            <!-- Upgrade Math Problem Challenge -->
            ${!isMaxTier && this.currentProblem ? `
              <div style="background: rgba(0,0,0,0.5); padding: 14px; border-radius: 10px; border: 1px solid rgba(0, 243, 255, 0.3); text-align: center;">
                <span style="font-size: 0.8rem; color: #8ea1c0; display: block; margin-bottom: 4px;">Solve to charge upgrade capacitors:</span>
                <div style="font-family: var(--font-numbers); font-size: 1.55rem; font-weight: 800; color: #fff; margin: 10px 0; font-variant-numeric: tabular-nums;">
                  ${this.currentProblem.question} <span id="upgrade-input-display" style="color: #ffe600; font-weight: 800;">${this.currentInput || '?'}</span>
                </div>
                <div id="upgrade-feedback-msg" style="font-size: 0.85rem; height: 18px; font-weight: 700;"></div>

                <!-- Mini Numpad -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px;">
                  ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
                    <button class="num-key upg-num" data-v="${n}" style="padding: 8px 0; font-size: 1.1rem;">${n}</button>
                  `).join('')}
                  <button class="num-key action-key clear-key upg-action" data-act="clear" style="padding: 8px 0;">⌫</button>
                  <button class="num-key upg-num" data-v="0" style="padding: 8px 0; font-size: 1.1rem;">0</button>
                  <button class="num-key action-key submit-key upg-action" data-act="submit" style="padding: 8px 0;">⚡ CHARGE</button>
                </div>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer">
            <button id="btn-return-to-battle" class="primary-btn" style="width: 100%;">Return to Battle 🚀</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector('#btn-close-upgrade-station')?.addEventListener('click', () => this.close());
    this.container.querySelector('#btn-return-to-battle')?.addEventListener('click', () => this.close());

    // Numpad input
    this.container.querySelectorAll('.upg-num').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const v = (e.currentTarget as HTMLElement).getAttribute('data-v');
        if (v && this.currentInput.length < 5) {
          this.currentInput += v;
          this.updateDisplay();
        }
      });
    });

    this.container.querySelectorAll('.upg-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const act = (e.currentTarget as HTMLElement).getAttribute('data-act');
        if (act === 'clear') {
          this.currentInput = this.currentInput.slice(0, -1);
          this.updateDisplay();
        } else if (act === 'submit') {
          this.submitAnswer();
        }
      });
    });
  }

  private updateDisplay(): void {
    const disp = this.container.querySelector('#upgrade-input-display');
    if (disp) {
      disp.textContent = this.currentInput || '?';
    }
  }

  private submitAnswer(): void {
    if (!this.currentInput || !this.currentProblem) return;

    const val = parseInt(this.currentInput, 10);
    const correct = this.onAnswerSubmitted(val, this.currentProblem.answer);
    const fb = this.container.querySelector('#upgrade-feedback-msg') as HTMLElement;

    if (correct) {
      if (fb) {
        fb.textContent = '⚡ POWER SURGE! UPGRADE CHARGED!';
        fb.style.color = '#00ff66';
      }
      this.currentInput = '';
      this.currentProblem = this.mathEngine.generateUpgradeProblem();
      setTimeout(() => {
        this.close();
      }, 700);
    } else {
      if (fb) {
        fb.textContent = '❌ CALCULATION ERROR! Try again.';
        fb.style.color = '#ff3344';
      }
      this.currentInput = '';
      this.updateDisplay();
    }
  }

  public close(): void {
    this.container.innerHTML = '';
    this.onClose();
  }
}
