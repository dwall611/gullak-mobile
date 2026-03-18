import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { formatCurrency, formatCompact, getDateRange, getAvailableMonths, getCategoryColor } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const screenWidth = Dimensions.get('window').width;

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function CategoryRow({ category, amount, total, index }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  const barColor = getCategoryColor(index);
  return (
    <View style={styles.categoryRow}>
      <View style={[styles.categoryDot, { backgroundColor: barColor }]} />
      <View style={styles.categoryInfo}>
        <View style={styles.categoryNameRow}>
          <Text style={styles.categoryName} numberOfLines={1}>{category}</Text>
          <Text style={styles.categoryAmt}>{formatCompact(amount)}</Text>
        </View>
        <View style={styles.categoryBar}>
          <View
            style={[
              styles.categoryBarFill,
              { width: `${Math.max(pct, 1)}%`, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={styles.categoryPct}>{pct.toFixed(1)}%</Text>
      </View>
    </View>
  );
}

export function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateRange, setDateRange] = useState('mtd');
  const [selectedMonth, setSelectedMonth] = useState('');
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const [categoryTotals, setCategoryTotals] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [topMerchants, setTopMerchants] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const { start_date, end_date } = getDateRange(
        selectedMonth ? 'month' : dateRange,
        selectedMonth
      );

      const [catData, trends, merchants] = await Promise.all([
        api.getSpendingByCategory(start_date, end_date, false),
        api.getSpendingTrends(6),
        api.getTopMerchants(start_date, end_date, 10),
      ]);

      const cats = (catData.data || [])
        .map((d) => ({ category: d.category_name, amount: d.total || 0 }))
        .filter((d) => d.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      setCategoryTotals(cats);

      setTrendsData(trends.data || []);
      setTopMerchants(merchants.data || []);
    } catch (err) {
      console.error('Error loading analytics:', err);
    }
  }, [dateRange, selectedMonth]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const totalSpend = useMemo(
    () => categoryTotals.reduce((s, c) => s + c.amount, 0),
    [categoryTotals]
  );

  // Build trends chart data (last 6 months)
  const trendsChartData = useMemo(() => {
    if (!trendsData.length) return null;
    const sorted = [...trendsData].sort((a, b) => a.month?.localeCompare(b.month));
    const labels = sorted.map((d) => {
      const [y, m] = (d.month || '').split('-');
      if (!m) return '';
      const date = new Date(parseInt(y), parseInt(m) - 1, 1);
      return date.toLocaleDateString('en-US', { month: 'short' });
    });
    return {
      labels,
      datasets: [
        {
          data: sorted.map((d) => Math.abs(d.expenses || 0)),
          color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
          strokeWidth: 2,
        },
        {
          data: sorted.map((d) => Math.abs(d.income || 0)),
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 2,
        },
      ],
      legend: ['Expenses', 'Income'],
    };
  }, [trendsData]);

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.textSecondary,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      stroke: colors.cardBorder,
      strokeWidth: 1,
    },
    formatYLabel: (v) => formatCompact(parseFloat(v)),
    propsForDots: {
      r: '3',
    },
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      <DateRangeSelector
        selected={selectedMonth ? 'month' : dateRange}
        onSelect={(v) => { setDateRange(v); setSelectedMonth(''); }}
        months={availableMonths.slice(0, 6)}
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => {
          setSelectedMonth(m === selectedMonth ? '' : m);
          if (m !== selectedMonth) setDateRange('month');
        }}
      />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Income vs Expenses Trends */}
          {trendsChartData && (
            <View style={styles.card}>
              <SectionTitle title="Income vs Expenses (6 months)" />
              <LineChart
                data={trendsChartData}
                width={screenWidth - spacing.md * 2 - spacing.md * 2}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withDots
                withShadow={false}
                legend={trendsChartData.legend}
              />
            </View>
          )}

          {/* Spending by Category */}
          {categoryTotals.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <SectionTitle title="Spending by Category" />
                <Text style={styles.totalText}>{formatCurrency(totalSpend)}</Text>
              </View>
              {categoryTotals.slice(0, 12).map((c, i) => (
                <CategoryRow
                  key={c.category}
                  category={c.category}
                  amount={c.amount}
                  total={totalSpend}
                  index={i}
                />
              ))}
            </View>
          )}

          {/* Top Merchants */}
          {topMerchants.length > 0 && (
            <View style={styles.card}>
              <SectionTitle title="Top Merchants" />
              {topMerchants.slice(0, 10).map((m, i) => (
                <View key={m.merchant_name || i} style={styles.merchantRow}>
                  <View style={styles.merchantRank}>
                    <Text style={styles.merchantRankText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.merchantName} numberOfLines={1}>
                    {m.merchant_name || 'Unknown'}
                  </Text>
                  <View style={styles.merchantRight}>
                    <Text style={styles.merchantAmt}>{formatCurrency(m.total_amount || 0)}</Text>
                    <Text style={styles.merchantCount}>{m.transaction_count} txns</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {categoryTotals.length === 0 && topMerchants.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No analytics data for this period</Text>
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  totalText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  chart: {
    borderRadius: radius.sm,
    marginHorizontal: -spacing.sm,
  },

  // Category rows
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    gap: spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    flexShrink: 0,
  },
  categoryInfo: {
    flex: 1,
    gap: 3,
  },
  categoryNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  categoryAmt: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  categoryBar: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  categoryPct: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Merchant rows
  merchantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.separator,
  },
  merchantRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantRankText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  merchantName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  merchantRight: {
    alignItems: 'flex-end',
  },
  merchantAmt: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  merchantCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
