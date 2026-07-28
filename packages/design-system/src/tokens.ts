/**
 * Design tokens.
 *
 * Plain data with no React dependency, so they are usable from CSS-in-JS, from a stylesheet
 * generator, and (once the native token layer exists) from React Native.
 *
 * Semantic names, not literal ones: `danger` rather than `red`. A literal name has to be
 * renamed when the palette changes, and it tells a developer nothing about when to use it.
 */

export const colors = {
  background: '#0f1216',
  surface: '#171b21',
  surfaceRaised: '#1f242c',
  border: '#2b323c',

  textPrimary: '#e8ecf1',
  textSecondary: '#9aa5b1',
  textInverted: '#0f1216',

  accent: '#4c8dff',
  accentHover: '#6ba0ff',

  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  neutral: '#6e7781',
} as const;

/**
 * A 4px scale. A fixed scale rather than arbitrary pixel values is what keeps spacing
 * consistent across screens built by different people at different times.
 */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
} as const;

export const typography = {
  fontFamily:
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
  fontFamilyMono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
  sizeXs: '12px',
  sizeSm: '14px',
  sizeMd: '16px',
  sizeLg: '20px',
  sizeXl: '28px',
  weightRegular: 400,
  weightMedium: 500,
  weightBold: 700,
  lineHeightTight: 1.25,
  lineHeightNormal: 1.5,
} as const;

export const radii = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  pill: '999px',
} as const;

export const breakpoints = {
  /** Phone-first: the smallest layout is the default, and these widen it. */
  tablet: '640px',
  desktop: '1024px',
  wide: '1440px',
} as const;

/** Status colour mapping, so "healthy" looks the same on every screen. */
export const statusColors = {
  up: colors.success,
  down: colors.danger,
  unknown: colors.neutral,
  pending: colors.warning,
} as const;

export type StatusTone = keyof typeof statusColors;
