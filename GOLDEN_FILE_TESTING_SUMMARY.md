# Golden File Testing Infrastructure - Setup Complete

## Summary

Successfully created a complete golden file testing infrastructure for Phase 1 forecast testing in the Gullak mobile app. This enables validation of backend API responses against client-side business logic before migration.

## Files Created

### 1. Scripts

#### `scripts/capture-fixtures.js`
- Queries production DB via API for:
  - 1 month of transaction history
  - 60 days of forecast/projected transactions
  - All recurring transaction rules
  - CC liabilities with balances
  - Account data and burn rate info
- Exports to `tests/fixtures/` as JSON files
- Does NOT sanitize data (keeps real amounts, dates, merchant names)
- **Run with:** `npm run capture:fixtures`

#### `scripts/generate-golden.js`
- Loads raw fixtures from `tests/fixtures/`
- Runs current client-side logic on them:
  - CashForecastScreen.js cycle calculations
  - OverviewScreen.js CC urgency logic
  - Running balance calculations
- Generates expected outputs in `tests/fixtures/.golden/`:
  - `forecast.golden.json` - Expected forecast output with cycles
  - `burn-rate.golden.json` - Expected burn rate calculations
  - `cc-liabilities.golden.json` - Expected CC urgency flags
- Signs files with timestamp + source client version
- **Run with:** `npm run generate:golden`

### 2. Tests

#### `tests/golden.test.js`
- Loads golden files from `.golden/`
- Calls backend API endpoints with fixture data
- Compares output against golden files:
  - Amounts: tolerance of 0.01 (floating point)
  - Dates: exact match
  - Reports any mismatches with detailed error messages
- Tests:
  - `/api/analytics/forecast` (will be forecast-v2)
  - `/api/analytics/burn-rate` (will be burn-rate-v2)
  - `/api/liabilities` (CC urgency flags)
- **Run with:** `npm run test:golden`

### 3. Configuration

#### `tests/fixtures/.gitignore`
- Ignores raw fixture data (`*.json`)
- Keeps golden files (`!.golden/*.golden.json`)
- Ensures real production data never gets committed

#### `package.json` (updated)
Added new scripts:
```json
{
  "capture:fixtures": "node scripts/capture-fixtures.js",
  "generate:golden": "node scripts/generate-golden.js",
  "test:golden": "node tests/golden.test.js"
}
```

#### `tests/fixtures/README.md`
- Complete documentation on how to use golden file testing
- Explains what golden files are and why they're used
- Step-by-step workflow
- Troubleshooting guide

## Workflow

### Initial Setup (One-time)

```bash
# 1. Capture production data
npm run capture:fixtures

# 2. Generate golden files from client logic
npm run generate:golden

# 3. Run tests to verify
npm run test:golden
```

### CI/CD Integration

```bash
# Run golden tests as part of CI pipeline
npm run test:golden
```

All tests must pass before backend changes are deployed.

### When Client Logic Changes

If you intentionally change client-side logic (e.g., urgency threshold 7→5 days):

```bash
# 1. Update client code
# 2. Regenerate golden files
npm run generate:golden

# 3. Review diff carefully
git diff tests/fixtures/.golden/

# 4. Commit with message explaining the change
git add tests/fixtures/.golden/
git commit -m "Update golden files: change CC urgency threshold from 7 to 5 days"
```

## Key Features

### 1. No Manual Comparison
Tests automatically compare backend output to golden files. No spreadsheet comparisons or manual validation needed.

### 2. Catch Regressions
Any change to backend logic that produces different output will be caught immediately by tests.

### 3. Safe Migrations
Backend changes can be deployed confidently knowing the output matches what clients expect.

### 4. Audit Trail
Golden files are signed with timestamp and source client version, providing a clear history of expected behavior.

### 5. Real Data Testing
Uses actual production data (not synthetic test data) for more realistic testing.

## Validation Checks

### Forecast Golden File
- ✅ Balance continuity across cycles
- ✅ Sum of all transactions matches net change
- ✅ Urgent CC payments detected correctly
- ✅ Running balance calculations accurate

### Burn Rate Golden File
- ✅ Budget consumption percentage
- ✅ Time progress percentage
- ✅ Burn pace validation

### CC Liabilities Golden File
- ✅ Urgency flags (high/medium/low) based on days until due
- ✅ Payment due dates valid
- ✅ Urgent cards correctly identified

## Tolerances

- **Amounts:** 0.01 (handles floating point precision issues)
- **Dates:** Exact match (no tolerance)
- **Strings:** Exact match

## Security

### What's Gitignored
- Raw fixture files (`tests/fixtures/*.json`)
- Contains real production data
- Never committed to repo

### What's Committed
- Golden files (`tests/fixtures/.golden/*.golden.json`)
- Contains expected output only
- No sensitive raw data
- Safe to commit and share

## Next Steps

### Before Backend Migration
1. Run `npm run capture:fixtures` to get latest production data
2. Run `npm run generate:golden` to create golden files
3. Commit golden files to repo
4. All developers working on backend should use same golden files

### During Backend Development
1. Implement `/api/analytics/forecast-v2` endpoint
2. Run `npm run test:golden` to validate against golden files
3. Fix any mismatches until all tests pass
4. Only deploy backend once all tests pass

### After Backend Migration
1. Clients switch to new v2 endpoints
2. Confidence that behavior is identical to old client logic
3. Remove old client-side calculation code
4. Golden files become regression tests for future changes

## Benefits

✅ **Zero Manual Comparison** - Automated tests tell you if math is correct  
✅ **Catch Regressions** - Any backend change caught immediately  
✅ **Both Clients Sync** - Same golden files ensure mobile & dashboard identical behavior  
✅ **Audit Trail** - Golden files show what logic produced them  
✅ **Safe Migrations** - Switch to v2 API knowing it's proven correct  
✅ **Easy Rollback** - If new backend fails tests, revert before shipping  

## References

- [Gullak Server-Side Migration Plan](../gullak-server-side-migration-plan.md)
- [Test Data Capture & Golden File Strategy](../gullak-server-side-migration-plan.md#test-data-capture--golden-file-strategy)

---

**Status:** ✅ Ready to use  
**Created:** 2026-03-31  
**Phase:** Phase 1 - Core Forecast & Burn Logic  
