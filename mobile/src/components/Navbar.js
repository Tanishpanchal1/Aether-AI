// Navbar.js — Open WebUI–style top navbar for Aether mobile app.
// Transparent bar with sidebar toggle (hamburger), centered title,
// and right-side new chat button + user avatar.
//
// Props:
//   title           — string, current chat title (defaults to 'New Chat')
//   onToggleSidebar — () => void
//   onNewChat       — () => void

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/theme';

export default function Navbar({ title = 'New Chat', onToggleSidebar, onNewChat }) {
  return (
    <View style={styles.container}>
      {/* Left: hamburger / sidebar toggle */}
      <Pressable
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.iconButtonPressed,
        ]}
        onPress={onToggleSidebar}
        accessibilityLabel="Toggle Sidebar"
      >
        <Text style={styles.iconText}>☰</Text>
      </Pressable>

      {/* Center: title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right: new chat + avatar */}
      <View style={styles.rightSection}>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
          ]}
          onPress={onNewChat}
          accessibilityLabel="New Chat"
        >
          <Text style={styles.pencilIcon}>✎</Text>
        </Pressable>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radius.md, // rounded-xl
  },
  iconButtonPressed: {
    backgroundColor: colors.gray[850], // dark:hover:bg-gray-850
  },
  iconText: {
    fontSize: 20,
    color: colors.textPrimary,
    lineHeight: 24,
    textAlign: 'center',
  },
  title: {
    ...typography.body,
    fontSize: 15,
    color: colors.gray[400], // dark:text-gray-400
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pencilIcon: {
    fontSize: 16,
    color: colors.gray[400],
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gray[200],
  },
});
