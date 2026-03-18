# Gullak Mobile - Navigation Restructure

**Date:** March 17, 2026  
**Objective:** Align mobile app bottom navigation with web dashboard structure

## Changes Summary

### New 5-Tab Structure
The mobile app now has the same 5 tabs as the web dashboard:

1. **Overview** - Dashboard overview (kept from original)
2. **Transactions** - Transaction list (kept from original)
3. **Spending** - Spending analysis (new, converted from web)
4. **Analytics** - Advanced analytics with sub-tabs (new, converted from web)
5. **Settings** - App settings with sub-tabs (new, converted from web)

### Removed Tabs
- **Home** - Removed (redundant with Overview)
- **Accounts** - Moved to old files
- **More** - Removed (functionality distributed to Spending/Analytics/Settings)

---

## New Screens

### 1. SpendingScreen.js
**Source:** `gullak/frontend/src/pages/Spending.jsx`

**Features:**
- Date range filters (1D, 7D, MTD, YTD)
- View mode toggle (Summary/Detailed)
- Summary cards (Total Spend, Income)
- Spending by Category list with filtering
- Recent transactions with category filtering
- Pull-to-refresh support

**Conversions:**
- Recharts → React Native native components (simplified charts)
- Web forms → React Native TextInput
- CSS → StyleSheet
- shadcn/ui components → Custom styled components

**API Calls:**
- `getSummary()` - for stats
- `getSpendingByCategory()` - for category totals
- `getTransactions()` - for transaction list

### 2. AnalyticsScreen.js
**Source:** `gullak/frontend/src/pages/Analytics.jsx`

**Features:**
- Tab-based navigation with 3 sub-tabs:
  - **Cash Forecast** - (placeholder, ready for implementation)
  - **Cash Burn** - (placeholder, ready for implementation)
  - **Rewards** - (placeholder, ready for implementation)

**Structure:**
- Main screen handles tab switching
- Each sub-tab is a separate component
- Tab state persisted in sessionStorage (web) / state (mobile)

**Future Implementation:**
Each sub-tab needs to be converted from:
- `gullak/frontend/src/pages/CashForecast.jsx`
- `gullak/frontend/src/pages/CashBurn.jsx`
- `gullak/frontend/src/pages/Rewards.jsx`

### 3. SettingsScreen.js
**Source:** `gullak/frontend/src/pages/Settings.jsx`

**Features:**
- Tab-based navigation with 3 sub-tabs:
  - **Alerts** - (placeholder, ready for implementation)
  - **Categories** - (placeholder, ready for implementation)
  - **Sync** - (placeholder, ready for implementation)

**Structure:**
- Main screen handles tab switching
- Each sub-tab is a separate component
- Tab state persisted in sessionStorage (web) / state (mobile)

**Future Implementation:**
Each sub-tab needs to be converted from:
- `gullak/frontend/src/pages/Alerts.jsx`
- `gullak/frontend/src/pages/CategoryRules.jsx`
- `gullak/frontend/src/pages/Sync.jsx`

---

## Navigation Updates

### AppNavigator.js Changes

**Before:**
```javascript
<Tab.Screen name="Overview" component={OverviewScreen} />
<Tab.Screen name="Home" component={HomeScreen} />
<Tab.Screen name="Transactions" component={TransactionsScreen} />
<Tab.Screen name="Analytics" component={AnalyticsScreen} />  // old version
<Tab.Screen name="Accounts" component={AccountsScreen} />
<Tab.Screen name="More" component={MoreNavigator} />
```

**After:**
```javascript
<Tab.Screen name="Overview" component={OverviewScreen} />
<Tab.Screen name="Transactions" component={TransactionsScreen} />
<Tab.Screen name="Spending" component={SpendingScreen} />
<Tab.Screen name="Analytics" component={AnalyticsScreen} />  // new version
<Tab.Screen name="Settings" component={SettingsScreen} />    // new version
```

