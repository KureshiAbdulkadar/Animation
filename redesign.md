# AMBIE-VIS — UI Redesign Spec

## Goal

Reskin the existing AMBIE-VIS HUD from the current dark terminal look into a clean, light, editor-style layout modelled on the reference (screenshot 1). **No new features, no removed features.** Every control that exists today (Visual Preset, Primary Accent, Block Dimension, Wave Spread, Glow Bloom, Wave Speed, Canvas Background, FPS/Cells/DPR stats, Download HTML, Copy JS Module, Record & Download WebM) stays. Only the layout, styling, and grouping change.

The visualization canvas moves to the centre. Controls split into two side panels. Presets are shown as a **tile grid**, not a dropdown.

---

## Layout

Three-column desktop layout on a light page background.

```
┌───────────────────────────────────────────────────────────────────┐
│  TOP BAR                                                          │
├──────────────┬────────────────────────────────────┬───────────────┤
│              │                                    │               │
│  LEFT PANEL  │            CANVAS                  │  RIGHT PANEL  │
│   "Presets"  │        (visualization)             │   "Controls"  │
│              │                                    │               │
│              │                                    │               │
├──────────────┴────────────────────────────────────┴───────────────┤
│              BOTTOM BAR (Background + UI toggle)                  │
└───────────────────────────────────────────────────────────────────┘
```

- Page background: warm off-white, `#FAFAF7`
- Panels and canvas frame: pure white `#FFFFFF` cards with soft shadow `0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)`
- Card corner radius: `20px`
- Gap between panels: `20px`
- Outer page padding: `20px`
- Left panel width: `280px`
- Right panel width: `320px`
- Centre canvas: flex-fill

---

## Top Bar

Full-width row, height `72px`, sits above the three columns.

**Left cluster:**
- Sparkle glyph (`✦`) + app name **"AMBIE-VIS"** in medium weight
- Muted **"by [author]"** next to it in regular weight, `#8A8A85`
- Two square icon buttons after the name (LinkedIn, Instagram) — `40×40`, `10px` radius, `1px` border `#E8E8E3`, icon centred in `#1A1A1A`

**Right cluster:**
- Three buttons in a row, `12px` gap:
  - **Rate** — outlined pill, white fill, `1px` border `#E8E8E3`, text `#1A1A1A`
  - **Share** — outlined pill, same style as Rate
  - **Export** — solid pill, fill `#0D0D0D`, text `#FFFFFF`
- All three: height `44px`, horizontal padding `24px`, radius `999px`, medium weight

---

## Left Panel — "Presets"

Header: sparkle glyph + **"Presets"** in `20px` medium weight, top-left of the card.

Sections stack vertically. Each section header is a row: chevron (`▶` collapsed / `▼` expanded) + ALL-CAPS label in `12px`, letter-spacing `0.08em`, colour `#1A1A1A`. Clicking the row toggles the section.

### Section: VISUAL PRESETS  *(expanded by default)*

This is the main change from the current UI. Replace the "Visual Preset" dropdown with a **tile grid**, one tile per preset.

- Grid: 3 columns, `12px` gap
- Tile size: fills the column, aspect ratio `1:1`
- Tile background: `#F3F3EE`
- Tile radius: `14px`
- Tile contents (vertically centred):
  - Small monochrome icon representing the preset (line style, `#1A1A1A`, ~`32px`)
  - Label underneath in `12px` medium, `#1A1A1A`, one or two lines, centred
- Hover: background `#EDEDE7`
- **Selected tile:** background `#0D0D0D`, icon and label in `#FFFFFF`, subtle inner ring `1px rgba(255,255,255,0.08)`

Populate the grid with the existing presets (e.g. "Classic LED Arch" and every other preset the app already ships). Do not invent new ones — read the current `visualPresets` list and render whatever is there.

### Section: PRIMARY ACCENT  *(expanded by default)*

Keep the existing colour behaviour, restyle the surface:
- Current colour shown as a `40×40` rounded square swatch (`10px` radius) with a `1px` inner border `rgba(0,0,0,0.06)`
- Hex code next to the swatch in `13px` monospace (`ui-monospace`, `SF Mono`, fallback `Menlo`), colour `#1A1A1A`
- Swatch row underneath: the same set of preset colour circles that exist today, `28px` diameter, `12px` gap, selected swatch gets a `2px` white inner ring + `2px` `#0D0D0D` outer ring

### Section: GRADIENT COLOURS  *(collapsed by default)*

Only include if the current app has this concept. If not, omit — do not fabricate.

---

## Right Panel — "Controls"

Header: sparkle glyph + **"Controls"** in `20px` medium weight, top-left. Small `×` close button top-right (`24×24`, `#8A8A85`, hover `#1A1A1A`) — used to hide the panel on smaller viewports.

Sections stack, same collapsible pattern as the left panel.

### Section: SHAPE  *(expanded)*

Every slider row uses the same three-line pattern:

```
label                                 [ value pill ]
────────────────●───────────────────────────────────
```

- **Label**: `13px` regular, `#1A1A1A`, left-aligned
- **Value pill**: right-aligned on the same line as the label. Fill `#0D0D0D`, text `#FFFFFF`, `12px` monospace, height `24px`, horizontal padding `10px`, radius `999px`. Shows the current numeric value with its unit (e.g. `4px`, `120px`, `2.4x`, `1.0x`).
- **Track**: full-width, height `4px`, colour `#EDEDE7`, radius `999px`, `12px` below the label row
- **Filled portion of track**: `#0D0D0D`
- **Thumb**: `16px` circle, `#0D0D0D`, no border, subtle shadow `0 1px 2px rgba(0,0,0,0.15)`
- **Row spacing**: `20px` between rows

