import { describe, expect, it } from 'vitest';
import { loadApiConfig, loadWorkerConfig, redactConfig } from './load';

/** A minimal environment that is expected to validate. Tests mutate copies of it. */
const VALID_LOCAL_ENV = {
  NODE_ENV: 'development',
  COLLECTION_WAR_ENV: 'local',
  API_PUBLIC_URL: 'http://localhost:4000',
  API_CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
  DATABASE_URL: 'postgresql://collection_war:pw@localhost:5432/collection_war',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_JWT_SECRET: 'a-local-development-secret-that-is-long-enough',
} as const;

describe('loadApiConfig', () => {
  it('accepts a valid local environment and applies documented defaults', () => {
    const config = loadApiConfig({ ...VALID_LOCAL_ENV });

    expect(config.API_PORT).toBe(4000);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.DATABASE_POOL_MAX).toBe(10);
    expect(config.API_CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
  });

  it('refuses to start when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _omitted, ...withoutDatabase } = VALID_LOCAL_ENV;

    expect(() => loadApiConfig(withoutDatabase)).toThrow(/DATABASE_URL/);
  });

  it('rejects a Redis URL pasted into DATABASE_URL', () => {
    // A real and easy mistake to make when copying environment blocks between services.
    expect(() => loadApiConfig({ ...VALID_LOCAL_ENV, DATABASE_URL: 'redis://localhost:6379' })).toThrow(
      /PostgreSQL/,
    );
  });

  it('rejects a JWT secret that is too short to be safe', () => {
    expect(() => loadApiConfig({ ...VALID_LOCAL_ENV, AUTH_JWT_SECRET: 'short' })).toThrow(
      /at least 32 characters/,
    );
  });

  it('names every problem at once rather than only the first', () => {
    // A developer setting up the project should not have to fix one variable, re-run,
    // and discover the next one.
    let message = '';
    try {
      loadApiConfig({ COLLECTION_WAR_ENV: 'local' });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }

    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('REDIS_URL');
    expect(message).toContain('AUTH_JWT_SECRET');
  });

  describe('production-only rules', () => {
    const productionEnv = {
      ...VALID_LOCAL_ENV,
      NODE_ENV: 'production',
      COLLECTION_WAR_ENV: 'production',
      API_PUBLIC_URL: 'https://api.example.com',
      API_CORS_ORIGINS: 'https://example.com',
      DATABASE_SSL: 'true',
      AUTH_JWT_SECRET: 'a-production-grade-secret-value-that-is-long',
    } as const;

    it('accepts a correctly hardened production environment', () => {
      expect(() => loadApiConfig({ ...productionEnv })).not.toThrow();
    });

    it('rejects wildcard CORS', () => {
      expect(() => loadApiConfig({ ...productionEnv, API_CORS_ORIGINS: '*' })).toThrow(/Wildcard CORS/);
    });

    it('rejects an unencrypted database connection', () => {
      expect(() => loadApiConfig({ ...productionEnv, DATABASE_SSL: 'false' })).toThrow(/must use TLS/);
    });

    it('rejects the example placeholder secret', () => {
      // This is the check that stops `.env.example` reaching a real environment.
      expect(() =>
        loadApiConfig({
          ...productionEnv,
          AUTH_JWT_SECRET: 'replace-me-local-development-only-not-a-real-secret',
        }),
      ).toThrow(/placeholder secret/);
    });

    it('applies none of those rules to local development', () => {
      expect(() => loadApiConfig({ ...VALID_LOCAL_ENV, API_CORS_ORIGINS: '*' })).not.toThrow();
    });
  });
});

describe('loadWorkerConfig', () => {
  it('does not require API settings', () => {
    const config = loadWorkerConfig({
      DATABASE_URL: VALID_LOCAL_ENV.DATABASE_URL,
      REDIS_URL: VALID_LOCAL_ENV.REDIS_URL,
    });

    expect(config.COLLECTION_WAR_ENV).toBe('local');
  });
});

describe('feature flags', () => {
  it('defaults real-money withdrawal to disabled', () => {
    // If this test ever needs changing, the change requires legal and payment-compliance
    // sign-off, not just a code review. See docs/constitution/ECONOMY_INTEGRITY_RULES.md.
    const config = loadApiConfig({ ...VALID_LOCAL_ENV });

    expect(config.FEATURE_REAL_MONEY_WITHDRAWAL_ENABLED).toBe(false);
    expect(config.FEATURE_MARKETPLACE_ENABLED).toBe(false);
  });
});

describe('redactConfig', () => {
  it('redacts secrets and connection strings but keeps operational values readable', () => {
    const redacted = redactConfig(loadApiConfig({ ...VALID_LOCAL_ENV }));

    expect(redacted.AUTH_JWT_SECRET).toBe('[REDACTED]');
    expect(redacted.DATABASE_URL).toBe('[REDACTED]');
    expect(redacted.REDIS_URL).toBe('[REDACTED]');
    expect(redacted.API_PORT).toBe(4000);
    expect(redacted.COLLECTION_WAR_ENV).toBe('local');
  });

  it('redacts by pattern, so an unfamiliar secret is hidden by default', () => {
    const redacted = redactConfig({ SOME_NEW_API_KEY: 'sensitive', HARMLESS_SETTING: 'visible' });

    expect(redacted.SOME_NEW_API_KEY).toBe('[REDACTED]');
    expect(redacted.HARMLESS_SETTING).toBe('visible');
  });
});
