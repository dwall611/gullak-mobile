# Gullak Mobile App - forecast-v2 API Migration

## Overview
This migration updates the mobile app to use the new forecast-v2 API endpoint, consolidates business logic server-side, and improves consistency across platforms.

## Changes Made

### 1. API Client (`src/api/client.js`)

#### Added
- **`getForecastV2()`** method
  - Uses `x-api-version: 2.0` header
  - Checks `use_server_forecast_v2` feature flag
  - Falls back to v1 endpoint if flag is disabled
  - Returns new ForecastV2Response structure

- **`isFeatureEnabled()`** export
  - Allows components to check feature flags

- **API Version Header Support**
  - Added `DEFAULT_API_VERSION` and `V2_API_VERSION` constants
  - Updated `fetchAPI()` and `fetchWithParams()` to accept `apiVersion` parameter
  - Requests include `x-api-version` header

- **New Type Definitions**
  - `ForecastV2Cycle` - Cycle metadata from server
  - `ForecastV2Transaction` - Transaction with cycle_key, running_balance, is_projected, is_cc_payment, urgency
  - `ForecastV2Summary` - Summary with starting/ending balances
  - `ForecastV2Response` - Complete response structure

### 2. Cash Forecast Screen (`src/screens/CashForecastScreen.js`)

#### Removed (Server-Side Now)
- `getCycleForDate()` - Local cycle calculation
- `getCycleRange()` - Local cycle range calculation  
- `getCurrentCycle()` - Local current cycle detection
- `groupByCycle()` - Local transaction grouping
- Local running balance calculation logic

#### Updated
- **Data Loading**
  - Uses `api.getForecastV2()` when feature flag is enabled
  - Falls back to `api.getForecast()` for backward compatibility
  
- **Rendering**
  - Uses API's `cycles` array directly (no local grouping)
  - Uses API's `running_balance` field directly (no local calculation)
  - Uses API's `cycle_key`, `is_projected`, `is_cc_payment` fields

### 3. Overview Screen (`src/screens/OverviewScreen.js`)

#### PaymentDueBanner Component
- **Removed**: Local `daysUntilDue` calculation (7-day threshold)
- **Uses**: API's `urgency` field directly ('high', 'medium', 'low')
- **Uses**: API's `is_overdue` and `days_until_due` fields
- **Benefits**: Consistent urgency logic across web and mobile

## API Contract (forecast-v2)

### Request
```
GET /api/analytics/forecast-v2?account_id=xxx&days=60
Headers: x-api-version: 2.0
```

### Response
```json
{
  "summary": {
    "starting_balance": 5000.00,
    "ending_balance": 3200.00,
    "total_income": 8000.00,
    "total_expense": 9800.00,
    "lowest_balance": 1200.00,
    "lowest_date": "2026-04-15"
  },
  "cycles": [
    {
      "cycle_key": "2026-04",
      "label": "Apr 6 – May 5",
      "start_date": "2026-04-06",
      "end_date": "2026-05-05",
      "is_current": true,
      "opening_balance": 5000.00,
      "closing_balance": 3500.00,
      "total_income": 4000.00,
      "total_expense": 5500.00,
      "stats": {
        "transaction_count": 45,
        "recurring_count": 12,
        "cc_payment_count": 2,
        "projected_count": 14
      },
      "transactions": [...]
    }
  ]
}
```

## Feature Flags
- `use_server_forecast_v2` - Controls whether to use forecast-v2 API
  - Default: `true`
  - Can be toggled for gradual rollout/rollback

## Backward Compatibility
- All changes maintain backward compatibility
- V1 API continues to work if feature flag is disabled
- Mobile app gracefully falls back to v1 if v2 unavailable

## Testing
- Golden file tests validate API responses match expected output
- Run: `npm run test:golden` (requires golden files to be generated first)
- Generate golden files: `npm run generate:golden`

## Next Steps
1. Deploy backend forecast-v2 endpoint
2. Generate golden files from production data
3. Run golden tests to validate API responses
4. Build APK: `cd android && JAVA_HOME=/opt/homebrew/opt/openjdk@17 ./gradlew assembleRelease`
5. Test on device
6. Gradual rollout via feature flag

## Benefits
1. **Consistency**: Same business logic for web dashboard and mobile app
2. **Maintainability**: Single source of truth for cycle calculations
3. **Performance**: Server-side calculations reduce client CPU usage
4. **Code Reduction**: ~300 lines of client-side calculation code removed
