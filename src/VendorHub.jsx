import React, { useState } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, CheckCircle, FileSpreadsheet,
  HelpCircle, ShieldAlert, TrendingUp, Upload, WalletCards
} from "lucide-react";
import { parseCsv, parseXlsx } from "./parseCsv.js";

const C = {
  teal: "#14B8A6",
  sky: "#0EA5E9",
  navy: "#0B1F3A",
  body: "#334155",
  muted: "#64748B",
  subtle: "#94A3B8",
  border: "#E2E8F0",
  surface: "#F8FAFC",
  card: "#FFFFFF",
  inset: "#F1F5F9",
  green: "#16A34A",
  greenDim: "#F0FDF4",
  amber: "#D97706",
  amberDim: "#FFFBEB",
  red: "#DC2626",
  redDim: "#FEF2F2"
};

const goals = [
  {
    id: "sales",
    icon: TrendingUp,
    title: "Understand sales performance",
    question: "Why are sales up or down?",
    description: "Separate changes in demand, traffic, conversion and availability.",
    available: true
  },
  {
    id: "availability",
    icon: ShieldAlert,
    title: "Prevent out-of-stock",
    question: "Which ASINs are at risk?",
    description: "Combine inventory, open POs and Amazon demand forecasts.",
    available: false
  },
  {
    id: "profit",
    icon: WalletCards,
    title: "Calculate Vendor profitability",
    question: "What do we really earn?",
    description: "Measure net sell-in after terms, deductions, media and costs.",
    available: false
  },
  {
    id: "ads",
    icon: BarChart3,
    title: "Evaluate advertising",
    question: "Is media driving retail growth?",
    description: "Connect Sponsored Ads and DSP investment to total retail sales.",
    available: false
  }
];

const salesReports = [
  {
    id: "sales",
    number: 1,
    title: "Vendor Sales Report",
    purpose: "Identifies where the sales change happened by period and ASIN.",
    path: "Vendor Central → Reports → Retail Analytics → Sales",
    settings: [
      ["Reporting period", "Month"],
      ["Distributor view", "Manufacturing"],
      ["Selling program", "Retail"],
      ["Level", "ASIN"],
      ["Date range", "Current period; include prior-year comparison when available"]
    ],
    recognized: "ASIN plus ordered or dispatched revenue/units"
  },
  {
    id: "traffic",
    number: 2,
    title: "Vendor Traffic Report",
    purpose: "Shows whether the sales change came from traffic or conversion.",
    path: "Vendor Central → Reports → Retail Analytics → Traffic",
    settings: [
      ["Reporting period", "Same period as Sales"],
      ["Level", "ASIN"],
      ["Date range", "Match the Sales report exactly"]
    ],
    recognized: "ASIN and Glance Views"
  },
  {
    id: "inventory",
    number: 3,
    title: "Vendor Inventory Report",
    purpose: "Checks whether low availability or open POs contributed to lost demand.",
    path: "Vendor Central → Reports → Retail Analytics → Inventory",
    settings: [
      ["Reporting period", "Week or Month"],
      ["Distributor view", "Sourcing"],
      ["Selling program", "Retail"],
      ["Level", "ASIN"],
      ["Date range", "Match the sales investigation period"]
    ],
    recognized: "ASIN plus sellable inventory or open PO units"
  }
];

