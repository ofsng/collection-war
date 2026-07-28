#!/usr/bin/env node
/**
 * Gate for `pnpm test:integration`.
 *
 * Integration tests need a real PostgreSQL. If one is not reachable, this exits non-zero
 * with an explanation rather than letting a suite of connection failures masquerade as
 * test failures — those two look identical in CI output and waste a lot of time.
 *
 * It deliberately does NOT skip the tests and exit 0. A green run that silently tested
 * nothing is the outcome this project's completion standard forbids.
 */
import net from 'node:net';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    [
      '',
      '✖ Integration tests require DATABASE_URL.',
      '',
      '  Start local infrastructure first:',
      '    pnpm infra:up',
      '    cp .env.example .env   # if you have not already',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

const url = new URL(connectionString);
const host = url.hostname;
const port = Number(url.port || 5432);

const reachable = await new Promise((resolve) => {
  const socket = net.createConnection({ host, port });
  const settle = (value) => {
    socket.destroy();
    resolve(value);
  };

  socket.setTimeout(3_000);
  socket.once('connect', () => settle(true));
  socket.once('timeout', () => settle(false));
  socket.once('error', () => settle(false));
});

if (!reachable) {
  console.error(
    [
      '',
      `✖ No PostgreSQL listening on ${host}:${port}.`,
      '',
      '  Integration tests are NOT being skipped — they cannot run at all.',
      '',
      '    pnpm infra:up      # requires Docker; see docs/runbooks/LOCAL_DEVELOPMENT.md',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

console.log(`✔ PostgreSQL reachable at ${host}:${port}.`);
