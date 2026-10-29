// Aether design tokens. Keep component styles semantic so a light theme can be
// introduced without replacing individual colors throughout the app.
const palette = {
  bg: '#0D0F12',
  sidebar: '#101216',
  surface: '#171A20',
  surfaceElevated: '#20242B',
  surfaceHover: '#292E36',
  border: '#2A2F38',
  textPrimary: '#ECEFF3',
  textSecondary: '#A1A8B3',
  textMuted: '#747C88',
  accent: '#80EDC4',
  accentHover: '#9AF3D2',
  danger: '#FF6B78',
  warning: '#F2C879',
  success: '#80EDC4',
  terminal: '#0B0D10',
};

export const colors = {
  ...palette,
  gray: {
    100: palette.textPrimary,
    200: palette.textPrimary,
    300: '#D4D9E0',
    400: palette.textSecondary,
    500: palette.textSecondary,
    600: palette.textMuted,
    700: '#4B535F',
    800: palette.border,
    850: palette.surfaceElevated,
    900: palette.surface,
    950: palette.bg,
  },
  bgSurface: palette.surface,
  bgElevated: palette.surfaceElevated,
  bgInput: palette.surfaceElevated,
  text: palette.textPrimary,
  textOnAccent: palette.bg,
  borderActive: '#47505D',
  accentDim: '#58B899',
  accentBg: 'rgba(128, 237, 196, 0.12)',
  info: '#85B8FF',
  bubbleUser: palette.surfaceElevated,
  bubbleAssistant: palette.surface,
};

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
};

export const radius = {
  sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
};

const sans = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
export const typography = {
  fontFamily: sans,
  title: { fontFamily: sans, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontFamily: sans, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  body: { fontFamily: sans, fontSize: 15, lineHeight: 23 },
  bodySmall: { fontFamily: sans, fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: sans, fontSize: 12, lineHeight: 16 },
  button: { fontFamily: sans, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13, lineHeight: 19 },
};

export const motion = {
  fast: 120,
  standard: 180,
  drawer: 240,
};

export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.24, shadowRadius: 8, elevation: 3 },
};
