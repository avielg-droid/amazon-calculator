// src/PPCLab.jsx
import React, { useState, useMemo } from "react";
import { Upload, ChevronDown, ChevronRight, Download, AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { parseCsv, parseXlsx, validateColumns } from "./parseCsv.js";
import { analyzeStr, exportNegativesCsv, exportHarvestCsv, STR_REQUIRED_COLUMNS, STR_THRESHOLD_DEFAULTS } from "./analyzeStr.js";
import { analyzeSqp, exportSqpCsv, SQP_REQUIRED_COLUMNS, SQP_THRESHOLD_DEFAULTS } from "./analyzeSqp.js";

const C = {
  emerald: "#10b981", cyan: "#06b6d4", orange: "#f97316",
  rose: "#f43f5e", violet: "#8b5cf6", amber: "#f59e0b", blue: "#3b82f6",
  light: "#e2e8f0",
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
    color: activeSub === t ? "#fff" : hoveredSub === t ? C.light : C.s4,
    transition: "all 0.15s",
    outline: "none",
  });

  return (
    <div style={CARD}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ppc-num::-webkit-inner-spin-button, .ppc-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ppc-num { -moz-appearance: textfield; }
        .ppc-num:focus { border-color: ${C.violet} !important; box-shadow: 0 0 0 1px ${C.violet}22 !important; }
        .ppc-text:focus { border-color: ${C.violet} !important; outline: none !important; }
        .why-btn:hover { background: ${C.s7} !important; color: ${C.light} !important; }
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
        background: dragging ? `${C.violet}08` : "transparent",
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

function Tooltip({ text, dir = "right" }) {
  const [v, setV] = useState(false);
  const pos = dir === "left" ? { right: 16, left: "auto" } : { left: 16, right: "auto" };
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
      onMouseEnter={() => setV(true)} onMouseLeave={() => setV(false)}>
      <Info size={11} color={C.s5} />
      {v && (
        <div style={{
          position: "absolute", ...pos, top: -4, zIndex: 50,
          background: C.s8, border: `1px solid ${C.s7}`, borderRadius: 8,
          padding: "8px 10px", width: 220, fontSize: 11, color: C.s4,
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
      <div style={{ fontSize: "clamp(16px, 4vw, 22px)", fontWeight: 700, color, fontFamily: "ui-monospace, monospace" }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s5, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function RecoSection({ title, color, items, expandedWhy, setExpandedWhy, idPrefix, columns, onExport, exportLabel, emptyMessage }) {
  const [hoveredExport, setHoveredExport] = useState(false);
  return (
    <div style={{ border: `1px solid ${color}22`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${color}08`, borderBottom: `1px solid ${color}20` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{title}</span>
        <span style={{ fontSize: 11, color: C.s5 }}>({items.length})</span>
        {items.length > 0 && (
          <button onClick={onExport}
            onMouseEnter={() => setHoveredExport(true)} onMouseLeave={() => setHoveredExport(false)}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.s4, background: hoveredExport ? C.s7 : C.s8, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", transition: "background 0.15s", outline: "none" }}>
            <Download size={11} />{exportLabel}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "16px 14px", fontSize: 12, color: C.s6, fontStyle: "italic" }}>
          {emptyMessage || "None found with current thresholds."}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.s95 }}>
                  {columns.map(col => (
                    <th key={col.key} style={{ padding: "8px 12px", textAlign: "left", color: C.s5, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {col.label} <Tooltip text={col.tip} dir={col.tipDir || "right"} />
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
                          <td key={col.key} style={{ padding: "8px 12px", color: C.light, fontSize: 12, whiteSpace: col.key === "term" || col.key === "query" || col.key === "recommendedAction" || col.key === "insight" ? "normal" : "nowrap" }}>
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
      )}
    </div>
  );
}

// ── StrTab ──

function StrTab({ data, setData }) {
  const [thresholds, setThresholds] = useState({ ...STR_THRESHOLD_DEFAULTS });
  const [negEnabled, setNegEnabled] = useState(true);
  const [harvestEnabled, setHarvestEnabled] = useState(true);
  const [error, setError] = useState(null);
  const [expandedWhy, setExpandedWhy] = useState(null);
  const [brandFilter, setBrandFilter] = useState("");
  const [parsing, setParsing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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
        <div style={{ background: `${C.violet}08`, border: `1px solid ${C.violet}20`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
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
            <div style={{ fontSize: 12, color: C.s4, lineHeight: 1.6 }}>
              • Negative keyword candidates (spending money with 0 conversions)<br />
              • Harvest opportunities (converting search terms not yet targeted as Exact match)<br />
              • Full data table for verification<br />
              • Export-ready CSVs for Amazon Bulk Operations
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: C.amber, background: `${C.amber}08`, border: `1px solid ${C.amber}20`, borderRadius: 8, padding: "8px 12px" }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Recommended: Use a 30–60 day report for best results. A 1-day report may show 0 recommendations due to low spend data.</span>
        </div>
        {error && <div style={{ background: `${C.rose}10`, border: `1px solid ${C.rose}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.rose, display: "flex", gap: 8, alignItems: "flex-start" }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
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

  const ThresholdInput = ({ fieldKey, label, prefix, suffix, tip }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: C.s5, whiteSpace: "nowrap" }}>{label}</span>
      <Tooltip text={tip} />
      <div style={{ position: "relative", width: 70 }}>
        {prefix && <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{prefix}</span>}
        <input type="number" className="ppc-num" value={thresholds[fieldKey]}
          onChange={e => setThresholds(t => ({ ...t, [fieldKey]: parseFloat(e.target.value) || 0 }))}
          style={{ width: "100%", background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 7, padding: `5px ${suffix ? 20 : 8}px 5px ${prefix ? 18 : 8}px`, fontSize: 12, color: C.light, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }} />
        {suffix && <span style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.s5, pointerEvents: "none" }}>{suffix}</span>}
      </div>
    </div>
  );

  const SectionToggle = ({ enabled, onToggle, accent }) => (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600,
      padding: "4px 10px", borderRadius: 6, border: `1px solid ${enabled ? accent + "44" : C.s7}`,
      background: enabled ? accent + "15" : "transparent",
      color: enabled ? accent : C.s6, cursor: "pointer", transition: "all 0.15s", outline: "none",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: enabled ? accent : C.s6, flexShrink: 0 }} />
      {enabled ? "on" : "off"}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info + re-upload */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.s5 }}>
        <CheckCircle size={13} color={C.emerald} />
        <span>{data.file?.name} · {totalTerms.toLocaleString()} terms</span>
        {confirmClear ? (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.s4 }}>Discard data?</span>
            <button onClick={() => { setData({ rows: [], file: null }); setError(null); setConfirmClear(false); }}
              style={{ fontSize: 11, color: C.rose, background: "none", border: `1px solid ${C.rose}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Yes</button>
            <button onClick={() => setConfirmClear(false)}
              style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}
            style={{ marginLeft: "auto", fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Upload new file
          </button>
        )}
      </div>

      {/* Brand filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s4, whiteSpace: "nowrap" }}>Exclude brand:</span>
          <input type="text" className="ppc-text" placeholder="e.g. nike" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ flex: 1, background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: C.light, outline: "none", transition: "border-color 0.15s" }} />
          {brandFilter && <button onClick={() => setBrandFilter("")}
            style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>clear</button>}
        </div>
        <span style={{ fontSize: 10, color: C.s6, paddingLeft: 4 }}>Hides any result whose search term contains this substring</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        <SummaryCard label="Negative Candidates" value={negEnabled ? filteredNegatives.length : "—"} color={negEnabled ? C.rose : C.s6} />
        <SummaryCard label="Harvest Opportunities" value={harvestEnabled ? filteredHarvest.length : "—"} color={harvestEnabled ? C.emerald : C.s6} />
        <SummaryCard label="Terms Analyzed" value={totalTerms.toLocaleString()} color={C.s4} />
      </div>

      {/* Negatives section */}
      <div style={{ border: `1px solid ${C.rose}22`, borderRadius: 12, overflow: "hidden" }}>
        {/* Section header with inline controls */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 14px", background: `${C.rose}08`, borderBottom: negEnabled ? `1px solid ${C.rose}20` : "none" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.rose }}>Negative Keyword Candidates</span>
          <span style={{ fontSize: 11, color: C.s5 }}>({negEnabled ? filteredNegatives.length : "off"})</span>
          <SectionToggle enabled={negEnabled} onToggle={() => setNegEnabled(e => !e)} accent={C.rose} />
          {negEnabled && (
            <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <ThresholdInput fieldKey="minSpendNegative" label="Min spend" prefix="$" tip="Flag terms spending above this with 0 orders" />
              <ThresholdInput fieldKey="minClicksNegative" label="Min clicks" tip="Flag terms with this many clicks and 0 orders" />
              <button onClick={() => setThresholds(t => ({ ...t, minSpendNegative: STR_THRESHOLD_DEFAULTS.minSpendNegative, minClicksNegative: STR_THRESHOLD_DEFAULTS.minClicksNegative }))}
                style={{ fontSize: 10, color: C.s6, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>reset</button>
              {filteredNegatives.length > 0 && (
                <button onClick={() => downloadCsv(exportNegativesCsv(filteredNegatives), "negatives.csv")}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.s4, background: C.s8, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", outline: "none" }}>
                  <Download size={11} />Export negatives.csv
                </button>
              )}
            </div>
          )}
        </div>
        {negEnabled && (
          filteredNegatives.length === 0 ? (
            <div style={{ padding: "16px 14px", fontSize: 12, color: C.s6, fontStyle: "italic" }}>
              {brandLower
                ? <>All filtered by brand &ldquo;{brandFilter}&rdquo;. <button onClick={() => setBrandFilter("")} style={{ fontSize: 12, color: C.violet, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear</button></>
                : `No terms found. Try lowering Min spend (currently $${thresholds.minSpendNegative}) or Min clicks (currently ${thresholds.minClicksNegative}).`}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.s95 }}>
                      {[
                        { key: "term", label: "Search term", tip: "The exact customer search query" },
                        { key: "spend", label: "Spend ($)", tip: "Total ad spend on this term" },
                        { key: "clicks", label: "Clicks", tip: "Total clicks" },
                        { key: "orders", label: "Orders", tip: "Total orders attributed" },
                        { key: "campaign", label: "Campaign", tip: "Campaign name" },
                        { key: "recommendedNegType", label: "Neg. type", tip: "Recommended negative match type to add", tipDir: "left" },
                      ].map(col => (
                        <th key={col.key} style={{ padding: "8px 12px", textAlign: "left", color: C.s5, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{col.label} <Tooltip text={col.tip} dir={col.tipDir || "right"} /></span>
                        </th>
                      ))}
                      <th style={{ padding: "8px 12px", color: C.s5, fontWeight: 600, fontSize: 11 }}>Why?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNegatives.map((item, i) => {
                      const id = `neg-${i}`;
                      const isOpen = expandedWhy === id;
                      return (
                        <React.Fragment key={id}>
                          <tr style={{ borderTop: `1px solid ${C.s8}`, background: isOpen ? C.s95 : "transparent" }}>
                            {[
                              { key: "term" }, { key: "spend", render: v => `$${Number(v).toFixed(2)}` },
                              { key: "clicks" }, { key: "orders" }, { key: "campaign" }, { key: "recommendedNegType" },
                            ].map(col => (
                              <td key={col.key} style={{ padding: "8px 12px", color: C.light, fontSize: 12, whiteSpace: col.key === "term" ? "normal" : "nowrap" }}>
                                {col.render ? col.render(item[col.key]) : item[col.key]}
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
                              <td colSpan={7} style={{ padding: "8px 12px 10px 24px", fontSize: 11, color: C.s4, lineHeight: 1.6, background: `${C.rose}06` }}>
                                <strong style={{ color: C.rose }}>Flagged because:</strong> {item.whyFlag}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 40, background: `linear-gradient(to right, transparent, ${C.s9})`, pointerEvents: "none" }} />
            </div>
          )
        )}
      </div>

      {/* Harvest section */}
      <div style={{ border: `1px solid ${C.emerald}22`, borderRadius: 12, overflow: "hidden" }}>
        {/* Section header with inline controls */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 14px", background: `${C.emerald}08`, borderBottom: harvestEnabled ? `1px solid ${C.emerald}20` : "none" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.emerald }}>Harvest Opportunities</span>
          <span style={{ fontSize: 11, color: C.s5 }}>({harvestEnabled ? filteredHarvest.length : "off"})</span>
          <SectionToggle enabled={harvestEnabled} onToggle={() => setHarvestEnabled(e => !e)} accent={C.emerald} />
          {harvestEnabled && (
            <div style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <ThresholdInput fieldKey="minOrdersHarvest" label="Min orders" tip="Terms need at least this many orders to qualify" />
              <ThresholdInput fieldKey="maxAcosHarvest" label="Max ACoS" suffix="%" tip="Only harvest terms with ACoS at or below this" />
              <button onClick={() => setThresholds(t => ({ ...t, minOrdersHarvest: STR_THRESHOLD_DEFAULTS.minOrdersHarvest, maxAcosHarvest: STR_THRESHOLD_DEFAULTS.maxAcosHarvest }))}
                style={{ fontSize: 10, color: C.s6, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>reset</button>
              {filteredHarvest.length > 0 && (
                <button onClick={() => downloadCsv(exportHarvestCsv(filteredHarvest), "harvest.csv")}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.s4, background: C.s8, border: "none", borderRadius: 6, padding: "5px 10px", cursor: "pointer", outline: "none" }}>
                  <Download size={11} />Export harvest.csv
                </button>
              )}
            </div>
          )}
        </div>
        {harvestEnabled && (
          filteredHarvest.length === 0 ? (
            <div style={{ padding: "16px 14px", fontSize: 12, color: C.s6, fontStyle: "italic" }}>
              {brandLower
                ? <>All filtered by brand &ldquo;{brandFilter}&rdquo;. <button onClick={() => setBrandFilter("")} style={{ fontSize: 12, color: C.violet, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear</button></>
                : `No terms found. Try lowering Min orders (currently ${thresholds.minOrdersHarvest}) or raising Max ACoS (currently ${thresholds.maxAcosHarvest}%).`}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.s95 }}>
                      {[
                        { key: "term", label: "Search term", tip: "The converting search query" },
                        { key: "orders", label: "Orders", tip: "Number of orders from this term" },
                        { key: "cvr", label: "CVR %", tip: "Conversion rate: orders / clicks" },
                        { key: "acos", label: "ACoS %", tip: "Advertising Cost of Sales: spend / revenue" },
                        { key: "matchType", label: "Current match", tip: "Current keyword match type in your campaign" },
                        { key: "recommendedAction", label: "Action", tip: "What to do with this term", tipDir: "left" },
                      ].map(col => (
                        <th key={col.key} style={{ padding: "8px 12px", textAlign: "left", color: C.s5, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>{col.label} <Tooltip text={col.tip} dir={col.tipDir || "right"} /></span>
                        </th>
                      ))}
                      <th style={{ padding: "8px 12px", color: C.s5, fontWeight: 600, fontSize: 11 }}>Why?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHarvest.map((item, i) => {
                      const id = `harv-${i}`;
                      const isOpen = expandedWhy === id;
                      return (
                        <React.Fragment key={id}>
                          <tr style={{ borderTop: `1px solid ${C.s8}`, background: isOpen ? C.s95 : "transparent" }}>
                            {[
                              { key: "term" }, { key: "orders" }, { key: "cvr" },
                              { key: "acos" }, { key: "matchType" }, { key: "recommendedAction" },
                            ].map(col => (
                              <td key={col.key} style={{ padding: "8px 12px", color: C.light, fontSize: 12, whiteSpace: col.key === "term" || col.key === "recommendedAction" ? "normal" : "nowrap" }}>
                                {item[col.key]}
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
                              <td colSpan={7} style={{ padding: "8px 12px 10px 24px", fontSize: 11, color: C.s4, lineHeight: 1.6, background: `${C.emerald}06` }}>
                                <strong style={{ color: C.emerald }}>Flagged because:</strong> {item.whyFlag}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 40, background: `linear-gradient(to right, transparent, ${C.s9})`, pointerEvents: "none" }} />
            </div>
          )
        )}
      </div>
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
  const [confirmClear, setConfirmClear] = useState(false);

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
        <div style={{ background: `${C.cyan}08`, border: `1px solid ${C.cyan}20`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
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
            <div style={{ fontSize: 12, color: C.s4, lineHeight: 1.6 }}>
              • Opportunity keywords — good conversion but low market share (increase bids)<br />
              • Market Leader keywords — you dominate these queries (protect budget)<br />
              • Risk keywords — high impressions but poor conversion (review relevance)<br />
              • Export-ready CSV with labels and recommended actions
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: C.amber, background: `${C.amber}08`, border: `1px solid ${C.amber}20`, borderRadius: 8, padding: "8px 12px" }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Recommended: Use a 90-day report for best results. Short date ranges may not have enough search volume data to surface meaningful insights.</span>
        </div>
        {error && <div style={{ background: `${C.rose}10`, border: `1px solid ${C.rose}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: C.rose, display: "flex", gap: 8, alignItems: "flex-start" }}><AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}</div>}
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
        {confirmClear ? (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.s4 }}>Discard data?</span>
            <button onClick={() => { setData({ rows: [], file: null }); setError(null); setConfirmClear(false); }}
              style={{ fontSize: 11, color: C.rose, background: "none", border: `1px solid ${C.rose}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Yes</button>
            <button onClick={() => setConfirmClear(false)}
              style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}
            style={{ marginLeft: "auto", fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Upload new file
          </button>
        )}
      </div>

      {/* Brand filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.s4, whiteSpace: "nowrap" }}>Exclude brand:</span>
          <input type="text" className="ppc-text" placeholder="e.g. nike" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ flex: 1, background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: C.light, outline: "none", transition: "border-color 0.15s" }} />
          {brandFilter && <button onClick={() => setBrandFilter("")}
            style={{ fontSize: 11, color: C.s5, background: "none", border: `1px solid ${C.s7}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>clear</button>}
        </div>
        <span style={{ fontSize: 10, color: C.s6, paddingLeft: 4 }}>Hides any result whose search query contains this substring</span>
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
                    style={{ marginLeft: "auto", fontSize: 10, color: C.s6, background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>reset</button>
                </div>
                <div style={{ position: "relative" }}>
                  <input type="number" className="ppc-num" value={thresholds[key]}
                    onChange={e => setThresholds(t => ({ ...t, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: "100%", background: C.s95, border: `1px solid ${C.s8}`, borderRadius: 8, padding: `7px ${suffix ? 28 : 10}px 7px 10px`, fontSize: 12, color: C.light, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }} />
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
      <RecoSection
        title="Opportunity Keywords"
        color={C.emerald}
        items={filteredOpportunities}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="opp"
        emptyMessage={brandLower ? `No opportunities match brand filter "${brandFilter}".` : "No opportunities found — try lowering Min Purchase Share or raising Max Click Share in thresholds."}
        columns={[
          { key: "query", label: "Search query", tip: "The customer search query" },
          { key: "volume", label: "Volume", tip: "Monthly search query volume" },
          { key: "purchaseShare", label: "Purchase share %", tip: "Your share of purchases — you convert well here" },
          {
            key: "gap",
            label: "Market gap",
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
          { key: "insight", label: "Insight", tip: "Recommended action", tipDir: "left" },
        ]}
        onExport={() => downloadCsv(exportSqpCsv(filteredOpportunities, [], []), "sqp-opportunities.csv")}
        exportLabel="Export opportunities.csv"
      />

      {/* Market Leaders */}
      <RecoSection
        title="Market Leader Keywords"
        color={C.cyan}
        items={filteredLeaders}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="lead"
        emptyMessage={brandLower ? `No market leaders match brand filter "${brandFilter}".` : `No market leaders found — queries where your purchase share ≥ ${thresholds.minPurchaseShareLeader}%. Try lowering that threshold.`}
        columns={[
          { key: "query", label: "Search query", tip: "The customer search query" },
          { key: "volume", label: "Volume", tip: "Monthly search query volume" },
          { key: "purchaseShare", label: "Purchase share %", tip: "Your dominant share of purchases for this query" },
          { key: "clickShare", label: "Click share %", tip: "Your share of clicks" },
          { key: "impressionShare", label: "Imp. share %", tip: "Your share of impressions" },
          { key: "insight", label: "Insight", tip: "Strategic recommendation", tipDir: "left" },
        ]}
        onExport={() => downloadCsv(exportSqpCsv([], [], filteredLeaders), "sqp-leaders.csv")}
        exportLabel="Export leaders.csv"
      />

      {/* Risks */}
      <RecoSection
        title="Risk Keywords"
        color={C.rose}
        items={filteredRisks}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="risk"
        emptyMessage={brandLower ? `No risks match brand filter "${brandFilter}".` : `No risks found — queries where impression share ≥ ${thresholds.minImpressionShareRisk}% AND purchase share ≤ ${thresholds.maxPurchaseShareRisk}%. Adjust those thresholds to find under-converting terms.`}
        columns={[
          { key: "query", label: "Search query", tip: "The customer search query" },
          { key: "volume", label: "Volume", tip: "Monthly search query volume" },
          { key: "impressionShare", label: "Imp. share %", tip: "Your share of impressions — high visibility" },
          { key: "purchaseShare", label: "Purchase share %", tip: "Your share of purchases — low conversion" },
          { key: "clickShare", label: "Click share %", tip: "Your share of clicks" },
          { key: "insight", label: "Insight", tip: "Recommended action", tipDir: "left" },
        ]}
        onExport={() => downloadCsv(exportSqpCsv([], filteredRisks, []), "sqp-risks.csv")}
        exportLabel="Export risks.csv"
      />
    </div>
  );
}
