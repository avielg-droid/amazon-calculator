import React, { useState } from "react";
import {
  ArrowLeft, ArrowRight, BarChart3, CalendarDays, CheckCircle, FileSpreadsheet,
  HelpCircle, ShieldAlert, TrendingUp, Upload, WalletCards
} from "lucide-react";
import { parseCsv, parseXlsx } from "./parseCsv.js";
import VendorAnalysis from "./VendorAnalysis.jsx";

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
      ["Date range", "The period you want to investigate"]
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
    recognized: "ASIN and page views (Glance Views or Featured offer page views)"
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
    return includesAny(normalized, ["glance view", "detail page view", "featured offer page view"])
      ? null
      : "The file has an ASIN column, but a recognized page-view metric was not found.";
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

function dateFromParts(day, month, year) {
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function formatDate(date) {
  return [
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    date.getUTCFullYear()
  ].join("/");
}

function createPeriod(start, end) {
  return {
    start: start,
    end: end,
    key: start.toISOString().slice(0, 10) + "|" + end.toISOString().slice(0, 10),
    label: formatDate(start) + " – " + formatDate(end)
  };
}

function getReportPeriod(metadata, fileName) {
  const entry = Object.entries(metadata || {}).find(function (item) {
    return item[0].toLowerCase() === "viewing range";
  });
  const source = entry ? entry[1] : fileName;
  const match = String(source || "").match(/(\d{2})[\/-](\d{2})[\/-](\d{4}).*?(\d{2})[\/-](\d{2})[\/-](\d{4})/);

  if (!match) return null;
  return createPeriod(
    dateFromParts(match[1], match[2], match[3]),
    dateFromParts(match[4], match[5], match[6])
  );
}

function getComparisonPeriod(currentPeriod, comparisonType) {
  if (!currentPeriod) return null;

  if (comparisonType === "yoy") {
    return createPeriod(
      dateFromParts(
        currentPeriod.start.getUTCDate(),
        currentPeriod.start.getUTCMonth() + 1,
        currentPeriod.start.getUTCFullYear() - 1
      ),
      dateFromParts(
        currentPeriod.end.getUTCDate(),
        currentPeriod.end.getUTCMonth() + 1,
        currentPeriod.end.getUTCFullYear() - 1
      )
    );
  }

  const day = 24 * 60 * 60 * 1000;
  const duration = currentPeriod.end.getTime() - currentPeriod.start.getTime();
  const previousEnd = new Date(currentPeriod.start.getTime() - day);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return createPeriod(previousStart, previousEnd);
}

function createComparisonReports(period) {
  const dateRange = period ? period.label : "The matching comparison dates";
  return [
    {
      id: "comparisonSales",
      validationId: "sales",
      number: 1,
      title: "Comparison Sales Report",
      purpose: "Measures the change in revenue and units by ASIN.",
      path: "Vendor Central → Reports → Retail Analytics → Sales",
      settings: [
        ["Distributor view", "Manufacturing"],
        ["Selling program", "Retail"],
        ["Level", "ASIN"],
        ["Date range", dateRange]
      ],
      recognized: "ASIN plus ordered or dispatched revenue/units"
    },
    {
      id: "comparisonTraffic",
      validationId: "traffic",
      number: 2,
      title: "Comparison Traffic Report",
      purpose: "Separates traffic change from the conversion effect.",
      path: "Vendor Central → Reports → Retail Analytics → Traffic",
      settings: [
        ["Level", "ASIN"],
        ["Date range", dateRange]
      ],
      recognized: "ASIN and page views (Glance Views or Featured offer page views)"
    }
  ];
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
            Start guided setup <ArrowRight size={13} />
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
                  onChange={function (event) {
                    onFile(report.id, report.validationId || report.id, event.target.files[0]);
                  }}
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

function ComparisonChoice({ active, title, description, recommended, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        textAlign: "left", padding: "14px 15px", borderRadius: 11,
        border: "1px solid " + (active ? C.sky : C.border),
        background: active ? "#F0F9FF" : C.card,
        cursor: "pointer", minHeight: 92
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <span style={{ color: C.navy, fontSize: 13, fontWeight: 750 }}>{title}</span>
        {recommended && (
          <span style={{ color: C.sky, background: "#E0F2FE", borderRadius: 99, padding: "3px 7px", fontSize: 9, fontWeight: 800 }}>
            RECOMMENDED
          </span>
        )}
      </div>
      <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.45, margin: "7px 0 0" }}>{description}</p>
    </button>
  );
}

