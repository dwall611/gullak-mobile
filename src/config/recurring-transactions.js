// Recurring transactions config stubs

/**
 * Get manual recurring overrides for a specific account.
 * TODO: Implement by reading from API or local config. Should return an array of
 * { name, amount, frequency, category } objects for manually-defined recurring
 * transactions that aren't auto-detected (e.g., rent, insurance, annual subscriptions).
 * @param {string} accountName - Account name to filter overrides
 * @returns {Array} Manual recurring overrides for the account
 */
export function getManualRecurringForAccount(accountName) {
  return [];
}

/**
 * Get merchant-specific recurring overrides.
 * TODO: Implement by reading from API or local config. Should return an override object
 * { name, amount?, frequency?, category? } to correct auto-detected recurring rules
 * for a specific merchant (e.g., override "AMZN" to "Amazon Prime").
 * @param {string} merchant - Merchant name to look up
 * @returns {Object|null} Override data or null if no override exists
 */
export function getMerchantOverride(merchant) {
  return null;
}
