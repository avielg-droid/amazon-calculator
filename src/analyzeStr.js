// src/analyzeStr.js
// Analyzes Amazon Search Term Report rows and returns recommendations

export const STR_REQUIRED_COLUMNS = [
  "Customer Search Term",
  "Match Type",
  "Impressions",
  "Clicks",
  "Spend",
  "Orders",
  "Campaign Name",
];

export const STR_THRESHOLD_DEFAULTS = {
  minSpendNegative: 10,   // $ spend with 0 orders → negative candidate
  minClicksNegative: 15,  // clicks with 0 orders → negative candidate (alternative)
  minOrdersHarvest: 2,    // minimum orders to consider harvesting
  maxAcosHarvest: 40,     // maximum ACoS% to consider harvesting
};

// Main analysis function
// rows: array of parsed CSV row objects
// thresholds: object matching STR_THRESHOLD_DEFAULTS shape
// Returns: { negatives, harvest, totalTerms }
export function analyzeStr(rows, thresholds = STR_THRESHOLD_DEFAULTS) {
  const { minSpendNegative, minClicksNegative, minOrdersHarvest, maxAcosHarvest } = thresholds;
  const negatives = [];
  const harvest = [];
  const seen = new Set(); // deduplicate by search term

  for (const row of rows) {
    const term = (row["Customer Search Term"] || "").trim();
    if (!term || term === "--") continue;

    const matchType = (row["Match Type"] || "").trim().toLowerCase();
    const clicks = parseFloat(row["Clicks"]) || 0;
    const spend = parseFloat((row["Spend"] || "0").replace(/[$,]/g, "")) || 0;
    const orders = parseFloat(row["Orders"]) || 0;
    const sales = parseFloat((row["Sales"] || "0").replace(/[$,]/g, "")) || 0;
    const impressions = parseFloat(row["Impressions"]) || 0;
    const acos = orders > 0 && sales > 0 ? (spend / sales) * 100 : null;
    const cvr = clicks > 0 ? (orders / clicks) * 100 : 0;
    const campaign = row["Campaign Name"] || "";
    const key = `${term}__${campaign}`;

    // Negative candidate
    const highSpend = spend >= minSpendNegative && orders === 0;
    const highClicks = clicks >= minClicksNegative && orders === 0;
    if ((highSpend || highClicks) && !seen.has(key + "__neg")) {
      seen.add(key + "__neg");
      negatives.push({
        term, matchType, spend, clicks, orders, impressions,
        acos: acos ?? null, campaign,
        whyFlag: highSpend
          ? `$${spend.toFixed(2)} spend with 0 orders (threshold: $${minSpendNegative})`
          : `${clicks} clicks with 0 orders (threshold: ${minClicksNegative} clicks)`,
        recommendedNegType: "Exact",
      });
    }

    // Harvest candidate — only non-exact match types
    const isExact = matchType === "exact";
    const goodOrders = orders >= minOrdersHarvest;
    const goodAcos = acos !== null && acos <= maxAcosHarvest;
    if (!isExact && goodOrders && goodAcos && !seen.has(key + "__harvest")) {
      seen.add(key + "__harvest");
      harvest.push({
        term, matchType, orders, spend, sales, cvr: cvr.toFixed(1),
        acos: acos.toFixed(1), campaign,
        whyFlag: `${orders} orders, ACoS ${acos.toFixed(1)}% (under ${maxAcosHarvest}% threshold), match type is ${matchType || "unknown"} — not yet targeted as Exact`,
        recommendedAction: `Add as Exact to "${campaign}"`,
      });
    }
  }

  return { negatives, harvest, totalTerms: rows.length };
}

// Generate CSV content for negatives export (Amazon bulk upload compatible)
export function exportNegativesCsv(negatives) {
  const headers = ["Customer Search Term", "Campaign Name", "Negative Match Type"];
  const rows = negatives.map(n => [n.term, n.campaign, n.recommendedNegType]);
  return [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
}

// Generate CSV content for harvest export
export function exportHarvestCsv(harvest) {
  const headers = ["Search Term", "Campaign", "Current Match", "Orders", "ACoS %", "CVR %", "Recommended Action"];
  const rows = harvest.map(h => [h.term, h.campaign, h.matchType, h.orders, h.acos, h.cvr, h.recommendedAction]);
  return [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
}
