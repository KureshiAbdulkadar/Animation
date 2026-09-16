/**
 * VectorFlowField.js — Interactive Cursor-Driven Vector Field Animation Engine
 * 
 * Static/calm grid of resting dashes on black canvas with ZERO autonomous background movement.
 * On cursor hover, the local area reacts dynamically:
 * - Dashes align and rotate to follow the cursor's motion and direction
 * - Colors in the cursor area illuminate with the selected color theme and white highlights
 * - Rest of the canvas stays calm and static without moving
 */

export const THEMES = {
  orange: {
    name: 'Amber Glow (Default)',
    bg: '#000000',
    base: '#f97316',        // Primary Orange
    mid: '#fb923c',         // Bright Amber
    crest: '#fed7aa',       // Warm White-Orange
    peak: '#ffffff',        // Radiant White
    dimAlpha: 0.15,
    glowColor: 'rgba(249, 115, 22, 0.45)'
  },
  sunset: {
    name: 'Cyber Sunset',
    bg: '#000000',
    base: '#ec4899',        // Neon Pink/Magenta
    mid: '#f59e0b',         // Sunset Amber
    crest: '#fef08a',       // Sun Gold
    peak: '#ffffff',        // Pure White
    dimAlpha: 0.15,
    glowColor: 'rgba(236, 72, 153, 0.45)'
  },
  cyan: {
    name: 'Electric Cyan',
    bg: '#000000',
    base: '#0284c7',        // Deep Cyan
    mid: '#38bdf8',         // Electric Cyan
    crest: '#e0f2fe',       // Glacier White-Cyan
    peak: '#ffffff',        // Pure White
    dimAlpha: 0.15,
    glowColor: 'rgba(56, 189, 248, 0.45)'
  },
  emerald: {
    name: 'Emerald Aurora',
    bg: '#000000',
    base: '#059669',        // Deep Jade
    mid: '#10b981',         // Neon Emerald
    crest: '#d1fae5',       // Mint Frost
    peak: '#ffffff',        // Pure White
    dimAlpha: 0.15,
    glowColor: 'rgba(16, 185, 129, 0.45)'
  },
  violet: {
    name: 'Neon Violet',
    bg: '#000000',
    base: '#7c3aed',        // Deep Purple
    mid: '#a855f7',         // Bright Violet
    crest: '#f3e8ff',       // Lavender Frost
    peak: '#ffffff',        // Pure White
    dimAlpha: 0.15,
    glowColor: 'rgba(168, 85, 247, 0.45)'
  },
  silver: {
    name: 'Silver Monolith',
    bg: '#000000',
    base: '#64748b',        // Slate
    mid: '#94a3b8',         // Titanium
    crest: '#e2e8f0',       // Platinum
    peak: '#ffffff',        // Chromium White
    dimAlpha: 0.15,
    glowColor: 'rgba(148, 163, 184, 0.35)'
  }
};

export const DEFAULT_COLORS = THEMES.orange;

