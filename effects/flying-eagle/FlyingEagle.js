/**
 * FlyingEagle.js
 * 
 * High-Performance Procedural 3D Flying Eagle Dot Matrix Grid Simulation.
 * Features:
 *  - Organic multi-jointed 3D avian anatomy: Body, Head, Golden Beak, Raptor Eye,
 *    Spread Tail Feathers, Multi-jointed Wings (Shoulder, Elbow, Wrist, Slotted Primaries)
 *  - Aerodynamic kinematics: Flapping downstroke/upstroke, soaring dihedral glides,
 *    inertia-based banking/rolling towards flight vectors and mouse targets.
 *  - Dot Matrix Shading: Screen-wide glowing phosphor dot grid with depth-modulated radius,
 *    feather striation, lighting luminance, and pressure wake ripples.
 *  - Wingtip vortex particles, thermal energy streamlines, and interactive supersonic dive bursts!
 */

export class FlyingEagle {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      flightMode: 'soaring-flapping', // 'soaring-flapping' | 'active-flap' | 'gliding' | 'dive-swoop'
      colorScheme: 'golden-eagle',    // 'golden-eagle' | 'bald-eagle' | 'cyber-raptor' | 'emerald-falcon' | 'midnight-hawk' | 'crimson-phoenix'
      gridPitch: 14,                  // Dot matrix spacing (8 - 28px)
      eagleScale: 1.2,                // Scale multiplier (0.6 - 2.2)
      flapSpeed: 1.0,                 // Flapping rate multiplier (0.4 - 3.0)
      trailDensity: 1.0,              // Vortex ribbon / thermal intensity
      interactive: true,              // Mouse steering & clicks
      glowIntensity: 1.3,             // Neon bloom multiplier
      scanlines: true,                // CRT monitor retro scanlines
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

    // Flight Physics State
    this.eagle = {
      x: 0,
      y: 0,
      z: 0,            // Altitude offset
      vx: 0,
      vy: 0,
      targetX: 0,
      targetY: 0,
      heading: -Math.PI / 2, // Heading angle (radians)
      targetHeading: -Math.PI / 2,
      bankAngle: 0,          // Roll tilt on turns
      pitchAngle: 0,         // Dive / climb pitch
      flapPhase: 0,          // Wing cycle (0 to 2*PI)
      glideTimer: 0,         // Time spent in continuous glide
      isGliding: false,
      diveBurst: 0,          // Dive/burst energy decay
      wingFlex: 0            // Upward aero deflection
    };

    // Aerodynamic Vortex Trail Particles
    this.vortexParticles = [];
    this.sparks = [];

