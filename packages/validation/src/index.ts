/**
 * Collection War — runtime validation primitives.
 *
 * TypeScript types vanish at runtime. Every value that crosses a trust boundary — an HTTP
 * body, a query string, an environment variable, a queue payload, a row from an external
 * system — is `unknown` until it has been parsed. This package holds the schemas and
 * helpers used to do that parsing consistently.
 *
 * The rule (docs/constitution/SECURITY_RULES.md#input-validation):
 *   PARSE, DON'T VALIDATE. A boundary function takes `unknown` and returns a typed value
 *   or an error. It never takes an already-typed argument and merely asserts about it —
 *   that pattern lets an unchecked value through as soon as someone forgets the assert.
 */

export * from './primitives';
export * from './parse';
