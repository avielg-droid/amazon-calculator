import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, BarChart3, CheckCircle2,
  FileSpreadsheet, Info, Search, ShieldCheck, Target, Upload
} from "lucide-react";
import { parseCsv, parseNum, parseXlsx } from "./parseCsv.js";

const C = {
  sky: "#0EA5E9", navy: "#0B1F3A", body: "#334155", muted: "#64748B",
  subtle: "#94A3B8", border: "#E2E8F0", surface: "#F8FAFC", card: "#FFFFFF",
  inset: "#F1F5F9", green: "#16A34A", greenDim: "#F0FDF4",
  amber: "#D97706", amberDim: "#FFFBEB", red: "#DC2626", redDim: "#FEF2F2",
  purple: "#7C3AED", purpleDim: "#F5F3FF"
};

const MARKETS = {
  UK: { name: "United Kingdom", currency: "GBP", aliases: ["uk", "gb", "united kingdom"] },
  DE: { name: "Germany", currency: "EUR", aliases: ["de", "germany"] },
  FR: { name: "France", currency: "EUR", aliases: ["fr", "france"] },
  IT: { name: "Italy", currency: "EUR", aliases: ["it", "italy"] },
  ES: { name: "Spain", currency: "EUR", aliases: ["es", "spain"] },
  NL: { name: "Netherlands", currency: "EUR", aliases: ["nl", "netherlands"] },
  BE: { name: "Belgium", currency: "EUR", aliases: ["be", "belgium"] },
  PL: { name: "Poland", currency: "PLN", aliases: ["pl", "poland"] },
  SE: { name: "Sweden", currency: "SEK", aliases: ["se", "sweden"] },
  JP: { name: "Japan", currency: "JPY", aliases: ["jp", "japan"] }
};

const BRAND_TERMS = ["moroccanoil", "moroccan oil", "morocanoil", "moroccan-oil"];
const COMPETITOR_TERMS = ["kerastase", "kérastase", "olaplex", "redken", "k18", "gisou", "loreal", "l'oréal", "shu uemura", "oribe"];

function currentMonth() {
  const date = new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[_:()#%]/g, " ").replace(/\s+/g, " ").trim();
}

function findHeader(headers, terms) {
  const normalizedTerms = terms.map(normalize);
  return headers.find(function (header) { return normalizedTerms.includes(normalize(header)); }) || headers.find(function (header) {
    const candidate = normalize(header);
    return normalizedTerms.some(function (term) { return candidate.includes(term); });
  });
}

function findExactHeader(headers, terms) {
  const normalizedTerms = terms.map(normalize);
  return headers.find(function (header) { return normalizedTerms.includes(normalize(header)); });
}

function findSpendHeader(headers) {
  return findExactHeader(headers, ["total cost", "cost", "spend", "media spend", "total cost reconciled"]);
}

function parseDate(value) {
  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (match) return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function validUtcDate(year, month, day) {
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day ? date : null;
}

function parseAdvertisingDate(value, bounds) {
  const text = String(value || "").trim();
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return validUtcDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const ambiguous = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!ambiguous) return parseDate(text);
  const first = Number(ambiguous[1]);
  const second = Number(ambiguous[2]);
  const year = Number(ambiguous[3]);
  const candidates = [validUtcDate(year, second - 1, first), validUtcDate(year, first - 1, second)].filter(Boolean);
  const matching = candidates.find(function (candidate) {
    return inRange(candidate, bounds.start, bounds.end) || inRange(candidate, bounds.previousStart, bounds.previousEnd);
  });
  return matching || candidates[0] || null;
}

function previousMonthDate(date) {
  const previousMonthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0));
  return new Date(Date.UTC(previousMonthEnd.getUTCFullYear(), previousMonthEnd.getUTCMonth(), Math.min(date.getUTCDate(), previousMonthEnd.getUTCDate())));
}

function periodBounds(month, exactRange) {
  if (exactRange) {
    return {
      start: exactRange.start,
      end: exactRange.end,
      previousStart: previousMonthDate(exactRange.start),
      previousEnd: previousMonthDate(exactRange.end)
    };
  }
  const parts = month.split("-").map(Number);
  const start = new Date(Date.UTC(parts[0], parts[1] - 1, 1));
  const fullEnd = new Date(Date.UTC(parts[0], parts[1], 0));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const end = todayUtc >= start && todayUtc <= fullEnd ? todayUtc : fullEnd;
  const previousStart = new Date(Date.UTC(parts[0], parts[1] - 2, 1));
  const previousFullEnd = new Date(Date.UTC(parts[0], parts[1] - 1, 0));
  const previousEnd = end < fullEnd
    ? new Date(Date.UTC(previousStart.getUTCFullYear(), previousStart.getUTCMonth(), Math.min(end.getUTCDate(), previousFullEnd.getUTCDate())))
    : previousFullEnd;
  return { start, end, previousStart, previousEnd };
}

