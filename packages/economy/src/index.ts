/**
 * Collection War — economy foundation.
 *
 * Exact integer money arithmetic, the double-entry ledger contract, and the invariants
 * that make the economy auditable.
 *
 * This package contains NO game economy: no prices, no reward tables, no marketplace fees,
 * no currency conversion rates. Those are design decisions that belong to the
 * specification phase. What is here is the machinery that makes those decisions safe to
 * implement later — and, just as importantly, the rules that make certain implementations
 * impossible.
 *
 * See docs/constitution/ECONOMY_INTEGRITY_RULES.md and docs/domains/economy/README.md.
 */

export * from './money';
export * from './ledger';
export * from './invariants';
