# Danuly — Design System
**Repo: `amazon-calculator` | Stack: React 18 + Vite + Recharts + lucide-react**

This design system is derived from the existing codebase and aligned to the Teikametrics-grade SaaS standard. It replaces the current scattered inline styles and `C.*` color references with a single source of truth that Claude Code can apply consistently across every file.

---

## 1. What's Already in the Codebase

The repo already has a solid dark-mode design direction. These elements are **keepers**:

| ✅ Keep | 🔧 Improve |
|---|---|
| Dark-first palette (`s9` / `s95` backgrounds) | Replace inline `style={{}}` with design tokens |
| `C.*` color constants in both files | Unify `C` objects — currently duplicated in `App.jsx` AND `PPCLab.jsx` |
| `CARD`, `LABEL`, `MONO` style constants | Move to a shared `tokens.js` file |
| Lucide icons throughout | Add consistent icon sizing convention |
| Recharts already installed | Standardize chart config |
| `StatCard`, `InsightCard`, `ProgressBar` | Polish and formalize these patterns |
| Emerald = success / Rose = danger semantic | Extend to full 4-state semantic system |
| `font-variant-numeric: tabular-nums` via `MONO` | Keep — critical for metrics |

---

## 2. Design Tokens — `src/tokens.js`

```js
// src/tokens.js
// Single source of truth for all colors, typography, spacing, and style constants.

// ── Color palette ──────────────────────────────────────────────
export const C = {
  // Brand / accent (gradient wordmark, active tab highlight)
  emerald:  "#10b981",   // success, profit, positive delta, active states
  emeraldDim:"#10b98122", // emerald bg tint
  cyan:     "#06b6d4",   // info, channel comparison insights
  cyanDim:  "#06b6d420",
  violet:   "#8b5cf6",   // PPC Lab accent, SQP tab, secondary data series
  violetDim:"#8b5cf620",
  orange:   "#f97316",   // marketing/TACOS section heading
  orangeDim:"#f9731620",
  amber:    "#f59e0b",   // warning mid-state, GMV highlight, mid-ROI
  amberDim: "#f59e0b20",
  rose:     "#f43f5e",   // danger, loss, error, negative delta
  roseDim:  "#f43f5e10",
  blue:     "#3b82f6",   // US marketplace badge, info banners

  // Neutral grays (dark-mode surface hierarchy)
  light:    "#e2e8f0",   // primary text on dark
  s4:       "#94a3b8",   // secondary text, chart labels, legend
  s5:       "#64748b",   // muted text, placeholders, tooltips
  s6:       "#475569",   // subtle borders (use sparingly)
  s7:       "#334155",   // hover state for ghost buttons
  s8:       "#1e293b",   // card borders, table row dividers, input borders
  s9:       "#0f172a",   // card backgrounds, tab bar, sidebar
  s95:      "#020617",   // page background, input fill, deepest surface
};

// ── Typography ─────────────────────────────────────────────────
export const FONT = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, monospace",   // All numeric metric values
};

// ── Reusable style objects (spread into JSX style={{}}) ────────
export const CARD = {
  background: C.s9,
  border: `1px solid ${C.s8}`,
  borderRadius: 16,
  padding: "16px 18px",
  boxShadow: "0 4px 24px #00000040",
};

export const CARD_SM = {
  ...CARD,
  borderRadius: 12,
  padding: "12px 14px",
};

export const LABEL = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: C.s4,
  marginBottom: 4,
  display: "block",
};

export const SECTION_LABEL = {
  fontSize: 13,
  fontWeight: 600,
  color: C.light,
  marginBottom: 16,
};

export const MONO = {
  fontFamily: FONT.mono,
  fontVariantNumeric: "tabular-nums",
};

export const ROW = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "7px 0",
  borderBottom: `1px solid ${C.s8}`,
};

// ── Spacing ────────────────────────────────────────────────────
export const GAP = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
};

// ── Border radius ──────────────────────────────────────────────
export const RADIUS = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  20,
  full: 9999,
};

// ── Shadows ────────────────────────────────────────────────────
export const SHADOW = {
  card:   "0 4px 24px #00000040",
  tooltip:"0 4px 16px #00000060",
  glow:   (color) => `0 0 0 1px ${color}22`,
};

// ── Icon sizes (use with lucide-react) ─────────────────────────
export const ICON = {
  xs:  12,
  sm:  14,
  md:  16,
  lg:  20,
  xl:  24,
};
```