function salesViewingRange(parsed) {
  if (!parsed) return null;
  const viewingRange = metadataValue(parsed.metadata, ["viewing range"]);
  const dates = String(viewingRange).match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/g) || [];
  if (!dates.length) return null;
  const start = parseDate(dates[0]);
  const end = parseDate(dates[dates.length - 1]);
  return start && end ? { start, end } : null;
}

function inRange(date, start, end) {
  return date && date >= start && date <= end;
}

function metadataValue(metadata, names) {
  const key = Object.keys(metadata || {}).find(function (candidate) { return names.includes(normalize(candidate)); });
  return key ? metadata[key] : "";
}

function validateAdvertisingReport(parsed) {
  const headers = parsed.headers || [];
  const date = findExactHeader(headers, ["date"]);
  const dateRange = findExactHeader(headers, ["date range"]);
  const dayOfMonth = findExactHeader(headers, ["day of month"]);
  const campaign = findHeader(headers, ["campaign", "campaign name"]);
  const spend = findSpendHeader(headers);
  const sales = findHeader(headers, ["sales", "total sales", "attributed sales"]);
  const clicks = findHeader(headers, ["clicks"]);
  if (!date && dateRange) return "This is a summary report with a Date range column. Recreate it with Time dimension = Date and daily breakdown so Danuly can isolate the selected period.";
  if (!date && dayOfMonth) return "This report uses Day of Month (1–31), which does not include the month or year. Replace that dimension with Date so Danuly can isolate the selected period from the 90-day file.";
  if (!date) return "Choose Date as the time dimension so the file contains one row per date.";
  if (!campaign) return "Choose Campaign as the level of detail.";
  if (!spend) return "Actual spend is missing. Add the Total cost metric; Campaign cost type is not spend.";
  if (!sales || !clicks) return "Include Sales and Clicks in the Unified Advertising report.";
  return null;
}

function validateSalesReport(parsed, market, month) {
  const headers = parsed.headers || [];
  const asin = findHeader(headers, ["asin", "amazon standard identification"]);
  const revenue = findHeader(headers, ["ordered revenue", "ordered product sales"]);
  if (!asin) return "Select View By = ASIN in the Vendor Sales report.";
  if (!revenue) return "Include Ordered revenue in the Vendor Sales report.";
  const currency = metadataValue(parsed.metadata, ["currency"]);
  if (currency && normalize(currency) !== normalize(MARKETS[market].currency)) return "This report uses " + currency + ". " + MARKETS[market].name + " requires " + MARKETS[market].currency + ".";
  const countries = metadataValue(parsed.metadata, ["countries", "country"]).split(/[;,]/).map(normalize).filter(Boolean);
  if (countries.length && countries.some(function (country) { return !MARKETS[market].aliases.includes(country); })) return "The Vendor Sales report does not match the selected market.";
  const viewingRange = metadataValue(parsed.metadata, ["viewing range"]);
  const dates = String(viewingRange).match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/g) || [];
  if (dates.length) {
    const startDate = parseDate(dates[0]);
    const endDate = parseDate(dates[dates.length - 1]);
    const bounds = periodBounds(month);
    if (!startDate || !endDate || startDate.getUTCFullYear() !== bounds.start.getUTCFullYear() || startDate.getUTCMonth() !== bounds.start.getUTCMonth() || endDate.getUTCFullYear() !== bounds.start.getUTCFullYear() || endDate.getUTCMonth() !== bounds.start.getUTCMonth()) return "This Vendor Sales report does not cover " + month + ". Download the selected evaluation month.";
  }
  return null;
}

function validateSearchReport(parsed) {
  const headers = parsed.headers || [];
  const term = findHeader(headers, ["customer search term", "search term"]);
  const spend = findSpendHeader(headers);
  const sales = findHeader(headers, ["sales", "total sales", "attributed sales"]);
  return term && spend && sales ? null : "Include Search term, Cost and Sales in the report.";
}

