import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, FileSpreadsheet,
  Info, PackageSearch, ShieldCheck, TrendingUp, Upload
} from "lucide-react";
import { parseCsv, parseNum, parseXlsx } from "./parseCsv.js";

const C = {
  sky: "#0EA5E9", navy: "#0B1F3A", body: "#334155", muted: "#64748B",
  subtle: "#94A3B8", border: "#E2E8F0", surface: "#F8FAFC", card: "#FFFFFF",
  inset: "#F1F5F9", green: "#16A34A", greenDim: "#F0FDF4",
  amber: "#D97706", amberDim: "#FFFBEB", red: "#DC2626", redDim: "#FEF2F2"
};

const REGIONS = {
  UK: { label: "United Kingdom", currency: "GBP", countries: ["UK", "GB", "United Kingdom"], realization: 0.95, conversion: 0.8137, fx: 1.35, fxOperation: "multiply" },
  EU: { label: "EU combined", currency: "EUR", countries: ["Belgium", "Germany", "Spain", "France", "Italy", "Netherlands", "Poland", "Sweden", "BE", "DE", "ES", "FR", "IT", "NL", "PL", "SE"], realization: 0.95, conversion: 0.92, fx: 1.17, fxOperation: "multiply" },
  JP: { label: "Japan", currency: "JPY", countries: ["Japan", "JP"], realization: 1, conversion: 1, fx: 150, fxOperation: "divide" }
};

const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11
};

const REPORTS = [
  { id: "sales", title: "Recent Sales Report", badge: "Required", purpose: "Calculates the current ASP for every ASIN.", expected: "ASIN, ordered revenue and ordered units", icon: TrendingUp },
  { id: "mean", title: "Mean Forecast", badge: "Required", purpose: "Provides Amazon's base weekly customer-demand forecast.", expected: "ASIN and Week 0–47 Mean forecast units", icon: CalendarDays },
  { id: "p70", title: "P70 Forecast", badge: "Recommended", purpose: "Adds an upside planning scenario. P80 and P90 are not needed.", expected: "ASIN and Week 0–47 P70 forecast units", icon: TrendingUp },
  { id: "inventory", title: "Latest Inventory Snapshot", badge: "Recommended", purpose: "Checks Amazon on-hand and open-PO coverage without changing demand.", expected: "ASIN, sellable on-hand units and open PO quantity", icon: PackageSearch }
];

function nextMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString().slice(0, 7);
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[_:()#%]/g, " ").replace(/\s+/g, " ").trim();
}

function findHeader(headers, terms) {
  return headers.find(function (header) {
    const normalized = normalize(header);
    return terms.some(function (term) { return normalized.includes(term); });
  });
}

function metadataValue(metadata, names) {
  const key = Object.keys(metadata || {}).find(function (candidate) {
    return names.includes(normalize(candidate));
  });
  return key ? metadata[key] : "";
}

function parseMetadataDate(value) {
  const match = String(value || "").match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
}

function daysBetween(a, b) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function monthBounds(month) {
  const parts = month.split("-").map(Number);
  const start = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
  const end = new Date(Date.UTC(parts[0], parts[1], 0));
  return { start, end };
}

function parseWeekHeader(header, reportDate) {
  const match = String(header).match(/Week\s+(\d+)\s*\(\s*(\d{1,2})\s+([A-Za-z]+)\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s*\)/i);
  if (!match) return null;
  const weekNumber = Number(match[1]);
  const startMonth = MONTHS[match[3].toLowerCase()];
  const endMonth = MONTHS[match[5].toLowerCase()];
  if (startMonth === undefined || endMonth === undefined) return null;
  const anchor = reportDate || new Date();
  const expectedStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() + weekNumber * 7));
  let bestStart = null;
  let bestDistance = Infinity;
  for (let year = anchor.getUTCFullYear() - 1; year <= anchor.getUTCFullYear() + 2; year += 1) {
    const candidate = new Date(Date.UTC(year, startMonth, Number(match[2])));
    const distance = Math.abs(candidate.getTime() - expectedStart.getTime());
    if (distance < bestDistance) { bestStart = candidate; bestDistance = distance; }
  }
  const endYear = endMonth < startMonth ? bestStart.getUTCFullYear() + 1 : bestStart.getUTCFullYear();
  return { header, start: bestStart, end: new Date(Date.UTC(endYear, endMonth, Number(match[4]))) };
}

