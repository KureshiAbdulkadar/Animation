/**
 * AmberDispersion.js
 * 
 * High-Performance Organic Halftone Dispersion & Rolling Wave Dot Grid Simulation.
 * Features:
 *  - Continuous 3D rolling ocean wave harmonics, diagonal wave sweeps & radial ripples.
 *  - Physical dot wave crest displacement (vertical & lateral undulations) + dynamic radius expansion.
 *  - 3D Fractal Brownian Motion (FBM) with Domain Warping for fluid organic dispersion.
 *  - Diagonal density gradient matching organic clusters fading from dense bottom-left to sparse top-right.
 *  - Dynamic Halftone Dot Rasterizer with smoothstep radius scaling & multi-stage thermal color grading.
 *  - Interactive shockwave ripple bursts, cursor thermal wake, and kinetic noise turbulence.
 *  - CRT Arcade scanlines, phosphor bloom, and multi-palette color themes.
 */

export class AmberDispersion {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      mode: 'ocean-waves',           // 'ocean-waves' | 'diagonal-wave-sweep' | 'radial-ripple-waves' | 'perlin-surf-tsunami' | 'molten-dispersion' | 'topographic-contours'
      colorScheme: 'molten-amber',   // 'molten-amber' | 'cyber-cyan' | 'matrix-emerald' | 'crimson-magma' | 'deep-sapphire' | 'solar-gold'
      gridPitch: 16,                 // Dot cell spacing in px (8 to 32)
      waveAmplitude: 1.0,            // Wave crest height & dot expansion (0.0 to 2.5)
      waveFrequency: 1.0,            // Wave spacing density (0.4 to 3.0)
      flowSpeed: 1.0,                // Wave propagation & morph speed (0.2 to 3.0)
      contrast: 1.3,                 // Density curve exponent (0.5 to 2.5)
      glowIntensity: 1.3,            // Bloom glow level (0.0 to 2.5)
      displacement: true,            // 3D physical wave dot undulation
      interactive: true,             // Mouse interaction
      scanlines: false,              // CRT scanline overlay
      reducedMotion: false,
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

    // Interactive shockwaves & ripples
    this.shockwaves = [];
    this.mouse = {
      x: -9999,
      y: -9999,
      px: -9999,
      py: -9999,
      vx: 0,
      vy: 0,
      isHovering: false,
      isDown: false
    };

