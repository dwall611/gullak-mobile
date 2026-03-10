# Gullak Mobile 📱

React Native (Expo) app for the Gullak financial dashboard.

## Version History

**v2.0.0** (2026-03-10)
- Cash Forecast screen — monthly cash flow projections
- Rewards screen — credit card points tracker  
- Settings screen — manual sync, export, cache clear
- More tab (5th tab) for new feature navigation
- API client uses Tailscale IP (fixes analytics on mobile)

**v1.0.0** (2026-03-09)
- Initial release
- Home, Transactions, Analytics, Accounts screens

## Features

- **Home** — Summary cards (income, expenses, net flow, transaction count), daily spending bar chart, account-level spending breakdown
- **Transactions** — Full transaction list with search + filters by account/category, date range selector, paginated infinite scroll
- **Analytics** — Income vs Expenses trends (6 months), spending by category with progress bars, top merchants
- **Accounts** — All connected accounts with balances, credit utilization, net position summary
- **Pull-to-refresh** — Throughout the app
- **Manual sync** — Tap the 🔄 button on Home to trigger a Plaid sync

## Architecture

```
gullak-mobile/
├── App.js                         # Entry point
├── babel.config.js
├── app.json                       # Expo config
├── src/
│   ├── api/client.js              # API client (connects to DeathStar:3001)
│   ├── navigation/AppNavigator.js # Bottom tab navigator
│   ├── screens/
│   │   ├── HomeScreen.js          # Dashboard with charts
│   │   ├── TransactionsScreen.js  # Transaction list + filters
│   │   ├── AnalyticsScreen.js     # Spending analytics
│   │   └── AccountsScreen.js      # Account balances
│   ├── components/
│   │   ├── SummaryCards.js        # 4-card stats row
│   │   ├── SpendingChart.js       # Daily spending bar chart
│   │   ├── AccountCard.js         # Account spending widget
│   │   ├── TransactionItem.js     # Single transaction row
│   │   └── DateRangeSelector.js   # Date filter chips
│   └── utils/
│       ├── helpers.js             # Formatting, date utils, categories
│       └── theme.js               # Design tokens (colors, spacing, etc.)
```

## Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- **Expo Go** app on your Android phone ([Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent))
- Tailscale connected on both your Mac and Android phone

## Setup

```bash
cd /Users/dhawalsinha/.openclaw/workspace/gullak-mobile
npm install
```

## Running on Android (Physical Device)

### Option A: Expo Go (Quickest — recommended for development)

1. Make sure Tailscale is active on your phone and Mac
2. Start the dev server:
   ```bash
   npx expo start
   ```
3. Open **Expo Go** on your Android phone
4. Scan the QR code shown in the terminal
5. The app loads in ~30 seconds

> The app connects to `http://DeathStar:3001/api` — both devices must be on Tailscale.

### Option B: Build a standalone APK (for production/sideloading)

Using EAS Build (cloud):
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```
This produces an APK you can download and install directly.

Using local build (requires Android Studio + SDK):
```bash
npx expo run:android
```

### Option C: Android Emulator

```bash
# Start emulator first via Android Studio (AVD Manager)
npx expo start --android
```

Note: Emulator can't reach `DeathStar` hostname — edit `src/api/client.js` to use the IP:
```js
const API_BASE = 'http://100.84.80.76:3001/api';
```

## API Endpoint

The app connects to: `http://DeathStar:3001/api`

Fallback IP: `http://100.84.80.76:3001/api`

To change, edit `src/api/client.js`:
```js
const API_BASE = 'http://DeathStar:3001/api';
```

## Key API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | All connected accounts with balances |
| GET | `/api/accounts/spending` | Spending by account for date range |
| GET | `/api/transactions` | Transaction list with filters |
| GET | `/api/stats/summary` | Income/expense summary |
| GET | `/api/analytics/spending-by-category` | Category breakdown |
| GET | `/api/analytics/spending-trends` | 6-month trends |
| GET | `/api/analytics/top-merchants` | Top merchants by spend |
| POST | `/api/sync` | Trigger Plaid sync |

## Date Ranges

- **1D** — Today only
- **7D** — Last 7 days
- **MTD** — Month to date
- **YTD** — Year to date
- **Month chips** — Specific calendar months (last 6)

## Troubleshooting

**"Network request failed"**
- Make sure Tailscale is running on both devices
- Verify the backend is up: `curl http://DeathStar:3001/api/health`

**Blank screen / loading forever**
- Check Metro bundler output for errors
- Shake the phone to open dev menu → "Reload"

**QR code not scanning**
- Press `a` in the terminal to open on Android directly
- Or manually enter the `exp://` URL in Expo Go

## Dependencies

- `expo` ~55.0.0
- `react-native` via Expo SDK 55
- `@react-navigation/native` + `@react-navigation/bottom-tabs`
- `react-native-chart-kit` — bar and line charts
- `react-native-svg` — SVG support for charts
- `@expo/vector-icons` — Ionicons
- `react-native-safe-area-context` — safe area handling
- `react-native-gesture-handler` — gesture support
- `react-native-reanimated` — animations