function overlapDays(interval, bounds) {
  const start = new Date(Math.max(interval.start.getTime(), bounds.start.getTime()));
  const end = new Date(Math.min(interval.end.getTime(), bounds.end.getTime()));
  return end < start ? 0 : daysBetween(start, end) + 1;
}

function validateReport(parsed, reportId, region) {
  const headers = parsed.headers || [];
  const metadata = parsed.metadata || {};
  const asin = findHeader(headers, ["asin", "amazon standard identification"]);
  if (!asin) return "This is not an ASIN-level report. Select View By = ASIN.";

  const programme = metadataValue(metadata, ["programme", "program"]);
  const distributor = metadataValue(metadata, ["distributor view"]);
  const viewBy = metadataValue(metadata, ["view by"]);
  if (programme && normalize(programme) !== "retail") return "Select Programme = Retail.";
  if (distributor && normalize(distributor) !== "manufacturing") return "Select Distributor View = Manufacturing.";
  if (viewBy && normalize(viewBy) !== "asin") return "Select View By = ASIN.";

  const currency = metadataValue(metadata, ["currency"]);
  if ((reportId === "sales" || reportId === "inventory") && currency && normalize(currency) !== normalize(REGIONS[region].currency)) {
    return "This file uses " + currency + ". " + REGIONS[region].label + " requires " + REGIONS[region].currency + ".";
  }

  const countriesValue = metadataValue(metadata, ["countries", "country"]);
  if (countriesValue) {
    const countries = countriesValue.split(/[;,]/).map(normalize).filter(Boolean);
    const ukCountries = new Set(["uk", "gb", "united kingdom"]);
    const japanCountries = new Set(["jp", "japan"]);
    const euCountries = new Set(REGIONS.EU.countries.map(normalize));
    if (region === "UK" && countries.some(function (country) { return !ukCountries.has(country); })) return "This file includes a market outside the UK. Download the UK report only.";
    if (region === "JP" && countries.some(function (country) { return !japanCountries.has(country); })) return "This file includes a market outside Japan. Download the Japan report only.";
    if (region === "EU") {
      if (countries.includes("uk") || countries.includes("gb") || countries.includes("united kingdom")) return "UK must remain separate from the EU combined forecast.";
      if (countries.includes("turkey") || countries.includes("tr")) return "Turkey is excluded from EU combined. Download the report without Turkey.";
      const unexpected = countries.find(function (country) { return !euCountries.has(country); });
      if (unexpected) return "This EU file contains an unexpected market: " + unexpected + ". Include it only after confirming the market scope.";
    }
  }

  if (reportId === "sales") {
    const revenue = findHeader(headers, ["ordered revenue", "ordered product sales", "dispatched revenue", "shipped revenue"]);
    const units = findHeader(headers, ["ordered units", "dispatched units", "shipped units"]);
    return revenue && units ? null : "Sales metrics were not found. Include ordered revenue and ordered units.";
  }

  if (reportId === "mean" || reportId === "p70") {
    const statistic = normalize(metadataValue(metadata, ["forecasting statistic"]));
    const expected = reportId === "mean" ? "mean" : "p70";
    if (statistic && !statistic.includes(expected)) return "This is the " + (statistic || "other") + " forecast. Upload the " + expected.toUpperCase() + " file here.";
    return headers.some(function (header) { return /^week\s+\d+/i.test(header); }) ? null : "Weekly forecast columns were not found.";
  }

  if (reportId === "inventory") {
    const viewingRange = metadataValue(metadata, ["viewing range"]);
    const dates = String(viewingRange).match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/g) || [];
    if (dates.length >= 2 && dates[0] !== dates[1]) return "Inventory must be the latest available single-day snapshot, not a date range.";
    const onHand = findHeader(headers, ["sellable on hand units"]);
    const openPo = findHeader(headers, ["open purchase order quantity", "open purchase order units", "open po quantity"]);
    return onHand || openPo ? null : "Sellable on-hand units or open PO quantity were not found.";
  }
  return null;
}

