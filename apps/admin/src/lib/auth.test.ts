import { describe, expect, it } from 'vitest';
import { getAdminSession, requireAdmin } from './auth';

/**
 * These tests exist to assert an ABSENCE — that the admin application grants no access at
 * all while authentication is unimplemented.
 *
 * If someone adds a placeholder session to "make development easier", these tests fail.
 * That is the intent: a placeholder admin session is the single most dangerous shortcut
 * available in this codebase, because it works, gets forgotten, and ships.
 */

describe('admin authentication', () => {
  it('has no session, because authentication is not implemented', async () => {
    expect(await getAdminSession()).toBeNull();
  });
});

describe('requireAdmin', () => {
  it('denies every role', async () => {
    for (const role of ['SUPPORT', 'MODERATOR', 'ECONOMY', 'SUPER_ADMIN'] as const) {
      const access = await requireAdmin(role);

      expect(access.allowed, `${role} must not be granted access`).toBe(false);
    }
  });

  it('reports NOT_AUTHENTICATED rather than a vague failure', async () => {
    const access = await requireAdmin('SUPPORT');

    expect(access.allowed).toBe(false);
    if (!access.allowed) expect(access.reason).toBe('NOT_AUTHENTICATED');
  });

  it('fails closed — it never returns a session by default', async () => {
    const access = await requireAdmin('SUPER_ADMIN');

    expect('session' in access).toBe(false);
  });
});
