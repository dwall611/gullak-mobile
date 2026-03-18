import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

// Placeholder for sub-screens (to be implemented)
function CashForecastTab() {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>Cash Forecast</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

function CashBurnTab() {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>Cash Burn</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

function RewardsTab() {
  return (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>Rewards</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

const TABS = [
  { id: 'cash-forecast', label: 'Cash Forecast', icon: 'trending-down-outline', Component: CashForecastTab },
  { id: 'cash-burn', label: 'Cash Burn', icon: 'flame-outline', Component: CashBurnTab },
  { id: 'rewards', label: 'Rewards', icon: 'gift-outline', Component: RewardsTab },
];

export function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('cash-forecast');

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.Component || CashForecastTab;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
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
