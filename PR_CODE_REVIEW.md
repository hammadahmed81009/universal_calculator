### PR Code Review – Universal Calculator Refactor

#### 1. Overview

- **Scope**: Frontend-only changes, focused on extracting shared calculation helpers from `UniversalCalculator.tsx` into `utils/universalCalculator.ts`, and adding unit tests for pricing and calculator utilities. Backend FastAPI services are unchanged in this PR.
- **Intent**: Improve testability and reuse of calculator logic (add‑on materials, labor add‑ons, sundries, and system summary) while keeping existing user‑visible behaviour identical.
- **Risk level**: **Medium** – Refactor touches core pricing/build‑up logic used in primary calculator page, but is well-contained with good unit test coverage for new helpers.

---

#### 2. Summary of Changes

- **Frontend**
  - `frontend/src/utils/universalCalculator.ts`
    - Adds shared pure helpers:
      - `applyManufacturerDiscount`, `getBasePigmentRatio`, `allocateByWeights` (with a small robustness tweak).
      - New shared types: `LineItem`, `PricedProduct`.
      - New shared helpers: `buildMaterialAddOnItems`, `buildLaborAddOnItems`, `buildDisplayLineItems`, `computeSystemComponentsSummary`.
  - `frontend/src/pages/UniversalCalculator.tsx`
    - Replaces inlined logic for:
      - Add‑on materials assembly.
      - Labor add‑ons assembly.
      - Display line‑items (materials + sundries, excluding labor).
      - System components summary (count + subtotal).
    - Imports and uses the shared helpers/types from `utils/universalCalculator.ts`.
  - `frontend/src/utils/pricing.ts`
    - Existing pricing logic (no behavioural change in this PR), but now covered by new tests.
  - New tests:
    - `frontend/src/utils/__tests__/universalCalculator.test.ts`
      - Unit coverage for:
        - `applyManufacturerDiscount`, `getBasePigmentRatio`, `allocateByWeights`.
        - `buildMaterialAddOnItems`, `buildLaborAddOnItems`, `buildDisplayLineItems`, `computeSystemComponentsSummary`.
    - `frontend/src/utils/__tests__/pricing.test.ts`
      - Unit coverage for `calculatePricing`, `formatMoney`, `formatPpsf`.
  - `frontend/src/utils/pnl.ts`
    - Types for `LineItem`, `BidSnapshot`, `PricingSnapshot` (unchanged, but relevant for integration).
  - `frontend/src/components/universal-calculator/SystemComponentsSection.tsx`
    - Pure presentational use of `LineItem` and `SystemComponentsSummary` shapes (unchanged).

- **Backend**
  - `backend/app/main.py`, `backend/README.md` inspected.
  - No code changes in this PR; backend remains the source of:
    - Manufacturers list.
    - Product catalog (`/api/user-products/my-products`).
    - Saved bid CRUD.

---

#### 3. Blocking / Critical Issues

**Status: None identified.**

- The extracted helpers in `utils/universalCalculator.ts` preserve the previous logic from `UniversalCalculator.tsx` almost verbatim:
  - `buildMaterialAddOnItems` mirrors the prior loops over category lists and catalog products.
  - `buildLaborAddOnItems` mirrors the prior construction for labor add‑ons, including the `stem-walls-hours` special case.
  - `buildDisplayLineItems` mirrors the prior composition of system + material add‑ons + optional sundries row.
  - `computeSystemComponentsSummary` replicates the previous inline `useMemo`.
- Type conversions (`String(p.id)`) in `buildMaterialAddOnItems` and `buildLaborAddOnItems` are consistent with how `addOnQuantities` keys were already used for catalog products; this lowers, not increases, type risk.
- No obvious infinite loops, unbounded recursion, or unhandled promise chains were introduced in the touched files.
- New tests pass conceptually (no evident expectation/implementation mismatches from reviewing test/implementation pairs).

**Result**: From static analysis, there is no clear correctness bug that would **block** merging, assuming the existing test suite passes.

---

#### 4. High‑Severity Issues (Non‑blocking but Important)

- **High‑1: Core calculator logic remains highly coupled to `UniversalCalculator.tsx` shape**
  - **Details**:
    - While this PR extracts some shared helpers, there is still tight coupling between the calculator page and the new utilities:
      - `buildMaterialAddOnItems` and `buildLaborAddOnItems` accept broadly typed `any[]` lists and `Record<string, number>` maps without domain‑specific types or validators.
      - The `LineItem` type in `utils/universalCalculator.ts` is duplicated conceptually with `LineItem` in `utils/pnl.ts` and again in `SystemComponentsSection.tsx`.
    - This duplication makes it easy for future changes to diverge (e.g., adding fields like `manufacturer` or `sku` in one place but not another).
  - **Risk / Impact**:
    - High risk of **future** regressions around saved bid exports or report rendering when the line item shape evolves.
    - Does not break current runtime behaviour but increases maintenance cost.
  - **Recommendation**:
    - Introduce a single canonical `LineItem` domain type (e.g., `CalculatorLineItem`) in a shared module (such as `utils/pnl.ts` or a new `types/lineItems.ts`) and have:
      - `utils/universalCalculator.ts`.
      - `SystemComponentsSection.tsx`.
      - Any report/export features.
      all consume this shared type.

