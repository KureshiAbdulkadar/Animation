/**
 * StippledPortrait.js — High-Fidelity Stippled Particle Portrait Engine
 * 
 * Recreates photographic portraits in stippled pointillism style:
 * - Crisp white dots on pure black background
 * - Organic density distribution based on image luminance
 * - Preserves face shape, hairstyle, sunglasses, expression & proportions
 * - Smooth assemble & settle particle physics animation
 * - Interactive cursor repulsion & custom photo upload
 */

export class StippledPortrait {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) throw new Error('Invalid container element');

    this.options = Object.assign({
      imageSrc: '/portrait.jpg',
      particleCount: 12000,
      dotMinSize: 0.8,
      dotMaxSize: 2.4,
      contrast: 1.25,
      brightnessCutoff: 0.08,
      gamma: 1.4,
      dotColor: '#ffffff',
      bgColor: '#000000',
      initialState: 'assembling', // 'static' | 'assembling' | 'scattered' | 'settled'
      springK: 0.045,             // Spring tension for assembly
      damping: 0.86,              // Damping factor for settling
      cursorRadius: 100,          // Repulsion radius on mouse hover
      cursorForce: 8.0,           // Repulsion force
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

    this.image = new Image();
    this.imageLoaded = false;

    this.particles = [];
    this.state = this.options.initialState; // 'static' | 'assembling' | 'settled' | 'scattered'
    this.assembleProgress = 0;
    this.assembleStartTime = performance.now();

    this.mouse = {
      x: -1000,
      y: -1000,
      isHovering: false
    };

    this.isRunning = false;
    this.rafId = null;

    this.handleResize();
    this.bindEvents();
    this.loadImage(this.options.imageSrc);
  }

  loadImage(src) {
    this.imageLoaded = false;
    this.image.crossOrigin = 'anonymous';
    this.image.onload = () => {
      this.imageLoaded = true;
      this.processImageAndGenerateParticles();
      if (!this.isRunning) this.start();
    };
    this.image.onerror = () => {
      console.warn('Failed to load image at ' + src + ', generating procedural portrait fallback.');
      this.generateProceduralPortrait();
      this.imageLoaded = true;
      if (!this.isRunning) this.start();
    };
    this.image.src = src;
  }

  loadCustomImage(imageElement) {
    this.image = imageElement;
    this.imageLoaded = true;
    this.processImageAndGenerateParticles();
  }

  processImageAndGenerateParticles() {
    if (!this.imageLoaded || !this.width || !this.height) return;

    // 1. Create offscreen canvas to scale and sample image pixels
    const offCanvas = document.createElement('canvas');
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

    // Target portrait dimensions maintaining aspect ratio centered in canvas
    const imgAspect = (this.image.width || 1) / (this.image.height || 1);
    const canvasAspect = this.width / this.height;

    let drawW, drawH, drawX, drawY;
    const paddingFactor = 0.88;

    if (canvasAspect > imgAspect) {
      drawH = this.height * paddingFactor;
      drawW = drawH * imgAspect;
    } else {
      drawW = this.width * paddingFactor;
      drawH = drawW / imgAspect;
    }

    drawX = (this.width - drawW) * 0.5;
    drawY = (this.height - drawH) * 0.5;

    const sampleW = Math.min(600, Math.floor(drawW));
    const sampleH = Math.min(600, Math.floor(drawH));
    offCanvas.width = sampleW;
    offCanvas.height = sampleH;

    offCtx.fillStyle = '#000000';
    offCtx.fillRect(0, 0, sampleW, sampleH);
    offCtx.drawImage(this.image, 0, 0, sampleW, sampleH);

    const imgData = offCtx.getImageData(0, 0, sampleW, sampleH);
    const data = imgData.data;

    // 2. Build Luminance Map & Cumulative Density Map for Importance Sampling
    const totalPixels = sampleW * sampleH;
    const luminanceMap = new Float32Array(totalPixels);
    const cumulativeDist = new Float64Array(totalPixels);

    let sumWeight = 0;
    const gamma = this.options.gamma || 1.4;
    const contrast = this.options.contrast || 1.25;
    const cutoff = this.options.brightnessCutoff || 0.08;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx] / 255;
      const g = data[idx + 1] / 255;
      const b = data[idx + 2] / 255;

      // Perceptual grayscale luminance
      let lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply contrast curve & gamma
      lum = Math.pow(lum, gamma) * contrast;
      if (lum < cutoff) lum = 0; // Keep deep shadows pure black

      luminanceMap[i] = lum;
      sumWeight += lum;
      cumulativeDist[i] = sumWeight;
    }

    if (sumWeight === 0) sumWeight = 1;

    // 3. Stippling Generation: Sample particle targets according to density distribution
    const targetCount = this.options.particleCount || 12000;
    this.particles = [];

    const minSize = this.options.dotMinSize || 0.8;
    const maxSize = this.options.dotMaxSize || 2.4;

    for (let p = 0; p < targetCount; p++) {
      // Importance sampling via binary search on cumulative distribution
      const randVal = Math.random() * sumWeight;
      let low = 0, high = totalPixels - 1;
      let selectedIdx = 0;

      while (low <= high) {
        const mid = (low + high) >> 1;
        if (cumulativeDist[mid] >= randVal) {
          selectedIdx = mid;
          high = mid - 1;
        } else {
          low = mid + 1;
        }
      }

      const samplePy = Math.floor(selectedIdx / sampleW);
      const samplePx = selectedIdx % sampleW;

      // Add organic sub-pixel jitter
      const jitterX = (Math.random() - 0.5) * 1.8;
      const jitterY = (Math.random() - 0.5) * 1.8;

      const normX = (samplePx + jitterX) / sampleW;
      const normY = (samplePy + jitterY) / sampleH;

      const targetX = drawX + normX * drawW;
      const targetY = drawY + normY * drawH;

      const lum = Math.min(1.0, luminanceMap[selectedIdx]);

      // Organic dot size: larger in highlights, finer in midtones
      const dotSize = minSize + Math.pow(lum, 0.7) * (maxSize - minSize);
      const alpha = 0.4 + lum * 0.6; // Crisp high-contrast dots

      // Scattered start coordinates (scattered in a wide cloud)
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.random() * Math.max(this.width, this.height) * 0.85;
      const startX = this.width * 0.5 + Math.cos(angle) * spread;
      const startY = this.height * 0.5 + Math.sin(angle) * spread;

      this.particles.push({
        // Target stipple portrait coordinate
        tx: targetX,
        ty: targetY,
        // Current position
        x: this.state === 'static' ? targetX : startX,
        y: this.state === 'static' ? targetY : startY,
        // Velocity for physics integration
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        size: dotSize,
        alpha: alpha,
        luminance: lum,
        settled: this.state === 'static'
      });
    }

    if (this.state === 'assembling') {
      this.assembleStartTime = performance.now();
    }
  }

  generateProceduralPortrait() {
    // Elegant procedural high-contrast stippled silhouette if image fails to fetch
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const targetCount = this.options.particleCount || 10000;
    this.particles = [];

    for (let i = 0; i < targetCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const px = cx + (u - 0.5) * 320;
      const py = cy + (v - 0.5) * 420;

      const distHead = Math.hypot((px - cx) / 130, (py - (cy - 30)) / 170);
      if (distHead > 1.0) continue;

      this.particles.push({
        tx: px,
        ty: py,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        size: 1.2 + Math.random() * 1.2,
        alpha: 0.9,
        luminance: 0.8,
        settled: true
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

    if (this.imageLoaded) {
      this.processImageAndGenerateParticles();
    }
  }

  bindEvents() {
    this._resizeHandler = () => this.handleResize();
    window.addEventListener('resize', this._resizeHandler);

    const onMove = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = clientX - rect.left;
      this.mouse.y = clientY - rect.top;
      this.mouse.isHovering = true;
    };

    const onLeave = () => {
      this.mouse.isHovering = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    };

    this.canvas.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    this.canvas.addEventListener('mouseleave', onLeave);

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    this.canvas.addEventListener('touchend', onLeave);
  }

  triggerAssemble() {
    this.state = 'assembling';
    this.assembleStartTime = performance.now();

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const angle = Math.random() * Math.PI * 2;
      const spread = (Math.random() * 0.7 + 0.3) * Math.max(this.width, this.height) * 0.75;
      p.x = this.width * 0.5 + Math.cos(angle) * spread;
      p.y = this.height * 0.5 + Math.sin(angle) * spread;
      p.vx = (Math.random() - 0.5) * 8;
      p.vy = (Math.random() - 0.5) * 8;
      p.settled = false;
    }
  }

  triggerScatter() {
    this.state = 'scattered';
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.settled = false;
    }
  }

  setStatic() {
    this.state = 'static';
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.x = p.tx;
      p.y = p.ty;
      p.vx = 0;
      p.vy = 0;
      p.settled = true;
    }
  }

  setOptions(newOpts) {
    Object.assign(this.options, newOpts);
    if ('particleCount' in newOpts || 'contrast' in newOpts || 'gamma' in newOpts || 'brightnessCutoff' in newOpts) {
      this.processImageAndGenerateParticles();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const loop = () => {
      if (!this.isRunning) return;
      this.update();
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

  update() {
    if (!this.particles.length) return;

    const springK = this.options.springK || 0.045;
    const damping = this.options.damping || 0.86;
    const mouseRadius = this.options.cursorRadius || 100;
    const mouseForce = this.options.cursorForce || 8.0;
    const isHover = this.mouse.isHovering;
    const mx = this.mouse.x;
    const my = this.mouse.y;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (this.state === 'static') {
        p.x = p.tx;
        p.y = p.ty;
        continue;
      }

      if (this.state === 'scattered') {
        // Floating gentle drift
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.98;
        p.vy *= 0.98;
        continue;
      }

      // 'assembling' or 'settled'
      // 1. Spring force towards target portrait position
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const distToTarget = Math.hypot(dx, dy);

      const ax = dx * springK;
      const ay = dy * springK;

      p.vx = (p.vx + ax) * damping;
      p.vy = (p.vy + ay) * damping;

      // 2. Interactive Cursor Repulsion (disperse and bounce back)
      if (isHover) {
        const cdx = p.x - mx;
        const cdy = p.y - my;
        const cdist = Math.hypot(cdx, cdy);

        if (cdist < mouseRadius && cdist > 0.01) {
          const force = (1.0 - cdist / mouseRadius) * mouseForce;
          p.vx += (cdx / cdist) * force;
          p.vy += (cdy / cdist) * force;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      if (distToTarget < 0.2 && Math.hypot(p.vx, p.vy) < 0.1) {
        p.settled = true;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Pure black background
    ctx.fillStyle = this.options.bgColor || '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    if (!this.particles.length) {
      ctx.restore();
      return;
    }

    // High-performance batched dot rendering
    ctx.fillStyle = this.options.dotColor || '#ffffff';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Cull offscreen particles
      if (p.x < -20 || p.x > this.width + 20 || p.y < -20 || p.y > this.height + 20) continue;

      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  destroy() {
    this.stop();
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
  }
}

export default StippledPortrait;
