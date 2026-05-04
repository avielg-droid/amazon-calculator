// src/PPCLab.jsx
import React, { useState, useMemo } from "react";
import { Upload, ChevronDown, ChevronRight, Download, AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { parseCsv, parseXlsx, validateColumns } from "./parseCsv.js";
import { analyzeStr, exportNegativesCsv, exportHarvestCsv, STR_REQUIRED_COLUMNS, STR_THRESHOLD_DEFAULTS } from "./analyzeStr.js";
import { analyzeSqp, exportSqpCsv, SQP_REQUIRED_COLUMNS, SQP_THRESHOLD_DEFAULTS } from "./analyzeSqp.js";
import { analyzeKeyword, exportKeywordCsv, KEYWORD_REQUIRED_COLUMNS } from "./analyzeKeyword.js";
import { analyzePlacement, exportPlacementCsv, PLACEMENT_REQUIRED_COLUMNS } from "./analyzePlacement.js";

const C = {
  teal:      "#14B8A6", tealEnd:   "#0EA5E9",
  navy:      "#0B1F3A",
  yellow:    "#FBBF24", yellowDim: "#FFFBEB",
  indigo:    "#0EA5E9", indigoDim: "#E0F2FE",
  green:     "#16A34A", greenDim:  "#F0FDF4",
  red:       "#DC2626", redDim:    "#FEF2F2",
  amber:     "#D97706", amberDim:  "#FFFBEB",
  blue:      "#2563EB", blueDim:   "#EFF6FF",
  cyan:      "#0891B2", cyanDim:   "#ECFEFF",
  violet:    "#7C3AED", violetDim: "#F5F3FF",
  orange:    "#EA580C", orangeDim: "#FFF7ED",
  rose:      "#E11D48", roseDim:   "#FFF1F2",
  ink:     "#0B1F3A",
  body:    "#334155",
  muted:   "#64748B",
  subtle:  "#94A3B8",
  border:  "#E2E8F0",
  bdMed:   "#CBD5E1",
  surface: "#F8FAFC",
  card:    "#FFFFFF",
  inset:   "#F1F5F9",
  hover:   "#F8FAFC",
  divider: "#F1F5F9",
};
const BRAND_GRADIENT = "linear-gradient(135deg, #14B8A6, #0EA5E9)";

const CARD = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" };
const LABEL = { fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: C.muted, marginBottom: 4, display: "block" };

function sortRows(items, col, dir) {
  if (!col) return items;
  return [...items].sort((a, b) => {
    const av = a[col], bv = b[col];
    const an = parseFloat(av), bn = parseFloat(bv);
    const cmp = isFinite(an) && isFinite(bn) ? an - bn : String(av ?? "").localeCompare(String(bv ?? ""));
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ color: C.border, fontSize: 10, marginLeft: 2 }}>⇅</span>;
  return <span style={{ color: C.indigo, fontSize: 10, marginLeft: 2 }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

// ── Goal Wizard ──

const GOALS = [
  {
    tab: "str",
    emoji: "🔥",
    title: "Cut wasted ad spend",
    desc: "Find keywords burning money with 0 conversions",
  },
  {
    tab: "str",
    emoji: "🎯",
    title: "Find new keywords to target",
    desc: "Discover converting search terms not yet in your campaigns",
  },
  {
    tab: "sqp",
    emoji: "📊",
    title: "Understand my market share",
    desc: "See how you rank vs competitors on high-volume queries",
  },
  {
    tab: "keyword",
    emoji: "💰",
    title: "Optimize keyword bids",
    desc: "Get data-driven bid suggestions based on your target ACoS",
  },
  {
    tab: "placement",
    emoji: "📍",
    title: "Analyze placement performance",
    desc: "See which placements (Top of Search, etc.) are profitable",
  },
];

function GoalWizard({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.ink, margin: "0 0 5px", letterSpacing: "-0.01em" }}>
          What do you want to achieve today?
        </p>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          Pick a goal — we'll guide you to the right report
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {GOALS.map((goal, i) => {
          const isHov = hovered === i;
          return (
            <div key={i}
              onClick={() => onSelect(goal.tab)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? C.indigoDim : C.card,
                border: `1px solid ${isHov ? C.indigo : C.border}`,
                borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                transition: "all 0.15s", display: "flex", gap: 12, alignItems: "flex-start",
                boxShadow: isHov ? `0 4px 16px rgba(14,165,233,0.12)` : "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{goal.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{goal.title}</div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{goal.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PPCLab({ ppcStr, setPpcStr, ppcSqp, setPpcSqp, ppcKeyword, setPpcKeyword, ppcPlacement, setPpcPlacement }) {
  const [activeSub, setActiveSub] = useState("str");
  const [hoveredSub, setHoveredSub] = useState(null);
  const [targetAcos, setTargetAcos] = useState(30);

  const subTabBtn = (t) => ({
    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
    background: activeSub === t ? C.indigo : hoveredSub === t ? C.border : "transparent",
    color: activeSub === t ? "#fff" : hoveredSub === t ? C.ink : C.muted,
    transition: "all 0.15s",
    outline: "none",
  });

  return (
    <div style={CARD}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ppc-num::-webkit-inner-spin-button, .ppc-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .ppc-num { -moz-appearance: textfield; }
        .ppc-num:focus { border-color: #14B8A6 !important; box-shadow: 0 0 0 3px #14B8A615 !important; }
        .ppc-text:focus { border-color: #14B8A6 !important; outline: none !important; }
        .why-btn:hover { background: #F1F5F9 !important; color: #334155 !important; }
        @media (max-width: 480px) {
          .ppc-subtab { padding: 6px 8px !important; font-size: 11px !important; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>PPC Lab</span>
        <span style={{ fontSize: 10, color: C.muted, background: C.inset, borderRadius: 6, padding: "3px 8px", border: `1px solid ${C.border}` }}>Beta</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: C.inset, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, flexWrap: "wrap" }}>
          <button className="ppc-subtab" style={subTabBtn("str")} onClick={() => setActiveSub("str")} onMouseEnter={() => setHoveredSub("str")} onMouseLeave={() => setHoveredSub(null)}>Search Terms</button>
          <button className="ppc-subtab" style={subTabBtn("sqp")} onClick={() => setActiveSub("sqp")} onMouseEnter={() => setHoveredSub("sqp")} onMouseLeave={() => setHoveredSub(null)}>Search Query</button>
          <button className="ppc-subtab" style={subTabBtn("keyword")} onClick={() => setActiveSub("keyword")} onMouseEnter={() => setHoveredSub("keyword")} onMouseLeave={() => setHoveredSub(null)}>Keyword Bids</button>
          <button className="ppc-subtab" style={subTabBtn("placement")} onClick={() => setActiveSub("placement")} onMouseEnter={() => setHoveredSub("placement")} onMouseLeave={() => setHoveredSub(null)}>Placement</button>
        </div>
      </div>

      {activeSub === "str" && <StrTab data={ppcStr} setData={setPpcStr} onSwitchTab={setActiveSub} />}
      {activeSub === "sqp" && <SqpTab data={ppcSqp} setData={setPpcSqp} onSwitchTab={setActiveSub} />}
      {activeSub === "keyword" && <KeywordTab data={ppcKeyword} setData={setPpcKeyword} targetAcos={targetAcos} setTargetAcos={setTargetAcos} onSwitchTab={setActiveSub} />}
      {activeSub === "placement" && <PlacementTab data={ppcPlacement} setData={setPpcPlacement} targetAcos={targetAcos} setTargetAcos={setTargetAcos} onSwitchTab={setActiveSub} />}
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
        border: `2px dashed ${dragging || focused ? C.indigo : C.bdMed}`,
        borderRadius: 12, padding: "32px 24px", textAlign: "center",
        cursor: "pointer", transition: "border-color 0.2s",
        background: dragging ? C.indigoDim : C.card,
        outline: focused ? `2px solid ${C.indigo}40` : "none",
        outlineOffset: 2,
      }}
    >
      <Upload size={24} color={C.muted} style={{ marginBottom: 8 }} />
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: C.subtle }}>CSV or Excel (.xlsx) files</div>
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
      <Info size={11} color={C.muted} />
      {v && (
        <div style={{
          position: "absolute", ...pos, top: -4, zIndex: 50,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 10px", width: 220, fontSize: 11, color: C.body,
          lineHeight: 1.5, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", pointerEvents: "none",
        }}>
          {text}
        </div>
      )}
    </span>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: "clamp(16px, 4vw, 22px)", fontWeight: 700, color, fontFamily: "ui-monospace, monospace" }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function RecoSection({ title, color, items, expandedWhy, setExpandedWhy, idPrefix, columns, onExport, exportLabel, emptyMessage }) {
  const [hoveredExport, setHoveredExport] = useState(false);
  const [sort, setSort] = useState({ col: null, dir: "desc" });
  const sortedItems = sortRows(items, sort.col, sort.dir);
  const toggleSort = (col) => setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" });

  return (
    <div style={{ border: `1px solid ${color}22`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: `${color}08`, borderBottom: `1px solid ${color}20` }}>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{title}</span>
        <span style={{ fontSize: 11, color: C.muted }}>({items.length})</span>
        {items.length > 0 && (
          <button onClick={onExport}
            onMouseEnter={() => setHoveredExport(true)} onMouseLeave={() => setHoveredExport(false)}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.muted, background: hoveredExport ? C.inset : C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", transition: "background 0.15s", outline: "none" }}>
            <Download size={11} />{exportLabel}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "16px 14px", fontSize: 12, color: C.subtle, fontStyle: "italic" }}>
          {emptyMessage || "None found with current thresholds."}
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  {columns.map(col => (
                    <th key={col.key} style={{ padding: "8px 12px", textAlign: "left", color: C.muted, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {!col.noSort ? (
                          <button onClick={() => toggleSort(col.key)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, fontWeight: 600, color: sort.col === col.key ? C.indigo : C.muted, display: "inline-flex", alignItems: "center", gap: 2 }}>
                            {col.label}<SortIcon active={sort.col === col.key} dir={sort.dir} />
                          </button>
                        ) : col.label}
                        <Tooltip text={col.tip} dir={col.tipDir || "right"} />
                      </span>
                    </th>
                  ))}
                  <th style={{ padding: "8px 12px", color: C.muted, fontWeight: 600, fontSize: 11 }}>Why?</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, i) => {
                  const id = `${idPrefix}-${i}`;
                  const isOpen = expandedWhy === id;
                  return (
                    <React.Fragment key={id}>
                      <tr style={{ borderTop: `1px solid ${C.divider}`, background: isOpen ? C.surface : "transparent" }}>
                        {columns.map(col => (
                          <td key={col.key} style={{ padding: "8px 12px", color: C.body, fontSize: 12, whiteSpace: col.key === "term" || col.key === "query" || col.key === "recommendedAction" || col.key === "insight" ? "normal" : "nowrap" }}>
                            {col.render ? col.render(item) : col.key === "spend" ? `$${Number(item[col.key]).toFixed(2)}` : item[col.key]}
                          </td>
                        ))}
                        <td style={{ padding: "8px 12px" }}>
                          <button className="why-btn" onClick={() => setExpandedWhy(isOpen ? null : id)}
                            style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}>
                            {isOpen ? "hide" : "why?"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={id + "-why"}>
                          <td colSpan={columns.length + 1} style={{ padding: "8px 12px 10px 24px", fontSize: 11, color: C.body, lineHeight: 1.6, background: `${color}06` }}>
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
            background: `linear-gradient(to right, transparent, #FFFFFF)`,
            pointerEvents: "none",
          }} />
        </div>
      )}
    </div>
  );
}

// ── StrTab ──

function StrTab({ data, setData, onSwitchTab }) {
  const [thresholds, setThresholds] = useState({ ...STR_THRESHOLD_DEFAULTS });
  const [negEnabled, setNegEnabled] = useState(true);
  const [harvestEnabled, setHarvestEnabled] = useState(true);
  const [negSettingsOpen, setNegSettingsOpen] = useState(false);
  const [negSort, setNegSort] = useState({ col: null, dir: "desc" });
  const [harvestSort, setHarvestSort] = useState({ col: null, dir: "desc" });
  const [harvestSettingsOpen, setHarvestSettingsOpen] = useState(false);
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
        <GoalWizard onSelect={onSwitchTab} />
        <div style={{ background: C.indigoDim, border: `1px solid ${C.indigo}30`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.indigo, marginBottom: 10 }}>How to get your Search Term Report</div>
          {[
            "Go to Seller Central → Reports → Advertising Reports",
            "Select report type: Search Term Report",
            "Choose date range (last 30–60 days recommended)",
            "Click Create Report, then Download when ready",
            "Upload the CSV below",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: C.indigoDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.indigo }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.body, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>What you'll get</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              • Negative keyword candidates (spending money with 0 conversions)<br />
              • Harvest opportunities (converting search terms not yet targeted as Exact match)<br />
              • Full data table for verification<br />
              • Export-ready CSVs for Amazon Bulk Operations
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#92400E", background: C.amberDim, border: `1px solid ${C.amber}`, borderRadius: 8, padding: "8px 12px" }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Recommended: Use a 30–60 day report for best results. A 1-day report may show 0 recommendations due to low spend data.</span>
        </div>
        {error && (
          <div style={{ background: C.redDim, border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991B1B", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
          </div>
        )}
        {parsing ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
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

  const sortedNegatives = sortRows(filteredNegatives, negSort.col, negSort.dir);
  const sortedHarvest = sortRows(filteredHarvest, harvestSort.col, harvestSort.dir);
  const toggleNegSort = col => setNegSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" });
  const toggleHarvestSort = col => setHarvestSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "desc" });

  const SortTh = ({ label, col, sort, onToggle, tip, tipDir, noSort }) => (
    <th style={{ padding: "8px 12px", textAlign: "left", color: sort.col === col ? C.indigo : C.muted, fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {!noSort ? (
          <button onClick={() => onToggle(col)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, fontWeight: 600, color: sort.col === col ? C.indigo : C.muted, display: "inline-flex", alignItems: "center", gap: 2 }}>
            {label}<SortIcon active={sort.col === col} dir={sort.dir} />
          </button>
        ) : label}
        {tip && <Tooltip text={tip} dir={tipDir || "right"} />}
      </span>
    </th>
  );

  // Full-size labeled input — 44px height, numeric keyboard on mobile
  const ThresholdInput = ({ fieldKey, label, prefix, suffix, tip, desc }) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.body }}>{label}</span>
        <Tooltip text={tip} />
      </div>
      {desc && <p style={{ fontSize: 11, color: C.muted, margin: "0 0 6px", lineHeight: 1.4 }}>{desc}</p>}
      <div style={{ position: "relative" }}>
        {prefix && <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.muted, pointerEvents: "none", zIndex: 1 }}>{prefix}</span>}
        <input
          type="number" inputMode="decimal" className="ppc-num"
          value={thresholds[fieldKey]}
          onChange={e => setThresholds(t => ({ ...t, [fieldKey]: parseFloat(e.target.value) || 0 }))}
          style={{ width: "100%", height: 44, background: C.card, border: `1px solid ${C.bdMed}`, borderRadius: 8, padding: `0 ${suffix ? 36 : 12}px 0 ${prefix ? 28 : 12}px`, fontSize: 15, color: C.ink, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }}
        />
        {suffix && <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
      </div>
    </div>
  );

  const SectionToggle = ({ enabled, onToggle, accent }) => (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
      height: 36, padding: "0 12px", borderRadius: 8, border: `1px solid ${enabled ? accent + "50" : C.bdMed}`,
      background: enabled ? accent + "12" : C.inset,
      color: enabled ? accent : C.subtle, cursor: "pointer", transition: "all 0.15s", outline: "none", flexShrink: 0,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: enabled ? accent : C.subtle, flexShrink: 0 }} />
      {enabled ? "On" : "Off"}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info + re-upload */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.muted, background: C.greenDim, border: `1px solid #86EFAC`, borderRadius: 8, padding: "8px 12px" }}>
        <CheckCircle size={13} color={C.green} />
        <span style={{ color: C.body }}>{data.file?.name} · {totalTerms.toLocaleString()} terms</span>
        {confirmClear ? (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.body }}>Discard data?</span>
            <button onClick={() => { setData({ rows: [], file: null }); setError(null); setConfirmClear(false); }}
              style={{ fontSize: 11, color: C.red, background: "none", border: `1px solid ${C.red}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Yes</button>
            <button onClick={() => setConfirmClear(false)}
              style={{ fontSize: 11, color: C.muted, background: "none", border: `1px solid ${C.bdMed}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}
            style={{ marginLeft: "auto", fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Upload new file
          </button>
        )}
      </div>

      {/* Brand filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, whiteSpace: "nowrap" }}>Exclude brand:</span>
          <input type="text" className="ppc-text" placeholder="e.g. nike" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ flex: 1, background: C.card, border: `1px solid ${C.bdMed}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: C.ink, outline: "none", transition: "border-color 0.15s" }} />
          {brandFilter && <button onClick={() => setBrandFilter("")}
            style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>clear</button>}
        </div>
        <span style={{ fontSize: 10, color: C.subtle, paddingLeft: 4 }}>Hides any result whose search term contains this substring</span>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 10 }}>
        <SummaryCard label="Negative Candidates" value={negEnabled ? filteredNegatives.length : "—"} color={negEnabled ? C.red : C.muted} />
        <SummaryCard label="Harvest Opportunities" value={harvestEnabled ? filteredHarvest.length : "—"} color={harvestEnabled ? C.green : C.muted} />
        <SummaryCard label="Terms Analyzed" value={totalTerms.toLocaleString()} color={C.muted} />
      </div>

      {/* Negatives section */}
      <div style={{ border: `1px solid #FCA5A5`, borderRadius: 12, overflow: "hidden" }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: C.redDim, borderBottom: negEnabled ? `1px solid #FCA5A5` : "none", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.rose }}>Negative Keywords</span>
          {negEnabled && (
            <span style={{ fontSize: 11, color: C.rose, background: C.card, borderRadius: 99, padding: "1px 8px", border: `1px solid #FCA5A5`, fontWeight: 600 }}>{filteredNegatives.length}</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {negEnabled && filteredNegatives.length > 0 && (
              <button onClick={() => downloadCsv(exportNegativesCsv(filteredNegatives), "negatives.csv")}
                style={{ display: "flex", alignItems: "center", gap: 5, height: 36, padding: "0 12px", fontSize: 12, fontWeight: 600, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", outline: "none" }}>
                <Download size={12} />Export CSV
              </button>
            )}
            {negEnabled && (
              <button onClick={() => setNegSettingsOpen(o => !o)}
                style={{ height: 36, padding: "0 12px", fontSize: 12, fontWeight: 600, background: negSettingsOpen ? C.indigoDim : C.card, border: `1px solid ${negSettingsOpen ? C.indigo + "50" : C.border}`, color: negSettingsOpen ? C.indigo : C.muted, borderRadius: 8, cursor: "pointer", outline: "none" }}>
                ⚙ Settings
              </button>
            )}
            <SectionToggle enabled={negEnabled} onToggle={() => { setNegEnabled(e => !e); setNegSettingsOpen(false); }} accent={C.rose} />
          </div>
        </div>
        {/* Settings panel */}
        {negEnabled && negSettingsOpen && (
          <div style={{ padding: "16px 14px", background: C.surface, borderBottom: `1px solid #FCA5A5` }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <ThresholdInput fieldKey="minClicksNegative" label="Min clicks" tip="Both click AND spend thresholds must be crossed (with 0 orders) to flag a term. Neither alone is enough signal." desc="Rule 1: clicks AND spend, 0 orders" />
              <ThresholdInput fieldKey="minSpendNegative" label="Min spend" prefix="$" tip="Both click AND spend thresholds must be crossed (with 0 orders) to flag a term. Also used as the data floor for the ACoS poor-performer check." desc="Rule 1: clicks AND spend, 0 orders" />
              <ThresholdInput fieldKey="maxAcosNegative" label="Max ACoS" suffix="%" tip="Rule 2: flag terms that DO convert but above this ACoS — losing money on each sale. Requires both click + spend floors to filter out low-data noise." desc="Rule 2: poor performer (with orders)" />
            </div>
            <button
              onClick={() => setThresholds(t => ({ ...t, minSpendNegative: STR_THRESHOLD_DEFAULTS.minSpendNegative, minClicksNegative: STR_THRESHOLD_DEFAULTS.minClicksNegative, maxAcosNegative: STR_THRESHOLD_DEFAULTS.maxAcosNegative }))}
              style={{ marginTop: 14, fontSize: 12, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "block" }}>
              Reset to defaults ($10 · 15 clicks · 100% ACoS)
            </button>
          </div>
        )}
        {negEnabled && (
          filteredNegatives.length === 0 ? (
            <div style={{ padding: "16px 14px", fontSize: 12, color: C.subtle, fontStyle: "italic" }}>
              {brandLower
                ? <>All filtered by brand &ldquo;{brandFilter}&rdquo;. <button onClick={() => setBrandFilter("")} style={{ fontSize: 12, color: C.indigo, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear</button></>
                : `No terms found. Try lowering Min spend ($${thresholds.minSpendNegative}), Min clicks (${thresholds.minClicksNegative}), or Max ACoS (${thresholds.maxAcosNegative}%).`}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.surface }}>
                      <SortTh label="Search term" col="term" sort={negSort} onToggle={toggleNegSort} tip="The exact customer search query" />
                      <SortTh label="Spend ($)" col="spend" sort={negSort} onToggle={toggleNegSort} tip="Total ad spend on this term" />
                      <SortTh label="Clicks" col="clicks" sort={negSort} onToggle={toggleNegSort} tip="Total clicks" />
                      <SortTh label="Orders" col="orders" sort={negSort} onToggle={toggleNegSort} tip="Total orders attributed" />
                      <SortTh label="Campaign" col="campaign" sort={negSort} onToggle={toggleNegSort} tip="Campaign name" />
                      <SortTh label="Neg. type" col="recommendedNegType" sort={negSort} onToggle={toggleNegSort} tip="Recommended negative match type" tipDir="left" />
                      <th style={{ padding: "8px 12px", color: C.muted, fontWeight: 600, fontSize: 11 }}>Why?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedNegatives.map((item, i) => {
                      const id = `neg-${i}`;
                      const isOpen = expandedWhy === id;
                      return (
                        <React.Fragment key={id}>
                          <tr style={{ borderTop: `1px solid ${C.divider}`, background: isOpen ? C.surface : "transparent" }}>
                            {[
                              { key: "term" }, { key: "spend", render: v => `$${Number(v).toFixed(2)}` },
                              { key: "clicks" }, { key: "orders" }, { key: "campaign" }, { key: "recommendedNegType" },
                            ].map(col => (
                              <td key={col.key} style={{ padding: "8px 12px", color: C.body, fontSize: 12, whiteSpace: col.key === "term" ? "normal" : "nowrap" }}>
                                {col.render ? col.render(item[col.key]) : item[col.key]}
                              </td>
                            ))}
                            <td style={{ padding: "8px 12px" }}>
                              <button className="why-btn" onClick={() => setExpandedWhy(isOpen ? null : id)}
                                style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}>
                                {isOpen ? "hide" : "why?"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={id + "-why"}>
                              <td colSpan={7} style={{ padding: "8px 12px 10px 24px", fontSize: 11, color: C.body, lineHeight: 1.6, background: C.redDim }}>
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
              <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 40, background: `linear-gradient(to right, transparent, #FFFFFF)`, pointerEvents: "none" }} />
            </div>
          )
        )}
      </div>

      {/* Harvest section */}
      <div style={{ border: `1px solid #86EFAC`, borderRadius: 12, overflow: "hidden" }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: C.greenDim, borderBottom: harvestEnabled ? `1px solid #86EFAC` : "none", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>Harvest Opportunities</span>
          {harvestEnabled && (
            <span style={{ fontSize: 11, color: C.green, background: C.card, borderRadius: 99, padding: "1px 8px", border: `1px solid #86EFAC`, fontWeight: 600 }}>{filteredHarvest.length}</span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            {harvestEnabled && filteredHarvest.length > 0 && (
              <button onClick={() => downloadCsv(exportHarvestCsv(filteredHarvest), "harvest.csv")}
                style={{ display: "flex", alignItems: "center", gap: 5, height: 36, padding: "0 12px", fontSize: 12, fontWeight: 600, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", outline: "none" }}>
                <Download size={12} />Export CSV
              </button>
            )}
            {harvestEnabled && (
              <button onClick={() => setHarvestSettingsOpen(o => !o)}
                style={{ height: 36, padding: "0 12px", fontSize: 12, fontWeight: 600, background: harvestSettingsOpen ? C.indigoDim : C.card, border: `1px solid ${harvestSettingsOpen ? C.indigo + "50" : C.border}`, color: harvestSettingsOpen ? C.indigo : C.muted, borderRadius: 8, cursor: "pointer", outline: "none" }}>
                ⚙ Settings
              </button>
            )}
            <SectionToggle enabled={harvestEnabled} onToggle={() => { setHarvestEnabled(e => !e); setHarvestSettingsOpen(false); }} accent={C.green} />
          </div>
        </div>
        {/* Settings panel */}
        {harvestEnabled && harvestSettingsOpen && (
          <div style={{ padding: "16px 14px", background: C.surface, borderBottom: `1px solid #86EFAC` }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
              <ThresholdInput fieldKey="minOrdersHarvest" label="Min orders" tip="A term needs at least this many orders to be promoted to Exact Match. 2 orders confirms intent beyond a single-sale fluke." desc="Minimum orders to qualify" />
              <ThresholdInput fieldKey="minClicksHarvest" label="Min clicks" tip="Minimum clicks before promoting a term. Filters out low-traffic flukes with high conversion on tiny sample sizes." desc="Minimum clicks to qualify" />
              <ThresholdInput fieldKey="maxAcosHarvest" label="Max ACoS" suffix="%" tip="Only harvest terms profitable enough to be worth promoting. 40% is the standard ceiling for Exact match campaigns." desc="Only harvest below this ACoS" />
            </div>
            <button
              onClick={() => setThresholds(t => ({ ...t, minOrdersHarvest: STR_THRESHOLD_DEFAULTS.minOrdersHarvest, minClicksHarvest: STR_THRESHOLD_DEFAULTS.minClicksHarvest, maxAcosHarvest: STR_THRESHOLD_DEFAULTS.maxAcosHarvest }))}
              style={{ marginTop: 14, fontSize: 12, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", display: "block" }}>
              Reset to defaults (2 orders · 10 clicks · 40% ACoS)
            </button>
          </div>
        )}
        {harvestEnabled && (
          filteredHarvest.length === 0 ? (
            <div style={{ padding: "16px 14px", fontSize: 12, color: C.subtle, fontStyle: "italic" }}>
              {brandLower
                ? <>All filtered by brand &ldquo;{brandFilter}&rdquo;. <button onClick={() => setBrandFilter("")} style={{ fontSize: 12, color: C.indigo, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Clear</button></>
                : `No terms found. Try lowering Min orders (currently ${thresholds.minOrdersHarvest}) or raising Max ACoS (currently ${thresholds.maxAcosHarvest}%).`}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: C.surface }}>
                      <SortTh label="Search term" col="term" sort={harvestSort} onToggle={toggleHarvestSort} tip="The converting search query" />
                      <SortTh label="Orders" col="orders" sort={harvestSort} onToggle={toggleHarvestSort} tip="Number of orders from this term" />
                      <SortTh label="Clicks" col="clicks" sort={harvestSort} onToggle={toggleHarvestSort} tip="Total clicks on this term" />
                      <SortTh label="CVR %" col="cvr" sort={harvestSort} onToggle={toggleHarvestSort} tip="Conversion rate: orders / clicks" />
                      <SortTh label="ACoS %" col="acos" sort={harvestSort} onToggle={toggleHarvestSort} tip="Advertising Cost of Sales: spend / revenue" />
                      <SortTh label="Match" col="matchType" sort={harvestSort} onToggle={toggleHarvestSort} tip="Current keyword match type in your campaign" />
                      <SortTh label="Action" col="recommendedAction" sort={harvestSort} onToggle={toggleHarvestSort} tip="What to do with this term" tipDir="left" noSort />
                      <th style={{ padding: "8px 12px", color: C.muted, fontWeight: 600, fontSize: 11 }}>Why?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHarvest.map((item, i) => {
                      const id = `harv-${i}`;
                      const isOpen = expandedWhy === id;
                      return (
                        <React.Fragment key={id}>
                          <tr style={{ borderTop: `1px solid ${C.divider}`, background: isOpen ? C.surface : "transparent" }}>
                            {[
                              { key: "term" }, { key: "orders" }, { key: "clicks" }, { key: "cvr" },
                              { key: "acos" }, { key: "matchType" }, { key: "recommendedAction" },
                            ].map(col => (
                              <td key={col.key} style={{ padding: "8px 12px", color: C.body, fontSize: 12, whiteSpace: col.key === "term" || col.key === "recommendedAction" ? "normal" : "nowrap" }}>
                                {item[col.key]}
                              </td>
                            ))}
                            <td style={{ padding: "8px 12px" }}>
                              <button className="why-btn" onClick={() => setExpandedWhy(isOpen ? null : id)}
                                style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer", transition: "background 0.15s, color 0.15s" }}>
                                {isOpen ? "hide" : "why?"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={id + "-why"}>
                              <td colSpan={9} style={{ padding: "8px 12px 10px 24px", fontSize: 11, color: C.body, lineHeight: 1.6, background: C.greenDim }}>
                                <strong style={{ color: C.green }}>Flagged because:</strong> {item.whyFlag}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 40, background: `linear-gradient(to right, transparent, #FFFFFF)`, pointerEvents: "none" }} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── KeywordTab ──

function KeywordTab({ data, setData, targetAcos, setTargetAcos, onSwitchTab }) {
  const [error, setError] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [overbidSort, setOverbidSort] = useState({ col: null, dir: "desc" });
  const [underbidSort, setUnderbidSort] = useState({ col: null, dir: "desc" });

  const analysis = useMemo(() => {
    if (!data.rows.length) return null;
    return analyzeKeyword(data.rows, targetAcos);
  }, [data.rows, targetAcos]);

  const handleFile = (file, fileError, fileData, fileType) => {
    if (fileError) { setError(fileError); return; }
    setParsing(true);
    setTimeout(() => {
      try {
        const parsed = fileType === "xlsx" ? parseXlsx(fileData) : parseCsv(fileData);
        const colError = validateColumns(parsed.headers, KEYWORD_REQUIRED_COLUMNS);
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

  // ── Empty state ──
  if (!data.rows.length) {
    return (
      <div>
        <GoalWizard onSelect={onSwitchTab} />
        <div style={{ background: C.indigoDim, border: `1px solid ${C.indigo}30`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.indigo, marginBottom: 10 }}>
            How to get your Targeting Report
          </div>
          {[
            "Go to Seller Central → Advertising → Campaign Manager",
            "Click Reports → Create report",
            "Report type: Targeting",
            "Choose date range (last 30–60 days recommended)",
            "Download and upload the CSV below",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: C.indigoDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.indigo }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.body, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
        {error && (
          <div style={{ background: C.redDim, border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991B1B", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
          </div>
        )}
        {parsing ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
            <div>Analyzing file…</div>
          </div>
        ) : (
          <UploadZone onFile={handleFile} label="Drop your Targeting Report here or click to browse (CSV or Excel)" />
        )}
      </div>
    );
  }

  // ── Analysis view ──
  const { overbid, underbid, zeroImpressions, totalRows } = analysis;

  const KEYWORD_COLS = [
    { key: "targeting", label: "Keyword / Target", tip: "The keyword or ASIN target" },
    { key: "matchType", label: "Match", tip: "Match type" },
    { key: "spend", label: "Spend ($)", tip: "Total spend", render: item => `$${Number(item.spend).toFixed(2)}` },
    { key: "sales", label: "Sales ($)", tip: "7-day total sales", render: item => `$${Number(item.sales).toFixed(2)}` },
    { key: "clicks", label: "Clicks", tip: "Total clicks" },
    { key: "currentAcos", label: "ACoS %", tip: "Current ACoS" },
    { key: "suggestedBid", label: "Suggested Bid", tip: "Calculated from your target ACoS", render: item => `$${item.suggestedBid}` },
    { key: "campaign", label: "Campaign", tip: "Campaign name" },
  ];

  const ZERO_IMP_COLS = [
    { key: "targeting", label: "Keyword / Target", tip: "The keyword or ASIN target" },
    { key: "matchType", label: "Match", tip: "Match type" },
    { key: "spend", label: "Spend ($)", tip: "Total spend", render: item => `$${Number(item.spend).toFixed(2)}` },
    { key: "campaign", label: "Campaign", tip: "Campaign name" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.muted, background: C.greenDim, border: `1px solid #86EFAC`, borderRadius: 8, padding: "8px 12px" }}>
        <CheckCircle size={13} color={C.green} />
        <span style={{ color: C.body }}>{data.file?.name} · {totalRows.toLocaleString()} rows</span>
        {confirmClear ? (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.body }}>Discard data?</span>
            <button onClick={() => { setData({ rows: [], file: null }); setError(null); setConfirmClear(false); }}
              style={{ fontSize: 11, color: C.red, background: "none", border: `1px solid ${C.red}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Yes</button>
            <button onClick={() => setConfirmClear(false)}
              style={{ fontSize: 11, color: C.muted, background: "none", border: `1px solid ${C.bdMed}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}
            style={{ marginLeft: "auto", fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Upload new file
          </button>
        )}
      </div>

      {/* Target ACoS input */}
      <div style={{ background: C.indigoDim, border: `1px solid ${C.indigo}30`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.indigo, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Target ACoS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number" inputMode="decimal" className="ppc-num"
              value={targetAcos}
              onChange={e => setTargetAcos(Math.max(1, Math.min(200, parseFloat(e.target.value) || 30)))}
              style={{ width: 72, height: 36, background: C.card, border: `1px solid ${C.bdMed}`, borderRadius: 8, padding: "0 8px 0 10px", fontSize: 15, color: C.ink, outline: "none", boxSizing: "border-box" }}
            />
            <span style={{ fontSize: 14, color: C.muted }}>%</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.indigo, lineHeight: 1.6 }}>
          <strong>Formula:</strong> Suggested bid = (Sales ÷ Clicks) × (Target ACoS ÷ 100)<br />
          <span style={{ color: C.muted }}>Expand any row to see the exact calculation for that keyword.</span>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 10 }}>
        <SummaryCard label="Overbidding" value={overbid.length} color={C.red} />
        <SummaryCard label="Underbidding" value={underbid.length} color={C.green} />
        <SummaryCard label="No Impressions" value={zeroImpressions.length} color={C.amber} />
        <SummaryCard label="Rows Analyzed" value={totalRows.toLocaleString()} color={C.muted} />
      </div>

      {/* Overbidding */}
      <RecoSection
        title="Overbidding — Lower Bids"
        color={C.red}
        items={sortRows(overbid, overbidSort.col, overbidSort.dir)}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="ovb"
        columns={KEYWORD_COLS}
        onExport={() => downloadCsv(exportKeywordCsv(overbid, []), "overbidding.csv")}
        exportLabel="Export CSV"
        emptyMessage="No overbidding keywords found at current target ACoS."
      />

      {/* Underbidding */}
      <RecoSection
        title="Underbidding — Raise Bids"
        color={C.green}
        items={sortRows(underbid, underbidSort.col, underbidSort.dir)}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="unb"
        columns={KEYWORD_COLS}
        onExport={() => downloadCsv(exportKeywordCsv([], underbid), "underbidding.csv")}
        exportLabel="Export CSV"
        emptyMessage="No underbidding keywords found at current target ACoS."
      />

      {/* Zero impressions */}
      <RecoSection
        title="Zero Impressions — Investigate"
        color={C.amber}
        items={zeroImpressions}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="zimp"
        columns={ZERO_IMP_COLS}
        onExport={() => {}}
        exportLabel=""
        emptyMessage="No zero-impression keywords found."
      />
    </div>
  );
}

// ── PlacementTab ──

function PlacementTab({ data, setData, targetAcos, setTargetAcos, onSwitchTab }) {
  const [error, setError] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const analysis = useMemo(() => {
    if (!data.rows.length) return null;
    return analyzePlacement(data.rows, targetAcos);
  }, [data.rows, targetAcos]);

  const handleFile = (file, fileError, fileData, fileType) => {
    if (fileError) { setError(fileError); return; }
    setParsing(true);
    setTimeout(() => {
      try {
        const parsed = fileType === "xlsx" ? parseXlsx(fileData) : parseCsv(fileData);
        const colError = validateColumns(parsed.headers, PLACEMENT_REQUIRED_COLUMNS);
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

  // ── Empty state ──
  if (!data.rows.length) {
    return (
      <div>
        <GoalWizard onSelect={onSwitchTab} />
        <div style={{ background: C.indigoDim, border: `1px solid ${C.indigo}30`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.indigo, marginBottom: 10 }}>
            How to get your Placement Report
          </div>
          {[
            "Go to Seller Central → Advertising → Campaign Manager",
            "Click Reports → Create report",
            "Report type: Placement",
            "Choose date range (last 30–60 days recommended)",
            "Download and upload the CSV below",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: C.indigoDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.indigo }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.body, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
        {error && (
          <div style={{ background: C.redDim, border: `1px solid ${C.red}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991B1B", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
          </div>
        )}
        {parsing ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
            <div>Analyzing file…</div>
          </div>
        ) : (
          <UploadZone onFile={handleFile} label="Drop your Placement Report here or click to browse (CSV or Excel)" />
        )}
      </div>
    );
  }

  // ── Analysis view ──
  const { opportunities, underperforming, healthy, totalCampaigns, totalRows } = analysis;

  const PLACEMENT_COLS = [
    { key: "campaign", label: "Campaign", tip: "Campaign name" },
    { key: "placement", label: "Placement", tip: "Top of Search / Rest of Search / Product Pages" },
    { key: "spend", label: "Spend ($)", tip: "Total spend on this placement", render: item => `$${Number(item.spend).toFixed(2)}` },
    { key: "sales", label: "Sales ($)", tip: "Total sales from this placement", render: item => `$${Number(item.sales).toFixed(2)}` },
    { key: "acos", label: "ACoS %", tip: "Placement ACoS" },
    { key: "modifierStr", label: "Suggested Modifier", tip: "Recommended bid modifier adjustment", noSort: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* File info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.muted, background: C.greenDim, border: `1px solid #86EFAC`, borderRadius: 8, padding: "8px 12px" }}>
        <CheckCircle size={13} color={C.green} />
        <span style={{ color: C.body }}>{data.file?.name} · {totalCampaigns} campaigns · {totalRows.toLocaleString()} rows</span>
        {confirmClear ? (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.body }}>Discard data?</span>
            <button onClick={() => { setData({ rows: [], file: null }); setError(null); setConfirmClear(false); }}
              style={{ fontSize: 11, color: C.red, background: "none", border: `1px solid ${C.red}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Yes</button>
            <button onClick={() => setConfirmClear(false)}
              style={{ fontSize: 11, color: C.muted, background: "none", border: `1px solid ${C.bdMed}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}
            style={{ marginLeft: "auto", fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Upload new file
          </button>
        )}
      </div>

      {/* Target ACoS + formula */}
      <div style={{ background: C.indigoDim, border: `1px solid ${C.indigo}30`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.indigo, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Target ACoS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="number" inputMode="decimal" className="ppc-num"
              value={targetAcos}
              onChange={e => setTargetAcos(Math.max(1, Math.min(200, parseFloat(e.target.value) || 30)))}
              style={{ width: 72, height: 36, background: C.card, border: `1px solid ${C.bdMed}`, borderRadius: 8, padding: "0 8px 0 10px", fontSize: 15, color: C.ink, outline: "none", boxSizing: "border-box" }}
            />
            <span style={{ fontSize: 14, color: C.muted }}>%</span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.indigo, lineHeight: 1.6 }}>
          <strong>Formula:</strong> Suggested modifier = (Target ACoS ÷ Placement ACoS − 1) × 100<br />
          <span style={{ color: C.muted }}>Expand any row to see the exact calculation. Modifiers capped at −99% to +900% (Amazon limits).</span>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 10 }}>
        <SummaryCard label="Opportunities" value={opportunities.length} color={C.green} />
        <SummaryCard label="Underperforming" value={underperforming.length} color={C.red} />
        <SummaryCard label="Healthy" value={healthy.length} color={C.muted} />
        <SummaryCard label="Campaigns" value={totalCampaigns} color={C.muted} />
      </div>

      {/* Opportunities */}
      <RecoSection
        title="Opportunities — Increase Modifier"
        color={C.green}
        items={opportunities}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="plc-opp"
        columns={PLACEMENT_COLS}
        onExport={() => downloadCsv(exportPlacementCsv(opportunities, []), "placement-opportunities.csv")}
        exportLabel="Export CSV"
        emptyMessage="No placement opportunities found at current target ACoS."
      />

      {/* Underperforming */}
      <RecoSection
        title="Underperforming — Reduce Modifier"
        color={C.red}
        items={underperforming}
        expandedWhy={expandedWhy}
        setExpandedWhy={setExpandedWhy}
        idPrefix="plc-under"
        columns={PLACEMENT_COLS}
        onExport={() => downloadCsv(exportPlacementCsv([], underperforming), "placement-underperforming.csv")}
        exportLabel="Export CSV"
        emptyMessage="No underperforming placements found at current target ACoS."
      />
    </div>
  );
}

function SqpTab({ data, setData, onSwitchTab }) {
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
        <GoalWizard onSelect={onSwitchTab} />
        <div style={{ background: C.cyanDim, border: `1px solid ${C.cyan}30`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.cyan, marginBottom: 10 }}>How to get your Search Query Performance Report</div>
          {[
            "Go to Seller Central → Brand Analytics → Search Query Performance",
            "Select your ASIN and date range (last 90 days recommended for volume)",
            "Click Export → Download CSV",
            "Upload the CSV below",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 6, alignItems: "flex-start" }}>
              <span style={{ minWidth: 20, height: 20, borderRadius: "50%", background: C.cyanDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: C.cyan }}>{i + 1}</span>
              <span style={{ fontSize: 12, color: C.body, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>What you'll get</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              • Opportunity keywords — good conversion but low market share (increase bids)<br />
              • Market Leader keywords — you dominate these queries (protect budget)<br />
              • Risk keywords — high impressions but poor conversion (review relevance)<br />
              • Export-ready CSV with labels and recommended actions
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10, marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, color: "#92400E", background: C.amberDim, border: `1px solid ${C.amber}20`, borderRadius: 8, padding: "8px 12px" }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Recommended: Use a 90-day report for best results. Short date ranges may not have enough search volume data to surface meaningful insights.</span>
        </div>
        {error && (
          <div style={{ background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991B1B", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{error}
          </div>
        )}
        {parsing ? (
          <div style={{ padding: "40px 24px", textAlign: "center", color: C.muted, fontSize: 13 }}>
            <div style={{ display: "inline-block", width: 20, height: 20, border: `2px solid ${C.border}`, borderTopColor: C.indigo, borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: C.muted, background: C.greenDim, border: `1px solid #86EFAC`, borderRadius: 8, padding: "8px 12px" }}>
        <CheckCircle size={13} color={C.green} />
        <span style={{ color: C.body }}>{data.file?.name} · {totalQueries.toLocaleString()} queries</span>
        {confirmClear ? (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.body }}>Discard data?</span>
            <button onClick={() => { setData({ rows: [], file: null }); setError(null); setConfirmClear(false); }}
              style={{ fontSize: 11, color: C.red, background: "none", border: `1px solid ${C.red}44`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Yes</button>
            <button onClick={() => setConfirmClear(false)}
              style={{ fontSize: 11, color: C.muted, background: "none", border: `1px solid ${C.bdMed}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)}
            style={{ marginLeft: "auto", fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>
            Upload new file
          </button>
        )}
      </div>

      {/* Brand filter */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, whiteSpace: "nowrap" }}>Exclude brand:</span>
          <input type="text" className="ppc-text" placeholder="e.g. nike" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ flex: 1, background: C.card, border: `1px solid ${C.bdMed}`, borderRadius: 8, padding: "7px 12px", fontSize: 12, color: C.ink, outline: "none", transition: "border-color 0.15s" }} />
          {brandFilter && <button onClick={() => setBrandFilter("")}
            style={{ fontSize: 11, color: C.muted, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>clear</button>}
        </div>
        <span style={{ fontSize: 10, color: C.subtle, paddingLeft: 4 }}>Hides any result whose search query contains this substring</span>
      </div>

      {/* Thresholds panel */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <button onClick={() => setThresholdsOpen(o => !o)}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: C.surface, border: "none", cursor: "pointer", color: C.muted, fontSize: 12 }}>
          {thresholdsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <span>Thresholds</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.subtle }}>
            {JSON.stringify(thresholds) === JSON.stringify(SQP_THRESHOLD_DEFAULTS) ? "using defaults" : "customized"}
          </span>
        </button>
        {thresholdsOpen && (
          <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, borderTop: `1px solid ${C.border}` }}>
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
                    style={{ marginLeft: "auto", fontSize: 10, color: C.subtle, background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}>reset</button>
                </div>
                <div style={{ position: "relative" }}>
                  <input type="number" className="ppc-num" value={thresholds[key]}
                    onChange={e => setThresholds(t => ({ ...t, [key]: parseFloat(e.target.value) || 0 }))}
                    style={{ width: "100%", background: C.card, border: `1px solid ${C.bdMed}`, borderRadius: 8, padding: `7px ${suffix ? 28 : 10}px 7px 10px`, fontSize: 12, color: C.ink, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s" }} />
                  {suffix && <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted, pointerEvents: "none" }}>{suffix}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10 }}>
        <SummaryCard label="Opportunities" value={filteredOpportunities.length} color={C.green} />
        <SummaryCard label="Market Leaders" value={filteredLeaders.length} color={C.cyan} />
        <SummaryCard label="Risk Keywords" value={filteredRisks.length} color={C.rose} />
        <SummaryCard label="Queries Analyzed" value={totalQueries.toLocaleString()} color={C.muted} />
      </div>

      {/* Opportunities */}
      <RecoSection
        title="Opportunity Keywords"
        color={C.green}
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
              const gapColor = gap >= 20 ? C.green : gap >= 10 ? C.amber : C.muted;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 160 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: gapColor, fontFamily: "ui-monospace, monospace", minWidth: 38 }}>+{gap.toFixed(1)}%</span>
                  <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden", minWidth: 70 }}>
                    <div style={{ height: "100%", width: `${Math.min(imp, 100)}%`, background: C.bdMed, borderRadius: 3, position: "relative" }}>
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${imp > 0 ? (clk / imp) * 100 : 0}%`, background: gapColor, borderRadius: 3 }} />
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>{clk}% / {imp}%</span>
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
