/**
 * Utility helpers for Gullak Mobile
 * Core formatting functions that match web implementation
 */

// Currency formatting functions matching web implementation
export function formatCurrency(value) {
  if (value === null || value === undefined) return '$0.00';
  const abs = Math.abs(value);
  return `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCompact(value) {
  if (!value) return '$0';
  const abs = Math.abs(value);
  if (abs >= 1000000) return `$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`;
  return `$${abs.toFixed(0)}`;
}

// Date formatting functions matching web implementation
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - dateOnly) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Alias for backward compatibility
export const formatDateShort = formatShortDate;

export const CATEGORY_MAP = {
  'FOOD_AND_DRINK': 'Food & Dining',
  'TRANSPORTATION': 'Transportation',
  'GENERAL_MERCHANDISE': 'Shopping',
  'ENTERTAINMENT': 'Entertainment',
  'TRAVEL': 'Travel',
  'PERSONAL_CARE': 'Personal Care',
  'HEALTHCARE': 'Healthcare',
  'RENT': 'Housing',
  'HOME_IMPROVEMENT': 'Home',
  'UTILITIES': 'Bills & Utilities',
  'INCOME': 'Income',
  'TRANSFER_IN': 'Transfer',
  'TRANSFER_OUT': 'Transfer',
  'LOAN_PAYMENTS': 'Credit Card Payments',
  'BANK_FEES': 'Bank Fees',
  'GOVERNMENT_AND_NON_PROFIT': 'Government',
  'SERVICE': 'Services',
  'GROCERIES': 'Groceries',
  'AUTO': 'Transportation',
  'EDUCATION': 'Education',
  'RENT_AND_UTILITIES': 'Bills & Utilities',
};

export function getTransactionCategory(tx) {
  if (tx.override_category) return tx.override_category;
  if (tx.personal_finance_category) {
    try {
      const pfc =
        typeof tx.personal_finance_category === 'string'
          ? JSON.parse(tx.personal_finance_category)
          : tx.personal_finance_category;
      const mapped = CATEGORY_MAP[pfc?.primary];
      return mapped || 'Uncategorized';
    } catch {}
  }
  return 'Uncategorized';
}

export function getMerchantName(tx) {
  return tx.merchant_name || tx.name || 'Unknown';
}

export function getAccountName(tx) {
  return tx.account_name || 'Unknown';
}

// Date range helpers
export function getDateRange(filter, selectedMonth = '', customFrom = '', customTo = '') {
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(today);

  switch (filter) {
    case '1day':
      break;
    case '7days':
      startDate.setDate(endDate.getDate() - 6);
      break;
    case 'mtd':
      startDate.setDate(1);
      break;
    case 'ytd':
      startDate.setMonth(0);
      startDate.setDate(1);
      break;
    case 'month':
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        startDate.setFullYear(parseInt(year), parseInt(month) - 1, 1);
        endDate.setFullYear(parseInt(year), parseInt(month), 0);
      }
      break;
    case 'custom':
      if (customFrom) startDate.setTime(new Date(customFrom).getTime());
      if (customTo) endDate.setTime(new Date(customTo).getTime());
      break;
    default:
      startDate.setDate(endDate.getDate() - 6);
  }

  return {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
}

export function getAvailableMonths() {
  const months = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    months.push({ value, label });
  }
  return months;
}

// Category color map for charts
export const CATEGORY_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
  '#64748b', '#a855f7', '#22c55e', '#fb923c', '#e11d48',
];

export function getCategoryColor(index) {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
