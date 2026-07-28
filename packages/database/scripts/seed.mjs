#!/usr/bin/env node
/**
 * `pnpm db:seed`.
 *
 * There is nothing to seed yet, and that is the correct state.
 *
 * Seed data for Collection War means creature species, materials, quests and drop tables —
 * all of which are game content that has not been designed. Inventing placeholder content
 * now would be worse than having none: placeholder rows get referenced by test fixtures
 * and screenshots, become load-bearing, and then have to be untangled from the real
 * content later.
 *
 * The seeding MECHANISM is what this file reserves. It will be idempotent (safe to run
 * repeatedly), environment-aware (refusing to run against production), and versioned
 * alongside content — see docs/runbooks/DATABASE.md.
 */
const environment = process.env.COLLECTION_WAR_ENV ?? 'local';

if (environment === 'production') {
  console.error('\n✖ Refusing to seed a production environment.\n');
  process.exit(1);
}

console.log(
  [
    '',
    `db:seed — nothing to seed (environment: ${environment}).`,
    '',
    '  No game content exists yet. Creature, material and quest data are produced by the',
    '  content specification phase, not by the platform bootstrap.',
    '',
    '  See docs/tasks/BACKLOG.md → CW-0002.',
    '',
  ].join('\n'),
);
