import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { TransactionEditModal } from '../components/TransactionEditModal';
import { DateRangeSelector } from '../components/DateRangeSelector';
import {
  getDateRange,
  getAvailableMonths,
  getTransactionCategory,
  getMerchantName,
  getAccountName,
} from '../utils/helpers';
import { colors, spacing, fontSize, fontWeight } from '../utils/theme';

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

const COL = {
  date: 60,
  category: 70,
  amount: 80,
};

// Category → dot color map
const CATEGORY_COLORS = {
  'Food & Dining':        '#f97316',
  'Transportation':       '#3b82f6',
  'Shopping':             '#a855f7',
  'Entertainment':        '#ec4899',
  'Travel':               '#06b6d4',
  'Personal Care':        '#f59e0b',
  'Healthcare':           '#10b981',
  'Housing':              '#64748b',
  'Home':                 '#84cc16',
  'Bills & Utilities':    '#eab308',
  'Income':               '#3fe56c',
  'Transfer':             '#94a3b8',
  'Credit Card Payments': '#ef4444',
  'Bank Fees':            '#ef4444',
  'Government':           '#6366f1',
  'Services':             '#14b8a6',
  'Groceries':            '#22c55e',
  'Education':            '#8b5cf6',
  'Uncategorized':        '#475569',
};

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || '#475569';
}

// ─── Formatters ──────────────────────────────────────────────────────────────

// "MAR 20" format for date column
function formatTableDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = d.getDate();
  return `${mon} ${day}`;
}

// "MARCH 20, 2026" for group separators
function formatGroupDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    .toUpperCase();
}

// Format amount: +1,234.56 or -1,234.56
function formatAmount(amount) {
  const abs = Math.abs(amount)
    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Plaid convention: positive = debit (expense), negative = credit (income)
  const isIncome = amount < 0;
  return isIncome ? `+$${abs}` : `-$${abs}`;
}

// ─── Table Row ───────────────────────────────────────────────────────────────

const TableRow = React.memo(function TableRow({
  tx,
  rowIndex,
  onPress,
  selectionMode,
  isSelected,
  onToggleSelect,
  onLongPress,
}) {
  const category = getTransactionCategory(tx);
  const merchant = getMerchantName(tx);
  const isIncome = tx.amount < 0;
  const bg = rowIndex % 2 === 0 ? '#131313' : '#1c1b1b';

  const handlePress = () => {
    if (selectionMode) {
      onToggleSelect?.(tx);
    } else {
      onPress?.(tx);
    }
  };

  const handleLongPress = () => {
    onLongPress?.(tx);
  };

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: isSelected ? '#1e2d1e' : bg }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.75}
    >
      {selectionMode && (
        <View style={styles.checkCell}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={10} color="#fff" />}
          </View>
        </View>
      )}

      {/* Date */}
      <Text style={styles.cellDate} numberOfLines={1}>
        {formatTableDate(tx.date)}
      </Text>

      {/* Category */}
      <View style={styles.cellCategoryWrap}>
        <View style={[styles.catDot, { backgroundColor: getCategoryColor(category) }]} />
        <Text style={styles.cellCategory} numberOfLines={1}>
          {category}
        </Text>
      </View>

      {/* Name */}
      <Text style={styles.cellName} numberOfLines={1}>
        {merchant}
      </Text>

      {/* Amount */}
      <Text
        style={[styles.cellAmount, isIncome ? styles.amountIncome : styles.amountExpense]}
        numberOfLines={1}
      >
        {formatAmount(tx.amount)}
      </Text>
    </TouchableOpacity>
  );
});

// ─── Group Header ─────────────────────────────────────────────────────────────

const GroupHeader = React.memo(function GroupHeader({ title }) {
  return (
    <View style={styles.groupHeader}>
      <View style={styles.groupLine} />
      <Text style={styles.groupLabel}>{title}</Text>
      <View style={styles.groupLine} />
    </View>
  );
});

// ─── Sticky Table Header ──────────────────────────────────────────────────────