function CurrentReportsSummary({ uploaded, period }) {
  return (
    <section style={{ padding: "16px 18px", borderRadius: 12, background: C.greenDim, border: "1px solid #86EFAC" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <CheckCircle size={19} color={C.green} />
        <div style={{ minWidth: 0 }}>
          <h3 style={{ color: C.navy, fontSize: 14, margin: "0 0 5px" }}>Current-period reports complete</h3>
          <p style={{ color: C.body, fontSize: 11, margin: 0 }}>
            {period ? period.label : "Current investigation period"} · Sales, Traffic and Inventory
          </p>
          <div style={{ marginTop: 9, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {salesReports.map(function (report) {
              return (
                <span key={report.id} style={{
                  maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  padding: "4px 7px", background: C.card, border: "1px solid #BBF7D0",
                  borderRadius: 99, color: C.green, fontSize: 9, fontWeight: 700
                }}>
                  {uploaded[report.id] ? uploaded[report.id].file.name : report.title}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function VendorHub() {
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [uploaded, setUploaded] = useState({});
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState("current");
  const [comparisonType, setComparisonType] = useState("yoy");

  const firstIncomplete = salesReports.findIndex(function (report) {
    return !uploaded[report.id];
  });
  const currentPeriod = uploaded.sales ? uploaded.sales.period : null;
  const comparisonPeriod = getComparisonPeriod(currentPeriod, comparisonType);
  const comparisonReports = createComparisonReports(comparisonPeriod);
  const comparisonFirstIncomplete = comparisonReports.findIndex(function (report) {
    return !uploaded[report.id];
  });

  function resetFlow() {
    setSelectedGoal(null);
    setUploaded({});
    setErrors({});
    setStage("current");
    setComparisonType("yoy");
  }

  function chooseComparison(nextType) {
    if (nextType === comparisonType) return;
    setComparisonType(nextType);
    setUploaded(function (current) {
      const next = Object.assign({}, current);
      delete next.comparisonSales;
      delete next.comparisonTraffic;
      return next;
    });
    setErrors(function (current) {
      const next = Object.assign({}, current);
      delete next.comparisonSales;
      delete next.comparisonTraffic;
      return next;
    });
  }

  function handleFile(reportId, validationId, file) {
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
        const issue = validateVendorReport(parsed.headers, validationId);
        if (issue) {
          setErrors(function (current) {
            return Object.assign({}, current, { [reportId]: issue });
          });
          return;
        }
        const period = getReportPeriod(parsed.metadata, file.name);
        const isComparison = reportId.startsWith("comparison");
        const expectedPeriod = isComparison ? comparisonPeriod : currentPeriod;

        if (expectedPeriod && period && expectedPeriod.key !== period.key) {
          setErrors(function (current) {
            return Object.assign({}, current, {
              [reportId]: "Wrong date range. Expected " + expectedPeriod.label + ", but this file contains " + period.label + "."
            });
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
            [reportId]: {
              file: file,
              rows: parsed.rows,
              headers: parsed.headers,
              metadata: parsed.metadata,
              period: period
            }
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

  const allCurrentComplete = firstIncomplete === -1;
  const allComparisonComplete = comparisonFirstIncomplete === -1;

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

        {stage === "analysis" ? (
          <div style={{ marginTop: 16 }}>
            <VendorAnalysis uploaded={uploaded} onBack={function () { setStage("comparison"); }} />
          </div>
        ) : stage === "current" ? (
          <>
            <div style={{ margin: "18px 0 20px" }}>
              <span style={{ color: C.sky, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>
                STEP 1 OF 2 · CURRENT PERIOD
              </span>
              <h1 style={{ fontSize: 24, color: C.navy, margin: "5px 0 6px", letterSpacing: "-0.025em" }}>
                Why are sales up or down?
              </h1>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                Start with the current period. The first Sales report sets the date range, and Danuly checks that Traffic and Inventory match it.
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

            {allCurrentComplete && (
              <section style={{
                marginTop: 16, padding: "20px", borderRadius: 14,
                border: "1px solid #BAE6FD", background: "#F0F9FF"
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <CalendarDays size={21} color={C.sky} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: C.navy, fontSize: 15, margin: "0 0 6px" }}>Current period is ready</h3>
                    <p style={{ color: C.body, fontSize: 12, lineHeight: 1.55, margin: 0 }}>
                      {currentPeriod ? currentPeriod.label + " is loaded. " : "The current reports are loaded. "}
                      Choose a baseline so Danuly can measure what changed and why.
                    </p>
                    <button
                      type="button"
                      onClick={function () { setStage("comparison"); }}
                      style={{
                        marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7,
                        border: "none", borderRadius: 9, padding: "10px 14px",
                        background: C.sky, color: "#fff", fontSize: 12, fontWeight: 750, cursor: "pointer"
                      }}
                    >
                      Continue to comparison <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={function () { setStage("current"); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, background: "transparent",
                border: "none", padding: 0, marginTop: 13, color: C.sky, cursor: "pointer", fontSize: 12
              }}
            >
              <ArrowLeft size={13} /> Back to current reports
            </button>

            <div style={{ margin: "18px 0 18px" }}>
              <span style={{ color: C.sky, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>
                STEP 2 OF 2 · COMPARISON
              </span>
              <h1 style={{ fontSize: 24, color: C.navy, margin: "5px 0 6px", letterSpacing: "-0.025em" }}>
                What should we compare it against?
              </h1>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                Danuly needs only comparison Sales and Traffic reports. Current Inventory is already enough for the availability check.
              </p>
            </div>

            <CurrentReportsSummary uploaded={uploaded} period={currentPeriod} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, margin: "14px 0" }}>
              <ComparisonChoice
                active={comparisonType === "yoy"}
                title="Same period last year"
                description="Best for seasonality and year-over-year performance."
                recommended={true}
                onClick={function () { chooseComparison("yoy"); }}
              />
              <ComparisonChoice
                active={comparisonType === "previous"}
                title="Previous equivalent period"
                description="Best for understanding the most recent operational change."
                recommended={false}
                onClick={function () { chooseComparison("previous"); }}
              />
            </div>

            <div style={{
              marginBottom: 12, padding: "11px 13px", borderRadius: 10,
              background: C.amberDim, border: "1px solid #FDE68A", color: C.body,
              fontSize: 11, lineHeight: 1.5
            }}>
              Download both reports for <strong>{comparisonPeriod ? comparisonPeriod.label : "the matching comparison dates"}</strong>.
              Do not upload the current-period files again.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {comparisonReports.map(function (report, index) {
                const completed = Boolean(uploaded[report.id]);
                const locked = !completed && index > comparisonFirstIncomplete;
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

            {allComparisonComplete && (
              <section style={{
                marginTop: 16, padding: "20px", borderRadius: 14,
                border: "1px solid #86EFAC", background: C.greenDim
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <CheckCircle size={21} color={C.green} />
                  <div>
                    <h3 style={{ color: C.navy, fontSize: 15, margin: "0 0 6px" }}>All reports are ready for analysis</h3>
                    <p style={{ color: C.body, fontSize: 12, lineHeight: 1.55, margin: 0 }}>
                      Current and comparison periods are aligned. The analysis can now explain the change instead of showing only a current-period snapshot.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                      {["Sales bridge", "Traffic vs conversion", "ASIN contribution", "Inventory risks", "Action plan"].map(function (label) {
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
                    <button
                      type="button"
                      onClick={function () { setStage("analysis"); }}
                      style={{
                        marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7,
                        border: "none", borderRadius: 9, padding: "10px 14px",
                        background: C.green, color: "#fff", fontSize: 12, fontWeight: 750, cursor: "pointer"
                      }}
                    >
                      Run sales diagnosis <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </section>
            )}
          </>
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
