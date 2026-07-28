import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit configuration — used by `pnpm db:generate` to emit SQL migrations from the
 * TypeScript schema.
 *
 * Migrations are GENERATED, REVIEWED, and COMMITTED. They are never applied straight from
 * the schema by a running application. `drizzle-kit push` is deliberately not wired to any
 * script: it diffs a live database against the schema and applies the difference without a
 * migration file, which means the change is neither reviewable nor reproducible on another
 * environment. See docs/runbooks/MIGRATIONS.md.
 */
export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://collection_war:collection_war_local_dev@localhost:5432/collection_war',
  },
  // Fail loudly on an ambiguous rename rather than guessing, since guessing wrong on a
  // column rename silently drops a column of production data.
  strict: true,
  verbose: true,
});
