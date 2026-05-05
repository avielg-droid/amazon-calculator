import { useState, useMemo, useCallback, useEffect } from "react";
import PPCLab from "./src/PPCLab.jsx";
import { Analytics } from "@vercel/analytics/react";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import {
  TrendingUp, AlertTriangle, DollarSign, Package, BarChart3,
  ShieldCheck, RefreshCw, Info, Zap, Target, ArrowUpRight,
  ArrowDownRight, Activity, Globe, Flag, Share2
} from "lucide-react";

const C = {
  // Danuly brand
  teal:      "#14B8A6",
  tealEnd:   "#0EA5E9",
  navy:      "#0B1F3A",
  yellow:    "#FBBF24",
  yellowDim: "#FFFBEB",

  // Primary accent → teal
  indigo:    "#0EA5E9",
  indigoDim: "#E0F2FE",

  // Semantic
  green:     "#16A34A",
  greenDim:  "#F0FDF4",
  red:       "#DC2626",
  redDim:    "#FEF2F2",
  amber:     "#D97706",
  amberDim:  "#FFFBEB",
  blue:      "#2563EB",
  blueDim:   "#EFF6FF",
  cyan:      "#0891B2",
  cyanDim:   "#ECFEFF",
  violet:    "#7C3AED",
  violetDim: "#F5F3FF",
  orange:    "#EA580C",
  orangeDim: "#FFF7ED",
  rose:      "#E11D48",
  roseDim:   "#FFF1F2",

  // Neutrals
  ink:     "#0B1F3A",
  body:    "#334155",
  muted:   "#64748B",
  subtle:  "#94A3B8",
  border:  "#E2E8F0",
  bdMed:   "#CBD5E1",
  surface: "#F8FAFC",
  card:    "#FFFFFF",
  inset:   "#F1F5F9",
  hover:   "#F8FAFC",
  divider: "#F1F5F9",
};

// Brand gradient (reusable)
const BRAND_GRADIENT = "linear-gradient(135deg, #14B8A6, #0EA5E9)";

const fmt = (n, d = 2) => { const v = Number(n); return isFinite(v) ? v.toFixed(d) : "—"; };
const fmtK = n => { const v = Number(n); return isFinite(v) ? (Math.abs(v) >= 1000 ? `${(v/1000).toFixed(1)}k` : Math.round(v).toString()) : "—"; };

const MONO = { fontFamily: "ui-monospace, 'Roboto Mono', monospace", fontVariantNumeric: "tabular-nums" };
const SANS = { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" };
const CARD = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" };
const CARD_INSET = { background: C.inset, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" };
const LABEL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, marginBottom: 4, display: "block" };
const DIVIDER = { height: 1, background: C.divider, margin: "12px 0" };
const ROW = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.divider}` };

function InputField({ label, name, value, onChange, prefix, suffix, highlight, disabled, dimNote, tooltip, error }) {
  const [focused, setFocused] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  const accent = highlight || C.indigo;
  return (
    <div style={{ marginBottom: 11, opacity: disabled ? 0.45 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <label style={LABEL}>{label}</label>
        {tooltip && (
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
            onMouseEnter={() => setTipVisible(true)} onMouseLeave={() => setTipVisible(false)}>
            <Info size={11} color={C.muted} />
            {tipVisible && (
              <div style={{ position: "absolute", left: 18, top: -4, zIndex: 50, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", width: 210, fontSize: 11, color: C.body, lineHeight: 1.55, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", pointerEvents: "none" }}>{tooltip}</div>
            )}
          </span>
        )}
      </div>
      {dimNote && <p style={{ fontSize: 10, color: C.cyan, margin: "-3px 0 5px", fontStyle: "italic" }}>{dimNote}</p>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 10, fontSize: 12, color: C.muted, pointerEvents: "none", zIndex: 1 }}>{prefix}</span>}
        <input type="number" name={name} value={value} onChange={onChange} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{ width: "100%", background: C.card, border: `1px solid ${error ? C.red : focused ? accent : C.bdMed}`, borderRadius: 8, padding: `9px ${suffix ? 30 : 12}px 9px ${prefix ? 26 : 12}px`, fontSize: 13, color: C.ink, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: focused ? `0 0 0 3px ${C.indigo}15` : "none", cursor: disabled ? "not-allowed" : "auto", ...MONO }}
        />
        {suffix && <span style={{ position: "absolute", right: 10, fontSize: 11, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
      </div>
      {error && <p style={{ fontSize: 11, color: C.red, marginTop: 4, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

function StatCard({ label, value, numericValue, thresholds, color, big }) {
  let col = color || C.muted;
  if (numericValue !== undefined) {
    if (thresholds) { const [lo, hi] = thresholds; col = numericValue >= hi ? C.green : numericValue >= lo ? C.amber : C.red; }
    else col = numericValue >= 0 ? C.green : C.red;
  }
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${col}`, borderRadius: 12, padding: big ? "18px 20px" : "14px 16px", transition: "border-color 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <span style={{ ...LABEL, marginBottom: 6 }}>{label}</span>
      <span style={{ fontSize: big ? "clamp(20px,4vw,28px)" : "clamp(17px,3.5vw,22px)", fontWeight: 700, color: col, ...MONO, lineHeight: 1.1, display: "block" }}>{value}</span>
    </div>
  );
}

function CostChart({ s }) {
  const profit = s.netProfitPerUnit;
  const data = [
    { name: "Product Cost", value: Math.max(0, s.totalCOGS), color: C.cyan },
    { name: "Fees & Ads", value: Math.max(0, s.channelFees + s.adSpendPerUnit), color: C.violet },
    { name: profit >= 0 ? "Net Profit" : "Loss", value: Math.abs(profit), color: profit >= 0 ? C.green : C.red },
  ].filter(d => d.value > 0);
  return (
    <div style={{ ...CARD, flex: 1, minWidth: 200 }}>
      <p style={{ ...LABEL, marginBottom: 14 }}>Cost Breakdown</p>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <ReTooltip formatter={(v, n) => [`$${v.toFixed(2)}`, n]} contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.body }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginTop: 6 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />{d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height: 5, background: C.border, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
    </div>
  );
}

