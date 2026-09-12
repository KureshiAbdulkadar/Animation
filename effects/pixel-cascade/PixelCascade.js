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
      blockSize: 16,               // Pixel block dimensions (8 - 32px)
      dropSpeed: 1.0,              // Falling speed multiplier (0.2 - 3.0)
      spawnRate: 1.0,              // Spawn density (0.3 - 2.5)
      colorScheme: 'retro-arcade', // 'retro-arcade' | 'cyber-neon' | 'gameboy' | 'synth-sunset' | 'matrix' | 'gold-mine'
      autoLineClear: true,         // Flash & dissolve completed wall rows
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

    // Pre-populate partial bottom wall foundation
    const palette = this.getPalette(this.options.colorScheme);
    const foundationRows = Math.min(4, Math.floor(this.rows * 0.15));

    for (let r = this.rows - foundationRows; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (Math.random() < 0.65) {
          const color = palette.colors[Math.floor(Math.random() * palette.colors.length)];
          this.grid[r][c] = {
            color,
            flash: 0,
            alpha: 1.0,
            char: this.getPixelChar()
          };
        }
      }
    }
  }

  getPixelChar() {
    const chars = '█▓▒░■▲▼';
    return chars[Math.floor(Math.random() * chars.length)];
  }

  // ─────────────────────────────────────────────────────────────
  // Block Spawning & Shapes
  // ─────────────────────────────────────────────────────────────

  spawnBlock() {
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const palette = this.getPalette(this.options.colorScheme);
    const color = palette.colors[Math.floor(Math.random() * palette.colors.length)];
    const mode = this.options.gameMode;

    const col = Math.floor(Math.random() * this.cols);

    // Shapes depending on mode
    let shape = [[0, 0]]; // Single unit default

    if (mode === 'tetris-wall') {
      const tetronimos = [
        [[0, 0], [1, 0], [0, 1], [1, 1]], // O
        [[0, 0], [-1, 0], [1, 0], [2, 0]], // I
        [[0, 0], [-1, 0], [1, 0], [0, 1]], // T
        [[0, 0], [1, 0], [0, 1], [-1, 1]], // S
        [[0, 0], [-1, 0], [0, 1], [1, 1]], // Z
        [[0, 0], [-1, 0], [-1, 1], [1, 0]], // L
        [[0, 0], [1, 0], [1, 1], [-1, 0]]  // J
      ];
      shape = tetronimos[Math.floor(Math.random() * tetronimos.length)];
    } else if (mode === 'pixel-skyline') {
      // Skyscraper vertical rod or square foundation
      const w = 1 + Math.floor(Math.random() * 3);
      const h = 2 + Math.floor(Math.random() * 4);
      shape = [];
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          shape.push([x, y]);
        }
      }
    } else if (mode === 'arcade-brick') {
      // 2x1 or 3x1 horizontal arcade brick
      const len = 2 + Math.floor(Math.random() * 3);
      shape = [];
      for (let i = 0; i < len; i++) {
        shape.push([i, 0]);
      }
    }

    this.fallingBlocks.push({
      gridCol: col,
      y: -size * 3,
      vy: (1.5 + Math.random() * 2.5) * this.options.dropSpeed,
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
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const targetC = Math.floor(pixelX / size);
    const targetR = Math.floor(pixelY / size);
    const radiusCells = Math.ceil(this.options.mouseRadius / size);

    // Blast grid cells in explosion radius
    for (let r = Math.max(0, targetR - radiusCells); r <= Math.min(this.rows - 1, targetR + radiusCells); r++) {
      for (let c = Math.max(0, targetC - radiusCells); c <= Math.min(this.cols - 1, targetC + radiusCells); c++) {
        const d = Math.hypot(c - targetC, r - targetR);
        if (d <= radiusCells && this.grid[r][c]) {
          const b = this.grid[r][c];
          // Spawn explosive pixel spark debris
          this.emitSparks(c * size + size / 2, r * size + size / 2, b.color, 4);
          this.grid[r][c] = null;
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

  handleResize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.dpr = Math.min(this.options.dprCap, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
  }

  // ─────────────────────────────────────────────────────────────
  // Physics & Animation Loop
  // ─────────────────────────────────────────────────────────────

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

  update(dt, elapsed) {
    const size = Math.max(8, Math.min(36, this.options.blockSize));
    const mode = this.options.gameMode;
    const spawnChance = 0.28 * this.options.spawnRate * (this.options.reducedMotion ? 0.3 : 1.0);

    // 1. Spawning Falling Entities
    if (Math.random() < spawnChance && this.fallingBlocks.length < 45) {
      this.spawnBlock();
    }

    // Smooth mouse position
    if (this.mouse.isHovering) {
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.25;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.25;
    } else {
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    }

    // 2. Update Falling Blocks
    for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
      const fb = this.fallingBlocks[i];
      fb.y += fb.vy * 60 * dt;

      // Mouse steering interaction
      if (this.mouse.isHovering) {
        const blockScreenX = fb.gridCol * size;
        const dx = this.mouse.x - blockScreenX;
        const dy = this.mouse.y - fb.y;
        if (Math.abs(dy) < 140 && Math.abs(dx) < 160) {
          // Slight steering force
          if (dx > 20 && fb.gridCol < this.cols - 2 && Math.random() < 0.1) fb.gridCol++;
          else if (dx < -20 && fb.gridCol > 1 && Math.random() < 0.1) fb.gridCol--;
        }
      }

      // Check collision with ground or stacked wall blocks
      let hasCollided = false;

      for (const [ox, oy] of fb.shape) {
        const c = fb.gridCol + ox;
        const currentTargetRow = Math.floor((fb.y + oy * size + size) / size);

        if (c < 0 || c >= this.cols) continue;

        // Bottom ground collision
        if (currentTargetRow >= this.rows) {
          hasCollided = true;
          break;
        }

        // Stacked wall block collision
        if (currentTargetRow >= 0 && this.grid[currentTargetRow][c]) {
          hasCollided = true;
          break;
        }
      }

      // Lock into wall matrix upon collision
      if (hasCollided) {
        let lockRow = Math.floor(fb.y / size);

        for (const [ox, oy] of fb.shape) {
          const c = fb.gridCol + ox;
          const r = lockRow + oy;

          if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
            this.grid[r][c] = {
              color: fb.color,
              flash: 1.0,
              alpha: 1.0,
              char: fb.char
            };
            this.emitSparks(c * size + size / 2, r * size + size / 2, fb.color, 3);
          }
        }

        this.fallingBlocks.splice(i, 1);
      }
    }

    // 3. Real Physics Gravity Settlement for Stacked Wall Blocks
    // When lower blocks are erased or broken, upper blocks fall downwards naturally
    for (let r = this.rows - 2; r >= 0; r--) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          // Direct downward gravity fall
          if (!this.grid[r + 1][c]) {
            this.grid[r + 1][c] = this.grid[r][c];
            this.grid[r][c] = null;
          } else if (mode === 'sand-cascade') {
            // Diagonal roll left/right for granular sand
            const canLeft = c > 0 && !this.grid[r + 1][c - 1];
            const canRight = c < this.cols - 1 && !this.grid[r + 1][c + 1];

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

    // 4. Auto Line Clears (Tetris & Arcade Firewall complete lines)
    if (this.options.autoLineClear) {
      for (let r = 0; r < this.rows; r++) {
        let isFull = true;
        for (let c = 0; c < this.cols; c++) {
          if (!this.grid[r][c]) {
            isFull = false;
            break;
          }
        }

        if (isFull && !this.clearingRows.includes(r)) {
          this.clearingRows.push(r);
          // Emit laser sweep clear sparks
          for (let c = 0; c < this.cols; c += 2) {
            this.emitSparks(c * size, r * size + size / 2, '#ffffff', 4);
          }
        }
      }

      // Process clearing rows animation & collapse
      if (this.clearingRows.length > 0) {
        for (const rowIdx of this.clearingRows) {
          // Drop all rows above down by 1
          for (let r = rowIdx; r > 0; r--) {
            this.grid[r] = [...this.grid[r - 1]];
          }
          this.grid[0] = new Array(this.cols).fill(null);
        }
        this.clearingRows = [];
      }

      // If wall stacks too high near top, clear upper section
      let topRowFilled = 0;
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[2][c]) topRowFilled++;
      }
      if (topRowFilled > this.cols * 0.4) {
        // Clear top 6 rows
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < this.cols; c++) {
            if (this.grid[r][c]) {
              this.emitSparks(c * size, r * size, this.grid[r][c].color, 2);
              this.grid[r][c] = null;
            }
          }
        }
      }
    }

    // 5. Update Sparks & Flashes
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.18; // gravity
      s.alpha -= s.decay;

      if (s.alpha <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    // Cool down block flash
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] && this.grid[r][c].flash > 0) {
          this.grid[r][c].flash *= 0.88;
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

    // 1. Deep Arcade Background Fill
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Subtle Grid Gridlines Overlay
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

    // 3. Render Stacked Wall Matrix Blocks
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const b = this.grid[r][c];
        if (!b) continue;

        const bx = c * size;
        const by = r * size;

        // Block Body
        ctx.fillStyle = b.flash > 0.1 ? '#ffffff' : b.color;
        ctx.fillRect(bx + 1, by + 1, size - 2, size - 2);

        // Pixel Bevel / 3D Edge Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(bx + 1, by + 1, size - 2, 2);
        ctx.fillRect(bx + 1, by + 1, 2, size - 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(bx + 1, by + size - 3, size - 2, 2);
        ctx.fillRect(bx + size - 3, by + 1, 2, size - 2);

        // Inner Glyph
        if (size >= 14) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
          ctx.fillRect(bx + 4, by + 4, size - 8, size - 8);
        }
      }
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
