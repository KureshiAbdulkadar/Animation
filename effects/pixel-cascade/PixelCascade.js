/**
 * PixelCascade.js
 * 
 * High-performance Arcade Pixel Game & Cascading Wall Builder Engine.
 * Features:
 *  - Continuous falling pixel blocks (top-to-bottom) stacking, locking, and building retro game walls
 *  - 4 Dynamic Game Construction Modes:
 *     1. 'tetris-wall' — Retro polyomino arcade blocks cascading & stacking into brick walls with laser line clears
 *     2. 'sand-cascade' — Physical falling granular pixel sand that avalanches, settles, and solidifies into dunes/walls
 *     3. 'arcade-brick' — High-speed digital firewall construction with neon collision sparks
 *     4. 'pixel-skyline' — Procedural cyber skyscraper voxel towers assembling from falling blocks
 *  - Line Clears & Explosive Particle Sparks: When walls build up or lines complete, glowing neon laser wipes clear rows with particle debris
 *  - Interactive: Hover to steer falling blocks; Click to detonate/blast holes in the pixel wall!
 *  - Retro CRT scanlines, arcade glow bloom, and 6 curated 8-bit/16-bit game palettes
 */

export class PixelCascade {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    // Default configuration
    this.options = Object.assign({
      gameMode: 'tetris-wall',     // 'tetris-wall' | 'sand-cascade' | 'arcade-brick' | 'pixel-skyline'
      blockSize: 24,               // Pixel block dimensions (8 - 32px)
      dropSpeed: 1.2,              // Falling speed multiplier (0.2 - 3.0)
      spawnRate: 1.5,              // Rapid spawn density for 2-3s wall build
      colorScheme: 'retro-arcade', // 'retro-arcade' | 'cyber-neon' | 'gameboy' | 'synth-sunset' | 'matrix' | 'gold-mine'
      customText: 'NODE JS',       // Cutout negative-space typography text
      autoLineClear: false,        // Wall stays built without auto line breaks
      autoBreak: false,            // Disabled auto-break: down blocks will not break automatically
      scanlines: true,             // CRT arcade scanlines
      interactive: true,           // Mouse steers & clicks blast
      mouseRadius: 100,            // Mouse bomb radius
      glowIntensity: 1.2,          // Arcade neon bloom
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
    this.megaFlash = 0;
    this.comboBreaks = 0;
    this.comboTimer = 0;
    this.buildComplete = false;
    this.textFill = 0.0;

    // Grid Matrix State
    this.cols = 0;
    this.rows = 0;
    this.grid = []; // 2D array of stacked blocks: null or { color, flash, type, char }
    this.fallingBlocks = []; // Array of active falling entities { x, y, vy, color, shape, size }
    this.sparks = []; // Particle debris on block impacts / explosions
    this.clearingRows = []; // Animating laser clear lines

    // Mouse tracking
    this.mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      isHovering: false,
      isDown: false
    };

    // System reduced motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.options.reducedMotion = true;
    }

