import { parseNum } from "./parseCsv.js";

const FACTOR_LABELS = {
  traffic: "Traffic",
  conversion: "Units per page view",
  price: "Revenue per unit"
};

function normalize(value) {
  return String(value || "").toLowerCase().replace(/[_:()#%]/g, " ").replace(/\s+/g, " ").trim();
}

function findHeader(headers, terms) {
  return (headers || []).find(function (header) {
    const normalized = normalize(header);
    return terms.some(function (term) { return normalized.includes(term); });
  });
}

function salesFields(report, mode) {
  if (!report) return null;
  const revenueTerms = mode === "ordered"
    ? ["ordered revenue", "ordered product sales"]
    : ["dispatched revenue", "shipped revenue"];
  const unitTerms = mode === "ordered"
    ? ["ordered units"]
    : ["dispatched units", "shipped units"];
  const revenue = findHeader(report.headers, revenueTerms);
  const units = findHeader(report.headers, unitTerms);
  return revenue && units ? { revenue: revenue, units: units } : null;
}

export function availableSalesModes(uploaded) {
  return ["ordered", "dispatched"].filter(function (mode) {
    return salesFields(uploaded.sales, mode) && salesFields(uploaded.comparisonSales, mode);
  });
}

function indexRows(report) {
  if (!report) return new Map();
  const asinHeader = findHeader(report.headers, ["asin", "amazon standard identification"]);
  const index = new Map();
  if (!asinHeader) return index;

  report.rows.forEach(function (row) {
    const asin = String(row[asinHeader] || "").trim();
    if (asin) index.set(asin, row);
  });
  return index;
}

function sumRows(report, header) {
  if (!report || !header) return 0;
  return report.rows.reduce(function (total, row) {
    return total + parseNum(row[header]);
  }, 0);
}

function change(current, comparison) {
  if (!comparison) return null;
  return (current - comparison) / Math.abs(comparison);
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function detectCurrency(report, header) {
  if (!report || !header) return "£";
  const value = report.rows.map(function (row) { return String(row[header] || ""); })
    .find(function (cell) { return /[£€$¥]/.test(cell); });
  return value ? value.match(/[£€$¥]/)[0] : "£";
}

function factorValue(values) {
  return values.traffic * values.conversion * values.price;
}

function buildBridge(current, comparison) {
  const base = {
    traffic: comparison.views,
    conversion: ratio(comparison.units, comparison.views),
    price: ratio(comparison.revenue, comparison.units)
  };
  const next = {
    traffic: current.views,
    conversion: ratio(current.units, current.views),
    price: ratio(current.revenue, current.units)
  };
  const permutations = [
    ["traffic", "conversion", "price"],
    ["traffic", "price", "conversion"],
    ["conversion", "traffic", "price"],
    ["conversion", "price", "traffic"],
    ["price", "traffic", "conversion"],
    ["price", "conversion", "traffic"]
  ];
  const contributions = { traffic: 0, conversion: 0, price: 0 };

  permutations.forEach(function (order) {
    const state = Object.assign({}, base);
    order.forEach(function (factor) {
      const before = factorValue(state);
      state[factor] = next[factor];
      contributions[factor] += (factorValue(state) - before) / permutations.length;
    });
  });

  const revenueChange = current.revenue - comparison.revenue;
  const explained = contributions.traffic + contributions.conversion + contributions.price;
  const residual = revenueChange - explained;
  const bridge = Object.keys(contributions).map(function (factor) {
    return { id: factor, label: FACTOR_LABELS[factor], value: contributions[factor] };
  });

  if (Math.abs(residual) > Math.max(1, Math.abs(revenueChange) * 0.001)) {
    bridge.push({ id: "coverage", label: "Data coverage", value: residual });
  }
  return bridge;
}

function inventoryStatus(sellable, openPo, units, periodDays, hasInventory) {
  if (!hasInventory) return { label: "Not available", coverDays: null };
  const dailyUnits = ratio(units, periodDays);
  const coverDays = dailyUnits ? sellable / dailyUnits : null;
  if (sellable <= 0) return { label: "High risk", coverDays: coverDays };
  if (coverDays !== null && coverDays < 14 && openPo <= 0) return { label: "High risk", coverDays: coverDays };
  if (coverDays !== null && coverDays < 30) return { label: "Watch", coverDays: coverDays };
  return { label: "Healthy", coverDays: coverDays };
}

function diagnose(row) {
  if (row.revenueDelta < 0) {
    if (row.inventoryStatus === "High risk") return "Availability risk";
    if (row.trafficChange !== null && row.trafficChange < -0.05
      && (row.conversionChange === null || row.trafficChange <= row.conversionChange)) return "Traffic decline";
    if (row.conversionChange !== null && row.conversionChange < -0.05) return "Conversion decline";
    if (row.priceChange !== null && row.priceChange < -0.05) return "Price/mix pressure";
    return "Mixed decline";
  }
  if (row.revenueDelta > 0) {
    if (row.inventoryStatus === "High risk" || row.inventoryStatus === "Watch") return "Growth at risk";
    if (row.trafficChange !== null && row.trafficChange > 0.05
      && (row.conversionChange === null || row.conversionChange >= 0)) return "Healthy growth";
    if (row.conversionChange !== null && row.conversionChange > 0.05) return "Conversion-led growth";
    return "Sales growth";
  }
  return "Stable";
}

function buildActions(rows) {
  const definitions = [
    {
      diagnoses: ["Availability risk", "Growth at risk"],
      title: "Protect availability",
      action: "Review sellable stock, open POs and replenishment timing for the affected ASINs."
    },
    {
      diagnoses: ["Traffic decline"],
      title: "Recover qualified traffic",
      action: "Check organic visibility, advertising coverage and retail readiness on strong-converting ASINs."
    },
    {
      diagnoses: ["Conversion decline"],
      title: "Improve conversion efficiency",
      action: "Review price, featured offer, PDP content, reviews and promotion changes."
    },
    {
      diagnoses: ["Price/mix pressure", "Mixed decline"],
      title: "Investigate revenue quality",
      action: "Check price, pack mix, returns and the ASIN-level composition of the decline."
    },
    {
      diagnoses: ["Healthy growth", "Conversion-led growth", "Sales growth"],
      title: "Scale proven winners",
      action: "Protect stock and consider increasing visibility where growth is efficient."
    }
  ];

  return definitions.map(function (definition) {
    const affected = rows.filter(function (row) { return definition.diagnoses.includes(row.diagnosis); });
    const impact = affected.reduce(function (total, row) { return total + row.revenueDelta; }, 0);
    return Object.assign({}, definition, { count: affected.length, impact: impact, asins: affected.slice(0, 3) });
  }).filter(function (item) { return item.count > 0; });
}

function periodLength(period) {
  if (!period) return 30;
  return Math.round((period.end.getTime() - period.start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export function buildVendorAnalysis(uploaded, requestedMode) {
  const modes = availableSalesModes(uploaded);
  const mode = modes.includes(requestedMode) ? requestedMode : (modes[0] || "ordered");
  const currentSalesFields = salesFields(uploaded.sales, mode);
  const comparisonSalesFields = salesFields(uploaded.comparisonSales, mode);
  const currentTrafficField = findHeader(uploaded.traffic && uploaded.traffic.headers, [
    "featured offer page view", "glance view", "detail page view"
  ]);
  const comparisonTrafficField = findHeader(uploaded.comparisonTraffic && uploaded.comparisonTraffic.headers, [
    "featured offer page view", "glance view", "detail page view"
  ]);

  if (!currentSalesFields || !comparisonSalesFields || !currentTrafficField || !comparisonTrafficField) {
    return { error: "The uploaded reports do not contain enough matching Sales and Traffic metrics to run the diagnosis." };
  }

  const current = {
    revenue: sumRows(uploaded.sales, currentSalesFields.revenue),
    units: sumRows(uploaded.sales, currentSalesFields.units),
    views: sumRows(uploaded.traffic, currentTrafficField)
  };
  const comparison = {
    revenue: sumRows(uploaded.comparisonSales, comparisonSalesFields.revenue),
    units: sumRows(uploaded.comparisonSales, comparisonSalesFields.units),
    views: sumRows(uploaded.comparisonTraffic, comparisonTrafficField)
  };
  current.conversion = ratio(current.units, current.views);
  comparison.conversion = ratio(comparison.units, comparison.views);
  current.price = ratio(current.revenue, current.units);
  comparison.price = ratio(comparison.revenue, comparison.units);

  const currentSalesIndex = indexRows(uploaded.sales);
  const comparisonSalesIndex = indexRows(uploaded.comparisonSales);
  const currentTrafficIndex = indexRows(uploaded.traffic);
  const comparisonTrafficIndex = indexRows(uploaded.comparisonTraffic);
  const inventoryIndex = indexRows(uploaded.inventory);
  const titleHeader = findHeader(uploaded.sales.headers, ["product title", "product name", "title"]);
  const inventoryHeaders = uploaded.inventory ? uploaded.inventory.headers : [];
  const sellableHeader = findHeader(inventoryHeaders, ["sellable on hand", "sellable inventory", "available inventory"]);
  const openPoHeader = findHeader(inventoryHeaders, ["open purchase order", "open po"]);
  const hasInventoryMetric = Boolean(sellableHeader);
  const asins = new Set([...currentSalesIndex.keys(), ...comparisonSalesIndex.keys()]);
  const days = periodLength(uploaded.sales.period);
  const rows = [];

  asins.forEach(function (asin) {
    const currentSales = currentSalesIndex.get(asin) || {};
    const comparisonSales = comparisonSalesIndex.get(asin) || {};
    const currentTraffic = currentTrafficIndex.get(asin) || {};
    const comparisonTraffic = comparisonTrafficIndex.get(asin) || {};
    const inventory = inventoryIndex.get(asin) || {};
    const currentRevenue = parseNum(currentSales[currentSalesFields.revenue]);
    const comparisonRevenue = parseNum(comparisonSales[comparisonSalesFields.revenue]);
    const currentUnits = parseNum(currentSales[currentSalesFields.units]);
    const comparisonUnits = parseNum(comparisonSales[comparisonSalesFields.units]);
    const currentViews = parseNum(currentTraffic[currentTrafficField]);
    const comparisonViews = parseNum(comparisonTraffic[comparisonTrafficField]);
    const currentConversion = ratio(currentUnits, currentViews);
    const comparisonConversion = ratio(comparisonUnits, comparisonViews);
    const currentPrice = ratio(currentRevenue, currentUnits);
    const comparisonPrice = ratio(comparisonRevenue, comparisonUnits);
    const sellable = sellableHeader ? parseNum(inventory[sellableHeader]) : 0;
    const openPo = openPoHeader ? parseNum(inventory[openPoHeader]) : 0;
    const inventoryResult = inventoryStatus(sellable, openPo, currentUnits, days, hasInventoryMetric && inventoryIndex.has(asin));
    const row = {
      asin: asin,
      title: String(currentSales[titleHeader] || comparisonSales[titleHeader] || asin),
      currentRevenue: currentRevenue,
      comparisonRevenue: comparisonRevenue,
      revenueDelta: currentRevenue - comparisonRevenue,
      revenueChange: change(currentRevenue, comparisonRevenue),
      trafficChange: change(currentViews, comparisonViews),
      conversionChange: change(currentConversion, comparisonConversion),
      priceChange: change(currentPrice, comparisonPrice),
      sellable: sellable,
      openPo: openPo,
      coverDays: inventoryResult.coverDays,
      inventoryStatus: inventoryResult.label
    };
    row.diagnosis = diagnose(row);
    rows.push(row);
  });

  rows.sort(function (a, b) { return a.revenueDelta - b.revenueDelta; });
  const bridge = buildBridge(current, comparison);
  const totalDelta = current.revenue - comparison.revenue;
  const relevantBridge = bridge.filter(function (item) { return item.id !== "coverage"; });
  const dominant = relevantBridge.reduce(function (best, item) {
    if (!best) return item;
    return totalDelta < 0
      ? (item.value < best.value ? item : best)
      : (item.value > best.value ? item : best);
  }, null);
  const declines = rows.filter(function (row) { return row.revenueDelta < 0; });
  const totalDecline = declines.reduce(function (sum, row) { return sum + Math.abs(row.revenueDelta); }, 0);
  const topFiveDecline = declines.slice(0, 5).reduce(function (sum, row) { return sum + Math.abs(row.revenueDelta); }, 0);
  const matchedCore = rows.filter(function (row) {
    return currentTrafficIndex.has(row.asin) && comparisonTrafficIndex.has(row.asin)
      && currentSalesIndex.has(row.asin) && comparisonSalesIndex.has(row.asin);
  }).length;
  const inventoryRisks = rows.filter(function (row) {
    return row.inventoryStatus === "High risk" || row.inventoryStatus === "Watch";
  }).length;

  return {
    mode: mode,
    modes: modes,
    currency: detectCurrency(uploaded.sales, currentSalesFields.revenue),
    current: current,
    comparison: comparison,
    bridge: bridge,
    rows: rows,
    actions: buildActions(rows),
    inventoryRisks: inventoryRisks,
    matchedCore: matchedCore,
    coverage: rows.length ? matchedCore / rows.length : 0,
    topFiveDeclineShare: totalDecline ? topFiveDecline / totalDecline : 0,
    mainDriver: dominant ? dominant.label : "the combined effect",
    revenueDelta: totalDelta,
    revenueChange: change(current.revenue, comparison.revenue),
    currentPeriod: uploaded.sales.period,
    comparisonPeriod: uploaded.comparisonSales.period,
    inventoryAvailable: hasInventoryMetric
  };
}
