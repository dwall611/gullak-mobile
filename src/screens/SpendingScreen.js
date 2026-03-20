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
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const screenWidth = Dimensions.get('window').width;

// ─── Category colors (matching Gullak dashboard) ─────────────────────────────
const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

// ─── Category name formatting ─────────────────────────────────────────────────
const CATEGORY_MAP = {
  'FOOD_AND_DRINK': 'Food & Dining',
  'TRANSPORTATION': 'Transportation',
  'GENERAL_MERCHANDISE': 'Shopping',
  'ENTERTAINMENT': 'Entertainment',
  'TRAVEL': 'Travel',
  'PERSONAL_CARE': 'Personal Care',
  'HEALTHCARE': 'Healthcare',
  'RENT': 'Housing',
  'HOME_IMPROVEMENT': 'Home',
  'UTILITIES': 'Bills & Utilities',
  'INCOME': 'Income',
  'TRANSFER_IN': 'Transfer',
  'TRANSFER_OUT': 'Transfer',
  'LOAN_PAYMENTS': 'Loan Payments',
  'BANK_FEES': 'Bank Fees',
  'GOVERNMENT_AND_NON_PROFIT': 'Government',
  'SERVICE': 'Services',
  'GROCERIES': 'Groceries',
  'AUTO': 'Transportation',
  'EDUCATION': 'Education',
  'UNCATEGORIZED': 'Uncategorized',
  'RENT_AND_UTILITIES': 'Bills & Utilities',
};

const formatCategoryName = (rawCategory) => {
  if (!rawCategory) return 'Uncategorized';
  if (CATEGORY_MAP[rawCategory]) return CATEGORY_MAP[rawCategory];
  return 'Uncategorized';
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

function getAccountName(tx) {
  return tx.account_name || 'Unknown';
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

// ─── Date formatting ──────────────────────────────────────────────────────────
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
    case '1day': break;
    case '7days': startDate.setDate(endDate.getDate() - 6); break;
    case 'mtd': startDate.setDate(1); break;
    case 'ytd': startDate.setMonth(0); startDate.setDate(1); break;
    case 'month':
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        startDate.setFullYear(parseInt(year), parseInt(month) - 1, 1);
        endDate.setFullYear(parseInt(year), parseInt(month), 0);
      }
      break;
    case 'custom':
      if (customFromDate) startDate.setTime(new Date(customFromDate).getTime());
      if (customToDate) endDate.setTime(new Date(customToDate).getTime());
      break;
    default: startDate.setDate(endDate.getDate() - 6);
  }

  return {
    start_date: formatLocalDate(startDate),
    end_date: formatLocalDate(endDate),
  };
}

const DATE_RANGE_OPTIONS = [
  { value: '1day',  label: '1D' },
  { value: '7days', label: '7D' },
  { value: 'mtd',   label: 'MTD' },
  { value: 'ytd',   label: 'YTD' },
  { value: 'month', label: 'Month' },
  { value: 'custom', label: 'Custom' },
];

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

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon, color = colors.primary, onPress }) {
  return (
    <TouchableOpacity style={styles.summaryCard} onPress={onPress} disabled={!onPress}>
      <View style={styles.summaryHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.summaryLabel}>{label}</Text>
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </View>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    </TouchableOpacity>
  );
}

// ─── Category Item ────────────────────────────────────────────────────────────
function CategoryItem({ category, amount, percentage, color, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.categoryItem, selected && styles.categoryItemSelected]}
      onPress={onPress}
    >
      <View style={styles.categoryItemHeader}>
        <View style={styles.categoryItemLeft}>
          <View style={[styles.categoryColorDot, { backgroundColor: color }]} />
          <Text style={styles.categoryItemName}>{category}</Text>
        </View>
        <Text style={styles.categoryItemAmount}>{formatCurrency(amount)}</Text>
      </View>
      <View style={styles.categoryItemBar}>
        <View style={[styles.categoryItemBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.categoryItemPercentage}>{percentage.toFixed(0)}%</Text>
    </TouchableOpacity>
  );
}