    this.handleResize();
    this.initGrid();
    this.bindEvents();
    this.start();
  }

  setOption(key, value) {
    this.options[key] = value;
    if (key === 'blockSize' || key === 'gameMode') {
      this.initGrid();
    } else if (key === 'customText') {
      this.nodeMask = this.generateTextMask(this.options.customText, this.cols, this.rows);
      this.clearWall();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8-Bit / 16-Bit Retro Game Color Palettes
  // ─────────────────────────────────────────────────────────────

  getPalette(scheme) {
    switch (scheme) {
      case 'cyber-cyan':
        return {
          bg: '#040711',
          colors: ['#00f0ff', '#0284c7'],
          wallEdge: '#38bdf8',
          laser: '#ffffff',
          glow: 'rgba(0, 240, 255, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'gameboy':
        return {
          bg: '#0f380f',
          colors: ['#9bbc0f', '#306230'],
          wallEdge: '#9bbc0f',
          laser: '#d4ffd9',
          glow: 'rgba(155, 188, 15, 0.35)',
          scanline: 'rgba(0, 0, 0, 0.25)'
        };
      case 'synth-sunset':
      case 'neon-magenta':
        return {
          bg: '#0f0518',
          colors: ['#ff007f', '#7928ca'],
          wallEdge: '#ff007f',
          laser: '#ffffff',
          glow: 'rgba(255, 0, 127, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.20)'
        };
      case 'matrix':
        return {
          bg: '#020a04',
          colors: ['#00ff41', '#007a1c'],
          wallEdge: '#00ff41',
          laser: '#d0ffd0',
          glow: 'rgba(0, 255, 65, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.25)'
        };
      case 'gold-mine':
      case 'amber-gold':
        return {
          bg: '#0d0a06',
          colors: ['#ffb703', '#ea580c'],
          wallEdge: '#ffd166',
          laser: '#fff3c4',
          glow: 'rgba(255, 183, 3, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.20)'
        };
      case 'monochrome':
      case 'ice-white':
        return {
          bg: '#080c14',
          colors: ['#ffffff', '#475569'],
          wallEdge: '#94a3b8',
          laser: '#ffffff',
          glow: 'rgba(255, 255, 255, 0.35)',
          scanline: 'rgba(0, 0, 0, 0.20)'
        };
      case 'retro-arcade':
      default:
        return {
          bg: '#080c18',
          colors: [
            '#06b6d4', // Primary Cyan
            '#f43f5e'  // Secondary Neon Rose
          ],
          wallEdge: '#38bdf8',
          laser: '#ffffff',
          glow: 'rgba(6, 182, 212, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Grid Initialization
  // ─────────────────────────────────────────────────────────────

  initGrid() {
    this.buildComplete = false;
    this.textFill = 0.0;
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    this.cols = Math.floor(this.width / size);
    this.rows = Math.floor(this.height / size);

    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = new Array(this.cols).fill(null);
    }

    this.fallingBlocks = [];
    this.sparks = [];
    this.clearingRows = [];
    this.nodeMask = this.generateTextMask(this.options.customText || 'NODE JS', this.cols, this.rows);

    // Pre-populate partial bottom wall foundation (only outside text void)
    const palette = this.getPalette(this.options.colorScheme);
    const foundationRows = Math.min(3, Math.floor(this.rows * 0.15));

    for (let r = this.rows - foundationRows; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const isTextVoid = this.nodeMask && this.nodeMask[r] && this.nodeMask[r][c] === 1;
        if (!isTextVoid && Math.random() < 0.60) {
          this.grid[r][c] = {
            color: palette.colors[0],
            flash: 0,
            alpha: 1.0,
            char: this.getPixelChar()
          };
        }
      }
    }
  }

  generateTextMask(text, cols, rows) {
    const PIXEL_FONT = {
      'A': [" 111 ", "1   1", "1   1", "11111", "1   1", "1   1", "1   1"],
      'B': ["1111 ", "1   1", "1   1", "1111 ", "1   1", "1   1", "1111 "],
      'C': [" 1111", "1    ", "1    ", "1    ", "1    ", "1    ", " 1111"],
      'D': ["1111 ", "1   1", "1   1", "1   1", "1   1", "1   1", "1111 "],
      'E': ["11111", "1    ", "1    ", "1111 ", "1    ", "1    ", "11111"],
      'F': ["11111", "1    ", "1    ", "1111 ", "1    ", "1    ", "1    "],
      'G': [" 1111", "1    ", "1    ", "1 111", "1   1", "1   1", " 1111"],
      'H': ["1   1", "1   1", "1   1", "11111", "1   1", "1   1", "1   1"],
      'I': ["11111", "  1  ", "  1  ", "  1  ", "  1  ", "  1  ", "11111"],
      'J': ["  111", "    1", "    1", "    1", "1   1", "1   1", " 111 "],
      'K': ["1   1", "1  1 ", "1 1  ", "11   ", "1 1  ", "1  1 ", "1   1"],
      'L': ["1    ", "1    ", "1    ", "1    ", "1    ", "1    ", "11111"],
      'M': ["1   1", "11 11", "1 1 1", "1   1", "1   1", "1   1", "1   1"],
      'N': ["1   1", "11  1", "1 1 1", "1  11", "1   1", "1   1", "1   1"],
      'O': [" 111 ", "1   1", "1   1", "1   1", "1   1", "1   1", " 111 "],
      'P': ["1111 ", "1   1", "1   1", "1111 ", "1    ", "1    ", "1    "],
      'Q': [" 111 ", "1   1", "1   1", "1   1", "1 1 1", "1  1 ", " 11 1"],
      'R': ["1111 ", "1   1", "1   1", "1111 ", "1  1 ", "1   1", "1   1"],
      'S': [" 1111", "1    ", "1    ", " 111 ", "    1", "    1", "1111 "],
      'T': ["11111", "  1  ", "  1  ", "  1  ", "  1  ", "  1  ", "  1  "],
      'U': ["1   1", "1   1", "1   1", "1   1", "1   1", "1   1", " 111 "],
      'V': ["1   1", "1   1", "1   1", "1   1", "1   1", " 1 1 ", "  1  "],
      'W': ["1   1", "1   1", "1   1", "1 1 1", "1 1 1", "11 11", "1   1"],
      'X': ["1   1", "1   1", " 1 1 ", "  1  ", " 1 1 ", "1   1", "1   1"],
      'Y': ["1   1", "1   1", " 1 1 ", "  1  ", "  1  ", "  1  ", "  1  "],
      'Z': ["11111", "    1", "   1 ", "  1  ", " 1   ", "1    ", "11111"],
      '.': ["     ", "     ", "     ", "     ", "     ", " 11  ", " 11  "],
      '-': ["     ", "     ", "     ", "11111", "     ", "     ", "     "],
      ' ': ["     ", "     ", "     ", "     ", "     ", "     ", "     "]
    };

    const mask = [];
    for (let r = 0; r < rows; r++) {
      mask[r] = new Uint8Array(cols);
    }

    const clean = (text || 'NODE JS').trim().toUpperCase();
    if (clean.length === 0) return mask;

    const baseW = clean.length * 6 - 1;
    const maxScaleW = Math.max(1, Math.floor((cols - 4) / baseW));
    const maxScaleH = Math.max(1, Math.floor((rows - 4) / 7));
    const scale = Math.max(1, Math.min(maxScaleW, maxScaleH));

    const charW = 5 * scale;
    const spacing = 1 * scale;
    const charH = 7 * scale;
    const totalW = clean.length * (charW + spacing) - spacing;

    const startX = Math.max(1, Math.floor((cols - totalW) / 2));
    const startY = Math.max(1, Math.floor((rows - charH) / 2));

    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      const glyph = PIXEL_FONT[ch] || PIXEL_FONT[' '];
      const cX = startX + i * (charW + spacing);

      for (let py = 0; py < 7; py++) {
        const rowStr = glyph[py] || "     ";
        for (let px = 0; px < 5; px++) {
          if (rowStr[px] === '1') {
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                const r = startY + py * scale + sy;
                const c = cX + px * scale + sx;
                if (r >= 0 && r < rows && c >= 0 && c < cols) {
                  mask[r][c] = 1;
                }
              }
            }
          }
        }
      }
    }
    return mask;
  }

  getPixelChar() {
    const chars = '█▓▒░■▲▼';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  spawnBlock(targetCol, customSpawnY) {
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const palette = this.getPalette(this.options.colorScheme);
    const color = palette.colors[0];
    const mode = this.options.gameMode;
    const col = typeof targetCol === 'number' ? targetCol : Math.floor(Math.random() * (this.cols - 2)) + 1;

    let shape = [[0, 0]];
    if (mode === 'tetris-wall') {
      const tetronimos = [
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [-1, 0], [1, 0], [2, 0]],
        [[0, 0], [-1, 0], [1, 0], [0, 1]],
        [[0, 0], [1, 0], [0, 1], [-1, 1]],
        [[0, 0], [-1, 0], [0, 1], [1, 1]],
        [[0, 0], [-1, 0], [-1, 1], [1, 0]],
        [[0, 0], [1, 0], [1, 1], [-1, 0]],
        [[0, 0], [1, 0]],
        [[0, 0]]
      ];
      shape = tetronimos[Math.floor(Math.random() * tetronimos.length)];
    }

    const startY = typeof customSpawnY === 'number' ? customSpawnY : -size * (1 + Math.random() * 2);

    this.fallingBlocks.push({
      gridCol: col,
      y: startY,
      vy: (9.0 + Math.random() * 9.0) * this.options.dropSpeed,
      color,
      shape,
      size,
      char: this.getPixelChar()
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Event Listeners & Interactive Blasting
  // ─────────────────────────────────────────────────────────────

  bindEvents() {
    this._onResize = () => {
      this.handleResize();
      this.initGrid();
    };
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
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.blastHole(clickX, clickY);
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

  blastHole(pixelX, pixelY) {
    // User breaks blocks: STOP new falling blocks!
    this.buildComplete = true;
    this.fallingBlocks = [];

    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const targetC = Math.floor(pixelX / size);
    const targetR = Math.floor(pixelY / size);
    const radiusCells = Math.ceil(this.options.mouseRadius / size);
    let broken = 0;

    // Blast grid cells in explosion radius
    for (let r = Math.max(0, targetR - radiusCells); r <= Math.min(this.rows - 1, targetR + radiusCells); r++) {
      for (let c = Math.max(0, targetC - radiusCells); c <= Math.min(this.cols - 1, targetC + radiusCells); c++) {
        const d = Math.hypot(c - targetC, r - targetR);
        if (d <= radiusCells && this.grid[r][c]) {
          broken++;
          const b = this.grid[r][c];
          this.emitSparks(c * size + size / 2, r * size + size / 2, b.color, 4);
          this.grid[r][c] = null;
        }
      }
    }

    // Progressively fill the text boxes with glowing solid color as bricks break!
    this.textFill = Math.min(1.0, this.textFill + Math.max(0.18, broken * 0.12));

    // Combo counter: if user breaks > 10 bricks, shatter whole wall & trigger 100% text neon fill
    const now = performance.now();
    if (now - this.comboTimer < 2500) {
      this.comboBreaks += broken;
    } else {
      this.comboBreaks = broken;
    }
    this.comboTimer = now;

    if (this.comboBreaks >= 10) {
      this.megaFlash = 1.0;
      this.textFill = 1.0;
      this.comboBreaks = 0;
      this.fallingBlocks = [];
      const palette = this.getPalette(this.options.colorScheme);
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c]) {
            this.emitSparks(c * size + size / 2, r * size + size / 2, palette.colors[0], 5);
            this.grid[r][c] = null;
          }
        }
      }
    }
  }

  emitSparks(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.03
      });
    }
  }

  triggerShockwave(cx, cy) {
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const radius = 8;
    const centerC = Math.floor(cx / size);
    const centerR = Math.floor(cy / size);

    for (let r = Math.max(0, centerR - radius); r <= Math.min(this.rows - 1, centerR + radius); r++) {
      for (let c = Math.max(0, centerC - radius); c <= Math.min(this.cols - 1, centerC + radius); c++) {
        const d = Math.hypot(c - centerC, r - centerR);
        if (d <= radius && this.grid[r][c]) {
          this.emitSparks(c * size + size / 2, r * size + size / 2, this.grid[r][c].color, 5);
          this.grid[r][c] = null;
        }
      }
    }
  }

  clearWall() {
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const palette = this.getPalette(this.options.colorScheme);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          this.emitSparks(c * size + size / 2, r * size + size / 2, palette.colors[0], 2);
          this.grid[r][c] = null;
        }
      }
    }
    this.fallingBlocks = [];
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
  // Physics & Simulation Loop
  // ─────────────────────────────────────────────────────────────

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.isRunning) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

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

  update(dt) {
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const palette = this.getPalette(this.options.colorScheme);

    // 1. Spawning: Only spawn blocks during initial build. STOP spawning once complete or when user breaks blocks!
    let hasEmptySpot = false;
    const needyCols = [];
    const colGaps = {};
    for (let c = 0; c < this.cols; c++) {
      let lowestEmptyR = -1;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (!this.grid[r][c] && this.nodeMask[r][c] === 0) {
          lowestEmptyR = r;
          hasEmptySpot = true;
          break;
        }
      }
      if (lowestEmptyR !== -1) {
        needyCols.push(c);
        let topGapR = lowestEmptyR;
        while (topGapR > 0 && !this.grid[topGapR - 1][c] && this.nodeMask[topGapR - 1][c] === 0) {
          topGapR--;
        }
        colGaps[c] = { lowestEmptyR, topGapR };
      }
    }

    if (!hasEmptySpot) {
      this.buildComplete = true;
    }

    const spawnBatch = Math.min(8, Math.max(3, Math.floor(4.5 * this.options.spawnRate)));
    if (!this.buildComplete && this.fallingBlocks.length < 60 && needyCols.length > 0) {
      for (let s = 0; s < spawnBatch; s++) {
        if (Math.random() < 0.95 * this.options.spawnRate) {
          const spawnCol = needyCols[Math.floor(Math.random() * needyCols.length)];
          const gapInfo = colGaps[spawnCol];
          const spawnY = (gapInfo && gapInfo.topGapR > 0) 
            ? (gapInfo.topGapR - 1) * size 
            : -size * (1 + Math.random() * 2);
          this.spawnBlock(spawnCol, spawnY);
        }
      }
    }

    // Smooth mouse follower
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.25;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.25;

    // 2. Entity Physics & Collisions
    for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
      const fb = this.fallingBlocks[i];
      fb.y += fb.vy * 60 * dt;

      // Mouse steering interaction
      if (this.mouse.isHovering && this.options.interactive) {
        const blockX = fb.gridCol * size;
        const dx = this.mouse.x - blockX;
        const dy = this.mouse.y - fb.y;
        if (Math.abs(dy) < 120 && Math.abs(dx) < 140) {
          if (dx > 20 && fb.gridCol < this.cols - 2 && Math.random() < 0.12) fb.gridCol++;
          else if (dx < -20 && fb.gridCol > 1 && Math.random() < 0.12) fb.gridCol--;
        }
      }

      // Check collision against wall grid and screen boundaries
      let hasCollided = false;
      let lowestContactR = -1;

      for (const [ox, oy] of fb.shape) {
        const c = fb.gridCol + ox;
        const nextR = Math.floor((fb.y + oy * size + size) / size);

        if (c < 0 || c >= this.cols) continue;

        if (nextR >= this.rows) {
          hasCollided = true;
          lowestContactR = Math.max(lowestContactR, this.rows);
          break;
        }

        if (nextR >= 0 && this.grid[nextR] && this.grid[nextR][c]) {
          hasCollided = true;
          lowestContactR = Math.max(lowestContactR, nextR);
          break;
        }
      }

      // Lock into wall matrix accurately right above contact row
      if (hasCollided) {
        const baseLandingR = lowestContactR >= 0 ? lowestContactR - 1 : Math.floor(fb.y / size);

        for (const [ox, oy] of fb.shape) {
          const c = fb.gridCol + ox;
          const r = baseLandingR + oy;

          if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
            const isTextVoid = this.nodeMask && this.nodeMask[r] && this.nodeMask[r][c] === 1;
            if (!isTextVoid && !this.grid[r][c]) {
              this.grid[r][c] = {
                color: palette.colors[0],
                flash: 1.0,
                alpha: 1.0,
                char: fb.char
              };
              this.emitSparks(c * size + size / 2, r * size + size / 2, palette.colors[0], 2);
            }
          }
        }

        this.fallingBlocks.splice(i, 1);
      }
    }

    // 3. Real Physics Gravity & Lateral Avalanche Settlement
    for (let r = this.rows - 2; r >= 0; r--) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r] && this.grid[r][c]) {
          // Straight down gravity
          if (this.grid[r + 1] && !this.grid[r + 1][c] && this.nodeMask[r + 1][c] === 0) {
            this.grid[r + 1][c] = this.grid[r][c];
            this.grid[r][c] = null;
          }
          // Lateral avalanche around text voids or stacks
          else if (this.grid[r + 1] && (this.nodeMask[r + 1][c] === 1 || this.grid[r + 1][c])) {
            const canLeft = c > 0 && !this.grid[r + 1][c - 1] && this.nodeMask[r + 1][c - 1] === 0 && !this.grid[r][c - 1];
            const canRight = c < this.cols - 1 && !this.grid[r + 1][c + 1] && this.nodeMask[r + 1][c + 1] === 0 && !this.grid[r][c + 1];
            if (canLeft && canRight) {
              const dir = Math.random() < 0.5 ? -1 : 1;
              this.grid[r + 1][c + dir] = this.grid[r][c];
              this.grid[r][c] = null;
            } else if (canLeft) {
              this.grid[r + 1][c - 1] = this.grid[r][c];
              this.grid[r][c] = null;
            } else if (canRight) {
              this.grid[r + 1][c + 1] = this.grid[r][c];
              this.grid[r][c] = null;
            }
          }
        }
      }
    }

    // 4. Update Sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.18;
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // Cool down block flash
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] && this.grid[r][c].flash > 0) {
          this.grid[r][c].flash *= 0.85;
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Canvas Rendering Engine
  // ─────────────────────────────────────────────────────────────

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const palette = this.getPalette(this.options.colorScheme);
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const glow = this.options.glowIntensity;

    // 1. Deep Background Fill
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Gridlines Overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * size, 0);
      ctx.lineTo(c * size, this.height);
      ctx.stroke();
    }
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * size);
      ctx.lineTo(this.width, r * size);
      ctx.stroke();
    }

    // 3. Render Text Letters ("NODE JS") Boxes — Fills with solid glowing color when broken!
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.nodeMask && this.nodeMask[r] && this.nodeMask[r][c] === 1) {
          const bx = c * size;
          const by = r * size;

          if (this.textFill > 0.05) {
            // FILLED TYPE: When broken, text box fills up with solid glowing color!
            const fillAlpha = Math.min(1.0, this.textFill * 1.3);
            ctx.save();
            ctx.globalAlpha = fillAlpha;

            // Solid accent color block
            ctx.fillStyle = palette.colors[0];
            ctx.fillRect(bx + 1, by + 1, size - 2, size - 2);

            // 3D Bevel Highlights
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            ctx.fillRect(bx + 1, by + 1, size - 2, 2.5);
            ctx.fillRect(bx + 1, by + 1, 2.5, size - 2);

            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.fillRect(bx + 1, by + size - 3.5, size - 2, 2.5);
            ctx.fillRect(bx + size - 3.5, by + 1, 2.5, size - 2);

            // Glowing border contour
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.0;
            ctx.strokeRect(bx + 1.5, by + 1.5, size - 3, size - 3);

            ctx.restore();
          } else {
            // INSET BADGE: Before break, dark void cutout
            ctx.fillStyle = "rgba(4, 8, 18, 0.88)";
            ctx.fillRect(bx + 1, by + 1, size - 2, size - 2);

            // Glowing neon contour
            ctx.strokeStyle = palette.colors[0];
            ctx.lineWidth = 1.0;
            ctx.strokeRect(bx + 1.5, by + 1.5, size - 3, size - 3);

            // Center neon point
            ctx.fillStyle = palette.colors[0];
            ctx.fillRect(bx + size / 2 - 1.5, by + size / 2 - 1.5, 3, 3);
          }
        }
      }
    }

    // 4. Render Stacked Wall Matrix Blocks
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b) continue;

        const bx = c * size;
        const by = r * size;

        // Surrounding Solid Wall Block
        ctx.fillStyle = b.flash > 0.1 ? '#ffffff' : palette.colors[0];
        ctx.fillRect(bx + 1, by + 1, size - 2, size - 2);

        // Pixel Bevel / 3D Edge Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(bx + 1, by + 1, size - 2, 2.5);
        ctx.fillRect(bx + 1, by + 1, 2.5, size - 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(bx + 1, by + size - 3.5, size - 2, 2.5);
        ctx.fillRect(bx + size - 3.5, by + 1, 2.5, size - 2);
      }
    }

    // Render Mega Combo Glow for the text
    if (this.megaFlash > 0.04) {
      ctx.save();
      ctx.fillStyle = palette.colors[0];
      ctx.shadowColor = palette.colors[0];
      ctx.shadowBlur = this.megaFlash * 35;
      ctx.globalAlpha = Math.min(1.0, this.megaFlash);
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.nodeMask && this.nodeMask[r] && this.nodeMask[r][c] === 1) {
            const bx = c * size;
            const by = r * size;
            ctx.fillRect(bx + 1, by + 1, size - 2, size - 2);
          }
        }
      }
      ctx.restore();
      this.megaFlash *= 0.93;
    }

    // 4. Render Active Falling Blocks
    for (const fb of this.fallingBlocks) {
      for (const [ox, oy] of fb.shape) {
        const bx = (fb.gridCol + ox) * size;
        const by = fb.y + oy * size;

        if (bx < 0 || bx >= this.width || by > this.height) continue;

        // Falling Glow Halo
        if (glow > 1.0) {
          ctx.fillStyle = palette.glow;
          ctx.fillRect(bx - 2, by - 2, size + 4, size + 4);
        }

        // Falling Block Main Fill
        ctx.fillStyle = fb.color;
        ctx.fillRect(bx + 1, by + 1, size - 2, size - 2);

        // Bright top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(bx + 1, by + 1, size - 2, 2);
        ctx.fillRect(bx + 1, by + 1, 2, size - 2);

        // Shadow bottom
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(bx + 1, by + size - 3, size - 2, 2);
        ctx.fillRect(bx + size - 3, by + 1, 2, size - 2);
      }
    }

    // 5. Render Particle Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }
    ctx.globalAlpha = 1.0;

    // 6. Mouse Blast Crosshair Indicator
    if (this.mouse.isHovering) {
      ctx.strokeStyle = palette.wallEdge;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.mouse.x, this.mouse.y, this.options.mouseRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
    }

    // 7. CRT Arcade Scanlines
    if (this.options.scanlines) {
      ctx.fillStyle = palette.scanline;
      for (let y = 0; y < this.height; y += 4) {
        ctx.fillRect(0, y, this.width, 1.5);
      }
    }

    ctx.restore();
  }

  // ─────────────────────────────────────────────────────────────
  // Public Control API
  // ─────────────────────────────────────────────────────────────

  setOption(key, val) {
    this.options[key] = val;
    if (key === 'blockSize') {
      this.initGrid();
    }
  }

  triggerShockwave(x = this.width / 2, y = this.height / 2) {
    this.blastHole(x, y);
  }

  clearWall() {
    this.initGrid();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
