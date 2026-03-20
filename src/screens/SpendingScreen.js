import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api, clearCache } from '../api/client';
import { formatCurrency } from '../utils/helpers';

const screenWidth = Dimensions.get('window').width;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  bg: '#0c0e10',
  surface: '#161a1e',
  surfaceLow: '#111416',
  surfaceHigh: '#20262c',
  onSurface: '#e0e6ed',
  onSurfaceVariant: '#a6acb3',
  primary: '#c6c6ca',
  outline: '#42494f',
};

// ─── Category config (icon + color per category) ──────────────────────────────
const CATEGORY_CONFIG = {
  'Travel':          { color: '#3b82f6', icon: 'airplane-outline' },
  'Bank Fees':       { color: '#10b981', icon: 'card-outline' },
  'Shopping':        { color: '#f59e0b', icon: 'bag-handle-outline' },
  'Food & Dining':   { color: '#f43f5e', icon: 'restaurant-outline' },
  'Transportation':  { color: '#8b5cf6', icon: 'car-outline' },
  'Cash Payment':    { color: '#ec4899', icon: 'cash-outline' },
  'Bills & Utilities': { color: '#06b6d4', icon: 'flash-outline' },
  'Entertainment':   { color: '#f97316', icon: 'film-outline' },
  'Healthcare':      { color: '#84cc16', icon: 'medkit-outline' },
  'Housing':         { color: '#6366f1', icon: 'home-outline' },
  'Groceries':       { color: '#10b981', icon: 'cart-outline' },
  'Personal Care':   { color: '#ec4899', icon: 'heart-outline' },
  'Loan Payments':   { color: '#ef4444', icon: 'trending-down-outline' },
  'Education':       { color: '#f59e0b', icon: 'school-outline' },
  'Services':        { color: '#a78bfa', icon: 'construct-outline' },
  'Government':      { color: '#64748b', icon: 'business-outline' },
};

const DEFAULT_CATEGORY_CONFIG = { color: '#6b7280', icon: 'ellipsis-horizontal-outline' };

