/**
 * StackedPanels.js — Interactive 3D Isometric Stacked-Panel Wave Animation
 * 
 * High-Performance 60+ FPS Canvas 2D isometric rendering engine featuring
 * monolithic rectangular panels with anchored bottom edges, interactive
 * spring-damper wave propagation, and minimalist dark aesthetics.
 */

export class StackedPanels {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      gridCols: 30,             // Number of columns along X
      gridRows: 30,             // Number of rows along Z
      panelWidth: 16,           // Width of each panel (X dimension)
      panelDepth: 8,            // Depth of each panel (Z dimension)
      panelSpacingX: 6,         // Gap between panels along X
      panelSpacingZ: 6,         // Gap between panels along Z
      baseHeight: 8,            // Resting base height (Y dimension)
      maxHeight: 68,            // Peak wave height under cursor (comfortably in-viewport)
      waveRadius: 220,          // Influence radius of cursor in world units
      springStiffness: 0.10,    // Spring tension for wave responsiveness
      springDamping: 0.86,      // Damping coefficient to prevent erratic oscillation
      waveDelayLag: 0.18,       // Delay lag between neighboring panels
      rippleIntensity: 0.20,    // Secondary concentric ripple elasticity
      theme: 'obsidian',        // 'obsidian' | 'titanium' | 'cyber-cyan' | 'amber-glow' | 'emerald-matrix'
      isoAngle: 30,             // Isometric projection elevation angle (degrees)
      outlineWidth: 1.0,        // Outline stroke thickness
      scanlines: false,         // Optional subtle retro CRT scanlines
      ambientBreathing: true,   // Continuous rolling ocean waves
      interactive: true,        // Mouse hover interaction
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
    this.rafId = null;
    this.startTime = performance.now();
    this.lastTime = this.startTime;
    this.isRunning = false;

    // Mouse Interaction in Screen & World Coordinates
    this.mouse = {
      screenX: -9999,
      screenY: -9999,
      targetWorldX: -9999,
      targetWorldZ: -9999,
      currentWorldX: -9999,
      currentWorldZ: -9999,
      isHovering: false,
      lastMoveTime: performance.now()
    };

    this.shockwaves = [];
    this.panels = [];

