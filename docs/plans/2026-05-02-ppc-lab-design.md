# PPC Lab — Design Doc
**Date:** 2026-05-02  
**Status:** Approved

---

## Overview

New tab "PPC Lab" added to the existing tab bar. Standalone feature — independent of the SKU profit calculator. Lets Amazon sellers upload advertising reports and receive actionable recommendations for negative keyword management and keyword harvesting.

---

## Architecture

- **100% client-side** — CSV parsed in-browser via JavaScript. No backend required.
- **State:** Two independent objects in `App.jsx` — `ppcStr` (Search Term Report) and `ppcSqp` (Search Query Performance). No localStorage persistence (report data is ephemeral).
- **Approach:** Two explicit sub-tabs, each owning its own upload, thresholds, recommendations, and export. Isolated state, clear UX, extensible.

---

## Tab & Navigation Structure

- 7th tab: **PPC Lab**
- Inside: two sub-tabs
  - `Search Terms` — Search Term Report analysis
  - `Search Query Perf` — Search Query Performance analysis

**Layout per sub-tab (top → bottom):**
1. Upload zone (drag-and-drop + click, CSV only)
2. Threshold config panel (collapsed by default, "Thresholds · using defaults")
3. Summary cards row
4. Recommendation lists
5. Full data table (sortable, filterable)
6. Export button (CSV)

---

## Onboarding & Guidance

**First-load state (no file uploaded):**
- Full onboarding panel replaces content area
- Step-by-step: Seller Central → Reports → Advertising Reports → [Report Type] → Download CSV
- "What you'll get" preview listing insights
- Upload zone prominent in center

**After upload — contextual help:**
- Tooltip on every column header
- Tooltip on every threshold field (explains the rule it controls)
- "Why?" inline expander on each recommendation row (shows which rule triggered it and the values)

**Threshold config panel:**
- Collapsed by default, label shows "Thresholds · using defaults"
- Expand reveals editable number inputs with per-field reset-to-default button

**Error states:**
- Wrong file type → "Looks like a [X] file. PPC Lab needs a CSV."
- Unrecognized columns → "Couldn't recognize this report format. Expected columns: [list]. Re-download from Seller Central."
- Empty file → "File has no data rows."

---

## Search Term Report (STR) Logic

**Expected columns:**
`Customer Search Term`, `Match Type`, `Impressions`, `Clicks`, `Spend`, `Orders`, `Sales`, `ACOS`, `Campaign Name`, `Ad Group Name`

**Default thresholds (user-configurable):**

| Threshold | Default | Rule |
|---|---|---|
| Min spend to flag negative | $10.00 | Spend ≥ X AND orders = 0 |
| Min clicks to flag negative | 15 | Clicks ≥ X AND orders = 0 (alternative trigger) |
| Min orders to harvest | 2 | Orders ≥ X AND match type ≠ Exact |
| Max ACoS to harvest | 40% | ACoS ≤ X (profitable enough to scale) |

**Negative candidates** — term flagged if:
- Spend ≥ $10 AND orders = 0, OR
- Clicks ≥ 15 AND orders = 0

Output columns: Term, Match Type, Spend, Clicks, Orders, ACoS, Campaign, Recommended Negative Type (Exact/Phrase)

**Harvest opportunities** — term flagged if:
- Orders ≥ 2 AND ACoS ≤ 40% AND match type is Broad or Phrase (not already Exact)

Output columns: Term, Orders, CVR, ACoS, Current Match Type, Recommended Action ("Add as Exact to [Campaign]")

**Summary cards:**
- Negative candidates count
- Harvest opportunities count
- Total terms analyzed

**Export:**
- `negatives.csv` — Amazon bulk upload compatible format
- `harvest.csv` — keyword list with recommended action

---

## Search Query Performance (SQP) Logic

**Expected columns:**
`Search Query`, `Search Query Volume`, `Impressions`, `Impression Share`, `Clicks`, `Click Share`, `Cart Adds`, `Cart Add Share`, `Purchases`, `Purchase Share`

**Default thresholds (user-configurable):**

| Threshold | Default | Rule |
|---|---|---|
| Min search volume | 100 | Ignore low-volume noise |
| Min purchase share (opportunity) | 5% | You're converting |
| Max click share (opportunity) | 20% | But own little traffic |
| Min impression share (risk) | 30% | Visible but... |
| Max purchase share (risk) | 3% | ...not converting |

**Opportunity keywords** — flagged if:
- Search volume ≥ 100 AND purchase share ≥ 5% AND click share ≤ 20%
- Insight: "You convert well on this query but own little of the traffic — increase bids or add exact match"

**Risk keywords** — flagged if:
- Impression share ≥ 30% AND purchase share ≤ 3%
- Insight: "Showing up a lot but not converting — review listing relevance or consider as negative"

**Summary cards:**
- Opportunity keywords count
- Risk keywords count
- Total queries analyzed

**Export:**
- `sqp-insights.csv` — Opportunity/Risk label column + all metrics + recommended action

---

## Out of Scope (Post-MVP)

- Cross-report correlation (STR + SQP combined view)
- Seller Central API integration (direct pull without CSV)
- Historical report comparison (trend over time)
- Campaign-level aggregation view
- Integration with SKU profit calculator (ACoS vs Break-Even ACoS)
