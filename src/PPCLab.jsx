// src/PPCLab.jsx
import React, { useState, useMemo } from "react";
import { Upload, ChevronDown, ChevronRight, Download, AlertCircle, Info, CheckCircle } from "lucide-react";
import { parseCsv, parseXlsx, validateColumns } from "./parseCsv.js";
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
  const [hoveredSub, setHoveredSub] = useState(null);

  const subTabBtn = (t) => ({
    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
    background: activeSub === t ? C.violet : hoveredSub === t ? C.s7 : "transparent",
    color: activeSub === t ? "#fff" : hoveredSub === t ? "#e2e8f0" : C.s4,
    transition: "all 0.15s",
    outline: "none",
  });

  return (
    <div style={CARD}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ppc-num::-webkit-inner-spin-button, .ppc-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ppc-num { -moz-appearance: textfield; }
        .ppc-num:focus { border-color: #8b5cf6 !important; box-shadow: 0 0 0 1px #8b5cf622 !important; }
        .ppc-text:focus { border-color: #8b5cf6 !important; outline: none !important; }
        .why-btn:hover { background: #334155 !important; color: #e2e8f0 !important; }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>PPC Lab</span>
        <span style={{ fontSize: 10, color: C.s5, background: C.s8, borderRadius: 6, padding: "3px 8px" }}>Beta</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 10, padding: 3 }}>
          <button style={subTabBtn("str")} onClick={() => setActiveSub("str")} onMouseEnter={() => setHoveredSub("str")} onMouseLeave={() => setHoveredSub(null)}>Search Terms</button>
          <button style={subTabBtn("sqp")} onClick={() => setActiveSub("sqp")} onMouseEnter={() => setHoveredSub("sqp")} onMouseLeave={() => setHoveredSub(null)}>Search Query Perf</button>
        </div>
      </div>

      {activeSub === "str" && <StrTab data={ppcStr} setData={setPpcStr} />}
      {activeSub === "sqp" && <SqpTab data={ppcSqp} setData={setPpcSqp} />}
    </div>
  );
}

// ── Upload Zone ──

