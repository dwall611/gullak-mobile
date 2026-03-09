import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { formatCompact } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const screenWidth = Dimensions.get('window').width;

export function SpendingChart({ data = [], title = 'Daily Spending' }) {
  // data: array of { date, amount } or { date, total }
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  // Sort by date, take last 14 entries
  const sorted = [...data]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-14);

  const labels = sorted.map((d) => {
    const dt = new Date(d.date + 'T00:00:00');
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  });

  const values = sorted.map((d) => Math.abs(d.amount || d.total || 0));
  const maxVal = Math.max(...values, 1);

  const chartData = {
    labels,
    datasets: [{ data: values }],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.textSecondary,
    barPercentage: 0.6,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      stroke: colors.cardBorder,
      strokeWidth: 1,
    },
    formatYLabel: (v) => formatCompact(parseFloat(v)),
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <BarChart
        data={chartData}
        width={screenWidth - spacing.md * 2}
        height={200}
        chartConfig={chartConfig}
        style={styles.chart}
        withInnerLines
        showValuesOnTopOfBars={false}
        fromZero
        verticalLabelRotation={labels.length > 10 ? 45 : 0}
      />
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
  title: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: radius.md,
    marginHorizontal: -spacing.sm,
  },
  empty: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
