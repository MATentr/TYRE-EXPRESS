/**
 * Tyre Express Design Tokens
 */

export const colors = {
  surface: '#000000',
  surfaceSecondary: '#1C1C1E',
  surfaceTertiary: '#2C2C2E',
  onSurface: '#FFFFFF',
  onSurfaceSecondary: '#8E8E93',
  onSurfaceTertiary: '#FFFFFF',
  brand: '#FFFFFF',
  brandPrimary: '#FFFFFF',
  onBrand: '#000000',
  brandSecondary: '#F2F2F7',
  brandTertiary: '#1C1C1E',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
  onError: '#FFFFFF',
  border: '#2C2C2E',
  borderStrong: '#48484A',
  divider: '#1C1C1E',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
};

export const font = {
  size: { xs: 11, sm: 12, base: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32, hero: 44 },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};

export const ISSUE_TYPES = [
  { id: 'puncture', label: 'Puncture', icon: 'ellipse-outline' as const },
  { id: 'engine', label: 'Engine', icon: 'construct-outline' as const },
  { id: 'battery', label: 'Battery', icon: 'battery-dead-outline' as const },
  { id: 'fuel', label: 'Fuel', icon: 'water-outline' as const },
  { id: 'other', label: 'Other', icon: 'help-circle-outline' as const },
];