    // Mouse tracking
    this.mouse = {
      x: -9999,
      y: -9999,
      isHovering: false,
      isDown: false
    };

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.options.reducedMotion = true;
    }

    this.handleResize();
    this.resetEaglePosition();
    this.bindEvents();
    this.start();
  }

  resetEaglePosition() {
    this.eagle.x = this.width * 0.5;
    this.eagle.y = this.height * 0.55;
    this.eagle.targetX = this.eagle.x;
    this.eagle.targetY = this.eagle.y - 40;
    this.eagle.vx = 0;
    this.eagle.vy = -1;
  }

  getPalette(scheme) {
    switch (scheme) {
      case 'bald-eagle':
        return {
          bg: '#060911',
          body: '#4a2c11',       // Dark chocolate brown plumage
          wingCore: '#3b200b',   // Deep feather base
          wingEdge: '#ffffff',   // White primary feather trims
          head: '#ffffff',       // Pure white head plumage
          tail: '#ffffff',       // White fan tail
          beak: '#f59e0b',       // Golden curved raptor beak
          eye: '#fef08a',        // Fierce yellow eye
          vortex: 'rgba(255, 255, 255, 0.45)',
          glow: 'rgba(245, 158, 11, 0.35)',
          gridDot: 'rgba(255, 255, 255, 0.04)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'cyber-raptor':
        return {
          bg: '#040714',
          body: '#00f0ff',
          wingCore: '#0284c7',
          wingEdge: '#ff007f',
          head: '#ffffff',
          tail: '#00f0ff',
          beak: '#f43f5e',
          eye: '#38bdf8',
          vortex: 'rgba(0, 240, 255, 0.55)',
          glow: 'rgba(0, 240, 255, 0.45)',
          gridDot: 'rgba(0, 240, 255, 0.05)',
          scanline: 'rgba(0, 0, 0, 0.24)'
        };
      case 'emerald-falcon':
        return {
          bg: '#020b05',
          body: '#10b981',
          wingCore: '#047857',
          wingEdge: '#6ee7b7',
          head: '#d1fae5',
          tail: '#34d399',
          beak: '#fbbf24',
          eye: '#a7f3d0',
          vortex: 'rgba(16, 185, 129, 0.55)',
          glow: 'rgba(16, 185, 129, 0.40)',
          gridDot: 'rgba(16, 185, 129, 0.05)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'midnight-hawk':
        return {
          bg: '#050716',
          body: '#6366f1',
          wingCore: '#3730a3',
          wingEdge: '#a5b4fc',
          head: '#c7d2fe',
          tail: '#818cf8',
          beak: '#f59e0b',
          eye: '#67e8f9',
          vortex: 'rgba(99, 102, 241, 0.55)',
          glow: 'rgba(99, 102, 241, 0.40)',
          gridDot: 'rgba(99, 102, 241, 0.05)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'crimson-phoenix':
        return {
          bg: '#0f0507',
          body: '#ef4444',
          wingCore: '#991b1b',
          wingEdge: '#fbbf24',
          head: '#fef08a',
          tail: '#f97316',
          beak: '#fbbf24',
          eye: '#ffffff',
          vortex: 'rgba(239, 68, 68, 0.60)',
          glow: 'rgba(249, 115, 22, 0.45)',
          gridDot: 'rgba(239, 68, 68, 0.05)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
      case 'golden-eagle':
      default:
        return {
          bg: '#090805',
          body: '#d97706',       // Rich radiant amber gold
          wingCore: '#92400e',   // Burnished bronze feather mantle
          wingEdge: '#fef08a',   // Brilliant 24k gold wingtips
          head: '#fde68a',       // Golden crown plumage
          tail: '#b45309',       // Spread amber tail fan
          beak: '#fef08a',       // Radiant sharp beak
          eye: '#ffffff',        // Piercing raptor eye
          vortex: 'rgba(245, 158, 11, 0.55)',
          glow: 'rgba(217, 119, 6, 0.45)',
          gridDot: 'rgba(245, 158, 11, 0.05)',
          scanline: 'rgba(0, 0, 0, 0.22)'
        };
    }
  }

  bindEvents() {
    this._onResize = () => this.handleResize();
    window.addEventListener('resize', this._onResize);

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.isHovering = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHovering = false;
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    });

    this.canvas.addEventListener('mousedown', () => {
      this.triggerDiveBurst();
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
      this.mouse.x = e.touches[0].clientX - rect.left;
      this.mouse.y = e.touches[0].clientY - rect.top;
      this.mouse.isHovering = true;
      this.triggerDiveBurst();
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.mouse.isHovering = false;
    });
  }

  triggerDiveBurst() {
    this.eagle.diveBurst = 1.0;
    // Emit supersonic shockwave burst sparks around eagle
    const pal = this.getPalette(this.options.colorScheme);
    for (let i = 0; i < 28; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 8;
      this.sparks.push({
        x: this.eagle.x,
        y: this.eagle.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: pal.wingEdge,
        size: 2 + Math.random() * 3,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.025
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

  setOption(key, val) {
    this.options[key] = val;
  }

  // ─────────────────────────────────────────────────────────────
  // Physics, Flight Kinematics & Wing Anatomy Update Loop
  // ─────────────────────────────────────────────────────────────

  update(dt, elapsed) {
    const eg = this.eagle;
    const mode = this.options.flightMode;
    const flapRate = this.options.flapSpeed * (this.options.reducedMotion ? 0.4 : 1.0);

    // 1. Target Guidance & Autonomous Soaring Trajectory
    let targetX, targetY;
    if (this.mouse.isHovering && this.options.interactive) {
      targetX = this.mouse.x;
      targetY = this.mouse.y;
    } else {
      // Majestic figure-8 soaring flight path across the sky
      const t = elapsed * 0.45;
      const centerX = this.width * 0.5;
      const centerY = this.height * 0.48;
      const radiusX = this.width * 0.35;
      const radiusY = this.height * 0.22;
      targetX = centerX + Math.sin(t) * radiusX;
      targetY = centerY + Math.sin(t * 2) * radiusY * 0.5 + Math.cos(t * 0.8) * 30;
    }

    // 2. Velocity, Steering & Banking Calculation
    const dx = targetX - eg.x;
    const dy = targetY - eg.y;
    const distToTarget = Math.hypot(dx, dy);

    // Desired flight heading
    if (distToTarget > 15) {
      eg.targetHeading = Math.atan2(dy, dx);
    }

    // Smooth heading interpolation (shortest angle arc)
    let dHeading = eg.targetHeading - eg.heading;
    while (dHeading > Math.PI) dHeading -= Math.PI * 2;
    while (dHeading < -Math.PI) dHeading += Math.PI * 2;
    eg.heading += dHeading * 3.5 * dt;

    // Aerodynamic banking: Roll angle proportional to turn rate
    const targetBank = Math.max(-0.65, Math.min(0.65, dHeading * 2.2));
    eg.bankAngle += (targetBank - eg.bankAngle) * 5.0 * dt;

    // Pitch: angle between current heading and forward horizon
    eg.pitchAngle = Math.sin(eg.heading) * 0.35;

    // Flight forward thrust
    const baseSpeed = (mode === 'dive-swoop' ? 260 : 160) * (1.0 + eg.diveBurst * 1.5);
    const forwardX = Math.cos(eg.heading) * baseSpeed;
    const forwardY = Math.sin(eg.heading) * baseSpeed;

    eg.vx += (forwardX - eg.vx) * 3.0 * dt;
    eg.vy += (forwardY - eg.vy) * 3.0 * dt;

    eg.x += eg.vx * dt;
    eg.y += eg.vy * dt;

    // Clamp inside viewport margins with soft bounce
    const margin = 60;
    if (eg.x < margin) eg.x = margin;
    if (eg.x > this.width - margin) eg.x = this.width - margin;
    if (eg.y < margin) eg.y = margin;
    if (eg.y > this.height - margin) eg.y = this.height - margin;

    // 3. Realistic Wing Flapping / Gliding Kinematics
    if (mode === 'gliding') {
      eg.isGliding = true;
    } else if (mode === 'active-flap') {
      eg.isGliding = false;
    } else {
      // Natural cycle: 2-3 strong flaps, then a graceful 3-second soaring glide
      eg.glideTimer += dt;
      if (eg.glideTimer > 4.5) {
        eg.isGliding = !eg.isGliding;
        eg.glideTimer = 0;
      }
    }

    if (!eg.isGliding) {
      eg.flapPhase += Math.PI * 2 * 1.4 * flapRate * dt;
    } else {
      // Subtle wing breathing in thermal updrafts while soaring
      eg.flapPhase += Math.sin(elapsed * 2.0) * 0.3 * dt;
    }

    if (eg.diveBurst > 0) {
      eg.diveBurst = Math.max(0, eg.diveBurst - dt * 1.2);
    }

    // Wing Aero Flex (lift forces deflect tips upwards)
    eg.wingFlex = Math.sin(eg.flapPhase) * 0.45;

    // 4. Wingtip Vortex Particles
    if (this.options.trailDensity > 0.1 && Math.random() < 0.85 * this.options.trailDensity) {
      const pal = this.getPalette(this.options.colorScheme);
      const span = 110 * this.options.eagleScale;
      const wingCos = Math.cos(eg.heading + Math.PI / 2);
      const wingSin = Math.sin(eg.heading + Math.PI / 2);

      // Left & Right wingtip spawn positions
      const tip1X = eg.x + wingCos * span;
      const tip1Y = eg.y + wingSin * span;
      const tip2X = eg.x - wingCos * span;
      const tip2Y = eg.y - wingSin * span;

      for (const [tx, ty] of [[tip1X, tip1Y], [tip2X, tip2Y]]) {
        this.vortexParticles.push({
          x: tx,
          y: ty,
          vx: -eg.vx * 0.15 + (Math.random() - 0.5) * 15,
          vy: -eg.vy * 0.15 + (Math.random() - 0.5) * 15,
          alpha: 0.85,
          size: 2.0 + Math.random() * 3.0,
          color: pal.vortex,
          decay: 0.025 + Math.random() * 0.02
        });
      }
    }

    // Update vortex trails
    for (let i = this.vortexParticles.length - 1; i >= 0; i--) {
      const p = this.vortexParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay;
      if (p.alpha <= 0) this.vortexParticles.splice(i, 1);
    }

    // Update sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.alpha -= s.decay;
      if (s.alpha <= 0) this.sparks.splice(i, 1);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Dot Matrix Shader & 3D Avian Geometry Renderer
  // ─────────────────────────────────────────────────────────────

  render(elapsed) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    const palette = this.getPalette(this.options.colorScheme);
    const pitch = Math.max(8, Math.min(32, this.options.gridPitch));
    const eg = this.eagle;
    const scale = this.options.eagleScale;
    const glow = this.options.glowIntensity;

    // 1. Deep Space Atmospheric Canvas Background
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Compute 3D Eagle Anatomical Skeletal Nodes in World Space
    const headAngle = eg.heading;
    const cosH = Math.cos(headAngle);
    const sinH = Math.sin(headAngle);
    const wingPerpCos = Math.cos(headAngle + Math.PI / 2);
    const wingPerpSin = Math.sin(headAngle + Math.PI / 2);

    // Wing flap dihedral amplitude (Y elevation in local eagle space)
    const flapZ = eg.isGliding 
      ? Math.sin(elapsed * 1.5) * 0.08 - 0.12 // Dihedral V-wing soaring stance
      : Math.sin(eg.flapPhase);              // Deep flapping down/upstroke

    // Anatomical 3D Keypoints:
    // Center of body/heart
    const bodyX = eg.x;
    const bodyY = eg.y;

    // Head and Beak (Forward)
    const headLen = 38 * scale;
    const headX = bodyX + cosH * headLen;
    const headY = bodyY + sinH * headLen;
    const beakX = bodyX + cosH * (headLen + 18 * scale);
    const beakY = bodyY + sinH * (headLen + 18 * scale);

    // Left & Right Raptor Eyes
    const eyeSpread = 5.5 * scale;
    const eye1X = headX + cosH * 4 * scale + wingPerpCos * eyeSpread;
    const eye1Y = headY + sinH * 4 * scale + wingPerpSin * eyeSpread;
    const eye2X = headX + cosH * 4 * scale - wingPerpCos * eyeSpread;
    const eye2Y = headY + sinH * 4 * scale - wingPerpSin * eyeSpread;

    // Tail Base & Spread Tail Feathers (Backward)
    const tailBaseLen = -28 * scale;
    const tailBaseX = bodyX + cosH * tailBaseLen;
    const tailBaseY = bodyY + sinH * tailBaseLen;
    const tailTipLen = -56 * scale;
    const tailTipX = bodyX + cosH * tailTipLen;
    const tailTipY = bodyY + sinH * tailTipLen;

    // Left Wing Nodes (Shoulder -> Elbow -> Wrist -> 5 Wingtip Feathers)
    const wingSpan = 118 * scale;
    const bankMult = eg.bankAngle;

    // Calculate left & right multi-jointed wing paths
    const computeWing = (side) => {
      // side: 1 for Left Wing, -1 for Right Wing
      const s = side;
      const bankOffset = s * bankMult * 24 * scale;
      const strokeZ = (flapZ * 38 + bankOffset) * scale;

      // Shoulder
      const shX = bodyX + cosH * (6 * scale) + wingPerpCos * (14 * scale * s);
      const shY = bodyY + sinH * (6 * scale) + wingPerpSin * (14 * scale * s);

      // Elbow
      const elX = bodyX + cosH * (-4 * scale) + wingPerpCos * (48 * scale * s);
      const elY = bodyY + sinH * (-4 * scale) + wingPerpSin * (48 * scale * s) - strokeZ * 0.45;

      // Wrist
      const wrX = bodyX + cosH * (8 * scale) + wingPerpCos * (88 * scale * s);
      const wrY = bodyY + sinH * (8 * scale) + wingPerpSin * (88 * scale * s) - strokeZ * 0.85;

      // Primary Wingtip Feathers (5 slotted quills)
      const primaryFeathers = [];
      for (let f = 0; f < 5; f++) {
        const spreadAngle = (f - 2) * 0.12;
        const featherLen = (wingSpan * 0.38) * (1.0 - f * 0.08);
        const fCos = Math.cos(headAngle + Math.PI / 2 * s + spreadAngle);
        const fSin = Math.sin(headAngle + Math.PI / 2 * s + spreadAngle);
        primaryFeathers.push({
          x: wrX + fCos * featherLen,
          y: wrY + fSin * featherLen - strokeZ * (1.0 + f * 0.1)
        });
      }

      return { shoulder: { x: shX, y: shY }, elbow: { x: elX, y: elY }, wrist: { x: wrX, y: wrY }, primaries: primaryFeathers };
    };

    const leftWing = computeWing(1);
    const rightWing = computeWing(-1);

    // 3. Render Optical Dot Matrix Grid Field with Dynamic Raptor Sampling
    const cols = Math.ceil(this.width / pitch);
    const rows = Math.ceil(this.height / pitch);

    // Distance helper functions
    const distToSeg = (px, py, x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq === 0) return Math.hypot(px - x1, py - y1);
      let t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    };

    for (let r = 0; r < rows; r++) {
      const gy = r * pitch + pitch / 2;
      for (let c = 0; c < cols; c++) {
        const gx = c * pitch + pitch / 2;

        // Base idle grid dot
        let dotColor = palette.gridDot;
        let dotRadius = 1.0;
        let isEagleDot = false;
        let luminance = 0;

        // Sample Body Distance
        const distBody = distToSeg(gx, gy, headX, headY, tailBaseX, tailBaseY);
        const bodyThick = 18 * scale;
        if (distBody < bodyThick) {
          luminance = Math.max(luminance, 1.0 - distBody / bodyThick);
          dotColor = palette.body;
          isEagleDot = true;
        }

        // Sample Head & Beak
        const distHead = Math.hypot(gx - headX, gy - headY);
        if (distHead < 14 * scale) {
          luminance = Math.max(luminance, 1.2 - distHead / (14 * scale));
          dotColor = palette.head;
          isEagleDot = true;
        }
        const distBeak = distToSeg(gx, gy, headX, headY, beakX, beakY);
        if (distBeak < 6 * scale) {
          luminance = Math.max(luminance, 1.4);
          dotColor = palette.beak;
          isEagleDot = true;
        }

        // Sample Eyes
        if (Math.hypot(gx - eye1X, gy - eye1Y) < 3.8 * scale || Math.hypot(gx - eye2X, gy - eye2Y) < 3.8 * scale) {
          luminance = 2.0;
          dotColor = palette.eye;
          isEagleDot = true;
        }

        // Sample Tail Fan
        const distTail = distToSeg(gx, gy, tailBaseX, tailBaseY, tailTipX, tailTipY);
        if (distTail < 18 * scale) {
          luminance = Math.max(luminance, 0.9 - distTail / (18 * scale));
          dotColor = palette.tail;
          isEagleDot = true;
        }

        // Sample Wings (Left & Right)
        for (const w of [leftWing, rightWing]) {
          // Arm bone segments
          const dShEl = distToSeg(gx, gy, w.shoulder.x, w.shoulder.y, w.elbow.x, w.elbow.y);
          if (dShEl < 16 * scale) {
            luminance = Math.max(luminance, 1.0 - dShEl / (16 * scale));
            dotColor = palette.wingCore;
            isEagleDot = true;
          }

          const dElWr = distToSeg(gx, gy, w.elbow.x, w.elbow.y, w.wrist.x, w.wrist.y);
          if (dElWr < 14 * scale) {
            luminance = Math.max(luminance, 1.0 - dElWr / (14 * scale));
            dotColor = palette.wingCore;
            isEagleDot = true;
          }

          // Primary feather finger slots
          for (let f = 0; f < w.primaries.length; f++) {
            const p = w.primaries[f];
            const dFeather = distToSeg(gx, gy, w.wrist.x, w.wrist.y, p.x, p.y);
            if (dFeather < 7.5 * scale) {
              const featherLum = 1.0 - dFeather / (7.5 * scale);
              if (featherLum > luminance) {
                luminance = featherLum;
                dotColor = (f === 0 || f === 4) ? palette.wingEdge : palette.wingCore;
                isEagleDot = true;
              }
            }
          }
        }

        // Render Dot
        if (isEagleDot) {
          dotRadius = Math.max(1.5, Math.min(pitch * 0.46, 2.5 + luminance * 4.2 * scale));
          ctx.fillStyle = dotColor;

          // Bloom halo on core body / eyes
          if (glow > 1.0 && luminance > 0.8) {
            ctx.shadowColor = dotColor;
            ctx.shadowBlur = luminance * 10 * glow;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Subtle atmospheric background dot
          ctx.shadowBlur = 0;
          ctx.fillStyle = palette.gridDot;
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.shadowBlur = 0;

    // 4. Render Vortex Trail Particles
    for (const p of this.vortexParticles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 5. Render Dive Shockwave Sparks
    for (const s of this.sparks) {
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0, s.alpha);
      ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
    }
    ctx.globalAlpha = 1.0;

    // 6. Interactive Flight Guidance Cursor Target
    if (this.mouse.isHovering && this.options.interactive) {
      ctx.strokeStyle = palette.beak;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.mouse.x, this.mouse.y, 16, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair tick marks
      ctx.beginPath();
      ctx.moveTo(this.mouse.x - 22, this.mouse.y);
      ctx.lineTo(this.mouse.x - 8, this.mouse.y);
      ctx.moveTo(this.mouse.x + 8, this.mouse.y);
      ctx.lineTo(this.mouse.x + 22, this.mouse.y);
      ctx.moveTo(this.mouse.x, this.mouse.y - 22);
      ctx.lineTo(this.mouse.x, this.mouse.y - 8);
      ctx.moveTo(this.mouse.x, this.mouse.y + 8);
      ctx.lineTo(this.mouse.x, this.mouse.y + 22);
      ctx.stroke();
    }

    // 7. CRT Retro Arcade Scanlines
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
