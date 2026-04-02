// Gullak API Client
// Connects to backend via Tailscale hostname

const API_BASE = 'http://100.84.80.76:3001/api';
// Fallback: 'http://DeathStar:3001/api'

const CACHE_TTL = 30 * 1000; // 30 seconds
const cache = new Map();

// Feature flags (can be fetched from server later)
const FEATURE_FLAGS = {
  use_server_forecast_v2: true,
};

// API version header support
const DEFAULT_API_VERSION = '1.0';
const V2_API_VERSION = '2.0';

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache(pattern) {
  if (!pattern) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) cache.delete(key);
    }
  }
}

const FETCH_TIMEOUT_MS = 15000; // 15 second timeout to prevent eternal loading

/**
 * Check if a feature flag is enabled
 * @param {string} flagName - Feature flag name
 * @returns {boolean}
 */
export function isFeatureEnabled(flagName) {
  return FEATURE_FLAGS[flagName] ?? false;
}

async function fetchWithTimeout(url, fetchOptions) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch API with optional version header support
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @param {boolean} useCache - Whether to use caching
 * @param {string} apiVersion - API version header (default: '1.0', use '2.0' for v2 endpoints)
 */
async function fetchAPI(endpoint, options = {}, useCache = false, apiVersion = DEFAULT_API_VERSION) {
  const url = `${API_BASE}${endpoint}`;
  const cacheKey = useCache ? `${endpoint}:${apiVersion}` : null;

  if (useCache && cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const response = await fetchWithTimeout(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': apiVersion,
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (useCache && cacheKey) {
    setCache(cacheKey, data);
  }

  return data;
}

/**
 * Fetch API with query params and optional version header support
 * @param {string} endpoint - API endpoint path
 * @param {Object} params - Query parameters
 * @param {boolean} useCache - Whether to use caching
 * @param {string} apiVersion - API version header
 */
async function fetchWithParams(endpoint, params = {}, useCache = false, apiVersion = DEFAULT_API_VERSION) {
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  const fullEndpoint = `${endpoint}${queryString ? '?' + queryString : ''}`;
  const cacheKey = useCache ? `${fullEndpoint}:${apiVersion}` : null;

  if (useCache && cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const response = await fetchWithTimeout(`${API_BASE}${fullEndpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': apiVersion,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (useCache && cacheKey) {
    setCache(cacheKey, data);
  }

  return data;
}

// ============================================
// TYPE DEFINITIONS (JSDoc)
// ============================================

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} account_id
 * @property {number} amount
 * @property {string} date
 * @property {string} month
 * @property {string} name
 * @property {string} [merchant_name]
 * @property {string} [merchant_normalized]
 * @property {string} [resolved_category]
 * @property {string} category
 * @property {string} [category_color]
 * @property {string} [budget_group]
 * @property {string} [transaction_type]
 * @property {boolean} [is_spend]
 * @property {boolean} [is_discretionary]
 * @property {boolean} [is_recurring]
 * @property {boolean} [is_subscription]
 * @property {boolean} [is_p2p]
 * @property {string} [enriched_at]
 * @property {string} [personal_finance_category]
 * @property {string} [payment_channel]
 * @property {boolean} [pending]
 * @property {string} [authorized_date]
 * @property {string} [account_name]
 * @property {string} [account_type]
 */

/**
 * @typedef {Object} TransactionsResponse
 * @property {Transaction[]} transactions
 */

/**
 * @typedef {Object} TransactionsParams
 * @property {string} [accountId]
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {string} [category]
 * @property {string} [budgetGroup]
 * @property {boolean} [isSubscription]
 * @property {boolean} [isDiscretionary]
 * @property {string} [search]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/**
 * @typedef {Object} SpendingCategory
 * @property {string} category
 * @property {number} amount
 * @property {number} count
 * @property {number} percentage
 */

/**
 * @typedef {Object} SpendingByCategoryResponse
 * @property {SpendingCategory[]} categories
 */

/**
 * @typedef {Object} BurnRateItem
 * @property {string} name
 * @property {number} amount
 * @property {string} [category]
 */

/**
 * @typedef {Object} BurnRate
 * @property {number} income
 * @property {number} fixed
 * @property {number} discretionary
 * @property {number} net
 * @property {BurnRateItem[]} [income_items]
 * @property {BurnRateItem[]} [fixed_items]
 * @property {BurnRateItem[]} [discretionary_items]
 */

/**
 * @typedef {Object} ForecastRow
 * @property {string} date
 * @property {number} income
 * @property {number} expense
 * @property {number} runningBalance
 */

/**
 * @typedef {Object} ForecastSummary
 * @property {number} [startingBalance]
 * @property {number} [totalIncome]
 * @property {number} [totalExpense]
 * @property {number} [endingBalance]
 */

/**
 * @typedef {Object} Forecast
 * @property {ForecastRow[]} forecast_rows
 * @property {ForecastSummary} summary
 */

/**
 * @typedef {Object} ForecastV2Cycle
 * @property {string} cycle_key - e.g., "2026-04"
 * @property {string} start_date - e.g., "2026-04-06"
 * @property {string} end_date - e.g., "2026-05-05"
 * @property {string} label - e.g., "Apr 6 – May 5"
 * @property {boolean} is_current - Whether this is the current billing cycle
 * @property {number} opening_balance - Balance at start of cycle
 * @property {number} closing_balance - Balance at end of cycle
 * @property {number} total_income - Total income in cycle
 * @property {number} total_expense - Total expenses in cycle
 * @property {number} net_change - Net change (income - expense)
 * @property {Object} stats - Cycle statistics
 * @property {number} stats.transaction_count
 * @property {number} stats.recurring_count
 * @property {number} stats.cc_payment_count
 * @property {number} stats.projected_count
 */

/**
 * @typedef {Object} ForecastV2Transaction
 * @property {string} id - Transaction ID
 * @property {string} date - Transaction date (YYYY-MM-DD)
 * @property {string} cycle_key - Which billing cycle this belongs to
 * @property {number} amount - Transaction amount (positive = expense, negative = income)
 * @property {string} name - Transaction name
 * @property {string} merchant_display - Display-friendly merchant name
 * @property {string} category - Category name
 * @property {string} category_color - Category color hex
 * @property {string} budget_group - Budget group (fixed, discretionary, cc_payment)
 * @property {number} running_balance - Running balance after this transaction
 * @property {boolean} is_projected - Whether this is a projected transaction
 * @property {boolean} is_cc_payment - Whether this is a CC payment
 * @property {boolean} is_recurring - Whether this is a recurring transaction
 * @property {string} [urgency] - Urgency level for CC payments: "high", "medium", "low"
 * @property {number} [days_until_due] - Days until CC payment is due
 * @property {string} [source_account_id] - Source account for CC payments
 */

/**
 * @typedef {Object} ForecastV2Summary
 * @property {number} starting_balance - Starting balance
 * @property {number} ending_balance - Projected ending balance
 * @property {number} total_income - Total income in period
 * @property {number} total_expense - Total expenses in period
 * @property {number} lowest_balance - Lowest balance in period
 * @property {string} lowest_date - Date of lowest balance
 */

/**
 * @typedef {Object} ForecastV2Response
 * @property {ForecastV2Summary} summary - Forecast summary
 * @property {ForecastV2Cycle[]} cycles - Billing cycles
 * @property {ForecastV2Transaction[]} transactions - All transactions
 */

/**
 * @typedef {Object} MonthlySummary
 * @property {string} month
 * @property {number} income
 * @property {number} spending
 * @property {number} net
 */

/**
 * @typedef {Object} RecurringItem
 * @property {string} name
 * @property {number} amount
 * @property {string} [category]
 * @property {string} [frequency]
 */

/**
 * @typedef {Object} RecurringResponse
 * @property {RecurringItem[]} data
 * @property {number} count
 */

/**
 * @typedef {Object} NetWorthBreakdown
 * @property {string} [account_name]
 * @property {string} [account_type]
 * @property {number} balance
 */

/**
 * @typedef {Object} NetWorth
 * @property {number} assets
 * @property {number} liabilities
 * @property {number} net_worth
 * @property {NetWorthBreakdown[]} [breakdown]
 */

/**
 * @typedef {Object} IncomeTransaction
 * @property {string} id
 * @property {string} name
 * @property {number} amount
 * @property {string} date
 * @property {string} [category]
 */

/**
 * @typedef {Object} IncomeResponse
 * @property {number} total
 * @property {IncomeTransaction[]} transactions
 */

/**
 * @typedef {Object} BudgetCategory
 * @property {string} category
 * @property {number} budgeted
 * @property {number} spent
 * @property {number} remaining
 */

/**
 * @typedef {Object} BudgetTotals
 * @property {number} total_budgeted
 * @property {number} total_spent
 * @property {number} total_remaining
 */

/**
 * @typedef {Object} Budget
 * @property {string} month
 * @property {BudgetCategory[]} categories
 * @property {BudgetTotals} totals
 */

/**
 * @typedef {Object} Account
 * @property {string} account_id
 * @property {string} name
 * @property {string} type
 * @property {number} balance
 * @property {string} [subtype]
 */

/**
 * @typedef {Object} AccountsResponse
 * @property {Account[]} accounts
 */

/**
 * @typedef {Object} RecurringConfigItem
 * @property {string} id
 * @property {string} name
 * @property {number} amount
 * @property {string} [frequency]
 */

/**
 * @typedef {Object} RecurringConfigResponse
 * @property {RecurringConfigItem[]} data
 */

/**
 * @typedef {Object} DisplaySettings
 * @property {string} [currency]
 * @property {string} [dateFormat]
 */

/**
 * @typedef {Object} ClientConfig
 * @property {string[]} categories
 * @property {string[]} budgetGroups
 * @property {DisplaySettings} displaySettings
 */

// ============================================
// API METHODS
// ============================================

export const api = {
  // --------------------------------------------
  // HEALTH
  // --------------------------------------------

  /**
   * Check API health status
   * @returns {Promise<{ status: string }>}
   */
  health: () => fetchAPI('/health'),

  // --------------------------------------------
  // ACCOUNTS
  // --------------------------------------------

  /**
   * Get all accounts
   * @returns {Promise<AccountsResponse>}
   */
  getAccounts: () => fetchAPI('/accounts', {}, true),

  /**
   * Get account spending for date range
   * @param {string} startDate
   * @param {string} endDate
   * @returns {Promise<any>}
   */
  getAccountSpending: (startDate, endDate) =>
    fetchWithParams('/accounts/spending', { start_date: startDate, end_date: endDate }, true),

  // --------------------------------------------
  // TRANSACTIONS
  // --------------------------------------------

  /**
   * Get transactions with optional filters
   * @param {TransactionsParams} params - Filter parameters
   * @returns {Promise<TransactionsResponse>}
   */
  getTransactions: (params = {}) => fetchWithParams('/transactions', params, false),

  // --------------------------------------------
  // STATS
  // --------------------------------------------

  /**
   * Get summary stats
   * @param {Object} params
   * @returns {Promise<any>}
   */
  getSummary: (params = {}) => fetchWithParams('/stats/summary', params, false),

  // --------------------------------------------
  // ANALYTICS
  // --------------------------------------------

  /**
   * Get spending grouped by category
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {boolean} [groupByDate=false] - Group results by date
   * @returns {Promise<SpendingByCategoryResponse>}
   */
  getSpendingByCategory: (startDate, endDate, groupByDate = false) =>
    fetchWithParams('/analytics/spending-by-category', {
      start_date: startDate,
      end_date: endDate,
      group_by_date: groupByDate ? 'true' : 'false',
    }, true),

  /**
   * Get spending trends over time
   * @param {number} [months=6] - Number of months to analyze
   * @returns {Promise<any>}
   */
  getSpendingTrends: (months = 6) =>
    fetchWithParams('/analytics/spending-trends', { months }, true),

  /**
   * Get top merchants by spending
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {number} [limit=10] - Max number of merchants
   * @returns {Promise<any>}
   */
  getTopMerchants: (startDate, endDate, limit = 10) =>
    fetchWithParams('/analytics/top-merchants', { start_date: startDate, end_date: endDate, limit }, true),

  /**
   * Get income vs expenses comparison
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<any>}
   */
  getIncomeVsExpenses: (startDate, endDate) =>
    fetchWithParams('/analytics/income-vs-expenses', { start_date: startDate, end_date: endDate }, true),

  /**
   * Get burn rate breakdown for a month
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<BurnRate>}
   */
  getBurnRate: (month) =>
    fetchWithParams('/analytics/burn-rate', { month }, true),

  /**
   * Get cash forecast for an account
   * @param {string} accountId - Account ID to forecast
   * @param {number} [days=60] - Number of days to forecast
   * @returns {Promise<Forecast>}
   */
  getForecast: (accountId, days = 60) =>
    fetchWithParams('/analytics/forecast', { account_id: accountId, days }, true),

  /**
   * Get cash forecast v2 with server-side cycle grouping and running balance
   * Returns transactions grouped by billing cycle with all computed fields
   * @param {string} accountId - Account ID to forecast
   * @param {number} [days=60] - Number of days to forecast
   * @param {boolean} [useFeatureFlag=true] - Check feature flag before using v2
   * @returns {Promise<ForecastV2Response>}
   */
  getForecastV2: (accountId, days = 60, useFeatureFlag = true) => {
    // Check feature flag
    if (useFeatureFlag && !FEATURE_FLAGS.use_server_forecast_v2) {
      // Fall back to v1 if flag disabled
      return fetchWithParams('/analytics/forecast', { account_id: accountId, days }, true);
    }
    // Use v2 endpoint with API version header
    return fetchWithParams('/analytics/forecast-v2', { account_id: accountId, days }, true, V2_API_VERSION);
  },

  /**
   * Get monthly financial summary
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<MonthlySummary>}
   */
  getMonthlySummary: (month) =>
    fetchWithParams('/analytics/monthly-summary', { month }, true),

  /**
   * Get detected recurring transactions
   * @returns {Promise<RecurringResponse>}
   */
  getRecurring: () => fetchAPI('/analytics/recurring', {}, true),

  /**
   * Get net worth breakdown (assets, liabilities)
   * @returns {Promise<NetWorth>}
   */
  getNetWorth: () => fetchAPI('/analytics/net-worth', {}, true),

  /**
   * Get income breakdown for a month
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<IncomeResponse>}
   */
  getIncome: (month) =>
    fetchWithParams('/analytics/income', { month }, true),

  /**
   * @deprecated Use getRecurring() instead
   * Get recurring transactions (legacy endpoint)
   * @param {number} [months=3] - Months to analyze
   * @returns {Promise<any>}
   */
  getRecurringTransactions: (months = 3) =>
    fetchWithParams('/analytics/recurring-transactions', { months }, true),

  // --------------------------------------------
  // BUDGETS
  // --------------------------------------------

  /**
   * Get budget for a specific month
   * @param {string} month - Month in YYYY-MM format
   * @returns {Promise<Budget>}
   */
  getBudgets: (month) =>
    fetchWithParams('/budgets', { month }, true),

  // --------------------------------------------
  // CONFIG
  // --------------------------------------------

  /**
   * Get recurring transaction configuration for an account
   * @param {string} [accountId] - Account ID
   * @param {string} [accountName] - Account name
   * @returns {Promise<RecurringConfigResponse>}
   */
  getRecurringConfig: (accountId, accountName) =>
    fetchWithParams('/config/recurring', { account_id: accountId, account_name: accountName }, true),

  /**
   * Get client configuration (categories, budget groups, display settings)
   * @returns {Promise<ClientConfig>}
   */
  getClientConfig: () => fetchAPI('/config/client', {}, true),

  // --------------------------------------------
  // SYNC
  // --------------------------------------------

  /**
   * Trigger a data sync with Plaid
   * @returns {Promise<any>}
   */
  triggerSync: () => {
    clearCache();
    return fetchAPI('/sync', { method: 'POST' });
  },

  /**
   * Get current sync status
   * @returns {Promise<any>}
   */
  getSyncStatus: () => fetchAPI('/sync/status', {}, false),

  // --------------------------------------------
  // LIABILITIES
  // --------------------------------------------

  /**
   * Get all liabilities
   * @returns {Promise<any>}
   */
  getLiabilities: () => fetchAPI('/liabilities', {}, true),

  // --------------------------------------------
  // REWARDS
  // --------------------------------------------

  /**
   * Get rewards for all accounts
   * @returns {Promise<any>}
   */
  getRewards: () => fetchAPI('/rewards', {}, true),

  /**
   * Calculate reward points for a specific account
   * @param {string} id - Account ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<any>}
   */
  calculateRewardPoints: (id, startDate, endDate) =>
    fetchWithParams(`/rewards/${id}/calculate-points`, { start_date: startDate, end_date: endDate }, false),

  // --------------------------------------------
  // RECURRING TRANSACTION RULES (MANAGED)
  // --------------------------------------------

  /**
   * Get managed recurring transaction rules
   * @returns {Promise<any>}
   */
  getRecurringRules: () => fetchAPI('/recurring-transactions', {}, false),

  /**
   * Get recurring transaction stats
   * @returns {Promise<any>}
   */
  getRecurringStats: () => fetchAPI('/recurring-transactions/stats', {}, false),

  /**
   * Create a new recurring rule
   * @param {Object} data - Rule data
   * @returns {Promise<any>}
   */
  createRecurringRule: (data) => {
    clearCache('recurring');
    return fetchAPI('/recurring-transactions', { method: 'POST', body: JSON.stringify(data) });
  },

  /**
   * Update a recurring rule
   * @param {string} patternId - Rule pattern ID
   * @param {Object} data - Updated rule data
   * @returns {Promise<any>}
   */
  updateRecurringRule: (patternId, data) => {
    clearCache('recurring');
    return fetchAPI(`/recurring-transactions/${encodeURIComponent(patternId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a recurring rule
   * @param {string} patternId - Rule pattern ID
   * @returns {Promise<any>}
   */
  deleteRecurringRule: (patternId) => {
    clearCache('recurring');
    return fetchAPI(`/recurring-transactions/${encodeURIComponent(patternId)}`, { method: 'DELETE' });
  },

  /**
   * Dismiss an auto-detected recurring rule
   * @param {string} patternId - Rule pattern ID
   * @returns {Promise<any>}
   */
  dismissRecurringRule: (patternId) => {
    clearCache('recurring');
    return fetchAPI(`/recurring-transactions/${encodeURIComponent(patternId)}/dismiss`, { method: 'POST' });
  },

  /**
   * Trigger auto-detection of recurring patterns
   * @returns {Promise<any>}
   */
  triggerRecurringDetection: () => {
    clearCache('recurring');
    return fetchAPI('/recurring-transactions/detect', { method: 'POST', body: JSON.stringify({}) });
  },

  // --------------------------------------------
  // CATEGORIES
  // --------------------------------------------

  /**
   * Get all categories
   * @returns {Promise<any>}
   */
  getCategories: () => fetchAPI('/categories', {}, true),

  /**
   * Create a new category
   * @param {Object} data - Category data
   * @returns {Promise<any>}
   */
  createCategory: (data) => {
    clearCache('categories');
    return fetchAPI('/categories', { method: 'POST', body: JSON.stringify(data) });
  },

  /**
   * Update a category
   * @param {string} id - Category ID
   * @param {Object} data - Updated category data
   * @returns {Promise<any>}
   */
  updateCategory: (id, data) => {
    clearCache('categories');
    return fetchAPI(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  /**
   * Delete a category
   * @param {string} id - Category ID
   * @returns {Promise<any>}
   */
  deleteCategory: (id) => {
    clearCache('categories');
    return fetchAPI(`/categories/${id}`, { method: 'DELETE' });
  },

  // --------------------------------------------
  // CATEGORY RULES
  // --------------------------------------------

  /**
   * Get all category rules
   * @returns {Promise<any>}
   */
  getCategoryRules: () => fetchAPI('/category-rules/rules', {}, false),

  /**
   * Create a category rule
   * @param {Object} data - Rule data
   * @returns {Promise<any>}
   */
  createCategoryRule: (data) => fetchAPI('/category-rules/rules', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Update a category rule
   * @param {string} id - Rule ID
   * @param {Object} data - Updated rule data
   * @returns {Promise<any>}
   */
  updateCategoryRule: (id, data) => fetchAPI(`/category-rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Delete a category rule
   * @param {string} id - Rule ID
   * @returns {Promise<any>}
   */
  deleteCategoryRule: (id) => fetchAPI(`/category-rules/${id}`, { method: 'DELETE' }),

  /**
   * Toggle a category rule active state
   * @param {string} id - Rule ID
   * @param {boolean} isActive - Active state
   * @returns {Promise<any>}
   */
  toggleCategoryRule: (id, isActive) => fetchAPI(`/category-rules/${id}/toggle`, { method: 'POST', body: JSON.stringify({ is_active: isActive }) }),

  /**
   * Apply category rules to transactions
   * @returns {Promise<any>}
   */
  applyCategoryRules: () => fetchAPI('/category-rules/apply', { method: 'POST' }),

  // --------------------------------------------
  // ALERTS
  // --------------------------------------------

  /**
   * Get alert history
   * @param {number} [limit=50] - Max number of alerts
   * @returns {Promise<any>}
   */
  getAlertHistory: (limit = 50) => fetchWithParams('/alerts/history', { limit }, false),

  /**
   * Get alert rules
   * @returns {Promise<any>}
   */
  getAlertRules: () => fetchAPI('/alerts/rules', {}, false),

  /**
   * Create an alert rule
   * @param {Object} data - Alert rule data
   * @returns {Promise<any>}
   */
  createAlertRule: (data) => fetchAPI('/alerts/rules', { method: 'POST', body: JSON.stringify(data) }),

  /**
   * Update an alert rule
   * @param {string} id - Alert rule ID
   * @param {Object} data - Updated rule data
   * @returns {Promise<any>}
   */
  updateAlertRule: (id, data) => fetchAPI(`/alerts/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  /**
   * Delete an alert rule
   * @param {string} id - Alert rule ID
   * @returns {Promise<any>}
   */
  deleteAlertRule: (id) => fetchAPI(`/alerts/rules/${id}`, { method: 'DELETE' }),

  /**
   * Acknowledge an alert
   * @param {string} id - Alert ID
   * @returns {Promise<any>}
   */
  acknowledgeAlert: (id) => fetchAPI(`/alerts/${id}/acknowledge`, { method: 'PATCH' }),

  // --------------------------------------------
  // EXPORT
  // --------------------------------------------

  /**
   * Get URL for transaction export
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} [accountId] - Optional account filter
   * @returns {string} Export URL
   */
  getExportUrl: (startDate, endDate, accountId) => {
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
    if (accountId) params.append('account_id', accountId);
    return `http://DeathStar:3001/api/export/transactions?${params.toString()}`;
  },

  // --------------------------------------------
  // INVESTMENTS
  // --------------------------------------------

  /**
   * Get investment holdings
   * @returns {Promise<any>}
   */
  getInvestmentHoldings: () => fetchAPI('/investments/holdings', {}, true),

  /**
   * Get portfolio history
   * @param {number} [days=30] - Number of days of history
   * @returns {Promise<any>}
   */
  getPortfolioHistory: (days = 30) =>
    fetchWithParams('/investments/portfolio-history', { days }, true),

  // --------------------------------------------
  // TRANSACTION UPDATES
  // --------------------------------------------

  /**
   * Update transaction category
   * @param {string} transactionId - Transaction ID
   * @param {string} category - Category name
   * @param {string} categoryId - Category ID
   * @returns {Promise<any>}
   */
  updateTransactionCategory: async (transactionId, category, categoryId) => {
    const result = await fetchAPI(`/transactions/${transactionId}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ category, category_id: categoryId }),
    });
    clearCache();
    return result;
  },

  /**
   * Update transaction recurring flag
   * @param {string} transactionId - Transaction ID
   * @param {boolean} isRecurring - Whether transaction is recurring
   * @returns {Promise<any>}
   */
  updateTransactionRecurring: (transactionId, isRecurring) =>
    fetchAPI(`/transactions/${transactionId}/recurring`, {
      method: 'PATCH',
      body: JSON.stringify({ is_recurring: isRecurring }),
    }),

  /**
   * Bulk update category for multiple transactions
   * @param {string[]} transactionIds - Transaction IDs
   * @param {string} category - Category name
   * @param {string} categoryId - Category ID
   * @returns {Promise<any>}
   */
  bulkUpdateTransactionCategory: async (transactionIds, category, categoryId) => {
    const result = await fetchAPI('/transactions/bulk-category', {
      method: 'PUT',
      body: JSON.stringify({ transaction_ids: transactionIds, category, category_id: categoryId }),
    });
    clearCache();
    return result;
  },

  // --------------------------------------------
  // PUSH NOTIFICATIONS
  // --------------------------------------------

  /**
   * Register a push notification token
   * @param {string} token - Expo push token
   * @param {string} [deviceName] - Optional device name
   * @returns {Promise<any>}
   */
  registerPushToken: (token, deviceName) =>
    fetchAPI('/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, device_name: deviceName }),
    }),

  /**
   * Unregister a push notification token
   * @param {string} token - Expo push token
   * @returns {Promise<any>}
   */
  unregisterPushToken: (token) =>
    fetchAPI(`/push-tokens/${encodeURIComponent(token)}`, { method: 'DELETE' }),

  /**
   * Get all registered push tokens
   * @returns {Promise<any>}
   */
  getPushTokens: () => fetchAPI('/push-tokens', {}, false),
};
