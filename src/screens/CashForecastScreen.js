import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';
import { getManualRecurringForAccount, getMerchantOverride } from '../config/recurring-transactions';

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

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const STOP_WORDS = new Set(['payment', 'orig', 'entry', 'descr', 'name', 'from', 'with', 'bank', 'card', 'corp', 'inc', 'llc']);

function extractKeyword(merchant) {
  const words = merchant
    .toLowerCase()
    .split(/[\s,_]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  return words[0] || '';
}

function merchantMatches(recurringMerchant, txName) {
  const kw = extractKeyword(recurringMerchant);
  if (!kw) return false;
  return txName.toLowerCase().includes(kw);
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

  const [transactions, setTransactions] = useState([]);
  const [projected, setProjected] = useState([]);
  const [account, setAccount] = useState(null);
  const [checkingAccounts, setCheckingAccounts] = useState([]);
  const [selectedAccountName, setSelectedAccountName] = useState('Main Checking');

  const now = new Date();
  const todayStr = formatDateStr(now);
  const startDate = formatDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
  const endDate = formatDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const projectionEndDate = formatDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 5));
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const currentMonthStr = startDate.substring(0, 7);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const { accounts } = await api.getAccounts();
      const depAccounts = (accounts || []).filter(a => ['Main Checking', 'Rental'].includes(a.name));
      setCheckingAccounts(depAccounts);
      const checking = depAccounts.find(a => a.name === selectedAccountName) || depAccounts[0];
      if (!checking) throw new Error('No checking account found');
      setAccount(checking);

      const { transactions: txns } = await api.getTransactions({
        account_id: checking.id,
        start_date: startDate,
        end_date: endDate,
        limit: 500,
      });
      const actualTxns = txns || [];
      setTransactions(actualTxns);

      // Projected recurring
      const recurringResp = await api.getRecurringTransactions(3);
      const allRecurring = recurringResp?.data || [];
      const mainRecurring = allRecurring.filter((r) => r.account === checking.name);

      const projectedRows = [];

      const interval = (rec) => {
        const avg = rec.avgInterval;
        if (avg == null || isNaN(avg) || avg <= 0) return 30;
        return Math.max(Math.round(avg), 7);
      };

      // Get manual recurring transactions from shared config (matching dashboard)
      const MANUAL_RECURRING = getManualRecurringForAccount(checking.name);

      const generateDates = (rec) => {
        const override = getMerchantOverride(rec.merchant);
        const dom = rec.dayOfMonth ?? rec.day_of_month ?? (override?.dayOfMonth);

        if (dom != null && !isNaN(dom)) {
          const dates = [];
          for (let mo = 0; mo <= 1; mo++) {
            const d = new Date(now.getFullYear(), now.getMonth() + mo, dom);
            const dStr = formatDateStr(d);
            if (dStr > projectionEndDate) break;
            if (dStr <= todayStr) continue;
            if (override?.skipMonths?.includes(d.getMonth())) continue;
            dates.push(dStr);
          }
          return dates;
        }

        if (!rec.nextExpected) return [];
        let cursor = new Date(rec.nextExpected);
        if (isNaN(cursor.getTime())) return [];
        const step = interval(rec);
        while (formatDateStr(cursor) <= todayStr) {
          cursor = addDays(cursor, step);
        }
        const dates = [];
        while (true) {
          const d = formatDateStr(cursor);
          if (d > projectionEndDate) break;
          dates.push(d);
          cursor = addDays(cursor, step);
        }
        return dates;
      };

      // Process auto-detected recurring transactions
      for (const rec of mainRecurring) {
        const override = getMerchantOverride(rec.merchant);
        const alreadyPaidThisMonth = actualTxns.some((tx) =>
          merchantMatches(rec.merchant, tx.merchant_name || tx.name || '')
        );
        const step = interval(rec);

        for (const projDateStr of generateDates(rec)) {
          // For monthly recurrences already paid this month, skip ONLY if the
          // projected date is still within the current month
          if (alreadyPaidThisMonth && step >= 28 && projDateStr.substring(0, 7) === currentMonthStr) continue;

          projectedRows.push({
            id: `proj-${rec.merchant}-${projDateStr}`,
            date: projDateStr,
            name: rec.merchant,
            merchant_name: rec.merchant,
            amount: override?.amount ?? rec.avgAmount,
            isProjected: true,
          });
        }
      }

      // Process manual recurring entries
      for (const manual of MANUAL_RECURRING) {
        const alreadyPaid = actualTxns.some((tx) =>
          (tx.merchant_name || tx.name || '').toLowerCase().includes(manual.keyword)
        );

        for (let mo = 0; mo <= 1; mo++) {
          const d = new Date(now.getFullYear(), now.getMonth() + mo, manual.dayOfMonth);
          const dStr = formatDateStr(d);
          if (dStr <= todayStr || dStr > projectionEndDate) continue;
          if (manual.skipMonths?.includes(d.getMonth())) continue;
          // Skip current month if already paid this month
          if (alreadyPaid && dStr.substring(0, 7) === currentMonthStr) continue;

          projectedRows.push({
            id: `manual-${manual.id}-${dStr}`,
            date: dStr,
            name: manual.merchant,
            merchant_name: manual.merchant,
            amount: manual.amount,
            isProjected: true,
          });
        }
      }

      // CC payments
      if (checking.name === 'Main Checking') {
        try {
          const liabResp = await api.getLiabilities();
          const creditCards = liabResp?.credit_cards || [];
          for (const cc of creditCards) {
            const dueDate = cc.next_payment_due_date;
            const stmtBal = cc.last_statement_balance;
            if (!dueDate || !stmtBal || stmtBal <= 0) continue;
            if (dueDate <= todayStr || dueDate > projectionEndDate) continue;
            if (cc.payment_recorded) continue; // Skip if payment already recorded (cc_payment_tracking)
            const mask = cc.mask;
            const instName = (cc.institution_name || cc.account_name || '').toLowerCase();
            const alreadyPaid = actualTxns.some((tx) => {
              const name = (tx.merchant_name || tx.name || '').toLowerCase();
              return (mask && name.includes(mask)) || (instName && name.includes(instName.split(' ')[0]));
            });
            if (alreadyPaid) continue;
            projectedRows.push({
              id: `cc-${cc.account_id}-${dueDate}`,
              date: dueDate,
              name: `${cc.account_name} payment`,
              merchant_name: `${cc.account_name} payment`,
              amount: stmtBal,
              isProjected: true,
              isCCPayment: true,
            });
          }
        } catch (_) {}
      }

      setProjected(projectedRows);
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

  const allRows = useMemo(
    () => [...transactions, ...projected].sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0),
    [transactions, projected]
  );

  const currentBalance = account?.current_balance ?? 0;
  const yesterday = formatDateStr(addDays(now, -1));

  const rowsWithBalance = useMemo(() => {
    if (allRows.length === 0) return [];
    let anchorIdx = -1;
    for (let i = allRows.length - 1; i >= 0; i--) {
      if (!allRows[i].isProjected && !allRows[i].isCCPayment && allRows[i].date <= yesterday) {
        anchorIdx = i;
        break;
      }
    }
    const balances = new Array(allRows.length);
    if (anchorIdx === -1) {
      const todayActual = allRows.filter(r => !r.isProjected && !r.isCCPayment && r.date >= todayStr);
      let bal = currentBalance + todayActual.reduce((s, r) => s + r.amount, 0);
      for (let i = 0; i < allRows.length; i++) {
        bal = bal - allRows[i].amount;
        balances[i] = bal;
      }
    } else {
      balances[anchorIdx] = currentBalance;
      for (let i = anchorIdx + 1; i < allRows.length; i++) balances[i] = balances[i - 1] - allRows[i].amount;
      for (let i = anchorIdx - 1; i >= 0; i--) balances[i] = balances[i + 1] + allRows[i + 1].amount;
    }
    return allRows.map((tx, idx) => ({ ...tx, runningBalance: balances[idx] }));
  }, [allRows, currentBalance, yesterday]);

  const totalDebits = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalCredits = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const projDebits = projected.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const projCredits = projected.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const netChange = totalCredits - totalDebits;

  const endOfMonthBalance = rowsWithBalance.length > 0
    ? rowsWithBalance[rowsWithBalance.length - 1].runningBalance
    : currentBalance;

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
          <StatCard label="Current Balance" value={fmt(currentBalance)} sub={account?.available_balance != null ? `Avail: ${fmt(account.available_balance)}` : null} color="blue" />
          <StatCard label="Money In" value={fmt(totalCredits)} sub={projCredits > 0 ? `+${fmt(projCredits)} projected` : null} color="green" />
          <StatCard label="Money Out" value={fmt(totalDebits)} sub={projDebits > 0 ? `+${fmt(projDebits)} projected` : null} color="red" />
          <StatCard
            label="End of Month Est."
            value={fmt(endOfMonthBalance)}
            sub={netChange >= 0 ? '↑ net inflow' : '↓ net outflow'}
            color={endOfMonthBalance < 0 ? 'red' : 'blue'}
          />
        </View>

        {/* Legend */}
        {projected.length > 0 && (
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
            {transactions.length} settled · {projected.length} projected
          </Text>
        </View>

        {/* Transaction list */}
        <View style={styles.txList}>
          {rowsWithBalance.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
              <Text style={styles.emptyText}>No transactions for {monthLabel}</Text>
            </View>
          ) : (
            <>
              {/* Starting Balance Header */}
              <View style={styles.startingBalanceRow}>
                <Text style={styles.startingBalanceLabel}>Starting Balance</Text>
                <Text style={[styles.startingBalanceValue, { color: currentBalance < 0 ? colors.expense : colors.text }]}>
                  {fmt(currentBalance)}
                </Text>
              </View>
              {rowsWithBalance.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
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
