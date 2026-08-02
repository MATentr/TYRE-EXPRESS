/**
 * Tyre Express Design Tokens
 */

export const colors = {
  surface: '#111315',
  surfaceSecondary: '#1C1F22',
  surfaceTertiary: '#272A2E',
  onSurface: '#F2F4F7',
  onSurfaceSecondary: '#A1A7AF',
  onSurfaceTertiary: '#FFFFFF',
  brand: '#FFD600',
  brandPrimary: '#FFD600',
  onBrand: '#111315',
  brandSecondary: '#E5C000',
  brandTertiary: '#332A00',
  success: '#00E676',
  warning: '#FFB700',
  error: '#FF3B30',
  onError: '#FFFFFF',
  border: '#272A2E',
  borderStrong: '#3A3F45',
  divider: '#1C1F22',
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
