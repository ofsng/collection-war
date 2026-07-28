import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { parseOrThrow, parseWith, toFieldIssues } from './parse';
import { displayNameSchema, minorUnitsSchema, uuidSchema } from './primitives';

describe('parseWith', () => {
  it('returns the parsed value on success', () => {
    const result = parseWith(z.object({ name: z.string() }), { name: 'Ada' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.name).toBe('Ada');
  });

  it('returns a VALIDATION error rather than throwing', () => {
    const result = parseWith(z.object({ name: z.string() }), { name: 42 });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.category).toBe('VALIDATION');
      expect(result.error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('does not echo the rejected input back in the error', () => {
    // Regression guard for a real leak class: a validation error that includes the
    // payload will put credentials into logs and error trackers.
    const schema = z.object({ password: z.string().min(64) });
    const result = parseWith(schema, { password: 'hunter2-secret-value' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.error)).not.toContain('hunter2-secret-value');
    }
  });
});

describe('primitive schemas', () => {
  it('accepts a UUIDv7 and rejects a near-miss', () => {
    expect(uuidSchema.safeParse('018f4c1a-7b2e-7c3d-9a1b-2c3d4e5f6a7b').success).toBe(true);
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('018f4c1a7b2e7c3d9a1b2c3d4e5f6a7b').success).toBe(false);
  });

  it('rejects fractional currency amounts', () => {
    // The economy is integer-only. A fractional amount reaching a ledger is a defect,
    // not a rounding inconvenience.
    expect(minorUnitsSchema.safeParse(150).success).toBe(true);
    expect(minorUnitsSchema.safeParse(-150).success).toBe(true);
    expect(minorUnitsSchema.safeParse(1.5).success).toBe(false);
    expect(minorUnitsSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(minorUnitsSchema.safeParse(Number.NaN).success).toBe(false);
  });

  it('accepts non-ASCII display names', () => {
    // Turkish is a first-class locale; a name filter that only allows [a-z] is a bug.
    expect(displayNameSchema.safeParse('Gökçe').success).toBe(true);
    expect(displayNameSchema.safeParse('Şeyma_01').success).toBe(true);
    expect(displayNameSchema.safeParse('ab').success).toBe(false);
    expect(displayNameSchema.safeParse('<script>').success).toBe(false);
  });
});

describe('parseOrThrow', () => {
  it('names the context and every failing field in the thrown message', () => {
    // Startup failures are read by a human at 3am. They must say what is wrong.
    expect(() => parseOrThrow(z.object({ port: z.number() }), { port: 'nope' }, 'API configuration')).toThrow(
      /API configuration is invalid/,
    );
  });
});

describe('toFieldIssues', () => {
  it('labels a root-level failure explicitly', () => {
    const parsed = z.string().safeParse(1);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(toFieldIssues(parsed.error)[0]?.path).toBe('(root)');
    }
  });
});
