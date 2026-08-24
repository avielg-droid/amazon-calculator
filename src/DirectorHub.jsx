import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, Calculator, CheckCircle2,
  Info, Plus, Save, Target, Trash2, TrendingUp
} from "lucide-react";

const C = {
  sky: "#0EA5E9", navy: "#0B1F3A", body: "#334155", muted: "#64748B",
  subtle: "#94A3B8", border: "#E2E8F0", surface: "#F8FAFC", card: "#FFFFFF",
  inset: "#F1F5F9", green: "#16A34A", greenDim: "#F0FDF4",
  amber: "#D97706", amberDim: "#FFFBEB", red: "#DC2626", redDim: "#FEF2F2"
};

const MARKET_OPTIONS = [
  { code: "UK", name: "United Kingdom", currency: "GBP", credit: 81.37, logistics: 5, fx: 1.35 },
  { code: "DE", name: "Germany", currency: "EUR", credit: 92, logistics: 5, fx: 1.17 },
  { code: "FR", name: "France", currency: "EUR", credit: 92, logistics: 5, fx: 1.17 },
  { code: "IT", name: "Italy", currency: "EUR", credit: 92, logistics: 5, fx: 1.17 },
  { code: "ES", name: "Spain", currency: "EUR", credit: 92, logistics: 5, fx: 1.17 },
  { code: "NL", name: "Netherlands", currency: "EUR", credit: 92, logistics: 5, fx: 1.17 },
  { code: "BE", name: "Belgium", currency: "EUR", credit: 92, logistics: 5, fx: 1.17 },
  { code: "SE", name: "Sweden", currency: "SEK", credit: 92, logistics: 5, fx: "" },
  { code: "PL", name: "Poland", currency: "PLN", credit: 92, logistics: 5, fx: "" },
  { code: "JP", name: "Japan", currency: "JPY", credit: 92, logistics: 5, fx: "" },
  { code: "AU", name: "Australia", currency: "AUD", credit: 92, logistics: 5, fx: "" }
];

const SETTINGS_KEY = "danuly-director-sell-in-v2";
const EU_MARKETS = new Set(["DE", "FR", "IT", "ES", "NL", "BE", "SE", "PL"]);

function marketOption(code) {
  return MARKET_OPTIONS.find(function (option) { return option.code === code; }) || MARKET_OPTIONS[0];
}

function createMarket(code, priority) {
  const option = marketOption(code);
  return {
    code: option.code, currency: option.currency, priority: priority || "Secondary",
    targetUsd: "", owner: "", threshold: 5, creditMultiplier: option.credit,
    logisticsPct: option.logistics, fxToUsd: option.fx
  };
}

const DEFAULT_MARKETS = [
  createMarket("UK", "Core"), createMarket("DE", "Core"),
  createMarket("FR", "Standard"), createMarket("IT", "Standard"), createMarket("ES", "Standard")
];

function currentMonth() {
  const date = new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function emptyMonthInput() {
  return { scenario: "mid", weeksElapsed: 1, markets: {} };
}

function loadSettings() {
  const fallback = { month: currentMonth(), markets: DEFAULT_MARKETS, monthlyInputs: {} };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY));
    if (saved && saved.version === 2 && Array.isArray(saved.markets) && saved.markets.length) {
      return { month: saved.month || currentMonth(), markets: saved.markets, monthlyInputs: saved.monthlyInputs || {} };
    }
  } catch {}
  return fallback;
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasValue(value) {
  return value !== "" && value !== null && value !== undefined;
}

function marketInput(monthInput, code) {
  return monthInput.markets[code] || { week1: "", week2: "", week3: "", week4: "", finalGross: "" };
}

