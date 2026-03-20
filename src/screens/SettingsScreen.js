import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight, fontFamily } from '../utils/theme';
import { AlertsScreen } from './AlertsScreen';
import { CategoryRulesScreen } from './CategoryRulesScreen';
import { SyncScreen } from './SyncScreen';

const TABS = [
  { id: 'alerts', label: 'Alerts', icon: 'notifications-outline', Component: AlertsScreen },
  { id: 'categories', label: 'Categories', icon: 'pricetag-outline', Component: CategoryRulesScreen },
  { id: 'sync', label: 'Sync', icon: 'sync-outline', Component: SyncScreen },
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('alerts');

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.Component || AlertsScreen;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(({ id, label, icon }) => (
            <TouchableOpacity
              key={id}
              onPress={() => setActiveTab(id)}
              style={[styles.tab, activeTab === id && styles.tabActive]}
            >
              <Ionicons
                name={icon}
                size={16}
                color={activeTab === id ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        <ActiveComponent embedded />
      </View>
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
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  tabBarContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    fontFamily: 'Inter',
  },
  tabTextActive: {
    color: colors.primary,
    fontFamily: 'Inter',
  },
  content: {
    flex: 1,
  },
});
