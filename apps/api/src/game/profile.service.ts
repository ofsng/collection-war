import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { schema, type DatabaseHandle } from '@collection-war/database';
import { DomainErrors } from '@collection-war/domain';
import { ok, type Result, type SupportedLocale } from '@collection-war/shared-types';
import { TOKENS } from '../tokens';

export interface ProfileView {
  readonly playerId: string;
  readonly displayName: string;
  readonly locale: string;
  readonly accountLevel: number;
  readonly experience: number;
  readonly hasStarter: boolean;
}

/**
 * Player profile — the in-game persona.
 *
 * The locale lives here rather than on the device. That is what makes switching to English
 * on the web show English on the phone: an explicit choice must beat anything inferred, on
 * every client. See docs/architecture/GAME_CLIENT_SYNC.md.
 */
@Injectable()
export class ProfileService {
  constructor(@Inject(TOKENS.DATABASE) private readonly database: DatabaseHandle) {}

  async get(playerId: string): Promise<ProfileView | null> {
    const rows = await this.database.db
      .select()
      .from(schema.playerProfiles)
      .where(eq(schema.playerProfiles.id, playerId))
      .limit(1);

    const profile = rows[0];
    if (!profile) return null;

    return {
      playerId: profile.id,
      displayName: profile.displayName,
      locale: profile.locale,
      accountLevel: profile.accountLevel,
      experience: profile.experience,
      hasStarter: profile.starterGrantedAt !== null,
    };
  }

  async setLocale(playerId: string, locale: SupportedLocale): Promise<Result<ProfileView>> {
    const rows = await this.database.db
      .select({ locale: schema.playerProfiles.locale })
      .from(schema.playerProfiles)
      .where(eq(schema.playerProfiles.id, playerId))
      .limit(1);

    const current = rows[0];
    if (!current) return DomainErrors.notFound('Player profile', playerId);

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(schema.playerProfiles)
        .set({ locale, updatedAt: new Date() })
        .where(eq(schema.playerProfiles.id, playerId));

      await tx.insert(schema.outbox).values({
        id: randomUUID(),
        eventName: 'PlayerProfile.LocaleChanged',
        aggregateType: 'player',
        aggregateId: playerId,
        payload: { playerId, from: current.locale, to: locale },
        correlationId: randomUUID(),
      });
    });

    const updated = await this.get(playerId);
    return updated ? ok(updated) : DomainErrors.notFound('Player profile', playerId);
  }
}
