/**
 * Collection War — observability foundation.
 *
 * Structured logging, secret redaction and correlation-id propagation. This package is
 * the only sanctioned way for server code to emit logs; `console.log` is lint-blocked
 * because unstructured output cannot be queried, filtered or redacted.
 *
 * Metrics and tracing are deliberately not here yet. Adding an OpenTelemetry collector
 * before there is any traffic to observe costs money and complexity for no signal — see
 * docs/architecture/OBSERVABILITY_ARCHITECTURE.md for the staged plan.
 */

export * from './logger';
export * from './redaction';
export * from './correlation';
