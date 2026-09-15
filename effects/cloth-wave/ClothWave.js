/**
 * ClothWave.js — 3D Wavy Cloth Particle Grid Animation Engine
 * 
 * High-performance 60+ FPS flowing silk cloth grid simulation.
 * Features:
 * - True-to-palette color accuracy (hue-faithful shading for any color)
 * - Optimized GPU-accelerated glow sprite cache for rock-solid 60 FPS
 * - Stable, undisturbed camera framing & pure harmonic silk motion
 */

export const THEMES = {
  cyan: {
    bg: '#000000',
    mid: '#38bdf8',
    name: 'Cyan Silk'
  },
  emerald: {
    bg: '#000000',
    mid: '#10b981',
    name: 'Emerald Sea'
  },
  amber: {
    bg: '#000000',
    mid: '#f59e0b',
    name: 'Amber Glow'
  },
  violet: {
    bg: '#000000',
    mid: '#a855f7',
    name: 'Neon Violet'
  },
  silver: {
    bg: '#000000',
    mid: '#94a3b8',
    name: 'Silver Monolith'
  },
  crimson: {
    bg: '#000000',
    mid: '#f43f5e',
    name: 'Crimson Velvet'
  },
  sunset: {
    bg: '#000000',
    mid: '#ec4899',
    name: 'Cyber Sunset'
  }
};

export const DEFAULT_COLORS = THEMES.cyan;

export class ClothWave {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      // Grid dimensions & base spacing
      cols: 64,
      rows: 38,
      spacingX: 28,
      spacingZ: 22,

      // Wave dynamics
      waveAmplitude: 65,         // Max vertical displacement of waves
      waveSpeed: 0.85,           // Global wave flow speed
      waveFreqX: 0.006,          // Frequency along X axis
      waveFreqZ: 0.008,          // Frequency along Z axis
      motionMode: 'silk',        // 'silk' | 'ocean' | 'ripple' | 'vortex'

      // Visual features & toggles
      baseDotRadius: 1.2,        // Minimum dot radius in valleys
      peakDotRadius: 3.4,        // Maximum dot radius on peaks
      showMeshLines: true,       // Render faint connecting cloth lattice lines
      showSpecular: true,        // Surface slope lighting and silk sheen
      showGlow: true,            // Soft bloom halos on wave peaks
      glowIntensity: 1.0,        // Bloom intensity multiplier
      enableDepthFog: true,      // Distance fog fading

      // 3D Camera / Perspective
      cameraFov: 520,            // Perspective FOV distance
      cameraPitch: 0.48,         // Tilt angle in radians (~27.5° downwards)
      cameraDist: 720,           // Camera distance from origin
      cameraElevation: 340,      // Camera height above origin

      // Color Palette
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

    this.particles = [];
    this.cachedColor = null;
    this.glowCanvas = null;

    this.time = 0;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.rafId = null;

