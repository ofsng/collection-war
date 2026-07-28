import { describe, expect, it } from 'vitest';
import { maskConnectionString, redactDeep } from './redaction';
import { resolveCorrelationId } from './correlation';

describe('redactDeep', () => {
  it('redacts sensitive keys at any depth', () => {
    const redacted = redactDeep({
      playerId: 'p-1',
      auth: { accessToken: 'secret-token', nested: { password: 'hunter2' } },
    }) as Record<string, never>;

    expect(JSON.stringify(redacted)).not.toContain('secret-token');
    expect(JSON.stringify(redacted)).not.toContain('hunter2');
    expect(JSON.stringify(redacted)).toContain('p-1');
  });

  it('redacts inside arrays', () => {
    const redacted = redactDeep([{ apiKey: 'leak-me' }, { safe: 'keep-me' }]);

    expect(JSON.stringify(redacted)).not.toContain('leak-me');
    expect(JSON.stringify(redacted)).toContain('keep-me');
  });

  it('matches key variants rather than one exact spelling', () => {
    const redacted = redactDeep({
      api_key: 'a',
      'api-key': 'b',
      apiKey: 'c',
      SESSION_ID: 'd',
      cardNumber: 'e',
    }) as Record<string, string>;

    for (const value of Object.values(redacted)) {
      expect(value).toBe('[REDACTED]');
    }
  });

  it('stops at a bounded depth instead of hanging on a cyclic structure', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    // The point is that this returns at all — an unbounded walk would blow the stack and
    // take down whatever request was being logged.
    expect(() => redactDeep(cyclic)).not.toThrow();
    expect(JSON.stringify(redactDeep(cyclic))).toContain('TRUNCATED');
  });

  it('passes primitives through untouched', () => {
    expect(redactDeep(42)).toBe(42);
    expect(redactDeep(null)).toBe(null);
    expect(redactDeep('plain')).toBe('plain');
  });
});

describe('maskConnectionString', () => {
  it('hides the password but keeps the host and database readable', () => {
    const masked = maskConnectionString('postgresql://collection_war:s3cret@localhost:5432/collection_war');

    expect(masked).not.toContain('s3cret');
    expect(masked).toContain('localhost:5432');
    expect(masked).toContain('collection_war');
  });

  it('leaves a credential-free URL alone', () => {
    expect(maskConnectionString('redis://localhost:6379')).toBe('redis://localhost:6379');
  });
});

describe('resolveCorrelationId', () => {
  it('accepts a well-formed client id', () => {
    expect(resolveCorrelationId('abcdef012345')).toBe('abcdef012345');
  });

  it('replaces a log-injection attempt instead of echoing it', () => {
    // Newlines in a logged field can forge additional log entries.
    const resolved = resolveCorrelationId('abc\n{"level":"fatal","msg":"forged"}');

    expect(resolved).not.toContain('\n');
    expect(resolved).not.toContain('forged');
  });

  it('replaces an over-long value', () => {
    expect(resolveCorrelationId('a'.repeat(500))).toHaveLength(36);
  });

  it('mints one when the header is absent', () => {
    expect(resolveCorrelationId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
