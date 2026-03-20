import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const screenWidth = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null || isNaN(n)) return '$0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtFull(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateQuarterly(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear().toString().slice(-2);
  return `${month} '${year}`;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }) {
  const textColor = color === 'green' ? colors.income
    : color === 'red' ? colors.expense
    : color === 'blue' ? '#60a5fa'
    : color === 'purple' ? '#a78bfa'
    : colors.text;

  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        {icon && <Ionicons name={icon} size={16} color={textColor} />}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── PortfolioChart ───────────────────────────────────────────────────────────
function PortfolioChart({ history }) {
  if (!history || history.length < 2) return null;

  // Sample data to avoid overcrowding
  const sampled = history.length > 15
    ? history.filter((_, i) => i % Math.ceil(history.length / 15) === 0 || i === history.length - 1)
    : history;

  // Show labels only at quarterly intervals (every ~3rd point) to avoid overlap
  const labelInterval = Math.max(1, Math.floor(sampled.length / 5));
  const labels = sampled.map((h, i) => {
    // Show first, last, and every labelInterval points
    if (i === 0 || i === sampled.length - 1 || i % labelInterval === 0) {
      return fmtDateQuarterly(h.date);
    }
    return '';
  });
  const values = sampled.map(h => h.total_value ?? 0);

  const chartData = {
    labels,
    datasets: [{
      data: values,
      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.textSecondary,
    strokeWidth: 2,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      stroke: colors.cardBorder,
      strokeWidth: 1,
    },
    formatYLabel: (v) => fmt(parseFloat(v)),
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Portfolio Value</Text>
      <LineChart
        data={chartData}
        width={screenWidth - spacing.md * 2 - spacing.md * 2}
        height={160}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withDots={false}
        withInnerLines
        withOuterLines={false}
        withVerticalLines={false}
      />
    </View>
  );
}

// ─── HoldingsTable ────────────────────────────────────────────────────────────
function HoldingsTable({ holdings }) {
  if (!holdings || holdings.length === 0) return null;

  // Flatten holdings into rows
  const rows = [];
  holdings.forEach(institution => {
    (institution.accounts || []).forEach(account => {
      (account.holdings || []).forEach(holding => {
        rows.push({
          institution: institution.institution_name,
          account: account.account_name,
          date: holding.updated_at,
          name: holding.name,
          ticker: holding.ticker,
          quantity: holding.quantity,
          value: holding.value,
        });
      });
    });
  });

  if (rows.length === 0) return null;

  return (
    <View style={styles.tableContainer}>
      <Text style={styles.tableTitle}>Holdings</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Account</Text>
        <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Qty</Text>
        <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Value</Text>
      </View>
      <ScrollView horizontal={false}>
        {rows.map((row, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{row.account}</Text>
            <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
              {row.ticker || row.name}
            </Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{row.quantity?.toFixed(2) || '-'}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: colors.income }]}>
              {fmt(row.value)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function InvestmentsScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [history, setHistory] = useState([]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [holdingsData, historyData] = await Promise.all([
        api.getInvestmentHoldings(),
        api.getPortfolioHistory(730),
      ]);
      setHoldings(holdingsData.holdings || []);
      setHistory(historyData.history || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Calculate summary stats
  const stats = useMemo(() => {
    let totalValue = 0;
    let accountCount = 0;
    let holdingCount = 0;

    holdings.forEach(institution => {
      totalValue += institution.total_value || 0;
      accountCount += (institution.accounts || []).length;
      (institution.accounts || []).forEach(account => {
        holdingCount += (account.holdings || []).length;
      });
    });

    // Calculate change from history
    let change = 0;
    let changePct = 0;
    if (history.length >= 2) {
      const latest = history[history.length - 1]?.total_value || 0;
      const oldest = history[0]?.total_value || 0;
      change = latest - oldest;
      changePct = oldest > 0 ? ((change / oldest) * 100) : 0;
    }

    return { totalValue, accountCount, holdingCount, change, changePct };
  }, [holdings, history]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
        {!embedded && <View style={styles.header}>
          <Text style={styles.headerTitle}>Investments</Text>
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
          <Text style={styles.headerTitle}>Investments</Text>
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
        <Text style={styles.headerTitle}>Investments</Text>
        <Text style={styles.headerSub}>Portfolio Overview</Text>
      </View>}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Stat cards */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Value"
            value={fmtFull(stats.totalValue)}
            sub={stats.changePct >= 0 ? `+${stats.changePct.toFixed(1)}% (2Y)` : `${stats.changePct.toFixed(1)}% (2Y)`}
            icon="trending-up"
            color={stats.change >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="Accounts"
            value={stats.accountCount.toString()}
            sub="Investment accounts"
            icon="wallet-outline"
            color="blue"
          />
          <StatCard
            label="Holdings"
            value={stats.holdingCount.toString()}
            sub="Total positions"
            icon="pie-chart-outline"
            color="purple"
          />
          <StatCard
            label="2Y Change"
            value={stats.change >= 0 ? `+${fmt(stats.change)}` : fmt(stats.change)}
            sub={stats.change >= 0 ? 'Gain' : 'Loss'}
            icon={stats.change >= 0 ? 'arrow-up-outline' : 'arrow-down-outline'}
            color={stats.change >= 0 ? 'green' : 'red'}
          />
        </View>

        {/* Chart */}
        {history.length >= 2 && <PortfolioChart history={history} />}

        {/* Institution breakdown */}
        {holdings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Institution</Text>
            {holdings.map((inst, idx) => (
              <View key={inst.institution_id || idx} style={styles.institutionCard}>
                <View style={styles.institutionHeader}>
                  <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.institutionName}>{inst.institution_name}</Text>
                  <Text style={styles.institutionValue}>{fmtFull(inst.total_value)}</Text>
                </View>
                {(inst.accounts || []).map((account, aIdx) => (
                  <View key={account.account_id || aIdx} style={styles.accountRow}>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.account_name}</Text>
                      <Text style={styles.accountType}>{account.account_subtype || account.account_type}</Text>
                    </View>
                    <Text style={styles.accountValue}>{fmtFull(account.total_value)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Holdings table */}
        <HoldingsTable holdings={holdings} />

        {holdings.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No investment holdings found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
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
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
  },
  chartCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: radius.md,
    marginHorizontal: -spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  institutionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  institutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  institutionName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  institutionValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    marginTop: spacing.xs,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  accountType: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  accountValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tableContainer: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.md,
  },
  tableTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: spacing.xs,
  },
  tableHeaderCell: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  tableCell: {
    fontSize: fontSize.xs,
    color: colors.text,
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
