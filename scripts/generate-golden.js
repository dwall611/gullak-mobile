#!/usr/bin/env node
/**
 * Generate Golden Files from Client Logic
 * 
 * Loads fixtures from tests/fixtures/, runs current client-side logic
 * on them, and saves the output as golden files for backend validation.
 * 
 * Golden files are committed to repo and serve as the expected output
 * that backend code must match.
 */

const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '..', 'tests', 'fixtures');
const GOLDEN_DIR = path.join(FIXTURES_DIR, '.golden');

// Ensure golden directory exists
if (!fs.existsSync(GOLDEN_DIR)) {
  fs.mkdirSync(GOLDEN_DIR, { recursive: true });
}

// Helper: Load fixture
function loadFixture(filename) {
  const filepath = path.join(FIXTURES_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Fixture not found: ${filename}. Run 'npm run capture:fixtures' first.`);
  }
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

// Helper: Save golden file
function saveGolden(filename, data) {
  const filepath = path.join(GOLDEN_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`✓ Saved: ${filename}`);
}

// ─── Client Logic (from CashForecastScreen.js) ────────────────────────────────

/**
 * Returns the cycle key for a given date.
 * Each "month" cycle runs from the 6th of the month to the 5th of the next month.
 * E.g., "2026-03" means March 6 – April 5
 */
function getCycleForDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  const day = d;
  
  // If day is 1-5, it belongs to the previous month's cycle
  // If day is 6+, it belongs to the current month's cycle
  if (day <= 5) {
    // Belongs to previous month's cycle
    const date = new Date(y, m - 1, day); // m is 1-indexed from split
    date.setMonth(date.getMonth() - 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    return `${year}-${String(month).padStart(2, '0')}`;
  } else {
    // Belongs to current month's cycle
    return `${y}-${String(m).padStart(2, '0')}`;
  }
}

/**
 * Returns the start and end dates for a given cycle key.
 * E.g., "2026-03" → { start: "2026-03-06", end: "2026-04-05", label: "Mar 6 – Apr 5" }
 */
function getCycleRange(cycleKey) {
  const [y, m] = cycleKey.split('-').map(Number);
  const startDate = new Date(y, m - 1, 6); // 6th of the month
  const endDate = new Date(y, m, 5); // 5th of next month (m is already next month in 0-indexed JS dates)
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  return {
    start: `${y}-${String(m).padStart(2, '0')}-06`,
    end: `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-05`,
    label: `${monthNames[startDate.getMonth()]} ${startDate.getDate()} – ${monthNames[endDate.getMonth()]} ${endDate.getDate()}`,
    shortLabel: `${monthNames[startDate.getMonth()]} ${startDate.getDate()} – ${monthNames[endDate.getMonth()]} ${endDate.getDate()}`,
  };
}

/**
 * Group forecast rows by cycle.
 */
function groupByCycle(rows) {
  const groups = new Map();
  
  for (const row of rows) {
    const cycleKey = getCycleForDate(row.date);
    if (!cycleKey) continue;
    
    if (!groups.has(cycleKey)) {
      groups.set(cycleKey, []);
    }
    groups.get(cycleKey).push(row);
  }
  
  // Sort rows within each cycle by date
  for (const [key, cycleRows] of groups) {
    cycleRows.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  return groups;
}

// ─── Generate Forecast Golden File ─────────────────────────────────────────────

function generateForecastGolden() {
  console.log('\n1. Generating forecast.golden.json...');
  
  // Load fixtures
  const accounts = loadFixture('accounts.json');
  const forecastRows = loadFixture('forecast-rows.json');
  
  // Find Main Checking account
  const checking = accounts.accounts?.find(a => a.name === 'Main Checking');
  if (!checking) {
    throw new Error('Main Checking account not found in fixtures');
  }
  
  const startingBalance = checking.current_balance || 0;
  
  // Build rows with display fields from forecast_rows (using API field names)
  const rowsWithBalance = forecastRows.forecast_rows.map(row => ({
    id: row.id || `${row.date}-${row.name}`,
    date: row.date,
    cycle_key: getCycleForDate(row.date),
    amount: parseFloat((row.amount ?? (row.expense > 0 ? row.expense : -(row.income || 0))).toFixed(2)),
    name: row.name || row.description || 'Transaction',
    merchant_display: row.merchant_name || row.name || row.description,
    category: row.category || 'Uncategorized',
    category_color: '#9ca3af',
    budget_group: row.isCCPayment ? 'cc_payment' : (row.amount < 0 ? 'income' : 'discretionary'),
    running_balance: parseFloat((row.runningBalance || 0).toFixed(2)),
    is_projected: row.isProjected ?? false,
    is_cc_payment: row.isCCPayment ?? false,
    is_recurring: (row.isProjected && !row.isCCPayment) ?? false,
    recurring_pattern_id: null,
  }));
  
  // Group by cycle
  const cycleGroups = groupByCycle(rowsWithBalance);
  const sortedCycleKeys = [...cycleGroups.keys()].sort((a, b) => a.localeCompare(b));
  
  // Build cycles summary
  const cycles = sortedCycleKeys.map(cycleKey => {
    const rows = cycleGroups.get(cycleKey);
    const range = getCycleRange(cycleKey);
    
    // Calculate opening/closing balance
    const openingBalance = rows.length > 0
      ? (rows[0].running_balance ?? 0) + (rows[0].amount ?? 0)
      : startingBalance;
    const closingBalance = rows.length > 0
      ? rows[rows.length - 1].running_balance
      : startingBalance;
    
    // Calculate totals
    const totalIn = rows
      .filter(r => r.amount < 0)
      .reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const totalOut = rows
      .filter(r => r.amount > 0)
      .reduce((sum, r) => sum + r.amount, 0);
    const netChange = totalIn - totalOut;
    
    // Count recurring/projected items
    const recurringCount = rows.filter(r => r.is_projected && !r.is_cc_payment).length;
    const ccCount = rows.filter(r => r.is_cc_payment).length;
    
    return {
      cycle_key: cycleKey,
      start_date: range.start,
      end_date: range.end,
      label: range.label,
      opening_balance: openingBalance,
      closing_balance: closingBalance,
      total_income: totalIn,
      total_expense: totalOut,
      net_change: netChange,
      transaction_count: rows.length,
      recurring_count: recurringCount,
      cc_payment_count: ccCount,
    };
  });
  
  // Calculate overall summary
  const totalIncome = rowsWithBalance
    .filter(r => r.amount < 0)
    .reduce((sum, r) => sum + Math.abs(r.amount), 0);
  const totalExpense = rowsWithBalance
    .filter(r => r.amount > 0)
    .reduce((sum, r) => sum + r.amount, 0);
  const endingBalance = rowsWithBalance.length > 0
    ? rowsWithBalance[rowsWithBalance.length - 1].running_balance
    : startingBalance;
  
  // Find lowest balance
  const balanceValues = rowsWithBalance.map(r => r.running_balance).filter(v => v != null);
  const lowestBalance = balanceValues.length > 0 ? Math.min(...balanceValues) : startingBalance;
  const lowestDate = rowsWithBalance.find(r => r.running_balance === lowestBalance)?.date || null;
  
  // Build golden output (exact match of API v2 structure)
  const golden = {
    captured_at: new Date().toISOString(),
    source_client: 'gullak-mobile v3.3.0',
    source_logic: 'CashForecastScreen.js',
    fixtures_used: ['accounts.json', 'forecast-rows.json'],
    result: {
      account_id: checking.account_id || checking.id,
      account_name: checking.name,
      as_of_date: new Date().toISOString().split('T')[0],
      days: 60,
      summary: {
        starting_balance: parseFloat(startingBalance.toFixed(2)),
        ending_balance: parseFloat(endingBalance.toFixed(2)),
        total_income: parseFloat(totalIncome.toFixed(2)),
        total_expense: parseFloat(totalExpense.toFixed(2)),
        lowest_balance: parseFloat(lowestBalance.toFixed(2)),
        lowest_date: lowestDate,
      },
      cycles: cycles.map(c => ({
        cycle_key: c.cycle_key,
        start_date: c.start_date,
        end_date: c.end_date,
        label: c.label,
        is_current: c.cycle_key === getCycleForDate(new Date().toISOString().split('T')[0]),
        opening_balance: parseFloat(c.opening_balance.toFixed(2)),
        closing_balance: parseFloat(c.closing_balance.toFixed(2)),
        total_income: parseFloat(c.total_income.toFixed(2)),
        total_expense: parseFloat(c.total_expense.toFixed(2)),
        net_change: parseFloat(c.net_change.toFixed(2)),
        stats: {
          transaction_count: c.transaction_count,
          recurring_count: c.recurring_count,
          cc_payment_count: c.cc_payment_count,
          projected_count: c.transaction_count, // All are projected in forecast
        },
      })),
      transactions: rowsWithBalance.map(t => {
        const base = {
          id: t.id,
          date: t.date,
          cycle_key: t.cycle_key,
          amount: t.amount,
          name: t.name,
          merchant_display: t.merchant_display,
          category: t.category,
          category_color: t.category_color,
          budget_group: t.budget_group,
          running_balance: t.running_balance,
          is_projected: t.is_projected,
          is_cc_payment: t.is_cc_payment,
          is_recurring: t.is_recurring,
          recurring_pattern_id: t.recurring_pattern_id,
        };
        
        // Add CC payment fields if applicable
        if (t.is_cc_payment && t.is_projected) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(t.date + 'T00:00:00');
          const daysUntilDue = Math.round((due - today) / (1000 * 60 * 60 * 24));
          
          base.urgency = daysUntilDue <= 7 ? 'high' : daysUntilDue <= 14 ? 'medium' : 'low';
          base.days_until_due = daysUntilDue;
          base.is_overdue = daysUntilDue < 0;
          base.source_account_id = null;
        }
        
        return base;
      }),
    },
    validation: {
      sum_of_all_transactions: parseFloat((totalIncome - totalExpense).toFixed(2)),
      balance_continuity: true,
      no_negative_balances: lowestBalance >= 0,
      urgent_cc_found: rowsWithBalance.some(r => r.is_cc_payment),
    },
  };
  
  saveGolden('forecast.golden.json', golden);
  return golden;
}

// ─── Generate Burn Rate Golden File ───────────────────────────────────────────

function generateBurnRateGolden() {
  console.log('\n2. Generating burn-rate.golden.json...');
  
  // Load fixtures
  const burnRateData = loadFixture('burn-rate.json');
  const spendingData = loadFixture('spending-by-category.json');
  
  // Extract summary from API response
  const summary = burnRateData.summary || {};
  const income = summary.income || 0;
  const fixed = summary.fixed_expenses || 0;
  const discretionary = summary.discretionary_spent || 0;
  const budget = income - fixed;
  const spent = discretionary;
  
  // Calculate percentages
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const timePct = (daysElapsed / daysInMonth) * 100;
  const burnPct = budget > 0 ? (spent / budget) * 100 : 0;
  
  // Build golden output
  const golden = {
    captured_at: new Date().toISOString(),
    source_client: 'gullak-mobile v3.3.0',
    source_logic: 'OverviewScreen.js',
    fixtures_used: ['burn-rate.json', 'spending-by-category.json'],
    result: {
      month: now.toISOString().substring(0, 7),
      as_of_date: now.toISOString().substring(0, 10),
      days_elapsed: daysElapsed,
      days_total: daysInMonth,
      time_progress_pct: timePct,
      budget: {
        total: budget,
        spent: spent,
        remaining: budget - spent,
        burn_pct: burnPct,
      },
      actuals: {
        income: income,
        fixed: fixed,
        discretionary: discretionary,
        total_spent: fixed + discretionary,
        net: income - fixed - discretionary,
      },
      categories: spendingData.data || [],
    },
    validation: {
      budget_non_negative: budget >= 0,
      burn_pct_valid: burnPct >= 0 && burnPct <= 200,
      time_pct_valid: timePct >= 0 && timePct <= 100,
    },
  };
  
  saveGolden('burn-rate.golden.json', golden);
  return golden;
}

// ─── Generate CC Liabilities Golden File ───────────────────────────────────────

function generateCCLiabilitiesGolden() {
  console.log('\n3. Generating cc-liabilities.golden.json...');
  
  // Load fixtures
  const liabilitiesData = loadFixture('cc-liabilities.json');
  
  // Process credit cards and add urgency flags
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const creditCards = (liabilitiesData.credit_cards || []).map(cc => {
    const dueDate = cc.next_payment_due_date;
    let daysUntilDue = null;
    let urgency = null;
    
    if (dueDate && cc.last_statement_balance > 0 && !cc.payment_recorded) {
      const due = new Date(dueDate + 'T00:00:00');
      daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue >= 0 && daysUntilDue <= 7) {
        urgency = 'high';
      } else if (daysUntilDue > 7 && daysUntilDue <= 14) {
        urgency = 'medium';
      } else if (daysUntilDue > 14) {
        urgency = 'low';
      }
    }
    
    return {
      ...cc,
      days_until_due: daysUntilDue,
      urgency,
      is_urgent: urgency === 'high',
    };
  });
  
  // Build golden output
  const golden = {
    captured_at: new Date().toISOString(),
    source_client: 'gullak-mobile v3.3.0',
    source_logic: 'OverviewScreen.js (PaymentDueBanner)',
    fixtures_used: ['cc-liabilities.json'],
    result: {
      credit_cards: creditCards,
      summary: {
        total_cards: creditCards.length,
        total_balance: creditCards.reduce((sum, cc) => sum + (cc.last_statement_balance || 0), 0),
        urgent_count: creditCards.filter(cc => cc.is_urgent).length,
      },
    },
    validation: {
      has_urgent_cards: creditCards.some(cc => cc.is_urgent),
      all_dates_valid: creditCards.every(cc => !cc.next_payment_due_date || !isNaN(new Date(cc.next_payment_due_date).getTime())),
    },
  };
  
  saveGolden('cc-liabilities.golden.json', golden);
  return golden;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function generateGoldenFiles() {
  console.log('=== Generating Golden Files ===');
  console.log('Loading fixtures from: tests/fixtures/');
  console.log('Saving golden files to: tests/fixtures/.golden/\n');
  
  try {
    // Generate all golden files
    const forecastGolden = generateForecastGolden();
    const burnRateGolden = generateBurnRateGolden();
    const ccLiabilitiesGolden = generateCCLiabilitiesGolden();
    
    // Summary
    console.log('\n=== Generation Complete ===\n');
    console.log('Golden files saved to: tests/fixtures/.golden/');
    console.log('\nFiles created:');
    console.log('  - forecast.golden.json');
    console.log('  - burn-rate.golden.json');
    console.log('  - cc-liabilities.golden.json');
    console.log('\n✅ These files are committed to the repo and serve as expected output.');
    console.log('   Backend tests will validate against these golden files.\n');
    
    // Print validation summary
    console.log('Validation Summary:');
    console.log(`  Forecast: ${forecastGolden.result.cycles.length} cycles, ${forecastGolden.result.transactions.length} transactions`);
    console.log(`  Burn Rate: ${burnRateGolden.result.budget.burn_pct.toFixed(1)}% burned, ${burnRateGolden.result.time_progress_pct.toFixed(1)}% time elapsed`);
    console.log(`  CC Liabilities: ${ccLiabilitiesGolden.result.summary.total_cards} cards, ${ccLiabilitiesGolden.result.summary.urgent_count} urgent`);
    
  } catch (err) {
    console.error('❌ Error generating golden files:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run generation
generateGoldenFiles();