**How to use in components:**
```jsx
import { C, CARD, LABEL, MONO, GAP, RADIUS, ICON } from "./tokens.js";
// or in App.jsx:
import { C, CARD, LABEL, MONO, GAP, RADIUS, ICON } from "./src/tokens.js";
```

---

## 3. Color Semantics

| Context | Token | Example in code |
|---|---|---|
| Positive metric, profit, success | `C.emerald` | Net profit, positive margin, good ACoS |
| Warning, mid-range, caution | `C.amber` | Margin 10–20%, warning ACoS, approaching limit |
| Danger, loss, error | `C.rose` | Negative profit, ACoS over target, input error |
| Info, neutral data | `C.cyan` | EU VAT notes, channel comparison, info banner |
| PPC / SQP accent | `C.violet` | PPC Lab active tab, SQP section |
| Marketing / TACOS section | `C.orange` | Section 3 heading color |
| US market | `C.blue` | US marketplace badge, US mode banner |
| Primary text | `C.light` | All headings, card titles, metric values |
| Secondary text | `C.s4` | Chart labels, table row data, subtitles |
| Muted text | `C.s5` | Timestamps, placeholders, disabled labels |
| Card bg | `C.s9` | All cards and panels |
| Page bg | `C.s95` | Top-level app background |

### Metric Thresholds

| Metric | Bad | Warning | Good |
|---|---|---|---|
| Net margin | `< 10%` → rose | `10–20%` → amber | `≥ 20%` → emerald |
| ROI | `< 40%` → rose | `40–80%` → amber | `≥ 80%` → emerald |
| Profit/unit | `< $1` → rose | `$1–3` → amber | `≥ $3` → emerald |
| ACoS vs break-even | over break-even → rose | near break-even → amber | well below → emerald |
| Days of stock (if added) | `< 14` → rose | `14–30` → amber | `> 30` → emerald |

---

## 4. Component Patterns

### 4.1 `StatCard` (already exists — formalized)

```jsx
<StatCard label="Monthly profit"     value={`$${fmtK(s.totalMonthlyProfit)}`} numericValue={s.totalMonthlyProfit}               big />
<StatCard label="Profit per unit"    value={`$${fmt(s.netProfitPerUnit)}`}     numericValue={s.netProfitPerUnit} thresholds={[1, 3]} />
<StatCard label="Profit % of price"  value={`${fmt(s.netMargin, 1)}%`}         numericValue={s.netMargin}        thresholds={[10, 20]} />
<StatCard label="ROI on COGS"        value={`${fmt(s.roi, 0)}%`}               numericValue={s.roi}              thresholds={[40, 80]} />
```

### 4.2 `InputField` (already exists — formalized)

Focus border colors by section:
- Section 1 (Product & Tax): `C.emerald`
- Section 2 (Amazon Fees / DTC Logistics): `C.cyan`
- Section 3 (Marketing & Scale): `C.orange`
- PPC Lab inputs: `C.violet`

### 4.3 `InsightCard` type → color mapping

```js
const INSIGHT_STYLES = {
  danger:  { bg: C.roseDim,   border: `${C.rose}30`,   text: C.rose },
  warning: { bg: C.orangeDim, border: `${C.orange}30`, text: C.orange },
  success: { bg: C.emeraldDim,border: `${C.emerald}30`,text: C.emerald },
  info:    { bg: C.cyanDim,   border: `${C.cyan}30`,   text: C.cyan },
};
```