export class VectorFlowField {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      gridSpacing: 22,           // Distance between dash nodes in px
      dashLength: 16,            // Length of each dash in px
      dashThickness: 2.0,        // Stroke width of dashes
      influenceRadius: 160,      // Cursor interactive influence radius in px
      interactionMode: 'follow', // 'follow' | 'radial' | 'vortex'
      restingAngle: 0,           // Default resting angle in radians (0 = horizontal)
      showGlow: true,            // Toggle glow halos around cursor
      glowIntensity: 1.0,        // Glow intensity multiplier
      colors: { ...DEFAULT_COLORS },
      dprCap: 2
    }, options);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.container.appendChild(this.canvas);

    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    this.nodes = [];
    this.mouse = {
      x: -1000,
      y: -1000,
      px: -1000,
      py: -1000,
      vx: 0,
      vy: 0,
      speed: 0,
      motionAngle: 0,
      isHovering: false
    };

    this.isRunning = false;
    this.rafId = null;

    this.handleResize();
    this.initGrid();
    this.updateColorPalette();
    this.bindEvents();
    this.start();
  }

  _parseHex(hex) {
    if (!hex) return [249, 115, 22];
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  updateColorPalette() {
    const theme = this.options.colors || THEMES.orange;
    const baseRgb = this._parseHex(theme.base || '#f97316');
    const midRgb = this._parseHex(theme.mid || '#fb923c');
    const crestRgb = this._parseHex(theme.crest || '#fed7aa');
    const peakRgb = this._parseHex(theme.peak || '#ffffff');

    this.palette = {
      bg: theme.bg || '#000000',
      base: baseRgb,
      mid: midRgb,
      crest: crestRgb,
      peak: peakRgb,
      dimAlpha: theme.dimAlpha || 0.15,
      glowColor: theme.glowColor || 'rgba(249, 115, 22, 0.45)'
    };
  }

  initGrid() {
    this.nodes = [];
    const spacing = Math.max(12, this.options.gridSpacing);
    const cols = Math.ceil(this.width / spacing) + 2;
    const rows = Math.ceil(this.height / spacing) + 2;

    const offsetX = (this.width - (cols - 1) * spacing) * 0.5;
    const offsetY = (this.height - (rows - 1) * spacing) * 0.5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * spacing;
        const y = offsetY + r * spacing;

        this.nodes.push({
          x,
          y,
          c,
          r,
          currentAngle: this.options.restingAngle || 0,
          currentIntensity: 0,
          length: this.options.dashLength
        });
      }
    }
  }

  handleResize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.dpr = Math.min(this.options.dprCap, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.initGrid();
  }

  bindEvents() {
    this._resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this._resizeHandler);

    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = clientX - rect.left;
      const ny = clientY - rect.top;

      if (!this.mouse.isHovering) {
        this.mouse.px = nx;
        this.mouse.py = ny;
      } else {
        this.mouse.px = this.mouse.x;
        this.mouse.py = this.mouse.y;
      }

      this.mouse.x = nx;
      this.mouse.y = ny;

      const dx = this.mouse.x - this.mouse.px;
      const dy = this.mouse.y - this.mouse.py;
      const dist = Math.hypot(dx, dy);

      this.mouse.vx = dx;
      this.mouse.vy = dy;
      this.mouse.speed = dist;

      if (dist > 1.5) {
        this.mouse.motionAngle = Math.atan2(dy, dx);
      }

      this.mouse.isHovering = true;
    };

    const onLeave = () => {
      this.mouse.isHovering = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
      this.mouse.vx = 0;
      this.mouse.vy = 0;
    };

    this.canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseleave', onLeave);

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    this.canvas.addEventListener('touchend', onLeave);
  }

  setTheme(themeName) {
    if (THEMES[themeName]) {
      this.options.colors = { ...THEMES[themeName] };
      this.updateColorPalette();
    }
  }

  setColors(newColors) {
    Object.assign(this.options.colors, newColors);
    this.updateColorPalette();
  }

  setOptions(newOpts) {
    Object.assign(this.options, newOpts);
    if ('gridSpacing' in newOpts) {
      this.initGrid();
    }
    if ('colors' in newOpts) {
      this.updateColorPalette();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;
      this.update();
      this.render();
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

  update() {
    const radius = this.options.influenceRadius || 160;
    const restingAngle = this.options.restingAngle || 0;
    const mode = this.options.interactionMode || 'follow';
    const isHover = this.mouse.isHovering;
    const mx = this.mouse.x;
    const my = this.mouse.y;
    const motionAngle = this.mouse.motionAngle;
    const speed = this.mouse.speed;

    // Decay mouse instantaneous velocity
    this.mouse.vx *= 0.85;
    this.mouse.vy *= 0.85;
    this.mouse.speed *= 0.85;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      let targetAngle = restingAngle;
      let targetIntensity = 0;

      if (isHover) {
        const dx = node.x - mx;
        const dy = node.y - my;
        const dist = Math.hypot(dx, dy);

        if (dist < radius) {
          const factor = 1.0 - (dist / radius);
          const smoothFactor = factor * factor * (3.0 - 2.0 * factor); // smoothstep
          targetIntensity = smoothFactor;

          if (mode === 'radial') {
            // Point outward from cursor
            targetAngle = Math.atan2(dy, dx);
          } else if (mode === 'vortex') {
            // Swirl around cursor
            targetAngle = Math.atan2(dy, dx) + Math.PI * 0.5;
          } else {
            // 'follow' mode: align along cursor movement direction + subtle radial flow
            if (speed > 1.2) {
              const radialAngle = Math.atan2(dy, dx);
              // Blend motion vector direction with radial displacement
              targetAngle = motionAngle * 0.75 + radialAngle * 0.25;
            } else {
              targetAngle = Math.atan2(dy, dx);
            }
          }
        }
      }

      // Smooth shortest-arc angle interpolation
      let diff = Math.atan2(Math.sin(targetAngle - node.currentAngle), Math.cos(targetAngle - node.currentAngle));
      node.currentAngle += diff * 0.16;

      // Smooth intensity interpolation (lights up fast, decays smoothly)
      node.currentIntensity += (targetIntensity - node.currentIntensity) * (targetIntensity > node.currentIntensity ? 0.22 : 0.08);
      node.length = this.options.dashLength * (0.9 + node.currentIntensity * 0.35);
    }
  }

  _lerpColor(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }

  render() {
    const ctx = this.ctx;
    const pal = this.palette;
    const thickness = this.options.dashThickness || 2.0;
    const showGlow = this.options.showGlow;
    const glowIntensity = this.options.glowIntensity || 1.0;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Deep black canvas background
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.lineCap = 'round';

    // 1. Soft Bloom Glow Pass on Active Cursor Area
    if (showGlow && glowIntensity > 0) {
      ctx.lineWidth = thickness * 3.4;
      for (let i = 0; i < this.nodes.length; i++) {
        const node = this.nodes[i];
        if (node.currentIntensity < 0.25) continue;

        const glowAlpha = (node.currentIntensity - 0.25) * 1.33 * (0.35 * glowIntensity);
        const halfL = node.length * 0.65;
        const dx = Math.cos(node.currentAngle) * halfL;
        const dy = Math.sin(node.currentAngle) * halfL;

        ctx.strokeStyle = `rgba(${pal.base[0]}, ${pal.base[1]}, ${pal.base[2]}, ${Math.min(1, glowAlpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(node.x - dx, node.y - dy);
        ctx.lineTo(node.x + dx, node.y + dy);
        ctx.stroke();
      }
    }

    // 2. Main Dash Vector Field Pass
    ctx.lineWidth = thickness;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const norm = node.currentIntensity; // 0.0 (resting/static) to 1.0 (active near cursor)

      let rgb;
      if (norm <= 0.02) {
        // Calm resting dashes
        rgb = pal.base;
      } else if (norm < 0.5) {
        // Base -> Mid accent
        rgb = this._lerpColor(pal.base, pal.mid, norm * 2.0);
      } else if (norm < 0.85) {
        // Mid accent -> Crest warm tone
        rgb = this._lerpColor(pal.mid, pal.crest, (norm - 0.5) / 0.35);
      } else {
        // Crest -> Pure white highlight right under cursor
        rgb = this._lerpColor(pal.crest, pal.peak, (norm - 0.85) / 0.15);
      }

      // Rest of the canvas is subtle (0.15 opacity), active cursor area lights up to 1.0
      const alpha = pal.dimAlpha + norm * (1.0 - pal.dimAlpha);

      const halfL = node.length * 0.5;
      const dx = Math.cos(node.currentAngle) * halfL;
      const dy = Math.sin(node.currentAngle) * halfL;

      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(node.x - dx, node.y - dy);
      ctx.lineTo(node.x + dx, node.y + dy);
      ctx.stroke();
    }

    ctx.restore();
  }

  destroy() {
    this.stop();
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

export { VectorFlowField as VectorFlowFieldEngine };
export default VectorFlowField;
