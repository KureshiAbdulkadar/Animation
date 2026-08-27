/**
 * Constellation Field — Complete Multi-Renderer Collection
 * 
 * Includes 7 Canvas 2D renderers + 1 Raw WebGL renderer.
 * Lazy-loads and isolates the active source without cross-contamination.
 * 
 * Variants:
 * 1. constellation-field
 * 2. particle-drift
 * 3. particle-network
 * 4. gateway-flow
 * 5. connectivity-graph
 * 6. interface-lines
 * 7. defense-lines
 * 8. topo-field (Raw WebGL)
 */

export class ConstellationField {
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      variant: 'constellation-field',
      mode: 'dark',
      speed: 1,
      size: 1,
      strokeWidth: 1,
      length: 1,
      density: 1,
      opacity: 1,
      palette: '#00ffd2'
    }, options);

    this.activeRenderer = null;
    this.canvas = null;
    this.ctx = null;
    this.gl = null;
    this.rafId = null;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;

    this.mouse = { x: 0, y: 0, px: 0, py: 0, isDown: false, isMoving: false };

    this.init();
  }

  init() {
    this.setupDOM();
    this.setupListeners();
    this.mountVariant(this.options.variant);
  }

  setupDOM() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.innerHTML = '';
    this.container.appendChild(this.canvas);
  }

  setupListeners() {
    this.onResize = this.onResize.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);

    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
  }

  onResize() {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width || window.innerWidth;
    this.height = rect.height || window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.activeRenderer && this.activeRenderer.resize) {
      this.activeRenderer.resize(this.width, this.height);
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
    this.mouse.px = this.mouse.x / this.width;
    this.mouse.py = this.mouse.y / this.height;
    this.mouse.isMoving = true;
  }

  onMouseDown() {
    this.mouse.isDown = true;
  }

  onMouseUp() {
    this.mouse.isDown = false;
  }

  onTouchMove(e) {
    if (e.touches.length > 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.touches[0].clientX - rect.left;
      this.mouse.y = e.touches[0].clientY - rect.top;
      this.mouse.px = this.mouse.x / this.width;
      this.mouse.py = this.mouse.y / this.height;
      this.mouse.isMoving = true;
    }
  }

  update(newOptions = {}) {
    const prevVariant = this.options.variant;
    Object.assign(this.options, newOptions);

    if (newOptions.variant && newOptions.variant !== prevVariant) {
      this.mountVariant(newOptions.variant);
    } else if (this.activeRenderer && this.activeRenderer.updateProps) {
      this.activeRenderer.updateProps(this.options);
    }
  }

  mountVariant(variant) {
    this.teardown();
    this.options.variant = variant;

    // Reset canvas & context
    this.setupDOM();

    if (variant === 'topo-field') {
      // 8. Raw WebGL Renderer
      this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
      if (this.gl) {
        this.activeRenderer = new TopoFieldWebGLRenderer(this.gl, this);
      } else {
        // Fallback to Canvas 2D topo renderer
        this.ctx = this.canvas.getContext('2d');
        this.activeRenderer = new TopoField2DRenderer(this.ctx, this);
      }
    } else {
      // Canvas 2D Renderers (1-7)
      this.ctx = this.canvas.getContext('2d');
      switch (variant) {
        case 'constellation-field':
          this.activeRenderer = new ConstellationFieldRenderer(this.ctx, this);
          break;
        case 'particle-drift':
          this.activeRenderer = new ParticleDriftRenderer(this.ctx, this);
          break;
        case 'particle-network':
          this.activeRenderer = new ParticleNetworkRenderer(this.ctx, this);
          break;
        case 'gateway-flow':
          this.activeRenderer = new GatewayFlowRenderer(this.ctx, this);
          break;
        case 'connectivity-graph':
          this.activeRenderer = new ConnectivityGraphRenderer(this.ctx, this);
          break;
        case 'interface-lines':
          this.activeRenderer = new InterfaceLinesRenderer(this.ctx, this);
          break;
        case 'defense-lines':
          this.activeRenderer = new DefenseLinesRenderer(this.ctx, this);
          break;
        default:
          this.activeRenderer = new ConstellationFieldRenderer(this.ctx, this);
          break;
      }
    }

    this.onResize();
    this.mouse.x = this.width / 2;
    this.mouse.y = this.height / 2;
    this.startLoop();
  }

  startLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (this.activeRenderer) {
        this.activeRenderer.render(now, delta);
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  teardown() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.activeRenderer && this.activeRenderer.destroy) {
      this.activeRenderer.destroy();
    }
    this.activeRenderer = null;
    this.ctx = null;
    this.gl = null;
  }

  destroy() {
    this.teardown();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('touchmove', this.onTouchMove);
    this.container.innerHTML = '';
  }
}