function WaterfallBar({ label, value, total, color, isTotal, note }) {
  const pct = total ? Math.abs(value / total) * 100 : 0;
  const pctOfPrice = total ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isTotal ? "9px 10px" : "6px 10px", borderRadius: 8, background: isTotal ? C.surface : "transparent" }}>
        <span style={{ fontSize: 11, color: isTotal ? C.body : C.muted, width: 130, flexShrink: 0, textAlign: "right", fontWeight: isTotal ? 600 : 400 }}>{label}</span>
        <div style={{ flex: 1, height: isTotal ? 7 : 5, background: C.border, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: isTotal ? 700 : 600, color, ...MONO, width: 58, textAlign: "right" }}>
          {value >= 0 ? `$${fmt(value)}` : `-$${fmt(Math.abs(value))}`}
        </span>
        <span style={{ fontSize: 10, color: C.muted, ...MONO, width: 40, textAlign: "right", flexShrink: 0 }}>
          {isFinite(pctOfPrice) ? `${pctOfPrice >= 0 ? "+" : ""}${fmt(pctOfPrice, 1)}%` : "—"}
        </span>
      </div>
      {note && <p style={{ fontSize: 10, color: C.cyan, margin: "1px 0 4px", paddingLeft: "clamp(0px, 30%, 140px)", fontStyle: "italic" }}>{note}</p>}
    </div>
  );
}

function InsightCard({ type, title, desc, icon: Icon }) {
  const cfg = {
    danger: { col: C.red, leftBorder: C.red },
    warning: { col: C.orange, leftBorder: C.orange },
    success: { col: C.green, leftBorder: C.green },
    info: { col: C.cyan, leftBorder: C.cyan },
  }[type];
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${cfg.leftBorder}`, borderRadius: 10, padding: "13px 15px", display: "flex", gap: 12, alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ color: cfg.col, flexShrink: 0, marginTop: 1 }}>{Icon ? <Icon size={15} /> : <AlertTriangle size={15} />}</div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: cfg.col, margin: "0 0 3px" }}>{title}</p>
        <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.55 }}>{desc}</p>
      </div>
    </div>
  );
}

function TopBar({ activeTool, onSwitch }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${C.border}`, padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 40 }}>
      <button onClick={() => onSwitch("home")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: C.navy, letterSpacing: "-0.02em", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
          Danul<span style={{ position: "relative", display: "inline-block" }}>y<span style={{ position: "absolute", top: 0, right: -5, width: 6, height: 6, borderRadius: "50%", background: C.yellow, display: "block" }} /></span>
        </span>
      </button>
      <div className="topbar-divider" style={{ width: 1, height: 20, background: C.border }} />
      <span className="topbar-tool-name" style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{activeTool === "calculator" ? "Profit Calculator" : "PPC Lab"}</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 3, background: C.inset, border: `1px solid ${C.border}`, borderRadius: 9, padding: "3px" }}>
        {[{ id: "ppc", label: "PPC Lab" }, { id: "calculator", label: "Profit Calc" }].map(({ id, label }) => (
          <button key={id} onClick={() => onSwitch(id)} onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)}
            className="topbar-tab-btn"
            style={{ padding: "6px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.15s", outline: "none", background: activeTool === id ? C.indigo : hovered === id ? C.border : "transparent", color: activeTool === id ? "#fff" : hovered === id ? C.ink : C.muted }}
          >{label}</button>
        ))}
      </div>
    </div>
  );
}

