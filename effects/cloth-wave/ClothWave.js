/**
 * ClothWave.js — 3D Wavy Cloth Particle Grid Animation
 * 
 * Flowing 3D surface of small dots arranged in a grid that undulate like silky fabric.
 * Dots on wave peaks are rendered larger and brighter; dots in valleys are smaller and dimmer.
 * 
 * ════════════════════════════════════════════════════════════════════════════
 *  TOP-LEVEL COLOR CONFIGURATION (Easily customize here)
 * ════════════════════════════════════════════════════════════════════════════
 */

export const DEFAULT_COLORS = {
  bg: '#000000',               // Deep pitch black background
  peak: '#ffffff',             // Brightest highlight on wave crests
  mid: '#38bdf8',              // Vibrant primary accent color at mid elevation
  valley: '#1e3a8a',           // Deep ambient blue-toned shadow in valleys
  meshLine: 'rgba(56, 189, 248, 0.08)' // Subtle connecting fabric lattice
};

export class ClothWave {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      // Grid dimensions & spacing (Wide aspect ratio across bottom half of screen)
      cols: 64,
      rows: 36,
      spacingX: 32,
      spacingZ: 26,

      // Wave dynamics
      waveAmplitude: 65,         // Max vertical displacement of waves
      waveSpeed: 0.8,            // Global wave movement speed
      waveFreqX: 0.006,          // Frequency along X axis
      waveFreqZ: 0.008,          // Frequency along Z axis

      // Dot sizing & styling
      baseDotRadius: 1.2,        // Minimum dot radius in valleys
      peakDotRadius: 3.2,        // Maximum dot radius on peaks
      showMeshLines: true,       // Render faint connecting cloth lattice lines
      
      // 3D Camera / Perspective (Angled for lower-half screen perspective)
      cameraFov: 440,            // Perspective FOV distance
      cameraPitch: 0.44,         // Tilt angle in radians (~25° downwards)
      cameraDist: 580,           // Distance offset along Z
      cameraElevation: 300,      // Camera height above ground plane

      // Colors (overridable)
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
    this.mouse = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      isHovering: false
    };

    this.time = 0;
    this.lastTime = performance.now();
    this.isRunning = false;
    this.rafId = null;

    this.handleResize();
    this.initGrid();
    this.bindEvents();
    this.start();
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

        this.particles.push({
          c, r,
          wx, wz, wy: 0,
          screenX: 0,
          screenY: 0,
          screenRadius: 1,
          elevationNorm: 0.5, // 0.0 (valley) to 1.0 (peak)
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
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());

    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = ((clientX - rect.left) / this.width) * 2 - 1;
      const ny = ((clientY - rect.top) / this.height) * 2 - 1;
      this.mouse.tx = nx * 140;
      this.mouse.ty = ny * 70;
      this.mouse.isHovering = true;
    };

    this.canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHovering = false;
      this.mouse.tx = 0;
      this.mouse.ty = 0;
    });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    this.canvas.addEventListener('touchend', () => {
      this.mouse.isHovering = false;
      this.mouse.tx = 0;
      this.mouse.ty = 0;
    });
  }

  setColors(newColors) {
    Object.assign(this.options.colors, newColors);
  }

  setOptions(newOpts) {
    Object.assign(this.options, newOpts);
    if ('cols' in newOpts || 'rows' in newOpts || 'spacingX' in newOpts || 'spacingZ' in newOpts) {
      this.initGrid();
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

  update(dt) {
    this.time += dt * this.options.waveSpeed;
    const t = this.time;

    // Mouse camera easing
    this.mouse.x += (this.mouse.tx - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.ty - this.mouse.y) * 0.08;

    const amp = this.options.waveAmplitude;
    const fx = this.options.waveFreqX;
    const fz = this.options.waveFreqZ;

    const cosPitch = Math.cos(this.options.cameraPitch);
    const sinPitch = Math.sin(this.options.cameraPitch);
    const fov = this.options.cameraFov;
    const camDist = this.options.cameraDist;
    const camElev = this.options.cameraElevation + this.mouse.y;
    const camOffsetX = this.mouse.x;

    const cx = this.width * 0.5;
    const cy = this.height * 0.72;

    const minR = this.options.baseDotRadius;
    const maxR = this.options.peakDotRadius;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const wx = p.wx;
      const wz = p.wz;

      // Multi-harmonic cloth wave equations
      const wave1 = Math.sin(wx * fx * 1.3 + wz * fz * 1.1 + t * 1.4);
      const wave2 = Math.cos(wx * fx * 0.8 - wz * fz * 1.6 + t * 0.9) * 0.7;
      const wave3 = Math.sin((wx + wz) * fx * 1.5 + t * 1.8) * 0.45;
      const wave4 = Math.cos(Math.hypot(wx, wz) * 0.006 - t * 1.2) * 0.35;

      const rawHeight = wave1 + wave2 + wave3 + wave4;
      const wy = rawHeight * (amp * 0.45);
      p.wy = wy;

      // Normalized elevation for peak/valley shading: 0.0 = deep valley, 1.0 = peak
      const normElev = Math.max(0, Math.min(1, (rawHeight + 2.5) / 5.0));
      p.elevationNorm = normElev;

      // 3D Camera Transformation (World to Camera Space)
      const relX = wx - camOffsetX;
      const relY = wy - camElev;
      const relZ = wz + camDist;

      // Pitch rotation around X axis
      const rotY = relY * cosPitch - relZ * sinPitch;
      const rotZ = relY * sinPitch + relZ * cosPitch;

      if (rotZ <= 10) {
        p.visible = false;
        continue;
      }

      p.visible = true;
      const scale = fov / rotZ;
      p.screenX = cx + relX * scale;
      p.screenY = cy - rotY * scale;

      // Peak dots look bigger + perspective scale
      p.screenRadius = Math.max(0.4, (minR + (maxR - minR) * normElev) * scale * 1.3);
    }
  }

  _parseHex(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
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
    const cols = this.options.cols;
    const rows = this.options.rows;
    const colors = this.options.colors;
    const showLines = this.options.showMeshLines;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Pitch black background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const rgbValley = this._parseHex(colors.valley);
    const rgbMid = this._parseHex(colors.mid);
    const rgbPeak = this._parseHex(colors.peak);

    // 2. Faint cloth grid lines connecting vertices
    if (showLines) {
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = colors.meshLine;
      ctx.beginPath();

      // Horizontal lines along cols
      for (let r = 0; r < rows; r++) {
        let drawing = false;
        for (let c = 0; c < cols; c++) {
          const p = this.particles[r * cols + c];
          if (!p.visible) {
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
          if (!p.visible) {
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

    // 3. Render Depth & Elevation Shaded Dots
    // Back-to-front rendering (r = 0 is farthest, r = rows - 1 is nearest)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.visible) continue;

      const norm = p.elevationNorm; // 0 = valley, 1 = peak
      const rad = p.screenRadius;

      // Color interpolation: valley -> mid -> peak
      let rgb;
      if (norm < 0.5) {
        rgb = this._lerpColor(rgbValley, rgbMid, norm * 2.0);
      } else {
        rgb = this._lerpColor(rgbMid, rgbPeak, (norm - 0.5) * 2.0);
      }

      // Brightness & Opacity: Valleys are dimmer (0.2), Peaks are bright (0.95)
      const alpha = 0.2 + norm * 0.75;

      ctx.fillStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.screenX, p.screenY, rad, 0, Math.PI * 2);
      ctx.fill();
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

export { ClothWave as ClothWaveEngine };
export default ClothWave;