function readFile(file, validator, onComplete) {
  if (!file) return;
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
    onComplete({ name: file.name, error: "Upload a CSV or Excel file." });
    return;
  }
  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const parsed = lower.endsWith(".csv") ? parseCsv(event.target.result) : parseXlsx(event.target.result);
      onComplete({ name: file.name, parsed, error: validator(parsed) });
    } catch (error) {
      onComplete({ name: file.name, error: error.message || "The file could not be read." });
    }
  };
  if (lower.endsWith(".csv")) reader.readAsText(file); else reader.readAsArrayBuffer(file);
}

function emptyTotals() {
  return { impressions: 0, clicks: 0, spend: 0, sales: 0, purchases: 0, units: 0, ntbSales: 0, ntbPurchases: 0 };
}

function addRow(totals, row, columns) {
  totals.impressions += columns.impressions ? parseNum(row[columns.impressions]) : 0;
  totals.clicks += columns.clicks ? parseNum(row[columns.clicks]) : 0;
  totals.spend += columns.spend ? parseNum(row[columns.spend]) : 0;
  totals.sales += columns.sales ? parseNum(row[columns.sales]) : 0;
  totals.purchases += columns.purchases ? parseNum(row[columns.purchases]) : 0;
  totals.units += columns.units ? parseNum(row[columns.units]) : 0;
  totals.ntbSales += columns.ntbSales ? parseNum(row[columns.ntbSales]) : 0;
  totals.ntbPurchases += columns.ntbPurchases ? parseNum(row[columns.ntbPurchases]) : 0;
}

function columnsFor(parsed) {
  const headers = parsed.headers;
  return {
    date: findExactHeader(headers, ["date"]),
    campaign: findHeader(headers, ["campaign", "campaign name"]),
    adProduct: findHeader(headers, ["ad product", "campaign type", "ad type"]),
    country: findHeader(headers, ["country", "marketplace"]),
    impressions: findHeader(headers, ["impressions"]), clicks: findHeader(headers, ["clicks"]),
    spend: findSpendHeader(headers), sales: findHeader(headers, ["sales", "total sales", "attributed sales"]),
    purchases: findHeader(headers, ["purchases", "orders", "total orders"]), units: findHeader(headers, ["units sold", "units"]),
    ntbSales: findHeader(headers, ["new to brand sales", "ntb sales"]), ntbPurchases: findHeader(headers, ["new to brand purchases", "ntb purchases", "new to brand orders"])
  };
}

function marketMatches(row, countryHeader, market) {
  if (!countryHeader || !row[countryHeader]) return true;
  const value = normalize(row[countryHeader]);
  return MARKETS[market].aliases.some(function (alias) { return value === alias || value.includes(alias); });
}

function actionFor(campaign, targetRoas) {
  const name = normalize(campaign.name);
  const branded = BRAND_TERMS.some(function (term) { return name.includes(term); });
  const roas = campaign.spend ? campaign.sales / campaign.spend : 0;
  const cvr = campaign.clicks ? campaign.purchases / campaign.clicks : 0;
  if (campaign.spend >= 50 && (campaign.sales === 0 || roas < targetRoas * 0.5)) return { label: "Reduce", color: C.red, background: C.redDim, reason: "Spend is not producing enough attributed sales." };
  if (campaign.clicks >= 20 && cvr < 0.05) return { label: "Fix conversion", color: C.amber, background: C.amberDim, reason: "Traffic is arriving, but purchase rate is weak." };
  if (roas >= targetRoas && campaign.purchases >= 3) return branded
    ? { label: "Protect efficiently", color: C.purple, background: C.purpleDim, reason: "Efficient branded coverage; protect while checking dependency." }
    : { label: "Scale", color: C.green, background: C.greenDim, reason: "Performance is above the ROAS target with sufficient orders." };
  return { label: "Monitor", color: C.muted, background: C.inset, reason: "Keep stable until more evidence supports a change." };
}

