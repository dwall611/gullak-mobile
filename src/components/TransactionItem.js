import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency, formatShortDate, getTransactionCategory, getMerchantName, getAccountName } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const CATEGORY_ICONS = {
  'Food & Dining': '🍕',
  'Transportation': '🚗',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Travel': '✈️',
  'Personal Care': '💆',
  'Healthcare': '🏥',
  'Housing': '🏠',
  'Home': '🏡',
  'Bills & Utilities': '💡',
  'Income': '💰',
  'Transfer': '↔️',
  'Credit Card Payments': '💳',
  'Bank Fees': '🏦',
  'Government': '🏛️',
  'Services': '🔧',
  'Groceries': '🛒',
  'Education': '📚',
  'Uncategorized': '📋',
};

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || '📋';
}

export function TransactionItem({ transaction: tx }) {
  const category = getTransactionCategory(tx);
  const merchant = getMerchantName(tx);
  const account = getAccountName(tx);
  const isExpense = tx.amount > 0;
  const isIncome = tx.amount < 0;

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Text style={styles.icon}>{getCategoryIcon(category)}</Text>
      </View>

      <View style={styles.main}>
        <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
        <View style={styles.meta}>
          <Text style={styles.category}>{category}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.account} numberOfLines={1}>{account}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[
          styles.amount,
          isIncome && styles.amountIncome,
          isExpense && styles.amountExpense,
        ]}>
          {isExpense ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
        </Text>
        <Text style={styles.date}>{formatShortDate(tx.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  icon: {
    fontSize: 18,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  merchant: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  category: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dot: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  account: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  amountExpense: {
    color: colors.expense,
  },
  amountIncome: {
    color: colors.income,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
