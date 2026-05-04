// src/analyzeKeyword.js
// Analyzes Amazon Targeting (Keyword) report and returns bid recommendations

export const KEYWORD_REQUIRED_COLUMNS = [
  "Campaign Name",
  "Targeting",
  "Impressions",
  "Clicks",
  "Spend",
  "Sales",
  "Orders",
];

export const KEYWORD_THRESHOLD_DEFAULTS = {
  minClicks: 10,         // skip rows with fewer clicks — insufficient signal
  overbidBuffer: 1.2,   // flag if ACoS > targetAcos * 1.2
  underbidRatio: 0.5,   // flag if ACoS < targetAcos * 0.5
};

// rows: parsed CSV row objects (column names already normalized by parseCsv.js)
// targetAcos: number (e.g. 30 = 30%)
// thresholds: shape of KEYWORD_THRESHOLD_DEFAULTS
// Returns: { overbid, underbid, zeroImpressions, healthy, totalRows }
export function analyzeKeyword(rows, targetAcos = 30, thresholds = KEYWORD_THRESHOLD_DEFAULTS) {
  const { minClicks, overbidBuffer, underbidRatio } = thresholds;
  const overbid = [], underbid = [], zeroImpressions = [], healthy = [];

  for (const row of rows) {
    const targeting = (row["Targeting"] || "").trim();
    if (!targeting || targeting === "--") continue;

    const campaign = row["Campaign Name"] || "";
    const adGroup = row["Ad Group Name"] || "";
    const matchType = (row["Match Type"] || "").trim();
    const impressions = parseFloat(row["Impressions"]) || 0;
    const clicks = parseFloat(row["Clicks"]) || 0;
    const spend = parseFloat((row["Spend"] || "0").replace(/[$,]/g, "")) || 0;
    const sales = parseFloat((row["Sales"] || "0").replace(/[$,]/g, "")) || 0;
    const orders = parseFloat((row["Orders"] || "0").replace(/[$,]/g, "")) || 0;

    const base = { targeting, campaign, adGroup, matchType, impressions, clicks, spend, sales, orders };

    // Zero impressions — separate bucket, different action
    if (impressions === 0) {
      zeroImpressions.push({
        ...base,
        whyFlag: "0 impressions — bid may be below Amazon's auction floor, or the keyword/ASIN target is not relevant to your listing.",
      });
      continue;
    }

    // Not enough clicks for reliable bid math
    if (clicks < minClicks) continue;

    // No sales → can't calculate revenue per click
    if (sales === 0) continue;

    const currentAcos = (spend / sales) * 100;
    const revenuePerClick = sales / clicks;
    const suggestedBid = revenuePerClick * (targetAcos / 100);
    const currentCpc = spend / clicks;

    const calc = `$${sales.toFixed(2)} sales ÷ ${clicks} clicks = $${revenuePerClick.toFixed(2)}/click × ${targetAcos}% target ACoS = suggested bid $${suggestedBid.toFixed(2)}`;

    const enriched = {
      ...base,
      currentAcos: currentAcos.toFixed(1),
      currentCpc: currentCpc.toFixed(2),
      suggestedBid: suggestedBid.toFixed(2),
      calc,
    };

    if (currentAcos > targetAcos * overbidBuffer) {
      overbid.push({
        ...enriched,
        whyFlag: `ACoS ${currentAcos.toFixed(1)}% exceeds target ${targetAcos}% × ${overbidBuffer} buffer. ${calc}.`,
      });
    } else if (currentAcos < targetAcos * underbidRatio) {
      underbid.push({
        ...enriched,
        whyFlag: `ACoS ${currentAcos.toFixed(1)}% is well below target ${targetAcos}% × ${underbidRatio} — room to raise bids and capture more volume. ${calc}.`,
      });
    } else {
      healthy.push({
        ...enriched,
        whyFlag: `ACoS ${currentAcos.toFixed(1)}% is within ±20% of ${targetAcos}% target. No change needed.`,
      });
    }
  }

  return { overbid, underbid, zeroImpressions, healthy, totalRows: rows.length };
}

// Bulk-upload ready CSV (import to Amazon Bulk Operations)
export function exportKeywordCsv(overbid, underbid) {
  const headers = ["Type", "Targeting", "Campaign", "Ad Group", "Match Type", "Current ACoS %", "Suggested Bid ($)", "Calculation"];
  const rows = [
    ...overbid.map(k => ["Overbidding", k.targeting, k.campaign, k.adGroup, k.matchType, k.currentAcos, k.suggestedBid, k.calc]),
    ...underbid.map(k => ["Underbidding", k.targeting, k.campaign, k.adGroup, k.matchType, k.currentAcos, k.suggestedBid, k.calc]),
  ];
  return [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
}
