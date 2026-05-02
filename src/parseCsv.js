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
  "targeting": "Match Type",
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
};

function normalizeHeader(h) {
  const lower = h.toLowerCase().trim();
  return COLUMN_ALIASES[lower] || h.trim();
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
  const countSep = (line) => (line.match(sep === "\t" ? /\t/g : /,/g) || []).length;

  // Find header row: pick the row with the MOST separators in first 15 rows
  // (metadata rows have few columns; the real header has many)
  let headerIdx = 0;
  let maxSeps = 0;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const n = countSep(lines[i]);
    if (n > maxSeps) { maxSeps = n; headerIdx = i; }
  }
  if (maxSeps < 2) throw new Error("File has no data rows.");

  const splitRow = sep === "\t" ? splitTsvRow : splitCsvRow;
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

  // Find row with most columns (same heuristic as CSV)
  let headerIdx = 0;
  let maxCols = 0;
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    const n = data[i].filter(c => c !== "").length;
    if (n > maxCols) { maxCols = n; headerIdx = i; }
  }

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
  return parseFloat(String(val).replace(/[$%,]/g, "")) || 0;
}
