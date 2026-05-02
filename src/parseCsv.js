// src/parseCsv.js
// Parses Amazon advertising CSV/TSV reports (auto-detects separator, handles BOM)
// Returns: { headers: string[], rows: object[] } or throws Error with user-facing message

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
  // Search Query Performance
  "search query": "Search Query",
  "search query volume": "Search Query Volume",
  "impression share": "Impression Share",
  "impression share (%)": "Impression Share",
  "impressions share": "Impression Share",
  "click share": "Click Share",
  "click share (%)": "Click Share",
  "clicks share": "Click Share",
  "purchases": "Purchases",
  "purchase share": "Purchase Share",
  "purchase share (%)": "Purchase Share",
  "cart adds": "Cart Adds",
  "cart add share": "Cart Add Share",
};

function normalizeHeader(h) {
  const lower = h.toLowerCase().trim();
  return COLUMN_ALIASES[lower] || h.trim();
}

export function parseCsv(text) {
  // Strip BOM (UTF-8 BOM = \uFEFF, sometimes present in Amazon exports)
  const clean = text.replace(/^\uFEFF/, "").trim();
  const lines = clean.split(/\r?\n/);
  if (lines.length < 2) throw new Error("File has no data rows.");

  // Auto-detect separator: count tabs vs commas in first 5 non-empty lines
  const sample = lines.slice(0, 5).join("\n");
  const tabCount = (sample.match(/\t/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const sep = tabCount > commaCount ? "\t" : ",";
  const sepRe = new RegExp(sep === "\t" ? "\t" : ",", "g");

  // Find header row: scan up to 15 rows for first row with >= 3 separators
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    if ((lines[i].match(sepRe) || []).length >= 3) { headerIdx = i; break; }
  }

  const splitRow = sep === "\t" ? splitTsvRow : splitCsvRow;
  // Normalize headers to canonical names via alias map
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

// TSV: tabs are never inside quoted fields in Amazon exports
function splitTsvRow(line) {
  return line.split("\t");
}

// Validates that all required columns exist in headers (case-insensitive, alias-aware)
// Returns null if OK, or error message string showing what was found
export function validateColumns(headers, required) {
  const headersLower = headers.map(h => h.toLowerCase());
  const missing = required.filter(col => !headersLower.includes(col.toLowerCase()));
  if (missing.length === 0) return null;
  return `Couldn't recognize this report format. Missing: ${missing.join(", ")}. Found in your file: ${headers.join(", ")}. If the column names look different, contact support with these column names.`;
}

// Parse a number from an Amazon report cell (handles %, $, commas, dashes)
export function parseNum(val) {
  if (!val || val === "--" || val === "-" || val === "") return 0;
  return parseFloat(String(val).replace(/[$%,]/g, "")) || 0;
}