function reportWarning(parsed, reportId) {
  const metadata = parsed.metadata || {};
  const viewingRange = metadataValue(metadata, ["viewing range"]);
  const rangeDates = String(viewingRange).match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/g) || [];
  const dataDate = rangeDates.length ? parseMetadataDate(rangeDates[rangeDates.length - 1]) : null;
  const updatedDate = parseMetadataDate(metadataValue(metadata, ["report updated", "forecast generation date", "last updated date"]));
  const referenceDate = reportId === "sales" || reportId === "inventory" ? (dataDate || updatedDate) : updatedDate;
  if (!referenceDate) return "The report date could not be verified.";
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const age = daysBetween(referenceDate, todayUtc);
  const maximumAge = reportId === "mean" || reportId === "p70" ? 7 : 3;
  return age > maximumAge ? "This report is " + age + " days old. Upload a fresher report when available." : null;
}

function calculateMonthlyUnits(parsed, targetMonth) {
  if (!parsed) return new Map();
  const reportDate = parseMetadataDate(metadataValue(parsed.metadata, ["report updated", "forecast generation date", "last updated date"]));
  const intervals = parsed.headers.map(function (header) { return parseWeekHeader(header, reportDate); }).filter(Boolean);
  const bounds = monthBounds(targetMonth);
  const asinHeader = findHeader(parsed.headers, ["asin", "amazon standard identification"]);
  const result = new Map();
  parsed.rows.forEach(function (row) {
    const asin = String(row[asinHeader] || "").trim();
    if (!asin) return;
    let units = 0;
    intervals.forEach(function (interval) {
      const overlap = overlapDays(interval, bounds);
      const intervalDays = daysBetween(interval.start, interval.end) + 1;
      if (overlap > 0 && intervalDays > 0) units += parseNum(row[interval.header]) * overlap / intervalDays;
    });
    result.set(asin, units);
  });
  return result;
}

function calculateAsps(parsed) {
  const result = new Map();
  if (!parsed) return result;
  const asinHeader = findHeader(parsed.headers, ["asin", "amazon standard identification"]);
  const orderedRevenue = findHeader(parsed.headers, ["ordered revenue", "ordered product sales"]);
  const orderedUnits = findHeader(parsed.headers, ["ordered units"]);
  const dispatchedRevenue = findHeader(parsed.headers, ["dispatched revenue", "shipped revenue"]);
  const dispatchedUnits = findHeader(parsed.headers, ["dispatched units", "shipped units"]);
  parsed.rows.forEach(function (row) {
    const asin = String(row[asinHeader] || "").trim();
    const orderedAsp = orderedRevenue && orderedUnits && parseNum(row[orderedUnits]) > 0 ? parseNum(row[orderedRevenue]) / parseNum(row[orderedUnits]) : 0;
    const dispatchedAsp = dispatchedRevenue && dispatchedUnits && parseNum(row[dispatchedUnits]) > 0 ? parseNum(row[dispatchedRevenue]) / parseNum(row[dispatchedUnits]) : 0;
    if (asin && (orderedAsp || dispatchedAsp)) result.set(asin, orderedAsp || dispatchedAsp);
  });
  return result;
}

