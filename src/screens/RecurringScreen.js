import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';

const fmt = (n) => formatCurrency(n ?? 0);

function RecurringItem({ rule, onToggle, onDelete }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    try {
      const newStatus = !rule.is_active;
      await api.updateRecurringRule(rule.id, { is_active: newStatus });
      onToggle(rule.id, newStatus);
    } catch (error) {
      Alert.alert('Error', `Failed to update rule: ${error.message}`);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Rule',
      `Are you sure you want to delete "${rule.name}"?`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.deleteRecurringRule(rule.id);
              onDelete(rule.id);
            } catch (error) {
              Alert.alert('Error', `Failed to delete rule: ${error.message}`);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const frequencyLabel = rule.frequency || 'Monthly';
  const statusColor = rule.is_active ? colors.income : colors.textMuted;

  return (
    <View style={[styles.recurringItem, { borderLeftColor: statusColor, borderLeftWidth: 3 }]}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemName}>{rule.name}</Text>
        <View style={styles.itemMeta}>
          <Text style={styles.itemFrequency}>{frequencyLabel}</Text>
          {rule.category && (
            <>
              <Text style={styles.itemDot}>•</Text>
              <Text style={styles.itemCategory}>{rule.category}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.itemRight}>
        <Text style={[styles.itemAmount, { color: statusColor }]}>{fmt(rule.amount)}</Text>
        <View style={styles.itemControls}>
          <Switch
            value={rule.is_active}
            onValueChange={handleToggle}
            disabled={toggling}
            trackColor={{ false: colors.outline, true: colors.income + '44' }}
            thumbColor={rule.is_active ? colors.income : colors.textMuted}
          />
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={16} color={colors.expense} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function RecurringScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [rules, setRules] = useState([]);

  const loadRules = useCallback(async () => {
    setError(null);
    try {
      const response = await api.getRecurringRules();
      setRules(response.data || response || []);
    } catch (err) {
      console.error('[RecurringScreen] Error loading rules:', err);
      setError(err.message || 'Failed to load recurring rules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadRules();
  }, [loadRules]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRules();
  }, [loadRules]);

  const handleToggle = (ruleId, newStatus) => {
    setRules(prev =>
      prev.map(rule =>
        rule.id === ruleId ? { ...rule, is_active: newStatus } : rule
      )
    );
  };

  const handleDelete = (ruleId) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const activeCount = rules.filter(r => r.is_active).length;
  const totalAmount = rules
    .filter(r => r.is_active)
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  if (loading && !refreshing) {
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
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); loadRules(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
      {!embedded && <View style={styles.header}>
        <Text style={styles.headerTitle}>Recurring Rules</Text>
        <Text style={styles.headerSub}>Manage automatic transactions</Text>
      </View>}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.lg }}
      >
        {/* Summary */}
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

        {/* Rules List */}
        {rules.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="repeat-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyText}>No recurring rules</Text>
            <Text style={styles.emptySub}>Create recurring rules to track automatic transactions</Text>
          </View>
        ) : (
          <View style={styles.rulesList}>
            {rules.map(rule => (
              <RecurringItem
                key={rule.id}
                rule={rule}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
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
    marginTop: 4,
    fontFamily: 'Inter',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  summarySection: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontFamily: 'Inter',
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  rulesList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  recurringItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  itemLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    fontFamily: 'Manrope',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemFrequency: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'Inter',
  },
  itemDot: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  itemCategory: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'Inter',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  itemAmount: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    fontFamily: 'Manrope',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteBtn: {
    padding: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    fontFamily: 'Manrope',
  },
  emptySub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: 'Inter',
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    fontFamily: 'Inter',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
    fontFamily: 'Manrope',
  },
});
