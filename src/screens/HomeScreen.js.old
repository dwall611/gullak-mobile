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
import { api } from '../api/client';
import { SummaryCards } from '../components/SummaryCards';
import { SpendingChart } from '../components/SpendingChart';
import { AccountSpendingCard } from '../components/AccountCard';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { getDateRange, getAvailableMonths } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [dateRange, setDateRange] = useState('7days');
  const [selectedMonth, setSelectedMonth] = useState('');
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const [stats, setStats] = useState(null);
  const [accountSpending, setAccountSpending] = useState([]);
  const [dailySpending, setDailySpending] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const { start_date, end_date } = getDateRange(
        selectedMonth ? 'month' : dateRange,
        selectedMonth
      );

      const [statsData, spendingData, categoryData] = await Promise.all([
        api.getSummary({ start_date, end_date }),
        api.getAccountSpending(start_date, end_date),
        api.getSpendingByCategory(start_date, end_date, true),
      ]);

      setStats(statsData);
      setAccountSpending(spendingData.accountSpending || []);

      // Process daily spending from category data (aggregate by date)
      const dateMap = {};
      for (const row of (categoryData.data || [])) {
        const date = row.date || row.period_date;
        if (!date) continue;
        if (!dateMap[date]) dateMap[date] = 0;
        dateMap[date] += row.total || 0;
      }
      const daily = Object.entries(dateMap)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setDailySpending(daily);
    } catch (err) {
      console.error('Error loading home:', err);
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await api.triggerSync();
      Alert.alert('Sync Complete', result?.message || 'Data synced successfully!');
      await loadData();
    } catch (err) {
      Alert.alert('Sync Failed', err.message || 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const handleDateRangeSelect = (value) => {
    setDateRange(value);
    setSelectedMonth('');
  };

  const handleMonthSelect = (month) => {
    setSelectedMonth(month === selectedMonth ? '' : month);
    if (month !== selectedMonth) setDateRange('month');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Gullak</Text>
          <Text style={styles.headerSubtitle}>Your financial dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSync}
          disabled={syncing}
          activeOpacity={0.7}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Date range selector */}
      <DateRangeSelector
        selected={selectedMonth ? 'month' : dateRange}
        onSelect={handleDateRangeSelect}
        months={availableMonths.slice(0, 6)}
        selectedMonth={selectedMonth}
        onSelectMonth={handleMonthSelect}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Summary cards */}
          <SummaryCards stats={stats} />

          <View style={styles.spacer} />

          {/* Daily spending chart */}
          <SpendingChart
            data={dailySpending}
            title="Daily Spending"
          />

          <View style={styles.spacer} />

          {/* Account spending */}
          <AccountSpendingCard
            accountSpending={accountSpending}
          />

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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 1,
  },
  syncBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
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
    paddingTop: spacing.sm,
  },
  spacer: {
    height: spacing.md,
  },
});
