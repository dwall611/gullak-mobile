import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

function StatCard({ icon, label, value, color = colors.primary }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

export function SyncScreen() {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const triggerSync = async () => {
    try {
      setSyncing(true);
      setStatus({ type: 'info', message: 'Syncing transactions from your bank accounts...' });

      await api.triggerSync();
      
      setLastSync(new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }));

      setStatus({ 
        type: 'success', 
        message: 'Sync completed successfully! New transactions have been pulled from the last 1-2 days.' 
      });
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconContainer}>
          <Ionicons name="sync-circle-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.infoTitle}>Manual Sync</Text>
        <Text style={styles.infoText}>
          Trigger a manual sync with your bank accounts. This will pull the latest transactions from the last 1-2 days (incremental sync).
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard 
          icon="cloud-download-outline" 
          label="Sync Type" 
          value="Incremental"
          color={colors.primary}
        />
        <StatCard 
          icon="calendar-outline" 
          label="Lookback" 
          value="1-2 days"
          color="#f59e0b"
        />
      </View>

      {/* Last Sync */}
      {lastSync && (
        <View style={styles.lastSyncCard}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={styles.lastSyncText}>Last synced: {lastSync}</Text>
        </View>
      )}

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

      {/* How It Works */}
      <View style={styles.howItWorksCard}>
        <Text style={styles.howItWorksTitle}>How Sync Works</Text>
        <View style={styles.howItWorksList}>
          <View style={styles.howItWorksItem}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={styles.howItWorksText}>
              Secure connection to your bank via Plaid
            </Text>
          </View>
          <View style={styles.howItWorksItem}>
            <Ionicons name="flash-outline" size={18} color={colors.primary} />
            <Text style={styles.howItWorksText}>
              Fast incremental sync (only recent transactions)
            </Text>
          </View>
          <View style={styles.howItWorksItem}>
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
            <Text style={styles.howItWorksText}>
              Updates balances and pulls new transactions
            </Text>
          </View>
          <View style={styles.howItWorksItem}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
            <Text style={styles.howItWorksText}>
              Your credentials are never stored
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  infoIconContainer: {
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  lastSyncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  lastSyncText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
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
  howItWorksCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  howItWorksTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  howItWorksList: {
    gap: spacing.md,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  howItWorksText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
