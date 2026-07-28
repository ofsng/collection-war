/**
 * Reads the repository-root `.env` for tools whose working directory is an app folder.
 *
 * Next.js loads `.env` relative to the app being built (`apps/web`), but this monorepo
 * keeps ONE `.env` at the root so that the API, the workers and both web applications
 * cannot drift out of sync with each other. Without this helper, `apps/web` would need its
 * own copy of every variable — and a stale copy of `NEXT_PUBLIC_API_URL` pointing at the
 * wrong API is a confusing failure to debug.
 *
 * Deliberately minimal: it does not expand `${VAR}` references, does not execute anything,
 * and never overwrites a variable that is already set — a value exported in the shell or
 * injected by CI must always win over a file on disk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadRootEnv() {
  const envPath = join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return {};

  const parsed = {};

  for (const rawLine of readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    // Strip one layer of surrounding quotes; leave everything else verbatim.
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');

    parsed[key] = value;

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return parsed;
}

/**
 * The public variables a Next.js application needs at build time.
 *
 * An explicit allow-list, not a spread of everything in `.env`. `NEXT_PUBLIC_*` values are
 * inlined into the client bundle, so a wildcard here would eventually inline a secret the
 * moment someone adds one with an unlucky name.
 */
export function publicNextEnv() {
  loadRootEnv();

  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
    NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'tr-TR',
  };
}