function HomeScreen({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  const tools = [
    { id: "ppc", icon: BarChart3, title: "PPC Lab", desc: "Analyze your PPC reports: find negative keyword candidates, harvest opportunities, optimize keyword bids, and analyze placement performance — with export-ready CSVs.", badge: "STR · SQP · Targeting · Placement" },
    { id: "calculator", icon: DollarSign, title: "Profit Calculator", desc: "Full unit economics simulator for Amazon FBA and DTC channels. P&L waterfall, cash flow analysis, pricing tools, and AI-driven margin insights.", badge: "FBA + DTC · US & Intl" },
  ];
  return (
    <div style={{ minHeight: "100vh", background: C.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 20px", ...SANS }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <img src="/danuly-logo.svg" alt="Danuly" style={{ width: "min(90vw, 400px)", height: "auto", display: "block", margin: "0 auto 12px" }} />
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Free browser-based tools · your data never leaves your browser</p>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", maxWidth: 820, width: "100%" }}>
        {tools.map(({ id, icon: Icon, title, desc, badge }) => {
          const isHov = hovered === id;
          return (
            <div key={id} onClick={() => onSelect(id)} onMouseEnter={() => setHovered(id)} onMouseLeave={() => setHovered(null)}
              style={{ flex: "1 1 300px", maxWidth: 380, background: C.card, border: `1px solid ${isHov ? C.teal : C.border}`, borderRadius: 16, padding: "28px 26px", cursor: "pointer", transition: "all 0.2s", boxShadow: isHov ? `0 12px 40px rgba(20,184,166,0.15), 0 0 0 1px ${C.teal}` : "0 2px 12px rgba(0,0,0,0.06)", transform: isHov ? "translateY(-3px)" : "none", display: "flex", flexDirection: "column", gap: 18 }}
            >
              <div style={{ width: 44, height: 44, background: C.indigoDim, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${C.teal}25` }}>
                <Icon size={20} color={C.teal} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{title}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.indigo, background: C.indigoDim, padding: "3px 7px", borderRadius: 5, border: `1px solid ${C.indigo}25` }}>{badge}</span>
                </div>
                <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.65 }}>{desc}</p>
              </div>
              <button style={{ padding: "10px 18px", borderRadius: 9, border: "none", background: isHov ? BRAND_GRADIENT : C.indigoDim, color: isHov ? "#fff" : C.teal, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 7, width: "fit-content" }} tabIndex={-1}>
                Open {title} →
              </button>
            </div>
          );
        })}
      </div>
      <p style={{ marginTop: 48, fontSize: 11, color: C.subtle, textAlign: "center" }}>No account required · your data never leaves your browser</p>
    </div>
  );
}

const DEFAULTS = {
  sellingPrice: 49.99, unitCost: 12.00, freightCost: 2.50,
  customsDuty: 5, prepFees: 1.50, safetyBuffer: 2, vatRate: 20,
  referralFee: 15, fbaFee: 6.50, storageFee: 0.80,
  paymentProcessing: 2.9, fulfillmentCost: 3.00, shippingToCustomer: 7.00,
  adSpendShare: 25, monthlyUnits: 500
};

export default function App() {
  const [channelMode, setChannelMode] = useState("amazon");
  const [marketMode, setMarketMode] = useState("us");
  const [inputs, setInputs] = useState(() => {
    try { const d = new URLSearchParams(window.location.search).get("d"); if (d) return JSON.parse(atob(d)); } catch {}
    try { const s = localStorage.getItem("amazon-calc-inputs"); if (s) return JSON.parse(s); } catch {}
    return DEFAULTS;
  });
  const [activeTool, setActiveTool] = useState(() => {
    try { const s = localStorage.getItem("danuly-last-tool"); if (s === "calculator" || s === "ppc") return s; } catch {}
    return "home";
  });
  const [activeTab, setActiveTab] = useState("breakdown");
  const [hoveredTab, setHoveredTab] = useState(null);
  const [hoveredChannel, setHoveredChannel] = useState(null);
  const [hoveredMarket, setHoveredMarket] = useState(null);
  const [hoveredShare, setHoveredShare] = useState(false);
  const [ppcStr, setPpcStr] = useState({ rows: [], file: null });
  const [ppcSqp, setPpcSqp] = useState({ rows: [], file: null });
  const [ppcKeyword, setPpcKeyword] = useState({ rows: [], file: null });
  const [ppcPlacement, setPpcPlacement] = useState({ rows: [], file: null });
  const [inputErrors, setInputErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [orderQty, setOrderQty] = useState(500);
  const [targetMargin, setTargetMargin] = useState(20);
  const [solveFor, setSolveFor] = useState("price");
  const [fading, setFading] = useState(false);

  const switchTool = useCallback((tool) => { setActiveTool(tool); try { localStorage.setItem("danuly-last-tool", tool); } catch {} }, []);
  const switchToolWithFade = useCallback((tool) => { setFading(true); setTimeout(() => { switchTool(tool); setFading(false); }, 150); }, [switchTool]);

  const handleShare = useCallback(() => {
    try { const url = `${window.location.origin}${window.location.pathname}?d=${btoa(JSON.stringify(inputs))}`; navigator.clipboard.writeText(url); setToast("Link copied!"); setTimeout(() => setToast(null), 2000); }
    catch { setToast("Copy failed"); setTimeout(() => setToast(null), 2000); }
  }, [inputs]);

  useEffect(() => { try { localStorage.setItem("amazon-calc-inputs", JSON.stringify(inputs)); } catch {} }, [inputs]);

  const handleChange = useCallback(e => {
    const { name, value } = e.target;
    if (value !== "" && parseFloat(value) < 0) { setInputErrors(prev => ({ ...prev, [name]: "Must be 0 or greater" })); return; }
    setInputErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    setInputs(prev => ({ ...prev, [name]: value === "" ? "" : parseFloat(value) || 0 }));
  }, []);

  const isUS = marketMode === "us";
  const effectiveVat = isUS ? 0 : (Number(inputs.vatRate) || 0);

  const s = useMemo(() => {
    const n = k => Number(inputs[k]) || 0;
    const sellingPrice = n("sellingPrice"), unitCost = n("unitCost"), freightCost = n("freightCost"),
      customsDuty = n("customsDuty"), prepFees = n("prepFees"), safetyBuffer = n("safetyBuffer"),
      referralFee = n("referralFee"), fbaFee = n("fbaFee"), storageFee = n("storageFee"),
      paymentProcessing = n("paymentProcessing"), fulfillmentCost = n("fulfillmentCost"),
      shippingToCustomer = n("shippingToCustomer"), adSpendShare = n("adSpendShare"), monthlyUnits = n("monthlyUnits");
    const vatAmount = isUS ? 0 : sellingPrice - sellingPrice / (1 + effectiveVat / 100);
    const netRevenue = sellingPrice - vatAmount;
    const dutyAmount = (unitCost + freightCost) * (customsDuty / 100);
    const landedCost = unitCost + freightCost + dutyAmount + prepFees;
    const bufferAmount = sellingPrice * (safetyBuffer / 100);
    const totalCOGS = landedCost + bufferAmount;
    let channelFees = 0;
    if (channelMode === "amazon") { channelFees = sellingPrice * (referralFee / 100) + fbaFee + storageFee; }
    else { channelFees = sellingPrice * (paymentProcessing / 100) + fulfillmentCost + shippingToCustomer; }
    const contributionMargin = netRevenue - totalCOGS - channelFees;
    const adSpendPerUnit = sellingPrice * (adSpendShare / 100);
    const netProfitPerUnit = contributionMargin - adSpendPerUnit;
    const netMargin = (netProfitPerUnit / sellingPrice) * 100;
    const roi = (netProfitPerUnit / totalCOGS) * 100;
    const totalMonthlyProfit = netProfitPerUnit * monthlyUnits;
    const breakEvenAcos = (contributionMargin / sellingPrice) * 100;
    const breakevenUnits = (netRevenue - channelFees) > 0 ? Math.ceil(totalCOGS / (netRevenue - channelFees)) : "∞";
    const referralActual = channelMode === "amazon" ? sellingPrice * (referralFee / 100) : 0;
    return { vatAmount, netRevenue, totalCOGS, landedCost, bufferAmount, channelFees, contributionMargin, adSpendPerUnit, netProfitPerUnit, netMargin, roi, totalMonthlyProfit, breakEvenAcos, breakevenUnits, adSpendShare, monthlyUnits, sellingPrice, referralActual };
  }, [inputs, channelMode, isUS, effectiveVat]);

  const insights = useMemo(() => {
    const out = [];
    if (!isUS && channelMode === "amazon") out.push({ type: "info", icon: Globe, title: "EU referral fee on gross price", desc: `Amazon Europe charges the ${inputs.referralFee}% referral fee on the VAT-inclusive price ($${fmt(s.referralActual)}), but you only keep the ex-VAT revenue.` });
    if (s.netMargin < 10) out.push({ type: "danger", icon: AlertTriangle, title: "Critical margin alert", desc: `Net margin at ${fmt(s.netMargin, 1)}% is below the 10% minimum viable threshold. Any logistics disruption could push this product to a loss.` });
    if (s.netMargin >= 10 && s.netMargin < 20) out.push({ type: "warning", icon: AlertTriangle, title: "Margin pressure zone", desc: `${fmt(s.netMargin, 1)}% margin leaves limited buffer for promotions, returns, or fee increases. Target 20%+ for sustainable scaling.` });
    if (s.adSpendShare > 20) out.push({ type: "warning", icon: TrendingUp, title: "High TACOS dependency", desc: `At ${s.adSpendShare}% TACOS you're giving up $${fmt(s.adSpendPerUnit)} per unit to marketing. Build organic rank to cut this below 15%.` });
    if (s.breakEvenAcos < s.adSpendShare) out.push({ type: "danger", icon: Target, title: "ACOS exceeds break-even", desc: `Break-even ACOS is ${fmt(s.breakEvenAcos, 1)}% but you're spending ${s.adSpendShare}%. Every ad-driven sale is currently losing money.` });
    if (s.roi > 80) out.push({ type: "success", icon: Zap, title: "Exceptional ROI signal", desc: `${fmt(s.roi, 0)}% ROI is portfolio-grade. Prime candidate for aggressive scaling and international expansion.` });
    if (s.netMargin >= 20 && s.roi > 50) out.push({ type: "success", icon: Activity, title: "Scale-ready unit economics", desc: "Strong margins with healthy ROI. Consider bundling to increase AOV, or expand into adjacent marketplaces." });
    if (out.length === 0) out.push({ type: "info", icon: Info, title: "Healthy baseline", desc: "Unit economics look solid. Focus on velocity — increase monthly volume to amplify profit without changing your cost structure." });
    return out;
  }, [s, isUS, channelMode, inputs.referralFee]);

  const tabBtn = t => ({ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", transition: "all 0.15s", outline: "none", background: activeTab === t ? C.indigo : hoveredTab === t ? C.border : "transparent", color: activeTab === t ? "#fff" : hoveredTab === t ? C.ink : C.muted });
  const modeBtn = (cur, val) => ({ padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", outline: "none", background: cur === val ? C.indigo : hoveredChannel === val ? C.border : "transparent", color: cur === val ? "#fff" : C.muted });
  const marketBtn = val => ({ padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", outline: "none", background: marketMode === val ? C.indigo : hoveredMarket === val ? C.border : "transparent", color: marketMode === val ? "#fff" : C.muted, display: "flex", alignItems: "center", gap: 6 });

  const sectionHeader = (num, accent, icon, label) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
      <div style={{ width: 20, height: 20, borderRadius: 5, background: C.indigo, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 800, color: "#fff" }}>{num}</span>
      </div>
      <div style={{ color: C.indigo }}>{icon}</div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.indigo }}>{label}</span>
    </div>
  );

  return (
    <>
      <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.15s" }}>
        {activeTool === "home" && <HomeScreen onSelect={switchToolWithFade} />}
        {activeTool !== "home" && (
          <>
            <TopBar activeTool={activeTool} onSwitch={switchToolWithFade} />
            {activeTool === "calculator" && (
              <div style={{ background: C.surface, minHeight: "calc(100vh - 52px)", padding: "20px 16px", ...SANS, color: C.ink }}>
                <h2 className="sr-only">Danuly Profit Calculator</h2>
                <div style={{ maxWidth: 1140, margin: "0 auto" }}>
                  {/* Header */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 20 }}>
                    <div>
                      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: C.ink, letterSpacing: "-0.02em" }}>{channelMode === "amazon" ? "Amazon FBA Profit Calculator" : "DTC / Shopify Profit Calculator"}</h1>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Unit economics & multi-channel margin simulator</p>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <div style={{ display: "flex", background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
                        <button style={marketBtn("us")} onClick={() => setMarketMode("us")} onMouseEnter={() => setHoveredMarket("us")} onMouseLeave={() => setHoveredMarket(null)}><Flag size={11} />US</button>
                        <button style={marketBtn("intl")} onClick={() => setMarketMode("intl")} onMouseEnter={() => setHoveredMarket("intl")} onMouseLeave={() => setHoveredMarket(null)}><Globe size={11} />International</button>
                      </div>
                      <div style={{ display: "flex", background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, gap: 2 }}>
                        <button style={modeBtn(channelMode, "amazon")} onClick={() => setChannelMode("amazon")} onMouseEnter={() => setHoveredChannel("amazon")} onMouseLeave={() => setHoveredChannel(null)}>Amazon FBA</button>
                        <button style={modeBtn(channelMode, "dtc")} onClick={() => setChannelMode("dtc")} onMouseEnter={() => setHoveredChannel("dtc")} onMouseLeave={() => setHoveredChannel(null)}>DTC / Shopify</button>
                      </div>
                      <button onClick={handleShare} onMouseEnter={() => setHoveredShare(true)} onMouseLeave={() => setHoveredShare(false)}
                        style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: hoveredShare ? C.inset : C.card, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", outline: "none", transition: "all 0.15s" }}>
                        <Share2 size={12} /> Share
                      </button>
                    </div>
                  </div>

                  {/* Mode banner */}
                  <div style={{ marginBottom: 20, padding: "10px 14px", background: isUS ? C.blueDim : C.violetDim, border: `1px solid ${isUS ? C.blue+"30" : C.violet+"30"}`, borderLeft: `4px solid ${isUS ? C.blue : C.violet}`, borderRadius: 9, fontSize: 11, color: C.body, display: "flex", gap: 8, alignItems: "center" }}>
                    {isUS ? <Flag size={12} color={C.blue} /> : <Globe size={12} color={C.violet} />}
                    <strong>{isUS ? "US mode:" : "International mode:"}</strong>&nbsp;
                    {isUS ? "VAT is 0. Sales tax collected at checkout — not part of unit P&L." : channelMode === "amazon" ? "Referral fee charged on gross (VAT-inclusive) price. Net revenue is post-VAT extraction." : "VAT extracted from gross price before calculating net revenue and profitability."}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
                    {/* SIDEBAR */}
                    <div style={{ flex: "1 1 260px", maxWidth: 310, minWidth: 250, display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ padding: "11px 14px", background: C.greenDim, border: `1px solid #15803D`, borderRadius: 10, fontSize: 11, color: "#166534", lineHeight: 1.55, display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>👋</span>
                        <span>These are <strong>example values</strong>. Replace with your real product numbers.</span>
                      </div>

                      <div style={CARD}>
                        {sectionHeader(1, C.indigo, <Package size={13} />, "Product & Tax")}
                        <InputField label="Selling price (gross)" name="sellingPrice" value={inputs.sellingPrice} onChange={handleChange} prefix="$" highlight={C.indigo} tooltip="The price customers pay on Amazon. For EU, include VAT." error={inputErrors.sellingPrice} />
                        <InputField label={isUS ? "VAT / Sales Tax" : "VAT Rate"} name="vatRate" value={isUS ? 0 : inputs.vatRate} onChange={handleChange} suffix="%" disabled={isUS} dimNote={isUS ? "US: sales tax handled at checkout" : undefined} tooltip="VAT rate for your EU marketplace. DE=19%, UK=20%, FR=20%, IT=22%." error={inputErrors.vatRate} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <InputField label="Unit cost" name="unitCost" value={inputs.unitCost} onChange={handleChange} prefix="$" tooltip="Manufacturing or wholesale cost per unit." error={inputErrors.unitCost} />
                          <InputField label="Freight" name="freightCost" value={inputs.freightCost} onChange={handleChange} prefix="$" tooltip="Ship one unit from supplier to Amazon." error={inputErrors.freightCost} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <InputField label="Customs duty" name="customsDuty" value={inputs.customsDuty} onChange={handleChange} suffix="%" tooltip="Import duty as % of product cost." error={inputErrors.customsDuty} />
                          <InputField label="Prep & labeling" name="prepFees" value={inputs.prepFees} onChange={handleChange} prefix="$" tooltip="Per-unit prep cost (bags, FNSKU stickers)." error={inputErrors.prepFees} />
                        </div>
                        <InputField label="Cost buffer %" name="safetyBuffer" value={inputs.safetyBuffer} onChange={handleChange} suffix="%" tooltip="Extra % added to COGS for damages, shrinkage." error={inputErrors.safetyBuffer} />
                      </div>

                      <div style={CARD}>
                        {sectionHeader(2, C.indigo, channelMode === "amazon" ? <BarChart3 size={13} /> : <ShieldCheck size={13} />, channelMode === "amazon" ? "Amazon Fees" : "DTC Logistics")}
                        {channelMode === "amazon" ? (
                          <>
                            <InputField label={`Referral fee (on ${isUS ? "net" : "gross incl. VAT"})`} name="referralFee" value={inputs.referralFee} onChange={handleChange} suffix="%" highlight={C.cyan} dimNote={!isUS ? `Charged on $${fmt(inputs.sellingPrice)} gross → $${fmt(s.referralActual)}` : undefined} tooltip="Amazon's cut, typically 8–15% depending on category." error={inputErrors.referralFee} />
                            <InputField label="FBA fulfillment fee" name="fbaFee" value={inputs.fbaFee} onChange={handleChange} prefix="$" tooltip="Amazon pick, pack, and ship fee." error={inputErrors.fbaFee} />
                            <InputField label="Monthly storage" name="storageFee" value={inputs.storageFee} onChange={handleChange} prefix="$" tooltip="Monthly FBA storage cost per unit. Spikes in Q4." error={inputErrors.storageFee} />
                          </>
                        ) : (
                          <>
                            <InputField label="Payment processing" name="paymentProcessing" value={inputs.paymentProcessing} onChange={handleChange} suffix="%" highlight={C.cyan} tooltip="Processor fee (Stripe etc). Typically 2.9%." error={inputErrors.paymentProcessing} />
                            <InputField label="Pick & pack" name="fulfillmentCost" value={inputs.fulfillmentCost} onChange={handleChange} prefix="$" tooltip="Warehouse pick-and-pack cost per unit." error={inputErrors.fulfillmentCost} />
                            <InputField label="Shipping to customer" name="shippingToCustomer" value={inputs.shippingToCustomer} onChange={handleChange} prefix="$" tooltip="Last-mile shipping cost per order." error={inputErrors.shippingToCustomer} />
                          </>
                        )}
                      </div>

                      <div style={CARD}>
                        {sectionHeader(3, C.indigo, <TrendingUp size={13} />, "Marketing & Scale")}
                        <InputField label="Ad spend % of sales (TACOS)" name="adSpendShare" value={inputs.adSpendShare} onChange={handleChange} suffix="%" highlight={C.orange} tooltip="Total ad spend as % of revenue. Includes PPC and external ads." error={inputErrors.adSpendShare} />
                        <InputField label="Monthly units target" name="monthlyUnits" value={inputs.monthlyUnits} onChange={handleChange} tooltip="Estimated units sold per month." error={inputErrors.monthlyUnits} />
                        <div style={{ marginTop: 6, ...CARD_INSET }}>
                          <div style={LABEL}>Monthly GMV</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: C.amber, ...MONO }}>${(inputs.sellingPrice * inputs.monthlyUnits).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                        </div>
                      </div>
                    </div>

                    {/* MAIN */}
                    <div style={{ flex: "1 1 500px", minWidth: 300, display: "flex", flexDirection: "column", gap: 14 }}>
                      {(Number(inputs.sellingPrice) === 0 || Number(inputs.unitCost) === 0) && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: C.amberDim, border: `1px solid ${C.amber}30`, borderRadius: 10, padding: "11px 14px", fontSize: 12, color: "#92400E" }}>
                          <span style={{ flexShrink: 0 }}>⚠</span>
                          <span>{Number(inputs.sellingPrice) === 0 ? "Selling price is $0 — enter a price to see results." : "Unit cost is $0 — enter a cost to see results."}</span>
                        </div>
                      )}

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ flex: 2, minWidth: 260 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(115px, 1fr))", gap: 10 }}>
                            <StatCard label="Monthly profit" value={`$${fmtK(s.totalMonthlyProfit)}`} numericValue={s.totalMonthlyProfit} big />
                            <StatCard label="Profit / unit" value={`$${fmt(s.netProfitPerUnit)}`} numericValue={s.netProfitPerUnit} thresholds={[1, 3]} />
                            <StatCard label="Net margin" value={isFinite(s.netMargin) ? `${fmt(s.netMargin, 1)}%` : "—"} numericValue={isFinite(s.netMargin) ? s.netMargin : undefined} thresholds={[10, 20]} />
                            <StatCard label="ROI on COGS" value={isFinite(s.roi) ? `${fmt(s.roi, 0)}%` : "—"} numericValue={isFinite(s.roi) ? s.roi : undefined} thresholds={[40, 80]} />
                          </div>
                        </div>
                        <CostChart s={s} />
                      </div>

                      {/* Tab bar */}
                      <div style={{ display: "flex", gap: 4, background: C.inset, border: `1px solid ${C.border}`, borderRadius: 11, padding: "3px", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        {[["breakdown","P&L Waterfall"],["efficiency","Ad & Margin"],["cashflow","Cash Flow"],["pricing","Pricing Tools"],["insights","Insights"]].map(([t, label]) => (
                          <button key={t} style={tabBtn(t)} onClick={() => setActiveTab(t)} onMouseEnter={() => setHoveredTab(t)} onMouseLeave={() => setHoveredTab(null)}>{label}</button>
                        ))}
                      </div>

                      {activeTab === "breakdown" && (
                        <div style={CARD}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Unit P&L waterfall</span>
                            <span style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 4 }}><Info size={11} />{isUS ? "US: pre-tax" : "Intl: post-VAT"}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ width: 130, flexShrink: 0 }} /><span style={{ flex: 1 }} />
                            <span style={{ fontSize: 9, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.08em", width: 58, textAlign: "right" }}>$/unit</span>
                            <span style={{ fontSize: 9, color: C.subtle, textTransform: "uppercase", letterSpacing: "0.08em", width: 40, textAlign: "right" }}>% price</span>
                          </div>
                          <WaterfallBar label="Gross selling price" value={s.sellingPrice} total={s.sellingPrice} color={C.cyan} />
                          {!isUS && <WaterfallBar label={`VAT extracted (${effectiveVat}%)`} value={-s.vatAmount} total={s.sellingPrice} color={C.muted} note="Remitted to tax authority — not your revenue" />}
                          {isUS && <WaterfallBar label="Sales tax (at checkout)" value={0} total={s.sellingPrice} color={C.muted} note="Collected by marketplace — excluded from unit P&L" />}
                          <WaterfallBar label="Net revenue" value={s.netRevenue} total={s.sellingPrice} color={C.green} isTotal />
                          <div style={DIVIDER} />
                          <WaterfallBar label="Landed COGS" value={-s.totalCOGS} total={s.sellingPrice} color={C.red} />
                          <WaterfallBar label="Channel fees" value={-s.channelFees} total={s.sellingPrice} color={C.red + "88"} note={!isUS && channelMode === "amazon" ? `Referral on gross $${fmt(s.sellingPrice)} → $${fmt(s.referralActual)}` : undefined} />
                          <WaterfallBar label="Contribution margin" value={s.contributionMargin} total={s.sellingPrice} color={C.amber} isTotal />
                          <div style={DIVIDER} />
                          <WaterfallBar label="Marketing (TACOS)" value={-s.adSpendPerUnit} total={s.sellingPrice} color={C.orange} />
                          <WaterfallBar label="Net profit" value={s.netProfitPerUnit} total={s.sellingPrice} color={s.netProfitPerUnit >= 0 ? C.green : C.red} isTotal />
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12, marginTop: 20 }}>
                            <div style={CARD_INSET}>
                              <div style={LABEL}>Landed cost breakdown</div>
                              {[["Factory cost", inputs.unitCost],["Freight", inputs.freightCost],[`Customs (${inputs.customsDuty}%)`, (inputs.unitCost+inputs.freightCost)*inputs.customsDuty/100],["3PL / Prep", inputs.prepFees]].map(([l,v]) => (
                                <div key={l} style={ROW}><span style={{ fontSize: 12, color: C.muted }}>{l}</span><span style={{ fontSize: 12, fontWeight: 600, color: C.body, ...MONO }}>${fmt(v)}</span></div>
                              ))}
                              <div style={{ ...ROW, borderBottom: "none" }}><span style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>Total landed</span><span style={{ fontSize: 12, fontWeight: 700, color: C.amber, ...MONO }}>${fmt(s.landedCost)}</span></div>
                            </div>
                            <div style={CARD_INSET}>
                              <div style={LABEL}>{channelMode === "amazon" ? "Amazon fee detail" : "DTC cost detail"}</div>
                              {channelMode === "amazon" ? (
                                <>
                                  <div style={ROW}><span style={{ fontSize: 12, color: C.muted }}>Referral ({inputs.referralFee}%{!isUS?" of gross":""})</span><span style={{ fontSize: 12, fontWeight: 600, color: C.body, ...MONO }}>${fmt(s.referralActual)}</span></div>
                                  <div style={ROW}><span style={{ fontSize: 12, color: C.muted }}>FBA fee</span><span style={{ fontSize: 12, fontWeight: 600, color: C.body, ...MONO }}>${fmt(inputs.fbaFee)}</span></div>
                                  <div style={{ ...ROW, borderBottom: "none" }}><span style={{ fontSize: 12, color: C.muted }}>Storage</span><span style={{ fontSize: 12, fontWeight: 600, color: C.body, ...MONO }}>${fmt(inputs.storageFee)}</span></div>
                                </>
                              ) : (
                                <>
                                  <div style={ROW}><span style={{ fontSize: 12, color: C.muted }}>Processing ({inputs.paymentProcessing}%)</span><span style={{ fontSize: 12, fontWeight: 600, color: C.body, ...MONO }}>${fmt(inputs.sellingPrice*inputs.paymentProcessing/100)}</span></div>
                                  <div style={ROW}><span style={{ fontSize: 12, color: C.muted }}>Pick & pack</span><span style={{ fontSize: 12, fontWeight: 600, color: C.body, ...MONO }}>${fmt(inputs.fulfillmentCost)}</span></div>
                                  <div style={{ ...ROW, borderBottom: "none" }}><span style={{ fontSize: 12, color: C.muted }}>Outbound ship</span><span style={{ fontSize: 12, fontWeight: 600, color: C.body, ...MONO }}>${fmt(inputs.shippingToCustomer)}</span></div>
                                </>
                              )}
                              <div style={{ ...ROW, borderTop: `1px solid ${C.border}`, marginTop: 6 }}><span style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>Total fees</span><span style={{ fontSize: 12, fontWeight: 700, color: C.red, ...MONO }}>${fmt(s.channelFees)}</span></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "efficiency" && (
                        <div style={CARD}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 20 }}>Efficiency metrics & benchmarks</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                            {[
                              { label: "Break-even ACOS", val: isFinite(s.breakEvenAcos)?s.breakEvenAcos:0, max: 60, color: isFinite(s.breakEvenAcos)&&inputs.adSpendShare<=s.breakEvenAcos?C.green:C.red, note: isFinite(s.breakEvenAcos)?`Ads must convert below ${fmt(s.breakEvenAcos,1)}% ACOS to be profitable`:"Price is $0 — cannot calculate" },
                              { label: "Current TACOS", val: inputs.adSpendShare, max: 60, color: inputs.adSpendShare<15?C.green:inputs.adSpendShare<25?C.amber:C.red, note: inputs.adSpendShare<15?"Efficient":inputs.adSpendShare<25?"Moderate — target <15%":"High — reduce ad dependency" },
                              { label: "Net margin", val: isFinite(s.netMargin)?s.netMargin:0, max: 50, color: isFinite(s.netMargin)&&s.netMargin>20?C.green:isFinite(s.netMargin)&&s.netMargin>10?C.amber:C.red, note: !isFinite(s.netMargin)?"Enter a selling price":s.netMargin>20?"Scale-ready":s.netMargin>10?"Viable — aim for 20%+":"Below minimum viable threshold" },
                              { label: "ROI on landed cost", val: isFinite(s.roi)?Math.max(0,s.roi):0, max: 200, color: isFinite(s.roi)&&s.roi>80?C.green:isFinite(s.roi)&&s.roi>40?C.amber:C.red, note: !isFinite(s.roi)?"Enter a unit cost":`${s.roi>80?"Exceptional":s.roi>40?"Good":"Low"} — ${fmt(s.roi,0)}% return on capital` },
                            ].map(({ label, val, max, color, note }) => (
                              <div key={label}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                  <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                                  <span style={{ fontSize: 14, fontWeight: 700, color, ...MONO }}>{fmt(val,1)}%</span>
                                </div>
                                <ProgressBar value={val} max={max} color={color} />
                                <p style={{ fontSize: 11, color: C.muted, margin: "5px 0 0" }}>{note}</p>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, paddingTop: 18, marginTop: 6, borderTop: `1px solid ${C.border}` }}>
                            {[
                              { label: "Safety buffer", val: `$${fmt(s.bufferAmount)}`, color: C.violet, sub: "per unit reserved" },
                              { label: "Monthly ad spend", val: `$${fmtK(s.adSpendPerUnit*s.monthlyUnits)}`, color: C.orange, sub: `at ${s.monthlyUnits} units/mo` },
                              { label: "Break-even vol.", val: s.netProfitPerUnit<=0?"∞ (loss)":(typeof s.breakevenUnits==="number"?fmtK(s.breakevenUnits):s.breakevenUnits), color: C.cyan, sub: "units to cover COGS" },
                            ].map(({ label, val, color, sub }) => (
                              <div key={label} style={{ ...CARD_INSET, textAlign: "center" }}>
                                <div style={{ ...LABEL, textAlign: "center" }}>{label}</div>
                                <div style={{ fontSize: 18, fontWeight: 700, color, ...MONO }}>{val}</div>
                                <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{sub}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeTab === "cashflow" && (
                        <div style={CARD}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 20 }}>Inventory cash flow & payback</div>
                          <div style={{ marginBottom: 20 }}>
                            <label style={LABEL}>Order quantity (units)</label>
                            <input type="number" value={orderQty} min={1} onChange={e => setOrderQty(Math.max(1, parseInt(e.target.value)||1))}
                              style={{ width: 160, background: C.card, border: `1px solid ${C.bdMed}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.ink, outline: "none", ...MONO }} />
                          </div>
                          {(() => {
                            const capitalAtRisk = orderQty * s.totalCOGS;
                            const monthlyProfit = s.netProfitPerUnit * s.monthlyUnits;
                            const paybackMonths = monthlyProfit > 0 ? capitalAtRisk / monthlyProfit : null;
                            const depletionDays = s.monthlyUnits > 0 ? (orderQty / s.monthlyUnits) * 30 : null;
                            const depletionDate = depletionDays ? new Date(Date.now() + depletionDays*86400000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—";
                            const unitsToBreakEven = s.netProfitPerUnit > 0 ? Math.ceil(capitalAtRisk / s.netProfitPerUnit) : null;
                            return (
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
                                {[
                                  { label: "Capital at risk", value: `$${fmtK(capitalAtRisk)}`, sub: `${orderQty} units × $${fmt(s.totalCOGS)} COGS`, color: C.red },
                                  { label: "Payback period", value: paybackMonths!=null?`${fmt(paybackMonths,1)} mo`:"Never", sub: paybackMonths!=null?`at $${fmtK(monthlyProfit)}/mo profit`:"Unprofitable", color: paybackMonths!=null&&paybackMonths<=3?C.green:paybackMonths!=null&&paybackMonths<=6?C.amber:C.red },
                                  { label: "Units to recoup", value: unitsToBreakEven!=null?fmtK(unitsToBreakEven):"∞", sub: "units to recover COGS", color: C.cyan },
                                  { label: "Stockout date", value: depletionDate, sub: depletionDays!=null?`${fmt(depletionDays,0)} days of inventory`:"—", color: C.amber },
                                ].map(({ label, value, sub, color }) => (
                                  <div key={label} style={CARD_INSET}>
                                    <div style={LABEL}>{label}</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color, ...MONO, marginBottom: 4 }}>{value}</div>
                                    <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          <div style={{ marginTop: 20, ...CARD_INSET, fontSize: 12, color: C.muted, lineHeight: 1.65 }}>
                            <strong style={{ color: C.ink }}>Rule of thumb:</strong> Payback under 3 months = aggressive scaling candidate. 3–6 months = healthy. Over 6 months = cash flow risk.
                          </div>
                        </div>
                      )}

                      {activeTab === "pricing" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                          <div style={CARD}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 20 }}>Reverse calculator — solve for target margin</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end", marginBottom: 24 }}>
                              <div>
                                <label style={LABEL}>Target margin (%)</label>
                                <input type="number" value={targetMargin} min={1} max={99} onChange={e => setTargetMargin(Math.min(99,Math.max(1,parseFloat(e.target.value)||20)))}
                                  style={{ width: 100, background: C.card, border: `1px solid ${C.indigo}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: C.ink, outline: "none", ...MONO }} />
                              </div>
                              <div style={{ display: "flex", gap: 3, background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3 }}>
                                {[["price","Find min price"],["cogs","Find max COGS"]].map(([val,label]) => (
                                  <button key={val} onClick={() => setSolveFor(val)} style={{ padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: solveFor===val?C.indigo:"transparent", color: solveFor===val?"#fff":C.muted, transition: "all 0.15s" }}>{label}</button>
                                ))}
                              </div>
                            </div>
                            {(() => {
                              const M=targetMargin/100, R=(Number(inputs.referralFee)||0)/100, T=(Number(inputs.adSpendShare)||0)/100;
                              const F=(Number(inputs.fbaFee)||0)+(Number(inputs.storageFee)||0);
                              const vatFactor=isUS?1:1/(1+(Number(inputs.vatRate)||0)/100);
                              const COGS=s.totalCOGS, P=Number(inputs.sellingPrice)||0;
                              const denom=vatFactor-R-T-M;
                              let solvedPrice=null, solvedCOGS=null, feasible=true;
                              if (solveFor==="price") { if(denom<=0) feasible=false; else solvedPrice=(F+COGS)/denom; }
                              else { solvedCOGS=P*denom-F; if(solvedCOGS<0) feasible=false; }
                              const gap=solveFor==="price"?(solvedPrice!=null?P-solvedPrice:null):(solvedCOGS!=null?solvedCOGS-COGS:null);
                              return feasible ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                  <div style={{ ...CARD_INSET, flex: 1, minWidth: 160 }}>
                                    <div style={LABEL}>{solveFor==="price"?"Required selling price":"Max allowable COGS"}</div>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: C.green, ...MONO }}>${fmt(solveFor==="price"?solvedPrice:solvedCOGS)}</div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>to achieve {targetMargin}% margin</div>
                                  </div>
                                  <div style={{ ...CARD_INSET, flex: 1, minWidth: 160 }}>
                                    <div style={LABEL}>{solveFor==="price"?"vs. current price":"vs. current COGS"}</div>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: gap!=null&&gap>=0?C.green:C.red, ...MONO }}>
                                      {gap!=null?`${gap>=0?"+":""}$${fmt(Math.abs(gap))}`:"—"}
                                    </div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{gap!=null&&gap>=0?(solveFor==="price"?"current price exceeds target ✓":"room to negotiate up ✓"):(solveFor==="price"?"need to raise price":"must reduce COGS")}</div>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ padding: "14px 18px", background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 10, color: C.red, fontSize: 13 }}>
                                  {targetMargin}% margin not achievable with current fee structure.
                                </div>
                              );
                            })()}
                          </div>
                          <div style={CARD}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 16 }}>Price sensitivity</div>
                            <div style={{ borderRadius: 10, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr style={{ background: C.surface }}>
                                    {["Price","Net profit/unit","Margin %","Monthly profit","ROI"].map(h => (
                                      <th key={h} style={{ padding: "9px 12px", textAlign: "right", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {[-10,-5,-2,-1,0,1,2,5,10].map(delta => {
                                    const P=(Number(inputs.sellingPrice)||0)+delta;
                                    if (P<=0) return null;
                                    const R=(Number(inputs.referralFee)||0)/100, T=(Number(inputs.adSpendShare)||0)/100;
                                    const F=(Number(inputs.fbaFee)||0)+(Number(inputs.storageFee)||0);
                                    const vatFactor=isUS?1:1/(1+(Number(inputs.vatRate)||0)/100);
                                    const profit=P*vatFactor-s.totalCOGS-P*R-F-P*T;
                                    const margin=(profit/P)*100, roi=(profit/s.totalCOGS)*100, monthlyProfit=profit*s.monthlyUnits;
                                    const isCurrent=delta===0;
                                    return (
                                      <tr key={delta} style={{ borderBottom: `1px solid ${C.divider}`, background: isCurrent?C.indigoDim:"transparent" }}>
                                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: isCurrent?700:400, color: isCurrent?C.indigo:C.body, ...MONO }}>${fmt(P)}{isCurrent&&<span style={{ fontSize: 9, color: C.muted, marginLeft: 4 }}>current</span>}</td>
                                        <td style={{ padding: "9px 12px", textAlign: "right", color: profit>=0?C.green:C.red, ...MONO, fontWeight: 600 }}>{profit>=0?`$${fmt(profit)}`:`-$${fmt(Math.abs(profit))}`}</td>
                                        <td style={{ padding: "9px 12px", textAlign: "right", color: margin>20?C.green:margin>10?C.amber:C.red, ...MONO }}>{fmt(margin,1)}%</td>
                                        <td style={{ padding: "9px 12px", textAlign: "right", color: monthlyProfit>=0?C.body:C.red, ...MONO }}>{monthlyProfit>=0?`$${fmtK(monthlyProfit)}`:`-$${fmtK(Math.abs(monthlyProfit))}`}</td>
                                        <td style={{ padding: "9px 12px", textAlign: "right", color: roi>50?C.green:roi>20?C.amber:C.red, ...MONO }}>{fmt(roi,0)}%</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "insights" && (
                        <div style={CARD}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <RefreshCw size={14} color={C.green} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>AI-driven strategic insights</span>
                            <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted, background: C.inset, borderRadius: 6, padding: "3px 8px", border: `1px solid ${C.border}` }}>Live · {insights.length} signal{insights.length!==1?"s":""}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10, marginTop: 16 }}>
                            <div style={{ ...CARD_INSET, borderColor: `${C.green}22` }}>
                              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green, marginBottom: 8 }}>Price sensitivity</div>
                              <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.65 }}>
                                A $2 price increase → <strong style={{ color: C.ink }}>${fmt(inputs.sellingPrice+2)}</strong> gross would add <strong style={{ color: C.green }}>${fmt(2*(1-effectiveVat/(100+effectiveVat)),2)}/unit</strong> after VAT, or <strong style={{ color: C.green }}>${fmtK(2*(1-effectiveVat/(100+effectiveVat))*inputs.monthlyUnits)}/mo</strong> at current volume.
                              </p>
                            </div>
                            <div style={{ ...CARD_INSET, borderColor: `${C.cyan}22` }}>
                              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.cyan, marginBottom: 8 }}>Channel comparison</div>
                              <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.65 }}>
                                {channelMode==="amazon"?`Switching to DTC eliminates the ${inputs.referralFee}% referral fee ($${fmt(s.referralActual)}/unit) but adds outbound shipping & processing.`:`Switching to Amazon adds a ${inputs.referralFee}% referral fee but removes outbound shipping costs.`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTool === "ppc" && (
              <div style={{ background: C.surface, minHeight: "calc(100vh - 52px)", padding: "20px 16px", ...SANS }}>
                <div style={{ maxWidth: 1140, margin: "0 auto" }}>
                  <PPCLab ppcStr={ppcStr} setPpcStr={setPpcStr} ppcSqp={ppcSqp} setPpcSqp={setPpcSqp} ppcKeyword={ppcKeyword} setPpcKeyword={setPpcKeyword} ppcPlacement={ppcPlacement} setPpcPlacement={setPpcPlacement} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: BRAND_GRADIENT, color: "#fff", padding: "10px 22px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 24px rgba(14,165,233,0.4)" }}>{toast}</div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #F8FAFC; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        button:focus-visible { outline: 2px solid #14B8A666; outline-offset: 2px; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #F1F5F9; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0; }
        @media (max-width: 480px) {
          .topbar-tool-name { display: none !important; }
          .topbar-divider { display: none !important; }
          .topbar-tab-btn { padding: 6px 10px !important; font-size: 11px !important; }
        }
      `}</style>
      <Analytics />
    </>
  );
}
