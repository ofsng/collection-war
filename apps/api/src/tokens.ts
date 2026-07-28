/**
 * Dependency-injection tokens.
 *
 * String tokens rather than class tokens, because the things being injected are
 * interfaces and plain objects from framework-free packages. Those packages must not
 * import `@nestjs/common` to gain an `@Injectable()` decorator — that would invert the
 * dependency direction the whole architecture rests on.
 *
 * Collected in one file so the set of injectable infrastructure is reviewable at a glance.
 */
export const TOKENS = {
  CONFIG: 'COLLECTION_WAR_CONFIG',
  LOGGER: 'COLLECTION_WAR_LOGGER',
  DATABASE: 'COLLECTION_WAR_DATABASE',
  REDIS: 'COLLECTION_WAR_REDIS',
  CLOCK: 'COLLECTION_WAR_CLOCK',
} as const;
