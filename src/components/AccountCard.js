import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

function AccountItem({ account, total, onPress, isSelected }) {
  const pct = total > 0 ? (account.total_spending / total) * 100 : 0;
  const isCredit = account.type === 'credit';

  return (
    <TouchableOpacity
      style={[styles.item, isSelected && styles.itemSelected]}
      onPress={() => onPress?.(account)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, isCredit ? styles.iconCredit : styles.iconBank]}>
        <Ionicons
          name={isCredit ? 'card-outline' : 'business-outline'}
          size={16}
          color={isCredit ? '#60a5fa' : colors.income}
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.max(pct, 2)}%` }]} />
        </View>
      </View>

      <View style={styles.amounts}>
        <Text style={styles.amount}>{formatCurrency(account.total_spending)}</Text>
        <Text style={styles.pct}>{pct.toFixed(1)}%</Text>
      </View>
    </TouchableOpacity>
  );
}

export function AccountSpendingCard({ accountSpending = [], onAccountPress, selectedAccount }) {
  const creditCards = accountSpending.filter((a) => a.type === 'credit' && a.total_spending > 0);
  const bankAccounts = accountSpending.filter((a) => a.type === 'depository' && a.total_spending > 0);
  const total = accountSpending.reduce((s, a) => s + a.total_spending, 0);

  if (accountSpending.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Spending by Account</Text>
        <View style={styles.empty}>
          <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>No account data</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Spending by Account</Text>
        <Text style={styles.totalText}>{formatCurrency(total)}</Text>
      </View>

      {creditCards.length > 0 && (
        <>
          <Text style={styles.groupLabel}>CREDIT CARDS</Text>
          {creditCards.map((a) => (
            <AccountItem
              key={a.id}
              account={a}
              total={total}
              onPress={onAccountPress}
              isSelected={selectedAccount === a.name}
            />
          ))}
        </>
      )}

      {bankAccounts.length > 0 && (
        <>
          <Text style={styles.groupLabel}>BANK ACCOUNTS</Text>
          {bankAccounts.map((a) => (
            <AccountItem
              key={a.id}
              account={a}
              total={total}
              onPress={onAccountPress}
              isSelected={selectedAccount === a.name}
            />
          ))}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  groupLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  itemSelected: {
    backgroundColor: `${colors.primary}20`,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCredit: {
    backgroundColor: '#1e3a5f',
  },
  iconBank: {
    backgroundColor: '#0f2d24',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  bar: {
    height: 3,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  amounts: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pct: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
