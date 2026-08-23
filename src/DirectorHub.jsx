import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, Globe2,
  Plus, Save, Target, Trash2, TrendingUp, Upload
} from "lucide-react";
import { parseCsv, parseNum, parseXlsx } from "./parseCsv.js";

const C = {
  sky: "#0EA5E9",
  navy: "#0B1F3A",
  body: "#334155",
  muted: "#64748B",
  subtle: "#94A3B8",
  border: "#E2E8F0",
  surface: "#F8FAFC",
  card: "#FFFFFF",
  inset: "#F1F5F9",
  green: "#16A34A",
  greenDim: "#F0FDF4",
  amber: "#D97706",
  amberDim: "#FFFBEB",
  red: "#DC2626",
  redDim: "#FEF2F2"
};

const MARKET_OPTIONS = [
  { code: "UK", name: "United Kingdom", currency: "GBP", symbol: "£", aliases: ["uk", "united kingdom", "unitedkingdom"] },
  { code: "DE", name: "Germany", currency: "EUR", symbol: "€", aliases: ["de", "germany"] },
  { code: "FR", name: "France", currency: "EUR", symbol: "€", aliases: ["fr", "france"] },
  { code: "IT", name: "Italy", currency: "EUR", symbol: "€", aliases: ["it", "italy"] },
  { code: "ES", name: "Spain", currency: "EUR", symbol: "€", aliases: ["es", "spain"] },
  { code: "NL", name: "Netherlands", currency: "EUR", symbol: "€", aliases: ["nl", "netherlands"] },
  { code: "BE", name: "Belgium", currency: "EUR", symbol: "€", aliases: ["be", "belgium"] },
  { code: "SE", name: "Sweden", currency: "SEK", symbol: "kr", aliases: ["se", "sweden"] },
  { code: "PL", name: "Poland", currency: "PLN", symbol: "zł", aliases: ["pl", "poland"] },
  { code: "JP", name: "Japan", currency: "JPY", symbol: "¥", aliases: ["jp", "japan"] },
  { code: "AU", name: "Australia", currency: "AUD", symbol: "A$", aliases: ["au", "australia"] }
];

const DEFAULT_MARKETS = [
  { code: "UK", currency: "GBP", priority: "Core", target: "", owner: "", threshold: 5 },
  { code: "DE", currency: "EUR", priority: "Core", target: "", owner: "", threshold: 5 },
  { code: "FR", currency: "EUR", priority: "Standard", target: "", owner: "", threshold: 5 },
  { code: "IT", currency: "EUR", priority: "Standard", target: "", owner: "", threshold: 5 },
  { code: "ES", currency: "EUR", priority: "Standard", target: "", owner: "", threshold: 5 }
];

const SETTINGS_KEY = "danuly-director-settings-v1";

function currentMonth() {
  const date = new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function loadSettings() {
  const fallback = { month: currentMonth(), salesBasis: "ordered", markets: DEFAULT_MARKETS };
  if (typeof window === "undefined") return fallback;
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY));
    if (saved && saved.version === 1 && Array.isArray(saved.markets) && saved.markets.length) {
      return { month: saved.month || currentMonth(), salesBasis: saved.salesBasis || "ordered", markets: saved.markets };
    }
  } catch {}
  return fallback;
}

function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/[_:()#%]/g, " ").replace(/\s+/g, " ").trim();
}

function findHeader(headers, terms) {
  return headers.find(function (header) {
    const normalized = normalizeHeader(header);
    return terms.some(function (term) { return normalized.includes(term); });
  });
}

function getSalesHeader(headers, basis) {
  const ordered = ["ordered revenue", "ordered product sales"];
  const dispatched = ["dispatched revenue", "dispatched cogs", "shipped revenue", "shipped cogs"];
  return findHeader(headers, basis === "ordered" ? ordered : dispatched);
}

