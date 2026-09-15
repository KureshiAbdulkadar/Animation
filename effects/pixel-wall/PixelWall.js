/**
 * PixelWall.js — Interactive 2D Pixel Pop Wall Animation
 * 
 * Renders a frontal 2D wall of square pixel tiles across the canvas.
 * When clicked (or hovered), the targeted pixel block and nearby neighborhood
 * pop slightly upward with tactile spring physics and bottom shadow bevel revealing depth.
 */

export class PixelWall {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      tileSize: 32,              // Size of each square pixel tile in px
      gap: 3,                    // Gap between pixel tiles
      clickPopHeight: 14,        // Height (px) a tile pops upward on click
      hoverPopHeight: 5,         // Micro-lift height (px) on hover
      hoverRadius: 100,          // Radius of hover influence (px)
      springSpeed: 18.0,         // Easing spring rate (1/s)
      rippleSpeed: 380,          // Pixel wave ripple speed (px/s)
      theme: 'obsidian',         // 'obsidian' | 'titanium' | 'cyan' | 'amber' | 'emerald'
      showBottomBevel: true,     // Reveal bottom 3D shadow bevel on pop
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

    this.cols = 0;
    this.rows = 0;
    this.tiles = []; // Flat array of tile objects
    this.ripples = []; // Active click ripple waves

    this.mouse = {
      x: -9999,
      y: -9999,
      isHovering: false
    };

    this.themes = {
      obsidian: {
        bg: '#000000',
        tileBase: '#12151c',
        tileActive: '#262d3d',
        bevelShadow: '#080a0e',
        border: 'rgba(255, 255, 255, 0.08)',
        borderActive: 'rgba(255, 255, 255, 0.28)',
        accentDot: 'rgba(255, 255, 255, 0.15)',
        accentDotActive: '#ffffff'
      },
      titanium: {
        bg: '#000000',
        tileBase: '#1e222b',
        tileActive: '#475569',
        bevelShadow: '#0c0e12',
        border: 'rgba(255, 255, 255, 0.12)',
        borderActive: 'rgba(255, 255, 255, 0.45)',
        accentDot: 'rgba(255, 255, 255, 0.25)',
        accentDotActive: '#f8fafc'
      },
      cyan: {
        bg: '#000000',
        tileBase: '#0c2233',
        tileActive: '#0284c7',
        bevelShadow: '#040d14',
        border: 'rgba(56, 189, 248, 0.15)',
        borderActive: 'rgba(56, 189, 248, 0.65)',
        accentDot: 'rgba(56, 189, 248, 0.3)',
        accentDotActive: '#38bdf8'
      },
      amber: {
        bg: '#000000',
        tileBase: '#291b08',
        tileActive: '#d97706',
        bevelShadow: '#120c03',
        border: 'rgba(245, 158, 11, 0.15)',
        borderActive: 'rgba(245, 158, 11, 0.65)',
        accentDot: 'rgba(245, 158, 11, 0.3)',
        accentDotActive: '#fbbf24'
      },
      emerald: {
        bg: '#000000',
        tileBase: '#0b261a',
        tileActive: '#059669',
        bevelShadow: '#04120c',
        border: 'rgba(16, 185, 129, 0.15)',
        borderActive: 'rgba(16, 185, 129, 0.65)',
        accentDot: 'rgba(16, 185, 129, 0.3)',
        accentDotActive: '#34d399'
      }
    };

    this.currentTheme = this.themes[this.options.theme] || this.themes.obsidian;

    this.isRunning = false;
    this.rafId = null;
    this.lastTime = performance.now();
    this.startTime = performance.now();

