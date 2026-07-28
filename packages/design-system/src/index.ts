/**
 * Collection War — design system.
 *
 * Design tokens and React DOM primitives shared by the WEB and ADMIN applications.
 *
 * SCOPE NOTE — the mobile application does not consume this package. React Native renders
 * to native views, not to DOM elements, so a `<button>` primitive is meaningless there.
 * Mobile currently carries its own theme constants that mirror the tokens below.
 * Unifying the token layer across DOM and native is real, worthwhile work that has been
 * deliberately deferred rather than half-done — see docs/status/DEFERRED_WORK.md.
 *
 * The primitives here are the minimum needed to build the health-check shells. They are
 * not a component library, and no game UI component should be added until the visual
 * design exists.
 */

export * from './tokens';
export * from './components';