function validateSalesReport(parsed, basis) {
  const asin = findHeader(parsed.headers, ["asin", "amazon standard identification"]);
  if (!asin) return "This is not an ASIN-level Sales report.";
  if (!getSalesHeader(parsed.headers, basis)) {
    return basis === "ordered"
      ? "Ordered revenue was not found. Export the Sales report with ordered metrics, or change the sales basis."
      : "Dispatched revenue or COGS was not found. Export the Sales report with dispatched metrics, or change the sales basis.";
  }
  return null;
}

function dateFromParts(day, month, year) {
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function getReportPeriod(metadata, fileName) {
  const entry = Object.entries(metadata || {}).find(function (item) {
    return item[0].toLowerCase() === "viewing range";
  });
  const source = entry ? entry[1] : fileName;
  const match = String(source || "").match(/(\d{2})[\/-](\d{2})[\/-](\d{4}).*?(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  if (!match) return null;
  const start = dateFromParts(match[1], match[2], match[3]);
  const end = dateFromParts(match[4], match[5], match[6]);
  return {
    start: start,
    end: end,
    month: end.toISOString().slice(0, 7),
    label: String(match[1]).padStart(2, "0") + "/" + String(match[2]).padStart(2, "0") + "/" + match[3]
      + " – " + String(match[4]).padStart(2, "0") + "/" + String(match[5]).padStart(2, "0") + "/" + match[6]
  };
}

function detectMarket(metadata, fileName) {
  const countryEntry = Object.entries(metadata || {}).find(function (item) {
    return ["countries", "country", "marketplace"].includes(item[0].toLowerCase());
  });
  const haystack = ((countryEntry ? countryEntry[1] : "") + " " + fileName)
    .toLowerCase().replace(/[_-]/g, " ");
  const match = MARKET_OPTIONS.find(function (market) {
    return market.aliases.some(function (alias) {
      return new RegExp("(^|[^a-z])" + alias.replace(/\s/g, "\\s*") + "([^a-z]|$)").test(haystack);
    });
  });
  return match ? match.code : "";
}

function readReport(file, basis) {
  return new Promise(function (resolve) {
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      resolve({ id: file.name + file.lastModified, file: file, error: "Upload a CSV or Excel file." });
      return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = lower.endsWith(".csv") ? parseCsv(event.target.result) : parseXlsx(event.target.result);
        const issue = validateSalesReport(parsed, basis);
        if (issue) {
          resolve({ id: file.name + file.lastModified, file: file, error: issue });
          return;
        }
        const revenueHeader = getSalesHeader(parsed.headers, basis);
        const revenue = parsed.rows.reduce(function (total, row) {
          return total + parseNum(row[revenueHeader]);
        }, 0);
        resolve({
          id: file.name + file.lastModified,
          file: file,
          rows: parsed.rows.length,
          market: detectMarket(parsed.metadata, file.name),
          period: getReportPeriod(parsed.metadata, file.name),
          revenue: revenue,
          revenueHeader: revenueHeader,
          error: null
        });
      } catch (error) {
        resolve({ id: file.name + file.lastModified, file: file, error: error.message || "The file could not be read." });
      }
    };
    if (lower.endsWith(".csv")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  });
}

function marketInfo(code) {
  return MARKET_OPTIONS.find(function (market) { return market.code === code; }) || MARKET_OPTIONS[0];
}

function formatMoney(value, currency) {
  if (!Number.isFinite(value)) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency", currency: currency, maximumFractionDigits: 0
    }).format(value);
  } catch {
    return Math.round(value).toLocaleString("en-GB");
  }
}

