import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatCurrency, formatCompact } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

function StatCard({ title, value, subtitle, valueColor, bgColor, icon }) {
  return (
    <View style={[styles.card, { backgroundColor: bgColor || colors.card }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color: valueColor || colors.text }]}>{value}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SummaryCards({ stats, period }) {
  const income = stats?.summary?.income ?? 0;
  const expenses = stats?.summary?.expenses ?? 0;
  const txCount = stats?.summary?.transaction_count ?? 0;
  const netFlow = income - expenses;

  const getPeriodLabel = () => {
    if (!stats?.summary?.period) return '';
    const { start_date, end_date } = stats.summary.period;
    if (!start_date || !end_date) return '';
    const startDate = new Date(start_date + 'T00:00:00');
    const endDate = new Date(end_date + 'T00:00:00');
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (daysDiff === 1) return '1 day';
    if (daysDiff <= 7) return `${daysDiff} days`;
    if (startDate.getDate() === 1) {
      if (startDate.getMonth() === 0) return 'YTD';
      return 'MTD';
    }
    return `${daysDiff} days`;
  };

  const periodLabel = getPeriodLabel();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <StatCard
          title={`Income${periodLabel ? ` (${periodLabel})` : ''}`}
          value={formatCompact(income)}
          subtitle={formatCurrency(income)}
          valueColor={colors.income}
          bgColor="#0f2d24"
        />
        <StatCard
          title={`Expenses${periodLabel ? ` (${periodLabel})` : ''}`}
          value={formatCompact(expenses)}
          subtitle={formatCurrency(expenses)}
          valueColor={colors.expense}
          bgColor="#2d0f0f"
        />
      </View>
      <View style={styles.row}>
        <StatCard
          title="Net Flow"
          value={`${netFlow >= 0 ? '+' : '-'}${formatCompact(Math.abs(netFlow))}`}
          subtitle={netFlow >= 0 ? 'Positive cash flow' : 'Spending exceeds income'}
          valueColor={netFlow >= 0 ? '#60a5fa' : '#f97316'}
          bgColor={netFlow >= 0 ? '#0f1e2d' : '#2d1a0f'}
        />
        <StatCard
          title="Transactions"
          value={txCount.toLocaleString()}
          subtitle={`${txCount} total`}
          valueColor={colors.text}
          bgColor="#1a0f2d"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
