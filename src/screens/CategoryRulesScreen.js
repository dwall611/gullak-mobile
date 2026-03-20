import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

function formatAmountFilter(rule) {
  if (!rule.amount_filter_type) return null;
  const fmt = (n) => `$${parseFloat(n).toFixed(2)}`;
  switch (rule.amount_filter_type) {
    case 'equal': return `= ${fmt(rule.amount_value_min)}`;
    case 'greater_than': return `> ${fmt(rule.amount_value_min)}`;
    case 'less_than': return `< ${fmt(rule.amount_value_min)}`;
    case 'range': return `${fmt(rule.amount_value_min)} – ${fmt(rule.amount_value_max)}`;
    default: return null;
  }
}

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ─── Rule Card ─────────────────────────────────────────────────────────────────
function RuleCard({ rule, categories, onEdit, onDelete, onToggle }) {
  const getCategoryName = (catId) => categories.find(c => c.id === catId)?.name || 'Unknown';
  const getCategoryColor = (catId) => categories.find(c => c.id === catId)?.color || '#6b7280';
  const amtLabel = formatAmountFilter(rule);

  return (
    <View style={styles.ruleCard}>
      <View style={styles.ruleHeader}>
        <View style={styles.ruleHeaderLeft}>
          <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(rule.category_id) + '22' }]}>
            <Text style={[styles.categoryBadgeText, { color: getCategoryColor(rule.category_id) }]}>
              {getCategoryName(rule.category_id)}
            </Text>
          </View>
          {!rule.is_active && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>
        <View style={styles.ruleActions}>
          <TouchableOpacity onPress={() => onToggle(rule)} style={styles.ruleActionBtn} activeOpacity={0.7}>
            <Ionicons
              name={rule.is_active ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={20}
              color={rule.is_active ? colors.income : colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onEdit(rule)} style={styles.ruleActionBtn} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(rule)} style={styles.ruleActionBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.expense} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ruleBody}>
        {rule.account_pattern ? (
          <View style={styles.rulePill}>
            <Ionicons name="wallet-outline" size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={styles.rulePillText} numberOfLines={1}>{rule.account_pattern}</Text>
          </View>
        ) : null}
        {rule.pattern ? (
          <View style={styles.rulePill}>
            <Ionicons name="storefront-outline" size={12} color={colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={styles.rulePillText} numberOfLines={1}>{rule.pattern}</Text>
          </View>
        ) : null}
        {amtLabel ? (
          <View style={[styles.rulePill, styles.amtPill]}>
            <Ionicons name="cash-outline" size={12} color={colors.primary} style={{ marginRight: 3 }} />
            <Text style={[styles.rulePillText, { color: colors.primary }]}>{amtLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── Rule Edit Modal ───────────────────────────────────────────────────────────
function RuleModal({ visible, rule, categories, accounts, onSave, onClose, isNew }) {
  const [form, setForm] = useState({
    match_type: 'both',
    merchant_pattern: '',
    account_pattern: '',
    category_id: '',
    amount_filter_type: '',
    amount_value_min: '',
    amount_value_max: '',
  });

  useEffect(() => {
    if (rule) {
      if (isNew) {
        setForm({ match_type: 'both', merchant_pattern: '', account_pattern: '', category_id: '', amount_filter_type: '', amount_value_min: '', amount_value_max: '' });
      } else {
        setForm({
          match_type: rule.match_type === 'merchant_contains' ? 'merchant' :
                      rule.match_type === 'account_contains' ? 'account' : 'both',
          merchant_pattern: rule.pattern || '',
          account_pattern: rule.account_pattern || '',
          category_id: String(rule.category_id),
          amount_filter_type: rule.amount_filter_type || '',
          amount_value_min: rule.amount_value_min ? String(rule.amount_value_min) : '',
          amount_value_max: rule.amount_value_max ? String(rule.amount_value_max) : '',
        });
      }
    }
  }, [rule, isNew]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const isValid = () => {
    if (!form.category_id) return false;
    if (form.match_type !== 'account' && !form.merchant_pattern) return false;
    if (form.match_type !== 'merchant' && !form.account_pattern) return false;
    return true;
  };

  const handleSave = () => {
    if (!isValid()) return;
    const payload = {
      category_id: parseInt(form.category_id),
      pattern: form.match_type === 'account' ? '' : form.merchant_pattern,
      account_pattern: form.match_type === 'merchant' ? '' : form.account_pattern,
      match_type: form.match_type === 'merchant' ? 'merchant_contains' :
                  form.match_type === 'account' ? 'account_contains' : 'both_contains',
      amount_filter_type: form.amount_filter_type || null,
      amount_value_min: form.amount_value_min ? parseFloat(form.amount_value_min) : null,
      amount_value_max: form.amount_value_max ? parseFloat(form.amount_value_max) : null,
    };
    onSave(payload);
  };

  const MATCH_OPTIONS = [
    { value: 'merchant', label: 'Merchant' },
    { value: 'account', label: 'Account' },
    { value: 'both', label: 'Both (AND)' },
  ];

  const AMOUNT_OPTIONS = [
    { value: '', label: 'No filter' },
    { value: 'equal', label: 'Equal to' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'range', label: 'Within range' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isNew ? 'New Rule' : 'Edit Rule'}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Match Type */}
          <Text style={styles.fieldLabel}>Match Type</Text>
          <View style={styles.segmentRow}>
            {MATCH_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.segmentBtn, form.match_type === opt.value && styles.segmentBtnActive]}
                onPress={() => update('match_type', opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, form.match_type === opt.value && styles.segmentBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Merchant pattern */}
          {form.match_type !== 'account' && (
            <>
              <Text style={styles.fieldLabel}>Merchant Contains</Text>
              <TextInput
                style={styles.input}
                value={form.merchant_pattern}
                onChangeText={v => update('merchant_pattern', v)}
                placeholder="e.g. UBER, STARBUCKS"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />
            </>
          )}

          {/* Account pattern */}
          {form.match_type !== 'merchant' && (
            <>
              <Text style={styles.fieldLabel}>Account</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !form.account_pattern && styles.chipActive]}
                  onPress={() => update('account_pattern', '')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, !form.account_pattern && styles.chipTextActive]}>Any</Text>
                </TouchableOpacity>
                {accounts.map(acc => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.chip, form.account_pattern === acc.name && styles.chipActive]}
                    onPress={() => update('account_pattern', acc.name)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, form.account_pattern === acc.name && styles.chipTextActive]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Category */}
          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.chip, form.category_id === String(cat.id) && styles.chipActive, { borderColor: form.category_id === String(cat.id) ? cat.color : colors.cardBorder }]}
                onPress={() => update('category_id', String(cat.id))}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text style={[styles.chipText, form.category_id === String(cat.id) && { color: cat.color }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Amount Filter */}
          <Text style={styles.fieldLabel}>Amount Filter (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {AMOUNT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, form.amount_filter_type === opt.value && styles.chipActive]}
                onPress={() => update('amount_filter_type', opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, form.amount_filter_type === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {form.amount_filter_type && form.amount_filter_type !== 'range' && (
            <>
              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                value={form.amount_value_min}
                onChangeText={v => update('amount_value_min', v)}
                placeholder="e.g. 50.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </>
          )}

          {form.amount_filter_type === 'range' && (
            <View style={styles.amountRangeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Min Amount</Text>
                <TextInput
                  style={styles.input}
                  value={form.amount_value_min}
                  onChangeText={v => update('amount_value_min', v)}
                  placeholder="10.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.rangeSep}>–</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Max Amount</Text>
                <TextInput
                  style={styles.input}
                  value={form.amount_value_max}
                  onChangeText={v => update('amount_value_max', v)}
                  placeholder="100.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          )}

          <View style={{ height: spacing.xxl }} />
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, !isValid() && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!isValid()}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>{isNew ? 'Add Rule' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function CategoryRulesScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [rulesData, categoriesData, accountsData] = await Promise.all([
        api.getCategoryRules(),
        api.getCategories(),
        api.getAccounts(),
      ]);
      setRules(rulesData.rules || []);
      setCategories(categoriesData.categories || []);
      setAccounts(accountsData.accounts || []);
    } catch (err) {
      console.error('Error loading category rules:', err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      if (filterCategory && rule.category_id !== parseInt(filterCategory)) return false;
      if (filterAccount && rule.account_pattern !== filterAccount) return false;
      return true;
    });
  }, [rules, filterCategory, filterAccount]);

  const uniqueAccounts = useMemo(() => [...new Set(rules.map(r => r.account_pattern).filter(Boolean))].sort(), [rules]);

  const handleAddNew = () => {
    setEditingRule({});
    setIsNew(true);
    setShowModal(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setIsNew(false);
    setShowModal(true);
  };

  const handleDelete = (rule) => {
    Alert.alert('Delete Rule', 'Delete this category rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCategoryRule(rule.id);
            await loadData();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete rule');
          }
        },
      },
    ]);
  };

  const handleToggle = async (rule) => {
    try {
      await api.toggleCategoryRule(rule.id, !rule.is_active);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle rule');
    }
  };

  const handleSave = async (payload) => {
    try {
      if (isNew) {
        await api.createCategoryRule(payload);
      } else {
        await api.updateCategoryRule(editingRule.id, payload);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      Alert.alert('Error', `Failed to ${isNew ? 'create' : 'update'} rule: ${err.message}`);
    }
  };

  const handleApplyAll = async () => {
    setApplying(true);
    try {
      const result = await api.applyCategoryRules();
      Alert.alert('Done', `Applied rules to ${result.applied} transactions!`);
      await loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to apply rules');
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
      {/* Header */}
      {!embedded && <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Category Rules</Text>
          <Text style={styles.headerSub}>{rules.length} rules · {filteredRules.length} shown</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddNew} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>}
      {embedded && <View style={styles.embeddedHeader}>
        <Text style={styles.headerSub}>{rules.length} rules · {filteredRules.length} shown</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddNew} activeOpacity={0.7}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>}

      {/* Filters */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Category filter */}
          <TouchableOpacity
            style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
            onPress={() => setFilterCategory('')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>All Categories</Text>
          </TouchableOpacity>
          {categories.filter(cat => rules.some(r => r.category_id === cat.id)).map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, filterCategory === String(cat.id) && styles.filterChipActive]}
              onPress={() => setFilterCategory(filterCategory === String(cat.id) ? '' : String(cat.id))}
              activeOpacity={0.7}
            >
              <View style={[styles.filterDot, { backgroundColor: cat.color }]} />
              <Text style={[styles.filterChipText, filterCategory === String(cat.id) && styles.filterChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading rules...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Apply all button */}
          <View style={styles.applySection}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyAll} disabled={applying} activeOpacity={0.7}>
              {applying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="flash-outline" size={16} color="#fff" style={{ marginRight: spacing.xs }} />
              )}
              <Text style={styles.applyBtnText}>{applying ? 'Applying...' : 'Apply Rules to All Transactions'}</Text>
            </TouchableOpacity>
          </View>

          {/* Rules list */}
          {filteredRules.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="list-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {rules.length === 0 ? 'No rules yet.\nTap + to create your first rule.' : 'No rules match filters.'}
              </Text>
            </View>
          ) : (
            filteredRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                categories={categories}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Edit/Add Modal */}
      <RuleModal
        visible={showModal}
        rule={editingRule}
        categories={categories}
        accounts={accounts}
        onSave={handleSave}
        onClose={() => setShowModal(false)}
        isNew={isNew}
      />
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
  embeddedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary + '22',
    borderWidth: 1,
    borderColor: colors.primary + '44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
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
  applySection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  ruleCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ruleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  inactiveBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.textMuted + '22',
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  ruleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ruleActionBtn: {
    padding: 4,
  },
  ruleBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  rulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  amtPill: {
    borderColor: colors.primary + '44',
    backgroundColor: colors.primary + '11',
  },
  rulePillText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  segmentBtnText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: fontSize.base,
  },
  chipScroll: {
    marginBottom: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary + '22',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  amountRangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  rangeSep: {
    color: colors.textMuted,
    fontSize: fontSize.lg,
    paddingBottom: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    fontSize: fontSize.base,
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
});
