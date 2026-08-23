// src/parseCsv.js
// Parses Amazon advertising CSV/TSV/XLSX reports
// Returns: { headers: string[], rows: object[] } or throws Error with user-facing message

import * as XLSX from "xlsx";

// Maps known Amazon column name variations → canonical names used by analysis functions
const COLUMN_ALIASES = {
  // Search Term Report
  "customer search term": "Customer Search Term",
  "search term": "Customer Search Term",
  "match type": "Match Type",
  "targeting type": "Match Type",
  "impressions": "Impressions",
  "clicks": "Clicks",
  "spend": "Spend",
  "orders": "Orders",
  "14 day total orders (#)": "Orders",
  "7 day total orders (#)": "Orders",
  "total orders (#)": "Orders",
  "total orders": "Orders",
  "sales": "Sales",
  "14 day total sales ($)": "Sales",
  "7 day total sales ($)": "Sales",
  "total sales ($)": "Sales",
  "total sales": "Sales",
  "acos": "ACOS",
  "total advertising cost of sales (acos)": "ACOS",
  "campaign name": "Campaign Name",
  "ad group name": "Ad Group Name",
  // Search Query Performance — "Brand View" format (Impressions: Brand Count etc.)
  "search query": "Search Query",
  "search query volume": "Search Query Volume",
  "impressions: brand count": "Impressions",
  "impressions: total count": "Impressions Total",
  "impressions: brand share %": "Impression Share",
  "clicks: brand count": "Clicks",
  "clicks: total count": "Clicks Total",
  "clicks: brand share %": "Click Share",
  "purchases: brand count": "Purchases",
  "purchases: total count": "Purchases Total",
  "purchases: brand share %": "Purchase Share",
  "cart adds: brand count": "Cart Adds",
  "cart adds: brand share %": "Cart Add Share",
  // SQP alternative formats
  "impression share": "Impression Share",
  "impression share (%)": "Impression Share",
  "click share": "Click Share",
  "click share (%)": "Click Share",
  "purchase share": "Purchase Share",
  "purchase share (%)": "Purchase Share",
  "purchases": "Purchases",
  // Targeting (Keyword Performance) report
  "keyword": "Targeting",
  "keyword text": "Targeting",
  "cost per click (cpc)": "CPC",
  "click-thru rate (ctr)": "CTR",
  "7 day total sales (#)": "Sales",
  "7 day total units (#)": "Units",
  "total return on advertising spend (roas)": "RoAS",
  // Placement report
  "placement": "Placement",
  "bid adjustment": "Bid Adjustment",
};

function normalizeHeader(h) {
  const lower = h.toLowerCase().trim();
  return COLUMN_ALIASES[lower] || h.trim();
}

const HEADER_HINTS = [
  "asin", "product title", "brand", "ordered revenue", "ordered units",
  "dispatched revenue", "dispatched cogs", "dispatched units", "customer returns"
];

function headerCandidateScore(cells, nextCells) {
  const values = cells.map(cell => String(cell || "").trim()).filter(Boolean);
  const nextValues = (nextCells || []).filter(cell => String(cell || "").trim() !== "");
  const assignmentFields = values.filter(value => value.includes("=")).length;
  const recognizedHeaders = values.filter(value => {
    const lower = value.toLowerCase();
    return Boolean(COLUMN_ALIASES[lower]) || HEADER_HINTS.includes(lower);
  }).length;
  const consistentDataRow = values.length >= 3 && nextValues.length === values.length;

  return values.length
    + (consistentDataRow ? 100 : 0)
    + (recognizedHeaders * 100)
    - (assignmentFields * 20);
}

function findHeaderIndex(rows) {
  let headerIdx = 0;
  let bestScore = -Infinity;
  const limit = Math.min(rows.length, 30);

  for (let i = 0; i < limit; i++) {
    let nextIdx = i + 1;
    while (nextIdx < rows.length && rows[nextIdx].every(cell => String(cell || "").trim() === "")) {
      nextIdx += 1;
    }
    const score = headerCandidateScore(rows[i], rows[nextIdx]);
    if (score > bestScore) {
      bestScore = score;
      headerIdx = i;
    }
  }

  return headerIdx;
}

// Parse CSV or TSV text → { headers, rows }
export function parseCsv(text) {
  // Strip BOM (UTF-8 BOM = \uFEFF, present in many Amazon exports)
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split(/\r?\n/);
  if (lines.length < 2) throw new Error("File has no data rows.");

  // Auto-detect separator: count tabs vs commas across first 5 lines
  const sample = lines.slice(0, 5).join("\n");
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const sep = tabCount > commaCount ? "\t" : ",";
  const splitRow = sep === "\t" ? splitTsvRow : splitCsvRow;
  const parsedLines = lines.map(splitRow);
  const headerIdx = findHeaderIndex(parsedLines);
  if (parsedLines[headerIdx].filter(Boolean).length < 3) throw new Error("File has no data rows.");
  const headers = splitRow(lines[headerIdx]).map(h => normalizeHeader(h.replace(/^"|"$/g, "")));
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitRow(line).map(v => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }

  return { headers, rows };
}

// Parse an Excel (.xlsx / .xls) ArrayBuffer → { headers, rows }
export function parseXlsx(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (data.length < 2) throw new Error("File has no data rows.");

  const headerIdx = findHeaderIndex(data);

  const headers = data[headerIdx].map(h => normalizeHeader(String(h)));
  const rows = [];

  for (let i = headerIdx + 1; i < data.length; i++) {
    const vals = data[i];
    if (vals.every(v => v === "" || v === null || v === undefined)) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] != null ? String(vals[idx]) : ""; });
    rows.push(row);
  }

  return { headers, rows };
}

// Handles quoted fields with commas inside
function splitCsvRow(line) {
  const result = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; }
    else if (ch === "," && !inQuote) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function splitTsvRow(line) {
  return line.split("\t");
}

// Validates that all required columns exist in (already-normalized) headers
// Returns null if OK, or error string showing what was found
export function validateColumns(headers, required) {
  const headersLower = headers.map(h => h.toLowerCase());
  const missing = required.filter(col => !headersLower.includes(col.toLowerCase()));
  if (missing.length === 0) return null;
  return `Couldn't recognize this report format. Missing: ${missing.join(", ")}. Found in your file: ${headers.join(", ")}. Contact support with these column names.`;
}

// Parse a number from an Amazon report cell (handles %, $, commas, dashes)
export function parseNum(val) {
  if (!val || val === "--" || val === "-" || val === "") return 0;
  const text = String(val).trim();
  const negative = /^\(.*\)$/.test(text);
  const number = parseFloat(text.replace(/[^\d.-]/g, "")) || 0;
  return negative ? -number : number;
}
