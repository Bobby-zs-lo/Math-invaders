import { PlayerProfile, loadProfiles, createNewProfile, setActiveProfile, saveProfiles, exportBackupJSON, importBackupJSON } from '../models/Profile';

export class ProfileModal {
  private modalContainer: HTMLElement;
  private onProfileSelected: (profile: PlayerProfile, isNewProfile?: boolean) => void;

  constructor(modalContainer: HTMLElement, onProfileSelected: (profile: PlayerProfile, isNewProfile?: boolean) => void) {
    this.modalContainer = modalContainer;
    this.onProfileSelected = onProfileSelected;
  }

  public renderGateway(targetEl: HTMLElement): void {
    const profiles = loadProfiles();
    targetEl.innerHTML = `
      <div class="gateway-card" style="
        width: 100%; max-width: 600px; background: rgba(16, 21, 38, 0.95);
        border: 2px solid #00f3ff; border-radius: 18px; padding: 24px;
        box-shadow: 0 0 40px rgba(0, 243, 255, 0.3); display: flex; flex-direction: column; gap: 16px;
      ">
        <div style="text-align: center;">
          <h1 style="font-family: 'Press Start 2P', monospace; font-size: 1.3rem; color: #00f3ff; text-shadow: 0 0 12px #00f3ff; margin-bottom: 8px;">
            MATH INVADERS
          </h1>
          <p style="color: #ffe600; font-family: 'Orbitron', sans-serif; font-size: 0.85rem; font-weight: 700;">
            🚀 SELECT OR CREATE A PILOT PROFILE TO BEGIN
          </p>
        </div>

        <!-- Existing Profiles List -->
        <div>
          <span style="font-size: 0.8rem; color: #8ea1c0; font-family: 'Orbitron', sans-serif; display: block; margin-bottom: 8px;">
            CHOOSE YOUR PILOT:
          </span>
          ${profiles.length === 0 ? `
            <div style="background: rgba(0,0,0,0.4); padding: 14px; border-radius: 10px; text-align: center; color: #8ea1c0; font-size: 0.9rem;">
              No pilot profiles created yet! Create your child's profile below to tailor their math training.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${profiles.map(p => `
                <div class="profile-select-row" data-id="${p.id}" style="
                  display: flex; align-items: center; justify-content: space-between;
                  background: rgba(255, 255, 255, 0.06); padding: 12px 16px; border-radius: 12px;
                  border: 1px solid rgba(0, 243, 255, 0.35); cursor: pointer; transition: all 0.15s;
                ">
                  <div style="display: flex; align-items: center; gap: 14px;">
                    <span style="font-size: 2rem;">${p.avatar}</span>
                    <div>
                      <div style="font-weight: 700; font-size: 1.05rem; color: #fff;">${p.name}</div>
                      <div style="font-size: 0.78rem; color: #00f3ff; font-family: var(--font-numbers); font-weight: 700; font-variant-numeric: tabular-nums;">
                        GRADE ${p.gradeLevel} • 🪙 ${p.coins} • 💎 ${p.diamonds}
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button class="primary-btn btn-launch-prof" data-id="${p.id}" style="padding: 8px 18px; font-size: 0.85rem;">LAUNCH 🚀</button>
                    <button class="secondary-btn btn-delete-prof" data-id="${p.id}" title="Delete profile" style="padding: 8px 10px; color: #ff3344;">🗑️</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Create New Profile Form -->
        <div style="background: rgba(0, 0, 0, 0.5); padding: 16px; border-radius: 12px; border: 1px solid rgba(255, 230, 0, 0.3);">
          <h3 style="font-family: 'Orbitron', sans-serif; font-size: 0.9rem; color: #ffe600; margin-bottom: 10px;">
            ➕ CREATE NEW CHILD PROFILE
          </h3>
          <div style="display: flex; gap: 10px; flex-direction: column; margin-bottom: 10px;">
            <input id="gateway-input-name" type="text" placeholder="Child's Name (e.g. Leo or Mia)" style="
              width: 100%; box-sizing: border-box; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(0, 243, 255, 0.4);
              color: #fff; padding: 10px 14px; border-radius: 8px; font-family: 'Fredoka', sans-serif; font-size: 0.95rem;
            " />
            <select id="gateway-select-grade" style="
              width: 100%; box-sizing: border-box; background: rgba(14, 18, 36, 0.95); border: 1px solid rgba(0, 243, 255, 0.4);
              color: #fff; padding: 10px 12px; border-radius: 8px; font-family: 'Orbitron', sans-serif; font-size: 0.85rem;
            ">
              <option value="1">Grade 1 (Single digits, +)</option>
              <option value="2" selected>Grade 2 (Numbers to 20, +, -)</option>
              <option value="3">Grade 3 (Numbers to 50, × tables)</option>
              <option value="4">Grade 4 (Numbers to 100, ÷)</option>
              <option value="5">Grade 5 (Multi-digit, order of ops)</option>
              <option value="6">Grade 6 (Fractions, negatives)</option>
              <option value="7">Grade 7 (Pre-algebra, linear equations)</option>
              <option value="8">Grade 8 (Algebra, exponents)</option>
              <option value="9">Grade 9 (Advanced algebra)</option>
              <option value="10">Grade 10 (High school algebra & functions)</option>
            </select>
          </div>

          <!-- Avatar Choices -->
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
            <span style="font-size: 0.78rem; color: #8ea1c0;">Avatar:</span>
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
            Create Profile & Tailor Math Settings ⚙️
          </button>
        </div>

        <!-- Backup & Restore -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 10px;">
          <button id="gateway-btn-export" class="secondary-btn" style="font-size: 0.75rem; padding: 6px 12px;">💾 Backup Data (JSON)</button>
          <label class="secondary-btn" style="font-size: 0.75rem; padding: 6px 12px; cursor: pointer;">
            📂 Restore Data
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

    // Delete profile
    targetEl.querySelectorAll('.btn-delete-prof').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id && confirm('Are you sure you want to delete this profile?')) {
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
      const name = nameInput.value.trim() || 'Hero Pilot';
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
            alert('Profiles restored successfully!');
            this.renderGateway(targetEl);
          } else {
            alert('Invalid backup file.');
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
            <span class="modal-title">👨‍🚀 Switch Player Profile</span>
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
