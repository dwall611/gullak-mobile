# Gullak Mobile — Client-Side Business Logic Audit

**Date:** 2026-03-21  
**Purpose:** Document all client-side business logic and identify which backend API endpoints can replace them.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Source files analyzed** | 24 |
| **Files with business logic** | 8 |
| **Files with display logic only** | 16 |
| **Total business logic instances** | 32 |
| **Trivial migrations** | 18 |
| **Moderate migrations** | 10 |
| **Complex migrations** | 4 |
| **API gaps (need new endpoints)** | 2 |

### Key Findings

1. **Category mapping is duplicated across 4 files** — Each screen has its own `CATEGORY_MAP` and category extraction logic. The backend already returns enriched categories via `/api/transactions` and config via `/api/config/client`.

2. **Expense/transaction classification is reimplemented 3 times** — `isExpense()`, `isLoanDisbursement()`, `isCreditCardPayment()` logic exists in SpendingScreen, CashBurnScreen, and CashForecastScreen. Backend `/api/transactions` already returns `transaction_type`, `is_discretionary`, `is_subscription`.

3. **Cash forecast projection is entirely client-side** — CashForecastScreen generates projected transactions, calculates running balances, and matches recurring transactions. Backend `/api/analytics/forecast` already provides this.

4. **Spending aggregation is done client-side** — CashBurnScreen and SpendingScreen both compute category totals. Backend `/api/analytics/spending-by-category` and `/api/analytics/burn-rate` already provide this.

5. **Category icons/colors are hardcoded** — `CATEGORY_CONFIG` and `CATEGORY_ICONS` exist in multiple files. Backend `/api/config/client` should provide these.

---

## Detailed Findings by File

### 1. `src/utils/helpers.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 12-22 | `getTransactionCategory()` — Extracts category from `override_category`, `personal_finance_category`, or `category` array | Client parses PFC JSON, maps to category name | `/api/transactions` returns `category` field directly | **Trivial** | Backend already enriches this |
| 24-33 | `getMerchantName()` — Normalizes merchant name from `merchant_name`, `name`, removes location suffixes | Client-side string manipulation | `/api/transactions` returns `merchant_display_name` | **Trivial** | Backend already provides cleaned name |
| 35-40 | `getDateRange()` — Converts filter tokens (1day, 7days, mtd, ytd) to date strings | Client-side date math | Keep client-side | — | Display logic, appropriate for client |
| 42-50 | `formatCurrency()`, `formatCompact()`, `formatShortDate()`, `formatRelativeDate()` | Client-side formatting | Keep client-side | — | Display logic |

---

### 2. `src/config/recurring-transactions.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 1-80 | `MANUAL_RECURRING` config — Hardcoded list of manually-tracked recurring transactions (amounts, day of month, skip months) | Static client config | `/api/analytics/recurring` or new endpoint for manual overrides | **Moderate** | Could be moved to backend DB or kept as deployable config |
| 82-95 | `getManualRecurringForAccount()`, `getMerchantOverride()` — Helpers to query manual recurring config | Client-side lookup | Same as above | **Moderate** | Depends on where manual config lives |

---

