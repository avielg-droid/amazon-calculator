import React, { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, CheckCircle2, Info, PackageSearch, TrendingDown, TrendingUp
} from "lucide-react";
import { availableSalesModes, buildVendorAnalysis } from "./vendorAnalysis.js";

const C = {
  sky: "#0EA5E9",
  navy: "#0B1F3A",
  body: "#334155",
  muted: "#64748B",
  subtle: "#94A3B8",
  border: "#E2E8F0",
  surface: "#F8FAFC",
  card: "#FFFFFF",
  green: "#16A34A",
  greenDim: "#F0FDF4",
  amber: "#D97706",
  amberDim: "#FFFBEB",
  red: "#DC2626",
  redDim: "#FEF2F2"
};

function formatCurrency(value, currency, compact) {
  const absolute = Math.abs(value || 0);
  const options = compact && absolute >= 1000
    ? { notation: "compact", maximumFractionDigits: 1 }
    : { maximumFractionDigits: 0 };
  return (value < 0 ? "−" : "") + currency + new Intl.NumberFormat("en-GB", options).format(absolute);
}

function formatNumber(value, digits) {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits || 0 }).format(value || 0);
}

function formatPercent(value, digits) {
  if (value === null || !Number.isFinite(value)) return "—";
  return (value > 0 ? "+" : "") + new Intl.NumberFormat("en-GB", {
    style: "percent", maximumFractionDigits: digits === undefined ? 1 : digits
  }).format(value);
}

function ChangeValue({ value }) {
  const positive = value !== null && value >= 0;
  return (
    <span style={{ color: value === null ? C.muted : positive ? C.green : C.red, fontSize: 11, fontWeight: 750 }}>
      {formatPercent(value)}
    </span>
  );
}

function MetricCard({ label, value, comparison, changeValue, note, tooltip }) {
  return (
    <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "14px 15px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <p style={{ color: C.muted, fontSize: 10, margin: 0, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </p>
        {tooltip && (
          <span
            title={tooltip}
            tabIndex={0}
            aria-label={tooltip}
            style={{ display: "inline-flex", color: C.subtle, cursor: "help", outline: "none" }}
          >
            <Info size={12} />
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 8 }}>
        <strong style={{ color: C.navy, fontSize: 20 }}>{value}</strong>
        <ChangeValue value={changeValue} />
      </div>
      <p style={{ color: C.subtle, fontSize: 9, margin: "5px 0 0" }}>
        Comparison: {comparison}{note ? " · " + note : ""}
      </p>
    </div>
  );
}