- **High‑2: Limited test coverage for cross‑helper integration**
  - **Details**:
    - New tests validate each helper in isolation with focused inputs, but they do not:
      - Assert end‑to‑end behaviour from `UniversalCalculator.tsx` UI interactions down to the helpers.
      - Cover edge cases around mixed manual overrides (`resultQtyOverrides`) plus sundries on large/complex systems.
    - For example, there is no regression test verifying that the **materials table** and **pricing summary** stay numerically consistent when:
      - Changing add‑on quantities.
      - Changing `sundries` percentage.
      - Overriding result quantities for multiple items.
  - **Risk / Impact**:
    - If the composition logic in `UniversalCalculator.tsx` changes again, it can silently drift from helper behaviour without tests catching it.
  - **Recommendation**:
    - Add at least one **end‑to‑end-ish unit test** around a small, synthetic "system":
      - Construct `systemMaterialItems`, `materialAddOnItems`, `laborAddOnItems`, `addOnQuantities`, and `resultQtyOverrides`.
      - Assert both:
        - `buildDisplayLineItems` output.
        - Downstream pricing figures (via `calculatePricing`) or whatever aggregates the page uses.

---

#### 5. Medium‑Severity Issues

- **Medium‑1: `allocateByWeights` silently clamps and redistributes without explicit invariants**
  - **Details**:
    - The function ensures:
      - Each slot receives at least 1 unit.
      - The sum of allocations equals `total` (rounded down via `Math.floor`).
    - The updated implementation:
      - Guards against `weights` being shorter than `count` and against `floors[i]` being `undefined`.
      - Uses `fracs.length` instead of `count` in the leftover distribution loop, which is more robust if the arrays ever diverge.
    - However, the function’s contract is *implicit*; consumers might assume proportional allocations strictly match weights, which they do not when `total < count` or when `weights` contain zeros.
  - **Risk / Impact**:
    - Medium risk of **misinterpretation** but not of runtime failure; subtle differences in rounding may be surprising when used for visible charting or cost allocation.
  - **Recommendation**:
    - Extend unit tests to:
      - Document behaviour for `total < count` (currently returns all ones minus floor adjustments).
      - Document behaviour for `weights` with zeros.
    - Optionally, add JSDoc comments clarifying that:
      - The algorithm uses a largest‑remainder method with a baseline of 1 per slot.

- **Medium‑2: Type scope for `LineItem` across files**
  - **Details**:
    - There are at least three separate `LineItem` type declarations:
      - `utils/universalCalculator.ts` – shared calculator helpers.
      - `utils/pnl.ts` – saved bid / reporting domain.
      - `SystemComponentsSection.tsx` – local UI‑only definition.
    - Shapes are similar but not identical (e.g., optional `manufacturer`, `sku`, `imageUrl`, `tdsUrl` fields exist only in `pnl.ts`).
  - **Risk / Impact**:
    - Medium risk of data loss or confusion when mapping from calculator output to persisted bids or reporting UIs.
  - **Recommendation**:
    - Consolidate to a single shared `LineItem` base type, with:
      - Optional fields for reporting‑only data (`manufacturer`, `sku`, URLs) layered on via extension types when needed.

- **Medium‑3: Lint warnings in new/extracted logic**
  - **Details**:
    - `utils/universalCalculator.ts` new code has minor Sonar lint warnings:
      - Unnecessary type assertions when indexing maps (e.g., `as any` where generics are already loose).
      - `Array#push()` used repeatedly in some helpers.
    - They do not introduce runtime bugs but indicate opportunities to improve clarity and consistency.
  - **Risk / Impact**:
    - Medium from a maintainability standpoint; tolerated in the short term but accumulates technical debt.
  - **Recommendation**:
    - Clean up warnings in the new helpers (even if existing lints in `UniversalCalculator.tsx` remain for now), to keep the utility modules "clean" and easier to evolve.

---

#### 6. Low‑Severity / Style & Maintainability Issues

- **Low‑1: Continued complexity in `UniversalCalculator.tsx`**
  - **Details**:
    - The main page remains very large (~3k lines) with high cognitive complexity and many nested hooks and helpers.
    - This PR improves things slightly by moving some logic out, but the component still triggers numerous Sonar warnings.
  - **Recommendation**:
    - Continue extracting:
      - Hook‑level logic into custom hooks (e.g., `useAddOnLineItems`, `useSundriesLineItems`).
      - Render logic into small presentational components.

- **Low‑2: Stringly‑typed IDs and categories**
  - **Details**:
    - Helpers operate primarily on `id: string` and `Record<string, number>` maps without branded types or enums.
    - Categories and special IDs like `'sundries'`, `'stem-walls-hours'`, `'custom-charge-amount'` are repeated as string literals in multiple files.
  - **Recommendation**:
    - Introduce shared constants/enums for:
      - `ADD_ON_ID_SUNDRIES`, `ADD_ON_ID_STEM_WALLS_HOURS`, `ADD_ON_ID_CUSTOM_CHARGE_AMOUNT`, etc.
    - Use those constants in both the helpers and the calculator page to avoid typos and to ease refactoring.

