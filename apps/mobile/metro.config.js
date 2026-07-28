const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro configuration for a pnpm monorepo.
 *
 * Metro does not understand workspaces out of the box, and the two settings below are the
 * difference between a bundle that builds and one that fails with "unable to resolve
 * module @collection-war/...":
 *
 *   `watchFolders` — the shared packages live outside `apps/mobile`, so Metro must be told
 *   to watch and resolve them. Without this it never sees them change.
 *
 *   `nodeModulesPaths` — pnpm's isolated layout means a dependency may live in the app's
 *   own `node_modules` OR in the workspace root's. Metro checks only the first by default.
 *
 * `disableHierarchicalLookup` is deliberately NOT set: pnpm's symlinked layout relies on
 * hierarchical resolution to reach the store.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
