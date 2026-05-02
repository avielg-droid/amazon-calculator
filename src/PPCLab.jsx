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

// ── Tab stubs (filled in Tasks 7 & 8) ──

function StrTab({ data, setData }) {
  return <div style={{ color: C.s4, fontSize: 13, padding: "24px 0", textAlign: "center" }}>STR analysis — coming soon</div>;
}

function SqpTab({ data, setData }) {
  return <div style={{ color: C.s4, fontSize: 13, padding: "24px 0", textAlign: "center" }}>SQP analysis — coming soon</div>;
}
