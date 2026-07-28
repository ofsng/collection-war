#!/usr/bin/env node
/**
 * Local infrastructure control — `pnpm infra:up|down|logs|reset|status`.
 *
 * Wraps `docker compose` so that:
 *   - A missing Docker installation produces an actionable message instead of a raw
 *     "command not found" in whatever language the host shell speaks. (The machine this
 *     was bootstrapped on has a Turkish locale and no Docker at all.)
 *   - `reset` — the only destructive action here — refuses to run without confirmation.
 *   - Behaviour is identical on Linux, macOS and Windows.
 *
 * This script NEVER touches anything outside the project's own compose project.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const COMPOSE_PROJECT = 'collection-war';
const SERVICES = ['postgres', 'redis', 'minio', 'mailpit'];

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Detects Docker by exit code, never by parsing localized output. */
function requireDocker() {
  const probe = spawnSync('docker', ['compose', 'version'], { stdio: 'ignore', shell: false });

  if (probe.error || probe.status !== 0) {
    fail(
      [
        'Docker (with the Compose plugin) is required for local infrastructure and was not found.',
        '',
        'Collection War needs PostgreSQL, Redis, MinIO and Mailpit running locally. They are',
        'fully described in docker-compose.yml but cannot be started without a container runtime.',
        '',
        'Install Docker Engine + Compose on Debian/Ubuntu/Mint:',
        '  https://docs.docker.com/engine/install/',
        'Then allow your user to run it without sudo:',
        '  sudo usermod -aG docker $USER   # log out and back in afterwards',
        '',
        'Verify with:',
        '  docker compose version',
        '',
        'Runbook: docs/runbooks/LOCAL_DEVELOPMENT.md',
      ].join('\n'),
    );
  }
}

function compose(args, options = {}) {
  const result = spawnSync('docker', ['compose', '-p', COMPOSE_PROJECT, ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

const command = process.argv[2];

switch (command) {
  case 'up': {
    requireDocker();
    console.log('Starting Collection War local infrastructure...\n');
    // --wait blocks until every healthcheck passes, so a green exit here genuinely means
    // the services are ready — not merely that the containers were created.
    compose(['up', '-d', '--wait', '--remove-orphans']);
    console.log(
      [
        '',
        '✔ Local infrastructure is up and healthy.',
        '',
        '  PostgreSQL   localhost:5432   (collection_war / collection_war_local_dev)',
        '  Redis        localhost:6379',
        '  MinIO S3     localhost:9000   console: http://localhost:9001',
        '  Mailpit UI   http://localhost:8025',
        '',
        '  Next:  pnpm db:migrate',
      ].join('\n'),
    );
    break;
  }

  case 'down': {
    requireDocker();
    // Volumes are intentionally preserved. Use `infra:reset` to discard data.
    compose(['down', '--remove-orphans']);
    console.log('\n✔ Stopped. Data volumes preserved — use `pnpm infra:reset` to erase them.');
    break;
  }

  case 'logs': {
    requireDocker();
    const service = process.argv[3];
    compose(['logs', '-f', '--tail', '200', ...(service ? [service] : SERVICES)]);
    break;
  }

  case 'status': {
    requireDocker();
    compose(['ps']);
    break;
  }

  case 'reset': {
    requireDocker();
    // Destructive: drops every local volume, including the development database.
    if (!process.argv.includes('--yes')) {
      fail(
        [
          '`infra:reset` permanently deletes the local PostgreSQL, Redis and MinIO volumes.',
          'Every local player, migration state and uploaded file will be gone.',
          '',
          'Back up first if you need the data:  docs/runbooks/BACKUPS.md',
          '',
          'Re-run with explicit confirmation:',
          '  pnpm infra:reset -- --yes',
        ].join('\n'),
      );
    }
    compose(['down', '--volumes', '--remove-orphans']);
    console.log('\n✔ Local infrastructure and all its volumes removed. Run `pnpm infra:up` to rebuild.');
    break;
  }

  default:
    fail(`Unknown command "${command ?? ''}". Expected one of: up, down, logs, status, reset.`);
}