function analyzeAdvertising(parsed, month, market, targetRoas, exactRange) {
  const columns = columnsFor(parsed);
  const bounds = periodBounds(month, exactRange);
  const current = emptyTotals();
  const previous = emptyTotals();
  const campaignMap = new Map();
  let currentRows = 0;
  let marketRows = 0;
  let parsedDateRows = 0;
  let availableStart = null;
  let availableEnd = null;
  parsed.rows.forEach(function (row) {
    if (!marketMatches(row, columns.country, market)) return;
    marketRows += 1;
    const date = parseAdvertisingDate(row[columns.date], bounds);
    if (date) {
      parsedDateRows += 1;
      if (!availableStart || date < availableStart) availableStart = date;
      if (!availableEnd || date > availableEnd) availableEnd = date;
    }
    const isCurrent = inRange(date, bounds.start, bounds.end);
    const isPrevious = inRange(date, bounds.previousStart, bounds.previousEnd);
    if (!isCurrent && !isPrevious) return;
    if (isCurrent) {
      addRow(current, row, columns);
      currentRows += 1;
      const name = String(row[columns.campaign] || "Unnamed campaign");
      const existing = campaignMap.get(name) || Object.assign(emptyTotals(), { name, adProduct: columns.adProduct ? row[columns.adProduct] : "Sponsored Ads" });
      addRow(existing, row, columns);
      campaignMap.set(name, existing);
    } else addRow(previous, row, columns);
  });
  const campaigns = Array.from(campaignMap.values()).map(function (campaign) { return Object.assign({}, campaign, { action: actionFor(campaign, targetRoas) }); }).sort(function (a, b) { return b.spend - a.spend; });
  return { current, previous, campaigns, currentRows, marketRows, parsedDateRows, availableStart, availableEnd, bounds };
}

function totalVendorSales(parsed) {
  if (!parsed) return 0;
  const revenue = findHeader(parsed.headers, ["ordered revenue", "ordered product sales"]);
  return parsed.rows.reduce(function (sum, row) { return sum + parseNum(row[revenue]); }, 0);
}

function classifyTerm(term) {
  const normalized = normalize(term);
  if (BRAND_TERMS.some(function (candidate) { return normalized.includes(candidate); })) return "Branded";
  if (COMPETITOR_TERMS.some(function (candidate) { return normalized.includes(candidate); })) return "Competitor";
  return "Generic / non-brand";
}

function analyzeSearchTerms(parsed) {
  if (!parsed) return [];
  const columns = columnsFor(parsed);
  const termHeader = findHeader(parsed.headers, ["customer search term", "search term"]);
  const segments = new Map();
  parsed.rows.forEach(function (row) {
    const segment = classifyTerm(row[termHeader]);
    const totals = segments.get(segment) || emptyTotals();
    addRow(totals, row, columns);
    segments.set(segment, totals);
  });
  return ["Branded", "Generic / non-brand", "Competitor"].map(function (segment) { return Object.assign({ segment }, segments.get(segment) || emptyTotals()); });
}

function formatMoney(value, currency) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function formatNumber(value, digits) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits || 0 }).format(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GB", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function formatDateShort(date) {
  return date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
}

function delta(current, previous) {
  if (!previous) return null;
  return (current - previous) / previous;
}

function inputStyle(extra) {
  return Object.assign({ width: "100%", minHeight: 36, boxSizing: "border-box", padding: "8px 10px", border: "1px solid " + C.border, borderRadius: 8, background: C.card, color: C.body, fontSize: 11, outline: "none" }, extra || {});
}