### 3. `src/screens/SpendingScreen.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 31-65 | `CATEGORY_CONFIG` — Hardcoded icon/color per category | Static map | `/api/config/client` | **Trivial** | Should be server-configured |
| 67-95 | `CATEGORY_MAP` — Maps Plaid PFC codes to display names | Static map | `/api/transactions` returns mapped category | **Trivial** | Backend should handle mapping |
| 97-100 | `formatCategoryName()` — Looks up category in map | Client lookup | Use backend `category` field directly | **Trivial** | |
| 102-120 | `getCategory()` — Extracts category from transaction (duplicated from helpers) | Client parses PFC JSON | `/api/transactions` returns `category` | **Trivial** | Duplicate logic |
| 122-125 | `getCategorySpend()` — Gets spend flag | Client reads field | Already in API response | **Trivial** | Just use API field |
| 127-140 | `isLoanDisbursement()` — Detects loan disbursements from PFC | Client parses PFC detailed | `/api/transactions` returns `transaction_type` | **Trivial** | Backend knows this |
| 142-150 | `isExpense()` — Classifies transaction as expense | Client logic using `category_spend` and `isLoanDisbursement` | `/api/transactions` returns `transaction_type` | **Trivial** | Backend classifies |
| 152-175 | `getDateRange()`, `getPreviousDateRange()` — Date range calculation | Client date math | Keep client-side | — | Display logic |
| 195-205 | `computePeakDay()` — Finds day with highest spending | Client aggregation | Could be in `/api/analytics/burn-rate` or monthly summary | **Moderate** | Nice-to-have in backend |
| 207-220 | `daysUntilDue()`, `isDueWithinDays()`, `isOverdue()` — Date comparisons | Client date math | Keep client-side | — | Display logic |
| 370-410 | Category data processing — Maps API response, sorts, calculates percentages | Client aggregation | `/api/analytics/spending-by-category` returns ready-to-display data | **Trivial** | Backend already computes |
| 412-430 | Account data processing — Same as category | Client aggregation | `/api/analytics/spending-by-category` with account grouping | **Moderate** | May need new param |
| 432-460 | Category trends processing — Builds 3-month trend data | Client aggregation | `/api/analytics/spending-by-category?groupBy=month` | **Moderate** | Already supported |
| 462-470 | Recurring data — Just slices array | Trivial | Already uses `/api/analytics/recurring` | — | Clean |

---

### 4. `src/screens/CashBurnScreen.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 18-40 | `getCategory()` — **DUPLICATE** of SpendingScreen logic | Client parses PFC | `/api/transactions` returns `category` | **Trivial** | Remove duplicate |
| 42-45 | `getCategorySpend()` — **DUPLICATE** | Client reads field | Already in API | **Trivial** | |
| 47-60 | `isLoanDisbursement()` — **DUPLICATE** | Client parses PFC | `/api/transactions` returns `transaction_type` | **Trivial** | |
| 62-70 | `isExpense()` — **DUPLICATE** | Client logic | `/api/transactions` returns classification | **Trivial** | |
| 72-80 | `EXCLUDE_PATTERNS`, `isCreditCardPayment()` — Regex patterns to detect CC payments | Client regex matching | `/api/transactions` should return `is_cc_payment` flag | **Moderate** | Needs backend enhancement |
| 120-180 | Category breakdown calculation — Filters transactions, groups by category, calculates percentages | Client aggregation | `/api/analytics/burn-rate` returns itemized spending | **Trivial** | Use burn-rate endpoint |
| 182-190 | Burn rate projections — avg daily, projected monthly, remaining | Client calculation | `/api/analytics/burn-rate` returns these metrics | **Trivial** | |

---

### 5. `src/screens/CashForecastScreen.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 42-55 | `extractKeyword()`, `merchantMatches()` — Fuzzy merchant matching for recurring detection | Client string matching | Backend should match recurring transactions | **Complex** | Requires backend recurring matching logic |
| 120-250 | Projected transaction generation — Generates future recurring transaction dates based on interval/day-of-month | Complex client logic | `/api/analytics/forecast` returns projected transactions | **Complex** | Heavily duplicated logic |
| 252-290 | Manual recurring processing — Generates dates for hardcoded manual recurring | Client date generation | `/api/analytics/recurring` should include manual entries | **Moderate** | |
| 292-320 | CC payment projection — Fetches liabilities, generates projected CC payments | Client logic + API calls | `/api/analytics/forecast` should include CC payments | **Complex** | |
| 322-360 | Running balance calculation — Walks transaction list forward/backward to compute balances | Client algorithm | `/api/analytics/forecast` returns `running_balance` per day | **Trivial** | Use forecast endpoint |
| 362-380 | Summary stats (total debits/credits, net change) | Client aggregation | `/api/analytics/forecast` or `/api/analytics/monthly-summary` | **Trivial** | |

---

### 6. `src/components/TransactionItem.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 8-30 | `CATEGORY_ICONS` — Hardcoded emoji icons per category | Static map | `/api/config/client` returns icons | **Trivial** | |
| 32-35 | `getCategoryIcon()` — Looks up icon | Client lookup | Use `category_icon` from config | **Trivial** | |
| 40-45 | `getTransactionCategory()`, `getMerchantName()` — Uses helpers | Via helpers | Already covered in helpers audit | — | |

