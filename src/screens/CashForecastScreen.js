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
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 'Unknown';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const dt = new Date(+y, +m - 1, +d);
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  const textColor = color === 'green' ? colors.income
    : color === 'red' ? colors.expense
    : color === 'blue' ? '#60a5fa'
    : colors.text;

  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── TransactionRow ────────────────────────────────────────────────────────────
function TransactionRow({ tx }) {
  const isDebit = tx.amount > 0;
  const isProjected = !!tx.isProjected;
  const isCCPayment = !!tx.isCCPayment;
  const desc = tx.merchant_name || tx.name || 'Unknown';

  const rowBg = isCCPayment ? colors.ccPaymentRowBg : isProjected ? colors.projectedRowBg : colors.surface;
  const borderColor = isCCPayment ? colors.ccPaymentAccent : isProjected ? colors.projectedAccent : 'transparent';
  const dateColor = isCCPayment ? colors.ccPaymentAccent : isProjected ? colors.projectedAccent : colors.textSecondary;
  const amtColor = isDebit ? colors.expense : colors.income;

  return (
    <View style={[styles.txRow, { backgroundColor: rowBg, borderLeftColor: borderColor, borderLeftWidth: borderColor !== 'transparent' ? 3 : 0 }]}>
      <View style={styles.txLeft}>
        <Text style={[styles.txDate, { color: dateColor }]}>{fmtDate(tx.date)}</Text>
        <View style={styles.txDescRow}>
          {(isProjected || isCCPayment) && (
            <Ionicons
              name={isCCPayment ? 'card-outline' : 'repeat-outline'}
              size={12}
              color={isCCPayment ? '#fbbf24' : '#a78bfa'}
              style={{ marginRight: 4 }}
            />
          )}
          <Text style={styles.txDesc} numberOfLines={1}>{desc}</Text>
          {isProjected && !isCCPayment && (
            <Text style={styles.txBadge}> est.</Text>
          )}
          {isCCPayment && (
            <Text style={[styles.txBadge, { color: '#fbbf24' }]}> due</Text>
          )}
        </View>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: amtColor }]}>
          {isProjected || isCCPayment ? '~' : ''}{isDebit ? '-' : '+'}{fmt(Math.abs(tx.amount))}
        </Text>
        {tx.runningBalance != null && (
          <Text style={[styles.txBalance, {
            color: tx.runningBalance < 0 ? colors.expense : tx.runningBalance < 1000 ? colors.warning : colors.textSecondary,
          }]}>
            {fmt(tx.runningBalance)}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function CashForecastScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [forecastData, setForecastData] = useState(null);
  const [checkingAccounts, setCheckingAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedAccountName, setSelectedAccountName] = useState('Main Checking');

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const { accounts } = await api.getAccounts();
      const depAccounts = (accounts || []).filter(a => ['Main Checking', 'Rental'].includes(a.name));
      setCheckingAccounts(depAccounts);

      const checking = depAccounts.find(a => a.name === selectedAccountName) || depAccounts[0];
      if (!checking) throw new Error('No checking account found');
      setSelectedAccountId(checking.id);

      const data = await api.getForecastV2(checking.id, 60);
      setForecastData(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedAccountName]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Map server transaction fields to what TransactionRow expects
  const rows = (forecastData?.transactions || []).map(tx => ({
    ...tx,
    merchant_name: tx.merchant_display || tx.name,
    isProjected: tx.is_projected,
    isCCPayment: tx.is_cc_payment,
    runningBalance: tx.running_balance,
  }));

  const summary = forecastData?.summary || {};
  const settledCount = rows.filter(r => !r.is_projected).length;
  const projectedCount = rows.filter(r => r.is_projected).length;
  const hasProjected = projectedCount > 0;

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
        {!embedded && <View style={styles.header}>
          <Text style={styles.headerTitle}>Cash Forecast</Text>
          <Text style={styles.headerSub}>{monthLabel}</Text>
        </View>}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
        {!embedded && <View style={styles.header}>
          <Text style={styles.headerTitle}>Cash Forecast</Text>
        </View>}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.expense} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
      {/* Header */}
      {!embedded && <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Cash Forecast</Text>
          <Text style={styles.headerSub}>{monthLabel}</Text>
        </View>
        {checkingAccounts.length > 1 && (
          <View style={styles.accountPicker}>
            {checkingAccounts.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setSelectedAccountName(a.name)}
                style={[styles.accountChip, selectedAccountName === a.name && styles.accountChipActive]}
              >
                <Text style={[styles.accountChipText, selectedAccountName === a.name && styles.accountChipTextActive]}>
                  {a.name === 'Main Checking' ? 'Checking' : 'Rental'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Stat cards */}
        <View style={styles.statsGrid}>
          <StatCard label="Starting Balance" value={fmt(summary.starting_balance)} color="blue" />
          <StatCard label="Money In" value={fmt(summary.total_income)} color="green" />
          <StatCard label="Money Out" value={fmt(summary.total_expense)} color="red" />
          <StatCard
            label="End of Period Est."
            value={fmt(summary.ending_balance)}
            sub={summary.lowest_balance != null ? `Low: ${fmt(summary.lowest_balance)}` : null}
            color={summary.ending_balance < 0 ? 'red' : 'blue'}
          />
        </View>

        {/* Legend */}
        {hasProjected && (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.projectedAccent }]} />
              <Text style={styles.legendText}>Projected recurring</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.ccPaymentAccent }]} />
              <Text style={styles.legendText}>CC payment due</Text>
            </View>
          </View>
        )}

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {settledCount} settled · {projectedCount} projected
          </Text>
        </View>

        {/* Transaction list */}
        <View style={styles.txList}>
          {rows.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No transactions for {monthLabel}</Text>
            </View>
          ) : (
            <>
              <View style={styles.startingBalanceRow}>
                <Text style={styles.startingBalanceLabel}>Starting Balance</Text>
                <Text style={[styles.startingBalanceValue, { color: summary.starting_balance < 0 ? colors.expense : colors.text }]}>
                  {fmt(summary.starting_balance)}
                </Text>
              </View>
              {rows.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  accountPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  accountChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  accountChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  accountChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  accountChipTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  statSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  legend: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  summaryRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  summaryText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  txList: {
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  startingBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  startingBalanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    fontFamily: 'Inter',
  },
  startingBalanceValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  txLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  txDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txDesc: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
    flex: 1,
    fontFamily: 'Inter',
  },
  txBadge: {
    fontSize: 11,
    color: '#a78bfa',
    fontWeight: fontWeight.semibold,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontFamily: 'Manrope',
  },
  txBalance: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
  },
});
