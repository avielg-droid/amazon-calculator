# Amazon Calculator UX Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tooltips, cost-breakdown pie chart, dynamic profit styling, input validation, localStorage persistence, and URL share to the Amazon profit calculator.

**Architecture:** All changes in `App.jsx` (single-file React app). Install Recharts for charting. No backend. State persisted via localStorage and URL `?d=` base64 param.

**Tech Stack:** React 18, Vite, Recharts, Lucide React, localStorage, URLSearchParams

---

### Task 1: Install Recharts

**Files:**
- Modify: `package.json` (via npm install)

**Step 1: Install**

```bash
cd /Users/aviel/amazon-calculator
npm install recharts
```

**Step 2: Verify**

```bash
grep '"recharts"' package.json
```
Expected: `"recharts": "^2.x.x"`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add recharts"
```

---

### Task 2: Add Tooltip System to InputField

**Files:**
- Modify: `App.jsx` — `InputField` component (lines ~24-48)

**Context:** `InputField` renders a label + number input. Add optional `tooltip` prop that shows a `ⓘ` icon after the label. On hover, show a dark popover with the tooltip text.

**Step 1: Add tooltip prop and hover state to InputField**

Replace the `InputField` function with:

```jsx
function InputField({ label, name, value, onChange, prefix, suffix, highlight, disabled, dimNote, tooltip }) {
  const [focused, setFocused] = useState(false);
  const [tipVisible, setTipVisible] = useState(false);
  return (
    <div style={{ marginBottom: 12, opacity: disabled ? 0.45 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
        <label style={{ ...LABEL, marginBottom: 0 }}>{label}</label>
        {tooltip && (
          <span
            style={{ position: "relative", display: "inline-flex", alignItems: "center", cursor: "help" }}
            onMouseEnter={() => setTipVisible(true)}
            onMouseLeave={() => setTipVisible(false)}
          >
            <Info size={11} color={C.s5} />
            {tipVisible && (
              <div style={{
                position: "absolute", left: 16, top: -4, zIndex: 50,
                background: C.s8, border: `1px solid ${C.s7}`, borderRadius: 8,
                padding: "8px 10px", width: 200, fontSize: 11, color: C.s4,
                lineHeight: 1.5, boxShadow: "0 4px 16px #00000060", pointerEvents: "none",
              }}>
                {tooltip}
              </div>
            )}
          </span>
        )}
      </div>
      {dimNote && <p style={{ fontSize: 10, color: C.cyan, margin: "-2px 0 5px", fontStyle: "italic" }}>{dimNote}</p>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 10, fontSize: 12, color: C.s5, pointerEvents: "none" }}>{prefix}</span>}
        <input
          type="number" name={name} value={value} onChange={onChange} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", background: C.s95, border: `1px solid ${focused ? (highlight || C.emerald) : C.s8}`,
            borderRadius: 8, padding: `8px ${suffix ? 28 : 12}px 8px ${prefix ? 24 : 12}px`,
            fontSize: 13, color: "#e2e8f0", outline: "none", boxSizing: "border-box",
            transition: "border-color 0.2s", ...MONO,
            boxShadow: focused ? `0 0 0 1px ${(highlight || C.emerald)}22` : "none",
            cursor: disabled ? "not-allowed" : "auto",
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 10, fontSize: 11, color: C.s5, pointerEvents: "none" }}>{suffix}</span>}
      </div>
    </div>
  );
}
```

**Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```
Expected: `✓ built in`

**Step 3: Commit**

```bash
git add App.jsx
git commit -m "feat: add tooltip system to InputField"
```

---

### Task 3: Add Tooltip Text to All Input Fields

**Files:**
- Modify: `App.jsx` — every `<InputField>` usage in the JSX

**Context:** Each `<InputField>` call needs a `tooltip` prop. Find them all and add appropriate tooltip strings.

**Step 1: Add tooltip props to all InputField usages**

Find each `<InputField` in the JSX and add the matching `tooltip` prop:

| Field name | Tooltip text |
|---|---|
| `sellingPrice` | `"The price customers pay on Amazon. For EU, include VAT."` |
| `productCost` | `"Your manufacturing or wholesale cost per unit (ex-factory)."` |
| `shippingToAmazon` | `"Cost to ship one unit from supplier to Amazon FBA warehouse."` |
| `customsDuty` | `"Import duty as a % of product cost. Varies by HS code and country."` |
| `prepFees` | `"Per-unit prep/labeling cost (bubble wrap, poly bags, FNSKU stickers)."` |
| `bufferPercent` | `"Extra % added to COGS as buffer for damages, shrinkage, or hidden costs."` |
| `referralFee` | `"Amazon's cut of your sale price, typically 8–15% depending on category."` |
| `fbaFee` | `"Amazon's pick, pack, and ship fee. Depends on product size and weight."` |
| `storageFee` | `"Monthly FBA storage cost per unit. Spikes in Q4 (Oct–Dec)."` |
| `paymentProcessing` | `"Payment processor fee (Stripe, PayPal, etc.). Typically 2.9% + $0.30."` |
| `fulfillmentCost` | `"Your own warehouse pick-and-pack cost per unit (non-Amazon channels)."` |
| `shippingToCustomer` | `"Last-mile shipping cost you pay per order on non-Amazon channels."` |
| `adSpendShare` | `"Total ad spend as % of revenue (TACOS). Includes PPC and external ads."` |
| `monthlyUnits` | `"Estimated units sold per month. Used to calculate total monthly profit."` |
| `vatRate` | `"VAT rate for your EU marketplace. DE=19%, UK=20%, FR=20%, IT=22%."` |

**Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add App.jsx
git commit -m "feat: add tooltip text to all input fields"
```

---

### Task 4: Input Validation — Block Negatives

**Files:**
- Modify: `App.jsx` — `handleChange` function + `InputField` component

**Context:** The app has a single `handleChange` that updates `inputs` state. Add validation to block negative values and show inline errors.

**Step 1: Add error state and update handleChange**

Add error state near the top of the `App` component (after existing state declarations):

```jsx
const [inputErrors, setInputErrors] = useState({});
```

Replace or update `handleChange` to:

```jsx
const handleChange = useCallback(e => {
  const { name, value } = e.target;
  const num = parseFloat(value);
  if (value !== "" && num < 0) {
    setInputErrors(prev => ({ ...prev, [name]: "Must be 0 or greater" }));
    return;
  }
  setInputErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  setInputs(prev => ({ ...prev, [name]: value === "" ? "" : parseFloat(value) || 0 }));
}, []);
```

**Step 2: Pass error to InputField and render it**

Add `error` prop to `InputField`:

```jsx
function InputField({ label, name, value, onChange, prefix, suffix, highlight, disabled, dimNote, tooltip, error }) {
```

Add error display inside the component, after the input wrapper div:

```jsx
{error && <p style={{ fontSize: 11, color: C.rose, marginTop: 3, marginBottom: 0 }}>{error}</p>}
```

Pass it at each usage site: `error={inputErrors[name]}` — but since all fields share the same `name` prop that matches the inputs key, add this to each `<InputField>`:

```jsx
error={inputErrors["sellingPrice"]}  // etc, matching each field's name prop
```

Actually simpler — pass `error={inputErrors[name]}` inside `InputField` by reading `name` from props:

In `InputField`, the `name` prop is already available — just pass `inputErrors` down or use a context. The cleanest: pass `error={inputErrors[name]}` at each call site where `name` is the string key.

**Step 3: Update border color to show error state**

Inside `InputField`, update the border color logic:

```jsx
border: `1px solid ${error ? C.rose : focused ? (highlight || C.emerald) : C.s8}`,
boxShadow: error ? `0 0 0 1px ${C.rose}22` : focused ? `0 0 0 1px ${(highlight || C.emerald)}22` : "none",
```

**Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add App.jsx
git commit -m "feat: input validation with inline error messages"
```

---

### Task 5: localStorage Persistence

**Files:**
- Modify: `App.jsx` — App component state initialization + useEffect

**Context:** `inputs` state holds all calculator values. Persist on change, restore on mount.

**Step 1: Load from localStorage on mount**

Find the `inputs` useState initialization. Replace the default object with:

```jsx
const [inputs, setInputs] = useState(() => {
  try {
    const saved = localStorage.getItem("amazon-calc-inputs");
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    sellingPrice: 29.99,
    productCost: 6,
    // ... keep all existing defaults
  };
});
```

Note: keep exactly the same default values that exist in the current code.

**Step 2: Save to localStorage on every inputs change**

Add after the existing useEffects (or create new one):

```jsx
useEffect(() => {
  try {
    localStorage.setItem("amazon-calc-inputs", JSON.stringify(inputs));
  } catch {}
}, [inputs]);
```

**Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add App.jsx
git commit -m "feat: persist inputs to localStorage"
```

---

### Task 6: Share via URL + Clipboard Toast

**Files:**
- Modify: `App.jsx` — imports, App component, header JSX

**Step 1: Add Share2 import from lucide**

Add `Share2` to the existing lucide import line.

**Step 2: Add toast state and share function**

Inside the `App` component, add:

```jsx
const [toast, setToast] = useState(null);

const handleShare = useCallback(() => {
  try {
    const encoded = btoa(JSON.stringify(inputs));
    const url = `${window.location.origin}${window.location.pathname}?d=${encoded}`;
    navigator.clipboard.writeText(url);
    setToast("Link copied!");
    setTimeout(() => setToast(null), 2000);
  } catch {
    setToast("Copy failed");
    setTimeout(() => setToast(null), 2000);
  }
}, [inputs]);
```

**Step 3: Decode URL param on mount**

Add to the `inputs` useState initializer (before the localStorage fallback):

```jsx
const [inputs, setInputs] = useState(() => {
  try {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    if (d) return JSON.parse(atob(d));
  } catch {}
  try {
    const saved = localStorage.getItem("amazon-calc-inputs");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { /* defaults */ };
});
```

**Step 4: Add Share button to header JSX**

Find the header section. Add button next to the Reset button:

```jsx
<button onClick={handleShare} style={{
  display: "flex", alignItems: "center", gap: 6,
  padding: "8px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600,
  background: C.s8, border: `1px solid ${C.s7}`, color: C.s4,
  cursor: "pointer",
}}>
  <Share2 size={13} /> Share
</button>
```

**Step 5: Add toast overlay**

Just before the closing `<Analytics />` and `</>`, add:

```jsx
{toast && (
  <div style={{
    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
    background: C.emerald, color: "#fff", padding: "10px 20px", borderRadius: 10,
    fontSize: 13, fontWeight: 600, zIndex: 100, boxShadow: "0 4px 16px #00000060",
  }}>
    {toast}
  </div>
)}
```

**Step 6: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

**Step 7: Commit**

```bash
git add App.jsx
git commit -m "feat: share via URL + clipboard toast"
```

---

### Task 7: Dynamic Styling on StatCard

**Files:**
- Modify: `App.jsx` — `StatCard` component + usages for Net Profit and ROI

**Context:** `StatCard` currently takes `label`, `value`, `color`, `big`. Add `signed` prop — when true, color is emerald if value is positive, rose if negative.

**Step 1: Update StatCard**

Read the current `StatCard` definition and add `signed` prop:

```jsx
function StatCard({ label, value, color, big, signed }) {
  const resolvedColor = signed
    ? (parseFloat(value) >= 0 ? C.emerald : C.rose)
    : (color || C.s4);
  // use resolvedColor instead of color in the render
}
```

Find where `color` is used inside `StatCard` for the value text and border/glow, replace with `resolvedColor`.

**Step 2: Pass signed prop to Net Profit and ROI cards**

Find the `<StatCard>` for net profit per unit and ROI in the JSX. Add `signed` prop:

```jsx
<StatCard label="Net Profit/Unit" value={`$${fmt(s.netProfitPerUnit)}`} signed big />
<StatCard label="ROI" value={`${fmt(s.roi, 0)}%`} signed />
```

**Step 3: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add App.jsx
git commit -m "feat: dynamic profit/loss coloring on stat cards"
```

---

### Task 8: Cost Breakdown Pie Chart

**Files:**
- Modify: `App.jsx` — imports + new `CostChart` component + layout

**Step 1: Add Recharts import**

At the top of App.jsx, add:

```jsx
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
```

**Step 2: Add CostChart component**

Add this component after `StatCard` and before `App`:

```jsx
function CostChart({ s }) {
  const profit = s.netProfitPerUnit;
  const fees = s.channelFees + s.adSpendPerUnit;
  const cogs = s.totalCOGS;

  const data = [
    { name: "Product Cost", value: Math.max(0, cogs), color: C.cyan },
    { name: "Fees & Ads", value: Math.max(0, fees), color: C.violet },
    { name: profit >= 0 ? "Net Profit" : "Loss", value: Math.abs(profit), color: profit >= 0 ? C.emerald : C.rose },
  ].filter(d => d.value > 0);

  return (
    <div style={{ ...CARD, boxShadow: "0 4px 24px #00000040", flex: 1, minWidth: 220 }}>
      <p style={{ ...LABEL, marginBottom: 12 }}>Cost Breakdown</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <ReTooltip
            formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
            contentStyle={{ background: C.s8, border: `1px solid ${C.s7}`, borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.s4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Add chart to layout**

Find the stat cards row in JSX. Wrap existing stat cards in a flex container and add `<CostChart s={s} />` beside them:

```jsx
<div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
  <div style={{ flex: 2, minWidth: 280 }}>
    {/* existing stat cards */}
  </div>
  <CostChart s={s} />
</div>
```

**Step 4: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

**Step 5: Commit**

```bash
git add App.jsx
git commit -m "feat: cost breakdown pie chart"
```

---

### Task 9: Visual Polish

**Files:**
- Modify: `App.jsx` — CARD constant + all card usages

**Step 1: Add shadow to CARD constant**

Find:
```jsx
const CARD = { background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 16, padding: "20px 24px" };
```

Replace with:
```jsx
const CARD = { background: C.s9, border: `1px solid ${C.s8}`, borderRadius: 16, padding: "20px 24px", boxShadow: "0 4px 24px #00000040" };
```

**Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -5
```

**Step 3: Final build and push**

```bash
npm run build
git add App.jsx
git commit -m "feat: card shadows for visual polish"
git push
```

---

## Summary

| Task | Feature | Est. Complexity |
|---|---|---|
| 1 | Install Recharts | trivial |
| 2 | Tooltip system in InputField | small |
| 3 | Tooltip text for all fields | small |
| 4 | Input validation | small |
| 5 | localStorage persistence | small |
| 6 | Share via URL + toast | medium |
| 7 | Dynamic StatCard coloring | small |
| 8 | Pie chart | medium |
| 9 | Visual polish | trivial |
