// ChatPlaceholder.js — Open WebUI–style welcome placeholder.
// Shows model avatar, greeting, and suggestion cards.
// Based on Placeholder.svelte + Suggestions.svelte.
//
// Props:
//   onSuggestion — (promptText: string) => void

import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/theme';

const SUGGESTIONS = [
  { title: ['Explain', 'complex topics in simple terms'], content: 'Explain quantum computing in simple terms' },
  { title: ['Brainstorm', 'creative ideas and solutions'], content: 'Help me brainstorm ideas for a new project' },
  { title: ['Write', 'code, emails, or documents'], content: 'Write a Python script to sort a list of dictionaries' },
  { title: ['Summarize', 'long articles or conversations'], content: 'Summarize the key points of this article' },
];

export default function ChatPlaceholder({ onSuggestion }) {
  return (
    <View style={styles.container}>
      {/* Avatar row */}
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>Æ</Text>
        </View>
      </View>

      {/* Greeting */}
      <Text style={styles.greeting}>Hello, User</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>How can I help you today?</Text>

      {/* Suggestion cards — horizontal scroll */}
      <View style={styles.suggestionsSection}>
        <View style={styles.suggestionHeader}>
          <Text style={styles.boltIcon}>⚡</Text>
          <Text style={styles.suggestionHeaderText}>Suggested</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToAlignment="center"
          contentContainerStyle={styles.cardsRow}
        >
          {SUGGESTIONS.map((s, i) => (
            <Pressable
              key={i}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
              onPress={() => onSuggestion?.(s.content)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{s.title[0]}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{s.title[1]}</Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={styles.cardLabel}>Prompt</Text>
                <Text style={styles.cardArrow}>↑</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxxl,
    maxWidth: 860,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.lg,
  },
  // avatar
  avatarRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textOnAccent,
  },
  // greeting
  greeting: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  // suggestions
  suggestionsSection: {
    marginTop: spacing.xxl,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  boltIcon: {
    fontSize: 14,
    color: colors.gray[600],
  },
  suggestionHeaderText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.gray[600], // text-gray-600
  },
  cardsRow: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  // each card — w-64 h-36, bg gray-850, rounded-3xl
  card: {
    width: 220,
    minHeight: 128,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardPressed: {
    backgroundColor: colors.gray[800], // dark:hover:bg-gray-800
  },
  cardTop: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    fontWeight: '500',
    color: colors.gray[300], // dark:text-gray-300
    marginBottom: 4,
  },
  cardDesc: {
    ...typography.bodySmall,
    color: colors.gray[500],
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    ...typography.caption,
    color: colors.gray[600],
  },
  cardArrow: {
    fontSize: 14,
    color: colors.gray[700], // gray-300/700
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
