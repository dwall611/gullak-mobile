import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const DATE_RANGE_OPTIONS = [
  { value: '1day', label: '1D' },
  { value: '7days', label: '7D' },
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
];

export function DateRangeSelector({ selected, onSelect, months = [], selectedMonth, onSelectMonth }) {
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const selectedMonthLabel = months.find(m => m.value === selectedMonth)?.label || 'Month';

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {DATE_RANGE_OPTIONS.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              onPress={() => onSelect(value)}
              style={[
                styles.chip,
                selected === value && !selectedMonth && styles.chipActive,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  selected === value && !selectedMonth && styles.chipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => setShowMonthPicker(true)}
            style={[styles.chip, selectedMonth && styles.chipActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selectedMonth && styles.chipTextActive]}>
              {selectedMonth ? selectedMonthLabel : 'Month'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={selectedMonth ? '#fff' : colors.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <Modal
        visible={showMonthPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Month</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.monthList}>
            {months.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.monthOption, selectedMonth === m.value && styles.monthOptionActive]}
                onPress={() => {
                  onSelectMonth(m.value);
                  setShowMonthPicker(false);
                }}
              >
                <Text style={[styles.monthOptionText, selectedMonth === m.value && styles.monthOptionTextActive]}>
                  {m.label}
                </Text>
                {selectedMonth === m.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  scrollContent: {
    gap: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  monthList: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  monthOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  monthOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  monthOptionText: {
    fontSize: fontSize.base,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  monthOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
