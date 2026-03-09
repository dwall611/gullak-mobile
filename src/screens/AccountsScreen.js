import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { formatCurrency } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

function AccountCard({ account }) {
  const isCredit = account.type === 'credit';
  const balance = account.current_balance ?? account.balance_current ?? 0;
  const available = account.available_balance ?? account.balance_available;
  const limit = account.balance_limit;

  // For credit: balance = amount owed (positive = debt)
  // For depository: balance = available funds
  const displayBalance = isCredit ? -balance : balance;
  const balanceColor = isCredit
    ? (balance > 0 ? colors.expense : colors.income)
    : colors.income;

  const utilizationPct = isCredit && limit && balance > 0
    ? (balance / limit) * 100
    : null;

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountCardHeader}>
        <View style={[styles.accountIcon, isCredit ? styles.accountIconCredit : styles.accountIconBank]}>
          <Ionicons
            name={isCredit ? 'card-outline' : 'business-outline'}
            size={20}
            color={isCredit ? '#60a5fa' : colors.income}
          />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
          <Text style={styles.accountMeta}>
            {account.institution_name}
            {account.mask ? ` ••••${account.mask}` : ''}
          </Text>
        </View>
        <View style={styles.accountBalanceBox}>
          <Text style={[styles.accountBalance, { color: balanceColor }]}>
            {isCredit && balance > 0 ? '-' : ''}{formatCurrency(Math.abs(displayBalance))}
          </Text>
          <Text style={styles.accountBalanceLabel}>
            {isCredit ? 'Balance owed' : 'Available'}
          </Text>
        </View>
      </View>

      {isCredit && limit && (
        <View style={styles.creditDetails}>
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Credit Limit</Text>
            <Text style={styles.creditValue}>{formatCurrency(limit)}</Text>
          </View>
          {available != null && (
            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>Available Credit</Text>
              <Text style={[styles.creditValue, { color: colors.income }]}>{formatCurrency(available)}</Text>
            </View>
          )}
          {utilizationPct != null && (
            <View style={styles.utilization}>
              <View style={styles.utilizationBar}>
                <View
                  style={[
                    styles.utilizationFill,
                    {
                      width: `${Math.min(utilizationPct, 100)}%`,
                      backgroundColor: utilizationPct > 80 ? colors.expense : utilizationPct > 50 ? colors.warning : colors.income,
                    },
                  ]}
                />
              </View>
              <Text style={styles.utilizationText}>{utilizationPct.toFixed(1)}% utilized</Text>
            </View>
          )}
        </View>
      )}

      {!isCredit && available != null && available !== balance && (
        <View style={styles.creditDetails}>
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Current Balance</Text>
            <Text style={styles.creditValue}>{formatCurrency(balance)}</Text>
          </View>
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Available Balance</Text>
            <Text style={[styles.creditValue, { color: colors.income }]}>{formatCurrency(available)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function AccountsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState([]);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAccounts().finally(() => setLoading(false));
  }, [loadAccounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }, [loadAccounts]);

  const creditAccounts = accounts.filter((a) => a.type === 'credit');
  const depositoryAccounts = accounts.filter((a) => a.type === 'depository');
  const otherAccounts = accounts.filter((a) => a.type !== 'credit' && a.type !== 'depository');

  const totalCreditOwed = creditAccounts.reduce((s, a) => {
    const bal = a.current_balance ?? a.balance_current ?? 0;
    return s + Math.max(bal, 0); // positive = amount owed
  }, 0);

  const totalDepositoryBalance = depositoryAccounts.reduce((s, a) => {
    return s + (a.current_balance ?? a.balance_current ?? 0);
  }, 0);

  const netWorth = totalDepositoryBalance - totalCreditOwed;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Accounts</Text>
        <Text style={styles.accountCount}>{accounts.length} accounts</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Summary row */}
          {accounts.length > 0 && (
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total in Bank</Text>
                <Text style={[styles.summaryValue, { color: colors.income }]}>
                  {formatCurrency(totalDepositoryBalance)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>CC Balance Owed</Text>
                <Text style={[styles.summaryValue, { color: totalCreditOwed > 0 ? colors.expense : colors.income }]}>
                  {formatCurrency(totalCreditOwed)}
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Net Position</Text>
                <Text style={[styles.summaryValue, { color: netWorth >= 0 ? '#60a5fa' : colors.expense }]}>
                  {netWorth >= 0 ? '' : '-'}{formatCurrency(Math.abs(netWorth))}
                </Text>
              </View>
            </View>
          )}

          {/* Credit Cards */}
          {creditAccounts.length > 0 && (
            <>
              <Text style={styles.groupTitle}>Credit Cards</Text>
              {creditAccounts.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </>
          )}

          {/* Bank Accounts */}
          {depositoryAccounts.length > 0 && (
            <>
              <Text style={styles.groupTitle}>Bank Accounts</Text>
              {depositoryAccounts.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </>
          )}

          {/* Other */}
          {otherAccounts.length > 0 && (
            <>
              <Text style={styles.groupTitle}>Other</Text>
              {otherAccounts.map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </>
          )}

          {accounts.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No accounts</Text>
              <Text style={styles.emptyDesc}>Connect accounts via the web dashboard</Text>
            </View>
          )}

          <View style={{ height: insets.bottom + spacing.xl }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  accountCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  groupTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  accountCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountIconCredit: {
    backgroundColor: '#1e3a5f',
  },
  accountIconBank: {
    backgroundColor: '#0f2d24',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  accountMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  accountBalanceBox: {
    alignItems: 'flex-end',
  },
  accountBalance: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  accountBalanceLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  creditDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.separator,
    gap: 4,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  creditValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  utilization: {
    marginTop: 4,
    gap: 3,
  },
  utilizationBar: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  utilizationFill: {
    height: '100%',
    borderRadius: 2,
  },
  utilizationText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
