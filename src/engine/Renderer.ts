import { GameState } from '../models/GameState.ts';
import { SpriteGenerator } from './SpriteGenerator.ts';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private animFrame: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public render(state: GameState, dt: number): void {
    const ctx = this.ctx;
    const w = state.canvasWidth;
    const h = state.canvasHeight;
    this.animFrame += dt * 4;
    const frameIndex = Math.floor(this.animFrame);

    // Screen Shake Offset
    let shaking = false;
    if (state.screenShakeTimer > 0) {
      shaking = true;
      ctx.save();
      const intensity = state.screenShakeIntensity || 6;
      const dx = (Math.random() - 0.5) * intensity;
      const dy = (Math.random() - 0.5) * intensity;
      ctx.translate(dx, dy);
    }

    // Clear canvas
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, w, h);

    // 1. Draw Starfield
    this.renderStarfield(state, dt);

    // 2. Draw 5 Vertical Defense Lanes
    this.renderLanes(state);

    // 3. Draw Player Defense Barrier Line
    this.renderDefenseLine(state);

    // 4. Draw Aliens
    this.renderAliens(state, frameIndex);

    // 5. Draw Bullets & Lasers
    this.renderBullets(state);

    // 6. Draw Particles & Explosions
    this.renderParticles(state);

    // 6b. Draw Floating Neon Damage Numbers
    this.renderDamageTexts(state);

    // 7. Draw Player Ship
    this.renderPlayerShip(state);

    // 7b. Draw Target Lane Reticle (active lane being targeted for math solve)
    if (state.selectedLane !== state.playerLane) {
      this.renderTargetReticle(state);
    }

    // 8. Draw Screen-Top Boss HUD (if active boss present)
    this.renderBossHUD(state, frameIndex);

    // 9. Draw Floating Feedback or Overlays
    if (state.weaponJamTimer > 0) {
      this.renderJamIndicator(state);
    }

    if (shaking) {
      ctx.restore();
    }
  }

  private renderStarfield(state: GameState, dt: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffffff';

    for (const star of state.stars) {
      star.y += star.speed * dt;
      if (star.y > state.canvasHeight) {
        star.y = 0;
        star.x = Math.random() * state.canvasWidth;
      }
      ctx.globalAlpha = star.alpha;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1.0;
  }

  private renderLanes(state: GameState): void {
    const ctx = this.ctx;
    const laneWidth = state.canvasWidth / state.laneCount;

    for (let i = 0; i < state.laneCount; i++) {
      const lx = i * laneWidth;
      
      // Highlight active targeted lane with subtle gradient
      if (i === state.selectedLane) {
        const grad = ctx.createLinearGradient(lx, 0, lx + laneWidth, 0);
        grad.addColorStop(0, 'rgba(0, 243, 255, 0.02)');
        grad.addColorStop(0.5, 'rgba(0, 243, 255, 0.08)');
        grad.addColorStop(1, 'rgba(0, 243, 255, 0.02)');
        ctx.fillStyle = grad;
        ctx.fillRect(lx, 0, laneWidth, state.canvasHeight);
      }

      // Vertical lane dividers
      if (i > 0) {
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.setLineDash([6, 8]);
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, state.canvasHeight - 60);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private renderDefenseLine(state: GameState): void {
    const ctx = this.ctx;
    const y = state.playerY + 20;

    // Glowing base line
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.canvasWidth, y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private renderAliens(state: GameState, frame: number): void {
    const ctx = this.ctx;

    for (const alien of state.aliens) {
      let sprite: HTMLCanvasElement;
      switch (alien.type) {
        case 'scout':
        case 'minion_drone':
          sprite = SpriteGenerator.getCyberScout(frame);
          break;
        case 'crab':
          sprite = SpriteGenerator.getMechCrab(frame);
          break;
        case 'behemoth':
          sprite = SpriteGenerator.getAssaultBehemoth(frame);
          break;
        case 'boss':
        default: {
          const isShield = (alien.shieldHp ?? 0) > 0;
          const isOverload = alien.bossPhase === 3 || alien.coreRevealed === true;
          const wingBaysOpen = alien.wingBaysOpen === true;
          sprite = SpriteGenerator.getDreadnoughtBoss(frame, isShield, isOverload, wingBaysOpen);
          break;
        }
      }

      ctx.save();
      ctx.translate(alien.x, alien.y);

      // Hit flash or Armor Deflection Flash effect
      if (alien.isHitFlash > 0) {
        ctx.filter = 'brightness(2.5)';
      } else if (alien.isArmorFlash && alien.isArmorFlash > 0) {
        ctx.filter = 'brightness(2.0) drop-shadow(0 0 8px #00e5ff)';
      }

      ctx.drawImage(sprite, -alien.width / 2, -alien.height / 2, alien.width, alien.height);
      ctx.restore();

      // Sector 3: Cyan Armored Carapace Overlay
      if (alien.type === 'crab' && (alien.armor ?? 0) > 0) {
        ctx.save();
        ctx.strokeStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(alien.x, alien.y, alien.width * 0.58, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Sector 4: Glowing Reactor Core Flare
      if (alien.type === 'behemoth' && alien.coreRevealed) {
        ctx.save();
        const coreSprite = SpriteGenerator.getGlowingReactorCore(28, frame);
        ctx.drawImage(coreSprite, alien.x - 14, alien.y - 14, 28, 28);
        ctx.restore();
      }

      // Sector 5: Deflector Shield Energy Envelope Overlay
      if (alien.type === 'boss' && (alien.shieldHp ?? 0) > 0) {
        ctx.save();
        const shieldSprite = SpriteGenerator.getDeflectorShieldOverlay(frame);
        ctx.drawImage(shieldSprite, alien.x - 55, alien.y - 42, 110, 84);
        ctx.restore();
      }

      // Overhead Arcade Health Bar for regular aliens
      if (alien.type !== 'boss') {
        const barW = Math.max(24, alien.width * 0.85);
        const barH = 4;
        const barX = alien.x - barW / 2;
        const barY = alien.y - alien.height / 2 - 7;

        // Background track
        ctx.fillStyle = 'rgba(6, 10, 20, 0.75)';
        ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

        // Health ratio fill with green -> yellow -> red gradient
        const healthRatio = Math.max(0, Math.min(1, alien.hp / alien.maxHp));
        const hpColor = healthRatio > 0.5 ? '#00ff66' : healthRatio > 0.25 ? '#ffd600' : '#ff3344';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barW * healthRatio, barH);

        // Armor pips for armored enemies (e.g. crabs)
        if (alien.maxArmor && alien.maxArmor > 0) {
          const armorPipW = (barW - (alien.maxArmor - 1) * 2) / alien.maxArmor;
          const armorY = barY - 4;
          for (let p = 0; p < alien.maxArmor; p++) {
            const pipX = barX + p * (armorPipW + 2);
            const hasArmor = p < (alien.armor ?? 0);
            ctx.fillStyle = hasArmor ? '#00e5ff' : 'rgba(0, 229, 255, 0.2)';
            ctx.fillRect(pipX, armorY, armorPipW, 2);
          }
        }
      }
    }
  }

  private renderBossHUD(state: GameState, frame: number): void {
    const boss = state.getActiveBoss();
    if (!boss) return;

    const ctx = this.ctx;
    const w = state.canvasWidth;
    const hudW = Math.min(360, w - 40);
    const hudX = (w - hudW) / 2;
    const hudY = 16;

    ctx.save();
    // Dark back panel
    ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
    ctx.strokeStyle = '#ff6d00';
    ctx.lineWidth = 1;
    ctx.fillRect(hudX - 6, hudY - 4, hudW + 12, 44);
    ctx.strokeRect(hudX - 6, hudY - 4, hudW + 12, 44);

    // Boss Name & Phase Badge
    ctx.font = '10px "Orbitron", sans-serif';
    ctx.fillStyle = '#ff6d00';
    ctx.textAlign = 'left';
    ctx.fillText('DREADNOUGHT TITAN CLASS', hudX, hudY + 8);

    // Phase Badge
    ctx.textAlign = 'right';
    if (boss.bossPhase === 1) {
      ctx.fillStyle = '#00f3ff';
      ctx.fillText('[ DEFLECTOR SHIELD ONLINE ]', hudX + hudW, hudY + 8);
    } else if (boss.bossPhase === 2) {
      ctx.fillStyle = '#ffd600';
      ctx.fillText('[ MINION ESCORTS DEPLOYED ]', hudX + hudW, hudY + 8);
    } else if (boss.bossPhase === 3) {
      const blink = frame % 2 === 0;
      ctx.fillStyle = blink ? '#ff1744' : '#ffffff';
      ctx.fillText('⚠️ CORE OVERLOAD (2X CRIT)', hudX + hudW, hudY + 8);
    } else if (boss.bossPhase === 4) {
      ctx.fillStyle = '#ff3d00';
      ctx.fillText('💥 CATASTROPHIC MELTDOWN', hudX + hudW, hudY + 8);
    }

    // Shield Bar (Upper, Cyan / Purple)
    const maxShield = boss.maxShieldHp || 30;
    const shieldRatio = Math.max(0, (boss.shieldHp ?? 0) / maxShield);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(hudX, hudY + 14, hudW, 8);
    if (shieldRatio > 0) {
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#bc13fe';
      ctx.shadowBlur = 6;
      ctx.fillRect(hudX, hudY + 14, hudW * shieldRatio, 8);
      ctx.shadowBlur = 0;
    }

    // Hull HP Bar (Lower, Magma Orange / Red)
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(hudX, hudY + 26, hudW, 8);
    ctx.fillStyle = hpRatio > 0.4 ? '#ff6d00' : '#ff1744';
    ctx.shadowColor = hpRatio > 0.4 ? '#ff6d00' : '#ff1744';
    ctx.shadowBlur = 6;
    ctx.fillRect(hudX, hudY + 26, hudW * hpRatio, 8);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private renderBullets(state: GameState): void {
    const ctx = this.ctx;

    for (const b of state.bullets) {
      ctx.save();
      switch (b.type) {
        case 'laser': {
          const color = b.color || '#00ff66';
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
          ctx.fillRect(b.x - 2.5, b.y - 12, 5, 16);

          // Bright inner core
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 0;
          ctx.fillRect(b.x - 1, b.y - 10, 2, 12);
          break;
        }

        case 'vspread': {
          const color = b.color || '#ffd600';
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y - 6);
          ctx.lineTo(b.x + 4, b.y);
          ctx.lineTo(b.x, b.y + 6);
          ctx.lineTo(b.x - 4, b.y);
          ctx.closePath();
          ctx.fill();

          // Spark center
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(b.x - 1, b.y - 1, 2, 2);
          break;
        }

        case 'plasma': {
          const color = b.color || '#00f3ff';
          // Trailing ionized comet wake
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.arc(b.x, b.y + 7, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Radiant outer plasma corona
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
          ctx.fill();

          // Intense fusion white core
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'lightning': {
          const color = b.color || '#00e5ff';
          ctx.strokeStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          const p1x = b.x + (Math.sin(this.animFrame * 8 + b.y * 0.1) * 8);
          const p1y = b.y - 12;
          const p2x = b.x + (Math.cos(this.animFrame * 10 + b.y * 0.1) * 10);
          const p2y = b.y - 24;
          ctx.lineTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();

          // Inner bright electric beam
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(p1x, p1y);
          ctx.lineTo(p2x, p2y);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }

  private renderParticles(state: GameState): void {
    const ctx = this.ctx;
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1.0;
  }

  private renderDamageTexts(state: GameState): void {
    if (!state.damageTexts || state.damageTexts.length === 0) return;
    const ctx = this.ctx;
    ctx.save();
    for (const dtObj of state.damageTexts) {
      const alpha = Math.max(0, Math.min(1, dtObj.life / dtObj.maxLife));
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      if (dtObj.isCrit) {
        ctx.font = 'bold 14px "Lexend", "Fredoka", sans-serif';
        ctx.shadowColor = dtObj.color;
        ctx.shadowBlur = 8;
      } else {
        ctx.font = 'bold 11px "Lexend", "Fredoka", sans-serif';
        ctx.shadowColor = dtObj.color;
        ctx.shadowBlur = 4;
      }
      ctx.fillStyle = dtObj.color;
      ctx.fillText(dtObj.text, dtObj.x, dtObj.y);
    }
    ctx.restore();
  }

  private renderPlayerShip(state: GameState): void {
    const ctx = this.ctx;
    const shipSprite = SpriteGenerator.getPlayerShip(state.inStageUpgradeTier);
    const shipW = 52;
    const shipH = 52;

    ctx.save();
    ctx.translate(state.playerX, state.playerY);

    // Thruster engine particles underneath
    if (Math.random() < 0.6) {
      state.particles.push({
        x: state.playerX + (Math.random() * 6 - 3),
        y: state.playerY + 24,
        vx: Math.random() * 20 - 10,
        vy: Math.random() * 60 + 40,
        color: '#00f3ff',
        size: Math.random() * 3 + 1,
        life: 0.25,
        maxLife: 0.25
      });
    }

    // Shield aura if lives full
    if (state.lives >= 3) {
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.drawImage(shipSprite, -shipW / 2, -shipH / 2, shipW, shipH);
    ctx.restore();
  }

  private renderJamIndicator(state: GameState): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '12px "Orbitron", sans-serif';
    ctx.fillStyle = '#ff3344';
    ctx.textAlign = 'center';
    ctx.fillText('WEAPON JAMMED!', state.playerX, state.playerY - 40);
    ctx.restore();
  }

  private renderTargetReticle(state: GameState): void {
    const ctx = this.ctx;
    const tx = state.getLaneCenterX(state.selectedLane);
    const ty = state.playerY;
    const pulse = 0.8 + 0.2 * Math.sin(this.animFrame * 1.5);

    ctx.save();
    ctx.translate(tx, ty);

    // Glowing target bracket
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.85)';
    ctx.shadowColor = '#bc13fe';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;

    const size = 26 * pulse;
    const corner = 8;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(-size, -size + corner);
    ctx.lineTo(-size, -size);
    ctx.lineTo(-size + corner, -size);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(size - corner, -size);
    ctx.lineTo(size, -size);
    ctx.lineTo(size, -size + corner);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(-size, size - corner);
    ctx.lineTo(-size, size);
    ctx.lineTo(-size + corner, size);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(size - corner, size);
    ctx.lineTo(size, size);
    ctx.lineTo(size, size - corner);
    ctx.stroke();

    // Central crosshair dot
    ctx.fillStyle = '#00f3ff';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label above bracket
    ctx.font = '9px "Orbitron", sans-serif';
    ctx.fillStyle = '#00f3ff';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET LOCK', 0, -size - 6);

    ctx.restore();
  }
}
