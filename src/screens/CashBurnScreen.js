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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const date = new Date(+y, +m - 1, +d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [totalBurn, setTotalBurn] = useState(0);
  const [burnData, setBurnData] = useState(null);

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const loadData = useCallback(async () => {
    setError(null);
    try {
      // Use the burn-rate API — it returns pre-computed summary and itemized categories
      const burnRate = await api.getBurnRate(month);
      setBurnData(burnRate);

      // Use summary values from API (pre-computed)
      const summary = burnRate.summary || {};
      const fixed = summary.fixed_expenses || 0;
      const discretionary = summary.discretionary_spent || 0;
      const total = fixed + discretionary;
      setTotalBurn(total);

      // Build category breakdown from discretionary + fixed_items (API returns 'discretionary', not 'discretionary_items')
      const allItems = [
        ...(burnRate.discretionary || []),
        ...(burnRate.fixed_items || []),
      ];

      const categoryMap = {};
      allItems.forEach(item => {
        const cat = item.category || item.name || 'Uncategorized';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { category: cat, amount: 0, count: 0 };
        }
        categoryMap[cat].amount += Math.abs(item.amount);
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
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Use API's pre-computed values where available (from summary)
  // Fall back to local calculation if summary is not available
  const summary = (categoryBreakdown.length > 0 ? {} : {}); // placeholder - we'll get summary from state in real implementation
  
  // Calculate days into month and projected burn rate (client-side as fallback)
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

        {/* Income Section */}
        {burnData && burnData.income_items && burnData.income_items.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Income</Text>
              <Text style={styles.sectionTotal}>
                Received: {formatCurrency(burnData.income_items.reduce((s, i) => s + Math.abs(i.amount), 0))}
              </Text>
            </View>
            {burnData.income_items.map((item, idx) => (
              <View key={item.id || idx} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.income} style={styles.itemIcon} />
                  <Text style={styles.itemName}>{item.merchant || item.name || 'Income'}</Text>
                </View>
                <View style={styles.itemRight}>
                  <Text style={[styles.itemAmount, { color: colors.income }]}>
                    {formatCurrency(Math.abs(item.amount))}
                  </Text>
                  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Fixed Outflows Section */}
        {burnData && burnData.fixed_items && burnData.fixed_items.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Fixed Outflows</Text>
              {(() => {
                const paidTotal = burnData.fixed_items.filter(i => !i.projected).reduce((s, i) => s + Math.abs(i.amount), 0);
                const projTotal = burnData.fixed_items.filter(i => i.projected).reduce((s, i) => s + Math.abs(i.amount), 0);
                const expectedTotal = paidTotal + projTotal;
                return projTotal > 0 ? (
                  <Text style={styles.sectionTotal}>
                    Expected: <Text style={{ color: colors.expense }}>{formatCurrency(expectedTotal)}</Text>
                    {' '}(of which {formatCurrency(paidTotal)} paid)
                  </Text>
                ) : (
                  <Text style={styles.sectionTotal}>
                    Paid: <Text style={{ color: colors.expense }}>{formatCurrency(paidTotal)}</Text>
                  </Text>
                );
              })()}
            </View>
            {[...burnData.fixed_items]
              .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
              .map((item, idx) => (
                <View 
                  key={item.id || idx} 
                  style={[styles.itemRow, item.projected && styles.projectedItem]}
                >
                  <View style={styles.itemInfo}>
                    {item.projected ? (
                      <Ionicons name="time-outline" size={16} color="#a78bfa" style={styles.itemIcon} />
                    ) : (
                      <Ionicons name="checkmark-circle" size={16} color={colors.income} style={styles.itemIcon} />
                    )}
                    <Text style={[styles.itemName, item.projected && styles.projectedText]}>
                      {item.merchant || item.name || 'Fixed'}
                    </Text>
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={[
                      styles.itemAmount, 
                      { color: item.projected ? '#a78bfa' : colors.expense }
                    ]}>
                      {formatCurrency(Math.abs(item.amount))}
                    </Text>
                    <Text style={[styles.itemDate, item.projected && { color: '#a78bfa' }]}>
                      {item.projected 
                        ? `expected ${formatDate(item.date)}` 
                        : formatDate(item.date)
                      }
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  sectionTotal: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontFamily.body,
  },
  itemRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: spacing.sm,
  },
  itemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  itemDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  projectedItem: {
    opacity: 0.7,
  },
  projectedText: {
    fontStyle: 'italic',
    color: colors.textMuted,
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