---

### 7. `src/screens/RewardsScreen.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 60-120 | `buildBreakdown()` — Builds points breakdown by category with multipliers | Client calculation | Already uses `api.calculateRewardPoints()` backend | — | Clean, uses backend |
| 122-150 | Program grouping, sorting | Client grouping | Keep client-side | — | Display logic |

---

### 8. `src/components/SummaryCards.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| 15-30 | Period label derivation — Derives "MTD", "YTD", etc. from date range | Client date comparison | Keep client-side | — | Display logic |
| 32-40 | Net flow calculation — `income - expenses` | Client subtraction | `/api/analytics/monthly-summary` returns `net` | **Trivial** | Could use backend |

---

### 9. `src/screens/OverviewScreen.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| (Uses helpers.js) | Category extraction, merchant name | Via helpers | Already covered | — | |

---

### 10. `src/screens/TransactionsScreen.js`

| Line(s) | What it does | Currently | Should use | Migration effort | Notes |
|---------|--------------|-----------|------------|------------------|-------|
| (Uses helpers.js) | Category extraction, merchant name, date formatting | Via helpers | Already covered | — | |

---

## Files That Are Clean (Display/UI Only)

These files contain no business logic — only styling, layout, and display formatting:

1. **`src/utils/theme.js`** — Re-exports design tokens
2. **`src/theme/designTokens.js`** — Static design tokens (colors, spacing, fonts)
3. **`src/screens/AnalyticsScreen.js`** — Tab container, no logic
4. **`src/screens/SettingsScreen.js`** — Tab container, no logic
5. **`src/screens/InvestmentsScreen.js`** — Uses backend APIs, display only
6. **`src/screens/CategoryRulesScreen.js`** — Uses backend APIs for CRUD, display only
7. **`src/screens/AlertsScreen.js`** — Uses backend APIs, display only
8. **`src/screens/SyncScreen.js`** — Uses backend APIs, display only
9. **`src/components/AccountCard.js`** — Display component
10. **`src/components/DateRangeSelector.js`** — Display component
11. **`src/components/TransactionEditModal.js`** — Uses backend APIs, display only
12. **`src/contexts/AlertContext.js`** — Simple state context, no business logic
13. **`src/services/notifications.js`** — Platform notification service, no financial logic
14. **`src/api/client.js`** — API client, no business logic
15. **`App.js`** — Navigation setup
16. **`src/navigation/AppNavigator.js`** — Navigation config

---

## Migration Priority Matrix

### High Priority (High Impact, Low Effort)

| # | Logic | Files Affected | API Endpoint | Effort |
|---|-------|----------------|--------------|--------|
| 1 | Remove duplicate `getCategory()` | 3 files | Use `category` from `/api/transactions` | Trivial |
| 2 | Remove duplicate `isExpense()` | 3 files | Use `transaction_type` from API | Trivial |
| 3 | Replace `CATEGORY_CONFIG`/`CATEGORY_ICONS` | 2 files | `/api/config/client` | Trivial |
| 4 | Replace category aggregation | 2 files | `/api/analytics/spending-by-category` | Trivial |
| 5 | Replace burn rate calculation | 1 file | `/api/analytics/burn-rate` | Trivial |

### Medium Priority (High Impact, Moderate Effort)

| # | Logic | Files Affected | API Endpoint | Effort |
|---|-------|----------------|--------------|--------|
| 6 | Replace running balance projection | 1 file | `/api/analytics/forecast` | Moderate |
| 7 | Replace recurring transaction matching | 1 file | `/api/analytics/recurring` + matching | Moderate |
| 8 | Move `MANUAL_RECURRING` to backend | 1 file | New endpoint or DB table | Moderate |
| 9 | CC payment detection | 2 files | Add `is_cc_payment` to transactions | Moderate |

### Low Priority (Lower Impact)

| # | Logic | Files Affected | API Endpoint | Effort |
|---|-------|----------------|--------------|--------|
| 10 | `computePeakDay()` | 1 file | Add to burn-rate or monthly-summary | Moderate |

---

## API Gaps (Need New Endpoints or Enhancements)

