/**
 * Collection War — domain layer.
 *
 * The innermost layer of the architecture. It knows nothing about HTTP, SQL, React,
 * NestJS or Redis; those all depend on it, and it depends on none of them. That direction
 * is enforced by `eslint.config.mjs` and documented in
 * docs/architecture/DEPENDENCY_RULES.md.
 *
 * WHAT IS HERE AT BOOTSTRAP: the structural contracts every future domain will implement
 * — repository and unit-of-work interfaces, domain-event shapes, the outbox contract,
 * deterministic clock and randomness implementations, and error construction.
 *
 * WHAT IS DELIBERATELY NOT HERE: creatures, battles, marketplace rules, progression, drop
 * tables, or any other game logic. Those are designed in the next phase
 * (docs/tasks/BACKLOG.md), not improvised now. Writing them before the domain
 * specifications are approved is exactly the failure mode this bootstrap exists to prevent.
 */

export * from './clock';
export * from './random';
export * from './game';
export * from './errors';
export * from './events';
export * from './outbox';
export * from './repository';
export * from './unit-of-work';
