import type { PlayerId } from '@collection-war/shared-types';

/**
 * Administrator session resolution.
 *
 * THERE IS NO AUTHENTICATION YET, AND THIS FILE DOES NOT PRETEND OTHERWISE.
 *
 * `getAdminSession` always returns `null`. Every route guard therefore denies access, and
 * the application exposes no administrative capability at all. That is the correct state:
 * an admin console with a placeholder login that "works" is strictly more dangerous than
 * one with no login, because the placeholder gets forgotten and shipped.
 *
 * What this file DOES provide is the SHAPE of the eventual session and the guard call
 * sites, so that adding real authentication is a change in one place rather than a
 * retrofit across every page.
 *
 * The real implementation must satisfy docs/security/AUTHORIZATION_MODEL.md:
 *   - server-side session verification on every request, never a client-held claim;
 *   - role and permission checks per operation, not merely "is an admin";
 *   - re-authentication for high-risk actions (currency adjustment, account changes);
 *   - an audit record for every administrative action, with actor and justification.
 */

export type AdminRole = 'SUPPORT' | 'MODERATOR' | 'ECONOMY' | 'SUPER_ADMIN';

export interface AdminSession {
  readonly adminId: string;
  readonly roles: readonly AdminRole[];
  /** Set while an administrator is acting on a player's behalf in support tooling. */
  readonly impersonating: PlayerId | null;
}

/**
 * Resolves the current administrator session.
 *
 * Always `null` until authentication is implemented. It is `async` so that adding a real
 * server-side session lookup later does not change any caller's signature.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  return null;
}

/**
 * The single gate every protected page goes through.
 *
 * Deny-by-default: it returns access only for a session that exists AND holds the required
 * role. Since `getAdminSession` returns null, everything is currently denied — which is
 * exactly what should happen while there is no way to authenticate.
 */
export async function requireAdmin(
  requiredRole: AdminRole,
): Promise<
  | { readonly allowed: true; readonly session: AdminSession }
  | { readonly allowed: false; readonly reason: string }
> {
  const session = await getAdminSession();

  if (!session) {
    return { allowed: false, reason: 'NOT_AUTHENTICATED' };
  }

  if (!session.roles.includes(requiredRole) && !session.roles.includes('SUPER_ADMIN')) {
    return { allowed: false, reason: 'INSUFFICIENT_ROLE' };
  }

  return { allowed: true, session };
}
