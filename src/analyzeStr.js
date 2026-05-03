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
  minSpendNegative: 10,    // $ spend with 0 orders → negative candidate
  minClicksNegative: 15,   // clicks with 0 orders → negative candidate (OR condition)
  maxAcosNegative: 100,    // ACOS% above this (with orders) → "poor performer" negative
  minOrdersHarvest: 2,     // minimum orders to qualify for harvest
  minClicksHarvest: 10,    // minimum clicks to qualify for harvest
  maxAcosHarvest: 40,      // maximum ACoS% to qualify for harvest
};

// Main analysis function
// rows: array of parsed CSV row objects
// thresholds: object matching STR_THRESHOLD_DEFAULTS shape
// Returns: { negatives, harvest, totalTerms }
export function analyzeStr(rows, thresholds = STR_THRESHOLD_DEFAULTS) {
  const { minSpendNegative, minClicksNegative, maxAcosNegative, minOrdersHarvest, minClicksHarvest, maxAcosHarvest } = thresholds;
  const negatives = [];
  const harvest = [];
  const seen = new Set();

  // Pre-collect all terms already targeted as Exact in ANY campaign.
  // These should not be flagged as harvest opportunities.
  const exactTargeted = new Set();
  for (const row of rows) {
    const mt = (row["Match Type"] || "").trim().toLowerCase();
    const term = (row["Customer Search Term"] || "").trim();
    if (mt === "exact" && term && term !== "--") exactTargeted.add(term.toLowerCase());
  }

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

    // Negative candidate — two independent rules:
    // Rule 1 (waste): clicks >= minClicksNegative AND spend >= minSpendNegative AND orders === 0
    //   Both thresholds must be crossed — neither alone is enough statistical signal.
    // Rule 2 (poor performer): orders > 0 AND acos > maxAcosNegative AND clicks >= minClicksNegative AND spend >= minSpendNegative
    //   Converting but losing money; clicks+spend floors prevent flagging on tiny samples.
    const wastedBudget = orders === 0 && clicks >= minClicksNegative && spend >= minSpendNegative;
    const poorPerformer = orders > 0 && acos !== null && acos > maxAcosNegative && clicks >= minClicksNegative && spend >= minSpendNegative;

    if ((wastedBudget || poorPerformer) && !seen.has(key + "__neg")) {
      seen.add(key + "__neg");
      let whyFlag, negType;
      if (poorPerformer) {
        whyFlag = `${orders} order${orders !== 1 ? "s" : ""} but ACoS is ${acos.toFixed(1)}% — above ${maxAcosNegative}% threshold ($${spend.toFixed(2)} spend, $${sales.toFixed(2)} sales). Converting but losing money.`;
        negType = "Phrase";
      } else {
        whyFlag = `${clicks} clicks + $${spend.toFixed(2)} spend with 0 orders (thresholds: ${minClicksNegative} clicks · $${minSpendNegative} spend).`;
        negType = "Exact";
      }
      negatives.push({
        term, matchType, spend, clicks, orders, impressions,
        acos: acos ?? null, campaign,
        whyFlag,
        recommendedNegType: negType,
      });
    }

    // Harvest candidate — term must not already be targeted as Exact anywhere in the report
    const alreadyExact = exactTargeted.has(term.toLowerCase());
    const goodOrders = orders >= minOrdersHarvest;
    const goodClicks = clicks >= minClicksHarvest;
    const goodAcos = acos !== null && acos <= maxAcosHarvest;
    if (!alreadyExact && goodOrders && goodClicks && goodAcos && !seen.has(key + "__harvest")) {
      seen.add(key + "__harvest");
      harvest.push({
        term, matchType, orders, spend, sales, cvr: cvr.toFixed(1),
        acos: acos.toFixed(1), campaign,
        whyFlag: `${orders} order${orders !== 1 ? "s" : ""}, ${clicks} clicks, ${acos.toFixed(1)}% ACoS (below ${maxAcosHarvest}% ceiling). Running under ${matchType || "unknown"} match — not yet targeted as Exact in any campaign.`,
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
