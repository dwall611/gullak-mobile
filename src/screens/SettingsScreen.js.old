import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, clearCache } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

// ─── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <Text style={styles.sectionHeader}>{title}</Text>
  );
}

// ─── Action Row ────────────────────────────────────────────────────────────────
function ActionRow({ icon, iconColor, title, subtitle, onPress, loading, danger, rightElement }) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: (iconColor || colors.primary) + '22' }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor || colors.primary} />
        ) : (
          <Ionicons name={icon} size={20} color={iconColor || colors.primary} />
        )}
      </View>
      <View style={styles.actionTextBlock}>
        <Text style={[styles.actionTitle, danger && { color: colors.expense }]}>{title}</Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightElement || (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      )}
    </TouchableOpacity>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await api.triggerSync();
      setSyncResult({ success: true, message: result.message || 'Sync completed successfully' });
    } catch (e) {
      setSyncResult({ success: false, message: e.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  }, []);

  const handleClearCache = useCallback(() => {
    Alert.alert(
      'Clear Cache',
      'This will clear all locally cached data. The app will reload fresh data on next use.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearCache();
            Alert.alert('Cache Cleared', 'All cached data has been cleared.');
          },
        },
      ]
    );
  }, []);

  const handleExportMTD = useCallback(async () => {
    setExporting(true);
    try {
      const now = new Date();
      const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const url = api.getExportUrl(startDate, endDate);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open URL', 'Unable to open the export URL. Make sure you are connected via Tailscale.');
      }
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleExportYTD = useCallback(async () => {
    setExporting(true);
    try {
      const now = new Date();
      const startDate = `${now.getFullYear()}-01-01`;
      const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const url = api.getExportUrl(startDate, endDate);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open URL', 'Unable to open the export URL. Make sure you are connected via Tailscale.');
      }
    } catch (e) {
      Alert.alert('Export Failed', e.message);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleOpenWebDashboard = useCallback(async () => {
    const url = 'http://DeathStar:3001';
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Cannot Open', 'Unable to open the web dashboard. Make sure you are connected via Tailscale.');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }, []);

  const now = new Date();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Gullak Finance</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Sync section */}
        <SectionHeader title="DATA SYNC" />
        <View style={styles.card}>
          <ActionRow
            icon="sync-outline"
            iconColor={colors.primary}
            title="Sync with Plaid"
            subtitle="Pull latest transactions from all accounts"
            onPress={handleSync}
            loading={syncing}
          />
          {syncResult && (
            <View style={[styles.syncResult, { backgroundColor: syncResult.success ? colors.income + '22' : colors.expense + '22' }]}>
              <Ionicons
                name={syncResult.success ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={16}
                color={syncResult.success ? colors.income : colors.expense}
              />
              <Text style={[styles.syncResultText, { color: syncResult.success ? colors.income : colors.expense }]}>
                {syncResult.message}
              </Text>
            </View>
          )}
        </View>

        {/* Export section */}
        <SectionHeader title="EXPORT" />
        <View style={styles.card}>
          <ActionRow
            icon="download-outline"
            iconColor="#06b6d4"
            title="Export MTD (CSV)"
            subtitle={`Month-to-date: Jan 1 – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            onPress={handleExportMTD}
            loading={exporting}
          />
          <View style={styles.divider} />
          <ActionRow
            icon="cloud-download-outline"
            iconColor="#06b6d4"
            title="Export YTD (CSV)"
            subtitle={`Year-to-date: Jan 1 – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            onPress={handleExportYTD}
            loading={exporting}
          />
        </View>

        {/* Web dashboard */}
        <SectionHeader title="WEB DASHBOARD" />
        <View style={styles.card}>
          <ActionRow
            icon="globe-outline"
            iconColor="#10b981"
            title="Open Web Dashboard"
            subtitle="Full desktop experience on DeathStar:3001"
            onPress={handleOpenWebDashboard}
          />
        </View>

        {/* Cache */}
        <SectionHeader title="CACHE" />
        <View style={styles.card}>
          <ActionRow
            icon="trash-outline"
            iconColor={colors.expense}
            title="Clear Cache"
            subtitle="Force fresh data on next load"
            onPress={handleClearCache}
            danger
          />
        </View>

        {/* System info */}
        <SectionHeader title="ABOUT" />
        <View style={styles.card}>
          <InfoRow label="API Host" value="DeathStar:3001" />
          <View style={styles.divider} />
          <InfoRow label="Connection" value="Tailscale VPN" />
          <View style={styles.divider} />
          <InfoRow label="App Version" value="2.0.0" />
          <View style={styles.divider} />
          <InfoRow label="Platform" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  card: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  actionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginHorizontal: spacing.md,
  },
  syncResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  syncResultText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
  },
});
