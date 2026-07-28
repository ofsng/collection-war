#!/usr/bin/env node
/**
 * Cross-platform `clean`.
 *
 * Every package uses this instead of `rm -rf dist`. Shipping a shell command in a
 * package.json script means the repository only works on POSIX shells, and it means a
 * typo in a variable can expand into a deletion outside the package. This script removes
 * a fixed allow-list of build artefacts relative to the calling package, and nothing else.
 */
import { rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const TARGETS = ['dist', 'build', '.next', '.expo', '.turbo', 'coverage', 'tsconfig.tsbuildinfo'];

const cwd = process.cwd();
const removed = [];

for (const target of TARGETS) {
  const path = join(cwd, target);

  // Refuse to touch anything that resolved outside the package directory.
  if (!resolve(path).startsWith(resolve(cwd))) {
    console.error(`clean: refusing to remove path outside package: ${path}`);
    process.exit(1);
  }

  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
    removed.push(target);
  }
}

console.log(removed.length > 0 ? `clean: removed ${removed.join(', ')}` : 'clean: nothing to remove');
