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
  emerald: "#10b981", cyan: "#06b6d4", orange: "#f97316",
  rose: "#f43f5e", violet: "#8b5cf6", amber: "#f59e0b",
  light: "#e2e8f0",
  s4: "#94a3b8", s5: "#64748b", s6: "#475569",
  s7: "#334155", s8: "#1e293b", s9: "#0f172a", s95: "#020617",
};

const fmt = (n, d = 2) => { const v = Number(n); return isFinite(v) ? v.toFixed(d) : "—"; };
const fmtK = n => { const v = Number(n); return isFinite(v) ? (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()) : "—"; };

const LABEL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s4, marginBottom: 4, display: "block" };
const ROW = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.s8}` };
const CARD = { background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 24px #00000040" };
const MONO = { fontFamily: "ui-monospace, monospace" };

function InputField({ label, name, value, onChange, prefix, suffix, highlight, disabled, dimNote, tooltip, error }) {
  const [focused, setFocused] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  return (
    <div style={{ marginBottom: 12, opacity: disabled ? 0.55 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <label style={{ ...LABEL, marginBottom: 0 }}>{label}</label>
        {tooltip && (
          <span
            style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
            onMouseEnter={() => setTipVisible(true)}
            onMouseLeave={() => setTipVisible(false)}
          >
            <Info size={11} color={C.s5} />
            {tipVisible && (
              <div style={{
                position: "absolute", left: 16, top: -4, zIndex: 50,
                background: C.s8, border: `1px solid ${C.s7}`, borderRadius: 8,
                padding: "8px 10px", width: 200, fontSize: 11, color: C.s4,
                lineHeight: 1.5, boxShadow: "0 4px 16px #00000060", pointerEvents: "none",
              }}>
                {tooltip}
              </div>
            )}
          </span>
        )}
      </div>
      {dimNote && <p style={{ fontSize: 10, color: C.cyan, margin: "-2px 0 5px", fontStyle: "italic" }}>{dimNote}</p>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 10, fontSize: 12, color: C.s5, pointerEvents: "none" }}>{prefix}</span>}
        <input
          type="number" name={name} value={value} onChange={onChange} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", background: C.s95, border: `1px solid ${error ? C.rose : focused ? (highlight || C.emerald) : C.s8}`,
            borderRadius: 8, padding: `8px ${suffix ? 28 : 12}px 8px ${prefix ? 24 : 12}px`,
            fontSize: 13, color: C.light, outline: "none", boxSizing: "border-box",
            transition: "border-color 0.2s", ...MONO,
            boxShadow: error ? `0 0 0 1px ${C.rose}22` : focused ? `0 0 0 1px ${(highlight || C.emerald)}22` : "none",
            cursor: disabled ? "not-allowed" : "auto",
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 10, fontSize: 11, color: C.s5, pointerEvents: "none" }}>{suffix}</span>}
      </div>
      {error && <p style={{ fontSize: 11, color: C.rose, marginTop: 3, marginBottom: 0 }}>{error}</p>}
    </div>
  );
}

function StatCard({ label, value, numericValue, thresholds, color, big }) {
  let resolvedColor = color || C.s4;
  if (numericValue !== undefined) {
    if (thresholds) {
      const [lo, hi] = thresholds;
      resolvedColor = numericValue >= hi ? C.emerald : numericValue >= lo ? C.amber : C.rose;
    } else {
      resolvedColor = numericValue >= 0 ? C.emerald : C.rose;
    }
  }
  return (
    <div style={{
      background: big ? `${resolvedColor}10` : C.s9,
      border: `1px solid ${big ? resolvedColor + "40" : C.s8}`,
      borderRadius: 14, padding: big ? "18px 20px" : "14px 16px",
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.s5, display: "block", marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: big ? "clamp(18px, 4vw, 26px)" : "clamp(16px, 3.5vw, 20px)", fontWeight: 700, color: resolvedColor, ...MONO, lineHeight: 1.1, wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function CostChart({ s }) {
  const profit = s.netProfitPerUnit;
  const fees = s.channelFees + s.adSpendPerUnit;
  const cogs = s.totalCOGS;

  const data = [
    { name: "Product Cost", value: Math.max(0, cogs), color: C.cyan },
    { name: "Fees & Ads", value: Math.max(0, fees), color: C.violet },
    { name: profit >= 0 ? "Net Profit" : "Loss", value: Math.abs(profit), color: profit >= 0 ? C.emerald : C.rose },
  ].filter(d => d.value > 0);

  return (
    <div style={{ ...CARD, flex: 1, minWidth: 220 }}>
      <p style={{ ...LABEL, marginBottom: 12 }}>Cost Breakdown</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <ReTooltip
            formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
            contentStyle={{ background: C.s8, border: `1px solid ${C.s7}`, borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.s4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height: 6, background: C.s8, borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.4s ease" }} />
    </div>
  );
}

function WaterfallBar({ label, value, total, color, isTotal, note }) {
  const pct = total ? Math.abs(value / total) * 100 : 0;
  const pctOfPrice = total ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: C.s4, width: 120, flexShrink: 0, textAlign: "right" }}>{label}</span>
        <div style={{ flex: 1, height: isTotal ? 8 : 6, background: C.s8, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color, ...MONO, width: 58, textAlign: "right" }}>
          {value >= 0 ? `$${fmt(value)}` : `-$${fmt(Math.abs(value))}`}
        </span>
        <span style={{ fontSize: 10, color: C.s5, ...MONO, width: 42, textAlign: "right", flexShrink: 0 }}>
          {isFinite(pctOfPrice) ? `${pctOfPrice >= 0 ? "+" : ""}${fmt(pctOfPrice, 1)}%` : "—"}
        </span>
      </div>
      {note && <p style={{ fontSize: 10, color: C.cyan, margin: "2px 0 0 130px", fontStyle: "italic" }}>{note}</p>}
    </div>
  );
}

function InsightCard({ type, title, desc, icon: Icon }) {
  const cfg = {
    danger: { bg: "#f43f5e10", border: "#f43f5e30", text: C.rose },
    warning: { bg: "#f9731610", border: "#f9731630", text: C.orange },
    success: { bg: "#10b98110", border: "#10b98130", text: C.emerald },
    info: { bg: "#06b6d410", border: "#06b6d430", text: C.cyan },
  }[type];
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ color: cfg.text, flexShrink: 0, marginTop: 1 }}>{Icon ? <Icon size={16} /> : <AlertTriangle size={16} />}</div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: cfg.text, margin: "0 0 3px" }}>{title}</p>
        <p style={{ fontSize: 11, color: C.s4, margin: 0, lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  );
}

function HomeScreen({ onSelect }) {
  const [hoveredCard, setHoveredCard] = useState(null);

  const card = (tool, accent) => ({
    container: {
      flex: "1 1 280px", maxWidth: 360, background: C.s9,
      border: `1px solid ${hoveredCard === tool ? accent : C.s8}`,
      borderRadius: 20, padding: "32px 28px", cursor: "pointer",
      transition: "all 0.2s", boxShadow: hoveredCard === tool ? `0 8px 32px ${accent}20` : "0 4px 24px #00000040",
      transform: hoveredCard === tool ? "translateY(-2px)" : "none",
      display: "flex", flexDirection: "column", gap: 16,
    },
    icon: {
      width: 48, height: 48, background: `${accent}15`, borderRadius: 14,
      display: "flex", alignItems: "center", justifyContent: "center",
    },
    btn: {
      marginTop: "auto", padding: "10px 18px", borderRadius: 10, border: "none",
      background: hoveredCard === tool ? accent : `${accent}20`,
      color: hoveredCard === tool ? "#fff" : accent,
      fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
      display: "flex", alignItems: "center", gap: 6,
    },
  });

  const ppc = card("ppc", C.violet);
  const calc = card("calculator", C.emerald);

  return (
    <div style={{
      minHeight: "100vh", background: C.s95, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "40px 20px",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{
          fontSize: 36, fontWeight: 800, margin: "0 0 8px",
          background: "linear-gradient(90deg, #10b981, #06b6d4)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Danuly</h1>
        <p style={{ fontSize: 14, color: C.s5, margin: 0 }}>Amazon seller tools</p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", maxWidth: 780, width: "100%" }}>

        <div style={ppc.container}
          onClick={() => onSelect("ppc")}
          onMouseEnter={() => setHoveredCard("ppc")}
          onMouseLeave={() => setHoveredCard(null)}>
          <div style={ppc.icon}><BarChart3 size={22} color={C.violet} /></div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.light, marginBottom: 6 }}>PPC Lab</div>
            <div style={{ fontSize: 13, color: C.s4, lineHeight: 1.6 }}>
              Analyze ad reports. Find negative keywords, harvest opportunities, and market insights.
            </div>
          </div>
          <button style={ppc.btn} tabIndex={-1}>Open PPC Lab <span>→</span></button>
        </div>

        <div style={calc.container}
          onClick={() => onSelect("calculator")}
          onMouseEnter={() => setHoveredCard("calculator")}
          onMouseLeave={() => setHoveredCard(null)}>
          <div style={calc.icon}><DollarSign size={22} color={C.emerald} /></div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.light, marginBottom: 6 }}>Profit Calculator</div>
            <div style={{ fontSize: 13, color: C.s4, lineHeight: 1.6 }}>
              Unit economics & margin simulator. Amazon FBA and DTC channels with full P&L breakdown.
            </div>
          </div>
          <button style={calc.btn} tabIndex={-1}>Open Calculator <span>→</span></button>
        </div>

      </div>
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
  const [channelMode, setChannelMode] = useState("amazon"); // amazon | dtc
  const [marketMode, setMarketMode] = useState("us");    // us | intl
  const [inputs, setInputs] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("d");
      if (d) return JSON.parse(atob(d));
    } catch {}
    try {
      const saved = localStorage.getItem("amazon-calc-inputs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULTS;
  });
  const [activeTool, setActiveTool] = useState(() => {
    try {
      const saved = localStorage.getItem("danuly-last-tool");
      if (saved === "calculator" || saved === "ppc") return saved;
    } catch {}
    return "home";
  });
  const [activeTab, setActiveTab] = useState("breakdown");
  const [hoveredTab, setHoveredTab] = useState(null);
  const [hoveredChannel, setHoveredChannel] = useState(null);
  const [hoveredMarket, setHoveredMarket] = useState(null);
  const [hoveredShare, setHoveredShare] = useState(false);
  const [ppcStr, setPpcStr] = useState({ rows: [], file: null });
  const [ppcSqp, setPpcSqp] = useState({ rows: [], file: null });
  const [inputErrors, setInputErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [orderQty, setOrderQty] = useState(500);
  const [targetMargin, setTargetMargin] = useState(20);
  const [solveFor, setSolveFor] = useState("price"); // "price" | "cogs"

  const switchTool = useCallback((tool) => {
    setActiveTool(tool);
    try { localStorage.setItem("danuly-last-tool", tool); } catch {}
  }, []);

  const handleShare = useCallback(() => {
    try {
      const encoded = btoa(JSON.stringify(inputs));
      const url = `${window.location.origin}${window.location.pathname}?d=${encoded}`;
      navigator.clipboard.writeText(url);
      setToast("Link copied!");
      setTimeout(() => setToast(null), 2000);
    } catch {
      setToast("Copy failed");
      setTimeout(() => setToast(null), 2000);
    }
  }, [inputs]);

  useEffect(() => {
    try {
      localStorage.setItem("amazon-calc-inputs", JSON.stringify(inputs));
    } catch {}
  }, [inputs]);

  const handleChange = useCallback(e => {
    const { name, value } = e.target;
    const num = parseFloat(value);
    if (value !== "" && num < 0) {
      setInputErrors(prev => ({ ...prev, [name]: "Must be 0 or greater" }));
      return;
    }
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
      shippingToCustomer = n("shippingToCustomer"), adSpendShare = n("adSpendShare"),
      monthlyUnits = n("monthlyUnits");

    // VAT logic:
    // US: VAT = 0, gross = net, sales tax handled at checkout (not in unit P&L)
    // Intl: VAT is baked into gross price. Extract it before calculating profit.
    const vatAmount = isUS ? 0 : sellingPrice - sellingPrice / (1 + effectiveVat / 100);
    const netRevenue = sellingPrice - vatAmount;

    // Landed cost — same in both markets
    const dutyAmount = (unitCost + freightCost) * (customsDuty / 100);
    const landedCost = unitCost + freightCost + dutyAmount + prepFees;
    const bufferAmount = sellingPrice * (safetyBuffer / 100);
    const totalCOGS = landedCost + bufferAmount;

    // Channel fees
    // KEY DISTINCTION (Intl Amazon): Referral fee is charged on the GROSS price (incl. VAT),
    // because Amazon deducts it from the total customer payment. Net revenue is still post-VAT.
    let channelFees = 0, referralBase = 0;
    if (channelMode === "amazon") {
      // US: referral on gross (= net, since vatAmount=0). Intl: referral on gross (incl VAT).
      referralBase = sellingPrice; // always gross
      const referralAmt = referralBase * (referralFee / 100);
      channelFees = referralAmt + fbaFee + storageFee;
    } else {
      const processingAmt = sellingPrice * (paymentProcessing / 100);
      channelFees = processingAmt + fulfillmentCost + shippingToCustomer;
    }

    const contributionMargin = netRevenue - totalCOGS - channelFees;
    const adSpendPerUnit = sellingPrice * (adSpendShare / 100);
    const netProfitPerUnit = contributionMargin - adSpendPerUnit;
    const netMargin = (netProfitPerUnit / sellingPrice) * 100;
    const roi = (netProfitPerUnit / totalCOGS) * 100;
    const totalMonthlyProfit = netProfitPerUnit * monthlyUnits;
    const breakEvenAcos = (contributionMargin / sellingPrice) * 100;
    const breakevenUnits = (netRevenue - channelFees) > 0 ? Math.ceil(totalCOGS / (netRevenue - channelFees)) : "∞";
    const referralActual = channelMode === "amazon" ? sellingPrice * (referralFee / 100) : 0;

    return {
      vatAmount, netRevenue, totalCOGS, landedCost, bufferAmount,
      channelFees, contributionMargin, adSpendPerUnit, netProfitPerUnit,
      netMargin, roi, totalMonthlyProfit, breakEvenAcos, breakevenUnits,
      adSpendShare, monthlyUnits, sellingPrice, referralActual,
    };
  }, [inputs, channelMode, isUS, effectiveVat]);

  const insights = useMemo(() => {
    const out = [];
    if (!isUS && channelMode === "amazon") out.push({
      type: "info", icon: Globe,
      title: "EU referral fee on gross price",
      desc: `Amazon Europe charges the ${inputs.referralFee}% referral fee on the VAT-inclusive price ($${fmt(s.referralActual)}), but you only keep the ex-VAT revenue. This calculator reflects that correctly — your effective fee burden is higher than it appears in US-mode.`
    });
    if (s.netMargin < 10) out.push({ type: "danger", icon: AlertTriangle, title: "Critical margin alert", desc: `Net margin at ${fmt(s.netMargin, 1)}% is below the 10% minimum viable threshold. Any logistics disruption could push this product to a loss.` });
    if (s.netMargin >= 10 && s.netMargin < 20) out.push({ type: "warning", icon: AlertTriangle, title: "Margin pressure zone", desc: `${fmt(s.netMargin, 1)}% margin leaves limited buffer for promotions, returns, or fee increases. Target 20%+ for sustainable scaling.` });
    if (s.adSpendShare > 20) out.push({ type: "warning", icon: TrendingUp, title: "High TACOS dependency", desc: `At ${s.adSpendShare}% TACOS you're giving up $${fmt(s.adSpendPerUnit)} per unit to marketing. Build organic rank to cut this below 15%.` });
    if (s.breakEvenAcos < s.adSpendShare) out.push({ type: "danger", icon: Target, title: "ACOS exceeds break-even", desc: `Break-even ACOS is ${fmt(s.breakEvenAcos, 1)}% but you're spending ${s.adSpendShare}%. Every ad-driven sale is currently losing money.` });
    if (s.roi > 80) out.push({ type: "success", icon: Zap, title: "Exceptional ROI signal", desc: `${fmt(s.roi, 0)}% ROI is portfolio-grade. Prime candidate for aggressive scaling and international expansion.` });
    if (s.netMargin >= 20 && s.roi > 50) out.push({ type: "success", icon: Activity, title: "Scale-ready unit economics", desc: "Strong margins with healthy ROI. Consider bundling to increase AOV, or expand into adjacent marketplaces to compound growth." });
    if (out.length === 0) out.push({ type: "info", icon: Info, title: "Healthy baseline", desc: "Unit economics look solid. Focus on velocity — increase monthly volume to amplify profit without changing your cost structure." });
    return out;
  }, [s, isUS, channelMode, inputs.referralFee]);

  const tabBtn = (t) => ({
    padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    transition: "all 0.15s", outline: "none", boxShadow: "none",
    background: activeTab === t ? C.emerald : hoveredTab === t ? C.s8 : "transparent",
    color: activeTab === t ? "#fff" : hoveredTab === t ? C.light : C.s4,
  });

  const modeBtn = (cur, val) => ({
    padding: "7px 18px", borderRadius: 9, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.2s",
    outline: "none", boxShadow: "none",
    background: cur === val ? C.emerald : hoveredChannel === val ? C.s7 : "transparent",
    color: cur === val ? "#fff" : C.s4,
  });

  const marketBtn = (val) => ({
    padding: "7px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.2s",
    outline: "none", boxShadow: "none",
    background: marketMode === val ? (val === "us" ? "#3b82f6" : C.violet) : hoveredMarket === val ? C.s7 : "transparent",
    color: marketMode === val ? "#fff" : C.s4,
    display: "flex", alignItems: "center", gap: 6,
  });

  return (
    <>
    <div style={{ background: C.s95, minHeight: "100vh", padding: "16px 12px", fontFamily: "ui-sans-serif, system-ui, sans-serif", color: C.light }}>
      <h2 className="sr-only">Omni-Channel Profit Engine — global unit economics calculator</h2>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 14, rowGap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, background: "#10b98120", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={16} color={C.emerald} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(90deg, #10b981, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {channelMode === "amazon" ? "Amazon FBA Profit Calculator" : "DTC / Shopify Profit Calculator"}
              </h1>
            </div>
            <p style={{ fontSize: 12, color: C.s5, margin: 0 }}>Unit economics & multi-channel margin simulator</p>
          </div>

          {/* Two toggle groups */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {/* Market toggle */}
            <div style={{ display: "flex", background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 12, padding: 4, gap: 4, alignItems: "center" }}>
              <button style={marketBtn("us")} onClick={() => setMarketMode("us")}
                onMouseEnter={() => setHoveredMarket("us")}
                onMouseLeave={() => setHoveredMarket(null)}
              >
                <Flag size={12} />US Marketplace
              </button>
              <button style={marketBtn("intl")} onClick={() => setMarketMode("intl")}
                onMouseEnter={() => setHoveredMarket("intl")}
                onMouseLeave={() => setHoveredMarket(null)}
              >
                <Globe size={12} />International (VAT)
              </button>
            </div>
            {/* Channel toggle */}
            <div style={{ display: "flex", background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 12, padding: 4, gap: 4 }}>
              <button style={modeBtn(channelMode, "amazon")} onClick={() => setChannelMode("amazon")}
                onMouseEnter={() => setHoveredChannel("amazon")}
                onMouseLeave={() => setHoveredChannel(null)}
              >Amazon FBA</button>
              <button style={modeBtn(channelMode, "dtc")} onClick={() => setChannelMode("dtc")}
                onMouseEnter={() => setHoveredChannel("dtc")}
                onMouseLeave={() => setHoveredChannel(null)}
              >DTC / Shopify</button>
            </div>
            {/* Share button */}
            <button onClick={handleShare} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600,
              background: hoveredShare ? C.s7 : C.s8, border: `1px solid ${C.s7}`, color: C.s4,
              cursor: "pointer", outline: "none", boxShadow: "none",
              transition: "all 0.15s",
            }}
              onMouseEnter={() => setHoveredShare(true)}
              onMouseLeave={() => setHoveredShare(false)}
            >
              <Share2 size={13} /> Share
            </button>
          </div>
        </div>

        {/* Market mode banner */}
        {isUS ? (
          <div style={{ marginTop: 12, padding: "9px 14px", background: "#3b82f610", border: "1px solid #3b82f630", borderRadius: 10, fontSize: 11, color: "#93c5fd", display: "flex", gap: 8, alignItems: "center" }}>
            <Flag size={12} /><strong>US mode:</strong>&nbsp;VAT is set to 0. Sales tax is collected at checkout by the marketplace and is not part of unit-level P&amp;L.
          </div>
        ) : (
          <div style={{ marginTop: 12, padding: "9px 14px", background: "#8b5cf610", border: "1px solid #8b5cf630", borderRadius: 10, fontSize: 11, color: "#c4b5fd", display: "flex", gap: 8, alignItems: "center" }}>
            <Globe size={12} /><strong>International mode:</strong>&nbsp;{channelMode === "amazon" ? "Amazon referral fee is charged on the gross (VAT-inclusive) price — net revenue is calculated after VAT extraction. This mirrors EU marketplace accounting." : "VAT is extracted from gross price before calculating net revenue and profitability."}
          </div>
        )}
      </div>

      {/* Main layout — flex-wrap for responsiveness */}
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ flex: "1 1 260px", maxWidth: 320, minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ padding: "10px 14px", background: "#10b98112", border: "1px solid #10b98130", borderRadius: 10, fontSize: 11, color: "#6ee7b7", lineHeight: 1.5, display: "flex", gap: 8 }}>
            <span style={{ fontSize: 14 }}>👋</span>
            <span>These are <strong>example values</strong>. Replace them with your product's numbers to see your real profit.</span>
          </div>

          <div style={CARD}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.emerald }}>
              <span style={{ background: C.emerald, color: "#000", borderRadius: 4, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>1</span>
              <Package size={14} />Product & Tax
            </div>
            <InputField label="Selling price (gross incl. VAT)" name="sellingPrice" value={inputs.sellingPrice} onChange={handleChange} prefix="$" highlight={C.emerald} tooltip="The price customers pay on Amazon. For EU, include VAT." error={inputErrors.sellingPrice} />
            <InputField
              label={isUS ? "VAT / Sales Tax" : "VAT Rate"}
              name="vatRate"
              value={isUS ? 0 : inputs.vatRate}
              onChange={handleChange}
              suffix="%"
              disabled={isUS}
              dimNote={isUS ? "US: sales tax handled at checkout" : undefined}
              tooltip="VAT rate for your EU marketplace. DE=19%, UK=20%, FR=20%, IT=22%."
              error={inputErrors.vatRate}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField label="Unit cost" name="unitCost" value={inputs.unitCost} onChange={handleChange} prefix="$" tooltip="Your manufacturing or wholesale cost per unit (ex-factory)." error={inputErrors.unitCost} />
              <InputField label="Freight to Amazon" name="freightCost" value={inputs.freightCost} onChange={handleChange} prefix="$" tooltip="Cost to ship one unit from supplier to Amazon FBA warehouse." error={inputErrors.freightCost} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField label="Customs duty" name="customsDuty" value={inputs.customsDuty} onChange={handleChange} suffix="%" tooltip="Import duty as a % of product cost. Varies by HS code and country." error={inputErrors.customsDuty} />
              <InputField label="Prep & Labeling" name="prepFees" value={inputs.prepFees} onChange={handleChange} prefix="$" tooltip="Per-unit prep/labeling cost (bubble wrap, poly bags, FNSKU stickers)." error={inputErrors.prepFees} />
            </div>
            <InputField label="Cost Buffer %" name="safetyBuffer" value={inputs.safetyBuffer} onChange={handleChange} suffix="%" tooltip="Extra % added to COGS as buffer for damages, shrinkage, or hidden costs." error={inputErrors.safetyBuffer} />
          </div>

          <div style={CARD}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.cyan }}>
              <span style={{ background: C.cyan, color: "#000", borderRadius: 4, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>2</span>
              {channelMode === "amazon" ? <><BarChart3 size={14} />Amazon Fees</> : <><ShieldCheck size={14} />DTC Logistics</>}
            </div>
            {channelMode === "amazon" ? (
              <>
                <InputField
                  label={`Referral fee (on ${isUS ? "net" : "gross incl. VAT"})`}
                  name="referralFee" value={inputs.referralFee} onChange={handleChange}
                  suffix="%" highlight={C.cyan}
                  dimNote={!isUS ? `Charged on $${fmt(inputs.sellingPrice)} gross → $${fmt(s.referralActual)}` : undefined}
                  tooltip="Amazon's cut of your sale price, typically 8–15% depending on category."
                  error={inputErrors.referralFee}
                />
                <InputField label="FBA fulfillment fee" name="fbaFee" value={inputs.fbaFee} onChange={handleChange} prefix="$" tooltip="Amazon's pick, pack, and ship fee. Depends on product size and weight." error={inputErrors.fbaFee} />
                <InputField label="Monthly storage" name="storageFee" value={inputs.storageFee} onChange={handleChange} prefix="$" tooltip="Monthly FBA storage cost per unit. Spikes in Q4 (Oct–Dec)." error={inputErrors.storageFee} />
              </>
            ) : (
              <>
                <InputField label="Payment processing" name="paymentProcessing" value={inputs.paymentProcessing} onChange={handleChange} suffix="%" highlight={C.cyan} tooltip="Payment processor fee (Stripe, PayPal, etc.). Typically 2.9% + $0.30." error={inputErrors.paymentProcessing} />
                <InputField label="Pick & pack" name="fulfillmentCost" value={inputs.fulfillmentCost} onChange={handleChange} prefix="$" tooltip="Your own warehouse pick-and-pack cost per unit (non-Amazon channels)." error={inputErrors.fulfillmentCost} />
                <InputField label="Shipping to customer" name="shippingToCustomer" value={inputs.shippingToCustomer} onChange={handleChange} prefix="$" tooltip="Last-mile shipping cost you pay per order on non-Amazon channels." error={inputErrors.shippingToCustomer} />
              </>
            )}
          </div>

          <div style={CARD}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.orange }}>
              <span style={{ background: C.orange, color: "#000", borderRadius: 4, fontSize: 9, fontWeight: 800, padding: "1px 5px" }}>3</span>
              <TrendingUp size={14} />Marketing & Scale
            </div>
            <InputField label="Ad Spend % of Sales (TACOS)" name="adSpendShare" value={inputs.adSpendShare} onChange={handleChange} suffix="%" highlight={C.orange} tooltip="Total ad spend as % of revenue (TACOS). Includes PPC and external ads." error={inputErrors.adSpendShare} />
            <InputField label="Monthly units target" name="monthlyUnits" value={inputs.monthlyUnits} onChange={handleChange} tooltip="Estimated units sold per month. Used to calculate total monthly profit." error={inputErrors.monthlyUnits} />
            <div style={{ marginTop: 4, padding: "10px 12px", background: C.s95, borderRadius: 10, border: `1px solid ${C.s8}` }}>
              <div style={{ fontSize: 10, color: C.s5, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Monthly GMV</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.amber, ...MONO }}>
                ${(inputs.sellingPrice * inputs.monthlyUnits).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN DASHBOARD ── */}
        <div style={{ flex: "1 1 500px", minWidth: 300, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* KPI row + pie chart */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 2, minWidth: 280 }}>
              {(Number(inputs.sellingPrice) === 0 || Number(inputs.unitCost) === 0) && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  background: "#f59e0b08", border: "1px solid #f59e0b30",
                  borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#f59e0b",
                  marginBottom: 4,
                }}>
                  <span style={{ flexShrink: 0 }}>⚠</span>
                  <span>
                    {Number(inputs.sellingPrice) === 0
                      ? "Selling price is $0 — enter a price to see accurate results."
                      : "Unit cost is $0 — enter a cost to see accurate results."}
                  </span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 12 }}>
                <StatCard label="Monthly profit" value={`$${fmtK(s.totalMonthlyProfit)}`} numericValue={s.totalMonthlyProfit} big />
                <StatCard label="Profit per unit" value={`$${fmt(s.netProfitPerUnit)}`} numericValue={s.netProfitPerUnit} thresholds={[1, 3]} />
                <StatCard label="Profit % of price" value={isFinite(s.netMargin) ? `${fmt(s.netMargin, 1)}%` : "—"} numericValue={isFinite(s.netMargin) ? s.netMargin : undefined} thresholds={[10, 20]} />
                <StatCard label="ROI on COGS" value={isFinite(s.roi) ? `${fmt(s.roi, 0)}%` : "—"} numericValue={isFinite(s.roi) ? s.roi : undefined} thresholds={[40, 80]} />
              </div>
            </div>
            <CostChart s={s} />
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 6, background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 12, padding: 4, overflowX: "auto", WebkitOverflowScrolling: "touch", maxWidth: "100%" }}>
            {[
              ["breakdown", "P&L Waterfall"],
              ["efficiency", "Ad & Margin Health"],
              ["cashflow", "Cash Flow"],
              ["pricing", "Pricing Tools"],
              ["insights", "Insights"],
              ["ppc", "PPC Lab"],
            ].map(([t, label]) => (
              <button key={t} style={tabBtn(t)} onClick={() => setActiveTab(t)}
                onMouseEnter={() => setHoveredTab(t)}
                onMouseLeave={() => setHoveredTab(null)}
              >{label}</button>
            ))}
          </div>

          {/* ── TAB: BREAKDOWN ── */}
          {activeTab === "breakdown" && (
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Unit P&L waterfall</span>
                <span style={{ fontSize: 11, color: C.s5, display: "flex", alignItems: "center", gap: 4 }}>
                  <Info size={12} />{isUS ? "US: pre-tax analysis" : "Intl: post-VAT analysis"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 120, flexShrink: 0 }} />
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 9, color: C.s6, textTransform: "uppercase", letterSpacing: "0.08em", width: 58, textAlign: "right" }}>$/unit</span>
                <span style={{ fontSize: 9, color: C.s6, textTransform: "uppercase", letterSpacing: "0.08em", width: 42, textAlign: "right" }}>% of price</span>
              </div>

              <WaterfallBar label="Gross selling price" value={s.sellingPrice} total={s.sellingPrice} color={C.cyan} />
              {!isUS && (
                <WaterfallBar
                  label={`VAT extracted (${effectiveVat}%)`}
                  value={-s.vatAmount} total={s.sellingPrice} color={C.s6}
                  note="Remitted to tax authority — not your revenue"
                />
              )}
              {isUS && (
                <WaterfallBar label="Sales tax (at checkout)" value={0} total={s.sellingPrice} color={C.s6} note="Collected by marketplace — excluded from unit P&L" />
              )}
              <WaterfallBar label="Net revenue" value={s.netRevenue} total={s.sellingPrice} color={C.emerald} isTotal />
              <div style={{ margin: "10px 0", height: 1, background: C.s8 }} />
              <WaterfallBar label="Landed COGS" value={-s.totalCOGS} total={s.sellingPrice} color={C.rose} />
              <WaterfallBar
                label="Channel fees"
                value={-s.channelFees} total={s.sellingPrice} color="#f43f5e88"
                note={!isUS && channelMode === "amazon" ? `Referral on gross $${fmt(s.sellingPrice)} → $${fmt(s.referralActual)}` : undefined}
              />
              <WaterfallBar label="Contribution margin" value={s.contributionMargin} total={s.sellingPrice} color={C.amber} isTotal />
              <div style={{ margin: "10px 0", height: 1, background: C.s8 }} />
              <WaterfallBar label="Marketing (TACOS)" value={-s.adSpendPerUnit} total={s.sellingPrice} color={C.orange} />
              <WaterfallBar label="Net profit" value={s.netProfitPerUnit} total={s.sellingPrice} color={s.netProfitPerUnit >= 0 ? C.emerald : C.rose} isTotal />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 20 }}>
                <div style={{ background: C.s95, borderRadius: 10, padding: 14 }}>
                  <div style={LABEL}>Landed cost breakdown</div>
                  {[
                    ["Factory cost", inputs.unitCost],
                    ["Freight", inputs.freightCost],
                    [`Customs (${inputs.customsDuty}%)`, (inputs.unitCost + inputs.freightCost) * inputs.customsDuty / 100],
                    ["3PL / Prep", inputs.prepFees],
                  ].map(([l, v]) => (
                    <div key={l} style={ROW}><span style={{ fontSize: 12, color: C.s4 }}>{l}</span><span style={{ fontSize: 12, fontWeight: 600, ...MONO }}>${fmt(v)}</span></div>
                  ))}
                  <div style={{ ...ROW, borderBottom: "none" }}><span style={{ fontSize: 12, color: C.light, fontWeight: 600 }}>Total landed</span><span style={{ fontSize: 12, fontWeight: 600, color: C.amber, ...MONO }}>${fmt(s.landedCost)}</span></div>
                </div>
                <div style={{ background: C.s95, borderRadius: 10, padding: 14 }}>
                  <div style={LABEL}>{channelMode === "amazon" ? "Amazon fee detail" : "DTC cost detail"}</div>
                  {channelMode === "amazon" ? (
                    <>
                      <div style={ROW}>
                        <span style={{ fontSize: 12, color: C.s4 }}>Referral ({inputs.referralFee}%{!isUS ? " of gross" : ""})</span>
                        <span style={{ fontSize: 12, fontWeight: 600, ...MONO }}>${fmt(s.referralActual)}</span>
                      </div>
                      <div style={ROW}><span style={{ fontSize: 12, color: C.s4 }}>FBA fee</span><span style={{ fontSize: 12, fontWeight: 600, ...MONO }}>${fmt(inputs.fbaFee)}</span></div>
                      <div style={{ ...ROW, borderBottom: "none" }}><span style={{ fontSize: 12, color: C.s4 }}>Storage</span><span style={{ fontSize: 12, fontWeight: 600, ...MONO }}>${fmt(inputs.storageFee)}</span></div>
                    </>
                  ) : (
                    <>
                      <div style={ROW}><span style={{ fontSize: 12, color: C.s4 }}>Processing ({inputs.paymentProcessing}%)</span><span style={{ fontSize: 12, fontWeight: 600, ...MONO }}>${fmt(inputs.sellingPrice * inputs.paymentProcessing / 100)}</span></div>
                      <div style={ROW}><span style={{ fontSize: 12, color: C.s4 }}>Pick & pack</span><span style={{ fontSize: 12, fontWeight: 600, ...MONO }}>${fmt(inputs.fulfillmentCost)}</span></div>
                      <div style={{ ...ROW, borderBottom: "none" }}><span style={{ fontSize: 12, color: C.s4 }}>Outbound ship</span><span style={{ fontSize: 12, fontWeight: 600, ...MONO }}>${fmt(inputs.shippingToCustomer)}</span></div>
                    </>
                  )}
                  <div style={{ ...ROW, borderTop: `1px solid ${C.s8}`, marginTop: 6 }}><span style={{ fontSize: 12, color: C.light, fontWeight: 600 }}>Total fees</span><span style={{ fontSize: 12, fontWeight: 600, color: C.rose, ...MONO }}>${fmt(s.channelFees)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: EFFICIENCY ── */}
          {activeTab === "efficiency" && (
            <div style={CARD}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Efficiency metrics & benchmarks</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {[{
                  label: "Break-even ACOS", val: isFinite(s.breakEvenAcos) ? s.breakEvenAcos : 0, max: 60,
                  color: isFinite(s.breakEvenAcos) && inputs.adSpendShare <= s.breakEvenAcos ? C.emerald : C.rose,
                  note: isFinite(s.breakEvenAcos) ? `Ads must convert below ${fmt(s.breakEvenAcos, 1)}% ACOS to be profitable` : "Price is $0 — cannot calculate break-even ACOS"
                }, {
                  label: "Current TACOS", val: inputs.adSpendShare, max: 60,
                  color: inputs.adSpendShare < 15 ? C.emerald : inputs.adSpendShare < 25 ? C.amber : C.rose,
                  note: inputs.adSpendShare < 15 ? "Efficient" : inputs.adSpendShare < 25 ? "Moderate — target <15%" : "High — reduce ad dependency"
                }, {
                  label: "Net margin", val: isFinite(s.netMargin) ? s.netMargin : 0, max: 50,
                  color: isFinite(s.netMargin) && s.netMargin > 20 ? C.emerald : isFinite(s.netMargin) && s.netMargin > 10 ? C.amber : C.rose,
                  note: !isFinite(s.netMargin) ? "Enter a selling price to calculate margin" : s.netMargin > 20 ? "Scale-ready" : s.netMargin > 10 ? "Viable — aim for 20%+" : "Below minimum viable threshold"
                }, {
                  label: "ROI on landed cost", val: isFinite(s.roi) ? Math.max(0, s.roi) : 0, max: 200,
                  color: isFinite(s.roi) && s.roi > 80 ? C.emerald : isFinite(s.roi) && s.roi > 40 ? C.amber : C.rose,
                  note: !isFinite(s.roi) ? "Enter a unit cost to calculate ROI" : `${s.roi > 80 ? "Exceptional" : s.roi > 40 ? "Good" : "Low"} — ${fmt(s.roi, 0)}% return on capital deployed`
                }].map(({ label, val, max, color, note }) => (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: C.s4 }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color, ...MONO }}>{fmt(val, 1)}%</span>
                    </div>
                    <ProgressBar value={val} max={max} color={color} />
                    <p style={{ fontSize: 11, color: C.s5, margin: "4px 0 0" }}>{note}</p>
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, paddingTop: 16, borderTop: `1px solid ${C.s8}` }}>
                  {[
                    { label: "Safety buffer", val: `$${fmt(s.bufferAmount)}`, color: C.violet, sub: "per unit reserved" },
                    { label: "Monthly ad spend", val: `$${fmtK(s.adSpendPerUnit * s.monthlyUnits)}`, color: C.orange, sub: `at ${s.monthlyUnits} units/mo` },
                    { label: "Break-even vol.", val: s.netProfitPerUnit <= 0 ? "∞ (loss)" : (typeof s.breakevenUnits === "number" ? fmtK(s.breakevenUnits) : s.breakevenUnits), color: C.cyan, sub: "units to cover COGS" },
                  ].map(({ label, val, color, sub }) => (
                    <div key={label} style={{ background: C.s95, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ ...LABEL, textAlign: "center" }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color, ...MONO }}>{val}</div>
                      <div style={{ fontSize: 10, color: C.s5 }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: CASH FLOW ── */}
          {activeTab === "cashflow" && (
            <div style={CARD}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Inventory cash flow &amp; payback</div>

              {/* Order qty input */}
              <div style={{ marginBottom: 20 }}>
                <label style={LABEL}>Order quantity (units)</label>
                <input
                  type="number"
                  value={orderQty}
                  min={1}
                  onChange={e => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: 160, background: C.s95, border: `1px solid ${C.s7}`, borderRadius: 8,
                    padding: "8px 12px", fontSize: 13, color: "#e2e8f0", outline: "none",
                    fontFamily: "ui-monospace, monospace",
                  }}
                />
              </div>

              {(() => {
                const capitalAtRisk = orderQty * s.totalCOGS;
                const monthlyProfit = s.netProfitPerUnit * s.monthlyUnits;
                const paybackMonths = monthlyProfit > 0 ? capitalAtRisk / monthlyProfit : null;
                const depletionDays = s.monthlyUnits > 0 ? (orderQty / s.monthlyUnits) * 30 : null;
                const depletionDate = depletionDays
                  ? new Date(Date.now() + depletionDays * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—";
                const unitsToBreakEven = s.netProfitPerUnit > 0 ? Math.ceil(capitalAtRisk / s.netProfitPerUnit) : null;

                return (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    {[
                      {
                        label: "Capital at risk",
                        value: `$${fmtK(capitalAtRisk)}`,
                        sub: `${orderQty} units × $${fmt(s.totalCOGS)} COGS`,
                        color: C.rose,
                      },
                      {
                        label: "Payback period",
                        value: paybackMonths != null ? `${fmt(paybackMonths, 1)} mo` : "Never",
                        sub: paybackMonths != null ? `at $${fmtK(monthlyProfit)}/mo profit` : "Unprofitable",
                        color: paybackMonths != null && paybackMonths <= 3 ? C.emerald : paybackMonths != null && paybackMonths <= 6 ? C.amber : C.rose,
                      },
                      {
                        label: "Units to recoup",
                        value: unitsToBreakEven != null ? fmtK(unitsToBreakEven) : "∞",
                        sub: "units to recover COGS investment",
                        color: C.cyan,
                      },
                      {
                        label: "Stockout date",
                        value: depletionDate,
                        sub: depletionDays != null ? `${fmt(depletionDays, 0)} days of inventory` : "—",
                        color: C.amber,
                      },
                    ].map(({ label, value, sub, color }) => (
                      <div key={label} style={{ background: C.s95, borderRadius: 12, padding: "16px 18px" }}>
                        <div style={LABEL}>{label}</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color, ...MONO, marginBottom: 4 }}>{value}</div>
                        <div style={{ fontSize: 10, color: C.s5 }}>{sub}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ marginTop: 20, padding: "12px 16px", background: C.s95, borderRadius: 10, border: `1px solid ${C.s8}`, fontSize: 12, color: C.s4, lineHeight: 1.6 }}>
                <strong style={{ color: "#e2e8f0" }}>Rule of thumb:</strong> Payback under 3 months = aggressive scaling candidate. 3–6 months = healthy. Over 6 months = cash flow risk, consider smaller orders.
              </div>
            </div>
          )}

          {/* ── TAB: PRICING ── */}
          {activeTab === "pricing" && (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 20 }}>Reverse calculator — solve for target margin</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <label style={LABEL}>Target margin (%)</label>
          <input
            type="number" value={targetMargin} min={1} max={99}
            onChange={e => setTargetMargin(Math.min(99, Math.max(1, parseFloat(e.target.value) || 20)))}
            style={{
              width: 100, background: C.s95, border: `1px solid ${C.emerald}`, borderRadius: 8,
              padding: "8px 12px", fontSize: 13, color: "#e2e8f0", outline: "none",
              fontFamily: "ui-monospace, monospace",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 10, padding: 4 }}>
          {[["price", "Find min price"], ["cogs", "Find max COGS"]].map(([val, label]) => (
            <button key={val} onClick={() => setSolveFor(val)} style={{
              padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600,
              cursor: "pointer", border: "none",
              background: solveFor === val ? C.emerald : "transparent",
              color: solveFor === val ? "#fff" : C.s4,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {(() => {
        const M = targetMargin / 100;
        const R = (Number(inputs.referralFee) || 0) / 100;
        const T = (Number(inputs.adSpendShare) || 0) / 100;
        const F = (Number(inputs.fbaFee) || 0) + (Number(inputs.storageFee) || 0);
        const vatFactor = isUS ? 1 : 1 / (1 + (Number(inputs.vatRate) || 0) / 100);
        const COGS = s.totalCOGS;
        const P = Number(inputs.sellingPrice) || 0;
        const denominator = vatFactor - R - T - M;
        let solvedPrice = null, solvedCOGS = null, feasible = true;

        if (solveFor === "price") {
          if (denominator <= 0) feasible = false;
          else solvedPrice = (F + COGS) / denominator;
        } else {
          solvedCOGS = P * denominator - F;
          if (solvedCOGS < 0) feasible = false;
        }

        const currentGap = solveFor === "price"
          ? (solvedPrice != null ? P - solvedPrice : null)
          : (solvedCOGS != null ? solvedCOGS - COGS : null);

        return feasible ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {solveFor === "price" ? (
              <>
                <div style={{ background: C.s95, borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 160 }}>
                  <div style={LABEL}>Required selling price</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.emerald, ...MONO }}>${fmt(solvedPrice)}</div>
                  <div style={{ fontSize: 11, color: C.s5, marginTop: 4 }}>to achieve {targetMargin}% margin</div>
                </div>
                <div style={{ background: C.s95, borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 160 }}>
                  <div style={LABEL}>vs. current price</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: currentGap != null && currentGap >= 0 ? C.emerald : C.rose, ...MONO }}>
                    {currentGap != null ? `${currentGap >= 0 ? "+" : ""}$${fmt(Math.abs(currentGap))}` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: C.s5, marginTop: 4 }}>
                    {currentGap != null && currentGap >= 0 ? "current price exceeds target ✓" : "need to raise price"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: C.s95, borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 160 }}>
                  <div style={LABEL}>Max allowable COGS</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: C.emerald, ...MONO }}>${fmt(solvedCOGS)}</div>
                  <div style={{ fontSize: 11, color: C.s5, marginTop: 4 }}>to achieve {targetMargin}% margin</div>
                </div>
                <div style={{ background: C.s95, borderRadius: 12, padding: "16px 20px", flex: 1, minWidth: 160 }}>
                  <div style={LABEL}>vs. current COGS</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: currentGap != null && currentGap >= 0 ? C.emerald : C.rose, ...MONO }}>
                    {currentGap != null ? `${currentGap >= 0 ? "+" : "-"}$${fmt(Math.abs(currentGap))}` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: C.s5, marginTop: 4 }}>
                    {currentGap != null && currentGap >= 0 ? "room to negotiate up ✓" : "must reduce COGS"}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ padding: "16px 20px", background: "#f43f5e10", border: `1px solid #f43f5e30`, borderRadius: 10, color: C.rose, fontSize: 13 }}>
            {targetMargin}% margin not achievable with current fee structure. Fees + ads alone consume {fmt((R + T) * 100, 1)}% of revenue.
          </div>
        );
      })()}
    </div>

    {/* Price sensitivity table */}
    <div style={CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Price sensitivity</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.s8}` }}>
              {["Price", "Net profit/unit", "Margin %", "Monthly profit", "ROI"].map(h => (
                <th key={h} style={{ padding: "6px 10px", textAlign: "right", color: C.s5, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[-10, -5, -2, -1, 0, 1, 2, 5, 10].map(delta => {
              const P = (Number(inputs.sellingPrice) || 0) + delta;
              if (P <= 0) return null;
              const R = (Number(inputs.referralFee) || 0) / 100;
              const T = (Number(inputs.adSpendShare) || 0) / 100;
              const F = (Number(inputs.fbaFee) || 0) + (Number(inputs.storageFee) || 0);
              const vatFactor = isUS ? 1 : 1 / (1 + (Number(inputs.vatRate) || 0) / 100);
              const netRev = P * vatFactor;
              const fees = P * R + F;
              const adSpend = P * T;
              const profit = netRev - s.totalCOGS - fees - adSpend;
              const margin = (profit / P) * 100;
              const roi = (profit / s.totalCOGS) * 100;
              const monthlyProfit = profit * s.monthlyUnits;
              const isCurrent = delta === 0;
              return (
                <tr key={delta} style={{
                  borderBottom: `1px solid ${C.s8}`,
                  background: isCurrent ? `${C.emerald}10` : "transparent",
                }}>
                  <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: isCurrent ? 700 : 400, color: isCurrent ? C.emerald : "#e2e8f0", ...MONO }}>
                    ${fmt(P)} {isCurrent && <span style={{ fontSize: 9, color: C.s5 }}>current</span>}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: profit >= 0 ? C.emerald : C.rose, ...MONO, fontWeight: 600 }}>
                    {profit >= 0 ? `$${fmt(profit)}` : `-$${fmt(Math.abs(profit))}`}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: margin > 20 ? C.emerald : margin > 10 ? C.amber : C.rose, ...MONO }}>
                    {fmt(margin, 1)}%
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: monthlyProfit >= 0 ? "#e2e8f0" : C.rose, ...MONO }}>
                    {monthlyProfit >= 0 ? `$${fmtK(monthlyProfit)}` : `-$${fmtK(Math.abs(monthlyProfit))}`}
                  </td>
                  <td style={{ padding: "8px 10px", textAlign: "right", color: roi > 50 ? C.emerald : roi > 20 ? C.amber : C.rose, ...MONO }}>
                    {fmt(roi, 0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

          {/* ── TAB: INSIGHTS ── */}
          {activeTab === "insights" && (
            <div style={CARD}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <RefreshCw size={14} color={C.emerald} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>AI-driven strategic insights</span>
                <span style={{ marginLeft: "auto", fontSize: 10, color: C.s5, background: C.s8, borderRadius: 6, padding: "3px 8px" }}>Live · {insights.length} signal{insights.length !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 16 }}>
                <div style={{ padding: "14px 16px", background: "#10b98108", border: "1px solid #10b98120", borderRadius: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.emerald, marginBottom: 8 }}>Price sensitivity</div>
                  <p style={{ fontSize: 12, color: C.s4, margin: 0, lineHeight: 1.6 }}>
                    A $2 price increase → <strong style={{ color: "#e2e8f0" }}>${fmt(inputs.sellingPrice + 2)}</strong> gross would add <strong style={{ color: C.emerald }}>${fmt(2 * (1 - effectiveVat / (100 + effectiveVat)), 2)}/unit</strong> after VAT, or <strong style={{ color: C.emerald }}>${fmtK(2 * (1 - effectiveVat / (100 + effectiveVat)) * inputs.monthlyUnits)}/mo</strong> at current volume.
                  </p>
                </div>
                <div style={{ padding: "14px 16px", background: "#06b6d408", border: "1px solid #06b6d420", borderRadius: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.cyan, marginBottom: 8 }}>Channel comparison</div>
                  <p style={{ fontSize: 12, color: C.s4, margin: 0, lineHeight: 1.6 }}>
                    {channelMode === "amazon"
                      ? `Switching to DTC eliminates the ${inputs.referralFee}% referral fee ($${fmt(s.referralActual)}/unit) but adds outbound shipping & processing. Toggle to DTC mode to find your crossover.`
                      : `Switching to Amazon adds a ${inputs.referralFee}% referral fee but removes outbound shipping costs. Toggle to Amazon FBA mode to compare margins directly.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: PPC LAB ── */}
          {activeTab === "ppc" && (
            <PPCLab
              ppcStr={ppcStr} setPpcStr={setPpcStr}
              ppcSqp={ppcSqp} setPpcSqp={setPpcSqp}
            />
          )}
        </div>
      </div>
    </div>
    {toast && (
      <div style={{
        position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
        background: C.emerald, color: "#fff", padding: "10px 20px", borderRadius: 10,
        fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 16px #00000060",
      }}>
        {toast}
      </div>
    )}
    <style>{`button:focus-visible { outline: none; box-shadow: 0 0 0 2px #10b98166 !important; border-radius: 8px; }`}</style>
    <Analytics />
    </>
  );
}
