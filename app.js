/* ==========================================================================
   Data Pixel Arc - Semicircular LED Grid Arch Canvas
   ========================================================================== */

(function () {
  // DOM Elements
  let canvas, ctx;
  
  // HUD Elements
  let designPreset, speedRange, speedValue, accentPicker, accentHex, presetDots;
  let pixelSizeSlider, pixelSizeValue, arcThicknessSlider, arcThicknessValue, glowIntensitySlider, glowIntensityValue;
  
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
  let gridPattern = null;

  const updateGridPattern = (preset, size) => {
    if (preset === lastPatternPreset && size === lastPatternPixelSize && gridPattern) {
      return;
    }
    lastPatternPreset = preset;
    lastPatternPixelSize = size;

    const pitch = (preset === "ghosting") ? 16 : (preset === "gravity-matrix") ? 12 : size;
    const gap = (preset === "ghosting") ? 4 : (preset === "gravity-matrix") ? 2 : 1;
    const drawSize = pitch - gap;

    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = pitch;
    patternCanvas.height = pitch;
    const pCtx = patternCanvas.getContext("2d");

    // Background fill
    pCtx.fillStyle = (preset === "ghosting") ? "#090A0B" : background;
    pCtx.fillRect(0, 0, pitch, pitch);

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
    const currentBackground = (presetMode === "ghosting") ? "#090A0B" : background;
    ctx.fillStyle = currentBackground;
    ctx.fillRect(0, 0, width, height);

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

      // Paint translucent overlay to create long fading trails
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, width, height);

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

      ctx.fillStyle = "#07090e";
      ctx.fillRect(0, 0, width, height);

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
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

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
      ctx.fillStyle = "#020406";
      ctx.fillRect(0, 0, width, height);

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
      ctx.fillStyle = "#000005";
      ctx.fillRect(0, 0, width, height);

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
      
      ctx.fillStyle = "#010204";
      ctx.fillRect(0, 0, width, height);

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
      
      ctx.fillStyle = "#010103";
      ctx.fillRect(0, 0, width, height);

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

      ctx.fillStyle = "#010203";
      ctx.fillRect(0, 0, width, height);

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
    mouse.tx = clientX / window.innerWidth;
    mouse.ty = clientY / window.innerHeight;
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

  const updateGlobalAccentColor = (newColor) => {
    color = newColor;
    if (accentPicker) accentPicker.value = newColor;
    if (accentHex) accentHex.value = newColor;
    
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
    
    // System Stats
    fpsCounter = document.getElementById("fps-counter");
    particleCounter = document.getElementById("particle-counter");
    dprCounter = document.getElementById("dpr-counter");
    
    // Interactive UI Panels
    controlsPanel = document.getElementById("controls-panel");

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
