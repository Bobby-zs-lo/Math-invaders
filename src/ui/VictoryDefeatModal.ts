import { t } from '../i18n/translations';

export class VictoryDefeatModal {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public showVictory(options: {
    sector: number;
    stage: number;
    stars: number;
    score: number;
    coinsWon: number;
    diamondsWon: number;
    onNextStage: () => void;
    onReturnToMap: () => void;
  }): void {
    let starStr = '⭐';
    if (options.stars === 2) starStr = '⭐⭐';
    if (options.stars === 3) starStr = '⭐⭐⭐';

    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card" style="text-align: center; border-color: #00ff66; box-shadow: 0 0 35px rgba(0,255,102,0.4);">
          <div class="modal-header" style="justify-content: center;">
            <span class="modal-title" style="color: #00ff66;">${t('victoryTitle')}</span>
          </div>
          <div class="modal-body" style="align-items: center; gap: 14px;">
            <div style="font-size: 2.2rem; filter: drop-shadow(0 0 10px #ffe600);">${starStr}</div>
            
            <div style="font-family: 'Orbitron', sans-serif; font-size: 1.1rem; color: #fff;">
              ${t('victoryDesc', { sector: options.sector, stage: options.stage })}
            </div>

            <div style="font-family: var(--font-numbers); font-size: 1.15rem; font-weight: 800; color: #ffe600; font-variant-numeric: tabular-nums;">
              ${t('scoreEarned', { score: options.score })}
            </div>

            <!-- Rewards Box -->
            <div style="display: flex; gap: 16px; background: rgba(0,0,0,0.5); padding: 12px 24px; border-radius: 12px; border: 1px solid rgba(0,243,255,0.3);">
              <div style="display: flex; align-items: center; gap: 6px; font-family: var(--font-numbers); font-weight: 800; color: #ffe600; font-size: 1.2rem; font-variant-numeric: tabular-nums;">
                <span>🪙</span> +${options.coinsWon}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; font-family: var(--font-numbers); font-weight: 800; color: #00f3ff; font-size: 1.2rem; font-variant-numeric: tabular-nums;">
                <span>💎</span> +${options.diamondsWon}
              </div>
            </div>
          </div>
          <div class="modal-footer" style="justify-content: center; gap: 12px;">
            <button id="btn-victory-map" class="secondary-btn">${t('returnMapBtn')}</button>
            <button id="btn-victory-next" class="primary-btn">${t('nextStageBtn')}</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-victory-next')?.addEventListener('click', () => {
      this.close();
      options.onNextStage();
    });

    this.container.querySelector('#btn-victory-map')?.addEventListener('click', () => {
      this.close();
      options.onReturnToMap();
    });
  }

  public showGameOver(options: {
    sector: number;
    stage: number;
    onRetry: () => void;
    onReturnToMap: () => void;
  }): void {
    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card" style="text-align: center; border-color: #ff3344; box-shadow: 0 0 35px rgba(255,51,68,0.4);">
          <div class="modal-header" style="justify-content: center;">
            <span class="modal-title" style="color: #ff3344;">${t('defeatTitle')}</span>
          </div>
          <div class="modal-body" style="align-items: center; gap: 14px;">
            <div style="font-size: 2.5rem;">🛸💥</div>
            <div style="font-size: 1.05rem; color: #fff;">
              ${t('defeatDesc')}
            </div>
            <p style="font-size: 0.85rem; color: #8ea1c0; max-width: 320px;">
              ${t('defeatEncourage')}
            </p>
          </div>
          <div class="modal-footer" style="justify-content: center; gap: 12px;">
            <button id="btn-gameover-map" class="secondary-btn">${t('returnMapBtn')}</button>
            <button id="btn-gameover-retry" class="primary-btn" style="background: linear-gradient(135deg, #ff3344, #ff9100);">${t('retryBtn')}</button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-gameover-retry')?.addEventListener('click', () => {
      this.close();
      options.onRetry();
    });

    this.container.querySelector('#btn-gameover-map')?.addEventListener('click', () => {
      this.close();
      options.onReturnToMap();
    });
  }

  public close(): void {
    this.container.innerHTML = '';
  }
}
