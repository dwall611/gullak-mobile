/**
 * Manual recurring transaction configurations
 * Shared configuration matching the web dashboard
 * These are hardcoded recurring transactions that may not be detected automatically
 */

export const MANUAL_RECURRING_BY_ACCOUNT = {
  'Main Checking': [
    // NY 529 entries removed - now auto-detected from API
    { id: 'pseg', merchant: 'Public Service PSEG', amount: 120, dayOfMonth: 3, skipMonths: [], keyword: 'pseg' },
    { id: 'bilt-mortgage', merchant: 'Mortgage (Bilt)', amount: 5197, dayOfMonth: 5, skipMonths: [], keyword: 'bilt card hous' },
  ],
  'Rental': [
    { id: 'rent-phadt', merchant: 'Rental Income – PHADT', amount: -2700, dayOfMonth: 30, skipMonths: [], keyword: 'phadt' },
    { id: 'rent-hanna', merchant: 'Rental Income – Hanna', amount: -2100, dayOfMonth: 27, skipMonths: [], keyword: 'hanna' },
    { id: 'rental-newrez', merchant: 'NEWREZ Mortgage', amount: 1702.81, dayOfMonth: 2, skipMonths: [], keyword: 'newrez' },
    { id: 'rental-mt', merchant: 'M&T Mortgage (Rental)', amount: 1822.85, dayOfMonth: 2, skipMonths: [], keyword: 'm & t mortgage' },
    { id: 'rental-atg', merchant: 'ATGPay', amount: 847.42, dayOfMonth: 5, skipMonths: [], keyword: 'atgpay' },
    { id: 'rental-redbridge', merchant: 'Red Bridge Property Mgmt', amount: 530, dayOfMonth: 9, skipMonths: [], keyword: 'red bridge' },
  ],
};

// Special overrides for specific merchants
export const MERCHANT_OVERRIDES = {
  hudson: { 
    amount: 6082, 
    dayOfMonth: 1, 
    skipMonths: [5, 6] // June and July (0-indexed: May=5, June=6)
  }
};

/**
 * Get override configuration for a merchant
 * @param {string} merchant - Merchant name
 * @returns {Object|null} Override configuration or null
 */
export function getMerchantOverride(merchant) {
  if (!merchant) return null;
  
  const lowerMerchant = merchant.toLowerCase();
  for (const [key, override] of Object.entries(MERCHANT_OVERRIDES)) {
    if (lowerMerchant.includes(key)) {
      return override;
    }
  }
  
  return null;
}

/**
 * Check if a transaction has already been paid based on merchant matching
 * @param {Array} transactions - List of actual transactions
 * @param {string} merchant - Merchant to check
 * @param {string} keyword - Keyword to match
 * @returns {boolean} True if already paid
 */
export function isAlreadyPaid(transactions, merchant, keyword) {
  return transactions.some((tx) => {
    const txName = (tx.merchant_name || tx.name || '').toLowerCase();
    return keyword && txName.includes(keyword.toLowerCase());
  });
}

/**
 * Get manual recurring transactions for an account
 * @param {string} accountName - Account name
 * @returns {Array} Manual recurring transactions
 */
export function getManualRecurringForAccount(accountName) {
  return MANUAL_RECURRING_BY_ACCOUNT[accountName] || [];
}
