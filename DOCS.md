# Gullak Mobile — Comprehensive Documentation

> **Version:** 3.3.0 (package.json) / 2.0.0 (app.json)
> **Last Updated:** 2026-04-08

---

## 1. Overview

Gullak Mobile is a **personal finance dashboard** built with React Native + Expo. It connects to a self-hosted Gullak web API (running on a Tailscale network at `100.84.80.76:3001`) which syncs financial data from **Plaid**. The app provides:

- **Account overview** with net worth, balances, and spending summary
- **Transaction browsing** with search, filtering, bulk categorization, and inline editing
- **Spending analysis** by category, account, and trends over time
- **Analytics**: cash forecast (v1 & v2 with billing cycles), burn rate, investment holdings, and credit card rewards
- **Alerts**: financial alert rules, push notifications, and alert history with acknowledgment
- **Settings**: category rules, recurring transaction management, manual Plaid sync

**Target Platform:** Android (primary), iOS (supported), web (basic). The app uses cleartext HTTP traffic (Tailscale) and requires a physical device for push notifications.

---

## 2. Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55, React Native 0.83.2, React 19.2 |
| Navigation | `@react-navigation/native` 7.x with bottom tabs |
| State | React `useState`/`useEffect`/`useMemo` + React Context (AlertContext) |
| Charts | `react-native-chart-kit`, custom SVG charts (react-native-svg) |
| Styling | `StyleSheet.create()` with centralized design tokens |
| HTTP | Native `fetch` with 15s timeout |
| Notifications | `expo-notifications` with push token registration |
| Storage | `@react-native-async-storage/async-storage` |
| Build | Expo EAS (eas.json), or offline APK via `expo prebuild` + Gradle |

### Folder Structure

```
gullak-mobile/
├── App.js                          # Root component — GestureHandler, SafeArea, push notification init
├── index.js                        # registerRootComponent
├── app.json                        # Expo config (name, icons, plugins, permissions)
├── eas.json                        # EAS build profiles (preview=APK, production=AAB)
├── babel.config.js                 # babel-preset-expo + reanimated plugin
├── package.json                    # Dependencies & scripts
├── plugins/
│   └── withCleartextTraffic.js     # Expo config plugin — enables HTTP cleartext on Android
├── assets/                         # Icons, splash screens, adaptive icons
├── scripts/
│   ├── capture-fixtures.js         # Capture API responses as test fixtures
│   ├── generate-golden.js          # Generate golden test files
│   └── verify-golden-setup.sh      # Verify golden test setup
├── tests/
│   ├── golden.test.js              # Golden file comparison tests
│   └── fixtures/                   # JSON fixtures for testing
├── src/
│   ├── api/
│   │   └── client.js               # API client — all endpoints, caching, feature flags, type defs
│   ├── components/
│   │   ├── AccountCard.js           # Account balance card
│   │   ├── SummaryCards.js          # Summary stat cards
│   │   ├── SpendingChart.js         # Category spending pie/bar chart
│   │   ├── TransactionItem.js       # Single transaction row
│   │   ├── DateRangeSelector.js     # Date range filter (1D, 7D, MTD, YTD, Month, Custom)
│   │   └── TransactionEditModal.js  # Modal for editing transaction category/recurring flag
│   ├── config/
│   │   └── recurring-transactions.js # Stub config for manual recurring overrides
│   ├── contexts/
│   │   └── AlertContext.js          # React Context — unacknowledged alert count for tab badge
│   ├── navigation/
│   │   └── AppNavigator.js         # Bottom tab navigator (5 tabs) wrapped in AlertProvider
│   ├── screens/
│   │   ├── OverviewScreen.js       # Tab 1: Dashboard — stats, alerts, categories, forecast chart, budget
│   │   ├── TransactionsScreen.js   # Tab 2: Transaction table — search, filter, edit, bulk categorize
│   │   ├── SpendingScreen.js       # Tab 3: Spending — summary, detailed breakdown, CC payments, recurring rules
│   │   ├── AnalyticsScreen.js      # Tab 4: Analytics container — Forecast, Burn, Investments, Rewards
│   │   ├── SettingsScreen.js       # Tab 5: Settings container — Alerts, Categories, Recurring, Sync
│   │   ├── CashForecastScreen.js   # Sub: Cash flow forecast with v2 billing cycles
│   │   ├── CashBurnScreen.js       # Sub: Income vs fixed vs discretionary breakdown
│   │   ├── InvestmentsScreen.js    # Sub: Investment holdings and portfolio history
│   │   ├── RewardsScreen.js        # Sub: Credit card rewards and points tracking
│   │   ├── AlertsScreen.js         # Sub: Alert rules management, alert history
│   │   ├── CategoryRulesScreen.js  # Sub: Category auto-categorization rules (CRUD)
│   │   ├── RecurringScreen.js      # Sub: Recurring transaction detection and rules
│   │   ├── SyncScreen.js           # Sub: Manual Plaid sync trigger + sync history
│   │   ├── HomeScreen.js.old       # Old home screen (archived)
│   │   ├── AnalyticsScreen.js.old  # Old analytics (archived)
│   │   ├── SettingsScreen.js.old   # Old settings (archived)
│   │   ├── AccountsScreen.js.old   # Old accounts (archived)
│   │   └── MoreScreen.js.old       # Old more screen (archived)
│   ├── services/
│   │   └── notifications.js        # Push notification lifecycle — register, schedule, lazy-load native modules
│   ├── theme/
│   │   ├── designTokens.js         # Canonical design tokens — colors, spacing, typography, semantic tokens
│   │   └── colors.js               # Re-export from designTokens
│   └── utils/
│       ├── helpers.js              # Currency/date formatting, date range logic, category colors
│       └── theme.js                # Re-export from designTokens (backward compat import path)
```

