# PredictiveArcCanvas --- Data Pixel Arc

A standalone React implementation inspired by the ThreeUI
`PredictiveArcCanvas` / Data Pixel Arc visual direction.

## Features

-   Animated concentric arc field
-   Pixel / halftone particle layer
-   Flowing signal ribbons
-   Moving signal particles
-   Center void / radial fade
-   Mouse-responsive movement
-   Responsive canvas sizing
-   High-DPI rendering
-   Configurable speed, color, and background
-   No embedded ThreeUI URL

## `PredictiveArcCanvas.jsx`

``` jsx
import React, { useEffect, useRef } from "react";

export default function PredictiveArcCanvas({
  speed = 1,
  color = "#f07c00",
  background = "#0d0d0d",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;

    const mouse = {
      x: 0.5,
      y: 0.5,
      tx: 0.5,
      ty: 0.5,
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onMouseMove = (e) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = e.clientY / window.innerHeight;
    };

    const onMouseLeave = () => {
      mouse.tx = 0.5;
      mouse.ty = 0.5;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    resize();

    const particles = [];

    const createParticles = () => {
      particles.length = 0;

      const spacing = Math.max(5, Math.min(width, height) / 95);

      for (let y = -height; y < height * 2; y += spacing) {
        for (let x = -width; x < width * 2; x += spacing) {
          particles.push({
            x,
            y,
            offset: Math.random() * Math.PI * 2,
            size: Math.random() > 0.86 ? 2 : 1,
            alpha: 0.15 + Math.random() * 0.55,
          });
        }
      }
    };

    createParticles();

    const draw = (time) => {
      const t = time * 0.001 * speed;

      mouse.x += (mouse.tx - mouse.x) * 0.035;
      mouse.y += (mouse.ty - mouse.y) * 0.035;

      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      const cx =
        width * 0.5 +
        (mouse.x - 0.5) * width * 0.08;

      const cy =
        height * 0.55 +
        (mouse.y - 0.5) * height * 0.06;

      const maxRadius =
        Math.sqrt(width * width + height * height) * 0.7;

      ctx.save();
      ctx.translate(cx, cy);

      for (let i = 0; i < 18; i++) {
        const radius = maxRadius * (0.18 + i * 0.043);

        const wave =
          Math.sin(t * 0.7 + i * 0.45) * 0.035;

        const start = Math.PI * 1.03 + wave;
        const end = Math.PI * 1.92 - wave;

        ctx.beginPath();

        ctx.arc(0, 0, radius, start, end);

        ctx.strokeStyle = hexToRgba(
          color,
          0.08 + (1 - i / 18) * 0.13
        );

        ctx.lineWidth = i % 4 === 0 ? 2 : 1;
        ctx.stroke();
      }

      ctx.restore();

      for (const p of particles) {
        const dx = p.x - cx;
        const dy = p.y - cy;

        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        const arcDistance = Math.abs(
          distance -
            maxRadius *
              (0.27 +
                0.06 *
                  Math.sin(angle * 3 + t * 0.9))
        );

        const band = Math.max(
          0,
          1 - arcDistance / 75
        );

        if (band <= 0) continue;

        const movement = Math.sin(
          angle * 5 +
            distance * 0.006 -
            t * 1.5 +
            p.offset
        );

        const alpha =
          band *
          p.alpha *
          (0.45 + movement * 0.25);

        if (alpha <= 0) continue;

        const size = p.size * (0.65 + band * 1.8);

        ctx.fillStyle = hexToRgba(color, alpha);

        ctx.fillRect(
          p.x - size / 2,
          p.y - size / 2,
          size,
          size
        );
      }

      ctx.save();
      ctx.translate(cx, cy);

      for (let ribbon = 0; ribbon < 4; ribbon++) {
        ctx.beginPath();

        const baseRadius =
          maxRadius * (0.31 + ribbon * 0.065);

        for (
          let a = Math.PI * 1.02;
          a <= Math.PI * 1.98;
          a += 0.012
        ) {
          const wave =
            Math.sin(
              a * 7 -
                t * (1.3 + ribbon * 0.15)
            ) *
            (7 + ribbon * 3);

          const r = baseRadius + wave;

          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;

          if (a === Math.PI * 1.02) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = hexToRgba(
          color,
          0.14 - ribbon * 0.018
        );

        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();

      for (let i = 0; i < 90; i++) {
        const phase = t * 0.35 + i * 0.7;

        const angle =
          Math.PI * 1.02 +
          ((phase * 0.08 + i * 0.017) %
            (Math.PI * 0.96));

        const radius =
          maxRadius *
            (0.22 + (i % 7) * 0.045) +
          Math.sin(phase * 2) * 20;

        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        const pulse =
          0.35 + Math.sin(phase * 3) * 0.3;

        ctx.fillStyle = hexToRgba(color, pulse);

        ctx.fillRect(
          Math.round(x),
          Math.round(y),
          1.5,
          1.5
        );
      }

      const gradient = ctx.createRadialGradient(
        cx,
        cy,
        0,
        cx,
        cy,
        maxRadius * 0.22
      );

      gradient.addColorStop(
        0,
        hexToRgba(background, 0.98)
      );

      gradient.addColorStop(
        0.7,
        hexToRgba(background, 0.75)
      );

      gradient.addColorStop(
        1,
        hexToRgba(background, 0)
      );

      ctx.fillStyle = gradient;

      ctx.beginPath();

      ctx.arc(
        cx,
        cy,
        maxRadius * 0.23,
        0,
        Math.PI * 2
      );

      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [speed, color, background]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background,
      }}
    />
  );
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");

  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

## Basic Usage

``` jsx
import PredictiveArcCanvas from "./PredictiveArcCanvas";

export default function App() {
  return (
    <main
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0d0d0d",
      }}
    >
      <PredictiveArcCanvas
        speed={0.8}
        color="#f07c00"
        background="#0d0d0d"
      />
    </main>
  );
}
```

## Hero Background Usage

``` jsx
<section className="hero">
  <PredictiveArcCanvas
    speed={0.7}
    color="#f07c00"
    background="#0d0d0d"
  />

  <div className="hero-content">
    <span>ENGINEERING THE FUTURE</span>
    <h1>
      Build what
      <br />
      comes next.
    </h1>
  </div>
</section>
```

``` css
.hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: #0d0d0d;
}

.hero > canvas {
  position: absolute;
  inset: 0;
}

.hero-content {
  position: relative;
  z-index: 2;
  padding: 12vw;
  color: white;
  pointer-events: none;
}

.hero-content span {
  color: #f07c00;
  font: 600 12px/1 monospace;
  letter-spacing: 0.18em;
}

.hero-content h1 {
  margin: 24px 0;
  font: 500 clamp(48px, 8vw, 120px)/0.9 Arial, sans-serif;
  letter-spacing: -0.06em;
}
```

## Design Tokens

  Token            Value
  ---------------- -----------------------------
  Background       `#0d0d0d`
  Primary accent   `#f07c00`
  Rendering        Canvas 2D
  Default speed    `1`
  Particle style   Pixel / halftone
  Interaction      Mouse movement
  High-DPI         Up to 2x device pixel ratio

## Implementation Notes

The component is implemented directly in Canvas 2D and does not embed
the reference website.

The visual system is built from:

1.  Concentric animated arcs.
2.  A pixel field sampled around the primary arc.
3.  Animated signal ribbons.
4.  Small moving signal particles.
5.  A radial center void.
6.  Mouse-driven camera/field displacement.

The component can be dropped into an existing React application and
styled to match the destination project's design language.
