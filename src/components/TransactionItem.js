import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { formatCurrency, formatRelativeDate, getAccountName } from '../utils/helpers';
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

export function TransactionItem({ 
  transaction: tx, 
  onPress, 
  selectionMode = false, 
  isSelected = false, 
  onToggleSelect,
  onLongPress,
}) {
  // Use enriched category directly from API response
  const category = tx.category || tx.override_category || 'Uncategorized';
  // Use server-resolved merchant display name from API response
  const merchant = tx.merchant_display_name || 'Unknown';
  const account = getAccountName(tx);
  const isExpense = tx.amount > 0;
  const isIncome = tx.amount < 0;

  // Show indicators for recurring and category override
  const isRecurring = tx.is_recurring === 1;
  const hasOverride = tx.override_category != null;

  const handleLongPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Medium);
    onLongPress?.(tx);
  };

  const handlePress = () => {
    if (selectionMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleSelect?.(tx);
    } else {
      onPress?.(tx);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        isSelected && styles.containerSelected,
      ]} 
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={400}
      activeOpacity={0.7}
    >
      {selectionMode && (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={14} color="#fff" />
          )}
        </View>
      )}

      <View style={styles.iconBox}>
        <Text style={styles.icon}>{getCategoryIcon(category)}</Text>
      </View>

      <View style={styles.main}>
        <View style={styles.topRow}>
          <Text style={styles.merchant} numberOfLines={1}>{merchant}</Text>
          <View style={styles.dateBadge}>
            <Text style={styles.date}>{formatRelativeDate(tx.date)}</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.category}>{category}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.account} numberOfLines={1}>{account}</Text>
          {(isRecurring || hasOverride) && (
            <>
              <Text style={styles.dot}>·</Text>
              <View style={styles.indicators}>
                {isRecurring && (
                  <Ionicons name="refresh" size={10} color={colors.income} style={styles.indicator} />
                )}
                {hasOverride && (
                  <Ionicons name="pencil" size={10} color={colors.primary} style={styles.indicator} />
                )}
              </View>
            </>
          )}
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
        {!selectionMode && (
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
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
  containerSelected: {
    backgroundColor: `${colors.primary}15`,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  merchant: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  dateBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  date: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
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
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    marginHorizontal: 1,
  },
  right: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 4,
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
});