const TableHeader = React.memo(function TableHeader({ selectionMode }) {
  return (
    <View style={styles.tableHeader}>
      {selectionMode && <View style={styles.checkCell} />}
      <Text style={[styles.thCell, { width: COL.date }]}>DATE</Text>
      <Text style={[styles.thCell, { width: COL.category }]}>CATEGORY</Text>
      <Text style={[styles.thCell, { flex: 1 }]}>NAME</Text>
      <Text style={[styles.thCell, styles.thAmount]}>AMOUNT</Text>
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [dateRange, setDateRange] = useState('7days');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const availableMonths = useMemo(() => getAvailableMonths(), []);

  const [returnTo, setReturnTo] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  // Filters
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Transaction edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Multi-select
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Apply navigation params on mount
  useEffect(() => {
    if (route.params) {
      if (route.params.dateRange) setDateRange(route.params.dateRange);
      if (route.params.selectedMonth) setSelectedMonth(route.params.selectedMonth);
      if (route.params.customFromDate) setCustomFromDate(route.params.customFromDate);
      if (route.params.customToDate) setCustomToDate(route.params.customToDate);
      if (route.params.filterCategory) setFilterCategory(route.params.filterCategory);
      if (route.params.filterAccount) setFilterAccount(route.params.filterAccount);
      if (route.params.searchMerchant) setSearch(route.params.searchMerchant);
      if (route.params.returnTo) setReturnTo(route.params.returnTo);
    }
  }, [route.params]);

  const loadTransactions = useCallback(async () => {
    try {
      const { start_date, end_date } = getDateRange(
        selectedMonth ? 'month' : dateRange,
        selectedMonth,
        customFromDate,
        customToDate
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
  }, [dateRange, selectedMonth, customFromDate, customToDate]);

  useEffect(() => {
    setLoading(true);
    loadTransactions().finally(() => setLoading(false));
  }, [loadTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  }, [loadTransactions]);

  // Filter options
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

  // Group displayed by date for SectionList
  const sections = useMemo(() => {
    const map = new Map();
    displayed.forEach((tx) => {
      const key = tx.date || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(tx);
    });
    return [...map.entries()].map(([date, data]) => ({
      date,
      title: formatGroupDate(date),
      data,
    }));
  }, [displayed]);

  // Global row index for alternating colors (per-section index won't work across sections)
  const rowIndexMap = useMemo(() => {
    const map = new Map();
    let i = 0;
    displayed.forEach((tx) => {
      map.set(tx.id || `${tx.date}-${tx.amount}-${i}`, i);
      i++;
    });
    return map;
  }, [displayed]);

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

  const handleBackToOrigin = useCallback(() => {
    if (returnTo) {
      setReturnTo(null);
      navigation.navigate(returnTo);
    }
  }, [returnTo, navigation]);

  const handleDateRangeChange = useCallback((v) => {
    setReturnTo(null);
    setDateRange(v);
    setSelectedMonth('');
    if (v !== 'custom') {
      setCustomFromDate('');
      setCustomToDate('');
    }
  }, []);

  const activeFilterCount = [filterAccount, filterCategory].filter(Boolean).length;

  // Multi-select handlers
  const enterSelectionMode = useCallback((tx) => {
    setSelectionMode(true);
    setSelectedIds(new Set([tx.id]));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((tx) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tx.id)) next.delete(tx.id);
      else next.add(tx.id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((t) => t.id)));
  }, [filtered]);

  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setAllCategories(data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, []);

  const openCategoryPicker = useCallback(() => {
    if (allCategories.length === 0) loadCategories();
    setShowCategoryPicker(true);
  }, [allCategories.length, loadCategories]);

  const handleBulkCategoryUpdate = useCallback(async (category) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await api.bulkUpdateTransactionCategory([...selectedIds], category.name, category.id);
      setShowCategoryPicker(false);
      exitSelectionMode();
      await loadTransactions();
    } catch (err) {
      console.error('Error updating categories:', err);
      Alert.alert('Error', 'Failed to update categories. Please try again.');
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedIds, exitSelectionMode, loadTransactions]);

  useEffect(() => {
    return () => {
      if (selectionMode) exitSelectionMode();
    };
  }, [selectionMode, exitSelectionMode]);

  const handleTransactionPress = useCallback((tx) => {
    setSelectedTransaction(tx);
    setEditModalVisible(true);
  }, []);

  const handleEditModalClose = useCallback(() => {
    setEditModalVisible(false);
    setSelectedTransaction(null);
  }, []);

  const handleEditModalSaved = useCallback(async () => {
    setEditModalVisible(false);
    setSelectedTransaction(null);
    await loadTransactions();
  }, [loadTransactions]);

  const keyExtractor = (item) =>
    item.id || `${item.date}-${item.amount}-${Math.random()}`;

  const renderItem = ({ item, index }) => {
    const globalIdx = rowIndexMap.get(item.id) ?? index;
    return (
      <TableRow
        tx={item}
        rowIndex={globalIdx}
        onPress={handleTransactionPress}
        selectionMode={selectionMode}
        isSelected={selectedIds.has(item.id)}
        onToggleSelect={toggleSelect}
        onLongPress={enterSelectionMode}
      />
    );
  };

  const renderSectionHeader = ({ section }) => (
    <GroupHeader title={section.title} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Top Header ── */}
      <View style={styles.header}>
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={exitSelectionMode} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedIds.size} selected</Text>
            <TouchableOpacity
              onPress={selectedIds.size === filtered.length ? deselectAll : selectAll}
              style={styles.headerBtn}
            >
              <Text style={styles.headerBtnText}>
                {selectedIds.size === filtered.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </>
        ) : returnTo ? (
          <>
            <TouchableOpacity onPress={handleBackToOrigin} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Text style={styles.backBtnText}>{returnTo}</Text>
            </TouchableOpacity>
            <Text style={styles.count}>
              {filtered.length.toLocaleString()} / {allTransactions.length.toLocaleString()}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.headerTitle}>Transactions</Text>
            <Text style={styles.count}>
              {filtered.length.toLocaleString()} / {allTransactions.length.toLocaleString()}
            </Text>
          </>
        )}
      </View>

      {/* ── Date Range ── */}
      <DateRangeSelector
        selected={selectedMonth ? 'month' : dateRange}
        onSelect={handleDateRangeChange}
        months={availableMonths.slice(0, 6)}
        selectedMonth={selectedMonth}
        onSelectMonth={(m) => {
          setReturnTo(null);
          setSelectedMonth(m === selectedMonth ? '' : m);
          if (m !== selectedMonth) setDateRange('month');
        }}
        customFromDate={customFromDate}
        customToDate={customToDate}
      />

      {/* ── Search & Filter Bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={15} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={15} color={colors.textMuted} />
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
            size={17}
            color={activeFilterCount > 0 ? '#fff' : colors.textSecondary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Active Filter Chips ── */}
      {(filterAccount || filterCategory) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFilters}
          contentContainerStyle={{ paddingHorizontal: spacing.md, gap: 6 }}
        >
          {filterAccount ? (
            <TouchableOpacity style={styles.activeChip} onPress={() => setFilterAccount('')}>
              <Text style={styles.activeChipText}>{filterAccount}</Text>
              <Ionicons name="close" size={11} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
          {filterCategory ? (
            <TouchableOpacity style={styles.activeChip} onPress={() => setFilterCategory('')}>
              <Text style={styles.activeChipText}>{filterCategory}</Text>
              <Ionicons name="close" size={11} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}

      {/* ── Sticky Table Header ── */}
      {!loading && <TableHeader selectionMode={selectionMode} />}

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() =>
            loadingMore ? (
              <ActivityIndicator style={{ padding: 12 }} color={colors.primary} />
            ) : displayed.length < filtered.length ? (
              <View style={[styles.footerHint, selectionMode && { paddingBottom: 80 }]}>
                <Text style={styles.footerHintText}>
                  Showing {displayed.length.toLocaleString()} of {filtered.length.toLocaleString()} — scroll for more
                </Text>
              </View>
            ) : filtered.length > 0 ? (
              <View style={[styles.footerHint, selectionMode && { paddingBottom: 80 }]}>
                <Text style={styles.footerHintText}>
                  {filtered.length.toLocaleString()} transactions
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
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
          contentContainerStyle={displayed.length === 0 ? { flex: 1 } : undefined}
          style={styles.list}
        />
      )}

      {/* ── Filter Modal ── */}
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
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
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
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilters(false)}>
              <Text style={styles.applyBtnText}>
                Show {filtered.length.toLocaleString()} Results
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Transaction Edit Modal ── */}
      <TransactionEditModal
        visible={editModalVisible}
        transaction={selectedTransaction}
        onClose={handleEditModalClose}
        onSaved={handleEditModalSaved}
      />

      {/* ── Multi-select Bottom Bar ── */}
      {selectionMode && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TouchableOpacity style={styles.clearSelectionBtn} onPress={deselectAll} disabled={selectedIds.size === 0}>
            <Text style={[styles.clearSelectionBtnText, selectedIds.size === 0 && styles.btnDisabled]}>
              Clear
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectionCount}>
            {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''} selected
          </Text>
          <TouchableOpacity
            style={[styles.setCategoryBtn, selectedIds.size === 0 && styles.setCategoryBtnDisabled]}
            onPress={openCategoryPicker}
            disabled={selectedIds.size === 0}
          >
            <Ionicons name="folder-outline" size={15} color="#fff" />
            <Text style={styles.setCategoryBtnText}>Set Category</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Category Picker Modal ── */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={[styles.modal, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.categorySubtitle}>
            Set category for {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''}
          </Text>

          {bulkUpdating ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Updating...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.categoryList}>
              {allCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryChip}
                  onPress={() => handleBulkCategoryUpdate(cat)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.categoryDot, { backgroundColor: cat.color || getCategoryColor(cat.name) }]}
                  />
                  <Text style={styles.categoryChipText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  count: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  headerBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerBtnText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    marginLeft: 2,
  },

  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    padding: 0,
  },
  filterBtn: {
    width: 38,
    height: 38,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: '#fff',
  },
  activeFilters: {
    maxHeight: 30,
    marginBottom: 4,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}22`,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: `${colors.primary}44`,
  },
  activeChipText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },

  // ── Table Header ──
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#0d0d0d',
  },
  thCell: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: '#4a4a4a',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  thAmount: {
    width: COL.amount,
    textAlign: 'right',
  },

  // ── Table Row ──
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: spacing.md,
  },
  checkCell: {
    width: 28,
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cellDate: {
    width: COL.date,
    fontSize: 13,
    color: '#5a5a5a',
    fontVariant: ['tabular-nums'],
  },
  cellCategoryWrap: {
    width: COL.category,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingRight: 4,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  cellCategory: {
    fontSize: 11,
    color: '#4a4a4a',
    flexShrink: 1,
  },
  cellName: {
    flex: 1,
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    color: '#e5e2e1',
    paddingRight: 8,
  },
  cellAmount: {
    width: COL.amount,
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  amountIncome: {
    color: '#3fe56c',
  },
  amountExpense: {
    color: '#e5e2e1',
  },

  // ── Group Header ──
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
    backgroundColor: '#0d0d0d',
  },
  groupLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222',
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: '#3fe56c',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // ── Misc ──
  list: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  footerHint: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerHintText: {
    color: '#3a3a3a',
    fontSize: 11,
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
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  clearBtnText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },

  // ── Filter Modal ──
  modal: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
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
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  filterOption: {
    padding: spacing.sm,
    borderRadius: 6,
    marginBottom: 3,
  },
  filterOptionActive: {
    backgroundColor: `${colors.primary}22`,
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
    backgroundColor: '#1e1e1e',
    marginVertical: spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
  },
  clearFiltersBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
    borderRadius: 8,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },

  // ── Bottom Bar (multi-select) ──
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: '#131313',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  clearSelectionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearSelectionBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  selectionCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'center',
  },
  setCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: 5,
  },
  setCategoryBtnDisabled: {
    opacity: 0.4,
  },
  setCategoryBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  btnDisabled: {
    opacity: 0.4,
  },

  // ── Category Picker ──
  categorySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  categoryList: {
    padding: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    gap: 7,
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
});
