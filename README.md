# Mizo Shaders — Interactive Motion Experiments

A collection of browser-based ambient visuals, shader-inspired effects, particle animations, and interactive creative-coding experiments.

## Highlights

The main workspace includes visual presets such as a dot globe, constellation field, particle flow field, halftone waves, pixel cascades, cloth waves, and kinetic grids. The interface exposes background and export controls. Some effects also have standalone HTML demos.

## Development

Requires Node.js and npm.

```bash
npm install
npm run dev
```

```bash
npm run build
npm run preview
```

## Structure

- `index.html` — visualizer UI
- `app.js` — interaction logic
- `style.css` — styling
- `effects/` — reusable visual effects
- `*-standalone.html` — standalone experiments

## Status

Creative-coding playground. The `npm test` script is currently a placeholder that exits with an error, so it is not a functioning test suite.

## Author

More design and interactive work at [tanveerkureshi.com](https://tanveerkureshi.com).