    this.handleResize();
    this.initGrid();
    this.updateColorPalette();
    this.bindEvents();
    this.start();
  }

  _parseHex(hex) {
    if (!hex) return [56, 189, 248];
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }

  updateColorPalette() {
    const midHex = this.options.colors.mid || '#38bdf8';
    const rgb = this._parseHex(midHex);

    // Exact, faithful hue derivation across the full tonal range:
    this.palette = {
      midHex,
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
      // Valley: deep rich tone preserving exact color hue
      vr: Math.round(rgb[0] * 0.16),
      vg: Math.round(rgb[1] * 0.16),
      vb: Math.round(rgb[2] * 0.16),
      // Peak: bright highlight with subtle tint of the base color
      pr: Math.round(rgb[0] * 0.15 + 255 * 0.85),
      pg: Math.round(rgb[1] * 0.15 + 255 * 0.85),
      pb: Math.round(rgb[2] * 0.15 + 255 * 0.85),
      // Specular highlight: near-white
      sr: 255,
      sg: 255,
      sb: 255,
      // Mesh lattice line style
      meshLineStyle: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.12)`,
      bgStyle: this.options.colors.bg || '#000000'
    };

    // Pre-render high-performance offscreen glow sprite (eliminates per-frame gradient allocation)
    const glowSize = 64;
    this.glowCanvas = document.createElement('canvas');
    this.glowCanvas.width = glowSize;
    this.glowCanvas.height = glowSize;
    const gctx = this.glowCanvas.getContext('2d');
    const half = glowSize * 0.5;

    const grad = gctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1)`);
    grad.addColorStop(0.35, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.45)`);
    grad.addColorStop(0.7, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.12)`);
    grad.addColorStop(1, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0)`);

    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, glowSize, glowSize);
  }

  initGrid() {
    this.particles = [];
    const cols = this.options.cols;
    const rows = this.options.rows;
    const spacingX = this.options.spacingX;
    const spacingZ = this.options.spacingZ;

    const halfW = ((cols - 1) * spacingX) * 0.5;
    const halfD = ((rows - 1) * spacingZ) * 0.5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = c * spacingX - halfW;
        const wz = r * spacingZ - halfD;

        // Normalized distance to grid boundary (for edge fadeout)
        const edgeU = Math.min(c, cols - 1 - c) / (cols * 0.16);
        const edgeV = Math.min(r, rows - 1 - r) / (rows * 0.16);
        const edgeFactor = Math.max(0, Math.min(1, Math.min(edgeU, edgeV)));

        this.particles.push({
          c, r,
          wx, wz, wy: 0,
          screenX: 0,
          screenY: 0,
          screenRadius: 1,
          elevationNorm: 0.5,
          specular: 0.0,
          depthFogAlpha: 1.0,
          edgeFactor,
          visible: true
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

    if (this.width < 768) {
      this.responsiveScale = Math.max(0.65, this.width / 900);
    } else {
      this.responsiveScale = Math.min(1.2, this.width / 1300);
    }
  }

  bindEvents() {
    this._resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this._resizeHandler);
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
    if ('cols' in newOpts || 'rows' in newOpts || 'spacingX' in newOpts || 'spacingZ' in newOpts) {
      this.initGrid();
    }
    if ('colors' in newOpts) {
      this.updateColorPalette();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (timestamp) => {
      if (!this.isRunning) return;
      const dt = Math.min((timestamp - this.lastTime) * 0.001, 0.05);
      this.lastTime = timestamp;

      this.update(dt);
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

  _calculateWave(wx, wz, t, mode, fx, fz) {
    let rawHeight = 0;
    let dh_dx = 0;
    let dh_dz = 0;

    switch (mode) {
      case 'ocean': {
        const a1 = wx * fx * 0.9 + wz * fz * 1.3 + t * 1.2;
        const a2 = wx * fx * 1.4 - wz * fz * 0.8 + t * 0.9;
        const a3 = (wx - wz) * fx * 1.8 + t * 1.6;
        
        const w1 = Math.sin(a1);
        const w2 = Math.cos(a2) * 0.8;
        const w3 = Math.sin(a3) * 0.35;
        rawHeight = w1 + w2 + w3;

        dh_dx = (Math.cos(a1) * fx * 0.9 - Math.sin(a2) * 0.8 * fx * 1.4 + Math.cos(a3) * 0.35 * fx * 1.8);
        dh_dz = (Math.cos(a1) * fz * 1.3 + Math.sin(a2) * 0.8 * fz * 0.8 - Math.cos(a3) * 0.35 * fx * 1.8);
        break;
      }
      case 'ripple': {
        const distCenter = Math.hypot(wx, wz);
        const a1 = distCenter * 0.015 - t * 2.2;
        const a2 = wx * fx * 2.0 + t * 1.5;
        const a3 = wz * fz * 2.0 + t * 1.3;

        const w1 = Math.sin(a1) * 1.1;
        const w2 = Math.cos(a2) * 0.5;
        const w3 = Math.sin(a3) * 0.5;
        rawHeight = w1 + w2 + w3;

        const invDist = distCenter > 0.001 ? 1 / distCenter : 0;
        dh_dx = Math.cos(a1) * 1.1 * 0.015 * (wx * invDist) - Math.sin(a2) * 0.5 * fx * 2.0;
        dh_dz = Math.cos(a1) * 1.1 * 0.015 * (wz * invDist) + Math.cos(a3) * 0.5 * fz * 2.0;
        break;
      }
      case 'vortex': {
        const angle = Math.atan2(wz, wx);
        const radius = Math.hypot(wx, wz);
        const a1 = angle * 3.0 - radius * 0.012 + t * 1.6;
        const a2 = (wx + wz) * fx * 1.1 + t * 0.8;
        const a3 = Math.sin(radius * 0.008 - t * 1.4) * 0.6;

        const w1 = Math.sin(a1) * 1.1;
        const w2 = Math.cos(a2) * 0.6;
        rawHeight = w1 + w2 + a3;

        dh_dx = Math.cos(a1) * 1.1 * (-Math.sin(angle) * 3.0 / Math.max(1, radius) - 0.012 * (wx / Math.max(1, radius))) - Math.sin(a2) * 0.6 * fx * 1.1;
        dh_dz = Math.cos(a1) * 1.1 * (Math.cos(angle) * 3.0 / Math.max(1, radius) - 0.012 * (wz / Math.max(1, radius))) - Math.sin(a2) * 0.6 * fx * 1.1;
        break;
      }
      case 'silk':
      default: {
        const a1 = wx * fx * 1.3 + wz * fz * 1.1 + t * 1.4;
        const a2 = wx * fx * 0.8 - wz * fz * 1.6 + t * 0.9;
        const a3 = (wx + wz) * fx * 1.5 + t * 1.8;
        const dist = Math.hypot(wx, wz);
        const a4 = dist * 0.006 - t * 1.2;

        const w1 = Math.sin(a1);
        const w2 = Math.cos(a2) * 0.7;
        const w3 = Math.sin(a3) * 0.45;
        const w4 = Math.cos(a4) * 0.35;

        rawHeight = w1 + w2 + w3 + w4;

        const invDist = dist > 0.001 ? 1 / dist : 0;
        dh_dx = (Math.cos(a1) * fx * 1.3 - Math.sin(a2) * 0.7 * fx * 0.8 + Math.cos(a3) * 0.45 * fx * 1.5 - Math.sin(a4) * 0.35 * 0.006 * (wx * invDist));
        dh_dz = (Math.cos(a1) * fz * 1.1 + Math.sin(a2) * 0.7 * fz * 1.6 + Math.cos(a3) * 0.45 * fx * 1.5 - Math.sin(a4) * 0.35 * 0.006 * (wz * invDist));
        break;
      }
    }

    return { rawHeight, dh_dx, dh_dz };
  }

  update(dt) {
    this.time += dt * this.options.waveSpeed;
    const t = this.time;

    const amp = this.options.waveAmplitude;
    const fx = this.options.waveFreqX;
    const fz = this.options.waveFreqZ;
    const mode = this.options.motionMode || 'silk';

    // Pure stable camera without mouse perturbation
    const camPitch = this.options.cameraPitch;
    const cosPitch = Math.cos(camPitch);
    const sinPitch = Math.sin(camPitch);
    const camDist = this.options.cameraDist;
    const camHeight = this.options.cameraElevation;
    const fov = this.options.cameraFov * (this.responsiveScale || 1.0);

    const cx = this.width * 0.5;
    const cy = this.height * 0.58;

    const minR = this.options.baseDotRadius;
    const maxR = this.options.peakDotRadius;

    const lx = 0.577, ly = 0.577, lz = -0.577;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const wx = p.wx;
      const wz = p.wz;

      // Harmonic wave formula
      const waveData = this._calculateWave(wx, wz, t, mode, fx, fz);
      const rawH = waveData.rawHeight;
      const dh_dx = waveData.dh_dx;
      const dh_dz = waveData.dh_dz;

      p.wy = rawH * (amp * 0.45);
      const normElev = Math.max(0, Math.min(1, (rawH + 2.5) / 5.0));
      p.elevationNorm = normElev;

      // Specular slope sheen
      if (this.options.showSpecular) {
        const nx = -dh_dx * (amp * 0.45) * 0.15;
        const ny = 1.0;
        const nz = -dh_dz * (amp * 0.45) * 0.15;
        const nLen = Math.hypot(nx, ny, nz) || 1.0;
        const dotL = Math.max(0, (nx / nLen) * lx + (ny / nLen) * ly + (nz / nLen) * lz);
        p.specular = Math.pow(dotL, 4.0) * 0.75 + (normElev > 0.65 ? (normElev - 0.65) * 0.8 : 0);
      } else {
        p.specular = 0;
      }

      // Stable 3D Camera Transformation
      const dx = wx;
      const dy = p.wy - camHeight;
      const dz = wz - camDist;

      const camSpaceX = dx;
      const camSpaceY = dy * cosPitch - dz * sinPitch;
      const camSpaceZ = -dy * sinPitch - dz * cosPitch;

      if (camSpaceZ <= 10) {
        p.visible = false;
        continue;
      }

      p.visible = true;
      const scale = fov / camSpaceZ;
      p.screenX = cx + camSpaceX * scale;
      p.screenY = cy - camSpaceY * scale;
      p.screenRadius = Math.max(0.5, (minR + (maxR - minR) * normElev) * scale * 1.25);

      if (this.options.enableDepthFog) {
        const fogFactor = Math.max(0, Math.min(1, 1 - (camSpaceZ - 450) / 750));
        p.depthFogAlpha = fogFactor * p.edgeFactor;
      } else {
        p.depthFogAlpha = p.edgeFactor;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const cols = this.options.cols;
    const rows = this.options.rows;
    const showLines = this.options.showMeshLines;
    const showGlow = this.options.showGlow;
    const glowIntensity = this.options.glowIntensity || 1.0;
    const pal = this.palette;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Canvas background
    ctx.fillStyle = pal.bgStyle;
    ctx.fillRect(0, 0, this.width, this.height);

    // 1. Faint connecting cloth lattice lines
    if (showLines) {
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = pal.meshLineStyle;
      ctx.beginPath();

      // Horizontal lines along cols
      for (let r = 0; r < rows; r++) {
        let drawing = false;
        for (let c = 0; c < cols; c++) {
          const p = this.particles[r * cols + c];
          if (!p.visible || p.depthFogAlpha < 0.02) {
            drawing = false;
            continue;
          }
          if (!drawing) {
            ctx.moveTo(p.screenX, p.screenY);
            drawing = true;
          } else {
            ctx.lineTo(p.screenX, p.screenY);
          }
        }
      }

      // Vertical lines along rows
      for (let c = 0; c < cols; c++) {
        let drawing = false;
        for (let r = 0; r < rows; r++) {
          const p = this.particles[r * cols + c];
          if (!p.visible || p.depthFogAlpha < 0.02) {
            drawing = false;
            continue;
          }
          if (!drawing) {
            ctx.moveTo(p.screenX, p.screenY);
            drawing = true;
          } else {
            ctx.lineTo(p.screenX, p.screenY);
          }
        }
      }
      ctx.stroke();
    }

    // 2. High-Performance Peak Glow / Bloom (GPU Sprite drawImage)
    if (showGlow && glowIntensity > 0 && this.glowCanvas) {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (!p.visible || p.elevationNorm < 0.68 || p.depthFogAlpha < 0.1) continue;

        const glowSize = p.screenRadius * (4.2 + p.elevationNorm * 3.0);
        const glowAlpha = (p.elevationNorm - 0.68) * 3.0 * (0.35 * glowIntensity) * p.depthFogAlpha;

        ctx.globalAlpha = Math.min(1.0, Math.max(0, glowAlpha));
        ctx.drawImage(
          this.glowCanvas,
          p.screenX - glowSize,
          p.screenY - glowSize,
          glowSize * 2,
          glowSize * 2
        );
      }
      ctx.globalAlpha = 1.0;
    }

    // 3. Render Depth, Elevation & Specular Shaded Dots
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.visible || p.depthFogAlpha < 0.01) continue;

      const norm = p.elevationNorm;
      const rad = p.screenRadius;

      // Hue-accurate interpolation: valley -> mid -> peak
      let rDot, gDot, bDot;
      if (norm < 0.5) {
        const f = norm * 2.0;
        rDot = Math.round(pal.vr + (pal.r - pal.vr) * f);
        gDot = Math.round(pal.vg + (pal.g - pal.vg) * f);
        bDot = Math.round(pal.vb + (pal.b - pal.vb) * f);
      } else {
        const f = (norm - 0.5) * 2.0;
        rDot = Math.round(pal.r + (pal.pr - pal.r) * f);
        gDot = Math.round(pal.g + (pal.pg - pal.g) * f);
        bDot = Math.round(pal.b + (pal.pb - pal.b) * f);
      }

      // Specular sheen blend
      if (p.specular > 0.05) {
        const specFactor = Math.min(1.0, p.specular) * 0.75;
        rDot = Math.round(rDot + (255 - rDot) * specFactor);
        gDot = Math.round(gDot + (255 - gDot) * specFactor);
        bDot = Math.round(bDot + (255 - bDot) * specFactor);
      }

      const baseAlpha = 0.25 + norm * 0.75;
      const finalAlpha = Math.max(0, Math.min(1, baseAlpha * p.depthFogAlpha));

      ctx.fillStyle = `rgba(${rDot}, ${gDot}, ${bDot}, ${finalAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.screenX, p.screenY, rad, 0, Math.PI * 2);
      ctx.fill();
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

export { ClothWave as ClothWaveEngine };
export default ClothWave;
