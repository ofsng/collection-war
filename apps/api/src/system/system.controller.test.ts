import { describe, expect, it } from 'vitest';
import type { ApiConfig } from '@collection-war/configuration';
import { SystemController } from './system.controller';

const config = {
  COLLECTION_WAR_ENV: 'local',
  API_PORT: 4000,
  DATABASE_URL: 'postgresql://collection_war:s3cret@localhost:5432/collection_war',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_JWT_SECRET: 'a-local-development-secret-that-is-long-enough',
  FEATURE_MARKETPLACE_ENABLED: false,
  FEATURE_REAL_MONEY_WITHDRAWAL_ENABLED: false,
} as unknown as ApiConfig;

describe('GET /api/v1/system/info', () => {
  it('identifies the service, version, environment and locales', () => {
    const info = new SystemController(config).info();

    expect(info.name).toBe('collection-war-api');
    expect(info.apiVersion).toBe('v1');
    expect(info.environment).toBe('local');
    expect(info.supportedLocales).toEqual(['tr-TR', 'en']);
  });

  it('leaks no secret, connection string or feature-flag value', () => {
    // The endpoint is unauthenticated. Everything it returns is public, so the test asserts
    // on what is ABSENT rather than only on what is present.
    const serialized = JSON.stringify(new SystemController(config).info());

    expect(serialized).not.toContain('s3cret');
    expect(serialized).not.toContain('postgresql://');
    expect(serialized).not.toContain('redis://');
    expect(serialized).not.toContain('AUTH_JWT_SECRET');
    expect(serialized).not.toContain('FEATURE_');
    expect(serialized).not.toContain('5432');
  });

  it('returns a stable key set, so a client contract cannot drift silently', () => {
    expect(Object.keys(new SystemController(config).info()).sort()).toEqual([
      'apiVersion',
      'environment',
      'name',
      'supportedLocales',
    ]);
  });
});
