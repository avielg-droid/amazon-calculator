# Amazon Calculator UX Upgrade — Design Doc

**Date:** 2026-04-29

## Summary

Upgrade the single-file Vite/React Amazon profit calculator with tooltips, a cost-breakdown pie chart, dynamic profit/loss styling, input validation, localStorage persistence, and URL-based share.

## Architecture

Single-file React app (`App.jsx`) stays. Add Recharts for charting. No backend. All state in `localStorage` + URL `?d=` query param.

## Components

### 1. Tooltips
- `ⓘ` icon (lucide `Info` size 12) after every input label
- Hover → small dark absolute popover, ~150px wide, explains the field
- ~15 tooltips total, one per input

### 2. Pie Chart
- Recharts `PieChart` — 3 slices: Product Cost (COGS), Amazon Fees, Net Profit
- Net Profit slice: emerald if positive, rose if negative
- Sits **right of stat cards** in same row; stacks on mobile (<640px)

### 3. Dynamic Styling
- Net Profit stat card: emerald border + glow if positive, rose if negative
- ROI stat card: same conditional color
- Extend existing `StatCard` component with `signed` prop

### 4. Input Validation
- Block negative values on price, COGS, fees, units
- Red border + inline rose 12px error text below field
- Real-time, no submit gate

### 5. localStorage
- `useEffect` saves inputs on every change
- On mount: hydrate from localStorage → fallback to defaults

### 6. Share via URL + Clipboard
- Share2 button in header
- Base64 JSON encodes all inputs into `?d=` param
- On load: decode `?d=` and hydrate (overrides localStorage)
- Copies URL to clipboard → 2s "Link copied!" toast

### 7. Visual Polish
- Card shadows: `0 4px 24px #00000040` on all `CARD`s
- Section header icons (lucide) for input groups
- Consistent 16px gaps