export function calculateSellIn(market, input, scenario, weeksElapsed) {
  const observedGross = numeric(input.week1) + numeric(input.week2) + numeric(input.week3) + numeric(input.week4);
  const hasPoData = [input.week1, input.week2, input.week3, input.week4, input.finalGross].some(hasValue);
  const grossSellIn = scenario === "mid"
    ? observedGross / Math.max(1, numeric(weeksElapsed)) * 4
    : hasValue(input.finalGross) ? numeric(input.finalGross) : observedGross;
  const assumptionsReady = numeric(market.creditMultiplier) > 0 && numeric(market.fxToUsd) > 0;
  const netAfterCredits = assumptionsReady ? grossSellIn * numeric(market.creditMultiplier) / 100 : null;
  const netAfterLogistics = netAfterCredits === null ? null : netAfterCredits * (1 - numeric(market.logisticsPct) / 100);
  const netUsd = netAfterLogistics === null ? null : netAfterLogistics * numeric(market.fxToUsd);
  const targetUsd = numeric(market.targetUsd);
  const gapUsd = hasPoData && netUsd !== null && targetUsd ? netUsd - targetUsd : null;
  const achievement = hasPoData && netUsd !== null && targetUsd ? netUsd / targetUsd : null;
  let status = "Needs POs", color = C.muted, background = C.inset;

  if (!targetUsd) {
    status = "Needs forecast"; color = C.amber; background = C.amberDim;
  } else if (!assumptionsReady) {
    status = "Needs FX"; color = C.amber; background = C.amberDim;
  } else if (hasPoData && achievement >= 1) {
    status = "On plan"; color = C.green; background = C.greenDim;
  } else if (hasPoData && achievement >= 1 - numeric(market.threshold) / 100) {
    status = "Watch"; color = C.amber; background = C.amberDim;
  } else if (hasPoData) {
    status = "Off plan"; color = C.red; background = C.redDim;
  }

  return {
    market, input, observedGross, grossSellIn, netAfterCredits, netAfterLogistics,
    netUsd, targetUsd, gapUsd, achievement, hasPoData, status, color, background
  };
}

function rollup(rows) {
  const usable = rows.filter(function (row) { return row.targetUsd || row.hasPoData; });
  const targetUsd = usable.reduce(function (sum, row) { return sum + row.targetUsd; }, 0);
  const netUsd = usable.reduce(function (sum, row) { return sum + (row.netUsd || 0); }, 0);
  return { targetUsd, netUsd, gapUsd: targetUsd ? netUsd - targetUsd : null, achievement: targetUsd ? netUsd / targetUsd : null };
}

function formatMoney(value, currency) {
  if (value === null || !Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return Math.round(value).toLocaleString("en-GB");
  }
}

function formatPercent(value) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function inputStyle(extra) {
  return Object.assign({
    width: "100%", boxSizing: "border-box", minHeight: 34, padding: "7px 9px",
    border: "1px solid " + C.border, borderRadius: 7, background: C.card,
    color: C.body, fontSize: 11, outline: "none"
  }, extra || {});
}

function StepHeader({ number, title, description, complete }) {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start", marginBottom: 15 }}>
      <div style={{
        width: 29, height: 29, flexShrink: 0, borderRadius: 8, display: "flex",
        alignItems: "center", justifyContent: "center", color: "#fff",
        background: complete ? C.green : C.sky, fontSize: 12, fontWeight: 800
      }}>
        {complete ? <CheckCircle2 size={16} /> : number}
      </div>
      <div>
        <h2 style={{ margin: "0 0 4px", color: C.navy, fontSize: 15 }}>{title}</h2>
        <p style={{ margin: 0, color: C.muted, fontSize: 11, lineHeight: 1.55 }}>{description}</p>
      </div>
    </div>
  );
}

