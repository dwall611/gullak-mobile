// Gullak API Client
// Connects to backend via Tailscale hostname

const API_BASE = 'http://DeathStar:3001/api';
// Fallback: 'http://100.84.80.76:3001/api'

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map();

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
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}

async function fetchAPI(endpoint, options = {}, useCache = false) {
  const url = `${API_BASE}${endpoint}`;
  const cacheKey = useCache ? endpoint : null;

  if (useCache && cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
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

async function fetchWithParams(endpoint, params = {}, useCache = false) {
  const queryString = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  const fullEndpoint = `${endpoint}${queryString ? '?' + queryString : ''}`;
  const cacheKey = useCache ? fullEndpoint : null;

  if (useCache && cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch(`${API_BASE}${fullEndpoint}`, {
    headers: { 'Content-Type': 'application/json' },
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

export const api = {
  // Health
  health: () => fetchAPI('/health'),

  // Accounts
  getAccounts: () => fetchAPI('/accounts', {}, true),
  getAccountSpending: (startDate, endDate) =>
    fetchWithParams('/accounts/spending', { start_date: startDate, end_date: endDate }, true),

  // Transactions
  getTransactions: (params = {}) => fetchWithParams('/transactions', params, false),

  // Stats
  getSummary: (params = {}) => fetchWithParams('/stats/summary', params, false),

  // Analytics
  getSpendingByCategory: (startDate, endDate, groupByDate = false) =>
    fetchWithParams('/analytics/spending-by-category', {
      start_date: startDate,
      end_date: endDate,
      group_by_date: groupByDate ? 'true' : 'false',
    }, true),
  getSpendingTrends: (months = 6) =>
    fetchWithParams('/analytics/spending-trends', { months }, true),
  getTopMerchants: (startDate, endDate, limit = 10) =>
    fetchWithParams('/analytics/top-merchants', { start_date: startDate, end_date: endDate, limit }, true),
  getIncomeVsExpenses: (startDate, endDate) =>
    fetchWithParams('/analytics/income-vs-expenses', { start_date: startDate, end_date: endDate }, true),

  // Sync
  triggerSync: () => {
    clearCache();
    return fetchAPI('/sync', { method: 'POST' });
  },

  // Liabilities
  getLiabilities: () => fetchAPI('/liabilities', {}, true),
};