function UploadCard({ id, title, badge, purpose, instructions, state, onFile }) {
  const inputId = "advertising-upload-" + id;
  return <div style={{ padding: 14, border: "1px solid " + (state && state.error ? "#FECACA" : state ? "#BBF7D0" : C.border), borderRadius: 11, background: C.card }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><div style={{ width: 31, height: 31, borderRadius: 8, display: "grid", placeItems: "center", background: state ? C.greenDim : C.inset }}><FileSpreadsheet size={15} color={state ? C.green : C.sky} /></div><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ color: C.navy, fontSize: 12 }}>{title}</strong><span style={{ color: badge === "Required" ? C.red : C.muted, fontSize: 8, fontWeight: 800 }}>{badge.toUpperCase()}</span></div><p style={{ margin: "5px 0 8px", color: C.muted, fontSize: 9, lineHeight: 1.5 }}>{purpose}</p><details><summary style={{ color: C.body, fontSize: 9, fontWeight: 700, cursor: "pointer" }}>What to download</summary><div style={{ marginTop: 6, color: C.muted, fontSize: 9, lineHeight: 1.55 }}>{instructions}</div></details>{state ? <div style={{ marginTop: 9, padding: "7px 8px", borderRadius: 7, background: state.error ? C.redDim : C.greenDim, color: state.error ? C.red : C.green, fontSize: 9, lineHeight: 1.4, overflowWrap: "anywhere" }}>{state.error ? <AlertTriangle size={11} style={{ marginRight: 5, verticalAlign: "middle" }} /> : <CheckCircle2 size={11} style={{ marginRight: 5, verticalAlign: "middle" }} />}{state.error || state.name}</div> : null}<label htmlFor={inputId} style={{ marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 9px", border: "1px solid " + C.border, borderRadius: 7, background: C.surface, color: C.body, fontSize: 9, fontWeight: 750, cursor: "pointer" }}><Upload size={12} /> {state ? "Replace file" : "Upload CSV or Excel"}</label><input id={inputId} type="file" accept=".csv,.xlsx,.xls" onChange={function (event) { onFile(event.target.files[0]); event.target.value = ""; }} style={{ display: "none" }} /></div></div></div>;
}

function MetricCard({ label, value, note, accent }) {
  return <div style={{ padding: 14, border: "1px solid " + C.border, borderTop: "3px solid " + accent, borderRadius: 11, background: C.card }}><div style={{ color: C.muted, fontSize: 8, fontWeight: 800, letterSpacing: "0.05em" }}>{label}</div><div style={{ marginTop: 7, color: C.navy, fontSize: 20, fontWeight: 800 }}>{value}</div><div style={{ marginTop: 4, color: C.muted, fontSize: 9, lineHeight: 1.45 }}>{note}</div></div>;
}

export default function AdvertisingHub({ onBack }) {
  const [market, setMarket] = useState("UK");
  const [month, setMonth] = useState(currentMonth);
  const [goal, setGoal] = useState("efficiency");
  const [targetRoas, setTargetRoas] = useState(4);
  const [maxTacos, setMaxTacos] = useState(12);
  const [files, setFiles] = useState({});

  function setFile(id, file, validator) {
    readFile(file, validator, function (state) { setFiles(function (current) { return Object.assign({}, current, { [id]: state }); }); });
  }

  function changeMarket(value) { setMarket(value); setFiles({}); }

  function changeMonth(value) { setMonth(value); setFiles({}); }

  const advertising = files.ads && !files.ads.error ? files.ads.parsed : null;
  const vendorSales = files.sales && !files.sales.error ? files.sales.parsed : null;
  const salesRange = useMemo(function () { return salesViewingRange(vendorSales); }, [vendorSales]);
  const analysis = useMemo(function () { return advertising && vendorSales ? analyzeAdvertising(advertising, month, market, Number(targetRoas) || 4, salesRange) : null; }, [advertising, vendorSales, month, market, targetRoas, salesRange]);
  const retailSales = useMemo(function () { return totalVendorSales(vendorSales); }, [vendorSales]);
  const searchSegments = useMemo(function () { return files.search && !files.search.error ? analyzeSearchTerms(files.search.parsed) : []; }, [files.search]);
  const currency = MARKETS[market].currency;
  const periodName = new Date(month + "-01T00:00:00Z").toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const analysisPeriod = salesRange ? formatDateShort(salesRange.start) + "–" + formatDateShort(salesRange.end) : periodName;
  const roas = analysis && analysis.current.spend ? analysis.current.sales / analysis.current.spend : 0;
  const previousRoas = analysis && analysis.previous.spend ? analysis.previous.sales / analysis.previous.spend : 0;
  const tacos = analysis && retailSales ? analysis.current.spend / retailSales : 0;
  const paidShare = analysis && retailSales ? analysis.current.sales / retailSales : 0;
  const actionCounts = analysis ? analysis.campaigns.reduce(function (counts, campaign) { counts[campaign.action.label] = (counts[campaign.action.label] || 0) + 1; return counts; }, {}) : {};
  const conclusion = !analysis || !analysis.currentRows ? null : "Advertising generated " + formatMoney(analysis.current.sales, currency) + " from " + formatMoney(analysis.current.spend, currency) + " spend at " + formatNumber(roas, 2) + " ROAS. TACoS is " + formatPercent(tacos) + (tacos * 100 > Number(maxTacos) ? ", above the current " + maxTacos + "% guardrail. " : ". ") + (actionCounts.Scale ? actionCounts.Scale + " campaigns are ready for controlled scaling" : "No campaigns currently meet the scaling rule") + (actionCounts.Reduce ? ", while " + actionCounts.Reduce + " should be reduced or reviewed." : ".");
  const noRowsMessage = !analysis ? "" : analysis.marketRows === 0
    ? "No advertising rows matched " + MARKETS[market].name + ". Check the Country field in the report."
    : analysis.parsedDateRows === 0
      ? "Danuly could not read the advertising Date values. Recreate the report with Date as the time dimension."
      : "The advertising report covers " + formatDateShort(analysis.availableStart) + "–" + formatDateShort(analysis.availableEnd) + ", but contains no rows for " + analysisPeriod + ".";

  return <main style={{ minHeight: "calc(100vh - 52px)", background: C.surface, padding: "26px 18px 54px" }}><div style={{ maxWidth: 1100, margin: "0 auto" }}><button type="button" onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", padding: 0, color: C.muted, fontSize: 12, cursor: "pointer" }}><ArrowLeft size={13} /> Change goal</button><div style={{ margin: "18px 0 20px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16, alignItems: "flex-end" }}><div style={{ maxWidth: 720 }}><span style={{ color: C.sky, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>ADVERTISING DECISION CENTER</span><h1 style={{ margin: "5px 0 6px", color: C.navy, fontSize: 26, letterSpacing: "-0.025em" }}>Is advertising creating efficient growth?</h1><p style={{ margin: 0, color: C.muted, fontSize: 13, lineHeight: 1.55 }}>Connect advertising performance with total Vendor retail sales, then focus budget on the campaigns that can create incremental growth.</p></div><div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", border: "1px solid #BBF7D0", borderRadius: 99, background: C.greenDim, color: C.green, fontSize: 10, fontWeight: 700 }}><ShieldCheck size={13} /> Files stay in this browser</div></div>

  <section style={{ padding: 18, marginBottom: 14, border: "1px solid " + C.border, borderRadius: 14, background: C.card }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 15 }}><div style={{ width: 29, height: 29, borderRadius: 8, display: "grid", placeItems: "center", background: C.sky, color: "#fff", fontSize: 12, fontWeight: 800 }}>1</div><div><h2 style={{ margin: "0 0 4px", color: C.navy, fontSize: 15 }}>Choose the decision</h2><p style={{ margin: 0, color: C.muted, fontSize: 11 }}>Danuly adjusts the explanation and report dates to your business question.</p></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}><label style={{ color: C.muted, fontSize: 9, fontWeight: 800 }}>MARKET<select value={market} onChange={function (event) { changeMarket(event.target.value); }} style={inputStyle({ marginTop: 5 })}>{Object.keys(MARKETS).map(function (code) { return <option key={code} value={code}>{MARKETS[code].name}</option>; })}</select></label><label style={{ color: C.muted, fontSize: 9, fontWeight: 800 }}>EVALUATION MONTH<input type="month" value={month} onChange={function (event) { changeMonth(event.target.value); }} style={inputStyle({ marginTop: 5 })} /></label><label style={{ color: C.muted, fontSize: 9, fontWeight: 800 }}>PRIMARY GOAL<select value={goal} onChange={function (event) { setGoal(event.target.value); }} style={inputStyle({ marginTop: 5 })}><option value="efficiency">Improve efficiency</option><option value="growth">Find growth opportunities</option><option value="brand">Balance branded vs non-brand</option><option value="budget">Reallocate budget</option></select></label></div><details style={{ marginTop: 11, border: "1px solid " + C.border, borderRadius: 9, background: C.surface }}><summary style={{ padding: "10px 11px", cursor: "pointer", color: C.body, fontSize: 10, fontWeight: 750 }}>Decision rules</summary><div style={{ padding: "0 11px 11px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 9 }}><label style={{ color: C.muted, fontSize: 9, fontWeight: 700 }}>TARGET ROAS<input type="number" min="0" step="0.1" value={targetRoas} onChange={function (event) { setTargetRoas(event.target.value); }} style={inputStyle({ marginTop: 4 })} /></label><label style={{ color: C.muted, fontSize: 9, fontWeight: 700 }}>MAX TACoS %<input type="number" min="0" step="0.1" value={maxTacos} onChange={function (event) { setMaxTacos(event.target.value); }} style={inputStyle({ marginTop: 4 })} /></label></div></details></section>

  <section style={{ padding: 18, marginBottom: 14, border: "1px solid " + C.border, borderRadius: 14, background: C.card }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 15 }}><div style={{ width: 29, height: 29, borderRadius: 8, display: "grid", placeItems: "center", background: advertising && vendorSales ? C.green : C.sky, color: "#fff", fontSize: 12, fontWeight: 800 }}>{advertising && vendorSales ? <CheckCircle2 size={16} /> : "2"}</div><div><h2 style={{ margin: "0 0 4px", color: C.navy, fontSize: 15 }}>Upload two reports</h2><p style={{ margin: 0, color: C.muted, fontSize: 11 }}>One advertising report measures media; one Vendor report connects it to total retail sales.</p></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}><UploadCard id="ads" title="Unified Advertising Report" badge="Required" purpose="Measures Sponsored Products, Brands and Display in one file." instructions={<>Amazon Ads Console → Reporting → Create report<br />Country: {MARKETS[market].name}<br />Ad products: Sponsored Products, Sponsored Brands, Sponsored Display<br />Dimensions: Date, Campaign, Ad product<br />Time breakdown: Daily — the CSV must contain a Date column, not Date range<br />Metrics: Impressions, Clicks, Cost, Purchases, Units sold, Sales<br />Period: latest 90 days</>} state={files.ads} onFile={function (file) { setFile("ads", file, validateAdvertisingReport); }} /><UploadCard id="sales" title="Vendor Sales Report" badge="Required" purpose="Calculates total retail sales, TACoS and paid-sales dependency." instructions={<>Vendor Central → Reports → Retail Analytics → Sales<br />Programme: Retail · Distributor View: Manufacturing<br />View By: ASIN · Market: {MARKETS[market].name}<br />Currency: {currency}<br />Date range: the exact dates you want to evaluate within {periodName}</>} state={files.sales} onFile={function (file) { setFile("sales", file, function (parsed) { return validateSalesReport(parsed, market, month); }); }} /></div><div style={{ marginTop: 10, display: "flex", gap: 7, color: C.muted, fontSize: 9, lineHeight: 1.5 }}><Info size={13} color={C.sky} style={{ flexShrink: 0 }} />Danuly reads the exact Sales viewing range and applies those dates to the 90-day daily advertising file. The latest 14 days remain provisional. {salesRange ? "Detected analysis period: " + analysisPeriod + "." : ""}</div></section>

  <section style={{ padding: 18, border: "1px solid " + C.border, borderRadius: 14, background: C.card }}><div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 15 }}><div style={{ width: 29, height: 29, borderRadius: 8, display: "grid", placeItems: "center", background: analysis && analysis.currentRows ? C.green : C.sky, color: "#fff", fontSize: 12, fontWeight: 800 }}>{analysis && analysis.currentRows ? <CheckCircle2 size={16} /> : "3"}</div><div><h2 style={{ margin: "0 0 4px", color: C.navy, fontSize: 15 }}>Make the budget decision</h2><p style={{ margin: 0, color: C.muted, fontSize: 11 }}>Review total efficiency first, then act only on campaigns with enough evidence.</p></div></div>{!analysis ? <div style={{ padding: 24, textAlign: "center", borderRadius: 10, background: C.inset }}><BarChart3 size={20} color={C.subtle} /><p style={{ margin: "8px 0 3px", color: C.body, fontSize: 12, fontWeight: 700 }}>Your advertising decision center will appear here</p><p style={{ margin: 0, color: C.muted, fontSize: 9 }}>Upload Unified Advertising and Vendor Sales reports.</p></div> : !analysis.currentRows ? <div style={{ padding: 13, border: "1px solid #FECACA", borderRadius: 9, background: C.redDim, color: C.red, fontSize: 10 }}><AlertTriangle size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />{noRowsMessage}</div> : <><div style={{ marginBottom: 10, color: C.muted, fontSize: 9, fontWeight: 700 }}>ANALYSIS PERIOD · {analysisPeriod}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10 }}><MetricCard label="AD SPEND" value={formatMoney(analysis.current.spend, currency)} note={(delta(analysis.current.spend, analysis.previous.spend) === null ? "—" : formatPercent(delta(analysis.current.spend, analysis.previous.spend))) + " vs comparable prior period"} accent={C.sky} /><MetricCard label="ATTRIBUTED SALES" value={formatMoney(analysis.current.sales, currency)} note={formatPercent(delta(analysis.current.sales, analysis.previous.sales)) + " vs comparable prior period"} accent={C.purple} /><MetricCard label="ROAS" value={formatNumber(roas, 2)} note={(roas >= Number(targetRoas) ? "Above" : "Below") + " " + targetRoas + " target"} accent={roas >= Number(targetRoas) ? C.green : C.amber} /><MetricCard label="TACoS" value={formatPercent(tacos)} note={formatMoney(retailSales, currency) + " total retail sales"} accent={tacos * 100 <= Number(maxTacos) ? C.green : C.red} /><MetricCard label="PAID SALES SHARE" value={formatPercent(paidShare)} note="Attributed ad sales ÷ total retail sales" accent={C.sky} /></div><div style={{ marginTop: 12, padding: 13, border: "1px solid #BAE6FD", borderRadius: 10, background: "#F0F9FF" }}><div style={{ color: C.sky, fontSize: 8, fontWeight: 800, letterSpacing: "0.05em" }}>DANULY CONCLUSION</div><p style={{ margin: "6px 0 0", color: C.body, fontSize: 11, lineHeight: 1.6 }}>{conclusion}</p></div><div style={{ marginTop: 12, overflowX: "auto", border: "1px solid " + C.border, borderRadius: 10 }}><div style={{ minWidth: 820 }}><div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 0.8fr 0.8fr 0.8fr 1.15fr", gap: 8, padding: "9px 10px", background: C.inset, color: C.muted, fontSize: 8, fontWeight: 800 }}><span>CAMPAIGN</span><span>AD PRODUCT</span><span>SPEND</span><span>SALES</span><span>ROAS</span><span>ACTION</span></div>{analysis.campaigns.slice(0, 30).map(function (campaign, index) { const campaignRoas = campaign.spend ? campaign.sales / campaign.spend : 0; return <div key={campaign.name} style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 0.8fr 0.8fr 0.8fr 1.15fr", gap: 8, alignItems: "center", padding: "10px", borderTop: index ? "1px solid " + C.border : "none", fontSize: 10 }}><div style={{ color: C.body, fontWeight: 650, overflowWrap: "anywhere" }}>{campaign.name}</div><span style={{ color: C.muted }}>{campaign.adProduct || "—"}</span><span>{formatMoney(campaign.spend, currency)}</span><span>{formatMoney(campaign.sales, currency)}</span><strong style={{ color: campaignRoas >= Number(targetRoas) ? C.green : C.body }}>{formatNumber(campaignRoas, 2)}</strong><span title={campaign.action.reason} style={{ justifySelf: "start", padding: "5px 8px", borderRadius: 99, background: campaign.action.background, color: campaign.action.color, fontSize: 8, fontWeight: 800 }}>{campaign.action.label}</span></div>; })}</div></div><details open={goal === "brand"} style={{ marginTop: 12, border: "1px solid " + C.border, borderRadius: 10 }}><summary style={{ padding: "11px 12px", cursor: "pointer", color: C.body, fontSize: 10, fontWeight: 750 }}><Search size={12} style={{ marginRight: 5, verticalAlign: "middle" }} />Branded versus non-branded analysis</summary><div style={{ padding: "0 12px 12px" }}><p style={{ margin: "0 0 9px", color: C.muted, fontSize: 9, lineHeight: 1.5 }}>Upload this only when you need to understand branded dependency or identify keyword opportunities.</p><UploadCard id="search" title="Search Term Report" badge="Optional" purpose="Separates Moroccanoil, generic and competitor customer searches." instructions={<>Reporting → Create report → Search-term template<br />Dimensions: Search term, Campaign, Ad product, Targeting, Match type<br />Metrics: Impressions, Clicks, Cost, Purchases, Sales<br />Period: same evaluation period</>} state={files.search} onFile={function (file) { setFile("search", file, validateSearchReport); }} />{searchSegments.length ? <div style={{ marginTop: 10, overflowX: "auto", border: "1px solid " + C.border, borderRadius: 9 }}><div style={{ minWidth: 560 }}><div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr)", gap: 8, padding: "8px 10px", background: C.inset, color: C.muted, fontSize: 8, fontWeight: 800 }}><span>SEGMENT</span><span>SPEND SHARE</span><span>SALES SHARE</span><span>ROAS</span><span>CVR</span></div>{searchSegments.map(function (segment, index) { const totalSpend = searchSegments.reduce(function (sum, row) { return sum + row.spend; }, 0); const totalSales = searchSegments.reduce(function (sum, row) { return sum + row.sales; }, 0); return <div key={segment.segment} style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4, 1fr)", gap: 8, padding: "9px 10px", borderTop: index ? "1px solid " + C.border : "none", color: C.body, fontSize: 10 }}><strong>{segment.segment}</strong><span>{formatPercent(totalSpend ? segment.spend / totalSpend : 0)}</span><span>{formatPercent(totalSales ? segment.sales / totalSales : 0)}</span><span>{formatNumber(segment.spend ? segment.sales / segment.spend : 0, 2)}</span><span>{formatPercent(segment.clicks ? segment.purchases / segment.clicks : 0)}</span></div>; })}</div></div> : null}</div></details></>}</section><div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "flex-start", padding: "11px 13px", border: "1px solid " + C.border, borderRadius: 10, background: C.card }}><Target size={14} color={C.sky} /><p style={{ margin: 0, color: C.muted, fontSize: 9, lineHeight: 1.55 }}>Recommendations are decision support, not automatic budget changes. The first version uses editable ROAS and TACoS guardrails; profitability and inventory can be connected later.</p></div></div></main>;
}
