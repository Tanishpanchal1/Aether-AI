import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme/theme';

export default function TaskStep({ title, detail, state = 'pending' }) {
  return (
    <View style={styles.row}>
      <View style={[styles.marker, state === 'completed' && styles.completed]} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  marker: { width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: colors.border },
  completed: { backgroundColor: colors.success },
  content: { flex: 1 },
  title: { ...typography.bodySmall, color: colors.textPrimary },
  detail: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