    this.handleResize();
    this.initWall();
    this.bindEvents();
    this.start();
  }

  initWall() {
    this.tiles = [];
    const stride = this.options.tileSize + this.options.gap;
    this.cols = Math.ceil(this.width / stride) + 1;
    this.rows = Math.ceil(this.height / stride) + 1;

    const offsetX = (this.width - ((this.cols - 1) * stride + this.options.tileSize)) * 0.5;
    const offsetY = (this.height - ((this.rows - 1) * stride + this.options.tileSize)) * 0.5;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = offsetX + c * stride;
        const y = offsetY + r * stride;
        const cx = x + this.options.tileSize * 0.5;
        const cy = y + this.options.tileSize * 0.5;

        this.tiles.push({
          c, r,
          x, y,
          cx, cy,
          currentPop: 0,      // Current upward offset in px
          targetPop: 0,       // Target upward offset in px
          activeFactor: 0     // 0.0 to 1.0 color interpolation
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
    this.initWall();
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());

    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = clientX - rect.left;
      this.mouse.y = clientY - rect.top;
      this.mouse.isHovering = true;
    };

    this.canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHovering = false;
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.isHovering = false;
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.triggerClickPop(clickX, clickY);
    });
  }

  triggerClickPop(clickX, clickY) {
    this.ripples.push({
      x: clickX,
      y: clickY,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 0.75,
      speed: this.options.rippleSpeed,
      strength: 1.0,
      decay: 1.5
    });
  }

  setOption(key, val) {
    this.options[key] = val;
    if (key === 'tileSize' || key === 'gap') {
      this.initWall();
    }
    if (key === 'theme') {
      this.currentTheme = this.themes[val] || this.themes.obsidian;
    }
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
    const mx = this.mouse.x;
    const my = this.mouse.y;
    const isHover = this.mouse.isHovering;
    const hoverRadius = this.options.hoverRadius;
    const hoverPop = this.options.hoverPopHeight;
    const clickPop = this.options.clickPopHeight;
    const springFactor = 1.0 - Math.exp(-this.options.springSpeed * dt);

    // Update ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const rp = this.ripples[i];
      rp.radius += rp.speed * dt;
      rp.strength -= rp.decay * dt;
      if (rp.strength <= 0 || rp.radius >= rp.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    const numRipples = this.ripples.length;

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];

      // 1. Hover micro-lift
      let target = 0;
      if (isHover) {
        const d = Math.hypot(tile.cx - mx, tile.cy - my);
        if (d < hoverRadius) {
          const norm = d / hoverRadius;
          const curve = 0.5 * (1.0 + Math.cos(norm * Math.PI));
          target += hoverPop * curve;
        }
      }

      // 2. Click ripple pops
      if (numRipples > 0) {
        for (let j = 0; j < numRipples; j++) {
          const rp = this.ripples[j];
          const dist = Math.hypot(tile.cx - rp.x, tile.cy - rp.y);
          const ringDist = Math.abs(dist - rp.radius);
          if (ringDist < 60) {
            const ringFactor = 0.5 * (1.0 + Math.cos((ringDist / 60) * Math.PI));
            target += clickPop * ringFactor * rp.strength;
          }
        }
      }

      tile.targetPop = target;
      tile.currentPop += (tile.targetPop - tile.currentPop) * springFactor;
      tile.activeFactor = Math.max(0, Math.min(1, tile.currentPop / (clickPop || 1)));
    }
  }

  render() {
    const ctx = this.ctx;
    const theme = this.currentTheme;
    const size = this.options.tileSize;
    const showBevel = this.options.showBottomBevel;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Pitch black background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.lineWidth = 1;

    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const pop = tile.currentPop;
      const act = tile.activeFactor;
      const x = tile.x;
      const y = tile.y;

      // 1. Bottom shadow bevel reveal (when popped upward)
      if (showBevel && pop > 0.5) {
        ctx.fillStyle = theme.bevelShadow;
        ctx.fillRect(x, y + size - pop, size, pop);

        // Bevel side edges
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.strokeRect(x, y + size - pop, size, pop);
      }

      // 2. Pixel tile face (translated up by -pop)
      const topY = y - pop;

      // Face fill
      ctx.fillStyle = act > 0.1 ? theme.tileActive : theme.tileBase;
      ctx.fillRect(x, topY, size, size);

      // Subtle dark border outline
      ctx.strokeStyle = act > 0.1 ? theme.borderActive : theme.border;
      ctx.strokeRect(x + 0.5, topY + 0.5, size - 1, size - 1);

      // Center micro accent dot for crisp pixel aesthetic
      ctx.fillStyle = act > 0.1 ? theme.accentDotActive : theme.accentDot;
      ctx.fillRect(x + size * 0.5 - 1, topY + size * 0.5 - 1, 2, 2);
    }

    ctx.restore();
  }

  destroy() {
    this.stop();
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

export { PixelWall as PixelWallEngine };
export default PixelWall;
