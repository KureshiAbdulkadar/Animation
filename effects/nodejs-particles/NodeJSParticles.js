/**
 * NodeJSParticles.js (Pixel Edition)
 * 
 * High-performance Canvas Pixel Matrix & Particle Renderer for the Official Node.js Logo.
 * Features:
 *  - Faithful Official Node.js Logo models (3D Faceted Hexagon Emblem, Full "node.js" Wordmark,
 *    Iconic 'N' Cutout Matrix, and 3D Isometric Extruded Voxel Node)
 *  - Pixel-Art Rendering Engine with multiple pixel modes (Square 8-Bit, Rounded Voxels, CRT Phosphor Glow, 3D Voxel Cubes, Matrix Bits)
 *  - Real-time Interactive Physics: Mouse dispersion shockwaves with magnetic spring-back grid restoration
 *  - Configurable Pixel Pitch / Chunkiness (from retro 18px 8-bit blocks to ultra-fine 3px digital matrix)
 *  - Tri-tone Official Node.js Color Palette (#83CD29, #43853D, #339933, #215732) + Cyber, Matrix, GameBoy, Chalk & Gold themes
 *  - Atmospheric digital pixel rain streams, CRT scanlines & subtle 3D mouse parallax
 */

export class NodeJSParticles {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    // Configuration options
    this.options = Object.assign({
      logoMode: 'emblem',        // 'emblem' | 'wordmark' | 'n-cutout' | 'voxel3d'
      pixelStyle: 'square',      // 'square' | 'rounded' | 'phosphor' | 'voxel' | 'matrix'
      pixelPitch: 10,            // Pixel block size (4 - 24px)
      colorScheme: 'official',   // 'official' | 'emerald' | 'matrix' | 'gameboy' | 'silver' | 'synth' | 'gold'
      logoSize: 1.0,             // Scale multiplier (0.5 - 2.0)
      brightness: 1.2,           // Glow and brightness multiplier
      swaySpeed: 1.0,            // Floating sway speed multiplier
      rainIntensity: 1.0,        // Pixel rain streams multiplier
      scanlines: true,           // CRT scanline overlay
      interactive: true,         // Mouse disruption physics
      scatterForce: 1.0,         // Mouse dispersion strength
      reducedMotion: false,      // Respect prefers-reduced-motion
      dprCap: 2                  // Cap devicePixelRatio for performance
    }, options);

    // Canvas & context
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

