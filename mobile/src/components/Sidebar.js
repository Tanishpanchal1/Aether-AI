// Sidebar.js — Open WebUI–style sidebar for Aether mobile app.
// Slide-out drawer on mobile (overlay + backdrop), fixed 260px on web.
//
// Props:
//   visible        — boolean, drawer open/closed
//   onClose        — () => void, close handler (backdrop tap)
//   sessions       — [{ id, title, timestamp, ... }] chat session list
//   activeSessionId — string | null
//   onSelectSession — (id) => void
//   onNewChat      — () => void

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, typography, spacing, radius } from '../theme/theme';

const SIDEBAR_WIDTH = 260;

// ── time-grouping logic (mirrors Open WebUI) ─────────────

function getTimeRange(timestamp) {
  if (!timestamp) return 'Previous 30 days';
  const now = new Date();
  const d = new Date(timestamp);
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (isSameDay(now, d)) return 'Today';
  if (diffDays <= 1) return 'Yesterday';
  if (diffDays <= 7) return 'Previous 7 days';
  if (diffDays <= 30) return 'Previous 30 days';
  return 'Older';
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const now = new Date();
  if (isSameDay(now, d)) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── chat item ─────────────────────────────────────────────

function ChatItem({ session, active, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chatItem,
        active && styles.chatItemActive,
        pressed && styles.chatItemPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[styles.chatItemTitle, active && styles.chatItemTitleActive]}
        numberOfLines={1}
      >
        {session.title || 'New Chat'}
      </Text>
      <Text style={styles.chatItemTime}>{formatTime(session.timestamp)}</Text>
    </Pressable>
  );
}

// ── sidebar header (logo + new chat) ─────────────────────

function SidebarHeader({ onNewChat, onClose }) {
  return (
    <View style={styles.headerRow}>
      <Pressable
        style={({ pressed }) => [
          styles.newChatBtn,
          pressed && styles.newChatBtnPressed,
        ]}
        onPress={onNewChat}
      >
        {/* Logo circle */}
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>Æ</Text>
        </View>
        <Text style={styles.newChatText}>New Chat</Text>
        {/* Pencil icon */}
        <View style={styles.pencilWrap}>
          <Text style={styles.pencilIcon}>✎</Text>
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.closeBtn,
          pressed && styles.closeBtnPressed,
        ]}
        onPress={onClose}
      >
        <Text style={styles.closeIcon}>☰</Text>
      </Pressable>
    </View>
  );
}

// ── search bar ────────────────────────────────────────────

function SearchBar({ value, onChangeText }) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchIconWrap}>
        <Text style={styles.searchIcon}>⌕</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search"
        placeholderTextColor={colors.gray[500]}
      />
    </View>
  );
}

// ── user profile row ──────────────────────────────────────

function UserProfile({ name }) {
  const initial = (name || 'User').charAt(0).toUpperCase();
  return (
    <View style={styles.profileRow}>
      <View style={styles.profileAvatar}>
        <Text style={styles.profileAvatarText}>{initial}</Text>
      </View>
      <Text style={styles.profileName} numberOfLines={1}>
        {name || 'User'}
      </Text>
    </View>
  );
}

// ── main Sidebar component ────────────────────────────────

export default function Sidebar({
  visible,
  onClose,
  sessions = [],
  activeSessionId = null,
  onSelectSession,
  onNewChat,
}) {
  const [search, setSearch] = useState('');

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.lastMessage?.toLowerCase().includes(q),
    );
  }, [sessions, search]);

  // Group sessions by time range
  const groupedSessions = useMemo(() => {
    const groups = {};
    const order = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older'];
    filteredSessions.forEach((s) => {
      const range = getTimeRange(s.timestamp);
      if (!groups[range]) groups[range] = [];
      groups[range].push(s);
    });
    // Return ordered
    return order
      .filter((k) => groups[k])
      .map((k) => ({ label: k, items: groups[k] }));
  }, [filteredSessions]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop overlay (mobile / web when sidebar is floating) */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Drawer — position:fixed on web so it doesn't scroll with the page.
           react-native-web ignores position:'fixed' inside StyleSheet.create(),
           but does honour it when passed as an inline style object. */}
      <View
        style={[
          styles.drawer,
          Platform.OS === 'web' ? { position: 'fixed' } : null,
        ]}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: logo + new chat */}
          <SidebarHeader onNewChat={onNewChat} onClose={onClose} />

          {/* Search */}
          <SearchBar value={search} onChangeText={setSearch} />

          {/* Chat list with time groups */}
          <View style={styles.chatList}>
            {groupedSessions.map((group, gi) => (
              <View key={group.label}>
                <Text
                  style={[
                    styles.groupLabel,
                    gi > 0 && styles.groupLabelSpaced,
                  ]}
                >
                  {group.label}
                </Text>
                {group.items.map((session) => (
                  <ChatItem
                    key={session.id}
                    session={session}
                    active={session.id === activeSessionId}
                    onPress={() => onSelectSession?.(session.id)}
                  />
                ))}
              </View>
            ))}

            {filteredSessions.length === 0 && (
              <Text style={styles.emptyText}>No chats found</Text>
            )}
          </View>
        </ScrollView>

        {/* User profile at bottom */}
        <View style={styles.profileContainer}>
          <UserProfile name="User" />
        </View>
      </View>
    </>
  );
}

// ── styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 40,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.gray[950], // bg-gray-950
    zIndex: 50,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10, // px-2.5
  },

  // header row
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // py-2.5
    gap: 4,
  },
  newChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.md, // rounded-xl = 12
    gap: 6,
  },
  newChatBtnPressed: {
    backgroundColor: colors.gray[900], // dark:hover:bg-gray-900
  },
  logoCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textOnAccent,
  },
  newChatText: {
    ...typography.body,
    color: '#ffffff', // dark:text-white
    fontWeight: '500',
    flex: 1,
  },
  pencilWrap: {
    marginLeft: 'auto',
  },
  pencilIcon: {
    fontSize: 16,
    color: colors.gray[400],
  },
  closeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  closeBtnPressed: {
    backgroundColor: colors.gray[900],
  },
  closeIcon: {
    fontSize: 18,
    color: colors.gray[400],
  },

  // search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    marginHorizontal: 2,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  searchIconWrap: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 14,
    color: colors.gray[400],
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.gray[300], // dark:text-gray-300
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 6,
  },

  // chat list
  chatList: {
    flex: 1,
    paddingTop: 8,
  },
  groupLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.gray[500], // text-gray-500
    fontWeight: '500',
    paddingLeft: 10,
    paddingBottom: 4,
  },
  groupLabelSpaced: {
    paddingTop: 20, // pt-5
  },

  // chat item
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
  chatItemActive: {
    backgroundColor: colors.gray[900], // dark:bg-gray-900
  },
  chatItemPressed: {
    backgroundColor: colors.gray[900],
  },
  chatItemTitle: {
    ...typography.bodySmall,
    color: colors.gray[200], // dark:text-gray-200
    flex: 1,
    fontWeight: '500',
  },
  chatItemTitleActive: {
    color: '#ffffff',
  },
  chatItemTime: {
    ...typography.caption,
    color: colors.gray[600], // text-gray-600
    marginLeft: 8,
    fontSize: 11,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.gray[500],
    textAlign: 'center',
    paddingTop: 40,
  },

  // profile
  profileContainer: {
    paddingHorizontal: 10,
    paddingBottom: 16,
    paddingTop: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    gap: 12,
  },
  profileAvatar: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray[200],
  },
  profileName: {
    ...typography.body,
    color: colors.gray[200],
    fontWeight: '500',
  },
});
