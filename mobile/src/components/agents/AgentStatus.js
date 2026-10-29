import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme/theme';

const STATES = {
  planning: ['Planning', colors.info],
  approval: ['Waiting for approval', colors.warning],
  executing: ['Executing', colors.accent],
  tool: ['Waiting for a tool', colors.info],
  completed: ['Completed', colors.success],
  failed: ['Failed', colors.danger],
  cancelled: ['Cancelled', colors.textMuted],
};

export default function AgentStatus({ state = 'planning' }) {
  const [label, color] = STATES[state] || STATES.planning;
  return (
    <View style={styles.container} accessibilityLabel={`Agent status: ${label}`}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
  text: { ...typography.caption, color: colors.textSecondary },
});
