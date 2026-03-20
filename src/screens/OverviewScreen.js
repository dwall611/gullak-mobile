import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { formatCurrency, formatCompact, getCategoryColor } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

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

const STOP_WORDS = new Set(['payment', 'orig', 'entry', 'descr', 'name', 'from', 'with', 'bank', 'card', 'corp', 'inc', 'llc']);

function extractKeyword(merchant) {
  const words = (merchant || '').toLowerCase().split(/[\s,_]+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
  return words[0] || '';
}

function merchantMatches(recurringMerchant, txName) {
  const kw = extractKeyword(recurringMerchant);
  return kw ? (txName || '').toLowerCase().includes(kw) : false;
}

function getPfcPrimary(tx) {
  if (!tx.personal_finance_category) return '';
  try {
    const pfc = typeof tx.personal_finance_category === 'string' ? JSON.parse(tx.personal_finance_category) : tx.personal_finance_category;
    return (pfc?.primary || '').toUpperCase();
  } catch { return ''; }
}

function txEffectiveCategory(tx) {
  if (tx.override_category) return tx.override_category;
  const pfc = getPfcPrimary(tx);
  const MAP = {
    FOOD_AND_DRINK: 'Food & Dining', TRANSPORTATION: 'Transportation', GENERAL_MERCHANDISE: 'Shopping',
    ENTERTAINMENT: 'Entertainment', TRAVEL: 'Travel', PERSONAL_CARE: 'Personal Care', HEALTHCARE: 'Healthcare',
    RENT: 'Housing', HOME_IMPROVEMENT: 'Home', UTILITIES: 'Bills & Utilities', INCOME: 'Income',
    TRANSFER_IN: 'Transfer', TRANSFER_OUT: 'Transfer', LOAN_PAYMENTS: 'Credit Card Payments',
    BANK_FEES: 'Bank Fees', GROCERIES: 'Groceries', EDUCATION: 'Education', RENT_AND_UTILITIES: 'Bills & Utilities',
  };
  return MAP[pfc] || 'Uncategorized';
}

const P2P_KEYWORDS = ['zelle', 'venmo', 'cashapp', 'cash app', 'paypal'];
function isP2PPayment(tx) {
  return P2P_KEYWORDS.some((kw) => `${tx.merchant_name || ''} ${tx.name || ''}`.toLowerCase().includes(kw));
}

function isCCPaymentTx(tx) {
  if (isP2PPayment(tx)) return false;
  if (tx.override_category) {
    const oc = tx.override_category.toLowerCase();
    return oc === 'transfer' || oc === 'credit card payments';
  }
  const cat = txEffectiveCategory(tx).toLowerCase();
  if (cat === 'credit card payments' || cat === 'transfer') return true;
  const pfc = getPfcPrimary(tx);
  return pfc === 'LOAN_PAYMENTS' || pfc === 'TRANSFER_OUT';
}

const MANUAL_RECURRING = [
  { id: 'ny529-a', merchant: 'NewYork 529 Contribution', amount: 500, dayOfMonth: 5, skipMonths: [], keyword: '529' },
  { id: 'ny529-b', merchant: 'NewYork 529 Contribution', amount: 500, dayOfMonth: 5, skipMonths: [], keyword: '529' },
  { id: 'pseg', merchant: 'Public Service PSEG', amount: 120, dayOfMonth: 3, skipMonths: [], keyword: 'pseg' },
  { id: 'bilt-mortgage', merchant: 'Mortgage (Bilt)', amount: 5197, dayOfMonth: 5, skipMonths: [], keyword: 'bilt card hous' },
];

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  const severityConfig = {
    info: { icon: 'information-circle-outline', color: '#06b6d4', bg: '#0c2233' },
    warning: { icon: 'warning-outline', color: colors.warning, bg: '#2d1f0a' },
    critical: { icon: 'alert-circle-outline', color: colors.expense, bg: '#2d0a0a' },
  };

  return (
    <View style={styles.section}>
      {alerts.map((alert, idx) => {
        const cfg = severityConfig[alert.severity] || severityConfig.info;
        return (
          <View key={alert.id || idx} style={[styles.alertRow, { backgroundColor: cfg.bg, borderColor: cfg.color + '44' }]}>
            <Ionicons name={cfg.icon} size={18} color={cfg.color} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertMsg, { color: colors.text }]}>{alert.message}</Text>
              {alert.rule_name && <Text style={styles.alertRule}>{alert.rule_name}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── CC Payment Due Banner ─────────────────────────────────────────────────────
function PaymentDueBanner({ liabilities }) {
  if (!liabilities) return null;
  const creditCards = liabilities.credit_cards || [];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const soon = creditCards.filter(cc => {
    if (!cc.next_payment_due_date) return false;
    if (!cc.last_statement_balance || cc.last_statement_balance <= 0) return false;
    if (cc.payment_recorded) return false; // Skip if payment already recorded (cc_payment_tracking)
    const due = new Date(cc.next_payment_due_date);
    const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  });

  if (soon.length === 0) return null;

  return (
    <View style={styles.section}>
      {soon.map((cc, idx) => {
        const dueDate = new Date(cc.next_payment_due_date + 'T00:00:00');
        const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const label = daysUntil === 0 ? 'Due TODAY' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`;
        return (
          <View key={cc.account_id || idx} style={styles.paymentBanner}>
            <Ionicons name="card-outline" size={18} color={colors.warning} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>{cc.institution_name || cc.account_name}</Text>
              <Text style={styles.paymentSub}>{label} · {fmt(cc.last_statement_balance)}</Text>
            </View>
          </View>
        );
      })}
    </View>
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
        <View style={[styles.statCard, { backgroundColor: '#0f2d24' }]}>
          <Text style={styles.statLabel}>INCOME</Text>
          <Text style={[styles.statValue, { color: colors.income }]}>{formatCompact(income)}</Text>
          <Text style={styles.statSub}>{fmt(income)}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#2d0f0f' }]}>
          <Text style={styles.statLabel}>EXPENSES</Text>
          <Text style={[styles.statValue, { color: colors.expense }]}>{formatCompact(expenses)}</Text>
          <Text style={styles.statSub}>{fmt(expenses)}</Text>
        </View>
      </View>
      <View style={styles.summaryRow}>
        <View style={[styles.statCard, { backgroundColor: netFlow >= 0 ? '#0f1e2d' : '#2d1a0f' }]}>
          <Text style={styles.statLabel}>NET FLOW</Text>
          <Text style={[styles.statValue, { color: netFlow >= 0 ? '#60a5fa' : '#f97316' }]}>
            {netFlow >= 0 ? '+' : '-'}{formatCompact(Math.abs(netFlow))}
          </Text>
          <Text style={styles.statSub}>{netFlow >= 0 ? 'Positive' : 'Negative'}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#1a0f2d' }]}>
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

// ─── Balance Forecast Chart ───────────────────────────────────────────────────
function ForecastChart({ rows, todayStr }) {
  if (!rows || rows.length < 2) return null;

  const labels = rows.map(r => {
    const [, m, d] = r.date.split('-');
    return `${parseInt(m)}/${parseInt(d)}`;
  });

  const balanceData = rows.map(r => r.balance ?? 0);
  const paidData = rows.map(r => r.paid ?? 0);
  const receivedData = rows.map(r => r.received ?? 0);
  const todayIdx = rows.findIndex(r => r.date >= todayStr);

  const chartData = {
    labels,
    datasets: [
      {
        data: balanceData,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      },
      {
        data: paidData,
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
        strokeWidth: 2.5,
      },
      {
        data: receivedData,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2.5,
      },
    ],
    legend: ['Balance', 'Paid', 'Received'],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => colors.textSecondary,
    strokeWidth: 2,
    decimalPlaces: 0,
    propsForBackgroundLines: {
      stroke: colors.cardBorder,
      strokeWidth: 1,
    },
    formatYLabel: (v) => fmtK(parseFloat(v)),
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Balance Forecast</Text>
      <LineChart
        data={chartData}
        width={screenWidth - spacing.md * 2 - spacing.md * 2}
        height={180}
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [liabilities, setLiabilities] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [forecastData, setForecastData] = useState([]);

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
      const [statsData, alertHistory, categoryTotals, accountsData, recurringResp, liabResp] = await Promise.all([
        api.getSummary({ start_date: dates.startDate, end_date: dates.endDate }),
        api.getAlertHistory(10),
        api.getSpendingByCategory(dates.startDate, dates.endDate, false),
        api.getAccounts(),
        api.getRecurringTransactions(6),
        api.getLiabilities(),
      ]);

      setStats(statsData);
      setAlerts(alertHistory.alerts?.filter(a => !a.acknowledged_at) || []);
      setCategoryData((categoryTotals.data || []).map(item => ({ category: item.category_name, amount: item.total })).sort((a, b) => b.amount - a.amount));
      setLiabilities(liabResp);

      // Budget + Forecast calculation
      const checking = (accountsData.accounts || []).find(a => a.name === 'Main Checking');
      if (checking) {
        const [checkingTxnsData, allTxnsData] = await Promise.all([
          api.getTransactions({ account_id: checking.id, start_date: dates.startDate, end_date: dates.endDate, limit: 500 }),
          api.getTransactions({ start_date: dates.startDate, end_date: dates.endDate, limit: 2000 }),
        ]);

        const checkingTxns = checkingTxnsData.transactions || [];
        const allTxns = allTxnsData.transactions || [];
        const recurringPatterns = recurringResp?.data || [];
        const mainRecurring = recurringPatterns.filter(r => r.account === 'Main Checking');
        const matchedTxnIds = new Set();
        const incomeItems = [];
        const fixedItems = [];

        // Manual recurring
        for (const manual of MANUAL_RECURRING) {
          if (manual.skipMonths?.includes(dates.monthIndex)) continue;
          const matched = checkingTxns.filter(tx => {
            const haystack = `${tx.merchant_name || ''} ${tx.name || ''}`.toLowerCase();
            return haystack.includes(manual.keyword) && !matchedTxnIds.has(tx.id);
          });
          const match = matched[0];
          if (match) matchedTxnIds.add(match.id);
          fixedItems.push({ expectedAmount: manual.amount, actualAmount: match ? Math.abs(match.amount) : null, isPosted: !!match });
        }

        // Recurring patterns
        for (const rec of mainRecurring) {
          if (rec.category === 'Credit Card Payments' || rec.category === 'Transfer') continue;
          const isFitch = rec.merchant.toLowerCase().includes('fitch');
          const isHSBC = rec.merchant.toLowerCase().includes('hsbc');
          const isIncome = rec.avgAmount < 0;
          const matched = checkingTxns.filter(tx => merchantMatches(rec.merchant, tx.merchant_name || tx.name || '') && !matchedTxnIds.has(tx.id));

          if (isFitch || (isIncome && isHSBC)) {
            const avgSingle = Math.abs(rec.avgAmount);
            const pay1 = matched.find(tx => parseInt(tx.date.split('-')[2], 10) <= 17);
            const pay2 = matched.find(tx => parseInt(tx.date.split('-')[2], 10) > 17 && tx !== pay1);
            [pay1, pay2].forEach(match => {
              if (match) matchedTxnIds.add(match.id);
              incomeItems.push({ expectedAmount: avgSingle, actualAmount: match ? Math.abs(match.amount) : null, isPosted: !!match });
            });
          } else if (isIncome) {
            const match = matched[0];
            if (match) matchedTxnIds.add(match.id);
            incomeItems.push({ expectedAmount: Math.abs(rec.avgAmount), actualAmount: match ? Math.abs(match.amount) : null, isPosted: !!match });
          } else {
            const match = matched[0];
            if (match) matchedTxnIds.add(match.id);
            fixedItems.push({ expectedAmount: Math.abs(rec.avgAmount), actualAmount: match ? Math.abs(match.amount) : null, isPosted: !!match });
          }
        }

        // Discretionary
        const EXCLUDED_ACCOUNTS = ['Rental'];
        const discretionaryTxns = [];
        for (const tx of allTxns) {
          if (matchedTxnIds.has(tx.id) || tx.amount <= 0) continue;
          if (EXCLUDED_ACCOUNTS.some(name => (tx.account_name || '').toLowerCase().includes(name.toLowerCase()))) continue;
          if (!isCCPaymentTx(tx)) discretionaryTxns.push(tx);
        }

        const effectiveIncome = incomeItems.reduce((s, i) => s + (i.isPosted ? i.actualAmount : i.expectedAmount), 0);
        const effectiveFixed = fixedItems.reduce((s, i) => s + (i.isPosted ? i.actualAmount : i.expectedAmount), 0);
        const budget = effectiveIncome - effectiveFixed;
        const discretionarySpent = discretionaryTxns.reduce((s, tx) => s + tx.amount, 0);
        const burnPct = budget > 0 ? (discretionarySpent / budget) * 100 : 0;

        setBudgetData({ budget, spent: discretionarySpent, timePct, burnPct });

        // Forecast - Recurring Projections
        const projectedRows = [];
        
        // Add recurring expense projections
        const addDays = (d, n) => {
          const result = new Date(d);
          result.setDate(result.getDate() + n);
          return result;
        };

        const interval = (rec) => {
          const avg = rec.avgInterval;
          if (avg == null || isNaN(avg) || avg <= 0) return 30;
          return Math.max(Math.round(avg), 7);
        };

        const HUDSON_OVERRIDE = { amount: 6082, dayOfMonth: 1, skipMonths: [5, 6] };
        const getOverride = (merchant) => {
          if (merchant.toLowerCase().includes('hudson')) return HUDSON_OVERRIDE;
          return null;
        };

        const generateDates = (rec) => {
          const override = getOverride(rec.merchant);
          const dom = rec.dayOfMonth ?? rec.day_of_month ?? (override?.dayOfMonth);
          const currentMonthStr = dates.todayStr.substring(0, 7);
          const today = new Date(dates.todayStr);

          if (dom != null && !isNaN(dom)) {
            const projDates = [];
            for (let mo = 0; mo <= 1; mo++) {
              const d = new Date(today.getFullYear(), today.getMonth() + mo, dom);
              const dStr = formatDateStr(d);
              if (dStr > dates.projectionEndDate) break;
              if (dStr <= dates.todayStr) continue;
              if (override?.skipMonths?.includes(d.getMonth())) continue;
              projDates.push(dStr);
            }
            return projDates;
          }

          if (!rec.nextExpected) return [];
          let cursor = new Date(rec.nextExpected);
          if (isNaN(cursor.getTime())) return [];
          const step = interval(rec);
          while (formatDateStr(cursor) <= dates.todayStr) {
            cursor = addDays(cursor, step);
          }
          const projDates = [];
          while (true) {
            const d = formatDateStr(cursor);
            if (d > dates.projectionEndDate) break;
            projDates.push(d);
            cursor = addDays(cursor, step);
          }
          return projDates;
        };

        // Project API-detected recurring patterns
        for (const rec of mainRecurring) {
          if (rec.category === 'Credit Card Payments' || rec.category === 'Transfer') continue;
          const alreadyPaid = checkingTxns.some((tx) =>
            merchantMatches(rec.merchant, tx.merchant_name || tx.name || '')
          );
          const step = interval(rec);
          const currentMonthStr = dates.todayStr.substring(0, 7);
          for (const projDateStr of generateDates(rec)) {
            if (alreadyPaid && step >= 28 && projDateStr.substring(0, 7) === currentMonthStr) continue;
            projectedRows.push({
              id: `proj-${rec.merchant}-${projDateStr}`,
              date: projDateStr,
              name: rec.merchant,
              merchant_name: rec.merchant,
              amount: rec.avgAmount,
              isProjected: true,
            });
          }
        }

        // Project manual recurring
        const today = new Date(dates.todayStr);
        for (const manual of MANUAL_RECURRING) {
          const alreadyPaid = checkingTxns.some((tx) =>
            (tx.merchant_name || tx.name || '').toLowerCase().includes(manual.keyword)
          );
          const currentMonthStr = dates.todayStr.substring(0, 7);
          for (let mo = 0; mo <= 1; mo++) {
            const d = new Date(today.getFullYear(), today.getMonth() + mo, manual.dayOfMonth);
            const dStr = formatDateStr(d);
            if (dStr <= dates.todayStr || dStr > dates.projectionEndDate) continue;
            if (manual.skipMonths?.includes(d.getMonth())) continue;
            if (alreadyPaid && dStr.substring(0, 7) === currentMonthStr) continue;
            projectedRows.push({
              id: `proj-manual-${manual.id}-${dStr}`,
              date: dStr,
              name: manual.merchant,
              merchant_name: manual.merchant,
              amount: manual.amount,
              isProjected: true,
            });
          }
        }

        // Add CC payment projections
        try {
          const creditCards = liabResp?.credit_cards || [];
          for (const cc of creditCards) {
            const dueDate = cc.next_payment_due_date;
            const stmtBal = cc.last_statement_balance;
            if (!stmtBal || stmtBal <= 0 || !dueDate || dueDate <= dates.todayStr || dueDate > dates.projectionEndDate || cc.payment_recorded) continue;
            const mask = cc.mask;
            const instName = (cc.institution_name || cc.account_name || '').toLowerCase();
            const alreadyPaid = checkingTxns.some(tx => {
              const name = (tx.merchant_name || tx.name || '').toLowerCase();
              return (mask && name.includes(mask)) || (instName && name.includes(instName.split(' ')[0]));
            });
            if (!alreadyPaid) {
              projectedRows.push({ date: dueDate, amount: stmtBal, isProjected: true, isCCPayment: true });
            }
          }
        } catch (err) {
          console.error('[Overview] Forecast CC error:', err);
        }

        const allRows = [...checkingTxns, ...projectedRows].sort((a, b) => a.date > b.date ? 1 : a.date < b.date ? -1 : 0);
        const currentBalance = checking.current_balance || 0;
        let anchorIdx = -1;
        for (let i = allRows.length - 1; i >= 0; i--) {
          if (!allRows[i].isProjected && !allRows[i].isCCPayment && allRows[i].date <= dates.yesterday) {
            anchorIdx = i;
            break;
          }
        }

        const balances = new Array(allRows.length);
        if (anchorIdx === -1) {
          const todayActual = allRows.filter(r => !r.isProjected && !r.isCCPayment && r.date >= dates.todayStr);
          const preTodayBal = currentBalance + todayActual.reduce((s, r) => s + r.amount, 0);
          let bal = preTodayBal;
          for (let i = 0; i < allRows.length; i++) { bal = bal - allRows[i].amount; balances[i] = bal; }
        } else {
          balances[anchorIdx] = currentBalance;
          for (let i = anchorIdx + 1; i < allRows.length; i++) { balances[i] = balances[i - 1] - allRows[i].amount; }
          for (let i = anchorIdx - 1; i >= 0; i--) { balances[i] = balances[i + 1] + allRows[i + 1].amount; }
        }

        // Add paid/received tracking
        let runPaid = 0, runReceived = 0;
        const rowsWithBalance = allRows.map((tx, idx) => {
          if (tx.amount > 0) runPaid += tx.amount;
          else runReceived += Math.abs(tx.amount);
          return {
            date: tx.date,
            balance: balances[idx],
            paid: runPaid,
            received: runReceived,
            isProjected: tx.isProjected || tx.isCCPayment,
          };
        });

        // Aggregate by date
        const byDate = new Map();
        for (const r of rowsWithBalance) {
          byDate.set(r.date, {
            date: r.date,
            balance: r.balance,
            paid: r.paid,
            received: r.received,
            isProjected: r.isProjected,
          });
        }
        setForecastData([...byDate.values()].sort((a, b) => a.date > b.date ? 1 : -1));
      }
    } catch (err) {
      console.error('[OverviewScreen] Error:', err);
      setError(err.message || 'Failed to load data');
    }
  }, [dates, timePct]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

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
          <AlertBanner alerts={alerts} />

          {/* CC Payment Due */}
          <PaymentDueBanner liabilities={liabilities} />

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
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
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
  paymentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d1f0a',
    borderColor: colors.warning + '44',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  paymentTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  paymentSub: {
    fontSize: fontSize.xs,
    color: colors.warning,
    marginTop: 2,
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
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: 2,
  },
  statSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  chart: {
    borderRadius: radius.md,
    marginHorizontal: -spacing.xs,
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
  },
  categoryAmt: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  categoryPct: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
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
    backgroundColor: '#1e293b',
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
