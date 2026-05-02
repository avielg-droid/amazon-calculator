// src/PPCLab.jsx
import React, { useState, useMemo } from "react";
import { Upload, ChevronDown, ChevronRight, Download, AlertCircle, Info, CheckCircle } from "lucide-react";
import { parseCsv, validateColumns } from "./parseCsv.js";
import { analyzeStr, exportNegativesCsv, exportHarvestCsv, STR_REQUIRED_COLUMNS, STR_THRESHOLD_DEFAULTS } from "./analyzeStr.js";
import { analyzeSqp, exportSqpCsv, SQP_REQUIRED_COLUMNS, SQP_THRESHOLD_DEFAULTS } from "./analyzeSqp.js";

const C = {
  emerald: "#10b981", cyan: "#06b6d4", orange: "#f97316",
  rose: "#f43f5e", violet: "#8b5cf6", amber: "#f59e0b",
  s4: "#94a3b8", s5: "#64748b", s6: "#475569",
  s7: "#334155", s8: "#1e293b", s9: "#0f172a", s95: "#020617",
};
const CARD = { background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 16, padding: "16px 18px", boxShadow: "0 4px 24px #00000040" };
const LABEL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s4, marginBottom: 4, display: "block" };

export default function PPCLab({ ppcStr, setPpcStr, ppcSqp, setPpcSqp }) {
  const [activeSub, setActiveSub] = useState("str");

  const subTabBtn = (t) => ({
    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
    background: activeSub === t ? C.violet : "transparent",
    color: activeSub === t ? "#fff" : C.s4,
    transition: "all 0.15s",
  });

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>PPC Lab</span>
        <span style={{ fontSize: 10, color: C.s5, background: C.s8, borderRadius: 6, padding: "3px 8px" }}>Beta</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 10, padding: 3 }}>
          <button style={subTabBtn("str")} onClick={() => setActiveSub("str")}>Search Terms</button>
          <button style={subTabBtn("sqp")} onClick={() => setActiveSub("sqp")}>Search Query Perf</button>
        </div>
      </div>

      {activeSub === "str" && <StrTab data={ppcStr} setData={setPpcStr} />}
      {activeSub === "sqp" && <SqpTab data={ppcSqp} setData={setPpcSqp} />}
    </div>
  );
}

// ── Upload Zone ──

function UploadZone({ onFile, label = "Drop CSV here or click to browse" }) {
  const [dragging, setDragging] = useState(false);
  const inputId = "ppc-file-" + label.replace(/\s/g, "").slice(0, 10);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      const ext = file.name.split(".").pop().toUpperCase();
      onFile(null, `Looks like a ${ext} file. PPC Lab needs a CSV.`, null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => onFile(file, null, e.target.result);
    reader.readAsText(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={() => document.getElementById(inputId).click()}
      style={{
        border: `2px dashed ${dragging ? C.violet : C.s7}`,
        borderRadius: 12, padding: "32px 24px", textAlign: "center",
        cursor: "pointer", transition: "border-color 0.2s",
        background: dragging ? "#8b5cf608" : "transparent",
      }}
    >
      <Upload size={24} color={C.s5} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 13, color: C.s4, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: C.s6 }}>CSV files only</div>
      <input id={inputId} type="file" accept=".csv" style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  );
}

// ── Shared helpers ──

