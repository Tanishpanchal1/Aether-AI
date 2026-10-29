// ChatMessage.js — restrained conversation message renderer.
// User messages: right-aligned, bg gray-850, rounded-3xl, px-5 py-2, max-width 90%
// Assistant messages: left-aligned, avatar circle (bg accent), name label, content below
// Action buttons row under assistant messages: copy, regenerate, speak
//
// Props:
//   message       — { role: 'user' | 'assistant', content: string, timestamp?: number }
//   isLastMessage — boolean (controls action button visibility)

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/theme';

// ── user message (right-aligned bubble) ──────────────────

function UserMessage({ message }) {
  return (
    <View style={styles.userContainer}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{message.content}</Text>
      </View>
    </View>
  );
}

// ── assistant message (left-aligned, avatar + name + content) ─

function AssistantMessage({ message, isLastMessage, onRegenerate, onSpeak }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    // Platform clipboard — works on web and native
    const text = message.content || '';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (_) {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!onSpeak) return;
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        onSpeak(message.content);
      }
    } catch (_) {}
  };

  return (
    <View style={styles.assistantContainer}>
      {/* Avatar + name row */}
      <View style={styles.assistantHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>Æ</Text>
        </View>
        <Text style={styles.assistantName}>Aether</Text>
        {message.timestamp ? (
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.assistantContent}>
        <Text style={styles.assistantText}>{message.content}</Text>
      </View>

      {/* Action buttons row */}
      {(isLastMessage || message.role === 'assistant') && (
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={handleCopy}
          >
            <Text style={styles.actionIcon}>{copied ? '✓' : '⧉'}</Text>
          </Pressable>

          {onRegenerate ? <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={onRegenerate}
          >
            <Text style={styles.actionIcon}>↻</Text>
          </Pressable> : null}

          {onSpeak ? <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={handleSpeak}
          >
            <Text style={styles.actionIcon}>🔊</Text>
          </Pressable> : null}
        </View>
      )}
    </View>
  );
}

// ── main ChatMessage component ────────────────────────────

export default function ChatMessage({ message, isLastMessage = false, onRegenerate, onSpeak }) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }
  return <AssistantMessage message={message} isLastMessage={isLastMessage} onRegenerate={onRegenerate} onSpeak={onSpeak} />;
}

// ── styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  // user message
  userContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: spacing.xs,
  },
  userBubble: {
    maxWidth: '88%',
    backgroundColor: colors.bubbleUser,
    borderRadius: radius.lg,
    paddingHorizontal: 20, // px-5
    paddingVertical: 8, // py-2
  },
  userText: {
    ...typography.body,
    color: colors.textPrimary,
  },

  // assistant message
  assistantContainer: {
    paddingVertical: spacing.xs,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.accent, // bg accent
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textOnAccent,
  },
  assistantName: {
    ...typography.body,
    fontSize: 14,
    color: colors.gray[200],
    fontWeight: '600',
  },
  timestamp: {
    ...typography.caption,
    fontSize: 11,
    color: colors.gray[400],
    textTransform: 'uppercase',
  },
  assistantContent: {
    paddingLeft: 0,
  },
  assistantText: {
    ...typography.body,
    color: colors.gray[200], // text-gray-200
    lineHeight: 22,
  },

  // action buttons
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingLeft: 0,
  },
  actionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  actionBtnPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', // dark:hover:bg-white/5
  },
  actionIcon: {
    fontSize: 14,
    color: colors.gray[500], // dark:text-gray-500
    textAlign: 'center',
  },
});
