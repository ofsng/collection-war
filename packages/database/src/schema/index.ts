/**
 * Database schema.
 *
 * PLATFORM tables (`outbox`, `idempotency_keys`) are infrastructure shared by every module.
 * GAME tables are owned by exactly one module each — see
 * docs/architecture/GAME_STATE_OWNERSHIP.md. Nothing reads another module's tables directly.
 */

// Platform
export * from './outbox';
export * from './idempotency';

// Game
export * from './identity';
export * from './player';
export * from './catalog';
export * from './creatures';
export * from './gameplay';
