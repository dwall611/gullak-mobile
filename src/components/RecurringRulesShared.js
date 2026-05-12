/**
 * Shared recurring rules CRUD hook and form modal.
 *
 * Used by both SpendingScreen (detailed tab) and RecurringScreen (settings tab)
 * to avoid duplicating recurring rules management logic.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

const fmt = (n) => formatCurrency(n ?? 0);

// ─── Frequency options (shared) ──────────────────────────────────────────────
export const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi_weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'bi_monthly', label: 'Bi-monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const NEEDS_DAY_OF_MONTH = ['monthly', 'quarterly', 'yearly'];

// ─── Custom hook for recurring rules CRUD ────────────────────────────────────
export function useRecurringRules() {
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesData, statsData, accountsData, categoriesData] = await Promise.all([
        api.getRecurringRules(),
        api.getRecurringStats(),
        api.getAccounts(),
        api.getCategories(),
      ]);
      setRules(rulesData?.data || rulesData || []);
      setStats(statsData?.summary || statsData || null);
      setAccounts(accountsData?.accounts || []);
      setCategories(categoriesData?.categories || []);
    } catch (err) {
      console.error('[useRecurringRules] Error loading:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleRule = useCallback(async (rule) => {
    const id = rule.pattern_id || rule.id;
    setTogglingId(id);
    try {
      await api.updateRecurringRule(id, { is_active: !rule.is_active });
      setRules(prev => prev.map(r =>
        (r.pattern_id || r.id) === id ? { ...r, is_active: !r.is_active } : r
      ));
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle rule');
    } finally {
      setTogglingId(null);
    }
  }, []);

  const deleteRule = useCallback((rule) => {
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
            setDeletingId(id);
            try {
              await api.deleteRecurringRule(id);
              setRules(prev => prev.filter(r => (r.pattern_id || r.id) !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete rule');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  }, []);

  const saveRule = useCallback(async (formData, editingRule) => {
    try {
      if (editingRule) {
        const id = editingRule.pattern_id || editingRule.id;
        await api.updateRecurringRule(id, formData);
      } else {
        await api.createRecurringRule(formData);
      }
      await loadRules();
    } catch (err) {
      Alert.alert('Error', editingRule ? 'Failed to update rule' : 'Failed to create rule');
      throw err;
    }
  }, [loadRules]);

  const triggerDetection = useCallback(async () => {
    try {
      await api.triggerRecurringDetection();
      await loadRules();
    } catch (err) {
      Alert.alert('Error', 'Failed to trigger detection');
    }
  }, [loadRules]);

  return {
    rules, stats, accounts, categories,
    loading, togglingId, deletingId,
    loadRules, toggleRule, deleteRule, saveRule, triggerDetection,
  };
}

// ─── Recurring Rule Form Modal (shared) ──────────────────────────────────────
export function RecurringRuleFormModal({ visible, rule, accounts, categories, onSave, onCancel }) {
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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={formStyles.modal}>
        <View style={formStyles.header}>
          <Text style={formStyles.title}>{rule ? 'Edit Rule' : 'New Recurring Rule'}</Text>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={formStyles.body} contentContainerStyle={formStyles.content}>
          <View style={formStyles.field}>
            <Text style={formStyles.label}>Rule Name</Text>
            <TextInput style={formStyles.input} value={form.name} onChangeText={v => set('name', v)}
              placeholder="e.g., Netflix Subscription" placeholderTextColor={colors.textMuted} />
          </View>

          <View style={formStyles.field}>
            <Text style={formStyles.label}>Pattern *</Text>
            <TextInput style={formStyles.input} value={form.match_pattern} onChangeText={v => set('match_pattern', v)}
              placeholder="e.g., *NETFLIX* or SPOTIFY" placeholderTextColor={colors.textMuted} />
            <Text style={formStyles.hint}>Use * as wildcard</Text>
          </View>

          <View style={formStyles.field}>
            <Text style={formStyles.label}>Account</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={formStyles.chipRow}>
              <TouchableOpacity style={[formStyles.chip, !form.account_id && formStyles.chipActive]}
                onPress={() => set('account_id', '')}>
                <Text style={[formStyles.chipText, !form.account_id && formStyles.chipTextActive]}>Any</Text>
              </TouchableOpacity>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id}
                  style={[formStyles.chip, form.account_id === String(acc.id) && formStyles.chipActive]}
                  onPress={() => set('account_id', String(acc.id))}>
                  <Text style={[formStyles.chipText, form.account_id === String(acc.id) && formStyles.chipTextActive]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={formStyles.field}>
            <Text style={formStyles.label}>Expected Amount</Text>
            <TextInput style={formStyles.input} value={form.amount} onChangeText={v => set('amount', v)}
              placeholder="e.g., 15.99" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
          </View>

          <View style={formStyles.field}>
            <Text style={formStyles.label}>Frequency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={formStyles.chipRow}>
              {FREQUENCY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value}
                  style={[formStyles.chip, form.frequency === opt.value && formStyles.chipActive]}
                  onPress={() => set('frequency', opt.value)}>
                  <Text style={[formStyles.chipText, form.frequency === opt.value && formStyles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {showDay && (
            <View style={formStyles.field}>
              <Text style={formStyles.label}>Day of Month</Text>
              <TextInput style={[formStyles.input, { width: 100 }]} value={form.day_of_month}
                onChangeText={v => set('day_of_month', v)} placeholder="1-31"
                placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
            </View>
          )}

          <View style={formStyles.field}>
            <Text style={formStyles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={formStyles.chipRow}>
              <TouchableOpacity style={[formStyles.chip, !form.category_id && formStyles.chipActive]}
                onPress={() => set('category_id', '')}>
                <Text style={[formStyles.chipText, !form.category_id && formStyles.chipTextActive]}>None</Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity key={cat.id}
                  style={[formStyles.chip, form.category_id === String(cat.id) && formStyles.chipActive]}
                  onPress={() => set('category_id', String(cat.id))}>
                  <Text style={[formStyles.chipText, form.category_id === String(cat.id) && formStyles.chipTextActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity style={formStyles.toggleRow} onPress={() => set('is_subscription', !form.is_subscription)} activeOpacity={0.7}>
            <Ionicons name={form.is_subscription ? 'checkbox' : 'square-outline'} size={22}
              color={form.is_subscription ? colors.primary : colors.textMuted} />
            <Text style={formStyles.toggleText}>Mark as subscription service</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={formStyles.footer}>
          <TouchableOpacity style={formStyles.cancelBtn} onPress={onCancel}>
            <Text style={formStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[formStyles.saveBtn, saving && formStyles.saveBtnDisabled]}
            onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color="#fff" /> :
              <Text style={formStyles.saveText}>{rule ? 'Update' : 'Save'}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const formStyles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.outline,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text, fontFamily: 'Manrope' },
  body: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  field: { gap: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textSecondary, fontFamily: 'Inter' },
  input: {
    backgroundColor: colors.inputBg, borderRadius: radius.sm, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm, fontSize: fontSize.base, color: colors.text, fontFamily: 'Inter',
    borderWidth: 1, borderColor: colors.inputBorder,
  },
  hint: { fontSize: fontSize.xs, color: colors.textMuted },
  chipRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outline,
  },
  chipActive: { backgroundColor: colors.primary + '22', borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textMuted, fontFamily: 'Inter' },
  chipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  toggleText: { fontSize: fontSize.base, color: colors.text, fontFamily: 'Inter' },
  footer: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.outline,
  },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  cancelText: { fontSize: fontSize.base, color: colors.textMuted, fontWeight: fontWeight.medium, fontFamily: 'Manrope' },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontWeight: fontWeight.semibold, fontSize: fontSize.base, fontFamily: 'Manrope' },
});
