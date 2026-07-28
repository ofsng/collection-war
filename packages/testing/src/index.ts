/**
 * Collection War — shared test utilities.
 *
 * TEST-ONLY. Nothing in production code may import this package; the lint boundary rules
 * treat it as a shared leaf, and a production import of a fake repository would be an
 * obvious review failure.
 *
 * The helpers here exist to make the RIGHT test easy to write. A fake that silently
 * accepts anything produces tests that pass while the system is broken, so the fakes below
 * enforce the same invariants the real implementations do — an in-memory idempotency store
 * that allows a duplicate key would defeat the purpose of testing against it.
 */

export * from './fakes';
export * from './assertions';
export * from './ids';
