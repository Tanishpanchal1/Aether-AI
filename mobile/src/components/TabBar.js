import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/theme';

// Bottom tab bar — shared across both screens.
// tabs: [{ key, label, icon }]
// active: current tab key
// onSelect: (key) => void

export default function TabBar({ tabs, active, onSelect }) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => onSelect(tab.key)}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  icon: {
    fontSize: 22,
    color: colors.gray[600], // gray-600
  },
  iconActive: {
    color: colors.accent,
  },
  label: {
    ...typography.caption,
    color: colors.gray[600],
  },
  labelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
});
