import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';
import { getDateRange } from '../utils/helpers';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPoints(n) {
  return new Intl.NumberFormat('en-US').format(n || 0);
}

function formatCurrency(n) {
  if (n == null || isNaN(n)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

const DATE_FILTERS = [
  { value: '1day', label: '1D' },
  { value: '7days', label: '7D' },
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
];

// ─── Category breakdown item ──────────────────────────────────────────────────
function BreakdownItem({ item, isAmazon }) {
  return (
    <View style={styles.breakdownItem}>
      <View style={styles.breakdownLeft}>
        <Text style={styles.breakdownCategory}>{item.category}</Text>
        <Text style={styles.breakdownSub}>
          {formatCurrency(item.amount || 0)} · {item.transactions} txn{item.transactions !== 1 ? 's' : ''} × {
            item.multiplier === 0 && item.category === 'Mortgage' ? '250 flat pts' : `${item.multiplier}x`
          }
        </Text>
      </View>
      <View style={styles.breakdownRight}>
        <Text style={styles.breakdownPoints}>{formatPoints(item.points)} pts</Text>
        {(item.category === 'Amazon' || isAmazon) && (
          <Text style={styles.breakdownCash}>{formatCurrency(item.points * 0.01)}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Card within a program ────────────────────────────────────────────────────
function RewardCard({ reward }) {
  const [expanded, setExpanded] = useState(true);

  if (!reward.pointsData) {
    return (
      <View style={styles.rewardCard}>
        <View style={styles.noDataRow}>
          <Ionicons name="warning-outline" size={16} color={colors.warning} />
          <Text style={styles.noDataText}>No account linked — points unavailable</Text>
        </View>
      </View>
    );
  }

  const { account, pointsEarned, transactionCount, breakdown, period, biltRatio } = reward.pointsData;
  const isAmazon = account?.name === 'Amazon';
  const cardName = account?.name || reward.program_name;

  const buildBreakdown = () => {
    if (!breakdown?.length) return [];

    if (cardName === 'Reserve') {
      const featured = [];
      let othersPoints = 0, othersTransactions = 0, othersAmount = 0;
      breakdown.forEach(item => {
        if (item.multiplier > 1) featured.push(item);
        else { othersPoints += item.points; othersTransactions += item.transactions; othersAmount += item.amount || 0; }
      });
      featured.sort((a, b) => b.points - a.points);
      if (othersTransactions > 0) {
        featured.push({ category: 'Others', points: othersPoints, transactions: othersTransactions, multiplier: 1, amount: othersAmount });
      }
      return featured;
    }

    if (cardName === 'Bilt Palladium Card') {
      const mortgageItems = [];
      let othersPoints = 0, othersTransactions = 0, othersAmount = 0;
      breakdown.forEach(item => {
        if (['Housing', 'Rent', 'Home'].includes(item.category)) {
          mortgageItems.push({ ...item, category: 'Mortgage' });
        } else {
          othersPoints += item.points; othersTransactions += item.transactions; othersAmount += item.amount || 0;
        }
      });
      if (othersTransactions > 0) {
        mortgageItems.push({ category: 'Others', points: othersPoints, transactions: othersTransactions, multiplier: 2, amount: othersAmount });
      }
      return mortgageItems;
    }

    const totalAmount = breakdown.reduce((s, i) => s + (i.amount || 0), 0);
    const totalTransactions = breakdown.reduce((s, i) => s + i.transactions, 0);
    const categoryName = cardName === 'Amazon' ? 'Amazon' : 'All Spending';
    const multiplier = cardName === 'Amazon' ? 5 : 1.5;
    return [{ category: categoryName, points: pointsEarned, transactions: totalTransactions, multiplier, amount: totalAmount }];
  };

  const items = buildBreakdown();

  return (
    <View style={styles.rewardCard}>
      <TouchableOpacity style={styles.rewardCardHeader} onPress={() => setExpanded(v => !v)}>
        <View style={styles.rewardCardLeft}>
          <Text style={styles.rewardCardName}>
            {cardName}
            {account?.mask ? (
              <Text style={styles.rewardCardMask}> ····{account.mask}</Text>
            ) : null}
          </Text>
          <Text style={styles.rewardCardPeriod}>
            {period?.start_date} → {period?.end_date}
          </Text>
          {biltRatio !== undefined && (
            <Text style={styles.rewardCardSub}>Others/Mortgage: {biltRatio}%</Text>
          )}
        </View>
        <View style={styles.rewardCardRight}>
          <Text style={styles.rewardCardPoints}>{formatPoints(pointsEarned)} pts</Text>
          <Text style={styles.rewardCardTxCount}>{transactionCount} transactions</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
            style={{ marginTop: 4 }}
          />
        </View>
      </TouchableOpacity>

      {expanded && items.length > 0 && (
        <View style={styles.breakdownList}>
          {items.map((item, idx) => (
            <BreakdownItem key={idx} item={item} isAmazon={isAmazon} />
          ))}
        </View>
      )}

      {expanded && items.length === 0 && (
        <View style={styles.emptyBreakdown}>
          <Text style={styles.emptyBreakdownText}>No transactions in this period</Text>
        </View>
      )}
    </View>
  );
}

// ─── Program group ────────────────────────────────────────────────────────────
function ProgramGroup({ programName, cards }) {
  const totalPoints = cards.reduce((s, c) => s + (c.pointsData?.pointsEarned || 0), 0);
  const isAmazon = programName === 'Amazon Prime';

  return (
    <View style={styles.programGroup}>
      <View style={styles.programHeader}>
        <Text style={styles.programName}>{programName}</Text>
        <View style={styles.programTotalBox}>
          <Text style={styles.programTotal}>{formatPoints(totalPoints)} pts</Text>
          {isAmazon && (
            <Text style={styles.programCash}>{formatCurrency(totalPoints * 0.01)}</Text>
          )}
          <Text style={styles.programTotalLabel}>Total Earned</Text>
        </View>
      </View>
      {cards.map((reward) => (
        <RewardCard key={reward.id} reward={reward} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function RewardsScreen({ embedded = false }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('mtd');
  const [rewardsWithPoints, setRewardsWithPoints] = useState([]);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const { start_date, end_date } = getDateRange(dateFilter);
      const data = await api.getRewards();
      const enriched = await Promise.all(
        (data.rewards || []).map(async (reward) => {
          if (!reward.account_id) return reward;
          try {
            const pointsData = await api.calculateRewardPoints(reward.id, start_date, end_date);
            return { ...reward, pointsData };
          } catch {
            return reward;
          }
        })
      );
      setRewardsWithPoints(enriched);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const groupedRewards = useMemo(() => {
    const grouped = {};
    rewardsWithPoints.forEach(r => {
      if (!grouped[r.program_name]) grouped[r.program_name] = [];
      grouped[r.program_name].push(r);
    });
    const ORDER = ['Bilt Rewards', 'Chase Ultimate Rewards', 'Amazon Prime'];
    return Object.entries(grouped).sort(([a], [b]) => {
      const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [rewardsWithPoints]);

  const totalPointsAllPrograms = useMemo(() => {
    return rewardsWithPoints.reduce((s, r) => s + (r.pointsData?.pointsEarned || 0), 0);
  }, [rewardsWithPoints]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
        {!embedded && <View style={styles.header}>
          <Text style={styles.headerTitle}>Rewards</Text>
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
          <Text style={styles.headerTitle}>Rewards</Text>
        </View>}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.expense} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, embedded ? {} : { paddingTop: insets.top }]}>
      {!embedded && <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rewards</Text>
          <Text style={styles.headerSub}>Points earned from transactions</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeValue}>{formatPoints(totalPointsAllPrograms)}</Text>
          <Text style={styles.totalBadgeLabel}>total pts</Text>
        </View>
      </View>}

      {/* Date filter */}
      <View style={styles.filterRow}>
        {DATE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setDateFilter(f.value)}
            style={[styles.filterChip, dateFilter === f.value && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, dateFilter === f.value && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: insets.bottom + 20 }}
      >
        {groupedRewards.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No rewards programs</Text>
            <Text style={styles.emptyDesc}>Link a credit card with a rewards program to start tracking points.</Text>
          </View>
        ) : (
          groupedRewards.map(([programName, cards]) => (
            <ProgramGroup key={programName} programName={programName} cards={cards} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  totalBadge: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  totalBadgeValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primaryLight,
  },
  totalBadgeLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  programGroup: {
    marginBottom: spacing.md,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderBottomWidth: 0,
  },
  programName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  programTotalBox: {
    alignItems: 'flex-end',
  },
  programTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  programCash: {
    fontSize: fontSize.sm,
    color: colors.income,
    fontWeight: fontWeight.medium,
  },
  programTotalLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rewardCard: {
    backgroundColor: colors.card,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.cardBorder,
  },
  rewardCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  rewardCardLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rewardCardName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  rewardCardMask: {
    color: colors.textMuted,
    fontWeight: fontWeight.normal,
  },
  rewardCardPeriod: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  rewardCardSub: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rewardCardRight: {
    alignItems: 'flex-end',
  },
  rewardCardPoints: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  rewardCardTxCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  breakdownList: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder + '55',
  },
  breakdownLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  breakdownCategory: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  breakdownSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownPoints: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  breakdownCash: {
    fontSize: fontSize.xs,
    color: colors.income,
  },
  emptyBreakdown: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  emptyBreakdownText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },
  noDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
  },
  noDataText: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
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
