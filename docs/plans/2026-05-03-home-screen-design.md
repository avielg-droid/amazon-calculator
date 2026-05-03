# Home Screen & Tool Navigation — Design Doc
**Date:** 2026-05-03  
**Status:** Approved

---

## Overview

Add a home screen to Danuly that lets users choose between PPC Lab and the Profit Calculator. PPC Lab becomes a top-level peer tool instead of a tab inside the calculator. A persistent top bar inside each tool lets users switch anytime.

---

## Architecture

- **100% client-side React state** — no router needed
- Root `activeTool` state: `"home" | "calculator" | "ppc"`
- localStorage key `danuly-last-tool` → on load, skip home and go directly to last-used tool
- 150ms opacity fade transition between states
- PPC report data survives tool switches (stays in React state in App.jsx)

---

## Home Screen

**When shown:** First visit (no localStorage key set)  
**When skipped:** Return visit — go directly to last-used tool

**Layout:**
- Dark background (`C.s95`)
- Top: "Danuly" wordmark + subtitle "Amazon seller tools"
- Center: two large cards side by side, flex-wrap for mobile
- Each card: icon, tool name, 2-line description, CTA button

**Card 1 — PPC Lab**
- Accent: violet (`C.violet`)
- Icon: BarChart3 (lucide)
- Description: "Analyze ad reports. Find negative keywords, harvest opportunities, and market insights."
- Button: "Open PPC Lab →"

**Card 2 — Profit Calculator**
- Accent: emerald (`C.emerald`)
- Icon: DollarSign (lucide)
- Description: "Unit economics & margin simulator. Amazon FBA and DTC channels."
- Button: "Open Calculator →"

**Interactions:**
- Card hover: subtle lift (translateY -2px) + colored border glow
- Card click → set `activeTool` + save to localStorage → fade in tool

---

## Persistent Top Bar

Rendered inside both tools (not on home screen).

**Layout:**
```
┌─ Danuly ─────────────────── [PPC Lab]  [Profit Calc] ─┐
```
- Left: "Danuly" wordmark (fontSize 14, fontWeight 700, gradient text same as current h1)
- Right: two pill toggle buttons
  - Active: filled with tool's accent color
  - Inactive: ghost style, hover shows `C.s7`
- Clicking inactive tool → fade to that tool, update localStorage

---

## Structural Changes to App.jsx

1. Add `activeTool` state (default: read from localStorage or `"home"`)
2. Add `HomeScreen` component (inline or separate file)
3. Add `TopBar` component rendered when `activeTool !== "home"`
4. Remove `["ppc", "PPC Lab"]` from calculator tab array
5. Remove `{activeTab === "ppc" && <PPCLab ... />}` from calculator
6. Render `<PPCLab ... />` directly when `activeTool === "ppc"`
7. Wrap tool content in fade container (opacity transition)

---

## Fade Transition

```
activeTool change → set opacity 0 → wait 150ms → swap content → set opacity 1
```

Implemented with `useTransition` state or simple CSS transition on a wrapper div.

---

## Out of Scope

- URL routing / shareable deep links
- Separate pages or deployments per tool
- Onboarding / product tour
- User accounts or auth