### 4.4 Toggle / Pill Button Groups

```jsx
const pillGroup = {
  display: "flex",
  background: C.s95,
  border: `1px solid ${C.s8}`,
  borderRadius: RADIUS.lg,
  padding: 3,
  gap: 4,
};

// Active pill accent colors by context:
// TopBar PPC pill:        C.violet
// TopBar Calculator pill: C.emerald
// Tab bar active:         C.emerald
// Market US active:       C.blue
// Market Intl active:     C.violet
// Channel active:         C.emerald
```

### 4.5 Section Step Labels

```jsx
const stepBadge = (accent) => ({
  background: accent, color: "#000",
  borderRadius: 4, fontSize: 9, fontWeight: 800, padding: "1px 5px",
});
// Section 1: C.emerald | Section 2: C.cyan | Section 3: C.orange
```

---

## 5. Typography Rules

| Use | Size | Weight | Color | Extra |
|---|---|---|---|---|
| Page/tool title (gradient) | 22px | 800 | gradient (emerald→cyan) | `WebkitBackgroundClip: text` |
| Card section heading | 12–13px | 600 | `C.light` | — |
| `LABEL` (input labels, stat labels) | 11px | 600 | `C.s4` | uppercase, 0.08em tracking |
| Table header | 10px | 600 | `C.s5` | uppercase, 0.06em tracking |
| Metric value (StatCard big) | 18–26px clamp | 700 | threshold color | MONO |
| Metric value (StatCard normal) | 16–20px clamp | 700 | threshold color | MONO |
| Body / insight desc | 11–12px | 400 | `C.s4` | line-height 1.5–1.6 |
| Input value | 13px | 400 | `C.light` | MONO |
| Tooltip content | 11px | 400 | `C.s4` | line-height 1.5 |
| Toast | 13px | 600 | `#fff` | — |
| Dimmed note (below disabled input) | 10px | 400 | `C.cyan` | italic |

**Gradient text:**
```js
{
  background: "linear-gradient(90deg, #10b981, #06b6d4)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
}
```

---

## 6. Spacing Convention

All values multiples of 4. Tokens: `GAP.xs` (4) · `GAP.sm` (8) · `GAP.md` (12) · `GAP.lg` (16) · `GAP.xl` (20) · `GAP.xxl` (24)

| Location | Value |
|---|---|
| Card padding | `"16px 18px"` |
| Page outer padding | `"16px 12px"` |
| Input margin-bottom | 12px |
| Section label margin-bottom | 16px |

---

## 7. Chart Configuration (Recharts)

```js
export const PIE_CONFIG        = { innerRadius: 50, outerRadius: 80, paddingAngle: 3 };
export const CHART_TOOLTIP_STYLE = { background: C.s8, border: `1px solid ${C.s7}`, borderRadius: 8, fontSize: 12 };
export const LEGEND_DOT        = { width: 10, height: 10, borderRadius: 3, flexShrink: 0 };
export const LINE_CONFIG       = { strokeWidth: 2, dot: false, activeDot: { r: 4, strokeWidth: 0 }, animationDuration: 400 };
export const GRID_CONFIG       = { stroke: C.s8, strokeDasharray: "3 3", strokeWidth: 0.5 };
export const AXIS_CONFIG       = { fontSize: 11, fill: C.s4, fontFamily: FONT.mono, tick: { fontSize: 11 } };
export const CHART_COLORS      = [C.emerald, C.cyan, C.violet, C.amber, C.rose, C.blue];
```

---

## 8. Number Formatting — `src/utils.js`