### Navigation Structure

```
App
└── AlertProvider
    └── NavigationContainer
        └── BottomTabNavigator
            ├── Overview        → OverviewScreen
            ├── Transactions    → TransactionsScreen
            ├── Spending        → SpendingScreen
            ├── Analytics       → AnalyticsScreen (tab container)
            │   ├── Cash Forecast → CashForecastScreen (embedded)
            │   ├── Cash Burn     → CashBurnScreen (embedded)
            │   ├── Investments   → InvestmentsScreen (embedded)
            │   └── Rewards       → RewardsScreen (embedded)
            └── Settings        → SettingsScreen (tab container)
                ├── Alerts       → AlertsScreen (embedded)
                ├── Categories   → CategoryRulesScreen (embedded)
                ├── Recurring    → RecurringScreen (embedded)
                └── Sync         → SyncScreen (embedded)
```

**Navigation pattern:** Analytics and Settings are **container screens** that render sub-screens via an internal tab bar (not React Navigation stack). Sub-screens receive an `embedded` prop to toggle header display.

**Deep linking:** Settings screen supports `route.params.initialTab` to navigate directly to a sub-tab (e.g., from alert notification tap → `navigation.navigate('Settings', { initialTab: 'alerts' })`).

---

## 3. Screens

### 3.1 OverviewScreen (924 lines)

**The main dashboard.** Loads on app launch.

**Data fetched on mount:**
- `api.getSummary()` — income, spending, net for date range
- `api.getAlertHistory(10)` — recent alerts
- `api.getSpendingByCategory()` — category breakdown
- `api.getAccounts()` — all accounts + balances
- `api.getBurnRate()` — current month burn rate
- `api.getLiabilities()` — credit card liabilities
- `api.getForecast()` — 60-day cash forecast (for checking account)