    // Fast Simplex / Perlin Noise 3D Implementation
    this.initNoise();

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.options.reducedMotion = true;
    }

    this.handleResize();
    this.bindEvents();
    this.start();
  }

  initNoise() {
    const p = [
      151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
      8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
      35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
      134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
      55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
      18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
      250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
      189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
      172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
      228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
      107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
      138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
    ];
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise3D(xin, yin, zin) {
    const perm = this.perm;
    const permMod12 = this.permMod12;
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;

    let i1, j1, k1;
    let i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if (y0 < z0) { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if (x0 < z0) { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];

    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      const gi0 = permMod12[ii + perm[jj + perm[kk]]];
      const g = grad3[gi0];
      n0 = t0 * t0 * (g[0]*x0 + g[1]*y0 + g[2]*z0);
    }

    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]];
      const g = grad3[gi1];
      n1 = t1 * t1 * (g[0]*x1 + g[1]*y1 + g[2]*z1);
    }

    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]];
      const g = grad3[gi2];
      n2 = t2 * t2 * (g[0]*x2 + g[1]*y2 + g[2]*z2);
    }

    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 < 0) n3 = 0.0;
    else {
      t3 *= t3;
      const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]];
      const g = grad3[gi3];
      n3 = t3 * t3 * (g[0]*x3 + g[1]*y3 + g[2]*z3);
    }

    return 32.0 * (n0 + n1 + n2 + n3);
  }

  fbm(x, y, z, octaves = 3) {
    let value = 0;
    let amp = 0.5;
    let freq = 1.0;
    for (let i = 0; i < octaves; i++) {
      value += amp * this.noise3D(x * freq, y * freq, z * freq);
      freq *= 2.0;
      amp *= 0.5;
    }
    return value;
  }

  getPalette(scheme) {
    switch (scheme) {
      case 'cyber-cyan':
        return {
          bg: '#040714',
          c0: '#06132b',
          c1: '#0284c7',
          c2: '#00f0ff',
          c3: '#f43f5e',
          c4: '#ffffff',
          glow: 'rgba(0, 240, 255, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'matrix-emerald':
        return {
          bg: '#020b04',
          c0: '#04210e',
          c1: '#059669',
          c2: '#10b981',
          c3: '#34d399',
          c4: '#a7f3d0',
          glow: 'rgba(16, 185, 129, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'crimson-magma':
        return {
          bg: '#0a0204',
          c0: '#26050b',
          c1: '#9f1239',
          c2: '#e11d48',
          c3: '#f97316',
          c4: '#fef08a',
          glow: 'rgba(225, 29, 72, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'deep-sapphire':
        return {
          bg: '#050716',
          c0: '#0c143d',
          c1: '#3730a3',
          c2: '#4f46e5',
          c3: '#38bdf8',
          c4: '#e0e7ff',
          glow: 'rgba(79, 70, 229, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'solar-gold':
        return {
          bg: '#0a0802',
          c0: '#291b03',
          c1: '#a16207',
          c2: '#ca8a04',
          c3: '#eab308',
          c4: '#fef9c3',
          glow: 'rgba(234, 179, 8, 0.45)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'molten-amber':
      default:
        return {
          bg: '#050403',
          c0: '#231005',       // Deep burnt umber base
          c1: '#853207',       // Burnt sienna
          c2: '#c2410c',       // Warm terracotta
          c3: '#ea580c',       // Radiant fiery orange
          c4: '#f59e0b',       // Molten 24k amber gold
          glow: 'rgba(234, 88, 12, 0.55)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
    }
  }

  bindEvents() {
    this._onResize = () => this.handleResize();
    window.addEventListener('resize', this._onResize);

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = e.clientX - rect.left;
      const ny = e.clientY - rect.top;
      if (this.mouse.x !== -9999) {
        this.mouse.vx = (nx - this.mouse.x) * 0.3;
        this.mouse.vy = (ny - this.mouse.y) * 0.3;
      }
      this.mouse.x = nx;
      this.mouse.y = ny;
      this.mouse.isHovering = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHovering = false;
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.triggerShockwave(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (!e.touches[0]) return;
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.touches[0].clientX - rect.left;
      this.mouse.y = e.touches[0].clientY - rect.top;
      this.mouse.isHovering = true;
    }, { passive: true });

    this.canvas.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      const rect = this.canvas.getBoundingClientRect();
      const tx = e.touches[0].clientX - rect.left;
      const ty = e.touches[0].clientY - rect.top;
      this.mouse.x = tx;
      this.mouse.y = ty;
      this.mouse.isHovering = true;
      this.triggerShockwave(tx, ty);
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.isHovering = false;
    });
  }

  triggerShockwave(x, y) {
    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: Math.max(this.width, this.height) * 0.55,
      speed: 420,
      strength: 1.0,
      decay: 1.1
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

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (time) => {
      if (!this.isRunning) return;
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

      this.update(dt, (time - this.startTime) / 1000);
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

  update(dt, elapsed) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.strength -= sw.decay * dt;
      if (sw.strength <= 0 || sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  render(elapsed) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const palette = this.getPalette(this.options.colorScheme);
    const pitch = Math.max(6, Math.min(36, this.options.gridPitch));
    const mode = this.options.mode;
    const waveAmp = this.options.waveAmplitude;
    const waveFreq = this.options.waveFrequency;
    const contrast = this.options.contrast;
    const glow = this.options.glowIntensity;
    const allowDisplacement = this.options.displacement && !this.options.reducedMotion;
    const t = elapsed * 1.5 * this.options.flowSpeed;

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const cols = Math.ceil(this.width / pitch);
    const rows = Math.ceil(this.height / pitch);
    const maxRadius = (pitch / 2) * 0.94;

    for (let r = 0; r < rows; r++) {
      const baseY = r * pitch + pitch / 2;
      const vNorm = baseY / this.height;

      for (let c = 0; c < cols; c++) {
        const baseX = c * pitch + pitch / 2;
        const uNorm = baseX / this.width;

        const nx = uNorm * 3.4 * waveFreq;
        const ny = vNorm * 2.6 * waveFreq;

        let density = 0;
        let waveElev = 0;
        let lateralWave = 0;

        if (mode === 'diagonal-wave-sweep') {
          // Continuous diagonal rolling wave sweeps
          const diagPos = (uNorm * 0.7 + vNorm * 0.7);
          const w1 = Math.sin(diagPos * Math.PI * 6.0 * waveFreq - t * 2.5);
          const w2 = Math.cos(diagPos * Math.PI * 12.0 * waveFreq - t * 3.5) * 0.35;
          const noise = this.noise3D(nx, ny, t * 0.2) * 0.35;
          const diagonalBias = (1.0 - uNorm * 0.55) * (0.4 + vNorm * 0.75);

          density = ((w1 + w2 + noise + 1.35) * 0.4) * diagonalBias;
          waveElev = (w1 + w2) * 6.0 * waveAmp;
          lateralWave = Math.cos(diagPos * Math.PI * 6.0 - t * 2.5) * 3.0 * waveAmp;
        } else if (mode === 'radial-ripple-waves') {
          // Concentric radiating wave pulses from multiple nodal centers
          const d1 = Math.hypot(uNorm - 0.25, vNorm - 0.75);
          const d2 = Math.hypot(uNorm - 0.75, vNorm - 0.3);
          const rWave1 = Math.sin(d1 * 24 * waveFreq - t * 3.2);
          const rWave2 = Math.sin(d2 * 20 * waveFreq - t * 2.8) * 0.6;
          const noise = this.noise3D(nx, ny, t * 0.25) * 0.3;

          density = (rWave1 + rWave2 + noise + 1.6) * 0.32;
          waveElev = (rWave1 + rWave2) * 5.5 * waveAmp;
        } else if (mode === 'perlin-surf-tsunami') {
          // Turbulent plasma surf wave
          const warp = this.noise3D(nx + 1.0, ny, t * 0.4) * 1.2;
          const surf1 = Math.sin(ny * 4.0 + warp * 2.5 - t * 3.0);
          const surf2 = Math.cos(nx * 3.0 - ny * 2.0 - t * 2.0) * 0.5;
          const fbm = this.fbm(nx + warp, ny, t * 0.3, 2) * 0.5;

          density = (surf1 + surf2 + fbm + 1.8) * 0.32;
          waveElev = (surf1 + surf2) * 7.0 * waveAmp;
          lateralWave = warp * 4.0 * waveAmp;
        } else if (mode === 'topographic-contours') {
          const rawN = (this.fbm(nx, ny, t * 0.35, 3) + 1) * 0.5;
          const steps = 6;
          density = Math.floor(rawN * steps) / steps + (Math.sin(rawN * Math.PI * 12) * 0.08);
          waveElev = Math.sin(rawN * Math.PI * 8 - t * 2.0) * 3.0 * waveAmp;
        } else if (mode === 'molten-dispersion') {
          // Ambient FBM molten cluster
          const diagonalBias = (1.0 - uNorm * 0.65) * (0.35 + vNorm * 0.85);
          const warpX = this.noise3D(nx + 1.2, ny, t * 0.25) * 0.8;
          const warpY = this.noise3D(nx, ny + 2.4, t * 0.25) * 0.8;
          const n1 = this.fbm(nx + warpX, ny + warpY, t * 0.2, 3);
          const n2 = this.noise3D((nx - warpX) * 2.2, (ny - warpY) * 2.2, t * 0.35) * 0.35;
          density = (n1 + n2 + 0.85) * 0.55 * diagonalBias;
        } else {
          // 'ocean-waves' - Default: Majestic Rolling Halftone Ocean Swell Waves
          const wave1 = Math.sin(uNorm * 7.0 * waveFreq + vNorm * 5.0 * waveFreq - t * 2.8);
          const wave2 = Math.cos(uNorm * 11.0 * waveFreq - vNorm * 7.0 * waveFreq + t * 2.0) * 0.45;
          const wave3 = Math.sin(vNorm * 14.0 * waveFreq - t * 3.5) * 0.25;

          const noiseWarp = this.noise3D(nx + wave1 * 0.5, ny + wave2 * 0.5, t * 0.3) * 0.6;
          const diagonalBias = (1.0 - uNorm * 0.6) * (0.4 + vNorm * 0.8);

          const compositeWave = (wave1 + wave2 + wave3 + noiseWarp + 1.6) * 0.35;
          density = compositeWave * diagonalBias * 1.35;

          waveElev = (wave1 + wave2 * 0.7) * 7.5 * waveAmp;
          lateralWave = Math.cos(uNorm * 7.0 * waveFreq - t * 2.8) * 3.5 * waveAmp;
        }

        // Apply contrast curve
        density = Math.pow(Math.max(0, Math.min(1.0, density)), contrast);

        // Apply 3D wave position offset
        const gx = allowDisplacement ? baseX + lateralWave : baseX;
        const gy = allowDisplacement ? baseY + waveElev : baseY;

        // Mouse interaction wave wake
        if (this.mouse.isHovering) {
          const dMouse = Math.hypot(gx - this.mouse.x, gy - this.mouse.y);
          const mouseRadius = 140;
          if (dMouse < mouseRadius) {
            const mFactor = 1.0 - dMouse / mouseRadius;
            density = Math.min(1.0, density + mFactor * 0.7);
          }
        }

        // Propagating shockwave ripple pulses
        for (const sw of this.shockwaves) {
          const dSw = Math.hypot(gx - sw.x, gy - sw.y);
          const ringDist = Math.abs(dSw - sw.radius);
          if (ringDist < 50) {
            const waveMag = (1.0 - ringDist / 50) * sw.strength * 0.65;
            density = Math.min(1.0, density + waveMag);
          }
        }

        // Dot Radius & Color Assignment
        let dotRadius = 0;
        let dotColor = palette.c0;

        if (density < 0.08) {
          dotRadius = 0.8;
          dotColor = palette.c0;
        } else if (density < 0.3) {
          dotRadius = 1.2 + density * maxRadius * 0.85;
          dotColor = palette.c1;
        } else if (density < 0.6) {
          dotRadius = maxRadius * (0.35 + density * 0.5);
          dotColor = palette.c2;
        } else if (density < 0.85) {
          dotRadius = maxRadius * (0.55 + density * 0.4);
          dotColor = palette.c3;
        } else {
          dotRadius = maxRadius * Math.min(1.0, 0.78 + density * 0.22);
          dotColor = palette.c4;
        }

        // Phosphor glow bloom on wave crest peaks
        if (glow > 0.5 && density > 0.68) {
          ctx.shadowColor = palette.glow;
          ctx.shadowBlur = (density - 0.68) * 18 * glow;
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(gx, gy, Math.max(0.6, dotRadius), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;

    // CRT scanlines
    if (this.options.scanlines) {
      ctx.fillStyle = palette.scanline;
      for (let y = 0; y < this.height; y += 4) {
        ctx.fillRect(0, y, this.width, 1.5);
      }
    }

    ctx.restore();
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}
