import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/theme';

// VoiceCallOverlay — based on Open WebUI's CallOverlay.svelte
//
// Full-screen overlay with a large pulsing circle in the center.
// The circle's scale animates to simulate audio level changes.
//
// Props:
//   visible  — whether the overlay is shown
//   status   — 'listening' | 'thinking' | 'speaking' (determines label text)
//   onClose  — called when the close (X) button is pressed

const STATUS_TEXT = {
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Tap to interrupt',
};

export default function VoiceCallOverlay({ visible = false, status = 'listening', onClose }) {
  // Pulsing animation — scale between 0.85 and 1.15 continuously
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;

    // Create a looping pulse animation to simulate audio level
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    return () => pulse.stop();
  }, [visible, scaleAnim]);

  if (!visible) return null;

  const statusLabel = STATUS_TEXT[status] ?? STATUS_TEXT.listening;

  return (
    <View style={styles.overlay}>
      {/* Center: pulsing circle */}
      <View style={styles.centerArea}>
        <Pressable
          style={styles.circleContainer}
          // In Open WebUI tapping the circle interrupts audio
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />
        </Pressable>
      </View>

      {/* Bottom row: camera (left) | status (center) | close (right) */}
      <View style={styles.bottomRow}>
        {/* Left: camera toggle */}
        <Pressable
          style={styles.iconButton}
          accessibilityLabel="Toggle camera"
        >
          <Text style={styles.iconButtonText}>📷</Text>
        </Pressable>

        {/* Center: status text */}
        <Pressable style={styles.statusButton} onPress={onClose}>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </Pressable>

        {/* Right: close button */}
        <Pressable
          style={styles.iconButton}
          onPress={onClose}
          accessibilityLabel="Close voice call"
        >
          <Text style={styles.iconButtonText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen overlay — bg gray-950 with transparency
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13, 13, 13, 0.95)', // gray-950 with 95% opacity
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    zIndex: 9999,
  },
  // Center area — flex:1 to push bottom row down
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Large pulsing circle — white bg (dark mode: bg-white)
  pulseCircle: {
    width: 160, // ~size-40 in tailwind (10rem = 160px)
    height: 160,
    borderRadius: 80, // fully round
    backgroundColor: '#ffffff', // dark:bg-white
  },
  // Bottom row — flex row, space-between
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  // Circular icon buttons — bg gray-900, rounded-full
  iconButton: {
    backgroundColor: colors.bgSurface, // gray-900 #171717
    borderRadius: radius.pill,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 18,
    lineHeight: 20,
  },
  // Status button (center)
  statusButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  statusText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text, // gray-100/200
    textAlign: 'center',
  },
});