function Bridge({ items, currency }) {
  const max = Math.max.apply(null, items.map(function (item) { return Math.abs(item.value); }).concat([1]));
  return (
    <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px" }}>
      <h2 style={{ color: C.navy, fontSize: 15, margin: 0 }}>What drove the revenue change?</h2>
      <p style={{ color: C.muted, fontSize: 11, lineHeight: 1.5, margin: "5px 0 16px" }}>
        Revenue is separated into traffic, units per page view and revenue per unit. Contributions add to the total change.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map(function (item) {
          const positive = item.value >= 0;
          return (
            <div key={item.id} style={{ display: "grid", gridTemplateColumns: "minmax(95px, 0.8fr) minmax(80px, 1.5fr) 68px", gap: 10, alignItems: "center" }}>
              <span style={{ color: C.body, fontSize: 11, fontWeight: 650 }}>{item.label}</span>
              <div style={{ height: 9, background: C.surface, borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: Math.max(4, Math.abs(item.value) / max * 100) + "%",
                  background: positive ? C.green : C.red, borderRadius: 99
                }} />
              </div>
              <span style={{ textAlign: "right", color: positive ? C.green : C.red, fontSize: 11, fontWeight: 750 }}>
                {formatCurrency(item.value, currency, true)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function statusColor(status) {
  if (status === "High risk") return { color: C.red, background: C.redDim };
  if (status === "Watch") return { color: C.amber, background: C.amberDim };
  if (status === "Healthy") return { color: C.green, background: C.greenDim };
  return { color: C.muted, background: C.surface };
}

function AsinTable({ rows, currency, view, onView }) {
  let visibleRows = rows;
  if (view === "declines") visibleRows = rows.filter(function (row) { return row.revenueDelta < 0; });
  if (view === "growth") {
    visibleRows = rows.filter(function (row) { return row.revenueDelta > 0; }).slice().reverse();
  }
  visibleRows = visibleRows.slice(0, 12);

  return (
    <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "17px 18px 12px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ color: C.navy, fontSize: 15, margin: 0 }}>ASIN drivers</h2>
          <p style={{ color: C.muted, fontSize: 10, margin: "4px 0 0" }}>Prioritized by revenue impact.</p>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          {["declines", "growth", "all"].map(function (option) {
            return (
              <button key={option} type="button" onClick={function () { onView(option); }} style={{
                border: "1px solid " + (view === option ? C.sky : C.border), borderRadius: 8,
                background: view === option ? "#F0F9FF" : C.card, color: view === option ? C.sky : C.muted,
                padding: "6px 9px", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "capitalize"
              }}>
                {option}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr style={{ background: C.surface }}>
              {["Product", "Revenue impact", "Traffic", "Units/view", "Inventory", "Diagnosis"].map(function (label) {
                return <th key={label} style={{ textAlign: "left", color: C.muted, fontSize: 9, padding: "9px 12px", borderTop: "1px solid " + C.border }}>{label}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(function (row) {
              const inventoryStyle = statusColor(row.inventoryStatus);
              return (
                <tr key={row.asin} style={{ borderTop: "1px solid " + C.border }}>
                  <td style={{ padding: "10px 12px", maxWidth: 260 }}>
                    <div style={{ color: C.navy, fontSize: 10, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</div>
                    <div style={{ color: C.subtle, fontSize: 9, marginTop: 2 }}>{row.asin}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: row.revenueDelta >= 0 ? C.green : C.red, fontSize: 10, fontWeight: 750 }}>
                    {formatCurrency(row.revenueDelta, currency, true)} <span style={{ color: C.muted }}>({formatPercent(row.revenueChange, 0)})</span>
                  </td>
                  <td style={{ padding: "10px 12px", color: C.body, fontSize: 10 }}>{formatPercent(row.trafficChange, 0)}</td>
                  <td style={{ padding: "10px 12px", color: C.body, fontSize: 10 }}>{formatPercent(row.conversionChange, 0)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: inventoryStyle.color, background: inventoryStyle.background, borderRadius: 99, padding: "4px 7px", fontSize: 9, fontWeight: 750 }}>
                      {row.inventoryStatus}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: C.body, fontSize: 10, fontWeight: 650 }}>{row.diagnosis}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Actions({ actions, currency }) {
  return (
    <section>
      <h2 style={{ color: C.navy, fontSize: 15, margin: "0 0 10px" }}>Recommended action plan</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {actions.slice(0, 4).map(function (action, index) {
          return (
            <div key={action.title} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: C.sky, fontSize: 10, fontWeight: 800 }}>PRIORITY {index + 1}</span>
                <span style={{ color: C.muted, fontSize: 9 }}>{action.count} ASINs</span>
              </div>
              <h3 style={{ color: C.navy, fontSize: 13, margin: "8px 0 5px" }}>{action.title}</h3>
              <p style={{ color: C.muted, fontSize: 10, lineHeight: 1.5, margin: 0 }}>{action.action}</p>
              <p style={{ color: action.impact >= 0 ? C.green : C.red, fontSize: 10, fontWeight: 750, margin: "9px 0 0" }}>
                Net revenue impact: {formatCurrency(action.impact, currency, true)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function VendorAnalysis({ uploaded, onBack }) {
  const modes = availableSalesModes(uploaded);
  const [mode, setMode] = useState(modes[0] || "ordered");
  const [tableView, setTableView] = useState("declines");
  const analysis = useMemo(function () {
    return buildVendorAnalysis(uploaded, mode);
  }, [uploaded, mode]);

  if (analysis.error) {
    return (
      <section style={{ background: C.redDim, border: "1px solid #FCA5A5", borderRadius: 14, padding: 20 }}>
        <AlertTriangle size={20} color={C.red} />
        <h2 style={{ color: C.navy, fontSize: 15, margin: "10px 0 5px" }}>Analysis could not run</h2>
        <p style={{ color: C.body, fontSize: 11, margin: 0 }}>{analysis.error}</p>
        <button type="button" onClick={onBack} style={{ marginTop: 12, border: "none", background: "transparent", color: C.sky, cursor: "pointer", padding: 0 }}>
          Back to reports
        </button>
      </section>
    );
  }

  const direction = analysis.revenueDelta >= 0 ? "increased" : "decreased";
  const currentLabel = analysis.currentPeriod ? analysis.currentPeriod.label : "Current period";
  const comparisonLabel = analysis.comparisonPeriod ? analysis.comparisonPeriod.label : "Comparison period";

  return (
    <div>
      <button type="button" onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent",
        color: C.muted, cursor: "pointer", padding: 0, fontSize: 11
      }}>
        <ArrowLeft size={13} /> Back to reports
      </button>

      <div style={{ margin: "17px 0 16px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <span style={{ color: C.sky, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em" }}>SALES DIAGNOSIS</span>
          <h1 style={{ color: C.navy, fontSize: 25, margin: "5px 0 5px", letterSpacing: "-0.025em" }}>{currentLabel}</h1>
          <p style={{ color: C.muted, fontSize: 11, margin: 0 }}>Compared with {comparisonLabel}</p>
        </div>
        {analysis.modes.length > 1 && (
          <div style={{ display: "flex", padding: 3, borderRadius: 9, background: C.card, border: "1px solid " + C.border }}>
            {analysis.modes.map(function (option) {
              return (
                <button key={option} type="button" onClick={function () { setMode(option); }} style={{
                  border: "none", borderRadius: 7, padding: "7px 10px", cursor: "pointer",
                  background: analysis.mode === option ? C.navy : "transparent",
                  color: analysis.mode === option ? "#fff" : C.muted,
                  fontSize: 10, fontWeight: 750, textTransform: "capitalize"
                }}>
                  {option}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section style={{
        background: analysis.revenueDelta >= 0 ? C.greenDim : C.redDim,
        border: "1px solid " + (analysis.revenueDelta >= 0 ? "#86EFAC" : "#FCA5A5"),
        borderRadius: 14, padding: "18px", marginBottom: 12
      }}>
        <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
          {analysis.revenueDelta >= 0 ? <TrendingUp size={21} color={C.green} /> : <TrendingDown size={21} color={C.red} />}
          <div>
            <h2 style={{ color: C.navy, fontSize: 15, margin: "0 0 6px" }}>Overall diagnosis</h2>
            <p style={{ color: C.body, fontSize: 12, lineHeight: 1.6, margin: 0 }}>
              {analysis.mode === "ordered" ? "Ordered" : "Dispatched"} revenue {direction} by <strong>{formatPercent(Math.abs(analysis.revenueChange)).replace("+", "")}</strong>.
              The largest measured driver was <strong>{analysis.mainDriver.toLowerCase()}</strong>.
              {analysis.revenueDelta < 0 && analysis.topFiveDeclineShare > 0
                ? " The five largest ASIN declines represent " + formatPercent(analysis.topFiveDeclineShare, 0).replace("+", "") + " of gross ASIN losses."
                : ""}
            </p>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 9, marginBottom: 12 }}>
        <MetricCard label={analysis.mode + " revenue"} value={formatCurrency(analysis.current.revenue, analysis.currency, true)} comparison={formatCurrency(analysis.comparison.revenue, analysis.currency, true)} changeValue={analysis.revenueChange} />
        <MetricCard label={analysis.mode + " units"} value={formatNumber(analysis.current.units)} comparison={formatNumber(analysis.comparison.units)} changeValue={change(analysis.current.units, analysis.comparison.units)} />
        <MetricCard label="Page views" value={formatNumber(analysis.current.views)} comparison={formatNumber(analysis.comparison.views)} changeValue={change(analysis.current.views, analysis.comparison.views)} />
        <MetricCard
          label="Units per page view"
          value={formatPercent(analysis.current.conversion, 2).replace("+", "")}
          comparison={formatPercent(analysis.comparison.conversion, 2).replace("+", "")}
          changeValue={change(analysis.current.conversion, analysis.comparison.conversion)}
          note="Conversion proxy"
          tooltip="Calculated as ordered or dispatched units divided by page views. Example: 120 units ÷ 1,000 page views = 12%. It works like a conversion rate, but measures units rather than orders."
        />
        <MetricCard label="Revenue per unit" value={formatCurrency(analysis.current.price, analysis.currency, false)} comparison={formatCurrency(analysis.comparison.price, analysis.currency, false)} changeValue={change(analysis.current.price, analysis.comparison.price)} />
        <MetricCard label="Inventory risks" value={formatNumber(analysis.inventoryRisks)} comparison={analysis.inventoryAvailable ? "Current snapshot" : "Metric unavailable"} changeValue={null} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 12 }}>
        <Bridge items={analysis.bridge} currency={analysis.currency} />
        <section style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "18px" }}>
          <h2 style={{ color: C.navy, fontSize: 15, margin: 0 }}>Data quality</h2>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <CheckCircle2 size={15} color={C.green} />
              <span style={{ color: C.body, fontSize: 10 }}>{analysis.matchedCore} ASINs matched across both periods</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <CheckCircle2 size={15} color={analysis.coverage >= 0.9 ? C.green : C.amber} />
              <span style={{ color: C.body, fontSize: 10 }}>{formatPercent(analysis.coverage, 0).replace("+", "")} core data coverage</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <PackageSearch size={15} color={analysis.inventoryAvailable ? C.green : C.amber} />
              <span style={{ color: C.body, fontSize: 10 }}>
                {analysis.inventoryAvailable ? "Inventory metric detected" : "Inventory risk scoring unavailable"}
              </span>
            </div>
          </div>
          <p style={{ color: C.subtle, fontSize: 9, lineHeight: 1.45, margin: "14px 0 0" }}>
            Current inventory flags risk but does not by itself prove a historical stockout caused the sales change.
          </p>
        </section>
      </div>

      <div style={{ marginBottom: 12 }}>
        <AsinTable rows={analysis.rows} currency={analysis.currency} view={tableView} onView={setTableView} />
      </div>
      <Actions actions={analysis.actions} currency={analysis.currency} />
    </div>
  );
}

function change(current, comparison) {
  if (!comparison) return null;
  return (current - comparison) / Math.abs(comparison);
}