    this.handleResize();
    this.initGrid();
    this.bindEvents();
    this.start();
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Grid & Panel Geometry Setup
  // ─────────────────────────────────────────────────────────────
  initGrid() {
    this.panels = [];
    const cols = this.options.gridCols;
    const rows = this.options.gridRows;

    const stepX = this.options.panelWidth + this.options.panelSpacingX;
    const stepZ = this.options.panelDepth + this.options.panelSpacingZ;

    const totalWorldWidth = cols * stepX;
    const totalWorldDepth = rows * stepZ;

    // Center grid at (0, 0) in world space
    const startX = -totalWorldWidth * 0.5 + stepX * 0.5;
    const startZ = -totalWorldDepth * 0.5 + stepZ * 0.5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = startX + c * stepX;
        const wz = startZ + r * stepZ;

        this.panels.push({
          col: c,
          row: r,
          wx: wx,
          wz: wz,
          currentH: this.options.baseHeight,
          targetH: this.options.baseHeight,
          velocityH: 0,
          depthOrder: c + r, // For isometric back-to-front sorting
          activeFactor: 0    // Normalized 0..1 elevation for lighting
        });
      }
    }

    // Sort panels back-to-front (lowest depthOrder to highest)
    this.panels.sort((a, b) => a.depthOrder - b.depthOrder);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Color Themes & Shading Palettes
  // ─────────────────────────────────────────────────────────────
  getThemePalette(themeName) {
    const t = (themeName || this.options.theme || 'obsidian').toLowerCase();
    if (t.includes('titanium')) {
      return {
        name: 'Titanium Silver',
        bg: '#000000',
        topFace: '#1a1d26',
        topActive: '#ffffff',
        leftFace: '#0a0c12',
        leftActive: '#363d4e',
        rightFace: '#11141c',
        rightActive: '#555f7a',
        outline: 'rgba(255, 255, 255, 0.14)',
        outlineActive: '#ffffff',
        accent: '#ffffff'
      };
    } else if (t.includes('cyan') || t.includes('cyber')) {
      return {
        name: 'Cyberpunk Cyan',
        bg: '#000000',
        topFace: '#082233',
        topActive: '#00f0ff',
        leftFace: '#020a10',
        leftActive: '#003d52',
        rightFace: '#041420',
        rightActive: '#006688',
        outline: 'rgba(0, 240, 255, 0.14)',
        outlineActive: '#ffffff',
        accent: '#00f0ff'
      };
    } else if (t.includes('amber') || t.includes('gold')) {
      return {
        name: 'Amber Monolith',
        bg: '#000000',
        topFace: '#241404',
        topActive: '#ffb830',
        leftFace: '#0d0701',
        leftActive: '#522b04',
        rightFace: '#170c02',
        rightActive: '#854606',
        outline: 'rgba(255, 184, 48, 0.14)',
        outlineActive: '#fff3cc',
        accent: '#ffb830'
      };
    } else if (t.includes('emerald') || t.includes('matrix')) {
      return {
        name: 'Emerald Matrix',
        bg: '#000000',
        topFace: '#062412',
        topActive: '#00ff88',
        leftFace: '#020d06',
        leftActive: '#004724',
        rightFace: '#03180c',
        rightActive: '#00733a',
        outline: 'rgba(0, 255, 136, 0.14)',
        outlineActive: '#ccffe6',
        accent: '#00ff88'
      };
    } else {
      // Obsidian Stealth (Primary Top with Distinct Secondary Facets)
      return {
        name: 'Obsidian Stealth',
        bg: '#000000',
        topFace: '#141720',
        topActive: '#ffffff',
        leftFace: '#06070a',
        leftActive: '#1c202a',
        rightFace: '#0b0e14',
        rightActive: '#2e3444',
        outline: 'rgba(255, 255, 255, 0.12)',
        outlineActive: 'rgba(255, 255, 255, 0.95)',
        accent: '#ffffff'
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. 3D Isometric Projection & Screen Coordinates
  // ─────────────────────────────────────────────────────────────
  project(wx, wy, wz) {
    const rad = (this.options.isoAngle * Math.PI) / 180;
    const cosAngle = Math.cos(rad);
    const sinAngle = Math.sin(rad);

    // True 2.5D / 3D Isometric Transformation
    // Screen X comes from difference between X and Z
    const screenX = this.width * 0.5 + (wx - wz) * cosAngle;
    // Screen Y comes from sum of X and Z minus vertical height Y
    const screenY = this.height * 0.52 + (wx + wz) * sinAngle - wy;

    return { x: screenX, y: screenY };
  }

  // Inverse projection: Map screen (sx, sy) to ground plane (wx, wz, wy = 0)
  unprojectGround(sx, sy) {
    const rad = (this.options.isoAngle * Math.PI) / 180;
    const cosAngle = Math.cos(rad);
    const sinAngle = Math.sin(rad);

    const relX = sx - this.width * 0.5;
    const relY = sy - this.height * 0.52;

    const termA = relX / cosAngle;
    const termB = relY / sinAngle;

    const wx = (termA + termB) * 0.5;
    const wz = (termB - termA) * 0.5;

    return { wx, wz };
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Event Listeners & Interaction
  // ─────────────────────────────────────────────────────────────
  bindEvents() {
    this._onResize = () => this.handleResize();
    window.addEventListener('resize', this._onResize);

    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.screenX = clientX - rect.left;
      this.mouse.screenY = clientY - rect.top;

      const ground = this.unprojectGround(this.mouse.screenX, this.mouse.screenY);
      this.mouse.targetWorldX = ground.wx;
      this.mouse.targetWorldZ = ground.wz;
      this.mouse.isHovering = true;
      this.mouse.lastMoveTime = performance.now();
    };

    this.canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHovering = false;
      this.mouse.targetWorldX = -9999;
      this.mouse.targetWorldZ = -9999;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.isHovering = false;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const ground = this.unprojectGround(e.clientX - rect.left, e.clientY - rect.top);
      this.triggerShockwave(ground.wx, ground.wz);
    });
  }

  triggerShockwave(originWx = 0, originWz = 0) {
    this.shockwaves.push({
      wx: originWx,
      wz: originWz,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 0.55,
      speed: 380,
      strength: 1.0,
      decay: 1.2
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

  setOption(key, val) {
    if (key === 'gridCols' || key === 'gridRows' || key === 'density') {
      if (key === 'density') {
        const d = parseInt(val, 10);
        this.options.gridCols = d;
        this.options.gridRows = d;
      } else {
        this.options[key] = val;
      }
      this.initGrid();
      return;
    }
    this.options[key] = val;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.isRunning) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

      this.update(dt, (time - this.startTime) / 1000);
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

  // ─────────────────────────────────────────────────────────────
  // 5. Physics Simulation & Spring-Damper Wave Elevation
  // ─────────────────────────────────────────────────────────────
  update(dt, elapsed) {
    if (this.mouse.isHovering) {
      if (this.mouse.currentWorldX === -9999) {
        this.mouse.currentWorldX = this.mouse.targetWorldX;
        this.mouse.currentWorldZ = this.mouse.targetWorldZ;
      } else {
        const mRate = 1.0 - Math.exp(-24.0 * dt);
        this.mouse.currentWorldX += (this.mouse.targetWorldX - this.mouse.currentWorldX) * mRate;
        this.mouse.currentWorldZ += (this.mouse.targetWorldZ - this.mouse.currentWorldZ) * mRate;
      }
    } else {
      this.mouse.currentWorldX += (-9999 - this.mouse.currentWorldX) * (12.0 * dt);
      this.mouse.currentWorldZ += (-9999 - this.mouse.currentWorldZ) * (12.0 * dt);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.strength -= sw.decay * dt;
      if (sw.strength <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    const baseH = this.options.baseHeight;
    const maxH = this.options.maxHeight;
    const waveR = this.options.waveRadius;
    const rippleK = 0.045;

    const mx = this.mouse.currentWorldX;
    const mz = this.mouse.currentWorldZ;
    const hasMouse = this.mouse.isHovering && mx > -9000;
    const ambientWave = this.options.ambientBreathing;

    const lerpRate = (hasMouse ? 14.0 : 8.0);
    const springFactor = 1.0 - Math.exp(-lerpRate * dt);

    for (let i = 0, len = this.panels.length; i < len; i++) {
      const p = this.panels[i];
      let targetElevation = 0;

      // Mouse Wave Height
      if (hasMouse) {
        const dx = p.wx - mx;
        const dz = p.wz - mz;
        const dist = Math.hypot(dx, dz);

        if (dist < waveR * 1.6) {
          const normDist = dist / waveR;
          const gaussian = Math.exp(-(normDist * normDist) * 2.2);
          const ripple = Math.cos(dist * rippleK - elapsed * 5.0) * this.options.rippleIntensity;
          const combined = Math.max(0, gaussian + ripple * gaussian);
          targetElevation += (maxH - baseH) * combined;
        }
      }

      // Shockwave Elevation
      for (const sw of this.shockwaves) {
        const dx = p.wx - sw.wx;
        const dz = p.wz - sw.wz;
        const dist = Math.hypot(dx, dz);
        const ringDiff = Math.abs(dist - sw.radius);

        if (ringDiff < 55) {
          const ringFactor = (1 - ringDiff / 55) * Math.sin((1 - ringDiff / 55) * Math.PI);
          targetElevation += (maxH * 0.85) * ringFactor * sw.strength;
        }
      }

      // Ambient Rolling Ocean Swells (Multi-frequency Gerstner/Harmonic Waves)
      if (ambientWave) {
        const u = p.wx * 0.007;
        const v = p.wz * 0.007;
        const swell1 = Math.sin(u * 1.4 + v * 1.1 - elapsed * 2.4);
        const swell2 = Math.sin(u * 2.0 - v * 1.6 - elapsed * 1.7) * 0.65;
        const swell3 = Math.cos(u * 0.9 + v * 1.8 + elapsed * 1.2) * 0.45;
        const chop = Math.sin(u * 3.2 + v * 3.2 - elapsed * 3.4) * 0.22;
        
        const rawWave = swell1 + swell2 + swell3 + chop;
        const crest = Math.sign(rawWave) * Math.pow(Math.abs(rawWave) / 2.3, 1.25) * 2.3;
        const oceanElevation = (crest + 0.6) * 7.5;
        targetElevation += oceanElevation;
      }

      p.targetH = baseH + targetElevation;

      // Ultra-smooth spring easing
      p.currentH += (p.targetH - p.currentH) * springFactor;
      if (p.currentH < 2) p.currentH = 2;
      p.activeFactor = Math.max(0, Math.min(1, (p.currentH - baseH) / Math.max(1, maxH - baseH)));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Isometric 3D Monolith Panel Rendering
  // ─────────────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const palette = this.getThemePalette(this.options.theme);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const halfW = this.options.panelWidth * 0.5;
    const halfD = this.options.panelDepth * 0.5;
    const outlineW = this.options.outlineWidth;

    const rad = (this.options.isoAngle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.52;

    // Precalculate 4 isometric ground corner offsets (0 allocations per panel)
    const ox0 = (-halfW + halfD) * cosA;
    const oy0 = (-halfW - halfD) * sinA;
    const ox1 = (halfW + halfD) * cosA;
    const oy1 = (halfW - halfD) * sinA;
    const ox2 = (halfW - halfD) * cosA;
    const oy2 = (halfW + halfD) * sinA;
    const ox3 = (-halfW - halfD) * cosA;
    const oy3 = (-halfW + halfD) * sinA;

    // Render Panels in Depth Order (Back to Front)
    for (let i = 0, len = this.panels.length; i < len; i++) {
      const p = this.panels[i];
      const wx = p.wx;
      const wz = p.wz;
      const h = p.currentH;
      const act = p.activeFactor;

      const scx = centerX + (wx - wz) * cosA;
      const sby = centerY + (wx + wz) * sinA;
      const sty = sby - h;

      // 4 Bottom corners
      const b0x = scx + ox0, b0y = sby + oy0;
      const b1x = scx + ox1, b1y = sby + oy1;
      const b2x = scx + ox2, b2y = sby + oy2;
      const b3x = scx + ox3, b3y = sby + oy3;

      // 4 Top corners
      const t0x = scx + ox0, t0y = sty + oy0;
      const t1x = scx + ox1, t1y = sty + oy1;
      const t2x = scx + ox2, t2y = sty + oy2;
      const t3x = scx + ox3, t3y = sty + oy3;

      // Left Face (Secondary Deep Facet): b3 -> b2 -> t2 -> t3
      ctx.beginPath();
      ctx.moveTo(b3x, b3y);
      ctx.lineTo(b2x, b2y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(t3x, t3y);
      ctx.closePath();
      ctx.fillStyle = act > 0.02 ? this.lerpColor(palette.leftFace, palette.leftActive, act) : palette.leftFace;
      ctx.fill();
      ctx.strokeStyle = act > 0.3 ? palette.outlineActive : palette.outline;
      ctx.lineWidth = outlineW;
      ctx.stroke();

      // Right Face (Secondary Midtone Facet): b2 -> b1 -> t1 -> t2
      ctx.beginPath();
      ctx.moveTo(b2x, b2y);
      ctx.lineTo(b1x, b1y);
      ctx.lineTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.closePath();
      ctx.fillStyle = act > 0.02 ? this.lerpColor(palette.rightFace, palette.rightActive, act) : palette.rightFace;
      ctx.fill();
      ctx.strokeStyle = act > 0.3 ? palette.outlineActive : palette.outline;
      ctx.lineWidth = outlineW;
      ctx.stroke();

      // Top Face (Primary Highlight Cap): t0 -> t1 -> t2 -> t3
      ctx.beginPath();
      ctx.moveTo(t0x, t0y);
      ctx.lineTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(t3x, t3y);
      ctx.closePath();
      ctx.fillStyle = act > 0.04 ? this.lerpColor(palette.topFace, palette.topActive, Math.pow(act, 0.75)) : palette.topFace;
      ctx.fill();
      ctx.strokeStyle = act > 0.25 ? palette.outlineActive : palette.outline;
      ctx.lineWidth = outlineW;
      ctx.stroke();
    }

    if (this.options.scanlines) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let y = 0; y < this.height; y += 4) {
        ctx.fillRect(0, y, this.width, 1.5);
      }
    }

    ctx.restore();
  }

  lerpColor(hexA, hexB, t) {
    if (t <= 0) return hexA;
    if (t >= 1) return hexB;

    const parse = (hex) => {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    };

    try {
      const [r1, g1, b1] = parse(hexA.startsWith('#') ? hexA : '#191922');
      const [r2, g2, b2] = parse(hexB.startsWith('#') ? hexB : '#f8fafc');
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } catch {
      return hexA;
    }
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
