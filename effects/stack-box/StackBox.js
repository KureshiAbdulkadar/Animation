/**
 * StackBox.js — Interactive 3D Stack Box Layer Grid Animation
 * 
 * High-performance Canvas 2D engine rendering a grid of multi-layered 3D stacked
 * boxes with anchored floor foundations, two-tone facet shading, responsive
 * cursor hover pop physics, and continuous subtle floating motion.
 */

export class StackBox {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      gridCols: 18,              // Number of columns along X
      gridRows: 18,              // Number of rows along Z
      boxWidth: 28,              // Width of each box (X dimension)
      boxDepth: 28,              // Depth of each box (Z dimension)
      boxSpacingX: 12,           // Gap between boxes along X
      boxSpacingZ: 12,           // Gap between boxes along Z
      baseHeight: 6,             // Resting base height
      popHeight: 28,             // Extra lift height when hovered
      hoverRadius: 110,          // Radius of cursor pop influence
      springSpeed: 16.0,         // Spring easing responsiveness
      theme: 'obsidian',         // 'obsidian' | 'titanium' | 'cyber-cyan' | 'amber-glow' | 'emerald-matrix'
      isoAngle: 30,              // Isometric projection angle (degrees)
      outlineWidth: 1.0,         // Border outline width
      ambientMotion: true,       // Subtle idle floating motion
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

    this.mouse = {
      targetWorldX: -9999,
      targetWorldZ: -9999,
      currentWorldX: -9999,
      currentWorldZ: -9999,
      isHovering: false
    };

    this.shockwaves = [];
    this.boxes = [];