**UI Sections:**
1. **Alert Banner** — Shows unacknowledged alerts with severity (critical/warning/info). Tappable → navigates to Settings/Alerts. Badge count on Overview tab.
2. **Overview Summary Cards** — Income, spending, net flow, transaction count. Colored stat card backgrounds (green/red/blue/purple tinted).
3. **Spending by Category** — Horizontal list of category cards with amounts.
4. **Forecast Chart** — Custom SVG area chart showing projected balance over 60 days. Uses `buildSmoothPath()` and `buildAreaPath()` for bezier curves.
5. **Budget Consumption** — Budget vs actual with progress bar.

**Push notification setup:** On mount, requests notification permissions and sets up `addNotificationResponseListener` for alert tap handling.

### 3.2 TransactionsScreen (1265 lines)

**Full transaction browser with table-style layout.**

**Features:**
- Paginated loading (PAGE_SIZE batches, "Load More" button)
- Date range filter: 1D, 7D, MTD, YTD, specific month, custom range
- Search by transaction name
- Account and category filters
- **Row selection** with multi-select mode for bulk category updates
- **Transaction edit modal** — change category, toggle recurring flag
- **Bulk categorization** — select multiple transactions → pick category → `api.bulkUpdateTransactionCategory()`
- Date-grouped display with group headers

**State:** 15+ useState hooks for filters, pagination, selection, modals, and categories.

### 3.3 SpendingScreen (2819 lines)

**The largest screen.** Three internal tabs: Summary, Detailed, CC Payments.

**Summary tab:**
- Hero outflow card (total spending)
- Previous period comparison
- Category spending list with colored indicators
- Account spending breakdown
- Category trends (3-month comparison via `react-native-chart-kit`)
- Recurring transactions list

**Detailed tab:**
- Stitch design system card-based layout (`#212121` background)
- Monthly spending comparison bars (3 months: oldest=blue, middle=green, current=orange)
- Full transaction list filtered to the selected date range

**CC Payments tab:**
- Credit card liability breakdown from `api.getLiabilities()`
- Per-card balances, limits, utilization
- Payment tracking

**Recurring Rules (within Spending):**
- Full CRUD for recurring transaction rules
- Create/edit form with rule name, amount, frequency, category, account
- Toggle active/inactive via `api.updateRecurringRule()`
- Delete with confirmation via `api.deleteRecurringRule()`
- Auto-detection trigger via `api.triggerRecurringDetection()`
- Filter: all, active, paused, auto-detected
- Search by rule name

### 3.4 AnalyticsScreen (134 lines)

**Tab container** with 4 sub-screens:
- **Cash Forecast** (CashForecastScreen) — Cash flow projection with v2 billing cycle grouping. Uses `api.getForecastV2()` when feature flag enabled. Shows transactions grouped by billing cycle with running balance, projected vs actual, CC payment urgency.
- **Cash Burn** (CashBurnScreen) — Income vs fixed vs discretionary spending breakdown with bar chart. Uses `api.getBurnRate()`.
- **Investments** (InvestmentsScreen) — Portfolio holdings and value history from `api.getInvestmentHoldings()` and `api.getPortfolioHistory()`.
- **Rewards** (RewardsScreen) — Credit card reward points tracking from `api.getRewards()` and `api.calculateRewardPoints()`.

### 3.5 SettingsScreen (130 lines)

**Tab container** with 4 sub-screens:
- **Alerts** (AlertsScreen) — Alert rules CRUD, alert history with ack/dismiss. Uses `api.getAlertRules()`, `api.createAlertRule()`, `api.getAlertHistory()`, `api.acknowledgeAlert()`.
- **Categories** (CategoryRulesScreen) — Auto-categorization rules. Create/update/delete/toggle rules, apply rules to transactions. Uses `api.getCategoryRules()`, `api.createCategoryRule()`, `api.applyCategoryRules()`.
- **Recurring** (RecurringScreen) — Dedicated recurring transaction management. Separate from SpendingScreen's embedded recurring management.
- **Sync** (SyncScreen) — Manual Plaid data sync trigger, sync status display, sync history. Uses `api.triggerSync()`, `api.getSyncStatus()`.

---

## 4. API Integration

