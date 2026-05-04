# PPC Lab Expansion Design

**Date:** 2026-05-04  
**Goal:** Expand PPC Lab with a Goal Wizard, Keyword Bid Optimization tab, and Placement Performance tab — serving both beginners and experienced sellers.

---

## Overview

Current PPC Lab has two tabs: Search Term Report (STR) and Search Query Performance (SQP). This expansion adds:

1. **Goal Wizard** — inline guided entry point for new users
2. **Keyword Bids tab** — bid optimization from Targeting report
3. **Placement tab** — placement modifier recommendations from Placement report

Priority order: Keyword Bids → Placement → (Campaign Performance as future phase).

---

## Section 1: Goal Wizard

### Behaviour

- Replaces the upload zone on any tab that has no file loaded yet
- Shows one question: **"What do you want to achieve today?"**
- Experienced sellers skip it by clicking a tab directly — wizard never blocks
- A small **"Help me choose →"** link in the tab bar re-triggers the wizard at any time

### Goal Cards UI

Large clickable cards (2-col desktop, 1-col mobile). No dropdown, no submit button — click = instant navigation.

| Goal Card | Routes to | Report needed |
|-----------|-----------|---------------|
| Cut wasted ad spend | STR → Negatives section | Search Term Report |
| Find new keywords to target | STR → Harvest section | Search Term Report |
| Understand my market share | SQP tab | Search Query Performance |
| Optimize keyword bids | Keyword Bids tab | Targeting Report |
| Analyze placement performance | Placement tab | Placement Report |

### After selection

1. Switches to the correct tab
2. Replaces generic onboarding with goal-specific Seller Central download instructions
3. Shows the upload zone

---

## Section 2: Keyword Bids Tab

### Report source

Amazon Advertising → Reports → Advertising Reports → **Targeting** report (CSV or XLSX)

### Required columns

- Campaign Name
- Ad Group Name
- Targeting (keyword text or ASIN)
- Match Type
- Impressions
- Clicks
- Spend
- 7 Day Total Sales
- 7 Day Total Orders (#)

### Target ACoS input

Single input at top of tab, default 30%. All recommendations recalculate instantly on change. Shared with Placement tab.

### Analysis rules

| Flag | Condition | Minimum data |
|------|-----------|--------------|
| Overbidding | Current ACoS > Target ACoS × 1.2 | ≥ 10 clicks |
| Underbidding | Current ACoS < Target ACoS × 0.5 | ≥ 10 clicks |
| Zero impressions | Impressions = 0 | — |
| Healthy | Within ±20% of target | ≥ 10 clicks |

Rows with < 10 clicks are excluded from bid recommendations (insufficient signal).

### Bid calculation formula

```
Revenue per click  = 7-Day Sales ÷ Clicks
Suggested bid      = Revenue per click × (Target ACoS ÷ 100)
```

Every row in the results table shows the full calculation in the "why?" expand panel:

> "$120 sales ÷ 40 clicks = $3.00/click × 25% target ACoS = suggested bid **$0.75**"

### Output sections

1. **Overbidding** — keywords losing money; lower bid
2. **Underbidding** — keywords with room to grow; raise bid
3. **Zero impressions** — bid may be too low or keyword irrelevant; investigate

### Export

Bulk-upload ready CSV: Keyword, Campaign, Ad Group, Match Type, Current Bid (if available), Suggested Bid. Importable to Amazon Bulk Operations.

### New file

`src/analyzeKeyword.js` — same module pattern as `analyzeStr.js`

---

## Section 3: Placement Tab

### Report source

Amazon Advertising → Reports → Advertising Reports → **Placement** report (CSV or XLSX)

### Required columns

- Campaign Name
- Placement (Top of Search, Rest of Search, Product Detail Pages)
- Impressions
- Clicks
- Spend
- Sales
- Orders

### Target ACoS input

Shared with Keyword Bids tab — set once, applies to both.

### Placements

Amazon tracks three placements:
- **Top of Search (TOS)**
- **Rest of Search (RoS)**
- **Product Detail Pages (PDP)**

### Analysis rules (per campaign × placement)

| Flag | Condition |
|------|-----------|
| Underperforming | Placement ACoS > Target ACoS × 1.3 |
| Opportunity | Placement ACoS < Target ACoS × 0.7 |
| Healthy | Within ±30% of target |

### Modifier formula

```
Suggested modifier % = (Target ACoS ÷ Placement ACoS − 1) × 100
```

Shown inline per row:
> "TOS ACoS 18% vs 30% target → increase modifier by **+67%**"

Cap suggested modifier between −99% and +900% (Amazon limits).

### Output sections

1. **Opportunities** — placements converting well below target; increase modifier
2. **Underperforming** — placements losing money; decrease modifier
3. Per-campaign breakdown table with current vs suggested modifier

### Export

CSV per campaign: Campaign, Placement, Current ACoS, Target ACoS, Suggested Modifier. Ready to paste into Bulk Operations.

### New file

`src/analyzePlacement.js`

---

## Architecture

```
src/
  analyzeStr.js        ✓ existing
  analyzeSqp.js        ✓ existing
  analyzeKeyword.js    NEW — keyword bid analysis
  analyzePlacement.js  NEW — placement analysis
  PPCLab.jsx           MODIFY — add 2 tabs + goal wizard component
```

### Tab order

`Search Terms | Search Query | Keyword Bids | Placement`

### Shared state

- `targetAcos` — single number, shared between Keyword Bids and Placement tabs
- Each tab has its own `{ rows, file }` data state (same as current STR/SQP pattern)

### Goal wizard component

Inline component (`GoalWizard`) rendered when a tab's data is empty. Props: `onSelect(tabId)`. Stateless — parent controls routing.

---

## What's NOT in scope (future)

- Campaign Performance tab (priority after Placement)
- Bid change history / tracking
- Direct API connection to Amazon Advertising API
- Auto-applying recommendations
