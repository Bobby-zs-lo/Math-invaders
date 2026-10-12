import { PlayerProfile } from '../models/Profile';
import { t } from '../i18n/translations';

export interface SectorInfo {
  id: number;
  nameKey: 'sector1Title' | 'sector2Title' | 'sector3Title' | 'sector4Title' | 'sector5Title';
  subKey: 'sector1Sub' | 'sector2Sub' | 'sector3Sub' | 'sector4Sub' | 'sector5Sub';
  icon: string;
}

export const SECTORS: SectorInfo[] = [
  { id: 1, nameKey: 'sector1Title', subKey: 'sector1Sub', icon: '🌑' },
  { id: 2, nameKey: 'sector2Title', subKey: 'sector2Sub', icon: '☄️' },
  { id: 3, nameKey: 'sector3Title', subKey: 'sector3Sub', icon: '🪐' },
  { id: 4, nameKey: 'sector4Title', subKey: 'sector4Sub', icon: '⚡' },
  { id: 5, nameKey: 'sector5Title', subKey: 'sector5Sub', icon: '🌌' }
];

export class StarMapModal {
  private container: HTMLElement;
  private profile: PlayerProfile;
  private onStageSelect: (sector: number, stage: number) => void;

  constructor(container: HTMLElement, profile: PlayerProfile, onStageSelect: (sector: number, stage: number) => void) {
    this.container = container;
    this.profile = profile;
    this.onStageSelect = onStageSelect;
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="star-map-container">
        <div class="map-header">
          <h2 class="map-title">${t('starMapTitle')}</h2>
          <p class="map-subtitle">${t('starMapSubtitle')}</p>
        </div>

        ${SECTORS.map(sec => {
          return `
            <div class="sector-section">
              <div class="sector-title">
                <span>${sec.icon} ${t(sec.nameKey)}</span>
                <span style="font-size: 0.75rem; color: #8ea1c0;">${t(sec.subKey)}</span>
              </div>
              <div class="sector-nodes-track">
                ${[1, 2, 3, 4, 5].map(stg => {
                  const key = `${sec.id}-${stg}`;
                  const progress = this.profile.stageProgress[key];
                  const isFirstStage = sec.id === 1 && stg === 1;
                  const isUnlocked = isFirstStage || progress !== undefined;
                  const stars = progress?.stars || 0;
                  const isBoss = stg === 5;
                  const isCompleted = progress?.completed;

                  let statusClass = 'locked';
                  if (isUnlocked) {
                    statusClass = isCompleted ? 'unlocked completed' : 'unlocked current';
                  }

                  let starIcons = '☆☆☆';
                  if (stars === 1) starIcons = '⭐☆☆';
                  if (stars === 2) starIcons = '⭐⭐☆';
                  if (stars === 3) starIcons = '⭐⭐⭐';

                  return `
                    <div class="stage-node ${statusClass} ${isBoss ? 'boss-node' : ''}" data-sector="${sec.id}" data-stage="${stg}">
                      <span class="node-num">${isBoss ? '👑' : stg}</span>
                      <span class="node-stars" style="color: #ffe600;">${isUnlocked ? starIcons : '🔒'}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelectorAll('.stage-node.unlocked').forEach(node => {
      node.addEventListener('click', (e) => {
        const el = e.currentTarget as HTMLElement;
        const sec = parseInt(el.getAttribute('data-sector') || '1', 10);
        const stg = parseInt(el.getAttribute('data-stage') || '1', 10);
        this.onStageSelect(sec, stg);
      });
    });
  }
}
