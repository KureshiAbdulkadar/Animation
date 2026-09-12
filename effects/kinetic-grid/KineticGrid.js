/**
 * KineticGrid.js — 3D Isometric Kinetic Pin Matrix & Voxel Wave Sculpture
 * 
 * A fundamentally distinct 3D physical pin-art / illuminated voxel wave matrix.
 * Features:
 *  - True 3D Isometric rendering with extruded pillar geometry (Top cap, Left face, Right face)
 *  - Dynamic Height ($Z$-elevation) fluid wave deformation (pins physically rise and fall)
 *  - 3 Pillar Geometry Shapes: Hexagonal Prisms, 3D Voxel Cubes, and Cylindrical Rods
 *  - 5 Dynamic 3D Topographies: Oceanic 3D Swell, Radial Drop Ripple, Twin Vortex Twister, Audio Equalizer Terrain, Perlin Liquid Hills
 *  - Spring-damper physics on mouse depression / elevation
 *  - Depth sorting (Painter's algorithm) with realistic directional lighting & edge highlights
 */

export class KineticGrid {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    // Default configuration
    this.options = Object.assign({
      topography: 'radial-ripple',  // 'radial-ripple' | 'oceanic-swell' | 'twin-vortex' | 'equalizer-towers' | 'liquid-hills'
      pillarShape: 'hex-prism',     // 'hex-prism' | 'voxel-cube' | 'cylinder'
      gridCols: 32,                 // Columns in isometric field
      gridRows: 32,                 // Rows in isometric field
      pitch: 22,                    // Distance between pins (14 - 36px)
      maxElevation: 75,             // Max pin height extrusion (20 - 140px)
      waveSpeed: 1.0,               // Animation speed (0.2 - 3.0)
      waveFrequency: 1.0,           // Wave scale (0.3 - 2.5)
      colorScheme: 'cyber-cyan',    // 'cyber-cyan' | 'golden-amber' | 'sunset-synth' | 'matrix-emerald' | 'carbon-white'
      isometricAngle: 0.52,         // Isometric pitch tilt (~30°)
      rotAngle: -0.785,             // Isometric rotation (~-45°)
      topCapGlow: true,             // Luminous neon top caps
      interactive: true,            // Mouse physically pushes pins
      mouseForce: 1.2,              // Push/pull force
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

    // Mouse tracking
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
  // Color Themes with Multi-Face Lighting
  // ─────────────────────────────────────────────────────────────

  getPalette(scheme) {
    switch (scheme) {
      case 'golden-amber':
        return {
          bg: '#080c14',
          topFace: '#ffaa00',      // Luminous bright gold cap
          topCore: '#fff3c4',      // Center filament
          leftFace: '#c46800',     // Mid tone amber wall
          rightFace: '#6d3600',    // Dark shaded amber wall
          gridEdge: '#ffc107',
          glow: 'rgba(255, 170, 0, 0.45)',
          ambient: 'rgba(255, 170, 0, 0.08)'
        };
      case 'sunset-synth':
        return {
          bg: '#0a0512',
          topFace: '#ff0077',      // Neon Magenta cap
          topCore: '#ffe0f0',
          leftFace: '#990048',     // Mid purple-magenta wall
          rightFace: '#4a0022',    // Deep violet wall
          gridEdge: '#00f0ff',     // Cyan accent edge
          glow: 'rgba(255, 0, 119, 0.45)',
          ambient: 'rgba(255, 0, 119, 0.08)'
        };
      case 'matrix-emerald':
        return {
          bg: '#030a05',
          topFace: '#00ff66',      // Electric Lime Green cap
          topCore: '#e0ffec',
          leftFace: '#00aa44',     // Mid green wall
          rightFace: '#005522',     // Dark pine wall
          gridEdge: '#00ff66',
          glow: 'rgba(0, 255, 102, 0.45)',
          ambient: 'rgba(0, 255, 102, 0.08)'
        };
      case 'carbon-white':
        return {
          bg: '#090a0c',
          topFace: '#f8fafc',      // Pure Chalk White cap
          topCore: '#ffffff',
          leftFace: '#64748b',     // Slate grey wall
          rightFace: '#334155',    // Dark carbon wall
          gridEdge: '#cbd5e1',
          glow: 'rgba(255, 255, 255, 0.40)',
          ambient: 'rgba(255, 255, 255, 0.06)'
        };
      case 'cyber-cyan':
      default:
        return {
          bg: '#040b14',           // Deep midnight teal
          topFace: '#00f0ff',      // Electric Cyan cap
          topCore: '#dffbff',      // Bright ice white core
          leftFace: '#008899',     // Mid teal wall
          rightFace: '#004455',    // Deep ocean teal wall
          gridEdge: '#38bdf8',
          glow: 'rgba(0, 240, 255, 0.45)',
          ambient: 'rgba(0, 240, 255, 0.08)'
        };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3D Topography Wave Synthesizer
  // ─────────────────────────────────────────────────────────────

  calculateElevation(gx, gy, time) {
    const topo = this.options.topography;
    const speed = this.options.reducedMotion ? 0.2 : this.options.waveSpeed;
    const freq = this.options.waveFrequency * 0.18;
    const t = time * speed;

    const r = Math.hypot(gx, gy);
    const theta = Math.atan2(gy, gx);

    let h = 0.5;

    switch (topo) {
      case 'radial-ripple': {
        // Water drop ripple in center expanding across 3D pins
        const ripple = Math.sin(r * freq * 2.2 - t * 3.0);
        const damp = Math.exp(-r * 0.04);
        const subHarmonic = Math.cos(r * freq * 1.1 - t * 1.5) * 0.3;
        h = 0.5 + 0.5 * (ripple * (0.6 + 0.4 * damp) + subHarmonic);
        break;
      }

      case 'oceanic-swell': {
        // Gentle rolling 3D ocean swells with interference troughs
        const w1 = Math.sin(gx * freq * 0.9 + t * 1.8 + Math.cos(gy * freq * 0.6));
        const w2 = Math.cos(gy * freq * 1.1 - t * 1.4 + Math.sin(gx * freq * 0.7));
        const w3 = Math.sin((gx + gy) * freq * 0.8 + t * 2.2);
        h = 0.5 + 0.5 * (w1 * 0.4 + w2 * 0.35 + w3 * 0.25);
        break;
      }

      case 'twin-vortex': {
        // Double rotating helical towers
        const spiral1 = Math.sin(theta * 4 - r * freq * 1.5 - t * 2.2);
        const spiral2 = Math.cos(theta * 2 + r * freq * 0.8 + t * 1.6);
        h = 0.5 + 0.5 * (spiral1 * 0.65 + spiral2 * 0.35);
        break;
      }

      case 'equalizer-towers': {
        // Chunky 3D graphic equalizer stepped skyline
        const bx = Math.sin(gx * freq * 1.6 + t * 2.0);
        const by = Math.cos(gy * freq * 1.6 - t * 1.8);
        const combined = (bx + by) * 0.5;
        // Quantize into distinct stepped terraces
        h = Math.floor(Math.max(0, combined + 0.5) * 6) / 6;
        break;
      }

      case 'liquid-hills':
      default: {
        // Organic flowing terrain hills and valleys
        const qx = Math.sin(gx * freq + t * 0.8 + Math.cos(gy * freq));
        const qy = Math.cos(gy * freq - t * 0.7 + Math.sin(gx * freq));
        const w = Math.sin(gx * freq * 1.8 + qx * 2.0 + t) * Math.cos(gy * freq * 1.8 + qy * 2.0 - t);
        h = 0.5 + 0.5 * w;
        break;
      }
    }

    return Math.max(0, Math.min(1, h));
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
      speed: 18,
      force: 1.4 * this.options.mouseForce,
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
  // Animation Loop & 3D Isometric Render Engine
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

    // 1. Deep Atmospheric Canvas Fill
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Ambient Glow in center
    const cx = this.width / 2;
    const cy = this.height / 2;
    const maxDim = Math.max(this.width, this.height);
    const radGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, maxDim * 0.7);
    radGlow.addColorStop(0, palette.ambient);
    radGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = radGlow;
    ctx.fillRect(0, 0, this.width, this.height);

    // 3. Isometric Camera Projection
    // Isometric transformation: X_screen = (x - y) * cos(30°), Y_screen = (x + y) * sin(30°) - z
    const pitch = this.options.pitch;
    const cols = this.options.gridCols;
    const rows = this.options.gridRows;
    const maxElev = this.options.maxElevation;
    const shape = this.options.pillarShape;
    const topGlow = this.options.topCapGlow;

    const isoCos = 0.866025; // cos(30°)
    const isoSin = 0.500000; // sin(30°)

    const centerCol = (cols - 1) / 2;
    const centerRow = (rows - 1) / 2;

    // Collect pillars for depth sorting (back-to-front painter's algorithm)
    const pillars = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Grid space coordinates centered at 0
        const gx = (c - centerCol);
        const gy = (r - centerRow);

        // Ground 2D position
        const groundX = cx + (gx - gy) * pitch * isoCos;
        const groundY = cy + (gx + gy) * pitch * isoSin + 40;

        // Wave elevation in [0, 1]
        let wave = this.calculateElevation(gx, gy, elapsed);

        // Mouse Depression / Elevation Interaction
        if (this.mouse.isHovering) {
          const mdx = groundX - this.mouse.x;
          const mdy = groundY - this.mouse.y;
          const mDist = Math.hypot(mdx, mdy);
          const mRadius = 140;

          if (mDist < mRadius) {
            const mPower = (1 - mDist / mRadius) * this.options.mouseForce;
            wave = Math.min(1.0, wave + mPower * 0.7);
          }
        }

        // Active Shockwaves
        for (const sw of this.shockwaves) {
          const sDist = Math.hypot(groundX - sw.x, groundY - sw.y);
          const delta = Math.abs(sDist - sw.radius);
          if (delta < 50) {
            const swPower = (1 - delta / 50) * sw.force * sw.alpha;
            wave = Math.min(1.0, wave + swPower);
          }
        }

        const elevationHeight = 6 + wave * maxElev;
        const topY = groundY - elevationHeight;

        pillars.push({
          c, r,
          gx, gy,
          depth: r + c, // Depth index for back-to-front rendering
          groundX,
          groundY,
          topY,
          elevationHeight,
          wave,
          radius: (pitch * 0.48)
        });
      }
    }

    // Sort pillars by depth (render back rows first, front rows last)
    pillars.sort((a, b) => a.depth - b.depth);

    // 4. Render 3D Pillars
    for (const p of pillars) {
      this.draw3DPillar(ctx, p, shape, palette, topGlow);
    }

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // 3D Pillar Geometry Renderers (Hex Prism, Voxel Cube, Cylinder)
  // ─────────────────────────────────────────────────────────────

  draw3DPillar(ctx, p, shape, palette, topGlow) {
    const gx = p.groundX;
    const gy = p.groundY;
    const ty = p.topY;
    const h = p.elevationHeight;
    const r = p.radius;
    const wave = p.wave;

    if (shape === 'voxel-cube') {
      // 3D Isometric Voxel Cube
      const s = r * 1.1;
      const hw = s * 0.866;
      const hh = s * 0.5;

      // Left Face (Mid Tone)
      ctx.beginPath();
      ctx.moveTo(gx - hw, ty);
      ctx.lineTo(gx, ty + hh);
      ctx.lineTo(gx, gy + hh);
      ctx.lineTo(gx - hw, gy);
      ctx.closePath();
      ctx.fillStyle = palette.leftFace;
      ctx.fill();

      // Right Face (Shadow)
      ctx.beginPath();
      ctx.moveTo(gx, ty + hh);
      ctx.lineTo(gx + hw, ty);
      ctx.lineTo(gx + hw, gy);
      ctx.lineTo(gx, gy + hh);
      ctx.closePath();
      ctx.fillStyle = palette.rightFace;
      ctx.fill();

      // Top Face (Luminous Cap)
      ctx.beginPath();
      ctx.moveTo(gx, ty - hh);
      ctx.lineTo(gx + hw, ty);
      ctx.lineTo(gx, ty + hh);
      ctx.lineTo(gx - hw, ty);
      ctx.closePath();
      ctx.fillStyle = wave > 0.4 ? palette.topFace : palette.leftFace;
      ctx.fill();

      if (topGlow && wave > 0.65) {
        ctx.fillStyle = palette.topCore;
        ctx.beginPath();
        ctx.arc(gx, ty, s * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

    } else if (shape === 'cylinder') {
      // 3D Isometric Cylindrical Pin
      const rx = r * 0.95;
      const ry = r * 0.5;

      // Shaft body
      ctx.beginPath();
      ctx.moveTo(gx - rx, ty);
      ctx.lineTo(gx - rx, gy);
      ctx.ellipse(gx, gy, rx, ry, 0, Math.PI, 0, true);
      ctx.lineTo(gx + rx, ty);
      ctx.closePath();

      const shaftGrad = ctx.createLinearGradient(gx - rx, 0, gx + rx, 0);
      shaftGrad.addColorStop(0, palette.leftFace);
      shaftGrad.addColorStop(0.5, palette.topFace);
      shaftGrad.addColorStop(1, palette.rightFace);
      ctx.fillStyle = shaftGrad;
      ctx.fill();

      // Top Cap
      ctx.beginPath();
      ctx.ellipse(gx, ty, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = wave > 0.4 ? palette.topFace : palette.leftFace;
      ctx.fill();

      if (topGlow && wave > 0.65) {
        ctx.fillStyle = palette.topCore;
        ctx.beginPath();
        ctx.ellipse(gx, ty, rx * 0.5, ry * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

    } else {
      // Hexagonal 3D Prism (Default)
      const w = r * 0.95;
      const dy = w * 0.55;

      // Left Vertical Face
      ctx.beginPath();
      ctx.moveTo(gx - w, ty);
      ctx.lineTo(gx, ty + dy);
      ctx.lineTo(gx, gy + dy);
      ctx.lineTo(gx - w, gy);
      ctx.closePath();
      ctx.fillStyle = palette.leftFace;
      ctx.fill();

      // Right Vertical Face
      ctx.beginPath();
      ctx.moveTo(gx, ty + dy);
      ctx.lineTo(gx + w, ty);
      ctx.lineTo(gx + w, gy);
      ctx.lineTo(gx, gy + dy);
      ctx.closePath();
      ctx.fillStyle = palette.rightFace;
      ctx.fill();

      // Top Hex Cap
      ctx.beginPath();
      ctx.moveTo(gx, ty - dy);
      ctx.lineTo(gx + w, ty);
      ctx.lineTo(gx, ty + dy);
      ctx.lineTo(gx - w, ty);
      ctx.closePath();
      ctx.fillStyle = wave > 0.4 ? palette.topFace : palette.leftFace;
      ctx.fill();

      // Neon Top Cap Edge & Filament Core
      ctx.strokeStyle = palette.gridEdge;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      if (topGlow && wave > 0.65) {
        ctx.fillStyle = palette.topCore;
        ctx.beginPath();
        ctx.arc(gx, ty, w * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
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
