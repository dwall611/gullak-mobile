import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

// Human-readable time ago
function timeAgo(dateString) {
  if (!dateString) return 'Never';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Account type badge colors
const ACCOUNT_TYPE_COLORS = {
  credit: colors.expense,
  'credit card': colors.expense,
  depository: colors.info,
  checking: '#3b82f6',   // blue
  savings: '#10b981',    // green
  investment: '#a855f7', // purple
  brokerage: '#a855f7',
  '401k': '#a855f7',
  loan: '#f59e0b',       // amber
  paypal: '#009cde',     // paypal blue
};

function getAccountTypeColor(type, subtype) {
  const key = (subtype || type || '').toLowerCase();
  return ACCOUNT_TYPE_COLORS[key] || ACCOUNT_TYPE_COLORS[type?.toLowerCase()] || colors.textMuted;
}

function AccountBadge({ account }) {
  const badgeColor = getAccountTypeColor(account.type, account.subtype);
  const typeLabel = account.subtype || account.type || 'Account';
  
  return (
    <View style={styles.accountRow}>
      <View style={[styles.accountBadge, { backgroundColor: badgeColor + '20' }]}>
        <View style={[styles.accountDot, { backgroundColor: badgeColor }]} />
        <Text style={[styles.accountType, { color: badgeColor }]}>
          {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}
        </Text>
      </View>
      <Text style={styles.accountName} numberOfLines={1}>
        {account.name}
      </Text>
      {account.mask && (
        <Text style={styles.accountMask}>••{account.mask}</Text>
      )}
    </View>
  );
}

function ProductBadge({ product }) {
  const icons = {
    transactions: 'swap-horizontal',
    balances: 'wallet',
    investments: 'trending-up',
    liabilities: 'alert-circle',
  };
  
  const labels = {
    transactions: 'Transactions',
    balances: 'Balances',
    investments: 'Investments',
    liabilities: 'Liabilities',
  };
  
  return (
    <View style={styles.productBadge}>
      <Ionicons name={icons[product] || 'checkmark'} size={10} color={colors.textMuted} />
      <Text style={styles.productText}>{labels[product] || product}</Text>
    </View>
  );
}

function InstitutionCard({ institution }) {
  const isSuccess = institution.status === 'success';
  const isError = institution.status === 'error';
  
  return (
    <View style={styles.institutionCard}>
      {/* Header */}
      <View style={styles.institutionHeader}>
        <View style={styles.institutionTitleRow}>
          <Text style={styles.institutionName}>{institution.name}</Text>
          {institution.status && (
            <View style={[
              styles.statusBadge,
              isError && styles.statusBadgeError
            ]}>
              <Ionicons 
                name={isSuccess ? 'checkmark-circle' : 'alert-circle'} 
                size={12} 
                color={isSuccess ? colors.income : colors.expense} 
              />
            </View>
          )}
        </View>
        <Text style={styles.lastSyncText}>
          <Ionicons name="time-outline" size={11} color={colors.textMuted} /> {timeAgo(institution.last_sync_at)}
        </Text>
      </View>
      
      {/* Products being synced */}
      {institution.products && institution.products.length > 0 && (
        <View style={styles.productsRow}>
          {institution.products.map((product, idx) => (
            <ProductBadge key={idx} product={product} />
          ))}
        </View>
      )}
      
      {/* Accounts */}
      {institution.accounts && institution.accounts.length > 0 && (
        <View style={styles.accountsList}>
          {institution.accounts.map((account, idx) => (
            <AccountBadge key={idx} account={account} />
          ))}
        </View>
      )}
      
      {/* Sync stats */}
      {institution.status && (
        <View style={styles.syncStats}>
          {isError && institution.error_message && (
            <Text style={styles.errorText}>{institution.error_message}</Text>
          )}
          {isSuccess && (
            <View style={styles.syncStatsRow}>
              {institution.transactions_added > 0 && (
                <Text style={styles.syncStatText}>
                  <Text style={styles.syncStatValue}>+{institution.transactions_added}</Text> added
                </Text>
              )}
              {institution.transactions_modified > 0 && (
                <Text style={styles.syncStatText}>
                  <Text style={styles.syncStatValue}>{institution.transactions_modified}</Text> modified
                </Text>
              )}
              {institution.transactions_removed > 0 && (
                <Text style={styles.syncStatText}>
                  <Text style={styles.syncStatValue}>-{institution.transactions_removed}</Text> removed
                </Text>
              )}
              {institution.transactions_added === 0 && 
               institution.transactions_modified === 0 && 
               institution.transactions_removed === 0 && (
                <Text style={styles.syncStatEmpty}>No changes</Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function SyncScreen() {
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [syncData, setSyncData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSyncStatus = useCallback(async () => {
    try {
      const data = await api.getSyncStatus();
      setSyncData(data);
    } catch (error) {
      console.error('Failed to load sync status:', error);
      setStatus({ type: 'error', message: 'Failed to load sync status' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSyncStatus();
  }, [loadSyncStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSyncStatus();
    setRefreshing(false);
  }, [loadSyncStatus]);

  const triggerSync = async () => {
    try {
      setSyncing(true);
      setStatus({ type: 'info', message: 'Syncing transactions from your bank accounts...' });

      await api.triggerSync();
      
      // Reload sync status after triggering
      setTimeout(() => {
        loadSyncStatus();
      }, 2000);

      setStatus({ 
        type: 'success', 
        message: 'Sync started! Pull to refresh for updates.' 
      });
      
      // Clear status after 3 seconds
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: `Sync failed: ${error.message}` 
      });
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (!status) return colors.textSecondary;
    switch (status.type) {
      case 'success': return colors.income;
      case 'error': return colors.expense;
      case 'info': return colors.primary;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = () => {
    if (!status) return null;
    switch (status.type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return null;
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Sync Button */}
      <TouchableOpacity
        style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
        onPress={triggerSync}
        disabled={syncing}
        activeOpacity={0.7}
      >
        {syncing ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.syncButtonText}>Syncing...</Text>
          </>
        ) : (
          <>
            <Ionicons name="sync-outline" size={20} color="#fff" />
            <Text style={styles.syncButtonText}>Sync Now</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Status Message */}
      {status && (
        <View style={[styles.statusCard, { borderLeftColor: getStatusColor() }]}>
          <Ionicons name={getStatusIcon()} size={20} color={getStatusColor()} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {status.message}
          </Text>
        </View>
      )}

      {/* Institutions List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Connected Institutions</Text>
        {syncData?.institutions && (
          <Text style={styles.sectionCount}>{syncData.institutions.length}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : syncData?.institutions?.length > 0 ? (
        <View style={styles.institutionsList}>
          {syncData.institutions.map((institution, idx) => (
            <InstitutionCard key={institution.id || idx} institution={institution} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No institutions connected</Text>
          <Text style={styles.emptySubtext}>
            Connect a bank account through the web dashboard to get started.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: '#fff',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderLeftWidth: 4,
  },
  statusText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontFamily: 'Manrope',
  },
  sectionCount: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  institutionsList: {
    gap: spacing.md,
  },
  institutionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  institutionHeader: {
    marginBottom: spacing.sm,
  },
  institutionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  institutionName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBadge: {
    padding: spacing.xs,
  },
  statusBadgeError: {
    backgroundColor: colors.expense + '20',
    borderRadius: radius.full,
  },
  lastSyncText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  productsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  productText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  accountsList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  accountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  accountType: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  accountName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  accountMask: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  syncStats: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  syncStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  syncStatText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  syncStatValue: {
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  syncStatEmpty: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.expense,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