function Tooltip({ text }) {
  const [v, setV] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}>
      <Info size={11} color={C.s5} />
      {v && (
        <div style={{
          position: "absolute", left: 16, top: -4, zIndex: 50,
          background: C.s8, border: `1px solid ${C.s7}`, borderRadius: 8,
          padding: "8px 10px", width: 200, fontSize: 11, color: C.s4,
          lineHeight: 1.5, boxShadow: "0 4px 16px #00000060", pointerEvents: "none",
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "ui-monospace, monospace" }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s5, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function RecoSection({ title, color, items, expandedWhy, setExpandedWhy, idPrefix, columns, onExport, exportLabel }) {
  return (
    <div style={{ border: `1px solid ${color}22`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${color}08`, borderBottom: `1px solid ${color}20` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{title}</span>
        <span style={{ fontSize: 11, color: C.s5 }}>({items.length})</span>
        <button onClick={onExport}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.s4, background: C.s8, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
          <Download size={11} />{exportLabel}
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.s95 }}>
              {columns.map(col => (
                <th key={col.key} style={{ padding: "8px 12px", textAlign: "left", color: C.s5, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.label} <Tooltip text={col.tip} />
                  </span>
                </th>
              ))}
              <th style={{ padding: "8px 12px", color: C.s5, fontWeight: 600, fontSize: 11 }}>Why?</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const id = `${idPrefix}-${i}`;
              const isOpen = expandedWhy === id;
              return (
                <React.Fragment key={id}>
                  <tr style={{ borderTop: `1px solid ${C.s8}`, background: isOpen ? C.s95 : "transparent" }}>
                    {columns.map(col => (
                      <td key={col.key} style={{ padding: "8px 12px", color: "#e2e8f0", whiteSpace: col.key === "term" || col.key === "query" || col.key === "recommendedAction" || col.key === "insight" ? "normal" : "nowrap" }}>
                        {col.key === "spend" ? `$${Number(item[col.key]).toFixed(2)}` : item[col.key]}
                      </td>
                    ))}
                    <td style={{ padding: "8px 12px" }}>
                      <button onClick={() => setExpandedWhy(isOpen ? null : id)}
                        style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
                        {isOpen ? "hide" : "why?"}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={id + "-why"}>
                      <td colSpan={columns.length + 1} style={{ padding: "8px 12px 10px 24px", fontSize: 11, color: C.s4, lineHeight: 1.6, background: `${color}06` }}>
                        <strong style={{ color }}>Flagged because:</strong> {item.whyFlag}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── StrTab ──

function StrTab({ data, setData }) {
  const [thresholds, setThresholds] = useState({ ...STR_THRESHOLD_DEFAULTS });
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [expandedWhy, setExpandedWhy] = useState(null);

  const analysis = useMemo(() => {
    if (!data.rows.length) return null;
    return analyzeStr(data.rows, thresholds);
  }, [data.rows, thresholds]);

  const handleFile = (file, fileError, text) => {
    if (fileError) { setError(fileError); return; }
    try {
      const { headers, rows } = parseCsv(text);
      const colError = validateColumns(headers, STR_REQUIRED_COLUMNS);
      if (colError) { setError(colError); return; }
      setError(null);
      setData({ rows, file });
    } catch (e) {
      setError(e.message);
    }
  };

  const downloadCsv = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Onboarding (no file loaded) ──
  if (!data.rows.length) {
    return (
      <div>
        <div style={{ background: "#8b5cf608", border: "1px solid #8b5cf620", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.violet, marginBottom: 10 }}>How to get your Search Term Report</div>
          {[
            "Go to Seller Central → Reports → Advertising Reports",
            "Select report type: Search Term Report",
            "Choose date range (last 30–60 days recommended)",
            "Click Create Report, then Download when ready",
            "Upload the CSV below",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: C.s8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.violet }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.s4, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.s95, borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.s5, marginBottom: 4 }}>What you'll get</div>
            <div style={{ fontSize: 12, color: C.s4, lineHeight: 1.7 }}>
              • Negative keyword candidates (spending money with 0 conversions)<br />
              • Harvest opportunities (converting search terms not yet targeted as Exact match)<br />
              • Full data table for verification<br />
              • Export-ready CSVs for Amazon Bulk Operations
            </div>
          </div>
        </div>
        {error && <div style={{ background: "#f43f5e10", border: "1px solid #f43f5e30", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.rose, display: "flex", gap: 8, alignItems: "flex-start" }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
        <UploadZone onFile={handleFile} label="Drop your Search Term Report CSV here or click to browse" />
      </div>
    );
  }

  // ── Analysis view ──
  const { negatives, harvest, totalTerms } = analysis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info + re-upload */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.s5 }}>
        <CheckCircle size={13} color={C.emerald} />
        <span>{data.file?.name} · {totalTerms.toLocaleString()} terms</span>
        <button onClick={() => { setData({ rows: [], file: null }); setError(null); }}
          style={{ marginLeft: "auto", fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
          Upload new file
        </button>
      </div>

      {/* Thresholds panel */}
      <div style={{ border: `1px solid ${C.s8}`, borderRadius: 10, overflow: "hidden" }}>
        <button onClick={() => setThresholdsOpen(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.s95, border: "none", cursor: "pointer", color: C.s4, fontSize: 12 }}>
          {thresholdsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span>Thresholds</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.s6 }}>
            {JSON.stringify(thresholds) === JSON.stringify(STR_THRESHOLD_DEFAULTS) ? "using defaults" : "customized"}
          </span>
        </button>
        {thresholdsOpen && (
          <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { key: "minSpendNegative", label: "Min Spend (Negative)", prefix: "$", tip: "Terms spending above this with 0 orders are flagged as negative candidates" },
              { key: "minClicksNegative", label: "Min Clicks (Negative)", tip: "Terms with this many clicks and 0 orders are flagged as negative candidates" },
              { key: "minOrdersHarvest", label: "Min Orders (Harvest)", tip: "Terms with at least this many orders are considered for harvesting" },
              { key: "maxAcosHarvest", label: "Max ACoS (Harvest)", suffix: "%", tip: "Only harvest terms with ACoS at or below this threshold" },
            ].map(({ key, label, prefix, suffix, tip }) => (
              <div key={key}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span style={LABEL}>{label}</span>
                  <Tooltip text={tip} />
                  <button onClick={() => setThresholds(t => ({ ...t, [key]: STR_THRESHOLD_DEFAULTS[key] }))}
                    style={{ marginLeft: "auto", fontSize: 9, color: C.s6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>reset</button>
                </div>
                <div style={{ position: "relative" }}>
                  {prefix && <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{prefix}</span>}
                  <input type="number" value={thresholds[key]}
                    onChange={e => setThresholds(t => ({ ...t, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: "100%", background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: `7px ${suffix ? 28 : 10}px 7px ${prefix ? 22 : 10}px`, fontSize: 12, color: "#e2e8f0", outline: "none", boxSizing: "border-box" }} />
                  {suffix && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <SummaryCard label="Negative Candidates" value={negatives.length} color={C.rose} />
        <SummaryCard label="Harvest Opportunities" value={harvest.length} color={C.emerald} />
        <SummaryCard label="Terms Analyzed" value={totalTerms.toLocaleString()} color={C.s4} />
      </div>

      {/* Negatives list */}
      {negatives.length > 0 && (
        <RecoSection
          title="Negative Keyword Candidates"
          color={C.rose}
          items={negatives}
          expandedWhy={expandedWhy}
          setExpandedWhy={setExpandedWhy}
          idPrefix="neg"
          columns={[
            { key: "term", label: "Search Term", tip: "The exact customer search query" },
            { key: "spend", label: "Spend ($)", tip: "Total ad spend on this term" },
            { key: "clicks", label: "Clicks", tip: "Total clicks" },
            { key: "orders", label: "Orders", tip: "Total orders attributed" },
            { key: "campaign", label: "Campaign", tip: "Campaign name" },
            { key: "recommendedNegType", label: "Neg. Type", tip: "Recommended negative match type to add" },
          ]}
          onExport={() => downloadCsv(exportNegativesCsv(negatives), "negatives.csv")}
          exportLabel="Export negatives.csv"
        />
      )}

      {/* Harvest list */}
      {harvest.length > 0 && (
        <RecoSection
          title="Harvest Opportunities"
          color={C.emerald}
          items={harvest}
          expandedWhy={expandedWhy}
          setExpandedWhy={setExpandedWhy}
          idPrefix="harv"
          columns={[
            { key: "term", label: "Search Term", tip: "The converting search query" },
            { key: "orders", label: "Orders", tip: "Number of orders from this term" },
            { key: "cvr", label: "CVR %", tip: "Conversion rate: orders / clicks" },
            { key: "acos", label: "ACoS %", tip: "Advertising Cost of Sales: spend / revenue" },
            { key: "matchType", label: "Current Match", tip: "Current keyword match type in your campaign" },
            { key: "recommendedAction", label: "Action", tip: "What to do with this term" },
          ]}
          onExport={() => downloadCsv(exportHarvestCsv(harvest), "harvest.csv")}
          exportLabel="Export harvest.csv"
        />
      )}

      {negatives.length === 0 && harvest.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px", color: C.s5, fontSize: 13 }}>
          No candidates found with current thresholds. Try lowering the thresholds above.
        </div>
      )}
    </div>
  );
}

function SqpTab({ data, setData }) {
  const [thresholds, setThresholds] = useState({ ...SQP_THRESHOLD_DEFAULTS });
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [error, setError] = useState(null);
  const [expandedWhy, setExpandedWhy] = useState(null);

  const analysis = useMemo(() => {
    if (!data.rows.length) return null;
    return analyzeSqp(data.rows, thresholds);
  }, [data.rows, thresholds]);

  const handleFile = (file, fileError, text) => {
    if (fileError) { setError(fileError); return; }
    try {
      const { headers, rows } = parseCsv(text);
      const colError = validateColumns(headers, SQP_REQUIRED_COLUMNS);
      if (colError) { setError(colError); return; }
      setError(null);
      setData({ rows, file });
    } catch (e) {
      setError(e.message);
    }
  };

  const downloadCsv = (content, filename) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Onboarding ──
  if (!data.rows.length) {
    return (
      <div>
        <div style={{ background: "#06b6d408", border: "1px solid #06b6d420", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.cyan, marginBottom: 10 }}>How to get your Search Query Performance Report</div>
          {[
            "Go to Seller Central → Brand Analytics → Search Query Performance",
            "Select your ASIN and date range (last 90 days recommended for volume)",
            "Click Export → Download CSV",
            "Upload the CSV below",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: C.s8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.cyan }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.s4, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.s95, borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.s5, marginBottom: 4 }}>What you'll get</div>
            <div style={{ fontSize: 12, color: C.s4, lineHeight: 1.7 }}>
              • Opportunity keywords — good conversion but low market share (increase bids)<br />
              • Risk keywords — high impressions but poor conversion (review relevance)<br />
              • Export-ready CSV with labels and recommended actions
            </div>
          </div>
        </div>
        {error && <div style={{ background: "#f43f5e10", border: "1px solid #f43f5e30", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.rose, display: "flex", gap: 8, alignItems: "flex-start" }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
        <UploadZone onFile={handleFile} label="Drop your Search Query Performance CSV here or click to browse" />
      </div>
    );
  }

  const { opportunities, risks, totalQueries } = analysis;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info + re-upload */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.s5 }}>
        <CheckCircle size={13} color={C.emerald} />
        <span>{data.file?.name} · {totalQueries.toLocaleString()} queries</span>
        <button onClick={() => { setData({ rows: [], file: null }); setError(null); }}
          style={{ marginLeft: "auto", fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
          Upload new file
        </button>
      </div>

      {/* Thresholds panel */}
      <div style={{ border: `1px solid ${C.s8}`, borderRadius: 10, overflow: "hidden" }}>
        <button onClick={() => setThresholdsOpen(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.s95, border: "none", cursor: "pointer", color: C.s4, fontSize: 12 }}>
          {thresholdsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span>Thresholds</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.s6 }}>
            {JSON.stringify(thresholds) === JSON.stringify(SQP_THRESHOLD_DEFAULTS) ? "using defaults" : "customized"}
          </span>
        </button>
        {thresholdsOpen && (
          <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { key: "minSearchVolume", label: "Min Search Volume", tip: "Ignore queries below this monthly search volume — filters out noise" },
              { key: "minPurchaseShareOpportunity", label: "Min Purchase Share (Opp.)", suffix: "%", tip: "Your purchase share must be at least this high to flag as an opportunity" },
              { key: "maxClickShareOpportunity", label: "Max Click Share (Opp.)", suffix: "%", tip: "Your click share must be at or below this to flag as low market share" },
              { key: "minImpressionShareRisk", label: "Min Impression Share (Risk)", suffix: "%", tip: "Impression share must be at least this to consider a query over-indexed for impressions" },
              { key: "maxPurchaseShareRisk", label: "Max Purchase Share (Risk)", suffix: "%", tip: "Purchase share must be at or below this to flag as under-converting" },
            ].map(({ key, label, suffix, tip }) => (
              <div key={key}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span style={LABEL}>{label}</span>
                  <Tooltip text={tip} />
                  <button onClick={() => setThresholds(t => ({ ...t, [key]: SQP_THRESHOLD_DEFAULTS[key] }))}
                    style={{ marginLeft: "auto", fontSize: 9, color: C.s6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>reset</button>
                </div>
                <div style={{ position: "relative" }}>
                  <input type="number" value={thresholds[key]}
                    onChange={e => setThresholds(t => ({ ...t, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: "100%", background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: `7px ${suffix ? 28 : 10}px 7px 10px`, fontSize: 12, color: "#e2e8f0", outline: "none", boxSizing: "border-box" }} />
                  {suffix && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <SummaryCard label="Opportunities" value={opportunities.length} color={C.emerald} />
        <SummaryCard label="Risk Keywords" value={risks.length} color={C.rose} />
        <SummaryCard label="Queries Analyzed" value={totalQueries.toLocaleString()} color={C.s4} />
      </div>

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <RecoSection
          title="Opportunity Keywords"
          color={C.emerald}
          items={opportunities}
          expandedWhy={expandedWhy}
          setExpandedWhy={setExpandedWhy}
          idPrefix="opp"
          columns={[
            { key: "query", label: "Search Query", tip: "The customer search query" },
            { key: "volume", label: "Volume", tip: "Monthly search query volume" },
            { key: "purchaseShare", label: "Purchase Share %", tip: "Your share of purchases for this query" },
            { key: "clickShare", label: "Click Share %", tip: "Your share of clicks for this query" },
            { key: "impressionShare", label: "Imp. Share %", tip: "Your share of impressions for this query" },
            { key: "insight", label: "Insight", tip: "Recommended action" },
          ]}
          onExport={() => downloadCsv(exportSqpCsv(opportunities, []), "sqp-opportunities.csv")}
          exportLabel="Export opportunities.csv"
        />
      )}

      {/* Risks */}
      {risks.length > 0 && (
        <RecoSection
          title="Risk Keywords"
          color={C.rose}
          items={risks}
          expandedWhy={expandedWhy}
          setExpandedWhy={setExpandedWhy}
          idPrefix="risk"
          columns={[
            { key: "query", label: "Search Query", tip: "The customer search query" },
            { key: "volume", label: "Volume", tip: "Monthly search query volume" },
            { key: "impressionShare", label: "Imp. Share %", tip: "Your share of impressions — high visibility" },
            { key: "purchaseShare", label: "Purchase Share %", tip: "Your share of purchases — low conversion" },
            { key: "clickShare", label: "Click Share %", tip: "Your share of clicks" },
            { key: "insight", label: "Insight", tip: "Recommended action" },
          ]}
          onExport={() => downloadCsv(exportSqpCsv([], risks), "sqp-risks.csv")}
          exportLabel="Export risks.csv"
        />
      )}

      {opportunities.length === 0 && risks.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px", color: C.s5, fontSize: 13 }}>
          No keywords flagged with current thresholds. Try adjusting the thresholds above.
        </div>
      )}
    </div>
  );
}