    this.handleResize();
    this.initGrid();
    this.bindEvents();
    this.start();
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Grid & Geometry Initialization
  // ─────────────────────────────────────────────────────────────
  initGrid() {
    this.boxes = [];
    const cols = this.options.gridCols;
    const rows = this.options.gridRows;

    const stepX = this.options.boxWidth + this.options.boxSpacingX;
    const stepZ = this.options.boxDepth + this.options.boxSpacingZ;

    const totalWidth = (cols - 1) * stepX;
    const totalDepth = (rows - 1) * stepZ;

    const startX = -totalWidth * 0.5;
    const startZ = -totalDepth * 0.5;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = startX + c * stepX;
        const wz = startZ + r * stepZ;

        this.boxes.push({
          c,
          r,
          wx,
          wz,
          currentH: this.options.baseHeight,
          targetH: this.options.baseHeight,
          plateH: this.options.baseHeight, // Floating top plate
          activeFactor: 0,
          depthOrder: r + c,
          phaseOffset: (c * 0.4 + r * 0.4)
        });
      }
    }

    // Deterministic back-to-front depth sort (lowest to highest)
    this.boxes.sort((a, b) => a.depthOrder - b.depthOrder);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Color Themes & Two-Tone Shading Palettes
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
      // Obsidian Stealth
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
  // 3. Ground Unprojection & Event Handling
  // ─────────────────────────────────────────────────────────────
  unprojectGround(sx, sy) {
    const rad = (this.options.isoAngle * Math.PI) / 180;
    const cosAngle = Math.cos(rad);
    const sinAngle = Math.sin(rad);

    const centerX = this.width * 0.5;
    const centerY = this.height * 0.52;

    const dx = sx - centerX;
    const dy = sy - centerY;

    const wx = (dx / cosAngle + dy / sinAngle) * 0.5;
    const wz = (dy / sinAngle - dx / cosAngle) * 0.5;

    return { wx, wz };
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());

    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      const ground = this.unprojectGround(sx, sy);
      this.mouse.targetWorldX = ground.wx;
      this.mouse.targetWorldZ = ground.wz;
      this.mouse.isHovering = true;
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
      maxRadius: Math.max(this.width, this.height) * 0.65,
      speed: 460,
      strength: 1.2,
      decay: 1.3
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

  setOptions(opts) {
    if (!opts) return;
    for (const [k, v] of Object.entries(opts)) {
      this.setOption(k, v);
    }
  }

  setTheme(themeName) {
    this.setOption('theme', themeName);
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
  // 4. Physics & Layered Pop Up Dynamics
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
    const popH = this.options.popHeight;
    const hoverR = this.options.hoverRadius;

    const mx = this.mouse.currentWorldX;
    const mz = this.mouse.currentWorldZ;
    const hasMouse = this.mouse.isHovering && mx > -9000;
    const ambient = this.options.ambientMotion;

    const springFactor = 1.0 - Math.exp(-this.options.springSpeed * dt);

    for (let i = 0, len = this.boxes.length; i < len; i++) {
      const b = this.boxes[i];
      let targetPop = 0;

      // 1. Direct Cursor Box Pop
      if (hasMouse) {
        const dist = Math.hypot(b.wx - mx, b.wz - mz);
        if (dist < hoverR) {
          const norm = dist / hoverR;
          // Smooth bell curve pop
          const popCurve = Math.exp(-Math.pow(norm * 2.4, 2));
          targetPop += popH * popCurve;
        }
      }

      // 2. Shockwave Pop Cascade
      for (const sw of this.shockwaves) {
        const dist = Math.hypot(b.wx - sw.wx, b.wz - sw.wz);
        const ringDiff = Math.abs(dist - sw.radius);
        if (ringDiff < 45) {
          const ringMag = (1.0 - ringDiff / 45) * Math.sin((1.0 - ringDiff / 45) * Math.PI);
          targetPop += (popH * 1.1) * ringMag * sw.strength;
        }
      }

      // 3. Subtle Ambient Floating Motion
      if (ambient) {
        const wave = Math.sin(elapsed * 1.8 + b.phaseOffset) * Math.cos(elapsed * 1.2 - b.phaseOffset * 0.7);
        targetPop += (wave + 1.0) * 0.5 * 3.5;
      }

      b.targetH = baseH + targetPop;

      // Continuous analytical spring easing
      b.currentH += (b.targetH - b.currentH) * springFactor;
      if (b.currentH < 2) b.currentH = 2;

      // Floating top plate elevates slightly higher for true 3D layered parallax
      const plateTarget = b.targetH + (targetPop > 1 ? 4.0 : 0);
      b.plateH += (plateTarget - b.plateH) * springFactor;

      b.activeFactor = Math.max(0, Math.min(1, (b.currentH - baseH) / (popH || 1)));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Zero-Allocation 3D Isometric Stack Box Rendering
  // ─────────────────────────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const palette = this.getThemePalette(this.options.theme);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const halfW = this.options.boxWidth * 0.5;
    const halfD = this.options.boxDepth * 0.5;
    const outlineW = this.options.outlineWidth;

    const rad = (this.options.isoAngle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.52;

    // Precalculated 4 corner ground offsets (0 object allocations)
    const ox0 = (-halfW + halfD) * cosA;
    const oy0 = (-halfW - halfD) * sinA;
    const ox1 = (halfW + halfD) * cosA;
    const oy1 = (halfW - halfD) * sinA;
    const ox2 = (halfW - halfD) * cosA;
    const oy2 = (halfW + halfD) * sinA;
    const ox3 = (-halfW - halfD) * cosA;
    const oy3 = (-halfW + halfD) * sinA;

    // Floating cap inset (20% inset for layered stack bevel)
    const capInset = 0.88;
    const capOx0 = ox0 * capInset, capOy0 = oy0 * capInset;
    const capOx1 = ox1 * capInset, capOy1 = oy1 * capInset;
    const capOx2 = ox2 * capInset, capOy2 = oy2 * capInset;
    const capOx3 = ox3 * capInset, capOy3 = oy3 * capInset;

    for (let i = 0, len = this.boxes.length; i < len; i++) {
      const b = this.boxes[i];
      const wx = b.wx;
      const wz = b.wz;
      const h = b.currentH;
      const ph = b.plateH;
      const act = b.activeFactor;

      const scx = centerX + (wx - wz) * cosA;
      const sby = centerY + (wx + wz) * sinA;
      const sty = sby - h;
      const spty = sby - ph;

      // Bottom 4 corners
      const b0x = scx + ox0, b0y = sby + oy0;
      const b1x = scx + ox1, b1y = sby + oy1;
      const b2x = scx + ox2, b2y = sby + oy2;
      const b3x = scx + ox3, b3y = sby + oy3;

      // Body Top 4 corners
      const t0x = scx + ox0, t0y = sty + oy0;
      const t1x = scx + ox1, t1y = sty + oy1;
      const t2x = scx + ox2, t2y = sty + oy2;
      const t3x = scx + ox3, t3y = sty + oy3;

      // Left Face (Secondary Deep Facet)
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

      // Right Face (Secondary Midtone Facet)
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

      // Body Rim Face
      ctx.beginPath();
      ctx.moveTo(t0x, t0y);
      ctx.lineTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.lineTo(t3x, t3y);
      ctx.closePath();
      ctx.fillStyle = palette.topFace;
      ctx.fill();
      ctx.strokeStyle = act > 0.25 ? palette.outlineActive : palette.outline;
      ctx.lineWidth = outlineW;
      ctx.stroke();

      // Floating Top Plate Layer (Primary Accent Cap)
      const cp0x = scx + capOx0, cp0y = spty + capOy0;
      const cp1x = scx + capOx1, cp1y = spty + capOy1;
      const cp2x = scx + capOx2, cp2y = spty + capOy2;
      const cp3x = scx + capOx3, cp3y = spty + capOy3;

      ctx.beginPath();
      ctx.moveTo(cp0x, cp0y);
      ctx.lineTo(cp1x, cp1y);
      ctx.lineTo(cp2x, cp2y);
      ctx.lineTo(cp3x, cp3y);
      ctx.closePath();
      ctx.fillStyle = act > 0.04 ? this.lerpColor(palette.topFace, palette.topActive, Math.pow(act, 0.72)) : palette.topFace;
      ctx.fill();
      ctx.strokeStyle = act > 0.2 ? palette.outlineActive : palette.outline;
      ctx.lineWidth = outlineW;
      ctx.stroke();
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
      if (hexA.startsWith('#') && hexB.startsWith('#')) {
        const [r1, g1, b1] = parse(hexA);
        const [r2, g2, b2] = parse(hexB);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    } catch (e) {
      return hexA;
    }
    return hexA;
  }
}

export { StackBox as StackBoxEngine };
export default StackBox;
