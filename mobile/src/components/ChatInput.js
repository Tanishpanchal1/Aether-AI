import React, { useRef } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/theme';

// ChatInput — based on Open WebUI's MessageInput.svelte
//
// Layout:
//   ┌────────────────────────────────────────────┐
//   │ [+]  Send a Message...        [mic] [send]  │
//   └────────────────────────────────────────────┘
//   LLMs can make mistakes. Verify important information.
//
// Props:
//   value         — controlled text value
//   onChangeText  — text change handler
//   onSend        — called when send button pressed or Enter hit
//   onVoiceCall   — called when headphone/call icon pressed (empty prompt)
//   onAttach      — called when + button pressed
//   isGenerating  — when true, show stop button instead of send/call
//   onStop        — called when stop button pressed

const MAX_HEIGHT = 200; // px — matches Open WebUI's Math.min(scrollHeight, 200)

export default function ChatInput({
  value = '',
  onChangeText,
  onSend,
  onVoiceCall,
  onAttach,
  isGenerating = false,
  onStop,
}) {
  const inputRef = useRef(null);
  const hasText = value.trim().length > 0;

  const handleSubmit = () => {
    if (hasText && onSend) onSend();
  };

  // --- Send / Call / Stop button logic (mirrors MessageInput.svelte) ---
  // 1. If generating → show stop button (circle with square)
  // 2. If prompt empty → show voice call/headphone button
  // 3. If prompt has text → show send button (circle with up arrow)

  const renderRightButton = () => {
    if (isGenerating) {
      // Stop button — circle with inner square (like Open WebUI's stop SVG)
      return (
        <Pressable
          style={styles.stopButton}
          onPress={onStop}
          accessibilityLabel="Stop generating"
        >
          <View style={styles.stopIcon} />
        </Pressable>
      );
    }

    if (!hasText) {
      // Voice call button — shown when input is empty
      if (!onVoiceCall) return null;
      return (
        <Pressable
          style={styles.callButton}
          onPress={onVoiceCall}
          accessibilityLabel="Start voice call"
        >
          <Text style={styles.callIcon}>🎧</Text>
        </Pressable>
      );
    }

    // Send button — black/white circle with up arrow
    return (
      <Pressable
        style={styles.sendButton}
        onPress={handleSubmit}
        accessibilityLabel="Send message"
      >
        <Text style={styles.sendIcon}>↑</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {/* Left: + attachment button */}
        {onAttach ? (
          <Pressable
            style={styles.attachButton}
            onPress={onAttach}
            accessibilityLabel="Attach file"
          >
            <Text style={styles.attachIcon}>+</Text>
          </Pressable>
        ) : null}

        {/* Center: auto-grow textarea */}
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder="Send a Message"
          placeholderTextColor={colors.textMuted}
          multiline
          blurOnSubmit={false}
          maxHeight={MAX_HEIGHT}
          onSubmitEditing={handleSubmit}
        />

        {/* Right: send or stop */}
        <View style={styles.rightButtons}>
          {renderRightButton()}
        </View>
      </View>

      {/* Below: disclaimer text */}
      <Text style={styles.disclaimer}>
        LLMs can make mistakes. Verify important information.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingBottom: spacing.sm,
  },
  // rounded-3xl container, bg gray-850
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  // Left: + button — rounded-full, bg gray-850
  attachButton: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.pill,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  attachIcon: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  // Center: textarea
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text, // gray-100/200
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  // Right side buttons
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  // Voice mic button
  micButton: {
    borderRadius: radius.pill,
    padding: 6,
    alignSelf: 'center',
  },
  micIcon: {
    fontSize: 20,
    lineHeight: 22,
  },
  // Call / headphone button (empty prompt)
  callButton: {
    borderRadius: radius.pill,
    padding: 8,
    alignSelf: 'center',
  },
  callIcon: {
    fontSize: 24,
    lineHeight: 26,
  },
  // Send button — black/white circle with up arrow
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginHorizontal: 2,
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textOnAccent,
    lineHeight: 20,
  },
  // Stop button — gray-700 circle with inner square
  stopButton: {
    backgroundColor: colors.gray[700], // #4e4e4e
    borderRadius: radius.pill,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginHorizontal: 2,
  },
  stopIcon: {
    width: 12,
    height: 12,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  // Disclaimer below input
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary, // gray-500
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
