import { useState, useMemo, useCallback } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  TrendingUp, AlertTriangle, DollarSign, Package, BarChart3,
  ShieldCheck, RefreshCw, Info, Zap, Target, ArrowUpRight,
  ArrowDownRight, Activity, Globe, Flag
} from "lucide-react";

const C = {
  emerald: "#10b981", cyan: "#06b6d4", orange: "#f97316",
  rose: "#f43f5e", violet: "#8b5cf6", amber: "#f59e0b",
  s4: "#94a3b8", s5: "#64748b", s6: "#475569",
  s7: "#334155", s8: "#1e293b", s9: "#0f172a", s95: "#020617",
};

const fmt = (n, d = 2) => isFinite(n) ? n.toFixed(d) : "—";
const fmtK = n => isFinite(n) ? (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : Math.round(n).toString()) : "—";

const LABEL = { fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.s5, marginBottom: 4, display: "block" };
const ROW = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.s8}` };
const CARD = { background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 16, padding: "20px 24px" };
const MONO = { fontFamily: "ui-monospace, monospace" };

function InputField({ label, name, value, onChange, prefix, suffix, highlight, disabled, dimNote, tooltip, error }) {
  const [focused, setFocused] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  return (
    <div style={{ marginBottom: 12, opacity: disabled ? 0.45 : 1 }}>
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
            fontSize: 13, color: "#e2e8f0", outline: "none", boxSizing: "border-box",
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

function StatCard({ label, value, color, big }) {
  return (
    <div style={{
      background: big ? `${color || C.emerald}10` : C.s9,
      border: `1px solid ${big ? (color || C.emerald) + "40" : C.s8}`,
      borderRadius: 14, padding: big ? "18px 20px" : "14px 16px",
    }}>
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.s5, display: "block", marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: big ? 26 : 20, fontWeight: 700, color: color || C.emerald, ...MONO, lineHeight: 1.1 }}>{value}</span>
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
  const pct = Math.abs(value / total) * 100;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: C.s4, width: 150, flexShrink: 0, textAlign: "right" }}>{label}</span>
        <div style={{ flex: 1, height: isTotal ? 8 : 6, background: C.s8, borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color, ...MONO, width: 58, textAlign: "right" }}>
          {value >= 0 ? `$${fmt(value)}` : `-$${fmt(Math.abs(value))}`}
        </span>
      </div>
      {note && <p style={{ fontSize: 10, color: C.cyan, margin: "2px 0 0 160px", fontStyle: "italic" }}>{note}</p>}
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

const DEFAULTS = {
  sellingPrice: 49.99, unitCost: 12.00, freightCost: 2.50,
  customsDuty: 5, prepFees: 1.50, safetyBuffer: 2, vatRate: 20,
  referralFee: 15, fbaFee: 6.50, storageFee: 0.80,
  paymentProcessing: 2.9, fulfillmentCost: 3.00, shippingToCustomer: 7.00,
  adSpendShare: 25, monthlyUnits: 500
};

export default function App() {
  const [channelMode, setChannelMode] = useState("amazon"); // amazon | dtc
  const [marketMode, setMarketMode] = useState("intl");    // us | intl
  const [inputs, setInputs] = useState(DEFAULTS);
  const [activeTab, setActiveTab] = useState("breakdown");
  const [inputErrors, setInputErrors] = useState({});

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
  const effectiveVat = isUS ? 0 : inputs.vatRate;

  const s = useMemo(() => {
    const { sellingPrice, unitCost, freightCost, customsDuty, prepFees,
      safetyBuffer, referralFee, fbaFee, storageFee,
      paymentProcessing, fulfillmentCost, shippingToCustomer,
      adSpendShare, monthlyUnits } = inputs;

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

  const tabBtn = t => ({
    padding: "7px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.2s",
    background: activeTab === t ? C.emerald : "transparent",
    color: activeTab === t ? "#fff" : C.s4,
  });

  const modeBtn = (cur, val) => ({
    padding: "7px 18px", borderRadius: 9, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.2s",
    background: cur === val ? C.emerald : "transparent",
    color: cur === val ? "#fff" : C.s4,
  });

  const marketBtn = (val, Icon, label) => ({
    padding: "7px 16px", borderRadius: 9, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.2s",
    background: marketMode === val ? (val === "us" ? "#3b82f6" : C.violet) : "transparent",
    color: marketMode === val ? "#fff" : C.s4,
    display: "flex", alignItems: "center", gap: 6,
  });

  return (
    <>
    <div style={{ background: C.s95, minHeight: "100vh", padding: "24px 16px", fontFamily: "ui-sans-serif, system-ui, sans-serif", color: "#e2e8f0" }}>
      <h2 className="sr-only">Omni-Channel Profit Engine — global unit economics calculator</h2>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, background: "#10b98120", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={16} color={C.emerald} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, background: "linear-gradient(90deg, #10b981, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Omni-Channel Profit Engine
              </h1>
            </div>
            <p style={{ fontSize: 12, color: C.s5, margin: 0 }}>Strategic unit economics & multi-channel margin simulator</p>
          </div>

          {/* Two toggle groups */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {/* Market toggle */}
            <div style={{ display: "flex", background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 12, padding: 4, gap: 4, alignItems: "center" }}>
              <button style={marketBtn("us")} onClick={() => setMarketMode("us")}>
                <Flag size={12} />US Marketplace
              </button>
              <button style={marketBtn("intl")} onClick={() => setMarketMode("intl")}>
                <Globe size={12} />International (VAT)
              </button>
            </div>
            {/* Channel toggle */}
            <div style={{ display: "flex", background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 12, padding: 4, gap: 4 }}>
              <button style={modeBtn(channelMode, "amazon")} onClick={() => setChannelMode("amazon")}>Amazon FBA</button>
              <button style={modeBtn(channelMode, "dtc")} onClick={() => setChannelMode("dtc")}>DTC / Shopify</button>
            </div>
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
        <div style={{ flex: "0 0 290px", minWidth: 260, display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={CARD}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.emerald }}>
              <Package size={14} />Core Product & Tax
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
              <InputField label="Freight" name="freightCost" value={inputs.freightCost} onChange={handleChange} prefix="$" tooltip="Cost to ship one unit from supplier to Amazon FBA warehouse." error={inputErrors.freightCost} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <InputField label="Customs duty" name="customsDuty" value={inputs.customsDuty} onChange={handleChange} suffix="%" tooltip="Import duty as a % of product cost. Varies by HS code and country." error={inputErrors.customsDuty} />
              <InputField label="3PL / Prep" name="prepFees" value={inputs.prepFees} onChange={handleChange} prefix="$" tooltip="Per-unit prep/labeling cost (bubble wrap, poly bags, FNSKU stickers)." error={inputErrors.prepFees} />
            </div>
            <InputField label="Safety buffer" name="safetyBuffer" value={inputs.safetyBuffer} onChange={handleChange} suffix="%" tooltip="Extra % added to COGS as buffer for damages, shrinkage, or hidden costs." error={inputErrors.safetyBuffer} />
          </div>

          <div style={CARD}>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.cyan }}>
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
              <TrendingUp size={14} />Marketing & Scale
            </div>
            <InputField label="TACOS (ad spend / revenue)" name="adSpendShare" value={inputs.adSpendShare} onChange={handleChange} suffix="%" highlight={C.orange} tooltip="Total ad spend as % of revenue (TACOS). Includes PPC and external ads." error={inputErrors.adSpendShare} />
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

          {/* KPI row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
            <StatCard label="Net profit / unit" value={`$${fmt(s.netProfitPerUnit)}`} color={s.netProfitPerUnit >= 0 ? C.emerald : C.rose} />
            <StatCard label="Net margin" value={`${fmt(s.netMargin, 1)}%`} color={s.netMargin > 20 ? C.emerald : s.netMargin > 10 ? C.amber : C.rose} />
            <StatCard label="ROI on COGS" value={`${fmt(s.roi, 0)}%`} color={C.cyan} />
            <StatCard label="Monthly profit" value={`$${fmtK(s.totalMonthlyProfit)}`} color={C.emerald} big />
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 6, background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 12, padding: 4, width: "fit-content" }}>
            {["breakdown", "efficiency", "insights"].map(t => (
              <button key={t} style={tabBtn(t)} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* ── TAB: BREAKDOWN ── */}
          {activeTab === "breakdown" && (
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Unit P&L waterfall</span>
                <span style={{ fontSize: 11, color: C.s5, display: "flex", alignItems: "center", gap: 4 }}>
                  <Info size={12} />{isUS ? "US: pre-tax analysis" : "Intl: post-VAT analysis"}
                </span>
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
                  <div style={{ ...ROW, borderBottom: "none" }}><span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>Total landed</span><span style={{ fontSize: 12, fontWeight: 600, color: C.amber, ...MONO }}>${fmt(s.landedCost)}</span></div>
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
                  <div style={{ ...ROW, borderTop: `1px solid ${C.s8}`, marginTop: 6 }}><span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600 }}>Total fees</span><span style={{ fontSize: 12, fontWeight: 600, color: C.rose, ...MONO }}>${fmt(s.channelFees)}</span></div>
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
                  label: "Break-even ACOS", val: s.breakEvenAcos, max: 60,
                  color: inputs.adSpendShare <= s.breakEvenAcos ? C.emerald : C.rose,
                  note: `Ads must convert below ${fmt(s.breakEvenAcos, 1)}% ACOS to be profitable`
                }, {
                  label: "Current TACOS", val: inputs.adSpendShare, max: 60,
                  color: inputs.adSpendShare < 15 ? C.emerald : inputs.adSpendShare < 25 ? C.amber : C.rose,
                  note: inputs.adSpendShare < 15 ? "Efficient" : inputs.adSpendShare < 25 ? "Moderate — target <15%" : "High — reduce ad dependency"
                }, {
                  label: "Net margin", val: s.netMargin, max: 50,
                  color: s.netMargin > 20 ? C.emerald : s.netMargin > 10 ? C.amber : C.rose,
                  note: s.netMargin > 20 ? "Scale-ready" : s.netMargin > 10 ? "Viable — aim for 20%+" : "Below minimum viable threshold"
                }, {
                  label: "ROI on landed cost", val: Math.max(0, s.roi), max: 200,
                  color: s.roi > 80 ? C.emerald : s.roi > 40 ? C.amber : C.rose,
                  note: `${s.roi > 80 ? "Exceptional" : s.roi > 40 ? "Good" : "Low"} — ${fmt(s.roi, 0)}% return on capital deployed`
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
                    { label: "Break-even vol.", val: s.breakevenUnits, color: C.cyan, sub: "units to cover COGS" },
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
        </div>
      </div>
    </div>
    <Analytics />
    </>
  );
}
