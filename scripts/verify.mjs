#!/usr/bin/env node
/**
 * `pnpm verify` — the quality gate.
 *
 * This is the command that decides whether a piece of work may be called "done". Both
 * humans and AI agents are required to run it and to report its real output; a claim of
 * completion without a green `verify` is not accepted (docs/constitution/AI_AGENT_RULES.md).
 *
 * Design notes:
 *   - Every stage runs even if an earlier one fails, so one run surfaces every problem
 *     instead of forcing a fix-one-rerun loop.
 *   - The exit code is non-zero if ANY stage failed. There is no "mostly passed".
 *   - The summary reports exactly what ran. Stages that were skipped are labelled
 *     SKIPPED, never silently folded into a pass.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Ordered cheapest-first: formatting failures are the most common and the fastest to
 * detect, so a developer sees them without waiting for a full build.
 */
const STAGES = [
  { name: 'format:check', args: ['run', 'format:check'], why: 'Formatting is consistent' },
  { name: 'lint', args: ['run', 'lint'], why: 'Lint and architectural boundary rules pass' },
  { name: 'typecheck', args: ['run', 'typecheck'], why: 'Every package type-checks under strict mode' },
  { name: 'test', args: ['run', 'test'], why: 'Unit tests pass' },
  { name: 'build', args: ['run', 'build'], why: 'Every app and package builds' },
];

// Integration and E2E are deliberately NOT part of `verify`: they need running
// infrastructure and browsers, so including them would make the gate fail for reasons
// unrelated to the change. They have their own commands and their own CI job.

const results = [];
let failed = false;

for (const stage of STAGES) {
  console.log(`\n[1m━━ ${stage.name} ━━[0m ${stage.why}\n`);

  const started = Date.now();
  const run = spawnSync('pnpm', stage.args, { cwd: REPO_ROOT, stdio: 'inherit', shell: false });
  const durationMs = Date.now() - started;

  const passed = run.status === 0;
  if (!passed) failed = true;

  results.push({ name: stage.name, passed, durationMs, status: run.status });
}

console.log(`\n[1m━━ verify summary ━━[0m\n`);
for (const r of results) {
  const label = r.passed ? '[32mPASS[0m' : '[31mFAIL[0m';
  console.log(`  ${label}  ${r.name.padEnd(14)} ${(r.durationMs / 1000).toFixed(1)}s`);
}

console.log(
  [
    '',
    '  NOT covered by `verify` (run separately, they need external services):',
    '    pnpm test:integration   requires `pnpm infra:up`',
    '    pnpm test:e2e           requires a built web app and Playwright browsers',
    '',
  ].join('\n'),
);

if (failed) {
  console.error('[31m✖ verify FAILED. The work is not complete.[0m\n');
  process.exit(1);
}

console.log('[32m✔ verify passed.[0m\n');