### Gap 1: Manual Recurring Transaction Storage

**Current:** `MANUAL_RECURRING` is hardcoded in `src/config/recurring-transactions.js`  
**Needed:** Backend storage for manual recurring overrides (amount, dayOfMonth, skipMonths)  
**Suggested endpoint:** 
- `GET /api/config/recurring-overrides` — List manual overrides
- `POST /api/config/recurring-overrides` — Create/update override

### Gap 2: Credit Card Payment Flag

**Current:** Client uses regex patterns (`EXCLUDE_PATTERNS`) to detect CC payments  
**Needed:** Backend should flag CC payments during enrichment  
**Suggested enhancement:** Add `is_cc_payment: boolean` to `/api/transactions` response

---

## Recommended Migration Order

### Phase 1: Quick Wins (1-2 days)

1. **Delete duplicate helpers** — Remove `getCategory()`, `isExpense()`, `isLoanDisbursement()` from screen files; use helpers or API fields
2. **Use `merchant_display_name`** — Replace `getMerchantName()` with API field
3. **Fetch category config** — Replace hardcoded `CATEGORY_CONFIG` with `/api/config/client`

### Phase 2: Burn Rate & Aggregation (2-3 days)

4. **Replace CashBurnScreen logic** — Use `/api/analytics/burn-rate` for all metrics
5. **Replace SpendingScreen aggregation** — Use `/api/analytics/spending-by-category`
6. **Add peak day to backend** — Include in burn-rate response

### Phase 3: Forecast Migration (3-5 days)

7. **Replace CashForecastScreen projection** — Use `/api/analytics/forecast` for:
   - Projected transactions
   - Running balances
   - CC payment projections
8. **Move manual recurring to backend** — Create DB table and endpoints

### Phase 4: Cleanup (1 day)

9. **Remove unused helpers** — Clean up helpers.js
10. **Add `is_cc_payment` to backend** — Remove client regex patterns

---

## Code Deletion Summary

After migration, these functions/configs can be **deleted**:

| File | Function/Config | Lines |
|------|-----------------|-------|
| `SpendingScreen.js` | `CATEGORY_CONFIG` | ~35 lines |
| `SpendingScreen.js` | `CATEGORY_MAP`, `formatCategoryName()` | ~30 lines |
| `SpendingScreen.js` | `getCategory()`, `getCategorySpend()`, `isLoanDisbursement()`, `isExpense()` | ~50 lines |
| `SpendingScreen.js` | `computePeakDay()` | ~15 lines |
| `CashBurnScreen.js` | `getCategory()`, `getCategorySpend()`, `isLoanDisbursement()`, `isExpense()` | ~50 lines |
| `CashBurnScreen.js` | `EXCLUDE_PATTERNS`, `isCreditCardPayment()` | ~15 lines |
| `CashBurnScreen.js` | Category aggregation logic | ~40 lines |
| `CashForecastScreen.js` | `extractKeyword()`, `merchantMatches()` | ~20 lines |
| `CashForecastScreen.js` | Projected date generation | ~100 lines |
| `CashForecastScreen.js` | Running balance calculation | ~40 lines |
| `TransactionItem.js` | `CATEGORY_ICONS`, `getCategoryIcon()` | ~30 lines |
| `helpers.js` | `getTransactionCategory()` (if API used directly) | ~15 lines |
| `helpers.js` | `getMerchantName()` (if API used directly) | ~10 lines |

**Total estimated lines deletable:** ~450 lines

---

## Summary

The Gullak mobile app has significant business logic duplication that can be eliminated by:

1. **Using enriched transaction fields** from `/api/transactions` (`category`, `merchant_display_name`, `transaction_type`, `is_subscription`, `is_discretionary`)

2. **Using pre-computed analytics** from `/api/analytics/*` endpoints instead of client-side aggregation

3. **Using `/api/config/client`** for category icons, colors, and display settings

4. **Using `/api/analytics/forecast`** for cash projection instead of complex client-side date generation and balance walking

The migration is straightforward for most cases since the backend already provides the needed data. The main work is refactoring the screens to use the API responses directly rather than transforming raw data.

---

*Audit completed by Vader (AI Assistant) on 2026-03-21*