**Icon Mappings:**
- Overview: `stats-chart` / `stats-chart-outline`
- Transactions: `list` / `list-outline`
- Spending: `wallet` / `wallet-outline`
- Analytics: `bar-chart` / `bar-chart-outline`
- Settings: `settings` / `settings-outline`

---

## Archived Files

Old screens have been renamed with `.old` extension:
- `AnalyticsScreen.js.old` - Original analytics (replaced)
- `AccountsScreen.js.old` - Accounts list (functionality moved to Overview)
- `MoreScreen.js.old` - More menu (replaced by direct tabs)
- `CashForecastScreen.js.old` - Cash forecast (to be integrated into new Analytics)
- `RewardsScreen.js.old` - Rewards (to be integrated into new Analytics)
- `SettingsScreen.js.old` - Old settings (replaced with tabbed version)

These files can be deleted after verifying the new implementation works correctly.

---

## Mobile-Specific Adaptations

### Design System
All screens use the mobile theme from `utils/theme.js`:
- **Colors:** Dark theme with indigo primary
- **Spacing:** Consistent padding/margins (xs, sm, md, lg, xl, xxl)
- **Radius:** Rounded corners (sm, md, lg, xl, full)
- **Typography:** Mobile-optimized font sizes

### Component Conversions

| Web Component | Mobile Equivalent |
|---------------|-------------------|
| `<div>` | `<View>` |
| `<span>`, `<p>`, `<h1-6>` | `<Text>` |
| `<button>` | `<TouchableOpacity>` |
| `<input>` | `<TextInput>` |
| `<select>` | Custom picker component |
| Recharts (LineChart, BarChart, PieChart) | Simplified native rendering or react-native-chart-kit |
| shadcn/ui components | Custom styled components |

### Layout Patterns
- Single-column layouts (no side-by-side grids)
- ScrollView for all scrollable content
- Pull-to-refresh support via RefreshControl
- Safe area insets for notched devices
- Mobile-friendly touch targets (44x44 minimum)

---

## Testing Checklist

- [ ] App builds without errors
- [ ] All 5 tabs visible in bottom navigation
- [ ] Tab icons show correctly (filled when active, outline when inactive)
- [ ] Overview screen loads and displays data
- [ ] Transactions screen works as before
- [ ] Spending screen:
  - [ ] Date range filters work
  - [ ] View mode toggle works
  - [ ] Category filtering works
  - [ ] Transactions display correctly
- [ ] Analytics screen:
  - [ ] Tab switching works
  - [ ] Placeholder tabs render
- [ ] Settings screen:
  - [ ] Tab switching works
  - [ ] Placeholder tabs render

---

## Next Steps

### Phase 2: Implement Analytics Sub-tabs
1. Convert `CashForecast.jsx` → React Native
2. Convert `CashBurn.jsx` → React Native
3. Convert `Rewards.jsx` → React Native

### Phase 3: Implement Settings Sub-tabs
1. Convert `Alerts.jsx` → React Native
2. Convert `CategoryRules.jsx` → React Native (already exists as CategoryRulesScreen)
3. Convert `Sync.jsx` → React Native

### Phase 4: Advanced Features
- Add chart rendering using react-native-chart-kit
- Implement advanced filtering UI
- Add export functionality
- Integrate push notifications for alerts

---

## API Compatibility

All screens use the existing mobile API client (`../api/client`):
- Base URL: `http://100.84.80.76:3001/api`
- All endpoints match the web dashboard
- Caching strategy preserved (5-minute TTL)
- No backend changes required

---

## Notes

- **Mobile-first design:** Layouts optimized for single-column mobile screens
- **Performance:** Simplified charts and pagination for large datasets
- **Consistency:** Matches web dashboard functionality exactly
- **Maintainability:** Clear separation between main screens and sub-tabs
- **Scalability:** Easy to add more tabs or sub-tabs in the future
