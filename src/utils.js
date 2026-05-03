// src/utils.js — shared number formatting utilities

export const fmt = (n, d = 2) => {
  const v = Number(n);
  return isFinite(v) ? v.toFixed(d) : "—";
};

export const fmtK = (n) => {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString();
};

export const fmtCurrency = (n, compact = false) => {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  if (compact && Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (compact && Math.abs(v) >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(v);
};

export const fmtPct = (n, d = 1) =>
  isFinite(Number(n)) ? `${Number(n).toFixed(d)}%` : "—";

export const fmtDelta = (n) => {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(1)}%`;
};
