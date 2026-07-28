/**
 * The element system.
 *
 * Deliberately NOT a simple circular advantage table. The brief requires interactions that
 * affect more than damage — status chance, healing, energy, priority — so the matrix is data,
 * versioned, and consulted through functions rather than inlined at call sites.
 *
 * Multipliers are basis points: 10000 = ×1 (neutral), 15000 = ×1.5, 7500 = ×0.75.
 */

export const ELEMENTS = ['FIRE', 'WATER', 'EARTH', 'AIR', 'ELECTRIC', 'NATURE', 'LIGHT', 'SHADOW'] as const;

export type Element = (typeof ELEMENTS)[number];

export function isElement(value: unknown): value is Element {
  return typeof value === 'string' && (ELEMENTS as readonly string[]).includes(value);
}

const NEUTRAL = 10_000;
const STRONG = 15_000;
const WEAK = 7_500;

/**
 * Attacker → defender damage multipliers, in basis points.
 *
 * Only non-neutral relationships are listed; anything absent is ×1. Storing the exceptions
 * rather than a full 8×8 grid keeps the intent readable — you can see the design in it.
 *
 * The design, in words:
 *   Fire  > Nature, Air        Fire  < Water, Earth
 *   Water > Fire, Earth        Water < Electric, Nature
 *   Earth > Electric, Fire     Earth < Water, Nature, Air
 *   Air   > Earth, Nature      Air   < Electric, Fire
 *   Elec  > Water, Air         Elec  < Earth
 *   Nature> Water, Earth       Nature< Fire, Air
 *   Light <-> Shadow are mutually strong: the pair is a high-risk mirror rather than a
 *   rock-paper-scissors leg, so neither is a safe default pick.
 */
const DAMAGE_MATRIX: Partial<Record<Element, Partial<Record<Element, number>>>> = {
  FIRE: { NATURE: STRONG, AIR: STRONG, WATER: WEAK, EARTH: WEAK },
  WATER: { FIRE: STRONG, EARTH: STRONG, ELECTRIC: WEAK, NATURE: WEAK },
  EARTH: { ELECTRIC: STRONG, FIRE: STRONG, WATER: WEAK, NATURE: WEAK, AIR: WEAK },
  AIR: { EARTH: STRONG, NATURE: STRONG, ELECTRIC: WEAK, FIRE: WEAK },
  ELECTRIC: { WATER: STRONG, AIR: STRONG, EARTH: WEAK },
  NATURE: { WATER: STRONG, EARTH: STRONG, FIRE: WEAK, AIR: WEAK },
  LIGHT: { SHADOW: STRONG },
  SHADOW: { LIGHT: STRONG },
};

/** Damage multiplier in basis points. `10000` when the pairing is neutral. */
export function elementDamageMultiplier(attacker: Element, defender: Element): number {
  return DAMAGE_MATRIX[attacker]?.[defender] ?? NEUTRAL;
}

/**
 * Status-application multiplier, in basis points.
 *
 * Separate from damage on purpose — the brief requires element interactions that affect
 * status chance independently. Electric applies far more reliably to a Wet target; Light
 * resists Shadow's afflictions without being harder to damage.
 */
const STATUS_MATRIX: Partial<Record<Element, Partial<Record<Element, number>>>> = {
  ELECTRIC: { WATER: 15_000 },
  FIRE: { NATURE: 13_000 },
  NATURE: { WATER: 12_000 },
  LIGHT: { SHADOW: 5_000 },
  SHADOW: { LIGHT: 5_000 },
};

export function elementStatusMultiplier(attacker: Element, defender: Element): number {
  return STATUS_MATRIX[attacker]?.[defender] ?? NEUTRAL;
}

/**
 * How an element affects incoming healing, in basis points.
 *
 * Fire suppresses regeneration — which is what gives Rootwood's regeneration identity a
 * natural counter without needing a dedicated "anti-heal" mechanic.
 */
export function elementHealingMultiplier(healerElement: Element, targetElement: Element): number {
  if (healerElement === 'WATER') return 12_000;
  if (targetElement === 'FIRE' && healerElement === 'NATURE') return 8_000;
  return NEUTRAL;
}

/**
 * Human-readable classification, for the battle log and for tests.
 *
 * The log says "super effective" rather than "×1.5", because a player should be told what
 * happened in game terms — and because the exact numbers are balance data.
 */
export type Effectiveness = 'super' | 'neutral' | 'resisted';

export function classifyEffectiveness(multiplierBp: number): Effectiveness {
  if (multiplierBp > NEUTRAL) return 'super';
  if (multiplierBp < NEUTRAL) return 'resisted';
  return 'neutral';
}
