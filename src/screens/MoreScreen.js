import React from 'react';
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

const FEATURES = [
  {
    title: 'Overview',
    subtitle: 'Monthly snapshot: alerts, budgets & forecasts',
    icon: 'grid-outline',
    color: '#6366f1',
    screen: 'Overview',
  },
  {
    title: 'Category Rules',
    subtitle: 'Auto-categorize transactions by pattern & amount',
    icon: 'pricetag-outline',
    color: '#10b981',
    screen: 'CategoryRules',
  },
  {
    title: 'Cash Forecast',
    subtitle: 'Monthly cash flow with recurring projections',
    icon: 'trending-up-outline',
    color: '#60a5fa',
    screen: 'CashForecast',
  },
  {
    title: 'Rewards',
    subtitle: 'Credit card points tracker and calculator',
    icon: 'trophy-outline',
    color: '#fbbf24',
    screen: 'Rewards',
  },
  {
    title: 'Settings',
    subtitle: 'Sync, export, and app preferences',
    icon: 'settings-outline',
    color: '#94a3b8',
    screen: 'Settings',
  },
];

function FeatureCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.featureCard} onPress={() => onPress(item.screen)} activeOpacity={0.7}>
      <View style={[styles.featureIcon, { backgroundColor: item.color + '22' }]}>
        <Ionicons name={item.icon} size={28} color={item.color} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

export function MoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>More</Text>
        <Text style={styles.headerSub}>Additional features</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.featureList}>
          {FEATURES.map((item) => (
            <FeatureCard key={item.screen} item={item} onPress={(screen) => navigation.navigate(screen)} />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Gullak Finance · DeathStar</Text>
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
    paddingBottom: spacing.lg,
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
  featureList: {
    gap: spacing.sm,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  featureSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
