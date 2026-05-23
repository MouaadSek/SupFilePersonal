// SUPFILE App Colors
export const Colors = {
  light: {
    primary: '#30a8fe',
    primaryDark: '#0088e0',
    primaryLight: '#e6f4ff',
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceSecondary: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    white: '#ffffff',
  },
  dark: {
    primary: '#38bdf8',
    primaryDark: '#0ea5e9',
    primaryLight: 'rgba(56, 189, 248, 0.12)',
    background: '#0b1220',
    surface: '#151f32',
    surfaceSecondary: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    border: '#2d3b52',
    borderLight: '#1a2436',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    white: '#ffffff',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  display: 32,
};

export const Typography = {
  sizes: FontSize,
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};
