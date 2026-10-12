import { PlayerProfile, loadProfiles, createNewProfile, setActiveProfile, saveProfiles, exportBackupJSON, importBackupJSON } from '../models/Profile';
import { t, getLanguage } from '../i18n/translations';
import { DifficultyModal } from './DifficultyModal';

export class ProfileModal {
  private modalContainer: HTMLElement;
  private onProfileSelected: (profile: PlayerProfile, isNewProfile?: boolean) => void;

  constructor(modalContainer: HTMLElement, onProfileSelected: (profile: PlayerProfile, isNewProfile?: boolean) => void) {
    this.modalContainer = modalContainer;
    this.onProfileSelected = onProfileSelected;
  }

  public renderGateway(targetEl: HTMLElement): void {
    const profiles = loadProfiles();
    const isDa = getLanguage() === 'da';

    targetEl.innerHTML = `
      <div class="gateway-card" style="
        width: 100%; max-width: 600px; background: rgba(16, 21, 38, 0.96);
        border: 2px solid #00f3ff; border-radius: 18px; padding: 24px;
        box-shadow: 0 0 40px rgba(0, 243, 255, 0.3); display: flex; flex-direction: column; gap: 16px;
      ">
        <div style="text-align: center;">
          <h1 style="font-family: 'Press Start 2P', monospace; font-size: 1.3rem; color: #00f3ff; text-shadow: 0 0 12px #00f3ff; margin-bottom: 8px;">
            ${t('gatewayTitle')}
          </h1>
          <p style="color: #ffe600; font-family: 'Orbitron', sans-serif; font-size: 0.85rem; font-weight: 700;">
            ${t('gatewaySubtitle')}
          </p>
        </div>

        <!-- Existing Profiles List -->
        <div>
          <span style="font-size: 0.8rem; color: #8ea1c0; font-family: 'Orbitron', sans-serif; display: block; margin-bottom: 8px;">
            ${t('choosePilot')}
          </span>
          ${profiles.length === 0 ? `
            <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 10px; text-align: center; color: #8ea1c0; font-size: 0.9rem;">
              ${t('noProfilesYet')}
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${profiles.map(p => `
                <div class="profile-select-row" data-id="${p.id}" style="
                  display: flex; align-items: center; justify-content: space-between;
                  background: rgba(255, 255, 255, 0.06); padding: 12px 16px; border-radius: 12px;
                  border: 1px solid rgba(0, 243, 255, 0.35); transition: all 0.15s;
                ">
                  <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 2rem;">${p.avatar}</span>
                    <div>
                      <div style="font-weight: 700; font-size: 1.05rem; color: #fff;">${p.name}</div>
                      <div style="font-size: 0.78rem; color: #00f3ff; font-family: var(--font-numbers); font-weight: 700; font-variant-numeric: tabular-nums;">
                        ${isDa ? `${p.gradeLevel}. klasse` : `Grade ${p.gradeLevel}`} • 🪙 ${p.coins} • 💎 ${p.diamonds}
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="primary-btn btn-launch-prof" data-id="${p.id}" style="padding: 8px 18px; font-size: 0.85rem;">${t('launchBtn')}</button>
                    <button class="secondary-btn btn-edit-prof" data-id="${p.id}" title="${t('settingsBtn')}" style="padding: 8px 10px; color: #00f3ff;">⚙️</button>
                    <button class="secondary-btn btn-delete-prof" data-id="${p.id}" title="${t('deleteProfilePrompt')}" style="padding: 8px 10px; color: #ff3344;">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Create New Profile Form -->
        <div style="background: rgba(0, 0, 0, 0.5); padding: 16px; border-radius: 12px; border: 1px solid rgba(255, 230, 0, 0.3);">
          <h3 style="font-family: 'Orbitron', sans-serif; font-size: 0.9rem; color: #ffe600; margin-bottom: 10px;">
            ${t('createNewProfile')}
          </h3>
          <div style="display: flex; gap: 10px; flex-direction: column; margin-bottom: 10px;">
            <input id="gateway-input-name" type="text" placeholder="${t('namePlaceholder')}" style="
              width: 100%; box-sizing: border-box; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(0, 243, 255, 0.4);
              color: #fff; padding: 10px 14px; border-radius: 8px; font-family: 'Fredoka', sans-serif; font-size: 0.95rem;
            " />
            <select id="gateway-select-grade" style="
              width: 100%; box-sizing: border-box; background: rgba(14, 18, 36, 0.95); border: 1px solid rgba(0, 243, 255, 0.4);
              color: #fff; padding: 10px 12px; border-radius: 8px; font-family: 'Orbitron', sans-serif; font-size: 0.85rem;
            ">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g => `
                <option value="${g}" ${g === 2 ? 'selected' : ''}>
                  ${isDa ? `${g}. klasse` : `Grade ${g}`}
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Avatar Choices -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; color: #8ea1c0;">${t('chooseAvatar')}</span>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${['🚀', '🛸', '👾', '🤖', '🐱‍🚀', '🌟'].map((av, idx) => `
                <button class="gateway-avatar-btn" data-av="${av}" style="
                  font-size: 1.2rem; background: ${idx === 0 ? 'rgba(0, 243, 255, 0.35)' : 'rgba(255, 255, 255, 0.08)'};
                  border: 1px solid ${idx === 0 ? '#00f3ff' : 'rgba(255, 255, 255, 0.2)'}; border-radius: 8px; padding: 3px 6px; cursor: pointer;
                ">${av}</button>
              `).join('')}
            </div>
          </div>

          <button id="gateway-btn-create" class="primary-btn" style="width: 100%; padding: 12px; font-size: 0.95rem;">
            ${t('createProfileBtn')}
          </button>
        </div>

        <!-- Backup & Restore -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 10px;">
          <button id="gateway-btn-export" class="secondary-btn" style="font-size: 0.75rem; padding: 6px 12px;">${t('backupBtn')}</button>
          <label class="secondary-btn" style="font-size: 0.75rem; padding: 6px 12px; cursor: pointer;">
            ${t('restoreBtn')}
            <input id="gateway-input-import" type="file" accept=".json" style="display: none;" />
          </label>
        </div>
      </div>
    `;

    this.bindGatewayEvents(targetEl);
  }

  private bindGatewayEvents(targetEl: HTMLElement): void {
    let chosenAvatar = '🚀';

    // Avatar pickers
    targetEl.querySelectorAll('.gateway-avatar-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        targetEl.querySelectorAll('.gateway-avatar-btn').forEach(b => {
          (b as HTMLElement).style.background = 'rgba(255, 255, 255, 0.08)';
          (b as HTMLElement).style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'rgba(0, 243, 255, 0.35)';
        el.style.borderColor = '#00f3ff';
        chosenAvatar = el.getAttribute('data-av') || '🚀';
      });
    });

