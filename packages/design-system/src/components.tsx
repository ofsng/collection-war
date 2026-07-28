import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { colors, radii, spacing, statusColors, typography, type StatusTone } from './tokens';

/**
 * The minimum set of primitives needed by the technical shells.
 *
 * Styling uses inline style objects rather than a CSS-in-JS runtime. That is a deliberate
 * bootstrap choice: it adds zero dependencies, works identically in Next.js server
 * components and in tests, and defers the styling-strategy decision until there is a
 * visual design to serve. Recorded as an open decision, not as a permanent answer —
 * see docs/status/OPEN_DECISIONS.md.
 *
 * ACCESSIBILITY is not optional here. Every interactive primitive is a real semantic
 * element with a focus style; nothing is a clickable `<div>`.
 */

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  readonly direction?: 'row' | 'column';
  readonly gap?: keyof typeof spacing;
  readonly align?: 'start' | 'center' | 'end' | 'stretch';
  readonly justify?: 'start' | 'center' | 'end' | 'between';
  readonly wrap?: boolean;
  readonly children?: ReactNode;
}

export function Stack({
  direction = 'column',
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  style,
  children,
  ...rest
}: StackProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: spacing[gap],
        alignItems: align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align,
        justifyContent:
          justify === 'between'
            ? 'space-between'
            : justify === 'start'
              ? 'flex-start'
              : justify === 'end'
                ? 'flex-end'
                : justify,
        flexWrap: wrap ? 'wrap' : 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children?: ReactNode;
}

export function Card({ style, children, ...rest }: CardProps) {
  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: spacing.lg,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary';
  readonly children?: ReactNode;
}

export function Button({ variant = 'primary', style, disabled, children, ...rest }: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      // Explicit. A `<button>` inside a form defaults to `type="submit"`, which silently
      // submits the form — a bug that only appears once the button is reused in a form.
      type="button"
      disabled={disabled}
      style={{
        appearance: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: isPrimary ? colors.accent : 'transparent',
        color: isPrimary ? colors.textInverted : colors.textPrimary,
        border: `1px solid ${isPrimary ? colors.accent : colors.border}`,
        borderRadius: radii.md,
        padding: `${spacing.sm} ${spacing.md}`,
        fontFamily: typography.fontFamily,
        fontSize: typography.sizeSm,
        fontWeight: typography.weightMedium,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export interface StatusBadgeProps {
  readonly tone: StatusTone;
  readonly label: string;
}

/**
 * Colour is never the only signal.
 *
 * The badge always carries a text label, so it is readable by someone with a colour-vision
 * deficiency and by a screen reader. A green dot alone communicates nothing to either.
 */
export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        background: colors.surfaceRaised,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.pill,
        padding: `2px ${spacing.sm}`,
        fontSize: typography.sizeXs,
        color: colors.textPrimary,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: radii.pill,
          background: statusColors[tone],
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

export interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  readonly tone?: 'primary' | 'secondary';
  readonly size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  readonly children?: ReactNode;
}

export function Text({ tone = 'primary', size = 'md', style, children, ...rest }: TextProps) {
  const sizeMap = {
    xs: typography.sizeXs,
    sm: typography.sizeSm,
    md: typography.sizeMd,
    lg: typography.sizeLg,
    xl: typography.sizeXl,
  } as const;

  return (
    <p
      style={{
        margin: 0,
        color: tone === 'primary' ? colors.textPrimary : colors.textSecondary,
        fontFamily: typography.fontFamily,
        fontSize: sizeMap[size],
        lineHeight: typography.lineHeightNormal,
        ...style,
      }}
      {...rest}
    >
      {children}
    </p>
  );
}

/** Key/value row used by the health screens. `<dl>` semantics, so the pairing is real. */
export function DefinitionRow({ term, children }: { readonly term: string; readonly children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: spacing.md }}>
      <dt style={{ color: colors.textSecondary, fontSize: typography.sizeSm }}>{term}</dt>
      <dd style={{ margin: 0, color: colors.textPrimary, fontSize: typography.sizeSm }}>{children}</dd>
    </div>
  );
}