function normalizeHeaders(headers) {
  return headers.map(function (header) {
    return String(header || "").toLowerCase().replace(/[_:()#%]/g, " ").replace(/\s+/g, " ").trim();
  });
}

function includesAny(headers, terms) {
  return headers.some(function (header) {
    return terms.some(function (term) { return header.includes(term); });
  });
}

function validateVendorReport(headers, reportId) {
  const normalized = normalizeHeaders(headers);
  const hasAsin = includesAny(normalized, ["asin", "amazon standard identification"]);

  if (!hasAsin) {
    return "This does not appear to be an ASIN-level report. Download the report with ASIN-level detail.";
  }

  if (reportId === "sales") {
    const hasSales = includesAny(normalized, [
      "ordered revenue", "shipped revenue", "ordered units", "shipped units",
      "shipped cogs", "dispatched revenue", "dispatched units", "dispatched cogs",
      "ordered product sales"
    ]);
    return hasSales ? null : "The file has an ASIN column, but no recognized ordered or shipped sales metrics.";
  }

  if (reportId === "traffic") {
    return includesAny(normalized, ["glance view", "detail page view"])
      ? null
      : "The file has an ASIN column, but Glance Views were not found.";
  }

  if (reportId === "inventory") {
    return includesAny(normalized, [
      "sellable on hand", "open purchase order", "open po", "net received inventory"
    ])
      ? null
      : "The file has an ASIN column, but sellable inventory or open PO metrics were not found.";
  }

  return null;
}

function GoalCard({ goal, onSelect }) {
  const Icon = goal.icon;
  return (
    <button
      type="button"
      onClick={function () { if (goal.available) onSelect(goal.id); }}
      aria-disabled={!goal.available}
      style={{
        textAlign: "left",
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: goal.available ? "pointer" : "default"
      }}
    >
      <div style={{
        height: "100%",
        background: C.card,
        border: "1px solid " + (goal.available ? C.border : C.inset),
        borderRadius: 14,
        padding: "20px",
        boxShadow: goal.available ? "0 2px 10px rgba(15,23,42,0.06)" : "none",
        opacity: goal.available ? 1 : 0.62,
        transition: "transform 0.15s, border-color 0.15s"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: goal.available ? "#E0F2FE" : C.inset
          }}>
            <Icon size={20} color={goal.available ? C.sky : C.subtle} />
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, borderRadius: 99, padding: "4px 8px",
            color: goal.available ? C.green : C.muted,
            background: goal.available ? C.greenDim : C.inset,
            height: "fit-content"
          }}>
            {goal.available ? "READY" : "NEXT"}
          </span>
        </div>
        <h3 style={{ fontSize: 15, margin: "16px 0 5px", color: C.navy }}>{goal.title}</h3>
        <p style={{ fontSize: 12, fontWeight: 600, color: C.body, margin: "0 0 7px" }}>{goal.question}</p>
        <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, margin: 0 }}>{goal.description}</p>
        {goal.available && (
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 6, color: C.sky, fontSize: 12, fontWeight: 700 }}>
            Start analysis <ArrowRight size={13} />
          </div>
        )}
      </div>
    </button>
  );
}