// ─── Account Item ─────────────────────────────────────────────────────────────
function AccountItem({ account, amount, percentage, color, onPress }) {
  return (
    <TouchableOpacity style={styles.categoryItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.categoryItemHeader}>
        <View style={styles.categoryItemLeft}>
          <View style={[styles.categoryColorDot, { backgroundColor: color }]} />
          <Text style={styles.categoryItemName}>{account}</Text>
        </View>
        <View style={styles.categoryItemRight}>
          <Text style={styles.categoryItemAmount}>{formatCurrency(amount)}</Text>
          {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: spacing.xs }} />}
        </View>
      </View>
      <View style={styles.categoryItemBar}>
        <View style={[styles.categoryItemBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.categoryItemPercentage}>{percentage.toFixed(0)}%</Text>
    </TouchableOpacity>
  );
}

// ─── Category Trend Item ──────────────────────────────────────────────────────
function CategoryTrendItem({ category, months, onPress }) {
  const monthLabels = Array.from({length: 3}, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2 + i);
    return d.toLocaleDateString('en-US', { month: 'short' });
  });
  const monthColors = ['#3b82f6', '#10b981', '#f59e0b']; // blue, green, amber
  const maxValue = Math.max(...months, 1);
  
  // Calculate trend (Feb vs Jan, Mar vs Feb)
  const trend1 = months[0] > 0 ? ((months[1] - months[0]) / months[0]) * 100 : 0;
  const trend2 = months[1] > 0 ? ((months[2] - months[1]) / months[1]) * 100 : 0;
  const avgTrend = (trend1 + trend2) / 2;

  return (
    <TouchableOpacity style={styles.trendItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.trendHeader}>
        <Text style={styles.trendCategory}>{category}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {avgTrend !== 0 && (
            <View style={styles.trendIndicator}>
              <Ionicons 
                name={avgTrend > 0 ? 'trending-up' : 'trending-down'} 
                size={14} 
                color={avgTrend > 0 ? colors.expense : colors.income} 
              />
              <Text style={[
                styles.trendPercentage,
                { color: avgTrend > 0 ? colors.expense : colors.income }
              ]}>
                {Math.abs(avgTrend).toFixed(0)}%
              </Text>
            </View>
          )}
          {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
        </View>
      </View>
      <View style={styles.trendBars}>
        {months.map((amount, idx) => {
          const heightPercent = maxValue > 0 ? (amount / maxValue) * 100 : 0;
          return (
            <View key={idx} style={styles.trendColumn}>
              <Text style={styles.trendAmount}>{formatCurrency(amount)}</Text>
              <View style={styles.trendBarContainer}>
                <View style={[
                  styles.trendBar,
                  { 
                    height: `${heightPercent}%`,
                    backgroundColor: monthColors[idx],
                  }
                ]} />
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

// ─── Recurring Transaction Item ───────────────────────────────────────────────
function RecurringItem({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.recurringItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.recurringHeader}>
        <Text style={styles.recurringMerchant}>{item.merchant}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={styles.recurringAmount}>{formatCurrency(item.avgAmount)}</Text>
          {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
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

// ─── Transaction Item ─────────────────────────────────────────────────────────
function TransactionItem({ transaction }) {
  const category = getCategory(transaction);
  const accountName = getAccountName(transaction);
  const merchantName = transaction.merchant_name || transaction.name || 'Unknown';

  return (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <Text style={styles.transactionMerchant} numberOfLines={1}>
          {merchantName}
        </Text>
        <Text style={styles.transactionMeta} numberOfLines={1}>
          {category} • {accountName}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          { color: transaction.amount > 0 ? colors.expense : colors.income }
        ]}>
          {formatCurrency(Math.abs(transaction.amount))}
        </Text>
        <Text style={styles.transactionDate}>{transaction.date}</Text>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function SpendingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [stats, setStats] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [accountData, setAccountData] = useState([]);
  const [categoryTrends, setCategoryTrends] = useState([]);
  const [recurringData, setRecurringData] = useState([]);
  const [dateRange, setDateRange] = useState('7days');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // summary | detailed
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const { start_date, end_date } = getDateRange(dateRange, selectedMonth, customFromDate, customToDate);

      // Compute last-3-months range for category trends dynamically
      const trendNow = new Date();
      const trend3MonthsAgo = new Date(trendNow.getFullYear(), trendNow.getMonth() - 2, 1);
      const trendStart = `${trend3MonthsAgo.getFullYear()}-${String(trend3MonthsAgo.getMonth()+1).padStart(2,'0')}-01`;
      const trendEnd = `${trendNow.getFullYear()}-${String(trendNow.getMonth()+1).padStart(2,'0')}-${String(new Date(trendNow.getFullYear(),trendNow.getMonth()+1,0).getDate()).padStart(2,'0')}`;

      const [statsData, categoryTotals, accountTotals, allTx, categoryTrendsData, recurringTxData] = await Promise.all([
        api.getSummary({ start_date, end_date }),
        api.getSpendingByCategory(start_date, end_date, false),
        api.getAccountSpending(start_date, end_date),
        api.getTransactions({ start_date, end_date, sort_by: 'date', order: 'desc' }),
        api.getSpendingByCategory(trendStart, trendEnd, true),
        api.getRecurringTransactions(3),
      ]);

      setStats(statsData);
      setAllTransactions(allTx.transactions || []);

      const categoryList = (categoryTotals.data || [])
        .map(item => ({ category: item.category_name, amount: item.total }))
        .sort((a, b) => b.amount - a.amount);
      
      const categoryTotal = categoryList.reduce((sum, c) => sum + c.amount, 0);
      setCategoryData(
        categoryList.map((c, idx) => ({
          ...c,
          percentage: categoryTotal > 0 ? (c.amount / categoryTotal) * 100 : 0,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        }))
      );

      const accountList = (accountTotals.accountSpending || [])
        .filter(item => item.total_spending > 0)
        .map(item => ({ account: item.name, amount: item.total_spending }))
        .sort((a, b) => b.amount - a.amount);
      
      const accountTotal = accountList.reduce((sum, a) => sum + a.amount, 0);
      setAccountData(
        accountList.map((a, idx) => ({
          ...a,
          percentage: accountTotal > 0 ? (a.amount / accountTotal) * 100 : 0,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        }))
      );

      // Process category trends (last 3 months)
      const trendsMap = {};
      (categoryTrendsData.data || []).forEach(item => {
        const cat = item.category_name;
        const month = item.date ? item.date.slice(0, 7) : '';
        if (!trendsMap[cat]) trendsMap[cat] = {};
        trendsMap[cat][month] = item.total;
      });

      // Generate last 3 months dynamically
      const now = new Date();
      const months = Array.from({length: 3}, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 2 + i, 1);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      });
      const trendsList = Object.keys(trendsMap)
        .map(cat => {
          const values = months.map(m => trendsMap[cat][m] || 0);
          const total = values.reduce((sum, v) => sum + v, 0);
          return { category: cat, months: values, total };
        })
        .filter(t => t.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      setCategoryTrends(trendsList);

      // Process recurring transactions
      setRecurringData((recurringTxData.data || []).slice(0, 10));
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load spending data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedMonth, customFromDate, customToDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Clear cache and reload data every time screen is focused
      // This ensures we always show fresh data after category updates
      clearCache();
      loadDashboard();
      return () => {};
    }, [loadDashboard])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    if (value === 'month') {
      setShowMonthPicker(true);
    } else if (value === 'custom') {
      setShowCustomPicker(true);
    } else {
      setSelectedMonth('');
      setCustomFromDate('');
      setCustomToDate('');
    }
  };

  const handleCategoryPress = (category) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  // Navigation handlers
  const navigateToTransactions = (filters = {}) => {
    // Include current date range in navigation params
    const dateRangeParams = {
      dateRange: dateRange,
      selectedMonth: selectedMonth,
      customFromDate: customFromDate,
      customToDate: customToDate,
      returnTo: 'Spending', // Track originating tab for back navigation
    };
    navigation.navigate('Transactions', { ...dateRangeParams, ...filters });
  };

  const handleTotalSpendPress = () => {
    navigateToTransactions();
  };

  const handleCategoryItemPress = (category) => {
    navigateToTransactions({ filterCategory: category });
  };

  const handleAccountItemPress = (account) => {
    navigateToTransactions({ filterAccount: account });
  };

  const handleRecurringItemPress = (merchant) => {
    navigateToTransactions({ searchMerchant: merchant });
  };

  const handleTrendItemPress = (category) => {
    navigateToTransactions({ filterCategory: category });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: spacing.md, fontSize: fontSize.sm }}>Loading spending data...</Text>
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
          <Ionicons name="alert-circle-outline" size={40} color={colors.expense} />
          <Text style={{ color: colors.expense, marginTop: spacing.md, textAlign: 'center', paddingHorizontal: spacing.xl }}>{error}</Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.md }}
            onPress={loadDashboard}
          >
            <Text style={{ color: '#fff', fontWeight: fontWeight.semibold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spending</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
      >
        {/* Date Range Chips */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {DATE_RANGE_OPTIONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                onPress={() => handleDateRangeChange(value)}
                style={[styles.filterChip, dateRange === value && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, dateRange === value && styles.filterChipTextActive]}>
                  {dateRange === 'month' && selectedMonth ? 
                    availableMonths.find(m => m.key === selectedMonth)?.label || label :
                    dateRange === 'custom' && customFromDate ? 
                      `${customFromDate.slice(5)} - ${customToDate.slice(5)}` :
                      label
                  }
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* View Mode Toggle */}
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            onPress={() => setViewMode('summary')}
            style={[styles.viewToggleButton, viewMode === 'summary' && styles.viewToggleButtonActive]}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={viewMode === 'summary' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.viewToggleText, viewMode === 'summary' && styles.viewToggleTextActive]}>
              Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('detailed')}
            style={[styles.viewToggleButton, viewMode === 'detailed' && styles.viewToggleButtonActive]}
          >
            <Ionicons
              name="bar-chart-outline"
              size={16}
              color={viewMode === 'detailed' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.viewToggleText, viewMode === 'detailed' && styles.viewToggleTextActive]}>
              Detailed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        {stats && stats.summary && (
          <View style={styles.summaryCardsRow}>
            <SummaryCard
              label="Total Spend"
              value={formatCurrency(stats.summary.expenses || 0)}
              icon="cash-outline"
              color={colors.expense}
              onPress={handleTotalSpendPress}
            />
          </View>
        )}

        {/* Summary View */}
        {viewMode === 'summary' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending by Category</Text>
              {categoryData.map((item) => (
                <CategoryItem
                  key={item.category}
                  category={item.category}
                  amount={item.amount}
                  percentage={item.percentage}
                  color={item.color}
                  selected={selectedCategory === item.category}
                  onPress={() => handleCategoryItemPress(item.category)}
                />
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending by Account</Text>
              {accountData.map((item) => (
                <AccountItem
                  key={item.account}
                  account={item.account}
                  amount={item.amount}
                  percentage={item.percentage}
                  color={item.color}
                  onPress={() => handleAccountItemPress(item.account)}
                />
              ))}
            </View>
          </>
        )}

        {/* Detailed View */}
        {viewMode === 'detailed' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category Spending (Last 3 Months)</Text>
              {categoryTrends.length > 0 ? (
                categoryTrends.map((item) => (
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recurring Transactions</Text>
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
      </ScrollView>

      {/* Month Picker Modal */}
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
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {availableMonths.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.modalOption, selectedMonth === m.key && styles.modalOptionActive]}
                onPress={() => {
                  setSelectedMonth(m.key);
                  setShowMonthPicker(false);
                }}
              >
                <Text style={[styles.modalOptionText, selectedMonth === m.key && styles.modalOptionTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
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
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>From Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={customFromDate}
              onChangeText={setCustomFromDate}
            />
            <Text style={styles.inputLabel}>To Date</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              value={customToDate}
              onChangeText={setCustomToDate}
            />
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowCustomPicker(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  filterRow: {
    marginBottom: spacing.md,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  viewToggleButtonActive: {
    backgroundColor: colors.background,
  },
  viewToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  viewToggleTextActive: {
    color: colors.primary,
  },
  summaryCardsRow: {
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  categoryItem: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}15`,
  },
  categoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  categoryItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryItemName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  categoryItemAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.expense,
  },
  categoryItemBar: {
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  categoryItemBarFill: {
    height: '100%',
  },
  categoryItemPercentage: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
  transactionItem: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  transactionLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  transactionMerchant: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  transactionMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  trendItem: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  trendCategory: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  trendPercentage: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  trendBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  trendColumn: {
    flex: 1,
    alignItems: 'center',
  },
  trendAmount: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  trendBarContainer: {
    width: '100%',
    height: 100,
    backgroundColor: `${colors.textMuted}15`,
    borderRadius: radius.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBar: {
    width: '100%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  trendMonthLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  monthColorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trendMonth: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  recurringItem: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  recurringMerchant: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  recurringAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.expense,
  },
  recurringMeta: {
    marginBottom: spacing.xs,
  },
  recurringMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  recurringFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
  },
  recurringFooterText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalContent: {
    padding: spacing.md,
  },
  modalOption: {
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  modalOptionActive: {
    backgroundColor: `${colors.primary}20`,
  },
  modalOptionText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  modalOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  dateInput: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.text,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  applyButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
});