function projectionFor(upload, targetMonth) {
  if (!upload || !upload.period || upload.period.month !== targetMonth) return null;
  const start = upload.period.start;
  const end = upload.period.end;
  if (start.getUTCDate() !== 1 || start.getUTCMonth() !== end.getUTCMonth()) return null;
  const daysInMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  const elapsed = end.getUTCDate();
  return elapsed >= daysInMonth ? upload.revenue : upload.revenue * daysInMonth / elapsed;
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

export default function DirectorHub({ onBack }) {
  const initial = useMemo(loadSettings, []);
  const [month, setMonth] = useState(initial.month);
  const [salesBasis, setSalesBasis] = useState(initial.salesBasis);
  const [markets, setMarkets] = useState(initial.markets);
  const [uploads, setUploads] = useState([]);
  const [saved, setSaved] = useState(false);
  const [reading, setReading] = useState(false);

  const targetsComplete = markets.some(function (market) { return Number(market.target) > 0; });
  const acceptedUploads = uploads.filter(function (upload) { return !upload.error; });
  const configuredUploads = acceptedUploads.filter(function (upload) { return Boolean(upload.market); });

  const summaries = useMemo(function () {
    return markets.map(function (market) {
      const upload = configuredUploads.find(function (item) { return item.market === market.code; });
      const target = Number(market.target) || 0;
      const projected = projectionFor(upload, month);
      const gap = projected != null && target ? projected - target : null;
      const performance = projected != null && target ? projected / target : null;
      let status = "Needs data";
      let color = C.muted;
      let background = C.inset;
      if (upload && upload.period && upload.period.month !== month) {
        status = "Wrong month";
        color = C.amber;
        background = C.amberDim;
      } else if (upload && !target) {
        status = "Needs target";
        color = C.amber;
        background = C.amberDim;
      } else if (upload && projected == null) {
        status = "Actual only";
        color = C.sky;
        background = "#F0F9FF";
      } else if (performance != null && performance >= 1) {
        status = "On plan";
        color = C.green;
        background = C.greenDim;
      } else if (performance != null && performance >= 1 - Number(market.threshold || 0) / 100) {
        status = "Watch";
        color = C.amber;
        background = C.amberDim;
      } else if (performance != null) {
        status = "Off plan";
        color = C.red;
        background = C.redDim;
      }
      return { market: market, upload: upload, target: target, projected: projected, gap: gap, status: status, color: color, background: background };
    });
  }, [markets, configuredUploads, month]);

  const measured = summaries.filter(function (item) { return item.projected != null && item.target; });
  const offPlan = measured.filter(function (item) { return item.status === "Off plan"; }).length;
  const onPlan = measured.filter(function (item) { return item.status === "On plan"; }).length;

  function updateMarket(index, field, value) {
    setSaved(false);
    setMarkets(function (current) {
      return current.map(function (market, marketIndex) {
        if (marketIndex !== index) return market;
        if (field === "code") {
          const option = marketInfo(value);
          return Object.assign({}, market, { code: value, currency: option.currency });
        }
        return Object.assign({}, market, { [field]: value });
      });
    });
  }

  function addMarket() {
    const used = new Set(markets.map(function (market) { return market.code; }));
    const option = MARKET_OPTIONS.find(function (market) { return !used.has(market.code); });
    if (!option) return;
    setMarkets(function (current) {
      return current.concat({ code: option.code, currency: option.currency, priority: "Secondary", target: "", owner: "", threshold: 5 });
    });
    setSaved(false);
  }

  function removeMarket(index) {
    setMarkets(function (current) { return current.filter(function (_, marketIndex) { return marketIndex !== index; }); });
    setSaved(false);
  }

  function saveSettings() {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, month: month, salesBasis: salesBasis, markets: markets }));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setReading(true);
    const results = await Promise.all(files.map(function (file) { return readReport(file, salesBasis); }));
    setUploads(function (current) {
      const incomingIds = new Set(results.map(function (result) { return result.id; }));
      return current.filter(function (upload) { return !incomingIds.has(upload.id); }).concat(results);
    });
    setReading(false);
  }

  function assignUpload(id, market) {
    setUploads(function (current) {
      return current.map(function (upload) {
        return upload.id === id ? Object.assign({}, upload, { market: market }) : upload;
      });
    });
  }

  function removeUpload(id) {
    setUploads(function (current) { return current.filter(function (upload) { return upload.id !== id; }); });
  }

  return (
    <main style={{ minHeight: "calc(100vh - 52px)", background: C.surface, padding: "26px 18px 54px" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>
        <button type="button" onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6, background: "transparent",
          border: "none", padding: 0, color: C.muted, cursor: "pointer", fontSize: 12
        }}>
          <ArrowLeft size={13} /> Change goal
        </button>

        <div style={{ margin: "18px 0 20px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ maxWidth: 670 }}>
            <span style={{ color: C.sky, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>DIRECTOR CONTROL TOWER</span>
            <h1 style={{ fontSize: 26, color: C.navy, margin: "5px 0 6px", letterSpacing: "-0.025em" }}>Where are we off plan?</h1>
            <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
              Start with one Sales report per market. Danuly identifies which markets need attention before asking for Traffic or Inventory.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.green, fontSize: 10, fontWeight: 700, background: C.greenDim, border: "1px solid #BBF7D0", padding: "7px 10px", borderRadius: 99 }}>
            <FileSpreadsheet size={13} /> Sales first · exceptions next
          </div>
        </div>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px", marginBottom: 14 }}>
          <StepHeader number="1" title="Set the monthly plan" description="Enter only the targets and owners you already manage. Settings stay in this browser." complete={targetsComplete} />

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>
              TARGET MONTH
              <input type="month" value={month} onChange={function (event) { setMonth(event.target.value); setSaved(false); }} style={inputStyle({ marginTop: 5 })} />
            </label>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>
              SALES BASIS
              <select value={salesBasis} onChange={function (event) { setSalesBasis(event.target.value); setUploads([]); setSaved(false); }} style={inputStyle({ marginTop: 5 })}>
                <option value="ordered">Ordered revenue</option>
                <option value="dispatched">Dispatched revenue / COGS</option>
              </select>
            </label>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid " + C.border, borderRadius: 10 }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: "grid", gridTemplateColumns: "110px 90px 105px 150px 1fr 95px 34px", gap: 8, padding: "8px 10px", background: C.inset, color: C.muted, fontSize: 9, fontWeight: 800, letterSpacing: "0.04em" }}>
                <span>MARKET</span><span>CURRENCY</span><span>PRIORITY</span><span>MONTHLY TARGET</span><span>OWNER</span><span>ALERT GAP</span><span />
              </div>
              {markets.map(function (market, index) {
                const usedByOthers = new Set(markets.filter(function (_, otherIndex) { return otherIndex !== index; }).map(function (item) { return item.code; }));
                return (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "110px 90px 105px 150px 1fr 95px 34px", gap: 8, padding: "8px 10px", borderTop: index ? "1px solid " + C.border : "none", alignItems: "center" }}>
                    <select aria-label="Market" value={market.code} onChange={function (event) { updateMarket(index, "code", event.target.value); }} style={inputStyle()}>
                      {MARKET_OPTIONS.filter(function (option) { return option.code === market.code || !usedByOthers.has(option.code); }).map(function (option) {
                        return <option key={option.code} value={option.code}>{option.code} · {option.name}</option>;
                      })}
                    </select>
                    <input aria-label="Currency" value={market.currency} onChange={function (event) { updateMarket(index, "currency", event.target.value.toUpperCase()); }} style={inputStyle()} />
                    <select aria-label="Priority" value={market.priority} onChange={function (event) { updateMarket(index, "priority", event.target.value); }} style={inputStyle()}>
                      <option>Core</option><option>Standard</option><option>Secondary</option>
                    </select>
                    <input aria-label="Monthly target" type="number" min="0" placeholder="e.g. 250000" value={market.target} onChange={function (event) { updateMarket(index, "target", event.target.value); }} style={inputStyle()} />
                    <input aria-label="Owner" placeholder="Name or team" value={market.owner} onChange={function (event) { updateMarket(index, "owner", event.target.value); }} style={inputStyle()} />
                    <div style={{ position: "relative" }}>
                      <input aria-label="Alert gap percentage" type="number" min="0" max="100" value={market.threshold} onChange={function (event) { updateMarket(index, "threshold", event.target.value); }} style={inputStyle({ paddingRight: 24 })} />
                      <span style={{ position: "absolute", right: 9, top: 9, color: C.muted, fontSize: 10 }}>%</span>
                    </div>
                    <button type="button" aria-label={"Remove " + market.code} disabled={markets.length === 1} onClick={function () { removeMarket(index); }} style={{ border: "none", background: "transparent", color: C.subtle, cursor: markets.length === 1 ? "default" : "pointer", padding: 5 }}><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
            <button type="button" onClick={addMarket} disabled={markets.length >= MARKET_OPTIONS.length} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid " + C.border, borderRadius: 8, background: C.card, color: C.body, padding: "8px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}><Plus size={13} /> Add market</button>
            <button type="button" onClick={saveSettings} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", borderRadius: 8, background: saved ? C.green : C.sky, color: "#fff", padding: "8px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}><Save size={13} /> {saved ? "Settings saved" : "Save settings"}</button>
          </div>
        </section>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px", marginBottom: 14 }}>
          <StepHeader number="2" title="Upload this month's Sales reports" description="Select all market files together. Expected: ASIN-level Sales reports using the selected sales basis." complete={configuredUploads.length > 0} />
          <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 112, border: "1.5px dashed " + C.sky, borderRadius: 11, background: "#F0F9FF", cursor: "pointer", padding: 16, textAlign: "center" }}>
            <Upload size={21} color={C.sky} />
            <span style={{ marginTop: 8, color: C.navy, fontSize: 12, fontWeight: 750 }}>{reading ? "Reading reports…" : "Choose Sales reports"}</span>
            <span style={{ marginTop: 4, color: C.muted, fontSize: 10 }}>CSV or Excel · multiple files supported</span>
            <input type="file" multiple accept=".csv,.xlsx,.xls" disabled={reading} onChange={function (event) { handleFiles(event.target.files); event.target.value = ""; }} style={{ display: "none" }} />
          </label>

          {uploads.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              {uploads.map(function (upload) {
                return (
                  <div key={upload.id} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "10px 11px", borderRadius: 9, border: "1px solid " + (upload.error ? "#FECACA" : "#BBF7D0"), background: upload.error ? C.redDim : C.greenDim }}>
                    {upload.error ? <AlertTriangle size={15} color={C.red} /> : <CheckCircle2 size={15} color={C.green} />}
                    <div style={{ flex: "1 1 260px", minWidth: 0 }}>
                      <div style={{ color: C.navy, fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{upload.file.name}</div>
                      <div style={{ color: upload.error ? C.red : C.muted, fontSize: 10, marginTop: 2 }}>
                        {upload.error || ((upload.period ? upload.period.label : "Date not detected") + " · " + upload.rows.toLocaleString() + " ASIN rows")}
                      </div>
                    </div>
                    {!upload.error && (
                      <select aria-label={"Market for " + upload.file.name} value={upload.market} onChange={function (event) { assignUpload(upload.id, event.target.value); }} style={inputStyle({ width: 170, background: C.card })}>
                        <option value="">Assign market…</option>
                        {markets.map(function (market) { return <option key={market.code} value={market.code}>{market.code} · {marketInfo(market.code).name}</option>; })}
                      </select>
                    )}
                    <button type="button" aria-label={"Remove " + upload.file.name} onClick={function () { removeUpload(upload.id); }} style={{ border: "none", background: "transparent", color: C.subtle, cursor: "pointer", padding: 5 }}><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px" }}>
          <StepHeader number="3" title="Review market performance" description="The projection is available when the report starts on the first day of the selected month." complete={measured.length > 0} />

          {configuredUploads.length === 0 ? (
            <div style={{ padding: "22px", borderRadius: 10, background: C.inset, textAlign: "center" }}>
              <TrendingUp size={20} color={C.subtle} />
              <p style={{ color: C.body, fontSize: 12, fontWeight: 700, margin: "8px 0 3px" }}>Your Control Tower will appear here</p>
              <p style={{ color: C.muted, fontSize: 10, margin: 0 }}>Upload at least one Sales report and assign it to a market.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginBottom: 13 }}>
                <div style={{ padding: "13px", border: "1px solid " + C.border, borderRadius: 10 }}><Globe2 size={15} color={C.sky} /><div style={{ color: C.navy, fontSize: 22, fontWeight: 800, marginTop: 7 }}>{measured.length}</div><div style={{ color: C.muted, fontSize: 10 }}>Markets measured</div></div>
                <div style={{ padding: "13px", border: "1px solid #BBF7D0", background: C.greenDim, borderRadius: 10 }}><CheckCircle2 size={15} color={C.green} /><div style={{ color: C.green, fontSize: 22, fontWeight: 800, marginTop: 7 }}>{onPlan}</div><div style={{ color: C.muted, fontSize: 10 }}>On plan</div></div>
                <div style={{ padding: "13px", border: "1px solid #FECACA", background: C.redDim, borderRadius: 10 }}><AlertTriangle size={15} color={C.red} /><div style={{ color: C.red, fontSize: 22, fontWeight: 800, marginTop: 7 }}>{offPlan}</div><div style={{ color: C.muted, fontSize: 10 }}>Require attention</div></div>
              </div>

              <div style={{ overflowX: "auto", border: "1px solid " + C.border, borderRadius: 10 }}>
                <div style={{ minWidth: 760 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "105px 1fr 1fr 1fr 1fr 110px", gap: 8, padding: "9px 11px", background: C.inset, color: C.muted, fontSize: 9, fontWeight: 800 }}>
                    <span>MARKET</span><span>ACTUAL</span><span>MONTH-END</span><span>TARGET</span><span>GAP</span><span>STATUS</span>
                  </div>
                  {summaries.map(function (item, index) {
                    const currency = item.market.currency;
                    return (
                      <div key={item.market.code} style={{ display: "grid", gridTemplateColumns: "105px 1fr 1fr 1fr 1fr 110px", gap: 8, alignItems: "center", padding: "11px", borderTop: index ? "1px solid " + C.border : "none", fontSize: 11 }}>
                        <div><strong style={{ color: C.navy }}>{item.market.code}</strong><div style={{ color: C.muted, fontSize: 9, marginTop: 2 }}>{item.market.priority}</div></div>
                        <span style={{ color: C.body, fontWeight: 650 }}>{item.upload ? formatMoney(item.upload.revenue, currency) : "—"}</span>
                        <span style={{ color: C.body, fontWeight: 650 }}>{formatMoney(item.projected, currency)}</span>
                        <span style={{ color: C.body }}>{item.target ? formatMoney(item.target, currency) : "—"}</span>
                        <span style={{ color: item.gap == null ? C.muted : item.gap >= 0 ? C.green : C.red, fontWeight: 700 }}>{item.gap == null ? "—" : (item.gap > 0 ? "+" : "") + formatMoney(item.gap, currency)}</span>
                        <span style={{ justifySelf: "start", padding: "5px 8px", borderRadius: 99, color: item.color, background: item.background, fontSize: 9, fontWeight: 800 }}>{item.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 9, background: "#F0F9FF", border: "1px solid #BAE6FD", color: C.body, fontSize: 10, lineHeight: 1.55 }}>
                Next, Danuly will request Traffic only for off-plan markets to separate demand from conversion, then Inventory only where availability may explain the gap.
              </div>
            </>
          )}
        </section>

        <div style={{ marginTop: 14, padding: "12px 14px", background: C.card, border: "1px solid " + C.border, borderRadius: 10, display: "flex", gap: 9, alignItems: "flex-start" }}>
          <Target size={15} color={C.sky} style={{ marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 10, lineHeight: 1.55, color: C.muted }}>
            Report files are processed in your browser and are not saved. Only your market settings and targets are stored locally on this device.
          </p>
        </div>
      </div>
    </main>
  );
}
