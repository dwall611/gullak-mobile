import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';

const DATE_RANGE_OPTIONS = [
  { value: '1day', label: '1D' },
  { value: '7days', label: '7D' },
  { value: 'mtd', label: 'MTD' },
  { value: 'ytd', label: 'YTD' },
];

export function DateRangeSelector({ selected, onSelect, months = [], selectedMonth, onSelectMonth }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
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

      {months.map((m) => (
        <TouchableOpacity
          key={m.value}
          onPress={() => onSelectMonth(m.value)}
          style={[
            styles.chip,
            selectedMonth === m.value && styles.chipActive,
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.chipText,
              selectedMonth === m.value && styles.chipTextActive,
            ]}
          >
            {m.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginRight: spacing.sm,
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
});
