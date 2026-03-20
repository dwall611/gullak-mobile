import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';

// Helper functions
function formatCurrency(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCategory(tx) {
  if (tx.override_category) return tx.override_category;
  if (tx.personal_finance_category) {
    try {
      const pfc = typeof tx.personal_finance_category === 'string'
        ? JSON.parse(tx.personal_finance_category)
        : tx.personal_finance_category;
      return pfc?.primary || 'Uncategorized';
    } catch {}
  }
  if (tx.category && Array.isArray(tx.category) && tx.category.length > 0) {
    return tx.category[0];
  }
  return 'Uncategorized';
}

function getCategorySpend(tx) {
  return tx.category_spend || 'Y';
}

function isLoanDisbursement(tx) {
  if (tx.personal_finance_category) {
    try {
      const pfc = typeof tx.personal_finance_category === 'string'
        ? JSON.parse(tx.personal_finance_category)
        : tx.personal_finance_category;
      return pfc?.detailed?.includes('LOAN_DISBURSEMENTS') ||
             pfc?.primary === 'LOAN_PAYMENTS' ||
             pfc?.detailed?.includes('LOAN_PAYMENTS') ||
             pfc?.primary === 'TRANSFER_OUT' ||
             pfc?.primary === 'TRANSFER_IN';
    } catch {}
  }
  return false;
}

function isExpense(tx) {
  const categorySpend = getCategorySpend(tx);
  if (categorySpend === 'N') return false;
  if (isLoanDisbursement(tx)) return false;
  if (tx.amount > 0) return true;
  return categorySpend === 'Y';
}

const EXCLUDE_PATTERNS = [
  /chase credit crd/i,
  /crcardpmt/i,
  /credit card payment/i,
  /autopay/i,
];

function isCreditCardPayment(tx) {
  const name = (tx.merchant_name || tx.name || '').toLowerCase();
  return EXCLUDE_PATTERNS.some(p => p.test(name));
}

// Stat Card Component
function StatCard({ label, value, sub, color, icon }) {
  const textColor = color === 'green' ? colors.income
    : color === 'red' ? colors.expense
    : color === 'blue' ? colors.balanceLine
    : color === 'amber' ? colors.ccPaymentAccent
    : colors.text;

  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon && <Ionicons name={icon} size={18} color={textColor} />}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// Category Bar Component
function CategoryBar({ category, amount, percentage, total }) {
  return (
    <View style={styles.categoryBar}>
      <View style={styles.categoryBarHeader}>
        <Text style={styles.categoryBarName}>{category}</Text>
        <Text style={styles.categoryBarAmount}>{formatCurrency(amount)}</Text>
      </View>
      <View style={styles.categoryBarTrack}>
        <View style={[styles.categoryBarFill, { width: `${Math.min(percentage, 100)}%` }]} />
      </View>
      <View style={styles.categoryBarFooter}>
        <Text style={styles.categoryBarPercentage}>{percentage.toFixed(1)}%</Text>
        <Text style={styles.categoryBarSub}>of {formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

export function CashBurnScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [totalBurn, setTotalBurn] = useState(0);

  const now = new Date();
  const startDate = formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const endDate = formatLocalDate(now);
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const loadData = useCallback(async () => {
    setError(null);
    try {
      // Get all transactions for this month
      const { transactions: txns } = await api.getTransactions({
        start_date: startDate,
        end_date: endDate,
        limit: 5000,
      });

      const allTxns = txns || [];
      setTransactions(allTxns);

      // Filter to expenses only (excluding CC payments and transfers)
      const expenseTxns = allTxns.filter(tx => 
        isExpense(tx) && 
        !isCreditCardPayment(tx) &&
        tx.account_name !== 'Rental' // Exclude rental account
      );

      // Calculate total burn
      const total = expenseTxns.reduce((sum, tx) => sum + tx.amount, 0);
      setTotalBurn(total);

      // Group by category
      const categoryMap = {};
      expenseTxns.forEach(tx => {
        const cat = getCategory(tx);
        if (!categoryMap[cat]) {
          categoryMap[cat] = { category: cat, amount: 0, count: 0 };
        }
        categoryMap[cat].amount += tx.amount;
        categoryMap[cat].count += 1;
      });

      const breakdown = Object.values(categoryMap)
        .map(item => ({
          ...item,
          percentage: total > 0 ? (item.amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      setCategoryBreakdown(breakdown);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Calculate days into month and burn rate
  const daysIntoMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDailyBurn = daysIntoMonth > 0 ? totalBurn / daysIntoMonth : 0;
  const projectedMonthlyBurn = avgDailyBurn * daysInMonth;
  const remainingDays = daysInMonth - daysIntoMonth;
  const projectedRemainingBurn = avgDailyBurn * remainingDays;

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
        {!embedded && <View style={styles.header}>
          <Text style={styles.headerTitle}>Cash Burn</Text>
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
          <Text style={styles.headerTitle}>Cash Burn</Text>
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
      {!embedded && <View style={styles.header}>
        <Text style={styles.headerTitle}>Cash Burn</Text>
        <Text style={styles.headerSub}>{monthLabel}</Text>
      </View>}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Progress indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Month Progress</Text>
            <Text style={styles.progressValue}>{daysIntoMonth} of {daysInMonth} days</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(daysIntoMonth / daysInMonth) * 100}%` }]} />
          </View>
        </View>

        {/* Stat cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Burn (MTD)"
            value={formatCurrency(totalBurn)}
            icon="flame"
            color="red"
          />
          <StatCard
            label="Avg Daily Burn"
            value={formatCurrency(avgDailyBurn)}
            icon="calendar-outline"
            color="amber"
          />
          <StatCard
            label="Projected Monthly"
            value={formatCurrency(projectedMonthlyBurn)}
            sub={`${remainingDays} days remaining`}
            icon="trending-up-outline"
            color="blue"
          />
          <StatCard
            label="Remaining Est."
            value={formatCurrency(projectedRemainingBurn)}
            sub="Based on current rate"
            icon="speedometer-outline"
            color="amber"
          />
        </View>

        {/* Category breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          {categoryBreakdown.length > 0 ? (
            categoryBreakdown.map((item) => (
              <CategoryBar
                key={item.category}
                category={item.category}
                amount={item.amount}
                percentage={item.percentage}
                total={totalBurn}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No spending data for this month</Text>
            </View>
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
  },
  progressSection: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    fontFamily: fontFamily.body,
  },
  progressValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.body,
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.outline,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
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
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: fontFamily.body,
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: fontFamily.body,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: 'Manrope',
    marginBottom: spacing.md,
  },
  categoryBar: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBarName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  categoryBarAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.expense,
  },
  categoryBarTrack: {
    height: 6,
    backgroundColor: colors.outline,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  categoryBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBarPercentage: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  categoryBarSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
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
    fontFamily: fontFamily.body,
  },
});
