import React, { useState, useEffect, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';
import { useRecurringRules, RecurringRuleFormModal, ValidateRecurringModal } from '../components/RecurringRulesShared';

const fmt = (n) => formatCurrency(n ?? 0);

const SOURCE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'manual', label: 'Manual' },
  { key: 'auto_detected', label: 'Auto' },
  { key: 'jev_detected', label: 'Jev' },
];

const SOURCE_BADGE = {
  manual: { label: 'Manual', color: colors.primary },
  auto_detected: { label: 'Auto', color: colors.warning },
  jev_detected: { label: 'Jev', color: colors.info },
};

function RecurringItem({ rule, onToggle, onDelete, onDismiss, onValidate, toggling }) {
  const isDismissed = rule.is_dismissed;
  const sourceInfo = SOURCE_BADGE[rule.source] || SOURCE_BADGE.manual;
  const itemOpacity = isDismissed ? 0.45 : 1;
  const borderColor = isDismissed ? colors.textMuted : (rule.is_active ? colors.income : colors.textMuted);
  const amountColor = isDismissed ? colors.textMuted : (rule.is_income ? colors.income : borderColor);

  return (
    <View style={[styles.recurringItem, { borderLeftColor: borderColor, borderLeftWidth: 3, opacity: itemOpacity }]}>
      <View style={styles.itemLeft}>
        <View style={styles.itemNameRow}>
          <Text style={styles.itemName} numberOfLines={1}>{rule.name || rule.merchant_name}</Text>
          {isDismissed && (
            <View style={[styles.badge, { backgroundColor: colors.textMuted + '33' }]}>
              <Text style={[styles.badgeText, { color: colors.textMuted }]}>Ignored</Text>
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: sourceInfo.color + '22' }]}>
            <Text style={[styles.badgeText, { color: sourceInfo.color }]}>{sourceInfo.label}</Text>
          </View>
          {rule.is_income && (
            <View style={[styles.badge, { backgroundColor: colors.income + '22' }]}>
              <Text style={[styles.badgeText, { color: colors.income }]}>Income</Text>
            </View>
          )}
        </View>
        <View style={styles.itemMeta}>
          <Text style={styles.itemFrequency}>{rule.frequency || 'Monthly'}</Text>
          {rule.category && (
            <>
              <Text style={styles.itemDot}>•</Text>
              <Text style={styles.itemCategory}>{rule.category}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={[styles.itemAmount, { color: amountColor }]}>{fmt(rule.amount)}</Text>
        <View style={styles.itemControls}>
          {(rule.source === 'auto_detected' || rule.source === 'jev_detected') && !isDismissed && (
            <TouchableOpacity style={styles.validateBtn} onPress={() => onValidate(rule)} activeOpacity={0.7}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
              <Text style={styles.validateBtnText}>Validate</Text>
            </TouchableOpacity>
          )}
          {!isDismissed && (
            <TouchableOpacity style={styles.dismissBtn} onPress={() => onDismiss(rule)} activeOpacity={0.7}>
              <Ionicons name="eye-off-outline" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          {!isDismissed && (
            <TouchableOpacity
              style={[styles.toggleBtn, rule.is_active && styles.toggleBtnActive]}
              onPress={onToggle}
              disabled={!!toggling}
            >
              <Text style={[styles.toggleBtnText, rule.is_active && styles.toggleBtnTextActive]}>
                {toggling ? '...' : rule.is_active ? 'Active' : 'Paused'}
              </Text>
            </TouchableOpacity>
          )}
          {!isDismissed && (
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={16} color={colors.expense} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export function RecurringScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [validateTarget, setValidateTarget] = useState(null);

  const {
    rules, accounts, categories, loading, togglingId,
    loadRules, toggleRule, deleteRule, saveRule, triggerDetection,
    dismissRule, validateRule,
  } = useRecurringRules();

  useEffect(() => {
    loadRules().catch(err => setError(err.message || 'Failed to load recurring rules'));
  }, [loadRules]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRules().then(() => setRefreshing(false)).catch(() => setRefreshing(false));
  }, [loadRules]);

  const handleAdd = useCallback(() => {
    setEditingRule(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((rule) => {
    setEditingRule(rule);
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async (formData) => {
    await saveRule(formData, editingRule);
    setShowForm(false);
    setEditingRule(null);
  }, [editingRule, saveRule]);

  const handleValidate = useCallback(async (id, data) => {
    await validateRule(id, data);
    setValidateTarget(null);
  }, [validateRule]);

  const filteredRules = sourceFilter === 'all'
    ? rules
    : rules.filter(r => r.source === sourceFilter);

  const sortedRules = [...filteredRules].sort((a, b) => {
    if (a.is_dismissed !== b.is_dismissed) return a.is_dismissed ? 1 : -1;
    return 0;
  });

  const activeCount = rules.filter(r => r.is_active).length;
  const totalAmount = rules.filter(r => r.is_active).reduce((sum, r) => sum + (r.amount || 0), 0);

  const isLoading = loading && !refreshing;

  if (isLoading) {
    return (
      <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
        {!embedded && <View style={styles.header}>
          <Text style={styles.headerTitle}>Recurring Rules</Text>
          <Text style={styles.headerSub}>Manage automatic transactions</Text>
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
          <Text style={styles.headerTitle}>Recurring Rules</Text>
        </View>}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.expense} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(null); loadRules(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
      {!embedded && (
        <>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Recurring Rules</Text>
                <Text style={styles.headerSub}>Manage automatic transactions</Text>
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.filterRow}>
            {SOURCE_TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, sourceFilter === tab.key && styles.filterTabActive]}
                onPress={() => setSourceFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, sourceFilter === tab.key && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
      >
        {rules.length > 0 && (
          <View style={styles.summarySection}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Active Rules</Text>
              <Text style={styles.summaryValue}>{activeCount}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Monthly Total</Text>
              <Text style={[styles.summaryValue, { color: colors.income }]}>{fmt(totalAmount)}</Text>
            </View>
          </View>
        )}

        {sortedRules.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {rules.length === 0 ? 'No recurring rules' : 'No rules match this filter'}
            </Text>
            <Text style={styles.emptySub}>
              {rules.length === 0
                ? 'Create recurring rules to track automatic transactions'
                : 'Try selecting a different source filter'}
            </Text>
            {rules.length === 0 && (
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addBtnText}>Create Rule</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.rulesList}>
            {sortedRules.map(rule => (
              <RecurringItem
                key={rule.pattern_id || rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule)}
                onDelete={() => deleteRule(rule)}
                onDismiss={() => dismissRule(rule)}
                onValidate={(r) => setValidateTarget(r)}
                toggling={togglingId === (rule.pattern_id || rule.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <RecurringRuleFormModal
        visible={showForm}
        rule={editingRule}
        accounts={accounts}
        categories={categories}
        onSave={handleSave}
        onCancel={() => { setShowForm(false); setEditingRule(null); }}
      />

      <ValidateRecurringModal
        visible={!!validateTarget}
        rule={validateTarget}
        accounts={accounts}
        onValidate={handleValidate}
        onCancel={() => setValidateTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, fontFamily: 'Manrope' },
  headerSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4, fontFamily: 'Inter' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  addBtnText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.sm, fontFamily: 'Manrope' },
  filterRow: {
    flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  filterTab: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, backgroundColor: colors.surfaceHigh,
  },
  filterTabActive: { backgroundColor: colors.primary + '22' },
  filterTabText: { fontSize: fontSize.xs, color: colors.textMuted, fontFamily: 'Inter' },
  filterTabTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  summarySection: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.outline, alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs, color: colors.textMuted, fontWeight: fontWeight.medium,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs, fontFamily: 'Inter',
  },
  summaryValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, fontFamily: 'Manrope' },
  rulesList: { paddingHorizontal: spacing.md, gap: spacing.sm },
  recurringItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.outline,
  },
  itemLeft: { flex: 1, marginRight: spacing.sm },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', marginBottom: spacing.xs },
  itemName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text, fontFamily: 'Manrope', flexShrink: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { fontSize: 10, fontWeight: fontWeight.semibold, fontFamily: 'Inter' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  itemFrequency: { fontSize: fontSize.xs, color: colors.textMuted, fontFamily: 'Inter' },
  itemDot: { color: colors.textMuted, fontSize: fontSize.xs },
  itemCategory: { fontSize: fontSize.xs, color: colors.textSecondary, fontFamily: 'Inter' },
  itemRight: { alignItems: 'flex-end', gap: spacing.xs },
  itemAmount: { fontSize: fontSize.base, fontWeight: fontWeight.bold, fontFamily: 'Manrope' },
  itemControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap', justifyContent: 'flex-end' },
  toggleBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
  },
  toggleBtnActive: { backgroundColor: colors.income + '22' },
  toggleBtnText: { fontSize: fontSize.xs, color: colors.textMuted, fontFamily: 'Inter' },
  toggleBtnTextActive: { color: colors.income },
  validateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.full,
    backgroundColor: colors.primary + '22',
  },
  validateBtnText: { fontSize: 10, color: colors.primary, fontWeight: fontWeight.semibold, fontFamily: 'Inter' },
  dismissBtn: { padding: spacing.xs },
  deleteBtn: { padding: spacing.xs },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: fontSize.base, color: colors.textMuted, fontWeight: fontWeight.medium, fontFamily: 'Manrope' },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted, fontFamily: 'Inter' },
  errorText: { fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg, fontFamily: 'Inter' },
  retryBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.sm,
  },
  retryBtnText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.base, fontFamily: 'Manrope' },
});