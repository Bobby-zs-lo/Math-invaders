export class SpriteGenerator {
  private static spriteCache: Map<string, HTMLCanvasElement> = new Map();

  // Helper to create an offscreen canvas
  private static createOffscreen(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx };
  }

  // 1. Robotic Cyber-Scout Drone (Purple & Pink Visor)
  public static getCyberScout(frame: number = 0): HTMLCanvasElement {
    const key = `cyber_scout_${frame % 2}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const { canvas, ctx } = this.createOffscreen(32, 32);
    
    // Electric purple chassis
    ctx.fillStyle = '#9b26b6';
    ctx.fillRect(8, 6, 16, 14);
    ctx.fillStyle = '#b83bda';
    ctx.fillRect(10, 8, 12, 10);

    // Glowing pink/magenta cyclops visor
    ctx.fillStyle = '#ff00aa';
    ctx.shadowColor = '#ff00aa';
    ctx.shadowBlur = 6;
    ctx.fillRect(11, 10, 10, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 11, 4, 3);
    ctx.shadowBlur = 0;

    // Shoulder pods & antenna
    ctx.fillStyle = '#6a1b9a';
    ctx.fillRect(4, 8, 4, 8);
    ctx.fillRect(24, 8, 4, 8);

    // Twin cyan micro-thrusters with animation
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 4;
    const flameH = frame % 2 === 0 ? 8 : 11;
    ctx.fillRect(9, 20, 3, flameH);
    ctx.fillRect(20, 20, 3, flameH);
    ctx.shadowBlur = 0;

    this.spriteCache.set(key, canvas);
    return canvas;
  }

  // 2. Mech-Crab Enforcer (Cyan & Golden Claws)
  public static getMechCrab(frame: number = 0): HTMLCanvasElement {
    const key = `mech_crab_${frame % 2}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const { canvas, ctx } = this.createOffscreen(40, 36);

    // Cyan armored exoskeleton
    ctx.fillStyle = '#00838f';
    ctx.fillRect(10, 8, 20, 14);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(12, 10, 16, 10);

    // Glowing teal optic sensors
    ctx.fillStyle = '#80deea';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 5;
    ctx.fillRect(14, 12, 4, 4);
    ctx.fillRect(22, 12, 4, 4);
    ctx.shadowBlur = 0;

    // Golden yellow hydraulic claw pincers (animated pinch)
    ctx.fillStyle = '#ffd600';
    const pinch = frame % 2 === 0 ? 0 : 2;
    // Left claw
    ctx.fillRect(4, 6 - pinch, 6, 12);
    ctx.fillRect(2, 4 - pinch, 4, 6);
    // Right claw
    ctx.fillRect(30, 6 - pinch, 6, 12);
    ctx.fillRect(34, 4 - pinch, 4, 6);

    // Armored legs
    ctx.fillStyle = '#006064';
    ctx.fillRect(8, 22, 5, 8);
    ctx.fillRect(27, 22, 5, 8);
    ctx.fillRect(18, 24, 4, 7);

    this.spriteCache.set(key, canvas);
    return canvas;
  }

  // 3. Assault Behemoth (Emerald Green & Golden Armor)
  public static getAssaultBehemoth(frame: number = 0): HTMLCanvasElement {
    const key = `assault_behemoth_${frame % 2}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const { canvas, ctx } = this.createOffscreen(48, 48);

    // Heavy emerald green hull
    ctx.fillStyle = '#1b5e20';
    ctx.fillRect(10, 8, 28, 26);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(14, 12, 20, 18);

    // Golden heavy armor shoulders
    ctx.fillStyle = '#ffab00';
    ctx.fillRect(4, 10, 8, 16);
    ctx.fillRect(36, 10, 8, 16);

    // Pulsating lime/emerald energy core in chest
    ctx.fillStyle = '#76ff03';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(24, 21, 6 + (frame % 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(24, 21, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dual shoulder micro-cannons
    ctx.fillStyle = '#263238';
    ctx.fillRect(6, 4, 4, 6);
    ctx.fillRect(38, 4, 4, 6);

    // Heavy tread legs
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(12, 34, 8, 10);
    ctx.fillRect(28, 34, 8, 10);

    this.spriteCache.set(key, canvas);
    return canvas;
  }

  // 4. Mechanical Dreadnought Boss (Obsidian & Magma Orange Circuits)
  public static getDreadnoughtBoss(
    frame: number = 0,
    shieldActive: boolean = false,
    coreOverload: boolean = false,
    wingBaysOpen: boolean = false
  ): HTMLCanvasElement {
    const key = `dreadnought_boss_${frame % 4}_${shieldActive}_${coreOverload}_${wingBaysOpen}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const { canvas, ctx } = this.createOffscreen(96, 72);

    // Obsidian metallic hull
    ctx.fillStyle = '#1c1f26';
    ctx.beginPath();
    ctx.moveTo(48, 68);
    ctx.lineTo(8, 24);
    ctx.lineTo(16, 8);
    ctx.lineTo(80, 8);
    ctx.lineTo(88, 24);
    ctx.closePath();
    ctx.fill();

    // Steel plates
    ctx.fillStyle = '#2d3340';
    ctx.fillRect(28, 16, 40, 36);

    // Magma-orange glowing circuit lines
    ctx.fillStyle = '#ff6d00';
    ctx.shadowColor = '#ff6d00';
    ctx.shadowBlur = coreOverload ? 14 : 8;
    ctx.fillRect(34, 20, 28, 4);
    ctx.fillRect(46, 24, 4, 20);
    ctx.fillRect(20, 28, 12, 3);
    ctx.fillRect(64, 28, 12, 3);

    // Wing launch bays (open during minion deployment)
    if (wingBaysOpen) {
      // Port hangar bay
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(8, 16, 12, 16);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(8, 16, 12, 16);
      // Starboard hangar bay
      ctx.fillStyle = '#0a0c10';
      ctx.fillRect(76, 16, 12, 16);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(76, 16, 12, 16);
    } else {
      // Standard heavy wing cannons
      ctx.fillStyle = '#37474f';
      ctx.fillRect(6, 16, 6, 20);
      ctx.fillRect(84, 16, 6, 20);
    }

    // Central core reactor
    if (coreOverload) {
      // Blazing overloaded solar reactor core!
      const pulseRadius = 11 + (frame % 3) * 2;
      ctx.fillStyle = '#ff3d00';
      ctx.shadowColor = '#ff3d00';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(48, 36, pulseRadius + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd600';
      ctx.shadowColor = '#ffd600';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(48, 36, pulseRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(48, 36, 6, 0, Math.PI * 2);
      ctx.fill();

      // Radiating cross energy beams
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(48, 18); ctx.lineTo(48, 54);
      ctx.moveTo(30, 36); ctx.lineTo(66, 36);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(48, 36, 8 + (frame % 2 * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(48, 36, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Evil command eye visor
    ctx.fillStyle = '#ff1744';
    ctx.shadowColor = '#ff1744';
    ctx.fillRect(38, 12, 20, 4);
    ctx.shadowBlur = 0;

    // Energy deflector shield if active
    if (shieldActive) {
      ctx.strokeStyle = '#00f3ff';
      ctx.shadowColor = '#bc13fe';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(48, 36, 46, 32, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(188, 19, 254, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(48, 36, 43, 29, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    this.spriteCache.set(key, canvas);
    return canvas;
  }

  // Energy Deflector Shield Standalone Overlay
  public static getDeflectorShieldOverlay(frame: number = 0): HTMLCanvasElement {
    const key = `deflector_shield_overlay_${frame % 4}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const { canvas, ctx } = this.createOffscreen(110, 84);
    ctx.strokeStyle = '#00f3ff';
    ctx.shadowColor = '#bc13fe';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(55, 42, 50, 36, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(188, 19, 254, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(55, 42, 46, 32, 0, 0, Math.PI * 2);
    ctx.stroke();

    this.spriteCache.set(key, canvas);
    return canvas;
  }

  // Glowing Reactor Core Flare
  public static getGlowingReactorCore(size: number = 32, pulse: number = 0): HTMLCanvasElement {
    const key = `glowing_core_${size}_${pulse % 4}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const { canvas, ctx } = this.createOffscreen(size, size);
    const center = size / 2;
    const radius = center * 0.7;

    const grad = ctx.createRadialGradient(center, center, 2, center, center, radius);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#76ff03');
    grad.addColorStop(0.8, '#00e676');
    grad.addColorStop(1, 'rgba(0, 230, 118, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fill();

    this.spriteCache.set(key, canvas);
    return canvas;
  }

  // 5. Heroic Player Starship Upgrade Tiers (White/Cyan/Red)
  public static getPlayerShip(tier: number = 1): HTMLCanvasElement {
    const clampedTier = Math.min(4, Math.max(1, Math.floor(tier) || 1));
    const key = `player_ship_tier_${clampedTier}`;
    if (this.spriteCache.has(key)) return this.spriteCache.get(key)!;

    const { canvas, ctx } = this.createOffscreen(52, 52);
    const cx = 26;

    // Base Tier 1: Starter Scout
    // White aerodynamic fuselage
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx + 8, 38);
    ctx.lineTo(cx + 14, 42);
    ctx.lineTo(cx - 14, 42);
    ctx.lineTo(cx - 8, 38);
    ctx.closePath();
    ctx.fill();

    // Red wingtips & stabilizer
    ctx.fillStyle = '#ff3344';
    ctx.fillRect(cx - 12, 34, 4, 8);
    ctx.fillRect(cx + 8, 34, 4, 8);

    // Cyan cockpit canopy
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(cx, 22, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tier 2: Dual-Wing Hunter (Extended Swept Wings with Wingtip Blasters)
    if (clampedTier >= 2) {
      ctx.fillStyle = '#cfd8dc';
      // Extended swept wings
      ctx.beginPath();
      ctx.moveTo(cx - 8, 26);
      ctx.lineTo(cx - 22, 38);
      ctx.lineTo(cx - 18, 44);
      ctx.lineTo(cx - 8, 38);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + 8, 26);
      ctx.lineTo(cx + 22, 38);
      ctx.lineTo(cx + 18, 44);
      ctx.lineTo(cx + 8, 38);
      ctx.closePath();
      ctx.fill();

      // Wingtip blasters
      ctx.fillStyle = '#ff9100';
      ctx.fillRect(cx - 22, 28, 3, 10);
      ctx.fillRect(cx + 19, 28, 3, 10);
    }

    // Tier 3: Plasma Cruiser (Heavy Twin-Engine Nacelles with Cyan Glow)
    if (clampedTier >= 3) {
      ctx.fillStyle = '#90a4ae';
      ctx.fillRect(cx - 16, 22, 6, 18);
      ctx.fillRect(cx + 10, 22, 6, 18);

      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.fillRect(cx - 15, 20, 4, 3);
      ctx.fillRect(cx + 11, 20, 4, 3);
      ctx.shadowBlur = 0;
    }

    // Tier 4: Neon Flagship (Radiant Glowing Cyan Energy Blade Wings + Golden Core)
    if (clampedTier >= 4) {
      ctx.strokeStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 3;

      // Radiant energy blade wing extensions
      ctx.beginPath();
      ctx.moveTo(cx - 18, 30);
      ctx.lineTo(cx - 25, 12);
      ctx.lineTo(cx - 14, 24);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 18, 30);
      ctx.lineTo(cx + 25, 12);
      ctx.lineTo(cx + 14, 24);
      ctx.stroke();

      // Golden core
      ctx.fillStyle = '#ffd600';
      ctx.shadowColor = '#ffd600';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, 32, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Thruster exhaust flame (blue plasma)
    ctx.fillStyle = '#00b0ff';
    ctx.shadowColor = '#00b0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(cx - 4, 42);
    ctx.lineTo(cx, 50);
    ctx.lineTo(cx + 4, 42);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    this.spriteCache.set(key, canvas);
    return canvas;
  }
}