function inventoryTotals(parsed, allowedAsins) {
  if (!parsed) return null;
  const onHandHeader = findHeader(parsed.headers, ["sellable on hand units"]);
  const openPoHeader = findHeader(parsed.headers, ["open purchase order quantity", "open purchase order units", "open po quantity"]);
  const asinHeader = findHeader(parsed.headers, ["asin", "amazon standard identification"]);
  return parsed.rows.reduce(function (totals, row) {
    const asin = String(row[asinHeader] || "").trim();
    if (allowedAsins && !allowedAsins.has(asin)) return totals;
    totals.onHand += onHandHeader ? parseNum(row[onHandHeader]) : 0;
    totals.openPo += openPoHeader ? parseNum(row[openPoHeader]) : 0;
    return totals;
  }, { onHand: 0, openPo: 0 });
}

function toUsd(local, region) {
  const settings = REGIONS[region];
  return settings.fxOperation === "divide" ? local / settings.fx : local * settings.fx;
}

function sellInValue(retailValue, region) {
  const settings = REGIONS[region];
  return retailValue * settings.realization * settings.conversion;
}

function formatMoney(value, currency) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value, digits) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits || 0 }).format(value);
}

function inputStyle(extra) {
  return Object.assign({ width: "100%", boxSizing: "border-box", minHeight: 36, padding: "8px 10px", border: "1px solid " + C.border, borderRadius: 8, background: C.card, color: C.body, fontSize: 11, outline: "none" }, extra || {});
}

function UploadCard({ report, fileState, region, onUpload }) {
  const Icon = report.icon;
  const inputId = "forecast-upload-" + report.id;
  const isRequired = report.badge === "Required";
  return (
    <div style={{ border: "1px solid " + (fileState && fileState.error ? "#FECACA" : fileState && fileState.warning ? "#FDE68A" : fileState ? "#BBF7D0" : C.border), borderRadius: 11, background: C.card, padding: 14 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 31, height: 31, borderRadius: 8, display: "grid", placeItems: "center", background: fileState ? C.greenDim : C.inset }}><Icon size={15} color={fileState ? C.green : C.sky} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: C.navy, fontSize: 12 }}>{report.title}</strong><span style={{ color: isRequired ? C.red : C.muted, fontSize: 8, fontWeight: 800 }}>{report.badge.toUpperCase()}</span></div>
          <p style={{ color: C.muted, fontSize: 9, lineHeight: 1.5, margin: "5px 0 8px" }}>{report.purpose}</p>
          <details>
            <summary style={{ color: C.body, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>What to download</summary>
            <div style={{ color: C.muted, fontSize: 9, lineHeight: 1.55, marginTop: 6 }}>
              Retail · Manufacturing · ASIN · {REGIONS[region].label}<br />
              {report.id === "sales" ? "Latest available 28 days · " + REGIONS[region].currency : report.id === "inventory" ? "Latest available single day" : "Latest available forecast · " + (report.id === "mean" ? "Mean" : "P70")}<br />
              Expected: {report.expected}
            </div>
          </details>
          {fileState ? (
            <div style={{ marginTop: 9, padding: "7px 8px", borderRadius: 7, background: fileState.error ? C.redDim : fileState.warning ? C.amberDim : C.greenDim, color: fileState.error ? C.red : fileState.warning ? C.amber : C.green, fontSize: 9, lineHeight: 1.4, overflowWrap: "anywhere" }}>
              {fileState.error || fileState.warning ? <AlertTriangle size={11} style={{ marginRight: 5, verticalAlign: "middle" }} /> : <CheckCircle2 size={11} style={{ marginRight: 5, verticalAlign: "middle" }} />}
              {fileState.error || (fileState.warning ? fileState.name + " · " + fileState.warning : fileState.name)}
            </div>
          ) : null}
          <label htmlFor={inputId} style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 9px", borderRadius: 7, border: "1px solid " + C.border, color: C.body, fontSize: 9, fontWeight: 750, cursor: "pointer", background: C.surface }}><Upload size={12} /> {fileState ? "Replace file" : "Upload CSV or Excel"}</label>
          <input id={inputId} type="file" accept=".csv,.xlsx,.xls" onChange={function (event) { onUpload(report.id, event.target.files[0]); event.target.value = ""; }} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, note, accent }) {
  return <div style={{ border: "1px solid " + C.border, borderTop: "3px solid " + accent, borderRadius: 11, background: C.card, padding: 14 }}><div style={{ color: C.muted, fontSize: 8, fontWeight: 800, letterSpacing: "0.05em" }}>{label}</div><div style={{ color: C.navy, fontSize: 20, fontWeight: 800, marginTop: 7 }}>{value}</div><div style={{ color: C.muted, fontSize: 9, marginTop: 4, lineHeight: 1.45 }}>{note}</div></div>;
}

