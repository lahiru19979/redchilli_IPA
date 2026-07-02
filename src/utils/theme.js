// ─────────────────────────────────────────────────────────────────────────────
// App-wide design tokens. Every screen should import `C` from here instead of
// hardcoding hex values, so the whole app shares one consistent look.
//
//   import { C } from '../utils/theme';
//
// The palette is the Material-Blue scheme (#1565C0). The `alias` values below
// map the many legacy hex colors that used to be scattered across screens onto
// these canonical tokens, so older code can be migrated mechanically.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  // Brand
  navy: '#1A237E',
  accent: '#1565C0',
  accentDark: '#0D47A1',
  accentLight: '#E3F2FD',

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
