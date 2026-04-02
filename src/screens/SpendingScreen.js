import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { api, clearCache } from '../api/client';
import { formatCurrency, formatDate, formatShortDate } from '../utils/helpers';
import { surface, text, brand, border, fontFamily, fontSize as fz, fontWeight as fw, barColors, semantic } from '../theme/designTokens';

const screenWidth = Dimensions.get('window').width;

// ─── Design Tokens (local alias for SpendingScreen) ───────────────────────────
const D = {
  bg:               surface.bg,
  surface:          surface.base,
  surfaceLow:       surface.low,
  surfaceHigh:      surface.high,
  cardBg:           surface.cardBg,     // Stitch design card background (#212121)
  onSurface:        text.primary,
  onSurfaceVariant: text.secondary,
  primary:          brand.primary,
  outline:          border.outline,
  accentOrange:     semantic.accent,    // #f97316
  barBlue:          barColors.oldest,   // #3b82f6
  barGreen:         barColors.middle,   // #22c55e
  barOrange:        barColors.current,  // #f97316
};

// ─── Category config (icon + color per category) ──────────────────────────────
const CATEGORY_CONFIG = {
  'Travel':            { color: '#3b82f6', icon: 'airplane-outline' },
  'Bank Fees':         { color: '#10b981', icon: 'card-outline' },
  'Shopping':          { color: '#f59e0b', icon: 'bag-handle-outline' },
  'Food & Dining':     { color: '#f43f5e', icon: 'restaurant-outline' },
  'Transportation':    { color: '#8b5cf6', icon: 'car-outline' },
  'Cash Payment':      { color: '#ec4899', icon: 'cash-outline' },
  'Bills & Utilities': { color: '#06b6d4', icon: 'flash-outline' },
  'Entertainment':     { color: '#f97316', icon: 'film-outline' },
  'Healthcare':        { color: '#84cc16', icon: 'medkit-outline' },
  'Housing':           { color: '#6366f1', icon: 'home-outline' },
  'Groceries':         { color: '#10b981', icon: 'cart-outline' },
  'Personal Care':     { color: '#ec4899', icon: 'heart-outline' },
  'Loan Payments':     { color: '#ef4444', icon: 'trending-down-outline' },
  'Education':         { color: '#f59e0b', icon: 'school-outline' },
  'Services':          { color: '#a78bfa', icon: 'construct-outline' },
  'Government':        { color: '#64748b', icon: 'business-outline' },
};

const DEFAULT_CATEGORY_CONFIG = { color: '#6b7280', icon: 'ellipsis-horizontal-outline' };

// ─── Frequency display helpers ────────────────────────────────────────────────
const FREQ_DISPLAY = {
  weekly: 'Weekly',
  bi_weekly: 'Bi-weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  bi_monthly: 'Bi-monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
  // Legacy values
  Weekly: 'Weekly',
  'Bi-weekly': 'Bi-weekly',
  Monthly: 'Monthly',
  Quarterly: 'Quarterly',
  Yearly: 'Yearly',
  Custom: 'Custom',
};

// ─── Bar label formatter (compact, no decimals) ───────────────────────────────
function formatBarLabel(amount) {
  const abs = Math.abs(amount);
  if (abs >= 1000) return '$' + (amount / 1000).toFixed(1) + 'K';
  return '$' + Math.round(amount).toLocaleString();
}

