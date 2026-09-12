/**
 * HalftoneWaves.js — Circus Marquee & Radial Starburst Wave Synthesizer
 * 
 * Recreates the exact hypnotic circus light / marquee illuminated dot grid
 * with radiating curved spiral arms, radial wave pulses, and glowing amber bulbs.
 */

export class HalftoneWaves {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    // Default configuration matching the reference image
    this.options = Object.assign({
      pattern: 'circus-starburst', // 'circus-starburst' | 'radial-pulse' | 'wave-ribbons' | 'dual-vortex' | 'liquid-flow'
      dotShape: 'circle',          // 'circle' | 'bulb-glow' | 'diamond' | 'square'
      gridPitch: 14,               // Distance between dot centers (8 - 32px)
      staggerGrid: false,          // Stagger alternate rows
      armsCount: 8,                // Number of radiating starburst arms (4 - 16)
      spiralTwist: 0.008,          // Curvature of radiating arms
      maxDotScale: 1.15,           // Maximum bulb radius factor (0.3 - 1.6)
      minDotScale: 0.05,           // Minimum dot radius (0.0 - 0.4)
      waveSpeed: 1.0,              // Animation speed
      contrast: 1.4,               // Dot size contrast curve
      colorScheme: 'circus-amber', // 'circus-amber' | 'carnival-gold' | 'neon-coral' | 'vegas-cyan' | 'broadway-magenta' | 'editorial'
      bulbGlow: true,              // Glowing center on illuminated bulbs
      interactive: true,           // Mouse controls center / distortion
      mouseForce: 1.0,             // Mouse ripple force
      followMouseCenter: false,    // Starburst hub follows cursor
      reducedMotion: false,
      dprCap: 2
    }, options);

    // Canvas setup
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.container.appendChild(this.canvas);

    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.rafId = null;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.isRunning = false;