    // Select existing profile
    targetEl.querySelectorAll('.btn-launch-prof').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          const profiles = loadProfiles();
          const target = profiles.find(p => p.id === id);
          if (target) {
            setActiveProfile(target.id);
            this.closeModal();
            this.onProfileSelected(target, false);
          }
        }
      });
    });

    // Edit settings for existing profile directly from profile list
    targetEl.querySelectorAll('.btn-edit-prof').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) {
          const profiles = loadProfiles();
          const target = profiles.find(p => p.id === id);
          if (target) {
            const diffModal = new DifficultyModal(this.modalContainer, target, (updated) => {
              setActiveProfile(updated.id);
              this.renderGateway(targetEl);
            });
            diffModal.show();
          }
        }
      });
    });

    // Delete profile
    targetEl.querySelectorAll('.btn-delete-prof').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && confirm(t('deleteProfilePrompt'))) {
          let profiles = loadProfiles();
          profiles = profiles.filter(p => p.id !== id);
          saveProfiles(profiles);
          this.renderGateway(targetEl);
        }
      });
    });

    // Create profile
    targetEl.querySelector('#gateway-btn-create')?.addEventListener('click', () => {
      const nameInput = targetEl.querySelector('#gateway-input-name') as HTMLInputElement;
      const gradeSelect = targetEl.querySelector('#gateway-select-grade') as HTMLSelectElement;
      const name = nameInput.value.trim() || 'Pilot';
      const grade = parseInt(gradeSelect.value, 10) || 2;

      const newProf = createNewProfile(name, chosenAvatar, grade);
      const profiles = loadProfiles();
      profiles.push(newProf);
      saveProfiles(profiles);
      setActiveProfile(newProf.id);

      // Pass isNewProfile = true so caller can immediately prompt math difficulty tailoring
      this.onProfileSelected(newProf, true);
    });

    // Export
    targetEl.querySelector('#gateway-btn-export')?.addEventListener('click', () => {
      const json = exportBackupJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `math_invaders_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import
    targetEl.querySelector('#gateway-input-import')?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const content = evt.target?.result as string;
          if (importBackupJSON(content)) {
            alert(t('restoreSuccess'));
            this.renderGateway(targetEl);
          } else {
            alert(t('restoreFail'));
          }
        };
        reader.readAsText(file);
      }
    });
  }

  public showModal(): void {
    this.modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <span class="modal-title">${t('switchProfileTitle')}</span>
            <button class="modal-close-btn" id="btn-close-prof-modal">✕</button>
          </div>
          <div class="modal-body" id="modal-gateway-mount"></div>
        </div>
      </div>
    `;

    const mount = this.modalContainer.querySelector('#modal-gateway-mount') as HTMLElement;
    this.renderGateway(mount);

    this.modalContainer.querySelector('#btn-close-prof-modal')?.addEventListener('click', () => {
      this.closeModal();
    });
  }

  public closeModal(): void {
    this.modalContainer.innerHTML = '';
  }
}