export default function SellInForecast({ navigation, onBack }) {
  const [targetMonth, setTargetMonth] = useState(nextMonth);
  const [region, setRegion] = useState("UK");
  const [files, setFiles] = useState({});
  const [acceptedPo, setAcceptedPo] = useState("");

  function handleFile(reportId, file) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setFiles(function (current) { return Object.assign({}, current, { [reportId]: { name: file.name, error: "Upload a CSV or Excel file." } }); });
      return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = lower.endsWith(".csv") ? parseCsv(event.target.result) : parseXlsx(event.target.result);
        const error = validateReport(parsed, reportId, region);
        const warning = error ? null : reportWarning(parsed, reportId);
        setFiles(function (current) { return Object.assign({}, current, { [reportId]: { name: file.name, parsed, error, warning } }); });
      } catch (error) {
        setFiles(function (current) { return Object.assign({}, current, { [reportId]: { name: file.name, error: error.message || "The file could not be read." } }); });
      }
    };
    if (lower.endsWith(".csv")) reader.readAsText(file); else reader.readAsArrayBuffer(file);
  }

  function changeRegion(nextRegion) {
    setRegion(nextRegion);
    setFiles({});
    setAcceptedPo("");
  }

  const analysis = useMemo(function () {
    const sales = files.sales && !files.sales.error ? files.sales.parsed : null;
    const mean = files.mean && !files.mean.error ? files.mean.parsed : null;
    const p70 = files.p70 && !files.p70.error ? files.p70.parsed : null;
    if (!sales || !mean) return null;
    const asps = calculateAsps(sales);
    const meanUnits = calculateMonthlyUnits(mean, targetMonth);
    const p70Units = calculateMonthlyUnits(p70, targetMonth);
    let totalMeanUnits = 0, pricedMeanUnits = 0, meanRetail = 0, p70Retail = 0;
    const contributions = [];
    meanUnits.forEach(function (units, asin) {
      const asp = asps.get(asin) || 0;
      const upsideUnits = p70Units.get(asin) || 0;
      totalMeanUnits += units;
      if (asp > 0) { pricedMeanUnits += units; meanRetail += units * asp; p70Retail += upsideUnits * asp; }
      contributions.push({ asin, units, asp, retail: units * asp });
    });
    contributions.sort(function (a, b) { return b.retail - a.retail; });
    const meanLocal = sellInValue(meanRetail, region);
    const p70Local = p70 ? sellInValue(p70Retail, region) : null;
    const inventory = files.inventory && !files.inventory.error ? inventoryTotals(files.inventory.parsed, new Set(meanUnits.keys())) : null;
    const weeksInMonth = (daysBetween(monthBounds(targetMonth).start, monthBounds(targetMonth).end) + 1) / 7;
    const weeklyDemand = totalMeanUnits / weeksInMonth;
    const onHandWeeks = inventory && weeklyDemand ? inventory.onHand / weeklyDemand : null;
    const pipelineWeeks = inventory && weeklyDemand ? (inventory.onHand + inventory.openPo) / weeklyDemand : null;
    const priceCoverage = totalMeanUnits ? pricedMeanUnits / totalMeanUnits : 0;
    const hasP70 = Boolean(p70);
    const hasInventory = Boolean(inventory);
    const hasFreshnessWarning = Object.keys(files).some(function (key) { return files[key] && files[key].warning; });
    const confidence = priceCoverage < 0.99 ? "Low" : hasP70 && hasInventory && !hasFreshnessWarning ? "High" : "Medium";
    const risk = pipelineWeeks === null ? "Not assessed" : pipelineWeeks > 8 ? "High inventory" : pipelineWeeks < 2 ? "Low coverage" : pipelineWeeks < 4 ? "Watch" : "Balanced";
    return { totalMeanUnits, meanLocal, meanUsd: toUsd(meanLocal, region), p70Local, p70Usd: p70Local === null ? null : toUsd(p70Local, region), priceCoverage, inventory, onHandWeeks, pipelineWeeks, confidence, risk, contributions };
  }, [files, region, targetMonth]);

  const regionSettings = REGIONS[region];
  const acceptedPoLocal = parseNum(acceptedPo);
  const acceptedPoUsd = acceptedPoLocal ? toUsd(acceptedPoLocal, region) : 0;
  const poCoverage = analysis && analysis.meanLocal ? acceptedPoLocal / analysis.meanLocal : null;
  const monthLabel = new Date(targetMonth + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <main style={{ minHeight: "calc(100vh - 52px)", background: C.surface, padding: "26px 18px 54px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", padding: 0, color: C.muted, cursor: "pointer", fontSize: 12 }}><ArrowLeft size={13} /> Change goal</button>
        {navigation}
        <div style={{ margin: "18px 0 20px", display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ maxWidth: 720 }}><span style={{ color: C.sky, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>MONTHLY SELL-IN FORECAST</span><h1 style={{ color: C.navy, fontSize: 26, margin: "5px 0 6px", letterSpacing: "-0.025em" }}>What could Amazon buy next month?</h1><p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0 }}>Danuly converts Amazon's weekly customer-demand forecast into a monthly Sell-In plan, then uses inventory and POs to show realization risk.</p></div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: C.green, fontSize: 10, fontWeight: 700, background: C.greenDim, border: "1px solid #BBF7D0", padding: "7px 10px", borderRadius: 99 }}><ShieldCheck size={13} /> Files stay in this browser</div>
        </div>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 15 }}><div style={{ width: 29, height: 29, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", background: C.sky, fontSize: 12, fontWeight: 800 }}>1</div><div><h2 style={{ margin: "0 0 4px", color: C.navy, fontSize: 15 }}>Choose the forecast</h2><p style={{ margin: 0, color: C.muted, fontSize: 11 }}>The report dates and currency are validated against this selection.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            <label style={{ color: C.muted, fontSize: 9, fontWeight: 800 }}>FORECAST MONTH<input type="month" value={targetMonth} onChange={function (event) { setTargetMonth(event.target.value); }} style={inputStyle({ marginTop: 5 })} /></label>
            <label style={{ color: C.muted, fontSize: 9, fontWeight: 800 }}>REGION<select value={region} onChange={function (event) { changeRegion(event.target.value); }} style={inputStyle({ marginTop: 5 })}><option value="UK">United Kingdom</option><option value="EU">EU combined</option><option value="JP">Japan</option></select></label>
            <div style={{ padding: "9px 11px", borderRadius: 9, background: C.inset, border: "1px solid " + C.border }}><div style={{ color: C.muted, fontSize: 8, fontWeight: 800 }}>AUTOMATIC ASSUMPTIONS</div><div style={{ color: C.body, fontSize: 10, lineHeight: 1.55, marginTop: 4 }}>{region === "UK" ? "95% × 81.37% · GBP × 1.35" : region === "EU" ? "95% × 92% · EUR × 1.17" : "No deductions · JPY ÷ 150"}</div></div>
          </div>
        </section>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 18, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 15 }}><div style={{ width: 29, height: 29, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", background: files.sales && files.mean && !files.sales.error && !files.mean.error ? C.green : C.sky, fontSize: 12, fontWeight: 800 }}>{files.sales && files.mean && !files.sales.error && !files.mean.error ? <CheckCircle2 size={16} /> : "2"}</div><div><h2 style={{ margin: "0 0 4px", color: C.navy, fontSize: 15 }}>Upload only what improves the forecast</h2><p style={{ margin: 0, color: C.muted, fontSize: 11 }}>Sales + Mean create the base forecast. P70 and Inventory improve planning and risk visibility.</p></div></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))", gap: 10 }}>{REPORTS.map(function (report) { return <UploadCard key={report.id} report={report} fileState={files[report.id]} region={region} onUpload={handleFile} />; })}</div>
          <div style={{ marginTop: 11, display: "flex", gap: 7, color: C.muted, fontSize: 9, lineHeight: 1.5 }}><Info size={13} color={C.sky} style={{ flexShrink: 0 }} />Inventory means the latest available single-day snapshot. If today is 24 August, use 24 August when available; otherwise use the latest available date. P80 and P90 are intentionally not requested.</div>
        </section>

        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: 18 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 15 }}><div style={{ width: 29, height: 29, borderRadius: 8, display: "grid", placeItems: "center", color: "#fff", background: analysis ? C.green : C.sky, fontSize: 12, fontWeight: 800 }}>{analysis ? <CheckCircle2 size={16} /> : "3"}</div><div><h2 style={{ margin: "0 0 4px", color: C.navy, fontSize: 15 }}>Review the monthly plan</h2><p style={{ margin: 0, color: C.muted, fontSize: 11 }}>Demand plan and PO progress are kept separate so Amazon's forecast is not mistaken for guaranteed orders.</p></div></div>
          {!analysis ? <div style={{ padding: 24, textAlign: "center", borderRadius: 10, background: C.inset }}><FileSpreadsheet size={20} color={C.subtle} /><p style={{ margin: "8px 0 3px", color: C.body, fontSize: 12, fontWeight: 700 }}>Upload Sales and Mean Forecast to calculate {monthLabel}</p><p style={{ margin: 0, color: C.muted, fontSize: 9 }}>P70 and Inventory can be added afterwards.</p></div> : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 10 }}>
                <MetricCard label="MEAN · BASE PLAN" value={formatMoney(analysis.meanUsd, "USD")} note={formatMoney(analysis.meanLocal, regionSettings.currency) + " local Sell-In"} accent={C.sky} />
                <MetricCard label="P70 · UPSIDE" value={analysis.p70Usd === null ? "Not uploaded" : formatMoney(analysis.p70Usd, "USD")} note={analysis.p70Usd === null ? "Optional upside scenario" : "+" + formatNumber((analysis.p70Usd / analysis.meanUsd - 1) * 100, 1) + "% vs Mean"} accent="#7C3AED" />
                <MetricCard label="PRICE COVERAGE" value={formatNumber(analysis.priceCoverage * 100, 1) + "%"} note={analysis.priceCoverage >= 0.99 ? "ASP coverage is sufficient" : "Missing prices require review"} accent={analysis.priceCoverage >= 0.99 ? C.green : C.red} />
                <MetricCard label="PIPELINE COVERAGE" value={analysis.pipelineWeeks === null ? "Not assessed" : formatNumber(analysis.pipelineWeeks, 1) + " weeks"} note={analysis.inventory ? formatNumber(analysis.onHandWeeks, 1) + " weeks on hand" : "Upload latest Inventory"} accent={analysis.pipelineWeeks === null ? C.subtle : analysis.pipelineWeeks > 8 || analysis.pipelineWeeks < 2 ? C.amber : C.green} />
              </div>
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                <div style={{ padding: 13, border: "1px solid " + C.border, borderRadius: 10 }}><label style={{ color: C.muted, fontSize: 9, fontWeight: 800 }}>ACCEPTED POs SCHEDULED FOR {monthLabel.toUpperCase()}<div style={{ position: "relative", marginTop: 6 }}><span style={{ position: "absolute", left: 10, top: 9, color: C.muted, fontSize: 10 }}>{regionSettings.currency}</span><input type="number" min="0" placeholder="Optional manual value" value={acceptedPo} onChange={function (event) { setAcceptedPo(event.target.value); }} style={inputStyle({ paddingLeft: 42 })} /></div></label><div style={{ marginTop: 7, color: C.muted, fontSize: 9 }}>{acceptedPoLocal ? formatMoney(acceptedPoUsd, "USD") + " · " + formatNumber(poCoverage * 100, 1) + "% of Mean secured" : "Enter accepted PO cost only if it is expected in the target month."}</div></div>
                <div style={{ padding: 13, border: "1px solid #BAE6FD", borderRadius: 10, background: "#F0F9FF" }}><div style={{ color: C.sky, fontSize: 8, fontWeight: 800, letterSpacing: "0.05em" }}>DANULY CONCLUSION</div><p style={{ color: C.body, fontSize: 11, lineHeight: 1.6, margin: "6px 0 0" }}>{monthLabel} {regionSettings.label} Mean Sell-In plan is {formatMoney(analysis.meanUsd, "USD")}{analysis.p70Usd !== null ? ", with P70 upside to " + formatMoney(analysis.p70Usd, "USD") : ""}. {acceptedPoLocal ? "Accepted POs currently secure " + formatNumber(poCoverage * 100, 1) + "% of the Mean plan. " : "PO progress has not been added. "}{analysis.pipelineWeeks === null ? "Upload Inventory to assess realization risk." : "Amazon pipeline coverage is " + formatNumber(analysis.pipelineWeeks, 1) + " weeks, indicating " + analysis.risk.toLowerCase() + " risk."}</p></div>
              </div>
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 7 }}><span style={{ padding: "6px 9px", borderRadius: 99, background: analysis.confidence === "High" ? C.greenDim : analysis.confidence === "Low" ? C.redDim : C.amberDim, color: analysis.confidence === "High" ? C.green : analysis.confidence === "Low" ? C.red : C.amber, fontSize: 9, fontWeight: 800 }}>Data confidence: {analysis.confidence}</span><span style={{ padding: "6px 9px", borderRadius: 99, background: C.inset, color: C.body, fontSize: 9, fontWeight: 800 }}>PO realization: {analysis.risk}</span></div>
              <details style={{ marginTop: 12, border: "1px solid " + C.border, borderRadius: 10 }}><summary style={{ padding: "10px 12px", cursor: "pointer", color: C.body, fontSize: 10, fontWeight: 750 }}><ChevronDown size={12} style={{ marginRight: 5, verticalAlign: "middle" }} />Formula and ASIN quality check</summary><div style={{ padding: "0 12px 12px", color: C.muted, fontSize: 9, lineHeight: 1.6 }}>Monthly units are prorated using the exact number of forecast-week days inside {monthLabel}. ASP uses ordered revenue ÷ ordered units for the same ASIN and region, with dispatched ASP as fallback. {region === "JP" ? "Japan Sell-In equals retail value in JPY and converts to USD at JPY ÷ 150." : region === "UK" ? "UK Sell-In = retail value × 95% × 81.37%; USD = GBP × 1.35." : "EU Sell-In = retail value × 95% × 92%; USD = EUR × 1.17."}<br />Recognized Mean units: {formatNumber(analysis.totalMeanUnits, 1)} · ASINs in forecast: {analysis.contributions.length}</div></details>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