function UploadZone({ onFile, label = "Drop file here or click to browse" }) {
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputId = "ppc-file-" + label.replace(/\s/g, "").slice(0, 10);

  const handleFile = (file) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");
    const isCsv = name.endsWith(".csv");
    if (!isXlsx && !isCsv) {
      const ext = file.name.split(".").pop().toUpperCase();
      onFile(null, `Unsupported file type (.${ext}). Upload a CSV or Excel (.xlsx) file.`, null);
      return;
    }
    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (e) => onFile(file, null, e.target.result, "xlsx");
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => onFile(file, null, e.target.result, "csv");
      reader.readAsText(file);
    }
  };

  const trigger = () => document.getElementById(inputId).click();

  return (
    <div
      role="button"
      tabIndex={0}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
      onClick={trigger}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        border: `2px dashed ${dragging || focused ? C.violet : C.s7}`,
        borderRadius: 12, padding: "32px 24px", textAlign: "center",
        cursor: "pointer", transition: "border-color 0.2s",
        background: dragging ? "#8b5cf608" : "transparent",
        outline: focused ? `2px solid ${C.violet}40` : "none",
        outlineOffset: 2,
      }}
    >
      <Upload size={24} color={C.s5} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 13, color: C.s4, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: C.s6 }}>CSV or Excel (.xlsx) files</div>
      <input id={inputId} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
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
  const [hoveredExport, setHoveredExport] = useState(false);
  return (
    <div style={{ border: `1px solid ${color}22`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${color}08`, borderBottom: `1px solid ${color}20` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{title}</span>
        <span style={{ fontSize: 11, color: C.s5 }}>({items.length})</span>
        <button onClick={onExport}
          onMouseEnter={() => setHoveredExport(true)} onMouseLeave={() => setHoveredExport(false)}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.s4, background: hoveredExport ? C.s7 : C.s8, border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", transition: "background 0.15s", outline: "none" }}>
          <Download size={11} />{exportLabel}
        </button>
      </div>
      <div style={{ position: "relative" }}>
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
                          {col.render ? col.render(item) : col.key === "spend" ? `$${Number(item[col.key]).toFixed(2)}` : item[col.key]}
                        </td>
                      ))}
                      <td style={{ padding: "8px 12px" }}>
                        <button className="why-btn" onClick={() => setExpandedWhy(isOpen ? null : id)}
                          style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}>
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
        {/* Right-edge fade hint for horizontal scroll */}
        <div style={{
          position: "absolute", top: 0, right: 0, height: "100%", width: 40,
          background: `linear-gradient(to right, transparent, ${C.s9})`,
          pointerEvents: "none",
        }} />
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
  const [brandFilter, setBrandFilter] = useState("");
  const [parsing, setParsing] = useState(false);

  const analysis = useMemo(() => {
    if (!data.rows.length) return null;
    return analyzeStr(data.rows, thresholds);
  }, [data.rows, thresholds]);

  const handleFile = (file, fileError, fileData, fileType) => {
    if (fileError) { setError(fileError); return; }
    setParsing(true);
    setTimeout(() => {
      try {
        const parsed = fileType === "xlsx" ? parseXlsx(fileData) : parseCsv(fileData);
        const colError = validateColumns(parsed.headers, STR_REQUIRED_COLUMNS);
        if (colError) { setError(colError); setParsing(false); return; }
        setError(null);
        setData({ rows: parsed.rows, file });
      } catch (e) {
        setError(e.message);
      } finally {
        setParsing(false);
      }
    }, 30);
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
        <div style={{ marginTop: 10, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: C.amber, background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 8, padding: "8px 12px" }}>
          <span style={{ flexShrink: 0 }}>⚠</span>
          <span>Recommended: Use a 30–60 day report for best results. A 1-day report may show 0 recommendations due to low spend data.</span>
        </div>
        {error && <div style={{ background: "#f43f5e10", border: "1px solid #f43f5e30", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.rose, display: "flex", gap: 8, alignItems: "flex-start" }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
        {parsing ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: C.s4, fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${C.s7}`, borderTopColor: C.violet, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
            <div>Analyzing file…</div>
          </div>
        ) : (
          <UploadZone onFile={handleFile} label="Drop your Search Term Report here or click to browse (CSV or Excel)" />
        )}
      </div>
    );
  }

  // ── Analysis view ──
  const { negatives, harvest, totalTerms } = analysis;
  const brandLower = brandFilter.trim().toLowerCase();
  const filteredNegatives = brandLower ? negatives.filter(n => !n.term.toLowerCase().includes(brandLower)) : negatives;
  const filteredHarvest = brandLower ? harvest.filter(h => !h.term.toLowerCase().includes(brandLower)) : harvest;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info + re-upload */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.s5 }}>
        <CheckCircle size={13} color={C.emerald} />
        <span>{data.file?.name} · {totalTerms.toLocaleString()} terms</span>
        <button onClick={() => { setData({ rows: [], file: null }); setError(null); }}
          style={{ marginLeft: "auto", fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
          Upload new file
        </button>
      </div>

      {/* Brand filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s4, whiteSpace: "nowrap" }}>Exclude brand:</span>
        <input type="text" className="ppc-text" placeholder="e.g. your brand name" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
          style={{ flex: 1, background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#e2e8f0", outline: "none", transition: "border-color 0.15s" }} />
        {brandFilter && <button onClick={() => setBrandFilter("")}
          style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>clear</button>}
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
                    style={{ marginLeft: "auto", fontSize: 9, color: C.s6, background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>reset</button>
                </div>
                <div style={{ position: "relative" }}>
                  {prefix && <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{prefix}</span>}
                  <input type="number" className="ppc-num" value={thresholds[key]}
                    onChange={e => setThresholds(t => ({ ...t, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: "100%", background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: `7px ${suffix ? 28 : 10}px 7px ${prefix ? 22 : 10}px`, fontSize: 12, color: "#e2e8f0", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }} />
                  {suffix && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <SummaryCard label="Negative Candidates" value={filteredNegatives.length} color={C.rose} />
        <SummaryCard label="Harvest Opportunities" value={filteredHarvest.length} color={C.emerald} />
        <SummaryCard label="Terms Analyzed" value={totalTerms.toLocaleString()} color={C.s4} />
      </div>

      {/* Negatives list */}
      {filteredNegatives.length > 0 && (
        <RecoSection
          title="Negative Keyword Candidates"
          color={C.rose}
          items={filteredNegatives}
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
          onExport={() => downloadCsv(exportNegativesCsv(filteredNegatives), "negatives.csv")}
          exportLabel="Export negatives.csv"
        />
      )}

      {/* Harvest list */}
      {filteredHarvest.length > 0 && (
        <RecoSection
          title="Harvest Opportunities"
          color={C.emerald}
          items={filteredHarvest}
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
          onExport={() => downloadCsv(exportHarvestCsv(filteredHarvest), "harvest.csv")}
          exportLabel="Export harvest.csv"
        />
      )}

      {filteredNegatives.length === 0 && filteredHarvest.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px", color: C.s5, fontSize: 13 }}>
          {brandLower
            ? `All results filtered by brand "${brandFilter}". Clear the brand filter or try a different term.`
            : "No candidates found with current thresholds. Try lowering the thresholds above."}
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
  const [brandFilter, setBrandFilter] = useState("");
  const [parsing, setParsing] = useState(false);

  const analysis = useMemo(() => {
    if (!data.rows.length) return null;
    return analyzeSqp(data.rows, thresholds);
  }, [data.rows, thresholds]);

  const handleFile = (file, fileError, fileData, fileType) => {
    if (fileError) { setError(fileError); return; }
    setParsing(true);
    setTimeout(() => {
      try {
        const parsed = fileType === "xlsx" ? parseXlsx(fileData) : parseCsv(fileData);
        const colError = validateColumns(parsed.headers, SQP_REQUIRED_COLUMNS);
        if (colError) { setError(colError); setParsing(false); return; }
        setError(null);
        setData({ rows: parsed.rows, file });
      } catch (e) {
        setError(e.message);
      } finally {
        setParsing(false);
      }
    }, 30);
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
              • Market Leader keywords — you dominate these queries (protect budget)<br />
              • Risk keywords — high impressions but poor conversion (review relevance)<br />
              • Export-ready CSV with labels and recommended actions
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: C.amber, background: "#f59e0b08", border: "1px solid #f59e0b20", borderRadius: 8, padding: "8px 12px" }}>
          <span style={{ flexShrink: 0 }}>⚠</span>
          <span>Recommended: Use a 90-day report for best results. Short date ranges may not have enough search volume data to surface meaningful insights.</span>
        </div>
        {error && <div style={{ background: "#f43f5e10", border: "1px solid #f43f5e30", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.rose, display: "flex", gap: 8, alignItems: "flex-start" }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
        {parsing ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: C.s4, fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${C.s7}`, borderTopColor: C.violet, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
            <div>Analyzing file…</div>
          </div>
        ) : (
          <UploadZone onFile={handleFile} label="Drop your Search Query Performance CSV here or click to browse" />
        )}
      </div>
    );
  }

  const { opportunities, risks, leaders, totalQueries } = analysis;
  const brandLower = brandFilter.trim().toLowerCase();
  const filteredOpportunities = brandLower ? opportunities.filter(o => !o.query.toLowerCase().includes(brandLower)) : opportunities;
  const filteredRisks = brandLower ? risks.filter(r => !r.query.toLowerCase().includes(brandLower)) : risks;
  const filteredLeaders = brandLower ? leaders.filter(l => !l.query.toLowerCase().includes(brandLower)) : leaders;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info + re-upload */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.s5 }}>
        <CheckCircle size={13} color={C.emerald} />
        <span>{data.file?.name} · {totalQueries.toLocaleString()} queries</span>
        <button onClick={() => { setData({ rows: [], file: null }); setError(null); }}
          style={{ marginLeft: "auto", fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
          Upload new file
        </button>
      </div>

      {/* Brand filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s4, whiteSpace: "nowrap" }}>Exclude brand:</span>
        <input type="text" className="ppc-text" placeholder="e.g. your brand name" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
          style={{ flex: 1, background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: "#e2e8f0", outline: "none", transition: "border-color 0.15s" }} />
        {brandFilter && <button onClick={() => setBrandFilter("")}
          style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>clear</button>}
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
              { key: "minPurchaseShareLeader", label: "Min Purchase Share (Leader)", suffix: "%", tip: "Queries where your purchase share is this high — you are the market leader" },
            ].map(({ key, label, suffix, tip }) => (
              <div key={key}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <span style={LABEL}>{label}</span>
                  <Tooltip text={tip} />
                  <button onClick={() => setThresholds(t => ({ ...t, [key]: SQP_THRESHOLD_DEFAULTS[key] }))}
                    style={{ marginLeft: "auto", fontSize: 9, color: C.s6, background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>reset</button>
                </div>
                <div style={{ position: "relative" }}>
                  <input type="number" className="ppc-num" value={thresholds[key]}
                    onChange={e => setThresholds(t => ({ ...t, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: "100%", background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: `7px ${suffix ? 28 : 10}px 7px 10px`, fontSize: 12, color: "#e2e8f0", outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }} />
                  {suffix && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
        <SummaryCard label="Opportunities" value={filteredOpportunities.length} color={C.emerald} />
        <SummaryCard label="Market Leaders" value={filteredLeaders.length} color={C.cyan} />
        <SummaryCard label="Risk Keywords" value={filteredRisks.length} color={C.rose} />
        <SummaryCard label="Queries Analyzed" value={totalQueries.toLocaleString()} color={C.s4} />
      </div>

      {/* Opportunities */}
      {filteredOpportunities.length > 0 && (
        <RecoSection
          title="Opportunity Keywords"
          color={C.emerald}
          items={filteredOpportunities}
          expandedWhy={expandedWhy}
          setExpandedWhy={setExpandedWhy}
          idPrefix="opp"
          columns={[
            { key: "query", label: "Search Query", tip: "The customer search query" },
            { key: "volume", label: "Volume", tip: "Monthly search query volume" },
            { key: "purchaseShare", label: "Purchase Share %", tip: "Your share of purchases — you convert well here" },
            {
              key: "gap",
              label: "Market Gap",
              tip: "Impression share vs click share. Green bar = your clicks, gray = untapped impressions. Wider gap = bigger opportunity.",
              render: (item) => {
                const imp = parseFloat(item.impressionShare);
                const clk = parseFloat(item.clickShare);
                const gap = Math.max(0, imp - clk);
                const gapColor = gap >= 20 ? C.emerald : gap >= 10 ? C.amber : C.s5;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 160 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: gapColor, fontFamily: "ui-monospace, monospace", minWidth: 38 }}>+{gap.toFixed(1)}%</span>
                    <div style={{ flex: 1, height: 6, background: C.s8, borderRadius: 3, overflow: "hidden", minWidth: 70 }}>
                      <div style={{ height: "100%", width: `${Math.min(imp, 100)}%`, background: C.s7, borderRadius: 3, position: "relative" }}>
                        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${imp > 0 ? (clk / imp) * 100 : 0}%`, background: gapColor, borderRadius: 3 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: C.s5, whiteSpace: "nowrap" }}>{clk}% / {imp}%</span>
                  </div>
                );
              },
            },
            { key: "insight", label: "Insight", tip: "Recommended action" },
          ]}
          onExport={() => downloadCsv(exportSqpCsv(filteredOpportunities, [], []), "sqp-opportunities.csv")}
          exportLabel="Export opportunities.csv"
        />
      )}

      {/* Market Leaders */}
      {filteredLeaders.length > 0 && (
        <RecoSection
          title="Market Leader Keywords"
          color={C.cyan}
          items={filteredLeaders}
          expandedWhy={expandedWhy}
          setExpandedWhy={setExpandedWhy}
          idPrefix="lead"
          columns={[
            { key: "query", label: "Search Query", tip: "The customer search query" },
            { key: "volume", label: "Volume", tip: "Monthly search query volume" },
            { key: "purchaseShare", label: "Purchase Share %", tip: "Your dominant share of purchases for this query" },
            { key: "clickShare", label: "Click Share %", tip: "Your share of clicks" },
            { key: "impressionShare", label: "Imp. Share %", tip: "Your share of impressions" },
            { key: "insight", label: "Insight", tip: "Strategic recommendation" },
          ]}
          onExport={() => downloadCsv(exportSqpCsv([], [], filteredLeaders), "sqp-leaders.csv")}
          exportLabel="Export leaders.csv"
        />
      )}

      {/* Risks */}
      {filteredRisks.length > 0 && (
        <RecoSection
          title="Risk Keywords"
          color={C.rose}
          items={filteredRisks}
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
          onExport={() => downloadCsv(exportSqpCsv([], filteredRisks, []), "sqp-risks.csv")}
          exportLabel="Export risks.csv"
        />
      )}

      {filteredOpportunities.length === 0 && filteredRisks.length === 0 && filteredLeaders.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px", color: C.s5, fontSize: 13 }}>
          {brandLower
            ? `All results filtered by brand "${brandFilter}". Clear the brand filter or try a different term.`
            : "No keywords flagged with current thresholds. Try adjusting the thresholds above."}
        </div>
      )}
    </div>
  );
}
