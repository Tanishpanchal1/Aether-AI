import React from 'react';
import { View, StyleSheet } from 'react-native';
import TaskStep from './TaskStep';
import { colors, spacing, radius } from '../../theme/theme';

export default function TaskTimeline({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <View style={styles.container}>
      {steps.map((step) => <TaskStep key={step.id || step.title} {...step} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md },
});
