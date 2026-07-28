/**
 * Collection War — typed configuration.
 *
 * Two rules govern this package:
 *
 *   1. FAIL FAST. Configuration is validated once, at process start, before the server
 *      accepts a single request. A process that starts with a missing DATABASE_URL and
 *      only discovers it on the first player request has already failed — noisily, in
 *      production, at the worst possible moment.
 *
 *   2. NO SILENT DEFAULTS FOR ANYTHING THAT MATTERS. A default port is convenient. A
 *      default JWT secret is a vulnerability, because it will ship. Secrets and
 *      connection strings have no defaults at all; the process refuses to start without
 *      them.
 *
 * See docs/security/SECRET_MANAGEMENT.md.
 */

export * from './schema';
export * from './load';
export * from './feature-flags';