const CATEGORY_COLORS_FALLBACK = [
  '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

// ─── Category name mapping ────────────────────────────────────────────────────
const CATEGORY_MAP = {
  'FOOD_AND_DRINK':           'Food & Dining',
  'TRANSPORTATION':           'Transportation',
  'GENERAL_MERCHANDISE':      'Shopping',
  'ENTERTAINMENT':            'Entertainment',
  'TRAVEL':                   'Travel',
  'PERSONAL_CARE':            'Personal Care',
  'HEALTHCARE':               'Healthcare',
  'RENT':                     'Housing',
  'HOME_IMPROVEMENT':         'Home',
  'UTILITIES':                'Bills & Utilities',
  'INCOME':                   'Income',
  'TRANSFER_IN':              'Transfer',
  'TRANSFER_OUT':             'Transfer',
  'LOAN_PAYMENTS':            'Loan Payments',
  'BANK_FEES':                'Bank Fees',
  'GOVERNMENT_AND_NON_PROFIT': 'Government',
  'SERVICE':                  'Services',
  'GROCERIES':                'Groceries',
  'AUTO':                     'Transportation',
  'EDUCATION':                'Education',
  'UNCATEGORIZED':            'Uncategorized',
  'RENT_AND_UTILITIES':       'Bills & Utilities',
};

const formatCategoryName = (rawCategory) => {
  if (!rawCategory) return 'Uncategorized';
  return CATEGORY_MAP[rawCategory] || 'Uncategorized';
};

// ─── Transaction helpers ──────────────────────────────────────────────────────
function getCategory(tx) {
  if (tx.override_category) return tx.override_category;
  if (tx.personal_finance_category) {
    try {
      const pfc = typeof tx.personal_finance_category === 'string'
        ? JSON.parse(tx.personal_finance_category)
        : tx.personal_finance_category;
      return formatCategoryName(pfc?.primary);
    } catch {}
  }
  if (tx.category && Array.isArray(tx.category) && tx.category.length > 0) {
    return formatCategoryName(tx.category[0]);
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

// ─── Date helpers ─────────────────────────────────────────────────────────────
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateRange(filter, selectedMonth, customFromDate, customToDate) {
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(endDate);

  switch (filter) {
    case '1day':  break;
    case '7days': startDate.setDate(endDate.getDate() - 6); break;
    case 'mtd':   startDate.setDate(1); break;
    case 'ytd':   startDate.setMonth(0); startDate.setDate(1); break;
    case 'month':
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        startDate.setFullYear(parseInt(year), parseInt(month) - 1, 1);
        endDate.setFullYear(parseInt(year), parseInt(month), 0);
      }
      break;
    case 'custom':
      if (customFromDate) startDate.setTime(new Date(customFromDate).getTime());
      if (customToDate)   endDate.setTime(new Date(customToDate).getTime());
      break;
    default: startDate.setDate(endDate.getDate() - 6);
  }

  return { start_date: formatLocalDate(startDate), end_date: formatLocalDate(endDate) };
}

function getPreviousDateRange(filter, selectedMonth, customFromDate, customToDate) {
  const today = new Date();
  const endDate = new Date(today);
  const startDate = new Date(endDate);

  switch (filter) {
    case '1day':
      endDate.setDate(endDate.getDate() - 1);
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7days':
      endDate.setDate(endDate.getDate() - 7);
      startDate.setDate(startDate.getDate() - 13);
      break;
    case 'mtd':
      endDate.setDate(0);
      startDate.setFullYear(endDate.getFullYear(), endDate.getMonth(), 1);
      break;
    case 'ytd':
      endDate.setFullYear(endDate.getFullYear() - 1, 11, 31);
      startDate.setFullYear(endDate.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (customFromDate && customToDate) {
        const from = new Date(customFromDate);
        const to = new Date(customToDate);
        const duration = to - from;
        endDate.setTime(from.getTime() - 86400000);
        startDate.setTime(endDate.getTime() - duration);
      }
      break;
    default:
      endDate.setDate(endDate.getDate() - 7);
      startDate.setDate(startDate.getDate() - 13);
  }

  return { start_date: formatLocalDate(startDate), end_date: formatLocalDate(endDate) };
}

function formatDateRangeLabel(startDate, endDate) {
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(startDate + 'T00:00:00');
  const e = new Date(endDate + 'T00:00:00');
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
}

function computePeakDay(transactions) {
  const dayMap = {};
  transactions.forEach(tx => {
    if (isExpense(tx)) {
      const date = tx.date;
      if (!dayMap[date]) dayMap[date] = 0;
      dayMap[date] += Math.abs(tx.amount);
    }
  });
  let peakDate = null;
  let peakAmount = 0;
  Object.entries(dayMap).forEach(([date, amount]) => {
    if (amount > peakAmount) { peakAmount = amount; peakDate = date; }
  });
  return { peakDate, peakAmount };
}

function getAvailableMonths() {
  const months = [];
  const today = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    months.push({ key, label });
  }
  return months;
}

const DATE_PERIOD_OPTIONS = [
  { value: '1day',   label: 'Day'    },
  { value: '7days',  label: 'Week'   },
  { value: 'mtd',    label: 'Month'  },
  { value: 'ytd',    label: 'Year'   },
  { value: 'custom', label: 'Custom' },
];

// ─── Detailed View Sub-Components ────────────────────────────────────────────

function CategoryTrendItem({ category, months, onPress }) {
  const monthLabels = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2 + i);
    return d.toLocaleDateString('en-US', { month: 'short' });
  });
  const monthColors = ['#3b82f6', '#10b981', '#f59e0b'];
  const maxValue = Math.max(...months, 1);

  const trend1 = months[0] > 0 ? ((months[1] - months[0]) / months[0]) * 100 : 0;
  const trend2 = months[1] > 0 ? ((months[2] - months[1]) / months[1]) * 100 : 0;
  const avgTrend = (trend1 + trend2) / 2;

  return (
    <TouchableOpacity style={styles.trendItem} onPress={onPress} disabled={!onPress} activeOpacity={0.75}>
      <View style={styles.trendHeader}>
        <Text style={styles.trendCategory}>{category}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {avgTrend !== 0 && (
            <View style={[styles.trendIndicator, { backgroundColor: avgTrend > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)' }]}>
              <Ionicons
                name={avgTrend > 0 ? 'trending-up' : 'trending-down'}
                size={13}
                color={avgTrend > 0 ? '#ef4444' : '#10b981'}
              />
              <Text style={[styles.trendPercentage, { color: avgTrend > 0 ? '#ef4444' : '#10b981' }]}>
                {Math.abs(avgTrend).toFixed(0)}%
              </Text>
            </View>
          )}
          {onPress && <Ionicons name="chevron-forward" size={14} color={D.onSurfaceVariant} />}
        </View>
      </View>
      <View style={styles.trendBars}>
        {months.map((amount, idx) => {
          const heightPercent = maxValue > 0 ? (amount / maxValue) * 100 : 0;
          return (
            <View key={idx} style={styles.trendColumn}>
              <Text style={styles.trendAmount}>{formatCurrency(amount)}</Text>
              <View style={styles.trendBarContainer}>
                <View style={[styles.trendBar, { height: `${heightPercent}%`, backgroundColor: monthColors[idx] }]} />
              </View>
              <View style={styles.trendMonthLabel}>
                <View style={[styles.monthColorDot, { backgroundColor: monthColors[idx] }]} />
                <Text style={styles.trendMonth}>{monthLabels[idx]}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

function RecurringItem({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.recurringItem} onPress={onPress} disabled={!onPress} activeOpacity={0.75}>
      <View style={styles.recurringHeader}>
        <Text style={styles.recurringMerchant}>{item.merchant}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.recurringAmount}>{formatCurrency(item.avgAmount)}</Text>
          {onPress && <Ionicons name="chevron-forward" size={14} color={D.onSurfaceVariant} />}
        </View>
      </View>
      <View style={styles.recurringMeta}>
        <Text style={styles.recurringMetaText}>
          {item.frequency} • {item.category} • {item.account}
        </Text>
      </View>
      <View style={styles.recurringFooter}>
        <Text style={styles.recurringFooterText}>
          Last: {item.lastDate} • Next: {item.nextExpected}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Category Allocation Card ─────────────────────────────────────────────────
function CategoryCard({ category, amount, percentage, color, icon, onPress, compact }) {
  const cardColor = color || DEFAULT_CATEGORY_CONFIG.color;
  const cardIcon  = icon  || DEFAULT_CATEGORY_CONFIG.icon;

  return (
    <TouchableOpacity
      style={[styles.categoryCard, compact && styles.categoryCardCompact]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.categoryCardTop}>
        <View style={[styles.categoryIconContainer, { backgroundColor: `${cardColor}22` }]}>
          <Ionicons name={cardIcon} size={20} color={cardColor} />
        </View>
        <View style={styles.categoryCardMeta}>
          <Text style={styles.categoryCardName} numberOfLines={1}>{category}</Text>
          <Text style={styles.categoryCardPct}>{percentage.toFixed(0)}%</Text>
        </View>
        <Text style={styles.categoryCardAmount}>{formatCurrency(amount)}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: cardColor },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SpendingScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation();

  // ── State ────────────────────────────────────────────────────────────────
  const [stats, setStats]               = useState(null);
  const [previousTotal, setPreviousTotal] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [accountData, setAccountData]   = useState([]);
  const [categoryTrends, setCategoryTrends] = useState([]);
  const [recurringData, setRecurringData]   = useState([]);

  const [dateRange, setDateRange]       = useState('7days');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate]     = useState('');
  const [showMonthPicker, setShowMonthPicker]   = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [activeTab, setActiveTab]   = useState('summary'); // 'summary' | 'detailed'

  const availableMonths = useMemo(() => getAvailableMonths(), []);

  // ── Derived values ────────────────────────────────────────────────────────
  const currentDateRangeLabel = useMemo(() => {
    const { start_date, end_date } = getDateRange(dateRange, selectedMonth, customFromDate, customToDate);
    return formatDateRangeLabel(start_date, end_date);
  }, [dateRange, selectedMonth, customFromDate, customToDate]);

  const totalSpend = stats?.summary?.expenses || 0;

  const trendPct = useMemo(() => {
    if (previousTotal == null || previousTotal <= 0) return null;
    return ((totalSpend - previousTotal) / previousTotal) * 100;
  }, [totalSpend, previousTotal]);

  const { peakDate, peakAmount } = useMemo(
    () => computePeakDay(allTransactions),
    [allTransactions]
  );

  const peakDayLabel = useMemo(() => {
    if (!peakDate) return null;
    const d = new Date(peakDate + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, [peakDate]);

  const getPeriodLabel = () => {
    switch (dateRange) {
      case '1day':  return 'yesterday';
      case '7days': return 'last week';
      case 'mtd':   return 'last month';
      case 'ytd':   return 'last year';
      default:      return 'prior period';
    }
  };

  // Categories split: all but last 2 full-width, last 2 in grid
  const mainCategories = useMemo(
    () => categoryData.slice(0, Math.max(categoryData.length - 2, 0)),
    [categoryData]
  );
  const gridCategories = useMemo(
    () => categoryData.slice(Math.max(categoryData.length - 2, 0)),
    [categoryData]
  );

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const { start_date, end_date }         = getDateRange(dateRange, selectedMonth, customFromDate, customToDate);
      const { start_date: prev_start, end_date: prev_end } = getPreviousDateRange(dateRange, selectedMonth, customFromDate, customToDate);

      // Last-3-months range for category trends
      const trendNow       = new Date();
      const trend3MonthsAgo = new Date(trendNow.getFullYear(), trendNow.getMonth() - 2, 1);
      const trendStart     = `${trend3MonthsAgo.getFullYear()}-${String(trend3MonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;
      const trendEnd       = `${trendNow.getFullYear()}-${String(trendNow.getMonth() + 1).padStart(2, '0')}-${String(new Date(trendNow.getFullYear(), trendNow.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

      const [
        statsData, categoryTotals, accountTotals,
        allTx, categoryTrendsData, recurringTxData, prevStatsData,
      ] = await Promise.all([
        api.getSummary({ start_date, end_date }),
        api.getSpendingByCategory(start_date, end_date, false),
        api.getAccountSpending(start_date, end_date),
        api.getTransactions({ start_date, end_date, sort_by: 'date', order: 'desc' }),
        api.getSpendingByCategory(trendStart, trendEnd, true),
        api.getRecurringTransactions(3),
        api.getSummary({ start_date: prev_start, end_date: prev_end }),
      ]);

      setStats(statsData);
      setPreviousTotal(prevStatsData?.summary?.expenses ?? null);
      setAllTransactions(allTx.transactions || []);

      // Category data
      const categoryList = (categoryTotals.data || [])
        .map(item => ({ category: item.category_name, amount: item.total }))
        .sort((a, b) => b.amount - a.amount);
      const categoryTotal = categoryList.reduce((sum, c) => sum + c.amount, 0);
      setCategoryData(
        categoryList.map((c, idx) => {
          const cfg = CATEGORY_CONFIG[c.category] || {};
          return {
            ...c,
            percentage: categoryTotal > 0 ? (c.amount / categoryTotal) * 100 : 0,
            color: cfg.color || CATEGORY_COLORS_FALLBACK[idx % CATEGORY_COLORS_FALLBACK.length],
            icon:  cfg.icon  || DEFAULT_CATEGORY_CONFIG.icon,
          };
        })
      );

      // Account data
      const accountList = (accountTotals.accountSpending || [])
        .filter(item => item.total_spending > 0)
        .map(item => ({ account: item.name, amount: item.total_spending }))
        .sort((a, b) => b.amount - a.amount);
      const accountTotal = accountList.reduce((sum, a) => sum + a.amount, 0);
      setAccountData(
        accountList.map((a, idx) => ({
          ...a,
          percentage: accountTotal > 0 ? (a.amount / accountTotal) * 100 : 0,
          color: CATEGORY_COLORS_FALLBACK[idx % CATEGORY_COLORS_FALLBACK.length],
        }))
      );

      // Category trends
      const trendsMap = {};
      (categoryTrendsData.data || []).forEach(item => {
        const cat   = item.category_name;
        const month = item.date ? item.date.slice(0, 7) : '';
        if (!trendsMap[cat]) trendsMap[cat] = {};
        trendsMap[cat][month] = item.total;
      });
      const now    = new Date();
      const months = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      });
      const trendsList = Object.keys(trendsMap)
        .map(cat => {
          const values = months.map(m => trendsMap[cat][m] || 0);
          const total  = values.reduce((sum, v) => sum + v, 0);
          return { category: cat, months: values, total };
        })
        .filter(t => t.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      setCategoryTrends(trendsList);

      // Recurring
      setRecurringData((recurringTxData.data || []).slice(0, 10));
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load spending data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedMonth, customFromDate, customToDate]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useFocusEffect(
    useCallback(() => {
      clearCache();
      loadDashboard();
      return () => {};
    }, [loadDashboard])
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = () => { setRefreshing(true); loadDashboard(); };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    if (value === 'custom') {
      setShowCustomPicker(true);
    } else {
      setSelectedMonth('');
      setCustomFromDate('');
      setCustomToDate('');
    }
  };

  const navigateToTransactions = (filters = {}) => {
    navigation.navigate('Transactions', {
      dateRange, selectedMonth, customFromDate, customToDate,
      returnTo: 'Spending',
      ...filters,
    });
  };

  const handleTotalSpendPress = () => navigateToTransactions();
  const handleTrendItemPress   = (category) => navigateToTransactions({ filterCategory: category });
  const handleRecurringItemPress = (merchant) => navigateToTransactions({ filterMerchant: merchant });

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={D.primary} />
        <Text style={styles.loadingText}>Loading spending data…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Spending</Text>
        </View>
        <View style={[styles.centerContent, { flex: 1 }]}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDashboard}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spending</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={D.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Period Selector ──────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.periodRow}
          contentContainerStyle={styles.periodRowContent}
        >
          {DATE_PERIOD_OPTIONS.map(({ value, label }) => {
            const isActive = dateRange === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => handleDateRangeChange(value)}
                style={[styles.periodPill, isActive && styles.periodPillActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.periodPillText, isActive && styles.periodPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Tab Switcher ─────────────────────────────────────────────────── */}
        <View style={styles.tabSwitcher}>
          {[{ key: 'summary', label: 'Summary' }, { key: 'detailed', label: 'Detailed' }].map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setActiveTab(key)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ══════════════════ SUMMARY TAB ═══════════════════════════════════ */}
        {activeTab === 'summary' && (
          <>
            {/* ── Hero Bento Grid ──────────────────────────────────────────── */}
            <View style={styles.heroGrid}>
              {/* Total Outflow card (2/3 width) */}
              <TouchableOpacity
                style={styles.heroOutflowCard}
                onPress={() => navigateToTransactions()}
                activeOpacity={0.8}
              >
                <Text style={styles.outflowLabel}>TOTAL OUTFLOW</Text>
                <Text style={styles.outflowAmount} numberOfLines={1} adjustsFontSizeToFit>
                  {formatCurrency(totalSpend)}
                </Text>
                <View style={styles.outflowFooter}>
                  {trendPct !== null && (
                    <View style={[
                      styles.trendBadge,
                      { backgroundColor: trendPct > 0 ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)' },
                    ]}>
                      <Ionicons
                        name={trendPct > 0 ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={trendPct > 0 ? '#ef4444' : '#10b981'}
                      />
                      <Text style={[
                        styles.trendBadgeText,
                        { color: trendPct > 0 ? '#ef4444' : '#10b981' },
                      ]}>
                        {trendPct > 0 ? '+' : ''}{trendPct.toFixed(1)}% vs {getPeriodLabel()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.outflowDateRange}>{currentDateRangeLabel}</Text>
                </View>
              </TouchableOpacity>

              {/* Peak Day card (1/3 width) */}
              <View style={styles.heroPeakCard}>
                <Ionicons name="bulb-outline" size={18} color={D.onSurfaceVariant} style={{ marginBottom: 6 }} />
                <Text style={styles.peakHeading}>Peak Day</Text>
                {peakDate ? (
                  <>
                    <Text style={styles.peakDesc} numberOfLines={3}>
                      {peakDayLabel} was your most active day
                    </Text>
                    <View style={styles.peakFooter}>
                      <Text style={styles.peakAmount}>{formatCurrency(peakAmount)}</Text>
                      <Text style={styles.peakLabel}>Daily Max</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.peakDesc}>No data for this period</Text>
                )}
              </View>
            </View>

            {/* ── Spending Allocation ───────────────────────────────────────── */}
            {categoryData.length > 0 && (
              <View style={styles.allocationSection}>
                {/* Section header — no EXPORT DATA button */}
                <View style={styles.allocationHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allocationTitle}>Spending Allocation</Text>
                    <Text style={styles.allocationSubtitle}>
                      Detailed breakdown across {categoryData.length} {categoryData.length === 1 ? 'category' : 'categories'}
                    </Text>
                  </View>
                </View>

                {/* Full-width category cards */}
                {mainCategories.map(item => (
                  <CategoryCard
                    key={item.category}
                    category={item.category}
                    amount={item.amount}
                    percentage={item.percentage}
                    color={item.color}
                    icon={item.icon}
                    onPress={() => navigateToTransactions({ filterCategory: item.category })}
                  />
                ))}

                {/* Bottom 2 in 2-column grid */}
                {gridCategories.length > 0 && (
                  <View style={styles.categoryGrid}>
                    {gridCategories.map(item => (
                      <CategoryCard
                        key={item.category}
                        category={item.category}
                        amount={item.amount}
                        percentage={item.percentage}
                        color={item.color}
                        icon={item.icon}
                        onPress={() => navigateToTransactions({ filterCategory: item.category })}
                        compact
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Spending by Account ───────────────────────────────────────── */}
            {accountData.length > 0 && (
              <View style={styles.allocationSection}>
                <View style={styles.allocationHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.allocationTitle}>Spending by Account</Text>
                    <Text style={styles.allocationSubtitle}>
                      {accountData.length} {accountData.length === 1 ? 'account' : 'accounts'} with activity
                    </Text>
                  </View>
                </View>
                {accountData.map((item) => (
                  <View key={item.account} style={styles.accountCard}>
                    <View style={styles.accountCardTop}>
                      <View style={[styles.accountIconContainer, { backgroundColor: `${item.color}22` }]}>
                        <Ionicons name="card-outline" size={18} color={item.color} />
                      </View>
                      <View style={styles.accountCardMeta}>
                        <Text style={styles.accountCardName} numberOfLines={1}>{item.account}</Text>
                        <Text style={styles.accountCardPct}>{item.percentage.toFixed(0)}% of total</Text>
                      </View>
                      <Text style={styles.accountCardAmount}>{formatCurrency(item.amount)}</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.min(item.percentage, 100)}%`, backgroundColor: item.color },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ══════════════════ DETAILED TAB ══════════════════════════════════ */}
        {activeTab === 'detailed' && (
          <>
            {/* ── Category Spending Trends (Last 3 Months) ─────────────────── */}
            <View style={styles.detailedSection}>
              <Text style={styles.detailedSectionTitle}>Category Spending (Last 3 Months)</Text>
              {categoryTrends.length > 0 ? (
                categoryTrends.map(item => (
                  <CategoryTrendItem
                    key={item.category}
                    category={item.category}
                    months={item.months}
                    onPress={() => handleTrendItemPress(item.category)}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No trend data available</Text>
              )}
            </View>

            {/* ── Recurring Transactions ────────────────────────────────────── */}
            <View style={styles.detailedSection}>
              <Text style={styles.detailedSectionTitle}>Recurring Transactions</Text>
              {recurringData.length > 0 ? (
                recurringData.map((item, idx) => (
                  <RecurringItem
                    key={`${item.merchant}-${idx}`}
                    item={item}
                    onPress={() => handleRecurringItemPress(item.merchant)}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>No recurring transactions found</Text>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Month Picker Modal ────────────────────────────────────────────── */}
      <Modal
        visible={showMonthPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={[styles.modal, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Ionicons name="close" size={24} color={D.onSurface} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {availableMonths.map(m => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modalOption, selectedMonth === m.key && styles.modalOptionActive]}
                onPress={() => { setSelectedMonth(m.key); setShowMonthPicker(false); }}
              >
                <Text style={[styles.modalOptionText, selectedMonth === m.key && styles.modalOptionTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Custom Date Picker Modal ──────────────────────────────────────── */}
      <Modal
        visible={showCustomPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCustomPicker(false)}
      >
        <View style={[styles.modal, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            <TouchableOpacity onPress={() => setShowCustomPicker(false)}>
              <Ionicons name="close" size={24} color={D.onSurface} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>From Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={D.outline}
              value={customFromDate}
              onChangeText={setCustomFromDate}
            />
            <Text style={styles.inputLabel}>To Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={D.outline}
              value={customToDate}
              onChangeText={setCustomToDate}
            />
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowCustomPicker(false)}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: D.bg,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: D.onSurfaceVariant,
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 28,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: D.surfaceHigh,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: D.onSurface,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: D.outline,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },

  // ── Scroll ──────────────────────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 14, paddingTop: 16 },

  // ── Tab Switcher ─────────────────────────────────────────────────────────
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: D.surfaceLow,
    borderRadius: 12,
    padding: 3,
    marginBottom: 18,
    gap: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: D.surfaceHigh,
    borderWidth: 1,
    borderColor: D.outline,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  tabButtonTextActive: {
    color: D.onSurface,
    fontWeight: '700',
    fontFamily: 'Manrope',
  },

  // ── Detailed Section ─────────────────────────────────────────────────────
  detailedSection: {
    marginBottom: 22,
  },
  detailedSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: D.onSurfaceVariant,
    textAlign: 'center',
    marginTop: 16,
    fontFamily: 'Inter',
  },

  // ── Trend Item ────────────────────────────────────────────────────────────
  trendItem: {
    backgroundColor: D.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: D.outline,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  trendCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
    flex: 1,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  trendPercentage: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  trendColumn: {
    flex: 1,
    alignItems: 'center',
  },
  trendAmount: {
    fontSize: 10,
    color: D.onSurface,
    fontWeight: '700',
    fontFamily: 'Inter',
    marginBottom: 6,
  },
  trendBarContainer: {
    width: '100%',
    height: 80,
    backgroundColor: `${D.outline}55`,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBar: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  trendMonthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  monthColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trendMonth: {
    fontSize: 10,
    color: D.onSurfaceVariant,
    fontWeight: '700',
    fontFamily: 'Inter',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Recurring Item ────────────────────────────────────────────────────────
  recurringItem: {
    backgroundColor: D.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: D.outline,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recurringMerchant: {
    fontSize: 14,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
    flex: 1,
  },
  recurringAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
    fontFamily: 'Manrope',
  },
  recurringMeta: {
    marginBottom: 6,
  },
  recurringMetaText: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  recurringFooter: {
    borderTopWidth: 1,
    borderTopColor: D.outline,
    paddingTop: 6,
    marginTop: 2,
  },
  recurringFooterText: {
    fontSize: 11,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },

  // ── Period Selector ──────────────────────────────────────────────────────
  periodRow: { flexGrow: 0, marginBottom: 16 },
  periodRowContent: { gap: 8, paddingRight: 4 },
  periodPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: D.surfaceLow,
  },
  periodPillActive: {
    backgroundColor: D.surfaceHigh,
    borderWidth: 1,
    borderColor: D.outline,
  },
  periodPillText: {
    fontSize: 13,
    color: D.onSurfaceVariant,
  },
  periodPillTextActive: {
    color: D.onSurface,
    fontWeight: '700',
    fontFamily: 'Manrope',
  },

  // ── Hero Grid ────────────────────────────────────────────────────────────
  heroGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },
  heroOutflowCard: {
    flex: 2,
    backgroundColor: D.surface,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  outflowLabel: {
    fontSize: 10,
    color: D.onSurfaceVariant,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: 'Inter',
  },
  outflowAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: D.onSurface,
    fontFamily: 'Manrope',
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  outflowFooter: { gap: 5 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  outflowDateRange: {
    fontSize: 11,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },

  heroPeakCard: {
    flex: 1,
    backgroundColor: D.surfaceLow,
    borderRadius: 16,
    padding: 14,
    minHeight: 160,
  },
  peakHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
    marginBottom: 6,
  },
  peakDesc: {
    fontSize: 11,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
    lineHeight: 16,
    flex: 1,
    marginBottom: 10,
  },
  peakFooter: { gap: 2 },
  peakAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  peakLabel: {
    fontSize: 10,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
    letterSpacing: 0.4,
  },

  // ── Spending Allocation ──────────────────────────────────────────────────
  allocationSection: { marginBottom: 8 },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  allocationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
    marginBottom: 3,
  },
  allocationSubtitle: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  // ── Category Card ────────────────────────────────────────────────────────
  categoryCard: {
    backgroundColor: D.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  categoryCardCompact: {
    flex: 1,
    marginBottom: 0,
  },
  categoryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardMeta: {
    flex: 1,
    gap: 2,
  },
  categoryCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  categoryCardPct: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  categoryCardAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  progressTrack: {
    height: 1.5,
    backgroundColor: D.outline,
    borderRadius: 100,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 100,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: 8,
  },

  // ── Modals ───────────────────────────────────────────────────────────────
  modal: {
    flex: 1,
    backgroundColor: D.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: D.outline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  modalContent: { padding: 16 },
  modalOption: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionActive: { backgroundColor: D.surfaceHigh },
  modalOptionText: {
    fontSize: 15,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  modalOptionTextActive: {
    color: D.onSurface,
    fontWeight: '600',
    fontFamily: 'Manrope',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
    marginBottom: 8,
    marginTop: 14,
  },
  dateInput: {
    backgroundColor: D.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: D.outline,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: D.onSurface,
    fontFamily: 'Inter',
  },
  applyButton: {
    backgroundColor: D.surfaceHigh,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },

  // ── Account Card (Summary tab) ────────────────────────────────────────────
  accountCard: {
    backgroundColor: D.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  accountCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  accountIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountCardMeta: {
    flex: 1,
    gap: 2,
  },
  accountCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  accountCardPct: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  accountCardAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
});
