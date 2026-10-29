import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import ChatPlaceholder from '../components/ChatPlaceholder';
import VoiceCallOverlay from '../components/VoiceCallOverlay';
import { colors, spacing } from '../theme/theme';

// ── mock data (UI only) ──────────────────────────────────

const MOCK_SESSIONS = [
  { id: '1', title: 'Project Planning', timestamp: Date.now() - 120000, lastMessage: 'Let\u2019s break down the tasks' },
  { id: '2', title: 'Bug Analysis', timestamp: Date.now() - 3600000, lastMessage: 'The issue is in the PTY reader' },
  { id: '3', title: 'Architecture Ideas', timestamp: Date.now() - 10800000, lastMessage: 'What about microservices' },
  { id: '4', title: 'Quick Question', timestamp: Date.now() - 86400000, lastMessage: 'How does the policy graph work?' },
  { id: '5', title: 'Refactoring Plan', timestamp: Date.now() - 172800000, lastMessage: 'We should split App.js' },
  { id: '6', title: 'Old Chat', timestamp: Date.now() - 604800000, lastMessage: 'Something from last week' },
];

const MOCK_MESSAGES = [
  { id: 'm1', role: 'user', content: 'Hey, can you help me understand the Aether architecture?' },
  { id: 'm2', role: 'assistant', content: 'Sure! Aether has three components: a FastAPI PTY WebSocket server, a PC launcher for OpenCode, and an Expo React Native UI. The server spawns a bash PTY, validates commands through a LangGraph policy node, and streams terminal I/O over WebSocket.' },
  { id: 'm3', role: 'user', content: 'How does the policy validation work?' },
  { id: 'm4', role: 'assistant', content: 'The LangGraph state graph has a single policy node that blocks parent directory traversal, absolute paths, cd commands, and destructive tokens like rm, sudo, mkfs, etc. When you launch an interactive app like opencode, it switches to application mode and bypasses line-level checks.' },
];

// ── chat screen ──────────────────────────────────────────

export default function ChatScreen({ sidebarVisible, onToggleSidebar }) {
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  // Voice call overlay state (referenced in CODEBASE.md but was missing)
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('listening');
  const scrollRef = useRef(null);

  const activeSession = MOCK_SESSIONS.find((s) => s.id === activeSessionId);

  const sendMessage = (text) => {
    const content = (text || input).trim();
    if (!content) return;
    const userMsg = { id: `m${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `m${Date.now() + 1}`,
          role: 'assistant',
          content: 'This is a UI demo \u2014 backend integration coming soon.',
        },
      ]);
      setIsGenerating(false);
    }, 800);
  };

  const newChat = () => {
    setMessages([]);
    setActiveSessionId(null);
  };

  const selectSession = (id) => {
    setActiveSessionId(id);
    // Load mock messages for that session (UI demo)
    setMessages(MOCK_MESSAGES);
  };

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />

      {/* Sidebar */}
      <Sidebar
        visible={sidebarVisible}
        onClose={onToggleSidebar}
        sessions={MOCK_SESSIONS}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onNewChat={newChat}
      />

      {/* Main content */}
      <View style={styles.main}>
        <Navbar
          title={activeSession?.title || 'New Chat'}
          onToggleSidebar={onToggleSidebar}
          onNewChat={newChat}
        />

        {messages.length === 0 ? (
          <View style={styles.scrollArea}>
            <ChatPlaceholder onSuggestion={(prompt) => sendMessage(prompt)} />
          </View>
        ) : (
          <FlatList
            ref={scrollRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ChatMessage
                message={item}
                isLastMessage={index === messages.length - 1}
              />
            )}
            style={styles.scrollArea}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd?.({ animated: true })
            }
          />
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ChatInput
            value={input}
            onChangeText={setInput}
            onSend={() => sendMessage()}
            isGenerating={isGenerating}
            onStop={() => setIsGenerating(false)}
            onVoiceCall={() => { setVoiceStatus('listening'); setVoiceActive(true); }}
          />
        </KeyboardAvoidingView>
      </View>

      {/* Voice call overlay — was missing, now wired to voiceActive/voiceStatus state */}
      <VoiceCallOverlay
        visible={voiceActive}
        status={voiceStatus}
        onClose={() => setVoiceActive(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg, // gray-950
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  scrollArea: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.md,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
});