Map the existing controls into sections like this — do not add or rename any control:

- **SHAPE**: Block Dimension, Wave Spread
- **MOTION**: Wave Speed, Glow Bloom
- **BACKGROUND**: the existing "Transparent Background" checkbox, styled as a row with a `16×16` rounded square checkbox (`4px` radius, `1.5px` border `#1A1A1A`, checked fill `#0D0D0D` with white tick) and the label to its right

*(If any of these belong in different groups in the current codebase, keep them grouped that way — the section names above are only a suggestion. The rule is: every existing control goes into exactly one section, no controls added, no controls dropped.)*

### Section: STATS  *(expanded, read-only)*

Show the existing FPS / Cells / DPR readouts as three small tiles in a single row inside this section:

- Tile: `#F3F3EE` background, `10px` radius, padded `10px 12px`
- Top line: ALL-CAPS label (`FPS`, `CELLS`, `DPR`) in `10px`, letter-spacing `0.08em`, colour `#8A8A85`
- Bottom line: numeric value in `18px` medium, `#1A1A1A`, monospace numerals

### Section: DEVELOPER EXPORTS  *(collapsed by default)*

Three stacked buttons, full width of the panel, `10px` gap:

- Style: white fill, `1px` border `#E8E8E3`, radius `12px`, height `44px`, left-aligned label with a small leading icon, text `#1A1A1A`, `14px` medium
- Hover: background `#F3F3EE`
- Buttons (keep exactly these three):
  1. Download HTML Code
  2. Copy JS Module Code
  3. Record & Download WebM

---

## Canvas (Centre)

- White card, same shadow and radius as the panels
- Inner padding: `0` — the visualization fills the card edge to edge
- The canvas itself keeps its own dark background (that's the visualization); the *frame* around it is the light card
- The current live overlay text (if any) stays exactly as the app renders it today

---

## Bottom Bar

Compact centred row under the canvas, inside its own pill-shaped white card (radius `999px`, height `56px`, horizontal padding `24px`, same shadow):

- Left: label **"Background"** in `13px` regular `#1A1A1A`, followed by a small dropdown showing the current background mode (matches the existing options — solid / transparent / whatever the app already supports)
- Right: label **"UI"** in `13px` regular, followed by a toggle switch that shows/hides both side panels
  - Toggle: `40×24` track, radius `999px`, off state `#E8E8E3`, on state `#0D0D0D`, `20×20` white thumb with subtle shadow

---

## Typography

One typeface family across the whole UI. Use **Inter** (or Geist if already in the project), with **`ui-monospace, SF Mono, Menlo, monospace`** for the hex code and the numeric value pills.

| Use | Size | Weight | Case | Colour |
|---|---|---|---|---|
| App name in top bar | 16px | 500 | — | `#1A1A1A` |
| "by [author]" | 14px | 400 | — | `#8A8A85` |
| Panel headers ("Presets", "Controls") | 20px | 500 | — | `#1A1A1A` |
| Section headers | 12px | 600 | UPPER, `0.08em` tracking | `#1A1A1A` |
| Slider labels, checkbox labels, dropdown labels | 13px | 400 | — | `#1A1A1A` |
| Button labels (Rate / Share / Export / exports) | 14px | 500 | — | matches button |
| Tile labels (preset names) | 12px | 500 | — | `#1A1A1A` on light, `#FFFFFF` on selected |
| Value pills | 12px | 500 | — | `#FFFFFF` (mono) |
| Hex code | 13px | 400 | — | `#1A1A1A` (mono) |
| Stat tile label | 10px | 600 | UPPER, `0.08em` tracking | `#8A8A85` |
| Stat tile value | 18px | 500 | — | `#1A1A1A` (mono numerals) |

Line-height: `1.4` for all body text, `1.1` for numeric values in pills and stat tiles.

---

## Colour Tokens

```
--bg-page:        #FAFAF7
--bg-card:        #FFFFFF
--bg-subtle:      #F3F3EE   /* tiles, stat tiles, hover on outlined buttons */
--bg-subtle-hov:  #EDEDE7
--border:         #E8E8E3
--fg-primary:     #1A1A1A
--fg-muted:       #8A8A85
--fg-inverse:     #FFFFFF
--solid:          #0D0D0D   /* Export button, value pills, selected tile, slider fill/thumb */
--shadow-card:    0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)
--shadow-thumb:   0 1px 2px rgba(0,0,0,0.15)
```

The user's chosen **primary accent** (the current `#00F066` in green mode, or whatever swatch they pick) is used **only inside the visualization canvas**. It does not colour any chrome. All UI chrome stays monochrome (`--solid`, `--fg-primary`, `--fg-muted`) — the reference has a similar restraint and it's what makes it feel calm.

---

## Interaction Notes

- Section collapse/expand animates height over `160ms ease-out`
- Slider drag updates the value pill live; no debounce
- Preset tile click swaps the visualization immediately and applies the selected state; only one tile can be selected at a time
- Top-bar Export triggers whatever export flow already exists in the app (do not change its behaviour)
- The `×` on the right panel collapses the right column; a small floating chevron button appears at the right edge to bring it back
- Bottom-bar **UI** toggle, when off, hides both side panels and the bottom bar itself, leaving only the canvas and top bar

---

## Out of Scope

Do not add: new presets, new sliders, new export formats, tooltips that weren't there before, keyboard shortcuts that weren't there before, or a mobile layout (that can come in a second pass). This spec is layout, styling, and the preset-dropdown → tile-grid change only.
