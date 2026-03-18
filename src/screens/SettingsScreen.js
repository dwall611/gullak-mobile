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
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

// Placeholder for sub-screens (to be implemented)
function AlertsTab() {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>Alerts</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

function CategoriesTab() {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>Categories</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

function SyncTab() {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>Sync</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

const TABS = [
  { id: 'alerts', label: 'Alerts', icon: 'notifications-outline', Component: AlertsTab },
  { id: 'categories', label: 'Categories', icon: 'pricetag-outline', Component: CategoriesTab },
  { id: 'sync', label: 'Sync', icon: 'sync-outline', Component: SyncTab },
];

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('alerts');

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.Component || AlertsTab;

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ActiveComponent />
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
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
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginRight: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  placeholderText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  placeholderSubtext: {
    fontSize: fontSize.base,
    color: colors.textMuted,
  },
});
