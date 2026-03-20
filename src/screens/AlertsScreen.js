import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function AlertItem({ alert, onAcknowledge }) {
  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'critical': return colors.expense;
      case 'warning': return '#f59e0b';
      case 'info': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const getSeverityIcon = () => {
    switch (alert.severity) {
      case 'critical': return 'alert-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'notifications';
    }
  };

  return (
    <View style={styles.alertItem}>
      <View style={styles.alertHeader}>
        <View style={styles.alertTitleRow}>
          <Ionicons 
            name={getSeverityIcon()} 
            size={20} 
            color={getSeverityColor()} 
          />
          <Text style={styles.alertTitle}>{alert.title}</Text>
        </View>
        {!alert.acknowledged && (
          <TouchableOpacity 
            style={styles.ackButton}
            onPress={() => onAcknowledge(alert.id)}
          >
            <Text style={styles.ackButtonText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.alertMessage}>{alert.message}</Text>
      
      <View style={styles.alertFooter}>
        <Text style={styles.alertDate}>{formatDate(alert.triggered_at)}</Text>
        {alert.acknowledged && (
          <View style={styles.ackBadge}>
            <Ionicons name="checkmark-circle" size={12} color={colors.income} />
            <Text style={styles.ackBadgeText}>Acknowledged</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export function AlertsScreen() {
  const [viewMode, setViewMode] = useState('history'); // 'history' | 'rules'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({
    type: 'spending_threshold',
    category: '',
    threshold: '',
    period: 'monthly',
  });

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [alertsData, rulesData] = await Promise.all([
        api.getAlertHistory(50),
        api.getAlertRules(),
      ]);
      setAlerts(alertsData.alerts || []);
      setAlertRules(rulesData.rules || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleAcknowledge = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      ));
    } catch (err) {
      console.error('Error acknowledging alert:', err);
      Alert.alert('Error', 'Failed to acknowledge alert');
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.category || !newRule.threshold) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const conditionData = {
        category: newRule.category,
        threshold: parseFloat(newRule.threshold),
        period: newRule.period,
      };

      await api.createAlertRule({
        type: newRule.type,
        condition_data: conditionData,  // API expects object, not string
        is_active: true,
      });

      setShowAddModal(false);
      setNewRule({ type: 'spending_threshold', category: '', threshold: '', period: 'monthly' });
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      await api.updateAlertRule(rule.id, { is_active: !rule.is_active });
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    Alert.alert(
      'Delete Alert Rule',
      'Are you sure you want to delete this alert rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAlertRule(ruleId);
              loadData();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.expense} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'history' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('history')}
        >
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={viewMode === 'history' ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.viewToggleText, viewMode === 'history' && styles.viewToggleTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewToggleBtn, viewMode === 'rules' && styles.viewToggleBtnActive]}
          onPress={() => setViewMode('rules')}
        >
          <Ionicons 
            name="settings-outline" 
            size={16} 
            color={viewMode === 'rules' ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.viewToggleText, viewMode === 'rules' && styles.viewToggleTextActive]}>
            Rules
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
      {viewMode === 'history' && (
        <>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{activeAlerts.length}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{acknowledgedAlerts.length}</Text>
          <Text style={styles.summaryLabel}>Acknowledged</Text>
        </View>
      </View>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          {activeAlerts.map(alert => (
            <AlertItem key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
          ))}
        </View>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acknowledged</Text>
          {acknowledgedAlerts.map(alert => (
            <AlertItem key={alert.id} alert={alert} onAcknowledge={handleAcknowledge} />
          ))}
        </View>
      )}

      {alerts.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No alerts</Text>
          <Text style={styles.emptySubtext}>You're all caught up!</Text>
        </View>
      )}
        </>
      )}

      {viewMode === 'rules' && (
        <>
          {/* Add Rule Button */}
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>New Alert Rule</Text>
          </TouchableOpacity>

          {/* Alert Rules List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Rules ({alertRules.filter(r => r.is_active).length})</Text>
            {alertRules.filter(r => r.is_active).map(rule => (
              <AlertRuleItem 
                key={rule.id} 
                rule={rule} 
                onToggle={handleToggleRule}
                onDelete={handleDeleteRule}
              />
            ))}
          </View>

          {alertRules.filter(r => !r.is_active).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Inactive Rules</Text>
              {alertRules.filter(r => !r.is_active).map(rule => (
                <AlertRuleItem 
                  key={rule.id} 
                  rule={rule} 
                  onToggle={handleToggleRule}
                  onDelete={handleDeleteRule}
                />
              ))}
            </View>
          )}

          {alertRules.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="megaphone-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No alert rules</Text>
              <Text style={styles.emptySubtext}>Create your first alert rule</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>

      {/* Add Rule Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Alert Rule</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Alert Type</Text>
            <View style={styles.typeButton}>
              <Text style={styles.typeButtonText}>Spending Threshold</Text>
            </View>

            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Food & Dining"
              placeholderTextColor={colors.textMuted}
              value={newRule.category}
              onChangeText={(text) => setNewRule({...newRule, category: text})}
            />

            <Text style={styles.inputLabel}>Threshold Amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 500"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newRule.threshold}
              onChangeText={(text) => setNewRule({...newRule, threshold: text})}
            />

            <Text style={styles.inputLabel}>Period</Text>
            <View style={styles.periodButtons}>
              {['daily', 'weekly', 'monthly'].map(period => (
                <TouchableOpacity
                  key={period}
                  style={[styles.periodButton, newRule.period === period && styles.periodButtonActive]}
                  onPress={() => setNewRule({...newRule, period})}
                >
                  <Text style={[styles.periodButtonText, newRule.period === period && styles.periodButtonTextActive]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.createButton} onPress={handleCreateRule}>
              <Text style={styles.createButtonText}>Create Alert Rule</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function AlertRuleItem({ rule, onToggle, onDelete }) {
  // Handle condition_data that might be object or string
  let conditionData = {};
  if (typeof rule.condition_data === 'string') {
    try {
      conditionData = JSON.parse(rule.condition_data);
    } catch {}
  } else if (rule.condition_data && typeof rule.condition_data === 'object') {
    conditionData = rule.condition_data;
  }

  // Get display info based on rule type
  const getRuleInfo = () => {
    switch (rule.type) {
      case 'spending_threshold':
        return {
          title: conditionData.category || 'Spending',
          icon: 'trending-up',
          description: `Alert when ${conditionData.category || 'spending'} exceeds $${conditionData.threshold?.toFixed(2) || 0} ${conditionData.period || 'monthly'}`,
        };
      case 'balance_threshold':
        return {
          title: 'Low Balance',
          icon: 'wallet-outline',
          description: `Alert when balance drops below $${conditionData.threshold?.toFixed(2) || 0}`,
        };
      case 'large_transaction':
        return {
          title: 'Large Transaction',
          icon: 'alert-circle-outline',
          description: `Alert for transactions over $${conditionData.threshold?.toFixed(2) || 0}`,
        };
      case 'payment_due':
        return {
          title: 'Payment Due',
          icon: 'card-outline',
          description: `Alert ${conditionData.days_before || 3} days before credit card payment due`,
        };
      case 'forecast_balance':
        return {
          title: `Forecast: ${conditionData.account || 'Account'}`,
          icon: 'trending-down-outline',
          description: `Alert when ${conditionData.account || 'account'} forecast drops below $${conditionData.threshold?.toFixed(2) || 0}`,
        };
      default:
        return {
          title: 'Alert Rule',
          icon: 'notifications-outline',
          description: `Type: ${rule.type}`,
        };
    }
  };

  const ruleInfo = getRuleInfo();

  return (
    <View style={styles.alertRuleItem}>
      <View style={styles.alertRuleHeader}>
        <View style={styles.alertRuleTitle}>
          <Ionicons 
            name={rule.is_active ? "checkmark-circle" : "checkmark-circle-outline"} 
            size={20} 
            color={rule.is_active ? colors.income : colors.textMuted} 
          />
          <Ionicons name={ruleInfo.icon} size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
          <Text style={styles.alertRuleCategory}>{ruleInfo.title}</Text>
        </View>
        <View style={styles.alertRuleActions}>
          <TouchableOpacity onPress={() => onToggle(rule)} style={styles.ruleActionBtn}>
            <Ionicons 
              name={rule.is_active ? "pause-circle-outline" : "play-circle-outline"} 
              size={20} 
              color={colors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(rule.id)} style={styles.ruleActionBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.expense} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.alertRuleDesc}>
        {ruleInfo.description}
      </Text>
      {rule.last_triggered_at && (
        <Text style={styles.alertRuleMeta}>
          Last triggered: {formatDate(rule.last_triggered_at)} ({rule.trigger_count} times)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.bg,
  },
  viewToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  viewToggleTextActive: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  addButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  alertRuleItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  alertRuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alertRuleTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertRuleCategory: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  alertRuleActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ruleActionBtn: {
    padding: spacing.xs,
  },
  alertRuleDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  alertRuleMeta: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.text,
  },
  typeButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typeButtonText: {
    fontSize: fontSize.base,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontFamily: 'Inter',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.outline,
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    fontFamily: 'Manrope',
  },
  alertItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  alertTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  ackButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  ackButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: '#fff',
  },
  alertMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
    fontFamily: 'Inter',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  ackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ackBadgeText: {
    fontSize: fontSize.xs,
    color: colors.income,
    fontWeight: fontWeight.medium,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptySubtext: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
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
  },
});
