// src/analyzeSqp.js
// Analyzes Amazon Search Query Performance report rows and returns recommendations

export const SQP_REQUIRED_COLUMNS = [
  "Search Query",
  "Search Query Volume",
  "Impressions",
  "Impression Share",
  "Clicks",
  "Click Share",
  "Purchases",
  "Purchase Share",
];

export const SQP_THRESHOLD_DEFAULTS = {
  minSearchVolume: 100,        // ignore low-volume noise
  minPurchaseShareOpportunity: 5,   // % — you're converting
  maxClickShareOpportunity: 20,     // % — but own little traffic
  minImpressionShareRisk: 30,       // % — visible but...
  maxPurchaseShareRisk: 3,          // % — ...not converting
  minPurchaseShareLeader: 20,  // % — you dominate this query
};

// Parse share values (may be "12.34%" or "0.12" format depending on report version)
function parseShare(val) {
  if (!val || val === "--") return 0;
  const s = String(val).replace(/[$,]/g, "");
  const n = parseFloat(s);
  // If value looks like a decimal fraction (0.xx), convert to percentage
  return n < 1 && !s.includes("%") ? n * 100 : n;
}

// Main analysis function
// rows: array of parsed CSV row objects
// thresholds: object matching SQP_THRESHOLD_DEFAULTS shape
// Returns: { opportunities, risks, totalQueries }
export function analyzeSqp(rows, thresholds = SQP_THRESHOLD_DEFAULTS) {
  const {
    minSearchVolume,
    minPurchaseShareOpportunity,
    maxClickShareOpportunity,
    minImpressionShareRisk,
    maxPurchaseShareRisk,
    minPurchaseShareLeader = 20,
  } = thresholds;

  const opportunities = [];
  const risks = [];
  const leaders = [];

  for (const row of rows) {
    const query = (row["Search Query"] || "").trim();
    if (!query || query === "--") continue;

    const volume = parseFloat(row["Search Query Volume"]) || 0;
    if (volume < minSearchVolume) continue;

    const impressionShare = parseShare(row["Impression Share"]);
    const clickShare = parseShare(row["Click Share"]);
    const purchaseShare = parseShare(row["Purchase Share"]);
    const impressions = parseFloat(row["Impressions"]) || 0;
    const clicks = parseFloat(row["Clicks"]) || 0;
    const purchases = parseFloat(row["Purchases"]) || 0;

    // Opportunity: converts well, low market share
    const isOpportunity =
      purchaseShare >= minPurchaseShareOpportunity &&
      clickShare <= maxClickShareOpportunity;

    if (isOpportunity) {
      opportunities.push({
        query, volume, impressionShare: impressionShare.toFixed(1),
        clickShare: clickShare.toFixed(1), purchaseShare: purchaseShare.toFixed(1),
        impressions, clicks, purchases,
        insight: "Good conversion, low traffic share — increase bids or add as Exact match target",
        whyFlag: `Purchase share ${purchaseShare.toFixed(1)}% ≥ ${minPurchaseShareOpportunity}% threshold, click share ${clickShare.toFixed(1)}% ≤ ${maxClickShareOpportunity}% threshold`,
      });
    }

    // Risk: high visibility, poor conversion
    const isRisk =
      impressionShare >= minImpressionShareRisk &&
      purchaseShare <= maxPurchaseShareRisk;

    if (isRisk) {
      risks.push({
        query, volume, impressionShare: impressionShare.toFixed(1),
        clickShare: clickShare.toFixed(1), purchaseShare: purchaseShare.toFixed(1),
        impressions, clicks, purchases,
        insight: "High visibility but low conversion — review listing relevance or consider as negative",
        whyFlag: `Impression share ${impressionShare.toFixed(1)}% ≥ ${minImpressionShareRisk}% threshold, purchase share ${purchaseShare.toFixed(1)}% ≤ ${maxPurchaseShareRisk}% threshold`,
      });
    }

    // Market Leader: you dominate this query — defend budget
    if (purchaseShare >= minPurchaseShareLeader) {
      leaders.push({
        query, volume, impressionShare: impressionShare.toFixed(1),
        clickShare: clickShare.toFixed(1), purchaseShare: purchaseShare.toFixed(1),
        impressions, clicks, purchases,
        insight: "You dominate this query — protect your budget, don't let spend run out",
        whyFlag: `Purchase share ${purchaseShare.toFixed(1)}% ≥ ${minPurchaseShareLeader}% leader threshold`,
      });
    }
  }

  return { opportunities, risks, leaders, totalQueries: rows.length };
}

// Generate CSV export
export function exportSqpCsv(opportunities, risks, leaders = []) {
  const headers = ["Type", "Search Query", "Volume", "Impression Share %", "Click Share %", "Purchase Share %", "Insight", "Recommended Action"];
  const oppRows = opportunities.map(o => ["Opportunity", o.query, o.volume, o.impressionShare, o.clickShare, o.purchaseShare, o.insight, "Increase bids / add Exact target"]);
  const riskRows = risks.map(r => ["Risk", r.query, r.volume, r.impressionShare, r.clickShare, r.purchaseShare, r.insight, "Review relevance / consider negative"]);
  const leaderRows = leaders.map(l => ["Market Leader", l.query, l.volume, l.impressionShare, l.clickShare, l.purchaseShare, l.insight, "Defend budget — ensure spend doesn't cap out"]);
  return [headers, ...oppRows, ...riskRows, ...leaderRows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
}