- **Low‑3: Minor testing gaps**
  - **Details**:
    - `pricing.test.ts` currently focuses on "happy path" behaviour and some basic edge cases (zero area, zero cost, negative margin).
    - There is no coverage for:
      - Extremely large numbers or precision drift (e.g., large `areaSqFt` values).
      - Mixed scenarios where `desiredMarginPct` and `targetPricePerSqFt` are both provided but only one is used.
  - **Recommendation**:
    - Add a couple of additional test cases around:
      - Large inputs and rounding.
      - Clear documentation (via tests) of which inputs are respected per `PricingMethod`.

---

#### 7. Backend Integration Analysis

- **Manufacturers & Products**
  - `UniversalCalculator.tsx` uses `useMyManufacturers` and product catalog queries that depend on backend routes documented in `backend/README.md`.
  - This PR does not alter:
    - The shape of manufacturer or product data (e.g., `id`, `name`, `unit`, `manufacturer_id`).
    - The way API responses are transformed before hitting calculation helpers.
  - **Risk / Impact**:
    - Very low; helpers accept already‑processed in‑memory structures and do not initiate API calls themselves.

- **Saved Bids**
  - Saved bid creation and editing flows use `BidSnapshot` and `LineItem` definitions from `utils/pnl.ts`.
  - This PR does not change:
    - The payload sent to `/api/saved-bids/`.
    - The mapping from calculator state to saved bid line items.
  - **Risk / Impact**:
    - Very low; the new helpers only affect the **calculator view’s** internal line item construction and display, not the persistence layer (based on reviewed files).

- **CORS / Health**
  - Backend startup configuration and CORS settings remain unchanged and compatible with the current frontend dev URL (`http://localhost:5174`).

---

#### 8. Regression Analysis

From comparison of old and new logic, plus test review:

- **Add‑on materials**
  - Logic migrated from:
    - Inlined loops in `UniversalCalculator.tsx` over category lists and `products` array.
  - To:
    - `buildMaterialAddOnItems` with identical ordering and calculations:
      - For each category list:
        - Uses the same `qty` lookup from `addOnQuantities`.
        - Uses the same editable price override rules via `customMaterialPrices`.
        - Uses the same heuristics for `unit` ("sheets", "boards", "boxes", "pieces").
      - For catalog products:
        - Still skips ones already represented in the prior lists (`includedIds`).
        - Still uses `getUnitPrice` for calculated `unitPrice`.
  - **Conclusion**: No functional regression expected; behaviour is tested in `buildMaterialAddOnItems` specs.

- **Labor add‑ons**
  - Logic migrated from:
    - Inlined `useMemo` in `UniversalCalculator.tsx`.
  - To:
    - `buildLaborAddOnItems`, preserving:
      - The skip for `sundries`.
      - `custom-charge` mapping to `'custom-charge-amount'` with a single‑quantity row.
      - Dynamic rate resolution via `laborRates[def.id] ?? def.rate`.
      - The `stem-walls-hours` special case.
  - **Conclusion**: Behaviour parity preserved; validated in `buildLaborAddOnItems` tests.

- **Display line items & sundries**
  - Logic migrated from:
    - Inlined `displayLineItems` `useMemo` in `UniversalCalculator.tsx`.
  - To:
    - `buildDisplayLineItems`, preserving:
      - System items + material add‑ons as the base list.
      - Manual delta via `resultQtyOverrides`.
      - Sundries percentage defaulting to 5% from `addOnQuantities['sundries']` when enabled and base subtotal > 0.
  - **Conclusion**: Behaviour parity preserved; core behaviour is validated via `buildDisplayLineItems` tests, including overrides.

- **System components summary**
  - Logic migrated from:
    - An inline `useMemo` computing count and subtotal.
  - To:
    - `computeSystemComponentsSummary`, directly invoked in a `useMemo`.
  - **Conclusion**: No change in semantics; trivial wrapper with unit test coverage.

- **Pricing core**
  - `calculatePricing` behaviour is:
    - Confirmed consistent across methods for shared cost fields.
    - Validated for edge cases (zero area, zero costs, negative margin).
  - **Conclusion**: No regressions introduced by this PR; only test coverage added.

Overall, based on diff review and unit tests, the refactor **appears behaviour‑preserving** for existing flows. Remaining risks are mainly around future evolvability and type/shape consistency rather than immediate breaking changes.

---

#### 9. Recommendation

- **Merge readiness**: **Yes**, assuming CI (including lint + unit tests) is green.
- **Follow‑up work (suggested)**:
  - Consolidate `LineItem` domain types and shared string constants for special IDs.
  - Continue decomposing `UniversalCalculator.tsx` into testable hooks and components.
  - Add a small number of higher‑level integration tests that span helpers + pricing to guard against future regressions.