function SettingsTable({ settings }) {
  return (
    <div style={{ marginTop: 14, border: "1px solid " + C.border, borderRadius: 9, overflow: "hidden" }}>
      {settings.map(function (row, index) {
        return (
          <div key={row[0]} style={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 0.75fr) minmax(180px, 1.25fr)",
            borderTop: index ? "1px solid " + C.border : "none",
            background: index % 2 ? C.surface : C.card
          }}>
            <span style={{ padding: "8px 10px", fontSize: 11, color: C.muted }}>{row[0]}</span>
            <span style={{ padding: "8px 10px", fontSize: 11, color: C.body, fontWeight: 600 }}>{row[1]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ReportStep({ report, completed, locked, fileName, error, onFile }) {
  return (
    <section style={{
      background: C.card,
      border: "1px solid " + (completed ? "#86EFAC" : locked ? C.inset : C.border),
      borderRadius: 14,
      overflow: "hidden",
      opacity: locked ? 0.48 : 1
    }}>
      <div style={{
        padding: "16px 18px",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: completed ? C.greenDim : C.card
      }}>
        <div style={{
          width: 28, height: 28, flexShrink: 0, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: completed ? C.green : C.sky, color: "#fff",
          fontSize: 12, fontWeight: 800
        }}>
          {completed ? <CheckCircle size={16} /> : report.number}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ fontSize: 14, color: C.navy, margin: "0 0 4px" }}>{report.title}</h3>
              <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>{report.purpose}</p>
            </div>
            {completed && (
              <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>
                {fileName}
              </span>
            )}
          </div>

          {!locked && !completed && (
            <>
              <div style={{
                marginTop: 14, padding: "10px 12px", background: "#E0F2FE",
                borderRadius: 8, fontSize: 12, color: C.navy, fontWeight: 600
              }}>
                {report.path}
              </div>
              <SettingsTable settings={report.settings} />
              <p style={{ margin: "10px 0 0", fontSize: 10, color: C.subtle }}>
                The exact menu wording can vary by marketplace and Vendor Central permissions.
              </p>
              <label style={{
                marginTop: 14, minHeight: 82, border: "2px dashed " + (error ? C.red : C.border),
                borderRadius: 10, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                background: error ? C.redDim : C.surface
              }}>
                <Upload size={19} color={error ? C.red : C.sky} />
                <span style={{ marginTop: 7, fontSize: 12, fontWeight: 700, color: error ? C.red : C.body }}>
                  Upload {report.title}
                </span>
                <span style={{ marginTop: 3, fontSize: 10, color: C.muted }}>
                  CSV or Excel · Expected: {report.recognized}
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={function (event) { onFile(report.id, event.target.files[0]); }}
                />
              </label>
              {error && <p style={{ margin: "8px 0 0", color: C.red, fontSize: 11 }}>{error}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default function VendorHub() {
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [uploaded, setUploaded] = useState({});
  const [errors, setErrors] = useState({});

  const firstIncomplete = salesReports.findIndex(function (report) {
    return !uploaded[report.id];
  });

  function resetFlow() {
    setSelectedGoal(null);
    setUploaded({});
    setErrors({});
  }

  function handleFile(reportId, file) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".xls")) {
      setErrors(function (current) {
        return Object.assign({}, current, { [reportId]: "Upload a CSV or Excel file." });
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const parsed = lower.endsWith(".csv")
          ? parseCsv(event.target.result)
          : parseXlsx(event.target.result);
        const issue = validateVendorReport(parsed.headers, reportId);
        if (issue) {
          setErrors(function (current) {
            return Object.assign({}, current, { [reportId]: issue });
          });
          return;
        }
        setErrors(function (current) {
          const next = Object.assign({}, current);
          delete next[reportId];
          return next;
        });
        setUploaded(function (current) {
          return Object.assign({}, current, {
            [reportId]: { file: file, rows: parsed.rows, headers: parsed.headers }
          });
        });
      } catch (parseError) {
        setErrors(function (current) {
          return Object.assign({}, current, {
            [reportId]: parseError.message || "The file could not be read."
          });
        });
      }
    };

    if (lower.endsWith(".csv")) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }

  if (!selectedGoal) {
    return (
      <main style={{ minHeight: "calc(100vh - 52px)", background: C.surface, padding: "34px 18px 54px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", maxWidth: 650, margin: "0 auto 28px" }}>
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.09em",
              color: C.sky, background: "#E0F2FE", padding: "5px 9px", borderRadius: 99
            }}>
              AMAZON VENDOR
            </span>
            <h1 style={{ color: C.navy, fontSize: "clamp(24px, 4vw, 34px)", margin: "14px 0 9px", letterSpacing: "-0.03em" }}>
              What do you need to understand?
            </h1>
            <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Choose the business question. Danuly will tell you exactly which Vendor Central report to download and validate it before analysis.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
            {goals.map(function (goal) {
              return <GoalCard key={goal.id} goal={goal} onSelect={setSelectedGoal} />;
            })}
          </div>

          <div style={{
            marginTop: 18, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 7, color: C.muted, fontSize: 11
          }}>
            <HelpCircle size={12} />
            Start with one question. Additional reports are requested only when they can improve the diagnosis.
          </div>
        </div>
      </main>
    );
  }

  const allComplete = firstIncomplete === -1;

  return (
    <main style={{ minHeight: "calc(100vh - 52px)", background: C.surface, padding: "26px 18px 54px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <button
          type="button"
          onClick={resetFlow}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "transparent",
            border: "none", padding: 0, color: C.muted, cursor: "pointer", fontSize: 12
          }}
        >
          <ArrowLeft size={13} /> Change goal
        </button>

        <div style={{ margin: "18px 0 20px" }}>
          <h1 style={{ fontSize: 24, color: C.navy, margin: "0 0 6px", letterSpacing: "-0.025em" }}>
            Why are sales up or down?
          </h1>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
            Begin with sales. Danuly will progressively request traffic and inventory so you receive value before downloading every possible report.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {salesReports.map(function (report, index) {
            const completed = Boolean(uploaded[report.id]);
            const locked = !completed && index > firstIncomplete;
            return (
              <ReportStep
                key={report.id}
                report={report}
                completed={completed}
                locked={locked}
                fileName={completed ? uploaded[report.id].file.name : ""}
                error={errors[report.id]}
                onFile={handleFile}
              />
            );
          })}
        </div>

        {allComplete && (
          <section style={{
            marginTop: 16, padding: "20px", borderRadius: 14,
            border: "1px solid #86EFAC", background: C.greenDim
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <CheckCircle size={21} color={C.green} />
              <div>
                <h3 style={{ color: C.navy, fontSize: 15, margin: "0 0 6px" }}>Reports are ready for analysis</h3>
                <p style={{ color: C.body, fontSize: 12, lineHeight: 1.55, margin: 0 }}>
                  The next milestone will connect these files into sales drivers, ASIN-level opportunities, availability risks and recommended actions.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                  {["Sales bridge", "Traffic vs CVR", "ASIN contribution", "Inventory risks", "Action plan"].map(function (label) {
                    return (
                      <span key={label} style={{
                        background: C.card, border: "1px solid #BBF7D0", borderRadius: 99,
                        padding: "5px 9px", fontSize: 10, color: C.green, fontWeight: 700
                      }}>
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        <div style={{
          marginTop: 18, padding: "12px 14px", background: C.card,
          border: "1px solid " + C.border, borderRadius: 10,
          display: "flex", gap: 9, alignItems: "flex-start"
        }}>
          <FileSpreadsheet size={15} color={C.sky} style={{ marginTop: 1 }} />
          <p style={{ margin: 0, fontSize: 11, lineHeight: 1.55, color: C.muted }}>
            Files are processed in the browser. This guided version does not upload Vendor Central data to a server.
          </p>
        </div>
      </div>
    </main>
  );
}