    // Mouse & physics tracking
    this.mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      prevX: -9999,
      prevY: -9999,
      vx: 0,
      vy: 0,
      isDown: false,
      isHovering: false
    };

    // Ripple shockwaves
    this.shockwaves = [];

    // System preferences
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.options.reducedMotion = true;
    }

    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (this.isMobile) {
      this.options.pixelPitch = Math.max(12, this.options.pixelPitch);
    }

    // Storage
    this.pixels = [];
    this.rainDrops = [];

    // Initialize systems
    this.handleResize();
    this.initLogoPixels();
    this.initRain();
    this.bindEvents();
    this.start();
  }

  // ─────────────────────────────────────────────────────────────
  // Color Themes
  // ─────────────────────────────────────────────────────────────

  getColorPalette(scheme) {
    switch (scheme) {
      case 'official':
        return {
          topFacet: '#83cd29',     // Official Light Lime-Green
          leftFacet: '#43853d',    // Official Mid-Green
          rightFacet: '#215732',   // Official Dark Forest-Green
          accent: '#339933',       // Official Node Green
          wordmark: '#ffffff',     // Clean White
          textAccent: '#83cd29',   // Highlight
          glow: 'rgba(131, 205, 41, 0.45)',
          rain: '#539e43',
          backgroundGlow: 'rgba(51, 153, 51, 0.08)'
        };
      case 'emerald':
        return {
          topFacet: '#4ade80',
          leftFacet: '#16a34a',
          rightFacet: '#065f46',
          accent: '#22c55e',
          wordmark: '#f0fdf4',
          textAccent: '#86efac',
          glow: 'rgba(74, 222, 128, 0.5)',
          rain: '#22c55e',
          backgroundGlow: 'rgba(34, 197, 94, 0.1)'
        };
      case 'matrix':
        return {
          topFacet: '#00ff41',
          leftFacet: '#00bb2d',
          rightFacet: '#005510',
          accent: '#00ff41',
          wordmark: '#d0ffd0',
          textAccent: '#00ff41',
          glow: 'rgba(0, 255, 65, 0.6)',
          rain: '#00ff41',
          backgroundGlow: 'rgba(0, 255, 65, 0.09)'
        };
      case 'gameboy':
        return {
          topFacet: '#9bbc0f',     // Lightest GB green
          leftFacet: '#8bac0f',    // Mid-light
          rightFacet: '#0f380f',   // Darkest
          accent: '#306230',       // Mid-dark
          wordmark: '#9bbc0f',
          textAccent: '#8bac0f',
          glow: 'rgba(155, 188, 15, 0.35)',
          rain: '#8bac0f',
          backgroundGlow: 'rgba(139, 172, 15, 0.06)'
        };
      case 'synth':
        return {
          topFacet: '#f43f5e',     // Neon Rose
          leftFacet: '#a855f7',    // Neon Purple
          rightFacet: '#4338ca',    // Deep Indigo
          accent: '#06b6d4',       // Cyan
          wordmark: '#fdf4ff',
          textAccent: '#38bdf8',
          glow: 'rgba(244, 63, 94, 0.5)',
          rain: '#06b6d4',
          backgroundGlow: 'rgba(168, 85, 247, 0.1)'
        };
      case 'gold':
        return {
          topFacet: '#fde047',
          leftFacet: '#ca8a04',
          rightFacet: '#713f12',
          accent: '#eab308',
          wordmark: '#fefce8',
          textAccent: '#fde047',
          glow: 'rgba(253, 224, 71, 0.5)',
          rain: '#eab308',
          backgroundGlow: 'rgba(234, 179, 8, 0.08)'
        };
      case 'silver':
      default:
        return {
          topFacet: '#f8fafc',
          leftFacet: '#94a3b8',
          rightFacet: '#334155',
          accent: '#cbd5e1',
          wordmark: '#ffffff',
          textAccent: '#94a3b8',
          glow: 'rgba(255, 255, 255, 0.4)',
          rain: '#94a3b8',
          backgroundGlow: 'rgba(255, 255, 255, 0.06)'
        };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Authentic Node.js Pixel Matrix Generation
  // ─────────────────────────────────────────────────────────────

  initLogoPixels() {
    this.pixels = [];
    const pitch = Math.max(4, Math.min(28, this.options.pixelPitch));
    const mode = this.options.logoMode;
    const palette = this.getColorPalette(this.options.colorScheme);

    // Virtual grid dimensions
    if (mode === 'wordmark') {
      this.generateWordmarkPixels(pitch, palette);
    } else if (mode === 'n-cutout') {
      this.generateNCutoutPixels(pitch, palette);
    } else if (mode === 'voxel3d') {
      this.generateVoxel3DPixels(pitch, palette);
    } else {
      // Official Hexagon Emblem
      this.generateEmblemPixels(pitch, palette);
    }
  }

  /**
   * Mode 1: Official Node.js 3D Faceted Hexagon Emblem in crisp pixel art
   */
  generateEmblemPixels(pitch, palette) {
    // Hexagon parameters in grid space
    const radius = Math.floor(140 * this.options.logoSize);
    const cols = Math.ceil((radius * 2.2) / pitch);
    const rows = Math.ceil((radius * 2.4) / pitch);

    const centerC = Math.floor(cols / 2);
    const centerR = Math.floor(rows / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Position relative to center in pixel units
        const px = (c - centerC) * pitch;
        const py = (r - centerR) * pitch;

        // Check if inside standard 3D hexagon:
        // Vertex top: (0, -radius), Vertex bottom: (0, radius)
        // Vertex top-right: (radius * 0.866, -radius * 0.5)
        // Vertex bot-right: (radius * 0.866, radius * 0.5)
        // Vertex bot-left: (-radius * 0.866, radius * 0.5)
        // Vertex top-left: (-radius * 0.866, -radius * 0.5)
        const nx = px / (radius * 0.866);
        const ny = py / radius;

        // Hexagon bounds equation: max(|ny|, |nx * 0.5| + |ny * 0.866|) <= 1.0 (for vertical orientation)
        const qx = Math.abs(px) / (radius * 0.866025);
        const qy = Math.abs(py) / radius;
        const inHex = (qx * 0.5 + qy * 0.5 <= 0.5) && (qx <= 1.0);

        if (!inHex) continue;

        // Determine Facet / Region of Official Node.js Hexagon:
        // 1. Top Facet: Upper region (light green)
        // 2. Left Facet: Lower-left region (mid green)
        // 3. Right Facet: Lower-right region (dark green)
        // Isometric lines meet at center (0, 0)
        let facet = 'top';
        let color = palette.topFacet;
        let zDepth = 0;

        // Node leaf notch at top-right corner
        const isNotch = (px > radius * 0.35 && px < radius * 0.75 && py < -radius * 0.45 && py > -radius * 0.85);

        // Ridge lines
        const isCenterRidge = Math.abs(px) < pitch * 0.6 && py > 0;
        const isTopLeftRidge = Math.abs(py - (-px * 0.577)) < pitch * 0.7 && px < 0;
        const isTopRightRidge = Math.abs(py - (px * 0.577)) < pitch * 0.7 && px > 0;
        const isRidge = isCenterRidge || isTopLeftRidge || isTopRightRidge;

        if (py <= 0 && (py < -Math.abs(px) * 0.577 || py < 0 && Math.abs(px) < radius * 0.7)) {
          facet = 'top';
          color = isNotch ? '#9fe83c' : palette.topFacet;
          zDepth = 15 - (py / radius) * 10;
        } else if (px <= 0) {
          facet = 'left';
          color = palette.leftFacet;
          zDepth = 8 + (px / radius) * 8;
        } else {
          facet = 'right';
          color = palette.rightFacet;
          zDepth = 8 - (px / radius) * 8;
        }

        if (isRidge) {
          color = '#ffffff';
          zDepth += 8;
        }

        // Add to pixel buffer
        this.addPixel({
          gridCol: c - centerC,
          gridRow: r - centerR,
          originX: px,
          originY: py,
          originZ: zDepth,
          color,
          baseColor: color,
          pitch,
          facet,
          isRidge,
          isHighlight: isRidge || isNotch,
          char: this.getRandomHexChar()
        });
      }
    }
  }

  /**
   * Mode 2: Official "node.js" Pixel Wordmark (Hexagon Badge + Typography)
   */
  generateWordmarkPixels(pitch, palette) {
    // Create an offscreen canvas to render authentic high-res typography & rasterize to pixel grid
    const offWidth = 720;
    const offHeight = 220;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = offWidth;
    offCanvas.height = offHeight;
    const octx = offCanvas.getContext('2d', { willReadFrequently: true });

    // Clear background
    octx.clearRect(0, 0, offWidth, offHeight);

    // 1. Draw Official Node.js Hexagon Emblem at left: center (110, 110), radius 75
    const hx = 110, hy = 110, hr = 72;

    // Draw Top Facet
    octx.beginPath();
    octx.moveTo(hx, hy - hr);
    octx.lineTo(hx + hr * 0.866, hy - hr * 0.5);
    octx.lineTo(hx, hy);
    octx.lineTo(hx - hr * 0.866, hy - hr * 0.5);
    octx.closePath();
    octx.fillStyle = palette.topFacet;
    octx.fill();

    // Draw Left Facet
    octx.beginPath();
    octx.moveTo(hx - hr * 0.866, hy - hr * 0.5);
    octx.lineTo(hx, hy);
    octx.lineTo(hx, hy + hr);
    octx.lineTo(hx - hr * 0.866, hy + hr * 0.5);
    octx.closePath();
    octx.fillStyle = palette.leftFacet;
    octx.fill();

    // Draw Right Facet
    octx.beginPath();
    octx.moveTo(hx, hy);
    octx.lineTo(hx + hr * 0.866, hy - hr * 0.5);
    octx.lineTo(hx + hr * 0.866, hy + hr * 0.5);
    octx.lineTo(hx, hy + hr);
    octx.closePath();
    octx.fillStyle = palette.rightFacet;
    octx.fill();

    // Node leaf notch on top facet
    octx.beginPath();
    octx.moveTo(hx + hr * 0.4, hy - hr * 0.7);
    octx.lineTo(hx + hr * 0.7, hy - hr * 0.55);
    octx.lineTo(hx + hr * 0.55, hy - hr * 0.4);
    octx.closePath();
    octx.fillStyle = '#b4f54c';
    octx.fill();

    // 2. Draw Authentic "node.js" Typography
    octx.fillStyle = palette.wordmark;
    octx.font = 'bold 112px "JetBrains Mono", -apple-system, BlinkMacSystemFont, "Segoe UI", monospace';
    octx.textAlign = 'left';
    octx.textBaseline = 'middle';
    
    // Draw "node"
    octx.fillText('node', 210, 110);

    // Draw green dot "."
    octx.fillStyle = palette.accent;
    octx.fillText('.', 500, 110);

    // Draw "js"
    octx.fillStyle = palette.wordmark;
    octx.fillText('js', 545, 110);

    // 3. Scan offscreen canvas at pixel pitch intervals
    const imgData = octx.getImageData(0, 0, offWidth, offHeight);
    const data = imgData.data;

    const sampleStep = Math.max(4, Math.floor(pitch * 0.9));
    const halfW = offWidth / 2;
    const halfH = offHeight / 2;

    for (let y = 0; y < offHeight; y += sampleStep) {
      for (let x = 0; x < offWidth; x += sampleStep) {
        const idx = (y * offWidth + x) * 4;
        const a = data[idx + 3];

        if (a > 90) {
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Determine semantic color & depth
          let color = `rgb(${r},${g},${b})`;
          let isAccent = (g > 160 && r < 140) || (x < 190);
          let zDepth = isAccent ? 12 : 0;

          const px = (x - halfW) * (this.options.logoSize * 0.95);
          const py = (y - halfH) * (this.options.logoSize * 0.95);

          this.addPixel({
            gridCol: Math.round(px / pitch),
            gridRow: Math.round(py / pitch),
            originX: px,
            originY: py,
            originZ: zDepth,
            color: color,
            baseColor: color,
            pitch: sampleStep,
            facet: x < 190 ? 'emblem' : 'letter',
            isHighlight: isAccent,
            char: this.getRandomHexChar()
          });
        }
      }
    }
  }

  /**
   * Mode 3: Iconic High-Contrast 'N' Hexagon Cutout Emblem
   */
  generateNCutoutPixels(pitch, palette) {
    const radius = Math.floor(140 * this.options.logoSize);
    const cols = Math.ceil((radius * 2.2) / pitch);
    const rows = Math.ceil((radius * 2.4) / pitch);

    const centerC = Math.floor(cols / 2);
    const centerR = Math.floor(rows / 2);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = (c - centerC) * pitch;
        const py = (r - centerR) * pitch;

        const qx = Math.abs(px) / (radius * 0.866025);
        const qy = Math.abs(py) / radius;
        const inHex = (qx * 0.5 + qy * 0.5 <= 0.5) && (qx <= 1.0);

        if (!inHex) continue;

        // Inner 'N' shape definition:
        // Left pillar: px in [-48, -20], py in [-70, 70]
        // Right pillar: px in [20, 48], py in [-70, 70]
        // Diagonal: connecting (-20, -40) to (20, 40)
        const inLeftPillar = (px >= -radius * 0.38 && px <= -radius * 0.16 && Math.abs(py) <= radius * 0.65);
        const inRightPillar = (px >= radius * 0.16 && px <= radius * 0.38 && Math.abs(py) <= radius * 0.65);
        
        // Diagonal bridge slope
        const diagDist = Math.abs(py - (px * 1.7));
        const inDiagonal = (diagDist <= radius * 0.22 && px >= -radius * 0.22 && px <= radius * 0.22 && Math.abs(py) <= radius * 0.5);

        const isN = inLeftPillar || inRightPillar || inDiagonal;

        let color, facet, zDepth;

        if (isN) {
          color = '#ffffff';
          facet = 'n-cutout';
          zDepth = 22;
        } else {
          // Surrounding 3D faceted green background
          if (py <= 0 && py < -Math.abs(px) * 0.577) {
            color = palette.topFacet;
            facet = 'top';
            zDepth = 8;
          } else if (px <= 0) {
            color = palette.leftFacet;
            facet = 'left';
            zDepth = 4;
          } else {
            color = palette.rightFacet;
            facet = 'right';
            zDepth = 4;
          }
        }

        this.addPixel({
          gridCol: c - centerC,
          gridRow: r - centerR,
          originX: px,
          originY: py,
          originZ: zDepth,
          color,
          baseColor: color,
          pitch,
          facet,
          isHighlight: isN,
          char: isN ? 'N' : this.getRandomHexChar()
        });
      }
    }
  }

  /**
   * Mode 4: 3D Isometric Extruded Voxel Node
   */
  generateVoxel3DPixels(pitch, palette) {
    const radius = Math.floor(120 * this.options.logoSize);
    const layers = [-28, -14, 0, 14, 28]; // Multi-layer depth voxel stack

    for (const z of layers) {
      const layerScale = 1.0 - Math.abs(z) * 0.003;
      const rScale = radius * layerScale;
      const cols = Math.ceil((rScale * 2.2) / pitch);
      const rows = Math.ceil((rScale * 2.4) / pitch);
      const centerC = Math.floor(cols / 2);
      const centerR = Math.floor(rows / 2);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = (c - centerC) * pitch;
          const py = (r - centerR) * pitch;

          const qx = Math.abs(px) / (rScale * 0.866025);
          const qy = Math.abs(py) / rScale;
          const inHex = (qx * 0.5 + qy * 0.5 <= 0.5) && (qx <= 1.0);

          if (!inHex) continue;

          // Hollow cage or solid depending on depth
          const isRim = (qx * 0.5 + qy * 0.5 >= 0.38) || (qx >= 0.76);
          const isCore = Math.hypot(px, py) < rScale * 0.35 && z === 0;

          if (!isRim && !isCore && z !== 0) continue;

          let color;
          if (py <= 0) {
            color = palette.topFacet;
          } else if (px <= 0) {
            color = palette.leftFacet;
          } else {
            color = palette.rightFacet;
          }

          if (isCore) color = '#ffffff';

          this.addPixel({
            gridCol: c - centerC,
            gridRow: r - centerR,
            originX: px,
            originY: py,
            originZ: z,
            color,
            baseColor: color,
            pitch,
            facet: 'voxel3d',
            isHighlight: isCore || isRim,
            char: this.getRandomHexChar()
          });
        }
      }
    }
  }

  addPixel(config) {
    // Current animated position starts at origin
    const p = {
      ...config,
      x: config.originX,
      y: config.originY,
      z: config.originZ,
      vx: 0,
      vy: 0,
      vz: 0,
      // Projected coordinates for 3D camera
      projX: 0,
      projY: 0,
      projScale: 1,
      // Visual properties
      alpha: 0.85 + Math.random() * 0.15,
      baseAlpha: 0.85 + Math.random() * 0.15,
      flickerOffset: Math.random() * Math.PI * 2,
      flickerSpeed: 1.5 + Math.random() * 3.0,
      scale: 1.0,
      targetScale: 1.0,
      glitchOffset: 0
    };
    this.pixels.push(p);
  }

  getRandomHexChar() {
    const chars = '0123456789abcdefNODE';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  // ─────────────────────────────────────────────────────────────
  // Atmospheric Pixel Rain Streams
  // ─────────────────────────────────────────────────────────────

  initRain() {
    this.rainDrops = [];
    const count = Math.floor(90 * this.options.rainIntensity);

    for (let i = 0; i < count; i++) {
      this.rainDrops.push({
        x: (Math.random() - 0.2) * 1.4,
        y: Math.random(),
        z: 0.1 + Math.random() * 0.9,
        speed: 0.003 + Math.random() * 0.007,
        length: 8 + Math.random() * 24,
        char: this.getRandomHexChar(),
        alpha: 0.2 + Math.random() * 0.5
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Event Listeners & Interaction
  // ─────────────────────────────────────────────────────────────

  bindEvents() {
    this._onResize = () => this.handleResize();
    window.addEventListener('resize', this._onResize);

    this._onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      this.mouse.targetX = rawX - this.width / 2;
      this.mouse.targetY = rawY - this.height / 2;
      this.mouse.isHovering = true;
    };

    this._onMouseLeave = () => {
      this.mouse.targetX = -9999;
      this.mouse.targetY = -9999;
      this.mouse.isHovering = false;
    };

    this._onMouseDown = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left) - this.width / 2;
      const clickY = (e.clientY - rect.top) - this.height / 2;

      // Trigger explosive shockwave
      this.triggerShockwave(clickX, clickY);
    };

    // Touch support
    this._onTouchMove = (e) => {
      if (!e.touches[0]) return;
      const rect = this.canvas.getBoundingClientRect();
      const rawX = e.touches[0].clientX - rect.left;
      const rawY = e.touches[0].clientY - rect.top;

      this.mouse.targetX = rawX - this.width / 2;
      this.mouse.targetY = rawY - this.height / 2;
      this.mouse.isHovering = true;
    };

    this._onTouchEnd = () => {
      this.mouse.targetX = -9999;
      this.mouse.targetY = -9999;
      this.mouse.isHovering = false;
    };

    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseleave', this._onMouseLeave);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: true });
    this.canvas.addEventListener('touchend', this._onTouchEnd);
  }

  triggerShockwave(originX, originY) {
    this.shockwaves.push({
      x: originX,
      y: originY,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 0.45,
      speed: 16,
      force: 45 * this.options.scatterForce,
      alpha: 1.0
    });
  }

  handleResize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;

    const devicePixelRatio = window.devicePixelRatio || 1;
    this.dpr = Math.min(this.options.dprCap, devicePixelRatio);

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
  }

  // ─────────────────────────────────────────────────────────────
  // Animation Loop & Physics Update
  // ─────────────────────────────────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.isRunning) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05); // Cap delta to prevent tunneling
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

  update(dt, elapsed) {
    const reduced = this.options.reducedMotion;
    const swayFactor = reduced ? 0.15 : this.options.swaySpeed;

    // Smooth mouse interpolation
    if (this.mouse.isHovering) {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.2;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.2;
    } else {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    }

    // 3D Floating Sway and Tilt
    const rotY = Math.sin(elapsed * 0.65 * swayFactor) * 0.18 + (this.mouse.isHovering ? (this.mouse.x / this.width) * 0.35 : 0);
    const rotX = Math.cos(elapsed * 0.50 * swayFactor) * 0.12 + (this.mouse.isHovering ? -(this.mouse.y / this.height) * 0.25 : 0);
    const floatY = Math.sin(elapsed * 1.2 * swayFactor) * 8.0;

    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const cameraZ = 650;

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = 1.0 - (sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Physics parameters for spring-back restoration
    const springK = 0.085;    // Spring tension
    const friction = 0.82;    // Damping

    // Update each pixel
    for (let i = 0; i < this.pixels.length; i++) {
      const p = this.pixels[i];

      // 1. Mouse Interaction / Repulsion
      if (this.mouse.isHovering) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const dist = Math.hypot(dx, dy);
        const repelRadius = 120 * this.options.scatterForce;

        if (dist < repelRadius && dist > 1) {
          const power = Math.pow((1 - dist / repelRadius), 1.6) * (18 * this.options.scatterForce);
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * power;
          p.vy += Math.sin(angle) * power;
          p.vz += (Math.random() - 0.5) * power * 1.5;
        }
      }

      // 2. Shockwave disruption
      for (const sw of this.shockwaves) {
        const dx = p.x - sw.x;
        const dy = p.y - sw.y;
        const dist = Math.hypot(dx, dy);
        const waveDelta = Math.abs(dist - sw.radius);

        if (waveDelta < 35) {
          const waveForce = (1 - waveDelta / 35) * sw.force * sw.alpha;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * waveForce;
          p.vy += Math.sin(angle) * waveForce;
          p.vz += (Math.random() - 0.5) * waveForce * 2.0;
        }
      }

      // 3. Spring-back Hooke's Law towards original grid position
      const forceX = (p.originX - p.x) * springK;
      const forceY = (p.originY - p.y) * springK;
      const forceZ = (p.originZ - p.z) * springK;

      p.vx = (p.vx + forceX) * friction;
      p.vy = (p.vy + forceY) * friction;
      p.vz = (p.vz + forceZ) * friction;

      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // 4. 3D Camera Projection (Rotation & Perspective)
      // Rotate around Y
      let x1 = p.x * cosY + p.z * sinY;
      let y1 = p.y + floatY;
      let z1 = -p.x * sinY + p.z * cosY;

      // Rotate around X
      let x2 = x1;
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = y1 * sinX + z1 * cosX;

      const projScale = cameraZ / (cameraZ + z2);
      p.projX = x2 * projScale + this.width / 2;
      p.projY = y2 * projScale + this.height / 2;
      p.projScale = projScale;

      // Pixel Shimmer / Alpha flicker
      const flick = Math.sin(elapsed * p.flickerSpeed + p.flickerOffset);
      p.alpha = Math.max(0.15, Math.min(1.0, p.baseAlpha + flick * 0.15));

      // Occasional digital glitch jump
      if (Math.random() < 0.0006) {
        p.glitchOffset = (Math.random() - 0.5) * 12;
      } else {
        p.glitchOffset *= 0.8;
      }
    }

    // Sort pixels by depth (Z-buffer painter's algorithm)
    this.pixels.sort((a, b) => b.projScale - a.projScale);

    // Update Rain Drops
    for (const drop of this.rainDrops) {
      drop.y += drop.speed * (reduced ? 0.4 : 1.0);
      if (drop.y > 1.2) {
        drop.y = -0.2;
        drop.x = (Math.random() - 0.2) * 1.4;
        drop.char = this.getRandomHexChar();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Rendering Engine
  // ─────────────────────────────────────────────────────────────

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear frame with deep slate background
    ctx.fillStyle = '#06080a';
    ctx.fillRect(0, 0, this.width, this.height);

    const palette = this.getColorPalette(this.options.colorScheme);

    // 1. Ambient Background Glow
    const bgGrad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 40,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.6
    );
    bgGrad.addColorStop(0, palette.backgroundGlow);
    bgGrad.addColorStop(1, 'rgba(6, 8, 10, 0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Render Atmospheric Digital Rain
    this.renderRain(ctx, palette);

    // 3. Render Shockwave Rings
    for (const sw of this.shockwaves) {
      ctx.beginPath();
      ctx.arc(sw.x + this.width / 2, sw.y + this.height / 2, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = Math.max(1, 4 * sw.alpha);
      ctx.stroke();
    }

    // 4. Render Pixels
    const style = this.options.pixelStyle;
    for (let i = 0; i < this.pixels.length; i++) {
      const p = this.pixels[i];
      const px = p.projX + p.glitchOffset;
      const py = p.projY;
      const pSize = Math.max(1.5, p.pitch * p.projScale * (this.options.pixelPitch / 10));

      ctx.globalAlpha = p.alpha * this.options.brightness;

      if (style === 'rounded') {
        // Soft rounded pixel tiles
        ctx.fillStyle = p.color;
        const cornerR = Math.max(1, pSize * 0.25);
        this.drawRoundedRect(ctx, px - pSize / 2, py - pSize / 2, pSize - 1, pSize - 1, cornerR);
        ctx.fill();

      } else if (style === 'phosphor') {
        // CRT Phosphor Glowing Pixel
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8 * this.options.brightness;
        ctx.fillStyle = p.color;
        ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize - 1, pSize - 1);
        ctx.shadowBlur = 0; // Reset

      } else if (style === 'voxel') {
        // 3D Isometric Extruded Voxel Cube
        this.drawVoxelCube(ctx, px, py, pSize, p.color);

      } else if (style === 'matrix') {
        // Falling Code / Matrix Glyph
        ctx.fillStyle = p.color;
        ctx.font = `bold ${Math.max(9, Math.floor(pSize * 1.2))}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.char, px, py);

      } else {
        // Standard Crisp 8-Bit Square Pixel Art (Default)
        ctx.fillStyle = p.color;
        const gap = pSize > 5 ? 1 : 0.4;
        ctx.fillRect(px - pSize / 2, py - pSize / 2, pSize - gap, pSize - gap);

        if (p.isHighlight) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(px - pSize / 2, py - pSize / 2, (pSize - gap) * 0.5, (pSize - gap) * 0.5);
        }
      }
    }

    ctx.globalAlpha = 1.0;

    // 5. CRT Scanlines Overlay
    if (this.options.scanlines) {
      this.renderScanlines(ctx);
    }

    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawVoxelCube(ctx, cx, cy, size, color) {
    const s = size * 0.6;
    const h = s * 0.6;

    // Top face (bright)
    ctx.beginPath();
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Left face (shaded)
    ctx.beginPath();
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx, cy + h + s);
    ctx.lineTo(cx - s, cy + s);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();

    // Right face (darker shaded)
    ctx.beginPath();
    ctx.moveTo(cx, cy + h);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx + s, cy + s);
    ctx.lineTo(cx, cy + h + s);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fill();
  }

  renderRain(ctx, palette) {
    const count = this.rainDrops.length;
    ctx.fillStyle = palette.rain;
    ctx.font = '10px monospace';

    for (let i = 0; i < count; i++) {
      const drop = this.rainDrops[i];
      const rx = (drop.x - drop.y * 0.15) * this.width;
      const ry = drop.y * this.height;

      ctx.globalAlpha = drop.alpha * 0.45;
      ctx.fillRect(rx, ry, 2, drop.length);
      
      // Lead spark bit
      if (Math.random() < 0.3) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(drop.char, rx, ry + drop.length);
        ctx.fillStyle = palette.rain;
      }
    }
    ctx.globalAlpha = 1.0;
  }

  renderScanlines(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let y = 0; y < this.height; y += 4) {
      ctx.fillRect(0, y, this.width, 1.5);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Public Control API
  // ─────────────────────────────────────────────────────────────

  setOption(key, val) {
    this.options[key] = val;
    if (key === 'logoMode' || key === 'pixelPitch' || key === 'logoSize' || key === 'colorScheme') {
      this.initLogoPixels();
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