```js
export const fmt         = (n, d = 2) => { const v = Number(n); return isFinite(v) ? v.toFixed(d) : "—"; };
export const fmtK        = (n) => { const v = Number(n); if (!isFinite(v)) return "—"; return Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)}k` : Math.round(v).toString(); };
export const fmtCurrency = (n, compact = false) => { /* ... */ };
export const fmtPct      = (n, d = 1) => isFinite(Number(n)) ? `${Number(n).toFixed(d)}%` : "—";
export const fmtDelta    = (n) => { const v = Number(n); if (!isFinite(v)) return "—"; return `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}%`; };
```

---

## 9. Banners & Alert Patterns

```js
export const BANNERS = {
  info:    { background: "#3b82f610", border: "1px solid #3b82f630", color: "#93c5fd" },
  intl:    { background: "#8b5cf610", border: "1px solid #8b5cf630", color: "#c4b5fd" },
  success: { background: "#10b98112", border: "1px solid #10b98130", color: "#6ee7b7" },
  warning: { background: "#f59e0b08", border: "1px solid #f59e0b30", color: C.amber  },
  danger:  { background: "#f43f5e10", border: "1px solid #f43f5e30", color: C.rose   },
};

export const BANNER_BASE = { padding: "9px 14px", borderRadius: 10, fontSize: 11, display: "flex", gap: 8, alignItems: "center" };
```

---

## 10. Interactive State Patterns

### Transitions
```js
transition: "all 0.15s"       // buttons, inputs, tab pills
transition: "all 0.2s"        // cards (hover lift)
transition: "width 0.4s ease" // progress bars
transition: "opacity 0.15s"   // page fade
```

### Focus-visible (global)
```css
button:focus-visible { outline: none; box-shadow: 0 0 0 2px #10b98166 !important; border-radius: 8px; }
```

---

## 11. File Structure

```
amazon-calculator/
├── App.jsx               ← imports from src/tokens.js + src/utils.js
├── src/
│   ├── PPCLab.jsx        ← imports from tokens.js
│   ├── tokens.js         ← ✅ DONE — C, CARD, LABEL, MONO, ROW, GAP, RADIUS, SHADOW, ICON, chart configs, BANNERS
│   ├── utils.js          ← ✅ DONE — fmt, fmtK, fmtCurrency, fmtPct, fmtDelta
│   ├── analyzeSqp.js     ← no changes
│   ├── analyzeStr.js     ← no changes
│   ├── parseCsv.js       ← no changes
│   ├── index.css         ← sr-only class added
│   └── main.jsx          ← no changes
└── docs/
    └── danuly-design-system.md  ← this file
```

---

## 12. Quick Reference

| Current code | Use instead |
|---|---|
| `const C = { ... }` in App.jsx | `import { C } from "./src/tokens.js"` |
| `const C = { ... }` in PPCLab.jsx | `import { C } from "./tokens.js"` |
| `const CARD = { ... }` | `import { CARD } from "./src/tokens.js"` |
| `const LABEL = { ... }` | `import { LABEL } from "./src/tokens.js"` |
| `const MONO = { ... }` | `import { MONO } from "./src/tokens.js"` |
| `const fmt = ...` in App.jsx | `import { fmt } from "./src/utils.js"` |
| `const fmtK = ...` in App.jsx | `import { fmtK } from "./src/utils.js"` |
| `borderRadius: 16` | `borderRadius: RADIUS.xl` |
| `gap: 12` | `gap: GAP.md` |
| `size={14}` on lucide icon | `size={ICON.sm}` |

---

## 13. Future Components

### `MetricBadge` (table cells)
```jsx
function MetricBadge({ value, type = "neutral" }) {
  const styles = {
    good:    { color: C.emerald, background: C.emeraldDim },
    warning: { color: C.amber,   background: C.amberDim   },
    bad:     { color: C.rose,    background: C.roseDim    },
    neutral: { color: C.s4,      background: C.s8         },
  };
  return <span style={{ ...styles[type], fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: RADIUS.sm, ...MONO }}>{value}</span>;
}
```

### Amazon Orange (add to C when needed)
```js
amazonOrange:    "#FF9900",
amazonOrangeDim: "#FF990020",
```
