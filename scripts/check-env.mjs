#!/usr/bin/env node
/**
 * `pnpm check:env` — validates the developer's local environment before they lose time
 * to a confusing failure deep inside a build.
 *
 * Checks, in order of how often each one is the real problem:
 *   1. Node version satisfies the repository floor.
 *   2. `.env` exists and every key present in `.env.example` is also present in it.
 *   3. No placeholder secret survived into a non-local environment.
 *   4. Docker is available (reported, not required — see docs/status/BOOTSTRAP_ENVIRONMENT.md).
 *
 * It never prints a value from `.env`. Printing "your AUTH_JWT_SECRET is ..." into a
 * terminal that may be recorded or shared is exactly the leak this project forbids.
 */
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_NODE_MINOR_IF_20 = 19;

const problems = [];
const warnings = [];

// ---------------------------------------------------------------- 1. Node version
const [major, minor] = process.versions.node.split('.').map(Number);
const nodeOk =
  major > REQUIRED_NODE_MAJOR || (major === REQUIRED_NODE_MAJOR && minor >= REQUIRED_NODE_MINOR_IF_20);

if (!nodeOk) {
  problems.push(
    `Node ${process.versions.node} is too old. This repository requires >= 20.19.\n` +
      `    The pinned version is in .nvmrc. Run:  nvm use`,
  );
}

// ------------------------------------------------------------------- 2. .env keys
/** Minimal dotenv key extraction. Deliberately does not evaluate or expand values. */
function readEnvKeys(path) {
  return new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#') && line.includes('='))
      .map((line) => line.slice(0, line.indexOf('=')).trim()),
  );
}

const examplePath = join(REPO_ROOT, '.env.example');
const envPath = join(REPO_ROOT, '.env');

if (!existsSync(envPath)) {
  problems.push('No .env file found. Create one with:  cp .env.example .env');
} else {
  const exampleKeys = readEnvKeys(examplePath);
  const envKeys = readEnvKeys(envPath);

  const missing = [...exampleKeys].filter((key) => !envKeys.has(key));
  if (missing.length > 0) {
    problems.push(
      `.env is missing ${missing.length} key(s) that .env.example declares:\n` +
        missing.map((k) => `      - ${k}`).join('\n'),
    );
  }

  // Extra keys are a warning, not an error: a developer may legitimately set something
  // the example does not describe. But an undocumented key is a documentation gap.
  const extra = [...envKeys].filter((key) => !exampleKeys.has(key));
  if (extra.length > 0) {
    warnings.push(`.env defines ${extra.length} key(s) absent from .env.example: ${extra.join(', ')}`);
  }

  // 3. Placeholder detection — only meaningful outside local development.
  const declaredEnv = readFileSync(envPath, 'utf8')
    .match(/^COLLECTION_WAR_ENV=(.*)$/m)?.[1]
    ?.trim();
  if (
    declaredEnv &&
    declaredEnv !== 'local' &&
    /AUTH_JWT_SECRET=replace-me/.test(readFileSync(envPath, 'utf8'))
  ) {
    problems.push(
      `COLLECTION_WAR_ENV is "${declaredEnv}" but AUTH_JWT_SECRET is still the example placeholder.\n` +
        `    Generate a real secret:  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
    );
  }
}

// ----------------------------------------------------------------- 4. Docker (info)
const dockerProbe = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore', shell: false });
const dockerAvailable = !dockerProbe.error && dockerProbe.status === 0;

if (!dockerAvailable) {
  warnings.push(
    'Docker with the Compose plugin was not found.\n' +
      '      Local PostgreSQL, Redis, MinIO and Mailpit cannot be started, so `pnpm infra:up`,\n' +
      '      `pnpm db:migrate` and `pnpm test:integration` will not work.\n' +
      '      Install: https://docs.docker.com/engine/install/',
  );
}

// ------------------------------------------------------------------------ report
console.log('\nCollection War — environment check\n');
console.log(`  Node            ${process.versions.node} ${nodeOk ? '✔' : '✖'}`);
console.log(`  .env            ${existsSync(envPath) ? 'present' : 'MISSING'}`);
console.log(`  Docker Compose  ${dockerAvailable ? 'available ✔' : 'not available'}`);

for (const warning of warnings) console.log(`\n  [33m! ${warning}[0m`);
for (const problem of problems) console.log(`\n  [31m✖ ${problem}[0m`);

if (problems.length > 0) {
  console.error(`\n${problems.length} problem(s) must be fixed before the stack will run.\n`);
  process.exit(1);
}

console.log('\n✔ Environment looks usable.\n');
