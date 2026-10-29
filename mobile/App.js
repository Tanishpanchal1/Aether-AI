import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import TerminalScreen from './src/screens/TerminalScreen';
import ChatScreen from './src/screens/ChatScreen';
import TabBar from './src/components/TabBar';
import { colors } from './src/theme/theme';

const TABS = [
  { key: 'terminal', label: 'Terminal', icon: '⌘' },
  { key: 'chat', label: 'Chat', icon: '✦' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('terminal');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const toggleSidebar = () => setSidebarVisible((v) => !v);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {activeTab === 'terminal' ? (
        <TerminalScreen
          sidebarVisible={sidebarVisible}
          onToggleSidebar={toggleSidebar}
        />
      ) : (
        <ChatScreen
          sidebarVisible={sidebarVisible}
          onToggleSidebar={toggleSidebar}
        />
      )}

      {/* TabBar shown on all platforms — web users need it to switch tabs too */}
      <TabBar tabs={TABS} active={activeTab} onSelect={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg, // gray-950
  },
});
