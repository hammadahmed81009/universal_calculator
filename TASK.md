# Universal Calculator — Task Brief

**Paid task.** Compensation depends on **quality** and **scope**: the better and more complete the work, the higher the pay. Do as much as you can to improve this repo—refactors, tests, docs, backend robustness—and document it; we use the deliverable and report to determine payment.

---

## Summary

Refactor the calculator-only frontend, add a FastAPI backend in `backend/`, and wire the app to the API with Axios + React Query. Make the codebase production-ready, user-friendly, and maintainable. AI and any other tools are allowed; we evaluate the outcome, not how you get there.

**Read the section “Universal Calculator — Map”** so you understand the ~8k-line main file before you start.

---

## Run locally

- **Prerequisites:** Node.js v18+, npm.
- **Setup:** `cd frontend` → `npm install` → `npm run dev`. App runs at http://localhost:5174 (in-memory data; no backend needed for first run).
- **Other:** `npm run build` (output in `frontend/dist`), `npm run preview`.

---

## Universal Calculator — Map

Single-page calculator for **flooring, countertops, and coatings**. User flow: choose manufacturer → system type → area/dimensions → pricing → Calculate → view material/labor/totals → optionally save bid.

| Section | ~Line | Purpose |
|--------|-------|--------|
| Step 1 | 3283 | Select manufacturer (dropdown). |
| Step 2 | 3395 | Select system type; then system-specific product dropdowns + spread-rate adjusters (per system: Flake, Solid, Metallic, Grind & Seal, Countertop, Polish, PGS, PM, PT, PH). |
| Step 3 | 4717 | Area & surface: dimensions, sq ft, or countertop pieces (length, width, edge, backsplash). |
| Step 4 | 5085 | Pricing: margin / cost-plus / target PPSF; profit %, labor rate, hours. |
| Calculate | After Step 4 | Runs calculation; shows results. |
| System Components | 5257 | Accordion with product selection per system. |
| Job Add-Ons | 6643 | Labor add-ons and quantities. |
| Results | Later | Material table, labor, totals, P&L. Catalog modal (search products). |
| Save Bid | End | Bid name, description; stub modals (Select/Add Contact, New Estimate). |

**Code:** Main UI = `frontend/src/pages/UniversalCalculator.tsx` (~8k lines) + `UniversalCalculator.compact.css`. Data: `frontend/src/data/dummyData.ts`, `frontend/src/lib/api.ts` (static, no HTTP). Helpers: `calculatorDraft.ts`, `sessionContext.ts`, `pricing.ts`, `countertopCalculations.ts`, `pnl.ts`, `mapper.ts`, `laborCatalog.ts`, `useManufacturers.ts`, `useQuickPresets.ts`.

**State:** 90+ `useState` in one component (manufacturer, system, dimensions, pricing, modals, bid form, per-system product picks, spread-rate overrides, countertop pieces, labor, tier, etc.). Draft syncs to `calculatorDraft` and localStorage. This sprawl is the main refactor target.

---

## What you must do

### 1. Refactor the calculator UI

The ~8k-line `UniversalCalculator.tsx` is intentionally left as-is for you to clean up. Target: clear structure, maintainable components, good UX. Split the file (components, hooks, optional context/state machine); replace repeated state with dynamic structures where it makes sense; extract reusable patterns (e.g. product select + spread-rate adjuster). No step-by-step recipe—we care about the end result.

### 2. Backend: FastAPI in `backend/`

Implement a **FastAPI** app in a **`backend/`** directory (repo root, sibling to `frontend/`). It must serve:

- **Manufacturers and products** (replace dummy data and current GET `/api/user-products/my-products`-style behavior).
- **Saved bids** (create/read/update; replace stub GET/POST/PUT `/api/saved-bids/...`).

Frontend must use this API only for these domains (no in-app mock data). Backend implementation (DB, ORM, validation, structure) is up to you; going further (e.g. proper DB, migrations, tests) improves how we assess scope and pay.

### 3. Frontend API layer: Axios + React Query

- **Axios:** All HTTP to the backend goes through a single Axios-based client (e.g. one API module).
- **React Query:** All server data and mutations go through React Query (`useQuery` / `useMutation`) that call that client. Axios = transport; React Query = caching, loading/error, and server state.

### 4. Out of scope

Do **not** add back: contact/company selection modals, email sending, or the removed client service. Scope is calculator + products + saved bids only.

---

## Final deliverable: report

This is a **paid task**. Payment is based on **quality and quantity of work**. The more you improve (architecture, tests, docs, backend design, UI polish), the more we can compensate. Your report is how we see what you did.

Deliver a **report** (Markdown or PDF) in the repo root or in `frontend/` that includes:

1. **Summary of work** — What you changed and why. List every improvement beyond the minimum (refactors, new components, state consolidation, tests, backend choices, etc.) so we can assess scope and quality.
2. **Calculator behavior** — Features, user flow, main inputs and outputs.
3. **Industry and users** — Which industry it serves (e.g. flooring, countertops, coatings) and who would use it.
4. **Technical overview** — How data flows end-to-end; how pricing and labor are computed; how bids are built and saved; how the UI talks to the API.

Be specific. Vague summaries make it harder to evaluate quality and set payment. The report is the basis for assessing your work and compensating you accordingly.
