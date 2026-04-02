#!/usr/bin/env node
/**
 * Capture Fixtures for Golden File Testing
 * 
 * Queries production DB for real transaction data, forecast/projected transactions,
 * recurring rules, and CC liabilities.
 * 
 * Outputs to tests/fixtures/:
 * - transactions-2026-03.json (1 month of real tx data)
 * - forecast-rows-2026-04.json (projected tx from API)
 * - recurring-rules.json (all active recurring patterns)
 * - cc-liabilities.json (all credit cards with balances)
 * - accounts.json (account list with starting balances)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = 'http://100.84.80.76:3001/api';
const FIXTURES_DIR = path.join(__dirname, '..', 'tests', 'fixtures');

// Ensure fixtures directory exists
if (!fs.existsSync(FIXTURES_DIR)) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
}

// Helper: Make HTTP request
function fetchAPI(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${endpoint}`;
    console.log(`Fetching: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API Error: ${res.statusCode} ${res.statusMessage}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`JSON parse error: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

// Helper: Save JSON to fixtures directory
function saveFixture(filename, data) {
  const filepath = path.join(FIXTURES_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✓ Saved: ${filename} (${(JSON.stringify(data).length / 1024).toFixed(2)} KB)`);
}

async function captureFixtures() {
  console.log('=== Capturing Fixtures from Production DB ===\n');
  
  try {
    // Get current date info
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    // Last month (for historical transactions)
    const lastMonth = new Date(year, month - 1, 1);
    const lastMonthStr = lastMonth.toISOString().substring(0, 7); // "2026-02"
    const lastMonthStart = `${lastMonthStr}-01`;
    const lastMonthEnd = new Date(year, month, 0).toISOString().substring(0, 10); // Last day of last month
    
    // Current month (for current data)
    const currentMonthStr = now.toISOString().substring(0, 7); // "2026-03"
    const currentMonthStart = `${currentMonthStr}-01`;
    const currentMonthEnd = new Date(year, month + 1, 0).toISOString().substring(0, 10);
    
    console.log(`Date range: ${lastMonthStart} to ${currentMonthEnd}\n`);
    
    // 1. Get accounts
    console.log('1. Fetching accounts...');
    const accountsData = await fetchAPI('/accounts');
    saveFixture('accounts.json', accountsData);
    
    // Find Main Checking account
    const checking = accountsData.accounts?.find(a => a.name === 'Main Checking');
    if (!checking) {
      throw new Error('Main Checking account not found');
    }
    const accountId = checking.account_id || checking.id;
    console.log(`   Using account: ${checking.name} (${accountId})\n`);
    
    // 2. Get 1 month of transactions
    console.log('2. Fetching transactions (last month)...');
    const transactionsData = await fetchAPI(
      `/transactions?account_id=${accountId}&start_date=${lastMonthStart}&end_date=${lastMonthEnd}&limit=500`
    );
    saveFixture(`transactions-${lastMonthStr}.json`, transactionsData);
    console.log(`   Captured ${transactionsData.transactions?.length || 0} transactions\n`);
    
    // 3. Get forecast/projected transactions (60 days forward)
    console.log('3. Fetching forecast data...');
    const forecastData = await fetchAPI(
      `/analytics/forecast?account_id=${accountId}&days=60`
    );
    saveFixture('forecast-rows.json', forecastData);
    console.log(`   Captured ${forecastData.forecast_rows?.length || 0} forecast rows\n`);
    
    // 4. Get recurring rules
    console.log('4. Fetching recurring rules...');
    const recurringRulesData = await fetchAPI('/recurring-transactions');
    saveFixture('recurring-rules.json', recurringRulesData);
    console.log(`   Captured ${recurringRulesData.rules?.length || recurringRulesData.length || 0} recurring rules\n`);
    
    // 5. Get CC liabilities
    console.log('5. Fetching CC liabilities...');
    const liabilitiesData = await fetchAPI('/liabilities');
    saveFixture('cc-liabilities.json', liabilitiesData);
    const ccCount = liabilitiesData.credit_cards?.length || 0;
    console.log(`   Captured ${ccCount} credit cards\n`);
    
    // 6. Get burn rate for current month
    console.log('6. Fetching burn rate...');
    const burnRateData = await fetchAPI(`/analytics/burn-rate?month=${currentMonthStr}`);
    saveFixture('burn-rate.json', burnRateData);
    console.log(`   Captured burn rate data\n`);
    
    // 7. Get spending by category
    console.log('7. Fetching spending by category...');
    const spendingData = await fetchAPI(
      `/analytics/spending-by-category?start_date=${currentMonthStart}&end_date=${currentMonthEnd}`
    );
    saveFixture('spending-by-category.json', spendingData);
    console.log(`   Captured ${spendingData.data?.length || 0} categories\n`);
    
    // Summary
    console.log('=== Capture Complete ===\n');
    console.log('Fixtures saved to: tests/fixtures/');
    console.log('\nFiles created:');
    console.log('  - accounts.json');
    console.log(`  - transactions-${lastMonthStr}.json`);
    console.log('  - forecast-rows.json');
    console.log('  - recurring-rules.json');
    console.log('  - cc-liabilities.json');
    console.log('  - burn-rate.json');
    console.log('  - spending-by-category.json');
    console.log('\n⚠️  IMPORTANT: These files contain REAL production data.');
    console.log('    They are gitignored and should NEVER be committed to the repo.');
    console.log('    Only .golden files (generated next) are committed.\n');
    
  } catch (err) {
    console.error('❌ Error capturing fixtures:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run capture
captureFixtures();
