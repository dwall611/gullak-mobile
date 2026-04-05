import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { api } from '../api/client';
import { formatCurrency, formatCompact, getCategoryColor } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';
import { useAlertContext } from '../contexts/AlertContext';
import { 
  requestNotificationPermissions, 
  scheduleAlertNotification,
  addNotificationResponseListener,
  cleanupNotifiedAlerts,
} from '../services/notifications';

const screenWidth = Dimensions.get('window').width;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => formatCurrency(n ?? 0);
const fmtK = (v) => {
  if (v == null) return '';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
};



// ─── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ alerts, onAlertPress, lastUpdated, hasError }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (alerts && alerts.length > 0) {
      // Fade in animation when alerts appear
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [alerts?.length]);

  // Helper to format last updated time
  const getLastUpdatedText = () => {
    if (!lastUpdated) return null;
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Updated just now';
    if (diffMins === 1) return 'Updated 1 min ago';
    if (diffMins < 60) return `Updated ${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Updated 1 hour ago';
    return `Updated ${diffHours} hours ago`;
  };

  if (!alerts || alerts.length === 0) {
    // Show error state if there's an error but no alerts
    if (hasError && lastUpdated) {
      return (
        <View style={styles.section}>
          <View style={styles.alertErrorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.alertErrorText}>
              Failed to update alerts. {getLastUpdatedText()}
            </Text>
          </View>
        </View>
      );
    }
    return null;
  }

  const severityConfig = {
    info: { icon: 'information-circle-outline', color: colors.infoAccent, bg: colors.infoBg },
    warning: { icon: 'warning-outline', color: colors.warning, bg: colors.warningBg },
    critical: { icon: 'alert-circle-outline', color: colors.expense, bg: colors.criticalBg },
  };

  return (
    <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
      {alerts.map((alert, idx) => {
        const cfg = severityConfig[alert.severity] || severityConfig.info;
        return (
          <TouchableOpacity
            key={alert.id || idx}
            style={[styles.alertRow, { backgroundColor: cfg.bg, borderColor: cfg.color + '44' }]}
            onPress={() => onAlertPress && onAlertPress(alert)}
            activeOpacity={0.7}
          >
            <Ionicons name={cfg.icon} size={18} color={cfg.color} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertMsg, { color: colors.text }]}>{alert.message}</Text>
              {alert.rule_name && <Text style={styles.alertRule}>{alert.rule_name}</Text>}
            </View>
            <Ionicons name="chevron-forward-outline" size={16} color={cfg.color} />
          </TouchableOpacity>
        );
      })}
      {hasError && lastUpdated && (
        <View style={styles.alertFooterStatus}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.textMuted} />
          <Text style={styles.alertFooterStatusText}>{getLastUpdatedText()}</Text>
        </View>
      )}
    </Animated.View>
  );
}



// ─── Summary Cards ────────────────────────────────────────────────────────────
function OverviewSummaryCards({ stats }) {
  const income = stats?.summary?.income ?? 0;
  const expenses = stats?.summary?.expenses ?? 0;
  const txCount = stats?.summary?.transaction_count ?? 0;
  const netFlow = income - expenses;

  return (
    <View style={styles.summaryGrid}>
      <View style={styles.summaryRow}>
        <View style={[styles.statCard, { backgroundColor: colors.incomeBg }]}>
          <Text style={styles.statLabel}>INCOME</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>{formatCompact(income)}</Text>
          <Text style={styles.statSub}>{fmt(income)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.expenseBg }]}>
          <Text style={styles.statLabel}>EXPENSES</Text>
          <Text style={[styles.statValue, { color: colors.expense }]}>{formatCompact(expenses)}</Text>
          <Text style={styles.statSub}>{fmt(expenses)}</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.statCard, { backgroundColor: netFlow >= 0 ? colors.netFlowPositiveBg : colors.netFlowNegativeBg }]}>
          <Text style={styles.statLabel}>NET FLOW</Text>
          <Text style={[styles.statValue, { color: netFlow >= 0 ? colors.balanceLine : colors.warning }]}>
            {netFlow >= 0 ? '+' : '-'}{formatCompact(Math.abs(netFlow))}
          </Text>
          <Text style={styles.statSub}>{netFlow >= 0 ? 'Positive' : 'Negative'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.transactionsBg }]}>
          <Text style={styles.statLabel}>TRANSACTIONS</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>{txCount.toLocaleString()}</Text>
          <Text style={styles.statSub}>this month</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Spending By Category ─────────────────────────────────────────────────────
function SpendingByCategory({ data }) {
  if (!data || data.length === 0) return null;
  const top8 = data.slice(0, 8);
  const total = top8.reduce((s, d) => s + d.amount, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Spending by Category</Text>
      {top8.map((item, idx) => {
        const pct = total > 0 ? (item.amount / total) * 100 : 0;
        const barColor = getCategoryColor(idx);
        return (
          <View key={item.category} style={styles.categoryRow}>
            <View style={[styles.categoryDot, { backgroundColor: barColor }]} />
            <View style={styles.categoryInfo}>
              <View style={styles.categoryNameRow}>
                <Text style={styles.categoryName} numberOfLines={1}>{item.category}</Text>
                <Text style={styles.categoryAmt}>{formatCompact(item.amount)} <Text style={styles.categoryPct}>({pct.toFixed(0)}%)</Text></Text>
              </View>
              <View style={styles.categoryBar}>
                <View style={[styles.categoryBarFill, { width: `${Math.max(pct, 1)}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Balance Forecast Chart (SVG area chart with bezier curves) ──────────────
const FORECAST_CHART_HEIGHT = 180;
const FORECAST_PADDING_LEFT = 8;
const FORECAST_PADDING_RIGHT = 8;
const FORECAST_PADDING_TOP = 16;
const FORECAST_PADDING_BOTTOM = 32;

// Chart colors — using semantic tokens
const FORECAST_COLORS = {
  balanceLine: colors.balanceLine,
  paidLine: colors.paidLine,
  receivedLine: colors.receivedLine,
  axisLabel: colors.axisLabel,
};

function buildSmoothPath(points, chartW, chartH, minVal, maxVal) {
  if (!points || points.length < 2) return '';
  const range = maxVal - minVal || 1;
  const toX = (i) => FORECAST_PADDING_LEFT + (i / (points.length - 1)) * (chartW - FORECAST_PADDING_LEFT - FORECAST_PADDING_RIGHT);
  const toY = (v) => FORECAST_PADDING_TOP + (1 - (v - minVal) / range) * (chartH - FORECAST_PADDING_TOP - FORECAST_PADDING_BOTTOM);

  let d = `M ${toX(0)} ${toY(points[0])}`;
  for (let i = 1; i < points.length; i++) {
    const cpX = (toX(i - 1) + toX(i)) / 2;
    d += ` C ${cpX} ${toY(points[i - 1])}, ${cpX} ${toY(points[i])}, ${toX(i)} ${toY(points[i])}`;
  }
  return d;
}

function buildAreaPath(points, chartW, chartH, minVal, maxVal) {
  const linePath = buildSmoothPath(points, chartW, chartH, minVal, maxVal);
  if (!linePath) return '';
  const toX = (i) => FORECAST_PADDING_LEFT + (i / (points.length - 1)) * (chartW - FORECAST_PADDING_LEFT - FORECAST_PADDING_RIGHT);
  const baseY = FORECAST_PADDING_TOP + (chartH - FORECAST_PADDING_TOP - FORECAST_PADDING_BOTTOM);
  return `${linePath} L ${toX(points.length - 1)} ${baseY} L ${toX(0)} ${baseY} Z`;
}

function ForecastChart({ rows, todayStr }) {
  const chartW = screenWidth - spacing.md * 2 - spacing.md * 2;

  if (!rows || rows.length < 3) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Balance Forecast</Text>
        <View style={{ height: FORECAST_CHART_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>Loading forecast...</Text>
        </View>
      </View>
    );
  }

  // Sample down to ~20 points for performance
  const step = Math.max(1, Math.floor(rows.length / 20));
  const sampled = rows.filter((_, i) => i % step === 0 || i === rows.length - 1);

  const balances = sampled.map((r) => r.balance ?? 0);
  const paid = sampled.map((r) => r.paid ?? 0);
  const received = sampled.map((r) => r.received ?? 0);

  const allVals = [...balances, ...paid, ...received];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);

  const balancePath = buildSmoothPath(balances, chartW, FORECAST_CHART_HEIGHT, minVal, maxVal);
  const paidPath = buildSmoothPath(paid, chartW, FORECAST_CHART_HEIGHT, minVal, maxVal);
  const receivedPath = buildSmoothPath(received, chartW, FORECAST_CHART_HEIGHT, minVal, maxVal);
  const balanceArea = buildAreaPath(balances, chartW, FORECAST_CHART_HEIGHT, minVal, maxVal);
  const paidArea = buildAreaPath(paid, chartW, FORECAST_CHART_HEIGHT, minVal, maxVal);
  const receivedArea = buildAreaPath(received, chartW, FORECAST_CHART_HEIGHT, minVal, maxVal);

  // X axis labels: first, quarter, middle, three-quarters, last
  const labelIdxs = [
    0,
    Math.floor(sampled.length / 4),
    Math.floor(sampled.length / 2),
    Math.floor((3 * sampled.length) / 4),
    sampled.length - 1,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const toX = (i) =>
    FORECAST_PADDING_LEFT + (i / (sampled.length - 1)) * (chartW - FORECAST_PADDING_LEFT - FORECAST_PADDING_RIGHT);

  const fmtAxisDate = (dateStr) => {
    const [, m, d] = (dateStr || '').split('-');
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(m, 10) - 1];
    return `${mon} ${parseInt(d, 10)}`;
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Balance Forecast</Text>
      {/* Legend */}
      <View style={styles.forecastLegendRow}>
        {[
          { color: FORECAST_COLORS.balanceLine, label: 'Balance' },
          { color: FORECAST_COLORS.paidLine, label: 'Paid' },
          { color: FORECAST_COLORS.receivedLine, label: 'Received' },
        ].map((l) => (
          <View key={l.label} style={styles.forecastLegendItem}>
            <View style={[styles.forecastLegendDot, { backgroundColor: l.color }]} />
            <Text style={styles.forecastLegendText}>{l.label}</Text>
          </View>
        ))}
      </View>
      {/* SVG Chart */}
      <Svg width={chartW} height={FORECAST_CHART_HEIGHT}>
        <Defs>
          <SvgLinearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={FORECAST_COLORS.balanceLine} stopOpacity="0.35" />
            <Stop offset="1" stopColor={FORECAST_COLORS.balanceLine} stopOpacity="0.03" />
          </SvgLinearGradient>
          <SvgLinearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={FORECAST_COLORS.paidLine} stopOpacity="0.3" />
            <Stop offset="1" stopColor={FORECAST_COLORS.paidLine} stopOpacity="0.02" />
          </SvgLinearGradient>
          <SvgLinearGradient id="receivedGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={FORECAST_COLORS.receivedLine} stopOpacity="0.3" />
            <Stop offset="1" stopColor={FORECAST_COLORS.receivedLine} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>
        {/* Area fills */}
        <Path d={receivedArea} fill="url(#receivedGrad)" />
        <Path d={paidArea} fill="url(#paidGrad)" />
        <Path d={balanceArea} fill="url(#balanceGrad)" />
        {/* Lines */}
        <Path d={receivedPath} fill="none" stroke={FORECAST_COLORS.receivedLine} strokeWidth="2" strokeLinecap="round" />
        <Path d={paidPath} fill="none" stroke={FORECAST_COLORS.paidLine} strokeWidth="2" strokeLinecap="round" />
        <Path d={balancePath} fill="none" stroke={FORECAST_COLORS.balanceLine} strokeWidth="2.5" strokeLinecap="round" />
        {/* X axis labels */}
        {labelIdxs.map((idx) => (
          <SvgText
            key={idx}
            x={toX(idx)}
            y={FORECAST_CHART_HEIGHT - 4}
            fontSize="11"
            fill={FORECAST_COLORS.axisLabel}
            textAnchor="middle"
          >
            {fmtAxisDate(sampled[idx]?.date)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

// ─── Budget Consumption ────────────────────────────────────────────────────────
function BudgetConsumption({ budget, spent, timePct, burnPct }) {
  if (!budget || budget <= 0) return null;
  const remaining = budget - spent;
  const isOverPace = burnPct > timePct + 20;
  const isSlightlyOver = burnPct > timePct;
  const statusColor = isOverPace ? colors.expense : isSlightlyOver ? colors.warning : colors.income;
  const statusLabel = isOverPace ? 'Over pace' : isSlightlyOver ? 'Slightly over' : 'On track';
  const barColor = burnPct > 100 ? colors.expense : isOverPace ? colors.warning : colors.income;
  const barWidth = Math.min(burnPct, 100);

  return (
    <View style={styles.card}>
      <View style={styles.budgetHeader}>
        <Text style={styles.cardTitle}>Budget Consumption</Text>
        <Text style={[styles.budgetStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <View style={styles.budgetMeta}>
        <Text style={styles.budgetMetaText}>
          <Text style={[styles.budgetPct, { color: statusColor }]}>{burnPct.toFixed(1)}%</Text>
          {' of '}{fmt(budget)}{' used'}
        </Text>
        <Text style={styles.budgetMetaText}>{timePct.toFixed(0)}% elapsed</Text>
      </View>
      <View style={styles.budgetBarBg}>
        {/* Time marker */}
        <View style={[styles.timeMarker, { left: `${Math.min(timePct, 100)}%` }]} />
        <View style={[styles.budgetBarFill, { width: `${barWidth}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.budgetFooter}>
        <Text style={styles.budgetFooterLabel}>{fmt(0)}</Text>
        <Text style={[styles.budgetFooterLabel, { color: remaining >= 0 ? colors.income : colors.expense, fontWeight: fontWeight.semibold }]}>
          {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(Math.abs(remaining))} over`}
        </Text>
        <Text style={styles.budgetFooterLabel}>{fmt(budget)}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setUnacknowledgedCount } = useAlertContext();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [liabilities, setLiabilities] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [alertsLastUpdated, setAlertsLastUpdated] = useState(null);
  const [alertsError, setAlertsError] = useState(false);
  const pollingIntervalRef = useRef(null);

  const formatDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dates = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const todayStr = formatDateStr(now);
    const yesterday = formatDateStr(new Date(year, month, now.getDate() - 1));
    const startDate = formatDateStr(new Date(year, month, 1));
    const endDate = formatDateStr(new Date(year, month + 1, 0));
    const projectionEndDate = formatDateStr(new Date(year, month + 1, 5));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { todayStr, yesterday, startDate, endDate, projectionEndDate, daysInMonth, daysElapsed: now.getDate(), monthLabel, monthIndex: month };
  }, []);

  const timePct = (dates.daysElapsed / dates.daysInMonth) * 100;

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const currentMonth = dates.startDate.substring(0, 7);

      const [statsData, alertHistory, categoryTotals, accountsData, burnRateData, liabResp] = await Promise.all([
        api.getSummary({ start_date: dates.startDate, end_date: dates.endDate }),
        api.getAlertHistory(10),
        api.getSpendingByCategory(dates.startDate, dates.endDate, false),
        api.getAccounts(),
        api.getBurnRate(currentMonth),
        api.getLiabilities(),
      ]);

      setStats(statsData);
      setAlerts(alertHistory.alerts?.filter(a => !a.acknowledged_at) || []);
      setCategoryData((categoryTotals.data || []).map(item => ({ category: item.category_name, amount: item.total })).sort((a, b) => b.amount - a.amount));
      setLiabilities(liabResp);

      // Budget consumption from burn-rate API
      const checking = (accountsData.accounts || []).find(a => a.name === 'Main Checking');
      if (checking) {
        // Use summary values from API response
        const summary = burnRateData.summary || {};
        const income = summary.income || 0;
        const fixed = summary.fixed_expenses || 0;
        const discretionary = summary.discretionary_spent || 0;
        const budget = income - fixed;
        const burnPct = budget > 0 ? (discretionary / budget) * 100 : 0;
        setBudgetData({ budget, spent: discretionary, timePct, burnPct });

        // Forecast data from API — returns forecast_rows with running balances
        try {
          const forecastResp = await api.getForecast(checking.account_id || checking.id, 60);
          const forecastRows = forecastResp.forecast_rows || [];

          // Build date-aggregated chart data
          const byDate = new Map();
          let runPaid = 0, runReceived = 0;
          for (const row of forecastRows) {
            const amt = row.amount ?? (row.expense > 0 ? row.expense : -(row.income || 0));
            if (amt > 0) runPaid += amt;
            else runReceived += Math.abs(amt);
            byDate.set(row.date, {
              date: row.date,
              balance: row.runningBalance ?? 0,
              paid: runPaid,
              received: runReceived,
              isProjected: row.isProjected ?? false,
            });
          }
          setForecastData([...byDate.values()].sort((a, b) => a.date > b.date ? 1 : -1));
        } catch (err) {
          console.error('[Overview] Forecast error:', err);
        }
      }
    } catch (err) {
      console.error('[OverviewScreen] Error:', err);
      setError(err.message || 'Failed to load data');
    }
  }, [dates, timePct]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermissions();
    cleanupNotifiedAlerts(); // Clean up old notified alerts on app start
  }, []);

  // Set up notification response listener (navigate to Alerts when tapped)
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const screen = response.notification.request.content.data?.screen;
      if (screen === 'Alerts') {
        navigation.navigate('Settings', { initialTab: 'alerts' });
      }
    });

    return () => subscription.remove();
  }, [navigation]);

  // Polling for new alerts (every 60 seconds)
  useEffect(() => {
    const pollAlerts = async () => {
      try {
        const alertHistory = await api.getAlertHistory(10);
        const unacknowledged = alertHistory.alerts?.filter(a => !a.acknowledged_at) || [];
        
        // Update alert state
        setAlerts(unacknowledged);
        
        // Update badge count in context
        setUnacknowledgedCount(unacknowledged.length);

        // Mark successful update
        setAlertsLastUpdated(new Date());
        setAlertsError(false);

        // Schedule notifications for ALL unacknowledged alerts
        // scheduleAlertNotification handles deduplication via hasBeenNotified internally
        for (const alert of unacknowledged) {
          await scheduleAlertNotification(alert);
        }

      } catch (err) {
        console.error('[OverviewScreen] Error polling alerts:', err);
        setAlertsError(true);
      }
    };

    // Poll immediately on mount
    pollAlerts();

    // Set up polling interval (60 seconds)
    pollingIntervalRef.current = setInterval(pollAlerts, 60000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [setUnacknowledgedCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Handle alert tap - navigate to Alerts screen
  const handleAlertPress = useCallback(() => {
    // Navigate to Settings (which has Alerts view)
    // If Alerts becomes a separate tab, change to: navigation.navigate('Alerts')
    navigation.navigate('Settings');
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Overview</Text>
          <Text style={styles.headerSub}>{dates.monthLabel} · Day {dates.daysElapsed} of {dates.daysInMonth}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLoading(true); loadData().finally(() => setLoading(false)); }} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading overview...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.expense} />
          <Text style={[styles.loadingText, { color: colors.expense, textAlign: 'center' }]}>{error}</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.sm }}
            onPress={() => { setLoading(true); loadData().finally(() => setLoading(false)); }}
          >
            <Text style={{ color: '#fff', fontWeight: fontWeight.semibold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Alerts */}
          <AlertBanner 
            alerts={alerts} 
            onAlertPress={handleAlertPress}
            lastUpdated={alertsLastUpdated}
            hasError={alertsError}
          />

          {/* Summary Cards */}
          <OverviewSummaryCards stats={stats} />

          <View style={styles.spacer} />

          {/* Spending by Category */}
          <SpendingByCategory data={categoryData} />

          <View style={styles.spacer} />

          {/* Balance Forecast */}
          <ForecastChart rows={forecastData} todayStr={dates.todayStr} />

          <View style={styles.spacer} />

          {/* Budget Consumption */}
          {budgetData && budgetData.budget > 0 && (
            <BudgetConsumption
              budget={budgetData.budget}
              spent={budgetData.spent}
              timePct={budgetData.timePct}
              burnPct={budgetData.burnPct}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    fontFamily: 'Manrope',
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
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
    fontFamily: 'Inter',
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  spacer: {
    height: spacing.md,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  alertMsg: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  alertRule: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  alertErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  alertErrorText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  alertFooterStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  alertFooterStatusText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  summaryGrid: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
    fontFamily: 'Manrope',
  },
  statSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'Inter',
  },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    fontFamily: 'Inter',
  },
  chart: {
    borderRadius: radius.md,
    marginHorizontal: -spacing.xs,
  },
  forecastLegendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
    paddingLeft: 4,
  },
  forecastLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  forecastLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  forecastLegendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  categoryName: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
    fontFamily: 'Inter',
  },
  categoryAmt: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  categoryPct: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    fontFamily: 'Inter',
  },
  categoryBar: {
    height: 4,
    backgroundColor: colors.outline,
    borderRadius: 2,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  budgetStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  budgetMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  budgetMetaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  budgetPct: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  budgetBarBg: {
    height: 14,
    backgroundColor: colors.surface,
    borderRadius: 7,
    overflow: 'visible',
    position: 'relative',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 7,
  },
  timeMarker: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 18,
    backgroundColor: colors.textMuted + '80',
    zIndex: 2,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  budgetFooterLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
