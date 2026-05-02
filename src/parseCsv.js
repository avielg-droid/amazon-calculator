// src/parseCsv.js
// Parses Amazon advertising CSV reports (standard comma-separated with header row)
// Returns: { headers: string[], rows: object[] } or throws Error with user-facing message

export function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("File has no data rows.");

  // Amazon sometimes adds report metadata rows before headers — find header row
  // by looking for the first row that has >3 commas (real data rows)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if ((lines[i].match(/,/g) || []).length >= 3) { headerIdx = i; break; }
  }

  const headers = splitCsvRow(lines[headerIdx]).map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitCsvRow(line).map(v => v.trim().replace(/^"|"$/g, ""));
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

// Validates that all required columns exist in headers
// Returns null if OK, or error message string
export function validateColumns(headers, required) {
  const missing = required.filter(col => !headers.includes(col));
  if (missing.length === 0) return null;
  return `Couldn't recognize this report format. Expected columns: ${required.join(", ")}. Missing: ${missing.join(", ")}. Re-download from Seller Central.`;
}

// Parse a number from an Amazon report cell (handles %, $, commas, dashes)
export function parseNum(val) {
  if (!val || val === "--" || val === "-" || val === "") return 0;
  return parseFloat(String(val).replace(/[$%,]/g, "")) || 0;
}
