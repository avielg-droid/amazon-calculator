// src/tokens.js — single source of truth for all design tokens

// ── Color palette ───────────────────────────────────────────────
export const C = {
  // Brand / accent
  emerald:    "#10b981",
  emeraldDim: "#10b98122",
  cyan:       "#06b6d4",
  cyanDim:    "#06b6d420",
  violet:     "#8b5cf6",
  violetDim:  "#8b5cf620",
  orange:     "#f97316",
  orangeDim:  "#f9731620",
  amber:      "#f59e0b",
  amberDim:   "#f59e0b20",
  rose:       "#f43f5e",
  roseDim:    "#f43f5e10",
  blue:       "#3b82f6",

  // Neutrals (dark-mode surface hierarchy)
  light: "#e2e8f0",
  s4:    "#94a3b8",
  s5:    "#64748b",
  s6:    "#475569",
  s7:    "#334155",
  s8:    "#1e293b",
  s9:    "#0f172a",
  s95:   "#020617",
};

// ── Typography ──────────────────────────────────────────────────
export const FONT = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, monospace",
};

// ── Reusable style objects ──────────────────────────────────────
export const CARD = {
  background:   C.s9,
  border:       `1px solid ${C.s8}`,
  borderRadius: 16,
  padding:      "16px 18px",
  boxShadow:    "0 4px 24px #00000040",
};

export const CARD_SM = {
  ...CARD,
  borderRadius: 12,
  padding:      "12px 14px",
};

export const LABEL = {
  fontSize:        11,
  fontWeight:      600,
  letterSpacing:   "0.08em",
  textTransform:   "uppercase",
  color:           C.s4,
  marginBottom:    4,
  display:         "block",
};

export const SECTION_LABEL = {
  fontSize:     13,
  fontWeight:   600,
  color:        C.light,
  marginBottom: 16,
};

export const MONO = {
  fontFamily:          FONT.mono,
  fontVariantNumeric:  "tabular-nums",
};

export const ROW = {
  display:        "flex",
  justifyContent: "space-between",
  alignItems:     "center",
  padding:        "7px 0",
  borderBottom:   `1px solid ${C.s8}`,
};

// ── Spacing ─────────────────────────────────────────────────────
export const GAP = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
};

// ── Border radius ────────────────────────────────────────────────
export const RADIUS = {
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  20,
  full: 9999,
};

// ── Shadows ──────────────────────────────────────────────────────
export const SHADOW = {
  card:    "0 4px 24px #00000040",
  tooltip: "0 4px 16px #00000060",
  glow:    (color) => `0 0 0 1px ${color}22`,
};

// ── Icon sizes (lucide-react) ────────────────────────────────────
export const ICON = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

// ── Gradient text (wordmark) ─────────────────────────────────────
export const GRADIENT_TEXT = {
  background:           "linear-gradient(90deg, #10b981, #06b6d4)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor:  "transparent",
};

// ── Banners ──────────────────────────────────────────────────────
export const BANNER_BASE = {
  padding:      "9px 14px",
  borderRadius: 10,
  fontSize:     11,
  display:      "flex",
  gap:          8,
  alignItems:   "center",
};

export const BANNERS = {
  info:    { background: "#3b82f610", border: "1px solid #3b82f630", color: "#93c5fd" },
  intl:    { background: "#8b5cf610", border: "1px solid #8b5cf630", color: "#c4b5fd" },
  success: { background: "#10b98112", border: "1px solid #10b98130", color: "#6ee7b7" },
  warning: { background: "#f59e0b08", border: "1px solid #f59e0b30", color: C.amber  },
  danger:  { background: "#f43f5e10", border: "1px solid #f43f5e30", color: C.rose   },
};

// ── Chart config (Recharts) ──────────────────────────────────────
export const PIE_CONFIG = {
  innerRadius:  50,
  outerRadius:  80,
  paddingAngle: 3,
};

export const CHART_TOOLTIP_STYLE = {
  background:   C.s8,
  border:       `1px solid ${C.s7}`,
  borderRadius: 8,
  fontSize:     12,
  color:        C.light,
};

export const LEGEND_DOT = {
  width:       10,
  height:      10,
  borderRadius: 3,
  flexShrink:  0,
};

export const LINE_CONFIG = {
  strokeWidth:       2,
  dot:               false,
  activeDot:         { r: 4, strokeWidth: 0 },
  animationDuration: 400,
};

export const GRID_CONFIG = {
  stroke:          C.s8,
  strokeDasharray: "3 3",
  strokeWidth:     0.5,
};

export const AXIS_CONFIG = {
  fontSize:   11,
  fill:       C.s4,
  fontFamily: FONT.mono,
  tick:       { fontSize: 11 },
};

export const CHART_COLORS = [C.emerald, C.cyan, C.violet, C.amber, C.rose, C.blue];