### Base URL
```
http://100.84.80.76:3001/api
```
Connects via **Tailscale** (private network). Fallback hostname: `DeathStar:3001`. Android uses cleartext HTTP (enabled via `withCleartextTraffic` plugin).

### Caching
- In-memory `Map` cache with **30-second TTL**
- Cache key = endpoint + query params + API version
- Cached endpoints: accounts, spending-by-category, trends, burn-rate, forecast, recurring, net-worth, categories, liabilities, rewards, investments
- Non-cached: transactions (always fresh), sync, health

### Timeout
All requests have a **15-second** timeout via `AbortController`.

### API Versioning
- Default: `x-api-version: 1.0` header
- V2 endpoints: `x-api-version: 2.0` (used by forecast-v2)
- Feature flag `use_server_forecast_v2` controls v1/v2 forecast usage

### Endpoint Reference

| Method | Endpoint | Cache | Description |
|--------|----------|-------|-------------|
| GET | `/health` | No | Health check |
| GET | `/accounts` | Yes | All accounts with balances |
| GET | `/accounts/spending` | Yes | Account spending by date range |
| GET | `/transactions` | No | Transactions with filters (pagination, search, category, account) |
| PATCH | `/transactions/:id/category` | No | Update transaction category |
| PATCH | `/transactions/:id/recurring` | No | Toggle recurring flag |
| PUT | `/transactions/bulk-category` | No | Bulk category update |
| GET | `/stats/summary` | No | Income/spending/net summary |
| GET | `/analytics/spending-by-category` | Yes | Category spending breakdown |
| GET | `/analytics/spending-trends` | Yes | Monthly spending trends |
| GET | `/analytics/top-merchants` | Yes | Top merchants by spending |
| GET | `/analytics/income-vs-expenses` | Yes | Income vs expense comparison |
| GET | `/analytics/burn-rate` | Yes | Fixed vs discretionary breakdown |
| GET | `/analytics/forecast` | Yes | Cash forecast v1 |
| GET | `/analytics/forecast-v2` | Yes | Cash forecast v2 (billing cycles) |
| GET | `/analytics/monthly-summary` | Yes | Monthly financial summary |
| GET | `/analytics/recurring` | Yes | Detected recurring transactions |
| GET | `/analytics/net-worth` | Yes | Net worth (assets - liabilities) |
| GET | `/analytics/income` | Yes | Income breakdown for month |
| GET | `/budgets` | Yes | Budget for month |
| GET | `/config/recurring` | Yes | Recurring config for account |
| GET | `/config/client` | Yes | Client config (categories, budget groups) |
| POST | `/sync` | No | Trigger Plaid sync |
| GET | `/sync/status` | No | Current sync status |
| GET | `/liabilities` | Yes | All liabilities (CC, loans) |
| GET | `/rewards` | Yes | All reward accounts |
| GET | `/rewards/:id/calculate-points` | No | Calculate points for period |
| GET | `/recurring-transactions` | No | Managed recurring rules |
| GET | `/recurring-transactions/stats` | No | Recurring rule statistics |
| POST | `/recurring-transactions` | No | Create recurring rule |
| PATCH | `/recurring-transactions/:id` | No | Update recurring rule |
| DELETE | `/recurring-transactions/:id` | No | Delete recurring rule |
| POST | `/recurring-transactions/:id/dismiss` | No | Dismiss auto-detected rule |
| POST | `/recurring-transactions/detect` | No | Trigger auto-detection |
| GET | `/categories` | Yes | All categories |
| POST | `/categories` | No | Create category |
| PUT | `/categories/:id` | No | Update category |
| DELETE | `/categories/:id` | No | Delete category |
| GET | `/category-rules/rules` | No | All category rules |
| POST | `/category-rules/rules` | No | Create category rule |
| PUT | `/category-rules/:id` | No | Update category rule |
| DELETE | `/category-rules/:id` | No | Delete category rule |
| POST | `/category-rules/:id/toggle` | No | Toggle rule active state |
| POST | `/category-rules/apply` | No | Apply rules to transactions |
| GET | `/alerts/history` | No | Alert history |
| GET | `/alerts/rules` | No | Alert rules |
| POST | `/alerts/rules` | No | Create alert rule |
| PATCH | `/alerts/rules/:id` | No | Update alert rule |
| DELETE | `/alerts/rules/:id` | No | Delete alert rule |
| PATCH | `/alerts/:id/acknowledge` | No | Acknowledge alert |
| POST | `/push-tokens` | No | Register push notification token |
| DELETE | `/push-tokens/:token` | No | Unregister push token |
| GET | `/push-tokens` | No | List registered push tokens |
| GET | `/investments/holdings` | Yes | Investment holdings |
| GET | `/investments/portfolio-history` | Yes | Portfolio value history |
| GET | `/export/transactions` | No | Export URL (CSV) |

