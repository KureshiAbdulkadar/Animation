/* ==========================================================================
   Data Pixel Arc - Semicircular LED Grid Arch Canvas
   ========================================================================== */

(function () {
  // DOM Elements
  let canvas, ctx;
  
  // HUD Elements
  let designPreset, speedRange, speedValue, accentPicker, accentHex, presetDots;
  let pixelSizeSlider, pixelSizeValue, arcThicknessSlider, arcThicknessValue, glowIntensitySlider, glowIntensityValue;
  let transparentBgCheckbox, exportHtmlBtn, exportJsBtn, exportWebmBtn, webmBtnText, exportMdBtn, exportGifBtn, gifBtnText;
  
  // System Stats
  let fpsCounter, particleCounter, dprCounter;
  
  // Interactive UI Panels
  let controlsPanel;

  // State Variables
  let presetMode, speed, color;
  const background = "#030704"; // Dark theme background
  let pixelSize, arcThickness, glowIntensity;
  
  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;

  // Custom Ghosting Preset 2D Artwork (Tight 18-col spacing)
  const artwork = [
    [0,0,1,0,0, 0,0, 0,0,0,0,0,0, 0,0, 0,0,1],
    [0,1,0,1,0, 0,0, 0,0,0,1,0,0, 0,0, 0,1,1],
    [1,0,0,0,1, 0,0, 0,0,0,0,1,0, 0,0, 1,0,1],
    [1,0,1,0,1, 0,0, 1,1,1,1,1,1, 0,0, 0,0,1],
    [1,0,0,0,1, 0,0, 0,0,0,0,1,0, 0,0, 0,0,1],
    [0,1,0,1,0, 0,0, 0,0,0,1,0,0, 0,0, 0,0,1],
    [0,0,1,0,0, 0,0, 0,0,0,0,0,0, 0,0, 0,0,1]
  ];

  // Snake Preset state variables
  let snakes = [];
  let lastSnakeUpdate = 0;

  // Gravity Matrix Preset state variables
  let gravityBlocks = [];
  let activationMap = {};
  let gravityCycleStart = 0;

  // Dot Globe Preset state variables
  let globeRotY = 0;
  let globeRotX = 0.35;
  let globeDragging = false;
  let globeDragLastX = 0;
  let globeDragLastY = 0;
  let globePoints = [];

  // Converging Streams Preset state variables
  let streamLines = [];
  let streamParticles = [];
  let streamRotY = 0;
  let streamRotX = 0.18;
  let streamDragging = false;
  let streamDragLastX = 0;
  let streamDragLastY = 0;

  // Particle Flow-Field state variables
  let flowParticles = [];

  // Constellation Field state variables
  let constellationStars = [];

  // Particle Orbit Wheel state variables
  let wheelParticles = [];
  let wheelAngle = 0;

  // Tech Boxes state variables
  let techBoxes = [];
  let techGridCols = 0;
  let techGridRows = 0;
  const TECH_BOX = 46;
  const TECH_GAP = 4;
  const TECH_PITCH = TECH_BOX + TECH_GAP;

  // Space Galaxy state variables
  let spaceStars = [];
  let shootingStars = [];
  let nebulaClouds = [];

  // Data Stream state variables
  let dataStreamBoxes = [];
  const DATA_STREAM_PITCH = 20;
  let dataStreamSpeedMultiplier = 3.5;

  // Wave Grid state variables
  let waveDots = [];
  let waveCols = 0;
  let waveRows = 0;
  const WAVE_PITCH = 16;

  // Pixel Constructor / Build Grid state variables
  let pixelBuildBlocks = [];
  let pixelBuildCols = 0;
  let pixelBuildRows = 0;
  let pixelBuildIndex = 0;
  let pixelBuildMode = 0;
  const PIXEL_BUILD_SIZE = 22;
  const PIXEL_BUILD_GAP = 3;
  const PIXEL_BUILD_PITCH = PIXEL_BUILD_SIZE + PIXEL_BUILD_GAP;

  // Node.js Pixel Art / LED Matrix state variables
  let nodejsPixelBlocks = [];
  let nodejsParticles = [];
  let nodejsRain = [];
  let nodejsSparks = [];

  // Pixel Cascade Wall state variables
  let cascadeGrid = [];
  let cascadeFalling = [];
  let cascadeSparks = [];
  let cascadeCols = 0;
  let cascadeRows = 0;
  let cascadeInitialized = false;
  let cascadeNodeMask = [];
  let cascadeCustomText = "NODE JS";
  let cascadeComboBreaks = 0;
  let cascadeComboTimer = 0;
  let cascadeMegaFlash = 0;
  let cascadeBuildComplete = false;
  let cascadeTextFill = 0.0;

  // Flying Eagle Dot Matrix state variables
  let flyingEagleInitialized = false;
  let flyingEagle = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: -Math.PI / 2,
    targetHeading: -Math.PI / 2,
    bankAngle: 0,
    pitchAngle: 0,
    flapPhase: 0,
    glideTimer: 0,
    isGliding: false,
    diveBurst: 0,
    wingFlex: 0
  };
  let flyingEagleVortex = [];
  let amberShockwaves = [];

  const mouse = {
    x: 0.5,
    y: 0.5,
    tx: 0.5,
    ty: 0.5,
  };

  // Activity tracking for idle pulse
  let isTrackingMouse = false;
  let lastActivityTime = performance.now();
  const loadTime = performance.now();

  // FPS calculations
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;
  let lastFrameTime = performance.now();
  const fpsInterval = 1000 / 90; // Target maximum of 90 FPS

  // Resize canvas & adjust DPR
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprCounter.textContent = dpr.toFixed(1);

    width = rect.width;
    height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Hex to RGB Array utility
  const hexToRgb = (hex) => {
    const value = hex.replace("#", "");
    const r = parseInt(value.substring(0, 2), 16);
    const g = parseInt(value.substring(2, 4), 16);
    const b = parseInt(value.substring(4, 6), 16);
    return [r, g, b];
  };

  let lastPatternPreset = "";
  let lastPatternPixelSize = 0;
  let lastPatternTransparent = false;
  let gridPattern = null;

  const updateGridPattern = (preset, size) => {
    const transparent = (typeof transparentBgCheckbox !== "undefined" && transparentBgCheckbox) ? transparentBgCheckbox.checked : false;
    if (preset === lastPatternPreset && size === lastPatternPixelSize && transparent === lastPatternTransparent && gridPattern) {
      return;
    }
    lastPatternPreset = preset;
    lastPatternPixelSize = size;
    lastPatternTransparent = transparent;

    const pitch = (preset === "ghosting") ? 16 : (preset === "gravity-matrix") ? 12 : size;
    const gap = (preset === "ghosting") ? 4 : (preset === "gravity-matrix") ? 2 : 1;
    const drawSize = pitch - gap;

    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = pitch;
    patternCanvas.height = pitch;
    const pCtx = patternCanvas.getContext("2d");

    // Background fill (transparent or solid)
    if (transparent) {
      pCtx.clearRect(0, 0, pitch, pitch);
    } else {
      pCtx.fillStyle = (preset === "ghosting") ? "#090A0B" : background;
      pCtx.fillRect(0, 0, pitch, pitch);
    }

    // Inactive square fill
    pCtx.fillStyle = (preset === "ghosting" || preset === "snake-game" || preset === "gravity-matrix") 
                     ? "rgb(18, 19, 20)" 
                     : "rgba(0, 20, 5, 0.15)";
    pCtx.fillRect(gap / 2, gap / 2, drawSize, drawSize);

    gridPattern = ctx.createPattern(patternCanvas, 'repeat');
  };

  // Snake Game helpers
  const createSnake = (startC, startR) => {
    const segments = [];
    for (let i = 0; i < 7; i++) {
      segments.push({c: startC, r: startR});
    }
    return segments;
  };

  const initSnake = (cols, rows) => {
    snakes = [createSnake(Math.floor(cols / 2), Math.floor(rows / 2))];
  };

  const initGravityMatrix = (cols, rows) => {
    gravityBlocks = [];
    activationMap = {};
    
    const startCol = Math.floor((cols - 36) / 2);
    const startRow = Math.floor((rows - 14) / 2);
    
    const targets = [];
    for (let ac = 0; ac < 36; ac++) {
      for (let ar = 0; ar < 14; ar++) {
        const origCol = Math.floor(ac / 2);
        const origRow = Math.floor(ar / 2);
        if (artwork[origRow] && artwork[origRow][origCol] === 1) {
          targets.push({ c: startCol + ac, r: startRow + ar });
        }
      }
    }
    
    gravityBlocks = targets.map(t => {
      const spawnC = Math.floor(Math.random() * cols);
      const spawnR = -Math.random() * 25 - 5;
      return {
        tc: t.c,
        tr: t.r,
        c: spawnC,
        r: spawnR,
        vc: 0,
        vr: 0.1,
        landed: false
      };
    });
  };

  const findShortestPathBFS = (startC, startR, targetC, targetR, cols, rows) => {
    if (startC === targetC && startR === targetR) return null;

    const queue = [{c: startC, r: startR}];
    const visited = new Set();
    visited.add(`${startC},${startR}`);
    
    const parent = {};
    let found = false;

    while (queue.length > 0) {
      const curr = queue.shift();

      if (curr.c === targetC && curr.r === targetR) {
        found = true;
        break;
      }

      const directions = [
        {dc: 1, dr: 0},
        {dc: -1, dr: 0},
        {dc: 0, dr: 1},
        {dc: 0, dr: -1}
      ];

      for (const dir of directions) {
        const nc = curr.c + dir.dc;
        const nr = curr.r + dir.dr;

        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
          const key = `${nc},${nr}`;
          if (!visited.has(key)) {
            visited.add(key);
            parent[key] = curr;
            queue.push({c: nc, r: nr});
          }
        }
      }
    }

    if (!found) return null;

    let pathNode = {c: targetC, r: targetR};
    let path = [];
    while (pathNode.c !== startC || pathNode.r !== startR) {
      path.push(pathNode);
      const parentKey = `${pathNode.c},${pathNode.r}`;
      pathNode = parent[parentKey];
      if (!pathNode) break;
    }

    if (path.length > 0) {
      return path[path.length - 1];
    }
    return null;
  };

  const moveSnake = (cols, rows, pitch) => {
    const offsetX = (width - cols * pitch) / 2;
    const offsetY = (height - rows * pitch) / 2;
    const mouseC = Math.floor((mouse.x * width - offsetX) / pitch);
    const mouseR = Math.floor((mouse.y * height - offsetY) / pitch);
    const tc = Math.max(0, Math.min(cols - 1, mouseC));
    const tr = Math.max(0, Math.min(rows - 1, mouseR));

    for (const s of snakes) {
      if (s.length === 0) continue;
      const head = s[0];
      
      const nextStep = findShortestPathBFS(head.c, head.r, tc, tr, cols, rows);
      if (nextStep) {
        s.unshift({c: nextStep.c, r: nextStep.r});
        s.pop();
      }
    }
  };

  // ── Globe helpers ──────────────────────────────────────────
  const isLand = (lat, lon) => {
    // North America
    if (lat > 48 && lat < 72 && lon > -140 && lon < -55) return true;
    if (lat > 25 && lat < 50 && lon > -125 && lon < -65) {
      if (lat > 25 && lat < 35 && lon < -100) return true;
      if (lat > 30 && lon > -105) return true;
      if (lat > 40) return true;
      return false;
    }
    if (lat > 15 && lat < 32 && lon > -117 && lon < -85) return true;
    if (lat > 7 && lat < 18 && lon > -92 && lon < -77) return true;
    // Alaska
    if (lat > 55 && lat < 72 && lon > -170 && lon < -140) return true;
    // Greenland
    if (lat > 60 && lat < 83 && lon > -55 && lon < -18) return true;
    // South America
    if (lat > -5 && lat < 13 && lon > -82 && lon < -48) return true;
    if (lat > -23 && lat < -5 && lon > -78 && lon < -35) return true;
    if (lat > -40 && lat < -23 && lon > -72 && lon < -38) return true;
    if (lat > -55 && lat < -40 && lon > -75 && lon < -63) return true;
    // Europe
    if (lat > 36 && lat < 46 && lon > -10 && lon < 28) return true;
    if (lat > 46 && lat < 55 && lon > -5 && lon < 25) return true;
    if (lat > 55 && lat < 65 && lon > 5 && lon < 32) return true;
    if (lat > 50 && lat < 60 && lon > -10 && lon < 3) return true;
    if (lat > 65 && lat < 71 && lon > 12 && lon < 30) return true;
    // Africa
    if (lat > 20 && lat < 37 && lon > -17 && lon < 40) return true;
    if (lat > 4 && lat < 20 && lon > -17 && lon < 45) return true;
    if (lat > -5 && lat < 4 && lon > 8 && lon < 42) return true;
    if (lat > -18 && lat < -5 && lon > 12 && lon < 42) return true;
    if (lat > -35 && lat < -18 && lon > 16 && lon < 36) return true;
    // Madagascar
    if (lat > -25 && lat < -12 && lon > 43 && lon < 50) return true;
    // Middle East / Arabian Peninsula
    if (lat > 12 && lat < 37 && lon > 35 && lon < 60) return true;
    // Russia / North Asia
    if (lat > 50 && lat < 75 && lon > 30 && lon < 180) return true;
    if (lat > 45 && lat < 50 && lon > 40 && lon < 145) return true;
    // India
    if (lat > 8 && lat < 28 && lon > 68 && lon < 88) return true;
    if (lat > 28 && lat < 35 && lon > 70 && lon < 80) return true;
    // China / East Asia
    if (lat > 22 && lat < 42 && lon > 98 && lon < 125) return true;
    if (lat > 42 && lat < 53 && lon > 80 && lon < 130) return true;
    if (lat > 18 && lat < 22 && lon > 100 && lon < 112) return true;
    // Southeast Asia
    if (lat > 0 && lat < 20 && lon > 96 && lon < 110) return true;
    // Japan
    if (lat > 30 && lat < 45 && lon > 129 && lon < 146) return true;
    // Korea
    if (lat > 34 && lat < 42 && lon > 125 && lon < 130) return true;
    // Indonesia
    if (lat > -8 && lat < 6 && lon > 95 && lon < 140) return true;
    // Philippines
    if (lat > 5 && lat < 18 && lon > 118 && lon < 127) return true;
    // Australia
    if (lat > -38 && lat < -12 && lon > 115 && lon < 152) return true;
    // New Zealand
    if (lat > -47 && lat < -34 && lon > 166 && lon < 178) return true;
    // Sri Lanka
    if (lat > 6 && lat < 10 && lon > 79 && lon < 82) return true;
    // Iceland
    if (lat > 63 && lat < 66 && lon > -24 && lon < -14) return true;
    return false;
  };

  const initGlobePoints = () => {
    globePoints = [];
    const step = 2.8;
    for (let lat = -85; lat <= 85; lat += step) {
      const latRad = lat * Math.PI / 180;
      const lonCount = Math.max(6, Math.floor(128 * Math.cos(latRad)));
      const lonStep = 360 / lonCount;
      for (let i = 0; i < lonCount; i++) {
        const lon = -180 + i * lonStep;
        const lonRad = lon * Math.PI / 180;
        globePoints.push({
          x: Math.cos(latRad) * Math.cos(lonRad),
          y: Math.sin(latRad),
          z: Math.cos(latRad) * Math.sin(lonRad),
          land: isLand(lat, lon)
        });
      }
    }
  };

  // ── Converging Streams helpers ─────────────────────────────
  const NUM_STREAM_LINES = 72;
  const NUM_STREAM_PARTICLES = 240;

  const getStreamPoint = (lineIdx, u) => {
    const phi = (lineIdx / NUM_STREAM_LINES) * Math.PI * 2;
    const layer = 0.65 + 0.35 * ((lineIdx % 5) / 4);
    const spreadY = (0.75 + 0.25 * Math.cos(phi * 2)) * layer;
    const rThroat = 0.03 + 0.03 * (lineIdx % 3);
    const rOuter = 0.92 * spreadY;
    const r = rThroat + (rOuter - rThroat) * Math.pow(Math.abs(u), 1.85);
    const theta = phi + u * 0.32;
    return {
      x: u,
      y: r * Math.sin(theta),
      z: r * Math.cos(theta)
    };
  };

  const initStreamlines = () => {
    streamLines = [];
    streamParticles = [];

    // Precompute guide track dots along each curve
    const dotsPerLine = 48;
    for (let k = 0; k < NUM_STREAM_LINES; k++) {
      for (let i = 0; i <= dotsPerLine; i++) {
        const u = -1.0 + (i / dotsPerLine) * 2.0;
        const pt = getStreamPoint(k, u);
        streamLines.push({
          x: pt.x,
          y: pt.y,
          z: pt.z,
          lineIdx: k,
          u: u
        });
      }
    }

    // Populate traveling particles
    for (let i = 0; i < NUM_STREAM_PARTICLES; i++) {
      const lineIdx = Math.floor(Math.random() * NUM_STREAM_LINES);
      const u = -1.0 + Math.random() * 2.0;
      const dir = (Math.random() < 0.5) ? 1 : -1;
      streamParticles.push({
        lineIdx,
        u,
        dir,
        baseSpeed: 0.0022 + Math.random() * 0.0035,
        size: 1.2 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2
      });
    }
  };

  // ── Particle Flow-Field helpers ────────────────────────────
  const createFlowParticle = (onEdgeOnly = false) => {
    let px, py;
    if (!onEdgeOnly) {
      px = Math.random() * width;
      py = Math.random() * height;
    } else {
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { px = Math.random() * width; py = -5; }
      else if (edge === 1) { px = width + 5; py = Math.random() * height; }
      else if (edge === 2) { px = Math.random() * width; py = height + 5; }
      else { px = -5; py = Math.random() * height; }
    }
    return {
      x: px,
      y: py,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: Math.random() < 0.3 ? 1.8 : 1.1
    };
  };

  const initFlowParticles = () => {
    flowParticles = [];
    for (let i = 0; i < 400; i++) {
      flowParticles.push(createFlowParticle(false));
    }
  };

  // ── Constellation Field helpers ────────────────────────────
  const initConstellationStars = () => {
    const count = 110;
    constellationStars = [];
    for (let i = 0; i < count; i++) {
      constellationStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: 1.2 + Math.random() * 2.2,
        orbitRadius: Math.random() < 0.28 ? 14 + Math.random() * 20 : 0,
        orbitAngle: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.2 + Math.random() * 2.8,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  };

  // ── Particle Orbit Wheel helpers (Organic Stochastic Ring) ────────
  const initWheelParticles = () => {
    wheelParticles = [];
    const minDim = Math.min(width, height);
    const coreR = minDim * 0.27; // Central core ring radius
    const innerVoid = minDim * 0.20; // Crisp inner circle cutoff
    const count = 750; // Dense organic particle cloud

    // Box-Muller standard normal generator
    const randn = () => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      
      // Dense Gaussian cluster around coreR with scattered outer spray
      let offsetR;
      if (Math.random() < 0.82) {
        // Main dense ring band
        offsetR = randn() * (minDim * 0.035);
      } else {
        // Organic scattered outer dust halo
        offsetR = Math.abs(randn()) * (minDim * 0.095);
      }

      let r = coreR + offsetR;
      if (r < innerVoid) {
        r = innerVoid + Math.random() * (minDim * 0.015);
      }

      wheelParticles.push({
        angle: angle,
        r: r,
        targetR: r,
        vr: (Math.random() - 0.5) * 0.2,
        angularSpeed: 0.0012 + Math.random() * 0.0016, // Unified slow organic drift
        vTheta: (Math.random() - 0.5) * 0.0004,
        size: 0.9 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.0 + Math.random() * 2.5
      });
    }
  };

  // ── Tech Boxes helpers ─────────────────────────────────────
  const techCharPool = '0123456789ABCDEF◆▮■◉⬡▲';
  const randTechChar = () => techCharPool[Math.floor(Math.random() * techCharPool.length)];

  const initTechBoxes = () => {
    techBoxes = [];
    techGridCols = Math.floor((width + TECH_GAP) / TECH_PITCH);
    techGridRows = Math.floor((height + TECH_GAP) / TECH_PITCH);
    const offsetX = (width - (techGridCols * TECH_PITCH - TECH_GAP)) / 2;
    const offsetY = (height - (techGridRows * TECH_PITCH - TECH_GAP)) / 2;

    for (let r = 0; r < techGridRows; r++) {
      for (let c = 0; c < techGridCols; c++) {
        techBoxes.push({
          col: c, row: r,
          x: offsetX + c * TECH_PITCH,
          y: offsetY + r * TECH_PITCH,
          brightness: 0.08 + Math.random() * 0.18,   // start with subtle visible shade
          char: randTechChar(),
          charTimer: Math.floor(Math.random() * 80),
          pulsePhase: Math.random() * Math.PI * 2,
        });
      }
    }
  };

  // ── Space Galaxy helpers ────────────────────────────────────
  const initSpaceGalaxy = () => {
    spaceStars = [];
    shootingStars = [];
    nebulaClouds = [];

    // Background stars — multiple layers for parallax depth
    for (let i = 0; i < 1000; i++) {
      const layer = Math.random();
      let size, twinkleSpeed, drift;
      if (layer < 0.5) {
        // Far dim stars
        size = 0.6 + Math.random() * 1.0;
        twinkleSpeed = 0.8 + Math.random() * 2.0;
        drift = 0.08 + Math.random() * 0.15;
      } else if (layer < 0.82) {
        // Mid stars
        size = 1.2 + Math.random() * 1.6;
        twinkleSpeed = 1.5 + Math.random() * 3.0;
        drift = 0.18 + Math.random() * 0.3;
      } else {
        // Bright close stars
        size = 2.0 + Math.random() * 2.5;
        twinkleSpeed = 2.5 + Math.random() * 3.5;
        drift = 0.35 + Math.random() * 0.5;
      }

      spaceStars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: size,
        baseAlpha: 0.5 + Math.random() * 0.5,
        twinkleSpeed: twinkleSpeed,
        twinklePhase: Math.random() * Math.PI * 2,
        drift: drift,
        layer: layer,
        // Color tint: most white, some warm, some blue
        tint: Math.random() < 0.12 ? 'warm' : Math.random() < 0.15 ? 'blue' : 'white',
      });
    }

    // Nebula clouds — large soft gradient blobs
    for (let i = 0; i < 5; i++) {
      nebulaClouds.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 100 + Math.random() * 250,
        alpha: 0.015 + Math.random() * 0.03,
        hueShift: Math.random() * 60 - 30,
        driftX: (Math.random() - 0.5) * 0.08,
        driftY: (Math.random() - 0.5) * 0.05,
      });
    }
  };

  const spawnShootingStar = () => {
    const startX = Math.random() * width * 1.2 - width * 0.1;
    const startY = Math.random() * height * 0.5;
    const angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.2;
    const spd = 6 + Math.random() * 10;
    shootingStars.push({
      x: startX, y: startY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 1.0,
      decay: 0.012 + Math.random() * 0.02,
      length: 40 + Math.random() * 80,
      width: 1.0 + Math.random() * 1.5,
    });
  };

  // ── Data Stream helpers ──────────────────────────────────────
  const initDataStream = () => {
    dataStreamBoxes = [];
    const cols = Math.floor(width / DATA_STREAM_PITCH) + 5; 
    const rows = Math.floor(height / DATA_STREAM_PITCH);
    
    for (let r = 0; r < rows; r++) {
      if (Math.random() < 0.4) {
        let numBoxes = Math.floor(1 + Math.random() * 4);
        for(let i=0; i<numBoxes; i++) {
           dataStreamBoxes.push({
             row: r,
             x: Math.random() * width * 1.5,
             speed: 0.5 + Math.random() * 2.5,
             brightness: 0.2 + Math.random() * 0.8
           });
        }
      }
    }
  };

  const spawnDataStreamBox = (r) => {
    dataStreamBoxes.push({
      row: r,
      x: width + Math.random() * 100,
      speed: 0.5 + Math.random() * 2.5,
      brightness: 0.2 + Math.random() * 0.8
    });
  };

  // ── Wave Grid helpers ────────────────────────────────────────
  const initWaveGrid = () => {
    waveDots = [];
    waveCols = Math.floor(width / WAVE_PITCH) + 1;
    waveRows = Math.floor(height / WAVE_PITCH) + 1;
    const offsetX = (width - (waveCols - 1) * WAVE_PITCH) / 2;
    const offsetY = (height - (waveRows - 1) * WAVE_PITCH) / 2;

    for (let r = 0; r < waveRows; r++) {
      for (let c = 0; c < waveCols; c++) {
        waveDots.push({
          col: c, row: r,
          baseX: offsetX + c * WAVE_PITCH,
          baseY: offsetY + r * WAVE_PITCH,
          z: 0
        });
      }
    }
  };

  // ── Pixel Constructor Grid helpers ─────────────────────────
  const initPixelBuild = () => {
    pixelBuildBlocks = [];
    pixelBuildCols = Math.floor(width / PIXEL_BUILD_PITCH);
    pixelBuildRows = Math.floor(height / PIXEL_BUILD_PITCH);
    const offsetX = (width - (pixelBuildCols * PIXEL_BUILD_PITCH - PIXEL_BUILD_GAP)) / 2;
    const offsetY = (height - (pixelBuildRows * PIXEL_BUILD_PITCH - PIXEL_BUILD_GAP)) / 2;

    const total = pixelBuildCols * pixelBuildRows;
    const centerC = pixelBuildCols / 2;
    const centerR = pixelBuildRows / 2;

    for (let r = 0; r < pixelBuildRows; r++) {
      for (let c = 0; c < pixelBuildCols; c++) {
        const distFromCenter = Math.hypot(c - centerC, r - centerR);
        const diagVal = c + r;
        const spiralAngle = Math.atan2(r - centerR, c - centerC) + Math.PI;

        pixelBuildBlocks.push({
          col: c, row: r,
          x: offsetX + c * PIXEL_BUILD_PITCH,
          y: offsetY + r * PIXEL_BUILD_PITCH,
          centerDist: distFromCenter,
          diagOrder: diagVal,
          spiralOrder: distFromCenter * 4 + spiralAngle * 3,
          randomOrder: Math.random() * total,
          buildProgress: 0,
          currentScale: 0,
          flash: 0,
          brightness: 0.15 + (Math.sin(c * 0.4) * Math.cos(r * 0.4) + 1) * 0.2
        });
      }
    }

    pixelBuildIndex = 0;
  };

  // ── Node.js Pixel Art / LED Matrix Preset helpers ──────────
  const initNodeJSPreset = () => {
    nodejsPixelBlocks = [];
    nodejsParticles = [];
    nodejsRain = [];
    nodejsSparks = [];

    // Adaptive pixel grid pitch based on screen and pixelSize
    const nodePitch = Math.max(12, Math.min(26, Math.floor(pixelSize * 1.05)));
    const nodeGap = Math.max(1, Math.floor(nodePitch * 0.16));
    const nodeBlockSize = nodePitch - nodeGap;

    const logoCols = 30;
    const logoRows = 34;
    const gridPixelWidth = logoCols * nodePitch;
    const gridPixelHeight = logoRows * nodePitch;

    const offsetX = (width - gridPixelWidth) / 2;
    const offsetY = (height - gridPixelHeight) / 2;

    const centerC = (logoCols - 1) / 2;
    const centerR = (logoRows - 1) / 2;

    for (let r = 0; r < logoRows; r++) {
      for (let c = 0; c < logoCols; c++) {
        const nx = (c - centerC) / (logoCols * 0.44);
        const ny = (r - centerR) / (logoRows * 0.44);

        // Pointy-top regular hexagon distance field
        const qx = Math.abs(nx) * 0.866025 + Math.abs(ny) * 0.5;
        const qy = Math.abs(ny);
        const dHex = Math.max(qx, qy);

        if (dHex <= 0.98) {
          const isOuterRim = dHex >= 0.78;
          
          // Official Node.js 3-facet division
          // 1. Top Facet: Upper region (light lime green #83cd29)
          // 2. Left Facet: Lower-left region (mid green #43853d)
          // 3. Right Facet: Lower-right region (dark pine green #215732)
          let facetType = 1;
          let facetFactor = 1.0;

          // Official Node.js leaf notch corner on top facet
          const isNotch = (nx > 0.25 && nx < 0.65 && ny < -0.35 && ny > -0.75);

          // Central isometric dividing ridges
          const isCenterRidge = Math.abs(nx) <= 0.055 && ny > 0;
          const isTopLeftRidge = Math.abs(ny - (-nx * 0.577)) <= 0.065 && nx < 0;
          const isTopRightRidge = Math.abs(ny - (nx * 0.577)) <= 0.065 && nx > 0;
          const isRidge = isCenterRidge || isTopLeftRidge || isTopRightRidge;

          if (ny <= 0 && (ny < -Math.abs(nx) * 0.577 || ny < 0 && Math.abs(nx) < 0.6)) {
            facetType = 1; // Top facet (Brightest lime highlight #83cd29)
            facetFactor = 1.35;
          } else if (nx <= 0) {
            facetType = 2; // Left facet (Mid emerald green #43853d)
            facetFactor = 0.95;
          } else {
            facetType = 3; // Right facet (Deep forest green #215732)
            facetFactor = 0.60;
          }

          let blockType = 'fill';
          let baseBrightness = 0.40 * facetFactor;
          let isCore = false;

          if (isNotch) {
            blockType = 'notch';
            baseBrightness = 1.25;
            isCore = true;
          } else if (isRidge) {
            blockType = 'ridge';
            baseBrightness = 1.15;
            isCore = true;
          } else if (isOuterRim) {
            blockType = 'rim';
            baseBrightness = 0.95;
            isCore = true;
          }

          const distFromCenter = Math.hypot(c - centerC, r - centerR);
          const angle = Math.atan2(r - centerR, c - centerC);

          nodejsPixelBlocks.push({
            col: c,
            row: r,
            x: offsetX + c * nodePitch,
            y: offsetY + r * nodePitch,
            size: nodeBlockSize,
            pitch: nodePitch,
            blockType,
            facetType,
            facetFactor,
            isCore,
            baseBrightness,
            distFromCenter,
            angle,
            currentScale: 1.0,
            flash: 0,
            liftZ: 0,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }

    // Atmospheric diagonal pixel rain
    for (let i = 0; i < 120; i++) {
      nodejsRain.push({
        x: (Math.random() - 0.2) * 1.4,
        y: Math.random(),
        z: 0.2 + Math.random() * 0.8,
        length: 20 + Math.random() * 50,
        speed: 0.5 + Math.random() * 0.8,
        alpha: 0.06 + Math.random() * 0.18,
        slant: -0.25 + (Math.random() - 0.5) * 0.05
      });
    }
  };

  const draw = (time) => {
    const now = performance.now();
    const elapsedFrame = now - lastFrameTime;

    // Throttle loop to target maximum of 90 FPS
    if (elapsedFrame < fpsInterval) {
      raf = requestAnimationFrame(draw);
      return;
    }
    lastFrameTime = now - (elapsedFrame % fpsInterval);

    // Measure FPS
    frameCount++;
    if (now - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastTime));
      if (fpsCounter) fpsCounter.textContent = fps;
      frameCount = 0;
      lastTime = now;
    }

    const t = time * 0.001 * speed;
    const elapsed = now - loadTime;

    const isIdle = (presetMode === "ghosting") && !isTrackingMouse && (now - lastActivityTime > 3000) && (elapsed > 2000);

    // Dynamic mouse coordinates easing / load sweep
    if (presetMode === "ghosting") {
      if (elapsed < 2000) {
        // Cinematic sweep on load
        const progress = elapsed / 2000;
        mouse.x = progress;
        mouse.y = 0.5 + Math.sin(progress * Math.PI * 2) * 0.12;
        mouse.tx = mouse.x;
        mouse.ty = mouse.y;
      } else {
        mouse.x += (mouse.tx - mouse.x) * 0.08;
        mouse.y += (mouse.ty - mouse.y) * 0.08;
      }
      
      if (isIdle) {
        mouse.tx = 0.5;
        mouse.ty = 0.5;
      }
    } else {
      mouse.x += (mouse.tx - mouse.x) * 0.08;
      mouse.y += (mouse.ty - mouse.y) * 0.08;
    }

    // Update snake physics if preset is selected
    if (presetMode === "snake-game") {
      const pitch = pixelSize;
      const cols = Math.floor(width / pitch);
      const rows = Math.floor(height / pitch);
      if (snakes.length === 0) {
        initSnake(cols, rows);
      }
      
      const now = performance.now();
      const tickSpeed = Math.max(20, 50 / speed);
      if (now - lastSnakeUpdate > tickSpeed) {
        lastSnakeUpdate = now;
        moveSnake(cols, rows, pitch);
      }
    }

    // Update gravity matrix physics
    if (presetMode === "gravity-matrix") {
      const pitch = 12; // Must match the forced rendering pitch
      const cols = Math.floor(width / pitch);
      const rows = Math.floor(height / pitch);
      
      if (gravityBlocks.length === 0) {
        initGravityMatrix(cols, rows);
      }

      // Assembly phase: magnetically pull particles to targets
      const gravity = 0.05 * speed;
      for (const b of gravityBlocks) {
        if (b.landed) continue;

        // Horizontal attraction (stronger multipliers for crisp tracking)
        const diffC = b.tc - b.c;
        b.vc += diffC * 0.085 * speed;
        b.vc *= 0.76;

        // Vertical attraction (zero gravity when close to target row to prevent sag)
        const diffR = b.tr - b.r;
        const particleGravity = (diffR > 1.5) ? gravity : 0;
        b.vr += particleGravity;
        b.vr += diffR * 0.085 * speed;
        b.vr *= 0.76;

        b.c += b.vc;
        b.r += b.vr;

        // Snap check: wider tolerance ensures clean locks
        if (Math.abs(b.c - b.tc) < 0.75 && Math.abs(b.r - b.tr) < 0.75) {
          b.c = b.tc;
          b.r = b.tr;
          b.landed = true;
        }
      }
    }

    // Clear background
    const transparent = (typeof transparentBgCheckbox !== "undefined" && transparentBgCheckbox) ? transparentBgCheckbox.checked : false;
    if (transparent) {
      ctx.clearRect(0, 0, width, height);
    } else {
      const currentBackground = (presetMode === "ghosting") ? "#090A0B" : background;
      ctx.fillStyle = currentBackground;
      ctx.fillRect(0, 0, width, height);
    }

    const [baseR, baseG, baseB] = hexToRgb(color);
    let activeLEDCount = 0;

    // ══════════════════════════════════════════════════════════
    //  3D DOT GLOBE — fully separate render path
    // ══════════════════════════════════════════════════════════
    if (presetMode === "dot-globe") {
      if (globePoints.length === 0) initGlobePoints();

      // Smooth auto-rotate when not dragging
      if (!globeDragging) globeRotY += 0.0018 * speed;

      const gcx = width / 2;
      const gcy = height / 2;
      const gRadius = Math.min(width, height) * 0.38;

      const cosRX = Math.cos(globeRotX);
      const sinRX = Math.sin(globeRotX);
      const cosRY = Math.cos(globeRotY);
      const sinRY = Math.sin(globeRotY);

      // Project all points
      const projected = [];
      for (const p of globePoints) {
        // Rotate Y
        const rx = p.x * cosRY + p.z * sinRY;
        const ry = p.y;
        const rz = -p.x * sinRY + p.z * cosRY;
        // Rotate X
        const fx = rx;
        const fy = ry * cosRX - rz * sinRX;
        const fz = ry * sinRX + rz * cosRX;

        if (fz < -0.15) continue; // back-face cull

        const depth = (fz + 1) / 2; // 0‥1
        projected.push({
          sx: gcx + fx * gRadius,
          sy: gcy - fy * gRadius,
          depth,
          land: p.land
        });
      }

      // Sort back → front
      projected.sort((a, b) => a.depth - b.depth);

      for (const pt of projected) {
        const sz = 0.6 + pt.depth * 2.2;
        let br;
        if (pt.land) {
          br = 55 + pt.depth * 200;
          // Tint with accent color
          const r = Math.min(255, Math.floor(baseR * (br / 255)));
          const g = Math.min(255, Math.floor(baseG * (br / 255)));
          const b = Math.min(255, Math.floor(baseB * (br / 255)));
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          br = 10 + pt.depth * 35;
          ctx.fillStyle = `rgb(${Math.floor(br)},${Math.floor(br)},${Math.floor(br + 5)})`;
        }
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, sz, 0, Math.PI * 2);
        ctx.fill();
        if (pt.land) activeLEDCount++;
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return; // skip grid rendering entirely
    }

    // ══════════════════════════════════════════════════════════
    //  06. CONVERGING STREAMS (Streamline Pinch)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "streamline-pinch") {
      if (streamLines.length === 0) initStreamlines();

      // Smooth auto-rotation when not dragging
      if (!streamDragging) {
        streamRotY += 0.0012 * speed;
        streamRotX = 0.18 + Math.sin(t * 0.6) * 0.06;
      }

      const gcx = width / 2;
      const gcy = height / 2;
      const scaleX = Math.min(width, height) * 0.82;
      const scaleYZ = Math.min(width, height) * 0.48;

      const cosRY = Math.cos(streamRotY);
      const sinRY = Math.sin(streamRotY);
      const cosRX = Math.cos(streamRotX);
      const sinRX = Math.sin(streamRotX);

      // 1. Project and draw faint dotted guide tracks
      for (let i = 0; i < streamLines.length; i++) {
        const pt = streamLines[i];
        // Rotate Y
        const rx = pt.x * cosRY + pt.z * sinRY;
        const ry = pt.y;
        const rz = -pt.x * sinRY + pt.z * cosRY;
        // Rotate X
        const fx = rx;
        const fy = ry * cosRX - rz * sinRX;
        const fz = ry * sinRX + rz * cosRX;

        const fov = 2.0;
        const camZ = 2.4;
        const pz = fz + camZ;
        const proj = fov / pz;

        const sx = gcx + fx * scaleX * proj;
        const sy = gcy - fy * scaleYZ * proj;
        const depth = Math.max(0.1, Math.min(1.0, (fz + 1.2) / 2.4));

        // Center bottleneck fade / subtle accent hue
        const centerProximity = 1.0 - Math.min(1.0, Math.abs(pt.u) * 1.3);
        const alpha = depth * (0.16 + centerProximity * 0.28);
        const guideR = Math.floor(180 + (baseR - 180) * 0.4);
        const guideG = Math.floor(190 + (baseG - 190) * 0.4);
        const guideB = Math.floor(190 + (baseB - 190) * 0.4);

        ctx.fillStyle = `rgba(${guideR}, ${guideG}, ${guideB}, ${alpha})`;
        const dotSize = 0.8 + depth * 0.7;
        ctx.fillRect(sx - dotSize / 2, sy - dotSize / 2, dotSize, dotSize);
      }

      // 2. Update and render bright traveling particles
      const sortedParticles = [];

      for (let i = 0; i < streamParticles.length; i++) {
        const p = streamParticles[i];

        // Accelerate as particle approaches center bottleneck (u = 0)
        const accel = 0.45 + 1.35 * (1.0 - Math.min(1.0, Math.abs(p.u) * 1.15));
        p.u += p.dir * p.baseSpeed * accel * speed;

        // Wrap around seamlessly
        if (p.u > 1.05) {
          p.u = -1.05;
          p.lineIdx = Math.floor(Math.random() * NUM_STREAM_LINES);
        } else if (p.u < -1.05) {
          p.u = 1.05;
          p.lineIdx = Math.floor(Math.random() * NUM_STREAM_LINES);
        }

        // Get 3D point on curve
        const pt = getStreamPoint(p.lineIdx, p.u);

        // Rotate Y
        const rx = pt.x * cosRY + pt.z * sinRY;
        const ry = pt.y;
        const rz = -pt.x * sinRY + pt.z * cosRY;
        // Rotate X
        const fx = rx;
        const fy = ry * cosRX - rz * sinRX;
        const fz = ry * sinRX + rz * cosRX;

        const fov = 2.0;
        const camZ = 2.4;
        const pz = fz + camZ;
        const proj = fov / pz;

        const sx = gcx + fx * scaleX * proj;
        const sy = gcy - fy * scaleYZ * proj;
        const depth = Math.max(0.1, Math.min(1.0, (fz + 1.2) / 2.4));

        sortedParticles.push({
          sx,
          sy,
          depth,
          size: p.size,
          u: p.u,
          phase: p.phase
        });
      }

      // Sort back-to-front
      sortedParticles.sort((a, b) => a.depth - b.depth);

      for (const sp of sortedParticles) {
        const rad = sp.size * (0.8 + sp.depth * 1.2);
        const centerPulse = 1.0 + (1.0 - Math.min(1.0, Math.abs(sp.u))) * 0.5;

        // Single clean accent-colored particle dot
        const alpha = Math.min(1.0, 0.5 + sp.depth * 0.5);
        ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sp.sx, sp.sy, rad, 0, Math.PI * 2);
        ctx.fill();

        activeLEDCount++;
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return; // skip standard grid rendering
    }

    // ══════════════════════════════════════════════════════════
    //  07. PARTICLE FLOW-FIELD (Fading Vortex Trails)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "flow-field") {
      if (flowParticles.length === 0) initFlowParticles();

      // Paint translucent overlay to create long fading trails (fades out transparently if enabled)
      if (transparent) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
        ctx.fillRect(0, 0, width, height);
      }

      const targetX = mouse.x * width;
      const targetY = mouse.y * height;

      for (let i = 0; i < flowParticles.length; i++) {
        const p = flowParticles[i];
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        const dist = Math.hypot(dx, dy) || 0.001;

        // Magnetic attraction force
        const force = (0.05 * speed) / Math.max(dist * 0.01, 0.5);
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;

        // Damping
        p.vx *= 0.96;
        p.vy *= 0.96;

        // Organic jitter
        p.vx += (Math.random() - 0.5) * 0.05;
        p.vy += (Math.random() - 0.5) * 0.05;

        p.x += p.vx;
        p.y += p.vy;

        // Border respawn
        if (p.x < -10 || p.x > width + 10 || p.y < -10 || p.y > height + 10) {
          const resp = createFlowParticle(true);
          p.x = resp.x;
          p.y = resp.y;
          p.vx = resp.vx;
          p.vy = resp.vy;
        }

        // Draw particle dot in accent color with glowing head
        ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        activeLEDCount++;
      }

      // Cursor convergence point indicator
      ctx.beginPath();
      ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  08. CONSTELLATION FIELD (Dynamic Star Lattice)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "constellation-field") {
      if (constellationStars.length === 0) initConstellationStars();

      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#07090e";
        ctx.fillRect(0, 0, width, height);
      }

      const targetX = mouse.x * width;
      const targetY = mouse.y * height;
      const maxDist = arcThickness * 1.1;

      // Update positions
      for (let s of constellationStars) {
        s.x += s.vx * speed;
        s.y += s.vy * speed;

        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;
      }

      // Draw proximity connection lines
      ctx.lineWidth = 1;
      for (let i = 0; i < constellationStars.length; i++) {
        const a = constellationStars[i];
        for (let j = i + 1; j < constellationStars.length; j++) {
          const b = constellationStars[j];
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.4;
            ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Mouse connecting lines
        const mdist = Math.hypot(targetX - a.x, targetY - a.y);
        if (mdist < maxDist * 1.4) {
          const alpha = (1 - mdist / (maxDist * 1.4)) * 0.65;
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(targetX, targetY);
          ctx.stroke();
        }
      }

      // Draw star nodes
      for (let s of constellationStars) {
        const twinkle = 0.7 + 0.3 * Math.sin(time * 0.003 * s.twinkleSpeed + s.twinklePhase);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * twinkle, 0, Math.PI * 2);
        ctx.fill();

        if (s.orbitRadius > 0) {
          s.orbitAngle += 0.02 * speed;
          const sx = s.x + Math.cos(s.orbitAngle) * s.orbitRadius;
          const sy = s.y + Math.sin(s.orbitAngle) * s.orbitRadius;
          ctx.fillStyle = `rgb(${baseR}, ${baseG}, ${baseB})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        activeLEDCount++;
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  09. PARTICLE ORBIT WHEEL (Organic Stochastic Particle Halo)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "particle-wheel") {
      if (wheelParticles.length === 0) initWheelParticles();

      // Clear pitch dark background
      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, width, height);
      }

      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const innerVoid = minDim * 0.20;

      // Update and render organic randomly scattered particles
      for (let i = 0; i < wheelParticles.length; i++) {
        const p = wheelParticles[i];

        // 1. Organic polar velocity updates
        p.vr += (Math.random() - 0.5) * 0.08 * speed;
        p.vr += (p.targetR - p.r) * 0.015 * speed; // Soft restorative pull to retain ring formation
        p.vr *= 0.94; // Damping

        p.r += p.vr * speed;
        if (p.r < innerVoid) {
          p.r = innerVoid + Math.random() * 2;
          p.vr = Math.abs(p.vr);
        }

        // 2. Angular drift
        p.angle += (p.angularSpeed + p.vTheta) * speed;

        // 3. Coordinate calculation
        const screenX = cx + Math.cos(p.angle) * p.r;
        const screenY = cy + Math.sin(p.angle) * p.r;

        // 4. Particle dot rendering
        const twinkle = 0.8 + 0.2 * Math.sin(time * 0.002 * p.twinkleSpeed + p.twinklePhase);
        const pSize = p.size * twinkle * (pixelSize / 4);

        // Single clean accent-colored particle dot
        ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, pSize, 0, Math.PI * 2);
        ctx.fill();

        activeLEDCount++;
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  10. TECH BOXES (Living Grid of Glowing Tech Cells)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "tech-boxes") {
      if (techBoxes.length === 0) initTechBoxes();

      // Solid dark background
      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#020406";
        ctx.fillRect(0, 0, width, height);
      }

      const mouseX = mouse.x * width;
      const mouseY = mouse.y * height;

      ctx.save();
      ctx.font = `bold ${Math.floor(TECH_BOX * 0.45)}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const box of techBoxes) {
        const bx = box.x;
        const by = box.y;
        const bCx = bx + TECH_BOX / 2;
        const bCy = by + TECH_BOX / 2;

        // Cursor proximity only
        const dist = Math.hypot(mouseX - bCx, mouseY - bCy);
        const cursorRadius = Math.max(arcThickness * 1.2, 140);
        const target = Math.max(0, 1 - dist / cursorRadius);
        const targetBr = target > 0.02 ? Math.pow(target, 0.9) : 0;

        // Smooth lerp
        box.brightness += (targetBr - box.brightness) * 0.1;
        if (box.brightness < 0.005) box.brightness = 0;

        const br = box.brightness;

        // Dormant: faint border
        ctx.strokeStyle = `rgba(255,255,255,${0.03 + br * 0.12})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(bx + 0.5, by + 0.5, TECH_BOX - 1, TECH_BOX - 1);

        if (br > 0.01) {
          // Background shade fill
          ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${br * 0.22})`;
          ctx.fillRect(bx, by, TECH_BOX, TECH_BOX);

          // Accent border
          ctx.strokeStyle = `rgba(${baseR},${baseG},${baseB},${br * 0.6})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(bx + 0.5, by + 0.5, TECH_BOX - 1, TECH_BOX - 1);
          
          // Binary digit 0 or 1
          const binaryChar = (box.col * 7 + box.row * 13) % 2 === 0 ? "0" : "1";
          ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${Math.min(1, br * 1.5)})`;
          ctx.fillText(binaryChar, bCx, bCy);
        }

        activeLEDCount++;
      }
      ctx.restore();

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  11. SPACE GALAXY (Twinkling Starfield + Shooting Stars)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "space-galaxy") {
      if (spaceStars.length === 0) initSpaceGalaxy();

      // Deep space background
      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#000005";
        ctx.fillRect(0, 0, width, height);
      }

      // Nebula clouds — soft accent-colored blobs
      for (const nc of nebulaClouds) {
        nc.x += nc.driftX * speed;
        nc.y += nc.driftY * speed;
        if (nc.x < -nc.radius) nc.x = width + nc.radius;
        if (nc.x > width + nc.radius) nc.x = -nc.radius;
        if (nc.y < -nc.radius) nc.y = height + nc.radius;
        if (nc.y > height + nc.radius) nc.y = -nc.radius;

        const grad = ctx.createRadialGradient(nc.x, nc.y, 0, nc.x, nc.y, nc.radius);
        grad.addColorStop(0, `rgba(${baseR},${baseG},${baseB},${nc.alpha * 1.4})`);
        grad.addColorStop(0.4, `rgba(${baseR},${baseG},${baseB},${nc.alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(nc.x - nc.radius, nc.y - nc.radius, nc.radius * 2, nc.radius * 2);
      }

      // Stars
      for (const s of spaceStars) {
        // Slow drift
        s.x += s.drift * speed;
        if (s.x > width + 5) s.x = -5;

        // Twinkle
        const twinkle = 0.4 + 0.6 * Math.pow(Math.sin(time * 0.001 * s.twinkleSpeed + s.twinklePhase), 2);
        const alpha = s.baseAlpha * twinkle;

        // Color
        let r, g, b;
        if (s.tint === 'warm') {
          r = 255; g = 200 + Math.floor(Math.random() * 30); b = 150;
        } else if (s.tint === 'blue') {
          r = 170; g = 200; b = 255;
        } else {
          r = 255; g = 255; b = 255;
        }

        // Draw star
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        // Cross flare on bright close stars
        if (s.layer >= 0.9 && twinkle > 0.75) {
          const flareLen = s.size * 4 * twinkle;
          const flareAlpha = alpha * 0.4;
          ctx.strokeStyle = `rgba(${r},${g},${b},${flareAlpha})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(s.x - flareLen, s.y); ctx.lineTo(s.x + flareLen, s.y); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(s.x, s.y - flareLen); ctx.lineTo(s.x, s.y + flareLen); ctx.stroke();
        }

        activeLEDCount++;
      }

      // Shooting stars — spawn randomly
      if (Math.random() < 0.008 * speed) {
        spawnShootingStar();
      }

      // Update and draw shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        ss.x += ss.vx * speed;
        ss.y += ss.vy * speed;
        ss.life -= ss.decay * speed;

        if (ss.life <= 0) {
          shootingStars.splice(i, 1);
          continue;
        }

        // Trail line with gradient fade
        const tailX = ss.x - (ss.vx / Math.hypot(ss.vx, ss.vy)) * ss.length * ss.life;
        const tailY = ss.y - (ss.vy / Math.hypot(ss.vx, ss.vy)) * ss.length * ss.life;

        const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.7, `rgba(255,255,255,${ss.life * 0.5})`);
        grad.addColorStop(1, `rgba(255,255,255,${ss.life * 0.9})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = ss.width * ss.life;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.stroke();

        // Bright head dot
        ctx.fillStyle = `rgba(255,255,255,${ss.life})`;
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.width * ss.life * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cursor subtle glow — like a nearby star illumination
      const cursorX = mouse.x * width;
      const cursorY = mouse.y * height;
      const cursorGlow = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 120);
      cursorGlow.addColorStop(0, `rgba(${baseR},${baseG},${baseB},0.06)`);
      cursorGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cursorGlow;
      ctx.fillRect(cursorX - 120, cursorY - 120, 240, 240);

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  12. DATA STREAM (Moving Boxes on Dot Grid + Cinematic Slow-Mo)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "data-stream") {
      if (dataStreamBoxes.length === 0) initDataStream();
      
      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#010204";
        ctx.fillRect(0, 0, width, height);
      }

      // Smooth slow-motion transition: 3.5x default -> 0.5x when cursor is active
      const isCursorActive = isTrackingMouse && (now - lastActivityTime < 2500);
      const targetMultiplier = isCursorActive ? 0.5 : 3.5;
      dataStreamSpeedMultiplier += (targetMultiplier - dataStreamSpeedMultiplier) * 0.045;
      const currentSpeed = speed * dataStreamSpeedMultiplier;

      const rows = Math.floor(height / DATA_STREAM_PITCH);
      const cols = Math.floor(width / DATA_STREAM_PITCH);
      const offsetY = (height - rows * DATA_STREAM_PITCH) / 2;
      const offsetX = (width - cols * DATA_STREAM_PITCH) / 2;

      const mouseX = mouse.x * width;
      const mouseY = mouse.y * height;

      // Draw background dot grid with subtle cursor proximity lighting
      for (let r = 0; r < rows; r++) {
        const dotY = offsetY + r * DATA_STREAM_PITCH + DATA_STREAM_PITCH / 2;
        for (let c = 0; c < cols; c++) {
          const dotX = offsetX + c * DATA_STREAM_PITCH + DATA_STREAM_PITCH / 2;
          const distToCursor = Math.hypot(mouseX - dotX, mouseY - dotY);
          const proximityBoost = isCursorActive && distToCursor < 120 ? (1 - distToCursor / 120) * 0.25 : 0;
          
          ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${0.07 + proximityBoost})`;
          ctx.beginPath();
          ctx.arc(dotX, dotY, 1.5 + proximityBoost * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Update and draw moving boxes
      for (let i = dataStreamBoxes.length - 1; i >= 0; i--) {
        const box = dataStreamBoxes[i];
        box.x -= box.speed * currentSpeed;

        if (box.x < -DATA_STREAM_PITCH * 2) {
          dataStreamBoxes.splice(i, 1);
          if (Math.random() < 0.8) {
            spawnDataStreamBox(Math.floor(Math.random() * rows));
          }
          continue;
        }

        const boxY = offsetY + box.row * DATA_STREAM_PITCH;
        const drawSize = DATA_STREAM_PITCH - 4;

        // Proximity glow when near cursor
        const distToBox = Math.hypot(mouseX - (box.x + drawSize / 2), mouseY - (boxY + drawSize / 2));
        const cursorHalo = isCursorActive && distToBox < 100 ? (1 - distToBox / 100) * 0.4 : 0;
        const boxAlpha = Math.min(1.0, box.brightness + cursorHalo);

        ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${boxAlpha})`;
        ctx.fillRect(box.x + 2, boxY + 2, drawSize, drawSize);
        activeLEDCount++;
      }
      
      // Spawn new boxes continuously
      if (Math.random() < 0.12 * Math.max(1, currentSpeed * 0.5)) {
         spawnDataStreamBox(Math.floor(Math.random() * rows));
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  13. WAVE GRID (Ocean Waves on Cursor Proximity)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "wave-grid") {
      if (waveDots.length === 0) initWaveGrid();
      
      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#010103";
        ctx.fillRect(0, 0, width, height);
      }

      const mouseX = mouse.x * width;
      const mouseY = mouse.y * height;
      const waveRadius = Math.max(250, width * 0.3);

      for (const dot of waveDots) {
        const dist = Math.hypot(mouseX - dot.baseX, mouseY - dot.baseY);
        
        let targetZ = 0;
        if (dist < waveRadius) {
          const normDist = dist / waveRadius;
          targetZ = Math.exp(-Math.pow(normDist * 2.5, 2)) * 140; // max lift
        }

        const timeOffset = dot.col * 0.1 + dot.row * 0.15;
        const ambientZ = Math.sin(time * 0.0015 + timeOffset) * 15;
        targetZ += Math.max(0, ambientZ);

        dot.z += (targetZ - dot.z) * 0.08;

        const drawX = dot.baseX;
        const drawY = dot.baseY - dot.z;
        
        const liftRatio = Math.max(0, Math.min(1, dot.z / 140));
        const size = 1.5 + liftRatio * 2.5;
        const alpha = 0.15 + liftRatio * 0.85;

        ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${alpha})`;
        ctx.beginPath();
        ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
        ctx.fill();

        activeLEDCount++;
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  14. PIXEL CONSTRUCTOR GRID (Sequential Box Assembly)
    // ══════════════════════════════════════════════════════════
    if (presetMode === "pixel-build") {
      if (pixelBuildBlocks.length === 0) initPixelBuild();

      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#010203";
        ctx.fillRect(0, 0, width, height);
      }

      const mouseX = mouse.x * width;
      const mouseY = mouse.y * height;
      const totalBlocks = pixelBuildBlocks.length;

      // Sequential building progression rate
      const buildRate = Math.max(1, Math.floor(4 * speed));
      pixelBuildIndex += buildRate;

      // Wave loop cycle
      if (pixelBuildIndex > totalBlocks + 100) {
        pixelBuildIndex = 0;
        pixelBuildMode = (pixelBuildMode + 1) % 4;
        for (const block of pixelBuildBlocks) {
          block.buildProgress = 0;
          block.flash = 0;
          block.randomOrder = Math.random() * totalBlocks;
        }
      }

      // Draw faint background grid frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 0.5;
      for (const block of pixelBuildBlocks) {
        ctx.strokeRect(block.x + 0.5, block.y + 0.5, PIXEL_BUILD_SIZE, PIXEL_BUILD_SIZE);
      }

      for (const block of pixelBuildBlocks) {
        let orderKey = 0;
        if (pixelBuildMode === 0) {
          // Center-outward propagation
          orderKey = (block.centerDist / (Math.max(pixelBuildCols, pixelBuildRows) * 0.65)) * totalBlocks;
        } else if (pixelBuildMode === 1) {
          // Diagonal sweep
          orderKey = (block.diagOrder / (pixelBuildCols + pixelBuildRows)) * totalBlocks;
        } else if (pixelBuildMode === 2) {
          // Spiral sweep
          orderKey = (block.spiralOrder / (pixelBuildCols * 5)) * totalBlocks;
        } else {
          // Random matrix scatter
          orderKey = block.randomOrder;
        }

        // Trigger block construction
        if (pixelBuildIndex >= orderKey && block.buildProgress < 1) {
          if (block.buildProgress === 0) {
            block.flash = 1.0;
          }
          block.buildProgress = 1;
        }

        // Cursor proximity interaction
        const bCx = block.x + PIXEL_BUILD_SIZE / 2;
        const bCy = block.y + PIXEL_BUILD_SIZE / 2;
        const distToCursor = Math.hypot(mouseX - bCx, mouseY - bCy);
        const cursorRadius = Math.max(arcThickness * 1.1, 110);
        const cursorNear = isTrackingMouse && distToCursor < cursorRadius;

        if (cursorNear) {
          block.buildProgress = 1;
          const force = 1 - distToCursor / cursorRadius;
          block.flash = Math.max(block.flash, force * 0.85);
        }

        if (block.buildProgress > 0) {
          // Elastic spring pop-in scale
          const targetScale = cursorNear ? 1.15 : 1.0;
          block.currentScale += (targetScale - block.currentScale) * 0.18;
          block.flash *= 0.92;

          const scale = block.currentScale;
          const halfSize = (PIXEL_BUILD_SIZE * scale) / 2;
          const drawX = bCx - halfSize;
          const drawY = bCy - halfSize;
          const drawDim = PIXEL_BUILD_SIZE * scale;

          // Box interior fill
          const baseAlpha = block.brightness * 0.25 + block.flash * 0.65;
          ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${Math.min(1.0, baseAlpha)})`;
          ctx.fillRect(drawX, drawY, drawDim, drawDim);

          // Box glowing border
          const borderAlpha = 0.2 + block.brightness * 0.5 + block.flash * 0.8;
          ctx.strokeStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${Math.min(1.0, borderAlpha)})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(drawX + 0.5, drawY + 0.5, drawDim - 1, drawDim - 1);

          activeLEDCount++;
        }
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  15. NODE.JS PIXEL ART / LED MATRIX PRESET
    // ══════════════════════════════════════════════════════════
    if (presetMode === "nodejs-particles") {
      if (nodejsPixelBlocks.length === 0) initNodeJSPreset();

      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#050709";
        ctx.fillRect(0, 0, width, height);

        const cxCenter = width * 0.5;
        const cyCenter = height * 0.5;
        const bgGlow = ctx.createRadialGradient(cxCenter, cyCenter, 20, cxCenter, cyCenter, Math.max(width, height) * 0.65);
        bgGlow.addColorStop(0, `rgba(${Math.round(baseR * 0.12)}, ${Math.round(baseG * 0.18)}, ${Math.round(baseB * 0.12)}, 0.4)`);
        bgGlow.addColorStop(0.5, "rgba(8, 12, 16, 0.25)");
        bgGlow.addColorStop(1, "rgba(3, 5, 7, 0.95)");
        ctx.fillStyle = bgGlow;
        ctx.fillRect(0, 0, width, height);
      }

      const elapsed = time * 0.001;
      const mouseX = mouse.x * width;
      const mouseY = mouse.y * height;
      const normMouseX = (mouse.x - 0.5) * 2;
      const normMouseY = (mouse.y - 0.5) * 2;

      // 1. Diagonal Matrix / Atmospheric Rain
      if (nodejsRain.length > 0) {
        ctx.save();
        ctx.lineWidth = 1.0;
        for (const r of nodejsRain) {
          r.y += r.speed * 0.016 * speed;
          if (r.y > 1.2) {
            r.y = -0.15;
            r.x = (Math.random() - 0.2) * 1.4;
          }
          const screenX = r.x * width;
          const screenY = r.y * height;
          const streakLen = r.length * (0.6 + r.z * 0.8);
          const endX = screenX + streakLen * r.slant;
          const endY = screenY + streakLen;

          const grad = ctx.createLinearGradient(screenX, screenY, endX, endY);
          const alpha = r.alpha * (0.4 + r.z * 0.6);
          grad.addColorStop(0, "rgba(100, 220, 120, 0)");
          grad.addColorStop(0.7, `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha * 0.6})`);
          grad.addColorStop(1, `rgba(220, 255, 230, ${alpha})`);

          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Floating Sway Translation
      const swayX = Math.sin(elapsed * 0.85 * speed) * 12.0 + (normMouseX * 20.0);
      const swayY = Math.cos(elapsed * 1.15 * speed) * 8.0 + (normMouseY * 15.0);

      // 3. Draw Background Faint Grid Cells
      ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
      ctx.lineWidth = 0.5;
      for (const block of nodejsPixelBlocks) {
        ctx.strokeRect(block.x + swayX, block.y + swayY, block.size, block.size);
      }

      // Energy scan wave progression
      const waveFront = (elapsed * 3.0 * speed) % 50;

      // 4. Render Active Pixel Blocks
      for (const block of nodejsPixelBlocks) {
        const bx = block.x + swayX;
        const by = block.y + swayY;
        const bCx = bx + block.size / 2;
        const bCy = by + block.size / 2;

        // Cursor proximity physics
        const distToCursor = Math.hypot(mouseX - bCx, mouseY - bCy);
        const cursorRadius = Math.max(arcThickness * 1.2, 120);
        const isHovered = isTrackingMouse && distToCursor < cursorRadius;

        if (isHovered) {
          const force = 1 - distToCursor / cursorRadius;
          block.flash = Math.max(block.flash, force * 0.85);
          block.liftZ += (force * 12.0 - block.liftZ) * 0.2;
        } else {
          block.liftZ *= 0.88;
        }

        block.flash *= 0.92;
        const targetScale = isHovered ? 1.15 : 1.0;
        block.currentScale += (targetScale - block.currentScale) * 0.2;

        // Scanning energy pulse
        const distFromTop = block.row + block.col * 0.15;
        const waveDelta = Math.abs((distFromTop % 25) - (waveFront % 25));
        const scanPulse = Math.max(0, 1 - waveDelta / 3.0) * 0.45;

        // Twinkle on rim & ridges
        const twinkle = block.isCore ? Math.sin(elapsed * 4.0 + block.phase) * 0.15 : 0;

        // Calculate combined brightness & alpha
        const totalBrightness = Math.min(1.5, (block.baseBrightness + scanPulse + twinkle + block.flash) * (glowIntensity / 2.0));

        const drawSize = block.size * block.currentScale;
        const halfSize = drawSize / 2;
        const drawX = bCx - halfSize;
        const drawY = bCy - halfSize - block.liftZ;

        // Color computation based on Node.js facet & type
        let rVal, gVal, bVal;
        if (block.blockType === "rim" || block.blockType === "ridge") {
          // Bright glowing rim: chalk white to neon accent blend
          rVal = Math.min(255, Math.round(240 * (1 - block.facetFactor * 0.3) + baseR * 0.6));
          gVal = Math.min(255, Math.round(250 * (1 - block.facetFactor * 0.2) + baseG * 0.7));
          bVal = Math.min(255, Math.round(240 * (1 - block.facetFactor * 0.3) + baseB * 0.6));
        } else if (block.facetType === 1) {
          // Highlight facet: vibrant neon green
          rVal = Math.min(255, Math.round(baseR * 1.25));
          gVal = Math.min(255, Math.round(baseG * 1.25));
          bVal = Math.min(255, Math.round(baseB * 1.25));
        } else if (block.facetType === 2) {
          // Mid facet: classic node emerald
          rVal = Math.round(baseR * 0.85);
          gVal = Math.round(baseG * 0.85);
          bVal = Math.round(baseB * 0.85);
        } else {
          // Shadow facet: deep forest node green
          rVal = Math.round(baseR * 0.45);
          gVal = Math.round(baseG * 0.45);
          bVal = Math.round(baseB * 0.45);
        }

        // Draw Pixel Box Interior Fill
        const fillAlpha = Math.max(0.12, Math.min(1.0, totalBrightness * 0.75));
        ctx.fillStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${fillAlpha})`;
        
        // Crisp rounded pixel block
        const radius = Math.min(3, drawSize * 0.18);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(drawX, drawY, drawSize, drawSize, radius);
        } else {
          ctx.rect(drawX, drawY, drawSize, drawSize);
        }
        ctx.fill();

        // Draw Glowing Pixel Border
        const borderAlpha = Math.max(0.2, Math.min(1.0, totalBrightness * 0.95 + 0.1));
        ctx.strokeStyle = `rgba(${rVal}, ${gVal}, ${bVal}, ${borderAlpha})`;
        ctx.lineWidth = block.isCore ? 1.2 : 0.8;
        ctx.stroke();

        // High-intensity phosphor bloom for core pixels / hovering
        if (totalBrightness > 0.85 && glowIntensity > 1.8) {
          ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${totalBrightness * 0.14})`;
          const bloomDim = drawSize * 2.2;
          ctx.fillRect(bCx - bloomDim / 2, bCy - bloomDim / 2 - block.liftZ, bloomDim, bloomDim);
        }

        // Random Spark Generation on active edges
        if (block.isCore && Math.random() < 0.008 * speed && nodejsSparks.length < 50) {
          nodejsSparks.push({
            x: bCx,
            y: bCy - block.liftZ,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -0.8 - Math.random() * 1.8,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.03,
            size: 1.5 + Math.random() * 1.5
          });
        }

        activeLEDCount++;
      }

      // 5. Render Pixel Sparks
      for (let i = nodejsSparks.length - 1; i >= 0; i--) {
        const s = nodejsSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= s.decay;

        if (s.life <= 0) {
          nodejsSparks.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${s.life * 0.9})`;
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }

      particleCounter.textContent = activeLEDCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  PRESET 15: HALFTONE WAVE GRID
    // ══════════════════════════════════════════════════════════
    if (presetMode === "halftone-waves") {
      const pitch = Math.max(10, Math.min(36, pixelSize));
      const cols = Math.ceil(width / pitch) + 2;
      const rows = Math.ceil(height / pitch) + 2;
      const startX = -pitch;
      const startY = -pitch;

      const minRadius = (pitch / 2) * 0.08;
      const maxRadius = (pitch / 2) * 1.15;
      const freq = 0.005 * (arcThickness / 100);
      const elapsed = time * 0.001 * speed;

      const mPx = mouse.x * width;
      const mPy = mouse.y * height;
      const mRadius = 160;

      let activeDotCount = 0;

      // Draw background ambient glow
      const cx = width / 2;
      const cy = height / 2;
      const radGlow = ctx.createRadialGradient(cx, cy, 40, cx, cy, Math.max(width, height) * 0.6);
      radGlow.addColorStop(0, `rgba(${baseR}, ${baseG}, ${baseB}, 0.12)`);
      radGlow.addColorStop(1, "transparent");
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, width, height);
      // Circus Starburst & Marquee Wave Synthesizer
      const arms = 8;
      const twist = 0.008;

      for (let r = 0; r < rows; r++) {
        const gridY = startY + r * pitch;
        for (let c = 0; c < cols; c++) {
          const gridX = startX + c * pitch;

          // Starburst mathematics
          const dx = gridX - cx;
          const dy = gridY - cy;
          const dist = Math.hypot(dx, dy);
          const theta = Math.atan2(dy, dx);

          const spiralAngle = theta * arms - dist * twist - elapsed * 1.8;
          const spiralWave = Math.sin(spiralAngle);
          const radialPulse = Math.cos(dist * 0.035 - elapsed * 2.2);
          const diagWave = Math.sin(gridX * 0.015 + gridY * 0.015 + elapsed * 0.8);

          let raw = spiralWave * 0.68 + radialPulse * 0.22 + diagWave * 0.10;
          let wave = Math.pow(Math.max(0, Math.min(1, 0.5 + 0.5 * raw)), 1.4);

          // Mouse inflation
          if (isTrackingMouse) {
            const mDist = Math.hypot(gridX - mPx, gridY - mPy);
            if (mDist < mRadius) {
              const mPower = (1 - mDist / mRadius) * 0.75;
              wave = Math.min(1.0, wave + mPower * 0.55);
            }
          }

          const dotRadius = minRadius + (maxRadius - minRadius) * wave;
          if (dotRadius <= 0.4) continue;

          // Glow for bright bulbs
          if (wave > 0.65 && glowIntensity > 1.2) {
            ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, 0.25)`;
            ctx.beginPath();
            ctx.arc(gridX, gridY, dotRadius * 1.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Main Bulb
          const alpha = Math.max(0.25, Math.min(1.0, 0.35 + wave * 0.65 * (glowIntensity / 2.0)));
          ctx.fillStyle = `rgba(${baseR}, ${baseG}, ${baseB}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(gridX, gridY, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          // Illuminated Core
          if (wave > 0.72) {
            ctx.fillStyle = `rgba(255, 245, 200, ${(wave - 0.72) * 3.0})`;
            ctx.beginPath();
            ctx.arc(gridX, gridY, dotRadius * 0.45, 0, Math.PI * 2);
            ctx.fill();
          }

          activeDotCount++;
        }
      }

      particleCounter.textContent = activeDotCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  PRESET 16: 3D ISOMETRIC KINETIC PIN MATRIX
    // ══════════════════════════════════════════════════════════
    if (presetMode === "kinetic-grid") {
      const pitch = Math.max(16, Math.min(32, pixelSize * 1.1));
      const cols = 26;
      const rows = 26;
      const maxElev = 65 * (glowIntensity / 2.0);
      const elapsed = time * 0.001 * speed;

      const mPx = mouse.x * width;
      const mPy = mouse.y * height;
      const mRadius = 150;

      const cx = width / 2;
      const cy = height / 2;

      // Ambient radial glow
      const radGlow = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(width, height) * 0.65);
      radGlow.addColorStop(0, `rgba(${baseR}, ${baseG}, ${baseB}, 0.12)`);
      radGlow.addColorStop(1, "transparent");
      ctx.fillStyle = radGlow;
      ctx.fillRect(0, 0, width, height);

      const isoCos = 0.866025;
      const isoSin = 0.500000;
      const centerCol = (cols - 1) / 2;
      const centerRow = (rows - 1) / 2;

      const pillars = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const gx = (c - centerCol);
          const gy = (r - centerRow);

          const groundX = cx + (gx - gy) * pitch * isoCos;
          const groundY = cy + (gx + gy) * pitch * isoSin + 35;

          const dist = Math.hypot(gx, gy);
          const ripple = Math.sin(dist * 0.55 - elapsed * 3.0);
          const damp = Math.exp(-dist * 0.05);
          let wave = 0.5 + 0.5 * (ripple * (0.6 + 0.4 * damp));

          // Mouse push
          if (isTrackingMouse) {
            const mDist = Math.hypot(groundX - mPx, groundY - mPy);
            if (mDist < mRadius) {
              const mPower = (1 - mDist / mRadius);
              wave = Math.min(1.0, wave + mPower * 0.7);
            }
          }

          const elevationHeight = 6 + wave * maxElev;
          const topY = groundY - elevationHeight;

          pillars.push({
            depth: r + c,
            groundX, groundY, topY,
            wave,
            w: (pitch * 0.46)
          });
        }
      }

      // Sort back-to-front
      pillars.sort((a, b) => a.depth - b.depth);

      // Render 3D Hexagonal Pillars
      for (const p of pillars) {
        const gx = p.groundX;
        const gy = p.groundY;
        const ty = p.topY;
        const w = p.w;
        const dy = w * 0.55;
        const wave = p.wave;

        // Left vertical face (shaded)
        ctx.beginPath();
        ctx.moveTo(gx - w, ty);
        ctx.lineTo(gx, ty + dy);
        ctx.lineTo(gx, gy + dy);
        ctx.lineTo(gx - w, gy);
        ctx.closePath();
        ctx.fillStyle = `rgba(${Math.round(baseR * 0.55)}, ${Math.round(baseG * 0.55)}, ${Math.round(baseB * 0.55)}, 0.95)`;
        ctx.fill();

        // Right vertical face (darker shaded)
        ctx.beginPath();
        ctx.moveTo(gx, ty + dy);
        ctx.lineTo(gx + w, ty);
        ctx.lineTo(gx + w, gy);
        ctx.lineTo(gx, gy + dy);
        ctx.closePath();
        ctx.fillStyle = `rgba(${Math.round(baseR * 0.28)}, ${Math.round(baseG * 0.28)}, ${Math.round(baseB * 0.28)}, 0.95)`;
        ctx.fill();

        // Top illuminated cap
        ctx.beginPath();
        ctx.moveTo(gx, ty - dy);
        ctx.lineTo(gx + w, ty);
        ctx.lineTo(gx, ty + dy);
        ctx.lineTo(gx - w, ty);
        ctx.closePath();
        ctx.fillStyle = wave > 0.4 ? `rgba(${baseR}, ${baseG}, ${baseB}, 1.0)` : `rgba(${Math.round(baseR * 0.7)}, ${Math.round(baseG * 0.7)}, ${Math.round(baseB * 0.7)}, 0.8)`;
        ctx.fill();

        // Edge stroke
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + wave * 0.5})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();

        // Core bright pip
        if (wave > 0.65) {
          ctx.fillStyle = `rgba(255, 255, 255, ${(wave - 0.65) * 2.8})`;
          ctx.beginPath();
          ctx.arc(gx, ty, w * 0.32, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      particleCounter.textContent = pillars.length.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  PRESET 17: PIXEL GAME WALL CASCADE
    // ══════════════════════════════════════════════════════════
    if (presetMode === "pixel-cascade") {
      const pitch = 24; // 24px Block Dimension
      const cols = Math.floor(width / pitch);
      const rows = Math.floor(height / pitch);
      const curDt = Math.min((time - lastTime) / 1000, 0.05);

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

      if (!cascadeInitialized || cascadeCols !== cols || cascadeRows !== rows) {
        cascadeCols = cols;
        cascadeRows = rows;
        cascadeGrid = [];
        for (let r = 0; r < rows; r++) {
          cascadeGrid[r] = new Array(cols).fill(null);
        }
        cascadeFalling = [];
        cascadeSparks = [];
        
        // Build crisp pixel-font typography mask for high readability
        cascadeNodeMask = [];
        for (let r = 0; r < rows; r++) {
          cascadeNodeMask[r] = new Uint8Array(cols);
        }
        
        const cleanText = (cascadeCustomText || "NODE JS").trim().toUpperCase();
        if (cleanText.length > 0) {
          const baseW = cleanText.length * 6 - 1;
          const maxScaleW = Math.max(1, Math.floor((cols - 4) / baseW));
          const maxScaleH = Math.max(1, Math.floor((rows - 4) / 7));
          const scale = Math.max(1, Math.min(maxScaleW, maxScaleH));

          const charW = 5 * scale;
          const spacing = 1 * scale;
          const charH = 7 * scale;
          const totalW = cleanText.length * (charW + spacing) - spacing;

          const startX = Math.max(1, Math.floor((cols - totalW) / 2));
          const startY = Math.max(1, Math.floor((rows - charH) / 2));

          for (let i = 0; i < cleanText.length; i++) {
            const ch = cleanText[i];
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
                        cascadeNodeMask[r][c] = 1;
                      }
                    }
                  }
                }
              }
            }
          }
        }
        
        // Initial solid foundation (only outside text void)
        const foundationRows = Math.min(3, Math.floor(rows * 0.15));
        for (let r = rows - foundationRows; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const isTextVoid = cascadeNodeMask[r] && cascadeNodeMask[r][c] === 1;
            if (!isTextVoid && Math.random() < 0.6) {
              cascadeGrid[r][c] = {
                color: color,
                flash: 0
              };
            }
          }
        }
        cascadeInitialized = true;
        cascadeTextFill = 0.0;
      }

      ctx.fillStyle = background || "#080c18";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath();
        ctx.moveTo(c * pitch, 0);
        ctx.lineTo(c * pitch, height);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * pitch);
        ctx.lineTo(width, r * pitch);
        ctx.stroke();
      }

      // 1. Draw Text Letters ("NODE JS") Cutout Boxes — Fills with solid glowing color when broken!
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (cascadeNodeMask[r] && cascadeNodeMask[r][c] === 1) {
            const bx = c * pitch;
            const by = r * pitch;

            if (cascadeTextFill > 0.05) {
              // FILLED TYPE: When broken, text box fills up with solid glowing color!
              const fillAlpha = Math.min(1.0, cascadeTextFill * 1.3);
              ctx.save();
              ctx.globalAlpha = fillAlpha;

              // Solid accent color block
              ctx.fillStyle = color;
              ctx.fillRect(bx + 1, by + 1, pitch - 2, pitch - 2);

              // 3D Bevel Highlights
              ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
              ctx.fillRect(bx + 1, by + 1, pitch - 2, 2.5);
              ctx.fillRect(bx + 1, by + 1, 2.5, pitch - 2);

              ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
              ctx.fillRect(bx + 1, by + pitch - 3.5, pitch - 2, 2.5);
              ctx.fillRect(bx + pitch - 3.5, by + 1, 2.5, pitch - 2);

              // Glowing border contour
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.0;
              ctx.strokeRect(bx + 1.5, by + 1.5, pitch - 3, pitch - 3);

              ctx.restore();
            } else {
              // INSET BADGE: Before break, dark void cutout
              ctx.fillStyle = "rgba(4, 8, 18, 0.88)";
              ctx.fillRect(bx + 1, by + 1, pitch - 2, pitch - 2);

              // Glowing neon contour
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.0;
              ctx.strokeRect(bx + 1.5, by + 1.5, pitch - 3, pitch - 3);

              // Center neon dot
              ctx.fillStyle = color;
              ctx.fillRect(bx + pitch / 2 - 1.5, by + pitch / 2 - 1.5, 3, 3);
            }
          }
        }
      }

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

      // 2. Build Spawning: Only spawn blocks during initial build. STOP spawning once complete or when user breaks blocks!
      let hasEmptySpot = false;
      const needyCols = [];
      const colGaps = {}; // c -> { lowestEmptyR, topGapR }
      for (let c = 0; c < cols; c++) {
        let lowestEmptyR = -1;
        for (let r = rows - 1; r >= 0; r--) {
          if (!cascadeGrid[r][c] && cascadeNodeMask[r][c] === 0) {
            lowestEmptyR = r;
            hasEmptySpot = true;
            break;
          }
        }
        if (lowestEmptyR !== -1) {
          needyCols.push(c);
          let topGapR = lowestEmptyR;
          while (topGapR > 0 && !cascadeGrid[topGapR - 1][c] && cascadeNodeMask[topGapR - 1][c] === 0) {
            topGapR--;
          }
          colGaps[c] = { lowestEmptyR, topGapR };
        }
      }

      if (!hasEmptySpot) {
        cascadeBuildComplete = true;
      }

      // Fast multi-block batch spawning ONLY while initial build is in progress
      // When user breaks blocks, cascadeBuildComplete is true so NO new blocks fall down!
      const spawnBatches = Math.min(8, Math.max(3, Math.floor(4.5 * speed)));
      if (!cascadeBuildComplete && cascadeFalling.length < 60 && needyCols.length > 0) {
        for (let b = 0; b < spawnBatches; b++) {
          if (Math.random() < 0.95 * speed) {
            const spawnCol = needyCols[Math.floor(Math.random() * needyCols.length)];
            const gapInfo = colGaps[spawnCol];
            const shape = tetronimos[Math.floor(Math.random() * tetronimos.length)];
            
            // If top is open, spawn above screen; if gap is under void/ceiling, spawn at gap entrance
            const spawnY = (gapInfo && gapInfo.topGapR > 0) 
              ? (gapInfo.topGapR - 1) * pitch 
              : -pitch * (1 + Math.random() * 2);

            cascadeFalling.push({
              col: spawnCol,
              y: spawnY,
              vy: (9.0 + Math.random() * 9.0) * speed,
              color: color,
              shape
            });
          }
        }
      }

      const mPx = mouse.x * width;
      const mPy = mouse.y * height;

      for (let i = cascadeFalling.length - 1; i >= 0; i--) {
        const fb = cascadeFalling[i];
        fb.y += fb.vy * 60 * curDt;

        if (isTrackingMouse) {
          const blockX = fb.col * pitch;
          const dx = mPx - blockX;
          const dy = mPy - fb.y;
          if (Math.abs(dy) < 120 && Math.abs(dx) < 140) {
            if (dx > 20 && fb.col < cols - 2 && Math.random() < 0.12) fb.col++;
            else if (dx < -20 && fb.col > 1 && Math.random() < 0.12) fb.col--;
          }
        }

        let hasCollided = false;
        let lowestContactR = -1;

        for (const [ox, oy] of fb.shape) {
          const c = fb.col + ox;
          const nextR = Math.floor((fb.y + oy * pitch + pitch) / pitch);

          if (c < 0 || c >= cols) continue;

          // Floor collision
          if (nextR >= rows) {
            hasCollided = true;
            lowestContactR = Math.max(lowestContactR, rows);
            break;
          }

          // Solid block collision below
          if (nextR >= 0 && cascadeGrid[nextR] && cascadeGrid[nextR][c]) {
            hasCollided = true;
            lowestContactR = Math.max(lowestContactR, nextR);
            break;
          }
        }

        if (hasCollided) {
          // Lock shape blocks accurately right above contact row
          const baseLandingR = lowestContactR >= 0 ? lowestContactR - 1 : Math.floor(fb.y / pitch);

          for (const [ox, oy] of fb.shape) {
            const c = fb.col + ox;
            const r = baseLandingR + oy;

            if (c >= 0 && c < cols && r >= 0 && r < rows && cascadeGrid[r]) {
              const isTextVoid = cascadeNodeMask[r] && cascadeNodeMask[r][c] === 1;
              if (!isTextVoid && !cascadeGrid[r][c]) {
                cascadeGrid[r][c] = {
                  color: color,
                  flash: 1.0
                };
                for (let k = 0; k < 2; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const spd = 2.0 + Math.random() * 4;
                  cascadeSparks.push({
                    x: c * pitch + pitch / 2,
                    y: r * pitch + pitch / 2,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd - 2,
                    color: color,
                    alpha: 1.0,
                    size: 2 + Math.random() * 2.5,
                    decay: 0.04 + Math.random() * 0.03
                  });
                }
              }
            }
          }
          cascadeFalling.splice(i, 1);
        }
      }

      // 3. Real Physics Gravity & Lateral Avalanche Settlement
      for (let r = rows - 2; r >= 0; r--) {
        for (let c = 0; c < cols; c++) {
          if (cascadeGrid[r] && cascadeGrid[r][c]) {
            // Straight down gravity
            if (cascadeGrid[r + 1] && !cascadeGrid[r + 1][c] && cascadeNodeMask[r + 1][c] === 0) {
              cascadeGrid[r + 1][c] = cascadeGrid[r][c];
              cascadeGrid[r][c] = null;
            }
            // Lateral avalanche around text voids or stacks
            else if (cascadeGrid[r + 1] && (cascadeNodeMask[r + 1][c] === 1 || cascadeGrid[r + 1][c])) {
              const canLeft = c > 0 && !cascadeGrid[r + 1][c - 1] && cascadeNodeMask[r + 1][c - 1] === 0 && !cascadeGrid[r][c - 1];
              const canRight = c < cols - 1 && !cascadeGrid[r + 1][c + 1] && cascadeNodeMask[r + 1][c + 1] === 0 && !cascadeGrid[r][c + 1];
              if (canLeft && canRight) {
                const dir = Math.random() < 0.5 ? -1 : 1;
                cascadeGrid[r + 1][c + dir] = cascadeGrid[r][c];
                cascadeGrid[r][c] = null;
              } else if (canLeft) {
                cascadeGrid[r + 1][c - 1] = cascadeGrid[r][c];
                cascadeGrid[r][c] = null;
              } else if (canRight) {
                cascadeGrid[r + 1][c + 1] = cascadeGrid[r][c];
                cascadeGrid[r][c] = null;
              }
            }
          }
        }
      }

      // 4. Render Solid Wall Blocks
      let activeBlockCount = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const b = cascadeGrid[r] ? cascadeGrid[r][c] : null;
          if (!b) continue;

          activeBlockCount++;
          const bx = c * pitch;
          const by = r * pitch;

          ctx.fillStyle = b.flash > 0.1 ? "#ffffff" : color;
          ctx.fillRect(bx + 1, by + 1, pitch - 2, pitch - 2);

          // 3D Bevel Highlights
          ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
          ctx.fillRect(bx + 1, by + 1, pitch - 2, 2.5);
          ctx.fillRect(bx + 1, by + 1, 2.5, pitch - 2);

          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.fillRect(bx + 1, by + pitch - 3.5, pitch - 2, 2.5);
          ctx.fillRect(bx + pitch - 3.5, by + 1, 2.5, pitch - 2);

          if (b.flash > 0) b.flash *= 0.85;
        }
      }

      // 5. Render Mega Shatter Combo Glow for the text
      if (cascadeMegaFlash > 0.04) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = cascadeMegaFlash * 35;
        ctx.globalAlpha = Math.min(1.0, cascadeMegaFlash);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (cascadeNodeMask[r] && cascadeNodeMask[r][c] === 1) {
              const bx = c * pitch;
              const by = r * pitch;
              ctx.fillRect(bx + 1, by + 1, pitch - 2, pitch - 2);
            }
          }
        }
        ctx.restore();
        cascadeMegaFlash *= 0.93;
      }

      for (const fb of cascadeFalling) {
        for (const [ox, oy] of fb.shape) {
          const bx = (fb.col + ox) * pitch;
          const by = fb.y + oy * pitch;
          if (bx < 0 || bx >= width || by > height) continue;

          activeBlockCount++;
          ctx.fillStyle = fb.color;
          ctx.fillRect(bx + 1, by + 1, pitch - 2, pitch - 2);

          ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
          ctx.fillRect(bx + 1, by + 1, pitch - 2, 2);
          ctx.fillRect(bx + 1, by + 1, 2, pitch - 2);

          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.fillRect(bx + 1, by + pitch - 3, pitch - 2, 2);
          ctx.fillRect(bx + pitch - 3, by + 1, 2, pitch - 2);
        }
      }

      for (let i = cascadeSparks.length - 1; i >= 0; i--) {
        const s = cascadeSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.18;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          cascadeSparks.splice(i, 1);
        } else {
          ctx.fillStyle = s.color;
          ctx.globalAlpha = Math.max(0, s.alpha);
          ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
        }
      }
      ctx.globalAlpha = 1.0;

      if (isTrackingMouse) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mPx, mPy, pitch * 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      particleCounter.textContent = activeBlockCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  PRESET 18: CYBER FLYING EAGLE DOT GRID MATRIX
    // ══════════════════════════════════════════════════════════
    if (presetMode === "flying-eagle") {
      const curDt = Math.min((time - lastTime) / 1000, 0.05);
      const curElapsed = (time - loadTime) / 1000;
      const pitch = Math.max(10, Math.min(28, pixelSize));
      const cols = Math.ceil(width / pitch);
      const rows = Math.ceil(height / pitch);
      const eg = flyingEagle;
      const scale = 1.25;

      if (!flyingEagleInitialized) {
        eg.x = width * 0.5;
        eg.y = height * 0.55;
        eg.vx = 0;
        eg.vy = -1;
        eg.heading = -Math.PI / 2;
        eg.targetHeading = -Math.PI / 2;
        flyingEagleInitialized = true;
      }

      // 1. Target Guidance: Mouse or Figure-8 Autonomous Soar
      let targetX, targetY;
      if (isTrackingMouse) {
        targetX = mouse.x * width;
        targetY = mouse.y * height;
      } else {
        const t = curElapsed * 0.45;
        const centerX = width * 0.5;
        const centerY = height * 0.48;
        targetX = centerX + Math.sin(t) * (width * 0.35);
        targetY = centerY + Math.sin(t * 2) * (height * 0.22) * 0.5 + Math.cos(t * 0.8) * 30;
      }

      const dx = targetX - eg.x;
      const dy = targetY - eg.y;
      const distToTarget = Math.hypot(dx, dy);

      if (distToTarget > 15) {
        eg.targetHeading = Math.atan2(dy, dx);
      }

      let dHeading = eg.targetHeading - eg.heading;
      while (dHeading > Math.PI) dHeading -= Math.PI * 2;
      while (dHeading < -Math.PI) dHeading += Math.PI * 2;
      eg.heading += dHeading * 3.5 * curDt;

      const targetBank = Math.max(-0.65, Math.min(0.65, dHeading * 2.2));
      eg.bankAngle += (targetBank - eg.bankAngle) * 5.0 * curDt;
      eg.pitchAngle = Math.sin(eg.heading) * 0.35;

      const baseSpeed = 175 * speed * (1.0 + eg.diveBurst * 1.5);
      const forwardX = Math.cos(eg.heading) * baseSpeed;
      const forwardY = Math.sin(eg.heading) * baseSpeed;

      eg.vx += (forwardX - eg.vx) * 3.0 * curDt;
      eg.vy += (forwardY - eg.vy) * 3.0 * curDt;

      eg.x += eg.vx * curDt;
      eg.y += eg.vy * curDt;

      const margin = 50;
      if (eg.x < margin) eg.x = margin;
      if (eg.x > width - margin) eg.x = width - margin;
      if (eg.y < margin) eg.y = margin;
      if (eg.y > height - margin) eg.y = height - margin;

      // Soaring vs Flapping kinematics
      eg.glideTimer += curDt;
      if (eg.glideTimer > 4.5) {
        eg.isGliding = !eg.isGliding;
        eg.glideTimer = 0;
      }

      if (!eg.isGliding) {
        eg.flapPhase += Math.PI * 2 * 1.4 * speed * curDt;
      } else {
        eg.flapPhase += Math.sin(curElapsed * 2.0) * 0.3 * curDt;
      }

      if (eg.diveBurst > 0) {
        eg.diveBurst = Math.max(0, eg.diveBurst - curDt * 1.2);
      }

      eg.wingFlex = Math.sin(eg.flapPhase) * 0.45;

      // Wingtip Vortex particles
      if (Math.random() < 0.85) {
        const span = 110 * scale;
        const wingCos = Math.cos(eg.heading + Math.PI / 2);
        const wingSin = Math.sin(eg.heading + Math.PI / 2);

        const tip1X = eg.x + wingCos * span;
        const tip1Y = eg.y + wingSin * span;
        const tip2X = eg.x - wingCos * span;
        const tip2Y = eg.y - wingSin * span;

        for (const [tx, ty] of [[tip1X, tip1Y], [tip2X, tip2Y]]) {
          flyingEagleVortex.push({
            x: tx,
            y: ty,
            vx: -eg.vx * 0.15 + (Math.random() - 0.5) * 15,
            vy: -eg.vy * 0.15 + (Math.random() - 0.5) * 15,
            alpha: 0.85,
            size: 2.0 + Math.random() * 3.0,
            color: color,
            decay: 0.025 + Math.random() * 0.02
          });
        }
      }

      for (let i = flyingEagleVortex.length - 1; i >= 0; i--) {
        const p = flyingEagleVortex[i];
        p.x += p.vx * curDt;
        p.y += p.vy * curDt;
        p.alpha -= p.decay;
        if (p.alpha <= 0) flyingEagleVortex.splice(i, 1);
      }

      for (let i = flyingEagleSparks.length - 1; i >= 0; i--) {
        const s = flyingEagleSparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;
        if (s.alpha <= 0) flyingEagleSparks.splice(i, 1);
      }

      // 2. Anatomical Skeletal Nodes in 3D Screen Space
      const headAngle = eg.heading;
      const cosH = Math.cos(headAngle);
      const sinH = Math.sin(headAngle);
      const wingPerpCos = Math.cos(headAngle + Math.PI / 2);
      const wingPerpSin = Math.sin(headAngle + Math.PI / 2);

      const flapZ = eg.isGliding 
        ? Math.sin(curElapsed * 1.5) * 0.08 - 0.12
        : Math.sin(eg.flapPhase);

      const bodyX = eg.x;
      const bodyY = eg.y;

      const headLen = 38 * scale;
      const headX = bodyX + cosH * headLen;
      const headY = bodyY + sinH * headLen;
      const beakX = bodyX + cosH * (headLen + 18 * scale);
      const beakY = bodyY + sinH * (headLen + 18 * scale);

      const eyeSpread = 5.5 * scale;
      const eye1X = headX + cosH * 4 * scale + wingPerpCos * eyeSpread;
      const eye1Y = headY + sinH * 4 * scale + wingPerpSin * eyeSpread;
      const eye2X = headX + cosH * 4 * scale - wingPerpCos * eyeSpread;
      const eye2Y = headY + sinH * 4 * scale - wingPerpSin * eyeSpread;

      const tailBaseLen = -28 * scale;
      const tailBaseX = bodyX + cosH * tailBaseLen;
      const tailBaseY = bodyY + sinH * tailBaseLen;
      const tailTipLen = -56 * scale;
      const tailTipX = bodyX + cosH * tailTipLen;
      const tailTipY = bodyY + sinH * tailTipLen;

      const wingSpan = 118 * scale;
      const bankMult = eg.bankAngle;

      const computeWing = (side) => {
        const s = side;
        const bankOffset = s * bankMult * 24 * scale;
        const strokeZ = (flapZ * 38 + bankOffset) * scale;

        const shX = bodyX + cosH * (6 * scale) + wingPerpCos * (14 * scale * s);
        const shY = bodyY + sinH * (6 * scale) + wingPerpSin * (14 * scale * s);

        const elX = bodyX + cosH * (-4 * scale) + wingPerpCos * (48 * scale * s);
        const elY = bodyY + sinH * (-4 * scale) + wingPerpSin * (48 * scale * s) - strokeZ * 0.45;

        const wrX = bodyX + cosH * (8 * scale) + wingPerpCos * (88 * scale * s);
        const wrY = bodyY + sinH * (8 * scale) + wingPerpSin * (88 * scale * s) - strokeZ * 0.85;

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

      const distToSeg = (px, py, x1, y1, x2, y2) => {
        const segDx = x2 - x1;
        const segDy = y2 - y1;
        const lenSq = segDx * segDx + segDy * segDy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);
        let t = Math.max(0, Math.min(1, ((px - x1) * segDx + (py - y1) * segDy) / lenSq));
        return Math.hypot(px - (x1 + t * segDx), py - (y1 + t * segDy));
      };

      let activeEagleDots = 0;

      // 3. Render Optical Dot Matrix Grid Field
      for (let r = 0; r < rows; r++) {
        const gy = r * pitch + pitch / 2;
        for (let c = 0; c < cols; c++) {
          const gx = c * pitch + pitch / 2;

          let dotColor = "rgba(255, 255, 255, 0.04)";
          let dotRadius = 1.0;
          let isEagleDot = false;
          let luminance = 0;

          // Body distance
          const distBody = distToSeg(gx, gy, headX, headY, tailBaseX, tailBaseY);
          const bodyThick = 18 * scale;
          if (distBody < bodyThick) {
            luminance = Math.max(luminance, 1.0 - distBody / bodyThick);
            dotColor = color;
            isEagleDot = true;
          }

          // Head & Beak
          const distHead = Math.hypot(gx - headX, gy - headY);
          if (distHead < 14 * scale) {
            luminance = Math.max(luminance, 1.2 - distHead / (14 * scale));
            dotColor = "#ffffff";
            isEagleDot = true;
          }
          const distBeak = distToSeg(gx, gy, headX, headY, beakX, beakY);
          if (distBeak < 6 * scale) {
            luminance = Math.max(luminance, 1.4);
            dotColor = "#f59e0b";
            isEagleDot = true;
          }

          // Eyes
          if (Math.hypot(gx - eye1X, gy - eye1Y) < 3.8 * scale || Math.hypot(gx - eye2X, gy - eye2Y) < 3.8 * scale) {
            luminance = 2.0;
            dotColor = "#fef08a";
            isEagleDot = true;
          }

          // Tail
          const distTail = distToSeg(gx, gy, tailBaseX, tailBaseY, tailTipX, tailTipY);
          if (distTail < 18 * scale) {
            luminance = Math.max(luminance, 0.9 - distTail / (18 * scale));
            dotColor = color;
            isEagleDot = true;
          }

          // Wings
          for (const w of [leftWing, rightWing]) {
            const dShEl = distToSeg(gx, gy, w.shoulder.x, w.shoulder.y, w.elbow.x, w.elbow.y);
            if (dShEl < 16 * scale) {
              luminance = Math.max(luminance, 1.0 - dShEl / (16 * scale));
              dotColor = color;
              isEagleDot = true;
            }

            const dElWr = distToSeg(gx, gy, w.elbow.x, w.elbow.y, w.wrist.x, w.wrist.y);
            if (dElWr < 14 * scale) {
              luminance = Math.max(luminance, 1.0 - dElWr / (14 * scale));
              dotColor = color;
              isEagleDot = true;
            }

            for (let f = 0; f < w.primaries.length; f++) {
              const p = w.primaries[f];
              const dFeather = distToSeg(gx, gy, w.wrist.x, w.wrist.y, p.x, p.y);
              if (dFeather < 7.5 * scale) {
                const featherLum = 1.0 - dFeather / (7.5 * scale);
                if (featherLum > luminance) {
                  luminance = featherLum;
                  dotColor = (f === 0 || f === 4) ? "#ffffff" : color;
                  isEagleDot = true;
                }
              }
            }
          }

          if (isEagleDot) {
            activeEagleDots++;
            dotRadius = Math.max(1.5, Math.min(pitch * 0.46, 2.5 + luminance * 4.2 * scale));
            ctx.fillStyle = dotColor;

            if (glowIntensity > 1.0 && luminance > 0.8) {
              ctx.shadowColor = dotColor;
              ctx.shadowBlur = luminance * 10 * glowIntensity;
            } else {
              ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
            ctx.beginPath();
            ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.shadowBlur = 0;

      // 4. Render Vortex Trail Particles
      for (const p of flyingEagleVortex) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 5. Render Sparks
      for (const s of flyingEagleSparks) {
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
      }
      ctx.globalAlpha = 1.0;

      // 6. Flight Target Cursor Reticle
      if (isTrackingMouse) {
        const mx = mouse.x * width;
        const my = mouse.y * height;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(mx, my, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(mx - 22, my);
        ctx.lineTo(mx - 8, my);
        ctx.moveTo(mx + 8, my);
        ctx.lineTo(mx + 22, my);
        ctx.moveTo(mx, my - 22);
        ctx.lineTo(mx, my - 8);
        ctx.moveTo(mx, my + 8);
        ctx.lineTo(mx, my + 22);
        ctx.stroke();
      }

      // 7. CRT Retro Scanlines
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      particleCounter.textContent = activeEagleDots.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }

    // ══════════════════════════════════════════════════════════
    //  PRESET 19: AMBER HALFTONE DISPERSION & ROLLING WAVES
    // ══════════════════════════════════════════════════════════
    if (presetMode === "amber-dispersion") {
      const curDt = Math.min((time - lastTime) / 1000, 0.05);
      const curElapsed = (time - loadTime) / 1000;
      const pitch = Math.max(10, Math.min(32, pixelSize));
      const cols = Math.ceil(width / pitch);
      const rows = Math.ceil(height / pitch);
      const maxRadius = (pitch / 2) * 0.94;
      const t = curElapsed * 1.5 * speed;

      // Update shockwaves
      for (let i = amberShockwaves.length - 1; i >= 0; i--) {
        const sw = amberShockwaves[i];
        sw.radius += sw.speed * curDt;
        sw.strength -= sw.decay * curDt;
        if (sw.strength <= 0 || sw.radius >= sw.maxRadius) {
          amberShockwaves.splice(i, 1);
        }
      }

      // Fast inline 3D Perlin/Simplex permutation noise
      const fastNoise3D = (x, y, z) => {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const fz = z - Math.floor(z);
        const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
        const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
        const w = fz * fz * fz * (fz * (fz * 6 - 15) + 10);
        
        const hash = (i, j, k) => {
          let h = (i * 374761393 + j * 668265263 + k * 362827313) ^ 0x5bf03635;
          h = Math.imul(h ^ (h >>> 13), 1274126177);
          return (h ^ (h >>> 16)) / 2147483648;
        };

        const x0 = hash(X, Y, Z);
        const x1 = hash(X + 1, Y, Z);
        const x2 = hash(X, Y + 1, Z);
        const x3 = hash(X + 1, Y + 1, Z);
        const y0 = x0 + u * (x1 - x0);
        const y1 = x2 + u * (x3 - x2);
        const z0 = y0 + v * (y1 - y0);

        const x4 = hash(X, Y, Z + 1);
        const x5 = hash(X + 1, Y, Z + 1);
        const x6 = hash(X, Y + 1, Z + 1);
        const x7 = hash(X + 1, Y + 1, Z + 1);
        const y2 = x4 + u * (x5 - x4);
        const y3 = x6 + u * (x7 - x6);
        const z1 = y2 + v * (y3 - y2);

        return z0 + w * (z1 - z0);
      };

      let activeDotCount = 0;
      const mousePixelX = mouse.x * width;
      const mousePixelY = mouse.y * height;

      for (let r = 0; r < rows; r++) {
        const baseY = r * pitch + pitch / 2;
        const vNorm = baseY / height;

        for (let c = 0; c < cols; c++) {
          const baseX = c * pitch + pitch / 2;
          const uNorm = baseX / width;

          // Spatial coordinates
          const nx = uNorm * 3.4;
          const ny = vNorm * 2.6;

          // Rolling Ocean Wave Harmonics
          const wave1 = Math.sin(uNorm * 7.0 + vNorm * 5.0 - t * 2.8);
          const wave2 = Math.cos(uNorm * 11.0 - vNorm * 7.0 + t * 2.0) * 0.45;
          const wave3 = Math.sin(vNorm * 14.0 - t * 3.5) * 0.25;

          const noiseWarp = fastNoise3D(nx + wave1 * 0.5, ny + wave2 * 0.5, t * 0.3) * 0.6;
          const diagonalBias = (1.0 - uNorm * 0.6) * (0.4 + vNorm * 0.8);

          const compositeWave = (wave1 + wave2 + wave3 + noiseWarp + 1.6) * 0.35;
          let density = compositeWave * diagonalBias * 1.35;
          density = Math.max(0, Math.min(1.0, Math.pow(density, 1.3)));

          // 3D wave position offset (vertical crest & lateral flow)
          const waveElev = (wave1 + wave2 * 0.7) * 7.5;
          const lateralWave = Math.cos(uNorm * 7.0 - t * 2.8) * 3.5;

          const gx = baseX + lateralWave;
          const gy = baseY + waveElev;

          // Mouse interaction wake
          if (isTrackingMouse) {
            const dMouse = Math.hypot(gx - mousePixelX, gy - mousePixelY);
            if (dMouse < 140) {
              const mFactor = 1.0 - dMouse / 140;
              density = Math.min(1.0, density + mFactor * 0.7);
            }
          }

          // Shockwave ripple pulses
          for (const sw of amberShockwaves) {
            const dSw = Math.hypot(gx - sw.x, gy - sw.y);
            const ringDist = Math.abs(dSw - sw.radius);
            if (ringDist < 50) {
              const waveMag = (1.0 - ringDist / 50) * sw.strength * 0.65;
              density = Math.min(1.0, density + waveMag);
            }
          }

          let dotRadius = 0;
          let dotColor = "rgba(255, 255, 255, 0.04)";

          if (density < 0.08) {
            dotRadius = 0.8;
            dotColor = "rgba(255, 255, 255, 0.04)";
          } else if (density < 0.3) {
            activeDotCount++;
            dotRadius = 1.2 + density * maxRadius * 0.85;
            dotColor = color;
          } else if (density < 0.6) {
            activeDotCount++;
            dotRadius = maxRadius * (0.35 + density * 0.5);
            dotColor = color;
          } else if (density < 0.85) {
            activeDotCount++;
            dotRadius = maxRadius * (0.55 + density * 0.4);
            dotColor = color;
          } else {
            activeDotCount++;
            dotRadius = maxRadius * Math.min(1.0, 0.78 + density * 0.22);
            dotColor = "#ffffff";
          }

          if (glowIntensity > 1.0 && density > 0.68) {
            ctx.shadowColor = color;
            ctx.shadowBlur = (density - 0.68) * 18 * glowIntensity;
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
      ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      particleCounter.textContent = activeDotCount.toLocaleString();
      raf = requestAnimationFrame(draw);
      return;
    }



    // ══════════════════════════════════════════════════════════
    //  STANDARD GRID PRESETS

    // ══════════════════════════════════════════════════════════

    // Coordinates based on center (static for led-arch)
    const cx = (presetMode === "led-arch") ? (width * 0.5) : (width * 0.5 + (mouse.x - 0.5) * width * 0.22);
    const cy = (presetMode === "led-arch") ? (height * 0.78) : (height * 0.78 + (mouse.y - 0.5) * height * 0.12);

    const baseRadius = Math.min(width, height) * 0.58;

    const pitch = (presetMode === "ghosting") ? 16 : (presetMode === "gravity-matrix") ? 12 : pixelSize;
    const gap = 1; // Gap between cells
    const drawSize = (presetMode === "ghosting") ? 12 : (presetMode === "gravity-matrix") ? 10 : (pitch - gap);

    const cols = Math.floor(width / pitch);
    const rows = Math.floor(height / pitch);

    const offsetX = (width - cols * pitch) / 2;
    const offsetY = (height - rows * pitch) / 2;

    const startCol = Math.floor((cols - 18) / 2);
    const startRow = Math.floor((rows - 7) / 2);

    const mousePx = mouse.x * width;
    const mousePy = mouse.y * height;

    let lightRadius = arcThickness; // Spread width maps to flashlight size
    if (isIdle) {
      const pulse = 0.75 + Math.sin(time * 0.0035) * 0.25;
      lightRadius *= pulse;
    }

    // Update and draw the inactive grid pattern in a single call (blazing fast!)
    updateGridPattern(presetMode, pixelSize);
    ctx.fillStyle = gridPattern;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.fillRect(-offsetX, -offsetY, width, height);
    ctx.restore();

    // Loop through LED grid coordinates
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * pitch + pitch / 2;
      
      for (let r = 0; r < rows; r++) {
        const y = offsetY + r * pitch + pitch / 2;

        let intensity = 0;

        // Visual Preset Switcher
        switch (presetMode) {
          case "led-arch": {
            const dx = x - cx;
            const dy = y - cy;
            const distToCenter = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // 01. Classic LED Arch (with high-frequency volatility oscillations)
            const baseWave = Math.sin(t * 1.2 + angle * 2.0) * 16;
            const jitter = Math.sin(t * 8.5 + angle * 13.0) * 6; // volatile jitter
            const noise = Math.cos(t * 3.8 - angle * 5.0) * 11;   // chaotic wave noise
            
            const targetRadius = baseRadius + baseWave + jitter + noise;
            const distToArc = Math.abs(distToCenter - targetRadius);
            intensity = Math.pow(Math.max(0, 1 - distToArc / arcThickness), 2.2) * glowIntensity;
            break;
          }
          case "ghosting": {
            // 14. Ghosting Flashlight (Searchlight looking for hidden 0->1 grid)
            const artCol = c - startCol;
            const artRow = r - startRow;
            const isArtwork = (artCol >= 0 && artCol < 18 && artRow >= 0 && artRow < 7) 
                              ? (artwork[artRow][artCol] === 1) 
                              : false;

            const dx = x - mousePx;
            const dy = y - mousePy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let lightFactor = Math.max(0, 1 - dist / lightRadius);
            lightFactor = Math.pow(lightFactor, 1.6); // exponential falloff

            let rVal, gVal, bVal;
            if (isArtwork) {
              // Artwork: default #1B1622 (slightly visible purple hint), glows electric purple #D000FF
              const startR = 27, startG = 22, startB = 34;
              const targetR = 208, targetG = 0, targetB = 255; // #D000FF electric purple
              rVal = Math.min(255, Math.max(0, Math.floor(startR + (targetR - startR) * lightFactor * 1.3)));
              gVal = Math.min(255, Math.max(0, Math.floor(startG + (targetG - startG) * lightFactor * 1.3)));
              bVal = Math.min(255, Math.max(0, Math.floor(startB + (targetB - startB) * lightFactor * 1.3)));
              ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
              ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
            }

            if (lightFactor > 0.05) {
              activeLEDCount++;
            }
            continue; // Skip standard round drawing below
          }
          case "snake-game": {
            // 03. Retro Snake Grid (Simple cursor-following pixel snake trail)
            let snakeIndex = -1;
            let currentSnakeLength = 7;
            for (const s of snakes) {
              const idx = s.findIndex(seg => seg.c === c && seg.r === r);
              if (idx !== -1) {
                snakeIndex = idx;
                currentSnakeLength = s.length;
                break;
              }
            }

            let rVal, gVal, bVal;

            if (snakeIndex !== -1) {
              // Snake body: fades from head (index 0) to tail
              const segmentFactor = 1.0 - (snakeIndex / currentSnakeLength) * 0.7; // goes from 1.0 to 0.3
              // Glows with active accent color
              rVal = Math.floor(baseR * segmentFactor);
              gVal = Math.floor(baseG * segmentFactor);
              bVal = Math.floor(baseB * segmentFactor);
              ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
              ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
              activeLEDCount++;
            }
            continue;
          }
          case "gravity-matrix": {
            // 04. Gravity Cascade (Magnetically assembling the giant 0->1 logo)
            let isLanded = false;
            let isFalling = false;

            for (const b of gravityBlocks) {
              const bc = Math.round(b.c);
              const br = Math.round(b.r);
              if (bc === c && br === r) {
                if (b.landed) {
                  isLanded = true;
                } else {
                  isFalling = true;
                }
                break;
              }
            }

            let rVal, gVal, bVal;

            if (isFalling) {
              // Falling particle: bright white
              rVal = 245;
              gVal = 245;
              bVal = 255;
              ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
              ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
              activeLEDCount++;
            } else if (isLanded) {
              // Landed logo segment: solid base color, glows on hover
              const distToMouse = Math.sqrt((x - mousePx) ** 2 + (y - mousePy) ** 2);
              const hoverFactor = Math.pow(Math.max(0, 1 - distToMouse / 150), 2.0);
              
              // Base brightness is 0.55 ("as it is"), scales to 1.2 on hover
              const brightness = 0.55 + 0.65 * hoverFactor;
              rVal = Math.min(255, Math.floor(baseR * brightness));
              gVal = Math.min(255, Math.floor(baseG * brightness));
              bVal = Math.min(255, Math.floor(baseB * brightness));
              ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
              ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
              activeLEDCount++;
            }
            continue;
          }
        }

        // Localized mouse flashlight glow (disabled for led-arch to remove cursor shades)
        let mouseGlow = 0;
        if (presetMode !== "led-arch") {
          const distToMouse = Math.sqrt((x - mousePx) ** 2 + (y - mousePy) ** 2);
          mouseGlow = Math.pow(Math.max(0, 1 - distToMouse / 160), 3.0) * 0.55;
        }

        // Merge glowing components
        const finalIntensity = Math.max(intensity, mouseGlow);

        if (finalIntensity < 0.015) {
          continue;
        }

        activeLEDCount++;

        // Render pure shading (No white core interpolation, as requested)
        // This ensures the glow colors scale directly inside the chosen green/hex color hue spectrum.
        const rVal = Math.min(255, Math.floor(baseR * finalIntensity));
        const gVal = Math.min(255, Math.floor(baseG * finalIntensity));
        const bVal = Math.min(255, Math.floor(baseB * finalIntensity));

        ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
      }
    }

    particleCounter.textContent = activeLEDCount.toLocaleString();
    raf = requestAnimationFrame(draw);
  };

  // Mouse and Touch event listeners
  const updatePosition = (clientX, clientY) => {
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        mouse.tx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        mouse.ty = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      } else {
        mouse.tx = clientX / window.innerWidth;
        mouse.ty = clientY / window.innerHeight;
      }
    } else {
      mouse.tx = clientX / window.innerWidth;
      mouse.ty = clientY / window.innerHeight;
    }
    isTrackingMouse = true;
    lastActivityTime = performance.now();
  };

  const onMouseMove = (e) => {
    updatePosition(e.clientX, e.clientY);
  };

  const onMouseLeave = () => {
    mouse.tx = 0.5;
    mouse.ty = 0.5;
    isTrackingMouse = false;
  };

  // Keyboard controls shortcut
  const handleKeydown = (e) => {
    // reserved for future shortcuts
  };

  // ── Standalone exports code generator ─────────────────────────────
  const getPresetCode = (preset) => {
    switch (preset) {
      case "led-arch":
        return `
      // Loop through LED grid coordinates
      const pitch = pixelSize;
      const gap = 1;
      const drawSize = pitch - gap;
      const cols = Math.floor(width / pitch);
      const rows = Math.floor(height / pitch);
      const offsetX = (width - cols * pitch) / 2;
      const offsetY = (height - rows * pitch) / 2;
      
      const cx = width * 0.5;
      const cy = height * 0.78;
      const baseRadius = Math.min(width, height) * 0.58;

      ctx.beginPath();
      let hasInactive = false;

      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * pitch + pitch / 2;
        for (let r = 0; r < rows; r++) {
          const y = offsetY + r * pitch + pitch / 2;
          
          const dx = x - cx;
          const dy = y - cy;
          const distToCenter = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          const baseWave = Math.sin(t * 1.2 + angle * 2.0) * 16;
          const jitter = Math.sin(t * 8.5 + angle * 13.0) * 6;
          const noise = Math.cos(t * 3.8 - angle * 5.0) * 11;
          const targetRadius = baseRadius + baseWave + jitter + noise;
          const distToArc = Math.abs(distToCenter - targetRadius);
          const intensity = Math.pow(Math.max(0, 1 - distToArc / arcThickness), 2.2) * glowIntensity;

          if (intensity < 0.015) {
            ctx.rect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
            hasInactive = true;
            continue;
          }

          const rVal = Math.min(255, Math.floor(baseR * intensity));
          const gVal = Math.min(255, Math.floor(baseG * intensity));
          const bVal = Math.min(255, Math.floor(baseB * intensity));

          ctx.fillStyle = "rgb(" + rVal + "," + gVal + "," + bVal + ")";
          ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
        }
      }

      if (hasInactive) {
        ctx.fillStyle = transparent ? "rgba(0, 20, 5, 0.03)" : "rgba(0, 20, 5, 0.15)";
        ctx.fill();
      }
        `;
      case "particle-wheel":
        return `
      // Central wheel constants
      const cx = width / 2;
      const cy = height / 2;
      const minDim = Math.min(width, height);
      const innerVoid = minDim * 0.20;

      // Initialize particles once
      if (!window.wheelParticles) {
        window.wheelParticles = [];
        const count = 750;
        const coreR = minDim * 0.27;
        const randn = () => {
          let u = 0, v = 0;
          while (u === 0) u = Math.random();
          while (v === 0) v = Math.random();
          return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        };
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          let offsetR = Math.random() < 0.82 ? randn() * (minDim * 0.035) : randn() * (minDim * 0.14);
          const r = Math.max(innerVoid + 2, coreR + offsetR);
          window.wheelParticles.push({
            r: r,
            targetR: r,
            vr: 0,
            angle: angle,
            angularSpeed: (0.0015 + Math.random() * 0.002) * (Math.random() < 0.5 ? 1 : -1),
            size: 0.8 + Math.random() * 1.6,
            twinkleSpeed: 0.8 + Math.random() * 1.5,
            twinklePhase: Math.random() * Math.PI
          });
        }
      }

      // Render particles
      for (let i = 0; i < window.wheelParticles.length; i++) {
        const p = window.wheelParticles[i];
        p.vr += (Math.random() - 0.5) * 0.08 * speed;
        p.vr += (p.targetR - p.r) * 0.015 * speed;
        p.vr *= 0.94;
        p.r += p.vr * speed;
        if (p.r < innerVoid) {
          p.r = innerVoid + Math.random() * 2;
          p.vr = Math.abs(p.vr);
        }
        p.angle += p.angularSpeed * speed;

        const screenX = cx + Math.cos(p.angle) * p.r;
        const screenY = cy + Math.sin(p.angle) * p.r;
        const twinkle = 0.8 + 0.2 * Math.sin(time * 0.002 * p.twinkleSpeed + p.twinklePhase);
        const pSize = p.size * twinkle * (pixelSize / 4);

        ctx.fillStyle = "rgba(" + baseR + "," + baseG + "," + baseB + "," + twinkle + ")";
        ctx.beginPath();
        ctx.arc(screenX, screenY, pSize, 0, Math.PI * 2);
        ctx.fill();
      }
        `;
      case "constellation-field":
        return `
      // Initialize stars once
      if (!window.stars) {
        window.stars = [];
        const count = 180;
        for (let i = 0; i < count; i++) {
          window.stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            radius: 0.8 + Math.random() * 1.6
          });
        }
      }

      // Update and draw
      const maxDist = arcThickness * 1.1;
      for (let s of window.stars) {
        s.x += s.vx * speed;
        s.y += s.vy * speed;
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y < 0) s.y = height;
        if (s.y > height) s.y = 0;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Connections
      ctx.lineWidth = 0.65;
      for (let i = 0; i < window.stars.length; i++) {
        const s1 = window.stars[i];
        for (let j = i + 1; j < window.stars.length; j++) {
          const s2 = window.stars[j];
          const dx = s1.x - s2.x;
          const dy = s1.y - s2.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            const alpha = (1.0 - d / maxDist) * 0.28;
            ctx.strokeStyle = "rgba(" + baseR + "," + baseG + "," + baseB + "," + alpha + ")";
            ctx.beginPath();
            ctx.moveTo(s1.x, s1.y);
            ctx.lineTo(s2.x, s2.y);
            ctx.stroke();
          }
        }
      }
        `;
      case "nodejs-particles":
        return `
      // Node.js 3D Particle Outline & Rain
      const r = 135;
      const swayX = Math.sin(t * 0.85 * speed) * 14.0;
      const swayY = Math.cos(t * 1.15 * speed) * 9.0;
      const rotY = Math.sin(t * 0.65 * speed) * 0.14;
      const rotX = Math.cos(t * 0.85 * speed) * 0.08;
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cx = width * 0.5, cy = height * 0.5;
      const responsiveScale = (Math.min(width, height) / 700) * (arcThickness / 100);
      
      // Draw Node.js Particle points
      for (let i = 0; i < 3000; i++) {
        const ang = (Math.floor(i / 500) * 60 - 30) * Math.PI / 180;
        const progress = (i % 500) / 500;
        const nextAng = ang + Math.PI / 3;
        const x0 = (Math.cos(ang) * (1 - progress) + Math.cos(nextAng) * progress) * r * responsiveScale;
        const y0 = (Math.sin(ang) * (1 - progress) + Math.sin(nextAng) * progress) * r * responsiveScale;
        
        const x1 = x0 * cosY;
        const z1 = -x0 * sinY;
        const y2 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;
        
        const projX = cx + (x1 + swayX) * (550 / (550 + z2));
        const projY = cy + (y2 + swayY) * (550 / (550 + z2));
        
        ctx.fillStyle = "rgba(" + baseR + "," + baseG + "," + baseB + ", 0.85)";
        ctx.fillRect(projX, projY, 1.2, 1.2);
      }
        `;
      default:
        return `
      const pitch = pixelSize;
      const gap = 1;
      const drawSize = pitch - gap;
      const cols = Math.floor(width / pitch);
      const rows = Math.floor(height / pitch);
      const offsetX = (width - cols * pitch) / 2;
      const offsetY = (height - rows * pitch) / 2;
      
      const cx = width * 0.5;
      const cy = height * 0.5;

      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * pitch + pitch / 2;
        for (let r = 0; r < rows; r++) {
          const y = offsetY + r * pitch + pitch / 2;
          
          const dx = x - cx;
          const dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const intensity = Math.max(0, Math.sin(dist * 0.05 - t * 3.0));

          const rVal = Math.min(255, Math.floor(baseR * intensity));
          const gVal = Math.min(255, Math.floor(baseG * intensity));
          const bVal = Math.min(255, Math.floor(baseB * intensity));

          ctx.fillStyle = "rgb(" + rVal + "," + gVal + "," + bVal + ")";
          ctx.fillRect(x - drawSize / 2, y - drawSize / 2, drawSize, drawSize);
        }
      }
        `;
    }
  };

  const copyJsModuleCode = () => {
    const preset = presetMode;
    const cleanPresetName = preset.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    const isTransparent = transparentBgCheckbox ? transparentBgCheckbox.checked : false;

    let codeStr = `/**
 * Standalone Canvas 2D Visualizer: ${cleanPresetName}
 * Primary Accent Color: ${color}
 * Throttled to 90 FPS
 */
export class ${cleanPresetName}Visualizer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = options.color || "${color}";
    this.speed = options.speed || ${speed};
    this.pixelSize = options.pixelSize || ${pixelSize};
    this.arcThickness = options.arcThickness || ${arcThickness};
    this.glowIntensity = options.glowIntensity || ${glowIntensity};
    this.transparent = options.transparent !== undefined ? options.transparent : ${isTransparent};
    
    this.width = 0;
    this.height = 0;
    this.raf = 0;
    this.lastFrameTime = performance.now();
    this.fpsInterval = 1000 / 90;
    
    this.init();
  }

  init() {
    this.resize = this.resize.bind(this);
    this.draw = this.draw.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.raf = requestAnimationFrame(this.draw);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(time) {
    const now = performance.now();
    const elapsedFrame = now - this.lastFrameTime;
    if (elapsedFrame < this.fpsInterval) {
      this.raf = requestAnimationFrame(this.draw);
      return;
    }
    this.lastFrameTime = now - (elapsedFrame % this.fpsInterval);

    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    // Clear background
    if (this.transparent) {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#030704";
      ctx.fillRect(0, 0, width, height);
    }

    const t = time * 0.001 * this.speed;
    const [baseR, baseG, baseB] = this.hexToRgb(this.color);
    const speed = this.speed;
    const pixelSize = this.pixelSize;
    const arcThickness = this.arcThickness;
    const glowIntensity = this.glowIntensity;
    const transparent = this.transparent;

    ${getPresetCode(preset).trim()}

    this.raf = requestAnimationFrame(this.draw);
  }

  hexToRgb(hex) {
    const val = hex.replace("#", "");
    return [
      parseInt(val.substring(0, 2), 16),
      parseInt(val.substring(2, 4), 16),
      parseInt(val.substring(4, 6), 16)
    ];
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }
}`;

    navigator.clipboard.writeText(codeStr)
      .then(() => alert(`Clean ES Module class code for ${cleanPresetName} copied to clipboard!`))
      .catch(err => {
        console.error("Could not copy text: ", err);
        alert("Clipboard copy failed. Standalone code generated:\n\n" + codeStr.substring(0, 200) + "...");
      });
  };

  const downloadStandaloneHTML = () => {
    const preset = presetMode;
    const cleanPresetName = preset.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    const isTransparent = transparentBgCheckbox ? transparentBgCheckbox.checked : false;

    let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanPresetName} - Standalone Visualizer</title>
  <style>
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: ${isTransparent ? 'transparent' : '#030704'};
    }
    #visualizer-canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
  <canvas id="visualizer-canvas"></canvas>
  <script>
    // Standalone Canvas visualizer code for ${cleanPresetName}
    const canvas = document.getElementById("visualizer-canvas");
    const ctx = canvas.getContext("2d");
    
    let width = window.innerWidth;
    let height = window.innerHeight;
    let raf = 0;
    
    const color = "${color}";
    const speed = ${speed};
    const pixelSize = ${pixelSize};
    const arcThickness = ${arcThickness};
    const glowIntensity = ${glowIntensity};
    const transparent = ${isTransparent};

    let lastFrameTime = performance.now();
    const fpsInterval = 1000 / 90;

    // Hex to RGB Helper
    const hexToRgb = (hex) => {
      const value = hex.replace("#", "");
      return [
        parseInt(value.substring(0, 2), 16),
        parseInt(value.substring(2, 4), 16),
        parseInt(value.substring(4, 6), 16)
      ];
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    window.addEventListener("resize", resize);
    resize();

    // Render loop
    const draw = (time) => {
      const now = performance.now();
      const elapsed = now - lastFrameTime;
      if (elapsed < fpsInterval) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = now - (elapsed % fpsInterval);

      if (transparent) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "#030704";
        ctx.fillRect(0, 0, width, height);
      }

      const t = time * 0.001 * speed;
      const [baseR, baseG, baseB] = hexToRgb(color);

      ${getPresetCode(preset).trim()}

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset}-standalone.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;

  const recordWebmVideo = () => {
    if (isRecording) return;
    isRecording = true;

    recordedChunks = [];
    if (webmBtnText) webmBtnText.textContent = "Recording (5s)...";
    if (exportWebmBtn) {
      exportWebmBtn.style.background = "rgba(220, 38, 38, 0.15)";
      exportWebmBtn.style.borderColor = "rgba(220, 38, 38, 0.4)";
    }

    const stream = canvas.captureStream(60); 
    
    let options = { mimeType: "video/webm;codecs=vp9" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm;codecs=vp8" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }

    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.error("MediaRecorder creation failed:", e);
      alert("Transparent WebM recording is not supported in this browser. Try Chrome or Firefox!");
      resetWebmButton();
      return;
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${presetMode}-transparent-visualizer.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resetWebmButton();
    };

    mediaRecorder.start();

    // Stop recording after 5 seconds
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
    }, 5000);
  };

  const resetWebmButton = () => {
    isRecording = false;
    if (webmBtnText) webmBtnText.textContent = "Record & Download WebM";
    if (exportWebmBtn) {
      exportWebmBtn.style.background = "rgba(255, 255, 255, 0.04)";
      exportWebmBtn.style.borderColor = "rgba(255, 255, 255, 0.10)";
    }
  };

  const downloadMdIntegrationGuide = () => {
    const preset = presetMode;
    const cleanPresetName = preset.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
    const isTransparent = transparentBgCheckbox ? transparentBgCheckbox.checked : false;

    const classCode = `/**
 * Standalone Canvas 2D Visualizer: ${cleanPresetName}
 * Primary Accent Color: ${color}
 * Throttled to 90 FPS
 */
export class ${cleanPresetName}Visualizer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = options.color || "${color}";
    this.speed = options.speed || ${speed};
    this.pixelSize = options.pixelSize || ${pixelSize};
    this.arcThickness = options.arcThickness || ${arcThickness};
    this.glowIntensity = options.glowIntensity || ${glowIntensity};
    this.transparent = options.transparent !== undefined ? options.transparent : ${isTransparent};
    
    this.width = 0;
    this.height = 0;
    this.raf = 0;
    this.lastFrameTime = performance.now();
    this.fpsInterval = 1000 / 90;
    
    this.init();
  }

  init() {
    this.resize = this.resize.bind(this);
    this.draw = this.draw.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();
    this.raf = requestAnimationFrame(this.draw);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(time) {
    const now = performance.now();
    const elapsedFrame = now - this.lastFrameTime;
    if (elapsedFrame < this.fpsInterval) {
      this.raf = requestAnimationFrame(this.draw);
      return;
    }
    this.lastFrameTime = now - (elapsedFrame % this.fpsInterval);

    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;

    // Clear background
    if (this.transparent) {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "#030704";
      ctx.fillRect(0, 0, width, height);
    }

    const t = time * 0.001 * this.speed;
    const [baseR, baseG, baseB] = this.hexToRgb(this.color);
    const speed = this.speed;
    const pixelSize = this.pixelSize;
    const arcThickness = this.arcThickness;
    const glowIntensity = this.glowIntensity;
    const transparent = this.transparent;

    ${getPresetCode(preset).trim()}

    this.raf = requestAnimationFrame(this.draw);
  }

  hexToRgb(hex) {
    const val = hex.replace("#", "");
    return [
      parseInt(val.substring(0, 2), 16),
      parseInt(val.substring(2, 4), 16),
      parseInt(val.substring(4, 6), 16)
    ];
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
  }
}`;

    const mdContent = `# Developer Integration Guide: ${cleanPresetName} Visualizer

This guide provides the complete standalone integration code and instructions for embedding the **${cleanPresetName}** visualizer inside your own projects.

## Visualizer Configuration
* **Preset Variant**: \`${preset}\`
* **Primary Accent Color**: \`${color}\`
* **Block Dimension**: \`${pixelSize}px\`
* **Wave Spread**: \`${arcThickness}px\`
* **Glow Bloom**: \`${glowIntensity}x\`
* **Animation Speed**: \`${speed}x\`
* **Transparent Background Mode**: \`${isTransparent ? "Enabled" : "Disabled"}\`

---

## Standalone ES6 Class Module

Save the following code inside a JavaScript module file (e.g. \`visualizer.js\`):

\`\`\`javascript
${classCode}
\`\`\`

---

## Setup & Integration Steps

### Step 1: Add Canvas to HTML
Place a \`<canvas>\` container in your markup where you want the visualizer to render:
\`\`\`html
<!-- Ensure the parent container has explicit dimensions -->
<div style="position: relative; width: 100vw; height: 100vh;">
  <canvas id="my-visualizer-canvas" style="display: block; width: 100%; height: 100%;"></canvas>
</div>
\`\`\`

### Step 2: Instantiate Visualizer
Import the class and initialize it by passing your canvas element:
\`\`\`javascript
import { ${cleanPresetName}Visualizer } from "./visualizer.js";

const canvas = document.getElementById("my-visualizer-canvas");
const visualizer = new ${cleanPresetName}Visualizer(canvas, {
  color: "${color}",
  speed: ${speed},
  pixelSize: ${pixelSize},
  arcThickness: ${arcThickness},
  glowIntensity: ${glowIntensity},
  transparent: ${isTransparent}
});

// To clean up/destroy event listeners when navigating away (SPAs):
// visualizer.destroy();
\`\`\`
`;

    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${preset}-integration-guide.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  let isRecordingGif = false;
  const loadScript = (url) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load script " + url));
      document.head.appendChild(script);
    });
  };

  const recordGifVideo = () => {
    if (isRecordingGif) return;
    isRecordingGif = true;

    if (gifBtnText) gifBtnText.textContent = "Loading Engine...";
    if (exportGifBtn) {
      exportGifBtn.style.background = "rgba(234, 179, 8, 0.15)";
      exportGifBtn.style.borderColor = "rgba(234, 179, 8, 0.4)";
    }

    loadScript("https://cdnjs.cloudflare.com/ajax/libs/gifshot/0.4.5/gifshot.min.js")
      .then(() => {
        captureGifFrames();
      })
      .catch((e) => {
        console.error("Failed to load gifshot:", e);
        alert("Failed to load GIF recording engine. Please check your internet connection.");
        resetGifButton();
      });
  };

  const captureGifFrames = () => {
    const frames = [];
    const maxFrames = 60; // 2 seconds of animation at 30 FPS
    const recordInterval = 1000 / 30; // 30 FPS capture
    let framesCaptured = 0;

    if (gifBtnText) gifBtnText.textContent = "Capturing (2s)...";

    // Setup temp downscaling canvas (480x270 standard preview size)
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 480;
    tempCanvas.height = 270;
    const tempCtx = tempCanvas.getContext("2d");

    const captureInterval = setInterval(() => {
      // Draw main canvas onto downscaled canvas
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, tempCanvas.width, tempCanvas.height);
      
      frames.push(tempCanvas.toDataURL("image/png"));
      framesCaptured++;

      if (framesCaptured >= maxFrames) {
        clearInterval(captureInterval);
        compileGif(frames, tempCanvas.width, tempCanvas.height);
      }
    }, recordInterval);
  };

  const compileGif = (frames, gifWidth, gifHeight) => {
    if (gifBtnText) gifBtnText.textContent = "Encoding GIF...";

    window.gifshot.createGIF({
      images: frames,
      gifWidth: gifWidth,
      gifHeight: gifHeight,
      interval: 1 / 30,
      numFrames: frames.length,
      frameDuration: 3, // 30 FPS (3 centiseconds per frame)
      sampleInterval: 10,
      numWorkers: 2
    }, (obj) => {
      if (!obj.error) {
        const a = document.createElement("a");
        a.href = obj.image;
        a.download = `${presetMode}-preview.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        console.error("gifshot error:", obj.error);
        alert("Failed to encode GIF. Please try again!");
      }
      resetGifButton();
    });
  };

  const resetGifButton = () => {
    isRecordingGif = false;
    if (gifBtnText) gifBtnText.textContent = "Record & Download GIF";
    if (exportGifBtn) {
      exportGifBtn.style.background = "rgba(255, 255, 255, 0.04)";
      exportGifBtn.style.borderColor = "rgba(255, 255, 255, 0.10)";
    }
  };

  const updateGlobalAccentColor = (newColor) => {
    color = newColor;
    if (accentPicker) accentPicker.value = newColor;
    if (accentHex) accentHex.value = newColor.toUpperCase();
    
    // Update swatch preview
    const accentSwatchPreview = document.getElementById("accent-swatch-preview");
    if (accentSwatchPreview) {
      accentSwatchPreview.style.backgroundColor = newColor;
    }

    // Update CSS custom property values
    document.documentElement.style.setProperty("--accent-color", newColor);
    
    const [r, g, b] = hexToRgb(newColor);
    document.documentElement.style.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);

    // Update presets indicator classes
    if (presetDots) {
      presetDots.forEach(dot => {
        if (dot.getAttribute("data-color").toLowerCase() === newColor.toLowerCase()) {
          dot.classList.add("active");
        } else {
          dot.classList.remove("active");
        }
      });
    }
  };

  // Hook Up HUD Events inside init
  const onCanvasClick = (e) => {
    if (presetMode === "snake-game") {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const pitch = pixelSize;
      const cols = Math.floor(width / pitch);
      const rows = Math.floor(height / pitch);
      const offsetX = (width - cols * pitch) / 2;
      const offsetY = (height - rows * pitch) / 2;
      
      const clickC = Math.floor((clickX - offsetX) / pitch);
      const clickR = Math.floor((clickY - offsetY) / pitch);
      
      const boundedC = Math.max(0, Math.min(cols - 1, clickC));
      const boundedR = Math.max(0, Math.min(rows - 1, clickR));
      
      snakes.push(createSnake(boundedC, boundedR));
    } else if (presetMode === "pixel-cascade") {
      // User is breaking blocks: STOP new blocks from falling down!
      cascadeBuildComplete = true;
      cascadeFalling = [];

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const pitch = 24;
      const targetC = Math.floor(clickX / pitch);
      const targetR = Math.floor(clickY / pitch);
      const radiusCells = 4;
      let brokenCount = 0;
      for (let r = Math.max(0, targetR - radiusCells); r <= Math.min(cascadeRows - 1, targetR + radiusCells); r++) {
        for (let c = Math.max(0, targetC - radiusCells); c <= Math.min(cascadeCols - 1, targetC + radiusCells); c++) {
          const d = Math.hypot(c - targetC, r - targetR);
          if (d <= radiusCells && cascadeGrid[r] && cascadeGrid[r][c]) {
            brokenCount++;
            const blockCol = cascadeGrid[r][c].color;
            for (let k = 0; k < 4; k++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 5;
              cascadeSparks.push({
                x: c * pitch + pitch / 2,
                y: r * pitch + pitch / 2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 2,
                color: blockCol,
                alpha: 1.0,
                size: 2 + Math.random() * 3,
                decay: 0.03 + Math.random() * 0.03
              });
            }
            cascadeGrid[r][c] = null;
          }
        }
      }

      // Progressively fill the text boxes with glowing solid color as bricks break!
      cascadeTextFill = Math.min(1.0, cascadeTextFill + Math.max(0.18, brokenCount * 0.12));

      // Combo counter: if user breaks > 10 bricks, shatter whole wall & trigger 100% text neon fill
      const now = performance.now();
      if (now - cascadeComboTimer < 2500) {
        cascadeComboBreaks += brokenCount;
      } else {
        cascadeComboBreaks = brokenCount;
      }
      cascadeComboTimer = now;

      if (cascadeComboBreaks >= 10) {
        cascadeMegaFlash = 1.0;
        cascadeTextFill = 1.0;
        cascadeComboBreaks = 0;
        cascadeFalling = [];
        for (let r = 0; r < cascadeRows; r++) {
          for (let c = 0; c < cascadeCols; c++) {
            if (cascadeGrid[r] && cascadeGrid[r][c]) {
              const angle = Math.random() * Math.PI * 2;
              const spd = 3 + Math.random() * 8;
              cascadeSparks.push({
                x: c * pitch + pitch / 2,
                y: r * pitch + pitch / 2,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 3,
                color: color,
                alpha: 1.0,
                size: 3 + Math.random() * 4,
                decay: 0.015 + Math.random() * 0.02
              });
              cascadeGrid[r][c] = null;
            }
          }
        }
      }
    } else if (presetMode === "flying-eagle") {
      flyingEagle.diveBurst = 1.0;
      for (let i = 0; i < 28; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 3 + Math.random() * 8;
        flyingEagleSparks.push({
          x: flyingEagle.x,
          y: flyingEagle.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color: color,
          size: 2 + Math.random() * 3,
          alpha: 1.0,
          decay: 0.02 + Math.random() * 0.025
        });
      }
    } else if (presetMode === "amber-dispersion") {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      amberShockwaves.push({
        x: clickX,
        y: clickY,
        radius: 0,
        maxRadius: Math.max(width, height) * 0.5,
        speed: 380,
        strength: 1.0,
        decay: 1.2
      });
    }
  };

  // Initialize and load
  const init = () => {
    // DOM Elements
    canvas = document.getElementById("predictive-canvas");
    ctx = canvas.getContext("2d");
    
    // HUD Elements
    designPreset = document.getElementById("design-preset");
    speedRange = document.getElementById("speed-range");
    speedValue = document.getElementById("speed-value");
    accentPicker = document.getElementById("accent-picker");
    accentHex = document.getElementById("accent-hex");
    presetDots = document.querySelectorAll(".preset-dot");
    pixelSizeSlider = document.getElementById("pixel-size");
    pixelSizeValue = document.getElementById("pixel-size-value");
    arcThicknessSlider = document.getElementById("arc-thickness");
    arcThicknessValue = document.getElementById("arc-thickness-value");
    glowIntensitySlider = document.getElementById("glow-intensity");
    glowIntensityValue = document.getElementById("glow-intensity-value");
    
    // Custom Cutout Text Input
    const wallTextInput = document.getElementById("wall-custom-text");
    if (wallTextInput) {
      wallTextInput.addEventListener("input", (e) => {
        cascadeCustomText = e.target.value || "NODE JS";
        cascadeInitialized = false;
        cascadeBuildComplete = false;
      });
    }
    
    // System Stats
    fpsCounter = document.getElementById("fps-counter");
    particleCounter = document.getElementById("particle-counter");
    dprCounter = document.getElementById("dpr-counter");
    
    // Interactive UI Panels
    controlsPanel = document.getElementById("controls-panel");

    // Transparent Background and Developer Export Options
    transparentBgCheckbox = document.getElementById("transparent-bg");
    exportHtmlBtn = document.getElementById("export-html-btn");
    exportJsBtn = document.getElementById("export-js-btn");
    exportWebmBtn = document.getElementById("export-webm-btn");
    webmBtnText = document.getElementById("webm-btn-text");
    exportMdBtn = document.getElementById("export-md-btn");
    exportGifBtn = document.getElementById("export-gif-btn");
    gifBtnText = document.getElementById("gif-btn-text");

    // Initialize State Variables
    presetMode = designPreset.value;
    speed = parseFloat(speedRange.value);
    color = accentPicker.value;
    pixelSize = parseInt(pixelSizeSlider.value, 10);
    arcThickness = parseInt(arcThicknessSlider.value, 10);
    glowIntensity = parseFloat(glowIntensitySlider.value);

    // Setup event listeners
    designPreset.addEventListener("change", (e) => {
      presetMode = e.target.value;
      if (presetMode === "snake-game") {
        snakes = [];
      } else if (presetMode === "gravity-matrix") {
        gravityBlocks = [];
        activationMap = {};
      } else if (presetMode === "dot-globe") {
        globePoints = [];
      } else if (presetMode === "streamline-pinch") {
        streamLines = [];
        streamParticles = [];
      } else if (presetMode === "flow-field") {
        flowParticles = [];
      } else if (presetMode === "constellation-field") {
        constellationStars = [];
      } else if (presetMode === "particle-wheel") {
        wheelParticles = [];
      } else if (presetMode === "tech-boxes") {
        techBoxes = [];
      } else if (presetMode === "space-galaxy") {
        spaceStars = [];
        shootingStars = [];
        nebulaClouds = [];
      } else if (presetMode === "data-stream") {
        dataStreamBoxes = [];
      } else if (presetMode === "wave-grid") {
        waveDots = [];
      } else if (presetMode === "pixel-build") {
        pixelBuildBlocks = [];
      } else if (presetMode === "nodejs-particles") {
        nodejsPixelBlocks = [];
        nodejsSparks = [];
        nodejsParticles = [];
        nodejsRain = [];
      } else if (presetMode === "pixel-cascade") {
        cascadeInitialized = false;
        cascadeBuildComplete = false;
        cascadeGrid = [];
        cascadeFalling = [];
        cascadeSparks = [];
      } else if (presetMode === "flying-eagle") {
        flyingEagleInitialized = false;
        flyingEagleVortex = [];
        flyingEagleSparks = [];
      } else if (presetMode === "amber-dispersion") {
        amberShockwaves = [];
      }
    });

    speedRange.addEventListener("input", (e) => {
      speed = parseFloat(e.target.value);
      speedValue.textContent = `${speed.toFixed(1)}x`;
    });

    accentPicker.addEventListener("input", (e) => {
      updateGlobalAccentColor(e.target.value);
    });
    accentPicker.addEventListener("click", (e) => e.stopPropagation());
    accentPicker.addEventListener("change", (e) => e.stopPropagation());

    accentHex.addEventListener("change", (e) => {
      e.stopPropagation();
      let val = e.target.value;
      if (!val.startsWith("#")) val = "#" + val;
      if (/^#[0-9A-F]{6}$/i.test(val)) {
        updateGlobalAccentColor(val);
      } else {
        accentHex.value = color;
      }
    });
    accentHex.addEventListener("click", (e) => e.stopPropagation());

    presetDots.forEach(dot => {
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        const selectedColor = dot.getAttribute("data-color");
        updateGlobalAccentColor(selectedColor);
      });
    });

    pixelSizeSlider.addEventListener("input", (e) => {
      pixelSize = parseInt(e.target.value, 10);
      pixelSizeValue.textContent = `${pixelSize}px`;
      if (presetMode === "nodejs-particles") {
        nodejsPixelBlocks = [];
      } else if (presetMode === "pixel-cascade") {
        cascadeInitialized = false;
      }
    });

    arcThicknessSlider.addEventListener("input", (e) => {
      arcThickness = parseInt(e.target.value, 10);
      arcThicknessValue.textContent = `${arcThickness}px`;
    });

    glowIntensitySlider.addEventListener("input", (e) => {
      glowIntensity = parseFloat(e.target.value);
      glowIntensityValue.textContent = `${glowIntensity.toFixed(1)}x`;
    });

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onCanvasClick);
    document.addEventListener("keydown", handleKeydown);

    // Transparency Background Mode Change
    if (transparentBgCheckbox) {
      transparentBgCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          document.body.classList.add("transparent-mode");
        } else {
          document.body.classList.remove("transparent-mode");
        }
        // Recreate pattern using new transparency
        updateGridPattern(presetMode, pixelSize);
      });
    }

    // Slider track fill helper
    const updateSliderProgress = (slider) => {
      if (!slider) return;
      const min = parseFloat(slider.min) || 0;
      const max = parseFloat(slider.max) || 100;
      const val = parseFloat(slider.value) || 0;
      const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
      slider.style.setProperty('--slider-progress', `${pct}%`);
    };

    [pixelSizeSlider, arcThicknessSlider, speedRange, glowIntensitySlider].forEach(slider => {
      if (slider) {
        updateSliderProgress(slider);
        slider.addEventListener("input", () => updateSliderProgress(slider));
      }
    });

    // Preset Tiles Grid Selection
    const presetTiles = document.querySelectorAll(".preset-tile");
    const syncPresetTile = (val) => {
      presetTiles.forEach(tile => {
        if (tile.dataset.preset === val) {
          tile.classList.add("active");
        } else {
          tile.classList.remove("active");
        }
      });
    };

    presetTiles.forEach(tile => {
      tile.addEventListener("click", () => {
        const p = tile.dataset.preset;
        syncPresetTile(p);
        if (designPreset && designPreset.value !== p) {
          designPreset.value = p;
          designPreset.dispatchEvent(new Event("change"));
        }
      });
    });

    designPreset.addEventListener("change", (e) => {
      syncPresetTile(e.target.value);
    });

    // Collapsible Sections
    const sectionHeaders = document.querySelectorAll(".section-header-btn");
    sectionHeaders.forEach(btn => {
      btn.addEventListener("click", () => {
        const section = btn.closest(".collapsible-section");
        if (!section) return;
        const isCollapsed = section.classList.toggle("collapsed");
        section.classList.toggle("expanded", !isCollapsed);
        btn.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
        const chevron = btn.querySelector(".chevron-icon");
        if (chevron) {
          chevron.textContent = isCollapsed ? "▶" : "▼";
        }
      });
    });

    // Panel Elements
    const appLayout = document.getElementById("app-layout");
    const panelPresets = document.getElementById("panel-presets");
    const panelControls = document.getElementById("panel-controls");
    const backdropOverlay = document.getElementById("backdrop-overlay");
    const closeControlsBtn = document.getElementById("close-controls-btn");
    const closePresetsBtn = document.getElementById("close-presets-btn");
    const restoreControlsBtn = document.getElementById("restore-controls-btn");
    const togglePresetsBtn = document.getElementById("toggle-presets-btn");
    const toggleControlsBtn = document.getElementById("toggle-controls-btn");

    // Drawer helpers
    const closeAllDrawers = () => {
      if (panelPresets) panelPresets.classList.remove("drawer-open");
      if (panelControls) panelControls.classList.remove("drawer-open");
      if (backdropOverlay) backdropOverlay.classList.remove("active");
      setTimeout(resize, 260);
    };

    if (backdropOverlay) {
      backdropOverlay.addEventListener("click", closeAllDrawers);
    }

    if (togglePresetsBtn) {
      togglePresetsBtn.addEventListener("click", () => {
        const isOpen = panelPresets && panelPresets.classList.contains("drawer-open");
        closeAllDrawers();
        if (!isOpen && panelPresets) {
          panelPresets.classList.add("drawer-open");
          if (backdropOverlay) backdropOverlay.classList.add("active");
          setTimeout(resize, 260);
        }
      });
    }

    if (toggleControlsBtn) {
      toggleControlsBtn.addEventListener("click", () => {
        const isOpen = panelControls && panelControls.classList.contains("drawer-open");
        closeAllDrawers();
        if (!isOpen && panelControls) {
          panelControls.classList.add("drawer-open");
          if (backdropOverlay) backdropOverlay.classList.add("active");
          setTimeout(resize, 260);
        }
      });
    }

    if (closePresetsBtn) {
      closePresetsBtn.addEventListener("click", closeAllDrawers);
    }

    if (closeControlsBtn) {
      closeControlsBtn.addEventListener("click", () => {
        if (panelControls && panelControls.classList.contains("drawer-open")) {
          closeAllDrawers();
        } else if (appLayout) {
          appLayout.classList.add("controls-collapsed");
          setTimeout(resize, 260);
        }
      });
    }

    if (restoreControlsBtn) {
      restoreControlsBtn.addEventListener("click", () => {
        if (appLayout) appLayout.classList.remove("controls-collapsed");
        setTimeout(resize, 260);
      });
    }

    // Bottom Bar UI Toggle (hide/show side panels)
    const uiVisibilityToggle = document.getElementById("ui-visibility-toggle");
    if (uiVisibilityToggle) {
      uiVisibilityToggle.addEventListener("change", (e) => {
        if (appLayout) {
          if (e.target.checked) {
            appLayout.classList.remove("ui-hidden");
          } else {
            appLayout.classList.add("ui-hidden");
          }
          setTimeout(resize, 260);
        }
      });
    }

    // Bottom Bar Background Dropdown
    const bgModeSelect = document.getElementById("bg-mode-select");
    if (bgModeSelect) {
      bgModeSelect.addEventListener("change", (e) => {
        const isTransparent = (e.target.value === "transparent");
        if (transparentBgCheckbox) {
          transparentBgCheckbox.checked = isTransparent;
          transparentBgCheckbox.dispatchEvent(new Event("change"));
        }
      });
    }

    // Toast feedback helper
    const showToast = (msg) => {
      let toast = document.querySelector(".ambie-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "ambie-toast";
        document.body.appendChild(toast);
      }
      toast.textContent = msg;
      toast.classList.add("visible");
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.classList.remove("visible");
      }, 2400);
    };

    // Top Bar Actions
    const rateBtn = document.getElementById("rate-btn");
    if (rateBtn) {
      rateBtn.addEventListener("click", () => {
        showToast("Thanks for rating mizo shaders! ★★★★★");
      });
    }

    const shareBtn = document.getElementById("share-btn");
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(window.location.href);
            showToast("Link copied to clipboard!");
            return;
          } catch (err) {}
        }
        showToast("Share: " + window.location.href);
      });
    }

    // Export Dropdown Menu (Anchored under Export button)
    const exportDropdownWrapper = document.getElementById("export-dropdown-wrapper");
    const topExportBtn = document.getElementById("top-export-btn");

    const toggleExportDropdown = () => {
      if (exportDropdownWrapper) {
        const isOpen = exportDropdownWrapper.classList.toggle("open");
        if (topExportBtn) topExportBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
    };

    const closeExportDropdown = () => {
      if (exportDropdownWrapper) {
        exportDropdownWrapper.classList.remove("open");
        if (topExportBtn) topExportBtn.setAttribute("aria-expanded", "false");
      }
    };

    if (topExportBtn) {
      topExportBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleExportDropdown();
      });
    }

    document.addEventListener("click", (e) => {
      if (exportDropdownWrapper && !exportDropdownWrapper.contains(e.target)) {
        closeExportDropdown();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeExportDropdown();
      }
    });

    // 1. PNG Still Image Download
    const exportPngBtn = document.getElementById("export-png-btn");
    if (exportPngBtn) {
      exportPngBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeExportDropdown();
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `mizo-shader-${presetMode || "ambient"}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        showToast("PNG image downloaded!");
      });
    }

    // 2. JSON Settings Download
    const exportJsonBtn = document.getElementById("export-json-btn");
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeExportDropdown();
        const settings = {
          name: "mizo-shaders",
          preset: presetMode,
          accentColor: color,
          speed: speed,
          blockSize: pixelSize,
          waveSpread: arcThickness,
          glowBloom: glowIntensity,
          transparentBackground: transparentBgCheckbox ? transparentBgCheckbox.checked : false
        };
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.download = `mizo-shader-${presetMode || "ambient"}-settings.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
        showToast("JSON settings downloaded!");
      });
    }

    // 3. WebM 6s Video Recording
    if (exportWebmBtn) {
      exportWebmBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeExportDropdown();
        recordWebmVideo();
      });
    }

    // 4. MP4 6s Video Recording
    const exportMp4Btn = document.getElementById("export-mp4-btn");
    if (exportMp4Btn) {
      exportMp4Btn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeExportDropdown();
        recordWebmVideo();
      });
    }

    // 5. GIF 3s Recording
    const exportGifBtnItem = document.getElementById("export-gif-btn-item");
    if (exportGifBtnItem) {
      exportGifBtnItem.addEventListener("click", (e) => {
        e.stopPropagation();
        closeExportDropdown();
        recordGifVideo();
      });
    }

    // 6. Standalone HTML Code Download
    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeExportDropdown();
        downloadStandaloneHTML();
        showToast("Standalone HTML downloaded!");
      });
    }

    // 7. Copy JS Module Code
    if (exportJsBtn) {
      exportJsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeExportDropdown();
        copyJsModuleCode();
        showToast("JS Module copied to clipboard!");
      });
    }

    if (exportMdBtn) {
      exportMdBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        downloadMdIntegrationGuide();
      });
    }

    if (exportGifBtn) {
      exportGifBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        recordGifVideo();
      });
    }

    // 3D drag handlers for Dot Globe and Converging Streams
    canvas.addEventListener("mousedown", (e) => {
      if (presetMode === "dot-globe") {
        globeDragging = true;
        globeDragLastX = e.clientX;
        globeDragLastY = e.clientY;
      } else if (presetMode === "streamline-pinch") {
        streamDragging = true;
        streamDragLastX = e.clientX;
        streamDragLastY = e.clientY;
      }
    });
    window.addEventListener("mousemove", (e) => {
      if (globeDragging && presetMode === "dot-globe") {
        const dx = e.clientX - globeDragLastX;
        const dy = e.clientY - globeDragLastY;
        globeRotY += dx * 0.005;
        globeRotX += dy * 0.005;
        globeRotX = Math.max(-1.3, Math.min(1.3, globeRotX));
        globeDragLastX = e.clientX;
        globeDragLastY = e.clientY;
      } else if (streamDragging && presetMode === "streamline-pinch") {
        const dx = e.clientX - streamDragLastX;
        const dy = e.clientY - streamDragLastY;
        streamRotY += dx * 0.004;
        streamRotX += dy * 0.004;
        streamRotX = Math.max(-1.2, Math.min(1.2, streamRotX));
        streamDragLastX = e.clientX;
        streamDragLastY = e.clientY;
      }
    });
    window.addEventListener("mouseup", () => {
      globeDragging = false;
      streamDragging = false;
    });

    // Touch support
    window.addEventListener("touchmove", (e) => {
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
        if (streamDragging && presetMode === "streamline-pinch") {
          const dx = e.touches[0].clientX - streamDragLastX;
          const dy = e.touches[0].clientY - streamDragLastY;
          streamRotY += dx * 0.004;
          streamRotX += dy * 0.004;
          streamDragLastX = e.touches[0].clientX;
          streamDragLastY = e.touches[0].clientY;
        }
      }
    });
    window.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        updatePosition(e.touches[0].clientX, e.touches[0].clientY);
        if (presetMode === "streamline-pinch") {
          streamDragging = true;
          streamDragLastX = e.touches[0].clientX;
          streamDragLastY = e.touches[0].clientY;
        }
      }
    });
    window.addEventListener("touchend", () => {
      isTrackingMouse = false;
      streamDragging = false;
      globeDragging = false;
    });

    resize();
    raf = requestAnimationFrame(draw);
  };

  // Run initial loading when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