    // Mouse & physics
    this.mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      isHovering: false
    };

    // Expanding shockwaves
    this.shockwaves = [];

    // System reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.options.reducedMotion = true;
    }

    this.handleResize();
    this.bindEvents();
    this.start();
  }

  // ─────────────────────────────────────────────────────────────
  // Color Palettes
  // ─────────────────────────────────────────────────────────────

  getPalette(scheme) {
    switch (scheme) {
      case 'circus-amber':
      default:
        return {
          bg: '#08101e',           // Deep navy/midnight slate (matches reference)
          bulb: '#ff7700',         // Vibrant glowing circus orange
          bulbCore: '#ffe082',     // Golden bright filament core
          dimBulb: '#e65100',      // Deep burnt amber
          glow: 'rgba(255, 119, 0, 0.45)',
          centerGlow: 'rgba(255, 119, 0, 0.08)'
        };
      case 'carnival-gold':
        return {
          bg: '#0c0e14',
          bulb: '#ffb300',         // Golden yellow
          bulbCore: '#fff9c4',     // Warm pale gold
          dimBulb: '#b26a00',
          glow: 'rgba(255, 179, 0, 0.45)',
          centerGlow: 'rgba(255, 179, 0, 0.09)'
        };
      case 'neon-coral':
        return {
          bg: '#0a0612',
          bulb: '#ff3d00',         // Neon red-coral
          bulbCore: '#ffccbc',
          dimBulb: '#b71c1c',
          glow: 'rgba(255, 61, 0, 0.45)',
          centerGlow: 'rgba(255, 61, 0, 0.08)'
        };
      case 'vegas-cyan':
        return {
          bg: '#041018',
          bulb: '#00e5ff',         // Electric Cyan
          bulbCore: '#e0f7fa',
          dimBulb: '#006064',
          glow: 'rgba(0, 229, 255, 0.45)',
          centerGlow: 'rgba(0, 229, 255, 0.08)'
        };
      case 'broadway-magenta':
        return {
          bg: '#0f0514',
          bulb: '#f50057',         // Hot Broadway Pink
          bulbCore: '#fce4ec',
          dimBulb: '#880e4f',
          glow: 'rgba(245, 0, 87, 0.45)',
          centerGlow: 'rgba(245, 0, 87, 0.08)'
        };
      case 'editorial':
        return {
          bg: '#0a0a0c',
          bulb: '#f8fafc',         // Pure chalk
          bulbCore: '#ffffff',
          dimBulb: '#64748b',
          glow: 'rgba(255, 255, 255, 0.40)',
          centerGlow: 'rgba(255, 255, 255, 0.06)'
        };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Core Wave & Starburst Mathematics
  // ─────────────────────────────────────────────────────────────

  calculateWaveValue(x, y, time) {
    const pattern = this.options.pattern;
    const speed = this.options.reducedMotion ? 0.2 : this.options.waveSpeed;
    const t = time * speed;

    // Hub center coordinates
    let cx = this.width / 2;
    let cy = this.height / 2;

    if (this.options.followMouseCenter && this.mouse.isHovering) {
      cx = this.mouse.x;
      cy = this.mouse.y;
    }

    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    const theta = Math.atan2(dy, dx);

    let val = 0.5;

    switch (pattern) {
      case 'circus-starburst': {
        // EXACT match to reference: Radiating curved spiral arms with radial wave breathing
        const arms = this.options.armsCount;
        const twist = this.options.spiralTwist;
        
        // 1. Radiating spiral pinwheel component
        const spiralAngle = theta * arms - r * twist - t * 1.8;
        const spiralWave = Math.sin(spiralAngle);

        // 2. Outward traveling concentric wave pulses
        const radialPulse = Math.cos(r * 0.035 - t * 2.2);

        // 3. Subtle background traveling diagonal wave
        const diagWave = Math.sin(x * 0.015 + y * 0.015 + t * 0.8);

        // Combined synthesis
        const raw = spiralWave * 0.68 + radialPulse * 0.22 + diagWave * 0.10;
        val = 0.5 + 0.5 * raw;
        break;
      }

      case 'radial-pulse': {
        // Hypnotic concentric marquee rings rippling outward
        const ringWave = Math.sin(r * 0.045 - t * 3.0);
        const angularMod = Math.cos(theta * 6.0 + t * 0.8) * 0.25;
        val = 0.5 + 0.5 * (ringWave * 0.8 + angularMod);
        break;
      }

      case 'wave-ribbons': {
        // Flowing vertical & diagonal illuminated ribbons
        const w1 = Math.sin(x * 0.025 + Math.cos(y * 0.018) * 2.5 - t * 2.0);
        const w2 = Math.cos(y * 0.030 + t * 1.5);
        const w3 = Math.sin((x + y) * 0.018 - t * 1.2);
        val = 0.5 + 0.5 * (w1 * 0.5 + w2 * 0.3 + w3 * 0.2);
        break;
      }

      case 'dual-vortex': {
        // Twin counter-rotating starburst hubs
        const c1x = this.width * 0.35, c1y = this.height * 0.5;
        const c2x = this.width * 0.65, c2y = this.height * 0.5;
        const r1 = Math.hypot(x - c1x, y - c1y), a1 = Math.atan2(y - c1y, x - c1x);
        const r2 = Math.hypot(x - c2x, y - c2y), a2 = Math.atan2(y - c2y, x - c2x);

        const v1 = Math.sin(a1 * 6 - r1 * 0.012 - t * 2.0);
        const v2 = Math.sin(a2 * 6 + r2 * 0.012 + t * 2.0);
        val = 0.5 + 0.5 * ((v1 + v2) * 0.5);
        break;
      }

      case 'liquid-flow':
      default: {
        // Organic liquid turbulence
        const nx = x * 0.008, ny = y * 0.008;
        const qx = Math.sin(nx + t * 0.8 + Math.cos(ny));
        const qy = Math.cos(ny - t * 0.7 + Math.sin(nx));
        const w1 = Math.sin(nx * 2.0 + qx * 2.5 + t * 1.2);
        const w2 = Math.cos(ny * 2.0 + qy * 2.5 - t * 1.0);
        val = 0.5 + 0.5 * (w1 * 0.55 + w2 * 0.45);
        break;
      }
    }

    // Apply Contrast Power Curve
    const contrast = this.options.contrast;
    if (contrast !== 1.0) {
      val = Math.pow(val, contrast);
    }

    return Math.max(0, Math.min(1, val));
  }

  // ─────────────────────────────────────────────────────────────
  // Event Listeners & Interaction
  // ─────────────────────────────────────────────────────────────

  bindEvents() {
    this._onResize = () => this.handleResize();
    window.addEventListener('resize', this._onResize);

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.targetX = e.clientX - rect.left;
      this.mouse.targetY = e.clientY - rect.top;
      this.mouse.isHovering = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.targetX = -9999;
      this.mouse.targetY = -9999;
      this.mouse.isHovering = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.triggerShockwave(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!e.touches[0]) return;
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.targetX = e.touches[0].clientX - rect.left;
      this.mouse.targetY = e.touches[0].clientY - rect.top;
      this.mouse.isHovering = true;
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.targetX = -9999;
      this.mouse.targetY = -9999;
      this.mouse.isHovering = false;
    });
  }

  triggerShockwave(originX, originY) {
    this.shockwaves.push({
      x: originX,
      y: originY,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 0.75,
      speed: 16,
      force: 1.0 * this.options.mouseForce,
      alpha: 1.0
    });
  }

  handleResize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.dpr = Math.min(this.options.dprCap, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
  }

  // ─────────────────────────────────────────────────────────────
  // Animation Loop & Render Engine
  // ─────────────────────────────────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.isRunning) return;
      this.lastTime = time;
      this.render((time - this.startTime) / 1000);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  render(elapsed) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const palette = this.getPalette(this.options.colorScheme);

    // Mouse interpolation
    if (this.mouse.isHovering) {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.2;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.2;
    } else {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = 1.0 - (sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius) this.shockwaves.splice(i, 1);
    }

    // 1. Deep Background Fill (Exact Dark Navy Slate)
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Subtle Atmospheric Amber Glow in Center
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxDim = Math.max(this.width, this.height);
    const radGlow = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxDim * 0.7);
    radGlow.addColorStop(0, palette.centerGlow);
    radGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Discrete Halftone Grid Matrix
    const pitch = Math.max(8, Math.min(36, this.options.gridPitch));
    const stagger = this.options.staggerGrid;
    const cols = Math.ceil(this.width / pitch) + 2;
    const rows = Math.ceil(this.height / pitch) + 2;
    const startX = -pitch;
    const startY = -pitch;

    const minRadius = (pitch / 2) * this.options.minDotScale;
    const maxRadius = (pitch / 2) * this.options.maxDotScale;
    const shape = this.options.dotShape;
    const bulbGlow = this.options.bulbGlow;

    // Render every bulb dot in the matrix
    for (let r = 0; r < rows; r++) {
      const gridY = startY + r * pitch;
      const staggerOffset = (stagger && (r % 2 === 1)) ? pitch * 0.5 : 0;

      for (let c = 0; c < cols; c++) {
        const gridX = startX + c * pitch + staggerOffset;

        // Calculate dynamic starburst wave scalar
        let wave = this.calculateWaveValue(gridX, gridY, elapsed);

        // Interactive mouse distortion
        if (this.mouse.isHovering && !this.options.followMouseCenter) {
          const mdx = gridX - this.mouse.x;
          const mdy = gridY - this.mouse.y;
          const mDist = Math.hypot(mdx, mdy);
          const mRadius = 150;
          if (mDist < mRadius) {
            const mPower = (1 - mDist / mRadius) * this.options.mouseForce;
            wave = Math.min(1.0, wave + mPower * 0.55);
          }
        }

        // Active Shockwaves
        for (const sw of this.shockwaves) {
          const sDist = Math.hypot(gridX - sw.x, gridY - sw.y);
          const delta = Math.abs(sDist - sw.radius);
          if (delta < 60) {
            const swPower = (1 - delta / 60) * sw.force * sw.alpha;
            wave = Math.min(1.0, wave + swPower);
          }
        }

        // Dot size proportional to wave amplitude
        const dotRadius = minRadius + (maxRadius - minRadius) * wave;
        if (dotRadius <= 0.4) continue; // Skip invisible dots

        // Outer Bulb Glow for illuminated large bulbs
        if (bulbGlow && wave > 0.65) {
          const glowRadius = dotRadius * 1.8;
          ctx.fillStyle = palette.glow;
          ctx.beginPath();
          ctx.arc(gridX, gridY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main Bulb Fill (Vibrant Orange / Amber)
        ctx.fillStyle = wave > 0.4 ? palette.bulb : palette.dimBulb;
        ctx.globalAlpha = Math.max(0.25, Math.min(1.0, 0.35 + wave * 0.65));

        this.renderBulb(ctx, shape, gridX, gridY, dotRadius);

        // Bright Illuminated Core (Light bulb filament reflection)
        if (bulbGlow && wave > 0.72) {
          const coreRadius = dotRadius * 0.45;
          ctx.fillStyle = palette.bulbCore;
          ctx.globalAlpha = (wave - 0.72) * 3.5;
          ctx.beginPath();
          ctx.arc(gridX, gridY, coreRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  renderBulb(ctx, shape, x, y, r) {
    ctx.beginPath();
    switch (shape) {
      case 'diamond':
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r, y);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        const s = r * 1.5;
        ctx.rect(x - s / 2, y - s / 2, s, s);
        ctx.fill();
        break;
      case 'circle':
      case 'bulb-glow':
      default:
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  }

  setOption(key, val) {
    this.options[key] = val;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