---

## 5. State Management

**No external state library** (no Redux, Zustand, MobX, etc.). All state is local to screens via React hooks.

### Pattern
Each screen follows the same pattern:
1. `useState` for loading, refreshing, error, and data
2. `useEffect` to fetch data on mount / when date range changes
3. `useMemo` for derived computations (filtered/sorted data)
4. `useCallback` for memoized handlers

### AlertContext
The only **global state** via React Context:
- `unacknowledgedCount` — number of unacknowledged alerts
- Used by `AppNavigator` to show badge on Overview tab
- Updated by `OverviewScreen` when alerts are fetched/acknowledged

### Data Flow
```
App (push notification init)
└── AlertProvider (global alert count)
    └── TabNavigator (reads unacknowledgedCount for badge)
        ├── OverviewScreen → api.* → local state → render
        ├── TransactionsScreen → api.* → local state → render
        ├── SpendingScreen → api.* → local state → render
        ├── AnalyticsScreen → renders sub-screens (each has own state)
        └── SettingsScreen → renders sub-screens (each has own state)
```

### Persistence
- **AsyncStorage** stores: push notification token (`@gullak_push_token`), notified alert IDs (`@gullak_notified_alerts`)
- No offline data persistence — all financial data is fetched fresh from API on each screen load
- API client has 30s in-memory cache to avoid redundant requests within a session

---

## 6. Components

### AccountCard
Displays account name, type, and balance in a card format.

### SummaryCards
Renders stat cards (income, spending, net, transaction count) with colored backgrounds.

### SpendingChart
Pie/bar chart for category spending using `react-native-chart-kit`.

### TransactionItem
Single transaction row showing date, name, category, amount. Supports selection state.

### DateRangeSelector
Horizontal scrollable filter with preset ranges (1D, 7D, MTD, YTD) + month picker modal + custom date range.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `selected` | string | Current date range value |
| `onSelect` | function | Callback when range changes |
| `months` | array | Available months for picker |
| `selectedMonth` | string | Currently selected month (YYYY-MM) |
| `onSelectMonth` | function | Callback when month changes |

### TransactionEditModal
Modal for editing a transaction's category and recurring flag.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `visible` | boolean | Modal visibility |
| `transaction` | object | Transaction to edit |
| `onClose` | function | Close callback |
| `onSave` | function | Save callback with updated fields |
| `categories` | array | Available categories |

---

## 7. Build & Deploy

### Development (Expo Go)
```bash
npx expo start
# Scan QR code with Expo Go app
```

### Offline APK Build (No Expo Account Required)
```bash
# 1. Generate native Android project
npx expo prebuild --platform android --clean

# 2. Create local.properties
echo "sdk.dir=/opt/homebrew/Caskroom/android-commandlinetools/14742923" > android/local.properties

# 3. Build release APK
cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew assembleRelease

# 4. APK output
# android/app/build/outputs/apk/release/app-release.apk
```

### EAS Build (Cloud)
```bash
# Preview build (APK)
eas build --profile preview --platform android

# Production build (AAB for Play Store)
eas build --profile production --platform android
```

