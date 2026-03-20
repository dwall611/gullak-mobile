import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, clearCache } from '../api/client';
import { formatCurrency, formatShortDate, getTransactionCategory, getMerchantName, getAccountName } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const RECURRING_OPTIONS = [
  { value: null, label: 'Auto', icon: 'settings-outline', color: colors.textMuted },
  { value: 1, label: 'Yes', icon: 'checkmark-circle', color: colors.income },
  { value: 0, label: 'No', icon: 'close-circle', color: colors.expense },
];

export function TransactionEditModal({ visible, transaction, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isRecurring, setIsRecurring] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const tx = transaction;

  // Load categories on mount
  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  // Reset form when transaction changes
  useEffect(() => {
    if (tx && categories.length > 0) {
      // Find category ID from override_category or transaction category
      const categoryName = tx.override_category || getTransactionCategory(tx);
      const foundCat = categories.find(c => c.name === categoryName);
      setSelectedCategoryId(foundCat?.id || null);
      setIsRecurring(tx.is_recurring);
    }
  }, [tx, categories]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await api.getCategories();
      setCategories(data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
      Alert.alert('Error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tx) return;
    
    setSaving(true);
    try {
      const category = categories.find(c => c.id === selectedCategoryId);
      
      // Update category if changed
      if (category) {
        await api.updateTransactionCategory(tx.id, category.name, category.id);
        // Cache clearing is now handled in the API client after successful update
      }
      
      // Update recurring status
      await api.updateTransactionRecurring(tx.id, isRecurring);
      
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving transaction:', err);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const merchant = tx ? getMerchantName(tx) : '';
  const account = tx ? getAccountName(tx) : '';
  const category = tx ? getTransactionCategory(tx) : '';
  const isExpense = tx?.amount > 0;
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Transaction</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Transaction Summary */}
              <View style={styles.txSummary}>
                <View style={styles.txHeader}>
                  <View style={styles.txInfo}>
                    <Text style={styles.txMerchant} numberOfLines={1}>{merchant}</Text>
                    <View style={styles.txMeta}>
                      <Text style={styles.txAccount}>{account}</Text>
                      <Text style={styles.txDate}>· {tx ? formatShortDate(tx.date) : ''}</Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.txAmount,
                    isExpense ? styles.txAmountExpense : styles.txAmountIncome
                  ]}>
                    {isExpense ? '+' : '-'}{tx ? formatCurrency(Math.abs(tx.amount)) : ''}
                  </Text>
                </View>
              </View>

              {/* Category Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Category</Text>
                <Text style={styles.sectionHint}>
                  {selectedCategory?.spend === 'N' 
                    ? 'ℹ️ This category is marked as non-spend'
                    : 'Selected category affects spending calculations'}
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        selectedCategoryId === cat.id && styles.categoryChipActive,
                        { borderColor: selectedCategoryId === cat.id ? cat.color : colors.cardBorder }
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                      <Text style={[
                        styles.categoryChipText,
                        selectedCategoryId === cat.id && { color: cat.color }
                      ]}>
                        {cat.name}
                      </Text>
                      {cat.spend === 'N' && (
                        <View style={styles.nonSpendBadge}>
                          <Text style={styles.nonSpendBadgeText}>NS</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Recurring Section */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Recurring</Text>
                <Text style={styles.sectionHint}>
                  Mark if this transaction repeats regularly
                </Text>
                <View style={styles.recurringOptions}>
                  {RECURRING_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={String(opt.value)}
                      style={[
                        styles.recurringOption,
                        isRecurring === opt.value && styles.recurringOptionActive,
                        isRecurring === opt.value && { borderColor: opt.color }
                      ]}
                      onPress={() => setIsRecurring(opt.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={isRecurring === opt.value ? opt.color : colors.textSecondary}
                      />
                      <Text style={[
                        styles.recurringOptionText,
                        isRecurring === opt.value && { color: opt.color }
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: spacing.xxl }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.7}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
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
  content: {
    flex: 1,
  },
  txSummary: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  txInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txMerchant: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  txAccount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  txDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  txAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  txAmountExpense: {
    color: colors.expense,
  },
  txAmountIncome: {
    color: colors.income,
  },
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  sectionLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    marginHorizontal: -spacing.md,
  },
  categoryScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '15',
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  nonSpendBadge: {
    marginLeft: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: colors.textMuted + '30',
  },
  nonSpendBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  recurringOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  recurringOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    gap: spacing.xs,
  },
  recurringOptionActive: {
    backgroundColor: colors.primary + '15',
  },
  recurringOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: fontSize.base,
    color: '#fff',
    fontWeight: fontWeight.semibold,
  },
});
