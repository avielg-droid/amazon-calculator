// src/analyzePlacement.js
// Analyzes Amazon Placement report and returns bid modifier recommendations

export const PLACEMENT_REQUIRED_COLUMNS = [
  "Campaign Name",
  "Placement",
  "Impressions",
  "Clicks",
  "Spend",
  "Sales",
];

// Normalize Amazon's inconsistent placement name formats
function normalizePlacement(raw) {
  const s = (raw || "").toLowerCase().trim();
  if (s.includes("top of search")) return "Top of Search";
  if (s.includes("rest of search") || s.includes("other on amazon")) return "Rest of Search";
  if (s.includes("product") || s.includes("detail page")) return "Product Pages";
  return raw.trim();
}

// rows: parsed CSV row objects
// targetAcos: number (e.g. 30 = 30%)
// Returns: { opportunities, underperforming, healthy, totalCampaigns, totalRows }
export function analyzePlacement(rows, targetAcos = 30) {
  // Aggregate by campaign + placement
  const grouped = {};

  for (const row of rows) {
    const campaign = (row["Campaign Name"] || "").trim();
    const rawPlacement = row["Placement"] || "";
    const placement = normalizePlacement(rawPlacement);
    if (!campaign || !placement) continue;

    const key = `${campaign}__${placement}`;
    if (!grouped[key]) {
      grouped[key] = { campaign, placement, impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0 };
    }
    const g = grouped[key];
    g.impressions += parseFloat(row["Impressions"]) || 0;
    g.clicks += parseFloat(row["Clicks"]) || 0;
    g.spend += parseFloat((row["Spend"] || "0").replace(/[$,]/g, "")) || 0;
    g.sales += parseFloat((row["Sales"] || "0").replace(/[$,]/g, "")) || 0;
    g.orders += parseFloat((row["Orders"] || "0").replace(/[$,]/g, "")) || 0;
  }

  const opportunities = [], underperforming = [], healthy = [];

  for (const item of Object.values(grouped)) {
    if (item.spend === 0) continue;
    if (item.sales === 0) continue; // can't compute ACoS

    const acos = (item.spend / item.sales) * 100;

    // Clamp modifier to Amazon's allowed range: -99% to +900%
    const rawModifier = (targetAcos / acos - 1) * 100;
    const suggestedModifier = Math.max(-99, Math.min(900, rawModifier));
    const modifierStr = `${suggestedModifier >= 0 ? "+" : ""}${suggestedModifier.toFixed(0)}%`;

    const calc = `(${targetAcos}% ÷ ${acos.toFixed(1)}% − 1) × 100 = ${modifierStr}`;

    const entry = {
      ...item,
      acos: acos.toFixed(1),
      suggestedModifier: suggestedModifier.toFixed(0),
      modifierStr,
      calc,
      whyFlag: `${item.placement} ACoS is ${acos.toFixed(1)}% vs ${targetAcos}% target. ${calc}.`,
    };

    if (acos < targetAcos * 0.7) {
      opportunities.push({ ...entry, insight: "Converting well below target — increase bid modifier to capture more volume" });
    } else if (acos > targetAcos * 1.3) {
      underperforming.push({ ...entry, insight: "ACoS above target — reduce bid modifier to improve profitability" });
    } else {
      healthy.push({ ...entry, insight: "Within target range — no action needed" });
    }
  }

  const totalCampaigns = new Set(Object.values(grouped).map(g => g.campaign)).size;
  return { opportunities, underperforming, healthy, totalCampaigns, totalRows: rows.length };
}

export function exportPlacementCsv(opportunities, underperforming) {
  const headers = ["Type", "Campaign", "Placement", "Spend ($)", "Sales ($)", "ACoS %", "Suggested Modifier", "Insight"];
  const rows = [
    ...opportunities.map(p => ["Opportunity", p.campaign, p.placement, p.spend.toFixed(2), p.sales.toFixed(2), p.acos, p.modifierStr, p.insight]),
    ...underperforming.map(p => ["Underperforming", p.campaign, p.placement, p.spend.toFixed(2), p.sales.toFixed(2), p.acos, p.modifierStr, p.insight]),
  ];
  return [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}