const CATEGORY_COLORS_FALLBACK = [
  '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

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

// ─── CC Payment helpers ─────────────────────────────────────────────────────
function isDueWithinDays(dateStr, days) {
  if (!dateStr) return false;
  const dueDate = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const dueDate = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

function daysUntilDue(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date().toISOString().split('T')[0];
  const due = dateStr.split('T')[0];
  const diffMs = new Date(due) - new Date(today);
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatAprType(type) {
  if (!type) return 'APR';
  return type.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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
  const monthColors = [D.barBlue, D.barGreen, D.barOrange];
  const maxValue = Math.max(...months, 1);
  const totalAmount = months.reduce((sum, v) => sum + v, 0);

  // Get category config for icon
  const catConfig = CATEGORY_CONFIG[category] || DEFAULT_CATEGORY_CONFIG;

  return (
    <TouchableOpacity style={styles.trendItem} onPress={onPress} disabled={!onPress} activeOpacity={0.75}>
      {/* Left side: icon + category name + total amount */}
      <View style={styles.trendLeft}>
        <View style={[styles.trendIconContainer, { backgroundColor: `${catConfig.color}22` }]}>
          <Ionicons name={catConfig.icon} size={18} color={catConfig.color} />
        </View>
        <View style={styles.trendInfo}>
          <Text style={styles.trendCategory}>{category}</Text>
          <Text style={styles.trendTotalAmount}>{formatCurrency(totalAmount)}</Text>
        </View>
      </View>

      {/* Right side: 3 mini vertical bars */}
      <View style={styles.trendBars}>
        {months.map((amount, idx) => {
          const heightPercent = maxValue > 0 ? (amount / maxValue) * 100 : 0;
          const barHeight = Math.max((heightPercent / 100) * 48, 2); // max 48px height
          return (
            <View key={idx} style={styles.trendBarColumn}>
              <Text style={[styles.trendBarAmount, { color: monthColors[idx] }]}>
                {formatBarLabel(amount)}
              </Text>
              <View style={styles.trendBarTrack}>
                <View
                  style={[
                    styles.trendBarFill,
                    {
                      height: barHeight,
                      backgroundColor: monthColors[idx],
                    },
                  ]}
                />
              </View>
              <Text style={styles.trendBarMonth}>{monthLabels[idx]}</Text>
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

// ─── CC Liability Card ───────────────────────────────────────────────────────
function CCLiabilityCard({ card, style }) {
  const {
    account_name,
    mask,
    last_statement_balance,
    current_balance,
    credit_limit,
    minimum_payment_amount,
    next_payment_due_date,
    aprs,
    last_payment_amount,
    last_payment_date,
    is_overdue,
    payment_recorded,
  } = card;

  const utilizationPct = credit_limit > 0 ? (last_statement_balance / credit_limit) * 100 : 0;
  const daysLeft = daysUntilDue(next_payment_due_date);
  const hasBalance = (last_statement_balance || 0) > 0;
  const isPastDue = hasBalance && !payment_recorded && daysLeft < 0;
  const isUrgent = hasBalance && !payment_recorded && daysLeft <= 10 && daysLeft >= 0;
  const paid = payment_recorded || last_statement_balance === 0;

  // Status color for due date text
  let statusColor = D.onSurfaceVariant;
  if (isPastDue) statusColor = '#ef4444';
  else if (isUrgent) statusColor = '#ef4444';
  else if (paid) statusColor = '#10b981';

  // Red heatmap background: 10 days = lightest (0.05), 0 days = darkest (0.25)
  let backgroundColor = D.cardBg;
  if (isPastDue) {
    backgroundColor = 'rgba(239, 68, 68, 0.25)';
  } else if (isUrgent) {
    const opacity = 0.05 + (1 - daysLeft / 10) * 0.20;
    backgroundColor = `rgba(239, 68, 68, ${opacity.toFixed(3)})`;
  }

  return (
    <View style={[styles.ccLiabilityCard, { backgroundColor }, style]}>
      {/* Header: Account name + mask */}
      <View style={styles.ccCardHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.ccCardAccountName}>{account_name}</Text>
          <Text style={styles.ccCardMask}>•••• {mask}</Text>
        </View>
      </View>

      {/* Balance & Limit */}
      <View style={styles.ccCardBody}>
        <View style={styles.ccBalanceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ccLabel}>Statement Balance</Text>
            <Text style={styles.ccAmount}>{formatCurrency(last_statement_balance)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ccLabel}>Credit Limit</Text>
            <Text style={styles.ccSecondaryAmount}>{formatCurrency(credit_limit)}</Text>
          </View>
        </View>

        {/* Current Balance row */}
        <View style={styles.ccBalanceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ccLabel}>Current Balance</Text>
            <Text style={styles.ccSecondaryAmount}>
              {current_balance != null ? formatCurrency(current_balance) : '—'}
            </Text>
          </View>
        </View>

        {/* Utilization bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(utilizationPct, 100)}%`, backgroundColor: D.accentOrange },
            ]}
          />
        </View>

        {/* Min payment & Due date */}
        <View style={styles.ccPaymentRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ccLabel}>Min Payment</Text>
            <Text style={styles.ccSecondaryAmount}>{formatCurrency(minimum_payment_amount)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ccLabel}>Due Date</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.ccDueDate, { color: statusColor }]}>
                {next_payment_due_date 
                  ? new Date(next_payment_due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : '—'}
                {!payment_recorded && isPastDue && ' ⚠'}
                {!payment_recorded && isUrgent && !isPastDue && ` · ${daysLeft}d`}
                {payment_recorded && ' ✓'}
              </Text>
              {isPastDue && <Ionicons name="alert-circle" size={14} color="#ef4444" />}
            </View>
          </View>
        </View>

        {/* APRs */}
        {aprs && aprs.length > 0 && (
          <View style={styles.ccAprSection}>
            <Text style={styles.ccLabel}>APR</Text>
            <View style={styles.ccAprList}>
              {aprs.slice(0, 3).map((apr, idx) => (
                <View key={idx} style={styles.ccAprItem}>
                  <Text style={styles.ccAprType}>{formatAprType(apr.apr_type)}</Text>
                  <Text style={styles.ccAprRate}>{apr.apr_percentage.toFixed(2)}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Last payment info */}
        {last_payment_amount > 0 && last_payment_date && (
          <View style={styles.ccLastPayment}>
            <Ionicons name="checkmark-done" size={14} color={D.onSurfaceVariant} />
            <Text style={styles.ccLastPaymentText}>
              Last payment: {formatCurrency(last_payment_amount)} on {new Date(last_payment_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Recurring Rule Form Modal ─────────────────────────────────────────────────
const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_monthly', label: 'Bi-monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const NEEDS_DAY_OF_MONTH = ['monthly', 'quarterly', 'yearly'];

function RecurringRuleFormModal({ visible, rule, accounts, categories, onSave, onCancel }) {
  const [form, setForm] = useState(() => initFormData(rule));
  const [saving, setSaving] = useState(false);

  function initFormData(r) {
    if (!r) {
      return {
        name: '',
        match_pattern: '',
        account_id: '',
        amount: '',
        frequency: 'monthly',
        day_of_month: '',
        category_id: '',
        is_subscription: false,
      };
    }
    return {
      name: r.merchant_name || r.name || '',
      match_pattern: r.match_pattern || r.name_pattern || r.merchant_name || '',
      account_id: r.account_id || '',
      amount: r.amount != null ? String(Math.abs(r.amount)) : '',
      frequency: (r.frequency || 'monthly').toLowerCase().replace('-', '_').replace(' ', '_'),
      day_of_month: r.day_of_month != null ? String(r.day_of_month) : '',
      category_id: r.category_id != null ? String(r.category_id) : '',
      is_subscription: !!r.is_subscription,
    };
  }

  useEffect(() => {
    setForm(initFormData(rule));
  }, [rule]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.match_pattern.trim()) {
      Alert.alert('Validation Error', 'Pattern is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        merchant_name: form.name || form.match_pattern,
        name_pattern: form.name || form.match_pattern,
        match_pattern: form.match_pattern.trim(),
        account_id: form.account_id || null,
        amount: form.amount !== '' ? parseFloat(form.amount) : null,
        frequency: form.frequency,
        day_of_month: NEEDS_DAY_OF_MONTH.includes(form.frequency) && form.day_of_month
          ? parseInt(form.day_of_month)
          : null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        is_subscription: form.is_subscription ? 1 : 0,
      };
      await onSave(payload);
    } catch (err) {
      // onSave handles alerts
    } finally {
      setSaving(false);
    }
  };

  const showDay = NEEDS_DAY_OF_MONTH.includes(form.frequency);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.formModal}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>{rule ? 'Edit Rule' : 'New Recurring Rule'}</Text>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={D.onSurface} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formBody} contentContainerStyle={styles.formContent}>
          {/* Name */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Rule Name</Text>
            <TextInput
              style={styles.formInput}
              value={form.name}
              onChangeText={v => set('name', v)}
              placeholder="e.g., Netflix Subscription"
              placeholderTextColor={D.onSurfaceVariant}
            />
          </View>

          {/* Pattern */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Pattern *</Text>
            <TextInput
              style={styles.formInput}
              value={form.match_pattern}
              onChangeText={v => set('match_pattern', v)}
              placeholder="e.g., *NETFLIX* or SPOTIFY"
              placeholderTextColor={D.onSurfaceVariant}
            />
            <Text style={styles.formHint}>Use * as wildcard</Text>
          </View>

          {/* Account */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Account</Text>
            <View style={styles.formPicker}>
              <Text style={styles.formPickerText}>
                {accounts.find(a => String(a.id) === form.account_id)?.name || 'Any account'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={D.onSurfaceVariant} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !form.account_id && styles.chipActive]}
                onPress={() => set('account_id', '')}
              >
                <Text style={[styles.chipText, !form.account_id && styles.chipTextActive]}>Any</Text>
              </TouchableOpacity>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[styles.chip, form.account_id === String(acc.id) && styles.chipActive]}
                  onPress={() => set('account_id', String(acc.id))}
                >
                  <Text style={[styles.chipText, form.account_id === String(acc.id) && styles.chipTextActive]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Amount */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Expected Amount</Text>
            <TextInput
              style={styles.formInput}
              value={form.amount}
              onChangeText={v => set('amount', v)}
              placeholder="e.g., 15.99"
              placeholderTextColor={D.onSurfaceVariant}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Frequency */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Frequency *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {FREQUENCY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, form.frequency === opt.value && styles.chipActive]}
                  onPress={() => set('frequency', opt.value)}
                >
                  <Text style={[styles.chipText, form.frequency === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Day of Month */}
          {showDay && (
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Day of Month</Text>
              <TextInput
                style={[styles.formInput, { width: 100 }]}
                value={form.day_of_month}
                onChangeText={v => set('day_of_month', v)}
                placeholder="1-31"
                placeholderTextColor={D.onSurfaceVariant}
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* Category */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, !form.category_id && styles.chipActive]}
                onPress={() => set('category_id', '')}
              >
                <Text style={[styles.chipText, !form.category_id && styles.chipTextActive]}>None</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, form.category_id === String(cat.id) && styles.chipActive]}
                  onPress={() => set('category_id', String(cat.id))}
                >
                  <Text style={[styles.chipText, form.category_id === String(cat.id) && styles.chipTextActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Subscription toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => set('is_subscription', !form.is_subscription)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={form.is_subscription ? 'checkbox' : 'square-outline'}
              size={22}
              color={form.is_subscription ? brand.primary : D.onSurfaceVariant}
            />
            <Text style={styles.toggleText}>Mark as subscription service</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer */}
        <View style={styles.formFooter}>
          <TouchableOpacity style={styles.formCancelBtn} onPress={onCancel}>
            <Text style={styles.formCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.formSaveBtn, saving && styles.formSaveBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.formSaveText}>{rule ? 'Update' : 'Save'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  const [activeTab, setActiveTab]   = useState('summary'); // 'summary' | 'detailed' | 'cc-payments'

  const [liabilitiesData, setLiabilitiesData] = useState(null);
  const [liabilitiesLoading, setLiabilitiesLoading] = useState(false);

  // ── Recurring State ──────────────────────────────────────────────────────
  const [recurringRules, setRecurringRules] = useState([]);
  const [recurringStats, setRecurringStats] = useState(null);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringFilter, setRecurringFilter] = useState('all'); // all | active | paused | auto
  const [recurringSearch, setRecurringSearch] = useState('');
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [togglingRuleId, setTogglingRuleId] = useState(null);
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

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

  // Peak day is no longer computed client-side — it could be fetched from backend
  const peakDate = null;
  const peakAmount = 0;
  const peakDayLabel = null;

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

  // ── Load Liabilities ────────────────────────────────────────────────────────
  const loadLiabilities = useCallback(async () => {
    setLiabilitiesLoading(true);
    try {
      const data = await api.getLiabilities();
      setLiabilitiesData(data);
    } catch (err) {
      console.error('Error loading liabilities:', err);
    } finally {
      setLiabilitiesLoading(false);
    }
  }, []);

  // ── Load Recurring Rules ───────────────────────────────────────────────────
  const loadRecurring = useCallback(async () => {
    setRecurringLoading(true);
    try {
      const [rulesData, statsData, accountsData, categoriesData] = await Promise.all([
        api.getRecurringRules(),
        api.getRecurringStats(),
        api.getAccounts(),
        api.getCategories(),
      ]);
      setRecurringRules(rulesData?.data || rulesData || []);
      setRecurringStats(statsData?.summary || statsData || null);
      setAccounts(accountsData?.accounts || []);
      setCategories(categoriesData?.categories || []);
    } catch (err) {
      console.error('Error loading recurring rules:', err);
    } finally {
      setRecurringLoading(false);
    }
  }, []);

  // ── Recurring CRUD handlers ────────────────────────────────────────────────
  const handleToggleRecurring = useCallback(async (rule) => {
    const id = rule.pattern_id || rule.id;
    setTogglingRuleId(id);
    try {
      await api.updateRecurringRule(id, { is_active: !rule.is_active });
      setRecurringRules(prev => prev.map(r =>
        (r.pattern_id || r.id) === id ? { ...r, is_active: !r.is_active } : r
      ));
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle rule');
    } finally {
      setTogglingRuleId(null);
    }
  }, []);

  const handleDeleteRecurring = useCallback((rule) => {
    const id = rule.pattern_id || rule.id;
    const name = rule.merchant_name || rule.match_pattern || rule.name_pattern || 'this rule';
    Alert.alert(
      'Delete Rule',
      `Delete recurring rule for "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingRuleId(id);
            try {
              await api.deleteRecurringRule(id);
              setRecurringRules(prev => prev.filter(r => (r.pattern_id || r.id) !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete rule');
            } finally {
              setDeletingRuleId(null);
            }
          },
        },
      ]
    );
  }, []);

  const handleSaveRecurring = useCallback(async (formData) => {
    try {
      if (editingRule) {
        const id = editingRule.pattern_id || editingRule.id;
        await api.updateRecurringRule(id, formData);
      } else {
        await api.createRecurringRule(formData);
      }
      setShowRecurringForm(false);
      setEditingRule(null);
      await loadRecurring();
    } catch (err) {
      Alert.alert('Error', editingRule ? 'Failed to update rule' : 'Failed to create rule');
      throw err;
    }
  }, [editingRule, loadRecurring]);

  const handleEditRecurring = useCallback((rule) => {
    setEditingRule(rule);
    setShowRecurringForm(true);
  }, []);

  const handleAddRecurring = useCallback(() => {
    setEditingRule(null);
    setShowRecurringForm(true);
  }, []);

  useEffect(() => {
    if (activeTab === 'cc-payments') {
      loadLiabilities();
    } else if (activeTab === 'recurring') {
      loadRecurring();
    }
  }, [activeTab, loadLiabilities, loadRecurring]);

  useFocusEffect(
    useCallback(() => {
      clearCache();
      loadDashboard();
      if (activeTab === 'cc-payments') {
        loadLiabilities();
      } else if (activeTab === 'recurring') {
        loadRecurring();
      }
      return () => {};
    }, [loadDashboard, loadLiabilities, loadRecurring, activeTab])
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
    if (activeTab === 'cc-payments') {
      loadLiabilities();
    } else if (activeTab === 'recurring') {
      loadRecurring();
    }
  };

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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          {[
            { key: 'summary', label: 'Summary' },
            { key: 'detailed', label: 'Detailed' },
            { key: 'recurring', label: 'Recurring' },
            { key: 'cc-payments', label: 'CC Payments' },
          ].map(({ key, label }) => {
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
            {/* ── Total Outflow Summary Card ─────────────────────────────────── */}
            <View style={styles.totalOutflowCard}>
              <Text style={styles.totalOutflowLabel}>TOTAL OUTFLOW</Text>
              <Text style={styles.totalOutflowAmount}>{formatCurrency(totalSpend)}</Text>
              {trendPct !== null && (
                <View style={styles.totalOutflowTrend}>
                  <Ionicons
                    name={trendPct > 0 ? 'trending-up' : 'trending-down'}
                    size={14}
                    color={D.accentOrange}
                  />
                  <Text style={styles.totalOutflowTrendText}>
                    {Math.abs(trendPct).toFixed(1)}% vs last month
                  </Text>
                </View>
              )}
            </View>

            {/* ── Category Spending (Last 3 Months) ─────────────────────────── */}
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

        {/* ══════════════════ CC PAYMENTS TAB ════════════════════════════════ */}
        {activeTab === 'cc-payments' && (
          <>
            {liabilitiesLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={D.primary} />
                <Text style={styles.loadingText}>Loading credit card data…</Text>
              </View>
            ) : (
              <>
                {/* ── Total Outstanding Balance Header ─────────────────────────── */}
                <View style={styles.totalOutstandingCard}>
                  <Text style={styles.totalOutstandingLabel}>TOTAL OUTSTANDING</Text>
                  <Text style={styles.totalOutstandingAmount}>
                    {formatCurrency(
                      (liabilitiesData?.credit_cards || [])
                        .filter(card => !card.payment_recorded && card.last_statement_balance > 0)
                        .reduce((sum, card) => sum + card.last_statement_balance, 0)
                    )}
                  </Text>
                  <Text style={styles.totalOutstandingSubtext}>
                    {(liabilitiesData?.credit_cards || []).filter(c => !c.payment_recorded && c.last_statement_balance > 0).length} card(s) with balance
                  </Text>
                </View>

                {/* ── Individual Cards ─────────────────────────────────────────── */}
                {(() => {
                  const cards = liabilitiesData?.credit_cards || [];
                  if (cards.length === 0) {
                    return (
                      <View style={styles.emptyState}>
                        <Ionicons name="card-outline" size={48} color={D.onSurfaceVariant} />
                        <Text style={styles.emptyText}>No credit card data available</Text>
                      </View>
                    );
                  }

                  // Sort: urgent cards first (due within 10 days), then by due date, then by balance
                  const sortedCards = [...cards].sort((a, b) => {
                    const aHasBalance = (a.last_statement_balance || 0) > 0 && !a.payment_recorded;
                    const bHasBalance = (b.last_statement_balance || 0) > 0 && !b.payment_recorded;
                    
                    const aDays = daysUntilDue(a.next_payment_due_date);
                    const bDays = daysUntilDue(b.next_payment_due_date);
                    const aUrgent = aHasBalance && aDays <= 10 && aDays >= 0;
                    const bUrgent = bHasBalance && bDays <= 10 && bDays >= 0;
                    
                    // Urgent cards first (due within 10 days), sorted by earliest due date, then highest balance
                    if (aUrgent && !bUrgent) return -1;
                    if (!aUrgent && bUrgent) return 1;
                    if (aUrgent && bUrgent) {
                      if (aDays !== bDays) return aDays - bDays;
                      return (b.last_statement_balance || 0) - (a.last_statement_balance || 0);
                    }
                    
                    // Non-urgent: sort by descending current balance
                    return (b.current_balance || 0) - (a.current_balance || 0);
                  });

                  return sortedCards.map((card, idx) => (
                    <CCLiabilityCard key={card.account_id || idx} card={card} />
                  ));
                })()}
              </>
            )}
          </>
        )}

        {/* ══════════════════ RECURRING TAB ══════════════════════════════════ */}
        {activeTab === 'recurring' && (
          <>
            {recurringLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={D.primary} />
                <Text style={styles.loadingText}>Loading recurring rules…</Text>
              </View>
            ) : (
              <>
                {/* ── Stats Summary ─────────────────────────────────────────── */}
                <View style={styles.recurringStatsRow}>
                  <View style={[styles.recurringStatCard, { borderLeftColor: semantic.income }]}>
                    <Text style={styles.recurringStatLabel}>INCOME</Text>
                    <Text style={[styles.recurringStatAmount, { color: semantic.income }]}>
                      {formatCurrency(
                        recurringRules.filter(r => r.is_active && (r.amount || 0) < 0)
                          .reduce((s, r) => s + Math.abs(r.amount || 0), 0)
                      )}
                    </Text>
                  </View>
                  <View style={[styles.recurringStatCard, { borderLeftColor: semantic.expense }]}>
                    <Text style={styles.recurringStatLabel}>EXPENSES</Text>
                    <Text style={[styles.recurringStatAmount, { color: semantic.expense }]}>
                      {formatCurrency(
                        recurringRules.filter(r => r.is_active && (r.amount || 0) > 0)
                          .reduce((s, r) => s + (r.amount || 0), 0)
                      )}
                    </Text>
                  </View>
                  <View style={[styles.recurringStatCard, { borderLeftColor: brand.primary }]}>
                    <Text style={styles.recurringStatLabel}>ACTIVE</Text>
                    <Text style={[styles.recurringStatAmount, { color: brand.primary }]}>
                      {recurringRules.filter(r => r.is_active && !r.is_dismissed).length}
                    </Text>
                  </View>
                </View>

                {/* ── Filter Pills ───────────────────────────────────────────── */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterRow}
                  contentContainerStyle={styles.filterRowContent}
                >
                  {[
                    { key: 'all', label: 'All' },
                    { key: 'active', label: 'Active' },
                    { key: 'paused', label: 'Paused' },
                    { key: 'auto', label: 'Auto' },
                  ].map(f => (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setRecurringFilter(f.key)}
                      style={[styles.filterPill, recurringFilter === f.key && styles.filterPillActive]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.filterPillText, recurringFilter === f.key && styles.filterPillTextActive]}>
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* ── Search Input ───────────────────────────────────────────── */}
                <View style={styles.searchRow}>
                  <Ionicons name="search" size={16} color={D.onSurfaceVariant} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search rules…"
                    placeholderTextColor={D.onSurfaceVariant}
                    value={recurringSearch}
                    onChangeText={setRecurringSearch}
                  />
                </View>

                {/* ── Rules List ─────────────────────────────────────────────── */}
                {(() => {
                  const filtered = recurringRules.filter(rule => {
                    if (rule.is_dismissed) return false;
                    if (recurringFilter === 'active' && !rule.is_active) return false;
                    if (recurringFilter === 'paused' && rule.is_active) return false;
                    if (recurringFilter === 'auto' && rule.source !== 'auto_detected') return false;
                    if (recurringSearch.trim()) {
                      const q = recurringSearch.toLowerCase();
                      const name = rule.merchant_name || rule.match_pattern || rule.name_pattern || '';
                      if (!name.toLowerCase().includes(q)) return false;
                    }
                    return true;
                  }).sort((a, b) => {
                    // Sort by next expected date (soonest first)
                    const aDate = a.next_expected_date ? new Date(a.next_expected_date) : null;
                    const bDate = b.next_expected_date ? new Date(b.next_expected_date) : null;
                    if (!aDate && !bDate) return 0;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    return aDate - bDate;
                  });

                  if (filtered.length === 0) {
                    return (
                      <View style={styles.emptyState}>
                        <Ionicons name="repeat-outline" size={48} color={D.onSurfaceVariant} />
                        <Text style={styles.emptyText}>
                          {recurringFilter === 'all' && !recurringSearch
                            ? 'No recurring rules yet'
                            : 'No rules match your filters'}
                        </Text>
                        <TouchableOpacity style={styles.addRuleButton} onPress={handleAddRecurring}>
                          <Ionicons name="add" size={18} color={D.onSurface} />
                          <Text style={styles.addRuleButtonText}>Add Rule</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return filtered.map((rule, idx) => {
                    const id = rule.pattern_id || rule.id || idx;
                    const name = rule.merchant_name || rule.match_pattern || rule.name_pattern || 'Unknown';
                    const amount = rule.amount || 0;
                    const isIncome = amount < 0;
                    const freq = FREQ_DISPLAY[rule.frequency] || rule.frequency || '—';
                    const nextDate = rule.next_expected_date;
                    const isActive = rule.is_active;
                    const isAuto = rule.source === 'auto_detected';
                    const accountName = rule.account_name || 'Any account';
                    const categoryName = rule.category_name || '';
                    const dayOfMonth = rule.day_of_month;

                    const isToggling = togglingRuleId === id;
                    const isDeleting = deletingRuleId === id;

                    return (
                      <Swipeable
                        key={id}
                        renderRightActions={() => (
                          <View style={styles.swipeActions}>
                            <TouchableOpacity
                              style={[styles.swipeAction, { backgroundColor: isActive ? '#f59e0b' : semantic.income }]}
                              onPress={() => handleToggleRecurring(rule)}
                              disabled={isToggling}
                            >
                              <Ionicons
                                name={isActive ? 'pause' : 'play'}
                                size={20}
                                color="#fff"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.swipeAction, { backgroundColor: semantic.expense }]}
                              onPress={() => handleDeleteRecurring(rule)}
                              disabled={isDeleting}
                            >
                              <Ionicons name="trash" size={20} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                        overshootRight={false}
                        friction={2}
                      >
                        <TouchableOpacity
                          style={[styles.recurringRuleCard, !isActive && styles.recurringRuleCardPaused]}
                          onPress={() => handleEditRecurring(rule)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.recurringRuleHeader}>
                            <View style={styles.recurringRuleTitleRow}>
                              {isAuto && (
                                <View style={styles.autoBadge}>
                                  <Ionicons name="flash" size={10} color="#f59e0b" />
                                </View>
                              )}
                              <Text style={styles.recurringRuleName} numberOfLines={1}>{name}</Text>
                            </View>
                            <Text style={[styles.recurringRuleAmount, isIncome && { color: semantic.income }]}>
                              {isIncome ? '+' : ''}{formatCurrency(amount)}
                            </Text>
                          </View>

                          <View style={styles.recurringRuleMeta}>
                            <View style={styles.freqBadge}>
                              <Text style={styles.freqBadgeText}>{freq}</Text>
                            </View>
                            {dayOfMonth != null && (
                              <Text style={styles.recurringRuleMetaText}>Day {dayOfMonth}</Text>
                            )}
                            <Text style={styles.recurringRuleMetaText}>{accountName}</Text>
                            {categoryName && (
                              <Text style={styles.recurringRuleMetaText}>• {categoryName}</Text>
                            )}
                          </View>

                          <View style={styles.recurringRuleFooter}>
                            <Text style={styles.recurringRuleFooterText}>
                              Next: {nextDate ? formatShortDate(nextDate) : '—'}
                            </Text>
                            {!isActive && (
                              <View style={styles.pausedBadge}>
                                <Text style={styles.pausedBadgeText}>PAUSED</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      </Swipeable>
                    );
                  });
                })()}

                {/* ── Add Rule FAB ──────────────────────────────────────────── */}
                <TouchableOpacity style={styles.fab} onPress={handleAddRecurring} activeOpacity={0.8}>
                  <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>
              </>
            )}
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

      {/* ── Recurring Rule Form Modal ────────────────────────────────────── */}
      <RecurringRuleFormModal
        visible={showRecurringForm}
        rule={editingRule}
        accounts={accounts}
        categories={categories}
        onSave={handleSaveRecurring}
        onCancel={() => { setShowRecurringForm(false); setEditingRule(null); }}
      />
      </View>
    </GestureHandlerRootView>
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

  // ── Total Outflow Summary Card (Detailed tab - Stitch design) ─────────────
  totalOutflowCard: {
    backgroundColor: D.cardBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalOutflowLabel: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  totalOutflowAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: D.accentOrange,
    fontFamily: 'Manrope',
    marginBottom: 8,
  },
  totalOutflowTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalOutflowTrendText: {
    fontSize: 13,
    color: D.accentOrange,
    fontFamily: 'Inter',
    fontWeight: '500',
  },

  // ── Trend Item (Detailed tab - Stitch design) ─────────────────────────────
  trendItem: {
    backgroundColor: D.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  trendIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendInfo: {
    flex: 1,
    gap: 2,
  },
  trendCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: D.onSurface,
    fontFamily: 'Inter',
  },
  trendTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  trendBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 64,
    marginLeft: 12,
  },
  trendBarColumn: {
    alignItems: 'center',
    width: 40,
  },
  trendBarAmount: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Inter',
  },
  trendBarTrack: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  trendBarMonth: {
    fontSize: 11,
    color: D.onSurfaceVariant,
    marginTop: 4,
    fontFamily: 'Inter',
    textTransform: 'uppercase',
  },

  // ── Recurring Item (Detailed tab - Stitch design) ──────────────────────────
  recurringItem: {
    backgroundColor: D.cardBg,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  recurringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recurringMerchant: {
    fontSize: 14,
    fontWeight: '600',
    color: D.onSurface,
    fontFamily: 'Inter',
    flex: 1,
  },
  recurringAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: D.accentOrange,
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
    borderTopColor: 'rgba(255,255,255,0.08)',
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
    fontSize: 11,
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
    fontSize: 11,
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

  // ── CC Liability Card ───────────────────────────────────────────────────
  ccLiabilityCard: {
    backgroundColor: D.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  ccCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  ccCardAccountName: {
    fontSize: 16,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  ccCardMask: {
    fontSize: 13,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
    marginTop: 2,
  },
  ccPaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ccPaidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  ccCardBody: {
    gap: 12,
  },
  ccBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ccLabel: {
    fontSize: 11,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ccAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  ccSecondaryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  ccPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  ccDueDate: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Manrope',
  },
  ccAprSection: {
    marginTop: 4,
  },
  ccAprList: {
    gap: 6,
  },
  ccAprItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ccAprType: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  ccAprRate: {
    fontSize: 13,
    fontWeight: '600',
    color: D.onSurface,
    fontFamily: 'Inter',
  },
  ccLastPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  ccLastPaymentText: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },

  // ── Total Outstanding Card ───────────────────────────────────────────────
  totalOutstandingCard: {
    backgroundColor: D.cardBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: D.accentOrange,
  },
  totalOutstandingLabel: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    fontFamily: 'Inter',
    fontWeight: '600',
  },
  totalOutstandingAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: D.accentOrange,
    fontFamily: 'Manrope',
    marginBottom: 6,
  },
  totalOutstandingSubtext: {
    fontSize: 13,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },

  // ── Empty State ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
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

  // ── Recurring Tab Styles ──────────────────────────────────────────────────
  recurringStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  recurringStatCard: {
    flex: 1,
    backgroundColor: D.cardBg,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
  },
  recurringStatLabel: {
    fontSize: 10,
    color: D.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'Inter',
    fontWeight: '600',
    marginBottom: 4,
  },
  recurringStatAmount: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope',
  },

  filterRow: {
    marginBottom: 12,
  },
  filterRowContent: {
    gap: 8,
    paddingHorizontal: 4,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: D.surfaceLow,
  },
  filterPillActive: {
    backgroundColor: D.surfaceHigh,
    borderWidth: 1,
    borderColor: D.outline,
  },
  filterPillText: {
    fontSize: 13,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  filterPillTextActive: {
    color: D.onSurface,
    fontWeight: '600',
    fontFamily: 'Manrope',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surfaceLow,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: D.onSurface,
    fontFamily: 'Inter',
  },

  recurringRuleCard: {
    backgroundColor: D.cardBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  recurringRuleCardPaused: {
    opacity: 0.6,
  },
  recurringRuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recurringRuleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  autoBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 4,
    padding: 2,
  },
  recurringRuleName: {
    fontSize: 15,
    fontWeight: '600',
    color: D.onSurface,
    fontFamily: 'Inter',
    flex: 1,
  },
  recurringRuleAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  recurringRuleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  freqBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freqBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: brand.primary,
    fontFamily: 'Inter',
  },
  recurringRuleMetaText: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  recurringRuleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
    marginTop: 2,
  },
  recurringRuleFooterText: {
    fontSize: 12,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  pausedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pausedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: semantic.expense,
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },

  swipeActions: {
    flexDirection: 'row',
    width: 120,
  },
  swipeAction: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 4,
    marginLeft: 4,
  },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.surfaceHigh,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  addRuleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: D.onSurface,
    fontFamily: 'Inter',
  },

  // ── Recurring Form Modal Styles ───────────────────────────────────────────
  formModal: {
    flex: 1,
    backgroundColor: D.bg,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: D.outline,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: D.onSurface,
    fontFamily: 'Manrope',
  },
  formBody: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formField: {
    marginBottom: 18,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: D.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: D.outline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: D.onSurface,
    fontFamily: 'Inter',
  },
  formHint: {
    fontSize: 11,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
    marginTop: 4,
  },
  formPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: D.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: D.outline,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  formPickerText: {
    fontSize: 15,
    color: D.onSurface,
    fontFamily: 'Inter',
  },
  chipRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: D.surfaceLow,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: brand.primary,
  },
  chipText: {
    fontSize: 13,
    color: D.onSurfaceVariant,
    fontFamily: 'Inter',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 14,
    color: D.onSurface,
    fontFamily: 'Inter',
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: D.outline,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: D.surfaceLow,
    alignItems: 'center',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: D.onSurface,
    fontFamily: 'Inter',
  },
  formSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSaveBtnDisabled: {
    opacity: 0.6,
  },
  formSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Manrope',
  },
});
