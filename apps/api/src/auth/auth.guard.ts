import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ApiConfig } from '@collection-war/configuration';
import { TOKENS } from '../tokens';
import { verifyAccessToken } from './tokens';

/**
 * The authenticated actor, attached to the request by the guard.
 *
 * Every handler reads the player id from HERE, never from the request body or a query
 * parameter. A client-supplied player id would let any player act as any other — the most
 * basic authorization failure there is.
 */
export interface RequestActor {
  readonly userId: string;
  readonly playerId: string;
}

export const ACTOR_KEY = 'collectionWarActor';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(TOKENS.CONFIG) private readonly config: ApiConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      [ACTOR_KEY]?: RequestActor;
    }>();

    const header = request.headers.authorization;
    const raw = Array.isArray(header) ? header[0] : header;

    if (!raw?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required');
    }

    const payload = verifyAccessToken(raw.slice('Bearer '.length), this.config.AUTH_JWT_SECRET, Date.now());

    // One message for every failure — expired, forged, malformed. The difference is not
    // information an unauthenticated caller needs, and telling them narrows a guess.
    if (!payload) {
      throw new UnauthorizedException('Authentication required');
    }

    request[ACTOR_KEY] = { userId: payload.sub, playerId: payload.pid };
    return true;
  }
}

/** Reads the actor the guard attached. Throws if used on an unguarded route. */
export function actorOf(request: unknown): RequestActor {
  const actor = (request as Record<string, RequestActor | undefined>)[ACTOR_KEY];

  if (!actor) {
    // A programming error, not a client error: the route is missing its guard, which would
    // otherwise mean an unauthenticated request reaching business logic.
    throw new Error('No authenticated actor on the request. Is AuthGuard applied to this route?');
  }

  return actor;
}
