import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import Navbar from '../components/Navbar';
import { WS_URL, XTERM_CSS } from '../config/server';
import { colors, spacing, radius, typography } from '../theme/theme';

function StatusPill({ status }) {
  const labels = {
    connecting: 'Connecting',
    connected: 'Connected',
    reconnecting: 'Reconnecting',
    disconnected: 'Disconnected',
    error: 'Connection error',
  };
  return (
    <View style={[styles.statusPill, status === 'connected' && styles.statusConnected]}>
      <View style={styles.statusDot} />
      <Text style={styles.statusText}>{labels[status] || status}</Text>
    </View>
  );
}

function NativeTerminal() {
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.3.0/css/xterm.min.css"><style>html,body,#terminal{height:100%;margin:0;background:${colors.terminal};overflow:hidden}.xterm{height:100%;padding:8px;box-sizing:border-box}</style></head><body><div id="terminal"></div><script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.3.0/lib/xterm.min.js"></script><script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script><script>const t=new Terminal({cursorBlink:true,convertEol:true,fontFamily:'monospace',theme:{background:'${colors.terminal}',foreground:'#cdd6e8',cursor:'${colors.accent}'}});const f=new FitAddon.FitAddon();t.loadAddon(f);t.open(document.getElementById('terminal'));const s=new WebSocket(${JSON.stringify(WS_URL)});s.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='output'||m.type==='policy')t.write(m.data||'')};s.onerror=()=>t.write('\\r\\n\\x1b[31mUnable to connect to server.\\x1b[0m\\r\\n');t.onData=d=>{if(s.readyState===1)s.send(JSON.stringify({type:'input',data:d}))};function resize(){f.fit();if(s.readyState===1)s.send(JSON.stringify({type:'resize',cols:t.cols,rows:t.rows}))}window.addEventListener('resize',resize);setTimeout(resize,100);</script></body></html>`;
  return <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} javaScriptEnabled domStorageEnabled />;
}

function WebTerminal({ onStatus }) {
  // Use a callback ref so xterm.open() receives the real DOM element,
  // not a React Native fiber node. react-native-web exposes the underlying
  // HTMLElement via ref.current for <View>, but only after mount; using a
  // callback ref gives us the element synchronously on first render.
  const domRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [startupError, setStartupError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Callback ref: called with the DOM node when the element mounts/unmounts.
  const setRef = (node) => {
    domRef.current = node;
  };

  useEffect(() => {
    // Wait for the DOM node to be available (set by the callback ref above).
    if (!domRef.current) return;

    let terminal;
    let socket;
    let onResize;
    let styleEl;
    let reconnectTimer;
    try {
      const { Terminal } = require('@xterm/xterm');
      const { FitAddon } = require('@xterm/addon-fit');
      styleEl = document.createElement('style');
      styleEl.textContent = XTERM_CSS;
      document.head.appendChild(styleEl);
      terminal = new Terminal({
        cursorBlink: true, convertEol: true, fontFamily: 'ui-monospace, monospace', fontSize: 13,
        theme: { background: colors.terminal, foreground: '#cdd6e8', cursor: colors.accent },
      });
      const fit = new FitAddon();
      terminal.loadAddon(fit);
      // domRef.current is now the real HTMLDivElement — xterm.open() works correctly.
      terminal.open(domRef.current);
      const connect = () => {
        setStatus('connecting');
        onStatus?.('connecting');
        socket = new WebSocket(WS_URL);
        socket.onopen = () => { setStatus('connected'); onStatus?.('connected'); fit.fit(); };
        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'output' || message.type === 'policy') terminal.write(message.data || '');
            if (message.type === 'mode') terminal.write(`\r\n\x1b[36m[Aether: ${message.name} interactive mode]\x1b[0m\r\n`);
          } catch (error) { terminal.write(`\r\nInvalid server message: ${error.message}\r\n`); }
        };
        socket.onerror = () => { setStatus('error'); onStatus?.('error'); };
        socket.onclose = () => {
          setStatus('disconnected');
          onStatus?.('disconnected');
          reconnectTimer = setTimeout(connect, 1500);
        };
      };
      connect();
      terminal.onData((data) => {
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'input', data }));
      });
      onResize = () => {
        fit.fit();
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }));
      };
      window.addEventListener('resize', onResize);
      setTimeout(onResize, 100);
    } catch (error) {
      setStatus('error');
      onStatus?.('error');
      setStartupError(error instanceof Error ? error.message : String(error));
    }
    return () => {
      clearTimeout(reconnectTimer);
      if (onResize) window.removeEventListener('resize', onResize);
      socket?.close();
      terminal?.dispose();
      styleEl?.remove();
    };
  }, [retryKey, onStatus]);

  // WebTerminal no longer wraps itself in a terminalFrame — the outer
  // TerminalScreen already provides that container. This eliminates the
  // double-border / double-padding caused by the previous nested frames.
  // The terminalCanvas fills the outer frame via flex: 1.
  return (
    <>
      {/* ref callback gives xterm a real HTMLElement, not an RN fiber node */}
      <View style={styles.terminalCanvas} ref={setRef} />
      {startupError ? <Text style={styles.error}>Terminal failed to start: {startupError}</Text> : null}
      {status !== 'connected' ? (
        <View style={styles.reconnectOverlay}>
          <Text style={styles.error}>{status === 'connecting' ? 'Connecting to the local terminal…' : 'Terminal connection unavailable.'}</Text>
          <Pressable style={styles.reconnectButton} onPress={() => setRetryKey((key) => key + 1)}>
            <Text style={styles.reconnectText}>Reconnect</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

export default function TerminalScreen({ onToggleSidebar }) {
  const [status, setStatus] = useState(Platform.OS === 'web' ? 'connecting' : 'connected');
  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <Navbar title="Terminal" onToggleSidebar={onToggleSidebar} onNewChat={() => {}} />
      <View style={styles.header}>
        <Text style={styles.heading}>Local workspace</Text>
        <StatusPill status={status} />
      </View>
      <View style={styles.terminalFrame}>
        {Platform.OS === 'web' ? <WebTerminal onStatus={setStatus} /> : <NativeTerminal />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  heading: { ...typography.heading, color: colors.textPrimary },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  statusConnected: { borderColor: colors.accentDim },
  statusDot: { width: 7, height: 7, borderRadius: radius.pill, backgroundColor: colors.success },
  statusText: { ...typography.caption, color: colors.textSecondary },
  terminalFrame: { flex: 1, marginHorizontal: spacing.xl, marginBottom: spacing.xl, backgroundColor: colors.terminal, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: 'hidden' },
  terminalCanvas: { flex: 1, padding: spacing.md },
  webview: { flex: 1, backgroundColor: colors.terminal },
  reconnectOverlay: { position: 'absolute', left: 0, right: 0, top: '42%', alignItems: 'center', gap: spacing.md },
  reconnectButton: { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  reconnectText: { ...typography.button, color: colors.textOnAccent },
  error: { ...typography.bodySmall, color: colors.danger, padding: spacing.lg, textAlign: 'center' },
});
