import { useColorScheme } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// App-wide design tokens. Every screen should import `C` from here instead of
// hardcoding hex values, so the whole app shares one consistent look.
//
//   import { C } from '../utils/theme';
//
// The palette is RedChilli's red (#C4212D). The `alias` values below
// map the many legacy hex colors that used to be scattered across screens onto
// these canonical tokens, so older code can be migrated mechanically.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  // Brand. RedChilli's red, #C4212D, with a darker shade for pressed states and
  // headings and a pale tint for selected rows and chips.
  // `navy` is a historical name kept so the many screens importing it keep
  // working; it now holds the dark red.
  navy: '#8E1720',
  accent: '#C4212D',
  accentDark: '#8E1720',
  accentLight: '#FBE9EA',

  // Status
  green: '#2E7D32',
  success: '#2E7D32',
  successLight: '#E6F4EA',
  red: '#E53E3E',
  danger: '#E53E3E',
  dangerLight: '#FDECEC',
  warning: '#F59E0B',
  warningLight: '#FEF3E2',

  // Neutrals / surfaces
  surface: '#FFFFFF',
  white: '#FFFFFF',
  bg: '#F0F4F8',
  bgAlt: '#F7FAFC',
  border: '#E2E8F0',
  divider: '#EDF2F7',

  // Text
  textPrimary: '#1A202C',
  textSecondary: '#718096',
  textPlaceholder: '#A0AEC0',
  textInverse: '#FFFFFF',
};

// WhatsApp's own palette, for the CRM's chat screens only. Kept apart from C so
// the messaging surface can keep WhatsApp's greens — bubbles, ticks, the new
// chat button — while the rest of the app is RedChilli red. Only the chrome
// around it (the header, the accents) follows the brand.
//
// Two variants with identical keys, so a screen can swap the whole palette in
// one assignment instead of testing the scheme at every colour.
export const WA_LIGHT = {
  dark: false,
  green: '#00A884',
  greenDark: '#008069',
  teal: '#128C7E',
  bubbleOut: '#D9FDD3',
  bubbleIn: '#FFFFFF',
  bubbleFlash: '#FFF3C4',
  chatBg: '#EFE7DE',
  panel: '#FFFFFF',
  panelAlt: '#F7F8FA',
  divider: '#E9EDEF',
  icon: '#54656F',
  iconMuted: '#8696A0',
  text: '#111B21',
  textMuted: '#667781',
  tick: '#8696A0',
  tickRead: '#53BDEB',
  badge: '#25D366',
  // Selected filter pills and the reaction row.
  chipOn: '#D9FDD3',
  chipOnText: '#0F5C43',
  accent: '#C4212D',
  accentLight: '#FBE9EA',
  backdrop: 'rgba(0,0,0,0.4)',
  headerBg: '#C4212D',
};

export const WA_DARK = {
  dark: true,
  green: '#00A884',
  greenDark: '#005C4B',
  teal: '#00A884',
  // WhatsApp's dark bubbles: a deep green for ours, slate for theirs.
  bubbleOut: '#005C4B',
  bubbleIn: '#202C33',
  bubbleFlash: '#3B3218',
  chatBg: '#0B141A',
  panel: '#111B21',
  panelAlt: '#202C33',
  divider: '#222D34',
  icon: '#AEBAC1',
  iconMuted: '#8696A0',
  text: '#E9EDEF',
  // Lighter than WhatsApp's own #8696A0: this also has to carry the
  // timestamps sitting on our green outgoing bubbles, where #8696A0
  // measures 2.6:1 — unreadable. #B7C6CC clears 4.5:1 on both.
  textMuted: '#B7C6CC',
  tick: '#8696A0',
  tickRead: '#53BDEB',
  badge: '#00A884',
  chipOn: '#005C4B',
  chipOnText: '#D9FDD3',
  // Lighter than the brand red so it reads on a dark panel: #C4212D on #111B21
  // measures 2.4:1, which is unreadable.
  accent: '#E8737D',
  accentLight: '#3A1B1E',
  backdrop: 'rgba(0,0,0,0.6)',
  headerBg: '#1F2C34',
};

// Existing imports of WA keep working; they get the light palette.
export const WA = WA_LIGHT;

/**
 * The palette matching the phone's current appearance setting.
 * Re-renders on its own when the user flips the system theme.
 */
export const useWaTheme = () =>
  useColorScheme() === 'dark' ? WA_DARK : WA_LIGHT;

// Spacing scale (multiples of 4) — optional helper for consistent gaps/padding.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Corner radii used across cards, inputs and chips.
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

// Type scale for consistent font sizing.
export const FONT = {
  h1: 24,
  h2: 20,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
};

// Maps legacy hard-coded hex values (lower-cased) onto canonical tokens.
// Used by the migration to translate old inline colors deterministically.
export const LEGACY_ALIAS = {
  '#007aff': C.accent,
  '#1565c0': C.accent,
  '#1a237e': C.navy,
  '#0d47a1': C.accentDark,
  '#2196f3': C.accent,
  '#f0f8ff': C.accentLight,
  '#e5f0ff': C.accentLight,
  '#e3f2fd': C.accentLight,
  '#4caf50': C.success,
  '#27b02e': C.success,
  '#28a745': C.success,
  '#2e7d32': C.success,
  '#e8f5e9': C.successLight,
  '#e6f7e9': C.successLight,
  '#e53935': C.danger,
  '#e53e3e': C.danger,
  '#f44336': C.danger,
  '#ffebee': C.dangerLight,
  '#fde8e8': C.dangerLight,
  '#ff9800': C.warning,
  '#ff5722': C.warning,
  '#9c27b0': C.accent,
  '#f5f5f5': C.bg,
  '#f8f9fa': C.bg,
  '#f0f4f8': C.bg,
  '#f7fafc': C.bgAlt,
  '#f0f0f0': C.divider,
  '#e0e0e0': C.border,
  '#ffffff': C.surface,
};

export default C;