/* =============================================================================
   1. Constellation Field Renderer (Canvas 2D)
   ============================================================================= */
class ConstellationFieldRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
    this.stars = [];
    this.init();
  }

  init() {
    const count = Math.floor(100 * this.host.options.density);
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * (this.host.width || 800),
        y: Math.random() * (this.host.height || 600),
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: 1.0 + Math.random() * 2.2 * this.host.options.size,
        orbitRadius: Math.random() < 0.25 ? 12 + Math.random() * 20 : 0,
        orbitAngle: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 3,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  resize() {
    this.init();
  }

  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options, mouse } = host;
    const isDark = options.mode === 'dark';

    // Clear
    ctx.fillStyle = isDark ? '#07090e' : '#f4f6fa';
    ctx.fillRect(0, 0, width, height);

    const speed = options.speed;
    const strokeWidth = options.strokeWidth;
    const maxDist = 130 * options.length;
    const accent = options.palette || '#00ffd2';

    // Draw background nebula haze
    const grad = ctx.createRadialGradient(mouse.x, mouse.y, 20, mouse.x, mouse.y, width * 0.6);
    grad.addColorStop(0, isDark ? 'rgba(0, 255, 210, 0.06)' : 'rgba(0, 160, 140, 0.05)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Update positions
    for (let s of this.stars) {
      s.x += s.vx * speed * 60 * delta;
      s.y += s.vy * speed * 60 * delta;

      if (s.x < 0) s.x = width;
      if (s.x > width) s.x = 0;
      if (s.y < 0) s.y = height;
      if (s.y > height) s.y = 0;
    }

    // Draw constellation lines
    ctx.lineWidth = strokeWidth * 0.9;
    for (let i = 0; i < this.stars.length; i++) {
      const a = this.stars[i];
      for (let j = i + 1; j < this.stars.length; j++) {
        const b = this.stars[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);

        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.45 * options.opacity;
          ctx.strokeStyle = isDark
            ? `rgba(180, 225, 255, ${alpha})`
            : `rgba(20, 60, 100, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Mouse proximity lines
      const mdx = mouse.x - a.x;
      const mdy = mouse.y - a.y;
      const mdist = Math.hypot(mdx, mdy);
      if (mdist < maxDist * 1.3) {
        const alpha = (1 - mdist / (maxDist * 1.3)) * 0.7 * options.opacity;
        ctx.strokeStyle = accent;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw star nodes
    for (let s of this.stars) {
      const twinkle = 0.7 + 0.3 * Math.sin(time * 0.003 * s.twinkleSpeed + s.twinklePhase);
      const rad = s.radius * twinkle;

      ctx.fillStyle = isDark ? '#ffffff' : '#1a2233';
      ctx.beginPath();
      ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
      ctx.fill();

      // Satellite sub-node
      if (s.orbitRadius > 0) {
        s.orbitAngle += 0.02 * speed;
        const sx = s.x + Math.cos(s.orbitAngle) * s.orbitRadius;
        const sy = s.y + Math.sin(s.orbitAngle) * s.orbitRadius;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(sx, sy, rad * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.orbitRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  destroy() {
    this.stars = [];
  }
}

/* =============================================================================
   2. Particle Drift Renderer (Canvas 2D)
   ============================================================================= */
class ParticleDriftRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
    this.particles = [];
    this.init();
  }

  init() {
    const count = Math.floor(180 * this.host.options.density);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * (this.host.width || 800),
        y: Math.random() * (this.host.height || 600),
        z: Math.random(),
        baseVx: 0.3 + Math.random() * 0.8,
        baseVy: (Math.random() - 0.5) * 0.3,
        size: (1.0 + Math.random() * 2.5) * this.host.options.size,
        history: []
      });
    }
  }

  resize() { this.init(); }

  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options, mouse } = host;
    const isDark = options.mode === 'dark';
    const speed = options.speed;
    const accent = options.palette || '#00ffd2';

    ctx.fillStyle = isDark ? '#06080d' : '#f0f3f8';
    ctx.fillRect(0, 0, width, height);

    for (let p of this.particles) {
      // Wind curl noise
      const curl = Math.sin(p.y * 0.005 + time * 0.001 * speed) * 0.4;
      let vx = (p.baseVx + curl) * speed;
      let vy = (p.baseVy + Math.cos(p.x * 0.004) * 0.3) * speed;

      // Mouse deflection
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        const force = (1 - dist / 140) * 2.5;
        vx += (dx / dist) * force;
        vy += (dy / dist) * force;
      }

      p.x += vx * 60 * delta;
      p.y += vy * 60 * delta;

      if (p.x > width + 20) { p.x = -20; p.history = []; }
      if (p.x < -20) { p.x = width + 20; p.history = []; }
      if (p.y > height + 20) { p.y = -20; p.history = []; }
      if (p.y < -20) { p.y = height + 20; p.history = []; }

      p.history.push({ x: p.x, y: p.y });
      if (p.history.length > 12 * options.length) p.history.shift();

      // Render trail
      if (p.history.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y);
        }
        ctx.strokeStyle = accent;
        ctx.globalAlpha = p.z * 0.25 * options.opacity;
        ctx.lineWidth = options.strokeWidth * p.z;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Render dot
      ctx.fillStyle = isDark ? '#ffffff' : '#182030';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.z, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() { this.particles = []; }
}

/* =============================================================================
   3. Particle Network Renderer (Canvas 2D)
   ============================================================================= */
class ParticleNetworkRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
    this.nodes = [];
    this.init();
  }

  init() {
    const count = Math.floor(75 * this.host.options.density);
    this.nodes = [];
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        x: Math.random() * (this.host.width || 800),
        y: Math.random() * (this.host.height || 600),
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        mass: 1 + Math.random() * 2,
        connections: []
      });
    }
  }

  resize() { this.init(); }

  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options, mouse } = host;
    const isDark = options.mode === 'dark';
    const speed = options.speed;
    const maxDist = 120 * options.length;
    const accent = options.palette || '#00ffd2';

    ctx.fillStyle = isDark ? '#05070a' : '#f5f7fb';
    ctx.fillRect(0, 0, width, height);

    // Spring physics between nodes
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);

        if (dist < maxDist && dist > 1) {
          const force = (dist - maxDist * 0.6) * 0.0002 * speed;
          a.vx += (dx / dist) * force;
          a.vy += (dy / dist) * force;
          b.vx -= (dx / dist) * force;
          b.vy -= (dy / dist) * force;

          const alpha = (1 - dist / maxDist) * 0.55 * options.opacity;
          ctx.strokeStyle = accent;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = options.strokeWidth;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }
      }

      // Mouse repulsion
      const mdx = a.x - mouse.x;
      const mdy = a.y - mouse.y;
      const mdist = Math.hypot(mdx, mdy);
      if (mdist < 150 && mdist > 1) {
        const rep = (1 - mdist / 150) * 0.8;
        a.vx += (mdx / mdist) * rep;
        a.vy += (mdy / mdist) * rep;
      }

      // Damping
      a.vx *= 0.98;
      a.vy *= 0.98;

      a.x += a.vx * speed * 60 * delta;
      a.y += a.vy * speed * 60 * delta;

      if (a.x < 10 || a.x > width - 10) a.vx *= -1;
      if (a.y < 10 || a.y > height - 10) a.vy *= -1;

      // Draw node
      ctx.fillStyle = isDark ? '#ffffff' : '#0d131f';
      ctx.beginPath();
      ctx.arc(a.x, a.y, (2.2 + a.mass) * options.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() { this.nodes = []; }
}

/* =============================================================================
   4. Gateway Flow Renderer (Canvas 2D)
   ============================================================================= */
class GatewayFlowRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
    this.particles = [];
    this.rings = [];
    this.init();
  }

  init() {
    const count = Math.floor(220 * this.host.options.density);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        angle: Math.random() * Math.PI * 2,
        z: Math.random() * 1000,
        radius: 40 + Math.random() * 320,
        speed: 2 + Math.random() * 4
      });
    }
    this.rings = [0.2, 0.4, 0.6, 0.8, 1.0];
  }

  resize() { this.init(); }

  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options, mouse } = host;
    const isDark = options.mode === 'dark';
    const speed = options.speed;
    const accent = options.palette || '#00ffd2';

    ctx.fillStyle = isDark ? '#040609' : '#eef2f9';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2 + (mouse.x - width / 2) * 0.2;
    const cy = height / 2 + (mouse.y - height / 2) * 0.2;

    // Gateway depth rings
    ctx.lineWidth = options.strokeWidth;
    for (let i = 0; i < this.rings.length; i++) {
      this.rings[i] -= 0.003 * speed;
      if (this.rings[i] < 0) this.rings[i] = 1.0;

      const r = Math.pow(this.rings[i], 2.2) * Math.min(width, height) * 0.45;
      const alpha = this.rings[i] * 0.4 * options.opacity;
      ctx.strokeStyle = accent;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Warp streak particles
    for (let p of this.particles) {
      p.z -= p.speed * speed * 60 * delta * 5;
      if (p.z <= 1) p.z = 1000;

      const k = 400 / p.z;
      const x = cx + Math.cos(p.angle) * p.radius * k;
      const y = cy + Math.sin(p.angle) * p.radius * k;

      const prevK = 400 / (p.z + 20 * options.length);
      const px = cx + Math.cos(p.angle) * p.radius * prevK;
      const py = cy + Math.sin(p.angle) * p.radius * prevK;

      const alpha = Math.min(1.0, (1 - p.z / 1000) * 1.5) * options.opacity;
      ctx.strokeStyle = isDark ? '#ffffff' : '#141a24';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(0.8, (1 - p.z / 1000) * 3 * options.size);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
  }

  destroy() { this.particles = []; }
}

/* =============================================================================
   5. Connectivity Graph Renderer (Canvas 2D)
   ============================================================================= */
class ConnectivityGraphRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
    this.clusters = [];
    this.packets = [];
    this.init();
  }

  init() {
    const { width, height } = this.host;
    const w = width || 800;
    const h = height || 600;

    this.clusters = [
      { x: w * 0.25, y: h * 0.35, nodes: [] },
      { x: w * 0.72, y: h * 0.30, nodes: [] },
      { x: w * 0.48, y: h * 0.68, nodes: [] },
      { x: w * 0.80, y: h * 0.75, nodes: [] },
      { x: w * 0.20, y: h * 0.78, nodes: [] }
    ];

    for (let c of this.clusters) {
      const count = 6 + Math.floor(Math.random() * 6);
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = 25 + Math.random() * 75;
        c.nodes.push({
          x: c.x + Math.cos(ang) * rad,
          y: c.y + Math.sin(ang) * rad,
          size: 2 + Math.random() * 3,
          isHub: i === 0
        });
      }
    }

    this.packets = [];
    for (let i = 0; i < 24; i++) {
      this.spawnPacket();
    }
  }

  spawnPacket() {
    const c1 = this.clusters[Math.floor(Math.random() * this.clusters.length)];
    const c2 = this.clusters[Math.floor(Math.random() * this.clusters.length)];
    if (c1 === c2) return;
    const n1 = c1.nodes[Math.floor(Math.random() * c1.nodes.length)];
    const n2 = c2.nodes[Math.floor(Math.random() * c2.nodes.length)];
    this.packets.push({
      x1: n1.x, y1: n1.y,
      x2: n2.x, y2: n2.y,
      progress: Math.random(),
      speed: 0.004 + Math.random() * 0.008
    });
  }

  resize() { this.init(); }

  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options } = host;
    const isDark = options.mode === 'dark';
    const speed = options.speed;
    const accent = options.palette || '#00ffd2';

    ctx.fillStyle = isDark ? '#06080d' : '#f3f6fc';
    ctx.fillRect(0, 0, width, height);

    // Intra-cluster connections
    ctx.lineWidth = options.strokeWidth * 0.8;
    for (let c of this.clusters) {
      // Subnet boundary
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 85, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < c.nodes.length; i++) {
        for (let j = i + 1; j < c.nodes.length; j++) {
          ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
          ctx.beginPath();
          ctx.moveTo(c.nodes[i].x, c.nodes[i].y);
          ctx.lineTo(c.nodes[j].x, c.nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Inter-cluster trunk lines
    for (let i = 0; i < this.clusters.length; i++) {
      for (let j = i + 1; j < this.clusters.length; j++) {
        ctx.strokeStyle = isDark ? 'rgba(0, 255, 210, 0.15)' : 'rgba(0, 140, 120, 0.12)';
        ctx.beginPath();
        ctx.moveTo(this.clusters[i].x, this.clusters[i].y);
        ctx.lineTo(this.clusters[j].x, this.clusters[j].y);
        ctx.stroke();
      }
    }

    // Data packets
    for (let p of this.packets) {
      p.progress += p.speed * speed * 60 * delta;
      if (p.progress >= 1.0) {
        p.progress = 0;
      }
      const px = p.x1 + (p.x2 - p.x1) * p.progress;
      const py = p.y1 + (p.y2 - p.y1) * p.progress;

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(px, py, 2.5 * options.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nodes
    for (let c of this.clusters) {
      for (let n of c.nodes) {
        ctx.fillStyle = n.isHub ? accent : (isDark ? '#ffffff' : '#141c2b');
        ctx.beginPath();
        ctx.arc(n.x, n.y, (n.isHub ? 4.5 : n.size) * options.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  destroy() {
    this.clusters = [];
    this.packets = [];
  }
}

/* =============================================================================
   6. Interface Lines Renderer (Canvas 2D)
   ============================================================================= */
class InterfaceLinesRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
    this.scanY = 0;
  }

  resize() {}

  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options, mouse } = host;
    const isDark = options.mode === 'dark';
    const speed = options.speed;
    const accent = options.palette || '#00ffd2';

    ctx.fillStyle = isDark ? '#05070a' : '#f0f3f8';
    ctx.fillRect(0, 0, width, height);

    this.scanY += 2 * speed * 60 * delta;
    if (this.scanY > height) this.scanY = 0;

    // Grid coordinates
    const gridStep = 48;
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';

    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Scanning horizontal sweep bar
    const scanGrad = ctx.createLinearGradient(0, this.scanY - 30, 0, this.scanY + 30);
    scanGrad.addColorStop(0, 'rgba(0, 255, 210, 0)');
    scanGrad.addColorStop(0.5, isDark ? 'rgba(0, 255, 210, 0.12)' : 'rgba(0, 160, 140, 0.1)');
    scanGrad.addColorStop(1, 'rgba(0, 255, 210, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(0, this.scanY - 30, width, 60);

    // Target reticle locked to cursor
    ctx.strokeStyle = accent;
    ctx.lineWidth = options.strokeWidth * 1.5;

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(mouse.x - 30, mouse.y);
    ctx.lineTo(mouse.x - 10, mouse.y);
    ctx.moveTo(mouse.x + 10, mouse.y);
    ctx.lineTo(mouse.x + 30, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 30);
    ctx.lineTo(mouse.x, mouse.y - 10);
    ctx.moveTo(mouse.x, mouse.y + 10);
    ctx.lineTo(mouse.x, mouse.y + 30);
    ctx.stroke();

    // Rotating outer bracket
    const rot = time * 0.002 * speed;
    ctx.save();
    ctx.translate(mouse.x, mouse.y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.arc(0, 0, 24 * options.size, 0, Math.PI * 0.4);
    ctx.arc(0, 0, 24 * options.size, Math.PI * 0.5, Math.PI * 0.9);
    ctx.arc(0, 0, 24 * options.size, Math.PI, Math.PI * 1.4);
    ctx.arc(0, 0, 24 * options.size, Math.PI * 1.5, Math.PI * 1.9);
    ctx.stroke();
    ctx.restore();

    // Data readouts
    ctx.font = '10px monospace';
    ctx.fillStyle = accent;
    ctx.fillText(`LOC: [${Math.floor(mouse.x)}, ${Math.floor(mouse.y)}]`, mouse.x + 38, mouse.y - 15);
    ctx.fillText(`TRK: ${(time * 0.05).toFixed(1)} KHZ`, mouse.x + 38, mouse.y);
    ctx.fillText(`SYS: OPTIMAL`, mouse.x + 38, mouse.y + 15);
  }

  destroy() {}
}

/* =============================================================================
   7. Defense Lines Renderer (Canvas 2D)
   ============================================================================= */
class DefenseLinesRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
    this.angle = 0;
    this.targets = [];
    this.init();
  }

  init() {
    this.targets = [];
    const count = 14;
    for (let i = 0; i < count; i++) {
      this.targets.push({
        dist: 0.15 + Math.random() * 0.75,
        angle: Math.random() * Math.PI * 2,
        life: 0
      });
    }
  }

  resize() { this.init(); }

  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options } = host;
    const isDark = options.mode === 'dark';
    const speed = options.speed;
    const accent = options.palette || '#00ffd2';

    ctx.fillStyle = isDark ? '#04070a' : '#f2f5fa';
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const maxR = Math.min(width, height) * 0.44;

    this.angle += 0.03 * speed * 60 * delta;

    // Defense range rings
    ctx.lineWidth = options.strokeWidth;
    ctx.strokeStyle = isDark ? 'rgba(0, 255, 210, 0.18)' : 'rgba(0, 150, 130, 0.18)';
    for (let r = 0.25; r <= 1.0; r += 0.25) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Quadrant axes
    ctx.beginPath();
    ctx.moveTo(cx - maxR, cy);
    ctx.lineTo(cx + maxR, cy);
    ctx.moveTo(cx, cy - maxR);
    ctx.lineTo(cx, cy + maxR);
    ctx.stroke();

    // Radar beam sweep
    const sweepAngle = this.angle % (Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    grad.addColorStop(0, 'rgba(0, 255, 210, 0.4)');
    grad.addColorStop(1, 'rgba(0, 255, 210, 0.02)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, maxR, sweepAngle - 0.45, sweepAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Leading sweep line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR);
    ctx.stroke();
    ctx.restore();

    // Intercept target blips
    for (let t of this.targets) {
      const diff = ((sweepAngle - t.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (diff < 0.1) t.life = 1.0;

      if (t.life > 0.01) {
        const tx = cx + Math.cos(t.angle) * maxR * t.dist;
        const ty = cy + Math.sin(t.angle) * maxR * t.dist;

        ctx.fillStyle = `rgba(255, 60, 80, ${t.life})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 3.5 * options.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 60, 80, ${t.life * 0.6})`;
        ctx.beginPath();
        ctx.arc(tx, ty, 10 * options.size * (1 - t.life * 0.5), 0, Math.PI * 2);
        ctx.stroke();

        t.life *= 0.97;
      }
    }
  }

  destroy() { this.targets = []; }
}

/* =============================================================================
   8. Topo Field Renderer (Raw WebGL)
   ============================================================================= */
class TopoFieldWebGLRenderer {
  constructor(gl, host) {
    this.gl = gl;
    this.host = host;
    this.program = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.indexCount = 0;
    this.init();
  }

  init() {
    const gl = this.gl;

    const vsSource = `
      attribute vec3 aPosition;
      uniform mat4 uProjection;
      uniform mat4 uModelView;
      uniform float uTime;
      uniform vec2 uMouse;
      varying float vElevation;

      void main() {
        vec3 pos = aPosition;
        float dist = distance(pos.xy, uMouse);
        float wave = sin(pos.x * 3.5 + uTime * 1.5) * cos(pos.y * 3.5 + uTime * 1.2) * 0.22;
        float ripple = sin(dist * 12.0 - uTime * 3.0) * exp(-dist * 2.5) * 0.25;
        pos.z = wave + ripple;
        vElevation = pos.z;

        gl_Position = uProjection * uModelView * vec4(pos, 1.0);
      }
    `;

    const fsSource = `
      precision mediump float;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vElevation;

      void main() {
        float intensity = 0.55 + vElevation * 1.6;
        gl_FragColor = vec4(uColor * intensity, uOpacity);
      }
    `;

    const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
    const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);

    this.createGridGeometry();
  }

  createShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  }

  createGridGeometry() {
    const gl = this.gl;
    const gridSize = 45;
    const vertices = [];
    const indices = [];

    for (let y = 0; y <= gridSize; y++) {
      for (let x = 0; x <= gridSize; x++) {
        const u = (x / gridSize) * 2.4 - 1.2;
        const v = (y / gridSize) * 2.4 - 1.2;
        vertices.push(u, v, 0);
      }
    }

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const i = y * (gridSize + 1) + x;
        // Horizontal wireframe segment
        indices.push(i, i + 1);
        // Vertical wireframe segment
        indices.push(i, i + (gridSize + 1));
      }
    }

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    this.indexCount = indices.length;
  }

  resize() {}

  render(time, delta) {
    const gl = this.gl;
    const { options, mouse, width, height } = this.host;
    const isDark = options.mode === 'dark';

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    if (isDark) {
      gl.clearColor(0.02, 0.03, 0.05, 1.0);
    } else {
      gl.clearColor(0.95, 0.96, 0.98, 1.0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);

    const aspect = width / height;
    const proj = this.perspective(45 * Math.PI / 180, aspect, 0.1, 100);

    const rotX = 58 * Math.PI / 180 + (mouse.py - 0.5) * 0.2;
    const rotZ = time * 0.0003 * options.speed + (mouse.px - 0.5) * 0.3;
    const mv = this.lookAt([0, -1.8, 1.6], [0, 0, 0], [0, 0, 1]);

    const uProj = gl.getUniformLocation(this.program, 'uProjection');
    const uMV = gl.getUniformLocation(this.program, 'uModelView');
    const uTime = gl.getUniformLocation(this.program, 'uTime');
    const uMouse = gl.getUniformLocation(this.program, 'uMouse');
    const uColor = gl.getUniformLocation(this.program, 'uColor');
    const uOpacity = gl.getUniformLocation(this.program, 'uOpacity');

    gl.uniformMatrix4fv(uProj, false, proj);
    gl.uniformMatrix4fv(uMV, false, mv);
    gl.uniform1f(uTime, time * 0.001 * options.speed);
    gl.uniform2f(uMouse, (mouse.px - 0.5) * 2.0, (mouse.py - 0.5) * 2.0);

    // Color
    const hex = options.palette || '#00ffd2';
    const c = this.hexToRgbNorm(hex);
    gl.uniform3f(uColor, c[0], c[1], c[2]);
    gl.uniform1f(uOpacity, 0.75 * options.opacity);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const aPos = gl.getAttribLocation(this.program, 'aPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.LINES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  hexToRgbNorm(hex) {
    const v = hex.replace('#', '');
    return [
      parseInt(v.substring(0, 2), 16) / 255,
      parseInt(v.substring(2, 4), 16) / 255,
      parseInt(v.substring(4, 6), 16) / 255
    ];
  }

  perspective(fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  lookAt(eye, center, up) {
    const z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
    let len = 1 / Math.hypot(z0, z1, z2);
    const zx = z0 * len, zy = z1 * len, zz = z2 * len;

    const x0 = up[1] * zz - up[2] * zy, x1 = up[2] * zx - up[0] * zz, x2 = up[0] * zy - up[1] * zx;
    len = 1 / Math.hypot(x0, x1, x2);
    const xx = x0 * len, xy = x1 * len, xz = x2 * len;

    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;

    return new Float32Array([
      xx, yx, zx, 0,
      xy, yy, zy, 0,
      xz, yz, zz, 0,
      -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
      -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
      -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
      1
    ]);
  }

  destroy() {
    const gl = this.gl;
    if (this.program) gl.deleteProgram(this.program);
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
  }
}

/* =============================================================================
   Fallback 2D Topo Field Renderer
   ============================================================================= */
class TopoField2DRenderer {
  constructor(ctx, host) {
    this.ctx = ctx;
    this.host = host;
  }
  resize() {}
  render(time, delta) {
    const { ctx, host } = this;
    const { width, height, options } = host;
    const isDark = options.mode === 'dark';
    ctx.fillStyle = isDark ? '#05070a' : '#f0f3f8';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = options.palette || '#00ffd2';
    ctx.lineWidth = options.strokeWidth;
    const rows = 28;
    for (let r = 0; r < rows; r++) {
      ctx.beginPath();
      for (let x = 0; x < width; x += 12) {
        const y = height * 0.35 + r * 14 + Math.sin(x * 0.01 + time * 0.002 * options.speed + r * 0.2) * 16;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  destroy() {}
}
