import type { PlayerProfile } from '../models/Profile.ts';
import { updateActiveProfile } from '../models/Profile.ts';
import { SpriteGenerator } from '../engine/SpriteGenerator.ts';
import { t, getLanguage } from '../i18n/translations.ts';

export interface ShopItem {
  id: string;
  name: string;
  type: 'ship' | 'trail';
  tier: number;
  coinPrice: number;
  diamondPrice: number;
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'tier1_interceptor', name: 'Tier 1: Starter Scout', type: 'ship', tier: 1, coinPrice: 0, diamondPrice: 0, description: 'Agile recon scout with rapid laser blasters.' },
  { id: 'tier2_hunter', name: 'Tier 2: Dual-Wing Hunter', type: 'ship', tier: 2, coinPrice: 200, diamondPrice: 0, description: 'Heavy wings with dual-blasters and V-spread.' },
  { id: 'tier3_vanguard', name: 'Tier 3: Plasma Cruiser', type: 'ship', tier: 3, coinPrice: 500, diamondPrice: 5, description: 'Heavy twin-engine cruiser firing piercing plasma beams.' },
  { id: 'tier4_flagship', name: 'Tier 4: Neon Flagship', type: 'ship', tier: 4, coinPrice: 1000, diamondPrice: 10, description: 'Supercharged radiant cyan energy wings & chain lightning.' }
];

export class HangarModal {
  private container: HTMLElement;
  private profile: PlayerProfile;
  private onUpdate: (profile: PlayerProfile) => void;

  constructor(container: HTMLElement, profile: PlayerProfile, onUpdate: (profile: PlayerProfile) => void) {
    this.container = container;
    this.profile = profile;
    this.onUpdate = onUpdate;
  }

  private getItemDisplayName(item: ShopItem): string {
    if (getLanguage() === 'da') {
      switch (item.tier) {
        case 1: return t('tier1Name');
        case 2: return t('tier2Name');
        case 3: return t('tier3Name');
        case 4: return t('tier4Name');
      }
    }
    return item.name;
  }

  private getItemDisplayDesc(item: ShopItem): string {
    if (getLanguage() === 'da') {
      switch (item.tier) {
        case 1: return 'Hurtig spejderjæger med præcise forsvarslasere.';
        case 2: return 'Tunge vinger med dobbelte blastere og V-spredning.';
        case 3: return 'Tung to-motors krydser med gennemtrængende plasmastråler.';
        case 4: return 'Superopladede neon-blå vinger med kraftige kædelyn.';
      }
    }
    return item.description;
  }

  public show(): void {
    this.container.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-title">${t('hangarTitle')}</span>
            <button class="modal-close-btn" id="btn-close-hangar">✕</button>
          </div>
          <div class="modal-body">
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.5); padding: 10px 14px; border-radius: 10px;">
              <span style="color: #8ea1c0; font-size: 0.85rem;">${t('yourTreasury')}</span>
              <div style="display: flex; gap: 12px; font-family: var(--font-numbers); font-weight: 800; font-variant-numeric: tabular-nums;">
                <span style="color: #ffe600;">🪙 ${this.profile.coins}</span>
                <span style="color: #00f3ff;">💎 ${this.profile.diamonds}</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${SHOP_ITEMS.map(item => {
                const isUnlocked = this.profile.unlockedShips.includes(item.id);
                const isEquipped = this.profile.equippedShipId === item.id;
                const canAfford = this.profile.coins >= item.coinPrice && this.profile.diamonds >= item.diamondPrice;

                return `
                  <div class="shop-item-row" style="
                    display: flex; align-items: center; justify-content: space-between;
                    background: rgba(255, 255, 255, 0.05); padding: 12px; border-radius: 12px;
                    border: 1px solid ${isEquipped ? '#00f3ff' : 'rgba(255,255,255,0.15)'};
                  ">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <canvas id="ship-preview-${item.id}" width="52" height="52" style="background: rgba(0,0,0,0.4); border-radius: 8px;"></canvas>
                      <div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">${this.getItemDisplayName(item)}</div>
                        <div style="font-size: 0.75rem; color: #8ea1c0;">${this.getItemDisplayDesc(item)}</div>
                        ${!isUnlocked ? `
                          <div style="font-size: 0.85rem; font-family: var(--font-numbers); font-weight: 700; font-variant-numeric: tabular-nums; margin-top: 4px; color: #ffe600;">
                            🪙 ${item.coinPrice} ${item.diamondPrice > 0 ? `• 💎 ${item.diamondPrice}` : ''}
                          </div>
                        ` : ''}
                      </div>
                    </div>

                    <div>
                      ${isEquipped ? `
                        <span style="font-size: 0.8rem; color: #00ff66; font-family: 'Orbitron', sans-serif; font-weight: 700;">${t('equippedBadge')}</span>
                      ` : isUnlocked ? `
                        <button class="secondary-btn btn-equip-ship" data-id="${item.id}" style="padding: 6px 14px; font-size: 0.8rem;">${t('equipBtn')}</button>
                      ` : `
                        <button class="primary-btn btn-buy-ship" data-id="${item.id}" ${canAfford ? '' : 'disabled style="opacity: 0.4; cursor: not-allowed;"'} style="padding: 6px 14px; font-size: 0.8rem;">
                          ${t('unlockBtn')}
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Render ship preview canvases
    SHOP_ITEMS.forEach(item => {
      const cvs = this.container.querySelector(`#ship-preview-${item.id}`) as HTMLCanvasElement;
      if (cvs) {
        const c = cvs.getContext('2d');
        if (c) {
          c.imageSmoothingEnabled = false;
          const sprite = SpriteGenerator.getPlayerShip(item.tier);
          c.drawImage(sprite, 0, 0, cvs.width, cvs.height);
        }
      }
    });

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector('#btn-close-hangar')?.addEventListener('click', () => {
      this.close();
    });

    this.container.querySelectorAll('.btn-equip-ship').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          this.profile.equippedShipId = id;
          updateActiveProfile(this.profile);
          this.onUpdate(this.profile);
          this.show();
        }
      });
    });

    this.container.querySelectorAll('.btn-buy-ship').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const item = SHOP_ITEMS.find(i => i.id === id);
        if (item && this.profile.coins >= item.coinPrice && this.profile.diamonds >= item.diamondPrice) {
          this.profile.coins -= item.coinPrice;
          this.profile.diamonds -= item.diamondPrice;
          this.profile.unlockedShips.push(item.id);
          this.profile.equippedShipId = item.id;
          updateActiveProfile(this.profile);
          this.onUpdate(this.profile);
          this.show();
        }
      });
    });
  }

  public close(): void {
    this.container.innerHTML = '';
  }
}