### Key Build Config
- **Android package:** `com.gullak.mobile`
- **iOS bundle:** `com.gullak.mobile`
- **Cleartext traffic:** Enabled (required for Tailscale HTTP)
- **Reanimated plugin:** Must be last in babel plugins list
- **Android permissions:** BOOT_COMPLETED, VIBRATE, SCHEDULE_EXACT_ALARM

---

## 8. Configuration

### Environment
The app has **no `.env` file or environment variable system**. Configuration is hardcoded:

| Setting | Value | Location |
|---------|-------|----------|
| API Base URL | `http://100.84.80.76:3001/api` | `src/api/client.js` |
| API Timeout | 15 seconds | `src/api/client.js` |
| Cache TTL | 30 seconds | `src/api/client.js` |
| Forecast V2 Feature Flag | `true` | `src/api/client.js` |
| Notification Project ID | `gullak-mobile` | `src/services/notifications.js` |
| Tailscale Host Fallback | `DeathStar:3001` | `src/api/client.js` |

### Design System
Centralized in `src/theme/designTokens.js`:
- **Two background systems:** Spending (charcoal `#0c0e10`) and Slate (`#0f172a`) — being unified to Spending
- **Font families:** Manrope (headings), Inter (body)
- **Semantic colors:** income (green), expense (red), warning (amber), info (cyan)
- **Category colors:** Per-category color map + fallback palette

### Push Notifications
- Requires physical device (no emulator support)
- Expo push tokens registered with Gullak server
- Android notification channel: "Financial Alerts" (HIGH importance)
- Haptic feedback on alert severity
- Alert dedup via AsyncStorage tracked set

---

## 9. Known Issues & TODOs

### Archived Screens
Several `.old` files exist (`HomeScreen.js.old`, `AnalyticsScreen.js.old`, `SettingsScreen.js.old`, `AccountsScreen.js.old`, `MoreScreen.js.old`) — these are dead code from a navigation restructure and can be removed.

### Stub Modules
- `src/config/recurring-transactions.js` — `getManualRecurringForAccount()` and `getMerchantOverride()` return empty/null. These were intended for manual recurring overrides but are unimplemented.

### Two Background Systems
The codebase has two competing dark theme systems (charcoal vs slate). `designTokens.js` documents this as "DEPRECATED" for the slate system but several screens still use it. Migration is in progress.

### No Offline Support
All data is fetched from the API on each screen load. No local database or offline mode. If the Tailscale connection is down, the app shows error states.

### No Authentication
The API has no auth layer. Access is controlled via Tailscale network membership. The mobile app connects directly with no tokens or credentials.

### Hardcoded URLs
API base URL and export URL are hardcoded in `src/api/client.js`. No environment-based configuration.

### Export URL Inconsistency
`getExportUrl()` uses `http://DeathStar:3001/api/export/transactions` (hostname) while all other endpoints use `http://100.84.80.76:3001/api` (IP). This may fail if DNS doesn't resolve `DeathStar`.

### Feature Flags
`FEATURE_FLAGS` in `client.js` is a static object. The comment says "can be fetched from server later" but this hasn't been implemented.

### Version Mismatch
`package.json` says `3.3.0` but `app.json` says `2.0.0`. These should be kept in sync.

### Testing
Golden file tests exist in `tests/` but are based on captured fixtures. No unit tests for components or integration tests.

### Large Screen Files
- `SpendingScreen.js` at 2819 lines is the largest file — contains 3 tabs plus recurring rules CRUD. This should ideally be split into separate components.
- `TransactionsScreen.js` at 1265 lines with 15+ useState hooks could benefit from `useReducer`.

### No Deep Linking
Push notification taps navigate to Settings/Alerts, but there's no URL-based deep linking scheme.

### Recurring Management Duplication
Recurring rules are managed both in `SpendingScreen` (detailed tab) and `RecurringScreen` (settings tab). This creates two separate code paths for the same functionality.
