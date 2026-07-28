import type { IsoTimestamp } from './time';
import type { CorrelationId, PlayerId, Uuid } from './ids';

/**
 * Audit metadata — see docs/domains/audit/README.md.
 *
 * Any operation that moves currency, changes ownership, grants a reward, or exercises an
 * administrative privilege must be reconstructable months later, by someone who was not
 * there. That requires knowing WHO did WHAT, WHEN, on WHOSE BEHALF, and WHY.
 */

/** Who initiated an action. Not every actor is a player. */
export type ActorType = 'PLAYER' | 'ADMIN' | 'SYSTEM' | 'JOB';

export interface Actor {
  readonly type: ActorType;
  /** Absent for SYSTEM and JOB actors. */
  readonly id?: Uuid;
  /**
   * Set when an administrator acts on a player's behalf (support tooling). Keeping the
   * two apart is what stops an admin action from being attributed to the player.
   */
  readonly onBehalfOf?: PlayerId;
}

export interface AuditMetadata {
  readonly actor: Actor;
  readonly occurredAt: IsoTimestamp;
  readonly correlationId: CorrelationId;
  /** Free-text justification. Required for administrative adjustments. */
  readonly reason?: string;
  /** Coarse client context. Never a raw IP in a long-lived record — see the data-retention rules. */
  readonly clientPlatform?: 'web' | 'ios' | 'android' | 'admin' | 'system';
  readonly clientVersion?: string;
}

/**
 * Optimistic concurrency token.
 *
 * Two concurrent requests must not both succeed at spending the same gold or selling the
 * same creature. Writes carry the version they read; the database rejects the write if
 * the row moved underneath, and the caller gets `STALE_WRITE` rather than a lost update.
 */
export type EntityVersion = number;

export interface Versioned {
  readonly version: EntityVersion;
}

/**
 * Soft deletion. Player-owned records are never hard-deleted by ordinary application
 * paths — an accidental delete must be recoverable and a dispute must be investigable.
 * Genuine erasure (a data-protection request) is a separate, audited, deliberate process.
 */
export interface SoftDeletable {
  readonly deletedAt: IsoTimestamp | null;
}

export interface Timestamped {
  readonly createdAt: IsoTimestamp;
  readonly updatedAt: IsoTimestamp;
}