function RollupCard({ title, data, accent }) {
  const gapPositive = data.gapUsd !== null && data.gapUsd >= 0;
  return (
    <div style={{ padding: "14px", border: "1px solid " + C.border, borderTop: "3px solid " + accent, borderRadius: 11, background: C.card }}>
      <div style={{ color: C.muted, fontSize: 9, fontWeight: 800, letterSpacing: "0.05em" }}>{title}</div>
      <div style={{ color: C.navy, fontSize: 21, fontWeight: 800, marginTop: 7 }}>{formatMoney(data.netUsd, "USD")}</div>
      <div style={{ color: C.muted, fontSize: 10, marginTop: 4 }}>{formatPercent(data.achievement)} of {formatMoney(data.targetUsd, "USD")}</div>
      <div style={{ color: data.gapUsd === null ? C.muted : gapPositive ? C.green : C.red, fontSize: 10, fontWeight: 750, marginTop: 6 }}>
        {data.gapUsd === null ? "Forecast not set" : (gapPositive ? "+" : "") + formatMoney(data.gapUsd, "USD") + " vs forecast"}
      </div>
    </div>
  );
}

export default function DirectorHub({ onBack }) {
  const initial = useMemo(loadSettings, []);
  const [month, setMonth] = useState(initial.month);
  const [markets, setMarkets] = useState(initial.markets);
  const [monthlyInputs, setMonthlyInputs] = useState(initial.monthlyInputs);
  const [saved, setSaved] = useState(false);

  const monthInput = monthlyInputs[month] || emptyMonthInput();
  const scenario = monthInput.scenario || "mid";
  const weeksElapsed = monthInput.weeksElapsed || 1;
  const targetsComplete = markets.some(function (market) { return numeric(market.targetUsd) > 0; });
  const summaries = useMemo(function () {
    return markets.map(function (market) {
      return calculateSellIn(market, marketInput(monthInput, market.code), scenario, weeksElapsed);
    });
  }, [markets, monthInput, scenario, weeksElapsed]);
  const measured = summaries.filter(function (row) { return row.hasPoData && row.targetUsd && row.netUsd !== null; });
  const attention = measured.filter(function (row) { return row.status !== "On plan"; }).length;
  const onPlan = measured.filter(function (row) { return row.status === "On plan"; }).length;
  const euRollup = rollup(summaries.filter(function (row) { return EU_MARKETS.has(row.market.code); }));
  const portfolioRollup = rollup(summaries);

  function updateMarket(index, field, value) {
    setMarkets(function (current) {
      return current.map(function (market, marketIndex) {
        if (marketIndex !== index) return market;
        if (field === "code") {
          return Object.assign({}, createMarket(value, market.priority), {
            targetUsd: market.targetUsd, owner: market.owner, threshold: market.threshold
          });
        }
        return Object.assign({}, market, { [field]: value });
      });
    });
    setSaved(false);
  }

  function updateMonthField(field, value) {
    setMonthlyInputs(function (current) {
      const existing = current[month] || emptyMonthInput();
      return Object.assign({}, current, { [month]: Object.assign({}, existing, { [field]: value }) });
    });
    setSaved(false);
  }

  function updatePo(code, field, value) {
    setMonthlyInputs(function (current) {
      const existing = current[month] || emptyMonthInput();
      const existingMarket = marketInput(existing, code);
      return Object.assign({}, current, {
        [month]: Object.assign({}, existing, {
          markets: Object.assign({}, existing.markets, { [code]: Object.assign({}, existingMarket, { [field]: value }) })
        })
      });
    });
    setSaved(false);
  }

  function addMarket() {
    const used = new Set(markets.map(function (market) { return market.code; }));
    const option = MARKET_OPTIONS.find(function (market) { return !used.has(market.code); });
    if (!option) return;
    setMarkets(function (current) { return current.concat(createMarket(option.code, "Secondary")); });
    setSaved(false);
  }

  function removeMarket(index) {
    setMarkets(function (current) { return current.filter(function (_, marketIndex) { return marketIndex !== index; }); });
    setSaved(false);
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 2, month, markets, monthlyInputs }));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <main style={{ minHeight: "calc(100vh - 52px)", background: C.surface, padding: "26px 18px 54px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", padding: 0, color: C.muted, cursor: "pointer", fontSize: 12 }}>
          <ArrowLeft size={13} /> Change goal
        </button>

        <div style={{ margin: "18px 0 20px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ maxWidth: 710 }}>
            <span style={{ color: C.sky, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>DIRECTOR SELL-IN CONTROL TOWER</span>
            <h1 style={{ fontSize: 26, color: C.navy, margin: "5px 0 6px", letterSpacing: "-0.025em" }}>Are we on track against Sell-In forecast?</h1>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0 }}>Enter weekly gross Amazon PO values. Danuly applies credits, logistics and FX to calculate net Sell-In in USD and identify markets requiring attention.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.green, fontSize: 10, fontWeight: 700, background: C.greenDim, border: "1px solid #BBF7D0", padding: "7px 10px", borderRadius: 99 }}>
            <Calculator size={13} /> No Vendor report required
          </div>
        </div>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px", marginBottom: 14 }}>
          <StepHeader number="1" title="Set forecasts and market ownership" description="Monthly forecasts are net Sell-In in USD, after credits and logistics." complete={targetsComplete} />
          <label style={{ display: "block", maxWidth: 230, fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 14 }}>
            TARGET MONTH
            <input type="month" value={month} onChange={function (event) { setMonth(event.target.value); setSaved(false); }} style={inputStyle({ marginTop: 5 })} />
          </label>
          <div style={{ overflowX: "auto", border: "1px solid " + C.border, borderRadius: 10 }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: "grid", gridTemplateColumns: "150px 105px 170px 1fr 100px 34px", gap: 8, padding: "8px 10px", background: C.inset, color: C.muted, fontSize: 9, fontWeight: 800, letterSpacing: "0.04em" }}>
                <span>MARKET</span><span>PRIORITY</span><span>MONTHLY FORECAST USD</span><span>OWNER</span><span>ALERT GAP</span><span />
              </div>
              {markets.map(function (market, index) {
                const usedByOthers = new Set(markets.filter(function (_, otherIndex) { return otherIndex !== index; }).map(function (item) { return item.code; }));
                return (
                  <div key={market.code} style={{ display: "grid", gridTemplateColumns: "150px 105px 170px 1fr 100px 34px", gap: 8, padding: "8px 10px", borderTop: index ? "1px solid " + C.border : "none", alignItems: "center" }}>
                    <select aria-label="Market" value={market.code} onChange={function (event) { updateMarket(index, "code", event.target.value); }} style={inputStyle()}>
                      {MARKET_OPTIONS.filter(function (option) { return option.code === market.code || !usedByOthers.has(option.code); }).map(function (option) { return <option key={option.code} value={option.code}>{option.code} · {option.name}</option>; })}
                    </select>
                    <select aria-label={market.code + " priority"} value={market.priority} onChange={function (event) { updateMarket(index, "priority", event.target.value); }} style={inputStyle()}><option>Core</option><option>Standard</option><option>Secondary</option></select>
                    <div style={{ position: "relative" }}><span style={{ position: "absolute", left: 9, top: 9, color: C.muted, fontSize: 10 }}>$</span><input aria-label={market.code + " monthly forecast USD"} type="number" min="0" placeholder="e.g. 250000" value={market.targetUsd} onChange={function (event) { updateMarket(index, "targetUsd", event.target.value); }} style={inputStyle({ paddingLeft: 22 })} /></div>
                    <input aria-label={market.code + " owner"} placeholder="Name or team" value={market.owner} onChange={function (event) { updateMarket(index, "owner", event.target.value); }} style={inputStyle()} />
                    <div style={{ position: "relative" }}><input aria-label={market.code + " alert gap percentage"} type="number" min="0" max="100" value={market.threshold} onChange={function (event) { updateMarket(index, "threshold", event.target.value); }} style={inputStyle({ paddingRight: 24 })} /><span style={{ position: "absolute", right: 9, top: 9, color: C.muted, fontSize: 10 }}>%</span></div>
                    <button type="button" aria-label={"Remove " + market.code} disabled={markets.length === 1} onClick={function () { removeMarket(index); }} style={{ border: "none", background: "transparent", color: C.subtle, cursor: markets.length === 1 ? "default" : "pointer", padding: 5 }}><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          <details style={{ marginTop: 12, border: "1px solid " + C.border, borderRadius: 10, background: C.surface }}>
            <summary style={{ padding: "11px 12px", color: C.body, fontSize: 11, fontWeight: 750, cursor: "pointer" }}>Calculation assumptions · credits, logistics and FX</summary>
            <div style={{ padding: "0 12px 12px", overflowX: "auto" }}>
              <div style={{ minWidth: 650 }}>
                <div style={{ display: "grid", gridTemplateColumns: "100px 100px 1fr 1fr 1fr", gap: 8, padding: "8px 0", color: C.muted, fontSize: 9, fontWeight: 800 }}><span>MARKET</span><span>CURRENCY</span><span>CREDIT MULTIPLIER</span><span>LOGISTICS</span><span>FX TO USD</span></div>
                {markets.map(function (market, index) {
                  return (
                    <div key={market.code} style={{ display: "grid", gridTemplateColumns: "100px 100px 1fr 1fr 1fr", gap: 8, alignItems: "center", padding: "6px 0", borderTop: "1px solid " + C.border }}>
                      <strong style={{ color: C.navy, fontSize: 11 }}>{market.code}</strong>
                      <input aria-label={market.code + " currency"} value={market.currency} onChange={function (event) { updateMarket(index, "currency", event.target.value.toUpperCase()); }} style={inputStyle()} />
                      <div style={{ position: "relative" }}><input aria-label={market.code + " credit multiplier"} type="number" min="0" max="100" step="0.01" value={market.creditMultiplier} onChange={function (event) { updateMarket(index, "creditMultiplier", event.target.value); }} style={inputStyle({ paddingRight: 24 })} /><span style={{ position: "absolute", right: 9, top: 9, fontSize: 10, color: C.muted }}>%</span></div>
                      <div style={{ position: "relative" }}><input aria-label={market.code + " logistics percentage"} type="number" min="0" max="100" step="0.1" value={market.logisticsPct} onChange={function (event) { updateMarket(index, "logisticsPct", event.target.value); }} style={inputStyle({ paddingRight: 24 })} /><span style={{ position: "absolute", right: 9, top: 9, fontSize: 10, color: C.muted }}>%</span></div>
                      <input aria-label={market.code + " FX to USD"} type="number" min="0" step="0.0001" placeholder="Required" value={market.fxToUsd} onChange={function (event) { updateMarket(index, "fxToUsd", event.target.value); }} style={inputStyle()} />
                    </div>
                  );
                })}
              </div>
              <p style={{ margin: "10px 0 0", color: C.muted, fontSize: 9, lineHeight: 1.5 }}>Defaults follow your calculator: UK 81.37% credits, 5% logistics and 1.35 FX; EUR markets 92%, 5% and 1.17. Update FX when your planning rate changes.</p>
            </div>
          </details>

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
            <button type="button" onClick={addMarket} disabled={markets.length >= MARKET_OPTIONS.length} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid " + C.border, borderRadius: 8, background: C.card, color: C.body, padding: "8px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}><Plus size={13} /> Add market</button>
            <button type="button" onClick={saveProgress} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, background: saved ? C.green : C.sky, color: "#fff", padding: "8px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}><Save size={13} /> {saved ? "Progress saved" : "Save progress"}</button>
          </div>
        </section>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px", marginBottom: 14 }}>
          <StepHeader number="2" title="Enter Amazon PO values" description="Enter gross Sell-In in each market's local currency. Mid-month projects a four-week month; closed month uses the final total." complete={measured.length > 0} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginBottom: 13 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>SCENARIO<select value={scenario} onChange={function (event) { updateMonthField("scenario", event.target.value); }} style={inputStyle({ marginTop: 5 })}><option value="mid">Mid-month estimate</option><option value="closed">Closed month</option></select></label>
            {scenario === "mid" ? <label style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>WEEKS ELAPSED<select value={weeksElapsed} onChange={function (event) { updateMonthField("weeksElapsed", Number(event.target.value)); }} style={inputStyle({ marginTop: 5 })}><option value={1}>1 week</option><option value={2}>2 weeks</option><option value={3}>3 weeks</option><option value={4}>4 weeks</option></select></label> : null}
          </div>
          <div style={{ overflowX: "auto", border: "1px solid " + C.border, borderRadius: 10 }}>
            <div style={{ minWidth: 900 }}>
              <div style={{ display: "grid", gridTemplateColumns: "90px repeat(4, 1fr) 1.15fr", gap: 8, padding: "9px 10px", background: C.inset, color: C.muted, fontSize: 9, fontWeight: 800 }}><span>MARKET</span><span>WEEK 1 PO</span><span>WEEK 2 PO</span><span>WEEK 3 PO</span><span>WEEK 4 PO</span><span>FINAL GROSS OVERRIDE</span></div>
              {markets.map(function (market, index) {
                const input = marketInput(monthInput, market.code);
                return (
                  <div key={market.code} style={{ display: "grid", gridTemplateColumns: "90px repeat(4, 1fr) 1.15fr", gap: 8, alignItems: "center", padding: "9px 10px", borderTop: index ? "1px solid " + C.border : "none" }}>
                    <div><strong style={{ color: C.navy, fontSize: 11 }}>{market.code}</strong><div style={{ color: C.muted, fontSize: 9 }}>{market.currency}</div></div>
                    {["week1", "week2", "week3", "week4"].map(function (field, weekIndex) { return <input key={field} aria-label={market.code + " week " + (weekIndex + 1) + " PO"} type="number" min="0" placeholder="0" value={input[field]} onChange={function (event) { updatePo(market.code, field, event.target.value); }} style={inputStyle()} />; })}
                    <input aria-label={market.code + " final gross override"} type="number" min="0" placeholder={scenario === "closed" ? "Optional total" : "Used when closed"} value={input.finalGross} onChange={function (event) { updatePo(market.code, "finalGross", event.target.value); }} disabled={scenario === "mid"} style={inputStyle({ background: scenario === "mid" ? C.inset : C.card, opacity: scenario === "mid" ? 0.6 : 1 })} />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 7, alignItems: "flex-start", color: C.muted, fontSize: 9, lineHeight: 1.5 }}><Info size={13} color={C.sky} style={{ flexShrink: 0 }} />Mid-month projection = observed PO total ÷ weeks elapsed × 4. In a closed month, the final override takes priority; otherwise Week 1–4 are summed.</div>
        </section>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px" }}>
          <StepHeader number="3" title="Review Sell-In performance" description="All portfolio comparisons use net Sell-In USD after credits, logistics and FX." complete={measured.length > 0} />
          {measured.length === 0 ? (
            <div style={{ padding: "22px", borderRadius: 10, background: C.inset, textAlign: "center" }}><TrendingUp size={20} color={C.subtle} /><p style={{ color: C.body, fontSize: 12, fontWeight: 700, margin: "8px 0 3px" }}>Your Sell-In Control Tower will appear here</p><p style={{ color: C.muted, fontSize: 10, margin: 0 }}>Enter at least one market forecast and PO value.</p></div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, marginBottom: 13 }}>
                <RollupCard title="PORTFOLIO NET SELL-IN USD" data={portfolioRollup} accent={C.sky} />
                <RollupCard title="EU NET SELL-IN USD" data={euRollup} accent="#7C3AED" />
                <div style={{ padding: "14px", border: "1px solid #BBF7D0", borderTop: "3px solid " + C.green, background: C.greenDim, borderRadius: 11 }}><CheckCircle2 size={15} color={C.green} /><div style={{ color: C.green, fontSize: 22, fontWeight: 800, marginTop: 7 }}>{onPlan}</div><div style={{ color: C.muted, fontSize: 10 }}>Markets on plan</div></div>
                <div style={{ padding: "14px", border: "1px solid #FECACA", borderTop: "3px solid " + C.red, background: C.redDim, borderRadius: 11 }}><AlertTriangle size={15} color={C.red} /><div style={{ color: C.red, fontSize: 22, fontWeight: 800, marginTop: 7 }}>{attention}</div><div style={{ color: C.muted, fontSize: 10 }}>Markets requiring attention</div></div>
              </div>
              <div style={{ overflowX: "auto", border: "1px solid " + C.border, borderRadius: 10 }}>
                <div style={{ minWidth: 980 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "90px 1.1fr 1.1fr 1.1fr 1.1fr 85px 1.1fr 100px", gap: 8, padding: "9px 11px", background: C.inset, color: C.muted, fontSize: 9, fontWeight: 800 }}><span>MARKET</span><span>OBSERVED GROSS</span><span>PROJECTED / FINAL</span><span>NET SELL-IN USD</span><span>FORECAST USD</span><span>ACHIEVEMENT</span><span>GAP USD</span><span>STATUS</span></div>
                  {summaries.map(function (row, index) {
                    return (
                      <div key={row.market.code} style={{ display: "grid", gridTemplateColumns: "90px 1.1fr 1.1fr 1.1fr 1.1fr 85px 1.1fr 100px", gap: 8, alignItems: "center", padding: "11px", borderTop: index ? "1px solid " + C.border : "none", fontSize: 11 }}>
                        <div><strong style={{ color: C.navy }}>{row.market.code}</strong><div style={{ color: C.muted, fontSize: 9, marginTop: 2 }}>{row.market.priority}</div></div>
                        <span style={{ color: C.body }}>{row.hasPoData ? formatMoney(row.observedGross, row.market.currency) : "—"}</span>
                        <span style={{ color: C.body, fontWeight: 650 }}>{row.hasPoData ? formatMoney(row.grossSellIn, row.market.currency) : "—"}</span>
                        <span style={{ color: C.navy, fontWeight: 750 }}>{row.hasPoData ? formatMoney(row.netUsd, "USD") : "—"}</span>
                        <span style={{ color: C.body }}>{row.targetUsd ? formatMoney(row.targetUsd, "USD") : "—"}</span>
                        <span style={{ color: row.achievement === null ? C.muted : row.achievement >= 1 ? C.green : C.red, fontWeight: 700 }}>{formatPercent(row.achievement)}</span>
                        <span style={{ color: row.gapUsd === null ? C.muted : row.gapUsd >= 0 ? C.green : C.red, fontWeight: 700 }}>{row.gapUsd === null ? "—" : (row.gapUsd > 0 ? "+" : "") + formatMoney(row.gapUsd, "USD")}</span>
                        <span style={{ justifySelf: "start", padding: "5px 8px", borderRadius: 99, color: row.color, background: row.background, fontSize: 9, fontWeight: 800 }}>{row.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#F0F9FF", border: "1px solid #BAE6FD", color: C.body, fontSize: 10, lineHeight: 1.55 }}>For an off-plan market, the next diagnostic should compare Sell-In with consumer Sell-Out and Amazon inventory. Traffic is requested only when weak Sell-Out requires a deeper demand or conversion explanation.</div>
            </>
          )}
        </section>

        <div style={{ marginTop: 14, padding: "12px 14px", background: C.card, border: "1px solid " + C.border, borderRadius: 10, display: "flex", gap: 9, alignItems: "flex-start" }}><Target size={15} color={C.sky} style={{ marginTop: 1 }} /><p style={{ margin: 0, fontSize: 10, lineHeight: 1.55, color: C.muted }}>Forecasts, assumptions and PO inputs are stored only in this browser when you select Save progress. No Amazon data is sent to a server.</p></div>
      </div>
    </main>
  );
}
