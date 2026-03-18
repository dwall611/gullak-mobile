import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { TransactionItem } from '../components/TransactionItem';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { getDateRange, getAvailableMonths, getTransactionCategory, getMerchantName, getAccountName } from '../utils/helpers';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const PAGE_SIZE = 50;

export function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [dateRange, setDateRange] = useState('7days');
  const [selectedMonth, setSelectedMonth] = useState('');
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const [allTransactions, setAllTransactions] = useState([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      const { start_date, end_date } = getDateRange(
        selectedMonth ? 'month' : dateRange,
        selectedMonth
      );

      const data = await api.getTransactions({
        start_date,
        end_date,
        sort_by: 'date',
        order: 'desc',
        limit: 2000,
      });
      setAllTransactions(data.transactions || []);
      setDisplayCount(PAGE_SIZE);
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  }, [dateRange, selectedMonth]);

  useEffect(() => {
    setLoading(true);
    loadTransactions().finally(() => setLoading(false));
  }, [loadTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  // Build unique filter options
  const accounts = useMemo(() => {
    const set = new Set(allTransactions.map((t) => getAccountName(t)));
    return [...set].filter(Boolean).sort();
  }, [allTransactions]);

  const categories = useMemo(() => {
    const set = new Set(allTransactions.map((t) => getTransactionCategory(t)));
    return [...set].filter(Boolean).sort();
  }, [allTransactions]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = allTransactions;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          getMerchantName(t).toLowerCase().includes(q) ||
          getTransactionCategory(t).toLowerCase().includes(q)
      );
    }
    if (filterAccount) {
      result = result.filter((t) => getAccountName(t) === filterAccount);
    }
    if (filterCategory) {
      result = result.filter((t) => getTransactionCategory(t) === filterCategory);
    }
    return result;
  }, [allTransactions, search, filterAccount, filterCategory]);

  const displayed = useMemo(() => filtered.slice(0, displayCount), [filtered, displayCount]);

  const handleLoadMore = () => {
    if (displayCount < filtered.length && !loadingMore) {
      setLoadingMore(true);
      setTimeout(() => {
        setDisplayCount((c) => c + PAGE_SIZE);
        setLoadingMore(false);
      }, 100);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setFilterAccount('');
    setFilterCategory('');
    setShowFilters(false);
  };

  const activeFilterCount = [filterAccount, filterCategory].filter(Boolean).length;

  const renderItem = ({ item }) => <TransactionItem transaction={item} />;
  const keyExtractor = (item) => item.id || `${item.date}-${item.amount}-${Math.random()}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <Text style={styles.count}>
          {filtered.length.toLocaleString()} of {allTransactions.length.toLocaleString()}
        </Text>
      </View>

      {/* Date range */}
      <DateRangeSelector
        selected={selectedMonth ? 'month' : dateRange}
        onSelect={(v) => { setDateRange(v); setSelectedMonth(''); }}
        months={availableMonths.slice(0, 6)}
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => {
          setSelectedMonth(m === selectedMonth ? '' : m);
          if (m !== selectedMonth) setDateRange('month');
        }}
      />

      {/* Search & filter bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchants..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={activeFilterCount > 0 ? '#fff' : colors.textSecondary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      {(filterAccount || filterCategory) ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
          {filterAccount ? (
            <TouchableOpacity
              style={styles.activeChip}
              onPress={() => setFilterAccount('')}
            >
              <Text style={styles.activeChipText}>{filterAccount}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
          {filterCategory ? (
            <TouchableOpacity
              style={styles.activeChip}
              onPress={() => setFilterCategory('')}
            >
              <Text style={styles.activeChipText}>{filterCategory}</Text>
              <Ionicons name="close" size={12} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() =>
            loadingMore ? (
              <ActivityIndicator style={{ padding: spacing.md }} color={colors.primary} />
            ) : displayed.length < filtered.length ? (
              <View style={styles.moreHint}>
                <Text style={styles.moreHintText}>
                  Showing {displayed.length} of {filtered.length} — scroll for more
                </Text>
              </View>
            ) : filtered.length > 0 ? (
              <View style={styles.moreHint}>
                <Text style={styles.moreHintText}>
                  {filtered.length} transactions
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No transactions</Text>
              <Text style={styles.emptyDesc}>
                {search || activeFilterCount > 0
                  ? 'Try clearing your filters'
                  : 'No transactions found for this period'}
              </Text>
              {(search || activeFilterCount > 0) && (
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                  <Text style={styles.clearBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          contentContainerStyle={displayed.length === 0 ? { flex: 1 } : null}
          style={styles.list}
        />
      )}

      {/* Filter modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={[styles.modal, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Transactions</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            {/* Account filter */}
            <Text style={styles.filterLabel}>Account</Text>
            <TouchableOpacity
              style={[styles.filterOption, !filterAccount && styles.filterOptionActive]}
              onPress={() => setFilterAccount('')}
            >
              <Text style={[styles.filterOptionText, !filterAccount && styles.filterOptionTextActive]}>
                All Accounts
              </Text>
            </TouchableOpacity>
            {accounts.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.filterOption, filterAccount === a && styles.filterOptionActive]}
                onPress={() => setFilterAccount(filterAccount === a ? '' : a)}
              >
                <Text style={[styles.filterOptionText, filterAccount === a && styles.filterOptionTextActive]}>
                  {a}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.filterDivider} />

            {/* Category filter */}
            <Text style={styles.filterLabel}>Category</Text>
            <TouchableOpacity
              style={[styles.filterOption, !filterCategory && styles.filterOptionActive]}
              onPress={() => setFilterCategory('')}
            >
              <Text style={[styles.filterOptionText, !filterCategory && styles.filterOptionTextActive]}>
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.filterOption, filterCategory === c && styles.filterOptionActive]}
                onPress={() => setFilterCategory(filterCategory === c ? '' : c)}
              >
                <Text style={[styles.filterOptionText, filterCategory === c && styles.filterOptionTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
              <Text style={styles.clearFiltersBtnText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyBtnText}>
                Show {filtered.length.toLocaleString()} Results
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  count: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    padding: 0,
  },
  filterBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.expense,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  activeFilters: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    maxHeight: 32,
  },
  activeFiltersContent: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}20`,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
    maxWidth: 150,
  },
  activeChipText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  list: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  moreHint: {
    padding: spacing.md,
    alignItems: 'center',
  },
  moreHintText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  clearBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  clearBtnText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  // Modal
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  modalContent: {
    padding: spacing.md,
  },
  filterLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  filterOption: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: 4,
  },
  filterOptionActive: {
    backgroundColor: `${colors.primary}20`,
  },
  filterOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  filterDivider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  clearFiltersBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  clearFiltersBtnText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
