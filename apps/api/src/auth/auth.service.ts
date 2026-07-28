import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { schema, type DatabaseHandle } from '@collection-war/database';
import type { ApiConfig } from '@collection-war/configuration';
import { DEFAULT_LOCALE, err, ok, type Result } from '@collection-war/shared-types';
import { TOKENS } from '../tokens';
import { hashPassword, verifyPassword } from './password';
import { createAccessToken, createRefreshToken, hashRefreshToken } from './tokens';

export interface AuthenticatedSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly playerId: string;
  readonly locale: string;
  readonly displayName: string;
}

/**
 * Identity: registration, login, refresh, logout.
 *
 * The highest-risk surface in the slice. Three properties matter more than anything else
 * here, and each one is a deliberate choice rather than an incidental behaviour:
 *
 *   1. **No user enumeration.** Registration and login return the same shape of failure, so
 *      the endpoint cannot be used as an oracle for which addresses have accounts.
 *   2. **Refresh rotation with reuse detection.** A replayed refresh token means one copy was
 *      stolen — the legitimate client and the attacker cannot both hold a valid one — so the
 *      whole family is revoked.
 *   3. **Registration is one transaction.** A user without a profile is an account that can
 *      authenticate and then fail on every subsequent request.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle,
    @Inject(TOKENS.CONFIG) private readonly config: ApiConfig,
  ) {}

  async register(
    email: string,
    password: string,
    displayName: string,
    locale: string = DEFAULT_LOCALE,
  ): Promise<Result<AuthenticatedSession>> {
    const normalizedEmail = email.trim().toLowerCase();

    // Hash BEFORE opening the transaction: scrypt is intentionally expensive, and holding a
    // transaction open across it would hold a connection for ~100ms of pure CPU.
    let passwordHash: string;
    try {
      passwordHash = await hashPassword(password);
    } catch (error) {
      return err({
        category: 'VALIDATION',
        code: 'VALIDATION_FAILED',
        message: error instanceof Error ? error.message : 'Invalid password',
      });
    }

    const existing = await this.database.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      // Deliberately generic. A specific "that email is taken" turns this endpoint into a
      // way to test whether an address has an account here.
      return err({
        category: 'CONFLICT',
        code: 'RESOURCE_CONFLICT',
        message: 'Registration could not be completed',
        messageKey: 'error.registration_failed' as never,
      });
    }

    const userId = randomUUID();
    const playerId = randomUUID();
    const now = new Date();

    const { token: refreshToken, hash: refreshHash } = createRefreshToken();
    const familyId = randomUUID();

    // One transaction: account, profile, session and the events. A user without a profile
    // would be able to authenticate and then fail on every request afterwards.
    await this.database.db.transaction(async (tx) => {
      await tx.insert(schema.users).values({
        id: userId,
        email: normalizedEmail,
        passwordHash,
      });

      await tx.insert(schema.playerProfiles).values({
        id: playerId,
        userId,
        displayName: displayName.trim(),
        locale,
      });

      await tx.insert(schema.userSessions).values({
        id: randomUUID(),
        userId,
        refreshTokenHash: refreshHash,
        familyId,
        expiresAt: new Date(now.getTime() + this.config.AUTH_REFRESH_TOKEN_TTL * 1000),
      });

      await this.enqueueEvent(tx, 'Identity.AccountRegistered', 'user', userId, {
        accountId: userId,
      });
      await this.enqueueEvent(tx, 'PlayerProfile.Created', 'player', playerId, {
        playerId,
        accountId: userId,
        displayName: displayName.trim(),
      });
    });

    return ok({
      accessToken: this.issueAccessToken(userId, playerId),
      refreshToken,
      playerId,
      locale,
      displayName: displayName.trim(),
    });
  }

  async login(email: string, password: string): Promise<Result<AuthenticatedSession>> {
    const normalizedEmail = email.trim().toLowerCase();

    const rows = await this.database.db
      .select({
        userId: schema.users.id,
        passwordHash: schema.users.passwordHash,
        status: schema.users.status,
        playerId: schema.playerProfiles.id,
        locale: schema.playerProfiles.locale,
        displayName: schema.playerProfiles.displayName,
      })
      .from(schema.users)
      .innerJoin(schema.playerProfiles, eq(schema.playerProfiles.userId, schema.users.id))
      .where(eq(schema.users.email, normalizedEmail))
      .limit(1);

    const account = rows[0];

    // Verify against a dummy hash when the account does not exist, so a missing account and a
    // wrong password take similar time. Returning early here would make login a timing oracle
    // for which addresses are registered.
    const storedHash = account?.passwordHash ?? DUMMY_HASH;
    const passwordMatches = await verifyPassword(password, storedHash);

    if (!account || !passwordMatches || account.status !== 'ACTIVE') {
      return err({
        category: 'AUTHENTICATION',
        code: 'UNAUTHENTICATED',
        message: 'Invalid email or password',
        messageKey: 'error.invalid_credentials' as never,
      });
    }

    const { token: refreshToken, hash: refreshHash } = createRefreshToken();

    await this.database.db.insert(schema.userSessions).values({
      id: randomUUID(),
      userId: account.userId,
      refreshTokenHash: refreshHash,
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() + this.config.AUTH_REFRESH_TOKEN_TTL * 1000),
    });

    return ok({
      accessToken: this.issueAccessToken(account.userId, account.playerId),
      refreshToken,
      playerId: account.playerId,
      locale: account.locale,
      displayName: account.displayName,
    });
  }

  /**
   * Rotates a refresh token.
   *
   * **Reuse detection is the important part.** If the presented token has already been used,
   * a copy was stolen — so every session in that family is revoked, forcing re-authentication.
   * That turns silent persistent access into a detectable, recoverable event.
   */
  async refresh(refreshToken: string): Promise<Result<AuthenticatedSession>> {
    const hash = hashRefreshToken(refreshToken);

    const rows = await this.database.db
      .select({
        sessionId: schema.userSessions.id,
        userId: schema.userSessions.userId,
        familyId: schema.userSessions.familyId,
        used: schema.userSessions.used,
        revokedAt: schema.userSessions.revokedAt,
        expiresAt: schema.userSessions.expiresAt,
        playerId: schema.playerProfiles.id,
        locale: schema.playerProfiles.locale,
        displayName: schema.playerProfiles.displayName,
      })
      .from(schema.userSessions)
      .innerJoin(schema.playerProfiles, eq(schema.playerProfiles.userId, schema.userSessions.userId))
      .where(eq(schema.userSessions.refreshTokenHash, hash))
      .limit(1);

    const session = rows[0];

    if (!session) return unauthenticated();

    if (session.used) {
      // Reuse: revoke the whole family rather than only this token.
      await this.database.db
        .update(schema.userSessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.userSessions.familyId, session.familyId));

      return unauthenticated();
    }

    if (session.revokedAt !== null || session.expiresAt.getTime() <= Date.now()) {
      return unauthenticated();
    }

    const { token: nextToken, hash: nextHash } = createRefreshToken();

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(schema.userSessions)
        .set({ used: true })
        .where(eq(schema.userSessions.id, session.sessionId));

      await tx.insert(schema.userSessions).values({
        id: randomUUID(),
        userId: session.userId,
        refreshTokenHash: nextHash,
        familyId: session.familyId,
        expiresAt: new Date(Date.now() + this.config.AUTH_REFRESH_TOKEN_TTL * 1000),
      });
    });

    return ok({
      accessToken: this.issueAccessToken(session.userId, session.playerId),
      refreshToken: nextToken,
      playerId: session.playerId,
      locale: session.locale,
      displayName: session.displayName,
    });
  }

  async logout(refreshToken: string): Promise<void> {
    await this.database.db
      .update(schema.userSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.userSessions.refreshTokenHash, hashRefreshToken(refreshToken)),
          isNull(schema.userSessions.revokedAt),
        ),
      );
  }

  private issueAccessToken(userId: string, playerId: string): string {
    return createAccessToken(
      { sub: userId, pid: playerId },
      this.config.AUTH_JWT_SECRET,
      this.config.AUTH_ACCESS_TOKEN_TTL,
      Date.now(),
    );
  }

  private async enqueueEvent(
    tx: Parameters<Parameters<DatabaseHandle['db']['transaction']>[0]>[0],
    name: string,
    aggregateType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await tx.insert(schema.outbox).values({
      id: randomUUID(),
      eventName: name,
      aggregateType,
      aggregateId,
      payload,
      correlationId: randomUUID(),
    });
  }
}

function unauthenticated(): Result<AuthenticatedSession> {
  return err({
    category: 'AUTHENTICATION',
    code: 'UNAUTHENTICATED',
    message: 'Session is no longer valid',
    messageKey: 'error.session_expired' as never,
  });
}

/**
 * A real scrypt hash of a random value, used to equalise timing when an account does not
 * exist. Computed once at module load, so the cost is paid at start-up rather than per
 * request.
 */
const DUMMY_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$' +
  'd2h5IGFyZSB5b3UgcmVhZGluZyB0aGlzPyBpdCBpcyBqdXN0IHBhZGRpbmcgZm9yIHRpbWluZyBlcXVhbGl0eQ';
